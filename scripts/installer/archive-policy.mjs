import {interruptStagedImports,auditStagedRestore} from './audit-archive.mjs'
import {pauseIntakeSources} from '../../src/intake/model.ts'
import {pauseChangeSources} from '../../src/changes/model.ts'
import {validateRecoveryCheckpoint} from '../../src/family/response-operations/recovery.ts'
import {holdHandoffsForRecovery} from '../../src/family/response-operations/handoffs.ts'
import {portabilityPolicy} from '../../src/portability-policy.mjs'
import {pauseServiceApi} from '../../src/service-api/model.ts'
// Product restore policy runs inside Base portability's staging validation.
// Imported timers become historical paused data before atomic publication.
export default {
 ...portabilityPolicy,
 async validateStaged({db,tables,read}) {
  const auditRestore=await interruptStagedImports(db,tables,read)
  // Receiving opt-in is local authority; keep plans, approvals and replay journals as history.
  if(tables.ik_door_settings)await db.prepare('UPDATE "'+tables.ik_door_settings.replaceAll('"','""')+'" SET enabled=0').run()
  const control=(await read('workspace_control'))[0],paging=(await read('paging_control'))[0]
  const coordination={schemaVersion:1,revision:control?.revision??0}
  for(const key of ['members','services','policies','events','alerts','incidents','audit'])coordination[key]=(await read('oc_'+key)).sort((a,b)=>a.ordinal-b.ordinal).map(row=>JSON.parse(row.data))
  const triage=(tables.oc_triage ? await read('oc_triage') : []).sort((a,b)=>a.ordinal-b.ordinal).map(row=>JSON.parse(row.data))
  if(triage.length)coordination.triage=triage
  for(const [key,table] of [['changes','oc_changes'],['changeSources','oc_change_sources'],['intakeSources','oc_intake_sources'],['intakeReceipts','oc_intake_receipts'],['emailAddresses','oc_email_addresses'],['emailRules','oc_email_rules'],['emailSamples','oc_email_samples'],['emailReceipts','oc_email_receipts'],['emailQuarantine','oc_email_quarantine'],['serviceAccounts','oc_service_accounts'],['webhookEndpoints','oc_webhook_endpoints'],['outbox','oc_outbox']]){const records=tables[table]?(await read(table)).sort((a,b)=>a.ordinal-b.ordinal).map(row=>JSON.parse(row.data)):[];if(records.length)coordination[key]=records}
  if(tables.oc_email_addresses)for(const row of await read('oc_email_addresses')){const data=JSON.parse(row.data);data.active=false;await db.prepare('UPDATE "'+tables.oc_email_addresses.replaceAll('"','""')+'" SET data=? WHERE id=?').bind(JSON.stringify(data),row.id).run()}
  pauseChangeSources(coordination)
  pauseIntakeSources(coordination)
  // Tokens and signing secrets are excluded; restored definitions are inactive and unfinished sends are held until a fresh replay.
  const staged=pauseServiceApi(structuredClone(coordination))
  const stagedUpdate=async(name,key)=>{if(tables[name])for(const record of staged[key]??[]){const columns=name==='oc_outbox'?',state=?,due_at=NULL,lease_expires=NULL,started=0':'';await db.prepare('UPDATE "'+tables[name].replaceAll('"','""')+'" SET data=?'+columns+' WHERE id=?').bind(...[JSON.stringify(record),...(columns?[record.state]:[]),record.id]).run()}}
  await stagedUpdate('oc_service_accounts','serviceAccounts');await stagedUpdate('oc_webhook_endpoints','webhookEndpoints');await stagedUpdate('oc_outbox','outbox')
  if(tables.oc_change_sources)for(const row of await read('oc_change_sources')){const data=JSON.parse(row.data);data.active=false;await db.prepare('UPDATE "'+tables.oc_change_sources.replaceAll('"','""')+'" SET data=? WHERE id=?').bind(JSON.stringify(data),row.id).run()}
  if(tables.oc_intake_sources)for(const row of await read('oc_intake_sources')){const data=JSON.parse(row.data);data.active=false;await db.prepare('UPDATE "'+tables.oc_intake_sources.replaceAll('"','""')+'" SET data=? WHERE id=?').bind(JSON.stringify(data),row.id).run()}
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
  await auditStagedRestore(db,tables,read,auditRestore)
  return true
 },
}
