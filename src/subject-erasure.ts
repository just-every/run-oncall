import { addressRanges } from './move-in/address-match'
import { upgradeD1ImportErasureIndex } from './modules/import-kit/src/d1/index'
import { validateSchedule } from './family/response-operations/schedules'
import { eraseManualMember } from './manual-pages/archive'
import { eraseDeadlineMember } from './incident-deadlines/archive'
import { eraseBusinessMember } from './business-status/model'
import { refers,mentions,scrub,indirect } from './move-in/erasure'
import { relatedSelection } from './modules/import-kit/src/d1/erasure-related'
import { targetIdentity } from './modules/import-kit/src/d1/erasure-index'
import { prepareImportCustodyErasure,importErasureContext } from './move-in/native-erasure'
import { changeErasureIdentity } from './changes/identity'
import { auditIdentity, auditKind, ownerCustodyRefusal } from './audit-store'
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
  if(kind==='member'&&state.members.some(m=>m.id===id&&m.erased))return c.json({state:'complete',stores:{},standby:'not-reconciled',repeated:true,outstanding:[{destination:'External recipients and providers',state:'not-requested',reason:'Deletion requires the owner’s per-destination consent; local revocation is not remote deletion'}]})
  if(input.workspaceRevision!==state.revision)fail('Workspace changed; reload before erasing',409)
  const statements:D1PreparedStatement[]=[],tables:string[]=[],identities=[id],updated:Record<string,number>={},inserted:Record<string,number>={}
  const outstanding:{destination:string;state:string;reason:string}[]=[]
  const changedIncidents=new Set<string>()
  let imported:Awaited<ReturnType<typeof prepareImportCustodyErasure>>|undefined
  const remember=(table:string)=>{if(!tables.includes(table))tables.push(table)}
  const remove=(key:keyof State,table:string,predicate:(row:any)=>boolean)=>{
   const rows=state[key] as any[]|undefined
   if(rows){for(const row of rows.filter(predicate))identities.push(row.id);(state as any)[key]=rows.filter(row=>!predicate(row))}
   remember(table)
  }
  const eraseCredential=(table:string,column:string,ids:string[])=>{remember(table);statements.push(db.prepare(`DELETE FROM ${table} WHERE ${column} IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)))}
  const fence=async(subjectKind:string,subjectId:string)=>{const digest=await subjectErasureIdentity(subjectKind,subjectId);if(!(state.erasureFences??=[]).some(f=>f.id===digest))state.erasureFences.push({id:digest,epoch:0})}
  const anonymous=async(subjectKind=kind,subjectId=id)=>{
   const label='erased-'+(await subjectErasureIdentity(subjectKind,subjectId)).slice(0,32)
   if(!state.members.some(m=>m.id===label)){let name='Erased integration',sequence=1;while(state.members.some(m=>m.name===name))name='Erased integration '+ ++sequence;state.members.push({id:label,name,role:'viewer',active:false,erased:true});remember('oc_members');inserted.oc_members=1}
   return label
  }
  const replaceIdentity=(value:any,from:string,to:string):any=>typeof value==='string'?(value===from?to:value):Array.isArray(value)?value.map(v=>replaceIdentity(v,from,to)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceIdentity(v,from,to)])):value
  const outbox=(predicate:(o:NonNullable<State['apiOutbox']>[number])=>boolean)=>{requireNoFlight(state,predicate);remove('apiOutbox','oc_api_outbox',predicate)}
  let handoffs:Awaited<ReturnType<typeof handoffSnapshot>>|undefined,handoffWrite=-1
  const eraseHandoffCopies=async(incidentIds:string[],memberIds:string[]=[])=>{
   if(!handoffs){handoffs=await handoffSnapshot(db);statements.push(guardStatement(db,'EXISTS(SELECT 1 FROM handoff_state WHERE id=1 AND revision=?)',handoffs.revision))}
   const containsMember=(value:any):boolean=>typeof value==='string'?memberIds.includes(value):Array.isArray(value)?value.some(containsMember):!!value&&typeof value==='object'&&Object.values(value).some(containsMember)
   const selected=(record:any)=>incidentIds.includes(record.source.incident.id)||containsMember(record)
   const removed=handoffs.archive.records.filter(selected)
   remember('handoff_state');updated.handoff_state??=0
   if(!removed.length)return
   identities.push(...removed.map(r=>r.id))
   for(const row of removed)await fence('handoff',row.id)
   handoffs.archive.records=handoffs.archive.records.filter(r=>!selected(r))
   updated.handoff_state=1
   const write=db.prepare('UPDATE handoff_state SET data=?,revision=revision+1,write_token=? WHERE id=1').bind(JSON.stringify(handoffs.archive),crypto.randomUUID())
   if(handoffWrite<0){handoffWrite=statements.length;statements.push(write)}else statements[handoffWrite]=write
  }
  const removeSignalSource=async(sourceIdentity:string)=>{
    const events=new Set(state.events.filter(e=>e.source===sourceIdentity).map(e=>e.id)),alerts=new Set(state.alerts.filter(a=>a.source===sourceIdentity).map(a=>a.id))
    for(const event of state.events)if(!events.has(event.id)&&event.decision.correlation?.originalEvent&&events.has(event.decision.correlation.originalEvent)){
     const prior=event.decision.correlation;event.decision.correlation={...prior,group:null,originalEvent:null,originalPolicy:null,originalVersion:null,relationship:'unmatched',startedAt:event.observedAt,reason:'Original correlation evidence explicitly erased; this retained signal remains visible'+(prior.held?'; prior local flapping hold retained for review':'')};remember('oc_events');
     for(const receipt of state.intakeReceipts??[])if(receipt.routing?.serviceDecision?.event===event.id){receipt.routing.serviceDecision={event:event.id,...structuredClone(event.decision)};remember('oc_intake_receipts');}
    }
    const affected=state.incidents.filter(i=>i.alerts.some(a=>alerts.has(a)))
    for(const incident of affected){
     outbox(o=>o.incident===incident.id)
     incident.alerts=incident.alerts.filter(a=>!alerts.has(a))
     if(incident.splitFrom?.alerts.some(a=>alerts.has(a))){delete incident.splitFrom;const first=incident.timeline[0],impact=first.text.indexOf('\nImpact: ');first.text='Original source alert explicitly erased'+(impact<0?'':first.text.slice(impact))}
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
    remove('triage','oc_triage',r=>r.kind==='bulk'&&(r.results.some((result:any)=>alerts.has(result.id))||r.workflow?.items.some((item:any)=>alerts.has(item.id))))
    remove('events','oc_events',r=>r.source===sourceIdentity);remove('alerts','oc_alerts',r=>r.source===sourceIdentity)
  }
  const eraseApiIntegration=async(targetKind:string,targetId:string)=>{
   const client=targetKind==='client'?state.apiClients?.find(r=>r.id===targetId):undefined
   const endpoint=targetKind==='endpoint'?state.apiEndpoints?.find(r=>r.id===targetId):undefined
   if(!client&&!endpoint)fail('Unknown integration',404)
   const endpoints=(state.apiEndpoints??[]).filter(e=>targetKind==='endpoint'?e.id===targetId:e.client===targetId).map(e=>e.id)
   outbox(o=>endpoints.includes(o.endpoint)||targetKind==='client'&&o.client===targetId)
   remove('apiEndpoints','oc_api_endpoints',e=>endpoints.includes(e.id))
   eraseCredential('oc_endpoint_credentials','endpoint',endpoints)
   if(client){
    const label=await anonymous('client',targetId)
    // Preserve historical machine attribution as an inactive, credential-free
    // erased identity. Never transfer a machine's claims to the erasing admin.
    for(const key of ['incidents','audit','services'] as const){
     const prior=state[key].map(row=>JSON.stringify(row));(state as any)[key]=replaceIdentity(state[key],targetId,label)
     const changed=state[key].filter((row,index)=>JSON.stringify(row)!==prior[index]).length
     if(changed){remember('oc_'+key);updated['oc_'+key]=changed}
    }
    remove('apiClients','oc_api_clients',r=>r.id===targetId);remove('apiOperations','oc_api_operations',r=>r.client===targetId);eraseCredential('oc_api_credentials','client',[targetId])}

   if(client)await fence('client',client.id);for(const endpoint of endpoints)await fence('endpoint',endpoint)
  }
  if(kind==='incident') {
   const incident=state.incidents.find(i=>i.id===id);if(!incident)fail('Unknown incident',404)
   outbox(o=>o.incident===id)
   const entries=new Set(incident.timeline.map(e=>e.id))
   const relationKey=(e:{kind:string;actor:string;at:string;text:string})=>JSON.stringify([e.kind==='merge-incidents'?'merge':e.kind==='split-incident'?'split':e.kind,e.actor,e.at,e.text.split('\nImpact: ')[0]])
   const relations=new Set(incident.timeline.filter(e=>['merge','split'].includes(e.kind)).map(relationKey))
   remove('incidents','oc_incidents',i=>i.id===id)
   remove('apiOperations','oc_api_operations',o=>o.entity===id)
   // Relations retain the other incident, but sever the erased source and any
   // copied relation description. A surviving split keeps its declaration.
   for(const other of state.incidents){
    let changed=false
    if(other.mergedInto?.target===id){delete other.mergedInto;changed=true}
    if(other.mergedSources?.includes(id)){other.mergedSources=other.mergedSources.filter(i=>i!==id);if(!other.mergedSources.length)delete other.mergedSources;changed=true}
    if(other.splitFrom?.incident===id){delete other.splitFrom;const first=other.timeline[0],impact=first.text.indexOf('\nImpact: ');first.text='Original split provenance explicitly erased'+(impact<0?'':first.text.slice(impact));changed=true}
    const timeline=other.timeline.filter(e=>!['merge','split'].includes(e.kind)||!relations.has(relationKey(e)))
    if(timeline.length!==other.timeline.length){other.timeline=timeline;changed=true}
    if(changed){other.revision++;updated.oc_incidents=(updated.oc_incidents??0)+1}
   }
   remove('audit','oc_audit',e=>entries.has(e.id)||['merge-incidents','split-incident'].includes(e.kind)&&relations.has(relationKey(e)))
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
  } else if(kind==='member') {
   const member=state.members.find(m=>m.id===id);if(!member)fail('Unknown member',404)
   const ownerLink="EXISTS(SELECT 1 FROM operator_members l JOIN oa_operators o ON o.id=l.operator_id WHERE l.member_id=? AND o.role='owner')"
   if(await db.prepare('SELECT 1 WHERE '+ownerLink).bind(id).first()){
    ownerCustodyRefusal(db)
    fail('An installation owner’s identity is erased only through Auth, never through Oncall. The last owner requires the protected reset or transfer path (AUTH-ERASURE-001). Nothing was erased.',409)
   }
   // Recheck custody in the same batch as deletion, including a concurrent role change.
   statements.push(guardStatement(db,'NOT '+ownerLink,id))
   if(id===c.get('actor').id)fail('Use another administrator to erase this member',409)
   if(member.role==='admin'&&member.active&&state.members.filter(m=>m.active&&m.role==='admin').length===1)fail('The last administrator cannot be erased',409)
   if(input.identitiesReviewed!==true||!Array.isArray(input.importedPeople)||input.importedPeople.some((v:unknown)=>typeof v!=='string')||new Set(input.importedPeople).size!==input.importedPeople.length)fail('Review and select this member’s retained imported identities',409)
   const people=(await db.prepare("SELECT id,data FROM move_in_objects WHERE kind='user'").all<{id:string;data:string}>()).results
   const aliases=new Set<string>(input.importedPeople)
   if([...aliases].some(mail=>!people.some(p=>p.id===mail)))fail('An imported identity changed; reload and review',409)
   if(people.some(p=>p.id.toLowerCase()===member.name.toLowerCase()&&!aliases.has(p.id)))fail('Select the retained imported identity matching this member before erasing',409)
   // A native email also fences pending/unapplied copies, even when no user target was applied.
   if(/^[^\s@]+@[^\s@]+$/.test(member.name))aliases.add(member.name.toLowerCase())
   const ownedClients=new Set((state.apiClients??[]).filter(v=>v.owner===id).map(v=>v.id))
   for(const endpoint of state.apiEndpoints??[])if(endpoint.owner===id||ownedClients.has(endpoint.client))outstanding.push({destination:'Approved response recipient '+(await subjectErasureIdentity('endpoint',endpoint.id)).slice(0,12),state:'not-requested',reason:'Provider deletion requires the owner’s consent for this destination; local revocation does not recall sent messages'})
   for(const client of [...state.apiClients??[]].filter(v=>v.owner===id))await eraseApiIntegration('client',client.id)
   for(const endpoint of [...state.apiEndpoints??[]].filter(v=>v.owner===id))await eraseApiIntegration('endpoint',endpoint.id)
   outbox(o=>o.owner===id)
   remove('triage','oc_triage',r=>r.kind==='bulk'&&r.workflow&&(r.actor===id||r.workflow.member===id))
   const oldName=member.name,names=new Set([oldName,...aliases])
   const redact=(text:string)=>{for(const name of names){const ranges=addressRanges(text,name).filter(([start,end])=>name.includes('@')||text.slice(start,end)===name&&!/[\p{L}\p{N}]/u.test(text[start-1]??'')&&!/[\p{L}\p{N}]/u.test(text[end]??''));text=ranges.reduceRight((value,[start,end])=>value.slice(0,start)+'Erased member'+value.slice(end),text)}return text}
   const personalChanges=(state.changes??[]).filter(change=>names.has(change.author))
   for(const change of personalChanges){const digest=await changeErasureIdentity(change.source,change.eventId);(state.erasureFences??=[]).push({id:digest,epoch:0});identities.push(change.id);for(const source of state.changeSources??[])if(source.lastAccepted?.id===change.id)delete source.lastAccepted}
   remove('changes','oc_changes',change=>personalChanges.some(row=>row.id===change.id));remember('oc_change_sources')
   await fence('login',oldName.toLowerCase())
   member.name='Erased member';member.active=false;member.erased=true;remember('oc_members')
   for(const entry of state.audit)if(entry.kind==='member')entry.text=redact(entry.text)
   remember('oc_audit')
   remove('scheduleRecords','oc_schedule_records',r=>r.member===id||r.data.substitute===id||r.data.obligation?.creator===id)
   eraseBusinessMember(state,id);remember('oc_business_services')
   const redactedEntries=new Set<string>()
   const redactEntry=(entry:{id:string;text:string})=>{const text=redact(entry.text);if(text!==entry.text){redactedEntries.add(entry.id);entry.text=text}}
   for(const incident of state.incidents){eraseManualMember(incident,id);eraseDeadlineMember(incident,id);if(incident.manualPage){const description=redact(incident.manualPage.description);if(description!==incident.manualPage.description){incident.manualPage.description=description;incident.manualPage.fingerprint=''}}for(const request of incident.responderRequests??[])request.message=redact(request.message);for(const e of incident.timeline)if(e.lifecycle&&e.lifecycle.member===id)e.lifecycle.member=null;for(const e of incident.timeline)if(e.actor===id||incident.manualPage&&e.kind==='declared'||['reassign','assign-role','manual-page','request-responders','respond-request','cancel-request'].includes(e.kind))redactEntry(e)}
   remember('oc_incidents')
   for(const alert of state.alerts)if(alert.coordination){for(const entry of alert.coordination.history)redactEntry(entry);if(alert.coordination.assignee===id){alert.coordination.assignee=null;alert.coordination.snoozeDue=null}}remember('oc_alerts')
   // Operational audit descriptions may have their own attributed prefix.
   // Redact only affected copies without replacing unrelated checklist wording.
   for(const entry of state.audit)if(redactedEntries.has(entry.id))entry.text=redact(entry.text)
   await eraseHandoffCopies([],[id])
   for(const table of ['credentials','sessions'])eraseCredential(table,'member',[id])
   eraseCredential('operator_members','member_id',[id]);remember('login_attempts');statements.push(db.prepare("DELETE FROM login_attempts WHERE lower(name) IN (SELECT value FROM json_each(?)) AND NOT EXISTS(SELECT 1 FROM oc_members WHERE json_extract(data,'$.name')=login_attempts.name AND json_extract(data,'$.active')=1)").bind(JSON.stringify([oldName,...aliases].map(v=>v.toLowerCase()))))
   const copied=await db.prepare("SELECT COUNT(*) AS n FROM oc_events WHERE EXISTS(SELECT 1 FROM json_each(oc_events.data,'$.routingSnapshot.members') m WHERE json_extract(m.value,'$.id')=? AND json_extract(m.value,'$.name')<>'Erased member')").bind(id).first<{n:number}>()
   remember('oc_events');updated.oc_events=copied!.n
   statements.push(db.prepare("UPDATE oc_events SET data=json_set(data,'$.routingSnapshot.members',json((SELECT json_group_array(json(CASE WHEN json_extract(m.value,'$.id')=? THEN json_set(m.value,'$.name','Erased member') ELSE m.value END)) FROM json_each(oc_events.data,'$.routingSnapshot.members') m))) WHERE EXISTS(SELECT 1 FROM json_each(oc_events.data,'$.routingSnapshot.members') m WHERE json_extract(m.value,'$.id')=? AND json_extract(m.value,'$.name')<>'Erased member')").bind(id,id))
   if(aliases.size){
    const context=importErasureContext(c);while(!(await upgradeD1ImportErasureIndex(context)).complete);
    const idsByNamespace=new Map<string,Set<string>>(),indirectKeys=new Set<string>(),filenames=new Set<string>(),rewritten=new Set<string>()
    await relatedSelection(context,{source(record){const payload=record.payload as any;if(record.kind==='users'&&aliases.has(String(payload.email??payload.username??'').trim().toLowerCase())){const ids=idsByNamespace.get(record.namespace)??new Set<string>();ids.add(String(payload.id??record.sourceId));idsByNamespace.set(record.namespace,ids)}return false}})
    for(const row of (await db.prepare("SELECT id,revision,data FROM move_in_objects WHERE kind='schedule'").all<{id:string;revision:string;data:string}>()).results){let next=JSON.parse(row.data);for(const mail of aliases)next=scrub(next,mail);if(JSON.stringify(next)!==row.data){next.schedule=validateSchedule(next.schedule);rewritten.add(row.id);remember('move_in_objects');updated.move_in_objects=(updated.move_in_objects??0)+1;statements.push(guardStatement(db,"EXISTS(SELECT 1 FROM move_in_objects WHERE kind='schedule' AND id=? AND revision=? AND data=?)",row.id,row.revision,row.data),db.prepare("UPDATE move_in_objects SET data=?,revision=? WHERE kind='schedule' AND id=?").bind(JSON.stringify(next),'erased-'+crypto.randomUUID(),row.id))}}
    for(const mail of aliases){const found=await indirect(context,mail,new Set(),rewritten,idsByNamespace);for(const key of found.found)indirectKeys.add(key);for(const name of found.filenames)filenames.add(name);identities.push(mail);statements.push(db.prepare("INSERT OR IGNORE INTO ik_d1_erased_targets(destination,identity) VALUES('oncall',?)").bind(targetIdentity('oncall','user',mail)))}
    remember('move_in_objects');statements.push(db.prepare("DELETE FROM move_in_objects WHERE kind='user' AND id IN (SELECT value FROM json_each(?))").bind(JSON.stringify([...aliases])))
    imported=await prepareImportCustodyErasure(c,{kind:'user',id:[...aliases][0]},{context,values:[...aliases,...filenames],related:{source(record){const ids=idsByNamespace.get(record.namespace)??new Set<string>();return indirectKeys.has(JSON.stringify([record.namespace,record.kind,record.sourceId]))||[...aliases].some(mail=>refers(record.payload,mail,ids)||mentions(record.payload,mail))},original(bytes){const raw=new TextDecoder().decode(bytes),ids=new Set([...idsByNamespace.values()].flatMap(ids=>[...ids]));try{const value=JSON.parse(raw);return [...aliases].some(mail=>refers(value,mail,ids)||mentions(value,mail))}catch{return [...aliases].some(mail=>mentions(raw,mail))}}}})
   }
  } else if(kind==='email') {
   const address=state.emailAddresses?.find(row=>row.id===id)
   if(!address)fail('Unknown email integration',404)
   await removeSignalSource('email:'+id)
   remove('emailQuarantine','oc_email_quarantine',row=>row.address===id)
   remove('emailSamples','oc_email_samples',row=>row.address===id)
   remove('emailReceipts','oc_email_receipts',row=>row.address===id)
   remove('emailRules','oc_email_rules',row=>row.address===id)
   remove('emailAddresses','oc_email_addresses',row=>row.id===id)
   eraseCredential('oc_email_credentials','address',[id])
  } else if(kind==='client'||kind==='endpoint') {
   await eraseApiIntegration(kind,id)
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
   if(kind==='intake'){
    const roots=(await db.prepare("SELECT id,revision,data FROM move_in_objects WHERE kind='integration' AND json_extract(data,'$.intakeSource')=?").bind(id).all<{id:string;revision:string;data:string}>()).results
    if(roots.length>1)fail('Conflicting imported integration bindings; nothing was erased. Resolve the retained import custody first.',409)
    if(roots.length){const root=roots[0];imported=await prepareImportCustodyErasure(c,{kind:'integration',id:root.id});remember('move_in_objects');identities.push(root.id)
     statements.push(guardStatement(db,"EXISTS(SELECT 1 FROM move_in_objects WHERE kind='integration' AND id=? AND revision=? AND data=?)",root.id,root.revision,root.data),db.prepare("DELETE FROM move_in_objects WHERE kind='integration' AND id=?").bind(root.id))}
   }
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
  await fence(kind,id)
  auditKind(db,kind+'.erase');auditIdentity(db,{subject:{kind,id}})
  const receipt=await commitSubjectErasure(db,state,deps.guard(c),{tables,identities,statements,updated,inserted,execute:imported?.execute})
  return c.json({...receipt,...(kind==='member'?{outstanding}:{} ),...(imported?{importCustody:imported.counts()}:{})})
 })
}
