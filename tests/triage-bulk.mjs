import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {localWorker} from './worker.mjs';
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
export async function triageBulkCompletion(){
 const w=await localWorker({}, {clock:true});
 try{
  const setup=await w.request('/api/setup',{name:'synthetic-oncall-600',password:'synthetic-oncall-600-password'});ok(setup);let cookie=setup.cookie;
  const req=(path,input)=>w.request(path,input,cookie),state=async()=>ok(await req('/api/state'));
  const service=ok(await req('/api/command',{type:'service',id:'synthetic-oncall-600',name:'Synthetic bulk service',environment:'test',owner:setup.value.member.id,runbook:[],pager:''}));
  const declare=async n=>ok(await req('/api/command',{type:'declare',service:service.id,title:'Synthetic bulk incident '+n,severity:'warning',summary:'Human response evidence'}));
  const bulk=async input=>{let result;do{result=await req('/api/triage/bulk',input);}while(result.status===200&&result.value.remaining>0&&!result.value.interrupted);return result;};
  const item=i=>({id:i.id,revision:i.revision,...(i.kind?{kind:i.kind}:{})});
  let a=await declare(1),b=await declare(2),target=await declare(3),c=await declare(4);
  const acknowledgedIncidents=ok(await bulk({operationId:'synthetic-oncall-600-ack',action:'acknowledge',reason:'Take responsibility for the selected incidents',items:[a,b].map(item)}));assert.ok(acknowledgedIncidents.results.every(r=>r.ok),JSON.stringify(acknowledgedIncidents));
  [a,b]=(await state()).incidents.filter(i=>[a.id,b.id].includes(i.id));
  const snooze={operationId:'synthetic-oncall-600-snooze',action:'snooze',minutes:15,reason:'Hold investigation while the dependency recovers',items:[a,b].map(item),confirmedCount:2};
  const snoozed=ok(await bulk(snooze));assert.ok(snoozed.results.every(r=>r.ok),JSON.stringify(snoozed));assert.deepEqual(ok(await bulk(snooze)),snoozed);
  for(const i of (await state()).incidents.filter(i=>[a.id,b.id].includes(i.id))){assert.equal(i.deadlines.filter(d=>d.state==='pending'&&d.kind==='snooze').length,1);assert.equal(i.timeline.filter(e=>e.operationId===snooze.operationId).length,1);}
  [a,b]=(await state()).incidents.filter(i=>[a.id,b.id].includes(i.id));
  const merge={operationId:'synthetic-oncall-600-merge',action:'merge',target:target.id,targetRevision:target.revision,reason:'One response owns the common dependency failure',items:[a,c,b].map(item),confirmedCount:3};
  ok(await req('/api/command',{type:'note',incident:c.id,revision:c.revision,text:'Make just this selected source stale'}));
  const merged=ok(await bulk(merge));assert.equal(merged.results.filter(r=>r.ok).length,2);assert.equal(merged.results.filter(r=>!r.ok).length,1);assert.match(merged.results.find(r=>r.id===c.id).error,/changed/i);
  assert.deepEqual(ok(await bulk(merge)),merged,'merge replay preserves original per-item outcomes and target history');
  const afterMerge=await state();for(const id of [a.id,b.id]){assert.equal(afterMerge.incidents.find(i=>i.id===id).mergedInto.target,target.id);assert.ok(afterMerge.incidents.find(i=>i.id===id).timeline.some(e=>e.operationId===merge.operationId));}
  assert.equal(afterMerge.incidents.find(i=>i.id===target.id).timeline.filter(e=>e.operationId===merge.operationId).length,2);ok(await req('/api/archive'));
  const viewer=ok(await req('/api/members',{name:'synthetic-oncall-601',role:'viewer',password:'synthetic-oncall-601-password'}),201),viewerLogin=await w.request('/api/login',{name:viewer.name,password:'synthetic-oncall-601-password'});ok(viewerLogin);
  const key=randomBytes(32).toString('hex');ok(await req('/api/sources',{id:'synthetic-oncall-600',key,scopes:[service.id]}));
  const signal=n=>({source:'synthetic-oncall-600',eventId:'synthetic-oncall-'+(1000+n),service:service.id,environment:'test',key:'synthetic-oncall-'+(1000+n),generation:'synthetic-oncall-'+(1000+n),intent:'trigger',severity:'warning',title:'Synthetic bulk scale',observedAt:new Date().toISOString(),evidence:''});
  const ingest=async input=>ok(await w.request('/api/ingress/synthetic-oncall-600',input,undefined,{authorization:'Bearer '+key}),201);
  ok(await req('/api/intake/allowances',{id:'source:synthetic-oncall-600',requests:6000,events:1200,revision:(await state()).revision}));
  let scaleClock=Date.now();await w.time(scaleClock);
  for(let n=0;n<1500;n++){if(n===1000){scaleClock+=60001;await w.time(scaleClock);}await ingest(signal(n));}
  const list=async query=>{let page=ok(await req('/api/triage?'+new URLSearchParams({...query,limit:'100'}))),items=[...page.items],revision=page.workspaceRevision;while(page.nextCursor){page=ok(await req('/api/triage?'+new URLSearchParams({...query,limit:'100',cursor:page.nextCursor})));items.push(...page.items);}return {items,revision};};
  let matching=await list({kind:'alerts',q:'Synthetic bulk scale',status:'open'});assert.equal(matching.items.length,1500);
  const incidentCount=(await state()).incidents.length;
  const selected={operationId:'synthetic-oncall-600-selected',action:'resolve',items:matching.items.slice(0,500).map(item),confirmedCount:500};
  ok(await req('/api/triage/bulk',{...selected,items:matching.items.slice(0,501).map(item),confirmedCount:501}),400);
  ok(await req('/api/triage/bulk',{...selected,confirmedCount:499}),409);
  const denied=ok(await w.request('/api/triage/bulk',{...selected,operationId:'synthetic-oncall-600-denied'},viewerLogin.cookie));assert.ok(denied.results.every(r=>!r.ok));
  const result500=ok(await bulk(selected));assert.equal(result500.results.length,500);assert.ok(result500.results.every(r=>r.ok&&r.kind==='alert'));assert.deepEqual(ok(await bulk(selected)),result500);
  matching=await list({kind:'alerts',q:'Synthetic bulk scale',status:'open'});assert.equal(matching.items.length,1000);
  const all={operationId:'synthetic-oncall-600-all',action:'resolve',items:matching.items.map(item),allMatching:true,query:{kind:'alerts',q:'Synthetic bulk scale',status:'open'},confirmedCount:1000,workspaceRevision:matching.revision};
  ok(await req('/api/triage/bulk',{...all,confirmedCount:999}),409);
  ok(await req('/api/triage/bulk',{...all,items:[...all.items,{id:'synthetic-oncall-over-limit',revision:1,kind:'alert'}],confirmedCount:1001}),400);
  const result1000=ok(await bulk(all));assert.equal(result1000.results.length,1000);assert.ok(result1000.results.every(r=>r.ok));assert.deepEqual(ok(await bulk(all)),result1000);
  assert.equal((await list({kind:'alerts',q:'Synthetic bulk scale',status:'open'})).items.length,0);assert.equal((await state()).incidents.length,incidentCount,'closing alert-only items creates no human incident or recovery summary');
  for(const alert of (await state()).alerts){assert.equal(alert.state,'active','human resolution never fabricates source recovery');assert.equal(alert.coordination.state,'closed');assert.equal(alert.obligation.outcome,'stopped by human resolution');assert.equal(alert.coordination.history.length,1);}
  // A changed source receipt invalidates just its alert's selection revision.
  await ingest(signal(1500));await ingest(signal(1501));let fresh=await list({kind:'alerts',status:'open'}),stale=fresh.items[0];
  const original=(await state()).alerts.find(a=>a.id===stale.id),latest=signal(2000);latest.key=original.key;latest.generation=original.generation;await ingest(latest);
  const mixed=ok(await bulk({operationId:'synthetic-oncall-600-mixed',action:'acknowledge',items:fresh.items.map(item),confirmedCount:2,reason:'Take responsibility for current alerts'}));assert.equal(mixed.results.filter(r=>r.ok).length,1);assert.equal(mixed.results.filter(r=>!r.ok).length,1);
  const acknowledged=(await list({kind:'alerts',status:'acknowledged'})).items[0];
  ok(await bulk({operationId:'synthetic-oncall-600-alert-snooze',action:'snooze',items:[item(acknowledged)],confirmedCount:1,minutes:15,reason:'Wait for the dependency owner'}));
  const snoozedAlert=(await state()).alerts.find(a=>a.id===acknowledged.id);assert.ok(Number.isFinite(Date.parse(snoozedAlert.coordination.snoozeDue)));assert.match(snoozedAlert.coordination.history.at(-1).text,/not sent \(no timer\)/);
  const unresolved=(await list({kind:'alerts',status:'declared'})).items[0],heldAlert=(await state()).alerts.find(a=>a.id===unresolved.id),rollback={operationId:'synthetic-oncall-600-rollback',action:'resolve',items:[item(unresolved)],confirmedCount:1};
  w.sql("CREATE TRIGGER synthetic_bulk_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='triage.resolve' AND EXISTS(SELECT 1 FROM oc_alerts WHERE id='"+unresolved.id+"' AND json_extract(data,'$.coordination.state')='closed') BEGIN SELECT RAISE(ABORT,'synthetic-oncall-600-audit'); END");
  try{const failed=ok(await bulk(rollback));assert.equal(failed.interrupted,true);assert.deepEqual((await state()).alerts.find(a=>a.id===unresolved.id),heldAlert);assert.deepEqual((await state()).triage.find(r=>r.id===rollback.operationId).results,[]);}finally{w.sql('DROP TRIGGER synthetic_bulk_audit');}
  assert.equal(ok(await bulk(rollback)).results[0].ok,true);
  const archive=ok(await req('/api/archive'));assert.ok(archive.triage.some(r=>r.id===merge.operationId));
  const checkpoint=ok(await req('/api/recovery/checkpoint'));
  const restored=await req('/api/recovery/restore',{mode:'replace',checkpoint});ok(restored);cookie=restored.cookie;assert.deepEqual((await state()).alerts,archive.alerts,'native restore retains every closed state, assignee, snooze record, revision and shared operation history');
  await w.stop();await w.start();const login=await w.request('/api/login',{name:'synthetic-oncall-600',password:'synthetic-oncall-600-password'});ok(login);cookie=login.cookie;assert.deepEqual((await state()).alerts,archive.alerts);
  console.log('PASS OC-060 public bulk completion: revisioned incident snooze and multi-source merge, independent stale refusal and exact replay, attributed atomic merge history, 500 selected and 1,000 confirmed matching alert-only closes, unchanged source recovery/incident semantics, viewer denial, source-revision fencing, no-timer alert snooze, per-item audit rollback/retry and full archive/restart custody. Paging OFF.');
 }finally{await w.close();}
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])await triageBulkCompletion();
