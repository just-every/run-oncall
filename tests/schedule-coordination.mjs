import assert from 'node:assert/strict';
import {localWorker} from './worker.mjs';
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
export async function scheduleCoordination(){
 const w=await localWorker({}, {clock:true});
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
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])await scheduleCoordination();
