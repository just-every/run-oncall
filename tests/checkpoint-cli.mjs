import {execFileSync,spawn} from 'node:child_process'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,writeFile,chmod,stat,symlink,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
// checkpoint-fixtures: part of this public journey.
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
  statements.push(`INSERT INTO paging_jobs(id,incident,service,revision,status,next_due,write_token,data) VALUES(${[job.id,job.incident,job.service].map(quote).join(',')},${job.revision},'pending',${job.nextDue},'synthetic-checkpoint-history-fixture',${quote(JSON.stringify(job))})`)
  statements.push(`INSERT INTO paging_receipts(id,job_id,data) VALUES(${[receipt.id,job.id,JSON.stringify(receipt)].map(quote).join(',')})`)
  statements.push(`INSERT INTO paging_callbacks(id,key,data) VALUES(${[callback.id,callback.key,JSON.stringify(callback)].map(quote).join(',')})`)
 }
 statements.push("UPDATE paging_control SET revision=revision+1,write_token='synthetic-checkpoint-history-fixture' WHERE id=1")
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


const ok=r=>{assert.equal(r.status,200,JSON.stringify(r.value));return r.value}
export async function checkpointReadback(w,cookie) {
 const [coordination,paging,handoffs]=await Promise.all(['/api/archive','/api/paging/state','/api/handoffs'].map(async path=>ok(await w.request(path,undefined,cookie))))
 return {coordination,paging,handoffs}
}
function pagingArchive({revision,workspaceRevision,paging,...archive}) {return archive}
function exported(checkpoint,before) {
 assert.deepEqual(checkpoint.coordination,before.coordination)
 assert.deepEqual(checkpoint.paging,pagingArchive(before.paging),'CLI exports complete configuration, jobs, histories, receipts and callbacks')
 assert.equal(checkpoint.workspaceRevision,before.coordination.revision);assert.equal(checkpoint.pagingRevision,before.paging.revision)
 if(checkpoint.handoffs){assert.deepEqual(checkpoint.handoffs.records,before.handoffs.records);assert.equal(checkpoint.handoffRevision,before.handoffs.revision)}
}
// Only server-generated recovery clocks/identities may differ. Compare every
// stored field and the entire attributed history prefix, including frozen data.
export function assertCheckpointRestored(checkpoint,after,handoffs=checkpoint.handoffs) {
 const inactive=structuredClone(checkpoint.coordination)
 if(inactive.scheduleRecords)inactive.scheduleRecords=inactive.scheduleRecords.map(row=>({...row,active:false,data:row.kind==='subscription'?{...row.data,hash:null}:row.data}))
 if(inactive.businessServices)inactive.businessServices=inactive.businessServices.map(service=>({...service,active:false,...(service.emailLists?{emailLists:service.emailLists.map(list=>({...list,active:false}))}:{}),subscriptions:service.subscriptions.map(row=>({...row,active:false})),notices:service.notices.map(row=>({...row,state:'stopped'}))}))
 for(const i of inactive.incidents){if(i.deadlines)i.deadlines=i.deadlines.map(d=>({...d,...(d.state==='pending'?{state:'held',outcome:'Restored inactive; deadline will not resume'}:{}),obligation:d.obligation?{...d.obligation,state:'stopped'}:null}));if(i.manualPage)i.manualPage.obligations=i.manualPage.obligations.map(o=>o.state==='recorded'?{...o,state:'stopped',outcome:'Restored inactive; no sender'}:o);if(i.responderRequests)i.responderRequests=i.responderRequests.map(r=>({...r,status:r.status==='pending'?'held':r.status,obligation:r.obligation.state==='recorded'?{...r.obligation,state:'stopped',outcome:'Restored inactive; no sender'}:r.obligation,notice:r.notice?{...r.notice,state:'stopped'}:null}));}
 inactive.members=inactive.members.map(member=>member.role==='stakeholder'?{...member,active:false}:member)
 for(const key of ['changeSources','intakeSources','emailAddresses','apiClients','apiEndpoints'])if(inactive[key])inactive[key]=inactive[key].map(source=>({...source,active:false}))
 if(inactive.apiOutbox)inactive.apiOutbox=inactive.apiOutbox.map(item=>{
  const restored=after.coordination.apiOutbox.find(o=>o.id===item.id);assert.ok(restored)
  if(!['queued','sending','failed'].includes(item.status))return {...item,authorized:false}
  const event=restored.history.at(-1);assert.equal(event.reason,'restore-requires-authorization');assert.ok(Number.isFinite(Date.parse(event.at)))
  assert.equal(event.status,item.status==='sending'?'uncertain':'interrupted')
  return {...item,authorized:false,status:event.status,revision:item.revision+1,lease:null,leaseUntil:null,history:[...item.history,event]}
 })
 assert.deepEqual({...after.coordination,revision:inactive.revision},inactive,'all coordination history survives; imported intake requires local reauthorization')
 assert.equal(after.paging.paging,'OFF');assert.equal(after.handoffs.delivery,'unsent')
 const expected=structuredClone(checkpoint.paging)
 expected.jobs=expected.jobs.map(job=>{
  if(job.status!=='pending')return job
  const restored=after.paging.jobs.find(j=>j.id===job.id);assert.ok(restored,'pending history remains present')
  const event=restored.history.at(-1)
  assert.equal(restored.revision,job.revision+1);assert.ok(restored.lastEvaluatedAt>=job.lastEvaluatedAt)
  assert.equal(event.type,'paused');assert.equal(event.at,restored.lastEvaluatedAt)
  assert.equal(event.actor,null);assert.equal(event.attempt,null);assert.ok(typeof event.reason==='string'&&event.reason.length>0)
  return {...job,revision:job.revision+1,status:'paused',nextDue:null,lastEvaluatedAt:restored.lastEvaluatedAt,history:[...job.history,event]}
 })
 for(const schedule of checkpoint.paging.schedules){const restored=after.paging.schedules.find(row=>row.id===schedule.id);for(const key of ['layers','companyDates','pto'])assert.deepEqual(restored[key],schedule[key]);}
 assert.deepEqual(pagingArchive(after.paging),expected,'CLI recovery preserves all paging data except the appended pending-job pause')
 assert.ok(handoffs,'v1 callers supply the handoffs retained in the destination')
 const records=handoffs.records.map(record=>{
  if(record.status!=='reviewed'||record.held)return record
  const restored=after.handoffs.records.find(r=>r.id===record.id);assert.ok(restored,'active approval remains present')
  const event=restored.history.at(-1)
  assert.equal(event.type,'recovery-held');assert.ok(event.actionId.startsWith('recovery:')&&event.actionId.endsWith(':'+record.id))
  assert.ok(event.at>=record.history.at(-1).at);assert.equal(event.actor,null)
  assert.equal(event.expectedRevision,record.revision);assert.equal(event.payloadHash,record.payloadHash);assert.equal(event.sourceHash,record.sourceHash)
  assert.equal(event.selfReview,false);assert.ok(typeof event.reason==='string'&&event.reason.length>0)
  const eligibility=after.handoffs.eligibility.find(r=>r.id===record.id)
  assert.equal(eligibility.eligible,false);assert.ok(eligibility.diagnostics.includes('recovery-held'))
  return {...record,revision:record.revision+1,held:true,history:[...record.history,event]}
 })
 assert.deepEqual(after.handoffs.records,records,'CLI recovery preserves exact payloads, snapshots, identities and attributed history; only active approvals gain holds')
}

// Both activation's held-password session and transfer's Base session use this
// real CLI/HTTP flow. Credentials travel only in owned private files.
export async function checkpointCli(w,cookie) {
 const fixture=await checkpointFixtures(w,cookie)
 const dir=await mkdtemp(join(tmpdir(),'oncall-checkpoint-')),session=join(dir,'session'),file=join(dir,'checkpoint.json'),runs=[]
 const cli=(args,sessionPath=session)=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['scripts/checkpoint.mjs','--origin',w.origin,'--session-file',sessionPath,...args],{stdio:['ignore','pipe','pipe']})
  let stdout='',stderr='';child.stdout.on('data',v=>stdout+=v);child.stderr.on('data',v=>stderr+=v)
  child.on('error',reject);child.on('exit',status=>{const result={status,stdout,stderr};runs.push(result);resolve(result)})
 })
 // Classify stderr without echoing child output or any credential-bearing text.
 const succeeds=async(args,label)=>{
  const result=await cli(args)
  const reason=[
   ['Session file must contain','session-cookie validation refused'],
   ['Session file must be','private session-file validation refused'],
   ['Local file operation failed','local file operation failed'],
   ['Local request failed','local transport failed'],
   ['HTTP ','server refused checkpoint request'],
   ['Session file is locked','session lock unavailable'],
   ['Replacement succeeded','session rotation response invalid'],
  ].find(([prefix])=>result.stderr.startsWith('checkpoint: '+prefix))?.[1]??'unclassified CLI failure'
  assert.equal(result.status,0,`${label}: ${reason}`)
 }
 const state=c=>w.request('/api/state',undefined,c),read=c=>checkpointReadback(w,c)
 const noEffects=async(c,prior)=>{
  assert.equal((await w.request(`/api/handoffs/${fixture.handoff}/export`,undefined,c)).status,409,'held approval cannot export')
  assert.equal((await w.request(`/api/paging/jobs/${fixture.pending}/resume`,{},c)).status,409,'restored historical work cannot dispatch')
  assert.deepEqual(await read(c),prior,'refused export/resume creates no provider action, receipt, callback or history')
 }
 try{
  await writeFile(session,cookie,{mode:0o600})
  const before=await read(cookie),packet=ok(await w.request(`/api/handoffs/${fixture.handoff}/export`,undefined,cookie))
  assert.equal(packet.review.eligible,true);assert.equal(packet.transport,'unsent');assert.deepEqual(packet.providerActions,[])
  assert.deepEqual(packet.record,before.handoffs.records.find(r=>r.id===fixture.handoff))
  await succeeds(['export',file],'v2 CLI export succeeds')
  assert.equal((await stat(file)).mode&0o777,0o600)
  const checkpoint=JSON.parse(await readFile(file,'utf8'));exported(checkpoint,before)
  const refused=async(args,sessionPath=session)=>{
   assert.equal((await cli(args,sessionPath)).status,1)
   assert.ok(await readFile(session,'utf8')===cookie,'refused replacement leaves the private session unchanged')
   assert.deepEqual(await read(cookie),before,'failed CLI leaves coordination, paging, handoffs and current authority intact')
  }
  await refused(['export',file]) // export never overwrites
  await refused(['restore',file]) // replacement must be explicit
  assert.equal((await w.request('/api/recovery/restore',{mode:'replace',checkpoint:JSON.parse(await readFile(file,'utf8'))})).status,401,'anonymous restore is denied')
  await chmod(session,0o644);await refused(['restore',file,'--replace'])
  await chmod(session,0o600);const link=join(dir,'session-link');await symlink(session,link)
  await refused(['restore',file,'--replace'],link)
  const malformed=join(dir,'malformed.json'),changedCopy=structuredClone(checkpoint)
  changedCopy.handoffs.records.find(r=>r.id===fixture.handoff).payload.summary+=' unreviewed change'
  for(const invalid of [{...checkpoint,unknown:true},{...checkpoint,paging:{...checkpoint.paging,receipts:checkpoint.paging.receipts.slice(1)}},changedCopy]){
   await writeFile(malformed,JSON.stringify(invalid),{mode:0o600});await refused(['restore',malformed,'--replace'])
  }
  const tooLarge=structuredClone(checkpoint)
  tooLarge.coordination.services[0].runbook=['x'.repeat(1000001)]
  await writeFile(malformed,JSON.stringify(tooLarge),{mode:0o600});await refused(['restore',malformed,'--replace'])
  checkpointSql(w,"CREATE TRIGGER checkpoint_cli_restore_failure BEFORE INSERT ON paging_callbacks BEGIN SELECT RAISE(ABORT,'INJECTED_STORAGE_FAILURE'); END")
  try{await refused(['restore',file,'--replace'])}finally{checkpointSql(w,'DROP TRIGGER checkpoint_cli_restore_failure')}
  await succeeds(['restore',file,'--replace'],'v2 CLI restore succeeds')
  const rotated=(await readFile(session,'utf8')).trim()
  assert.ok(rotated!==cookie);assert.equal((await stat(session)).mode&0o777,0o600)
  for(const local of cookie.split('; ').filter(c=>!c.startsWith('oncall_session_')))assert.ok(rotated.split('; ').includes(local),'Base-native restore retains all installation cookies')
  const after=await read(rotated);assertCheckpointRestored(checkpoint,after);await noEffects(rotated,after)
  if(cookie.includes('oncall_session_'))assert.equal((await state(cookie)).status,401,'old Oncall cookie loses authority')
  const legacy=join(dir,'legacy.json');await succeeds(['export',legacy,'--version','1'],'v1 CLI export succeeds')
  const v1=JSON.parse(await readFile(legacy,'utf8'));assert.equal(v1.handoffs,undefined);exported(v1,after)
  // Re-review our small record after export. Capped existing histories remain
  // held, while v1 must retain and hold this new approval in the destination.
  const held=after.handoffs.records.find(r=>r.id===fixture.handoff)
  const reviewed=ok(await w.request(`/api/handoffs/${fixture.handoff}/review`,{actionId:fixture.handoff+'-v1-review',revision:held.revision,payloadHash:held.payloadHash,sourceHash:held.sourceHash,reason:'Reviewed again after legacy checkpoint export'},rotated))
  assert.equal(reviewed.eligibility.eligible,true)
  const retained=await read(rotated),actor=ok(await w.request('/api/session',undefined,rotated)).member
  const invalidV1={...v1,coordination:{...v1.coordination,members:v1.coordination.members.map(m=>m.id===actor.id?{...m,active:false}:m)}}
  await writeFile(malformed,JSON.stringify(invalidV1),{mode:0o600})
  const privateBefore=await readFile(session,'utf8')
  assert.equal((await cli(['restore',malformed,'--replace'])).status,1,'v1 also requires the current administrator mapping')
  assert.ok(await readFile(session,'utf8')===privateBefore,'v1 refusal preserves the session file')
  assert.deepEqual(await read(rotated),retained,'v1 refusal preserves all datasets and active authority')
  await succeeds(['restore',legacy,'--replace'],'v1 CLI restore succeeds')
  const final=(await readFile(session,'utf8')).trim(),finalState=await read(final)
  assert.ok(final!==rotated);assert.equal((await stat(session)).mode&0o777,0o600)
  for(const local of cookie.split('; ').filter(c=>!c.startsWith('oncall_session_')))assert.ok(final.split('; ').includes(local),'v1 retains all Base installation cookies')
  assertCheckpointRestored(v1,finalState,{records:retained.handoffs.records});await noEffects(final,finalState)
  assert.equal((await state(rotated)).status,401,'subsequent successful restore revokes the previous rotated session')
  for(const token of [cookie,rotated,final].flatMap(c=>c.split('; ').map(v=>v.split('=')[1])))
   assert.ok(!runs.some(r=>(r.stdout+r.stderr).includes(token)),'CLI output never discloses session values')
  const current=ok(await w.request('/api/recovery/checkpoint',undefined,final))
  const race=await Promise.all([0,1].map(()=>w.request('/api/recovery/restore',{mode:'replace',checkpoint:current},final)))
  const winner=race.find(r=>r.status===200),loser=race.find(r=>r!==winner)
  assert.ok(winner&&[401,409].includes(loser.status),'exactly one concurrent checkpoint restore publishes')
  const next=final.split('; ').filter(c=>!c.startsWith('oncall_session_')).concat(winner.cookie.split('; ').filter(c=>c.startsWith('oncall_session_'))).join('; ')
  const afterRace=await read(next);assertCheckpointRestored(current,afterRace);await noEffects(next,afterRace)
  return next
 }finally{await rm(dir,{recursive:true,force:true})}
}

// Continue the existing transfer journey through the private CLI after erasure.
export async function checkpointErasureCli(w,cookie,erase) {
 const dir=await mkdtemp(join(tmpdir(),'oncall-erasure-checkpoint-')),session=join(dir,'session'),old=join(dir,'old.json'),current=join(dir,'current.json');
 const cli=args=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/checkpoint.mjs','--origin',w.origin,'--session-file',session,...args],{stdio:['ignore','pipe','pipe']});let output='';for(const pipe of [child.stdout,child.stderr])pipe.on('data',v=>output+=v);child.on('error',reject);child.on('exit',status=>resolve({status,output}));});
 try {
  await writeFile(session,cookie,{mode:0o600});assert.equal((await cli(['export',old])).status,0);
  await erase();const before=await checkpointReadback(w,cookie);
  const refused=await cli(['restore',old,'--replace']);const visible=await w.request('/api/state',undefined,(await readFile(session,'utf8')).trim());console.log(JSON.stringify({witness:'CLI-erasure-fence',exit:refused.status,labelReturned:JSON.stringify(visible.value).includes('alice@example.test automation')}));assert.equal(refused.status,1);assert.match(refused.output,/erasure fence/i);assert.ok(!refused.output.includes('alice@example.test'));
  assert.equal(await readFile(session,'utf8'),cookie);assert.deepEqual(await checkpointReadback(w,cookie),before);
  assert.equal((await cli(['export',current])).status,0);assert.equal((await cli(['restore',current,'--replace'])).status,0);
  const next=(await readFile(session,'utf8')).trim();assertCheckpointRestored(JSON.parse(await readFile(current,'utf8')),await checkpointReadback(w,next));
  assert.equal((await cli(['restore',old,'--replace'])).status,1,'current CLI restore retains the erasure fence');
  console.log('PASS OC-053 CLI erasure fence: older checkpoint refuses without dataset/session changes; current checkpoint restores');return next;
 } finally {await rm(dir,{recursive:true,force:true});}
}

// OC-055 focused execution extends this existing CLI journey with held key custody.
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]) {
 const {localWorker,ownerDoor}=await import('./worker.mjs'),{randomBytes}=await import('node:crypto')
 const w=await localWorker();let cookie
 try {
  const owner=await w.request('/api/setup',{name:'synthetic-oncall-1',password:'synthetic-oncall-checkpoint-password'});assert.equal(owner.status,200);cookie=owner.cookie
  ok(await w.request('/api/command',{type:'service',id:'synthetic-oncall-1',name:'Synthetic checkpoint service',environment:'production',owner:owner.value.member.id,runbook:[],pager:''},cookie))
  const door=ownerDoor(w,cookie),preview=ok(await door.preview('pagerduty',JSON.stringify({integrations:[{id:'synthetic-oncall-1',type:'events_api_v2_inbound_integration'}]})))
  ok(await door.apply('pagerduty',preview))
  const row=ok(await w.request('/api/move-in/objects',undefined,cookie)).find(row=>row.targetKind==='integration'),key=randomBytes(16).toString('hex')
  const supplied=await w.request('/api/intake/incumbent',{importedId:row.targetId,importedRevision:row.revision,id:'synthetic-oncall-1',service:'synthetic-oncall-1',name:'Synthetic checkpoint incumbent',revision:0,key},cookie);assert.equal(supplied.status,201)
  const active=ok(await w.request('/api/intake/sources/synthetic-oncall-1/activate-incumbent',{revision:supplied.value.source.revision,confirmed:true},cookie)),digest=w.sql('SELECT key_digest FROM oc_incumbent_credentials')[0].key_digest
  const checkpoint=JSON.stringify(ok(await w.request('/api/recovery/checkpoint',undefined,cookie)))
  for(const secret of [key,active.nativeKey,digest])assert.ok(!checkpoint.includes(secret),'checkpoint excludes both keys and verification material')
  cookie=await checkpointCli(w,cookie)
  const status=ok(await w.request('/api/intake/sources/synthetic-oncall-1/incumbent',undefined,cookie))
  assert.equal(status.source.active,false);assert.equal(status.keySupplied,false);assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_incumbent_credentials')[0].n,0)
  const refused=await w.request('/api/intake/sources/synthetic-oncall-1/activate-incumbent',{revision:status.source.revision,confirmed:true},cookie);assert.equal(refused.status,409)
  console.log('OC-055 real CLI checkpoint: both keys and hashes excluded; all held history restored; integration inactive and supply required again')
 }finally{await w.close()}
}
