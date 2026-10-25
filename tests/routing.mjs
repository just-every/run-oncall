import {rateJourney,providerRateDoors} from './routing-rate.mjs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {nativeRouting,nativeCapacity} from './routing-native.mjs';
import {localWorker} from './worker.mjs';
import {localPart,mail,recoveryRules} from './email-fixtures.mjs';

// One public Worker journey: real admission, replay, authority and archive doors.
const w=await localWorker({INBOUND_EMAIL_DOMAIN:'inbound.example.test'},{clock:true}),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value};
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
 const local=localPart(),second=localPart();
 const emailCreate=(id,localPart,service,mode='custom',rules=recoveryRules())=>req('/api/email/addresses',{id,name:id+' integration',localPart,service,owner:actor.id,mode,fallback:'subject',rules});
 ok(await emailCreate('nightly',local,'payments'),201);ok(await emailCreate('second',second,'search'),201);
 for(const subject of ['FAILED: nightly-db','FAILED: nightly-web','OK: nightly-db','OK: missing'])await mail(w,local,subject);
 let email=ok(await req('/api/email'));const db=email.receipts.find(r=>r.decision?.key==='nightly-db'),web=email.receipts.find(r=>r.decision?.key==='nightly-web');
 assert.notEqual(db.generation,web.generation);assert.equal(email.receipts.at(-2).stop,'stopped by source recovery');assert.equal(email.receipts.at(-1).outcome,'no-effect');
 let emailState=ok(await req('/api/state'));assert.equal(emailState.alerts.find(a=>a.id===db.alert).state,'recovered');assert.equal(emailState.alerts.find(a=>a.id===web.alert).state,'active');assert.equal(emailState.alerts.find(a=>a.id===web.alert).priority,'P1');
 const declared=ok(await req('/api/command',{type:'declare',service:'payments',severity:'critical',title:'Nightly customer impact',summary:'Source recovery is separate',alerts:[web.alert]}));
 await mail(w,local,'OK: nightly-web');assert.equal(ok(await req('/api/state')).incidents.find(i=>i.id===declared.id).state,'declared');
 await mail(w,second,'FAILED: nightly-db');assert.notEqual(ok(await req('/api/email')).receipts.at(-1).generation,db.generation);
 await mail(w,local,'Unmatched failure');assert.equal(ok(await req('/api/email')).receipts.at(-1).outcome,'opened');
 const draft={revision:1,mode:'custom',fallback:'quarantine',rules:recoveryRules()};
 const beforeWorkspace=ok(await req('/api/archive')),beforeReplay=w.sql('SELECT COUNT(*) AS n FROM oc_admin_audit')[0].n;
 const replay=ok(await req('/api/email/addresses/nightly/preview',{...draft,samples:email.samples.filter(s=>s.address==='nightly').map(s=>s.id)}));assert.equal(replay.sideEffects,false);assert.equal(replay.decisions.length,4);assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_admin_audit')[0].n,beforeReplay);assert.deepEqual(ok(await req('/api/archive')),beforeWorkspace);
 ok(await req('/api/email/addresses/nightly/publish',draft));await mail(w,local,'Unmatched quarantine');assert.equal(ok(await req('/api/email')).receipts.at(-1).diagnostic,'no_rule_matched');
 const pathological={id:'linear',action:'trigger',match:'all',conditions:[{field:'text',op:'matches',value:'^(a+)+$'}],key:{field:'subject',kind:'markers',start:'[',end:']'}};
 ok(await req('/api/email/addresses/nightly/publish',{revision:2,mode:'custom',fallback:'subject',rules:[pathological]}));await mail(w,local,'Pathological input',{body:'a'.repeat(128*1024)+'!'});assert.equal(ok(await req('/api/email')).receipts.at(-1).outcome,'opened');
 for(const mode of ['single','each']){const part=localPart();ok(await emailCreate(mode,part,'payments',mode,[]),201);await mail(w,part,'First failure');await mail(w,part,'Other failure');const rows=ok(await req('/api/email')).receipts.filter(r=>r.address===mode);assert.equal(rows[0].generation===rows[1].generation,mode==='single');}
 // Byte-for-byte extraction, including whitespace, and resolve rules in a default mode.
 const markers=localPart(),markerRule={id:'marker-ok',action:'resolve',match:'all',conditions:[{field:'subject',op:'contains',value:'OK'}],key:{field:'subject',kind:'markers',start:'[',end:']'}};
 ok(await emailCreate('markers',markers,'payments','subject',[markerRule]),201);await mail(w,markers,'failure');await mail(w,markers,'OK [ failure ]');assert.equal(ok(await req('/api/email')).receipts.at(-1).outcome,'no-effect');
 const markerTrigger={...markerRule,id:'marker-failed',action:'trigger',conditions:[{field:'subject',op:'contains',value:'FAILED'},{field:'sender',op:'equals',value:'monitor@example.test'},{field:'text',op:'matches',value:'^Database'},{field:'text',op:'not-matches',value:'forbidden'}]};
 ok(await req('/api/email/addresses/markers/publish',{revision:1,mode:'custom',fallback:'quarantine',rules:[markerTrigger,{...markerRule,match:'any',conditions:[{field:'subject',op:'contains',value:'OK'},{field:'text',op:'equals',value:'RECOVERY'}]}]}));await mail(w,markers,'FAILED [ nightly-db ]');const spaced=ok(await req('/api/email')).receipts.at(-1);assert.equal(spaced.decision.key,' nightly-db ');await mail(w,markers,'OK [nightly-db]');assert.equal(ok(await req('/api/email')).receipts.at(-1).outcome,'no-effect');await mail(w,markers,'OK [ nightly-db ]');assert.equal(ok(await req('/api/email')).receipts.at(-1).outcome,'recovered');
 const eraseRevision=ok(await req('/api/email')).addresses.find(a=>a.id==='nightly').revision;
 ok(await req('/api/email/addresses/nightly/erase',{revision:eraseRevision}));assert.ok(!ok(await req('/api/email')).samples.some(s=>s.address==='nightly'));ok(await req('/api/restore',{mode:'replace',archive:beforeWorkspace}),409);
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
 const replayAudit=()=>w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const beforePreview=ok(await req('/api/archive')),changedRules=rules.map(r=>r.id==='search'?{...r,target:{service:'payments'}}:r);
 const auditBeforePreview=replayAudit();
 const preview=ok(await req('/api/routing/keys/pd/preview',{baseVersion:2,rules:changedRules,catchAll:'payments',receiptIds:receipts.map(r=>r.id)}));
 assert.equal(preview.decisions.length,receipts.length);assert.ok(preview.decisions.some(r=>r.changed));assert.ok(preview.warnings.length>0);
 assert.deepEqual(replayAudit(),auditBeforePreview,'OC-043 routed replay writes no permanent audit');assert.deepEqual(ok(await req('/api/archive')),beforePreview);
 assert.deepEqual(preview.decisions.map(row=>row.receipt),[...receipts].sort((a,b)=>a.acceptedAt.localeCompare(b.acceptedAt)||a.id.localeCompare(b.id)).map(row=>row.id),'OC-043 replay order is stable by admission time and receipt identity');
 const rerouted=preview.decisions.find(row=>row.historical.service==='search');
 assert.equal(rerouted.historical.serviceDecision.action,'suppress');assert.equal(rerouted.proposed.serviceDecision.action,'route');assert.equal(rerouted.proposed.serviceDecision.owner,actor.id);
 assert.equal(rerouted.proposed.serviceDecision.version,1);assert.equal(rerouted.historical.version,2);assert.equal(rerouted.proposed.version,2);
 assert.ok(rerouted.proposed.serviceDecision.reason);assert.ok(rerouted.proposed.serviceDecision.event);
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
 // OC-043: admission-time maintenance, expiry without a timer and unchanged originals.
 const maintenanceNow=Date.now(),maintenanceStart=maintenanceNow+60000,maintenanceEnd=maintenanceNow+120000;
 const maintenance={type:'policy',service:'payments',severity:'warning',action:'suppress',owner:actor.id,reason:'synthetic-oncall-43 maintenance',baseVersion:0,suppressionWindow:{start:new Date(maintenanceStart).toISOString(),end:new Date(maintenanceEnd).toISOString()}};
 ok(await req('/api/command',{...maintenance,suppressionWindow:{start:maintenance.suppressionWindow.end,end:maintenance.suppressionWindow.start}}),400);
 ok(await req('/api/command',{...maintenance,owner:'synthetic-oncall-missing'}),400);
 const maintenanceBefore=ok(await req('/api/archive'));
 w.sql("CREATE TRIGGER synthetic_oncall_43_policy_audit BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic-oncall-43'); END");
 try{ok(await req('/api/command',maintenance),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_43_policy_audit')}
 assert.deepEqual(ok(await req('/api/archive')),maintenanceBefore,'failed audit cannot publish a maintenance window');
 const maintenancePolicy=ok(await req('/api/command',maintenance));assert.equal(maintenancePolicy.version,1);
 ok(await req('/api/command',maintenance),409);
 const maintenanceAdmission=async(label)=>{ok(await pd('trigger','synthetic-oncall-43-'+label,{team:'payments'}),202);const snapshot=ok(await req('/api/state')),receipt=snapshot.intakeReceipts.at(-1);return {snapshot,receipt,event:snapshot.events.find(e=>e.id===receipt.event),alert:snapshot.alerts.find(a=>a.id===receipt.alert)}};
 await w.time(maintenanceStart-1);const preMaintenance=await maintenanceAdmission('before');assert.equal(preMaintenance.event.decision.action,'route');assert.match(preMaintenance.event.decision.reason,/Maintenance not started/);
 await w.time(maintenanceStart);const inMaintenance=await maintenanceAdmission('during');assert.equal(inMaintenance.event.decision.action,'suppress');assert.equal(inMaintenance.alert.owner,actor.id);assert.equal(inMaintenance.alert.suppressed,true);assert.equal(inMaintenance.event.severity,'warning');assert.ok(inMaintenance.event.decision.reason.includes(maintenance.suppressionWindow.end));
 assert.equal(inMaintenance.receipt.routing.version,3);assert.equal(inMaintenance.receipt.routing.serviceDecision.version,1);
 // Datadog and Prometheus adapters inherit the same service admission rule.
 const maintenanceKeys={'synthetic-oncall-43-dd':secret(),'synthetic-oncall-43-am':secret()};
 for(const [id,provider] of [['synthetic-oncall-43-dd','datadog'],['synthetic-oncall-43-am','alertmanager']])ok(await req('/api/intake/sources',{id,name:id,provider,service:'payments',key:maintenanceKeys[id],revision:0}),201);
 const monitoringSend=async(id,payload)=>external('/api/monitoring/'+id,payload,{authorization:'Bearer '+maintenanceKeys[id]});
 ok(await monitoringSend('synthetic-oncall-43-dd',{id:'synthetic-oncall-43',alert_id:'synthetic-oncall-43',alert_cycle_key:'synthetic-oncall-43',alert_scope:'service:payments',alert_transition:'Warn',date:maintenanceStart,title:'synthetic-oncall-43 error',body:'Synthetic error event',alert_type:'warning',tags:'service:payments'}),202);
 ok(await monitoringSend('synthetic-oncall-43-am',{version:'4',receiver:'synthetic-oncall-43',status:'firing',groupKey:'synthetic-oncall-43',groupLabels:{},commonLabels:{},commonAnnotations:{},alerts:[{status:'firing',labels:{alertname:'synthetic-oncall-43',severity:'warning'},annotations:{summary:'synthetic-oncall-43'},startsAt:new Date(maintenanceStart).toISOString(),endsAt:'0001-01-01T00:00:00Z',fingerprint:'synthetic-oncall-43'}]}),202);
 const maintenanceProviders=ok(await req('/api/state'));for(const source of ['synthetic-oncall-43-dd','synthetic-oncall-43-am']){const receipt=maintenanceProviders.intakeReceipts.find(r=>r.source===source);assert.ok(receipt);assert.equal(maintenanceProviders.events.find(e=>e.id===receipt.event).decision.action,'suppress');}
 await w.time(maintenanceEnd);const expiredMaintenance=await maintenanceAdmission('after');assert.equal(expiredMaintenance.event.decision.action,'route');assert.equal(expiredMaintenance.alert.suppressed,false);assert.match(expiredMaintenance.event.decision.reason,/Maintenance expired/);
 assert.deepEqual(expiredMaintenance.snapshot.events.find(e=>e.id===inMaintenance.event.id),inMaintenance.event,'expiry does not rewrite the earlier event');
 ok(await pd('trigger','synthetic-oncall-43-during',{team:'payments',observation:'synthetic-oncall-43 after expiry'}),202);
 const repeatedMaintenance=ok(await req('/api/state')),repeatedReceipt=repeatedMaintenance.intakeReceipts.at(-1),repeatedAlert=repeatedMaintenance.alerts.find(a=>a.id===repeatedReceipt.alert);
 assert.equal(repeatedAlert.id,inMaintenance.alert.id);assert.equal(repeatedAlert.suppressed,false);assert.equal(repeatedAlert.owner,actor.id);assert.match(repeatedMaintenance.events.find(e=>e.id===repeatedReceipt.event).decision.reason,/Maintenance expired/);assert.deepEqual(repeatedMaintenance.events.find(e=>e.id===inMaintenance.event.id),inMaintenance.event);
 console.log('PASS OC-043 later observation after expiry routes the existing group without rewriting its original event');

 const maintenanceArchive=ok(await req('/api/archive')),maintenanceRows=w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const maintenanceReplay=ok(await req('/api/routing/keys/pd/preview',{baseVersion:3,rules:changedRules,catchAll:'payments',receiptIds:[inMaintenance.receipt.id]}));
 assert.equal(maintenanceReplay.decisions[0].historical.serviceDecision.action,'suppress');assert.equal(maintenanceReplay.decisions[0].proposed.serviceDecision.action,'route');assert.match(maintenanceReplay.decisions[0].proposed.serviceDecision.reason,/Maintenance expired/);assert.deepEqual(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),maintenanceRows);assert.deepEqual(ok(await req('/api/archive')),maintenanceArchive);
 await w.stop();await w.start();await w.time(maintenanceEnd+1000);assert.deepEqual(ok(await req('/api/state')).events.find(e=>e.id===inMaintenance.event.id),inMaintenance.event);const restartedMaintenance=await maintenanceAdmission('restart');assert.equal(restartedMaintenance.event.decision.action,'route');
 await w.time(Date.now());
 console.log('PASS OC-043 admission maintenance: stale/unauthorized shape and owner validation, atomic audit rollback, routed error/Datadog/Prometheus suppression, owner queue, exact expiry without timers, immutable originals, read-only replay and restart');
 const native=await nativeRouting(w,cookie,actor);
 await rateJourney(w,cookie,actor);
 await providerRateDoors(w,cookie,actor);
 // OC-043 extends the existing routing journey after the rate fixtures: no unrelated snapshot grows.
 const groupService='synthetic-oncall-430',dependent='synthetic-oncall-431',stageService='synthetic-oncall-432',groupKey=secret(),amKey=secret(),errorKey=secret(),depKey=secret(),stageKey=secret();
 for(const [id,environment] of [[groupService,'production'],[dependent,'production'],[stageService,'staging']])ok(await req('/api/command',{type:'service',id,name:id,environment,owner:actor.id,runbook:[],pager:''}));
 const grouping={field:'labels.correlation',windowSeconds:60,includeDependencies:false,flappingCount:0},groupPolicy={type:'policy',service:groupService,severity:'*',action:'route',owner:actor.id,reason:'Synthetic cross-source correlation',baseVersion:0,correlation:grouping};
 ok(await w.request('/api/command',groupPolicy,viewerCookie),403);ok(await req('/api/command',{...groupPolicy,correlation:{...grouping,windowSeconds:0}}),400);
 const beforeGrouping=ok(await req('/api/archive'));w.sql("CREATE TRIGGER synthetic_oncall_430_policy BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='command.policy' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-430'); END");
 try{ok(await req('/api/command',groupPolicy),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_430_policy')};assert.deepEqual(ok(await req('/api/archive')),beforeGrouping);
 const firstGrouping=ok(await req('/api/command',groupPolicy));ok(await req('/api/command',groupPolicy),409);
 for(const service of [dependent,stageService])ok(await req('/api/command',{...groupPolicy,service,correlation:{...grouping,includeDependencies:true}}));
 ok(await req('/api/command',{type:'service-dependencies',service:dependent,dependencies:[groupService],workspaceRevision:ok(await req('/api/state')).revision}));
 ok(await req('/api/routing/keys',{id:'synthetic-oncall-430-dd',name:'Synthetic grouped Datadog',provider:'datadog',scope:[groupService],owner:actor.id,key:groupKey,revision:0,rules:[],catchAll:groupService}),201);
 for(const [id,service,provider,key] of [['synthetic-oncall-430-am',groupService,'alertmanager',amKey],['synthetic-oncall-431-am',dependent,'alertmanager',depKey],['synthetic-oncall-432-am',stageService,'alertmanager',stageKey]])ok(await req('/api/intake/sources',{id,name:id,provider,service,key,revision:0}),201);
 ok(await req('/api/routing/keys',{id:'synthetic-oncall-430-error',name:'Synthetic routed error',provider:'pagerduty',scope:[groupService],owner:actor.id,key:errorKey,revision:0,rules:[],catchAll:groupService}),201);
 const base=Date.now()-3600000;
 const dd=(id,at)=>external('/api/monitoring/synthetic-oncall-430-dd',{id,alert_id:id,alert_cycle_key:id,alert_scope:'service:synthetic-oncall-430',alert_transition:'Triggered',date:at,title:'Synthetic correlated Datadog',body:'Synthetic evidence',alert_type:'critical',tags:'correlation:synthetic-oncall-430'},{authorization:'Bearer '+groupKey});
 const am=(source,key,id,at,label='synthetic-oncall-430',status='firing',start=at)=>external('/api/monitoring/'+source,{version:'4',receiver:'synthetic-oncall-430',status,groupKey:id,groupLabels:{},commonLabels:{},commonAnnotations:{},alerts:[{status,labels:{alertname:id,severity:'warning',...(label?{correlation:label}:{})},annotations:{summary:'Synthetic correlated Prometheus '+id},startsAt:new Date(start).toISOString(),endsAt:status==='resolved'?new Date(at).toISOString():'0001-01-01T00:00:00Z',fingerprint:id}]},{authorization:'Bearer '+key});
 ok(await dd('synthetic-oncall-430-first',base),202);let groups=ok(await req('/api/state'));const original=structuredClone(groups.events.at(-1));assert.equal(original.decision.correlation.group,original.id);assert.equal(groups.intakeReceipts.at(-1).routing.version,1);assert.equal(groups.intakeReceipts.at(-1).routing.serviceDecision.version,firstGrouping.version);
 ok(await am('synthetic-oncall-430-am',amKey,'synthetic-oncall-430-join',base+1000),202);groups=ok(await req('/api/state'));assert.equal(groups.events.at(-1).decision.correlation.originalEvent,original.id);assert.equal(groups.events.at(-1).severity,'warning');
 const secondGrouping=ok(await req('/api/command',{...groupPolicy,baseVersion:firstGrouping.version,reason:'Synthetic reviewed grouping revision'}));
 ok(await external('/v2/enqueue',{routing_key:errorKey,event_action:'trigger',dedup_key:'synthetic-oncall-430-error',payload:{summary:'Synthetic application error',source:'synthetic-oncall-430-error',severity:'critical',timestamp:new Date(base+2000).toISOString(),custom_details:{correlation:'synthetic-oncall-430'}}}),202);
 groups=ok(await req('/api/state'));const errorEvent=groups.events.at(-1);assert.equal(errorEvent.decision.correlation.originalEvent,original.id);assert.equal(errorEvent.decision.correlation.originalVersion,firstGrouping.version);assert.equal(errorEvent.decision.version,secondGrouping.version);assert.deepEqual(groups.events.find(e=>e.id===original.id),original);
 ok(await am('synthetic-oncall-431-am',depKey,'synthetic-oncall-431-join',base+3000),202);groups=ok(await req('/api/state'));assert.equal(groups.events.at(-1).decision.correlation.relationship,'dependency');assert.equal(groups.events.at(-1).decision.correlation.originalEvent,original.id);assert.notEqual(groups.alerts.find(a=>a.events.includes(original.id)).id,groups.alerts.find(a=>a.events.includes(groups.events.at(-1).id)).id,'association never merges source/service generations');
 for(const [source,key,id,at,label] of [['synthetic-oncall-430-am',amKey,'synthetic-oncall-430-boundary',base+60000,'synthetic-oncall-430'],['synthetic-oncall-430-am',amKey,'synthetic-oncall-430-missing',base+4000,''],['synthetic-oncall-432-am',stageKey,'synthetic-oncall-432-stage',base+4000,'synthetic-oncall-430']]){ok(await am(source,key,id,at,label),202);const event=ok(await req('/api/state')).events.at(-1);assert.notEqual(event.decision.correlation.originalEvent,original.id);assert.ok(ok(await req('/api/state')).alerts.some(a=>a.events.includes(event.id)),'out-of-window and unmatched evidence remains visible');}
 const beforeAdmissionFailure=ok(await req('/api/archive'));w.sql("CREATE TRIGGER synthetic_oncall_430_admit BEFORE INSERT ON oc_admin_audit WHEN NEW.feature='monitoring' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-430'); END");
 try{ok(await dd('synthetic-oncall-430-rollback',base+5000),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_430_admit')};assert.deepEqual(ok(await req('/api/archive')),beforeAdmissionFailure);
 const replayBefore=ok(await req('/api/archive')),replayAuditBefore=w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),nativeSignal=event=>Object.fromEntries(['source','eventId','service','environment','key','generation','intent','severity','title','observedAt','evidence'].map(key=>[key,event[key]]));
 const groupingReplay=ok(await req('/api/replay',{events:[nativeSignal(errorEvent),nativeSignal(original)]}));assert.equal(groupingReplay.decisions[0].eventId,original.eventId);assert.equal(groupingReplay.decisions[1].proposed.correlation.group,original.id);assert.equal(groupingReplay.decisions[1].proposed.correlation.originalVersion,secondGrouping.version);assert.equal(groupingReplay.decisions[0].historical.version,1);assert.equal(groupingReplay.decisions[0].proposed.version,2);assert.deepEqual(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),replayAuditBefore);assert.deepEqual(ok(await req('/api/archive')),replayBefore);
 await w.stop();await w.start();assert.deepEqual(ok(await req('/api/state')).events.find(e=>e.id===original.id),original);
 const beforeRootErasure=ok(await req('/api/archive'));const erasedRootReceipt=ok(await req('/api/erasure/intake/synthetic-oncall-430-dd',{workspaceRevision:beforeRootErasure.revision,confirmation:'erase synthetic-oncall-430-dd'}));assert.equal(erasedRootReceipt.stores.oc_events.deleted,1);assert.equal(erasedRootReceipt.stores.oc_events.updated,3);groups=ok(await req('/api/state'));assert.equal(groups.events.find(e=>e.id===errorEvent.id).decision.correlation.originalEvent,null);assert.equal(groups.intakeReceipts.find(r=>r.event===errorEvent.id).routing.serviceDecision.correlation.originalEvent,null);assert.match(groups.events.find(e=>e.id===errorEvent.id).decision.correlation.reason,/explicitly erased/);ok(await req('/api/restore',{mode:'replace',archive:{...beforeRootErasure,erasureFences:groups.erasureFences}}),409);

 // Flapping uses complete source generations, not repeated delivery or concurrent outages.
 const flapService='synthetic-oncall-433',flapSource='synthetic-oncall-433',flapKey=secret();ok(await req('/api/command',{type:'service',id:flapService,name:flapService,environment:'production',owner:actor.id,runbook:[],pager:''}));
 const flapPolicy=ok(await req('/api/command',{...groupPolicy,service:flapService,correlation:{field:'key',windowSeconds:60,includeDependencies:false,flappingCount:2}}));ok(await req('/api/sources',{id:flapSource,key:flapKey,scopes:[flapService]}));
 const flap=(eventId,generation,intent,offset)=>w.request('/api/ingress/'+flapSource,{source:flapSource,eventId,service:flapService,environment:'production',key:'synthetic-oncall-433',generation,intent,severity:'critical',title:'Synthetic flapping error',observedAt:new Date(base+offset).toISOString(),evidence:''},undefined,{authorization:'Bearer '+flapKey});
 ok(await flap('synthetic-oncall-433-a','synthetic-oncall-433-a','trigger',0),201);ok(await flap('synthetic-oncall-433-r','synthetic-oncall-433-a','recover',1000),201);const held=ok(await flap('synthetic-oncall-433-b','synthetic-oncall-433-b','trigger',2000),201);groups=ok(await req('/api/state'));const heldEvent=groups.events.find(e=>e.id===held.id);assert.equal(heldEvent.decision.correlation.held,true);assert.equal(heldEvent.severity,'critical');assert.equal(groups.alerts.find(a=>a.events.includes(held.id)).suppressed,true);const heldBefore=ok(await req('/api/archive'));ok(await flap('synthetic-oncall-433-b','synthetic-oncall-433-b','trigger',2000));assert.deepEqual(ok(await req('/api/archive')),heldBefore);
 ok(await req('/api/command',{...groupPolicy,service:flapService,baseVersion:flapPolicy.version,correlation:null}));const released=ok(await flap('synthetic-oncall-433-c','synthetic-oncall-433-b','trigger',3000),201);groups=ok(await req('/api/state'));assert.equal(groups.alerts.find(a=>a.events.includes(released.id)).suppressed,false);assert.deepEqual(groups.events.find(e=>e.id===heldEvent.id),heldEvent,'policy changes never rewrite the original hold');
 const validGroupingArchive=ok(await req('/api/archive'));
 for(const damage of [event=>{event.decision.correlation.windowSeconds++},event=>{event.decision.correlation.group='synthetic-oncall-missing';event.decision.correlation.originalEvent='synthetic-oncall-missing'},event=>{delete event.decision.correlation}]){const invalid=structuredClone(validGroupingArchive);damage(invalid.events.find(e=>e.decision.correlation?.group===e.id));ok(await req('/api/restore',{mode:'replace',archive:invalid}),400);assert.deepEqual(ok(await req('/api/archive')),validGroupingArchive);}
 console.log('PASS OC-043 correlation: Datadog/Prometheus/error labels, routed-first versions, immutable originals, exact event-time boundary, dependency/environment isolation, audit rollback, ordered zero-write replay, restart, flapping and explicit next-admission release');

 const archive=ok(await req('/api/archive'));for(const key of [...Object.values(keys),...Object.values(native),originalKey,groupKey,amKey,errorKey,depKey,stageKey,flapKey])assert.ok(!JSON.stringify(archive).includes(key));
 const malformed=structuredClone(archive);malformed.intakeSources.find(s=>s.id==='pd').routing.versions[0].catchAll='foreign';ok(await req('/api/restore',{mode:'replace',archive:malformed}),400);assert.deepEqual(ok(await req('/api/archive')),archive);
 const restored=await req('/api/restore',{mode:'replace',archive});ok(restored);cookie=restored.cookie;
 state=ok(await req('/api/state'));assert.deepEqual(ok(await req('/api/archive')).intakeReceipts,archive.intakeReceipts);assert.deepEqual(state.keyAllowances,archive.keyAllowances);assert.ok(state.intakeSources.every(s=>!s.active));assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_intake_credentials')[0].n,0);
 await w.stop();await w.start();assert.deepEqual(ok(await req('/api/archive')).intakeReceipts,archive.intakeReceipts);
 console.log('OC-070 modes and rules map email onto derived generations. Routed intake: scoped fixed/dynamic rules, per-service generations, suppression ordering, replay/no writes, stale publish, readmission, authority, rollback, rotation and inactive archive/restart');
} finally {await w.close();}
await nativeCapacity();
