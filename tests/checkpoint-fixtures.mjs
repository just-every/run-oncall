import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'

// Held historical records have no creation/dispatch HTTP door while paging is
// OFF. SQL is limited to held fixtures and rollback fault injection;
// configuration and human actions use HTTP.
export function checkpointSql(w,command) {
 if(w.sql)return w.sql(command)
 return JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--persist-to','.wrangler/state','--command',command,'--json'],{encoding:'utf8',env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']}))[0].results
}

export async function checkpointFixtures(w,cookie) {
 const req=(path,input)=>w.request(path,input,cookie),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value}
 const actor=ok(await req('/api/session')).member,id='checkpoint-cli'
 ok(await req('/api/command',{type:'service',id,name:'Checkpoint retained history',environment:'production',owner:actor.id,runbook:['Keep the original instructions'],pager:''}))
 ok(await req('/api/command',{type:'policy',service:id,severity:'*',action:'route',owner:actor.id,reason:'Retain the authored routing rule'}))
 const incident=ok(await req('/api/command',{type:'declare',service:id,title:'Checkpoint historical evidence',severity:'warning',summary:'Synthetic retained history only',alerts:[]}))
 const schedule=ok(await req('/api/paging/schedules',{id,name:'Checkpoint calendar',service:id,revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[actor.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}))
 const policy=ok(await req('/api/paging/policies',{service:id,scheduleId:schedule.id,revision:0,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3}))
 const at=Date.parse('2026-01-02T12:00:00Z'),coverage=ok(await req(`/api/schedules/${id}/now-next?at=${new Date(at).toISOString()}`)).now,workspace=ok(await req('/api/state'))
 const jobs=['pending','acknowledged'].map(suffix=>{
  const jobId=id+'-'+suffix,key=jobId+':0'
  const receipt={id:key,key,jobId,incident:incident.id,service:id,step:0,target:actor.id,payload:{incident:incident.id,service:id,role:'primary',target:actor.id},acceptedAt:at,status:'accepted'}
  const step={step:0,role:'primary',target:actor.id,deliveryKey:key,startedAt:at,deadline:at+policy.primaryWaitSeconds*1000,attempts:1,outcome:'accepted',receipt}
  const attempt={step:0,role:'primary',key,target:actor.id,at,outcome:'accepted',coverage,members:workspace.members,workspaceRevision:workspace.revision,selectionWarnings:[]}
  return {id:jobId,incident:incident.id,service:id,revision:2,status:'pending',nextDue:step.deadline,createdAt:at,lastEvaluatedAt:at,currentStep:0,policy,schedule,behaviors:{primary:'accepted',backup:'accepted'},steps:[step],history:[{type:'created',at,actor:null,reason:null,attempt:null},{type:'attempt',at,actor:null,reason:null,attempt}]}
 })
 const quote=v=>"'"+String(v).replaceAll("'","''")+"'",statements=[]
 for(const job of jobs){
  const receipt=job.steps[0].receipt,callback={id:job.id+'-callback',key:receipt.key,outcome:'delivered',at:at+1000,late:false,actor:actor.id}
  statements.push(`INSERT INTO paging_jobs(id,incident,service,revision,status,next_due,write_token,data) VALUES(${[job.id,job.incident,job.service].map(quote).join(',')},${job.revision},'pending',${job.nextDue},'checkpoint-history-fixture',${quote(JSON.stringify(job))})`)
  statements.push(`INSERT INTO paging_receipts(id,job_id,data) VALUES(${[receipt.id,job.id,JSON.stringify(receipt)].map(quote).join(',')})`)
  statements.push(`INSERT INTO paging_callbacks(id,key,data) VALUES(${[callback.id,callback.key,JSON.stringify(callback)].map(quote).join(',')})`)
 }
 statements.push("UPDATE paging_control SET revision=revision+1,write_token='checkpoint-history-fixture' WHERE id=1")
 checkpointSql(w,statements.join(';'))
 const acknowledged=ok(await req(`/api/paging/jobs/${jobs[1].id}/ack`,{revision:jobs[1].revision,at:Date.now()}))
 assert.deepEqual(acknowledged.history.slice(0,-1),jobs[1].history)
 assert.equal(acknowledged.history.at(-1).actor,actor.id)
 // Validate the held fixture through the public archive validator before export.
 const paging=ok(await req('/api/paging/archive'))
 assert.deepEqual(paging.jobs.find(j=>j.id===jobs[0].id),jobs[0])
 const context=ok(await req('/api/handoffs/context/'+incident.id))
 const payload={audience:'internal',title:'Reviewed checkpoint copy',summary:'Keep this exact authored summary',evidenceLinks:['https://example.test/evidence/checkpoint'],impactLinks:['https://example.test/impact/checkpoint']}
 const prepared=ok(await req('/api/handoffs/prepare',{id,incident:incident.id,incidentRevision:incident.revision,serviceHash:context.serviceHash,payload}),201).record
 const reviewed=ok(await req(`/api/handoffs/${id}/review`,{actionId:id+'-review',revision:prepared.revision,payloadHash:prepared.payloadHash,sourceHash:prepared.sourceHash,reason:'Exact copy and source reviewed before CLI recovery'}))
 assert.equal(reviewed.eligibility.eligible,true)
 assert.equal(reviewed.record.held,false)
 assert.deepEqual(reviewed.record.history.map(h=>h.actor),[actor,actor])
 return {handoff:id,pending:jobs[0].id}
}
