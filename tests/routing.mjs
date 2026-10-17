import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {localWorker} from './worker.mjs';

// One public Worker journey: real admission, replay, authority and archive doors.
const w=await localWorker(),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value};
const secret=()=>randomBytes(32).toString('hex'),keys={pd:secret(),og:secret(),sp:secret()};
let cookie;
const req=(path,data)=>w.request(path,data,cookie);
const external=async(path,data,headers={})=>{const response=await fetch(w.origin+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(data)});return {status:response.status,value:await response.json()};};
const rules=[
 {id:'payments',match:'all',conditions:[{field:'payload.custom_details.team',op:'equals',value:'payments'}],target:{service:'payments'}},
 {id:'dynamic',match:'all',conditions:[{field:'payload.custom_details.service',op:'exists'}],target:{field:'payload.custom_details.service',pattern:'^service:(.*)$',group:1}},
 {id:'search',match:'all',conditions:[{field:'payload.custom_details.team',op:'matches',value:'^search$'}],target:{service:'search'}},
];
const pd=(action,key,details={})=>external('/v2/enqueue',{routing_key:keys.pd,event_action:action,dedup_key:key,payload:{summary:'Regional checkout latency',source:'regional-monitor',severity:'warning',custom_details:details}});
try {
 cookie=(await w.request('/api/setup',{name:'Routing owner',password:'synthetic-routing-owner-password'})).cookie;
 const actor=ok(await req('/api/session')).member;
 for(const id of ['payments','search','foreign'])ok(await req('/api/command',{type:'service',id,name:id,environment:'production',owner:actor.id,runbook:[],pager:''}));
 for(const service of ['payments','search'])ok(await req('/api/command',{type:'policy',service,severity:'*',action:service==='search'?'suppress':'route',owner:actor.id,reason:service==='search'?'Search maintenance coordination':'Payments owner'}));
 const create=(id,provider,key)=>req('/api/routing/keys',{id,name:id+' routed monitor',provider,scope:['payments','search'],owner:actor.id,key,revision:0,rules:[],catchAll:null});
 ok(await create('pd','pagerduty',keys.pd),201);
 const publish=(baseVersion,nextRules=rules,catchAll=null)=>req('/api/routing/keys/pd/publish',{baseVersion,rules:nextRules,catchAll});
 ok(await publish(1),201);
 ok(await pd('trigger','shared',{team:'payments',token:'must-not-survive',echo:keys.pd}),202);
 ok(await pd('trigger','shared',{team:'search'}),202);
 ok(await pd('trigger','dynamic',{service:'service:search'}),202);
 ok(await pd('trigger','unmatched',{team:'unknown'}),202);
 ok(await pd('trigger','outside',{service:'service:foreign'}),202);
 let state=ok(await req('/api/state')),receipts=state.intakeReceipts;
 assert.equal(state.alerts.filter(a=>a.key==='shared').length,2);
 assert.equal(new Set(state.alerts.filter(a=>a.key==='shared').map(a=>a.generation)).size,2);
 assert.equal(receipts.find(r=>r.key==='dynamic').service,'search');
 assert.equal(receipts.find(r=>r.key==='unmatched').outcome,'unrouted');
 assert.equal(receipts.find(r=>r.key==='outside').service,null);
 assert.match(receipts.find(r=>r.key==='outside').routing.diagnostics.join(' '),/outside key scope/);
 assert.equal(receipts[0].routing.version,2);assert.equal(receipts[0].routing.rule,'payments');
 assert.equal(receipts[1].routing.serviceDecision.action,'suppress');
 assert.equal(receipts[1].routing.serviceDecision.version,1);
 assert.ok(!JSON.stringify(state).includes(keys.pd));assert.ok(!JSON.stringify(state).includes('must-not-survive'));
 ok(await pd('resolve','shared',{team:'payments'}),202);
 state=ok(await req('/api/state'));assert.equal(state.alerts.find(a=>a.key==='shared'&&a.service==='payments').state,'recovered');assert.equal(state.alerts.find(a=>a.key==='shared'&&a.service==='search').state,'active');
 ok(await pd('resolve','shared',{team:'payments'}),202);assert.match(ok(await req('/api/state')).intakeReceipts.at(-1).routing.diagnostics.join(' '),/search/);
 const beforePreview=ok(await req('/api/archive')),changedRules=rules.map(r=>r.id==='search'?{...r,target:{service:'payments'}}:r);
 const preview=ok(await req('/api/routing/keys/pd/preview',{baseVersion:2,rules:changedRules,catchAll:'payments',receiptIds:receipts.map(r=>r.id)}));
 assert.equal(preview.decisions.length,receipts.length);assert.ok(preview.decisions.some(r=>r.changed));assert.ok(preview.warnings.length>0);assert.deepEqual(ok(await req('/api/archive')),beforePreview);
 ok(await publish(1),409);
 const afterStale=ok(await req('/api/archive'));assert.equal(afterStale.audit.at(-1).kind,'routing-publish-refused');
 ok(await publish(2,[{...rules[0],target:{service:'foreign'}}]),400);
 ok(await publish(2,[{...rules[0],conditions:[{field:'summary',op:'matches',value:'(?=unsupported)'}]}]),400);
 assert.deepEqual(ok(await req('/api/archive')),afterStale);
 const retained=receipts.find(r=>r.key==='unmatched'),readmit={receipt:retained.id,service:'payments',operationId:'readmit-unmatched'};
 ok(await req('/api/routing/keys/pd/readmit',readmit),201);
 const afterReadmit=ok(await req('/api/archive'));ok(await req('/api/routing/keys/pd/readmit',readmit));assert.deepEqual(ok(await req('/api/archive')),afterReadmit);
 assert.equal(afterReadmit.intakeReceipts.find(r=>r.id===retained.id).outcome,'unrouted');assert.ok(afterReadmit.intakeReceipts.some(r=>r.routing?.readmission?.receipt===retained.id&&r.service==='payments'));
 ok(await req('/api/routing/keys/pd/readmit',{...readmit,service:'search'}),409);
 ok(await publish(2,rules,'payments'),201);ok(await pd('trigger','catchall',{team:'unknown'}),202);assert.equal(ok(await req('/api/state')).intakeReceipts.at(-1).service,'payments');
 ok(await create('og','opsgenie',keys.og),201);ok(await req('/api/routing/keys/og/publish',{baseVersion:1,rules:[{id:'og-search',match:'all',conditions:[{field:'details.team',op:'equals',value:'search'}],target:{service:'search'}}],catchAll:null}),201);
 ok(await external('/v2/alerts',{alias:'og-shared',message:'Search capacity',details:{team:'search'}},{authorization:'GenieKey '+keys.og}),202);
 ok(await create('sp','splunk',keys.sp),201);ok(await req('/api/routing/keys/sp/publish',{baseVersion:1,rules:[{id:'sp-search',match:'all',conditions:[{field:'routingKey',op:'equals',value:'search'}],target:{service:'search'}}],catchAll:null}),201);
 ok(await external('/integrations/generic/20131114/alert/'+keys.sp+'/search',{message_type:'CRITICAL',entity_id:'sp-shared',state_message:'Search capacity'}));
 assert.equal(ok(await req('/api/state')).intakeReceipts.at(-1).service,'search');
 const viewer=ok(await req('/api/members',{name:'Routing viewer',role:'viewer',password:'synthetic-routing-viewer-password'}),201),viewerCookie=(await w.request('/api/login',{name:viewer.name,password:'synthetic-routing-viewer-password'})).cookie;
 ok(await w.request('/api/routing/keys/pd/publish',{baseVersion:3,rules:[],catchAll:null},viewerCookie),403);
 ok(await w.request('/api/routing/keys/pd/readmit',{receipt:retained.id,service:'payments',operationId:'viewer'},viewerCookie),403);
 const beforeFailure=ok(await req('/api/archive'));w.sql("CREATE TRIGGER reject_route BEFORE INSERT ON oc_intake_receipts BEGIN SELECT RAISE(ABORT,'synthetic routing failure'); END");
 ok(await pd('trigger','rollback',{team:'payments'}),503);w.sql('DROP TRIGGER reject_route');assert.deepEqual(ok(await req('/api/archive')),beforeFailure);
 const originalKey=keys.pd;keys.pd=secret();const source=ok(await req('/api/state')).intakeSources.find(s=>s.id==='pd');
 ok(await req('/api/routing/keys',{id:'pd',name:source.name,provider:'pagerduty',scope:source.routing.scope,owner:actor.id,key:keys.pd,revision:source.revision}));
 ok(await external('/v2/enqueue',{routing_key:originalKey,event_action:'trigger',payload:{summary:'Revoked',source:'test',severity:'critical'}}),400);
 const archive=ok(await req('/api/archive'));for(const key of [...Object.values(keys),originalKey])assert.ok(!JSON.stringify(archive).includes(key));
 const malformed=structuredClone(archive);malformed.intakeSources.find(s=>s.id==='pd').routing.versions[0].catchAll='foreign';ok(await req('/api/restore',{mode:'replace',archive:malformed}),400);assert.deepEqual(ok(await req('/api/archive')),archive);
 const restored=await req('/api/restore',{mode:'replace',archive});ok(restored);cookie=restored.cookie;
 state=ok(await req('/api/state'));assert.deepEqual(state.intakeReceipts,archive.intakeReceipts);assert.ok(state.intakeSources.every(s=>!s.active));assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_intake_credentials')[0].n,0);
 await w.stop();await w.start();assert.deepEqual(ok(await req('/api/state')).intakeReceipts,archive.intakeReceipts);
 console.log('Routed intake public Worker journey passed: scoped fixed/dynamic rules, per-service generations, suppression ordering, replay/no writes, stale publish, readmission, authority, rollback, rotation and inactive archive/restart');
} finally {await w.close();}
