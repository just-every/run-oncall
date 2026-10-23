import assert from 'node:assert/strict';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {localWorker} from './worker.mjs';

const w=await localWorker(),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value};
let cookie;const keys={am:randomBytes(32).toString('hex'),gf:randomBytes(32).toString('hex'),dd:randomBytes(32).toString('hex'),pd:randomBytes(32).toString('hex'),router:randomBytes(32).toString('hex')};
const req=(path,data)=>w.request(path,data,cookie);
const send=async(source,payload,key=keys[source],raw=false)=>{const response=await fetch(w.origin+'/api/monitoring/'+source,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+key},body:raw?payload:JSON.stringify(payload)});return {status:response.status,value:await response.json()};};
const alert=(fingerprint,team='payments',startsAt='2026-10-17T09:00:00.123456789Z',status='firing')=>({status,labels:{alertname:'Latency objective exceeded',team,severity:'warning'},annotations:{summary:'Regional response latency',description:'Inspect the source dashboard'},startsAt,endsAt:status==='resolved'?'2026-10-17T10:00:00Z':'0001-01-01T00:00:00Z',fingerprint,generatorURL:'https://example.test/monitor'});
const group=alerts=>({version:'4',receiver:'Oncall',status:'firing',groupKey:'regional-latency',groupLabels:{alertname:'Latency objective exceeded'},commonLabels:{},commonAnnotations:{},alerts});
const pageObligation=(alert,target)=>{
 assert.ok(alert,'a page obligation has a retained alert');assert.equal(typeof alert.obligation?.id,'string');assert.ok(alert.obligation.id.length);
 assert.deepEqual(alert.obligation,{id:alert.obligation.id,state:'recorded',paging:'off',automatic:false,outcome:null,receipt:null,target,urgency:alert.urgency,policy:{version:0,mode:'alert-only',recoveredNotice:'silent',rule:null}});
};
const incompleteCustody=(state,receipt,raw,readableIds,owner,target)=>{
 assert.ok(receipt,'the incomplete receipt is readable through the owner state door');assert.equal(receipt.severity,'critical');assert.equal(receipt.truncated,true);
 assert.equal(receipt.incomplete.bytes,Buffer.byteLength(raw));assert.equal(receipt.incomplete.sha256,createHash('sha256').update(raw).digest('hex'));assert.equal(receipt.incomplete.dropped,null);
 assert.ok(receipt.incomplete.unreadBytes>0);assert.ok(receipt.incomplete.unreadBytes<=receipt.incomplete.bytes);assert.deepEqual(receipt.incomplete.readableIds,readableIds);
 assert.ok(receipt.incomplete.diagnostics.length>0&&receipt.incomplete.diagnostics.length<=30);assert.ok(receipt.incomplete.diagnostics.every(d=>d.length<=500));assert.ok(JSON.stringify(receipt).length<16000);
 assert.deepEqual(receipt.details.incomplete,receipt.incomplete);assert.deepEqual(receipt.details.ownerNotice,{owner,paging:'off',state:'recorded'});
 assert.ok(state.audit.some(a=>a.kind==='incomplete-intake'&&a.text.includes(receipt.id)));assert.ok(state.audit.some(a=>a.kind==='intake-owner-notice'&&a.text.includes(owner)&&a.text.includes(receipt.id)&&a.text.endsWith('paging remains OFF')));
 const alert=state.alerts.find(a=>a.id===receipt.alert);assert.ok(alert);assert.equal(alert.urgency,'high');assert.equal(alert.state,'active');pageObligation(alert,target);return alert;
};
try {
 cookie=(await w.request('/api/setup',{name:'Provider operator',password:'synthetic-provider-operator-password'})).cookie;const actor=ok(await req('/api/session')).member;
 for(const id of ['payments','search'])ok(await req('/api/command',{type:'service',id,name:id,environment:'production',owner:actor.id,runbook:[],pager:''}));
 for(const [id,provider] of [['am','alertmanager'],['gf','grafana'],['dd','datadog'],['pd','pagerduty']])ok(await req('/api/intake/sources',{id,name:id+' receiver',provider,service:'payments',key:keys[id],revision:0}),201);
 const first=group([alert('one'),alert('two','search')]);
 const response=ok(await send('am',first),202);assert.equal(response.receipts.length,2);assert.ok(response.receipts.every(r=>!('service'in r)&&!('outcome'in r)&&!('routing'in r)));
 let archive=ok(await req('/api/archive'));const original=archive.intakeReceipts.filter(r=>r.source==='am');assert.equal(original.length,2);assert.ok(original.every(r=>r.generation==='2026-10-17T09:00:00.123456789Z'));
 const repeated=ok(await send('am',{...first,groupKey:'changed group membership',alerts:[first.alerts[1],first.alerts[0]]}),202);assert.ok(repeated.receipts.every(r=>r.duplicate));assert.deepEqual(ok(await req('/api/archive')),archive);
 ok(await send('am',group([alert('one','payments','2026-10-17T09:10:00Z')])),202);
 ok(await send('am',group([alert('one','payments','2026-10-17T09:00:00.123456789Z','resolved')])),202);
 let state=ok(await req('/api/state')),old=state.alerts.find(a=>a.generation==='2026-10-17T09:00:00.123456789Z'&&a.id===original[0].alert),newer=state.alerts.find(a=>a.key===old.key&&a.generation==='2026-10-17T09:10:00Z');assert.equal(old.state,'recovered');assert.equal(newer.state,'active');
 ok(await send('am',group([alert('tombstone','payments','2026-10-17T09:20:00Z','resolved')])),202);ok(await send('am',group([alert('tombstone','payments','2026-10-17T09:20:00Z')])),202);state=ok(await req('/api/state'));assert.equal(state.alerts.find(a=>a.generation==='2026-10-17T09:20:00Z').state,'recovered');
 const grafana={...group([alert('grafana-one')]),version:'1',orgId:2};ok(await send('gf',grafana),202);ok(await send('gf',{...grafana,alerts:[{...grafana.alerts[0],status:'resolved',endsAt:'2026-10-17T10:00:00Z'}]}),202);
 // OC-030 optional Grafana HMAC: bearer plus signature, rotation and atomic custody.
 const signingPath='/api/monitoring/gf/signing',setting=ok(await req(signingPath));assert.equal(setting.configured,false);
 ok(await w.request(signingPath),401);ok(await w.request(signingPath,{revision:setting.revision,secret:randomBytes(32).toString('hex')}),401);
 const signer=()=>randomBytes(32).toString('hex');let signingSecret=signer();const previousSecret=signingSecret;
 const signing=ok(await req(signingPath,{revision:setting.revision,secret:signingSecret}));assert.equal(signing.configured,true);assert.ok(!JSON.stringify(signing).includes(signingSecret));
 const signed=async(payload,{secret=signingSecret,timestamp=null,signature,bearer=keys.gf}={})=>{const raw=typeof payload==='string'?payload:JSON.stringify(payload),headers={'content-type':'application/json',authorization:'Bearer '+bearer,'x-grafana-alerting-signature':signature??createHmac('sha256',secret).update(timestamp===null?raw:timestamp+':'+raw).digest('hex')};if(timestamp!==null)headers['x-grafana-alerting-timestamp']=timestamp;return w.send('/api/monitoring/gf',raw,headers);};
 const signingAlert={...grafana,alerts:[alert('synthetic-oncall-1')]};
 ok(await signed(signingAlert),202);ok(await signed({...grafana,alerts:[alert('synthetic-oncall-2')]},{timestamp:String(Math.floor(Date.now()/1000))}),202);
 const refusedBefore=ok(await req('/api/archive'));
 ok(await send('gf',{...grafana,alerts:[alert('synthetic-oncall-unsigned')]}),401);
 ok(await signed({...grafana,alerts:[alert('synthetic-oncall-wrong')]},{secret:signer()}),401);
 const stale=ok(await signed({...grafana,alerts:[alert('synthetic-oncall-stale')]},{timestamp:'1'}),401);assert.match(stale.error,/timestamp is stale/);
 ok(await signed(signingAlert,{bearer:'forged'}),401);
 let deniedSigning=ok(await req('/api/archive'));for(const key of ['events','alerts','intakeReceipts'])assert.deepEqual(deniedSigning[key],refusedBefore[key]);assert.ok(deniedSigning.audit.some(a=>a.kind==='intake-rejected'&&a.text.includes('Grafana signature is required')));
 signingSecret=signer();const rotated=ok(await req(signingPath,{revision:signing.revision,secret:signingSecret}));ok(await req(signingPath,{revision:signing.revision,secret:signer()}),409);
 ok(await signed(signingAlert,{secret:previousSecret}),401);ok(await signed({...grafana,alerts:[alert('synthetic-oncall-3')]}),202);
 const signingRollback=ok(await req('/api/archive')),heldCipher=w.sql("SELECT signing_custody FROM oc_intake_credentials WHERE source='gf'")[0].signing_custody;
 assert.ok(heldCipher.startsWith('v1.'));assert.ok(!heldCipher.includes(signingSecret));
 w.sql("CREATE TRIGGER grafana_signing_audit_fail BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic-oncall-4'); END");
 try{ok(await req(signingPath,{revision:rotated.revision,secret:signer()}),503);ok(await signed({...grafana,alerts:[alert('synthetic-oncall-audit-rollback')]}),503);}finally{w.sql('DROP TRIGGER grafana_signing_audit_fail');}
 assert.deepEqual(ok(await req('/api/archive')),signingRollback);assert.equal(w.sql("SELECT signing_custody FROM oc_intake_credentials WHERE source='gf'")[0].signing_custody,heldCipher);
 const viewer=ok(await req('/api/members',{name:'synthetic-oncall-5',role:'viewer',password:'synthetic-oncall-viewer-password'}),201),viewerCookie=(await w.request('/api/login',{name:viewer.name,password:'synthetic-oncall-viewer-password'})).cookie;
 ok(await w.request(signingPath,undefined,viewerCookie),403);ok(await w.request(signingPath,{revision:rotated.revision,secret:null},viewerCookie),403);
 // Existing bearer-only requests below deliberately exercise the unchanged optional mode.
 ok(await req(signingPath,{revision:ok(await req(signingPath)).revision,secret:null}));
 ok(await send('gf',{...grafana,alerts:[alert('synthetic-oncall-bearer-only')]}),202);
 assert.ok(!JSON.stringify(ok(await req('/api/archive'))).includes(signingSecret));
 console.log('PASS OC-030 Grafana required/unsigned/wrong/stale/rotation/bearer-only, protected setting, audit rollback');
 const datadog={id:'event-1',alert_id:'monitor-2',alert_cycle_key:'outage-3',alert_scope:'region:us-east',alert_transition:'Triggered',date:Date.parse('2026-10-17T09:00:00Z'),alert_type:'error',tags:'team:payments,region:us-east',title:'Datadog database timeout',body:'Literal <script>unsafe()</script>',link:'https://example.test/datadog'};
 ok(await send('dd',datadog),202);ok(await send('dd',{...datadog,id:'event-2',alert_transition:'Recovered',date:Date.parse('2026-10-17T10:00:00Z')}),202);ok(await send('dd',{...datadog,id:'event-3',alert_cycle_key:'outage-4',alert_transition:'No Data'}),202);assert.equal(ok(await req('/api/state')).intakeReceipts.at(-1).action,'trigger');
 // Authenticate before admitting any incomplete record; diagnostics grant no authority.
 const beforeDenied=ok(await req('/api/archive'));ok(await send('am',first,'forged'),401);const denied=ok(await req('/api/archive'));assert.deepEqual(denied.events,beforeDenied.events);assert.deepEqual(denied.intakeReceipts,beforeDenied.intakeReceipts);assert.equal(denied.audit.at(-1).kind,'intake-rejected');
 const long=alert('long-context');long.annotations.description='x'.repeat(12000);long.labels.token='must-not-survive';long.labels.secretEcho=keys.am;
 ok(await send('am',group([long])),202);state=ok(await req('/api/state'));assert.ok(state.intakeReceipts.at(-1).truncated);assert.ok(!JSON.stringify(state).includes('must-not-survive'));assert.ok(!JSON.stringify(state).includes(keys.am));
 const longIdentityResult=ok(await send('am',group([alert('f'.repeat(1200)+'a'),alert('f'.repeat(1200)+'b')])),202);assert.equal(longIdentityResult.receipts.length,2);assert.notEqual(longIdentityResult.receipts[0].id,longIdentityResult.receipts[1].id,'bounded context cannot merge distinct full provider identities');
 // The owner raises this receiver's allowance so the independent 200-alert custody journey fits.
 ok(await req('/api/intake/allowances',{id:'intake:am',requests:600,events:400,revision:ok(await req('/api/state')).revision}));
 // The named contract group: 200 actual alerts in a 300 KiB request.
 const storm=group(Array.from({length:200},(_,i)=>alert('storm-'+i)));storm.padding='';storm.padding='x'.repeat(300*1024-Buffer.byteLength(JSON.stringify(storm)));
 const beforeStorm=ok(await req('/api/state')),stormResult=ok(await send('am',storm),202);assert.equal(stormResult.receipts.length,200);state=ok(await req('/api/state'));assert.equal(state.events.length-beforeStorm.events.length,200);assert.equal(state.alerts.length-beforeStorm.alerts.length,200);
 assert.equal(stormResult.truncation,false);assert.equal(stormResult.incomplete,undefined);assert.ok(stormResult.receipts.every(r=>r.duplicate===false));
 assert.deepEqual(state.audit.filter(a=>['intake-rejected','intake-throttled'].includes(a.kind)),beforeStorm.audit.filter(a=>['intake-rejected','intake-throttled'].includes(a.kind)),'the 200-alert group has no refusal');
 for(const admitted of stormResult.receipts){const receipt=state.intakeReceipts.find(r=>r.id===admitted.id);assert.equal(receipt.source,'am');assert.equal(receipt.service,'payments');assert.equal(receipt.outcome,'opened');assert.ok(state.events.some(e=>e.id===receipt.event));pageObligation(state.alerts.find(a=>a.id===receipt.alert),{kind:'service',id:'payments'});}

 // OC-059 large and partly readable payloads create a page obligation with paging OFF, bounded evidence and no raw body.
 // A 3 MiB group retains readable members and a bounded incomplete record; a constant-low service rule cannot make it low.
 ok(await req('/api/urgency/services/payments',{baseVersion:0,mode:'low',timezone:'UTC',weekly:[],holidays:[],inside:'high',outside:'low',reason:'Payments pages only by hand'}),201);
 const oversize=JSON.stringify({...group([alert('readable-prefix','search')]),padding:'x'.repeat(3*1024*1024)}),large=ok(await send('am',oversize,keys.am,true),202);assert.equal(large.truncation,true);assert.ok(large.incomplete);assert.equal(large.receipts.length,1);state=ok(await req('/api/state'));let incomplete=state.intakeReceipts.find(r=>r.id===large.incomplete.receipt);
 const obligation=incompleteCustody(state,incomplete,oversize,large.receipts.map(r=>r.eventId),actor.id,{kind:'service',id:'payments'});assert.equal(incomplete.service,'payments');
 assert.deepEqual(obligation.urgencyHistory.map(e=>[e.from,e.to,e.ruleVersion]),[[null,'low',1],['low','high',null]]);assert.equal(obligation.urgencyHistory[1].id,'incomplete:'+incomplete.id);
 const overPd=JSON.stringify({routing_key:keys.pd,event_action:'trigger',dedup_key:'large-pd',payload:{summary:'Large provider observation',source:'pd-monitor',severity:'warning'},padding:'y'.repeat(600*1024)}),pdReply=await fetch(w.origin+'/v2/enqueue',{method:'POST',headers:{'content-type':'application/json'},body:overPd});assert.equal(pdReply.status,202);assert.equal((await pdReply.json()).truncation,true);
 state=ok(await req('/api/state'));const pdIncomplete=state.intakeReceipts.find(r=>r.source==='pd'&&r.incomplete?.sha256===createHash('sha256').update(overPd).digest('hex'));assert.equal(pdIncomplete?.service,'payments');
 const pdObligation=incompleteCustody(state,pdIncomplete,overPd,['large-pd'],actor.id,{kind:'service',id:'payments'});assert.deepEqual(pdObligation.urgencyHistory.map(e=>[e.from,e.to,e.ruleVersion]),[[null,'low',1],['low','high',null]]);assert.equal(pdObligation.urgencyHistory[1].id,'incomplete:'+pdIncomplete.id);
 // An oversized anonymous request on a known receiver gets an owner diagnostic, never custody.
 const deniedRaw=JSON.stringify({...group([alert('unauthenticated-oversize-must-not-survive')]),padding:'z'.repeat(3*1024*1024)}),beforeOversizeDenied=ok(await req('/api/archive'));
 ok(await w.send('/api/monitoring/am',deniedRaw,{'content-type':'application/json'}),401);const oversizeDenied=ok(await req('/api/archive'));
 assert.deepEqual(oversizeDenied.alerts,beforeOversizeDenied.alerts);assert.deepEqual(oversizeDenied.events,beforeOversizeDenied.events);assert.deepEqual(oversizeDenied.intakeReceipts,beforeOversizeDenied.intakeReceipts);
 assert.equal(oversizeDenied.audit.length,beforeOversizeDenied.audit.length+1);const refusal=oversizeDenied.audit.at(-1);assert.equal(refusal.kind,'intake-rejected');assert.ok(refusal.text.includes('integration am; owner '+actor.id));assert.ok(!JSON.stringify(oversizeDenied).includes('unauthenticated-oversize-must-not-survive'));assert.ok(!JSON.stringify(oversizeDenied).includes('z'.repeat(12000)));
 // Invalid siblings and malformed JSON retain readable identities and unknown denominators.
 const partial=ok(await send('gf',{...grafana,alerts:[alert('valid-sibling'),{status:'resolved'}]}),202);assert.ok(partial.incomplete);
 const malformed='{"version":"4","alerts":['+JSON.stringify(alert('malformed-readable'))+',{"broken":"';const malformedReply=ok(await send('am',malformed,keys.am,true),202);assert.equal(malformedReply.receipts.length,1);assert.ok(malformedReply.incomplete);
 ok(await req('/api/routing/keys',{id:'router',name:'Team labels',provider:'alertmanager',scope:['payments','search'],owner:actor.id,key:keys.router,revision:0,rules:[{id:'search-team',match:'all',conditions:[{field:'labels.team',op:'equals',value:'search'}],target:{service:'search'}}],catchAll:null}),201);
 ok(await send('router',group([alert('routed-search','search'),alert('unrouted-team','unknown')])),202);state=ok(await req('/api/state'));assert.equal(state.intakeReceipts.filter(r=>r.source==='router').find(r=>r.outcome!=='unrouted').service,'search');
 const unrouted=state.intakeReceipts.find(r=>r.source==='router'&&r.outcome==='unrouted');assert.equal(unrouted.alert,null);assert.equal(unrouted.generation,null);ok(await req('/api/routing/keys/router/readmit',{receipt:unrouted.id,service:'payments',operationId:'provider-readmit'}),201);assert.equal(ok(await req('/api/state')).intakeReceipts.at(-1).monitoring.sourceGeneration,unrouted.monitoring.sourceGeneration);
 const routedRaw=oversize,routedLarge=ok(await send('router',routedRaw,keys.router,true),202);assert.equal(routedLarge.truncation,true);assert.ok(routedLarge.incomplete);assert.equal(routedLarge.receipts.length,1);state=ok(await req('/api/state'));
 const routedReadable=state.intakeReceipts.find(r=>r.id===routedLarge.receipts[0].id);assert.equal(routedReadable.service,'search');assert.ok(state.events.some(e=>e.id===routedReadable.event&&e.service==='search'));pageObligation(state.alerts.find(a=>a.id===routedReadable.alert),{kind:'service',id:'search'});
 const ownerReceipt=state.intakeReceipts.find(r=>r.id===routedLarge.incomplete.receipt);assert.equal(ownerReceipt.service,null);assert.equal(ownerReceipt.outcome,'unrouted');assert.equal(ownerReceipt.routing.kind,'catch-all');assert.equal(ownerReceipt.routing.service,null);assert.equal(ownerReceipt.event,null);assert.equal(typeof ownerReceipt.generation,'string');
 const ownerAlert=incompleteCustody(state,ownerReceipt,routedRaw,routedLarge.receipts.map(r=>r.eventId),actor.id,{kind:'user',id:actor.id});assert.equal(ownerAlert.service,null);assert.equal(ownerAlert.owner,actor.id);assert.equal(ownerAlert.source,'intake:router');assert.equal(ownerAlert.key,ownerReceipt.key);assert.equal(ownerAlert.generation,ownerReceipt.generation);assert.deepEqual(ownerAlert.events,[]);
 // Failure to write permanent audit rolls back the incomplete owner queue and receipt together.
 const beforeQueueFailure=ok(await req('/api/archive')),beforeEventDebit=w.sql('SELECT COALESCE(SUM(events),0) AS n FROM oc_key_rate_usage')[0].n;
 w.sql("CREATE TRIGGER monitoring_queue_audit_fail BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic monitoring queue audit failure'); END");
 try {ok(await send('router','{"incomplete-queue-rollback":',keys.router,true),503);}finally{w.sql('DROP TRIGGER monitoring_queue_audit_fail');}
 assert.deepEqual(ok(await req('/api/archive')),beforeQueueFailure);assert.equal(w.sql('SELECT COALESCE(SUM(events),0) AS n FROM oc_key_rate_usage')[0].n,beforeEventDebit);
 ok(await req(signingPath,{revision:ok(await req(signingPath)).revision,secret:signingSecret}));
 state=ok(await req('/api/state'));archive=ok(await req('/api/archive'));for(const stored of [state,archive]){const serialized=JSON.stringify(stored);for(const secret of Object.values(keys))assert.ok(!serialized.includes(secret));assert.ok(!serialized.includes(signingSecret));assert.ok(!serialized.includes(previousSecret));for(const padding of ['x','y','z'])assert.ok(!serialized.includes(padding.repeat(12000)));assert.ok(!serialized.includes('unauthenticated-oversize-must-not-survive'));}
 const invalid=structuredClone(archive);invalid.intakeReceipts.find(r=>r.incomplete).incomplete.bytes=-1;ok(await req('/api/restore',{mode:'replace',archive:invalid}),400);assert.deepEqual(ok(await req('/api/archive')),archive);
 const restored=await req('/api/restore',{mode:'replace',archive});ok(restored);cookie=restored.cookie;state=ok(await req('/api/state'));assert.deepEqual(state.intakeReceipts,archive.intakeReceipts);assert.deepEqual(state.alerts,archive.alerts);assert.ok(state.intakeSources.every(s=>!s.active));assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_intake_credentials')[0].n,0);
 await w.stop();await w.start();state=ok(await req('/api/state'));assert.deepEqual(state.intakeReceipts,archive.intakeReceipts);assert.deepEqual(state.alerts,archive.alerts);
 console.log('PASS OC-059: 300 KiB Alertmanager group records 200 events and service page obligations with no refusal. 600 KiB PagerDuty v2 and 3 MiB Alertmanager retain high incomplete service obligations, integration-owner notices and bounded dropped evidence with 202 truncation. Oversize unauthenticated intake returns 401, retains a refusal diagnostic and creates no alerts or receipts. The same 3 MiB routed group records readable service obligations and a high integration-owner queue obligation. Audit failure rolls back incomplete owner custody. State and archive exclude raw bodies and secrets; inactive restore and restart preserve receipts and obligations. Paging remains OFF. Monitoring public Worker journey also preserves retry/reorder identity, old recovery and tombstones, Grafana/Datadog, unreadable siblings, scoped routing and readmission.');
} finally {await w.close();}
