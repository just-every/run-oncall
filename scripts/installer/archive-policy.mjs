import {pauseChangeSources} from '../../src/changes/model.ts'
import {validateRecoveryCheckpoint} from '../../src/family/response-operations/recovery.ts'
import {holdHandoffsForRecovery} from '../../src/family/response-operations/handoffs.ts'
import {portabilityPolicy} from '../../src/portability-policy.mjs'
// Product restore policy runs inside Base portability's staging validation.
// Imported timers become historical paused data before atomic publication.
export default {
 ...portabilityPolicy,
 async validateStaged({db,tables,read}) {
  const control=(await read('workspace_control'))[0],paging=(await read('paging_control'))[0]
  const coordination={schemaVersion:1,revision:control?.revision??0}
  for(const key of ['members','services','policies','events','alerts','incidents','audit'])coordination[key]=(await read('oc_'+key)).sort((a,b)=>a.ordinal-b.ordinal).map(row=>JSON.parse(row.data))
  const triage=(tables.oc_triage ? await read('oc_triage') : []).sort((a,b)=>a.ordinal-b.ordinal).map(row=>JSON.parse(row.data))
  if(triage.length)coordination.triage=triage
  for(const [key,table] of [['changes','oc_changes'],['changeSources','oc_change_sources']]){const records=tables[table]?(await read(table)).sort((a,b)=>a.ordinal-b.ordinal).map(row=>JSON.parse(row.data)):[];if(records.length)coordination[key]=records}
  pauseChangeSources(coordination)
  if(tables.oc_change_sources)for(const row of await read('oc_change_sources')){const data=JSON.parse(row.data);data.active=false;await db.prepare('UPDATE "'+tables.oc_change_sources.replaceAll('"','""')+'" SET data=? WHERE id=?').bind(JSON.stringify(data),row.id).run()}
  const archive={schemaVersion:1,mode:'synthetic-only'}
  for(const key of ['schedules','policies','jobs','receipts','callbacks'])archive[key]=(await read('paging_'+key)).map(row=>JSON.parse(row.data))
  validateRecoveryCheckpoint({schemaVersion:1,kind:'oncall-recovery-checkpoint',capturedAt:new Date().toISOString(),workspaceRevision:coordination.revision,pagingRevision:paging?.revision??0,coordination,paging:archive})
  const rows=await read('paging_jobs')
  for(const row of rows) {
   const job=JSON.parse(row.data)
   if(job.status!=='pending')continue
   if(job.history.length>=500)throw Error('HISTORICAL_JOB_CAPACITY');
   job.revision++;job.status='paused';job.nextDue=null
   job.history.push({type:'paused',at:job.lastEvaluatedAt,actor:null,reason:'Portable restore; paging OFF',attempt:null})
   const table='"'+tables.paging_jobs.replaceAll('"','""')+'"'
   await db.prepare(`UPDATE ${table} SET revision=?,status='paused',next_due=NULL,data=? WHERE id=?`).bind(job.revision,JSON.stringify(job),job.id).run()
  }
  const handoff=(await read('handoff_state'))[0]
  const held=await holdHandoffsForRecovery(JSON.parse(handoff.data),Date.now(),crypto.randomUUID(),'Portable restore; review required')
  if(JSON.stringify(held)!==handoff.data){const table='"'+tables.handoff_state.replaceAll('"','""')+'"';await db.prepare(`UPDATE ${table} SET data=?,revision=revision+1 WHERE id=1`).bind(JSON.stringify(held)).run()}
  return true
 },
}
