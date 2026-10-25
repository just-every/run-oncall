import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {localWorker,ownerDoor} from './worker.mjs';
import {readFile} from 'node:fs/promises';
import {localPart,mail} from './email-fixtures.mjs';

// One real emitted-Worker journey. Provider request bodies are synthetic test
// inputs built to their documented protocols; no live-sender claim is made.
const w=await localWorker({INBOUND_EMAIL_DOMAIN:'inbound.example.test'}),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value};
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
   const race=await Promise.all([request('/api/intake/incumbent',input),request('/api/intake/incumbent',input)]);assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);
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
  const floodPart=localPart();ok(await request('/api/email/addresses',{id:'email-flood',name:'Flooded monitor',service:'payments',owner:actor.id,localPart:floodPart,mode:'subject',fallback:'subject',rules:[]}),201);
  for(let n=0;n<70;n++)await mail(w,floodPart,'Unauthenticated flood',{auth:'fail'});
  const flooded=ok(await request('/api/email')).receipts.filter(r=>r.address==='email-flood');
  assert.equal(flooded.filter(r=>r.diagnostic==='address_rate_limit').length,1,'one receipt records the engaged rate limit; later refusals in its minute are not stored');
  const heldMail=flooded.find(r=>r.diagnostic==='sender_authentication_failed').id;
  w.sql(`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<2000) INSERT INTO oc_email_receipts(id,ordinal,data) SELECT 'synthetic-oncall-'||i,(SELECT MAX(ordinal) FROM oc_email_receipts)+i,json_set(r.data,'$.id','synthetic-oncall-'||i) FROM n,oc_email_receipts r WHERE r.id='${heldMail}'`);
  ok(await request('/api/command',{type:'declare',service:'payments',severity:'critical',title:'Coordination beside held mail',summary:'s'.repeat(3000)}));
  // OC-040 email integration erasure shares the subject receipt, audit and restore boundary.
  const erasureId='synthetic-oncall-440',erasureLocal=localPart();
  const erasureDefinition={id:erasureId,name:'Synthetic erasable email',service:'payments',owner:actor.id,localPart:erasureLocal,mode:'subject',fallback:'subject',rules:[]};
  ok(await request('/api/email/addresses',erasureDefinition),201);
  await mail(w,erasureLocal,'synthetic-oncall-441 private failure');
  await mail(w,erasureLocal,'synthetic-oncall-442 refused sender',{auth:'fail'});
  const erasureState=ok(await request('/api/state')),erasureAlert=erasureState.alerts.find(a=>a.source==='email:'+erasureId);
  const erasureIncident=ok(await request('/api/command',{type:'declare',service:'payments',title:'Synthetic retained incident',summary:'Synthetic retained impact',severity:'warning',alerts:[erasureAlert.id]}));
  const beforeEmailErasure=ok(await request('/api/archive')),emailCheckpoint=ok(await request('/api/recovery/checkpoint'));
  const erasePath='/api/erasure/email/'+erasureId,eraseInput={workspaceRevision:beforeEmailErasure.revision,confirmation:'erase '+erasureId};
  ok(await w.request(erasePath,eraseInput),401);ok(await w.request(erasePath,eraseInput,viewerCookie),403);
  ok(await request(erasePath,{...eraseInput,confirmation:'wrong'}),409);
  ok(await request(erasePath,{...eraseInput,workspaceRevision:0}),409);
  const copy='rer_portability_snap_synthetic_oncall_440';
  w.sql('CREATE TABLE '+copy+' AS SELECT * FROM oc_email_samples');
  const credentialBefore=w.sql('SELECT * FROM oc_email_credentials ORDER BY digest');
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
  console.log('OC-033 inbound email accepts, deduplicates, recovers and quarantines by address mode and rule without granting authority to the sender. Compatible intake: provider lifecycles, authority, concurrency, rollback, key rotation/revoke, native integrity and inactive archive/restart');
} finally {await w.close();}
