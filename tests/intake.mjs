import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {durableSnapshot,localWorker,ownerDoor} from './worker.mjs'
import {readFile} from 'node:fs/promises'
import {localPart,mail,recoveryRules} from './email-fixtures.mjs'
// One real emitted-Worker journey. Provider request bodies are synthetic test
// inputs built to their documented protocols; no live-sender claim is made.
const w=await localWorker({INBOUND_EMAIL_DOMAIN:'inbound.example.test'},{clock:true}),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value};
const keys={pd:randomBytes(32).toString('hex'),og:randomBytes(32).toString('hex'),sp:randomBytes(32).toString('hex'),other:randomBytes(32).toString('hex')};
let cookie;
const request=(path,data)=>w.request(path,data,cookie);
const external=async(path,data,headers={})=>{const r=await fetch(w.origin+path,{method:data===undefined?'GET':'POST',headers:{'content-type':'application/json',connection:'close',...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:r.status,value:await r.json()}};
const pd=(action,key='checkout-latency',extra={})=>external('/v2/enqueue',{routing_key:keys.pd,event_action:action,dedup_key:key,...(action==='trigger'?{payload:{summary:'Checkout latency above two seconds',source:'checkout-monitor',severity:'critical',custom_details:{component:'checkout',token:'must-not-survive',echo:keys.pd}},links:[{href:'https://example.test/latency'},{href:'https://example.test/private?token=hidden'}]}:{}),...extra});
const og=(action,alias='payments-db',extra={})=>external(action==='trigger'?'/v2/alerts':'/v2/alerts/'+encodeURIComponent(alias)+'/'+action+'?identifierType=alias',action==='trigger'?{alias,message:'Payments database connections exhausted',priority:'P4',tags:['team:payments'],...extra}:extra,{authorization:'GenieKey '+keys.og});
const sp=(message_type,entity_id='search-cluster')=>external('/integrations/generic/20131114/alert/'+keys.sp+'/search',{message_type,entity_id,state_message:'Search replicas need attention',monitoring_tool:'cluster-monitor'});
try {
  cookie=(await w.request('/api/setup',{name:'Intake operator',password:'synthetic-intake-operator-password'})).cookie;
  const actor=ok(await request('/api/session')).member;
  for(const id of ['payments','search'])ok(await request('/api/command',{type:'service',id,name:id==='payments'?'Payments':'Search',environment:'production',owner:actor.id,runbook:['Inspect dependency health'],pager:''}));
  ok(await request('/api/command',{type:'policy',service:'payments',severity:'*',action:'route',owner:actor.id,reason:'Payments primary'}));
  const configure=(id,provider,service='payments',revision=0)=>request('/api/intake/sources',{id,name:id+' monitor',provider,service,key:keys[id],revision});
  ok(await configure('pd','pagerduty'),201);ok(await configure('og','opsgenie'),201);ok(await configure('sp','splunk','search'),201);ok(await configure('other','pagerduty','search'),201);
  // OC-055 populated additive upgrade: recreate only the new empty credential table over held data.
  assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_incumbent_credentials')[0].n,0);
  const priorTables=w.sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name<>'oc_incumbent_credentials' ORDER BY name").map(row=>row.name);
  const heldSql=priorTables.map(name=>'SELECT * FROM "'+name.replaceAll('"','""')+'"').join(';'),heldRows=w.statements(heldSql);
  w.statements('DROP TRIGGER incumbent_key_distinct_insert; DROP TRIGGER incumbent_key_distinct_update; DROP TRIGGER native_key_distinct_insert; DROP TRIGGER native_key_distinct_update; DROP TABLE oc_incumbent_credentials');
  w.statements((await readFile('migrations/core/0140_incumbent_intake_credentials.sql','utf8')).replace(/^--.*$/gm,''));
  assert.ok(JSON.stringify(w.statements(heldSql))===JSON.stringify(heldRows),'additive incumbent-key migration preserves every held application row');
  console.log('OC-055 populated upgrade: prior tables and held native credentials unchanged; new hashed custody empty');
  // OC-033: real emitted email() door, with only Cloudflare delivery faked.
  const local=localPart(),addressInput={id:'email-db',name:'Nightly database email',service:'payments',owner:actor.id,localPart:local,mode:'subject',fallback:'subject',rules:[]};
  ok(await request('/api/email/addresses',addressInput),201);
  for(const subject of ['  Re: FAILED nightly database  ','Fwd: FAILED   nightly database','FW: FAILED nightly database'])await mail(w,local,subject);
  let emails=ok(await request('/api/email')),emailReceipts=emails.receipts.filter(r=>r.address==='email-db');
  assert.deepEqual(emailReceipts.map(r=>r.outcome),['opened','deduplicated','deduplicated']);
  assert.equal(new Set(emailReceipts.map(r=>r.generation)).size,1);assert.equal(new Set(emailReceipts.map(r=>r.obligation)).size,1);
  assert.equal(ok(await request('/api/state')).alerts.find(a=>a.id===emailReceipts[0].alert).events.length,3);
  const unique='duplicate-email';await mail(w,local,'Duplicate failure',{id:unique});await mail(w,local,'Duplicate failure',{id:unique});
  emails=ok(await request('/api/email'));assert.equal(emails.receipts.filter(r=>r.address==='email-db').length,4);assert.equal(emails.receipts.at(-1).deliveries,2);
  await mail(w,local,'Spoofed owner',{id:'spoofed',auth:'fail',from:'owner@example.test'});await mail(w,local,'Spoofed owner',{id:'spoofed',auth:'fail',from:'owner@example.test'});assert.equal(ok(await request('/api/email')).receipts.at(-1).deliveries,2);
  await mail(w,local,'Oversize',{body:'x'.repeat(513*1024)});
  await mail(w,local,'Malformed',{raw:`From: monitor@example.test\r\nTo: ${local}@inbound.example.test\r\nMessage-ID: <malformed@monitor.example.test>\r\nAuthentication-Results: mx.cloudflare.net; dmarc=pass header.from=example.test\r\nContent-Type: multipart/mixed; boundary=broken\r\n\r\n--broken\r\nContent-Type: text/plain\r\n\r\nnot closed`});
  await mail(w,localPart(),'Unknown integration');
  emails=ok(await request('/api/email'));assert.ok(emails.quarantine.some(q=>q.reason==='sender_authentication_failed'));assert.ok(emails.quarantine.some(q=>q.reason==='inbound_raw_limit'));assert.ok(emails.quarantine.some(q=>q.reason==='unknown_address'));assert.ok(emails.quarantine.length>=4);
  const attachmentRaw=`From: monitor@example.test\r\nTo: ${local}@inbound.example.test\r\nMessage-ID: <attachments@monitor.example.test>\r\nSubject: Attachment failure\r\nAuthentication-Results: mx.cloudflare.net; dmarc=pass header.from=example.test\r\nContent-Type: multipart/mixed; boundary=parts\r\n\r\n--parts\r\nContent-Type: text/plain\r\n\r\nSafe monitor result\r\n--parts\r\nContent-Type: text/html\r\n\r\n<script>throw new Error('html_must_not_survive')</script>\r\n--parts\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename=data.bin\r\n\r\nattachment_must_not_survive\r\n--parts--\r\n`;
  await mail(w,local,'Attachment failure',{raw:attachmentRaw});assert.ok(!JSON.stringify(ok(await request('/api/email'))).includes('must_not_survive'));
  await mail(w,local,'Attachment limit',{raw:attachmentRaw.replace('attachment_must_not_survive','b'.repeat(65*1024)).replace('<attachments@','<overattachment@')});assert.equal(ok(await request('/api/email')).receipts.at(-1).diagnostic,'inbound_attachment_limit');
  const emailBeforeFailure=ok(await request('/api/archive'));
  w.sql("CREATE TRIGGER reject_email_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.feature='email' BEGIN SELECT RAISE(ABORT,'synthetic email audit failure'); END");
  await mail(w,local,'Must roll back');w.sql('DROP TRIGGER reject_email_audit');assert.deepEqual(ok(await request('/api/archive')),emailBeforeFailure);
  const rotated=localPart();ok(await request('/api/email/addresses/email-db/rotate',{revision:1,localPart:rotated}));await mail(w,local,'Retired address');
  assert.equal(ok(await request('/api/email')).receipts.at(-1).diagnostic,'revoked_address');
  await mail(w,rotated,'Fresh credential');ok(await request('/api/email/addresses/email-db/revoke',{revision:2}));await mail(w,rotated,'Revoked address');
  assert.equal(ok(await request('/api/email')).receipts.at(-1).diagnostic,'revoked_address');
  assert.ok(!JSON.stringify(ok(await request('/api/archive'))).includes(local));
  ok(await external('/api/email',undefined,{authorization:'Bearer '+rotated}),401);
  ok(await external('/api/command',{type:'declare',service:'payments',title:'Forged mail',severity:'critical',alerts:[]},{authorization:'Bearer '+rotated,origin:w.origin}),401);
  // Custom-rule failure retries and recovery share one recorded obligation.
  const customLocal=localPart(),customAddress='synthetic-oncall-330',customKey='synthetic-oncall-331';
  ok(await request('/api/email/addresses',{id:customAddress,name:'Synthetic database monitor',service:'payments',owner:actor.id,localPart:customLocal,mode:'custom',fallback:'quarantine',rules:recoveryRules()}),201);
  const pagingBeforeEmail=ok(await request('/api/paging/state'));
  for(const id of ['synthetic-oncall-332','synthetic-oncall-333']) {
    assert.equal((await mail(w,customLocal,'FAILED: '+customKey,{id})).status,200);
  }
  const customOpened=ok(await request('/api/email')).receipts.filter(r=>r.address===customAddress);
  assert.deepEqual(customOpened.map(r=>r.outcome),['opened','deduplicated']);
  assert.equal(new Set(customOpened.map(r=>r.messageDigest)).size,2,'distinct message identities exercise subject deduplication');
  assert.ok(customOpened.every(r=>r.deliveries===1));
  const customBeforeRecovery=ok(await request('/api/state')),customAlert=customBeforeRecovery.alerts.find(a=>a.id===customOpened[0].alert);
  assert.ok(customAlert);assert.equal(customAlert.state,'active');
  assert.equal(customAlert.obligation.id,customOpened[0].obligation);
  assert.equal(customAlert.obligation.state,'recorded');assert.equal(customAlert.obligation.paging,'off');assert.equal(customAlert.obligation.automatic,false);
  const customIncident=ok(await request('/api/command',{type:'declare',service:'payments',severity:'critical',title:'Synthetic database customer impact',summary:'Human verification remains required after source recovery',alerts:[customAlert.id]}));
  assert.equal((await mail(w,customLocal,'OK: '+customKey,{id:'synthetic-oncall-334'})).status,200);
  const customRecovered=ok(await request('/api/email')).receipts.filter(r=>r.address===customAddress);
  assert.deepEqual(customRecovered.map(r=>r.outcome),['opened','deduplicated','recovered']);
  for(const row of customRecovered) {
    assert.equal(row.generation,customAlert.generation);assert.equal(row.alert,customAlert.id);assert.equal(row.obligation,customAlert.obligation.id);
    assert.equal(row.decision.mode,'custom');assert.equal(row.decision.key,customKey);assert.equal(row.decision.version,1);
  }
  assert.deepEqual(customRecovered.map(r=>r.decision.rule),['failed','failed','ok']);
  const customState=ok(await request('/api/state')),stopped=customState.alerts.find(a=>a.id===customAlert.id);
  assert.equal(customState.alerts.filter(a=>a.source==='email:'+customAddress).length,1);
  assert.equal(stopped.state,'recovered');assert.deepEqual(stopped.events,customRecovered.map(r=>r.event));
  assert.equal(stopped.obligation.id,customAlert.obligation.id);assert.equal(stopped.obligation.state,'stopped');
  assert.equal(stopped.obligation.outcome,'stopped by source recovery');assert.equal(stopped.obligation.receipt,customRecovered[2].id);
  assert.equal(customRecovered[2].stop,'stopped by source recovery');
  assert.ok(Number.isFinite(Date.parse(stopped.obligation.stoppedAt)));
  assert.equal(stopped.obligation.paging,'off');assert.equal(stopped.obligation.automatic,false);
  assert.match(stopped.obligation.cancellation,/no attempt handed to a provider/i);
  assert.equal(customState.incidents.find(i=>i.id===customIncident.id).state,'declared','email recovery cannot resolve the declared human incident');
  const pagingAfterEmail=ok(await request('/api/paging/state'));
  assert.equal(pagingAfterEmail.paging,'OFF');assert.deepEqual(pagingAfterEmail.receipts,[]);
  for(const field of ['jobs','receipts','callbacks'])assert.deepEqual(pagingAfterEmail[field],pagingBeforeEmail[field],'source recovery creates no production delivery history');
  // A delayed retry of the second failure cannot reopen its recovered generation.
  const delayedFailure=await mail(w,customLocal,'FAILED: '+customKey,{id:'synthetic-oncall-333'});
  assert.equal(delayedFailure.status,400);assert.match(delayedFailure.text,/duplicate_message_id; original receipt retained/);
  const customReplay=ok(await request('/api/email')).receipts.filter(r=>r.address===customAddress);
  assert.deepEqual(customReplay.map(r=>r.id),customRecovered.map(r=>r.id));
  assert.equal(customReplay[1].deliveries,2);assert.equal(customReplay[1].lastDiagnostic,'duplicate_message_id');
  const afterCustomReplay=ok(await request('/api/state'));
  assert.deepEqual(afterCustomReplay.alerts,customState.alerts,'message retry cannot reopen or replace the stopped obligation');
  assert.deepEqual(afterCustomReplay.incidents,customState.incidents,'message retry changes no human incident');
  console.log('PASS OC-033 custom email: distinct failure messages open and deduplicate one generation and canonical recorded obligation; resolve stops it by source recovery, keeps the declared incident open and creates no production delivery receipt. Paging remains OFF.');
  const original=ok(await request('/api/state'));
  const nativeKey=randomBytes(32).toString('hex');ok(await request('/api/sources',{id:'native',key:nativeKey,scopes:['payments']}));
  const native={source:'native',eventId:'held-trigger',service:'payments',environment:'production',key:'held',generation:'held-cycle',intent:'trigger',severity:'warning',title:'Held native observation',observedAt:'2026-10-01T00:00:00Z',evidence:''};
  ok(await external('/api/ingress/native',native,{authorization:'Bearer '+nativeKey}),201);
  const nativeEvent=ok(await request('/api/state')).events.find(e=>e.eventId==='held-trigger');
  const first=ok(await pd('trigger'),202);assert.equal(first.dedup_key,'checkout-latency');ok(await pd('trigger'),202);
  let state=ok(await request('/api/state')),receipts=state.intakeReceipts.filter(r=>r.source==='pd');
  assert.deepEqual(receipts.map(r=>r.outcome),['opened','deduplicated']);assert.equal(new Set(receipts.map(r=>r.generation)).size,1);
  assert.equal(state.alerts.filter(a=>a.source==='intake:pd').length,1);assert.equal(state.events.find(e=>e.id===receipts[0].event).decision.owner,actor.id);
  assert.ok(!JSON.stringify(state).includes(keys.pd));assert.ok(!JSON.stringify(state).includes('must-not-survive'));assert.deepEqual(receipts[0].links,['https://example.test/latency']);assert.equal(receipts[0].truncated,true);
  const incident=ok(await request('/api/command',{type:'declare',service:'payments',severity:'critical',title:'Checkout customer impact',summary:'Investigating latency',alerts:[receipts[0].alert]}));
  ok(await pd('acknowledge'),202);assert.equal(ok(await request('/api/state')).incidents.find(i=>i.id===incident.id).state,'declared','source acknowledgement never becomes human acknowledgement');
  ok(await pd('resolve'),202);ok(await pd('resolve'),202);ok(await pd('trigger'),202);
  state=ok(await request('/api/state'));receipts=state.intakeReceipts.filter(r=>r.source==='pd');
  assert.deepEqual(receipts.map(r=>r.outcome),['opened','deduplicated','acknowledged','recovered','no-effect','opened']);assert.notEqual(receipts[0].generation,receipts.at(-1).generation,'identical trigger can reopen after recovery');
  assert.equal(state.incidents.find(i=>i.id===incident.id).state,'declared');
  ok(await pd('resolve','before-trigger'),202);ok(await pd('trigger','before-trigger'),202);assert.equal(ok(await request('/api/state')).intakeReceipts.at(-1).outcome,'opened');
  const a=ok(await pd('trigger',undefined,{dedup_key:undefined}),202),b=ok(await pd('trigger',undefined,{dedup_key:undefined}),202);assert.notEqual(a.dedup_key,b.dedup_key);
  const v1={service_key:keys.pd,event_type:'trigger',incident_key:'legacy-monitor',description:'Legacy monitor failure',details:{region:'us-east'}};
  ok(await external('/generic/2010-04-15/create_event.json',v1));ok(await external('/generic/2010-04-15/create_event.json',{...v1,event_type:'resolve'}));
  const ogReceipt=ok(await og('trigger'),202);ok(await og('trigger'),202);ok(await og('notes','payments-db',{note:'Database owner investigating'}),202);ok(await og('acknowledge'),202);ok(await og('close'),202);
  const status=ok(await external('/v2/alerts/requests/'+ogReceipt.requestId,undefined,{authorization:'GenieKey '+keys.og}));assert.equal(status.data.isSuccess,true);
  ok(await external('/v2/alerts/requests/'+ogReceipt.requestId,undefined,{authorization:'GenieKey '+keys.sp}),401);
  ok(await og('close','never-open'),202);
  ok(await sp('INFO'));ok(await sp('CRITICAL'));ok(await sp('ACKNOWLEDGEMENT'));ok(await sp('RECOVERY'));
  state=ok(await request('/api/state'));assert.equal(state.intakeReceipts.find(r=>r.source==='og').severity,'warning');assert.equal(state.intakeReceipts.find(r=>r.source==='sp').outcome,'no-effect');
  assert.equal(state.alerts.filter(a=>a.source==='intake:sp').length,1);
  // Service binding is taken from the credential, never from a supplied service.
  ok(await pd('trigger','scope-probe',{service:'search'}),202);assert.equal(ok(await request('/api/state')).intakeReceipts.at(-1).service,'payments');
  const beforeDenied=ok(await request('/api/archive'));
  ok(await pd('trigger','forged',{routing_key:'forged'}),400);ok(await external('/v2/enqueue',null),400);ok(await external('/v2/enqueue',{routing_key:keys.sp,event_action:'trigger'}),400);
  ok(await external('/api/state',undefined,{authorization:'Bearer '+keys.pd}),401);
  const afterDenied=ok(await request('/api/archive')),accepted=({revision,audit,...records})=>records;
  assert.deepEqual(accepted(afterDenied),accepted(beforeDenied),'rejected intake changes no accepted product records');
  assert.deepEqual(afterDenied.audit.slice(0,beforeDenied.audit.length),beforeDenied.audit);
  // The two anonymous refusals share one diagnostic; the wrong-provider key names its own integration.
  assert.equal(afterDenied.audit.length-beforeDenied.audit.length,2);assert.ok(afterDenied.audit.slice(beforeDenied.audit.length).every(entry=>entry.kind==='intake-rejected'),'refused credentials remain visible to integration owners');
  const simultaneous=await Promise.all([pd('trigger','concurrent'),pd('trigger','concurrent')]);assert.ok(simultaneous.some(r=>r.status===202));assert.ok(simultaneous.every(r=>[202,503].includes(r.status)));
  for(const r of simultaneous)if(r.status===503)ok(await pd('trigger','concurrent'),202);
  assert.equal(ok(await request('/api/state')).alerts.filter(a=>a.source==='intake:pd'&&a.key==='concurrent').length,1);
  const beforeFailure=ok(await request('/api/archive'));
  w.sql("CREATE TRIGGER reject_intake BEFORE INSERT ON oc_intake_receipts BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END");
  ok(await pd('trigger','rollback'),503);w.sql('DROP TRIGGER reject_intake');assert.deepEqual(ok(await request('/api/archive')),beforeFailure);
  // Rotate/revoke over the real management door, and preserve prior receipt custody.
  const oldKey=keys.pd;keys.pd=randomBytes(32).toString('hex');ok(await configure('pd','pagerduty','payments',1));
  ok(await external('/v2/enqueue',{routing_key:oldKey,event_action:'resolve',dedup_key:'checkout-latency'}),400);ok(await pd('trigger','new-key'),202);
  ok(await request('/api/intake/sources/pd/revoke',{revision:2}));ok(await pd('trigger','revoked'),400);
  const viewer=ok(await request('/api/members',{name:'Intake reader',role:'viewer',password:'synthetic-intake-reader-password'}),201),viewerCookie=(await w.request('/api/login',{name:viewer.name,password:'synthetic-intake-reader-password'})).cookie;
  ok(await w.request('/api/intake/sources',{id:'viewer',name:'Denied',provider:'pagerduty',service:'payments',revision:0,key:keys.pd},viewerCookie),403);
  ok(await w.request('/api/email',undefined,viewerCookie),403);ok(await w.request('/api/email/addresses/email-db/publish',{revision:3,mode:'subject',fallback:'subject',rules:[]},viewerCookie),403);assert.equal(ok(await w.request('/api/state',undefined,viewerCookie)).emailSamples,undefined);
  // OC-055 provider identity bounds refuse, never truncate or retain an incomplete alert.
  // PD was revoked by the original lifecycle journey; rotate through the existing explicit admin door.
  keys.pd=randomBytes(32).toString('hex');ok(await configure('pd','pagerduty','payments',3));
  const bounds=[['pagerduty-v2',255,key=>pd('trigger',key)],['pagerduty-v1',255,key=>external('/generic/2010-04-15/create_event.json',{service_key:keys.pd,event_type:'trigger',incident_key:key,description:'Synthetic bounded identity'})],['opsgenie',512,key=>og('trigger',key)],['splunk',200,key=>sp('CRITICAL',key)]];
  for(const [provider,limit,send] of bounds) {
   const key=provider+'x'.repeat(limit-provider.length),response=await send(key);ok(response,provider==='pagerduty-v2'||provider==='opsgenie'?202:200);
   const before=ok(await request('/api/state'));
   for(const invalid of [key+'x','synthetic-oncall-identity\ncontrol',' synthetic-oncall-leading','synthetic-oncall-\ud800']) {
    const refused=await send(invalid);assert.equal(refused.status,400);if(provider.startsWith('pagerduty'))assert.equal(refused.value.status,'invalid event');
    const after=ok(await request('/api/state'));assert.deepEqual(after.alerts,before.alerts);assert.deepEqual(after.intakeReceipts,before.intakeReceipts);
   }
   assert.ok(before.intakeReceipts.some(receipt=>receipt.key===key),'maximum identity remains exact');
  }
  const actionBefore=ok(await request('/api/state'));
  ok(await pd('trigger','synthetic-oncall-invalid-action',{event_action:'x'.repeat(300)}),400);ok(await sp('x'.repeat(300)),400);
  assert.deepEqual(ok(await request('/api/state')).alerts,actionBefore.alerts);
  console.log('OC-055 identity bounds: PD v1/v2 255, Opsgenie 512 and conservative Splunk 200; invalid characters/actions and over-limit identities refuse without alert or incomplete custody');

  // OC-055 administrator-supplied incumbent keys, separate activation and no echo.
  const importDoor=ownerDoor(w,cookie),incumbentKeys=[],nativeIncumbentKeys=[];
  for(const [vendor,provider,kind] of [['pagerduty','pagerduty','events_api_v2_inbound_integration'],['opsgenie','opsgenie','API'],['splunk','splunk','REST']]) {
   const id='synthetic-oncall-inc-'+vendor,foreign='synthetic-oncall-foreign-'+vendor;
   const plan=ok(await importDoor.preview(vendor,JSON.stringify({integrations:[{id:foreign,type:kind,name:'Synthetic integration'}]})));ok(await importDoor.apply(vendor,plan));
   const rows=()=>request('/api/move-in/objects').then(ok),imported=(await rows()).find(row=>row.targetId===vendor+':'+foreign);
   const key=randomBytes(vendor==='pagerduty'?16:32).toString('hex');incumbentKeys.push(key);
   const input={importedId:imported.targetId,importedRevision:imported.revision,id,service:'payments',name:'Synthetic incumbent '+vendor,revision:0,key};
   ok(await w.request('/api/intake/incumbent',input),401);ok(await w.request('/api/intake/incumbent',input,viewerCookie),403);
   const snapshot=ok(await request('/api/archive')),objects=await rows();
   w.sql("CREATE TRIGGER synthetic_incumbent_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.feature='intake' BEGIN SELECT RAISE(ABORT,'SYNTHETIC_INCUMBENT_AUDIT_FAILURE'); END");
   ok(await request('/api/intake/incumbent',input),503);w.sql('DROP TRIGGER synthetic_incumbent_audit');
   assert.deepEqual(ok(await request('/api/archive')),snapshot);assert.deepEqual(await rows(),objects);
   const beforeRaceAudit=new Set(ok(await request('/api/audit/export')).rows.map(row=>row.id));
   const race=await Promise.all([request('/api/intake/incumbent',input),request('/api/intake/incumbent',input)]);assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);
   const raceAudit=ok(await request('/api/audit/export')).rows.filter(row=>!beforeRaceAudit.has(row.id)&&row.feature==='intake');
   assert.equal(raceAudit.filter(row=>row.outcome==='accepted').length,1,'one supply commits with its audit');assert.equal(raceAudit.filter(row=>row.outcome==='refused').length,1,'one conflicting request retains one permanent refusal');
   let status=ok(await request('/api/intake/sources/'+id+'/incumbent'));assert.equal(status.source.active,false);assert.equal(status.keySupplied,true);
   ok(await request('/api/intake/sources',{id,provider,service:'payments',name:'Synthetic bypass refused',revision:status.source.revision,key:randomBytes(32).toString('hex')}),409);
   ok(await w.request('/api/intake/sources/'+id+'/incumbent',undefined,viewerCookie),403);ok(await w.request('/api/intake/sources/'+id+'/incumbent'),401);
   const send=(credential,identity)=>vendor==='pagerduty'?external('/v2/enqueue',{routing_key:credential,event_action:'trigger',dedup_key:identity,payload:{summary:'Synthetic incumbent observation',source:'synthetic-oncall-source',severity:'warning'}}):vendor==='opsgenie'?external('/v2/alerts',{alias:identity,message:'Synthetic incumbent observation'},{authorization:'GenieKey '+credential}):external('/integrations/generic/20131114/alert/'+credential+'/synthetic-oncall-route',{message_type:'WARNING',entity_id:identity,state_message:'Synthetic incumbent observation'});
   const deniedBefore=ok(await request('/api/state')).alerts;
   ok(await send(key,id+'-inactive'),vendor==='pagerduty'?400:401);assert.deepEqual(ok(await request('/api/state')).alerts,deniedBefore);
   const activation={revision:status.source.revision,confirmed:true},activate=()=>request('/api/intake/sources/'+id+'/activate-incumbent',activation);
   ok(await w.request('/api/intake/sources/'+id+'/activate-incumbent',activation,viewerCookie),403);
   const beforeActivate=ok(await request('/api/archive'));
   w.sql("CREATE TRIGGER synthetic_incumbent_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.feature='intake' BEGIN SELECT RAISE(ABORT,'SYNTHETIC_INCUMBENT_AUDIT_FAILURE'); END");
   ok(await activate(),503);w.sql('DROP TRIGGER synthetic_incumbent_audit');assert.deepEqual(ok(await request('/api/archive')),beforeActivate);
   const activated=ok(await activate());nativeIncumbentKeys.push(activated.nativeKey);assert.equal(activated.source.active,true);
   ok(await send(key,id+'-accepted'),vendor==='splunk'?200:202);ok(await send(activated.nativeKey,id+'-accepted'),vendor==='splunk'?200:202);
   assert.equal(ok(await request('/api/state')).alerts.filter(alert=>alert.source==='intake:'+id&&alert.key===id+'-accepted').length,1,'both keys share the same source identity and generation');
   if(vendor==='pagerduty')ok(await external('/generic/2010-04-15/create_event.json',{service_key:key,event_type:'trigger',incident_key:id+'-v1',description:'Synthetic incumbent v1'}));
   const beforeWrong=ok(await request('/api/state')).alerts;ok(await send('synthetic-oncall-wrong-key-not-supplied',id+'-wrong'),vendor==='pagerduty'?400:401);assert.deepEqual(ok(await request('/api/state')).alerts,beforeWrong);
   status=ok(await request('/api/intake/sources/'+id+'/incumbent'));
   const beforeRevoke=ok(await request('/api/archive'));
   w.sql("CREATE TRIGGER synthetic_incumbent_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.feature='intake' BEGIN SELECT RAISE(ABORT,'SYNTHETIC_INCUMBENT_AUDIT_FAILURE'); END");
   ok(await request('/api/intake/sources/'+id+'/revoke',{revision:status.source.revision}),503);w.sql('DROP TRIGGER synthetic_incumbent_audit');assert.deepEqual(ok(await request('/api/archive')),beforeRevoke);
   ok(await request('/api/intake/sources/'+id+'/revoke',{revision:status.source.revision}));
   ok(await send(key,id+'-revoked'),vendor==='pagerduty'?400:401);ok(await send(activated.nativeKey,id+'-revoked-native'),vendor==='pagerduty'?400:401);
   assert.equal(w.sql("SELECT COUNT(*) AS n FROM oc_incumbent_credentials WHERE source='"+id+"'")[0].n,0,'revocation erases incumbent verification material');
   // Resupply/rotate without activation, so restore must erase a real held hash.
   const current=(await rows()).find(row=>row.targetId===imported.targetId),revision=ok(await request('/api/intake/sources/'+id+'/incumbent')).source.revision;
   const rotated=randomBytes(vendor==='pagerduty'?16:32).toString('hex');incumbentKeys.push(rotated);
   const rotation={...input,importedRevision:current.revision,revision,key:rotated};
   const beforeRotation=ok(await request('/api/archive')),beforeRotationObjects=await rows();
   w.sql("CREATE TRIGGER synthetic_incumbent_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.feature='intake' BEGIN SELECT RAISE(ABORT,'SYNTHETIC_INCUMBENT_AUDIT_FAILURE'); END");
   ok(await request('/api/intake/incumbent',rotation),503);w.sql('DROP TRIGGER synthetic_incumbent_audit');assert.deepEqual(ok(await request('/api/archive')),beforeRotation);assert.deepEqual(await rows(),beforeRotationObjects);
   ok(await request('/api/intake/incumbent',rotation));assert.equal(ok(await request('/api/intake/sources/'+id+'/incumbent')).source.active,false);
   assert.equal(w.sql("SELECT length(key_digest) AS length FROM oc_incumbent_credentials WHERE source='"+id+"'")[0].length,64);
   const rotationCurrent=(await rows()).find(row=>row.targetId===imported.targetId);
   const competingRotation={...rotation,importedRevision:rotationCurrent.revision,revision:ok(await request('/api/intake/sources/'+id+'/incumbent')).source.revision};
   const beforeRotationRace=new Set(ok(await request('/api/audit/export')).rows.map(row=>row.id));
   const rotationRace=await Promise.all([request('/api/intake/incumbent',competingRotation),request('/api/intake/incumbent',competingRotation)]);
   assert.deepEqual(rotationRace.map(row=>row.status).sort(),[200,409],'concurrent incumbent rotations return a conflict without dropping the losing response');
   const rotationAudit=ok(await request('/api/audit/export')).rows.filter(row=>!beforeRotationRace.has(row.id)&&row.feature==='intake');
   assert.equal(rotationAudit.filter(row=>row.outcome==='accepted').length,1);assert.equal(rotationAudit.filter(row=>row.outcome==='refused').length,1,'a losing rotation retains exactly one refusal');

  }
  for(const path of ['/api/state','/api/workspace','/api/move-in/objects','/api/audit/export','/api/archive','/api/recovery/checkpoint','/']) {
   const value=JSON.stringify(ok(await request(path)));
   for(const key of [...incumbentKeys,...nativeIncumbentKeys])assert.ok(!value.includes(key),'key absent from '+path);
  }
  console.log('OC-055 incumbent keys: admin-only one-time supply, hash-only custody, audit rollback on supply/rotation/activation/revoke, concurrent supply, inactive refusal, dual-key deduplication, wrong/revoked refusal and no echo passed');
  const permanent=ok(await request('/api/audit/export'));for(const value of [local,rotated,'monitor@example.test','Nightly database email','Safe monitor result'])assert.ok(!JSON.stringify(permanent).includes(value));
  const archive=ok(await request('/api/archive'));for(const key of [...Object.values(keys),oldKey,nativeKey])assert.ok(!JSON.stringify(archive).includes(key));
  assert.equal(ok(await external('/api/ingress/native',native,{authorization:'Bearer '+nativeKey})).duplicate,true);
  assert.deepEqual(archive.events.find(e=>e.eventId==='held-trigger'),nativeEvent,'native observations stay unchanged');
  const malformed=structuredClone(archive);malformed.intakeReceipts[0].alert='unknown';ok(await request('/api/restore',{mode:'replace',archive:malformed}),400);assert.deepEqual(ok(await request('/api/archive')),archive);
  const restored=await request('/api/restore',{mode:'replace',archive});ok(restored);cookie=restored.cookie;
  state=ok(await request('/api/state'));assert.deepEqual(state.intakeReceipts,archive.intakeReceipts);assert.ok(state.intakeSources.every(s=>!s.active));assert.ok(state.emailAddresses.every(a=>!a.active));assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_email_credentials')[0].n,0);assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_intake_credentials')[0].n,0);assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_incumbent_credentials')[0].n,0,'restored incumbent integrations have no verification material');ok(await og('trigger','after-restore'),401);
  await w.stop();await w.start();assert.deepEqual(ok(await request('/api/state')).intakeReceipts,archive.intakeReceipts);
  assert.deepEqual(state.incidents,archive.incidents);assert.equal(state.events.find(e=>e.eventId==='held-trigger').generation,'held-cycle');
  assert.equal(state.members.length,original.members.length+1);
  // A restored historical address with a now-unmapped environment remains visible,
  // and even a freshly rotated credential cannot grant it another environment.
  const unmapped=ok(await request('/api/archive')),mapPart=localPart(),at=new Date().toISOString();
  unmapped.emailAddresses.push({id:'unmapped-mail',name:'Historical staging monitor',service:'payments',environment:'staging',owner:actor.id,active:false,revision:1,at});
  unmapped.emailRules.push({id:'unmapped-mode',address:'unmapped-mail',version:1,mode:'subject',fallback:'subject',rules:[],by:actor.id,at});
  const unmappedRestore=await request('/api/restore',{mode:'replace',archive:unmapped});ok(unmappedRestore);cookie=unmappedRestore.cookie;
  ok(await request('/api/email/addresses/unmapped-mail/rotate',{revision:1,localPart:mapPart}));await mail(w,mapPart,'Wrong environment');assert.equal(ok(await request('/api/email')).receipts.at(-1).diagnostic,'unmapped_service_environment');
  // Refused mail over an address's rate limit is not stored per message, and held mail never takes the human-authored allocation.
  // OC-040 email integration erasure shares the subject receipt, audit and restore boundary.
  const erasureId='synthetic-oncall-440',erasureLocal=localPart();
  const erasureDefinition={id:erasureId,name:'Synthetic erasable email',service:'payments',owner:actor.id,localPart:erasureLocal,mode:'subject',fallback:'subject',rules:[]};
  ok(await request('/api/email/addresses',erasureDefinition),201);
  await mail(w,erasureLocal,'synthetic-oncall-441 private failure');
  await mail(w,erasureLocal,'synthetic-oncall-442 refused sender',{auth:'fail'});
  const erasureState=ok(await request('/api/state')),erasureAlert=erasureState.alerts.find(a=>a.source==='email:'+erasureId);
  const erasureIncident=ok(await request('/api/command',{type:'declare',service:'payments',title:'Synthetic retained incident',summary:'Synthetic retained impact',severity:'warning',alerts:[erasureAlert.id]}));
  const erasureViewer=ok(await request('/api/members',{name:'synthetic-oncall-444',role:'viewer',password:'synthetic-oncall-444-password'}),201),erasureViewerCookie=(await w.request('/api/login',{name:erasureViewer.name,password:'synthetic-oncall-444-password'})).cookie;
  const beforeEmailErasure=ok(await request('/api/archive')),emailCheckpoint=ok(await request('/api/recovery/checkpoint'));
  const erasePath='/api/erasure/email/'+erasureId,eraseInput={workspaceRevision:beforeEmailErasure.revision,confirmation:'erase '+erasureId};
  ok(await w.request(erasePath,eraseInput),401);ok(await w.request(erasePath,eraseInput,erasureViewerCookie),403);
  ok(await request(erasePath,{...eraseInput,confirmation:'wrong'}),409);
  ok(await request(erasePath,{...eraseInput,workspaceRevision:0}),409);
  const copy='rer_portability_snap_synthetic_oncall_440';
  w.sql('CREATE TABLE '+copy+' AS SELECT * FROM oc_email_samples');
  const credentialBefore=w.sql('SELECT * FROM oc_email_credentials ORDER BY digest');
  const emailAuditBefore=ok(await request('/api/audit/export')).rows;
  w.sql("CREATE TRIGGER synthetic_oncall_440_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='email.erase' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-440'); END");
  try{ok(await request(erasePath,eraseInput),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_440_audit')}
  assert.deepEqual(ok(await request('/api/archive')),beforeEmailErasure);
  assert.deepEqual(w.sql('SELECT * FROM oc_email_credentials ORDER BY digest'),credentialBefore);
  assert.ok(w.sql('SELECT COUNT(*) AS n FROM '+copy)[0].n>0);
  w.sql("CREATE TRIGGER synthetic_oncall_440_delete BEFORE DELETE ON oc_email_credentials BEGIN SELECT RAISE(ABORT,'synthetic-oncall-440'); END");
  try{ok(await request(erasePath,eraseInput),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_440_delete')}
  assert.deepEqual(ok(await request('/api/archive')),beforeEmailErasure);
  const erasedEmail=ok(await request(erasePath,eraseInput));
  assert.equal(erasedEmail.state,'complete');assert.equal(erasedEmail.standby,'not-reconciled');
  for(const table of ['oc_email_addresses','oc_email_rules','oc_email_samples','oc_email_receipts','oc_email_quarantine','oc_email_credentials','oc_events','oc_alerts',copy])assert.ok(erasedEmail.stores[table].deleted>0,table+' has committed deletion counts');
  const afterEmailErasure=ok(await request('/api/archive'));
  assert.equal(w.sql("SELECT COUNT(*) AS n FROM oc_audit_identities WHERE entity_id='"+erasureId+"'")[0].n,0,'email audit identity associations are removed');
  const emailAuditAfter=ok(await request('/api/audit/export')).rows;assert.deepEqual(emailAuditAfter.filter(row=>emailAuditBefore.some(prior=>prior.id===row.id)),emailAuditBefore,'permanent audit facts retain their original labels after erasure');
  assert.ok(afterEmailErasure.emailAddresses.some(a=>a.id==='email-db'),'unrelated address retained');
  assert.ok(!JSON.stringify(afterEmailErasure).includes(erasureId),'no erased email subject survives in native state');
  assert.ok(!JSON.stringify(afterEmailErasure).includes('synthetic-oncall-441 private'));
  assert.deepEqual(afterEmailErasure.incidents.find(i=>i.id===erasureIncident.id).alerts,[],'linked incident remains without erased signal links');
  assert.equal(w.sql("SELECT COUNT(*) AS n FROM oc_email_credentials WHERE address='"+erasureId+"'")[0].n,0);
  for(const archive of [beforeEmailErasure,{...beforeEmailErasure,erasureFences:afterEmailErasure.erasureFences}])ok(await request('/api/restore',{mode:'replace',archive}),409);
  ok(await request('/api/recovery/restore',{mode:'replace',checkpoint:emailCheckpoint}),409);
  ok(await request('/api/email/addresses',erasureDefinition),410);
  ok(await request(erasePath,eraseInput),409);
  await w.stop();await w.start();
  ok(await request('/api/email/addresses',erasureDefinition),410);
  await mail(w,erasureLocal,'synthetic-oncall-443 retired credential');
  assert.equal(ok(await request('/api/email')).receipts.at(-1).diagnostic,'unknown_address');
  assert.ok(!ok(await request('/api/state')).alerts.some(a=>a.source==='email:'+erasureId));
  console.log('OC-040 email integration erasure: authority, confirmation, stale refusal, audit/table rollback, committed per-store counts, linked incident retention, transfer invalidation, forged-journal archive/checkpoint refusal, identity reuse and restart/retired delivery refusal passed');
  // Authenticated new receipts exhaust the address allowance even when every
  // subject groups into one alert. Refusal must happen before that custody moves.
  const rateAt='2026-10-30T00:00:00.000Z',rateAddress='synthetic-oncall-840',isolatedAddress='synthetic-oncall-841';
  await w.time(Date.parse(rateAt));
  const ratePart=localPart(),isolatedPart=localPart(),rateSubject='Synthetic grouped monitor failure';
  for(const [id,part] of [[rateAddress,ratePart],[isolatedAddress,isolatedPart]])ok(await request('/api/email/addresses',{id,name:id,service:'payments',owner:actor.id,localPart:part,mode:'subject',fallback:'subject',rules:[]}),201);
  for(let n=0;n<60;n++)assert.equal((await mail(w,ratePart,rateSubject,{id:'synthetic-oncall-840-'+n,auth:'pass'})).status,200);
  const groupedEmail=ok(await request('/api/email')),groupedReceipts=groupedEmail.receipts.filter(r=>r.address===rateAddress);
  assert.equal(groupedReceipts.length,60);assert.equal(new Set(groupedReceipts.map(r=>r.messageDigest)).size,60);
  assert.deepEqual(groupedReceipts.map(r=>r.outcome),['opened',...Array(59).fill('deduplicated')]);
  assert.ok(groupedReceipts.every(r=>r.deliveries===1&&r.at===rateAt&&r.decision.mode==='subject'&&r.decision.action==='trigger'));
  const groupedState=ok(await request('/api/state')),groupedAlerts=groupedState.alerts.filter(a=>a.source==='email:'+rateAddress);
  assert.equal(groupedAlerts.length,1);const groupedAlert=groupedAlerts[0];
  assert.equal(groupedAlert.state,'active');assert.ok(groupedAlert.generation);assert.ok(groupedAlert.obligation.id);
  assert.equal(groupedAlert.obligation.state,'recorded');assert.equal(groupedAlert.obligation.paging,'off');assert.equal(groupedAlert.obligation.automatic,false);
  assert.ok(groupedReceipts.every(r=>r.alert===groupedAlert.id&&r.generation===groupedAlert.generation&&r.obligation===groupedAlert.obligation.id));
  assert.deepEqual(groupedAlert.events,groupedReceipts.map(r=>r.event));
  assert.equal(groupedState.events.filter(e=>e.source==='email:'+rateAddress).length,60);
  assert.equal(groupedEmail.samples.filter(s=>s.address===rateAddress).length,60);
  const beforeRate=durableSnapshot(w);
  const overflow=await mail(w,ratePart,rateSubject,{id:'synthetic-oncall-840-60',auth:'pass'});
  assert.equal(overflow.status,400);assert.equal(overflow.text,'Worker rejected email with the following reason: address_rate_limit');
  const refusedEmail=ok(await request('/api/email')),refusedState=ok(await request('/api/state'));
  assert.deepEqual(refusedState.alerts,groupedState.alerts,'refusal preserves alert, generation and canonical obligation exactly');
  assert.deepEqual(refusedState.events,groupedState.events);assert.deepEqual(refusedEmail.samples,groupedEmail.samples);
  assert.deepEqual(refusedEmail.receipts.slice(0,-1),groupedEmail.receipts);
  const rateReceipt=refusedEmail.receipts.at(-1);
  assert.equal(rateReceipt.address,rateAddress);assert.equal(rateReceipt.at,rateAt);assert.equal(rateReceipt.outcome,'quarantined');assert.equal(rateReceipt.diagnostic,'address_rate_limit');
  assert.equal(rateReceipt.decision.action,'quarantine');assert.equal(rateReceipt.decision.reason,'address_rate_limit');
  for(const field of ['alert','event','generation','obligation','sample'])assert.equal(rateReceipt[field],null,'refused mail acquires no '+field);
  assert.deepEqual(refusedEmail.quarantine,[...groupedEmail.quarantine,{id:rateReceipt.id,receipt:rateReceipt.id,address:rateAddress,reason:'address_rate_limit'}]);
  const afterRate=durableSnapshot(w),rateWrites=new Set(['workspace_control','oc_audit_clock','oc_admin_audit','oc_email_receipts','oc_email_quarantine']);
  for(const [table,rows] of Object.entries(beforeRate))if(!rateWrites.has(table))assert.deepEqual(afterRate[table],rows,table+' unchanged by address refusal');
  for(const table of ['oc_email_receipts','oc_email_quarantine']) {
    assert.equal(afterRate[table].length,beforeRate[table].length+1);
    assert.deepEqual(afterRate[table].filter(row=>row.id!==rateReceipt.id),beforeRate[table],table+' retains every prior row exactly');
  }
  const rateAudit=afterRate.oc_admin_audit.filter(row=>!beforeRate.oc_admin_audit.some(prior=>prior.id===row.id));
  assert.deepEqual(afterRate.oc_admin_audit.filter(row=>beforeRate.oc_admin_audit.some(prior=>prior.id===row.id)),beforeRate.oc_admin_audit);
  assert.equal(rateAudit.length,1);assert.equal(rateAudit[0].kind,'email.receive');assert.equal(rateAudit[0].outcome,'refused');assert.equal(rateAudit[0].at,rateAt);
  assert.equal(rateAudit[0].workspace_before,groupedState.revision);assert.equal(rateAudit[0].workspace_after,groupedState.revision+1);
  for(let n=61;n<64;n++) {
    const refused=await mail(w,ratePart,rateSubject,{id:'synthetic-oncall-840-'+n,auth:'pass'});
    assert.equal(refused.status,400);assert.equal(refused.text,overflow.text);
    assert.deepEqual(durableSnapshot(w),afterRate,'subsequent refused message adds no per-message custody or audit');
  }
  assert.equal((await mail(w,isolatedPart,rateSubject,{id:'synthetic-oncall-841-0',auth:'pass'})).status,200);
  const isolatedEmail=ok(await request('/api/email')),isolatedReceipt=isolatedEmail.receipts.at(-1),isolatedState=ok(await request('/api/state'));
  assert.equal(isolatedReceipt.address,isolatedAddress);assert.equal(isolatedReceipt.outcome,'opened');assert.notEqual(isolatedReceipt.generation,groupedAlert.generation);
  assert.equal(isolatedEmail.receipts.filter(r=>r.address===rateAddress).length,61);
  assert.deepEqual(isolatedState.alerts.find(a=>a.id===groupedAlert.id),groupedAlert);
  assert.deepEqual(isolatedEmail.samples.filter(s=>s.address===rateAddress),groupedEmail.samples.filter(s=>s.address===rateAddress));
  console.log('PASS OC-084 authenticated email allowance before grouping: emitted email door at '+rateAt+'; 60 distinct authenticated same-subject messages -> one generation and recorded obligation; next message -> address_rate_limit before grouping, exact alert, events, samples and prior D1 rows retained; three later refusals -> zero writes; another address -> opened');
  const floodPart=localPart();ok(await request('/api/email/addresses',{id:'email-flood',name:'Flooded monitor',service:'payments',owner:actor.id,localPart:floodPart,mode:'subject',fallback:'subject',rules:[]}),201);
  for(let n=0;n<70;n++)await mail(w,floodPart,'Unauthenticated flood',{auth:'fail'});
  const flooded=ok(await request('/api/email')).receipts.filter(r=>r.address==='email-flood');
  assert.equal(flooded.filter(r=>r.diagnostic==='address_rate_limit').length,1,'one receipt records the engaged rate limit; later refusals in its minute are not stored');
  const heldMail=flooded.find(r=>r.diagnostic==='sender_authentication_failed').id;
  w.sql(`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<2000) INSERT INTO oc_email_receipts(id,ordinal,data) SELECT 'synthetic-oncall-'||i,(SELECT MAX(ordinal) FROM oc_email_receipts)+i,json_set(r.data,'$.id','synthetic-oncall-'||i) FROM n,oc_email_receipts r WHERE r.id='${heldMail}'`);
  ok(await request('/api/command',{type:'declare',service:'payments',severity:'critical',title:'Coordination beside held mail',summary:'s'.repeat(3000)}));
  console.log('OC-033 inbound email accepts, deduplicates, recovers and quarantines by address mode and rule without granting authority to the sender. Compatible intake: provider lifecycles, authority, concurrency, rollback, key rotation/revoke, native integrity and inactive archive/restart');
} finally {await w.close();}

// Continue the intake journey through monitoring provider protocols and incomplete custody.
{
const {default:assert}=await import('node:assert/strict')
const {randomBytes,createHash,createHmac}=await import('node:crypto')
const {localWorker}=await import('./worker.mjs')

// Local database pauses can outlive the Worker's pooled HTTP connection.
const fetch=(url,input={})=>globalThis.fetch(url,{...input,headers:{...input.headers,connection:'close'}});

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
 // New signing read door refuses revoked and expired sessions; competing rotations have one winner.
 const revokedLogin=await w.request('/api/login',{name:'Provider operator',password:'synthetic-provider-operator-password'});ok(await w.request('/api/logout',{},revokedLogin.cookie));ok(await w.request(signingPath,undefined,revokedLogin.cookie),401);
 const expiredLogin=await w.request('/api/login',{name:'Provider operator',password:'synthetic-provider-operator-password'}),expiredToken=expiredLogin.cookie.slice(expiredLogin.cookie.indexOf('=')+1);
 w.sql("UPDATE sessions SET expires=1 WHERE token='"+createHash('sha256').update(expiredToken).digest('hex')+"'");ok(await w.request(signingPath,undefined,expiredLogin.cookie),401);
 ok(await req('/api/monitoring/am/signing'),404);ok(await req(signingPath,{revision:rotated.revision,secret:'short'}),400);
 const competingSecrets=[signer(),signer()],competingRevision=ok(await req(signingPath)).revision,competing=await Promise.all(competingSecrets.map(secret=>req(signingPath,{revision:competingRevision,secret})));
 assert.deepEqual(competing.map(r=>r.status).sort(),[200,409]);signingSecret=competingSecrets[competing.findIndex(r=>r.status===200)];ok(await signed({...grafana,alerts:[alert('synthetic-oncall-rotation-winner')]}),202);
 const signedOversize=JSON.stringify({...grafana,alerts:[alert('synthetic-oncall-signed-large')],padding:'x'.repeat(3*1024*1024)}),signedLargeReply=ok(await signed(signedOversize),202);assert.equal(signedLargeReply.truncation,true);assert.ok(signedLargeReply.incomplete);
 const beforeTamper=ok(await req('/api/archive'));ok(await signed(signedOversize+' ',{signature:createHmac('sha256',signingSecret).update(signedOversize).digest('hex')}),401);for(const key of ['events','alerts','intakeReceipts'])assert.deepEqual(ok(await req('/api/archive'))[key],beforeTamper[key],'the exact complete body, including bytes beyond the parse prefix, must be signed');
 // Existing bearer-only requests below deliberately exercise the unchanged optional mode.
 ok(await req(signingPath,{revision:ok(await req(signingPath)).revision,secret:null}));
 ok(await send('gf',{...grafana,alerts:[alert('synthetic-oncall-bearer-only')]}),202);
 assert.ok(!JSON.stringify(ok(await req('/api/archive'))).includes(signingSecret));
 console.log('PASS OC-030 Grafana required/unsigned/wrong/stale/rotation/bearer-only, protected setting, audit rollback');
 const datadog={id:'event-1',alert_id:'monitor-2',alert_cycle_key:'outage-3',alert_scope:'region:us-east',alert_transition:'Triggered',date:Date.parse('2026-10-17T09:00:00Z'),alert_type:'error',tags:'team:payments,region:us-east',title:'Datadog database timeout',body:'Literal <script>unsafe()</script>',link:'https://example.test/datadog'};
 ok(await send('dd',datadog),202);ok(await send('dd',{...datadog,id:'event-2',alert_transition:'Recovered',date:Date.parse('2026-10-17T10:00:00Z')}),202);ok(await send('dd',{...datadog,id:'event-3',alert_cycle_key:'outage-4',alert_transition:'No Data'}),202);assert.equal(ok(await req('/api/state')).intakeReceipts.at(-1).action,'trigger');
 // Authenticate before admitting any incomplete record; diagnostics grant no authority.
 const beforeDenied=ok(await req('/api/archive'));ok(await send('am',first,'forged'),401);const denied=ok(await req('/api/archive'));assert.deepEqual(denied.events,beforeDenied.events);assert.deepEqual(denied.intakeReceipts,beforeDenied.intakeReceipts);assert.equal(denied.audit.at(-1).kind,'intake-rejected');
 // Repeated anonymous refusals share one receiver diagnostic and cannot advance the coordination revision per request.
 for(let n=0;n<20;n++)ok(await w.send('/api/monitoring/missing','{}',{'content-type':'application/json'}),401);
 const repeatedDenied=ok(await req('/api/archive'));assert.ok(repeatedDenied.revision<=denied.revision+1,'refused requests leave the workspace revision for human writes');
 assert.equal(repeatedDenied.audit.length,denied.audit.length+1);assert.equal(repeatedDenied.audit.at(-1).kind,'intake-rejected');
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
 // It uses a receiver with no earlier refusal: repeats for one receiver share its diagnostic.
 const deniedRaw=JSON.stringify({...group([alert('unauthenticated-oversize-must-not-survive')]),padding:'z'.repeat(3*1024*1024)}),beforeOversizeDenied=ok(await req('/api/archive'));
 ok(await w.send('/api/monitoring/dd',deniedRaw,{'content-type':'application/json'}),401);const oversizeDenied=ok(await req('/api/archive'));
 assert.deepEqual(oversizeDenied.alerts,beforeOversizeDenied.alerts);assert.deepEqual(oversizeDenied.events,beforeOversizeDenied.events);assert.deepEqual(oversizeDenied.intakeReceipts,beforeOversizeDenied.intakeReceipts);
 assert.equal(oversizeDenied.audit.length,beforeOversizeDenied.audit.length+1);const refusal=oversizeDenied.audit.at(-1);assert.equal(refusal.kind,'intake-rejected');assert.ok(refusal.text.includes('integration dd; owner '+actor.id));assert.ok(!JSON.stringify(oversizeDenied).includes('unauthenticated-oversize-must-not-survive'));assert.ok(!JSON.stringify(oversizeDenied).includes('z'.repeat(12000)));
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

}
