import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

/** Extends the adopted-rota public journey; no application or storage fakes. */
export async function adoptedOnCallFlow({w,req,ok,admin,alice,bob,schedule}) {
 const start=Date.parse('2026-03-08T13:00:00Z');await w.time(start);
 const read=async()=>ok(await req('/api/state'));
 const rulesPath=id=>'/api/members/'+id+'/notification-rules';
 const contacts=[{id:'work',type:'email',label:'Work email',address:'alice@example.test',countryCode:null},{id:'mobile',type:'sms',label:'Mobile',address:'4155550123',countryCode:1}];
 const rules=[{id:'immediate',contact:'work',delayMinutes:0,urgency:'high'},{id:'later',contact:'mobile',delayMinutes:1,urgency:'high'},{id:'outside-wait',contact:'work',delayMinutes:20,urgency:'high'},{id:'quiet',contact:'work',delayMinutes:0,urgency:'low'}];
 const settings=ok(await req(rulesPath(alice.id),{revision:0,contacts,rules}));
 assert.equal(settings.verified,false);assert.equal(settings.paging,'OFF');
 ok(await req(rulesPath(alice.id),{revision:0,contacts,rules}),409);
 ok(await req(rulesPath(alice.id),{revision:1,contacts,rules:[{...rules[0],contact:'missing'}]}),400);
 const bobContacts=[{...contacts[0],address:'bob@example.test'}];
 ok(await req(rulesPath(bob.id),{revision:0,contacts:bobContacts,rules:[rules[0]]}));
 const viewer=await w.request('/api/login',{name:'Viewer',password:'synthetic-local-testing-password'});ok(viewer);
 ok(await w.request(rulesPath(alice.id),{revision:1,contacts,rules},viewer.cookie),403);
 ok(await w.request(rulesPath(alice.id)),401);
 const publish=async(scheduleId,secondStep,revision=0)=>ok(await req('/api/paging/policies',{service:'checkout',scheduleId,revision,primaryWaitSeconds:120,backupWaitSeconds:180,retrySeconds:10,maxAttempts:1,...(secondStep?{secondStep}:{})}));
 let policy=await publish(schedule.id,'primary');
 ok(await req('/api/paging/policies',{...policy,revision:policy.revision,secondStep:'everyone'}),400);
 ok(await req('/api/response/services/checkout',{baseVersion:0,defaultMode:'incident',recoveredNotice:'silent',rules:[],reason:'Coordinate adopted on-call response'}),201);
 const key=randomBytes(32).toString('hex');
 ok(await req('/api/intake/sources',{id:'adopted-pager',name:'Checkout monitoring',provider:'pagerduty',service:'checkout',key,revision:0}),201);
 const send=async(dedup,action='trigger')=>ok(await req('/v2/enqueue',{routing_key:key,event_action:action,dedup_key:dedup,...(action==='trigger'?{payload:{summary:'Checkout latency increased',source:'checkout-monitor',severity:'critical'}}:{})}),202);
 const runFor=async(dedup)=>{const state=await read(),alert=state.alerts.find(a=>a.key===dedup);assert.ok(alert);return {state,alert,run:alert.onCall,incident:state.incidents.find(i=>i.alerts.includes(alert.id))};};
 const tick=async(at)=>{await w.time(at);const r=await w.send('/cdn-cgi/handler/scheduled');assert.equal(r.status,200,r.value);};
 const beforePaging=ok(await req('/api/paging/state'));
 await send('adopted-primary');let first=await runFor('adopted-primary');
 assert.equal(first.incident.assignee,alice.id);assert.equal(first.incident.commander,null,'assignment is not acknowledgment or command');
 assert.equal(first.alert.owner,alice.id);assert.deepEqual(first.alert.obligation.target,{kind:'user',id:alice.id});
 assert.equal(first.run.records.length,3);assert.equal(first.run.records.filter(r=>r.state==='recorded').length,1);
 assert.equal(first.run.records[0].contact.address,'alice@example.test');assert.equal(first.run.records[0].sender,'none');
 assert.equal(first.run.policy.maxAttempts,1);assert.equal(first.run.policy.retrySeconds,10);
 const frozen=structuredClone(first.run);await send('adopted-primary');assert.deepEqual((await runFor('adopted-primary')).run,frozen,'intake retry retains one run and one set of recipient records');
 const visible=ok(await req('/api/on-call/notifications?incident='+first.incident.id));assert.equal(visible.runs.length,1);assert.equal(visible.runs[0].records[0].person.id,alice.id);assert.equal(visible.sender,'none');
 const archive=ok(await req('/api/archive'));assert.equal(archive.alerts.find(a=>a.id===first.alert.id).onCall.id,first.run.id);
 await tick(start+59999);assert.equal((await runFor('adopted-primary')).run.records.filter(r=>r.state==='recorded').length,1);
 await tick(start+60000);assert.equal((await runFor('adopted-primary')).run.records.filter(r=>r.state==='recorded').length,2);
 await w.stop();await w.start();await w.time(start+119999);await tick(start+119999);assert.equal((await runFor('adopted-primary')).run.step,1);
 await Promise.all([tick(start+120000),tick(start+120000)]);await tick(start+120000);
 first=await runFor('adopted-primary');assert.equal(first.run.step,2);assert.equal(first.run.records.filter(r=>r.step===2&&r.state==='recorded').length,1);assert.equal(first.run.records.find(r=>r.step===2).member,alice.id,'primary can be selected again');
 assert.equal(first.run.records.find(r=>r.step===1&&r.rule.id==='outside-wait').state,'stopped');
 await tick(start+300000);first=await runFor('adopted-primary');assert.equal(first.run.state,'completed');const completed=structuredClone(first.run);await tick(start+900000);assert.deepEqual((await runFor('adopted-primary')).run,completed,'attempt limit and two waits never produce a third step');
 // Default second step remains backup. Configuration changes cannot rewrite a running policy.
 const backupSchedule=ok(await req('/api/paging/schedules',{...schedule,id:'checkout-backup',revision:0,backup:{...schedule.backup,members:[bob.id]}}));
 policy=await publish(backupSchedule.id,undefined,policy.revision);
 await send('adopted-backup');const backupStart=start+900000;
 policy=await publish(backupSchedule.id,'primary',policy.revision);
 await tick(backupStart+120000);const backup=await runFor('adopted-backup');assert.equal(backup.run.policy.secondStep,'backup');assert.equal(backup.run.records.find(r=>r.step===2).member,bob.id);
 // An explicit route wins over automatic primary assignment.
 ok(await req('/api/command',{type:'policy',service:'checkout',severity:'*',action:'route',owner:bob.id,reason:'Explicit responder owns this signal'}));
 await send('explicit-owner');const explicit=await runFor('explicit-owner');assert.equal(explicit.alert.owner,bob.id);assert.equal(explicit.incident.assignee,bob.id);assert.equal(explicit.run.records[0].member,bob.id);
 // Human assignment survives later ticks and a retry; acknowledgment stops remaining records.
 let incident=first.incident;incident=ok(await req('/api/command',{type:'reassign',incident:incident.id,revision:incident.revision,member:bob.id,reason:'Explicit response handoff'}));
 await send('adopted-primary');assert.equal((await runFor('adopted-primary')).incident.assignee,bob.id);
 ok(await req('/api/command',{type:'transition',incident:explicit.incident.id,revision:explicit.incident.revision,state:'acknowledged',summary:'Taking ownership'}));
 const stopped=(await runFor('explicit-owner')).run;assert.equal(stopped.state,'stopped');await tick(backupStart+300000);assert.deepEqual((await runFor('explicit-owner')).run,stopped);
 // Source recovery stops all pending records without a provider cancellation claim.
 await send('recovered-run');await send('recovered-run','resolve');assert.equal((await runFor('recovered-run')).run.state,'stopped');
 // No matching rule is a gap even when a destination exists.
 ok(await req(rulesPath(bob.id),{revision:1,contacts:bobContacts,rules:[]}));await send('missing-rule');const gap=await runFor('missing-rule');assert.equal(gap.run.records[0].contact,null);assert.match(gap.run.records[0].outcome,/No high-urgency notification rule/);
 const afterPaging=ok(await req('/api/paging/state'));for(const field of ['jobs','receipts','callbacks'])assert.deepEqual(afterPaging[field],beforePaging[field]);
 assert.deepEqual(await w.outboundRequests(),[],'recording makes zero outbound requests');
 ok(await req(rulesPath(bob.id),{revision:2,contacts:[],rules:[]}));await send('missing-contacts');assert.equal((await runFor('missing-contacts')).run.records[0].contact,null);
 // An uncovered rota stays unassigned and records operator action, with no guessed recipient.
 ok(await req('/api/command',{type:'service',id:'uncovered',name:'Uncovered service',environment:'production',owner:admin.id,runbook:[],pager:''}));
 const empty=ok(await req('/api/paging/schedules',{...schedule,id:'uncovered',service:'uncovered',revision:0,primary:{...schedule.primary,members:[]},backup:{...schedule.backup,members:[]},overrides:[]}));
 ok(await req('/api/paging/policies',{...policy,service:'uncovered',scheduleId:empty.id,revision:0}));
 ok(await req('/api/response/services/uncovered',{baseVersion:0,defaultMode:'incident',recoveredNotice:'silent',rules:[],reason:'Uncovered service coordination'}),201);
 const gapKey=randomBytes(32).toString('hex');ok(await req('/api/intake/sources',{id:'uncovered',name:'Uncovered monitoring',provider:'pagerduty',service:'uncovered',key:gapKey,revision:0}),201);
 ok(await req('/v2/enqueue',{routing_key:gapKey,event_action:'trigger',dedup_key:'uncovered',payload:{summary:'Uncovered service failed',source:'uncovered-monitor',severity:'critical'}}),202);
 const uncovered=await runFor('uncovered');assert.equal(uncovered.incident.assignee??null,null);assert.equal(uncovered.run.records[0].member,null);assert.match(uncovered.run.records[0].outcome,/No one on call/);
 // Native restore retains the records, but holds the run and member rules inactive.
 const running=ok(await req('/api/archive'));const restore=await req('/api/restore',{mode:'replace',archive:running});ok(restore);
 const held=ok(await w.request('/api/state',undefined,restore.cookie));assert.ok(held.alerts.filter(a=>a.onCall).every(a=>a.onCall.state!=='running'));assert.ok(held.scheduleRecords.filter(r=>r.kind==='notification-rules').every(r=>!r.active));
 // The caller's later owner session is intentionally replaced by restore; return it.
 await w.time(null);
 console.log('PASS adoptedOnCallFlow: ordinary members/policies/intake, adopted primary assignment, recorded contact rules/delays, primary and default backup second steps, frozen waits and attempts, retries, explicit assignments, acknowledgment/recovery, missing rules, strict archive/held restore, zero outbound requests; paging OFF');
 return restore.cookie;
}
