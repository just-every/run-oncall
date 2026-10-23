import {holdManualRecords} from '../../src/manual-pages/archive.ts'
import {holdBusinessStatus,refreshBusinessStatus} from '../../src/business-status/model.ts'
import {validateNativePrefixes} from './native-prefix-archive.mjs'
import {holdAutomation,validateAutomation} from '../../src/automation/model.ts'
import {interruptStagedImports,auditStagedRestore} from './audit-archive.mjs'
import {pauseIntakeSources} from '../../src/intake/model.ts'
import {pauseChangeSources} from '../../src/changes/model.ts'
import {validateRecoveryCheckpoint} from '../../src/family/response-operations/recovery.ts'
import {holdHandoffsForRecovery} from '../../src/family/response-operations/handoffs.ts'
import {portabilityPolicy} from '../../src/portability-policy.mjs'
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
  const erasureFences=tables.oc_erasure_fences?await read('oc_erasure_fences'):[]
  if(erasureFences.length)coordination.erasureFences=erasureFences.sort((a,b)=>a.id.localeCompare(b.id))
  const triage=(tables.oc_triage ? await read('oc_triage') : []).sort((a,b)=>a.ordinal-b.ordinal).map(row=>JSON.parse(row.data))
  if(triage.length)coordination.triage=triage
  for(const [key,table] of [['businessServices','oc_business_services'],['keyAllowances','oc_key_allowances'],['apiClients','oc_api_clients'],['apiEndpoints','oc_api_endpoints'],['apiOperations','oc_api_operations'],['apiOutbox','oc_api_outbox'],['changes','oc_changes'],['changeSources','oc_change_sources'],['intakeSources','oc_intake_sources'],['intakeReceipts','oc_intake_receipts'],['emailAddresses','oc_email_addresses'],['emailRules','oc_email_rules'],['emailSamples','oc_email_samples'],['emailReceipts','oc_email_receipts'],['emailQuarantine','oc_email_quarantine']]){const records=tables[table]?(await read(table)).sort((a,b)=>a.ordinal-b.ordinal).map(row=>JSON.parse(row.data)):[];if(records.length)coordination[key]=records}
  if(tables.oc_email_addresses)for(const row of await read('oc_email_addresses')){const data=JSON.parse(row.data);data.active=false;await db.prepare('UPDATE "'+tables.oc_email_addresses.replaceAll('"','""')+'" SET data=? WHERE id=?').bind(JSON.stringify(data),row.id).run()}
  await validateNativePrefixes(db,tables,coordination)
  validateAutomation(coordination)
  holdBusinessStatus(coordination)
  holdManualRecords(coordination)
  refreshBusinessStatus(coordination)
  if(tables.oc_business_services)for(const row of coordination.businessServices??[])await db.prepare('UPDATE "'+tables.oc_business_services.replaceAll('"','""')+'" SET data=? WHERE id=?').bind(JSON.stringify(row),row.id).run()
  if(tables.oc_members)for(const row of coordination.members.filter(m=>m.role==='stakeholder'))await db.prepare('UPDATE "'+tables.oc_members.replaceAll('"','""')+'" SET data=? WHERE id=?').bind(JSON.stringify(row),row.id).run()
  holdAutomation(coordination)
  for(const [key,name] of [['apiClients','oc_api_clients'],['apiEndpoints','oc_api_endpoints'],['apiOutbox','oc_api_outbox']])if(tables[name])for(const row of coordination[key]??[])await db.prepare('UPDATE "'+tables[name].replaceAll('"','""')+'" SET data=? WHERE id=?').bind(JSON.stringify(row),row.id).run()
  pauseChangeSources(coordination)
  pauseIntakeSources(coordination)
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
