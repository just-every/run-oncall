import assert from 'node:assert/strict';
import {randomBytes,createHmac,createHash} from 'node:crypto';
import {automationRuntime} from './automation-runtime.mjs';
import {readFile} from 'node:fs/promises';
import {ownerDoor} from './worker.mjs';
// Older sources must never restore an erased automation label through either HTTP door.
const erasureRuntime=await automationRuntime();
try {
 const setup=await erasureRuntime.request('/api/setup',{name:'synthetic-oncall-erasure-owner',password:'synthetic-oncall-erasure-password'});assert.equal(setup.status,200);
 let cookie=setup.cookie;
 const request=(p,d)=>erasureRuntime.request(p,d,cookie),value=async p=>{const r=await request(p);assert.equal(r.status,200);return r.value;};
 const service=await request('/api/command',{type:'service',id:'synthetic-oncall-erasure',name:'synthetic-oncall-erasure',environment:'test',owner:setup.value.member.id,runbook:[],pager:''});assert.equal(service.status,200);
 const door=ownerDoor(erasureRuntime,cookie),plan=await door.preview('opsgenie',await readFile('tests/fixtures/opsgenie.json','utf8'));assert.equal(plan.status,200);assert.equal((await door.apply('opsgenie',plan.value)).status,200);
 const label='alice@example.test automation';
 const client=await request('/api/automation/clients',{name:label,key:randomBytes(32).toString('hex'),services:[service.value.id],permissions:['incidents:read']});assert.equal(client.status,201);
 const checkpoint=await value('/api/recovery/checkpoint'),legacy=await value('/api/recovery/checkpoint?version=1'),archive=await value('/api/archive');
 assert.equal((await request('/api/move-in/erase',{email:'alice@example.test',confirmation:'erase alice@example.test'})).status,200);
 // Receiving an older installation archive can leave custody only in the original journal.
 // The current-checkpoint round trip below then materializes the same fence in the mirror.
 await erasureRuntime.db.prepare('DELETE FROM oc_erasure_fences').run();
 const before=await value('/api/state');
 for(const [path,input] of [['/api/recovery/restore',{mode:'replace',checkpoint}],['/api/recovery/restore',{mode:'replace',checkpoint:legacy}],['/api/restore',{mode:'replace',archive}]]) {
  const result=await request(path,input);
  console.log(JSON.stringify({witness:'automation-erasure-fence',path,status:result.status,labelReturned:JSON.stringify((await erasureRuntime.request('/api/state',undefined,result.cookie??cookie)).value).includes(label)}));
  assert.equal(result.status,409,'older source is refused whole by the erasure fence');assert.match(result.value.error,/erasure fence/i);assert.ok(!JSON.stringify(result.value).includes('alice@example.test'));
  assert.deepEqual(await value('/api/state'),before);
 }
 for(const path of ['/api/state','/api/archive','/api/recovery/checkpoint','/api/automation','/api/audit/export'])assert.ok(!JSON.stringify(await value(path)).includes(label));
 for(const version of [2,1]){const current=await value('/api/recovery/checkpoint?version='+version),restored=await request('/api/recovery/restore',{mode:'replace',checkpoint:current});assert.equal(restored.status,200);cookie=restored.cookie;}
 assert.ok(!JSON.stringify(await value('/api/state')).includes(label));
 const again=await request('/api/recovery/restore',{mode:'replace',checkpoint});assert.equal(again.status,409,'successful current restore retains the fence');
 console.log('PASS OC-053 erasure fence: legacy journal and native custody refuse stale archive/checkpoints atomically; current checkpoint restores and retains custody');
} finally {await erasureRuntime.close();}

const sign=(key,text)=>createHmac('sha256',key).update(text).digest('hex');
const apiKey=randomBytes(32).toString('hex'),firstReceiverKey=randomBytes(32).toString('hex'),seen=[],applied=new Set();let receiverKey=firstReceiverKey,behavior='accepted',release,entered;
const runtime=await automationRuntime(async request=>{
 const raw=await request.text(),body=JSON.parse(raw),timestamp=request.headers.get('x-oncall-timestamp');
 assert.equal(request.headers.get('x-oncall-signature'),sign(receiverKey,timestamp+'.'+raw));
 assert.equal(request.headers.get('x-oncall-operation'),body.operationId);
 assert.deepEqual(Object.keys(body).sort(),['at','incident','operationId','revision','service','state','type']);
 assert.equal(new URL(request.url).hostname,'8.8.8.8');seen.push(body);
 if(behavior==='hold'){entered?.();await new Promise(r=>release=r);}
 if(behavior==='redirect')return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});
 if(behavior==='ambiguous'){applied.add(body.operationId);return new Response(null,{status:200});}
 if(behavior==='retry')return new Response(null,{status:503,headers:{'x-oncall-result':'retry','x-oncall-receipt':sign(receiverKey,body.operationId+'.'+timestamp+'.retry')}});
 applied.add(body.operationId);return new Response(null,{status:200,headers:{'x-oncall-result':'accepted','x-oncall-receipt':sign(receiverKey,body.operationId+'.'+timestamp+'.accepted')}});
});
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
let cookie;
const owner=(path,data)=>runtime.request(path,data,cookie);
const api=(path,data,key=apiKey,replay='synthetic-oncall-'+randomBytes(5).toString('hex'))=>runtime.request('/api/v1/'+path,data,'',{authorization:'Bearer '+key,'idempotency-key':replay});
const state=async()=>ok(await owner('/api/state'));
const sql=(query,...args)=>runtime.db.prepare(query).bind(...args).run();
try {
 const setup=await runtime.request('/api/setup',{name:'Synthetic Owner',password:'synthetic-oncall-owner-password'});cookie=setup.cookie;const admin=ok(setup).member;
 const service=ok(await owner('/api/command',{type:'service',id:'synthetic-oncall-service',name:'Synthetic service',environment:'test',owner:admin.id,runbook:['Inspect'],pager:''}));
 const foreign=ok(await owner('/api/command',{type:'service',id:'synthetic-oncall-foreign',name:'Hidden service',environment:'test',owner:admin.id,runbook:[],pager:''}));
 const allPermissions=['services:read','services:write','schedules:read','schedules:write','incidents:read','incidents:write','actions:read','actions:write','analytics:read','integrations:read'];
 const client=ok(await owner('/api/automation/clients',{name:'Synthetic client',key:apiKey,services:[service.id],permissions:allPermissions}),201);
 for(const url of ['http://8.8.8.8/a','https://127.0.0.1/a','https://10.0.0.1/a','https://169.254.169.254/a','https://localhost/a','https://8.8.8.8/a?token=bad','https://user@8.8.8.8/a'])ok(await owner('/api/automation/endpoints',{name:'Unsafe',key:receiverKey,client:client.id,services:[service.id],url,approve:true}),400);
 const receiverApiKey=randomBytes(32).toString('hex'),receiverClient=ok(await owner('/api/automation/clients',{name:'Receiving access',key:receiverApiKey,services:[service.id],permissions:['incidents:read']}),201);
 let endpoint=ok(await owner('/api/automation/endpoints',{name:'Synthetic receiver',key:receiverKey,client:receiverClient.id,services:[service.id],url:'https://8.8.8.8/events',approve:true}),201);
 ok(await owner('/api/automation/clients/'+client.id+'/rotate',{revision:client.revision,key:apiKey}),409);ok(await owner('/api/automation/endpoints/'+endpoint.id+'/rotate',{revision:endpoint.revision,key:receiverKey,approve:true}),409);assert.equal((await state()).apiClients.find(c=>c.id===client.id).revision,1);assert.equal((await state()).apiEndpoints.find(e=>e.id===endpoint.id).revision,1);
 ok(await runtime.request('/api/v1/incidents'),401);ok(await runtime.request('/api/v1/incidents',undefined,cookie),401);
 const input={type:'declare',service:service.id,title:'Synthetic incident',summary:'Synthetic impact',severity:'warning'};
 const op=ok(await api('incidents',input,apiKey,'synthetic-oncall-repeat'),201);
 assert.deepEqual(ok(await api('incidents',input,apiKey,'synthetic-oncall-repeat')),op);
 ok(await api('incidents',{...input,title:'Changed'},apiKey,'synthetic-oncall-repeat'),409);
 ok(await api('incidents',{...input,service:foreign.id}),404);
 let incident=ok(await api('incidents/'+op.entity));
 assert.equal(incident.timeline[0].actor,client.id);assert.equal((await state()).incidents.length,1);
 // Management remains session-admin-only through every lifecycle/dispatch door.
 const deniedCallers=[{cookie:'',headers:{},status:401},{cookie:'',headers:{authorization:'Bearer '+apiKey},status:401}];
 for(const role of ['viewer','responder']){
  const name='synthetic-oncall-management-'+role,password='synthetic-oncall-management-password';
  ok(await owner('/api/members',{name,role,password}),201);
  const login=await runtime.request('/api/login',{name,password});ok(login);deniedCallers.push({cookie:login.cookie,headers:{},status:403});
 }
 const beforeManagementDenial=await state(),outcome=beforeManagementDenial.apiOutbox[0];
 const managementDoors=[['/api/automation',undefined],['/api/automation/clients',{name:'Denied',key:randomBytes(32).toString('hex'),services:[service.id],permissions:allPermissions}],['/api/automation/clients/'+client.id+'/rotate',{revision:client.revision,key:randomBytes(32).toString('hex')}],['/api/automation/clients/'+client.id+'/revoke',{revision:client.revision}],['/api/automation/endpoints',{name:'Denied',key:randomBytes(32).toString('hex'),client:receiverClient.id,services:[service.id],url:'https://8.8.8.8/events',approve:true}],['/api/automation/endpoints/'+endpoint.id+'/rotate',{revision:endpoint.revision,key:randomBytes(32).toString('hex'),approve:true}],['/api/automation/endpoints/'+endpoint.id+'/revoke',{revision:endpoint.revision}],['/api/automation/dispatch',{}],['/api/automation/outbox/'+outcome.id+'/replay',{revision:outcome.revision,approve:true}]];
 for(const caller of deniedCallers)for(const [path,data] of managementDoors)ok(await runtime.request(path,data,caller.cookie,caller.headers),caller.status);
 for(const path of ['/api/state','/api/export','/api/audit/export'])ok(await runtime.request(path,undefined,'',{authorization:'Bearer '+apiKey}),401);
 const afterManagementDenial=await state();for(const category of ['apiClients','apiEndpoints','apiOutbox','apiOperations','incidents'])assert.deepEqual(afterManagementDenial[category],beforeManagementDenial[category]);assert.equal(seen.length,0);
 console.log('PASS OC-053 management denial: anonymous/token-only 401, viewer/responder 403 across read, create, rotate, revoke, dispatch and replay; token has no session/export/audit door');
 const memberA=ok(await owner('/api/members',{name:'synthetic-oncall-responder-a@example.test',role:'responder',password:'synthetic-oncall-responder-password'}),201);
 const memberB=ok(await owner('/api/members',{name:'synthetic-oncall-responder-b',role:'responder',password:'synthetic-oncall-responder-password'}),201);
 const transition=async(type,extra)=>{const response=ok(await api('incidents',{type,incident:incident.id,revision:incident.revision,...extra}),201);incident=ok(await api('incidents/'+response.entity));return response;};
 ok(await api('incidents',{type:'transition',incident:incident.id,revision:incident.revision,state:'acknowledged',summary:'Machine acknowledgment'}),400);
 await transition('transition',{state:'acknowledged',member:memberA.id,summary:'Client assigns explicit responsibility; no human response claim'});
 assert.equal(incident.assignee,memberA.id);assert.equal(incident.commander,memberA.id);assert.equal(incident.timeline.at(-1).actor,client.id);
 const acknowledgment=structuredClone(incident.timeline.at(-1));assert.equal(acknowledgment.lifecycle.member,memberA.id);
 const machineFacts=ok(await owner('/api/audit/export')).rows.filter(r=>r.kind==='automation.incidents'&&r.outcome==='accepted');assert.equal(machineFacts.length,2);assert.equal(machineFacts[0].actor,machineFacts[1].actor);assert.notEqual(machineFacts[1].actor,ok(await owner('/api/audit/export')).rows.find(r=>r.kind==='command.service').actor);
 const memberLogin=await runtime.request('/api/login',{name:memberA.name,password:'synthetic-oncall-responder-password'});ok(memberLogin);
 incident=ok(await runtime.request('/api/command',{type:'note',incident:incident.id,revision:incident.revision,text:'synthetic-oncall-member-a-note'},memberLogin.cookie));
 const noteFact=ok(await owner('/api/audit/export')).rows.find(r=>r.kind==='command.note'&&r.outcome==='accepted');
 const acknowledgmentFact=machineFacts[1];assert.equal(acknowledgmentFact.namedMember,noteFact.actor);assert.notEqual(acknowledgmentFact.actor,noteFact.actor);assert.ok(!JSON.stringify(acknowledgmentFact).includes(memberA.id));
 ok(await api('incidents',{type:'reassign',incident:incident.id,revision:1,member:admin.id,reason:'Stale'}),409);
 await transition('reassign',{member:memberB.id,reason:'Explicit reassignment'});await transition('assign-role',{role:'commander',member:memberB.id,reason:'Role assignment'});
 assert.equal(incident.assignee,memberB.id);assert.equal(incident.commander,memberB.id);assert.deepEqual(incident.timeline.find(e=>e.id===acknowledgment.id),acknowledgment);assert.ok(!incident.timeline.some(e=>e.kind==='transition'&&e.lifecycle?.to==='acknowledged'&&e.actor===memberA.id));
 assert.deepEqual(ok(await owner('/api/audit/export')).rows.find(r=>r.id===acknowledgmentFact.id),acknowledgmentFact);
 ok(await api('actions',{type:'action',incident:incident.id,revision:incident.revision,title:'Follow up',owner:admin.id,due:'2026-12-01',completionPolicy:'human-review'}),201);incident=ok(await api('incidents/'+incident.id));
 ok(await api('actions',{type:'accept-action',incident:incident.id,revision:incident.revision,action:incident.actions[0].id,reason:'Not a human'}),403);
 ok(await api('actions',{type:'complete',incident:incident.id,revision:incident.revision,action:incident.actions[0].id,evidence:'https://example.test/machine-review'}),403);
 ok(await api('actions',{type:'action',incident:incident.id,revision:incident.revision,title:'Automation evidence claim',owner:admin.id,due:'2026-12-01',completionPolicy:'evidence'}),201);incident=ok(await api('incidents/'+incident.id));
 ok(await api('actions',{type:'complete',incident:incident.id,revision:incident.revision,action:incident.actions[1].id,evidence:'https://example.test/automation-claim'}),201);incident=ok(await api('incidents/'+incident.id));
 assert.equal(incident.actions[1].submission.by,client.id);assert.equal(incident.actions[1].accepted.by,client.id);assert.equal(incident.timeline.at(-1).actor,client.id);assert.equal(incident.actions[0].done,false);
 await transition('transition',{state:'recovered',summary:'Recovery evidence recorded',evidence:'https://example.test/evidence'});await transition('transition',{state:'resolved',summary:'Resolved with evidence'});
 assert.deepEqual(incident.timeline.find(e=>e.id===acknowledgment.id),acknowledgment);assert.deepEqual(ok(await owner('/api/audit/export')).rows.find(r=>r.id===acknowledgmentFact.id),acknowledgmentFact);
 console.log('PASS OC-053 permanent named responder: service-account acknowledgment names A; reassignment and new commander B and resolution preserve timeline and pseudonymous audit attribution');
 for(let n=0;n<3;n++)ok(await api('incidents',{...input,title:'Synthetic page '+n}),201);
 const page=ok(await api('incidents?limit=2'));assert.equal(page.data.length,2);assert.ok(page.nextCursor);const page2=ok(await api('incidents?limit=2&cursor='+encodeURIComponent(page.nextCursor)));assert.equal(new Set([...page.data,...page2.data].map(i=>i.id)).size,4);
 for(const family of ['services','schedules','actions','analytics','integrations'])assert.ok(Array.isArray(ok(await api(family)).data));
 ok(await api('services/'+foreign.id),404);ok(await api('incidents?service='+foreign.id),404);ok(await api('incidents?limit=101'),400);ok(await api('services?cursor='+encodeURIComponent(page.nextCursor)),409);
 const storedService=await api('services/'+service.id);ok(storedService);
 const etag=storedService.headers.get('etag').replaceAll('"','');
 ok(await api('services',{...service,type:'service',etag,dependencies:[foreign.id]}),404);
 ok(await api('services',{...service,type:'service',etag,name:'Updated service'}),201);ok(await api('services',{...service,type:'service',etag}),409);
 const schedule={id:'synthetic-oncall-schedule',name:'Synthetic rota',service:service.id,revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[admin.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]};
 ok(await api('schedules',schedule),201);ok(await api('schedules',schedule),409);assert.equal(ok(await api('schedules/'+schedule.id)).revision,1);
 const snapshot=await state();assert.ok(snapshot.apiOutbox.every(o=>o.owner===admin.id&&Number.isFinite(Date.parse(o.due))),'every durable delivery has its named owner and due time');assert.equal(snapshot.apiOutbox.length,11);assert.deepEqual(new Set(snapshot.apiOutbox.map(o=>o.event)),new Set(['trigger','acknowledgment','reassignment','role','follow-up','resolution']));
 await runtime.restart();const committedLogin=await runtime.request('/api/login',{name:'Synthetic Owner',password:'synthetic-oncall-owner-password'});ok(committedLogin);cookie=committedLogin.cookie;assert.deepEqual((await state()).apiOutbox,snapshot.apiOutbox,'restart after domain commit retains queued operations exactly');
 const scheduled=await fetch(runtime.origin+'/cdn-cgi/local/scheduled');assert.equal(scheduled.status,200);await scheduled.text();assert.equal((await state()).apiOutbox.filter(o=>o.status==='sent').length,10,'one scheduled step is bounded to ten deliveries');const nextScheduled=await fetch(runtime.origin+'/cdn-cgi/local/scheduled');assert.equal(nextScheduled.status,200);await nextScheduled.text();assert.ok((await state()).apiOutbox.every(o=>o.status==='sent'),'scheduled handler dispatches the durable batch without a browser');
 assert.equal(applied.size,11);assert.equal((await state()).incidents.length,4);
 receiverKey=randomBytes(32).toString('hex');endpoint=ok(await owner('/api/automation/endpoints/'+endpoint.id+'/rotate',{revision:endpoint.revision,key:receiverKey,approve:true}));
 // Real foreign records never appear through direct IDs, pagination or linked mutations.
 let hidden=ok(await owner('/api/command',{...input,service:foreign.id,title:'Hidden incident'}));hidden=ok(await owner('/api/command',{type:'action',incident:hidden.id,revision:hidden.revision,title:'Hidden action',owner:admin.id,due:'2026-12-01'}));
 ok(await owner('/api/paging/schedules',{...schedule,id:'synthetic-oncall-hidden-schedule',service:foreign.id}));
 ok(await owner('/api/sources',{id:'synthetic-oncall-hidden-source',key:randomBytes(32).toString('hex'),mode:'bearer',scopes:[foreign.id]}));
 await sql('INSERT INTO sources(id,digest,scopes) VALUES(?,?,?)','synthetic-oncall-unscoped-source',createHash('sha256').update(randomBytes(32)).digest('hex'),'[]');
 const probeKey=randomBytes(32).toString('hex');ok(await owner('/api/automation/clients',{name:'Scoped isolation probe',key:probeKey,services:[service.id],permissions:allPermissions}),201);
 for(const [family,id] of [['services',foreign.id],['incidents',hidden.id],['actions',hidden.actions[0].id],['schedules','synthetic-oncall-hidden-schedule'],['analytics',foreign.id],['integrations','native:synthetic-oncall-hidden-source'],['integrations','native:synthetic-oncall-unscoped-source']])ok(await api(family+'/'+id,undefined,probeKey),404);
 const visible=ok(await api('incidents?limit=100',undefined,probeKey));assert.equal(visible.data.length,4);assert.equal(visible.nextCursor,null);assert.equal(ok(await api('analytics',undefined,probeKey)).data[0].incidents,4);assert.equal(ok(await api('integrations',undefined,probeKey)).data.length,0);
 const beforeForeign=await state();ok(await api('incidents',{type:'transition',incident:hidden.id,revision:hidden.revision,state:'acknowledged',member:admin.id,summary:'Forbidden'},probeKey),404);ok(await api('actions',{type:'action',incident:hidden.id,revision:hidden.revision,title:'Forbidden',owner:admin.id,due:'2026-12-01'},probeKey),404);ok(await api('schedules',{...schedule,id:'synthetic-oncall-hidden-schedule',revision:1},probeKey),404);assert.deepEqual((await state()).incidents,beforeForeign.incidents);assert.deepEqual((await state()).apiOutbox,beforeForeign.apiOutbox);assert.deepEqual((await state()).apiOperations,beforeForeign.apiOperations);
 // Audit failure rolls back the incident, operation receipt and enqueue together.
 const before=await state(),factsBeforeFault=ok(await owner('/api/audit/export')).rows.filter(r=>r.kind==='automation.incidents'&&r.outcome==='accepted');await sql("CREATE TRIGGER synthetic_api_audit_fault BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='automation.incidents' BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END");
 ok(await api('incidents',{...input,title:'Must roll back'}),503);
 const unacknowledged=before.incidents.find(i=>i.state==='declared'&&i.service===service.id);
 ok(await api('incidents',{type:'transition',incident:unacknowledged.id,revision:unacknowledged.revision,state:'acknowledged',member:memberA.id,summary:'Must roll back named responsibility'}),503);await sql('DROP TRIGGER synthetic_api_audit_fault');
 assert.deepEqual(ok(await owner('/api/audit/export')).rows.filter(r=>r.kind==='automation.incidents'&&r.outcome==='accepted'),factsBeforeFault);
 const after=await state();assert.deepEqual(after.incidents,before.incidents);assert.deepEqual(after.apiOutbox,before.apiOutbox);assert.deepEqual(after.apiOperations,before.apiOperations);
 // Receiver commit without an authenticated receipt is uncertain; protected replay deduplicates.
 ok(await api('incidents',{...input,title:'Ambiguous send'}),201);behavior='ambiguous';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'uncertain');
 const uncertain=(await state()).apiOutbox.at(-1),count=applied.size,incidentCount=(await state()).incidents.length;
 await runtime.restart();const loggedIn=await runtime.request('/api/login',{name:'Synthetic Owner',password:'synthetic-oncall-owner-password'});ok(loggedIn);cookie=loggedIn.cookie;
 assert.equal(ok(await owner('/api/automation/dispatch',{})).processed,0);
 ok(await owner('/api/automation/outbox/'+uncertain.id+'/replay',{revision:uncertain.revision,approve:true}));behavior='accepted';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'sent');assert.equal(applied.size,count);assert.equal((await state()).incidents.length,incidentCount);
 // Signed retry is due-bounded; redirects never reach their target.
 ok(await api('incidents',{...input,title:'Retry later'}),201);behavior='retry';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'failed');assert.equal(ok(await owner('/api/automation/dispatch',{})).processed,0);
 const failed=(await state()).apiOutbox.at(-1);assert.ok(Date.parse(failed.due)>Date.now());ok(await owner('/api/automation/outbox/'+failed.id+'/replay',{revision:failed.revision,approve:true}));behavior='redirect';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');
 // A failed durable lease commit cannot leak a network effect.
 ok(await api('incidents',{...input,title:'Lease rollback'}),201);const beforeLease=seen.length;
 await sql("CREATE TRIGGER synthetic_dispatch_fault BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='automation.dispatch' BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END");
 ok(await owner('/api/automation/dispatch',{}),503);assert.equal(seen.length,beforeLease);assert.equal((await state()).apiOutbox.at(-1).status,'queued');await sql('DROP TRIGGER synthetic_dispatch_fault');
 behavior='retry';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'failed');
 for(let attempt=2;attempt<=5;attempt++){const item=(await state()).apiOutbox.at(-1);ok(await owner('/api/automation/outbox/'+item.id+'/replay',{revision:item.revision,approve:true}));assert.equal(ok(await owner('/api/automation/dispatch',{})).status,attempt===5?'terminal':'failed');}
 const exhausted=(await state()).apiOutbox.at(-1);assert.equal(exhausted.attempts,5);ok(await owner('/api/automation/outbox/'+exhausted.id+'/replay',{revision:exhausted.revision,approve:true}),409);
 // Unreadable local custody is durable and never causes a network request.
 ok(await api('incidents',{...input,title:'Unreadable signing custody'}),201);const savedCustody=await runtime.db.prepare('SELECT custody FROM oc_endpoint_credentials WHERE endpoint=?').bind(endpoint.id).first(),beforeCustody=seen.length;
 await sql('UPDATE oc_endpoint_credentials SET custody=? WHERE endpoint=?','invalid',endpoint.id);assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');assert.equal((await state()).apiOutbox.at(-1).history.at(-1).reason,'credential-unavailable');assert.equal(seen.length,beforeCustody);await sql('UPDATE oc_endpoint_credentials SET custody=? WHERE endpoint=?',savedCustody.custody,endpoint.id);
 // Interrupt the actual emitted runtime with a receiver request in flight.
 ok(await api('incidents',{...input,title:'Interrupted sender'}),201);behavior='hold';
 const atReceiver=new Promise(r=>entered=r),inFlight=owner('/api/automation/dispatch',{}).catch(()=>null);await atReceiver;
 const leased=(await state()).apiOutbox.at(-1);assert.equal(leased.status,'sending');assert.ok(leased.lease);
 const restarting=runtime.restart();release();await restarting;await inFlight;
 const restartLogin=await runtime.request('/api/login',{name:'Synthetic Owner',password:'synthetic-oncall-owner-password'});ok(restartLogin);cookie=restartLogin.cookie;
 const retained=(await state()).apiOutbox.find(o=>o.id===leased.id);
 if(retained.status==='sending') {await new Promise(r=>setTimeout(r,Math.max(0,Date.parse(retained.leaseUntil)-Date.now()+25)));assert.equal(ok(await owner('/api/automation/dispatch',{})).processed,0);assert.equal((await state()).apiOutbox.find(o=>o.id===leased.id).status,'uncertain');}
 else assert.equal(retained.status,'uncertain','a lost response cannot claim a completed send');
 const interrupted=(await state()).apiOutbox.find(o=>o.id===leased.id);const domainCount=(await state()).incidents.length;
 ok(await owner('/api/automation/outbox/'+interrupted.id+'/replay',{revision:interrupted.revision,approve:true}));behavior='accepted';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'sent');assert.equal((await state()).incidents.length,domainCount);
 // Revoke queued endpoint authority before dispatch.
 ok(await api('incidents',{...input,title:'Revoked destination'}),201);ok(await owner('/api/automation/endpoints/'+endpoint.id+'/revoke',{revision:endpoint.revision}));const beforeRefusal=seen.length;assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');assert.equal(seen.length,beforeRefusal);
 // Renew the endpoint, enqueue, then revoke the originating and receiving client.
 ok(await owner('/api/automation/endpoints/'+endpoint.id+'/rotate',{revision:endpoint.revision+1,key:receiverKey,approve:true}));ok(await api('incidents',{...input,title:'Revoked queued receiver'}),201);
 ok(await owner('/api/automation/clients/'+receiverClient.id+'/revoke',{revision:receiverClient.revision}));assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');assert.equal(seen.length,beforeRefusal);
 ok(await owner('/api/automation/clients/'+receiverClient.id+'/rotate',{revision:receiverClient.revision+1,key:receiverApiKey}));ok(await api('incidents',{...input,title:'Revoked queued client'}),201);
 // Revocation applies to reads, writes and existing operation replay.
 ok(await owner('/api/automation/clients/'+client.id+'/revoke',{revision:client.revision}));ok(await api('incidents'),401);ok(await api('incidents',input,apiKey,'synthetic-oncall-repeat'),401);assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');assert.equal(seen.length,beforeRefusal);
 const readKey=randomBytes(32).toString('hex');const reader=ok(await owner('/api/automation/clients',{name:'Reader',key:readKey,services:[service.id],permissions:['incidents:read']}),201);ok(await api('incidents',input,readKey),403);ok(await api('services',undefined,readKey),403);
 let limited=false;const windows=new Map();for(let n=0;n<130;n++){const window=Math.floor(Date.now()/60000),result=await api('incidents',undefined,readKey);if(result.status===429){limited=true;assert.ok(Number(result.headers.get('retry-after'))>=1);break;}ok(result);if(window===Math.floor(Date.now()/60000)){windows.set(window,(windows.get(window)??0)+1);assert.ok(windows.get(window)<=60,'no client receives more than 60 reads in one minute window');}}assert.ok(limited,'rate refusal occurs even when the journey straddles a minute boundary');
 const rotatedKey=randomBytes(32).toString('hex');ok(await owner('/api/automation/clients/'+reader.id+'/rotate',{revision:reader.revision,key:rotatedKey}));ok(await api('incidents',undefined,readKey),401);ok(await api('incidents',undefined,rotatedKey));
 // Creator custody is independent for origin, endpoint and receiving-client owners.
 const custodyService=ok(await owner('/api/command',{type:'service',id:'synthetic-oncall-custody',name:'synthetic-oncall-custody',environment:'test',owner:admin.id,runbook:[],pager:''}));
 for(const removal of [false,true])for(const custody of ['origin','endpoint','receiver']) {
  const name='synthetic-oncall-'+custody+'-'+removal,password='synthetic-oncall-custody-password';
  const creator=ok(await owner('/api/members',{name,role:'admin',password}),201),login=await runtime.request('/api/login',{name,password});ok(login);
  const creatorRequest=(p,d)=>runtime.request(p,d,login.cookie),ownedKey=randomBytes(32).toString('hex'),independentKey=randomBytes(32).toString('hex');
  const owned=ok(await creatorRequest('/api/automation/clients',{name,key:ownedKey,services:[custodyService.id],permissions:['incidents:read','incidents:write']}),201);
  const independent=ok(await owner('/api/automation/clients',{name:'synthetic-oncall-independent',key:independentKey,services:[custodyService.id],permissions:['incidents:read','incidents:write']}),201);
  const destination=ok(await (custody==='endpoint'?creatorRequest:owner)('/api/automation/endpoints',{name,key:receiverKey,client:custody==='receiver'?owned.id:independent.id,services:[custodyService.id],url:'https://8.8.8.8/events',approve:true}),201);
  const command={...input,service:custodyService.id,title:name};
  ok(await api('incidents',command,custody==='origin'?ownedKey:independentKey),201);
  const queued=(await state()).apiOutbox.at(-1);assert.equal(queued.endpoint,destination.id);
  ok(await owner('/api/command',{type:'member',id:creator.id,role:removal?'admin':'responder',active:!removal}));
  const beforeDenied=await state();ok(await api('incidents',undefined,ownedKey),401);ok(await api('incidents',command,ownedKey),401);
  assert.deepEqual((await state()).incidents,beforeDenied.incidents);assert.deepEqual((await state()).apiOperations,beforeDenied.apiOperations);
  const sends=seen.length;assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');assert.equal(seen.length,sends);
  const stopped=(await state()).apiOutbox.find(o=>o.id===queued.id);assert.equal(stopped.history.at(-1).reason,'authority-revoked');
  ok(await owner('/api/automation/outbox/'+stopped.id+'/replay',{revision:stopped.revision,approve:true}),403);
  assert.equal((await state()).apiClients.find(c=>c.id===owned.id).owner,creator.id);assert.equal((await state()).apiEndpoints.find(e=>e.id===destination.id).owner,custody==='endpoint'?creator.id:admin.id);
  await runtime.restart();const loginAgain=await runtime.request('/api/login',{name:'Synthetic Owner',password:'synthetic-oncall-owner-password'});ok(loginAgain);cookie=loginAgain.cookie;
  ok(await api('incidents',undefined,ownedKey),401);ok(await api('incidents',command,ownedKey),401);assert.equal(ok(await owner('/api/automation/dispatch',{})).processed,0);
  ok(await owner('/api/automation/endpoints/'+destination.id+'/revoke',{revision:destination.revision}));
  // A named responder losing membership never becomes a valid machine acknowledgment.
  if(custody==='origin') {
   const responsible=ok(await owner('/api/members',{name:'synthetic-oncall-responsible-'+removal,role:'responder',password}),201);
   const target=ok(await api('incidents',command,independentKey),201);
   ok(await owner('/api/command',{type:'member',id:responsible.id,role:removal?'responder':'viewer',active:!removal}));
   const prior=await state();ok(await api('incidents',{type:'transition',incident:target.entity,revision:1,state:'acknowledged',member:responsible.id,summary:'Inactive responsible member'},independentKey),400);assert.deepEqual((await state()).incidents,prior.incidents);
  }
 }
 console.log('PASS OC-053 creator demotion/removal: next read/write and origin/endpoint/receiver dispatch refused, no authority transfer, restart, inactive responder acknowledgment refused');
 // Imported-person erasure removes the timeline display reference and the
 // revocable member association, leaving the permanent named-member fact intact.
 const eraseDoor=ownerDoor(runtime,cookie),erasePlan=ok(await eraseDoor.preview('opsgenie',JSON.stringify({users:{data:[{id:'synthetic-oncall-responder-a',username:memberA.name,fullName:'synthetic-oncall-responder-a'}]}})));ok(await eraseDoor.apply('opsgenie',erasePlan));
 ok(await owner('/api/move-in/erase',{email:memberA.name,confirmation:'erase '+memberA.name}));
 assert.equal((await state()).incidents.find(i=>i.id===incident.id).timeline.find(e=>e.id===acknowledgment.id).lifecycle.member,null);
 const erasedAudit=ok(await owner('/api/audit/export')).rows;assert.deepEqual(erasedAudit.find(r=>r.id===acknowledgmentFact.id),acknowledgmentFact);assert.ok(!JSON.stringify(erasedAudit).includes(memberA.name));assert.ok(!JSON.stringify(erasedAudit).includes(memberA.id));
 assert.equal(await runtime.db.prepare('SELECT label FROM oc_audit_identities WHERE kind=? AND entity_id=?').bind('member',memberA.id).first(),null);
 const scrubbed=(await state()).incidents.find(i=>i.id===incident.id);
 ok(await runtime.request('/api/command',{type:'note',incident:incident.id,revision:scrubbed.revision,text:'synthetic-oncall-new-act-after-erasure'},memberLogin.cookie));
 const newMemberFact=ok(await owner('/api/audit/export')).rows.filter(r=>r.kind==='command.note'&&r.outcome==='accepted').at(-1);assert.notEqual(newMemberFact.actor,acknowledgmentFact.namedMember);assert.deepEqual(ok(await owner('/api/audit/export')).rows.find(r=>r.id===acknowledgmentFact.id),acknowledgmentFact);
 console.log('PASS OC-053 named-responder erasure: timeline association scrubbed, permanent pseudonymous audit fact unchanged, no reassigned label');
 // Populated native archive and checkpoint preserve exact history, omit credentials and restore inactive.
 ok(await owner('/api/command',{...input,title:'Queued at export'}));assert.equal((await state()).apiOutbox.at(-1).status,'queued');
 const archive=ok(await owner('/api/archive')),checkpoint=ok(await owner('/api/recovery/checkpoint'));
 for(const secret of [apiKey,firstReceiverKey,receiverKey,readKey,rotatedKey,probeKey,receiverApiKey,savedCustody.custody])assert.ok(!JSON.stringify([archive,checkpoint,ok(await owner('/api/audit/export'))]).includes(secret));
 assert.ok(archive.apiClients.find(c=>c.id===reader.id).lastUsed);
 const malformed=structuredClone(archive);malformed.apiOutbox[0].payload.secret='not-authorized';const retainedBefore=await state();ok(await owner('/api/restore',{mode:'replace',archive:malformed,adminMapping:admin.id}),400);assert.deepEqual((await state()).incidents,retainedBefore.incidents);assert.deepEqual((await state()).apiOutbox,retainedBefore.apiOutbox);
 const limitArchive=structuredClone(archive);while(limitArchive.apiOperations.length<1000){const n=limitArchive.apiOperations.length;limitArchive.apiOperations.push({...op,id:'synthetic-oncall-receipt-'+n,key:createHash('sha256').update('synthetic-oncall-receipt-'+n).digest('hex')});}
 const fresh=await automationRuntime();try{const setup2=await fresh.request('/api/setup',{name:'Fresh Owner',password:'synthetic-oncall-fresh-password'});const ck=setup2.cookie;ok(setup2);const restored=await fresh.request('/api/restore',{mode:'replace',archive:limitArchive,adminMapping:admin.id},ck);ok(restored);const held=ok(await fresh.request('/api/state',undefined,restored.cookie));assert.deepEqual(held.apiOperations,limitArchive.apiOperations);assert.deepEqual(held.erasureFences,limitArchive.erasureFences,'fresh native receiving preserves digest custody without an existing journal');assert.deepEqual(held.apiOutbox.map(o=>o.id),archive.apiOutbox.map(o=>o.id));assert.ok(held.apiClients.every(c=>!c.active));assert.ok(held.apiEndpoints.every(e=>!e.active));assert.ok(held.apiOutbox.every(o=>!o.authorized));for(const original of archive.apiOutbox){const received=held.apiOutbox.find(o=>o.id===original.id);assert.deepEqual(received.payload,original.payload);assert.deepEqual(received.history.slice(0,original.history.length),original.history);if(original.status==='queued'){assert.equal(received.status,'interrupted');assert.equal(received.history.at(-1).reason,'restore-requires-authorization');}else assert.equal(received.status,original.status);}assert.equal((await fresh.db.prepare('SELECT COUNT(*) AS n FROM oc_api_credentials').first()).n,0);assert.equal((await fresh.db.prepare('SELECT COUNT(*) AS n FROM oc_endpoint_credentials').first()).n,0);ok(await fresh.request('/api/v1/incidents',undefined,'',{authorization:'Bearer '+rotatedKey}),401);assert.equal(ok(await fresh.request('/api/automation/dispatch',{},restored.cookie)).processed,0);const limitKey=randomBytes(32).toString('hex');ok(await fresh.request('/api/automation/clients/'+client.id+'/rotate',{revision:held.apiClients.find(c=>c.id===client.id).revision,key:limitKey},restored.cookie));
 const bounded=(p,d,key)=>fresh.request('/api/v1/'+p,d,'',{authorization:'Bearer '+limitKey,'idempotency-key':key});
 const atLimit=ok(await fresh.request('/api/state',undefined,restored.cookie));assert.deepEqual(ok(await bounded('incidents',input,'synthetic-oncall-repeat')),op);ok(await bounded('incidents',{...input,title:'synthetic-oncall-over-receipt-capacity'},'synthetic-oncall-new-receipt'),429);const afterLimit=ok(await fresh.request('/api/state',undefined,restored.cookie));assert.deepEqual(afterLimit.incidents,atLimit.incidents);assert.deepEqual(afterLimit.apiOperations,atLimit.apiOperations);assert.deepEqual(afterLimit.apiOutbox,atLimit.apiOutbox);
 ok(await fresh.request('/api/command',{...input,title:'synthetic-oncall-human-at-receipt-capacity'},restored.cookie));console.log('PASS OC-053 lifetime API receipts: full history refuses new machine mutation, identical authorized retry retains receipt, human coordination continues');}finally{await fresh.close();}
 console.log('PASS OC-053 scoped API, atomic signed outbox, receipt uncertainty, replay, revocation and inactive native restore');
} finally {release?.();await runtime.close();}

// The existing automation journey continues with a populated-history installation.
// Synthetic retained records enter only through the real, strict restore door;
// every new human mutation, replay and dispatch uses HTTP and actual D1 storage.
const capacity=await automationRuntime(async request=>{
 const raw=await request.text(),body=JSON.parse(raw),timestamp=request.headers.get('x-oncall-timestamp');
 assert.deepEqual(Object.keys(body).sort(),['at','incident','operationId','revision','service','state','type']);
 assert.equal(request.headers.get('x-oncall-signature'),sign(capacityKey,timestamp+'.'+raw));
 return new Response(null,{status:200,headers:{'x-oncall-result':'accepted','x-oncall-receipt':sign(capacityKey,body.operationId+'.'+timestamp+'.accepted')}});
});
const capacityKey=randomBytes(32).toString('hex');
try {
 const setup=await capacity.request('/api/setup',{name:'synthetic-oncall-capacity-owner',password:'synthetic-oncall-capacity-password'}),admin=ok(setup).member;
 let adminCookie=setup.cookie;
 const manage=(p,d)=>capacity.request(p,d,adminCookie),read=async()=>ok(await manage('/api/state'));
 const service=ok(await manage('/api/command',{type:'service',id:'synthetic-oncall-capacity',name:'synthetic-oncall-capacity',environment:'test',owner:admin.id,runbook:[],pager:''}));
 const responder=ok(await manage('/api/members',{name:'synthetic-oncall-capacity-responder',role:'responder',password:'synthetic-oncall-capacity-responder-password'}),201);
 const client=ok(await manage('/api/automation/clients',{name:'synthetic-oncall-capacity',key:randomBytes(32).toString('hex'),services:[service.id],permissions:['incidents:read']}),201);
 const endpoint=ok(await manage('/api/automation/endpoints',{name:'synthetic-oncall-capacity',key:capacityKey,client:client.id,services:[service.id],url:'https://8.8.8.8/events',approve:true}),201);
 let incident=ok(await manage('/api/command',{type:'declare',service:service.id,title:'synthetic-oncall-capacity',summary:'Synthetic retained history',severity:'warning'}));
 const fixture=ok(await manage('/api/archive')),template=fixture.apiOutbox[0],entry=incident.timeline[0];
 fixture.apiOutbox=[];fixture.incidents[0].timeline=[];
 for(let n=0;n<1001;n++) {
  const id='synthetic-oncall-history-'+n,entryId='synthetic-oncall-entry-'+n;
  fixture.incidents[0].timeline.push({...entry,id:entryId});
  fixture.apiOutbox.push({...template,id,entry:entryId,status:'terminal',attempts:1,revision:3,history:[...template.history,{at:template.at,status:'sending',reason:'dispatch'},{at:template.at,status:'terminal',reason:'receiver-refused'}],payload:{...template.payload,operationId:id}});
 }
 const restored=await manage('/api/restore',{mode:'replace',archive:fixture});ok(restored);adminCookie=restored.cookie;
 assert.deepEqual((await read()).apiOutbox.map(o=>o.history),fixture.apiOutbox.map(o=>o.history));
 ok(await manage('/api/automation/clients/'+client.id+'/rotate',{revision:client.revision,key:randomBytes(32).toString('hex')}));
 ok(await manage('/api/automation/endpoints/'+endpoint.id+'/rotate',{revision:endpoint.revision,key:capacityKey,approve:true}));
 ok(await manage('/api/password',{member:responder.id,password:'synthetic-oncall-capacity-responder-password'}));
 let login=await capacity.request('/api/login',{name:responder.name,password:'synthetic-oncall-capacity-responder-password'});ok(login);
 let responderCookie=login.cookie;
 const human=(p,d)=>capacity.request(p,d,responderCookie);
 const audit=async()=>ok(await manage('/api/audit/export')).rows;
 const act=async data=>{
  const before=await read(),old=before.incidents.find(i=>i.id===incident.id),facts=await audit();
  const input={...data,incident:incident.id,revision:old.revision},response=await human('/api/command',input);
  incident=ok(response);const after=await read(),newFacts=(await audit()).filter(row=>!facts.some(old=>old.id===row.id)&&row.kind==='command.'+data.type&&row.outcome==='accepted');
  assert.equal(incident.revision,old.revision+1);assert.equal(incident.timeline.length,old.timeline.length+1);assert.equal(newFacts.length,1,'one permanent accepted command fact');
  const outcomes=after.apiOutbox.slice(before.apiOutbox.length);assert.equal(outcomes.length,1,'exactly one durable event for the approved recipient');
  assert.deepEqual(after.apiOutbox.slice(0,before.apiOutbox.length),before.apiOutbox,'existing work is never evicted or duplicated');
  console.log(JSON.stringify({witness:'human-capacity',request:'/api/command',type:data.type,status:response.status,before:{incidentRevision:old.revision,events:before.apiOutbox.length},after:{incidentRevision:incident.revision,events:after.apiOutbox.length,acceptedAuditFacts:newFacts.length,outcome:outcomes[0].status,reason:outcomes[0].history.at(-1).reason}}));
  return outcomes[0];
 };
 assert.equal((await act({type:'assign-role',role:'scribe',member:responder.id,reason:'Completed history does not block coordination'})).status,'queued');
 assert.equal(ok(await manage('/api/automation/dispatch',{})).status,'sent');
 // Fill genuinely unfinished work through the authenticated human command door.
 for(let n=0;n<1000;n++)incident=ok(await human('/api/command',{type:'assign-role',incident:incident.id,revision:incident.revision,role:'scribe',member:responder.id,reason:'Synthetic unfinished capacity '+n}));
 const full=await read();assert.equal(full.apiOutbox.filter(o=>['queued','sending','failed'].includes(o.status)).length,1000);
 const overflow=await act({type:'transition',state:'acknowledged',summary:'Human coordination continues with a full queue'});
 assert.equal(overflow.status,'terminal');assert.equal(overflow.history[0].reason,'capacity-not-scheduled');assert.equal(overflow.attempts,0);
 ok(await manage('/api/automation/outbox/'+overflow.id+'/replay',{revision:overflow.revision,approve:true}),429);
 assert.equal((await act({type:'reassign',member:responder.id,reason:'A subsequent command also survives capacity'})).status,'terminal');
 await act({type:'assign-role',role:'scribe',member:responder.id,reason:'Role custody at capacity'});
 await act({type:'action',title:'synthetic-oncall-follow-up',owner:responder.id,due:'2026-12-01',completionPolicy:'human-review'});
 await act({type:'complete',action:incident.actions[0].id,evidence:'https://example.test/capacity'});
 await act({type:'accept-action',action:incident.actions[0].id,reason:'Actual human acceptance'});
 incident=ok(await human('/api/command',{type:'transition',incident:incident.id,revision:incident.revision,state:'recovered',summary:'Observed recovery',evidence:'https://example.test/recovery'}));
 await act({type:'transition',state:'resolved',summary:'Human resolution with full delivery backlog'});
 const declared=ok(await human('/api/command',{type:'declare',service:service.id,title:'synthetic-oncall-bulk',summary:'Full queue declaration',severity:'warning'}));
 assert.equal((await read()).apiOutbox.at(-1).history[0].reason,'capacity-not-scheduled');
 for(const action of ['acknowledge','resolve']) {
  const beforeBulk=await read(),current=beforeBulk.incidents.find(i=>i.id===declared.id);
  const result=ok(await human('/api/triage/bulk',{operationId:'synthetic-oncall-capacity-'+action,action,items:[{id:current.id,revision:current.revision}],reason:'Synthetic bulk coordination',summary:'Synthetic bulk coordination',evidence:'https://example.test/recovery'}));
  assert.equal(result.results[0].ok,true,JSON.stringify(result));const afterBulk=await read();assert.equal(afterBulk.apiOutbox.length,beforeBulk.apiOutbox.length+1);assert.equal(afterBulk.apiOutbox.at(-1).history[0].reason,'capacity-not-scheduled');assert.equal(afterBulk.apiOutbox.at(-1).entry,afterBulk.incidents.find(i=>i.id===declared.id).timeline.at(-1).id);assert.deepEqual(afterBulk.apiOutbox.slice(0,-1),beforeBulk.apiOutbox);
 }
 // A second recipient at the boundary gets its own explicit outcome.
 const second=ok(await manage('/api/automation/endpoints',{name:'synthetic-oncall-second',key:capacityKey,client:client.id,services:[service.id],url:'https://8.8.8.8/events',approve:true}),201);
 assert.equal(ok(await manage('/api/automation/dispatch',{})).status,'sent');
 const beforeBoundary=await read();
 incident=ok(await human('/api/command',{type:'assign-role',incident:incident.id,revision:incident.revision,role:'scribe',member:responder.id,reason:'One free delivery slot, two recipients'}));
 const boundary=(await read()).apiOutbox.slice(beforeBoundary.apiOutbox.length);assert.deepEqual(boundary.map(o=>o.status),['queued','terminal']);assert.equal(boundary[1].endpoint,second.id);
 // Storage failure still rolls back incident, audit and the capacity outcome.
 const beforeFailure=await read(),auditBeforeFailure=await audit();
 await capacity.db.prepare("CREATE TRIGGER synthetic_capacity_fault BEFORE INSERT ON oc_api_outbox BEGIN SELECT RAISE(ABORT,'synthetic outbox storage failure'); END").run();
 ok(await human('/api/command',{type:'assign-role',incident:incident.id,revision:incident.revision,role:'scribe',member:responder.id,reason:'Must roll back'}),503);
 await capacity.db.prepare('DROP TRIGGER synthetic_capacity_fault').run();
 assert.deepEqual((await read()).incidents,beforeFailure.incidents);assert.deepEqual((await read()).apiOutbox,beforeFailure.apiOutbox);
 assert.equal((await audit()).filter(x=>!auditBeforeFailure.some(y=>x.id===y.id)&&x.kind==='command.assign-role'&&x.outcome==='accepted').length,0);
 // Restart preserves overflow and backlog. Replay keeps identity and never mutates the incident.
 const retained=await read();await capacity.restart();const adminLogin=await capacity.request('/api/login',{name:admin.name,password:'synthetic-oncall-capacity-password'});ok(adminLogin);adminCookie=adminLogin.cookie;
 assert.deepEqual((await read()).apiOutbox,retained.apiOutbox);
 assert.equal(ok(await manage('/api/automation/dispatch',{})).status,'sent');
 const domainBefore=(await read()).incidents;ok(await manage('/api/automation/outbox/'+overflow.id+'/replay',{revision:overflow.revision,approve:true}));assert.deepEqual((await read()).incidents,domainBefore);
 // Checkpoint is the bounded larger native envelope; portable transfer is also exercised below.
 const checkpoint=ok(await manage('/api/recovery/checkpoint'));
 const destination=await automationRuntime();try {
  const fresh=await destination.request('/api/setup',{name:'synthetic-oncall-destination',password:'synthetic-oncall-destination-password'});ok(fresh);
  const response=await destination.request('/api/recovery/restore',{mode:'replace',checkpoint,adminMapping:admin.id},fresh.cookie);ok(response);
  const held=ok(await destination.request('/api/state',undefined,response.cookie));
  for(const original of checkpoint.coordination.apiOutbox){const received=held.apiOutbox.find(o=>o.id===original.id);assert.deepEqual(received.payload,original.payload);assert.deepEqual(received.history.slice(0,original.history.length),original.history);assert.equal(received.authorized,false);if(original.status==='terminal')assert.equal(received.status,'terminal');}
  assert.ok(held.apiClients.every(c=>!c.active));assert.ok(held.apiEndpoints.every(e=>!e.active));assert.equal(ok(await destination.request('/api/automation/dispatch',{},response.cookie)).processed,0);
  const bad=structuredClone(checkpoint);bad.coordination.apiOutbox[0].entry='synthetic-oncall-foreign-entry';ok(await destination.request('/api/recovery/restore',{mode:'replace',checkpoint:bad},response.cookie),400);assert.deepEqual(ok(await destination.request('/api/state',undefined,response.cookie)),held);
  const duplicate=structuredClone(checkpoint),copy=structuredClone(duplicate.coordination.apiOutbox[0]);copy.id='synthetic-oncall-duplicate-outcome';copy.payload.operationId=copy.id;duplicate.coordination.apiOutbox.push(copy);ok(await destination.request('/api/recovery/restore',{mode:'replace',checkpoint:duplicate},response.cookie),400);assert.deepEqual(ok(await destination.request('/api/state',undefined,response.cookie)),held);
 }finally{await destination.close();}
 console.log('PASS OC-053 human capacity: retained history >1000, full unfinished backlog, all human event paths, multi-recipient boundary, storage rollback, restart, stable replay and inactive checkpoint restore');
}finally{await capacity.close();}

// OC-068 shares the scoped API receipt door, not a second paging transport.
const manualApi=await automationRuntime();
try {
 const setup=await manualApi.request('/api/setup',{name:'synthetic-oncall-68-owner',password:'synthetic-oncall-68-password'});assert.equal(setup.status,200);
 const cookie=setup.cookie,owner=(p,d)=>manualApi.request(p,d,cookie),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value},admin=setup.value.member;
 const service=ok(await owner('/api/command',{type:'service',id:'synthetic-oncall-68-api',name:'Payments API',environment:'test',owner:admin.id,runbook:[],pager:''}));
 const schedule=ok(await owner('/api/paging/schedules',{id:service.id,name:'Payments primary',service:service.id,revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[admin.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}));
 const policy=ok(await owner('/api/paging/policies',{service:service.id,scheduleId:schedule.id,revision:0,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3}));
 const key=randomBytes(32).toString('hex');ok(await owner('/api/automation/clients',{name:'Manual incident writer',key,services:[service.id],permissions:['incidents:write','incidents:read']}),201);
 const submit=(input,credential=key)=>manualApi.request('/api/v1/incidents',input,'',{authorization:'Bearer '+credential,'idempotency-key':'synthetic-oncall-68-api-page'}),input={type:'manual-page',service:service.id,title:'Payments policy-targeted incident',severity:'warning',urgency:'high',policy:service.id};
 const first=ok(await submit(input),201),replayed=ok(await submit(input));assert.equal(replayed.id,first.id);ok(await submit({...input,title:'Conflicting policy-targeted page'}),409);
 const state=ok(await owner('/api/state'));assert.equal(state.incidents.length,1);const incident=state.incidents.find(i=>i.id===first.entity);assert.equal(incident.manualPage.creator,first.client);assert.deepEqual(incident.manualPage.obligations[0].target,{kind:'policy',id:service.id,policyRevision:policy.revision});assert.equal(incident.manualPage.obligations[0].automatic,false);assert.equal(incident.manualPage.obligations[0].paging,'off');
 const readKey=randomBytes(32).toString('hex');ok(await owner('/api/automation/clients',{name:'Manual incident reader',key:readKey,services:[service.id],permissions:['incidents:read']}),201);ok(await submit(input,readKey),403);
 ok(await submit({...input,service:'synthetic-oncall-68-foreign'}),404);assert.equal(ok(await owner('/api/state')).incidents.length,1);
 console.log('OC-068 API manual page: explicit incident-write scope, real policy override, repeated-key single incident, conflicting/cross-scope/read-only refusals and recorded-only obligation');
} finally {await manualApi.close();}
