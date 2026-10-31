import {mkdtemp,readdir,copyFile,readFile,writeFile,mkdir,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {execFileSync,spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {createHash,createHmac} from 'node:crypto'
import {localWorker,ownerDoor,durableSnapshot} from './worker.mjs'
import {checkpointCli,checkpointErasureCli} from './checkpoint-cli.mjs'
// paging-history: part of this public journey.
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
 // Checkpoint recovery removes other passwords; reauthorize the existing fixtures through the admin door.
 const callers=[{role:'anonymous',cookie:undefined,status:401}]
 for(const [name,role] of [['Vic','viewer'],['Rhea','responder']]){
  const member=state.members.find(member=>member.name===name);assert.ok(member)
  ok(await req('/api/password',{member:member.id,password:'synthetic-local-testing-password'}))
  const login=await w.request('/api/login',{name,password:'synthetic-local-testing-password'});ok(login)
  const current=ok(await w.request('/api/session',undefined,login.cookie)).member
  assert.equal(current.role,role);assert.equal(current.active,true)
  callers.push({role,cookie:login.cookie,status:403})
 }
 const retainedWorkspace=ok(await req('/api/state')),retainedPaging=ok(await req('/api/paging/state'))
 const moduleRows=()=>w.statements(['paging_control','paging_schedules','paging_policies','paging_jobs','paging_receipts','paging_callbacks'].map(table=>`SELECT * FROM ${table} ORDER BY rowid`).join(';'))
 const retainedRows=moduleRows()
 for(const caller of callers)for(const [path,input] of [['/api/paging/archive',undefined],['/api/paging/restore',{mode:'replace',archive}]]){
  const ordinal=w.sql('SELECT COALESCE(MAX(ordinal),0) AS ordinal FROM oc_admin_audit')[0].ordinal
  const refused=ok(await w.request(path,input,caller.cookie),caller.status)
  assert.deepEqual(Object.keys(refused),['error'],`${caller.role} refusal discloses no archive or restored records`)
  assert.equal(typeof refused.error,'string')
  assert.deepEqual(moduleRows(),retainedRows,`${caller.role} ${path} preserves every module record and revision`)
  assert.deepEqual(ok(await req('/api/state')),retainedWorkspace,'refused module access preserves coordination records and revision')
  assert.deepEqual(ok(await req('/api/paging/state')),retainedPaging,'refused module access preserves the complete paging snapshot')
  if(caller.cookie){
   const audit=w.sql(`SELECT kind,outcome,workspace_before,workspace_after,paging_before,paging_after FROM oc_admin_audit WHERE ordinal>${ordinal}`)
   assert.deepEqual(audit,[{kind:path.endsWith('/archive')?'paging.archive':'paging.restore',outcome:'refused',workspace_before:retainedWorkspace.revision,workspace_after:retainedWorkspace.revision,paging_before:retainedPaging.revision,paging_after:retainedPaging.revision}],'authenticated refusals retain their audit without a product write')
  }
 }
 // OC-014: populated delivery history remains historical through every schedule preview.
 const pagingBefore=ok(await req('/api/paging/state')),recordsBefore=durableSnapshot(w)
 assert.equal(pagingBefore.mode,'synthetic-only');assert.equal(pagingBefore.paging,'OFF')
 assert.deepEqual(pagingBefore.receipts,receipts);assert.deepEqual(pagingBefore.callbacks,callbacks)
 assert.ok(pagingBefore.jobs.every(job=>job.steps[0].deadline===at+180000&&job.nextDue===null))
 assert.deepEqual(await w.outboundRequests(),[],'restoring synthetic history never contacts a provider')
 const draft={...schedule,primary:{...schedule.primary,members:[]}},range={from:at,to:at+3600000}
 const now=ok(await req('/api/schedules/history/now-next?at='+new Date(at).toISOString()))
 assert.equal(now.now.primary,actor.id);assert.equal(now.paging,'OFF')
 assert.deepEqual(durableSnapshot(w),recordsBefore,'now and next preserve every durable record, deadline and outbound work item')
 for(const [input,primary] of [[{scheduleId:schedule.id},actor.id],[{schedule:draft},null]]){
  const preview=ok(await req('/api/paging/preview',{...input,...range}))
  assert.equal(preview[0].primary,primary)
  assert.deepEqual(durableSnapshot(w),recordsBefore,'saved and draft previews preserve every durable record, audit, receipt, job and deadline')
  assert.deepEqual(await w.outboundRequests(),[],'schedule previews issue zero outbound network requests')
 }
 const review=ok(await req('/api/schedules/history/review',{schedule:draft,...range}))
 assert.equal(review.coverage[0].primary,null);assert.ok(review.intervals.some(row=>row.role==='primary'&&row.newGap))
 assert.deepEqual(durableSnapshot(w),recordsBefore,'reviewing a draft never saves it or creates outbound work')
 for(const job of restored.jobs){
  const replay=ok(await req('/api/paging/jobs/'+job.id+'/replay'))
  assert.equal(replay.length,1);assert.deepEqual(replay[0].recorded,job.history[1].attempt)
  assert.deepEqual(replay[0].recomputed,coverage,'historical replay uses the frozen assignment and member snapshot')
  assert.deepEqual(durableSnapshot(w),recordsBefore,'historical replay changes no durable row or timer')
 }
 assert.deepEqual(ok(await req('/api/paging/state')),pagingBefore,'all previews retain the synthetic label and complete delivery history')
 assert.deepEqual(await w.outboundRequests(),[],'now and next, draft review and historical replay issue zero outbound requests')
 console.log('PASS OC-014 preview isolation: populated synthetic-only history, saved and draft schedules, draft review, now and next, historical replay, every durable row and deadline unchanged, zero outbound network requests')
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


// schedule-coordination: part of this public journey.
export async function scheduleCoordination(){
 await scheduleLayers();
 await savedRotationCoverage();
 const w=await localWorker({}, {clock:true,outboundLedger:true});
 try{
  const owner=await w.request('/api/setup',{name:'synthetic-oncall-250',password:'synthetic-oncall-250-password'});ok(owner);let cookie=owner.cookie;
  const req=(path,input)=>w.request(path,input,cookie),coord=input=>req('/api/schedule-coordination',input),rows=async()=>ok(await coord()).records;
  const substitute=ok(await req('/api/members',{name:'synthetic-oncall-251',role:'responder',password:'synthetic-oncall-251-password'}),201),outsider=ok(await req('/api/members',{name:'synthetic-oncall-252',role:'responder',password:'synthetic-oncall-252-password'}),201),viewer=ok(await req('/api/members',{name:'synthetic-oncall-253',role:'viewer',password:'synthetic-oncall-253-password'}),201);
  const login=async(member,n)=>{const response=await w.request('/api/login',{name:member.name,password:'synthetic-oncall-'+n+'-password'});ok(response);return response.cookie;};
  const substituteCookie=await login(substitute,251),outsiderCookie=await login(outsider,252),viewerCookie=await login(viewer,253);
  const as=(asCookie,input)=>w.request('/api/schedule-coordination',input,asCookie);
  const service=ok(await req('/api/command',{type:'service',id:'synthetic-oncall-250',name:'Synthetic shift service',environment:'test',owner:owner.value.member.id,runbook:[],pager:''}));
  const start=new Date(Math.ceil((Date.now()+2*3600000)/3600000)*3600000).toISOString(),end=new Date(Date.parse(start)+3600000).toISOString();
  let schedule=ok(await req('/api/paging/schedules',{id:'synthetic-oncall-250',name:'Synthetic coordination rota',service:service.id,revision:0,timezone:'UTC',validFrom:start,validUntil:null,primary:{anchorLocal:start.slice(0,16),periodDays:1,members:[owner.value.member.id,outsider.id],ambiguity:'earlier'},backup:{anchorLocal:start.slice(0,16),periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}));
  const overlap=ok(await req('/api/paging/schedules',{...schedule,id:'synthetic-oncall-255',revision:0,backup:{...schedule.backup,members:[substitute.id]}}));
  // OC-020 / OC-014: one aggregate read agrees with each rota's existing resolver and never commits.
  {
   const at=Date.parse(start),schedules=ok(await req('/api/paging/state')).schedules;
   const counts=()=>{const names=w.sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name").map(row=>row.name);return w.statements(names.map(name=>'SELECT COUNT(*) AS count FROM "'+name.replaceAll('"','""')+'"').join(';')).map((rows,index)=>({table:names[index],count:rows[0].count}));};
   const before=counts(),workspace=ok(await req('/api/state')),paging=ok(await req('/api/paging/state')),recordsBefore=durableSnapshot(w);
   for(let n=0;n<20;n++){
    const all=ok(await req('/api/on-call?at='+encodeURIComponent(start)));
    assert.equal(all.rotas.length,schedules.length,'all rotas appear together');
    for(const schedule of schedules){
     const rota=all.rotas.find(row=>row.id===schedule.id),single=ok(await req('/api/schedules/'+encodeURIComponent(schedule.id)+'/now-next?at='+encodeURIComponent(start)));
     assert.ok(rota);assert.equal(rota.now.primary?.id??null,single.now.primary);assert.equal(rota.now.backup?.id??null,single.now.backup);
     const nextAt=Math.min(...single.now.windows.flatMap(window=>window.end?[Date.parse(window.end)]:[]));
     if(Number.isFinite(nextAt)){
      assert.equal(Date.parse(rota.next.at),nextAt);
      const next=ok(await req('/api/schedules/'+encodeURIComponent(schedule.id)+'/now-next?at='+encodeURIComponent(rota.next.at)));
      assert.equal(rota.next.primary?.id??null,next.now.primary);assert.equal(rota.next.backup?.id??null,next.now.backup);
     }
    }
    assert.ok(all.rotas.find(row=>row.id===schedule.id).gaps.some(gap=>gap.role==='backup'&&Date.parse(gap.from)<=at&&Date.parse(gap.to)>at),'empty backup slots are gaps');
   }
   console.log(JSON.stringify({onCallReads:20,countsBefore:before,countsAfter:counts(),workspaceRevision:workspace.revision,pagingRevision:paging.revision}));
   assert.deepEqual(counts(),before,'twenty reads leave every table count unchanged');
   assert.deepEqual(ok(await req('/api/state')),workspace,'twenty reads preserve workspace and revision');
   assert.deepEqual(ok(await req('/api/paging/state')),paging,'twenty reads preserve scheduling revisions');
   assert.deepEqual(durableSnapshot(w),recordsBefore,'aggregate now and next preserve every durable row including audit and outbound work');
   assert.deepEqual(await w.outboundRequests(),[],'aggregate now and next issue zero outbound network requests');
   const combined=ok(await req('/api/workspace'));assert.deepEqual(combined.onCall.rotas.map(row=>row.id),schedules.map(row=>row.id));
   ok(await w.request('/api/on-call'),401);ok(await w.request('/api/on-call?at='+encodeURIComponent(start),undefined,viewerCookie));ok(await w.request('/api/on-call?at='+encodeURIComponent(start),undefined,substituteCookie));
   const stakeholder=ok(await req('/api/members',{name:'synthetic-oncall-254',role:'stakeholder',password:'synthetic-oncall-254-password'}),201);
   ok(await w.request('/api/on-call',undefined,await login(stakeholder,254)),403);
   const ended=await w.request('/api/login',{name:viewer.name,password:'synthetic-oncall-253-password'});ok(ended);ok(await w.request('/api/logout',{},ended.cookie));ok(await w.request('/api/on-call',undefined,ended.cookie),401);
   const expiredRead=await w.request('/api/login',{name:viewer.name,password:'synthetic-oncall-253-password'});ok(expiredRead);w.sql("UPDATE sessions SET expires=0 WHERE token=(SELECT token FROM sessions WHERE member='"+viewer.id+"' ORDER BY expires DESC LIMIT 1)");ok(await w.request('/api/on-call',undefined,expiredRead.cookie),401);
   console.log('PASS OC-020 / OC-014 aggregate on-call: all rotas match now/next, empty slot is a gap, 20 reads preserve every table and both revisions, workspace snapshot carries coverage, viewer/responder reads and anonymous/stakeholder/revoked refusals');
  }
  ok(await coord({action:'request',schedule:overlap.id,scheduleRevision:overlap.revision,substitute:substitute.id,role:'primary',start,end}),409);
  const formerService=ok(await req('/api/command',{type:'service',id:'synthetic-oncall-256',name:'Synthetic former service',environment:'test',owner:outsider.id,runbook:[],pager:''}));
  const moved=ok(await req('/api/paging/schedules',{...schedule,id:'synthetic-oncall-256',service:formerService.id,revision:0,primary:{...schedule.primary,members:[owner.value.member.id]}}));
  const beforeMove=ok(await req('/api/state')),beforeMovePaging=ok(await req('/api/paging/state'));
  ok(await req('/api/schedules/'+moved.id+'/review',{schedule:{...moved,service:service.id},from:Date.parse(start),to:Date.parse(end)}),400);
  assert.deepEqual(ok(await req('/api/state')),beforeMove,'a refused service-identity change records no notices');
  assert.deepEqual(ok(await req('/api/paging/state')),beforeMovePaging,'a refused service-identity change preserves assignments and history');
  const request={action:'request',schedule:schedule.id,scheduleRevision:schedule.revision,substitute:substitute.id,role:'primary',start,end};
  ok(await as(viewerCookie,request),403);ok(await as(outsiderCookie,request),409);
  let swap=ok(await coord(request)).record;
  ok(await as(outsiderCookie,{action:'accept',id:swap.id,revision:swap.revision}),403);
  ok(await as(substituteCookie,{action:'accept',id:swap.id,revision:swap.revision}),403);
  ok(await as(outsiderCookie,{action:'approve',id:swap.id,revision:swap.revision}),403);
  swap=ok(await coord({action:'approve',id:swap.id,revision:swap.revision})).record;
  let racing=ok(await coord(request)).record;racing=ok(await coord({action:'approve',id:racing.id,revision:racing.revision})).record;
  const raced=await Promise.all([swap,racing].map(row=>as(substituteCookie,{action:'accept',id:row.id,revision:row.revision})));
  assert.equal(raced.filter(r=>r.status===200).length,1);assert.equal(raced.filter(r=>r.status===409).length,1);
  schedule=ok(await req('/api/paging/state')).schedules.find(s=>s.id===schedule.id);assert.equal(schedule.overrides.length,1);
  const coverage=ok(await req('/api/schedules/'+schedule.id+'/now-next?at='+encodeURIComponent(start)));assert.equal(coverage.now.primary,substitute.id);assert.equal(coverage.now.backup,null);
  const pending=(await rows()).find(r=>r.kind==='swap'&&r.data.status==='pending');ok(await coord({action:'cancel',id:pending.id,revision:pending.revision}));
  const notices=ok(await req('/api/state')).scheduleRecords.filter(r=>r.kind==='notice'&&r.data.schedule===schedule.id&&r.data.key.includes(':2:'));
  assert.deepEqual(new Set(notices.map(r=>r.member)),new Set([owner.value.member.id,substitute.id,outsider.id]));
  for(const notice of notices){assert.equal(notice.data.obligation.reason,'schedule-change');assert.equal(notice.data.obligation.automatic,false);assert.match(notice.data.obligation.outcome,/not deliverable/);}
  const policy=ok(await coord({action:'policy',schedule:schedule.id,swapApproval:'none'})).record;
  assert.equal(policy.data.swapApproval,'none');
  const laterStart=new Date(Date.parse(start)+2*86400000).toISOString(),laterEnd=new Date(Date.parse(end)+2*86400000).toISOString();
  const later=ok(await coord({...request,scheduleRevision:schedule.revision,start:laterStart,end:laterEnd})).record;assert.equal(later.data.approved,true);
  const held=ok(await req('/api/state'));
  w.sql("CREATE TRIGGER synthetic_schedule_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='schedule.accept' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-250-audit'); END");
  try{ok(await as(substituteCookie,{action:'accept',id:later.id,revision:later.revision}),503);}finally{w.sql('DROP TRIGGER synthetic_schedule_audit');}
  assert.deepEqual(ok(await req('/api/state')),held,'failed audit publishes no swap decision, override or notice');
  assert.equal(ok(await req('/api/paging/state')).schedules.find(s=>s.id===schedule.id).overrides.length,1);
  const reminder=ok(await coord({action:'reminder',leadMinutes:30,channel:'email'})).record;
  assert.equal(reminder.data.leadMinutes,30);const due=(await rows()).find(r=>r.id===reminder.id);assert.ok(Number.isFinite(Date.parse(due.dueAt)));assert.equal(due.label,'not sent (no timer)');
  const subscriptions=[];
  for(const scope of ['schedule','service','own']){
   const created=ok(await coord({action:'subscribe',scope,target:scope==='service'?service.id:schedule.id}));subscriptions.push(created);
   const feed=await w.send(new URL(created.url).pathname,undefined,{},'GET');assert.equal(feed.status,200);assert.match(feed.value,/BEGIN:VCALENDAR/);assert.match(feed.value,/BEGIN:VEVENT/);
   for(const forbidden of ['CONTACT','ATTENDEE','mailto:',owner.value.member.name,substitute.name,'synthetic-oncall-250-password',created.url])assert.ok(!feed.value.includes(forbidden),'capability feed contains schedule windows only');
   const stored=w.sql("SELECT data FROM oc_schedule_records WHERE id='"+created.record.id+"'")[0].data;
   assert.ok(!stored.includes(new URL(created.url).pathname.split('/').at(-1).replace('.ics','')),'only a token hash is stored');
   assert.ok(!(await rows()).some(r=>r.kind==='subscription'&&Object.hasOwn(r.data,'hash')),'normal reads never disclose hashes or bearer URLs');
  }
  const otherFeed=ok(await as(substituteCookie,{action:'subscribe',scope:'own'}));ok(await coord({action:'revoke',id:otherFeed.record.id,revision:otherFeed.record.revision}));assert.equal((await w.send(new URL(otherFeed.url).pathname,undefined,{},'GET')).status,404,'admin revocation takes effect immediately for another member');
  const revoked=subscriptions[0],history=ok(await req('/api/paging/state')).schedules;
  ok(await as(outsiderCookie,{action:'revoke',id:revoked.record.id,revision:revoked.record.revision}),403);
  ok(await coord({action:'revoke',id:revoked.record.id,revision:revoked.record.revision}));assert.equal((await w.send(new URL(revoked.url).pathname,undefined,{},'GET')).status,404);
  assert.deepEqual(ok(await req('/api/paging/state')).schedules,history,'revoking access never changes assignment history');
  for(let n=3;n<20;n++)ok(await coord({action:'subscribe',scope:'own'}));ok(await coord({action:'subscribe',scope:'own'}),429);
  const checkpoint=ok(await req('/api/recovery/checkpoint')),before=ok(await req('/api/state')),invalid=structuredClone(checkpoint);invalid.coordination.scheduleRecords[0].kind='invalid';
  ok(await req('/api/recovery/restore',{mode:'replace',checkpoint:invalid}),400);assert.deepEqual(ok(await req('/api/state')),before);
  const jsonArchive=ok(await req('/api/archive')),nativeRestore=await req('/api/restore',{mode:'replace',archive:jsonArchive});ok(nativeRestore);cookie=nativeRestore.cookie;
  assert.ok(ok(await req('/api/state')).scheduleRecords.every(row=>!row.active&& (row.kind!=='subscription'||row.data.hash===null)),'native archive recovery holds the complete category inactive');
  assert.equal((await w.send(new URL(subscriptions[1].url).pathname,undefined,{},'GET')).status,404);
  const restore=await req('/api/recovery/restore',{mode:'replace',checkpoint});ok(restore);cookie=restore.cookie;
  const restored=ok(await req('/api/state')).scheduleRecords;assert.ok(restored.every(r=>!r.active));assert.ok(restored.filter(r=>r.kind==='subscription').every(r=>r.data.hash===null));
  assert.equal((await w.send(new URL(subscriptions[1].url).pathname,undefined,{},'GET')).status,404,'restored historical subscription cannot authorize a feed');
  const inactiveSwap=restored.find(r=>r.kind==='swap'&&r.data.status==='pending');ok(await coord({action:'accept',id:inactiveSwap.id,revision:inactiveSwap.revision}),409);
  const overdue=ok(await coord({...request,scheduleRevision:schedule.revision,start:laterStart,end:laterEnd})).record;
  await w.time(Date.parse(laterStart)+1);
  // Reading the durable request needs a currently valid session after the clock advance.
  const renewed=await w.request('/api/login',{name:'synthetic-oncall-250',password:'synthetic-oncall-250-password'});ok(renewed);cookie=renewed.cookie;
  assert.equal((await rows()).find(r=>r.id===overdue.id).status,'overdue');assert.equal(w.sql("SELECT data FROM oc_schedule_records WHERE id='"+overdue.id+"'").map(r=>JSON.parse(r.data))[0].data.status,'pending','overdue never auto-resolves');
  ok(await coord({action:'cancel',id:overdue.id,revision:overdue.revision}));
  console.log('PASS OC-025 public schedule coordination: holder/substitute authority, default admin and none approval, racing acceptance, one effective override, audit rollback, recorded not-deliverable notices, durable reminder settings/due label, three digest-only feed scopes, 20 cap, immediate revocation and unchanged history, strict inactive recovery and overdue cancellation. Paging OFF.');
 }finally{await w.close();}
}


// One saved-rotation journey uses the emitted HTTP doors and retained D1 data.
async function savedRotationCoverage(){
 const w=await localWorker({}, {outboundLedger:true});
 try{
  const owner=await w.request('/api/setup',{name:'synthetic-oncall-1100',password:'synthetic-oncall-1100-password'});ok(owner);let cookie=owner.cookie;
  const req=(path,input)=>w.request(path,input,cookie);
  const member=async(n,role)=>ok(await req('/api/members',{name:'synthetic-oncall-'+n,password:'synthetic-oncall-'+n+'-password',role}),201);
  const a=await member(1101,'responder'),b=await member(1102,'responder'),viewer=await member(1103,'viewer');
  const service=ok(await req('/api/command',{type:'service',id:'synthetic-oncall-1100',name:'Synthetic calendar coverage',environment:'test',owner:owner.value.member.id,runbook:[],pager:''}));
  const rotation=(anchorLocal,members,ambiguity='earlier')=>({anchorLocal,periodDays:1,members,ambiguity});
  const save=async(n,timezone,anchor,ambiguity='earlier',primary=[a.id,b.id],backup=[b.id,a.id])=>{
   const schedule={id:'synthetic-oncall-'+n,name:'Synthetic saved rotation '+n,service:service.id,revision:0,timezone,validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:rotation(anchor,primary,ambiguity),backup:rotation(anchor,backup,ambiguity),overrides:[]};
   const saved=ok(await req('/api/paging/schedules',schedule));
   assert.deepEqual(saved,{...schedule,revision:1});
   assert.deepEqual(ok(await req('/api/paging/state')).schedules.find(row=>row.id===saved.id),saved,'the saved configuration is read from durable storage');
   return saved;
  };
  const iso=at=>new Date(at).toISOString();
  const observe=async(schedule,from,to,expected)=>{
   const retained=durableSnapshot(w),paging=ok(await req('/api/paging/state'));
   const values=ok(await req('/api/paging/preview',{scheduleId:schedule.id,from:Date.parse(from),to:Date.parse(to)}));
   assert.deepEqual(values.map(value=>[iso(value.at),value.primary,value.backup,...value.windows.map(window=>[window.role,window.member,window.start,window.end,window.origin])]),
    expected.map(([at,primary,backup,start,end])=>[at,primary,backup,['primary',primary,start,end,primary===null?'gap':'rotation'],['backup',backup,start,end,backup===null?'gap':'rotation']]),'saved preview retains exact UTC boundaries and fixed role assignments');
   for(let index=0;index<expected.length;index++){
    const [at,primary,backup,start,end,warning]=expected[index];
    const result=ok(await req('/api/schedules/'+schedule.id+'/now-next?at='+at));
    assert.equal(result.paging,'OFF');assert.deepEqual(result.now,values[index]);
    if(warning)assert.match(result.now.warnings.join('; '),warning,'the coverage gap has a visible explanation');
    const next=expected[index+1];
    if(next){
     for(const role of ['primary','backup']){
      assert.equal(iso(result.next[role].at),end);
      assert.equal(result.next[role].primary,next[1]);assert.equal(result.next[role].backup,next[2]);
     }
     const edge=ok(await req('/api/schedules/'+schedule.id+'/now-next?at='+iso(Date.parse(end)-1))).now;
     assert.equal(edge.primary,primary);assert.equal(edge.backup,backup,'the preceding slot lasts until the exact handoff');
    }
   }
   assert.deepEqual(ok(await req('/api/paging/state')),paging,'preview and now-next never create a job, receipt, callback or changed schedule');
   assert.deepEqual(durableSnapshot(w),retained,'preview and now-next preserve every durable row, revision, audit and outbound work item');
   assert.deepEqual(await w.outboundRequests(),[],'coverage reads make no outbound requests');
  };
  const fall=await save(1110,'America/New_York','2026-10-31T09:00');
  await observe(fall,'2026-10-31T13:00:00Z','2026-11-02T15:00:00Z',[
   ['2026-10-31T13:00:00.000Z',a.id,b.id,'2026-10-31T13:00:00.000Z','2026-11-01T14:00:00.000Z'],
   ['2026-11-01T14:00:00.000Z',b.id,a.id,'2026-11-01T14:00:00.000Z','2026-11-02T14:00:00.000Z'],
   ['2026-11-02T14:00:00.000Z',a.id,b.id,'2026-11-02T14:00:00.000Z','2026-11-03T14:00:00.000Z'],
  ]);
  console.log('PROBE OC-011 fall handoff: saved New York 09:00 primary and backup -> 13:00Z then 14:00Z, a 25-hour civil day');
  for(const [n,choice,boundary] of [[1111,'earlier','2026-11-01T05:30:00.000Z'],[1112,'later','2026-11-01T06:30:00.000Z'],[1113,'reject',null]]){
   const saved=await save(n,'America/New_York','2026-10-31T01:30',choice);
   const expected=[['2026-10-30T05:30:00.000Z',b.id,a.id,'2026-10-30T05:30:00.000Z','2026-10-31T05:30:00.000Z'],
    ...(boundary?[
     ['2026-10-31T05:30:00.000Z',a.id,b.id,'2026-10-31T05:30:00.000Z',boundary],
     [boundary,b.id,a.id,boundary,'2026-11-02T06:30:00.000Z'],
    ]:[['2026-10-31T05:30:00.000Z',null,null,'2026-10-31T05:30:00.000Z','2026-11-02T06:30:00.000Z',/primary: calendar boundary is nonexistent, rejected as ambiguous/]]),
    ['2026-11-02T06:30:00.000Z',a.id,b.id,'2026-11-02T06:30:00.000Z','2026-11-03T06:30:00.000Z']];
   await observe(saved,'2026-10-30T05:30:00Z','2026-11-02T07:00:00Z',expected);
   for(const at of ['2026-11-01T05:45:00Z','2026-11-01T06:15:00Z']){
    const value=ok(await req('/api/schedules/'+saved.id+'/now-next?at='+at)).now;
    assert.equal(value.primary,choice==='earlier'?b.id:choice==='later'?a.id:null);
    assert.equal(value.backup,choice==='earlier'?a.id:choice==='later'?b.id:null);
    if(choice==='reject')assert.match(value.warnings.join('; '),/backup: calendar boundary is nonexistent, rejected as ambiguous/);
   }
   console.log('PROBE OC-011 repeated minute '+choice+': saved New York 01:30 -> '+(boundary??'both roles visibly unavailable until 2026-11-02T06:30:00.000Z'));
  }
  for(const [n,choice] of [[1114,'earlier'],[1115,'later'],[1116,'reject']]){
   const saved=await save(n,'America/New_York','2026-03-07T02:30',choice);
   await observe(saved,'2026-03-06T07:30:00Z','2026-03-09T07:00:00Z',[
    ['2026-03-06T07:30:00.000Z',b.id,a.id,'2026-03-06T07:30:00.000Z','2026-03-07T07:30:00.000Z'],
    ['2026-03-07T07:30:00.000Z',null,null,'2026-03-07T07:30:00.000Z','2026-03-09T06:30:00.000Z',/backup: calendar boundary is nonexistent, rejected as ambiguous/],
    ['2026-03-09T06:30:00.000Z',a.id,b.id,'2026-03-09T06:30:00.000Z','2026-03-10T06:30:00.000Z'],
   ]);
   console.log('PROBE OC-011 nonexistent minute '+choice+': saved New York 02:30 -> both roles have an explained gap from 2026-03-07T07:30Z to 2026-03-09T06:30Z, then original slot order resumes');
  }
  const slotRows=(unavailable)=>[
   ['2026-01-01T00:00:00.000Z',a.id,b.id,'2026-01-01T00:00:00.000Z','2026-01-02T00:00:00.000Z'],
   ['2026-01-02T00:00:00.000Z',null,a.id,'2026-01-02T00:00:00.000Z','2026-01-03T00:00:00.000Z',new RegExp('primary: member .* is '+unavailable+'; slot is retained')],
   ['2026-01-03T00:00:00.000Z',b.id,null,'2026-01-03T00:00:00.000Z','2026-01-04T00:00:00.000Z',new RegExp('backup: member .* is '+unavailable+'; slot is retained')],
   ['2026-01-04T00:00:00.000Z',a.id,b.id,'2026-01-04T00:00:00.000Z','2026-01-05T00:00:00.000Z'],
  ];
  const withViewer=await save(1117,'UTC','2026-01-01T00:00','earlier',[a.id,viewer.id,b.id],[b.id,a.id,viewer.id]);
  await observe(withViewer,'2026-01-01T00:00:00Z','2026-01-04T01:00:00Z',slotRows('not an authorized responder'));
  console.log('PROBE OC-011 viewer slots: saved three-slot primary and backup -> viewer turns remain explained gaps and all subsequent responders keep their turns');
  const duplicate=await save(1118,'UTC','2026-01-01T00:00','earlier',[a.id,b.id],[a.id,b.id]);
  await observe(duplicate,'2026-01-01T00:00:00Z','2026-01-02T01:00:00Z',[
   ['2026-01-01T00:00:00.000Z',a.id,null,'2026-01-01T00:00:00.000Z','2026-01-02T00:00:00.000Z',/backup: same member .* as primary; backup is unavailable/],
   ['2026-01-02T00:00:00.000Z',b.id,null,'2026-01-02T00:00:00.000Z','2026-01-03T00:00:00.000Z',/backup: same member .* as primary; backup is unavailable/],
  ]);
  console.log('PROBE OC-011 duplicate responder: saved identical role rotations -> primary retained, backup unavailable with explanation on both turns');
  // Restore a real older membership snapshot, then retain the saved module history.
  const olderMembership=ok(await req('/api/archive')),departed=await member(1104,'responder');
  const departedSession=await req('/api/login',{name:departed.name,password:'synthetic-oncall-1104-password'});ok(departedSession);
  const history=await save(1119,'UTC','2026-01-01T00:00','earlier',[a.id,departed.id,b.id],[b.id,a.id,departed.id]);
  const custody=ok(await req('/api/paging/archive'));
  const restored=await req('/api/restore',{mode:'replace',archive:olderMembership});ok(restored);cookie=restored.cookie;
  assert.equal(ok(await req('/api/state')).members.some(row=>row.id===departed.id),false);
  ok(await w.request('/api/state',undefined,departedSession.cookie),401);
  ok(await req('/api/login',{name:departed.name,password:'synthetic-oncall-1104-password'}),401);
  assert.deepEqual(ok(await req('/api/paging/state')).schedules.find(row=>row.id===history.id),history,'membership recovery retains the exact historical slots');
  const refusedBefore=ok(await req('/api/paging/state'));
  ok(await req('/api/paging/schedules',{...history,id:'synthetic-oncall-1120',revision:0}),400);
  assert.deepEqual(ok(await req('/api/paging/state')),refusedBefore,'new schedules cannot introduce unknown members');
  const retained=ok(await req('/api/paging/restore',{mode:'replace',archive:custody}));
  assert.deepEqual(retained.schedules.find(row=>row.id===history.id),history,'the strict module custody door preserves missing historical member references');
  await observe(history,'2026-01-01T00:00:00Z','2026-01-04T01:00:00Z',slotRows('missing'));
  assert.equal(ok(await req('/api/state')).members.some(row=>row.id===departed.id),false,'retained schedule history grants no membership');
  console.log('PROBE OC-011 missing slots: older membership and saved module custody restored over protected HTTP -> missing turns remain explained gaps, later turns unchanged, old session refused, no membership recreated');
  const paging=ok(await req('/api/paging/state'));
  assert.equal(paging.paging,'OFF');assert.deepEqual(paging.jobs,[]);assert.deepEqual(paging.receipts,[]);assert.deepEqual(paging.callbacks,[]);
  assert.deepEqual(await w.outboundRequests(),[]);
  console.log('PROBE OC-011 preview effects: all saved previews and now-next reads -> every durable row unchanged, zero jobs, receipts, callbacks and outbound requests');
 }finally{await w.close();}
}


export async function scheduleLayers(){
 const w=await localWorker();
 try{
  const owner=await w.request('/api/setup',{name:'synthetic-oncall-240',password:'synthetic-oncall-240-password'});ok(owner);const cookie=owner.cookie,req=(path,input)=>w.request(path,input,cookie);
  const first=owner.value.member,second=ok(await req('/api/members',{name:'synthetic-oncall-241',role:'responder',password:'synthetic-oncall-241-password'}),201),third=ok(await req('/api/members',{name:'synthetic-oncall-242',role:'responder',password:'synthetic-oncall-242-password'}),201);
  const service=ok(await req('/api/command',{type:'service',id:'synthetic-oncall-240',name:'synthetic-oncall-240',environment:'test',owner:first.id,runbook:[],pager:''}));
  const rotation={anchorLocal:'2026-01-01T00:00',periodDays:1,members:[first.id],ambiguity:'earlier'};
  let saved=ok(await req('/api/paging/schedules',{id:'synthetic-oncall-940',name:'synthetic-oncall-340',service:service.id,revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:rotation,backup:{...rotation,members:[]},overrides:[]}));
  const from=Date.UTC(2026,0,1),to=from+366*86400000,path='/api/schedules/'+saved.id;
  const legacy=ok(await req('/api/paging/preview',{scheduleId:saved.id,from,to:from+2*86400000}));
  const layer=(n,timezone,member,startHour,endHour)=>({id:'synthetic-oncall-'+n,name:'synthetic-oncall-'+(n+100),role:'primary',timezone,kind:'business',rotation:{...rotation,members:[member]},start:saved.validFrom,end:null,weekdays:[1,2,3,4,5],startHour,endHour,holidayCalendars:[],holidayAction:'next',ptoAction:'next'});
  const layers=[layer(244,'Europe/London',first.id,9,17),layer(245,'America/New_York',second.id,9,17),layer(246,'America/Los_Angeles',third.id,9,17)];
  let draft={...saved,layers},input={schedule:draft,from,to},review=ok(await req(path+'/review',input));
  assert.ok(review.clocks.some(c=>c.zone==='Europe/London'&&c.before!==c.after));assert.ok(review.clocks.some(c=>c.zone==='America/New_York'&&c.before!==c.after));assert.ok(review.clocks.some(c=>c.zone==='America/Los_Angeles'&&c.before!==c.after));
  assert.ok(review.intervals.some(r=>r.newGap));assert.ok(review.coverage.length>0&&review.coverage.length<=20000);
  ok(await req('/api/paging/preview',{schedule:draft,from,to:to+1}),400);
  const preview=async(schedule,at)=>ok(await req('/api/paging/preview',{schedule,from:Date.parse(at),to:Date.parse(at)+3600000}))[0];
  for(const [at,member] of [['2026-11-02T10:00:00Z',first.id],['2026-11-02T18:00:00Z',second.id],['2026-11-02T23:00:00Z',third.id],['2026-11-03T02:00:00Z',null]])assert.equal((await preview(draft,at)).primary,member);
  const overlap=await preview(draft,'2026-11-02T15:00:00Z');assert.equal(overlap.primary,first.id);assert.deepEqual(overlap.windows[0].decisions.map(d=>d.state),['winner','overridden','business-off']);
  const holiday={...draft,layers:layers.map(l=>({...l,holidayCalendars:['us-federal']}))};
  const holidayAt='2026-11-26T15:00:00Z';assert.equal((await preview(draft,holidayAt)).primary,first.id);const off=await preview(holiday,holidayAt);assert.equal(off.primary,null);assert.ok(off.windows[0].decisions.some(d=>d.state==='holiday-off'));
  const selectedHandoff={...draft,layers:layers.map((l,index)=>({...l,holidayCalendars:index<2?['us-federal']:[]}))};assert.equal((await preview(selectedHandoff,'2026-11-26T18:00:00Z')).primary,third.id);
  assert.equal((await preview(holiday,'2026-07-03T10:00:00Z')).windows[0].decisions[0].state,'holiday-off');
  const company={...draft,companyDates:[{id:'synthetic-oncall-247',name:'synthetic-oncall-247',date:'2026-11-02',timezone:'Europe/London',revision:1}],layers:layers.map(l=>({...l,holidayCalendars:['company']}))};const companyAt=await preview(company,'2026-11-02T15:00:00Z');assert.equal(companyAt.primary,second.id);assert.equal(companyAt.windows[0].decisions[0].state,'company-off');
  const pto={id:'synthetic-oncall-248',member:first.id,start:'2026-11-02T09:00:00.000Z',end:'2026-11-02T17:00:00.000Z',reason:''};
  const absence={...draft,pto:[pto]};assert.equal((await preview(absence,'2026-11-02T15:00:00Z')).primary,second.id);assert.equal((await preview(absence,'2026-11-02T10:00:00Z')).primary,null);
  const gap=await preview({...absence,layers:layers.map(l=>({...l,ptoAction:'gap'}))},'2026-11-02T15:00:00Z');assert.equal(gap.primary,null);assert.equal(gap.windows[0].decisions[0].state,'pto-gap');
  for(const kind of ['daily','weekly','custom']){const value=await preview({...draft,layers:[{...layers[0],kind,rotation:{...rotation,periodDays:kind==='weekly'?7:kind==='custom'?3:1}}]},'2026-11-02T23:00:00Z');assert.equal(value.primary,first.id);}
  const repeated={...draft,layers:[{...layers[1],kind:'daily',rotation:{...rotation,anchorLocal:'2026-10-31T01:30',members:[first.id,second.id]}}]};
  for(const at of ['2026-11-01T05:45:00Z','2026-11-01T06:15:00Z'])assert.equal((await preview(repeated,at)).primary,second.id);
  const skipped=await preview({...repeated,layers:[{...repeated.layers[0],rotation:{...repeated.layers[0].rotation,anchorLocal:'2026-03-07T02:30'}}]},'2026-03-08T08:00:00Z');assert.equal(skipped.primary,null);assert.equal(skipped.windows[0].decisions[0].state,'unavailable');
  for(const limits of [{validFrom:'2026-12-01T00:00:00.000Z'},{validUntil:'2026-10-01T00:00:00.000Z'}])assert.equal((await preview({...draft,...limits},'2026-11-02T15:00:00Z')).primary,null);
  const login=await w.request('/api/login',{name:second.name,password:'synthetic-oncall-241-password'});ok(login);
  ok(await w.request(path+'/pto-review',{revision:saved.revision,member:second.id,entries:[{...pto,member:second.id}],from,to},login.cookie),403);
  const invalid=structuredClone(draft);invalid.layers[0].unknown=true;ok(await req('/api/paging/preview',{schedule:invalid,from,to:from+86400000}),400);
  const workspaceBeforeFailure=ok(await req('/api/state'));
  w.sql("CREATE TRIGGER synthetic_layers_audit BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'SYNTHETIC_LAYERS_AUDIT_FAILURE'); END");
  try{ok(await req(path+'/apply',{...input,digest:review.digest,confirmed:true}),503);assert.deepEqual(ok(await req('/api/paging/preview',{scheduleId:saved.id,from,to:from+2*86400000})),legacy);assert.deepEqual(ok(await req('/api/state')),workspaceBeforeFailure);}finally{w.sql('DROP TRIGGER synthetic_layers_audit');}
  saved=ok(await req(path+'/apply',{...input,digest:review.digest,confirmed:true})).schedule;
  for(const member of [first.id,second.id,third.id])assert.ok(ok(await req('/api/state')).scheduleRecords.some(row=>row.kind==='notice'&&row.member===member&&row.data.schedule===saved.id));
  assert.deepEqual(ok(await req('/api/paging/preview',{scheduleId:saved.id,from,to})),review.coverage);ok(await req(path+'/apply',{...input,digest:review.digest,confirmed:true}),409);
  const at='2026-11-02T15:00:00Z',now=ok(await req(path+'/now-next?at='+at)).now,values=ok(await req('/api/paging/preview',{scheduleId:saved.id,from:Date.parse(at),to:Date.parse(at)+3600000}));assert.deepEqual(values[0],now);
  const feed=ok(await req(path+'/calendar.ics?from='+at+'&to=2026-11-02T16:00:00Z')).replace(/\r\n /g,'');for(const id of [...layers.map(l=>l.id),first.id,second.id,third.id])assert.equal(feed.includes(id),false);
  for(const window of now.windows)if(window.explanation)assert.ok(feed.includes(window.explanation.replaceAll(';','\\;').replaceAll(',','\\,')));
  const upload={revision:saved.revision,member:first.id,content:await (await import('node:fs/promises')).readFile('tests/fixtures/pto-calendar.ics','utf8'),from,to};
  const imported=ok(await req(path+'/pto-review',upload));assert.equal(imported.import.entries.length,3);assert.equal(imported.import.refused.length,1);assert.ok(imported.import.refused[0].line>0);
  for(const action of ['pto-review','pto-apply'])ok(await w.request(path+'/'+action,upload),401);
  const before=ok(await req('/api/paging/archive'));ok(await req(path+'/pto-apply',{...upload,digest:imported.digest,confirmed:false}),409);assert.deepEqual(ok(await req('/api/paging/archive')),before);
  saved=ok(await req(path+'/pto-apply',{...upload,digest:imported.digest,confirmed:true})).schedule;assert.equal(saved.pto.length,3);
  const nextInput={revision:saved.revision,member:second.id,entries:[{...pto,id:'synthetic-oncall-249',member:second.id}],from,to},nextReview=ok(await req(path+'/pto-review',nextInput));saved=ok(await req(path+'/pto-apply',{...nextInput,digest:nextReview.digest,confirmed:true})).schedule;assert.equal(saved.pto.length,4);ok(await req(path+'/pto-apply',{...upload,digest:imported.digest,confirmed:true}),409);
  // Ordinary members use only the PTO doors; team-management authority stays intact.
  let team=ok(await req('/api/teams',{id:'synthetic-pto-team',name:'Synthetic PTO team',visibility:'public',active:true,revision:0,members:[second.id,third.id],managers:[third.id]}));
  ok(await req('/api/teams/ownership',{service:service.id,team:team.id,workspaceRevision:ok(await req('/api/state')).revision}));
  let own=ok(await req('/api/paging/schedules',{...saved,id:'synthetic-self-pto',revision:0,primary:{...rotation,members:[second.id]},backup:{...rotation,members:[]},layers:[],pto:[]}));
  const ownPath='/api/schedules/'+own.id,asMember=(action,body)=>w.request(ownPath+'/'+action,body,login.cookie);
  const range={from:Date.UTC(2026,10,2),to:Date.UTC(2026,10,3)},self={revision:own.revision,member:second.id,entries:[{...pto,id:'synthetic-self-entry',member:second.id}],...range};
  const noWrite=async(perform,status)=>{const workspace=ok(await req('/api/state')),paging=ok(await req('/api/paging/state'));ok(await perform(),status);assert.deepEqual(ok(await req('/api/state')),workspace);assert.deepEqual(ok(await req('/api/paging/state')),paging);};
  let selfReview=ok(await asMember('pto-review',self));
  assert.ok(selfReview.intervals.some(row=>row.before===second.id&&row.after===null&&row.newGap));
  await noWrite(()=>asMember('pto-apply',{...self,digest:selfReview.digest,confirmed:false}),409);
  own=ok(await asMember('pto-apply',{...self,digest:selfReview.digest,confirmed:true})).schedule;
  assert.equal(own.revision,self.revision+1);assert.equal(own.pto[0].member,second.id);assert.deepEqual(own.primary.members,[second.id]);
  const afterPTO=ok(await req('/api/paging/preview',{scheduleId:own.id,...range}));assert.ok(afterPTO.some(row=>row.primary===null));assert.deepEqual(afterPTO,selfReview.coverage);
  const selfICS={revision:own.revision,member:second.id,content:'BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261103T090000Z\nDTEND:20261103T170000Z\nSTATUS:CONFIRMED\nEND:VEVENT\nEND:VCALENDAR',...range};
  selfReview=ok(await asMember('pto-review',selfICS));assert.equal(selfReview.import.entries.length,1);
  own=ok(await asMember('pto-apply',{...selfICS,digest:selfReview.digest,confirmed:true})).schedule;
  assert.equal(own.revision,self.revision+2);assert.equal(own.pto.length,2);
  await noWrite(()=>asMember('pto-apply',{...self,digest:selfReview.digest,confirmed:true}),409);
  for(const action of ['pto-review','pto-apply']){
   await noWrite(()=>asMember(action,{...self,revision:own.revision,member:third.id,entries:[{...pto,member:third.id}]}),403);
   await noWrite(()=>asMember(action,{...self,revision:own.revision,entries:[{...pto,member:third.id}]}),400);
  }
  // The same authenticated member cannot repurpose the general editing doors.
  for(const action of ['review','apply'])await noWrite(()=>asMember(action,{schedule:{...own,name:'Unauthorized rename'},...range}),404);
  await noWrite(()=>asMember('overrides',{revision:own.revision,override:{id:'synthetic-denied-cover',member:second.id,role:'primary',start:pto.start,end:pto.end}}),404);
  const otherTeam=ok(await req('/api/teams',{id:'synthetic-other-team',name:'Synthetic other team',visibility:'public',active:true,revision:0,members:[third.id],managers:[third.id]}));
  const otherService=ok(await req('/api/command',{type:'service',id:'synthetic-other-service',name:'Synthetic other service',environment:'test',owner:first.id,runbook:[],pager:'',team:otherTeam.id}));
  ok(await req('/api/teams/ownership',{service:otherService.id,team:otherTeam.id,workspaceRevision:ok(await req('/api/state')).revision}));
  const other=ok(await req('/api/paging/schedules',{...own,id:'synthetic-other-rota',service:otherService.id,revision:0,pto:[]}));
  for(const action of ['pto-review','pto-apply'])await noWrite(()=>w.request('/api/schedules/'+other.id+'/'+action,{...self,revision:other.revision},login.cookie),403);
  const pending={...self,revision:own.revision,entries:[{...pto,id:'synthetic-revoked-entry',member:second.id}]},pendingReview=ok(await asMember('pto-review',pending));
  team=ok(await req('/api/teams',{...team,members:[third.id]}));
  for(const action of ['pto-review','pto-apply'])await noWrite(()=>asMember(action,action==='pto-apply'?{...pending,digest:pendingReview.digest,confirmed:true}:pending),403);
  team=ok(await req('/api/teams',{...team,members:[second.id,third.id]}));
  await noWrite(()=>asMember('pto-apply',{...pending,digest:pendingReview.digest,confirmed:true}),409);
  ok(await req('/api/command',{type:'member',id:second.id,role:'responder',active:false}));
  for(const action of ['pto-review','pto-apply'])await noWrite(()=>asMember(action,action==='pto-apply'?{...pending,digest:pendingReview.digest,confirmed:true}:pending),401);
  ok(await req('/api/command',{type:'member',id:second.id,role:'responder',active:true}));
  const managerLogin=await w.request('/api/login',{name:third.name,password:'synthetic-oncall-242-password'});ok(managerLogin);
  const managerInput={...pending,member:third.id,entries:[{...pto,id:'synthetic-manager-entry',member:third.id}]};
  const managerReview=ok(await w.request(ownPath+'/pto-review',managerInput,managerLogin.cookie));
  own=ok(await w.request(ownPath+'/pto-apply',{...managerInput,digest:managerReview.digest,confirmed:true},managerLogin.cookie)).schedule;
  const managerEdit={schedule:{...own,name:own.name+' managed'},...range},managerChange=ok(await w.request(ownPath+'/review',managerEdit,managerLogin.cookie));
  own=ok(await w.request(ownPath+'/apply',{...managerEdit,digest:managerChange.digest,confirmed:true},managerLogin.cookie)).schedule;
  assert.equal(own.name,managerEdit.schedule.name);
  console.log('PASS OC-024 member PTO: ordinary self review/apply 200, self ICS 200, revisions 1→2→3, preview gap and retained slots; other member/team 403, spoofed entry 400, general edit 404, revoked team 403/session 401, stale 409 with no writes; manager own PTO and general editing 200; administrator PTO preserved');
  const archive=ok(await req('/api/paging/archive'));assert.deepEqual(ok(await req('/api/paging/restore',{mode:'replace',archive})).schedules[0],saved);
  const bad=structuredClone(archive);bad.schedules[0].pto[0].unknown=true;ok(await req('/api/paging/restore',{mode:'replace',archive:bad}),400);
  for(const [key,count] of [['layers',25],['pto',1001],['companyDates',367]]){const excessive=structuredClone(archive);excessive.schedules[0][key]=Array.from({length:count},(_,index)=>({...((archive.schedules[0][key]??[])[0]??{}),id:'synthetic-oncall-'+(1000+index)}));ok(await req('/api/paging/restore',{mode:'replace',archive:excessive}),400);}
  const workspace=ok(await req('/api/state'));ok(await req('/api/erasure/member/'+second.id,{workspaceRevision:workspace.revision,confirmation:'erase '+second.id,identitiesReviewed:true,importedPeople:[]}));const erased=ok(await req('/api/paging/state')).schedules.find(s=>s.id===saved.id);assert.equal(erased.pto.find(e=>e.id==='synthetic-oncall-249').member,null);assert.equal(erased.pto.length,4);assert.equal((await preview(erased,'2026-11-02T18:00:00Z')).primary,null);ok(await req('/api/paging/restore',{mode:'replace',archive}),409);
  console.log('PASS OC-024 public layers: three-zone handoffs, overlap decisions, federal and company selections, PTO next and gap, rotation kinds, 366-day review, both DST transitions, stale review, atomic rollback, equality, ICS review and refusal, consecutive writes, archive strictness and non-attributing erasure');
 }finally{await w.close();}
}


// migration-upgrade: part of this public journey.
// Exercise the maintained migration CLI on a populated pre-stack installation.
async function upgradeFrom(baseline){
 const root=await mkdtemp(join(tmpdir(),'oncall-upgrade-')),old=join(root,'migrations'),config=join(root,'wrangler.json'),persist=join(root,'state');
 const names=(await readdir('migrations/core')).filter(n=>n.endsWith('.sql')).sort();
 const env={...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'};
 const cli=(...args)=>execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args,'--config',config,'--local','--persist-to',persist],{env,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:16*1024*1024});
 const sql=command=>JSON.parse(cli('d1','execute','DB','--command',command,'--json'))[0].results;
 const quote=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'";
 try{
  await mkdir(old);
  for(const name of names.filter(n=>Number(n.slice(0,4))<=baseline))await copyFile(join('migrations/core',name),join(old,name));
  const bindings={name:'synthetic-oncall-upgrade',compatibility_date:'2026-09-08',d1_databases:[{binding:'DB',database_name:'synthetic-oncall-upgrade',database_id:'00000000-0000-0000-0000-000000000001',migrations_dir:old}]};
  await writeFile(config,JSON.stringify(bindings));cli('d1','migrations','apply','DB');
  const member={id:'synthetic-oncall-1',name:'Held upgrade owner',role:'admin',active:true};
  const service={id:'synthetic-oncall-1',name:'Held upgrade service',environment:'production',owner:member.id,runbook:['Retain this authored step'],pager:''};
  sql(`INSERT INTO oc_members VALUES('synthetic-oncall-1',0,${quote(member)}); INSERT INTO oc_services VALUES('synthetic-oncall-1',0,${quote(service)}); INSERT INTO workspace_control VALUES(1,7,'synthetic-oncall-1');`);
  let heldBusiness=[];
  if(baseline>=141){const business={id:'synthetic-oncall-61',name:'Held business status',owningTeam:'Held team label',supporting:[service.id],communicationsOwner:member.id,audience:[],highUrgencyImpact:false,active:true,revision:1,derived:'operational',impactRevision:0,override:null,subscriptions:[],notices:[]};sql(`INSERT INTO oc_business_services VALUES('synthetic-oncall-61',0,${quote(business)});`);heldBusiness=sql('SELECT id,ordinal,data FROM oc_business_services');}
  const before=sql('SELECT id,ordinal,data FROM oc_members UNION ALL SELECT id,ordinal,data FROM oc_services');
  bindings.d1_databases[0].migrations_dir=resolve('migrations/core');await writeFile(config,JSON.stringify(bindings));cli('d1','migrations','apply','DB');
  assert.deepEqual(sql('SELECT id,ordinal,data FROM oc_members UNION ALL SELECT id,ordinal,data FROM oc_services'),before,'all held identities, fields and authored runbooks survive the real upgrade');
  assert.equal(sql('SELECT revision FROM workspace_control')[0].revision,7);
  assert.equal(sql('SELECT COUNT(*) AS n FROM oc_teams')[0].n,0,'held services remain explicitly unassigned after additive team upgrade');
  assert.deepEqual(sql('SELECT id,ordinal,data FROM oc_business_services'),heldBusiness,'held pre-email-list business-service records remain byte-identical');assert.equal(sql('SELECT COUNT(*) AS n FROM rer_command_receipts')[0].n,0);assert.equal(sql('SELECT COUNT(*) AS n FROM oc_erased_report_cases')[0].n,0);
  console.log(`PASS populated migration CLI upgrade: main ${String(baseline).padStart(4,'0')} to candidate, held member/service/runbook bytes and workspace revision preserved`);
 }finally{await rm(root,{recursive:true,force:true});}
}
export async function migrationUpgrade(){await upgradeFrom(143);}


const ok=(r,status=200)=>{assert.equal(r.status,status,typeof r.value==='string'?r.value:JSON.stringify(r.value));return r.value}
await migrationUpgrade()
await scheduleCoordination()
const w=await localWorker({}, {clock:true,outboundLedger:true}),checks=[]
try {
 const initial=await w.request('/api/setup',{name:'Admin',password:'synthetic-local-testing-password'}),admin=ok(initial).member,cookie=initial.cookie
 const req=(path,input)=>w.request(path,input,cookie),record=s=>{checks.push(s);console.log(s)}
 // OC-041 accepted state and its audit entry commit together, survive subject erasure and export without secrets.
 const auditExport=async()=>{const exported=ok(await req('/api/audit/export'));assert.equal(exported.schemaVersion,1);assert.ok(Array.isArray(exported.rows));return exported.rows}
 const auditedSchedule=async perform=>{
  const workspaceBefore=ok(await req('/api/state')),pagingBefore=ok(await req('/api/paging/state')),prior=await auditExport(),ids=new Set(prior.map(row=>row.id))
  const response=await perform(),workspaceAfter=ok(await req('/api/state')),pagingAfter=ok(await req('/api/paging/state'))
  const added=(await auditExport()).filter(row=>!ids.has(row.id))
  assert.ok(added.some(row=>row.outcome==='accepted'&&row.kind!=='audit.export'&&row.workspaceBefore===workspaceBefore.revision&&row.workspaceAfter===workspaceAfter.revision&&row.pagingBefore===pagingBefore.revision&&row.pagingAfter===pagingAfter.revision),
   'the accepted schedule mutation and its audit entry commit the same workspace and paging revisions')
  return response
 }
 // The move-in screen's transport: the owner-session import door.
 const door=ownerDoor(w,cookie)
 const a=ok(await req('/api/members',{name:'Alice',password:'synthetic-local-testing-password',role:'responder'}),201),b=ok(await req('/api/members',{name:'Bob',password:'synthetic-local-testing-password',role:'responder'}),201),viewer=ok(await req('/api/members',{name:'Viewer',password:'synthetic-local-testing-password',role:'viewer'}),201)
 ok(await req('/api/command',{type:'service',id:'checkout',name:'Checkout',environment:'production',owner:admin.id,runbook:['Verify recovery'],pager:'https://pager.example.test'}))
 const schedule={id:'daily',name:'Daily hand-off',service:'checkout',revision:0,timezone:'America/New_York',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-03-07T09:00',periodDays:1,members:[a.id,b.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-03-07T09:00',periodDays:1,members:[b.id,a.id],ambiguity:'earlier'},overrides:[]}
 const saved=ok(await auditedSchedule(()=>req('/api/paging/schedules',schedule)))
 const before=ok(await req('/api/schedules/daily/now-next?at=2026-03-08T12:59:59Z'))
 assert.equal(before.now.primary,a.id);assert.equal(before.next.primary.primary,b.id)
 assert.equal(before.now.windows[0].end,'2026-03-08T13:00:00.000Z')
 assert.equal(ok(await req('/api/schedules/daily/now-next?at=2026-03-08T13:00:00Z')).now.primary,b.id)
 const override={id:'cover',role:'primary',start:'2026-03-08T13:00:00.000Z',end:'2026-03-08T15:00:00.000Z',member:a.id}
 const changed=ok(await auditedSchedule(()=>req('/api/schedules/daily/overrides',{revision:saved.revision,override})))
 assert.equal(ok(await req('/api/schedules/daily/now-next?at=2026-03-08T13:00:00Z')).now.primary,a.id)
 assert.equal(ok(await req('/api/schedules/daily/now-next?at=2026-03-08T15:00:00Z')).now.primary,b.id)
 ok(await req('/api/schedules/daily/overrides',{revision:changed.revision,override:{...override,id:'overlap'}}),400)
 const ics=await req('/api/schedules/daily/calendar.ics?from=2026-03-07T14:00:00Z&to=2026-03-09T13:00:00Z');ok(ics);assert.match(ics.headers.get('content-type'),/text\/calendar/);assert.match(ics.value,/DTEND:20260308T130000Z/);assert.match(ics.value,/DTSTART:20260308T150000Z/)
 ok(await w.request('/api/schedules/daily/calendar.ics'),401)
 // OC-020: compare the downloaded events to resolved coverage, with an independent DST and override oracle.
 const calendarFrom=Date.parse('2026-03-07T14:00:00Z'),calendarTo=Date.parse('2026-03-09T13:00:00Z'),calendarPath='/api/schedules/daily/calendar.ics'
 const calendarDate=at=>new Date(at).toISOString().replace(/[-:]/g,'').replace('.000','')
 const calendarEvents=text=>text.replace(/\r\n[ \t]/g,'').split('BEGIN:VEVENT\r\n').slice(1).map(block=>Object.fromEntries(block.split('END:VEVENT')[0].trim().split('\r\n').map(line=>{const colon=line.indexOf(':');return [line.slice(0,colon),line.slice(colon+1)]})))
 const checkCalendar=async(response,from,to)=>{
  ok(response);assert.equal(response.headers.get('cache-control'),'private, no-store')
  const events=calendarEvents(response.value),windows=ok(await req('/api/paging/preview',{scheduleId:'daily',from,to})),members=ok(await req('/api/state')).members
  const expected=windows.flatMap((window,index)=>['primary','backup'].map(role=>({
   DTSTART:calendarDate(window.at),DTEND:calendarDate(windows[index+1]?.at??to),
   SUMMARY:'Daily hand-off / '+role+': '+(window[role]?members.find(member=>member.id===window[role]).name:'Coverage gap')
  })))
  assert.deepEqual(events.map(({DTSTART,DTEND,SUMMARY})=>({DTSTART,DTEND,SUMMARY})),expected,'both roles, overrides and gaps use the resolved UTC intervals')
  assert.equal(new Set(events.map(event=>event.UID)).size,events.length,'primary and backup remain distinct calendar events')
  assert.ok(events.every(event=>event.DTSTAMP===calendarDate(from)))
  assert.equal(events[0].DTSTART,calendarDate(from));assert.equal(events.at(-1).DTEND,calendarDate(to))
  return events
 }
 const calendarRecords=durableSnapshot(w)
 await w.time(calendarFrom)
 const defaultEvents=await checkCalendar(await req(calendarPath),calendarFrom,calendarFrom+7*86400000)
 assert.deepEqual(defaultEvents.slice(0,2).map(event=>event.SUMMARY),['Daily hand-off / primary: Alice','Daily hand-off / backup: Bob'])
 const overrideEvents=await checkCalendar(ics,calendarFrom,calendarTo)
 assert.ok(overrideEvents.some(event=>event.SUMMARY==='Daily hand-off / primary: Alice'&&event.DTSTART==='20260308T130000Z'&&event.DTEND==='20260308T150000Z'))
 assert.ok(overrideEvents.some(event=>event.SUMMARY==='Daily hand-off / backup: Coverage gap'&&event.DTSTART==='20260308T130000Z'&&event.DESCRIPTION.includes('same member')))
 assert.ok(overrideEvents.some(event=>event.SUMMARY==='Daily hand-off / backup: Alice'&&event.DTSTART==='20260308T150000Z'))
 assert.ok(overrideEvents.some(event=>event.SUMMARY==='Daily hand-off / primary: Bob'&&event.DTSTART==='20260308T150000Z'))
 const calendarLimit=calendarFrom+31*86400000,calendarURL=to=>calendarPath+'?from='+new Date(calendarFrom).toISOString()+'&to='+new Date(to).toISOString()
 await checkCalendar(await req(calendarURL(calendarLimit)),calendarFrom,calendarLimit)
 assert.deepEqual(durableSnapshot(w),calendarRecords,'successful calendar reads preserve all durable records')
 for(const to of [calendarLimit+1000,calendarFrom,calendarFrom-1000]){
  const refusal=ok(await req(calendarURL(to)),400);assert.match(refusal.error,/positive and at most 31 elapsed days/)
 }
 const afterCalendarRefusals=durableSnapshot(w),withoutRefusalAudit=records=>Object.fromEntries(Object.entries(records).filter(([table])=>!['oc_admin_audit','oc_audit_clock'].includes(table)))
 assert.deepEqual(withoutRefusalAudit(afterCalendarRefusals),withoutRefusalAudit(calendarRecords),'invalid calendar windows preserve all records except the required refusal audit and its bookkeeping')
 assert.equal(afterCalendarRefusals.oc_admin_audit.length,calendarRecords.oc_admin_audit.length+3)
 assert.ok(afterCalendarRefusals.oc_admin_audit.filter(row=>!calendarRecords.oc_admin_audit.some(prior=>prior.id===row.id)).every(row=>row.kind==='schedules.request'&&row.outcome==='refused'&&row.workspace_before===row.workspace_after&&row.paging_before===row.paging_after))
 await w.time(Date.now())
 record('PROBE OC-020 seven-day default: authenticated calendar.ics at 2026-03-07T14:00:00Z -> exact seven-day UTC window across DST')
 record('PROBE OC-020 elapsed bound: calendar.ics with 31 days -> 200; 31 days plus one second, zero and reverse windows -> 400')
 record('PROBE OC-020 separate roles: calendar.ics -> distinct primary and backup events match resolved coverage and exact DST override boundaries')
 ok(await req('/api/command',{type:'member',id:b.id,active:false,role:'responder'}))
 assert.equal(ok(await req('/api/schedules/daily/now-next?at=2026-03-08T15:00:00Z')).now.primary,null,'inactive member keeps its slot as a gap')
 const gapEvents=await checkCalendar(await req(calendarURL(calendarTo)),calendarFrom,calendarTo)
 assert.ok(gapEvents.some(event=>event.SUMMARY==='Daily hand-off / primary: Coverage gap'&&event.DTSTART==='20260308T150000Z'&&event.DESCRIPTION.includes('inactive')))
 assert.ok(gapEvents.some(event=>event.SUMMARY==='Daily hand-off / backup: Coverage gap'&&event.DTSTART==='20260307T140000Z'&&event.DESCRIPTION.includes('inactive')))
 record('PROBE OC-020 explicit gaps: calendar.ics with inactive responder -> primary and backup Coverage gap events with exact UTC intervals and explanations')
 ok(await req('/api/command',{type:'member',id:b.id,active:true,role:'responder'}))
 ok(await req('/api/paging/policies',{service:'checkout',scheduleId:'daily',revision:0,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3}))
 const calendarSource='synthetic-oncall-20',calendarKey='synthetic-oncall-20-native-credential'
 ok(await req('/api/sources',{id:calendarSource,key:calendarKey,scopes:['checkout']}))
 const pagingBeforeAdmission=ok(await req('/api/paging/state')),signal={source:calendarSource,eventId:'synthetic-oncall-20-event',service:'checkout',environment:'production',key:'synthetic-oncall-20-alert',generation:'synthetic-oncall-20-generation',intent:'trigger',severity:'warning',title:'Synthetic calendar intake',observedAt:'2026-03-07T14:00:00Z',evidence:''}
 const admitted=ok(await w.request('/api/ingress/'+calendarSource,signal,undefined,{authorization:'Bearer '+calendarKey}),201)
 const admittedState=ok(await req('/api/state')),admittedEvent=admittedState.events.find(event=>event.id===admitted.id)
 assert.ok(admittedEvent);assert.equal(admittedEvent.source,calendarSource);assert.equal(admittedEvent.eventId,signal.eventId)
 assert.ok(admittedState.alerts.some(alert=>alert.state==='active'&&alert.events.includes(admitted.id)),'native admission opens a real retained alert')
 assert.deepEqual(ok(await req('/api/paging/state')),{...pagingBeforeAdmission,workspaceRevision:admittedState.revision},'admission with a saved paging policy creates no jobs, deadlines or receipts')
 const duplicate=ok(await w.request('/api/ingress/'+calendarSource,signal,undefined,{authorization:'Bearer '+calendarKey}))
 assert.equal(duplicate.id,admitted.id);assert.deepEqual(ok(await req('/api/state')),admittedState,'repeated capture preserves immutable event and alert records')
 ok(await req('/api/sources/'+calendarSource+'/revoke',{}))
 ok(await w.request('/api/ingress/'+calendarSource,{...signal,eventId:'synthetic-oncall-20-refused'},undefined,{authorization:'Bearer '+calendarKey}),401)
 assert.deepEqual(ok(await req('/api/state')),admittedState,'revoked source cannot admit another capture')
 assert.deepEqual(ok(await req('/api/paging/state')),{...pagingBeforeAdmission,workspaceRevision:admittedState.revision})
 assert.deepEqual(await w.outboundRequests(),[],'calendar reads, native admission, retries and revocation issue zero outbound requests')
 record('PROBE OC-020 paging-free admission: scoped native ingress -> immutable event and active alert; retry returns original event; revoked key -> 401; paging snapshot unchanged and zero outbound requests')
 // OC-024 layer, holiday, PTO and long-range doors run in scheduleCoordination above.
 // OC-024 reviewed schedule changes bind the full proposal and coverage to the revision.
 const reviewFrom=Date.parse('2026-10-24T00:00:00Z'),reviewTo=Date.parse('2026-11-09T00:00:00Z')
 const reviewBase=ok(await req('/api/paging/schedules',{...schedule,id:'synthetic-oncall-1',name:'Reviewed multi-zone rota',primary:{...schedule.primary,members:[a.id]},backup:{...schedule.backup,members:[b.id]}}))
 const reviewDraft={...reviewBase,timezone:'Europe/London',overrides:[{id:'synthetic-oncall-2',role:'primary',start:'2026-10-26T09:00:00.000Z',end:'2026-10-26T12:00:00.000Z',member:null}]}
 const reviewInput={schedule:reviewDraft,from:reviewFrom,to:reviewTo}
 const reviewed=ok(await req('/api/schedules/synthetic-oncall-1/review',reviewInput))
 assert.equal(reviewed.members.find(m=>m.id===a.id).name,'Alice','review labels come from the server membership snapshot')
 assert.ok(reviewed.intervals.some(r=>r.newGap&&r.after===null&&r.before===a.id))
 assert.ok(reviewed.clocks.some(c=>c.zone==='Europe/London'&&c.at===Date.parse('2026-10-25T01:00:00Z')))
 assert.ok(reviewed.clocks.some(c=>c.zone==='America/New_York'&&c.at===Date.parse('2026-11-01T06:00:00Z')),'US fall back is November 1 in 2026, not November 8')
 const losAngeles=ok(await req('/api/schedules/synthetic-oncall-1/review',{...reviewInput,schedule:{...reviewDraft,timezone:'America/Los_Angeles'}}))
 assert.ok(losAngeles.clocks.some(c=>c.zone==='America/Los_Angeles'&&c.at===Date.parse('2026-11-01T09:00:00Z')))
 ok(await req('/api/paging/schedules',reviewDraft),409)
 ok(await req('/api/schedules/synthetic-oncall-1/apply',{...reviewInput,digest:reviewed.digest,confirmed:false}),409)
 ok(await req('/api/schedules/synthetic-oncall-1/apply',{...reviewInput,schedule:{...reviewDraft,name:'Unreviewed change'},digest:reviewed.digest,confirmed:true}),409)
 // Login returns the session cookie on the response, never authority in the request body.
 const reviewViewerSession=await w.request('/api/login',{name:'Viewer',password:'synthetic-local-testing-password'})
 ok(await w.request('/api/schedules/synthetic-oncall-1/review',reviewInput,reviewViewerSession.cookie),403)
 ok(await w.request('/api/schedules/synthetic-oncall-1/review',reviewInput),401)
 const reviewBeforeFailure=ok(await req('/api/paging/state'))
 w.sql("CREATE TRIGGER synthetic_oncall_review_audit BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'SYNTHETIC_REVIEW_AUDIT_FAILURE'); END")
 ok(await req('/api/schedules/synthetic-oncall-1/apply',{...reviewInput,digest:reviewed.digest,confirmed:true}),503)
 assert.deepEqual(ok(await req('/api/paging/state')),reviewBeforeFailure,'failed audit rolls back the reviewed schedule')
 w.sql('DROP TRIGGER synthetic_oncall_review_audit')
 const racedReviews=await Promise.all([0,1].map(()=>req('/api/schedules/synthetic-oncall-1/apply',{...reviewInput,digest:reviewed.digest,confirmed:true})))
 assert.deepEqual(racedReviews.map(r=>r.status).sort(),[200,409])
 assert.deepEqual(ok(await req('/api/paging/preview',{scheduleId:reviewBase.id,from:reviewFrom,to:reviewTo})),reviewed.coverage,'applied coverage exactly equals reviewed coverage')
 ok(await req('/api/schedules/synthetic-oncall-1/apply',{...reviewInput,digest:reviewed.digest,confirmed:true}),409)
 const retained=ok(await req('/api/paging/state')).schedules.find(s=>s.id===reviewBase.id)
 assert.deepEqual(retained.primary.members,reviewBase.primary.members);assert.deepEqual(retained.backup.members,reviewBase.backup.members)
 record('OC-024 reviewed schedule changes: New York/London/Los Angeles DST, new gap, retained slots, denied viewer/anonymous, confirmation and stale-digest refusal, audit rollback, race and exact apply/preview equality passed')
 record('OC-011/014/020: calendar-day DST hand-off, overrides, now/next, protected ICS and escalation data passed')
 // OC-068: public manual page and independent responder-request lifecycle, with no sender.
 const pageInput={type:'manual-page',operationId:'synthetic-oncall-68-page',service:'checkout',title:'Manual checkout impact',severity:'warning',description:'Investigate payment failures',users:[a.id,b.id],priority:'P2'}
 let manual=ok(await req('/api/command',pageInput));assert.equal(manual.urgency,'high');assert.equal(manual.manualPage.creator,admin.id);assert.equal(manual.manualPage.assignment.minutes,10);assert.equal(manual.manualPage.assignment.policy,'checkout');assert.equal(manual.manualPage.obligations.length,2)
 assert.ok(manual.manualPage.obligations.every(o=>o.paging==='off'&&o.automatic===false&&o.label==='no sender'))
 assert.equal(ok(await req('/api/command',pageInput)).id,manual.id);ok(await req('/api/command',{...pageInput,title:'Conflicting reuse'}),409)
 assert.equal(ok(await req('/api/state')).incidents.filter(i=>i.manualPage?.operation===pageInput.operationId).length,1)
 ok(await req('/api/command',{type:'user-assignment',service:'checkout',baseVersion:0,mode:'repeat',minutes:7,policy:'checkout'}));ok(await req('/api/command',{type:'user-assignment',service:'checkout',baseVersion:0,mode:'repeat',minutes:7,policy:'checkout'}),409)
 const policyPage=ok(await req('/api/command',{...pageInput,operationId:'synthetic-oncall-68-policy',users:[],policy:'checkout',urgency:'low'}));assert.equal(policyPage.urgency,'low');assert.equal(policyPage.manualPage.obligations[0].target.policyRevision,1);assert.equal(policyPage.manualPage.assignment.version,1)
 record('OC-068 manual pages: creator, urgency default/override, optional priority/description, real policy snapshot, per-user obligations, versioned assignment setting and repeated/conflicting operation keys')
 const beforePageFailure=ok(await req('/api/state'))
 w.sql("CREATE TRIGGER injected_manual_audit_failure BEFORE INSERT ON oc_admin_audit WHEN NEW.workspace_after>NEW.workspace_before BEGIN SELECT RAISE(ABORT,'INJECTED_MANUAL_AUDIT_FAILURE'); END")
 try{ok(await req('/api/command',{...pageInput,operationId:'synthetic-oncall-68-atomic'}),503)}finally{w.sql('DROP TRIGGER injected_manual_audit_failure')}
 assert.deepEqual(ok(await req('/api/state')),beforePageFailure,'manual page and obligations roll back when permanent audit fails')
 record('OC-068 atomic custody: failed permanent audit rolls back incident, obligations and creator state')
 manual=ok(await req('/api/command',{type:'request-responders',incident:manual.id,revision:manual.revision,users:[a.id,b.id],message:'Please inspect payments'}))
 const [requestA,requestB]=manual.responderRequests,sessionA=(await w.request('/api/login',{name:'Alice',password:'synthetic-local-testing-password'})).cookie,sessionB=(await w.request('/api/login',{name:'Bob',password:'synthetic-local-testing-password'})).cookie
 manual=ok(await w.request('/api/command',{type:'respond-request',incident:manual.id,revision:manual.revision,request:requestA.id,decision:'accept'},sessionA));assert.deepEqual(manual.responders,[a.id]);assert.equal(manual.manualPage.acknowledgment,null);assert.equal(manual.state,'declared')
 manual=ok(await req('/api/command',{type:'transition',incident:manual.id,revision:manual.revision,state:'acknowledged',summary:'Primary owner acknowledges'}));assert.equal(manual.responderRequests.find(r=>r.id===requestB.id).status,'pending');assert.ok(manual.manualPage.obligations.every(o=>o.state==='stopped'))
 manual=ok(await w.request('/api/command',{type:'respond-request',incident:manual.id,revision:manual.revision,request:requestB.id,decision:'decline'},sessionB));assert.equal(manual.manualPage.acknowledgment.by,admin.id);assert.equal(manual.responderRequests[1].notice.target.id,admin.id);assert.equal(manual.responderRequests[1].notice.automatic,false)
 manual=ok(await req('/api/command',{type:'request-responders',incident:manual.id,revision:manual.revision,users:[a.id,b.id],message:'Follow-up request'}));const cancel=manual.responderRequests.at(-2)
 ok(await w.request('/api/command',{type:'cancel-request',incident:manual.id,revision:manual.revision,request:cancel.id},sessionA),403)
 manual=ok(await req('/api/command',{type:'cancel-request',incident:manual.id,revision:manual.revision,request:cancel.id}));assert.equal(manual.responderRequests.find(r=>r.id===cancel.id).status,'cancelled')
 manual=ok(await req('/api/command',{type:'bulk-resolve',incident:manual.id,revision:manual.revision,reason:'Human verification completed',evidence:'https://example.test/manual-recovery'}));assert.ok(manual.responderRequests.every(r=>r.status!=='pending'&&r.obligation.state==='stopped'));assert.ok(manual.manualPage.obligations.every(o=>o.state==='stopped'))
 assert.ok(manual.timeline.some(e=>e.kind==='respond-request'&&e.actor===a.id));assert.ok(manual.timeline.some(e=>e.kind==='respond-request'&&e.actor===b.id))
 record('OC-068 responder requests: independent accept/decline and timeline acknowledgment; accepted responder never acknowledges primary; primary acknowledgment preserves pending requests; requester notice, cancellation and resolution stop only their own work')
 const stakeholder68=ok(await req('/api/members',{name:'synthetic-oncall-68-stakeholder',password:'synthetic-local-testing-password',role:'stakeholder'}),201)
 for(const name of ['Viewer',stakeholder68.name]){const deniedSession=(await w.request('/api/login',{name,password:'synthetic-local-testing-password'})).cookie,before=ok(await req('/api/state'));ok(await w.request('/api/command',{...pageInput,operationId:'synthetic-oncall-68-refused'},deniedSession),403);ok(await w.request('/api/command',{type:'request-responders',incident:policyPage.id,revision:policyPage.revision,users:[a.id],message:'Refused'},deniedSession),403);assert.deepEqual(ok(await req('/api/state')),before)}
 record('OC-068 permissions: viewer and stakeholder create/request attempts explain refusal and create nothing; paging remains OFF')

 const refusedPagingBefore=ok(await req('/api/paging/state')),refusedWorkspaceBefore=ok(await req('/api/state')),beforeRefusedPaging=await auditExport(),priorPagingAuditIds=new Set(beforeRefusedPaging.map(row=>row.id))
 const pagingDoors=['/api/delivery','/api/paging/jobs','/api/paging/tick','/api/paging/callbacks','/api/paging/jobs/old/resume']
 for(const path of pagingDoors)ok(await req(path,{}),409)
 assert.deepEqual(ok(await req('/api/paging/state')),refusedPagingBefore,'delivery refusals leave complete paging state unchanged')
 assert.deepEqual(ok(await req('/api/state')),refusedWorkspaceBefore,'delivery refusals leave complete workspace state unchanged')
 const pagingRefusals=(await auditExport()).filter(row=>!priorPagingAuditIds.has(row.id)&&row.outcome==='refused')
 assert.ok(pagingRefusals.length>=pagingDoors.length,'every refused paging door leaves an attributable refusal entry')
 for(const row of pagingRefusals)assert.deepEqual([row.beforeRevision,row.workspaceBefore,row.pagingBefore,row.handoffBefore],[row.afterRevision,row.workspaceAfter,row.pagingAfter,row.handoffAfter],'a paging refusal advances no state or mutation revision')
 assert.equal(w.sql('SELECT COUNT(*) AS n FROM paging_receipts')[0].n,0)
 record('OC-012/013/041: every delivery/timer door refused, its audit retained unchanged revisions and no receipt was created')
 const reader=await w.request('/api/login',{name:'Viewer',password:'synthetic-local-testing-password'});ok(reader)
 ok(await w.request('/api/audit/export',undefined,reader.cookie),403)
 const sources={}
 const atomicSource=await readFile('tests/fixtures/opsgenie.json','utf8'),atomicPreview=ok(await door.preview('opsgenie',atomicSource))
 w.sql("CREATE TRIGGER injected_import_failure BEFORE INSERT ON move_in_objects WHEN NEW.kind='schedule' BEGIN SELECT RAISE(ABORT,'INJECTED_NATIVE_FAILURE'); END")
 assert.equal(ok(await door.call('opsgenie','apply',{planId:atomicPreview.planId,reviewedFingerprint:atomicPreview.fingerprint}),409).error,'import_door_apply_constraint')
 assert.equal(w.sql('SELECT COUNT(*) AS n FROM move_in_objects')[0].n,0,'failed batch published no users or schedules')
 assert.equal(w.sql('SELECT COUNT(*) AS n FROM ik_batches')[0].n,0,'failed batch published no journal progress')
 const interrupted=ok(await req('/api/move-in/jobs?vendor=opsgenie'))[0];assert.equal(interrupted.checkpoint,0);assert.equal(interrupted.state,'failed')
 w.sql('DROP TRIGGER injected_import_failure')
 // A failed door apply is terminal: no session resumes it, through the door or the old journal route.
 ok(await door.call('opsgenie','apply',{planId:atomicPreview.planId,reviewedFingerprint:atomicPreview.fingerprint},reader.cookie),403)
 assert.equal(ok(await door.call('opsgenie','apply',{planId:atomicPreview.planId,reviewedFingerprint:atomicPreview.fingerprint}),409).error,'import_door_plan_failed')
 assert.equal(ok(await req(`/api/move-in/${interrupted.id}/resume`,{vendor:'opsgenie'}),409).code,'IMPORT_DOOR_JOB')
 const replanned=ok(await door.preview('opsgenie',atomicSource));assert.notEqual(replanned.planId,atomicPreview.planId)
 assert.equal(ok(await door.apply('opsgenie',replanned)).job.state,'completed')
 assert.equal(ok(await door.undo('opsgenie',replanned.planId)).job.state,'undone')
 record('OC-022: injected native SQL failure rolled back the complete batch and journal; the failed apply stayed refused and an authorized new preview of the same file applied and undid it')
 // A lost response after one accepted bounded batch is not permission to retry the remaining records.
 const interruptedSource=JSON.stringify({users:{data:Array.from({length:25},(_,index)=>({id:'interrupted-'+index,username:`interrupted-${index}@example.test`,fullName:'Interrupted import person '+index}))}})
 const interruptedPreview=ok(await door.preview('opsgenie',interruptedSource)),interruptionAuditBefore=await auditExport(),priorInterruptionIds=new Set(interruptionAuditBefore.map(row=>row.id))
 w.sql("CREATE TRIGGER injected_import_exit BEFORE UPDATE OF state ON oc_import_lifecycle WHEN NEW.state='idle' AND OLD.state='active' BEGIN SELECT RAISE(ABORT,'INJECTED_WORKER_EXIT_AFTER_COMMIT'); END")
 ok(await door.call('opsgenie','apply',{planId:interruptedPreview.planId,reviewedFingerprint:interruptedPreview.fingerprint}),503)
 w.sql('DROP TRIGGER injected_import_exit')
 const partialImport=ok(await req('/api/move-in/objects'))
 assert.ok(partialImport.length>0&&partialImport.length<25,'one bounded batch committed before the response was lost; the remaining people were not applied')
 w.sql(`UPDATE oc_import_lifecycle SET lease_expires=0 WHERE plan_id='${interruptedPreview.planId}'`)
 const expired=ok(await door.call('opsgenie','status',{planId:interruptedPreview.planId}))
 assert.equal(expired.job.state,'failed');assert.equal(expired.failureCode,'import_interrupted_lease')
 assert.deepEqual(ok(await req('/api/move-in/objects')),partialImport,'publishing interruption keeps the accepted partial state and imports nobody else')
 const interruptionAudit=(await auditExport()).filter(row=>!priorInterruptionIds.has(row.id)&&row.outcome==='interrupted')
 assert.ok(interruptionAudit.length>0,'the expired accepted attempt publishes a durable interrupted audit outcome')
 await w.stop();await w.start()
 const durableInterruption=ok(await door.call('opsgenie','status',{planId:interruptedPreview.planId}))
 assert.equal(durableInterruption.job.state,'failed');assert.equal(durableInterruption.failureCode,'import_interrupted_lease')
 const auditAfterInterruptedRestart=new Map((await auditExport()).map(row=>[row.id,row]))
 for(const row of interruptionAudit)assert.deepEqual(auditAfterInterruptedRestart.get(row.id),row,'Worker restart retains the interrupted audit outcome')
 assert.equal(ok(await door.call('opsgenie','apply',{planId:interruptedPreview.planId,reviewedFingerprint:interruptedPreview.fingerprint}),409).error,'import_door_plan_failed')
 assert.deepEqual(ok(await req('/api/move-in/objects')),partialImport,'a refused retry publishes no more imported effects')
 assert.equal(ok(await door.undo('opsgenie',interruptedPreview.planId)).job.state,'rolled_back')
 assert.deepEqual(ok(await req('/api/move-in/objects')),[],'explicit rollback removes the accepted partial effects')
 record('OC-022/041: a lost response after an accepted import batch became durably interrupted with its audit, refused retry after restart, and retained its partial effects until explicit rollback')
 // Stop between bounded requests while the reviewed import still has work to do.
 for(const vendor of ['pagerduty','opsgenie']) {
  const bundle=JSON.parse(await readFile(`tests/fixtures/${vendor}.json`,'utf8'))
  const people=Array.from({length:25},(_,index)=>{
   const id='synthetic-oncall-'+vendor+'-'+index,email=[id,'example.test'].join('@')
   return vendor==='opsgenie'?{id,username:email,fullName:id}:{id,email,name:id}
  })
  ;(vendor==='opsgenie'?bundle.users.data:bundle.users).push(...people)
  const beforeObjects=ok(await req('/api/move-in/objects')),beforeNative=ok(await req('/api/state')),beforePaging=ok(await req('/api/paging/state'))
  const preview=ok(await door.preview(vendor,JSON.stringify(bundle)))
  assert.ok(preview.counts.mapped>20,'the reviewed source exceeds one door batch')
  assert.deepEqual(ok(await req('/api/move-in/objects')),beforeObjects,'preview publishes no imported objects')
  const reviewed={planId:preview.planId,reviewedFingerprint:preview.fingerprint}
  const first=ok(await door.call(vendor,'apply',reviewed)).job
  assert.equal(first.state,'applying');assert.equal(first.fingerprint,preview.fingerprint)
  assert.ok(first.checkpoint>0&&first.checkpoint<first.total,'exactly one apply commits an unfinished prefix')
  const partial=ok(await req('/api/move-in/objects'))
  assert.ok(partial.length>beforeObjects.length&&partial.length<preview.items.flatMap(item=>item.effects).length,'native effects exist for only part of the reviewed plan')
  const status=()=>door.call(vendor,'status',{planId:preview.planId})
  assert.deepEqual(ok(await status()).job,first)
  await w.stop();await w.start()
  const retained=ok(await status())
  assert.equal(retained.planId,preview.planId);assert.equal(retained.fingerprint,preview.fingerprint)
  assert.deepEqual(retained.job,first,'restart retains the same unfinished job and committed checkpoint')
  const journal=ok(await req('/api/move-in/jobs?vendor='+vendor)).find(job=>job.id===first.id)
  assert.ok(journal);assert.equal(journal.state,'applying');assert.equal(journal.checkpoint,first.checkpoint)
  assert.deepEqual(journal.door,{planId:preview.planId,fingerprint:preview.fingerprint,business:false})
  assert.deepEqual(ok(await req('/api/move-in/objects')),partial,'restart preserves every committed object and its revision')
  const completed=ok(await door.apply(vendor,preview)).job
  assert.equal(completed.id,first.id);assert.equal(completed.fingerprint,first.fingerprint)
  assert.equal(completed.state,'completed');assert.equal(completed.checkpoint,first.total)
  const applied=ok(await req('/api/move-in/objects'))
  assert.equal(applied.length,preview.items.flatMap(item=>item.effects).length)
  assert.equal(new Set(applied.map(row=>row.targetKind+':'+row.targetId)).size,applied.length)
  for(const person of people)assert.equal(applied.filter(row=>row.targetKind==='user'&&row.targetId===(person.email??person.username)).length,1,'every remaining person is created exactly once')
  for(const row of partial)assert.deepEqual(applied.find(item=>item.targetKind===row.targetKind&&item.targetId===row.targetId),row,'resume does not replace the committed prefix')
  assert.ok(applied.every(row=>row.value.paused&&row.value.paging===false&&row.value.login===false))
  const batches=()=>w.sql(`SELECT position,end_position FROM ik_batches WHERE job_id='${first.id}' AND action='apply' ORDER BY position`)
  const committed=batches();let checkpoint=0
  for(const batch of committed){assert.equal(batch.position,checkpoint);assert.ok(batch.end_position>checkpoint);checkpoint=batch.end_position}
  assert.equal(checkpoint,completed.total,'committed batches cover the reviewed plan once without gaps or overlap')
  assert.deepEqual(ok(await door.call(vendor,'apply',reviewed)).job,completed,'completed retry keeps job identity and progress')
  assert.deepEqual(batches(),committed,'completed retry commits no new batch')
  assert.deepEqual(ok(await req('/api/move-in/objects')),applied,'completed retry changes no object or revision')
  const undone=ok(await door.undo(vendor,preview.planId)).job
  assert.equal(undone.id,first.id);assert.equal(undone.state,'undone')
  assert.deepEqual(ok(await req('/api/move-in/objects')),beforeObjects,'undo removes exactly this import')
  assert.deepEqual(ok(await req('/api/state')),beforeNative,'resume and undo grant no native membership or coordination authority')
  assert.deepEqual(ok(await req('/api/paging/state')),beforePaging,'resume and undo leave paging OFF with unchanged jobs and receipts')
  record(`OC-022 ${vendor}: unfinished checkpoint ${first.checkpoint} of ${first.total} survived Worker restart; the same reviewed job completed once, retried without changes and undid exactly`)
 }
 // Each documented response shape runs the whole guarantee: bare fixtures, saved responses (lists and single details) and PagerDuty layer history.
 const shapes=[
  {file:'opsgenie',vendor:'opsgenie',id:'opsgenie:ops-daily',at:'2026-03-08T13:00:00Z',primary:'alice@example.test'},
  {file:'opsgenie-saved',vendor:'opsgenie',id:'opsgenie:ops-daily',at:'2026-03-08T13:00:00Z',primary:'alice@example.test',like:'opsgenie'},
  {file:'opsgenie-override-detail',vendor:'opsgenie',id:'opsgenie:ops-daily',at:'2026-03-08T13:00:00Z',primary:'alice@example.test',rejected:false},
  {file:'pagerduty',vendor:'pagerduty',id:'pagerduty:pd-daily',at:'2026-03-08T13:00:00Z',primary:'bob@example.test'},
  {file:'pagerduty-saved',vendor:'pagerduty',id:'pagerduty:pd-daily',at:'2026-03-08T10:00:00Z',primary:'alice@example.test',like:'pagerduty'},
  {file:'pagerduty-lists',vendor:'pagerduty',id:'pagerduty:pd-daily',at:'2026-03-08T13:00:00Z',primary:'bob@example.test',like:'pagerduty'},
  {file:'pagerduty-user-details',vendor:'pagerduty',id:'pagerduty:pd-daily',at:'2026-03-08T13:00:00Z',primary:'bob@example.test',rejected:false},
  {file:'pagerduty-layers',vendor:'pagerduty',id:'pagerduty:pd-history',at:'2026-03-03T10:00:00Z',primary:'bob@example.test',rejected:true,also:[{id:'pagerduty:pd-ny-match',at:'2026-03-08T13:30:00Z',primary:'bob@example.test'}]},
 ],mapped={}
 for(const {file,vendor,id,at,primary,like,rejected=true,also=[]} of shapes) {
  const source=await readFile(`tests/fixtures/${file}.json`,'utf8');if(file===vendor)sources[vendor]=source
  const before=w.sql('SELECT COUNT(*) AS n FROM ik_jobs UNION ALL SELECT COUNT(*) FROM ik_batches UNION ALL SELECT COUNT(*) FROM ik_d1_assertions UNION ALL SELECT COUNT(*) FROM move_in_objects')
  const preview=ok(await door.preview(vendor,source))
  for(const item of preview.items){let record=JSON.parse(source);for(const key of item.location.pointer.slice(1).split('/').map(s=>s.replaceAll('~1','/').replaceAll('~0','~')))record=record?.[key];assert.ok(record!==undefined,'review points into the actual supplied response envelope')}
  assert.ok(preview.counts.mapped>0);mapped[file]=preview.counts.mapped;if(like)assert.equal(preview.counts.mapped,mapped[like],'a saved response maps exactly what the bare fixture maps');assert.equal(preview.items.find(i=>i.effects.some(e=>e.targetKind==='schedule')).effects[0].value.equivalence.status,'equivalent-in-window');assert.equal(preview.counts.rejected>0,rejected);assert.ok(preview.items.filter(i=>i.rejection).every(i=>i.name&&i.rejection))
  assert.deepEqual(w.sql('SELECT COUNT(*) AS n FROM ik_jobs UNION ALL SELECT COUNT(*) FROM ik_batches UNION ALL SELECT COUNT(*) FROM ik_d1_assertions UNION ALL SELECT COUNT(*) FROM move_in_objects'),before)
  ok(await door.preview(vendor,source,reader.cookie),403)
  ok(await w.request('/api/move-in/erase',{email:'alice@example.test',confirmation:'erase alice@example.test'},reader.cookie),403)
  ok(await w.request('/api/move-in/erase',{email:'alice@example.test',confirmation:'erase alice@example.test'}),401)
  ok(await door.call(vendor,'apply',{planId:preview.planId,reviewedFingerprint:'changed-review'}),400)
  ok(await door.call(vendor,'apply',{planId:preview.planId,reviewedFingerprint:(preview.fingerprint[0]==='0'?'1':'0')+preview.fingerprint.slice(1)}),403)
  const reviewed={planId:preview.planId,reviewedFingerprint:preview.fingerprint}
  let job=ok(await door.call(vendor,'apply',reviewed)).job
  await w.stop();await w.start()
  while(job.state!=='completed')job=ok(await door.call(vendor,'apply',reviewed)).job
  const objects=ok(await req('/api/move-in/objects'));assert.ok(objects.every(r=>r.value.paused&&r.value.paging===false&&r.value.login===false))
  assert.ok(w.sql("SELECT COUNT(*) AS n FROM ik_batches WHERE job_id='"+job.id+"'")[0].n>0)
  assert.ok(w.sql("SELECT sha256,size FROM ik_originals WHERE job_id='"+job.id+"' AND kind='artifact'").some(o=>o.sha256===createHash('sha256').update(source).digest('hex')&&o.size===Buffer.byteLength(source)),'the journal keeps the saved file\'s exact bytes')
  const repeat=ok(await door.call(vendor,'apply',reviewed)).job;assert.equal(repeat.id,job.id)
  for(const point of [{id,at,primary},...also]){const covered=ok(await req('/api/move-in/coverage',{vendor,id:point.id,at:point.at}));assert.equal(covered.coverage.primary,point.primary,`${file} ${point.id}`)}
  assert.equal(ok(await door.undo(vendor,preview.planId)).job.state,'undone')
  assert.equal(w.sql('SELECT COUNT(*) AS n FROM move_in_objects')[0].n,0)
  record(`OC-021/022 ${file}: zero-write review, named rejections, paused apply, restart/resume, journal, idempotence, equivalence point and undo passed`)
 }
 // Everything Oncall's model cannot hold exactly stays rejected by name, never approximated.
 const refused=async(vendor,file)=>{const r=ok(await door.preview(vendor,await readFile(`tests/fixtures/${file}.json`,'utf8')));assert.ok(r.items.filter(i=>i.rejection&&i.kind==='schedules').every(i=>i.effects.length===0),'a rejected schedule produces no effect');return r}
 const reasons=r=>r.items.filter(i=>i.rejection).map(i=>i.rejection).join('\n')
 const named=(text,patterns)=>{for(const pattern of patterns)assert.match(text,pattern)}
 named(reasons(await refused('opsgenie','opsgenie-unsupported')),[/hourly rotation cannot map to calendar days/,/time restrictions are unsupported/,/Concurrent\/layered rotations cannot be mapped: Primary, Second/,/participant team cannot map/,/participant none cannot map/,/participant escalation cannot map/,/multiple override participants/,/repeats are unsupported/,/notification condition if-not-closed/,/notifyType all/,/direct user/,/more than two steps/])
 named(reasons(await refused('pagerduty','pagerduty-unsupported')),[/sub-day or invalid rotation length/,/time restrictions are unsupported/,/Concurrent\/layered rotations cannot be mapped: Layer one, Layer two/,/need incumbent DST equivalence evidence/,/repeats are unsupported/,/simultaneous or missing recipients/,/direct user/,/more than two steps/])
 const layers=await refused('pagerduty','pagerduty-layers')
 named(reasons(layers),[/Concurrent\/layered rotations cannot be mapped: Ended later, Current/,/timeline differs: 2026-03-08T13:00:00\.000Z: incumbent alice@example\.test, Oncall bob@example\.test/,/has no UTC-offset change in America\/New_York/,/no final timeline supplied/])
 assert.equal(layers.items.find(i=>i.name==='History rota').unmapped.filter(u=>u.field==='schedule_layers.history').length,2,'ended layers are named history, not coverage')
 // A refused preview retains safe audit metadata; its upload goes with the refusal, so no chunk keeps a refused key.
 const rowCounts=()=>{const names=w.sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'").map(r=>r.name);return Object.fromEntries(w.statements(names.map(name=>`SELECT COUNT(*) AS n FROM "${name}"`).join(';')).map((rows,i)=>[names[i],rows[0].n]))}
 // (A preview first gives way to the screen's own earlier unconfirmed preview, as a preview always did, so rows may go; none may be added.)
 const wroteNothing=(before,message)=>{const after=rowCounts();assert.deepEqual(Object.keys(after).filter(t=>!['oc_admin_audit','oc_audit_identities'].includes(t)&&after[t]>before[t]),[],message);assert.equal(after.ik_door_uploads,before.ik_door_uploads,message);assert.equal(after.ik_door_chunks,before.ik_door_chunks,message)
  const added=after.oc_admin_audit-before.oc_admin_audit;assert.ok(added>0,'the refused preview retains its permanent audit')
  assert.ok(w.sql(`SELECT outcome FROM oc_admin_audit ORDER BY ordinal DESC LIMIT ${added}`).some(row=>row.outcome==='refused'),'the new audit explicitly retains the refusal outcome')
 }
 const chunksHolding=secret=>w.sql('SELECT base64 FROM ik_door_chunks').filter(c=>Buffer.from(c.base64,'base64').toString().includes(secret)).length
 for(const [vendor,file,field] of [['opsgenie','credential-opsgenie','apiKey'],['pagerduty','credential-pagerduty','integration_key']]){const rows=rowCounts(),refused=ok(await door.preview(vendor,await readFile(`tests/fixtures/${file}.json`,'utf8')),400);assert.match(refused.error,new RegExp(`^Credential-bearing field "${field}"`));assert.ok(refused.code,'the refusal carries a code, so the screen shows its sentence as written')
  assert.equal(chunksHolding('synthetic-fixture-credential'),0,`no ik_door_chunks row decodes to the refused ${field}`);wroteNothing(rows,'the refused preview retained audit without import rows or bytes')}
 // OC-038 PagerDuty account refusal matrix: each invalid file leaves no import custody or product writes.
 const account=JSON.parse(await readFile('tests/fixtures/pagerduty-account.json','utf8'))
 const credentialAccount=structuredClone(account);credentialAccount.services[0].services[0].integrations[0].integration_key='synthetic-oncall-refused-key'
 const duplicateAccount=structuredClone(account);duplicateAccount.users.push({user:structuredClone(account.users[0].users[0])})
 const danglingAccount=structuredClone(account);danglingAccount.services[0].services[0].escalation_policy.id='synthetic-oncall-missing-policy'
 const danglingTeam=structuredClone(account);danglingTeam.services[0].services[0].teams[0].id='synthetic-oncall-missing-team'
 const danglingRoute=structuredClone(account);danglingRoute.event_orchestrations[0].orchestration_path.sets[0].rules[0].actions.route_to='synthetic-oncall-missing-service'
 const oversized=JSON.stringify({users:[{id:'synthetic-oncall-large',email:'large@example.test',name:'x'.repeat(512*1024)}]})
 const tooMany=JSON.stringify({users:Array.from({length:501},(_,i)=>({id:'synthetic-oncall-limit-'+i,email:'pd-limit-'+i+'@example.test'}))})
 const badAccounts=[
  ['integration key',JSON.stringify(credentialAccount),400,[/integration_key/,/\/services\/0\/services\/0\/integrations\/0\/integration_key/,/remove/]],
  ['malformed JSON','{"users":[',400,[/Malformed JSON/,/save a complete JSON response/]],
  ['wrong vendor',await readFile('tests/fixtures/opsgenie-saved.json','utf8'),400,[/PagerDuty users/,/Opsgenie-shaped/,/choose Opsgenie/]],
  ['byte limit',oversized,413,[new RegExp(String(Buffer.byteLength(oversized))),/512 KiB/,/narrow the export/,/Nothing was imported or truncated/]],
  ['record limit',tooMany,413,[/501 records/,/500-record limit/,/narrow the export/,/Nothing was imported or truncated/]],
  ['duplicate identity',JSON.stringify(duplicateAccount),400,[/Duplicate PagerDuty users source id/,/synthetic-oncall-u1/,/\/users\//,/keep one saved detail/]],
  ['missing policy',JSON.stringify(danglingAccount),400,[/dangling escalation_policies reference/,/synthetic-oncall-missing-policy/,/\/services\/0\/services\/0\/escalation_policy/,/include that object's saved detail/]],
  ['missing route',JSON.stringify(danglingRoute),400,[/dangling services route/,/synthetic-oncall-missing-service/,/\/route_to/,/include that service's saved detail/]],
  ['missing team',JSON.stringify(danglingTeam),400,[/dangling teams reference/,/synthetic-oncall-missing-team/,/\/teams\/0/,/include that object's saved detail/]],
 ]
 for(const [name,raw,status,patterns] of badAccounts) {
  const rows=rowCounts(),objects=w.sql('SELECT * FROM move_in_objects ORDER BY kind,id'),workspace=ok(await req('/api/state')),paging=ok(await req('/api/paging/state'))
  const refused=ok(await door.preview('pagerduty',raw),status)
  for(const pattern of patterns)assert.match(refused.error,pattern,name)
  wroteNothing(rows,'PagerDuty '+name+' retains only refusal audit')
  assert.deepEqual(w.sql('SELECT * FROM move_in_objects ORDER BY kind,id'),objects,name)
  assert.deepEqual(ok(await req('/api/state')),workspace,name);assert.deepEqual(ok(await req('/api/paging/state')),paging,name)
 }
 assert.equal(chunksHolding('synthetic-oncall-refused-key'),0)
 record('OC-038 PagerDuty account refusal matrix: named credential field/pointer, malformed JSON, wrong vendor, byte/count bounds, duplicate source IDs and dangling policy/team references; no truncation, rows or retained upload bytes')
 record('OC-021: every shape Oncall cannot hold exactly was rejected by name with no effect; ended layers kept as history; credential-bearing keys refused and not kept')
 // Variants of the bare fixtures run preview, apply, coverage at a sample instant and undo: a refused schedule keeps every reason and is never imported, so it names no one.
 const variant=(vendor,change)=>{const value=JSON.parse(sources[vendor]);change(value);return JSON.stringify(value)}
 const layer=(id,name,start,end,user)=>({id,name,start,end,rotation_virtual_start:start,rotation_turn_length_seconds:86400,users:[{user:{id:user,type:'user_reference'}}],restrictions:[]})
 const unscoped={overrides:[{id:'POVR1',start:'2026-03-08T10:00:00Z',end:'2026-03-08T12:00:00Z',user:{id:'pd-alice',type:'user_reference'}}],limit:25,offset:0,more:false,total:null}
 const variants=[
  {name:'active layer replaced later',vendor:'pagerduty',change:s=>{s.schedules=[{id:'pd-replaced',name:'Replaced later',time_zone:'UTC',schedule_layers:[layer('L1','Current rota','2026-01-05T09:00:00Z','2099-01-05T09:00:00Z','pd-alice'),layer('L2','Future rota','2099-01-05T09:00:00Z',null,'pd-bob')]}];s.escalation_policies=[]},refused:{'Replaced later':/layer Current rota is still active until 2099-01-05T09:00:00\.000Z/},samples:[{id:'pagerduty:pd-replaced',at:'2026-10-14T12:00:00Z'}]},
  {name:'restricted schedule with an override',vendor:'opsgenie',change:s=>{s.schedules.data[0].rotations[0].timeRestriction={type:'time-of-day',restriction:{startHour:9,startMin:0,endHour:17,endMin:0}};delete s.timelines},refused:{'Operations daily':/: Daily handoff: time restrictions are unsupported$/,'cover-alice':/Operations daily is refused: Daily handoff: time restrictions are unsupported/},samples:[{id:'opsgenie:ops-daily',at:'2026-03-08T13:30:00Z'}]},
  {name:'override list without schedule_id, one schedule',vendor:'pagerduty',change:s=>{s.schedules=[s.schedules[0]];s.overrides=unscoped;s.escalation_policies=[]},refused:{},samples:[{id:'pagerduty:pd-daily',at:'2026-03-08T11:00:00Z',primary:'alice@example.test'},{id:'pagerduty:pd-daily',at:'2026-03-08T13:00:00Z',primary:'bob@example.test'}]},
  {name:'override list without schedule_id, two schedules',vendor:'pagerduty',change:s=>{s.schedules=[s.schedules[0],{...s.schedules[0],id:'pd-daily-2',name:'PagerDuty daily two'}];s.overrides=unscoped;s.escalation_policies=[]},refused:{POVR1:/names no schedule and the export holds 2 schedules/,'PagerDuty daily':/Override POVR1 names no schedule/,'PagerDuty daily two':/Override POVR1 names no schedule/},samples:[{id:'pagerduty:pd-daily',at:'2026-03-08T11:00:00Z'}]},
  {name:'disabled schedule',vendor:'opsgenie',change:s=>{s.schedules.data[0].enabled=false;delete s.timelines},refused:{'Operations daily':/disabled in Opsgenie/},samples:[{id:'opsgenie:ops-daily',at:'2026-03-09T15:00:00Z'}]},
  {name:'override for a user not in the export',vendor:'opsgenie',change:s=>{s.overrides.data[0].user={type:'user',username:'ghost@example.test'};delete s.timelines},refused:{'cover-alice':/override user ghost@example\.test is not among the exported users/,'Operations daily':/Override cover-alice: override user ghost@example\.test/},samples:[{id:'opsgenie:ops-daily',at:'2026-03-08T13:30:00Z'}]},
 ]
 for(const {name,vendor,change,refused:expected,samples} of variants) {
  const source=variant(vendor,change),preview=ok(await door.preview(vendor,source))
  for(const [item,reason] of Object.entries(expected)){const found=preview.items.find(i=>i.name===item);assert.match(found?.rejection??'',reason,`${name}: ${item}`);assert.equal(found.effects.length,0)}
  assert.equal(ok(await door.apply(vendor,preview)).job.state,'completed')
  for(const point of samples){const covered=await req('/api/move-in/coverage',{vendor,id:point.id,at:point.at});if(point.primary)assert.equal(ok(covered).coverage.primary,point.primary,`${name} ${point.at}`);else assert.equal(covered.status,404,`${name}: the refused schedule was not imported`)}
  assert.equal(ok(await door.undo(vendor,preview.planId)).job.state,'undone')
  assert.equal(w.sql('SELECT COUNT(*) AS n FROM move_in_objects')[0].n,0)
 }
 const twinRows=rowCounts(),twins=ok(await door.preview('opsgenie',variant('opsgenie',s=>s.users.data.push({id:'alice-again',username:'Alice@Example.test',fullName:'Alice Again'}))),400)
 assert.equal(twins.code,'DUPLICATE_TARGET');wroteNothing(twinRows,'a named file refusal retained audit without import rows or bytes');for(const who of ['alice@example.test','Alice Again (Alice@Example.test)'])assert.ok(twins.error.includes(who),'the refusal names both people')
 record('OC-021: active layers, override lists without a schedule id, disabled schedules and unexported override users are matched or refused by name through apply, coverage and undo; case-only duplicate emails are named')
 // Erasure matches the person by exact identity: erasing al@example.test leaves sal@example.test's slot, coverage and the import's undo intact.
 const people=[['u-al-0','al@example.test','Al Erased'],['u-sal-0','sal@example.test','Sal Kept'],['u-kai-0','kai@example.test','Kai Kept']].map(([id,username,fullName])=>({id,username,fullName}))
 const rotas=[['al-rota',['u-al-0','u-kai-0']],['sal-rota',['u-sal-0','u-kai-0']]].map(([id,members])=>({id,name:id,timezone:'UTC',rotations:[{name:id+' turn',startDate:'2026-03-07T10:00:00Z',type:'daily',length:1,participants:members.map(id=>({type:'user',id}))}]}))
 const crew=JSON.stringify({users:{data:people},schedules:{data:rotas}}),crewPreview=ok(await door.preview('opsgenie',crew))
 assert.equal(ok(await door.apply('opsgenie',crewPreview)).job.state,'completed')
 const primary=async(id,at)=>ok(await req('/api/move-in/coverage',{vendor:'opsgenie',id:'opsgenie:'+id,at})).coverage.primary
 const salRow=()=>w.sql("SELECT revision,data FROM move_in_objects WHERE id='opsgenie:sal-rota'"),salBefore=salRow()
 const everything=(includeAuth=true)=>{const columns=Map.groupBy(w.sql("SELECT m.name AS t,p.name AS c FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%' AND m.name NOT LIKE '_cf_%' AND m.name NOT LIKE 'd1_%'"+(!includeAuth?" AND m.name NOT LIKE 'oa_%'":"")),r=>r.t);return JSON.stringify(w.statements([...columns].map(([t,cs])=>`SELECT ${cs.map(({c})=>`CAST("${c}" AS TEXT)`).join(',')} FROM "${t}"`).join(';')))}
 const erasedValues=/(?<![\w.+-])al@example\.test|u-al-0|Al Erased/i
 assert.match(everything(),erasedValues,'the scan sees the person before erasure');assert.equal(await primary('al-rota','2026-03-07T12:00:00Z'),'al@example.test')
 const auditBeforeErasure=await auditExport()
 const receipt=ok(await req('/api/move-in/erase',{email:'al@example.test',confirmation:'erase al@example.test'}));assert.equal(receipt.schedulesRewritten,1)
 const auditAfterErasure=await auditExport(),afterErasureById=new Map(auditAfterErasure.map(row=>[row.id,row])),beforeErasureIds=new Set(auditBeforeErasure.map(row=>row.id))
 for(const row of auditBeforeErasure)assert.deepEqual(afterErasureById.get(row.id),row,'erasure retains every existing audit entry unchanged')
 const erasureAudit=auditAfterErasure.filter(row=>!beforeErasureIds.has(row.id)&&row.outcome==='accepted'&&row.kind!=='audit.export')
 assert.ok(erasureAudit.some(row=>row.subject&&row.subject!=='al@example.test'),'erasure retains an attributable entry with a random subject alias')
 assert.doesNotMatch(JSON.stringify(auditAfterErasure),erasedValues,'audit export retains no erased subject email, vendor identity or name')

 assert.deepEqual(salRow(),salBefore,'the other person\'s schedule is untouched')
 assert.equal(await primary('sal-rota','2026-03-07T12:00:00Z'),'sal@example.test');assert.equal(await primary('al-rota','2026-03-07T12:00:00Z'),null,'the erased slot is an explicit gap');assert.equal(await primary('al-rota','2026-03-08T12:00:00Z'),'kai@example.test')
 assert.doesNotMatch(everything(),erasedValues,'no table keeps a value of the erased person')
 assert.equal(ok(await door.undo('opsgenie',crewPreview.planId)).job.state,'undone')
 assert.deepEqual(w.sql('SELECT kind,id FROM move_in_objects'),[{kind:'schedule',id:'opsgenie:al-rota'}],'undo removed everyone else; only the schedule the erasure rewrote stays applied')
 w.sql("DELETE FROM move_in_objects WHERE id='opsgenie:al-rota'")
 record('OC-041 accepted state and its audit entry commit together, survive subject erasure and export without secrets; OC-022 erasing a person by exact email retained audit history, left a person whose email contains theirs scheduled, covered and undoable, and left no value of theirs behind')
 // A person named in a schedule only through an override record, and in their own notification rules and a direct-user policy, leaves no value in any table or plan; the rest of the import still undoes.
 const delay={condition:'if-not-acked',delay:{timeAmount:5,timeUnit:'minutes'}},mentioned=[
  {vendor:'pagerduty',email:'ed@example.test',erased:/(?<![\w.+-])ed@example\.test|\bPED\b|Ed Erasable/i,ed:'PS-ED',ted:'PS-TED',kai:'kai2@example.test',source:{
   users:[{id:'PED',name:'Ed Erasable',email:'ed@example.test',contact_methods:[{id:'PCM-ED',type:'email_contact_method',address:'ed@example.test'}],notification_rules:[{id:'PNR-ED',type:'assignment_notification_rule',start_delay_in_minutes:0,urgency:'high',contact_method:{id:'PCM-ED',type:'email_contact_method_reference'}}]},{id:'PTED',name:'Ted Kept',email:'ted@example.test'},{id:'PKAI',name:'Kai',email:'kai2@example.test'}],
   schedules:[['PS-ED','Ed rota','LE','PED'],['PS-TED','Ted rota','LT','PTED']].map(([id,name,layer,first])=>({id,name,time_zone:'UTC',schedule_layers:[{id:layer,name:layer,start:'2026-06-01T09:00:00Z',end:null,rotation_virtual_start:'2026-06-01T09:00:00Z',rotation_turn_length_seconds:86400,users:[first,'PKAI'].map(id=>({user:{id,type:'user_reference'}})),restrictions:[]}],final_schedule:{rendered_schedule_entries:[{start:'2026-06-01T09:00:00Z',end:'2026-06-02T09:00:00Z',user:{id:first,type:'user_reference'}}]}})),
   overrides:{overrides:[{id:'PO-ED',start:'2026-06-03T10:00:00Z',end:'2026-06-03T12:00:00Z',user:{id:'PED',type:'user_reference'}}],schedule_id:'PS-TED'},
   escalation_policies:[{id:'PP-TED',name:'Ted escalation',num_loops:0,escalation_rules:[{escalation_delay_in_minutes:5,targets:[{id:'PS-TED',type:'schedule_reference'}]}]},{id:'PP-ED',name:'Direct page',num_loops:0,escalation_rules:[{escalation_delay_in_minutes:5,targets:[{id:'PED',type:'user_reference'}]}]}]}},
  {vendor:'opsgenie',email:'ed@ops.example.test',erased:/(?<![\w.+-])ed@ops\.example\.test|u-ed-ops|Ed Erasable/i,ed:'og-ed',ted:'og-ted',kai:'kai@ops.example.test',source:{
   users:{data:[{id:'u-ed-ops',username:'ed@ops.example.test',fullName:'Ed Erasable',notificationRules:[{name:'Ed urgent SMS',condition:'critical',channel:'sms'}]},{id:'u-ted-ops',username:'ted@ops.example.test',fullName:'Ted Kept'},{id:'u-kai-ops',username:'kai@ops.example.test',fullName:'Kai'}]},
   schedules:{data:[['og-ed','u-ed-ops'],['og-ted','u-ted-ops']].map(([id,first])=>({id,name:id,timezone:'UTC',rotations:[{name:id+' turn',startDate:'2026-06-01T09:00:00Z',type:'daily',length:1,participants:[first,'u-kai-ops'].map(id=>({type:'user',id}))}]}))},
   overrides:{data:[{alias:'cover-ed',startDate:'2026-06-03T10:00:00Z',endDate:'2026-06-03T12:00:00Z',user:{type:'user',id:'u-ed-ops'}}],scheduleId:'og-ted'},
   escalations:{data:[{id:'og-ted-policy',name:'Ted escalation',rules:[{...delay,recipient:{type:'schedule',id:'og-ted'}}]},{id:'og-ed-policy',name:'Direct page',rules:[{...delay,recipient:{type:'user',username:'ed@ops.example.test'}}]}]}}},
 ]
 // The same person named only in free text and in other records' own fields (a schedule description beside a superset address, a contact method saved as its own record), with no override or policy to reach them: the record is tombstoned by what its own source says.
 // Each form of the address beside punctuation sits alone in its own schedule record, so one form the erasure reads cannot tombstone a record whose other form it misses.
 const forms=ed=>[`ask ${ed}!`,`${ed}?`,`**${ed}**`,`key=${ed}`,`a|${ed}|b`,`${ed}/backup`,`https://wiki.example.test/who?email=${ed}&x=1`,`mailto:${ed}?subject=hi`,encodeURIComponent(ed),`https://wiki.example.test/who?email=${encodeURIComponent(ed)}&x=1`,ed.toUpperCase(),`(${ed}).`]
 const text=(vendor,domain,bundle,tight=false,m='')=>{const sed=`sed@${domain}`,ed=`ed@${domain}`,asked=`After hours ask ${ed}, or ${sed}`,kept=tight?`Kept note: ${sed} ${ed}.invalid ${ed}-x x${ed}`:`Kept note: ${sed}`,own=tight?forms(ed):[];return vendor==='pagerduty'
  ?{...bundle,schedules:[bundle.schedules[0],{...bundle.schedules[1],description:asked},{...bundle.schedules[1],id:'PS-SED'+m,name:'Sed rota'+m,description:kept,schedule_layers:bundle.schedules[1].schedule_layers.map(l=>({...l,id:'LS'+m}))},...own.map((description,n)=>({...bundle.schedules[1],id:`PS-V${n}${m}`,name:`Form ${n}${m}`,description,schedule_layers:bundle.schedules[1].schedule_layers.map(l=>({...l,id:`LV${n}${m}`}))}))],contact_methods:[{id:'PCM-ED2'+m,type:'email_contact_method',summary:'Work',label:'Work',address:ed},{id:'PCM-SED'+m,type:'email_contact_method',summary:'Work',label:'Work',address:sed}]}
  :{...bundle,schedules:{data:[bundle.schedules.data[0],{...bundle.schedules.data[1],description:asked},{...bundle.schedules.data[1],id:'og-sed'+m,name:'og-sed'+m,description:kept},...own.map((description,n)=>({...bundle.schedules.data[1],id:`og-v${n}${m}`,name:`og-v${n}${m}`,description}))]},contacts:{data:[{id:'oc-ed'+m,method:'email',to:ed},{id:'oc-sed'+m,method:'email',to:sed}]}}}
 // An erased person's source identity cannot be imported again, so each text-only case is its own set of people and ids.
 const apart=(entry,tag='desc',mark='x')=>{const dom=entry.email.split('@')[1],swap=t=>t.replaceAll('@'+dom,`@${tag}.`+dom).replaceAll('@'+dom.replaceAll('.','\\.'),`@${tag}\\.`+dom.replaceAll('.','\\.')).replace(/PS-TED|PS-ED|PTED|PKAI|PED|PNR-ED|PCM-ED|u-ted-ops|u-ed-ops|u-kai-ops|og-ted|og-ed/g,m=>m+mark)
  return {...entry,email:swap(entry.email),ed:swap(entry.ed),ted:swap(entry.ted),kai:swap(entry.kai),erased:new RegExp(swap(entry.erased.source),'i'),source:JSON.parse(swap(JSON.stringify(entry.source)))}}
 const [pdCase,ogCase]=mentioned.map(entry=>apart(entry)),{overrides:_pdOverrides,escalation_policies:_pdPolicies,...pdBase}=pdCase.source,{overrides:_ogOverrides,escalations:_ogPolicies,...ogBase}=ogCase.source
 const textual=[{...pdCase,source:text('pagerduty','desc.example.test',pdBase),overridden:false,rewritten:1},{...ogCase,source:text('opsgenie','desc.ops.example.test',ogBase),overridden:false,rewritten:1}]
 // The same address beside punctuation and inside URLs and mailto: links, percent-encoded and in other letter case: erased everywhere; a longer address (extra local part or longer domain) stays.
 const lone=(dom,id)=>new RegExp(`(?<![\\w.+-])ed(?:@|%40)${dom.replaceAll('.','\\.')}(?![\\w%+-]|\\.\\w)|${id}|Ed Erasable`,'i')
 const [pdTight,ogTight]=mentioned.map(entry=>apart(entry,'punct','y')),{overrides:_pdO,escalation_policies:_pdE,...pdTightBase}=pdTight.source,{overrides:_ogO,escalations:_ogE,...ogTightBase}=ogTight.source
 const punctuated=[{...pdTight,source:text('pagerduty','punct.example.test',pdTightBase,true,'y'),erased:lone('punct.example.test','\\bPEDy\\b'),overridden:false,rewritten:1,formIds:forms('').map((_,n)=>`PS-V${n}y`),longer:'ed@punct.example.test.invalid'},{...ogTight,source:text('opsgenie','punct.ops.example.test',ogTightBase,true,'y'),erased:lone('punct.ops.example.test','u-ed-opsy'),overridden:false,rewritten:1,formIds:forms('').map((_,n)=>`og-v${n}y`),longer:'ed@punct.ops.example.test.invalid'}]
 for(const {vendor,email,erased,ed,ted,kai,source:bundle,overridden=true,rewritten=2,formIds=[],longer} of [...mentioned,...textual,...punctuated]) {
  const source=JSON.stringify(bundle),review=ok(await door.preview(vendor,source))
  if(overridden)assert.match(review.items.find(i=>i.name==='Direct page').rejection,/direct user/,'a policy paging the person directly stays rejected')
  assert.equal(ok(await door.apply(vendor,review)).job.state,'completed')
  const cover=async(id,at)=>ok(await req('/api/move-in/coverage',{vendor,id:`${vendor}:${id}`,at})).coverage.primary
  const tedMail=`ted@${email.split('@')[1]}`,samples=[[ed,'2026-06-01T12:00:00Z',email,null],[ed,'2026-06-02T12:00:00Z',kai],[ted,'2026-06-01T12:00:00Z',tedMail],[ted,'2026-06-02T12:00:00Z',kai],...overridden?[[ted,'2026-06-03T11:00:00Z',email,null],[ted,'2026-06-03T13:00:00Z',tedMail]]:[]]
  for(const [id,at,want] of samples)assert.equal(await cover(id,at),want,`${vendor} ${id} ${at} before erasure`)
  assert.match(everything(),erased,'the scan sees the person before erasure')
  assert.equal(ok(await req('/api/move-in/erase',{email,confirmation:'erase '+email})).schedulesRewritten,rewritten)
  for(const [id,at,want,after=want] of samples)assert.equal(await cover(id,at),after,`${vendor} ${id} ${at}: the erased override and slot are gaps; everyone else's coverage is unchanged`)
  assert.doesNotMatch(everything(),erased,`${vendor}: no table or retained plan keeps a value of the person named through an override, a notification rule, a policy, a description or another record's own field`)
  if(!overridden)assert.ok(everything().includes('sed@'+email.split('@')[1]),`${vendor}: an address that merely contains theirs stays in the records that name only it`)
  if(longer)for(const kept of [longer,'x'+email,email+'-x'])assert.ok(everything().includes(kept),`${vendor}: ${kept} is a different address and stays`)
  assert.equal(ok(await door.undo(vendor,review.planId)).job.state,'undone')
  assert.deepEqual(w.sql('SELECT kind,id FROM move_in_objects ORDER BY id').map(r=>r.id),[`${vendor}:${ed}`,`${vendor}:${ted}`,...formIds.map(id=>`${vendor}:${id}`)].sort(),'undo removed the other people and policies; only the schedules the erasure rewrote or tombstoned stay applied')
  assert.doesNotMatch(everything(),erased,'undo restores no value of the erased person')
  w.sql('DELETE FROM move_in_objects')
 }
 record('OC-022: a person named only through an override, notification rules, a direct-user policy, a schedule description (beside punctuation, in URLs and mailto: links, percent-encoded or in other letter case) or a contact record (PagerDuty and Opsgenie) left no value in any table or plan; an address containing theirs stayed; coverage for others was unchanged and the rest of the import undid')
 for(const source of ['{bad json}',JSON.stringify({users:[{id:'unsafe',email:'a@example.test',apiKey:'fixture-secret'}]})])ok(await door.preview('opsgenie',source),400)
 const preview=ok(await door.preview('opsgenie',sources.opsgenie))
 assert.equal(ok(await door.apply('opsgenie',preview)).job.state,'completed')
 w.sql("UPDATE move_in_objects SET data=json_set(data,'$.name','Native edit'),revision='native-edit' WHERE kind='user' AND id='alice@example.test'")
 const kept=ok(await door.call('opsgenie','undo',{planId:preview.planId}),409);assert.equal(kept.code,'NATIVE_EDIT_CONFLICT');assert.ok(kept.error.includes('alice@example.test'),'the refusal names the edited person')
 assert.equal(w.sql(`SELECT state FROM ik_jobs WHERE operation_key='door:${preview.planId}'`)[0].state,'completed','a refused undo leaves the import completed')
 assert.equal(w.sql("SELECT json_extract(data,'$.name') AS name FROM move_in_objects WHERE id='alice@example.test'")[0].name,'Native edit')
 const changedSource=JSON.parse(sources.opsgenie);changedSource.users.data[0].fullName='Changed source identity';const changedText=JSON.stringify(changedSource),nativeBefore=w.sql('SELECT * FROM move_in_objects ORDER BY kind,id')
 // A changed file over a live import is its catch-up: the natively edited person is refused by name and nothing replaces them.
 const changedPlan=ok(await door.preview('opsgenie',changedText))
 assert.match(changedPlan.items.find(i=>i.kind==='users'&&i.id===changedSource.users.data[0].id).rejection,/Native edit conflict/)
 assert.equal(ok(await door.apply('opsgenie',changedPlan)).job.state,'completed')
 const pdPlan=ok(await door.preview('pagerduty',sources.pagerduty)),held=ok(await door.call('pagerduty','apply',{planId:pdPlan.planId,reviewedFingerprint:pdPlan.fingerprint}),409)
 assert.equal(held.code,'TARGET_REVISION_CONFLICT');for(const email of ['alice@example.test','bob@example.test'])assert.ok(held.error.includes(email),'the refusal names the people already imported')
 assert.match(held.error,/ already in Oncall from the Opsgenie import [0-9a-f]{8}-[0-9a-f-]{27}\b/,'the refusal names the holding import by its vendor');assert.doesNotMatch(held.error,/door:/,'no internal namespace reaches the owner')
 assert.deepEqual(w.sql('SELECT * FROM move_in_objects ORDER BY kind,id'),nativeBefore,'changed source cannot replace committed native data')
 const revoked=await w.request('/api/login',{name:'Admin',password:'synthetic-local-testing-password'});ok(revoked);ok(await w.request('/api/logout',{},revoked.cookie));ok(await door.call('opsgenie','apply',{planId:preview.planId,reviewedFingerprint:preview.fingerprint},revoked.cookie),401);ok(await w.request('/api/audit/export',undefined,revoked.cookie),401)
 assert.deepEqual(w.sql('SELECT * FROM move_in_objects ORDER BY kind,id'),nativeBefore,'revoked session cannot resume or mutate imported data')
 // A later catch-up that replaced records of the first import: Undo of the first names that import and undoes nothing; newest first undoes.
 const laterSource=JSON.parse(changedText);laterSource.users.data[1].fullName='Renamed later at source'
 const laterPlan=ok(await door.preview('opsgenie',JSON.stringify(laterSource)));assert.equal(ok(await door.apply('opsgenie',laterPlan)).job.state,'completed')
 const laterJob=w.sql(`SELECT id FROM ik_jobs WHERE operation_key='door:${laterPlan.planId}'`)[0].id,layered=w.sql('SELECT * FROM move_in_objects ORDER BY kind,id')
 const superseded=ok(await door.call('opsgenie','undo',{planId:preview.planId}),409);assert.equal(superseded.code,'IMPORT_SUPERSEDED')
 assert.ok(superseded.error.includes(`later Opsgenie import ${laterJob} `),'the refusal names the later import by vendor and journal id');assert.match(superseded.error,/undo that import first in Saved import journal.*nothing was undone/)
 assert.equal(w.sql(`SELECT state FROM ik_jobs WHERE operation_key='door:${preview.planId}'`)[0].state,'completed','the refused undo leaves the first import completed');assert.deepEqual(w.sql('SELECT * FROM move_in_objects ORDER BY kind,id'),layered,'nothing was undone')
 assert.equal(ok(await door.undo('opsgenie',laterPlan.planId)).job.state,'undone','the later import undoes first')
 record('OC-022: malformed/credential-bearing source refused; undo preserved a native edit; undo under a later import named it and undid nothing')
 const checkpoint=ok(await req('/api/recovery/checkpoint')),prior=ok(await req('/api/state'))
 ok(await req('/api/recovery/restore',{mode:'replace',checkpoint:{...checkpoint,coordination:{...checkpoint.coordination,services:[{id:'invalid'}]}}}),400)
 assert.deepEqual(ok(await req('/api/state')),prior)
 const checkpointEdit={schedule:{...changed,name:'Edited after checkpoint'},from:Date.parse('2026-03-08T00:00:00Z'),to:Date.parse('2026-03-09T00:00:00Z')}
 const checkpointReview=ok(await req('/api/schedules/daily/review',checkpointEdit))
 ok(await req('/api/schedules/daily/apply',{...checkpointEdit,digest:checkpointReview.digest,confirmed:true}))
 const replacement=await req('/api/recovery/restore',{mode:'replace',checkpoint});ok(replacement)
 const stateAfter=ok(await w.request('/api/state',undefined,replacement.cookie)),receiving=structuredClone(prior)
 if(receiving.scheduleRecords)receiving.scheduleRecords=receiving.scheduleRecords.map(row=>({...row,active:false,data:row.kind==='subscription'?{...row.data,hash:null}:row.data}))
 receiving.members=receiving.members.map(m=>m.role==='stakeholder'?{...m,active:false}:m)
 for(const i of receiving.incidents){if(i.manualPage)i.manualPage.obligations=i.manualPage.obligations.map(o=>o.state==='recorded'?{...o,state:'stopped',outcome:'Restored inactive; no sender'}:o);if(i.responderRequests)i.responderRequests=i.responderRequests.map(r=>({...r,status:r.status==='pending'?'held':r.status,obligation:r.obligation.state==='recorded'?{...r.obligation,state:'stopped',outcome:'Restored inactive; no sender'}:r.obligation,notice:r.notice?{...r.notice,state:'stopped'}:null}));}
 assert.deepEqual({...stateAfter,revision:prior.revision},receiving,'checkpoint retains complete history while new status identities and active manual records restore inactive')
 const pagingAfter=ok(await w.request('/api/paging/state',undefined,replacement.cookie));assert.deepEqual(pagingAfter.schedules,checkpoint.paging.schedules);assert.deepEqual(pagingAfter.policies,checkpoint.paging.policies)
 ok(await w.request('/api/state',undefined,cookie),401)
 record('OC-016: paired checkpoint invalid rollback and complete replacement preserved both datasets and revoked the old session')
 {
 // OC-016/017 through the emitted Worker and the private handoff CLI. Each assertion names its contract requirement.
 const owner=replacement.cookie,O=(p,i)=>w.request(p,i,owner)
 ok(await O('/api/members',{name:'Rhea',password:'synthetic-local-testing-password',role:'responder'}),201);ok(await O('/api/members',{name:'Vic',password:'synthetic-local-testing-password',role:'viewer'}),201)
 const alice=await w.request('/api/login',{name:'Rhea',password:'synthetic-local-testing-password'}),view=await w.request('/api/login',{name:'Vic',password:'synthetic-local-testing-password'});ok(alice);ok(view)
 const A=(p,i)=>w.request(p,i,alice.cookie),V=(p,i)=>w.request(p,i,view.cookie)
 const outboundBefore=ok(await O('/api/paging/state'))
 assert.deepEqual(await w.outboundRequests(),[], 'normal coordination starts with no attempted outbound request')
 const automationBefore=ok(await O('/api/automation'))
 assert.deepEqual(automationBefore.endpoints,[], 'no approved OC-053 response endpoint exists')
 assert.deepEqual(automationBefore.outbox,[], 'no response event is waiting for external dispatch')
 let incident=ok(await A('/api/command',{type:'declare',service:'checkout',title:'Checkout errors',severity:'critical',summary:'Elevated errors',alerts:[]}))
 let source=ok(await A('/api/handoffs/context/'+incident.id))
 const draft=ok(await A('/api/handoff/'+incident.id))
 assert.equal(draft.intent,'reviewed-handoff-required','the legacy exported draft remains explicitly unreviewed')
 assert.equal(draft.visibility,'internal');assert.equal(draft.lamp.publication,'not-published');assert.deepEqual(draft.providerActions,[])
 const copy={audience:'internal',title:'Checkout update',summary:'Errors are being mitigated',evidenceLinks:[w.origin+'/api/handoffs/context/'+incident.id],impactLinks:[w.origin+'/api/state']}
 const prepare=(id,payload,extra={})=>({id,incident:incident.id,incidentRevision:incident.revision,serviceHash:source.serviceHash,payload,...extra})
 const act=(record,actionId,reason='Exact copy checked')=>({actionId,revision:record.revision,payloadHash:record.payloadHash,sourceHash:record.sourceHash,reason})
 const {audience,...unaddressed}=copy
 ok(await A('/api/handoffs/prepare',prepare('no-audience',unaddressed)),400) // explicit intended audience
 ok(await V('/api/handoffs/prepare',prepare('viewer-copy',copy)),403) // only responders/admins prepare
 const prepared=ok(await A('/api/handoffs/prepare',prepare('h1',copy)),201),h1=prepared.record
 assert.equal(h1.status,'prepared');assert.equal(prepared.eligibility.eligible,false)
 ok(await A('/api/handoffs/h1/export'),409) // preparing copy never supplies the review required by the separate export door
 assert.deepEqual(await w.outboundRequests(),[], 'coordination, draft export, preparation and refused unreviewed export attempt no AI or other outbound request')
 assert.equal(ok(await A('/api/handoffs/prepare',prepare('h1',copy))).record.revision,h1.revision,'repeated identical preparation returns the original record')
 ok(await A('/api/handoffs/prepare',prepare('h1',{...copy,title:'Changed copy'})),409) // preparation identity conflicts on changed content
 assert.equal(ok(await V('/api/handoffs/h1')).record.payloadHash,h1.payloadHash,'viewers inspect internal records')
 ok(await A('/api/handoffs/h1/review',{...act(h1,'r1'),payloadHash:'0'.repeat(64)}),409) // a review binds the exact copy
 ok(await V('/api/handoffs/h1/review',act(h1,'r1')),403) // viewers never review
 ok(await V('/api/handoffs/h1/withdraw',act(h1,'viewer-withdraw','Viewer attempt')),403) // or withdraw
 const reviewed=ok(await A('/api/handoffs/h1/review',act(h1,'r1'))).record
 ok(await A('/api/handoffs/h1/review',act(h1,'r1','Changed reason')),409) // review identity conflicts on changed content
 assert.equal(reviewed.history.at(-1).selfReview,true,'an author review is recorded as self-review, never independent review')
 const packet=ok(await A('/api/handoffs/h1/export'));assert.ok(packet.transport==='unsent'&&packet.providerActions.length===0,'an eligible review exports unsent copy with no provider action')
 assert.deepEqual(packet.record,reviewed,'HTTP export preserves the exact reviewed payload, source snapshots, hashes, revision and attributed history')
 assert.equal(packet.publication,'not-published');assert.equal(packet.review.status,'reviewed')
 assert.deepEqual(ok(await A('/api/handoff/'+incident.id)),draft,'reviewing separate authored copy never promotes the legacy exported draft from review required')
 const sourceReadState=ok(await O('/api/state')),sourceReadHandoffs=ok(await O('/api/handoffs/archive'))
 for(const reference of [...packet.lamp.draft.evidenceLinks,...packet.lamp.draft.impactLinks]){
  const link=new URL(reference);assert.equal(link.origin,w.origin)
  const path=link.pathname+link.search,permitted=ok(await A(path))
  if(permitted.source)assert.equal(permitted.source.incident.id,incident.id)
  else assert.ok(permitted.incidents.some(row=>row.id===incident.id))
  assert.deepEqual(Object.keys(ok(await w.request(path),401)),['error'],'the exported source link grants anonymous callers no private access')
 }
 assert.deepEqual(ok(await O('/api/state')),sourceReadState,'anonymous source reads change no coordination records')
 assert.deepEqual(ok(await O('/api/handoffs/archive')),sourceReadHandoffs,'anonymous source reads change no handoff records or review history')
 assert.deepEqual(ok(await O('/api/paging/state')),{...outboundBefore,workspaceRevision:sourceReadState.revision},'coordination advances its workspace revision but creates no paging job, receipt or paging revision')
 assert.deepEqual(ok(await O('/api/automation')),automationBefore,'coordination and handoff work create no outbound response action')
 assert.deepEqual(await w.outboundRequests(),[], 'the emitted Worker network edge refuses and records all outbound attempts; handoff preparation, review and export attempted none')
 record('PROBE OC-006 1: emitted Worker coordination, legacy draft export, preparation, refused unreviewed export and reviewed export without an approved endpoint -> empty outbound ledger, unchanged paging state, no provider action or Lamp publication')
 record('PROBE OC-006 2: exported legacy review-required draft and reviewed copy source links -> draft still unreviewed, prepared export refused, authorized sources populated, anonymous source reads 401 with error only')
 incident=ok(await A('/api/command',{type:'note',incident:incident.id,revision:incident.revision,text:'Source drift'}))
 ok(await A('/api/handoffs/h1/export'),409) // source drift makes the review ineligible
 const withdrawn=ok(await A('/api/handoffs/h1/withdraw',act(reviewed,'w1','Superseded by current copy'))).record
 ok(await A('/api/handoffs/h1/review',act(withdrawn,'r1-again')),409) // withdrawal is terminal
 assert.deepEqual(withdrawn.history.slice(0,reviewed.history.length),reviewed.history,'withdrawal appends to attributed history')
 source=ok(await A('/api/handoffs/context/'+incident.id))
 const h2=ok(await A('/api/handoffs/prepare',prepare('h2',copy,{supersedes:'h1'})),201).record;ok(await A('/api/handoffs/h2/review',act(h2,'r2')))
 const cp=ok(await O('/api/recovery/checkpoint')),stateNow=ok(await O('/api/state')),pagingNow=ok(await O('/api/paging/state')),handoffsNow=ok(await O('/api/handoffs'))
 assert.deepEqual([cp.workspaceRevision,cp.pagingRevision,cp.handoffRevision,cp.coordination],[stateNow.revision,pagingNow.revision,handoffsNow.revision,stateNow],'one consistent snapshot carries all three revisions')
 const text=JSON.stringify(cp);assert.ok(![owner,alice.cookie].some(c=>text.includes(c.split('=')[1]))&&w.sql('SELECT salt,digest FROM credentials').every(r=>!text.includes(r.salt)&&!text.includes(r.digest)),'checkpoints exclude authentication')
 const complete=async()=>[ok(await O('/api/state')),ok(await O('/api/paging/state')),ok(await O('/api/handoffs'))]
 const prior=await complete(),at=Date.parse('2026-10-11T09:00:00Z')
 const job={id:'held-pending',incident:incident.id,service:'checkout',revision:1,status:'pending',nextDue:at,createdAt:at,lastEvaluatedAt:at,currentStep:0,policy:cp.paging.policies[0],schedule:cp.paging.schedules[0],behaviors:{primary:'accepted',backup:'accepted'},steps:[],history:[{type:'created',at,actor:null,reason:null,attempt:null}]}
 const withJobs=(jobs,paging={})=>({...cp,paging:{...cp.paging,...paging,jobs}})
 ok(await A('/api/recovery/restore',{mode:'replace',checkpoint:withJobs([job])}),403) // only a current admin restores
 ok(await O('/api/recovery/restore',{mode:'replace',checkpoint:withJobs([{...job,incident:'missing-incident'}])}),400) // a pending job with a missing reference is invalid
 assert.deepEqual(await complete(),prior,'refused pending reference preserves the complete state')
 const hour=3600000,base=Date.parse(cp.paging.schedules[0].validFrom),overrides=Array.from({length:1000},(_,i)=>({id:'capacity-'+i,role:'primary',start:new Date(base+2*i*hour).toISOString(),end:new Date(base+(2*i+1)*hour).toISOString(),member:null}))
 ok(await O('/api/recovery/restore',{mode:'replace',checkpoint:withJobs([],{schedules:[...cp.paging.schedules,...Array.from({length:40},(_,i)=>({...cp.paging.schedules[0],id:'capacity-'+i,overrides}))]})}),429) // a valid checkpoint over the storage profile refuses
 assert.deepEqual(await complete(),prior,'capacity refusal preserves the complete state')
 ok(await O('/api/recovery/restore',{mode:'replace',checkpoint:{...cp,coordination:{...cp.coordination,members:cp.coordination.members.map(m=>m.role==='admin'?{...m,active:false}:m)}}}),400) // the current-password mapping rule refuses a populated target
 assert.deepEqual(await complete(),prior,'mapping refusal preserves the complete state')
 w.sql("CREATE TRIGGER injected_restore_failure BEFORE INSERT ON paging_jobs BEGIN SELECT RAISE(ABORT,'INJECTED_STORAGE_FAILURE'); END")
 ok(await O('/api/recovery/restore',{mode:'replace',checkpoint:withJobs([job])}),503) // storage failure
 assert.deepEqual(await complete(),prior,'storage failure preserves the complete state and the current session')
 w.sql('DROP TRIGGER injected_restore_failure')
 const race=await Promise.all([0,1].map(()=>O('/api/recovery/restore',{mode:'replace',checkpoint:withJobs([job])})))
 const winner=race.find(r=>r.status===200),loser=race.find(r=>r!==winner)
 assert.ok(winner&&[401,409].includes(loser.status),JSON.stringify(race.map(r=>r.status))) // exactly one concurrent restore wins
 const W=(p,i)=>w.request(p,i,winner.cookie),[restored,restoredPaging]=[ok(await W('/api/state')),ok(await W('/api/paging/state'))]
 assert.deepEqual({...restored,revision:cp.coordination.revision},{...cp.coordination,...(cp.coordination.scheduleRecords?{scheduleRecords:cp.coordination.scheduleRecords.map(row=>({...row,active:false,data:row.kind==='subscription'?{...row.data,hash:null}:row.data}))}:{})},'the losing restore cannot revoke the winner or leave a partial state')
 ok(await A('/api/state'),401) // prior sessions are revoked
 assert.equal(restoredPaging.jobs.find(j=>j.id==='held-pending').status,'paused','restore pauses imported pending jobs')
 const held=ok(await W('/api/handoffs/h2'));assert.ok(held.record.held&&!held.eligibility.eligible,'restore holds active approvals')
 ok(await W('/api/handoffs/h2/export'),409) // a recovery hold makes the review ineligible
 assert.deepEqual(ok(await W('/api/handoffs/h1')).record,cp.handoffs.records.find(r=>r.id==='h1'),'restore retains historical identities and attributed history')
 const orphan=ok(await W('/api/recovery/checkpoint'));orphan.paging.jobs=orphan.paging.jobs.map(j=>({...j,incident:'missing-incident'}))
 const kept=await W('/api/recovery/restore',{mode:'replace',checkpoint:orphan});ok(kept)
 const K=(p,i)=>w.request(p,i,kept.cookie)
 assert.equal(ok(await K('/api/paging/state')).jobs.find(j=>j.id==='held-pending').incident,'missing-incident','paused history with a missing reference is retained as evidence')
 ok(await K('/api/paging/jobs/held-pending/resume',{}),409) // and never grants dispatch
 const v1=ok(await K('/api/recovery/checkpoint?version=1'));assert.equal(v1.handoffs,undefined)
 const fromV1=await K('/api/recovery/restore',{mode:'replace',checkpoint:v1});ok(fromV1) // version 1 remains supported
 const L=(p,i)=>w.request(p,i,fromV1.cookie);assert.equal(ok(await L('/api/handoffs/h2')).record.id,'h2','version 1 restore retains handoff history')
 const archive=ok(await L('/api/handoffs/archive'))
 ok(await L('/api/members',{name:'Rex',password:'synthetic-local-testing-password',role:'responder'}),201);ok(await w.request('/api/handoffs/restore',{mode:'replace',archive},(await w.request('/api/login',{name:'Rex',password:'synthetic-local-testing-password'})).cookie),403) // only admins restore handoff archives
 ok(await L('/api/handoffs/restore',{mode:'replace',archive:{...archive,records:Array.from({length:65},(_,i)=>({...archive.records[0],id:'cap-'+i}))}}),400) // handoff capacity refuses
 assert.deepEqual(ok(await L('/api/handoffs/archive')),archive,'handoff refusal preserves the prior archive')
 let h3=ok(await L('/api/handoffs/prepare',{id:'h3',incident:incident.id,incidentRevision:incident.revision,serviceHash:ok(await L('/api/handoffs/context/'+incident.id)).serviceHash,payload:copy}),201).record
 while(h3.history.length<127)h3=ok(await L('/api/handoffs/h3/review',act(h3,'bulk-'+h3.history.length))).record
 const full=ok(await L('/api/handoffs/archive'));ok(await L('/api/handoffs/h3/review',act(h3,'bulk-over')),429) // 128 history entries per record, one kept for a recovery hold
 assert.deepEqual(ok(await L('/api/handoffs/archive')),full,'history capacity refusal preserves the archive')
 let h4=ok(await L('/api/handoffs/prepare',{id:'h4',incident:incident.id,incidentRevision:incident.revision,serviceHash:ok(await L('/api/handoffs/context/'+incident.id)).serviceHash,payload:copy}),201).record,sized
 while(!sized){const r=await L('/api/handoffs/h4/review',act(h4,'size-'+h4.history.length,'r'.repeat(1000)));if(r.status===429)sized=r;else h4=ok(r).record}
 assert.ok(h4.history.length<127,'the 128 KiB record bound refuses before the history bound') // 128 KiB per record
 const big=ok(await L('/api/recovery/checkpoint')),r4=big.handoffs.records.find(r=>r.id==='h4'),size=JSON.stringify(r4).length
 const clones=Array.from({length:Math.floor(1024*1024/size)+1},(_,i)=>({...r4,id:'agg-'+i,history:r4.history.map((h,n)=>({...h,actionId:n?'agg-'+i+'-'+h.actionId:'prepare:agg-'+i}))}))
 assert.ok(clones.length<=64&&size<=128*1024,'every record is inside its own count and size bounds')
 const bigPrior=await (async()=>[ok(await L('/api/state')),ok(await L('/api/paging/state')),ok(await L('/api/handoffs'))])()
 ok(await L('/api/recovery/restore',{mode:'replace',checkpoint:{...big,handoffs:{...big.handoffs,records:clones}}}),429) // 1 MiB aggregate
 assert.deepEqual([ok(await L('/api/state')),ok(await L('/api/paging/state')),ok(await L('/api/handoffs'))],bigPrior,'aggregate refusal preserves the complete state')
 const own=await L('/api/recovery/restore',{mode:'replace',checkpoint:ok(await L('/api/recovery/checkpoint'))});ok(own) // reviewed records at either bound still restore and gain their holds
 own.cookie=await checkpointCli(w,own.cookie)
 const sessionFile='.rer/local/handoff-session',cli=args=>spawnSync(process.execPath,['scripts/handoffs.mjs','--origin',w.origin,'--session-file',sessionFile,...args],{encoding:'utf8'})
 await mkdir('.rer/local',{recursive:true,mode:0o700});await writeFile(sessionFile,own.cookie,{mode:0o600})
 assert.equal(cli(['archive','.rer/local/handoffs.json']).status,0);{const r=cli(['restore','.rer/local/handoffs.json','--replace']);assert.equal(r.status,0,r.stderr)} // the private CLI exports and restores the archive
 assert.ok(JSON.parse(cli(['inspect','h1']).stdout).result.record.status==='withdrawn','the CLI inspects retained history')
 const fresh=await localWorker()
 try { // the current password maps to an archived administrator only in an empty target
  const setup=await fresh.request('/api/setup',{name:'Fresh',password:'synthetic-fresh-testing-password'});ok(setup)
  const moved=ok(await w.request('/api/recovery/checkpoint',undefined,own.cookie)),archived=moved.coordination.members.find(m=>m.active&&m.role==='admin')
  ok(await fresh.request('/api/recovery/restore',{mode:'replace',checkpoint:moved},setup.cookie),400) // mapping is explicit
  const mapped=await fresh.request('/api/recovery/restore',{mode:'replace',checkpoint:moved,adminMapping:archived.id},setup.cookie);ok(mapped)
  assert.deepEqual({...ok(await fresh.request('/api/state',undefined,mapped.cookie)),revision:moved.coordination.revision},{...moved.coordination,...(moved.coordination.scheduleRecords?{scheduleRecords:moved.coordination.scheduleRecords.map(row=>({...row,active:false,data:row.kind==='subscription'?{...row.data,hash:null}:row.data}))}:{})},'the mapped restore replaces the empty target')
  ok(await fresh.request('/api/state',undefined,setup.cookie),401)
  assert.equal(ok(await fresh.request('/api/login',{name:archived.name,password:'synthetic-fresh-testing-password'})).member.id,archived.id,'the current password signs in as the mapped administrator')
 } finally { await fresh.close() }
 record('OC-016/017: checkpoint consistency, auth exclusion, atomic refusal under invalid/capacity/storage/concurrent writes, winner session, paused jobs and orphans, version 1, empty-target mapping, the 1 MiB aggregate, review identity/eligibility/hold/withdrawal and the private CLI passed')
 }
 const last=await w.request('/api/login',{name:'Admin',password:'synthetic-local-testing-password'});ok(last)
 await pagingHistory(w,last.cookie)
 record('OC-013 and OC-015: restored historical acknowledgement and cancellation append attribution without recovery; populated module archive refuses anonymous, viewer and responder access without disclosure or product writes; strict references, retained callbacks and SQL rollback passed')
 { // OC-040 change-event erasure: public admin door, atomic counts and restore fences.
 let erasureCookie=last.cookie;
 const erasureReq=(path,input)=>w.request(path,input,erasureCookie);
 const erasureActor=ok(await erasureReq('/api/session')).member;
 const erasureService=ok(await erasureReq('/api/state')).services[0].id;
 const erasureKey='synthetic-oncall-'+crypto.randomUUID()+crypto.randomUUID();
 ok(await erasureReq('/api/changes/sources',{id:'synthetic-oncall-40',name:'Synthetic change erasure',provider:'native',service:erasureService,repository:'',mode:'bearer',revision:0,key:erasureKey}),201);
 const erasureSignal={eventId:'synthetic-oncall-40',summary:'synthetic-oncall-40 private context',author:'synthetic-oncall-40@example.test',timestamp:new Date().toISOString()};
 const submitChange=()=>w.request('/api/changes/ingress/synthetic-oncall-40',erasureSignal,undefined,{authorization:'Bearer '+erasureKey});
 const change=ok(await submitChange(),201),path='/api/changes/'+change.id+'/erase';
 let input={workspaceRevision:ok(await erasureReq('/api/state')).revision,confirmation:'erase '+change.id};
 const old=ok(await erasureReq('/api/archive'));
 ok(await w.request(path,input),401);
 const erasureViewer=ok(await erasureReq('/api/members',{name:'synthetic-oncall-40-viewer',role:'viewer',password:'synthetic-oncall-40-password'}),201);
 const viewerLogin=await erasureReq('/api/login',{name:erasureViewer.name,password:'synthetic-oncall-40-password'});ok(viewerLogin);
 ok(await w.request(path,input,viewerLogin.cookie),403);
 input.workspaceRevision=ok(await erasureReq('/api/state')).revision;
 ok(await erasureReq(path,{...input,confirmation:'erase another'}),409);
 ok(await erasureReq(path,{...input,workspaceRevision:input.workspaceRevision-1}),409);
 const beforeErasureCheckpoint=ok(await erasureReq('/api/recovery/checkpoint'));
 const before=ok(await erasureReq('/api/state')),journal=w.sql('SELECT * FROM rer_portability_journal'),auditBefore=ok(await erasureReq('/api/audit/export')).rows;
 // A retained copy from an interrupted installation export contains the real
 // admitted row. The public erasure must invalidate it in the same transaction.
 const erasureCopy='rer_portability_snap_synthetic_oncall_40';
 w.sql('CREATE TABLE '+erasureCopy+' AS SELECT * FROM oc_changes');
 w.sql("CREATE TRIGGER synthetic_oncall_40_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='change.erase' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-40'); END");
 try{ok(await erasureReq(path,input),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_40_audit')}
 assert.deepEqual(ok(await erasureReq('/api/state')),before,'failed erasure cannot remove content or advance the fence');
 assert.deepEqual(w.sql('SELECT * FROM rer_portability_journal'),journal,'failed erasure cannot issue a journal');
 assert.equal(w.sql('SELECT COUNT(*) AS n FROM '+erasureCopy)[0].n,1,'final audit failure rolls back transfer-copy deletion too');
 let erased;
 erasureCookie=await checkpointErasureCli(w,erasureCookie,async()=>{erased=ok(await erasureReq(path,input));assert.equal(erased.state,'complete');assert.deepEqual(erased.stores.oc_changes,{deleted:1,updated:0});assert.deepEqual(erased.stores.oc_change_sources,{deleted:0,updated:1});assert.equal(erased.standby,'not-reconciled');assert.deepEqual(erased.stores[erasureCopy],{deleted:1,updated:0})});
 assert.equal(w.sql("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='"+erasureCopy+"'")[0].n,0,'the committed erasure drops the retained transfer copy');
 const after=ok(await erasureReq('/api/state'));
 assert.ok(!(after.changes??[]).some(row=>row.id===change.id));assert.ok(!after.changeSources.find(row=>row.id==='synthetic-oncall-40').lastAccepted);
 assert.ok(!JSON.stringify(after).includes(erasureSignal.summary));assert.ok(!JSON.stringify(after).includes(erasureSignal.author));
 ok(await erasureReq('/api/restore',{archive:old,mode:'replace'}),409);
 ok(await erasureReq('/api/restore',{archive:{...old,erasureFences:after.erasureFences},mode:'replace'}),409);
 ok(await erasureReq('/api/recovery/restore',{mode:'replace',checkpoint:{...beforeErasureCheckpoint,coordination:{...beforeErasureCheckpoint.coordination,erasureFences:after.erasureFences}}}),409);
 assert.deepEqual(ok(await erasureReq('/api/state')),after,'old rows paired with current fence metadata cannot publish or rotate the session');
 const auditAfter=new Map(ok(await erasureReq('/api/audit/export')).rows.map(row=>[row.id,row]));for(const row of auditBefore)assert.deepEqual(auditAfter.get(row.id),row);
 assert.ok(!JSON.stringify([...auditAfter.values()]).includes(erasureSignal.author));
 ok(await erasureReq(path,{...input,workspaceRevision:after.revision}),404);
 // Current checkpoints restore sources inactive. Renew only the local credential;
 // the same source event still cannot cross the carried erasure fence.
 const restoredSource=after.changeSources.find(row=>row.id==='synthetic-oncall-40');
 ok(await erasureReq('/api/changes/sources',{...restoredSource,key:erasureKey}),200);
 ok(await submitChange(),410);
 await w.stop();await w.start();ok(await submitChange(),410);
 assert.ok(!(ok(await erasureReq('/api/state')).changes??[]).some(row=>row.id===change.id));
 // OC-040 incident erasure uses the same committed receipt and custody fence.
 const incidentViewer=ok(await erasureReq('/api/members',{name:'synthetic-oncall-406',role:'viewer',password:'synthetic-oncall-406-password'}),201),incidentViewerLogin=await erasureReq('/api/login',{name:incidentViewer.name,password:'synthetic-oncall-406-password'});ok(incidentViewerLogin);
 ok(await erasureReq('/api/command',{type:'service',id:'synthetic-oncall-411',name:'Synthetic erasure dependencies',environment:'test',owner:erasureActor.id,runbook:['Synthetic recovery guide'],pager:''}));
 ok(await erasureReq('/api/status',{action:'create',name:'Synthetic erasure impact',owningTeam:'synthetic-oncall-411',supporting:['synthetic-oncall-411'],communicationsOwner:erasureActor.id,audience:[],highUrgencyImpact:false}));
 const makeIncident=()=>erasureReq('/api/command',{type:'declare',service:'synthetic-oncall-411',title:'synthetic-oncall-401 private incident',summary:'synthetic-oncall-401 private impact',severity:'warning'});
 let subject=ok(await makeIncident());
 subject=ok(await erasureReq('/api/command',{type:'note',incident:subject.id,revision:subject.revision,text:'synthetic-oncall-401 private note'}));
 subject=ok(await erasureReq('/api/command',{type:'action',incident:subject.id,revision:subject.revision,title:'synthetic-oncall-401 private follow-up',owner:erasureActor.id,due:'2026-12-01'}));
 const incidentContext=ok(await erasureReq('/api/handoffs/context/'+subject.id));
 ok(await erasureReq('/api/handoffs/prepare',{id:'synthetic-oncall-401-handoff',incident:subject.id,incidentRevision:subject.revision,serviceHash:incidentContext.serviceHash,payload:{audience:'internal',title:'Synthetic erasable handoff',summary:'synthetic-oncall-401 private handoff',evidenceLinks:[],impactLinks:[]}}),201);
 const incidentHandoffs=ok(await erasureReq('/api/handoffs/archive'));
 const incidentCheckpoint=ok(await erasureReq('/api/recovery/checkpoint'));
 const incidentArchive=ok(await erasureReq('/api/archive')),incidentPath='/api/erasure/incident/'+subject.id;
 let incidentInput={workspaceRevision:incidentArchive.revision,confirmation:'erase '+subject.id};
 ok(await w.request(incidentPath,incidentInput),401);ok(await w.request(incidentPath,incidentInput,incidentViewerLogin.cookie),403);
 ok(await erasureReq(incidentPath,{...incidentInput,confirmation:'wrong'}),409);
 w.sql("CREATE TRIGGER synthetic_oncall_401_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='incident.erase' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-401'); END");
 const incidentBefore=ok(await erasureReq('/api/state'));
 const incidentCopy='rer_portability_snap_synthetic_oncall_401';w.sql("CREATE TABLE "+incidentCopy+" AS SELECT * FROM oc_incidents WHERE id='"+subject.id+"'");
 try{ok(await erasureReq(incidentPath,incidentInput),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_401_audit')}
 assert.deepEqual(ok(await erasureReq('/api/state')),incidentBefore);
 assert.equal(w.sql('SELECT COUNT(*) AS n FROM '+incidentCopy)[0].n,1);
 w.sql("CREATE TRIGGER synthetic_oncall_401_table BEFORE DELETE ON oc_incidents WHEN OLD.id='"+subject.id+"' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-401 table'); END");
 try{ok(await erasureReq(incidentPath,incidentInput),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_401_table')}
 assert.deepEqual(ok(await erasureReq('/api/state')),incidentBefore);
 const incidentReceipt=ok(await erasureReq(incidentPath,incidentInput));assert.equal(incidentReceipt.state,'complete');assert.equal(incidentReceipt.stores.oc_incidents.deleted,1);assert.equal(incidentReceipt.stores[incidentCopy].deleted,1);assert.equal(incidentReceipt.standby,'not-reconciled');assert.equal(incidentReceipt.stores.handoff_state.updated,1);assert.equal(incidentReceipt.stores.oc_business_services.updated,1,'receipt includes recomputed dependent status custody');assert.ok(!JSON.stringify(w.sql('SELECT data FROM handoff_state')).includes('synthetic-oncall-401 private'));
 const incidentAfter=ok(await erasureReq('/api/state'));
 ok(await erasureReq('/api/handoffs/restore',{archive:incidentHandoffs,mode:'replace'}),409);
 const laterIncidentCheckpoint=ok(await erasureReq('/api/recovery/checkpoint'));
 ok(await erasureReq('/api/recovery/restore',{mode:'replace',checkpoint:{...laterIncidentCheckpoint,handoffs:incidentCheckpoint.handoffs}}),409);assert.ok(!JSON.stringify(incidentAfter).includes('synthetic-oncall-401 private'));
 for(const archive of [incidentArchive,{...incidentArchive,erasureFences:incidentAfter.erasureFences}])ok(await erasureReq('/api/restore',{archive,mode:'replace'}),409);
 // A surviving incident remains valid after its merged source is erased.
 const mergeSource=ok(await makeIncident()),mergeTarget=ok(await makeIncident());
 ok(await erasureReq('/api/command',{type:'merge-incidents',incident:mergeTarget.id,revision:mergeTarget.revision,sources:[{id:mergeSource.id,revision:mergeSource.revision}],reason:'synthetic-oncall-402 related incident'}));
 ok(await erasureReq('/api/erasure/incident/'+mergeSource.id,{workspaceRevision:ok(await erasureReq('/api/state')).revision,confirmation:'erase '+mergeSource.id}));
 const validAfterMerge=ok(await erasureReq('/api/archive'));assert.ok(!validAfterMerge.incidents.find(i=>i.id===mergeTarget.id).mergedSources);
 const currentCheckpoint=ok(await erasureReq('/api/recovery/checkpoint')),currentRestore=await erasureReq('/api/recovery/restore',{mode:'replace',checkpoint:currentCheckpoint});ok(currentRestore);erasureCookie=currentRestore.cookie;
 const routedId='synthetic-oncall-404',routedKey='synthetic-oncall-'+crypto.randomUUID()+crypto.randomUUID();
 ok(await erasureReq('/api/routing/keys',{id:routedId,name:'Synthetic erasable routed integration',provider:'native',scope:[erasureService],owner:erasureActor.id,key:routedKey,revision:0,rules:[],catchAll:erasureService}),201);
 const routedService=ok(await erasureReq('/api/state')).services.find(s=>s.id===erasureService);
 const routedSignal={source:'intake:'+routedId,eventId:routedId,service:erasureService,environment:routedService.environment,key:routedId,generation:routedId,intent:'trigger',severity:'warning',title:'Synthetic erased routing evidence',observedAt:new Date().toISOString(),evidence:''};
 ok(await w.request('/api/ingress/intake:'+routedId,routedSignal,undefined,{authorization:'Bearer '+routedKey}),201);
 const splitAlert=ok(await erasureReq('/api/state')).alerts.find(a=>a.source==='intake:'+routedId);
 let splitParent=ok(await erasureReq('/api/command',{type:'declare',service:erasureService,title:'Synthetic split parent',summary:'Synthetic independent work',severity:'warning',alerts:[splitAlert.id]}));
 splitParent=ok(await erasureReq('/api/command',{type:'transition',incident:splitParent.id,revision:splitParent.revision,state:'acknowledged',summary:'Synthetic acknowledged split ownership'}));
 const splitChild=ok(await erasureReq('/api/command',{type:'split-incident',incident:splitParent.id,revision:splitParent.revision,alerts:[splitAlert.id],title:'Synthetic split child',summary:'Synthetic retained impact',reason:'Synthetic independent cause'}));
 const unrelatedSource=ok(await makeIncident()),unrelatedTarget=ok(await makeIncident());
 const unrelatedMerge=ok(await erasureReq('/api/command',{type:'merge-incidents',incident:unrelatedTarget.id,revision:unrelatedTarget.revision,sources:[{id:unrelatedSource.id,revision:unrelatedSource.revision}],reason:'Unrelated relation mentions '+splitParent.id}));
 ok(await erasureReq('/api/erasure/incident/'+splitParent.id,{workspaceRevision:ok(await erasureReq('/api/state')).revision,confirmation:'erase '+splitParent.id}));
 const splitArchive=ok(await erasureReq('/api/archive')),survivor=splitArchive.incidents.find(i=>i.id===splitChild.id);
 assert.equal(survivor.state,splitChild.state);assert.ok(!survivor.splitFrom);assert.equal(survivor.timeline[0].kind,'split');assert.ok(survivor.timeline[0].text.includes('Synthetic retained impact'));
 assert.deepEqual(splitArchive.incidents.find(i=>i.id===unrelatedTarget.id),unrelatedMerge,'an incidental UUID in another relation reason does not erase its provenance');
 const keptSource='synthetic-oncall-419',keptSourceKey='synthetic-oncall-'+crypto.randomUUID()+crypto.randomUUID();ok(await erasureReq('/api/sources',{id:keptSource,key:keptSourceKey,scopes:[erasureService]}));
 ok(await w.request('/api/ingress/'+keptSource,{...routedSignal,source:keptSource,eventId:keptSource,key:keptSource,generation:keptSource,title:'Synthetic independent source'},undefined,{authorization:'Bearer '+keptSourceKey}),201);
 ok(await w.request('/api/ingress/intake:'+routedId,{...routedSignal,eventId:routedId+'-partial',key:routedId+'-partial',generation:routedId+'-partial'},undefined,{authorization:'Bearer '+routedKey}),201);
 const partialState=ok(await erasureReq('/api/state')),keptAlert=partialState.alerts.find(a=>a.source===keptSource),partialAlert=partialState.alerts.find(a=>a.key===routedId+'-partial');
 const partialParent=ok(await erasureReq('/api/command',{type:'declare',service:erasureService,title:'Synthetic mixed-source split',summary:'Synthetic separate evidence',severity:'warning',alerts:[partialAlert.id,keptAlert.id]}));
 const partialChild=ok(await erasureReq('/api/command',{type:'split-incident',incident:partialParent.id,revision:partialParent.revision,alerts:[partialAlert.id,keptAlert.id],title:'Synthetic mixed-source child',summary:'Synthetic surviving impact',reason:'Synthetic retained independent evidence'}));
 const routedArchive=ok(await erasureReq('/api/archive'));
 const routedReceipt=ok(await erasureReq('/api/erasure/intake/'+routedId,{workspaceRevision:routedArchive.revision,confirmation:'erase '+routedId}));
 assert.equal(routedReceipt.stores.oc_intake_credentials.deleted,1);assert.equal(routedReceipt.stores.oc_intake_sources.deleted,1);
 ok(await erasureReq('/api/routing/keys',{id:routedId,name:'Synthetic erased ID reuse',provider:'native',scope:[erasureService],owner:erasureActor.id,key:routedKey,revision:0,rules:[],catchAll:erasureService}),410);assert.equal(routedReceipt.stores.oc_events.deleted,2);
 ok(await w.request('/api/ingress/intake:'+routedId,routedSignal,undefined,{authorization:'Bearer '+routedKey}),401);
 const routedAfter=ok(await erasureReq('/api/state'));const partialAfter=routedAfter.incidents.find(i=>i.id===partialChild.id);assert.deepEqual(partialAfter.alerts,[keptAlert.id]);assert.ok(!partialAfter.splitFrom);assert.equal(partialAfter.timeline[0].kind,'split');assert.ok(partialAfter.timeline[0].text.includes('Synthetic surviving impact'));assert.ok(routedAfter.events.some(e=>e.source===keptSource));assert.ok(!JSON.stringify(routedAfter).includes('Synthetic erased routing evidence'));assert.ok(!JSON.stringify(routedAfter).includes(routedId),'integration IDs also leave generated operational audit copies');
 ok(await erasureReq('/api/restore',{mode:'replace',archive:{...routedArchive,erasureFences:routedAfter.erasureFences}}),409);
 // Imported integration originals are owned custody too, not an exemption.
 const importedId='synthetic-oncall-409',importedDoor=ownerDoor(w,erasureCookie);
 const importedPlan=ok(await importedDoor.preview('pagerduty',JSON.stringify({integrations:[{id:importedId,type:'events_api_v2_inbound_integration'}]})));ok(await importedDoor.apply('pagerduty',importedPlan));
 const importedRoot=ok(await erasureReq('/api/move-in/objects')).find(row=>row.targetKind==='integration'&&row.targetId==='pagerduty:'+importedId);assert.ok(importedRoot);
 const incumbentKey=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 const supplied=ok(await erasureReq('/api/intake/incumbent',{importedId:importedRoot.targetId,importedRevision:importedRoot.revision,id:importedId,service:erasureService,name:'Synthetic imported integration custody',revision:0,key:incumbentKey}),201);
 const activated=ok(await erasureReq('/api/intake/sources/'+importedId+'/activate-incumbent',{revision:supplied.source.revision,confirmed:true}));assert.ok(activated.nativeKey);
 const importedBefore=ok(await erasureReq('/api/state')),importedInput={workspaceRevision:importedBefore.revision,confirmation:'erase '+importedId};
 w.sql("CREATE TRIGGER synthetic_oncall_409_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='intake.erase' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-409'); END");
 try{ok(await erasureReq('/api/erasure/intake/'+importedId,importedInput),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_409_audit')}
 assert.deepEqual(ok(await erasureReq('/api/state')),importedBefore,'import custody and native key erasure roll back with their audit');
 assert.ok(ok(await erasureReq('/api/move-in/objects')).some(row=>row.targetId===importedRoot.targetId));
 const importedRaces=await Promise.all([0,1].map(()=>erasureReq('/api/erasure/intake/'+importedId,importedInput)));assert.deepEqual(importedRaces.map(r=>r.status).sort(),[200,409]);
 const importedReceipt=ok(importedRaces.find(r=>r.status===200));assert.equal(importedReceipt.state,'complete');assert.equal(importedReceipt.importCustody.state,'complete');assert.ok(importedReceipt.importCustody.stores.some(row=>row.rows>0));assert.equal(importedReceipt.stores.oc_incumbent_credentials.deleted,1);assert.equal(importedReceipt.stores.oc_intake_credentials.deleted,1);assert.equal(importedReceipt.stores.move_in_objects.deleted,1);
 assert.ok(!ok(await erasureReq('/api/move-in/objects')).some(row=>row.targetId===importedRoot.targetId));assert.ok(!JSON.stringify(importedReceipt).includes(incumbentKey));
 record('OC-040 imported integration erasure: incumbent and native keys, source target, original/plan retirement and count-only receipt share audit-failure rollback and one commit');
 const nativeId='synthetic-oncall-405';ok(await erasureReq('/api/sources',{id:nativeId,key:routedKey,scopes:[erasureService]}));
 const incomplete=await w.send('/api/ingress/'+nativeId,'{"source":"'+nativeId+'","private":"synthetic-oncall-405@example.test",',{authorization:'Bearer '+routedKey,'content-type':'application/json'});ok(incomplete,202);
 const nativeCustody=ok(await erasureReq('/api/state')).intakeSources.find(s=>s.name==='Native incomplete: '+nativeId);assert.ok(nativeCustody);
 ok(await erasureReq('/api/erasure/intake/'+encodeURIComponent(nativeCustody.id),{workspaceRevision:ok(await erasureReq('/api/state')).revision,confirmation:'erase '+nativeCustody.id}),409);
 const nativeReceipt=ok(await erasureReq('/api/erasure/native/'+nativeId,{workspaceRevision:ok(await erasureReq('/api/state')).revision,confirmation:'erase '+nativeId}));assert.equal(nativeReceipt.stores.sources.deleted,1);assert.equal(nativeReceipt.stores.oc_native_prefixes.deleted,1);
 assert.ok(!JSON.stringify(ok(await erasureReq('/api/state'))).includes('synthetic-oncall-405@example.test'));

 record('OC-040 integration erasure: native and routed keys, routed receipts/events/alerts, per-table counts, rejected old key and forged-journal archive refusal passed');
 record('OC-040 incident erasure: notes/follow-ups/runbook custody, admin authority, confirmation, audit rollback, committed per-table receipt, stale and forged-journal restore refusal, merged-source unlink and valid current checkpoint passed');
 // Native contact removal shares the imported-person custody transaction and keeps fixed slots as gaps.
 const erasedName='synthetic-oncall-413@example.test',keptName='synthetic-oncall-414@example.test';
 const erasedMember=ok(await erasureReq('/api/members',{name:erasedName,password:'synthetic-oncall-413-password',role:'admin'}),201);
 const keptMember=ok(await erasureReq('/api/members',{name:keptName,password:'synthetic-oncall-414-password',role:'responder'}),201);
 const memberLogin=await erasureReq('/api/login',{name:erasedName,password:'synthetic-oncall-413-password'});ok(memberLogin);
 const memberSchedule={...schedule,id:'synthetic-oncall-413',name:'Synthetic retained erasure slots',service:erasureService,revision:0,timezone:'UTC',primary:{anchorLocal:'2026-03-07T09:00',periodDays:1,members:[erasedMember.id,keptMember.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-03-07T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]};
 ok(await erasureReq('/api/paging/schedules',memberSchedule));
 const memberTeam=ok(await erasureReq('/api/teams',{id:'synthetic-oncall-145',name:'synthetic-oncall-145',visibility:'public',active:true,revision:0,members:[erasedMember.id,keptMember.id],managers:[erasedMember.id]}));
 // Existing native memberships and personal calendar/reminder custody must be populated before erasure.
 const memberBusiness=ok(await erasureReq('/api/status',{action:'create',name:'Synthetic member custody',owningTeam:'Synthetic team',supporting:[erasureService],audience:[erasedMember.id,keptMember.id],communicationsOwner:keptMember.id,highUrgencyImpact:false})).services.find(row=>row.name==='Synthetic member custody');
 ok(await erasureReq('/api/status',{action:'subscribe',id:memberBusiness.id,revision:memberBusiness.revision,member:erasedMember.id,channel:'email',active:true}));
 const memberFeed=ok(await w.request('/api/schedule-coordination',{action:'subscribe',scope:'schedule',target:memberSchedule.id},memberLogin.cookie));
 ok(await w.request('/api/schedule-coordination',{action:'reminder',leadMinutes:15,channel:'email'},memberLogin.cookie));
 assert.equal((await w.send(new URL(memberFeed.url).pathname+'?from=2026-03-07T00:00:00Z&to=2026-03-09T00:00:00Z',undefined,{},'GET')).status,200);
 const memberDoor=ownerDoor(w,erasureCookie),memberPlan=ok(await memberDoor.preview('opsgenie',JSON.stringify({users:{data:[{id:'synthetic-oncall-413-user',username:erasedName,fullName:'Synthetic erased contact'},{id:'synthetic-oncall-414-user',username:keptName,fullName:'Synthetic retained contact'}]},schedules:{data:[{id:'synthetic-oncall-413',name:'Synthetic imported slots',timezone:'UTC',rotations:[{name:'Synthetic daily',startDate:'2026-03-07T09:00:00Z',type:'daily',length:1,participants:[{type:'user',id:'synthetic-oncall-413-user'},{type:'user',id:'synthetic-oncall-414-user'}]}]}]}})));
 ok(await memberDoor.apply('opsgenie',memberPlan));
 const memberSource='synthetic-oncall-413-source',memberKey='synthetic-oncall-'+crypto.randomUUID()+crypto.randomUUID();ok(await erasureReq('/api/sources',{id:memberSource,key:memberKey,scopes:[erasureService]}));
 ok(await w.request('/api/ingress/'+memberSource,{source:memberSource,eventId:memberSource,service:erasureService,environment:ok(await erasureReq('/api/state')).services.find(s=>s.id===erasureService).environment,key:memberSource,generation:memberSource,intent:'trigger',severity:'warning',title:'Synthetic copied member snapshot',observedAt:new Date().toISOString(),evidence:''},undefined,{authorization:'Bearer '+memberKey}),201);
 const personalClient=ok(await w.request('/api/automation/clients',{name:erasedName,key:memberKey,services:[erasureService],permissions:['incidents:read']},memberLogin.cookie),201);
 const personalEndpoint=ok(await w.request('/api/automation/endpoints',{name:erasedName,client:personalClient.id,services:[erasureService],url:'https://8.8.8.8/synthetic-oncall-413',key:memberKey,approve:true},memberLogin.cookie),201);
 ok(await erasureReq('/api/command',{type:'declare',service:erasureService,title:'Synthetic destination erasure',summary:'Synthetic retained incident',severity:'warning'}));
 assert.ok(ok(await erasureReq('/api/state')).apiOutbox.some(o=>o.endpoint===personalEndpoint.id&&o.status==='queued'));
 const memberIncident=ok(await w.request('/api/command',{type:'declare',service:erasureService,title:'Synthetic retained member incident',summary:erasedName+' private declaration',severity:'warning'},memberLogin.cookie));
 const memberHandoffContext=ok(await erasureReq('/api/handoffs/context/'+memberIncident.id));
 ok(await erasureReq('/api/handoffs/prepare',{id:'synthetic-oncall-413-handoff',incident:memberIncident.id,incidentRevision:memberIncident.revision,serviceHash:memberHandoffContext.serviceHash,payload:{audience:'internal',title:'Synthetic member custody',summary:erasedName+' copied declaration',evidenceLinks:[],impactLinks:[]}}),201);
 const memberHandoffs=ok(await erasureReq('/api/handoffs/archive'));
 const memberManual=ok(await erasureReq('/api/command',{type:'manual-page',operationId:'synthetic-oncall-417',service:erasureService,title:'Synthetic member destination',severity:'warning',users:[erasedMember.id],description:erasedName+' retained description'}));
 // Auth fixtures hold real linked custody; all erasure assertions use the public HTTP door.
 const linkedOwner=ok(await erasureReq('/api/members',{name:'synthetic-oncall-415',password:'synthetic-oncall-415-password',role:'responder'}),201);
 w.sql("INSERT INTO oa_operators(id,email,display_name,role,status,version,created_at) VALUES('synthetic-oncall-415-auth','synthetic-oncall-415@example.test','Synthetic owner','owner','active',1,1),('synthetic-oncall-413-auth','"+erasedName+"','"+erasedName+"','member','active',1,2); INSERT INTO operator_members VALUES('synthetic-oncall-415-auth','"+linkedOwner.id+"'),('synthetic-oncall-413-auth','"+erasedMember.id+"')");
 const authToken=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'),authDigest=createHmac('sha256',w.vars.SESSION_SECRET).update('session\0'+authToken).digest('hex');
 const authCookie='operator_session_local_'+new URL(w.origin).port+'='+authToken;
 w.sql("INSERT INTO oa_sessions(id,token_hash,operator_id,operator_version,kind,created_at,expires_at) VALUES('synthetic-oncall-413-session','"+authDigest+"','synthetic-oncall-413-auth',1,'native',1,4102444800000)");
 ok(await w.request('/auth/session',undefined,authCookie));ok(await w.request('/api/state',undefined,authCookie));
 ok(await erasureReq('/api/teams',{id:'synthetic-oncall-146',name:'synthetic-oncall-146',visibility:'public',active:true,revision:0,members:[linkedOwner.id],managers:[linkedOwner.id]}));
 const ownerInput={workspaceRevision:ok(await erasureReq('/api/state')).revision,confirmation:'erase '+linkedOwner.id,identitiesReviewed:true,importedPeople:[]};
 const ownerTables=everything();const ownerRefusal=ok(await erasureReq('/api/erasure/member/'+linkedOwner.id,ownerInput),409);
 assert.match(ownerRefusal.error,/only through Auth/);assert.match(ownerRefusal.error,/AUTH-ERASURE-001/);assert.equal(everything(),ownerTables,'owner-linked refusal changes no table, including Auth, links, audit and transfer custody');
 const authBefore=w.sql('SELECT * FROM oa_operators ORDER BY id'),authSessionsBefore=w.sql('SELECT * FROM oa_sessions ORDER BY id');
 const personalChangeSource='synthetic-oncall-418';ok(await erasureReq('/api/changes/sources',{id:personalChangeSource,name:'Synthetic personal change',provider:'native',service:erasureService,repository:'',mode:'bearer',revision:0,key:memberKey}),201);
 const personalChange=ok(await w.request('/api/changes/ingress/'+personalChangeSource,{eventId:'synthetic-oncall-418',summary:'Synthetic person local change',author:erasedName,timestamp:new Date().toISOString()},undefined,{authorization:'Bearer '+memberKey}),201);
 const memberPath='/api/erasure/member/'+erasedMember.id,memberBefore=ok(await erasureReq('/api/archive'));
 const memberInput={workspaceRevision:memberBefore.revision,confirmation:'erase '+erasedMember.id,identitiesReviewed:true,importedPeople:[erasedName]};
 const memberEventRows=()=>w.sql("SELECT id,event FROM agent_door_events WHERE json_extract(event,'$.actor.person.id')='"+erasedMember.id+"' ORDER BY sequence");
 const memberEventsBefore=memberEventRows();assert.ok(memberEventsBefore.length>0,'native person actions retain typed events before erasure');

 ok(await erasureReq(memberPath,{...memberInput,identitiesReviewed:false}),409);
 ok(await erasureReq(memberPath,{...memberInput,importedPeople:[]}),409);
 w.sql("CREATE TRIGGER synthetic_oncall_413_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='member.erase' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-413'); END");
 try{ok(await erasureReq(memberPath,memberInput),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_413_audit')}
 assert.deepEqual(ok(await erasureReq('/api/archive')),memberBefore,'native identity, imported original and schedules roll back with their audit');
 assert.deepEqual(memberEventRows(),memberEventsBefore,'audit failure also rolls back typed event redaction');
 let memberReceipt;
 erasureCookie=await checkpointErasureCli(w,erasureCookie,async()=>{memberReceipt=ok(await erasureReq(memberPath,memberInput));assert.equal(memberReceipt.state,'complete');assert.equal(memberReceipt.outstanding.length,1);assert.equal(memberReceipt.outstanding[0].state,'not-requested');assert.deepEqual(w.sql('SELECT * FROM oa_operators ORDER BY id'),authBefore);assert.deepEqual(w.sql('SELECT * FROM oa_sessions ORDER BY id'),authSessionsBefore);ok(await w.request('/auth/session',undefined,authCookie));ok(await w.request('/api/state',undefined,authCookie),401);assert.equal(w.sql("SELECT * FROM operator_members WHERE operator_id='synthetic-oncall-413-auth'").length,0);ok(await w.request('/api/changes/ingress/'+personalChangeSource,{eventId:'synthetic-oncall-418',summary:'Synthetic person local change',author:erasedName,timestamp:new Date().toISOString()},undefined,{authorization:'Bearer '+memberKey}),410);assert.match(memberReceipt.outstanding[0].destination,/Approved response recipient/);assert.equal(memberReceipt.stores.credentials.deleted,1);assert.equal(memberReceipt.stores.oc_api_credentials.deleted,1);assert.equal(memberReceipt.stores.oc_endpoint_credentials.deleted,1);assert.ok(memberReceipt.stores.oc_api_outbox.deleted>0);assert.equal(memberReceipt.stores.handoff_state.updated,1);ok(await w.request('/api/state',undefined,memberLogin.cookie),401);ok(await erasureReq('/api/login',{name:erasedName,password:'synthetic-oncall-413-password'}),401);assert.ok(memberReceipt.importCustody.stores.some(row=>row.rows>0));});
 assert.ok(!JSON.stringify(ok(await erasureReq('/api/handoffs/archive'))).includes(erasedName));ok(await erasureReq('/api/handoffs/restore',{mode:'replace',archive:memberHandoffs}),409);
 const memberAfter=ok(await erasureReq('/api/archive')),tombstone=memberAfter.members.find(m=>m.id===erasedMember.id);
 const erasedTeam=memberAfter.teams.find(team=>team.id===memberTeam.id);assert.deepEqual(erasedTeam.members,[keptMember.id]);assert.deepEqual(erasedTeam.managers,[]);assert.equal(memberReceipt.stores.oc_teams.updated,1,'team memberships and manager roles erased in the shared receipt');
 const erasedBusiness=memberAfter.businessServices.find(row=>row.id===memberBusiness.id);
 assert.ok(!erasedBusiness.audience.includes(erasedMember.id));assert.ok(erasedBusiness.audience.includes(keptMember.id));
 assert.ok(!erasedBusiness.subscriptions.some(row=>row.member===erasedMember.id||row.by===erasedMember.id));
 assert.ok(!erasedBusiness.notices.some(row=>row.target.id===erasedMember.id));
 assert.ok(!(memberAfter.scheduleRecords??[]).some(row=>row.member===erasedMember.id));
 assert.equal((await w.send(new URL(memberFeed.url).pathname,undefined,{},'GET')).status,404,'erasure revokes the private calendar capability');
 assert.ok(memberReceipt.stores.oc_schedule_records.deleted>=2);assert.ok(memberReceipt.stores.oc_business_services);

 assert.ok(!(memberAfter.changes??[]).some(change=>change.id===personalChange.id));
 const repeated=ok(await erasureReq(memberPath,memberInput));assert.equal(repeated.repeated,true);assert.equal(repeated.state,'complete');assert.ok(repeated.outstanding.every(item=>item.state==='not-requested'));assert.deepEqual(ok(await erasureReq('/api/archive')),memberAfter,'repeated erasure is idempotent');
 const manualAfter=memberAfter.incidents.find(i=>i.id===memberManual.id);assert.equal(manualAfter.manualPage.obligations.length,0);assert.ok(!JSON.stringify(manualAfter).includes(erasedName),'native erasure removes recorded manual destinations and copied description/timeline content');
 assert.equal(tombstone.name,'Erased member');assert.equal(tombstone.active,false);assert.equal(tombstone.erased,true);assert.equal(memberAfter.members.find(m=>m.id===keptMember.id).name,keptName);
 assert.ok(!JSON.stringify(memberAfter).includes(erasedName));assert.ok(!JSON.stringify(ok(await erasureReq('/api/audit/export'))).includes(erasedName));
 ok(await w.request('/api/state',undefined,memberLogin.cookie),401);ok(await erasureReq('/api/login',{name:erasedName,password:'synthetic-oncall-413-password'}),401);
 ok(await erasureReq('/api/command',{type:'member',id:erasedMember.id,active:true,role:'responder'}),410);
 assert.equal(ok(await erasureReq('/api/schedules/synthetic-oncall-413/now-next?at=2026-03-07T12:00:00Z')).now.primary,null);
 assert.equal(ok(await erasureReq('/api/schedules/synthetic-oncall-413/now-next?at=2026-03-08T12:00:00Z')).now.primary,keptMember.id);
 assert.equal(ok(await erasureReq('/api/move-in/coverage',{vendor:'opsgenie',id:'opsgenie:synthetic-oncall-413',at:'2026-03-07T12:00:00Z'})).coverage.primary,null);
 assert.equal(ok(await erasureReq('/api/move-in/coverage',{vendor:'opsgenie',id:'opsgenie:synthetic-oncall-413',at:'2026-03-08T12:00:00Z'})).coverage.primary,keptName);
 for(const archive of [memberBefore,{...memberBefore,erasureFences:memberAfter.erasureFences}])ok(await erasureReq('/api/restore',{mode:'replace',archive}),409);
 ok(await erasureReq('/api/restore',{mode:'replace',archive:{...memberAfter,events:memberBefore.events}}),409);
 w.sql("INSERT INTO login_attempts(name,attempts,reset) VALUES('"+keptName+"',10,"+(Date.now()+60000)+") ON CONFLICT(name) DO UPDATE SET attempts=10,reset=excluded.reset");
 ok(await erasureReq('/api/login',{name:keptName,password:'synthetic-oncall-414-password'}),429);assert.equal(w.sql("SELECT attempts FROM login_attempts WHERE name='"+keptName+"'")[0].attempts,11,'erasing someone else preserves an active account’s existing throttle');
 w.sql("DELETE FROM login_attempts WHERE name='"+keptName+"'");
 const memberEventsAfter=memberEventRows();assert.deepEqual(memberEventsAfter.map(row=>row.id),memberEventsBefore.map(row=>row.id),'erasure retains typed event IDs and cursor order');
 assert.ok(memberEventsAfter.every(row=>JSON.parse(row.event).actor.person.name==='Erased member'));
 const retainedPersonal=everything(false);assert.equal([erasedName,'synthetic-oncall-413-user','Synthetic erased contact'].some(value=>retainedPersonal.includes(value)),false,'no Oncall-owned table retains the erased person; the separate Auth identity is deliberately retained');
 record('OC-040 member erasure: native business audience/subscriptions and calendar/reminder custody, linked Auth owner refusal/non-owner preservation, reviewed imported identity, native credentials/session, audit-failure rollback, anonymous tombstone, immutable slot gaps without reassignment, unrelated member retention and CLI/native restore fences passed');
 record('OC-040 change-event erasure: admin-only confirmation, stale refusal, atomic audit-failure rollback, per-table local receipt, last receipt unlink, immutable pseudonymous audit, CLI/native restore fence, restart and provider retry refusal passed');
 }
 console.log(`Activation passed: ${checks.length} requirement flow groups`)
}finally{await w.close();await rm('.rer/local/handoff-session',{force:true});await rm('.rer/local/handoffs.json',{force:true})}

// The explicitly labelled demo exercises coordination and simulated delivery without activating production paging.
{
const {default:assert}=await import('node:assert/strict')
const { localWorker }=await import('./worker.mjs')

const worker = await localWorker({ RER_DEMO: '1' })
const ok = (result, status = 200) => {
  assert.equal(result.status, status, JSON.stringify(result.value))
  return result.value
}
try {
  const owner = await worker.request('/auth/bootstrap', { token: worker.vars.SETUP_TOKEN, displayName: 'Alex Morgan' }, undefined, { 'CF-Connecting-IP': '127.0.0.1' })
  ok(owner, 303)
  const req = (path, input) => worker.request(path, input, owner.cookie, { 'CF-Connecting-IP': '127.0.0.1' })
  const state = ok(await req('/api/state'))
  const incident = state.incidents.find(item => item.state !== 'resolved')
  ok(await req('/api/command', { type: 'transition', incident: incident.id, revision: incident.revision,
    state: 'acknowledged', summary: 'Investigating the certificate rotation' }))
  const page = ok(await req('/api/paging/jobs', { incident: incident.id }))
  assert.equal(page.status, 'sent')
  assert.deepEqual(new Set(page.sends.map(send => send.channel)), new Set(['sms', 'voice', 'push', 'email']))
  assert.ok(page.sends.every(send => send.status === 'sent'))
  for (const channel of ['sms', 'voice', 'push', 'email'])
    assert.equal(ok(await req('/api/delivery', { incident: incident.id, channel })).sends[0].status, 'sent')
  const changed = ok(await req('/api/state')).incidents.find(item => item.id === incident.id)
  assert.equal(changed.state, 'acknowledged')
  ok(await req('/auth/magic-link', { email: worker.vars.OWNER_EMAIL }), 202)
  ok(await req('/api/paging/jobs', { incident: 'missing' }), 404)
  ok(await worker.request('/api/paging/jobs', { incident: incident.id }), 401)
  console.log('Demo HTTP flow passed: acknowledgment, simulated SMS/voice/push/email and suppressed mail; auth and invalid incident checks remain real.')
} finally {
  await worker.close()
}

}
