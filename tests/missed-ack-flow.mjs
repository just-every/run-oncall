import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

/** Extends the deadline HTTP journey using actual intake, commands and the scheduled door. */
export async function missedAcknowledgmentFlow({w,req,ok,admin}) {
 const service='synthetic-oncall-missed-ack',start=Date.parse('2026-11-17T23:59:30Z');
 const backup=ok(await req('/api/members',{name:'Example Responder',role:'responder',password:'synthetic-oncall-ack-password'}),201);
 ok(await req('/api/command',{type:'service',id:service,name:'Example Operations',environment:'test',owner:admin.id,runbook:[],pager:''}));
 const schedule=ok(await req('/api/paging/schedules',{id:service,service,name:'Example rota',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-11-17T00:00',periodDays:1,members:[admin.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-11-17T00:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[{id:'example-cover',role:'primary',start:new Date(start+30000).toISOString(),end:new Date(start+120000).toISOString(),member:backup.id}]}));
 ok(await req('/api/paging/policies',{service,scheduleId:schedule.id,revision:0,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:1}));
 ok(await req('/api/command',{type:'acknowledgment-timeout',service,baseVersion:0,minutes:1}));
 ok(await req('/api/response/services/'+service,{baseVersion:0,defaultMode:'incident',recoveredNotice:'silent',rules:[],reason:'Coordinate new incidents'}),201);
 const key=randomBytes(32).toString('hex');ok(await req('/api/intake/sources',{id:service,name:'Example monitoring',provider:'pagerduty',service,key,revision:0}),201);
 const read=async()=>ok(await req('/api/state'));
 const send=async(id,action='trigger')=>ok(await req('/v2/enqueue',{routing_key:key,event_action:action,dedup_key:id,...(action==='trigger'?{payload:{summary:'Example response delay '+id,source:'example-monitor',severity:'critical'}}:{})}),202);
 const find=async id=>(await read()).incidents.find(i=>i.title==='Example response delay '+id);
 const initial=i=>i.deadlines?.find(d=>d.kind==='initial-acknowledgment');
 const tick=async()=>{const response=await w.send('/cdn-cgi/local/scheduled',undefined,{},'GET');assert.equal(response.status,200,JSON.stringify(response.value));};
 const pagingBefore=ok(await req('/api/paging/state'));
 await w.time(start);await send('missed');let incident=await find('missed');const deadline=initial(incident);
 assert.equal(deadline.state,'pending');assert.equal(Date.parse(deadline.dueAt),start+60000);assert.equal(deadline.policyVersion,1);
 await send('missed');assert.equal((await find('missed')).deadlines.length,1,'repeated intake cannot restart the response clock');
 await w.time(start+59999);await tick();assert.equal(initial(await find('missed')).state,'pending');
 await w.stop();await w.start();await w.time(start+180000);
 // The permanent audit and the expiry either commit together or leave the pending work intact.
 w.sql("CREATE TRIGGER synthetic_ack_audit BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
 try {assert.equal((await w.send('/cdn-cgi/local/scheduled',undefined,{},'GET')).status,500);} finally {w.sql('DROP TRIGGER synthetic_ack_audit');}
 assert.equal(initial(await find('missed')).state,'pending');
 await Promise.all([tick(),tick()]);await tick();incident=await find('missed');
 assert.equal(incident.state,'declared');assert.equal(incident.commander,null);
 assert.equal(initial(incident).state,'fired');assert.equal(initial(incident).dueAt,deadline.dueAt);
 assert.equal(initial(incident).obligation.target.id,backup.id,'a delayed sweep retains coverage at the missed deadline, not its processing time');
 assert.equal(incident.timeline.filter(e=>e.id==='deadline-fired:'+deadline.id).length,1);
 incident=ok(await req('/api/command',{type:'transition',incident:incident.id,revision:incident.revision,state:'acknowledged',summary:'Taking responsibility'}));
 assert.equal(initial(incident).state,'fired','later acknowledgment retains the missed response');
 assert.equal(initial(incident).obligation.state,'stopped');
 // A late acknowledgment before the next cron must also preserve the miss.
 await w.time(start);await send('late');incident=await find('late');await w.time(start+60001);
 incident=ok(await req('/api/command',{type:'transition',incident:incident.id,revision:incident.revision,state:'acknowledged',summary:'Taking responsibility after the deadline'}));
 assert.equal(initial(incident).state,'fired');assert.equal(initial(incident).obligation.target.id,backup.id);
 await w.time(start);await send('on-time');incident=await find('on-time');await w.time(start+59999);
 incident=ok(await req('/api/command',{type:'transition',incident:incident.id,revision:incident.revision,state:'acknowledged',summary:'Taking responsibility before the deadline'}));
 assert.equal(initial(incident).state,'cancelled');
 await w.time(start);await send('recovered');await send('recovered','resolve');await w.time(start+60000);await tick();
 assert.equal(initial(await find('recovered')).state,'cancelled','source recovery stops a pending response');
 // An uncovered service records a miss without inventing a person or delivery.
 ok(await req('/api/command',{type:'service',id:service+'-uncovered',name:'Example Uncovered',environment:'test',owner:admin.id,runbook:[],pager:''}));
 ok(await req('/api/command',{type:'acknowledgment-timeout',service:service+'-uncovered',baseVersion:0,minutes:1}));
 ok(await req('/api/response/services/'+service+'-uncovered',{baseVersion:0,defaultMode:'incident',recoveredNotice:'silent',rules:[],reason:'Coordinate uncovered service'}),201);
 const gapKey=randomBytes(32).toString('hex');ok(await req('/api/intake/sources',{id:service+'-uncovered',name:'Example uncovered monitoring',provider:'pagerduty',service:service+'-uncovered',key:gapKey,revision:0}),201);
 ok(await req('/v2/enqueue',{routing_key:gapKey,event_action:'trigger',dedup_key:'uncovered',payload:{summary:'Example uncovered response',source:'example-monitor',severity:'critical'}}),202);
 await w.time(start+120000);await tick();const gap=(await read()).incidents.find(i=>i.title==='Example uncovered response');assert.equal(initial(gap).state,'fired');assert.equal(initial(gap).obligation,null);
 const archive=ok(await req('/api/archive'));assert.equal(initial(archive.incidents.find(i=>i.id===incident.id)).state,'cancelled');
 ok(await req('/api/command',{type:'acknowledgment-timeout',service,baseVersion:1,minutes:0}));await send('disabled');assert.equal(initial(await find('disabled')),undefined);
 const pagingAfter=ok(await req('/api/paging/state'));for(const field of ['jobs','receipts','callbacks'])assert.deepEqual(pagingAfter[field],pagingBefore[field]);
 const restored=await req('/api/restore',{mode:'replace',archive});ok(restored);
 console.log('PASS missedAcknowledgmentFlow: initial expiry survives restart and audit rollback, repeated/concurrent cron records once, deadline coverage survives delayed processing, late acknowledgment retains the miss, on-time acknowledgment/recovery/off stop it, uncovered target is explicit, archive accepted, paging OFF');
}
