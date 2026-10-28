import assert from 'node:assert/strict';
import {localWorker} from './worker.mjs';
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
export async function scheduleCoordination(){
 await scheduleLayers();
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
  // OC-020 / OC-014: one aggregate read agrees with each rota's existing resolver and never commits.
  {
   const at=Date.parse(start),schedules=ok(await req('/api/paging/state')).schedules;
   const counts=()=>{const names=w.sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name").map(row=>row.name);return w.statements(names.map(name=>'SELECT COUNT(*) AS count FROM "'+name.replaceAll('"','""')+'"').join(';')).map((rows,index)=>({table:names[index],count:rows[0].count}));};
   const before=counts(),workspace=ok(await req('/api/state')),paging=ok(await req('/api/paging/state'));
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
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])await scheduleCoordination();

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
