import assert from 'node:assert/strict';
import {randomBytes,createHmac,createHash} from 'node:crypto';
import {automationRuntime} from './automation-runtime.mjs';
const sign=(key,text)=>createHmac('sha256',key).update(text).digest('hex');
const apiKey=randomBytes(32).toString('hex'),receiverKey=randomBytes(32).toString('hex'),seen=[],applied=new Set();let behavior='accepted',release,entered;
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
 const endpoint=ok(await owner('/api/automation/endpoints',{name:'Synthetic receiver',key:receiverKey,client:receiverClient.id,services:[service.id],url:'https://8.8.8.8/events',approve:true}),201);
 ok(await runtime.request('/api/v1/incidents'),401);ok(await runtime.request('/api/v1/incidents',undefined,cookie),401);
 const input={type:'declare',service:service.id,title:'Synthetic incident',summary:'Synthetic impact',severity:'warning'};
 const op=ok(await api('incidents',input,apiKey,'synthetic-oncall-repeat'),201);
 assert.deepEqual(ok(await api('incidents',input,apiKey,'synthetic-oncall-repeat')),op);
 ok(await api('incidents',{...input,title:'Changed'},apiKey,'synthetic-oncall-repeat'),409);
 ok(await api('incidents',{...input,service:foreign.id}),404);
 let incident=ok(await api('incidents/'+op.entity));
 assert.equal(incident.timeline[0].actor,client.id);assert.equal((await state()).incidents.length,1);
 const transition=async(type,extra)=>{const response=ok(await api('incidents',{type,incident:incident.id,revision:incident.revision,...extra}),201);incident=ok(await api('incidents/'+response.entity));return response;};
 ok(await api('incidents',{type:'transition',incident:incident.id,revision:incident.revision,state:'acknowledged',summary:'Machine acknowledgment'}),400);
 await transition('transition',{state:'acknowledged',member:admin.id,summary:'Client assigns explicit responsibility; no human response claim'});
 assert.equal(incident.assignee,admin.id);assert.equal(incident.timeline.at(-1).actor,client.id);
 ok(await api('incidents',{type:'reassign',incident:incident.id,revision:1,member:admin.id,reason:'Stale'}),409);
 await transition('reassign',{member:admin.id,reason:'Explicit reassignment'});await transition('assign-role',{role:'scribe',member:admin.id,reason:'Role assignment'});
 ok(await api('actions',{type:'action',incident:incident.id,revision:incident.revision,title:'Follow up',owner:admin.id,due:'2026-12-01',completionPolicy:'human-review'}),201);incident=ok(await api('incidents/'+incident.id));
 ok(await api('actions',{type:'accept-action',incident:incident.id,revision:incident.revision,action:incident.actions[0].id,reason:'Not a human'}),403);
 await transition('transition',{state:'recovered',summary:'Recovery evidence recorded',evidence:'https://example.test/evidence'});await transition('transition',{state:'resolved',summary:'Resolved with evidence'});
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
 const snapshot=await state();assert.equal(snapshot.apiOutbox.length,9);assert.deepEqual(new Set(snapshot.apiOutbox.map(o=>o.event)),new Set(['trigger','acknowledgment','reassignment','role','follow-up','resolution']));
 await runtime.restart();const committedLogin=await runtime.request('/api/login',{name:'Synthetic Owner',password:'synthetic-oncall-owner-password'});ok(committedLogin);cookie=committedLogin.cookie;assert.deepEqual((await state()).apiOutbox,snapshot.apiOutbox,'restart after domain commit retains queued operations exactly');
 const scheduled=await fetch(runtime.origin+'/cdn-cgi/local/scheduled');assert.equal(scheduled.status,200);await scheduled.text();assert.ok((await state()).apiOutbox.every(o=>o.status==='sent'),'scheduled handler dispatches the durable batch without a browser');
 assert.equal(applied.size,9);assert.equal((await state()).incidents.length,4);
 // Real foreign records never appear through direct IDs, pagination or linked mutations.
 let hidden=ok(await owner('/api/command',{...input,service:foreign.id,title:'Hidden incident'}));hidden=ok(await owner('/api/command',{type:'action',incident:hidden.id,revision:hidden.revision,title:'Hidden action',owner:admin.id,due:'2026-12-01'}));
 ok(await owner('/api/paging/schedules',{...schedule,id:'synthetic-oncall-hidden-schedule',service:foreign.id}));
 ok(await owner('/api/sources',{id:'synthetic-oncall-hidden-source',key:randomBytes(32).toString('hex'),mode:'bearer',scopes:[foreign.id]}));
 const probeKey=randomBytes(32).toString('hex');ok(await owner('/api/automation/clients',{name:'Scoped isolation probe',key:probeKey,services:[service.id],permissions:allPermissions}),201);
 for(const [family,id] of [['services',foreign.id],['incidents',hidden.id],['actions',hidden.actions[0].id],['schedules','synthetic-oncall-hidden-schedule'],['analytics',foreign.id],['integrations','native:synthetic-oncall-hidden-source']])ok(await api(family+'/'+id,undefined,probeKey),404);
 const visible=ok(await api('incidents?limit=100',undefined,probeKey));assert.equal(visible.data.length,4);assert.equal(visible.nextCursor,null);assert.equal(ok(await api('analytics',undefined,probeKey)).data[0].incidents,4);assert.equal(ok(await api('integrations',undefined,probeKey)).data.length,0);
 const beforeForeign=await state();ok(await api('incidents',{type:'transition',incident:hidden.id,revision:hidden.revision,state:'acknowledged',member:admin.id,summary:'Forbidden'},probeKey),404);ok(await api('actions',{type:'action',incident:hidden.id,revision:hidden.revision,title:'Forbidden',owner:admin.id,due:'2026-12-01'},probeKey),404);ok(await api('schedules',{...schedule,id:'synthetic-oncall-hidden-schedule',revision:1},probeKey),404);assert.deepEqual((await state()).incidents,beforeForeign.incidents);assert.deepEqual((await state()).apiOutbox,beforeForeign.apiOutbox);assert.deepEqual((await state()).apiOperations,beforeForeign.apiOperations);
 // Audit failure rolls back the incident, operation receipt and enqueue together.
 const before=await state();await sql("CREATE TRIGGER synthetic_api_audit_fault BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='automation.incidents' BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END");
 ok(await api('incidents',{...input,title:'Must roll back'}),503);await sql('DROP TRIGGER synthetic_api_audit_fault');
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
 // Populated native archive and checkpoint preserve exact history, omit credentials and restore inactive.
 ok(await owner('/api/command',{...input,title:'Queued at export'}));assert.equal((await state()).apiOutbox.at(-1).status,'queued');
 const archive=ok(await owner('/api/archive')),checkpoint=ok(await owner('/api/recovery/checkpoint'));
 for(const secret of [apiKey,receiverKey,readKey,rotatedKey,probeKey,receiverApiKey,savedCustody.custody])assert.ok(!JSON.stringify([archive,checkpoint,ok(await owner('/api/audit/export'))]).includes(secret));
 assert.ok(archive.apiClients.find(c=>c.id===reader.id).lastUsed);
 const malformed=structuredClone(archive);malformed.apiOutbox[0].payload.secret='not-authorized';const retainedBefore=await state();ok(await owner('/api/restore',{mode:'replace',archive:malformed,adminMapping:admin.id}),400);assert.deepEqual((await state()).incidents,retainedBefore.incidents);assert.deepEqual((await state()).apiOutbox,retainedBefore.apiOutbox);
 const fresh=await automationRuntime();try{const setup2=await fresh.request('/api/setup',{name:'Fresh Owner',password:'synthetic-oncall-fresh-password'});const ck=setup2.cookie;ok(setup2);const restored=await fresh.request('/api/restore',{mode:'replace',archive,adminMapping:admin.id},ck);ok(restored);const held=ok(await fresh.request('/api/state',undefined,restored.cookie));assert.deepEqual(held.apiOperations,archive.apiOperations);assert.deepEqual(held.apiOutbox.map(o=>o.id),archive.apiOutbox.map(o=>o.id));assert.ok(held.apiClients.every(c=>!c.active));assert.ok(held.apiEndpoints.every(e=>!e.active));assert.ok(held.apiOutbox.every(o=>!o.authorized));for(const original of archive.apiOutbox){const received=held.apiOutbox.find(o=>o.id===original.id);assert.deepEqual(received.payload,original.payload);assert.deepEqual(received.history.slice(0,original.history.length),original.history);if(original.status==='queued'){assert.equal(received.status,'interrupted');assert.equal(received.history.at(-1).reason,'restore-requires-authorization');}else assert.equal(received.status,original.status);}assert.equal((await fresh.db.prepare('SELECT COUNT(*) AS n FROM oc_api_credentials').first()).n,0);assert.equal((await fresh.db.prepare('SELECT COUNT(*) AS n FROM oc_endpoint_credentials').first()).n,0);ok(await fresh.request('/api/v1/incidents',undefined,'',{authorization:'Bearer '+rotatedKey}),401);assert.equal(ok(await fresh.request('/api/automation/dispatch',{},restored.cookie)).processed,0);}finally{await fresh.close();}
 console.log('PASS OC-053 scoped API, atomic signed outbox, receipt uncertainty, replay, revocation and inactive native restore');
} finally {release?.();await runtime.close();}
