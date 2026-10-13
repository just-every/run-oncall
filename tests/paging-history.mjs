import assert from 'node:assert/strict'

// Retained synthetic records enter through the strict module restore door;
// no timer or provider is run by this flow.
export async function pagingHistory(w,cookie) {
 const req=(p,i)=>w.request(p,i,cookie),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value}
 const state=ok(await req('/api/state')),actor=ok(await req('/api/session')).member
 const service=state.services[0],at=Date.parse('2026-01-02T12:00:00Z')
 const incident=ok(await req('/api/command',{type:'declare',service:service.id,title:'Retained paging history',severity:'warning',summary:'Synthetic historical record only',alerts:[]}))
 const schedule=ok(await req('/api/paging/schedules',{id:'history',name:'Historical assignment',service:service.id,revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[actor.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}))
 const coverage=ok(await req(`/api/schedules/history/now-next?at=${new Date(at).toISOString()}`)).now
 const workspace=ok(await req('/api/state'))
 const policy={service:service.id,scheduleId:schedule.id,revision:1,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3}
 const historical=id=>{
  const key=id+':0',receipt={id:key,key,jobId:id,incident:incident.id,service:service.id,step:0,target:actor.id,payload:{incident:incident.id,service:service.id,role:'primary',target:actor.id},acceptedAt:at,status:'accepted'}
  const step={step:0,role:'primary',target:actor.id,deliveryKey:key,startedAt:at,deadline:at+180000,attempts:1,outcome:'accepted',receipt}
  const attempt={step:0,role:'primary',key,target:actor.id,at,outcome:'accepted',coverage,members:workspace.members,workspaceRevision:workspace.revision,selectionWarnings:[]}
  return {id,incident:incident.id,service:service.id,revision:2,status:'pending',nextDue:step.deadline,createdAt:at,lastEvaluatedAt:at,currentStep:0,policy,schedule,behaviors:{primary:'accepted',backup:'accepted'},steps:[step],history:[{type:'created',at,actor:null,reason:null,attempt:null},{type:'attempt',at,actor:null,reason:null,attempt}]}
 }
 const jobs=['historical-ack','historical-cancel'].map(historical),receipts=jobs.map(j=>j.steps[0].receipt),callbacks=receipts.map((r,i)=>({id:'callback-'+i,key:r.key,outcome:'delivered',at:at+1000,late:false,actor:actor.id}))
 const prior=ok(await req('/api/paging/archive')),archive={...prior,jobs,receipts,callbacks}
 const restored=ok(await req('/api/paging/restore',{mode:'replace',archive}))
 for(const job of restored.jobs){assert.equal(job.status,'paused');assert.deepEqual(job.history.slice(0,-1),jobs.find(j=>j.id===job.id).history)}
 const beforeIncident=ok(await req('/api/state')).incidents.find(i=>i.id===incident.id)
 for(const [id,action] of [['historical-ack','ack'],['historical-cancel','cancel']]){
  const old=restored.jobs.find(j=>j.id===id),at=Math.max(Date.now(),old.lastEvaluatedAt)
  const changed=ok(await req(`/api/paging/jobs/${id}/${action}`,{revision:old.revision,at,...(action==='cancel'?{reason:'Explicitly close historical work'}:{})}))
  assert.deepEqual(changed.history.slice(0,-1),old.history,'human action only appends history')
  assert.equal(changed.history.at(-1).actor,actor.id);assert.equal(changed.history.at(-1).type,action==='ack'?'acknowledged':'cancelled')
  assert.equal(changed.nextDue,null)
 }
 assert.deepEqual(ok(await req('/api/state')).incidents.find(i=>i.id===incident.id),beforeIncident,'historical acknowledgement or cancellation never proves incident recovery')
 const after=ok(await req('/api/paging/archive'))
 assert.deepEqual(after.receipts,receipts);assert.deepEqual(after.callbacks,callbacks)
 for(const invalid of [
  {...after,unknown:true}, {...after,schemaVersion:2},
  {...after,schedules:after.schedules.map((s,i)=>i? s:{...s,service:'missing-service'})},
  {...after,jobs:after.jobs.map((j,i)=>i?j:{...j,incident:'missing-incident'})},
  {...after,receipts:after.receipts.slice(1)},
  {...after,callbacks:after.callbacks.map((c,i)=>i?c:{...c,key:'missing-receipt'})}
 ]){
  ok(await req('/api/paging/restore',{mode:'replace',archive:invalid}),400)
  assert.deepEqual(ok(await req('/api/paging/archive')),after,'malformed module archive preserves every retained record')
 }
 w.sql("CREATE TRIGGER history_restore_failure BEFORE INSERT ON paging_callbacks BEGIN SELECT RAISE(ABORT,'INJECTED_STORAGE_FAILURE'); END")
 try{ok(await req('/api/paging/restore',{mode:'replace',archive:after}),503);assert.deepEqual(ok(await req('/api/paging/archive')),after,'SQL failure rolls back complete module replacement')}
 finally{w.sql('DROP TRIGGER history_restore_failure')}
 return {archive:after,incident:beforeIncident}
}
