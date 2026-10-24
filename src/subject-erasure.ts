import { auditIdentity, auditKind } from './audit-store'
import { commitSubjectErasure } from './changes/erasure'
import { subjectErasureIdentity } from './subject-erasure-identity.ts'
import { fail, validateArchive, type State } from './family/response-operations/domain'
import { handoffSnapshot } from './handoff-store'

type Dependencies={body:(c:any)=>Promise<any>;state:(c:any,admin?:boolean)=>Promise<State>;guard:(c:any)=>{sql:string;values:(string|number|null)[]}}
const guardStatement=(db:D1Database,sql:string,...values:(string|number|null)[])=>db.prepare(`INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN ${sql} THEN 1 ELSE 0 END`).bind(...values)
// A sending lease is a durable exclusion boundary, not a promise to recall an
// external call. Erasure refuses until that call has a recorded outcome.
function requireNoFlight(state:State,predicate:(o:NonNullable<State['apiOutbox']>[number])=>boolean) {
 if(state.apiOutbox?.some(o=>predicate(o)&&(['sending','uncertain'].includes(o.status)||o.history.some(h=>h.reason==='lease-expired'))))fail('Delivery is sending or uncertain; no erasure receipt can be issued. Reconcile the external outcome first.',409)
}
export function installSubjectErasure(api:any,deps:Dependencies) {
 api.post('/api/erasure/:kind/:id',async(c:any)=>{
  const state=await deps.state(c,true),input=await deps.body(c),kind=c.req.param('kind'),id=c.req.param('id'),db=c.env.DB as D1Database
  if(input.confirmation!==`erase ${id}`)fail('Type erase followed by the exact subject ID',409)
  if(input.workspaceRevision!==state.revision)fail('Workspace changed; reload before erasing',409)
  const statements:D1PreparedStatement[]=[],tables:string[]=[],identities=[id],updated:Record<string,number>={},inserted:Record<string,number>={}
  const changedIncidents=new Set<string>()
  const remember=(table:string)=>{if(!tables.includes(table))tables.push(table)}
  const remove=(key:keyof State,table:string,predicate:(row:any)=>boolean)=>{
   const rows=state[key] as any[]|undefined
   if(rows){for(const row of rows.filter(predicate))identities.push(row.id);(state as any)[key]=rows.filter(row=>!predicate(row))}
   remember(table)
  }
  const eraseCredential=(table:string,column:string,ids:string[])=>{remember(table);statements.push(db.prepare(`DELETE FROM ${table} WHERE ${column} IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)))}
  const anonymous=async()=>{
   const label='erased-'+(await subjectErasureIdentity(kind,id)).slice(0,32)
   if(!state.members.some(m=>m.id===label)){state.members.push({id:label,name:'Erased integration',role:'viewer',active:false});remember('oc_members');inserted.oc_members=1}
   return label
  }
  const replaceIdentity=(value:any,from:string,to:string):any=>typeof value==='string'?(value===from?to:value):Array.isArray(value)?value.map(v=>replaceIdentity(v,from,to)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceIdentity(v,from,to)])):value
  const outbox=(predicate:(o:NonNullable<State['apiOutbox']>[number])=>boolean)=>{requireNoFlight(state,predicate);remove('apiOutbox','oc_api_outbox',predicate)}
  let handoffs:Awaited<ReturnType<typeof handoffSnapshot>>|undefined,handoffWrite=-1
  const eraseHandoffCopies=async(incidentIds:string[])=>{
   if(!handoffs){handoffs=await handoffSnapshot(db);statements.push(guardStatement(db,'EXISTS(SELECT 1 FROM handoff_state WHERE id=1 AND revision=?)',handoffs.revision))}
   const removed=handoffs.archive.records.filter(r=>incidentIds.includes(r.source.incident.id))
   remember('handoff_state');updated.handoff_state??=0
   if(!removed.length)return
   identities.push(...removed.map(r=>r.id))
   for(const row of removed)(state.erasureFences??=[]).push({id:await subjectErasureIdentity('handoff',row.id),epoch:0})
   handoffs.archive.records=handoffs.archive.records.filter(r=>!incidentIds.includes(r.source.incident.id))
   updated.handoff_state=1
   const write=db.prepare('UPDATE handoff_state SET data=?,revision=revision+1,write_token=? WHERE id=1').bind(JSON.stringify(handoffs.archive),crypto.randomUUID())
   if(handoffWrite<0){handoffWrite=statements.length;statements.push(write)}else statements[handoffWrite]=write
  }
  const removeSignalSource=async(sourceIdentity:string)=>{
    const events=new Set(state.events.filter(e=>e.source===sourceIdentity).map(e=>e.id)),alerts=new Set(state.alerts.filter(a=>a.source===sourceIdentity).map(a=>a.id))
    const affected=state.incidents.filter(i=>i.alerts.some(a=>alerts.has(a)))
    for(const incident of affected){
     outbox(o=>o.incident===incident.id)
     incident.alerts=incident.alerts.filter(a=>!alerts.has(a))
     if(incident.splitFrom?.alerts.some(a=>alerts.has(a))){incident.splitFrom.alerts=incident.splitFrom.alerts.filter(a=>!alerts.has(a));if(!incident.splitFrom.alerts.length){delete incident.splitFrom;incident.timeline[0].kind='declared';incident.timeline[0].text='Original source alert explicitly erased'}}
     if(incident.automaticDeclaration&&events.has(incident.automaticDeclaration.event)){
      delete incident.automaticDeclaration;incident.title='Incident source erased';const first=incident.timeline[0];first.actor=await anonymous();first.text='Original integration evidence explicitly erased';delete first.metadata
     }
     delete incident.sourceRecovery;delete incident.sourceRecoveryHistory
     incident.timeline=incident.timeline.filter(e=>e.kind!=='source-recovery'&&(!e.metadata?.event||!events.has(e.metadata.event)))
     incident.revision++
    }
    if(affected.length){for(const row of affected)changedIncidents.add(row.id);remember('oc_incidents');updated.oc_incidents=changedIncidents.size;await eraseHandoffCopies(affected.map(i=>i.id))}
    const receiptIds=new Set((state.intakeReceipts??[]).filter(r=>'intake:'+r.source===sourceIdentity).map(r=>r.id))
    remove('audit','oc_audit',r=>r.actor==='source:'+sourceIdentity||r.kind==='intake-owner-notice'&&receiptIds.has(/^Integration owner .*: incomplete intake receipt ([^;]+);/.exec(r.text)?.[1]??'')||r.kind==='routing-readmitted'&&(/^Re-admitted (\S+) as (\S+) to /.exec(r.text)?.slice(1).some(id=>receiptIds.has(id))??false))
    remove('events','oc_events',r=>r.source===sourceIdentity);remove('alerts','oc_alerts',r=>r.source===sourceIdentity)
  }
  if(kind==='incident') {
   const incident=state.incidents.find(i=>i.id===id);if(!incident)fail('Unknown incident',404)
   outbox(o=>o.incident===id)
   const entries=new Set(incident.timeline.map(e=>e.id))
   remove('incidents','oc_incidents',i=>i.id===id)
   remove('apiOperations','oc_api_operations',o=>o.entity===id)
   // Relations retain the other incident, but sever the erased source and any
   // copied relation description. A surviving split keeps its declaration.
   for(const other of state.incidents){
    let changed=false
    if(other.mergedInto?.target===id){delete other.mergedInto;changed=true}
    if(other.mergedSources?.includes(id)){other.mergedSources=other.mergedSources.filter(i=>i!==id);if(!other.mergedSources.length)delete other.mergedSources;changed=true}
    if(other.splitFrom?.incident===id){delete other.splitFrom;const first=other.timeline[0];first.kind='declared';first.text='Original split provenance explicitly erased';changed=true}
    const timeline=other.timeline.filter(e=>!['merge','split'].includes(e.kind)||!e.text.includes(id))
    if(timeline.length!==other.timeline.length){other.timeline=timeline;changed=true}
    if(changed){other.revision++;updated.oc_incidents=(updated.oc_incidents??0)+1}
   }
   remove('audit','oc_audit',e=>entries.has(e.id)||['merge-incidents','split-incident'].includes(e.kind)&&e.text.includes(id))
   remove('triage','oc_triage',r=>r.kind==='bulk'&&r.results.some((r:any)=>r.id===id))
   await eraseHandoffCopies([id])
   for(const table of ['paging_callbacks','paging_receipts','paging_jobs'])remember(table)
   const paging=await db.prepare('SELECT revision FROM paging_control WHERE id=1').first<{revision:number}>()
   statements.push(guardStatement(db,'EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)',paging!.revision),
    db.prepare("DELETE FROM paging_callbacks WHERE key IN (SELECT key FROM paging_receipts WHERE job_id IN (SELECT id FROM paging_jobs WHERE incident=?)) OR key IN (SELECT json_extract(step.value,'$.deliveryKey') FROM paging_jobs job,json_each(job.data,'$.steps') step WHERE job.incident=?)").bind(id,id),
    db.prepare('DELETE FROM paging_receipts WHERE job_id IN (SELECT id FROM paging_jobs WHERE incident=?)').bind(id),
    db.prepare('DELETE FROM paging_jobs WHERE incident=?').bind(id),
    db.prepare('UPDATE paging_control SET revision=revision+1,write_token=? WHERE id=1').bind(crypto.randomUUID()))
   eraseCredential('rer_command_receipts','result',[JSON.stringify(id)])
  } else if(kind==='client'||kind==='endpoint') {
   const client=kind==='client'?state.apiClients?.find(r=>r.id===id):undefined
   const endpoint=kind==='endpoint'?state.apiEndpoints?.find(r=>r.id===id):undefined
   if(!client&&!endpoint)fail('Unknown integration',404)
   const endpoints=(state.apiEndpoints??[]).filter(e=>kind==='endpoint'?e.id===id:e.client===id).map(e=>e.id)
   outbox(o=>endpoints.includes(o.endpoint)||kind==='client'&&o.client===id)
   remove('apiEndpoints','oc_api_endpoints',e=>endpoints.includes(e.id))
   eraseCredential('oc_endpoint_credentials','endpoint',endpoints)
   if(client){
    const label=await anonymous()
    // Preserve historical machine attribution as an inactive, credential-free
    // erased identity. Never transfer a machine's claims to the erasing admin.
    for(const key of ['incidents','audit','services'] as const){
     const prior=state[key].map(row=>JSON.stringify(row));(state as any)[key]=replaceIdentity(state[key],id,label)
     const changed=state[key].filter((row,index)=>JSON.stringify(row)!==prior[index]).length
     if(changed){remember('oc_'+key);updated['oc_'+key]=changed}
    }
    remove('apiClients','oc_api_clients',r=>r.id===id);remove('apiOperations','oc_api_operations',r=>r.client===id);eraseCredential('oc_api_credentials','client',[id])}
  } else if(kind==='native') {
   if(!await db.prepare('SELECT id FROM sources WHERE id=?').bind(id).first())fail('Unknown native integration',404)
   await removeSignalSource(id)
   for(const custody of (state.intakeSources??[]).filter(s=>s.id.startsWith('native:')&&s.name==='Native incomplete: '+id)){
    await removeSignalSource('intake:'+custody.id)
    remove('intakeReceipts','oc_intake_receipts',r=>r.source===custody.id);remember('oc_native_prefixes')
    remove('intakeSources','oc_intake_sources',r=>r.id===custody.id)
    ;(state.erasureFences??=[]).push({id:await subjectErasureIdentity('intake',custody.id),epoch:0})
   }
   eraseCredential('sources','id',[id])
   remove('keyAllowances','oc_key_allowances',r=>r.id==='source:'+id)
   eraseCredential('oc_key_rate_usage','key_id',['source:'+id]);eraseCredential('oc_key_rate_notified','key_id',['source:'+id])
  } else if(kind==='intake'||kind==='change') {
   const source=kind==='intake'?state.intakeSources?.find(r=>r.id===id):state.changeSources?.find(r=>r.id===id)
   if(!source)fail('Unknown integration',404)
   if(kind==='intake'&&id.startsWith('native:'))fail('Erase the native integration key to remove every retained scope and its credentials',409)
   const auditPatterns=kind==='change'?[`change source ${id} on `,`change source ${id}; revision `]:[`integration ${id}; revision `,`integration ${id}; owner `,`key ${id}; revision `,`routed key ${id} rule version `,`publish for ${id}: base `,`key ${source.name} throttled `]
   const auditKinds=kind==='change'?['change-source','change-source-revoked']:['intake-source','intake-source-revoked','routing-key','routing-published','routing-publish-refused','intake-rejected','intake-throttled','incumbent-key-supplied','incumbent-key-rotated','incumbent-key-activated']
   remove('audit','oc_audit',r=>auditKinds.includes(r.kind)&&auditPatterns.some(pattern=>r.text.includes(pattern)))
   if(kind==='change'){
    remove('changes','oc_changes',r=>r.source===id);remove('changeSources','oc_change_sources',r=>r.id===id)
    eraseCredential('oc_change_credentials','source',[id])
   }else{
    await removeSignalSource('intake:'+id)
    remove('intakeReceipts','oc_intake_receipts',r=>r.source===id);remember('oc_native_prefixes')
    remove('intakeSources','oc_intake_sources',r=>r.id===id)
    remove('keyAllowances','oc_key_allowances',r=>r.id==='intake:'+id)
    eraseCredential('sources','id',['intake:'+id])
    for(const table of ['oc_intake_credentials','oc_incumbent_credentials'])eraseCredential(table,'source',[id])
    eraseCredential('oc_key_rate_usage','key_id',['intake:'+id]);eraseCredential('oc_key_rate_notified','key_id',['intake:'+id])
   }
  } else {
   fail('Choose an incident, native integration, API client or endpoint',400)
  }
  validateArchive(state)
  // The digest holds no subject content. It also rejects old rows maliciously
  // paired with a newer native journal on either restore door.
  ;(state.erasureFences??=[]).push({id:await subjectErasureIdentity(kind,id),epoch:0})
  auditKind(db,kind+'.erase');auditIdentity(db,{subject:{kind,id}})
  return c.json(await commitSubjectErasure(db,state,deps.guard(c),{tables,identities,statements,updated,inserted}))
 })
}
