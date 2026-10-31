import {createHmac,createHash,randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
import {localWorker,durableSnapshot} from './worker.mjs'
import {checkpointFixtures} from './checkpoint-cli.mjs'
import {localPart,mail,recoveryRules} from './email-fixtures.mjs'
// routing-native: part of this public journey.
// Continuation of routing.mjs's real emitted-Worker lifecycle, using its services.
export async function nativeRouting(w,cookie,actor) {
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value};
 const req=(path,body)=>w.request(path,body,cookie);
 const key=()=>randomBytes(32).toString('hex');
 const rules=[{id:'native-dynamic',match:'all',conditions:[{field:'details.destination',op:'exists'}],target:{field:'details.destination'}}];
 const create=(id,secret,authentication='bearer')=>req('/api/routing/keys',{id,name:'Regional native monitor',provider:'native',authentication,scope:['payments','search'],owner:actor.id,key:secret,revision:0,rules,catchAll:null});
 let bearer=key(),signed=key();
 ok(await create('native',bearer),201);ok(await create('signed-native',signed,'signed'),201);
 const event=(id,destination='payments',intent='trigger',source='native')=>({source:'intake:'+source,eventId:id,service:'sender-hint',environment:'sender-hint',key:'native-shared',generation:'native-cycle',intent,severity:'warning',title:'Regional checkout latency',observedAt:'2026-10-22T05:00:00Z',details:{destination}});
 const send=async(input,secret=bearer,mode='bearer',path='/api/ingress/'+input.source)=>{
  const body=typeof input==='string'||Buffer.isBuffer(input)?input:JSON.stringify(input),timestamp=String(Math.floor(Date.now()/1000));
  const headers=mode==='signed'?{'x-oncall-timestamp':timestamp,'x-oncall-signature':createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')}:{authorization:'Bearer '+secret};
  const response=await w.send(path,body,{'content-type':'application/json',...headers});
  return {status:response.status,value:response.value};
 };
 const input=event('native-payments'),receipt=ok(await send(input),201);
 assert.deepEqual(Object.keys(receipt).sort(),['duplicate','id','eventId','service','observedAt','acceptedAt'].sort());
 assert.equal(receipt.service,'payments');assert.equal(receipt.eventId,input.eventId);
 assert.equal(ok(await req('/api/state')).events.find(e=>e.id===receipt.id).service,'payments');
 assert.deepEqual(ok(await send(input)),{...receipt,duplicate:true});
 ok(await send({...input,title:'Changed identity'}),409);
 ok(await send(event('native-search','search')),201);
 let state=ok(await req('/api/state'));
 const alerts=state.alerts.filter(a=>a.source==='intake:native');assert.equal(alerts.length,2);assert.equal(new Set(alerts.map(a=>a.id)).size,2);
 assert.equal(state.intakeReceipts.find(r=>r.native?.eventId==='native-search').routing.serviceDecision.action,'suppress');
 ok(await send(event('native-recover','payments','recover')),201);
 state=ok(await req('/api/state'));assert.equal(state.alerts.find(a=>a.source==='intake:native'&&a.service==='payments').state,'recovered');assert.equal(state.alerts.find(a=>a.source==='intake:native'&&a.service==='search').state,'active');
 ok(await send(event('native-no-effect','payments','recover')),201);
 const noEffect=ok(await req('/api/state')).intakeReceipts.at(-1);assert.equal(noEffect.outcome,'no-effect');assert.equal(noEffect.event,null);assert.match(noEffect.routing.diagnostics.join(' '),/search/);
 ok(await send(event('native-unrouted','foreign')),201);
 const original=ok(await req('/api/state')).intakeReceipts.at(-1);assert.equal(original.service,null);assert.match(original.routing.diagnostics.join(' '),/outside key scope/);
 const archive=ok(await req('/api/archive')),audit=w.sql('SELECT COUNT(*) AS n FROM oc_admin_audit')[0].n;
 const preview=ok(await req('/api/routing/keys/native/preview',{baseVersion:1,rules:[],catchAll:'payments',receiptIds:archive.intakeReceipts.filter(r=>r.source==='native').map(r=>r.id)}));
 assert.ok(preview.warnings.some(v=>v.includes('search')));assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_admin_audit')[0].n,audit);assert.deepEqual(ok(await req('/api/archive')),archive);
 ok(await req('/api/routing/keys/native/publish',{baseVersion:1,rules,catchAll:'foreign'}),400);
 ok(await req('/api/routing/keys/native/publish',{baseVersion:1,rules:[],catchAll:'search'}),201);
 assert.deepEqual(ok(await send(input)),{...receipt,duplicate:true});
 ok(await req('/api/routing/keys/native/publish',{baseVersion:1,rules,catchAll:null}),409);
 const readmit={receipt:original.id,service:'payments',operationId:'native-unrouted-readmission'};
 ok(await req('/api/routing/keys/native/readmit',readmit),201);ok(await req('/api/routing/keys/native/readmit',readmit));
 assert.equal(ok(await req('/api/state')).intakeReceipts.find(r=>r.id===original.id).outcome,'unrouted');
 const signedInput=event('native-signed','payments','trigger','signed-native');
 ok(await send(signedInput,signed,'signed'),201);ok(await send(signedInput,signed),401);
 const untouched=ok(await req('/api/archive'));
 ok(await send(event('forged'),key()),401);
 ok(await send({...event('echo'),details:{destination:'payments',echo:bearer}}),400);
 ok(await send(event('wrong-door'),bearer,'bearer','/api/monitoring/native'),401);
 ok(await send({...event('wrong-audience'),source:'intake:another'},bearer,'bearer','/api/ingress/intake:native'),403);
 // Wrong-provider rejection retains its existing diagnostic, never an event.
 assert.deepEqual(ok(await req('/api/state')).events,untouched.events);
 const bounds=async(raw,secret,mode,path,service)=>{
  const response=ok(await send(raw,secret,mode,path),202);assert.equal(response.truncation,true);
  const state=ok(await req('/api/archive')),held=state.intakeReceipts.find(r=>r.id===response.incomplete.receipt);
  assert.equal(held.provider,'native');assert.equal(held.service,service);assert.equal(held.severity,'critical');assert.equal(held.truncated,true);
  assert.equal(held.incomplete.bytes,Buffer.byteLength(raw));assert.equal(held.incomplete.sha256,createHash('sha256').update(raw).digest('hex'));
  assert.deepEqual(held.incomplete.readableIds,[]);assert.equal(held.incomplete.dropped,null);assert.equal(held.incomplete.unreadBytes,Buffer.byteLength(raw));
  assert.ok(Buffer.from(held.details.nativePrefix.value,'base64').length<=65536);assert.deepEqual(Buffer.from(held.details.nativePrefix.value,'base64'),Buffer.from(raw).subarray(0,65536));
  assert.deepEqual(held.routingInput,{incomplete:true});assert.equal(held.native,undefined);assert.equal(held.routing.kind,'catch-all');
  assert.deepEqual(held.details.ownerNotice,{owner:actor.id,paging:'off',state:'recorded'});
  assert.ok(state.audit.some(a=>a.kind==='intake-owner-notice'&&a.text.includes(held.id)));
  if(service)assert.equal(state.alerts.find(a=>a.id===held.alert).urgency,'high');
  else {assert.equal(held.outcome,'unrouted');const queued=state.alerts.find(a=>a.id===held.alert);assert.equal(queued.service,null);assert.equal(queued.urgency,'high');assert.deepEqual(queued.obligation.target,{kind:'user',id:actor.id});assert.equal(queued.obligation.paging,'off');}
  const again=ok(await send(raw,secret,mode,path),202);assert.equal(again.id,held.id);assert.equal(again.duplicate,true);
  assert.deepEqual(ok(await req('/api/archive')),state,'incomplete retries preserve committed custody');
  return held;
 };
 const utf8=event('native-size');utf8.extra='é'.repeat(32769);const oversized=JSON.stringify(utf8),beforeBounds=ok(await req('/api/archive'));
 ok(await send(oversized,key(),'bearer','/api/ingress/intake:native'),401);
 ok(await send(oversized,signed,'bearer','/api/ingress/intake:signed-native'),401);
 assert.deepEqual(ok(await req('/api/archive')),beforeBounds,'unauthenticated and wrong-audience oversize creates no custody');
 await bounds(oversized,bearer,'bearer','/api/ingress/intake:native','search');
 await bounds('{"source":',bearer,'bearer','/api/ingress/intake:native','search');
 await bounds(Buffer.from([123,255,0,1]),bearer,'bearer','/api/ingress/intake:native','search');
 await bounds(oversized,signed,'signed','/api/ingress/intake:signed-native',null);
 await bounds('{"source":',signed,'signed','/api/ingress/intake:signed-native',null);
 assert.equal(w.sql("SELECT COUNT(*) AS n FROM oc_intake_receipts WHERE json_type(data,'$.details.nativePrefix.value')='text'")[0].n,0,'new prefixes are held independently of receipt metadata');
 assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_native_prefixes p LEFT JOIN oc_intake_receipts r ON r.id=p.id WHERE r.id IS NULL')[0].n,0);
 const beforeEcho=ok(await req('/api/archive'));
 for(const echo of [bearer.toUpperCase(),[...bearer].map(c=>'%'+c.charCodeAt(0).toString(16)).join(''),[...bearer].map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join('')])ok(await send('{"echo":"'+echo+'"',bearer,'bearer','/api/ingress/intake:native'),400);
 assert.deepEqual(ok(await req('/api/archive')),beforeEcho,'credential spellings never reach retained prefixes');
 assert.equal((await w.request('/api/state',undefined,undefined,{authorization:'Bearer '+bearer})).status,401);
 const source=ok(await req('/api/state')).intakeSources.find(s=>s.id==='native');
 const rotate={id:source.id,name:source.name,provider:'native',scope:source.routing.scope,owner:actor.id,key:key(),revision:source.revision};
 const beforeFailure=ok(await req('/api/archive')),beforeUsage=w.sql('SELECT * FROM oc_key_rate_usage ORDER BY key_id,at');
 w.sql("CREATE TRIGGER native_audit_fail BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic native audit failure'); END");
 try {ok(await req('/api/routing/keys',rotate),503);ok(await send(event('audit-rollback')),503);ok(await send('{"audit-failed":',bearer,'bearer','/api/ingress/intake:native'),503);}finally{w.sql('DROP TRIGGER native_audit_fail');}
 assert.deepEqual(ok(await req('/api/archive')),beforeFailure);assert.deepEqual(w.sql('SELECT * FROM oc_key_rate_usage ORDER BY key_id,at'),beforeUsage);
 ok(await req('/api/routing/keys',rotate));const old=bearer;bearer=rotate.key;
 ok(await send(event('rotated-out'),old),401);ok(await send(event('rotated-in')),201);
 const signedSource=ok(await req('/api/state')).intakeSources.find(s=>s.id==='signed-native');
 ok(await req('/api/intake/sources/signed-native/revoke',{revision:signedSource.revision}));ok(await send(event('revoked','payments','trigger','signed-native'),signed,'signed'),401);
 const held=ok(await req('/api/recovery/checkpoint'));
 for(const secret of [old,bearer,signed])assert.ok(!JSON.stringify(held).includes(secret));
 assert.equal(w.sql("SELECT signing_custody IS NOT NULL AS held FROM oc_intake_credentials WHERE source='native'")[0].held,0);
 console.log('Native routed public journey: bearer/HMAC, immutable retries, scope, per-service recovery, unrouted/readmission, zero-write replay, stale publication, audit rollback, rotation/revocation and secret-free checkpoint passed');
 return {bearer,signed};
}

// Intake custody is bounded by the 10,000-receipt count, never by the 1 MB authored profile or by one key.
// Its own Worker keeps the later archive/restore journeys independent of 10,000 held receipts.
export async function nativeCapacity() {
 const w=await localWorker({},{clock:true}),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value};
 const key=()=>randomBytes(32).toString('hex'),body=n=>`synthetic-oncall-${n}:`+'x'.repeat(70000);
 try {
  let cookie=(await w.request('/api/setup',{name:'Capacity owner',password:'synthetic-capacity-owner-password'})).cookie;
  const req=(path,data)=>w.request(path,data,cookie),actor=ok(await req('/api/session')).member;
  for(const id of ['payments','search']){ok(await req('/api/command',{type:'service',id,name:id,environment:'production',owner:actor.id,runbook:[],pager:''}));ok(await req('/api/command',{type:'policy',service:id,severity:'*',action:'route',owner:actor.id,reason:'Owner'}));}
  const keys={a:key(),b:key(),pd:key()},declare=n=>req('/api/command',{type:'declare',service:'payments',severity:'critical',title:'Synthetic human declaration '+n,summary:'Capacity',alerts:[]});
  const configure=async suffix=>{
   ok(await req('/api/sources',{id:'capacity-a',key:keys.a,scopes:['payments']}));ok(await req('/api/sources',{id:'capacity-b',key:keys.b,scopes:['search']}));
   ok(await req('/api/routing/keys',{id:'capacity-pd'+suffix,name:'Capacity PagerDuty',provider:'pagerduty',scope:['payments'],owner:actor.id,key:keys.pd,revision:0,catchAll:'payments'}),201);
  };
  const post=(id,secret,raw)=>w.send('/api/ingress/'+id,raw,{authorization:'Bearer '+secret,'content-type':'application/json'});
  const pager=n=>w.send('/v2/enqueue',JSON.stringify({routing_key:keys.pd,event_action:'trigger',dedup_key:'capacity-'+n,payload:{summary:'Capacity '+n,source:'capacity',severity:'warning'}}),{'content-type':'application/json'});
  await w.time(Date.now());await configure('');
  // A pre-0135 receipt retains its embedded bytes, but ordinary reads expose only the descriptor.
  const legacyKey=key();ok(await req('/api/sources',{id:'legacy-native',key:legacyKey,scopes:['payments']}));
  const legacy=ok(await post('legacy-native',legacyKey,body('legacy')),202),legacyId=legacy.incomplete.receipt;
  const legacyReceipt=ok(await req('/api/archive')).intakeReceipts.find(r=>r.id===legacyId);
  const prefixRow=w.sql(`SELECT * FROM oc_native_prefixes WHERE id='${legacyId}'`)[0];
  const embed=receipt=>w.sql(`UPDATE oc_intake_receipts SET data='${JSON.stringify(receipt).replaceAll("'","''")}' WHERE id='${legacyId}'`);
  const stale=structuredClone(legacyReceipt);stale.details.nativePrefix.value=Buffer.alloc(65536,122).toString('base64');embed(stale);
  assert.equal(ok(await req('/api/archive')).intakeReceipts.find(r=>r.id===legacyId).details.nativePrefix.value,prefixRow.prefix,'table custody takes precedence over legacy embedded bytes');
  assert.deepEqual(Object.keys(ok(await req('/api/state')).intakeReceipts.find(r=>r.id===legacyId).details.nativePrefix).sort(),['bytes','encoding','sha256']);
  assert.ok(!JSON.stringify(ok(await req('/api/audit/export'))).includes(prefixRow.prefix),'audit never exposes native bytes');
  embed(legacyReceipt);w.sql(`DELETE FROM oc_native_prefixes WHERE id='${legacyId}'`);
  assert.equal(ok(await req('/api/archive')).intakeReceipts.find(r=>r.id===legacyId).details.nativePrefix.value,prefixRow.prefix,'legacy embedded bytes cover a missing custody row');
  w.sql(`INSERT INTO oc_native_prefixes(id,bytes,request_sha256,prefix) VALUES('${legacyId}',${prefixRow.bytes},'${prefixRow.request_sha256}','${prefixRow.prefix}')`);
  const erased=ok(await req('/api/erasure/native/legacy-native',{workspaceRevision:ok(await req('/api/state')).revision,confirmation:'erase legacy-native'}));
  assert.equal(erased.stores.oc_native_prefixes.deleted,1);
  assert.equal(w.sql(`SELECT COUNT(*) AS n FROM oc_intake_receipts WHERE id='${legacyId}'`)[0].n,0);
  assert.equal(w.sql(`SELECT COUNT(*) AS n FROM oc_native_prefixes WHERE id='${legacyId}'`)[0].n,0,'erasure removes both copies of legacy evidence');
  // Separated prefixes travel with archive restore; restoring an earlier archive removes later custody rows with their receipts.
  for(let n=1;n<=4;n++)ok(await post('capacity-a',keys.a,body(n)),202);
  const earlier=ok(await req('/api/archive'));
  for(let n=5;n<=8;n++)ok(await post('capacity-a',keys.a,body(n)),202);
  assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_native_prefixes')[0].n,8);
  const restored=await req('/api/restore',{mode:'replace',archive:earlier});ok(restored);cookie=restored.cookie;
  const prefixes=w.sql('SELECT id,prefix FROM oc_native_prefixes ORDER BY id');
  assert.deepEqual(prefixes.map(row=>row.id),earlier.intakeReceipts.map(r=>r.id).sort(),'restore keeps only the restored receipts\' prefixes');
  for(const row of prefixes)assert.equal(row.prefix,earlier.intakeReceipts.find(r=>r.id===row.id).details.nativePrefix.value,'restored prefix bytes are equal');
  assert.ok(ok(await req('/api/state')).intakeSources.every(s=>!s.active),'restore leaves integrations inactive');
  assert.equal(w.sql('SELECT COUNT(*) AS n FROM sources')[0].n,0,'restore carries no service credential');
  ok(await post('capacity-a',keys.a,body(9)),401);
  // Authored records are unchanged by custody, and sender traffic never refuses a human write.
  keys.a=key();keys.b=key();keys.pd=key();await configure('-restored');
  const authored=()=>JSON.stringify(w.sql("SELECT 'm' AS t,data FROM oc_members UNION ALL SELECT 's',data FROM oc_services UNION ALL SELECT 'p',data FROM oc_policies UNION ALL SELECT 'i',data FROM oc_incidents UNION ALL SELECT 'a',data FROM oc_audit WHERE json_extract(data,'$.actor') NOT LIKE 'source:%' "));
  const before=authored();
  for(let n=10;n<=40;n++)ok(await post('capacity-a',keys.a,body(n)),202);
  assert.ok(w.sql('SELECT SUM(length(prefix)) AS n FROM oc_native_prefixes')[0].n>2000000,'held prefixes exceed the authored profile several times over');
  assert.equal(authored(),before,'custody changes no authored record');
  ok(await post('capacity-b',keys.b,body(41)),202);ok(await pager(1),202);ok(await declare(1));
  const held=ok(await post('capacity-a',keys.a,body(10)),202);assert.equal(held.duplicate,true);
  const archive=await req('/api/archive');assert.equal(archive.status,413);assert.match(archive.value.error,/streaming portable export/);
  // Throttle notices are intake accounting: thousands of them leave human writes unaffected.
  w.sql("WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<3999) INSERT INTO oc_audit(id,ordinal,data) SELECT 'synthetic-oncall-notice-'||i,1000000+i,json_object('id','synthetic-oncall-notice-'||i,'at','2026-10-22T00:00:00.000Z','actor','source:intake:capacity-a','kind','intake-throttled','text',printf('%0400d',i)) FROM n");
  ok(await declare(2));
  // At the true boundary: 9,999 held plus one is accepted, then every key is refused by capacity while humans are not.
  const count=w.sql('SELECT COUNT(*) AS n FROM oc_intake_receipts')[0].n;
  w.sql(`WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<${9998-count}) INSERT INTO oc_intake_receipts(id,ordinal,data) SELECT 'synthetic-oncall-held-'||i,100000+i,json_object('id','synthetic-oncall-held-'||i) FROM n`);
  assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_intake_receipts')[0].n,9999);
  ok(await post('capacity-a',keys.a,body(1000)),202);
  const usage=()=>w.sql("SELECT COALESCE(SUM(requests),0) AS n FROM oc_key_rate_usage WHERE key_id='source:capacity-a'")[0].n,usageBefore=usage();
  for(const refused of [await post('capacity-a',keys.a,body(1001)),await post('capacity-b',keys.b,body(1002)),await post('capacity-b',keys.b,'{"source":')]) {
   assert.equal(refused.status,429);assert.match(refused.value.error,/Local intake receipt capacity reached; export before extending capacity/);assert.equal(refused.headers.get('retry-after'),null);
  }
  const compatible=await pager(2);assert.equal(compatible.status,429);assert.match(JSON.stringify(compatible.value),/Local intake receipt capacity reached/);
  assert.equal(usage(),usageBefore+1,'a capacity refusal still counts toward its key allowance');
  assert.equal(ok(await post('capacity-a',keys.a,body(1000)),202).duplicate,true,'a retry of held custody returns the original');
  ok(await declare(3));
  // Per-key exhaustion remains a separate refusal with a real Retry-After.
  const state=ok(await req('/api/state'));ok(await req('/api/intake/allowances',{id:'source:capacity-a',requests:usage()+1,events:120,revision:state.revision}));
  ok(await post('capacity-a',keys.a,body(1000)),202);
  const limited=await post('capacity-a',keys.a,body(1000));assert.equal(limited.status,429);assert.match(limited.headers.get('retry-after')??'',/^\d+$/);assert.match(limited.value.error,/allowance exceeded/);
  console.log('PASS native custody partition: restore carries exact prefixes, 70 KB custody beyond the authored profile, other keys and humans unaffected, 10,000 boundary and separate rate refusal');
 } finally {await w.close();}
}


// routing-rate: part of this public journey.
// Continue the existing real Worker routing journey; the platform clock, not the
// application, is injected by worker.mjs. No admission or storage is faked.
export async function rateJourney(w,cookie,actor) {
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
 const req=(path,body)=>w.request(path,body,cookie),secret=()=>randomBytes(32).toString('hex');
 let key=secret(),second=secret(),now=Date.now();await w.time(now);
 const configure=(id,value,revision=0)=>req('/api/routing/keys',{id,name:'Rate boundary '+id,provider:'native',scope:['payments'],owner:actor.id,key:value,revision,catchAll:'payments'});
 ok(await configure('rate-main',key),201);ok(await configure('rate-second',second),201);
 const event=(id,source='rate-main')=>({source:'intake:'+source,eventId:'rate-'+id,service:'hint',environment:'hint',key:'rate-'+id,generation:'window',intent:'trigger',severity:'warning',title:'Payment timeout',observedAt:new Date(now).toISOString()});
 const send=(input,value=key,path='/api/ingress/'+input.source)=>w.send(path,typeof input==='string'?input:JSON.stringify(input),{authorization:'Bearer '+value,'content-type':'application/json'});
 // Documented default boundary, not an assertion about a configuration constant.
 for(let i=0;i<120;i++)ok(await send(event(i)),201);
 const protectedState=()=>{return req('/api/state').then(r=>{const {audit,revision,...value}=ok(r);return value;});};
 const held=await protectedState(),heldEventUsage=w.sql("SELECT SUM(events) AS n FROM oc_key_rate_usage WHERE key_id='intake:rate-main'")[0].n;let blocked=await send(event(120));ok(blocked,429);assert.equal(w.sql("SELECT SUM(events) AS n FROM oc_key_rate_usage WHERE key_id='intake:rate-main'")[0].n,heldEventUsage);assert.equal(blocked.headers.get('retry-after'),'60');assert.deepEqual(await protectedState(),held);
 ok(await send(event('other','rate-second'),second),201);
 let state=ok(await req('/api/state'));assert.equal(state.audit.filter(a=>a.kind==='intake-throttled'&&a.actor==='source:intake:rate-main').length,1);
 // Rotation retains the record's usage; forged/revoked keys consume none.
 const replacement=secret();ok(await configure('rate-main',replacement,1));const beforeForged=w.sql("SELECT * FROM oc_key_rate_usage WHERE key_id='intake:rate-main' ORDER BY at");ok(await send(event('old')),401);assert.deepEqual(w.sql("SELECT * FROM oc_key_rate_usage WHERE key_id='intake:rate-main' ORDER BY at"),beforeForged);key=replacement;
 blocked=await send(event('rotated'));ok(blocked,429);assert.equal(blocked.headers.get('retry-after'),'60');
 // Existing receipt retries use no new-event slots, but each request counts.
 const usageBefore=w.sql("SELECT SUM(requests) AS n FROM oc_key_rate_usage WHERE key_id='intake:rate-main'")[0].n;
 for(let i=usageBefore;i<600;i++)ok(await send(event(0)),200);
 blocked=await send(event(0));ok(blocked,429);assert.equal(blocked.headers.get('retry-after'),'60');
 state=ok(await req('/api/state'));assert.equal(state.audit.filter(a=>a.kind==='intake-throttled'&&a.actor==='source:intake:rate-main').length,1);
 await w.time(now+59999);blocked=await send(event('too-early'));ok(blocked,429);assert.equal(blocked.headers.get('retry-after'),'1');
 await w.time(now+60000);ok(await send(event('recovered')),201);
 // Concurrent first throttles race a real unrelated-key admission. A winner
 // must leave exactly one owner-visible notice, and storage failure cannot lie.
 now+=120000;await w.time(now);
 state=ok(await req('/api/state'));ok(await req('/api/intake/allowances',{id:'intake:rate-main',requests:600,events:1,revision:state.revision}));
 ok(await send(event('notice-fill')),201);
 const noticeCount=()=>req('/api/state').then(r=>ok(r).audit.filter(a=>a.kind==='intake-throttled'&&a.actor==='source:intake:rate-main'));
 const priorNotices=(await noticeCount()).length;
 const raced=await Promise.all([send(event('notice-race')),send(event('notice-other','rate-second'),second)]);
 ok(raced[0],429);assert.ok([201,409].includes(raced[1].status));
 const simultaneous=await Promise.all([send(event('notice-first')),send(event('notice-second'))]);simultaneous.forEach(r=>ok(r,429));
 const notices=await noticeCount();assert.equal(notices.length,priorNotices+1);assert.match(notices.at(-1).text,/key Rate boundary rate-main throttled at 1 events/);
 // A throttled key racing another key's admissions, window after window: the sender is told 429 and
 // the owner is told exactly once for that window; a lost revision race never loses the notice.
 const stormWindows=8;
 for(let n=0;n<stormWindows;n++) {
  now+=120000;await w.time(now);ok(await send(event('storm-fill-'+n)),201);
  const lane=async id=>{const out=[];for(let i=0;i<6;i++)out.push(await send(event(`storm-${n}-${id}-${i}`,'rate-second'),second));return out;};
  const [over]=await Promise.all([new Promise(r=>setTimeout(r,Math.random()*40)).then(()=>send(event('storm-over-'+n))),lane('x'),lane('y')]);
  ok(over,429);assert.ok(Number(over.headers.get('retry-after'))>0);
  const at=new Date(now).toISOString();
  assert.equal((await noticeCount()).filter(a=>a.at===at).length,1,'one owner notice per throttled window under racing admissions');
 }
 now+=60000;await w.time(now);ok(await send(event('notice-next-window')),201);
 const beforeNoticeFailure=ok(await req('/api/archive'));
 w.sql("CREATE TRIGGER notice_failure BEFORE INSERT ON oc_audit WHEN json_extract(NEW.data,'$.kind')='intake-throttled' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-notice-failure'); END");
 try{ok(await send(event('notice-failed')),503);}finally{w.sql('DROP TRIGGER notice_failure');}
 assert.deepEqual(ok(await req('/api/archive')),beforeNoticeFailure);
 ok(await send(event('notice-retry')),429);assert.equal((await noticeCount()).length,priorNotices+2+stormWindows);
 // Resume the original boundary sequence in a fresh window.
 now+=60000;await w.time(now);ok(await send(event('notice-final-fill')),201);
 // A lower owner-configured event allowance refuses before grouped mutation.
 state=ok(await req('/api/state'));ok(await req('/api/intake/allowances',{id:'intake:rate-main',requests:600,events:1,revision:state.revision}));
 const grouped={...event('grouped'),key:'rate-recovered'};ok(await send(grouped),201);
 const beforeRefusal=await protectedState();ok(await send(event('new-window-full')),429);assert.deepEqual(await protectedState(),beforeRefusal);
 assert.equal(ok(await req('/api/state')).audit.filter(a=>a.kind==='intake-throttled'&&a.actor==='source:intake:rate-main').length,priorNotices+3+stormWindows);
 // Request throttle happens before grouping; the held group's event count stays fixed.
 state=ok(await req('/api/state'));ok(await req('/api/intake/allowances',{id:'intake:rate-main',requests:1,events:1,revision:state.revision}));
 const groupedHeld=await protectedState();ok(await send({...grouped,eventId:'throttled-group-observation'}),429);assert.deepEqual(await protectedState(),groupedHeld);
 // Incomplete payloads use the same accounting and cannot bypass an exhausted key.
 ok(await send('{incomplete',key,'/api/ingress/intake:rate-main'),429);assert.deepEqual(await protectedState(),groupedHeld);
 const policy=ok(await req('/api/recovery/checkpoint'));assert.ok(policy.coordination.keyAllowances.some(v=>v.id==='intake:rate-main'));
 // Management has current-member authority and optimistic publication semantics.
 ok(await w.request('/api/intake/allowances',{id:'intake:rate-main',requests:2,events:2,revision:state.revision}),401);
 ok(await req('/api/intake/allowances',{id:'intake:rate-main',requests:2,events:2,revision:state.revision}),409);
 await w.time(Date.now());
 console.log('PASS OC-084 per-record rolling allowances: default 121st event, other-key isolation, duplicate request boundary, rotation, exact-window recovery, owner notices, pre-grouping and incomplete refusal, checkpoint policy custody');
}

export async function providerRateDoors(w,cookie,actor) {
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
 const req=(path,body)=>w.request(path,body,cookie);
 const monitoring=(provider,id)=>provider==='datadog'?{id,alert_id:id,alert_cycle_key:'rate',alert_scope:'',alert_transition:'Triggered',date:Date.now(),title:'Latency',body:'Rate boundary',tags:''}:{version:provider==='grafana'?'1':'4',receiver:'Oncall',status:'firing',groupKey:'rate',groupLabels:{},commonLabels:{},commonAnnotations:{},alerts:[{status:'firing',labels:{alertname:'Latency'},annotations:{summary:'Rate boundary'},startsAt:'2026-10-22T01:00:00Z',endsAt:'0001-01-01T00:00:00Z',fingerprint:id,generatorURL:''}]};
 const cases=['pagerduty-v1','pagerduty-v2','opsgenie','splunk','alertmanager','grafana','datadog','native-service'];
 for(const provider of cases) {
  const id='limit-'+provider,key=randomBytes(32).toString('hex'),native=provider==='native-service';
  if(native)ok(await req('/api/sources',{id,key,scopes:['payments']}));
  else ok(await req('/api/routing/keys',{id,name:'Rate '+provider,provider:provider.startsWith('pagerduty')?'pagerduty':provider,scope:['payments'],owner:actor.id,key,revision:0,catchAll:'payments'}),201);
  const policyId=(native?'source:':'intake:')+id;
  ok(await req('/api/intake/allowances',{id:policyId,requests:1,events:120,revision:ok(await req('/api/state')).revision}));
  let path,body,headers={};
  if(provider==='pagerduty-v1'){path='/generic/2010-04-15/create_event.json';body={service_key:key,event_type:'trigger',incident_key:id,description:'Rate boundary'};}
  else if(provider==='pagerduty-v2'){path='/v2/enqueue';body={routing_key:key,event_action:'trigger',dedup_key:id,payload:{summary:'Rate boundary',source:'regional',severity:'warning'}};}
  else if(provider==='opsgenie'){path='/v2/alerts';headers.authorization='GenieKey '+key;body={alias:id,message:'Rate boundary'};}
  else if(provider==='splunk'){path='/integrations/generic/20131114/alert/'+key+'/payments';body={message_type:'CRITICAL',entity_id:id,state_message:'Rate boundary'};}
  else if(native){path='/api/ingress/'+id;headers.authorization='Bearer '+key;body={source:id,eventId:id,service:'payments',environment:'production',key:id,generation:'rate',intent:'trigger',severity:'warning',title:'Rate boundary',observedAt:new Date().toISOString()};}
  else {path='/api/monitoring/'+id;headers.authorization='Bearer '+key;body=monitoring(provider,id);}
  const send=()=>w.send(path,JSON.stringify(body),{'content-type':'application/json',...headers});
  const first=await send();assert.ok([200,201,202].includes(first.status),JSON.stringify(first.value));
  const before=ok(await req('/api/archive')),denied=await send();ok(denied,429);assert.ok(Number(denied.headers.get('retry-after'))>0);
  const after=ok(await req('/api/archive'));assert.deepEqual(after.events,before.events);assert.deepEqual(after.alerts,before.alerts);assert.deepEqual(after.intakeReceipts,before.intakeReceipts);
  if(provider==='opsgenie'){const status=await w.send('/v2/alerts/requests/'+first.value.requestId,undefined,headers,'GET');assert.equal(status.status,429);}
 }
 const batchKey=randomBytes(32).toString('hex');
 ok(await req('/api/routing/keys',{id:'rate-batch',name:'Atomic group rate boundary',provider:'alertmanager',scope:['payments'],owner:actor.id,key:batchKey,revision:0,catchAll:'payments'}),201);
 ok(await req('/api/intake/allowances',{id:'intake:rate-batch',requests:600,events:2,revision:ok(await req('/api/state')).revision}));
 const batch=monitoring('alertmanager','batch-first');batch.alerts=Array.from({length:3},(_,i)=>monitoring('alertmanager','batch-'+i).alerts[0]);
 const held=ok(await req('/api/archive'));
 const batchReply=await w.send('/api/monitoring/rate-batch',JSON.stringify(batch),{authorization:'Bearer '+batchKey,'content-type':'application/json'});
 assert.equal(batchReply.status,429);assert.equal(batchReply.headers.get('retry-after'),null);
 const batchRefusal=batchReply.value;assert.equal(batchRefusal.rateLimit.code,'batch_exceeds_allowance');assert.equal(batchRefusal.rateLimit.batchCount,3);assert.equal(batchRefusal.rateLimit.allowance,2);assert.match(batchRefusal.rateLimit.instruction,/Split/);
 const refused=ok(await req('/api/archive'));assert.deepEqual(refused.events,held.events);assert.deepEqual(refused.alerts,held.alerts);assert.deepEqual(refused.intakeReceipts,held.intakeReceipts);
 const state=ok(await req('/api/state')),policy={id:'intake:limit-grafana',requests:2,events:2,revision:state.revision};
 const observer=ok(await req('/api/members',{name:'Rate observer',role:'viewer',password:'synthetic-rate-observer-password'}),201);
 const login=await w.request('/api/login',{name:observer.name,password:'synthetic-rate-observer-password'});ok(login);
 ok(await w.request('/api/intake/allowances',policy,login.cookie),403);
 const before=ok(await req('/api/archive'));
 w.sql("CREATE TRIGGER allowance_audit_failure BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic allowance audit failure'); END");
 try{ok(await req('/api/intake/allowances',{...policy,revision:before.revision}),503);}finally{w.sql('DROP TRIGGER allowance_audit_failure');}
 assert.deepEqual(ok(await req('/api/archive')),before);
 console.log('PASS per-key 429 across PagerDuty v1/v2, Opsgenie action/status, Splunk, Alertmanager, Grafana, Datadog and ordinary native doors; grouped custody unchanged, viewer refusal and policy audit rollback');
}


// D1 inspection blocks the client event loop long enough for the local Worker's idle
// socket to close. Match worker.request's fresh-connection transport for email and ingress.
const platformFetch=globalThis.fetch;
globalThis.fetch=(input,init={})=>{const headers=new Headers(init.headers??(input instanceof Request?input.headers:undefined));headers.set('connection','close');return platformFetch(input,{...init,headers});};

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

 // Plain coordination rules use the same compare-and-publish guard as richer rules.
 const plainBefore=ok(await req('/api/state')),plainBase=plainBefore.policies.find(p=>p.service==='payments'&&p.severity==='info');
 const plainAttempt={type:'policy',service:'payments',severity:'info',action:'route',owner:actor.id,reason:'Reviewed payments coordination',baseVersion:plainBase?.version??0};
 const plainAuditBefore=w.sql("SELECT COUNT(*) AS n FROM oc_admin_audit WHERE kind='command.policy' AND outcome='accepted'")[0].n;
 const plainAccepted=ok(await req('/api/command',plainAttempt));
 ok(await req('/api/command',{...plainAttempt,action:'suppress',reason:'Stale replacement'}),409);
 const plainAfter=ok(await req('/api/state')),plainStored=plainAfter.policies.find(p=>p.service===plainAttempt.service&&p.severity===plainAttempt.severity);
 assert.equal(plainStored.version,plainAccepted.version);assert.equal(plainStored.owner,plainAttempt.owner);assert.equal(plainStored.reason,plainAttempt.reason);assert.equal(plainStored.action,plainAttempt.action);
 assert.equal(plainAfter.revision,plainBefore.revision+1);assert.equal(w.sql("SELECT COUNT(*) AS n FROM oc_admin_audit WHERE kind='command.policy' AND outcome='accepted'")[0].n,plainAuditBefore+1);
 console.log('PASS plain coordination CAS: 200 then 409, first owner/reason/version retained; accepted audit entries +1, workspace revisions +1');
 const local=localPart(),second=localPart();
 const emailCreate=(id,localPart,service,mode='custom',rules=recoveryRules())=>req('/api/email/addresses',{id,name:id+' integration',localPart,service,owner:actor.id,mode,fallback:'subject',rules});
 ok(await emailCreate('nightly',local,'payments'),201);ok(await emailCreate('second',second,'search'),201);
 // ct O6: an accepted same-value attempt keeps one value-free ledger fact, with no workspace commit.
 const noopBefore=ok(await req('/api/state')),noopAddress=noopBefore.emailAddresses.find(a=>a.id==='nightly'),noopBytes=JSON.stringify(noopAddress);
 const noopAuditBefore=w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 ok(await req('/api/email/addresses/nightly/field',{revision:noopAddress.revision,field:'name',from:noopAddress.name,to:noopAddress.name}));
 const noopAfter=ok(await req('/api/state')),noopRows=w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal').slice(noopAuditBefore.length);
 assert.equal(JSON.stringify(noopAfter.emailAddresses.find(a=>a.id==='nightly')),noopBytes);assert.equal(noopAfter.revision,noopBefore.revision);assert.deepEqual(noopAfter,noopBefore);
 assert.equal(noopRows.length,1);assert.equal(noopRows[0].kind,'email.name.no-change');assert.equal(noopRows[0].outcome,'accepted');assert.ok(noopRows[0].actor);assert.ok(noopRows[0].at);assert.equal(noopRows[0].workspace_before,noopBefore.revision);assert.equal(noopRows[0].workspace_after,noopBefore.revision);assert.ok(!JSON.stringify(noopRows).includes(noopAddress.name));
 console.log('PASS ct email field no-op: address bytes/version equal, workspace revision unchanged, all state equal, one accepted email.name.no-change ledger row; field door has no request-id contract');
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
 const publicationBefore=durableSnapshot(w),publicationState=ok(await req('/api/state'));
 w.sql("CREATE TRIGGER synthetic_oncall_publication_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='routing.publish' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-publication-audit'); END");
 try{ok(await publish(1),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_publication_audit')}
 assert.deepEqual(durableSnapshot(w),publicationBefore,'audit failure preserves routing definitions, credentials, revisions and all prior history');
 const published=ok(await publish(1),201),publicationAfter=ok(await req('/api/state'));
 const publishedSource=publicationAfter.intakeSources.find(row=>row.id==='pd'),previousSource=publicationState.intakeSources.find(row=>row.id==='pd');
 assert.deepEqual(publishedSource.routing.versions.at(-1),published);assert.equal(published.version,2);assert.equal(published.publishedBy,actor.id);
 assert.equal(publishedSource.revision,previousSource.revision+1);assert.deepEqual(publishedSource.routing.versions.slice(0,-1),previousSource.routing.versions);
 const publicationIds=new Set(publicationBefore.oc_admin_audit.map(row=>row.id)),publicationFacts=w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal').filter(row=>!publicationIds.has(row.id)&&row.kind==='routing.publish'&&row.outcome==='accepted');
 assert.equal(publicationFacts.length,1);const publicationFact=publicationFacts[0];
 assert.deepEqual([publicationFact.workspace_before,publicationFact.workspace_after],[publicationState.revision,publicationAfter.revision]);assert.equal(publicationAfter.revision,publicationState.revision+1);
 assert.equal(publicationFact.after_revision,publicationFact.before_revision+1);assert.equal(publicationFact.paging_before,publicationFact.paging_after);assert.equal(publicationFact.handoff_before,publicationFact.handoff_after);
 const publicationHistory=new Map(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal').map(row=>[row.id,row]));for(const row of publicationBefore.oc_admin_audit)assert.deepEqual(publicationHistory.get(row.id),row);
 console.log('PROBE OC-041 routing publication: protected publish and targeted audit failure -> unchanged rule versions and custody, then attributed publication with one committed revision-bound audit fact');
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
 const groupingReplay=ok(await req('/api/replay',{events:[nativeSignal(errorEvent),nativeSignal(original)]}));assert.deepEqual(groupingReplay.decisions.map(row=>row.eventId),[errorEvent.eventId,original.eventId]);assert.equal(groupingReplay.decisions[0].proposed.correlation.group,original.id);assert.equal(groupingReplay.decisions[0].proposed.correlation.originalVersion,secondGrouping.version);assert.equal(groupingReplay.decisions[1].historical.version,1);assert.equal(groupingReplay.decisions[1].proposed.version,2);assert.deepEqual(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),replayAuditBefore);assert.deepEqual(ok(await req('/api/archive')),replayBefore);
 await w.stop();await w.start();assert.deepEqual(ok(await req('/api/state')).events.find(e=>e.id===original.id),original);
 const beforeRootErasure=ok(await req('/api/archive'));const erasedRootReceipt=ok(await req('/api/erasure/intake/synthetic-oncall-430-dd',{workspaceRevision:beforeRootErasure.revision,confirmation:'erase synthetic-oncall-430-dd'}));assert.equal(erasedRootReceipt.stores.oc_events.deleted,1);assert.equal(erasedRootReceipt.stores.oc_events.updated,3);groups=ok(await req('/api/state'));assert.equal(groups.events.find(e=>e.id===errorEvent.id).decision.correlation.originalEvent,null);assert.equal(groups.intakeReceipts.find(r=>r.event===errorEvent.id).routing.serviceDecision.correlation.originalEvent,null);assert.match(groups.events.find(e=>e.id===errorEvent.id).decision.correlation.reason,/explicitly erased/);ok(await req('/api/restore',{mode:'replace',archive:{...beforeRootErasure,erasureFences:groups.erasureFences}}),409);

 // Flapping uses complete source generations, not repeated delivery or concurrent outages.
 const flapService='synthetic-oncall-433',flapSource='synthetic-oncall-433',flapKey=secret();ok(await req('/api/command',{type:'service',id:flapService,name:flapService,environment:'production',owner:actor.id,runbook:[],pager:''}));
 const flapPolicy=ok(await req('/api/command',{...groupPolicy,service:flapService,correlation:{field:'key',windowSeconds:60,includeDependencies:false,flappingCount:2}}));ok(await req('/api/sources',{id:flapSource,key:flapKey,scopes:[flapService,stageService]}));
 const flap=(eventId,generation,intent,offset)=>w.request('/api/ingress/'+flapSource,{source:flapSource,eventId,service:flapService,environment:'production',key:'synthetic-oncall-433',generation,intent,severity:'critical',title:'Synthetic flapping error',observedAt:new Date(base+offset).toISOString(),evidence:''},undefined,{authorization:'Bearer '+flapKey});
 ok(await flap('synthetic-oncall-433-a','synthetic-oncall-433-a','trigger',0),201);ok(await flap('synthetic-oncall-433-r','synthetic-oncall-433-a','recover',1000),201);const held=ok(await flap('synthetic-oncall-433-b','synthetic-oncall-433-b','trigger',2000),201);groups=ok(await req('/api/state'));const heldEvent=groups.events.find(e=>e.id===held.id);assert.equal(heldEvent.decision.correlation.held,true);assert.equal(heldEvent.severity,'critical');assert.equal(groups.alerts.find(a=>a.events.includes(held.id)).suppressed,true);ok(await req('/api/command',{...groupPolicy,service:stageService,baseVersion:ok(await req('/api/state')).policies.find(p=>p.service===stageService&&p.severity==='*').version,correlation:{field:'key',windowSeconds:60,includeDependencies:false,flappingCount:2}}));const otherEnvironment=ok(await w.request('/api/ingress/'+flapSource,{source:flapSource,eventId:'synthetic-oncall-433-stage',service:stageService,environment:'staging',key:'synthetic-oncall-433',generation:'synthetic-oncall-433-stage',intent:'trigger',severity:'critical',title:'Synthetic isolated flapping environment',observedAt:new Date(base+2500).toISOString(),evidence:''},undefined,{authorization:'Bearer '+flapKey}),201);assert.equal(ok(await req('/api/state')).events.find(e=>e.id===otherEnvironment.id).decision.correlation.held,false,'completed production generations never hold staging');const heldBefore=ok(await req('/api/archive'));ok(await flap('synthetic-oncall-433-b','synthetic-oncall-433-b','trigger',2000));assert.deepEqual(ok(await req('/api/archive')),heldBefore);
 ok(await req('/api/command',{...groupPolicy,service:flapService,baseVersion:flapPolicy.version,correlation:null}));const released=ok(await flap('synthetic-oncall-433-c','synthetic-oncall-433-b','trigger',3000),201);groups=ok(await req('/api/state'));assert.equal(groups.alerts.find(a=>a.events.includes(released.id)).suppressed,false);assert.deepEqual(groups.events.find(e=>e.id===heldEvent.id),heldEvent,'policy changes never rewrite the original hold');
 ok(await req('/api/command',{...groupPolicy,service:flapService,baseVersion:flapPolicy.version+1,correlation:{field:'labels.constructor',windowSeconds:60,includeDependencies:false,flappingCount:0}}));const absentOwnLabel=ok(await flap('synthetic-oncall-433-own','synthetic-oncall-433-b','trigger',4000),201);assert.equal(ok(await req('/api/state')).events.find(e=>e.id===absentOwnLabel.id).decision.correlation.group,null,'inherited object properties never count as supplied labels');
 const validGroupingArchive=ok(await req('/api/archive'));
 for(const damage of [event=>{event.decision.correlation.windowSeconds++},event=>{event.decision.correlation.group='synthetic-oncall-missing';event.decision.correlation.originalEvent='synthetic-oncall-missing'},event=>{delete event.decision.correlation}]){const invalid=structuredClone(validGroupingArchive);damage(invalid.events.find(e=>e.decision.correlation?.group===e.id));ok(await req('/api/restore',{mode:'replace',archive:invalid}),400);assert.deepEqual(ok(await req('/api/archive')),validGroupingArchive);}
 console.log('PASS OC-043 correlation: Datadog/Prometheus/error labels, routed-first versions, immutable originals, exact event-time boundary, dependency/environment isolation, audit rollback, ordered zero-write replay, restart, flapping and explicit next-admission release');

 // OC-043: routed-key selection happens before the selected service's transformation.
 const transformation={field:'labels.correlation',values:{'synthetic-oncall-430':{severity:'warning',priority:'P3'}},allowLowering:true,reason:'Synthetic reviewed label classification'};
 const currentGroup=ok(await req('/api/state')).policies.find(p=>p.service===groupService&&p.severity==='*');
 const transformPolicy=ok(await req('/api/command',{...groupPolicy,baseVersion:currentGroup.version,transformation}));
 const transformationKey=secret();ok(await req('/api/routing/keys',{id:'synthetic-oncall-437',name:'Synthetic transformation monitor',provider:'datadog',scope:[groupService],owner:actor.id,key:transformationKey,revision:0,rules:[],catchAll:groupService}),201);
 ok(await external('/api/monitoring/synthetic-oncall-437',{id:'synthetic-oncall-437',alert_id:'synthetic-oncall-437',alert_cycle_key:'synthetic-oncall-437',alert_scope:'service:synthetic-oncall-430',alert_transition:'Triggered',date:base+70000,title:'Synthetic transformed Datadog',body:'Synthetic evidence',alert_type:'critical',tags:'correlation:synthetic-oncall-430'},{authorization:'Bearer '+transformationKey}),202);
 const transformedState=ok(await req('/api/state')),transformedReceipt=transformedState.intakeReceipts.at(-1),transformedEvent=transformedState.events.find(e=>e.id===transformedReceipt.event);
 assert.equal(transformedReceipt.routing.version,1);assert.equal(transformedReceipt.routing.service,groupService);assert.equal(transformedReceipt.routing.serviceDecision.version,transformPolicy.version);assert.equal(transformedReceipt.routing.serviceDecision.transformation.event,transformedEvent.id);assert.equal(transformedEvent.severity,'critical');assert.equal(transformedEvent.decision.transformation.severity,'warning');assert.equal(transformedEvent.decision.transformation.priority,'P3');assert.equal(transformedEvent.decision.transformation.matched,true);
 const routedBefore=ok(await req('/api/archive')),routedAudit=w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),routedCounts=()=>w.statements(w.sql("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'oc_%' ORDER BY name").map(({name})=>`SELECT '${name}' AS name,COUNT(*) AS n FROM ${name}`).join(';')).flat(),beforeRoutedCounts=routedCounts();
 const routingSource=transformedState.intakeSources.find(s=>s.id==='synthetic-oncall-437'),routingDraft=routingSource.routing.versions.at(-1);
 const routedReplay=ok(await req('/api/routing/keys/synthetic-oncall-437/preview',{baseVersion:routingDraft.version,rules:routingDraft.rules,catchAll:routingDraft.catchAll,receiptIds:[transformedReceipt.id]}));
 assert.equal(routedReplay.decisions[0].proposed.version,1);assert.equal(routedReplay.decisions[0].proposed.serviceDecision.version,transformPolicy.version);assert.equal(routedReplay.decisions[0].proposed.serviceDecision.transformation.severity,'warning');assert.deepEqual(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),routedAudit);assert.deepEqual(routedCounts(),beforeRoutedCounts);assert.deepEqual(ok(await req('/api/archive')),routedBefore);
 console.log('PASS OC-043 routed severity/priority transformation: OC-072 routing version then selected service version, original event, label action and zero-write replay table counts');

 // Team-owned keys refuse outside services without committing and preserve ownership through restore.
 const team=ok(await req('/api/teams',{name:'Payments routing team',visibility:'public',active:true,revision:0,members:[actor.id],managers:[actor.id]}));
 ok(await req('/api/teams/ownership',{service:'payments',team:team.id,workspaceRevision:ok(await req('/api/state')).revision}));
 const teamKey=secret(),teamDefinition={id:'team-monitor',name:'Payments team monitor',provider:'pagerduty',team:team.id,scope:['payments'],owner:actor.id,key:teamKey,revision:0,rules:[],catchAll:'payments'};
 const teamBefore=ok(await req('/api/state'));
 ok(await req('/api/routing/keys',{...teamDefinition,team:'unavailable-routing-team'}),400);assert.equal(ok(await req('/api/state')).revision,teamBefore.revision);
 const refusedTeam=await req('/api/routing/keys',{...teamDefinition,scope:['payments','search']});ok(refusedTeam,400);assert.ok(refusedTeam.value.error.includes(teamBefore.services.find(s=>s.id==='search').name));assert.equal(ok(await req('/api/state')).revision,teamBefore.revision);
 const createdTeam=ok(await req('/api/routing/keys',teamDefinition),201);assert.equal(createdTeam.routing.team,team.id);assert.equal(ok(await req('/api/state')).intakeSources.find(s=>s.id===createdTeam.id).routing.team,team.id);
 const rotatedTeamKey=secret(),rotatedTeam=ok(await req('/api/routing/keys',{...teamDefinition,key:rotatedTeamKey,revision:createdTeam.revision}));assert.equal(rotatedTeam.routing.team,team.id);assert.equal(ok(await req('/api/state')).intakeSources.find(s=>s.id===createdTeam.id).routing.team,team.id);
 ok(await external('/v2/enqueue',{routing_key:rotatedTeamKey,event_action:'trigger',dedup_key:'team-owned-event',payload:{summary:'Payments team signal',source:'team-monitor',severity:'warning'}}),202);
 const teamAdmitted=ok(await req('/api/state'));assert.equal(teamAdmitted.intakeReceipts.find(r=>r.source===createdTeam.id).service,'payments');
 ok(await req('/api/routing/keys',{...teamDefinition,revision:rotatedTeam.revision,team:undefined}),400);assert.equal(ok(await req('/api/state')).revision,teamAdmitted.revision);
 console.log('PASS team routed key: outside scope 400/revision unchanged; own scope 201; rotate 200/read team retained; event 202 to payments; later team change 400/revision unchanged');

 const archive=ok(await req('/api/archive'));for(const key of [...Object.values(keys),...Object.values(native),originalKey,groupKey,amKey,errorKey,depKey,stageKey,flapKey,transformationKey,teamKey,rotatedTeamKey])assert.ok(!JSON.stringify(archive).includes(key));
 const unavailableTeamArchive=structuredClone(archive);unavailableTeamArchive.intakeSources.find(s=>s.id==='team-monitor').routing.team='unavailable-routing-team';ok(await req('/api/restore',{mode:'replace',archive:unavailableTeamArchive}),400);assert.deepEqual(ok(await req('/api/archive')),archive);
 const malformed=structuredClone(archive);malformed.intakeSources.find(s=>s.id==='pd').routing.versions[0].catchAll='foreign';ok(await req('/api/restore',{mode:'replace',archive:malformed}),400);assert.deepEqual(ok(await req('/api/archive')),archive);
 const restored=await req('/api/restore',{mode:'replace',archive});ok(restored);cookie=restored.cookie;
 state=ok(await req('/api/state'));assert.equal(state.intakeSources.find(s=>s.id==='team-monitor').routing.team,team.id);console.log('PASS team routed key export/restore retains team ownership');assert.deepEqual(ok(await req('/api/archive')).intakeReceipts,archive.intakeReceipts);assert.deepEqual(state.keyAllowances,archive.keyAllowances);assert.ok(state.intakeSources.every(s=>!s.active));assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_intake_credentials')[0].n,0);
 await w.stop();await w.start();assert.deepEqual(ok(await req('/api/archive')).intakeReceipts,archive.intakeReceipts);
 console.log('OC-070 modes and rules map email onto derived generations. Routed intake: scoped fixed/dynamic rules, per-service generations, suppression ordering, replay/no writes, stale publish, readmission, authority, rollback, rotation and inactive archive/restart');
} finally {await w.close();}
await nativeCapacity();

// The selected service applies its urgency policy without changing source evidence.
{
const {default:assert}=await import('node:assert/strict')
const {randomBytes}=await import('node:crypto')
const {localWorker}=await import('./worker.mjs')
const {heldWorkspace}=await import('./worker.mjs')

// Real public Worker doors; all monitoring inputs and held records are test data.
const w=await localWorker({}, {outboundLedger:true});
const ok=(response,status=200)=>{assert.equal(response.status,status,JSON.stringify(response.value));return response.value;};
let cookie;
const req=(path,input)=>w.request(path,input,cookie);
const archive=async()=>ok(await req('/api/archive'));
const state=async()=>ok(await req('/api/state'));
const key=randomBytes(32).toString('hex');
const draft=(mode,extra={})=>({mode,timezone:'America/New_York',weekly:[],holidays:[],inside:'high',outside:'low',reason:'Operator-selected urgency policy',...extra});
const publish=(service,baseVersion,rule)=>req('/api/urgency/services/'+service,{baseVersion,...rule});
const signal=(eventId,severity,extra={})=>({source:'urgency-monitor',eventId,service:'checkout',environment:'production',key:'checkout-latency',generation:'latency-outage',intent:'trigger',severity,title:'Checkout latency',observedAt:'2000-01-01T00:00:00Z',evidence:'',...extra});
const send=input=>w.request('/api/ingress/urgency-monitor',input,undefined,{authorization:'Bearer '+key});
const alertIn=(workspace,id)=>workspace.alerts.find(a=>a.id===id);
try {
  cookie=(await w.request('/api/setup',{name:'Urgency operator',password:'synthetic-urgency-operator-password'})).cookie;
  const actor=ok(await req('/api/session')).member;
  for(const id of ['checkout','support','default'])ok(await req('/api/command',{type:'service',id,name:id,environment:'production',owner:actor.id,runbook:['Inspect service health'],pager:''}));
  assert.equal((await state()).services.find(s=>s.id==='default').ackTimeouts,undefined);
  const timeout58=ok(await req('/api/command',{type:'acknowledgment-timeout',service:'default',baseVersion:0,minutes:1}));assert.equal(timeout58.ackTimeouts.at(-1).version,1);
  ok(await req('/api/command',{type:'acknowledgment-timeout',service:'default',baseVersion:0,minutes:2}),409);
  ok(await req('/api/command',{type:'acknowledgment-timeout',service:'default',baseVersion:1,minutes:1441}),400);
  ok(await req('/api/command',{type:'acknowledgment-timeout',service:'default',baseVersion:1,minutes:0}));
  console.log('OC-058 service policy: off by default, bounded versioned acknowledgment timeout, stale publication refused and explicit off retained');
  ok(await req('/api/sources',{id:'urgency-monitor',key,scopes:['checkout','default']}));
  const constant=ok(await publish('checkout',0,draft('low')),201);
  const firstSignal=signal('first-observation','critical'),firstReceipt=ok(await send(firstSignal),201);
  let workspace=await state(),firstEvent=workspace.events.find(e=>e.id===firstReceipt.id),alert=workspace.alerts.find(a=>a.events.includes(firstEvent.id));
  const alertId=alert.id,initial=structuredClone(firstEvent),initialRevision=alert.urgencyRevision;
  assert.equal(alert.urgency,'low');assert.equal(firstEvent.urgency.version,constant.version);
  assert.deepEqual(firstEvent.urgency.rule,constant);
  assert.equal(firstEvent.urgency.evaluatedAt,firstReceipt.acceptedAt,'source timestamps cannot choose the admission policy time');
  assert.notEqual(firstEvent.urgency.evaluatedAt,firstEvent.observedAt);

  const severity=ok(await publish('checkout',constant.version,draft('severity',{reason:'Page by source severity'})),201);
  ok(await send(signal('low-retrigger','info')),201);
  assert.equal(alertIn(await state(),alertId).urgencyRevision,initialRevision,'unchanged urgency adds no history');
  ok(await send(signal('critical-retrigger','critical')),201);
  alert=alertIn(await state(),alertId);
  assert.equal(alert.urgency,'high');assert.equal(alert.urgencyRevision,initialRevision+1);
  assert.equal(alert.urgencyHistory.at(-1).ruleVersion,severity.version);
  const raised=structuredClone(alert.urgencyHistory);
  ok(await send(signal('later-warning','warning')),201);
  workspace=await state();alert=alertIn(workspace,alertId);
  assert.equal(alert.urgency,'high','a later lower-severity observation cannot silently lower urgency');
  assert.deepEqual(alert.urgencyHistory,raised);
  assert.deepEqual(workspace.events.find(e=>e.id===firstReceipt.id),initial,'publishing does not rewrite admission history');
  const beforeDuplicate=await archive();assert.equal(ok(await send(firstSignal)).duplicate,true);
  assert.deepEqual(await archive(),beforeDuplicate,'native duplicate detection excludes internal urgency metadata');
  ok(await send({...firstSignal,severity:'warning'}),409);assert.deepEqual(await archive(),beforeDuplicate);

  // Retain real historical receipts and a held pending deadline while service rules replay.
  const heldPaging=await checkpointFixtures(w,cookie),pagingBeforeReplay=ok(await req('/api/paging/state'));
  assert.equal(pagingBeforeReplay.mode,'synthetic-only');assert.ok(pagingBeforeReplay.receipts.length>0);
  const pending=pagingBeforeReplay.jobs.find(job=>job.id===heldPaging.pending);
  assert.equal(pending.status,'pending');assert.equal(pending.nextDue,pending.steps[0].deadline);
  const beforeReplay=await archive(),replayAuditBefore=w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),recordsBeforeReplay=durableSnapshot(w),replay=ok(await req('/api/replay',{events:[firstSignal]}));
  assert.deepEqual(replay.decisions[0].historical,initial.decision);
  assert.deepEqual(replay.decisions[0].historicalEvaluation,initial.routingSnapshot);
  assert.deepEqual(replay.decisions[0].historicalUrgency,initial.urgency);
  assert.equal(replay.decisions[0].proposedUrgency.version,severity.version);
  assert.equal(replay.decisions[0].proposedUrgency.urgency,'high');
  assert.deepEqual(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),replayAuditBefore,'OC-043 service replay writes no permanent audit');
  assert.deepEqual(durableSnapshot(w),recordsBeforeReplay,'service routing replay preserves every durable record, receipt, pending job, deadline and outbound work item');
  assert.deepEqual(await w.outboundRequests(),[],'service routing replay issues zero outbound network requests');
  const unordered=ok(await req('/api/replay',{events:[signal('synthetic-oncall-43-z','warning',{observedAt:'2026-10-24T00:00:00Z'}),signal('synthetic-oncall-43-b','warning',{observedAt:'2026-10-23T00:00:00Z'}),signal('synthetic-oncall-43-a','warning',{observedAt:'2026-10-23T00:00:00Z'})]}));
  assert.deepEqual(durableSnapshot(w),recordsBeforeReplay,'replaying proposed events creates no durable state or timer');
  assert.deepEqual(ok(await req('/api/paging/state')),pagingBeforeReplay,'service replay retains the synthetic label and populated delivery history');
  assert.deepEqual(await w.outboundRequests(),[],'ordered proposed routing decisions issue zero outbound requests');
  assert.deepEqual(unordered.decisions.map(row=>row.eventId),['synthetic-oncall-43-z','synthetic-oncall-43-b','synthetic-oncall-43-a']);assert.deepEqual(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),replayAuditBefore);assert.deepEqual(await archive(),beforeReplay);
  console.log('PASS OC-014 service routing preview isolation: retained and proposed decisions preserve all durable rows, synthetic receipts, jobs, deadlines and outbound work; zero outbound network requests');
  const edited=ok(await req('/api/command',{type:'service',id:'checkout',name:'Checkout renamed',environment:'production',owner:actor.id,runbook:['Inspect the updated dashboard'],pager:''}));
  assert.deepEqual(edited.urgencyRules,[constant,severity],'ordinary service edits preserve published policy history');
  assert.deepEqual((await state()).events.find(e=>e.id===firstReceipt.id),initial);

  const reader=ok(await req('/api/members',{name:'Urgency reader',role:'viewer',password:'synthetic-urgency-reader-password'}),201);
  const responder=ok(await req('/api/members',{name:'Urgency responder',role:'responder',password:'synthetic-urgency-responder-password'}),201);
  const viewerCookie=(await w.request('/api/login',{name:reader.name,password:'synthetic-urgency-reader-password'})).cookie;
  const responderCookie=(await w.request('/api/login',{name:responder.name,password:'synthetic-urgency-responder-password'})).cookie;
  const alertPath='/api/urgency/alerts/'+alertId,edit={revision:alert.urgencyRevision,urgency:'low',reason:'Confirmed limited customer impact'};
  const beforeDenied=await archive();
  const denied=await Promise.all([
    w.request(alertPath,edit),w.request('/api/urgency/preview',{service:'checkout',severity:'critical',at:new Date().toISOString()}),
    w.request(alertPath,edit,viewerCookie),w.request('/api/urgency/services/checkout',{baseVersion:severity.version,...draft('high')},viewerCookie),
    w.request('/api/urgency/services/checkout',{baseVersion:severity.version,...draft('high')},responderCookie),
  ]);
  denied.forEach((r,i)=>ok(r,i<2?401:403));assert.deepEqual(await archive(),beforeDenied);
  ok(await w.request(alertPath,{revision:edit.revision,urgency:'low'},responderCookie),400);
  let lowered=ok(await w.request(alertPath,edit,responderCookie));
  assert.equal(lowered.urgency,'low');assert.equal(lowered.urgencyRevision,edit.revision+1);
  const human=lowered.urgencyHistory.at(-1);assert.equal(human.by,responder.id);assert.equal(human.reason,edit.reason);assert.equal(human.ruleVersion,null);
  assert.ok((await archive()).audit.some(e=>e.id===human.id&&e.actor===responder.id&&e.kind==='alert-urgency'));
  const beforeStale=await archive();ok(await w.request(alertPath,{...edit,urgency:'high'},responderCookie),409);
  ok(await w.request(alertPath,{...edit,revision:lowered.urgencyRevision,reason:''},responderCookie));assert.deepEqual(await archive(),beforeStale);
  const humanRaised=ok(await w.request(alertPath,{revision:lowered.urgencyRevision,urgency:'high'},responderCookie));assert.equal(humanRaised.urgency,'high');assert.equal(humanRaised.urgencyHistory.at(-1).reason,'');
  lowered=ok(await w.request(alertPath,{...edit,revision:humanRaised.urgencyRevision},responderCookie));
  ok(await send(signal('warning-after-human-lowering','warning')),201);
  assert.deepEqual(alertIn(await state(),alertId).urgencyHistory,lowered.urgencyHistory);
  ok(await send(signal('critical-after-human-lowering','critical')),201);alert=alertIn(await state(),alertId);assert.equal(alert.urgency,'high');
  const beforeNoop=await archive();ok(await w.request(alertPath,{revision:alert.urgencyRevision,urgency:'high',reason:'Already appropriately high'},responderCookie));
  assert.deepEqual(await archive(),beforeNoop,'an unchanged human choice creates no revision or audit entry');
  ok(await req('/api/command',{type:'member',id:responder.id,role:'responder',active:false}));
  const beforeRevoked=await archive();ok(await w.request(alertPath,{revision:alert.urgencyRevision,urgency:'low',reason:'Revoked actor'},responderCookie),401);assert.deepEqual(await archive(),beforeRevoked);

  // OC-057 urgency rules, previews and human changes hold; support-start raising is labelled not automatic.
  const support=draft('support-hours',{weekly:[{day:0,start:'01:00',end:'03:00'},{day:1,start:'09:00',end:'17:00'},{day:5,start:'09:00',end:'17:00'},{day:6,start:'23:00',end:'24:00'}],holidays:['2026-12-25'],reason:'Staffed New York support hours'});
  const supportRule=ok(await publish('support',0,support),201),beforePreview=await archive();
  const cases=[
    ['2026-03-08T06:59:59Z','high'],['2026-03-08T07:00:00Z','low'],
    ['2026-11-01T05:30:00Z','high'],['2026-11-01T06:30:00Z','high'],['2026-11-01T08:00:00Z','low'],
    ['2026-11-02T13:59:59Z','low'],['2026-11-02T14:00:00Z','high'],['2026-11-02T21:59:59.999Z','high'],['2026-11-02T22:00:00Z','low'],
    ['2026-12-25T15:00:00Z','low'],['2026-11-01T03:59:59Z','high'],['2026-11-01T04:00:00Z','low'],
  ];
  const previews=await Promise.all(cases.map(([at])=>w.request('/api/urgency/preview',{service:'support',severity:'warning',at},viewerCookie)));
  previews.forEach((r,i)=>{const {decision}=ok(r);assert.equal(decision.urgency,cases[i][1],cases[i][0]+JSON.stringify(decision));assert.equal(decision.version,supportRule.version);});
  for(const [level,expected] of [['critical','high'],['error','high'],['warning','low'],['info','low'],[null,'high'],['unrecognized','high']]) {
    const preview=ok(await req('/api/urgency/preview',{service:'checkout',severity:level,at:'2026-11-02T14:00:00Z',rule:draft('severity')}));assert.equal(preview.decision.urgency,expected);
  }
  assert.equal(ok(await req('/api/urgency/preview',{service:'checkout',severity:'info',at:'2026-11-02T14:00:00Z',rule:draft('high')})).decision.urgency,'high');
  assert.deepEqual(await archive(),beforePreview,'published and draft previews have zero durable effects');

  const beforeInvalid=await archive();ok(await publish('checkout',constant.version,draft('high')),409);
  const invalidRules=[
    draft('support-hours',{timezone:'Not/A_Zone'}),draft('support-hours',{timezone:'+03:00'}),
    draft('support-hours',{weekly:[{day:1,start:'09:00',end:'12:00'},{day:1,start:'11:00',end:'17:00'}]}),
    draft('support-hours',{weekly:[{day:1,start:'22:00',end:'06:00'}]}),
    draft('support-hours',{weekly:[{day:1,start:'23:00',end:'24:01'}]}),
    draft('support-hours',{holidays:['2026-02-30']}),draft('support-hours',{holidays:['2026-12-25','2026-12-25']}),draft('severity',{unexpected:true}),
  ];
  (await Promise.all(invalidRules.map(rule=>publish('checkout',severity.version,rule)))).forEach(r=>ok(r,400));
  ok(await req('/api/urgency/preview',{service:'support',severity:'warning',at:'2026-02-30T10:00:00Z'}),400);
  assert.deepEqual(await archive(),beforeInvalid,'invalid and stale policy writes leave the published state untouched');
  const defaultSignal=signal('default-warning','warning',{service:'default',key:'default-key'}),defaultReceipt=ok(await send(defaultSignal),201);
  workspace=await state();assert.equal(workspace.events.find(e=>e.id===defaultReceipt.id).urgency.rule,null);
  assert.equal(workspace.alerts.find(a=>a.events.includes(defaultReceipt.id)).urgency,'low');
  const incident=ok(await req('/api/command',{type:'declare',service:'checkout',severity:'warning',title:'Checkout impact',summary:'Investigating customer latency',alerts:[alertId]}));
  assert.equal(incident.urgency,'high','declaration retains the higher linked alert urgency');

  const beforeFailure=await archive();w.sql("CREATE TRIGGER reject_urgency BEFORE INSERT ON oc_audit BEGIN SELECT RAISE(ABORT,'synthetic urgency storage failure'); END");
  try {
    ok(await req(alertPath,{revision:alert.urgencyRevision,urgency:'low',reason:'Storage rollback probe'}),503);
    ok(await send(signal('rollback-observation','critical')),503);
  } finally {w.sql('DROP TRIGGER reject_urgency');}
  assert.deepEqual(await archive(),beforeFailure,'admission, alert history and audit commit atomically');

  // OC-043 inherits OC-057: only a versioned explained rule lowers a new admission.
  const groupingPolicy=ok(await req('/api/command',{type:'policy',service:'checkout',severity:'*',action:'route',owner:actor.id,reason:'Synthetic urgency correlation',baseVersion:0,correlation:{field:'key',windowSeconds:60,includeDependencies:false,flappingCount:0}}));
  const transformAt=Date.now(),highSignal=signal('synthetic-oncall-435-high','critical',{key:'synthetic-oncall-435',generation:'synthetic-oncall-435-a',observedAt:new Date(transformAt).toISOString()}),highReceipt=ok(await send(highSignal),201);
  const highEvent=(await state()).events.find(e=>e.id===highReceipt.id);assert.equal(highEvent.urgency.urgency,'high');assert.equal(highEvent.decision.version,groupingPolicy.version);
  const currentUrgency=(await state()).services.find(s=>s.id==='checkout').urgencyRules.at(-1),lowerRule=ok(await publish('checkout',currentUrgency.version,draft('low',{reason:'Synthetic reviewed lower urgency'})),201);
  const lowSignal=signal('synthetic-oncall-435-low','critical',{key:'synthetic-oncall-435',generation:'synthetic-oncall-435-b',observedAt:new Date(transformAt+1000).toISOString()}),lowReceipt=ok(await send(lowSignal),201),transformed=await state(),lowEvent=transformed.events.find(e=>e.id===lowReceipt.id);
  assert.equal(lowEvent.urgency.urgency,'low');assert.equal(lowEvent.urgency.version,lowerRule.version);assert.ok(lowEvent.urgency.reason.startsWith(lowerRule.reason+': '));assert.deepEqual(lowEvent.urgency.rule,lowerRule);assert.equal(lowEvent.severity,'critical');assert.equal(lowEvent.decision.correlation.originalEvent,highEvent.id);assert.equal(alertIn(transformed,transformed.alerts.find(a=>a.events.includes(highEvent.id)).id).urgency,'high');
  const transformBefore=await archive(),transformAudit=w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),transformReplay=ok(await req('/api/replay',{events:[lowSignal,highSignal]}));
  assert.deepEqual(transformReplay.decisions.map(row=>row.eventId),[lowSignal.eventId,highSignal.eventId]);assert.equal(transformReplay.decisions[1].historicalUrgency.urgency,'high');assert.equal(transformReplay.decisions[1].proposedUrgency.urgency,'low');assert.equal(transformReplay.decisions[1].proposedUrgency.version,lowerRule.version);assert.equal(transformReplay.decisions[0].proposed.correlation.group,highEvent.id);assert.deepEqual(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),transformAudit);assert.deepEqual(await archive(),transformBefore);
  console.log('PASS OC-043 urgency transformation: versioned explained lowering at new admission, unchanged severity and open high urgency, ordered correlation and both urgency decisions with zero durable/audit writes');

  // OC-043 generalized admission transformations use the existing policy and audit transaction.
  const transformation={field:'severity',values:{critical:{severity:'info',priority:'P4'},warning:{severity:'critical',priority:'P1'}},allowLowering:false,reason:'Synthetic reviewed customer-impact classification'};
  const transformPolicy=baseVersion=>({type:'policy',service:'checkout',severity:'*',action:'route',owner:actor.id,reason:'Synthetic transformation policy',baseVersion,transformation});
  const publishTransform=ok(await req('/api/command',transformPolicy(groupingPolicy.version)));
  const unchanged=await archive();
  ok(await req('/api/command',transformPolicy(groupingPolicy.version)),409);
  ok(await w.request('/api/command',transformPolicy(publishTransform.version),viewerCookie),403);
  for(const invalid of [{...transformation,reason:''},{...transformation,allowLowering:'yes'},{...transformation,values:{critical:{severity:'minor'}}},{...transformation,field:'undeclared'},{...transformation,unexpected:true}])ok(await req('/api/command',{...transformPolicy(publishTransform.version),transformation:invalid}),400);
  assert.deepEqual(await archive(),unchanged);
  const generalizedSignal=(id,severity='critical',extra={})=>signal(id,severity,{key:'synthetic-oncall-436',generation:id,priority:'P2',...extra});
  const heldSignal=generalizedSignal('synthetic-oncall-436-held'),heldAdmission=ok(await send(heldSignal),201),heldEvent=(await state()).events.find(e=>e.id===heldAdmission.id);
  assert.equal(heldEvent.decision.transformation.severity,'critical');assert.equal(heldEvent.decision.transformation.priority,'P2');assert.equal(heldEvent.decision.transformation.blocked,true);
  transformation.allowLowering=true;
  const explicit=ok(await req('/api/command',transformPolicy(publishTransform.version)));
  const loweredSignal=generalizedSignal('synthetic-oncall-436-lowered'),loweredAdmission=ok(await send(loweredSignal),201),loweredEvent=(await state()).events.find(e=>e.id===loweredAdmission.id);
  assert.equal(loweredEvent.severity,'critical');assert.equal(loweredEvent.priority,'P2');assert.equal(loweredEvent.decision.transformation.originalSeverity,'critical');assert.equal(loweredEvent.decision.transformation.originalPriority,'P2');assert.equal(loweredEvent.decision.transformation.severity,'info');assert.equal(loweredEvent.decision.transformation.priority,'P4');assert.equal(loweredEvent.decision.transformation.lowering,true);assert.equal(loweredEvent.decision.transformation.blocked,false);assert.equal(loweredEvent.decision.transformation.event,loweredEvent.id);assert.equal(loweredEvent.decision.version,explicit.version);assert.ok(loweredEvent.decision.transformation.reason.includes(transformation.reason));
  const loweredAlert=(await state()).alerts.find(a=>a.events.includes(loweredEvent.id));assert.equal(loweredAlert.priority,'P4');assert.equal(loweredAlert.originalSeverity,'critical');assert.equal(loweredAlert.originalPriority,'P2');
  const noDuplicate=await archive();ok(await send(loweredSignal));assert.deepEqual(await archive(),noDuplicate);
  const sameGeneration=generalizedSignal('synthetic-oncall-436-open','critical',{generation:heldSignal.generation}),sameAdmission=ok(await send(sameGeneration),201),sameEvent=(await state()).events.find(e=>e.id===sameAdmission.id);
  assert.equal(sameEvent.decision.transformation.severity,'critical');assert.equal(sameEvent.decision.transformation.priority,'P2');assert.equal(sameEvent.decision.transformation.blocked,true,'an explained lowering cannot lower an existing high alert');
  const raisedAdmission=ok(await send(generalizedSignal('synthetic-oncall-436-raised','warning')),201),raisedEvent=(await state()).events.find(e=>e.id===raisedAdmission.id);assert.equal(raisedEvent.decision.transformation.severity,'critical');assert.equal(raisedEvent.decision.transformation.priority,'P1');assert.equal(raisedEvent.severity,'warning');
  const tableCounts=()=>w.statements(w.sql("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'oc_%' ORDER BY name").map(({name})=>`SELECT '${name}' AS name,COUNT(*) AS n FROM ${name}`).join(';')).flat();
  transformation.values.critical={severity:'warning',priority:'P3'};const revised=ok(await req('/api/command',transformPolicy(explicit.version)));
  const beforeGeneralizedReplay=await archive(),beforeGeneralizedAudit=w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),countsAtReplay=tableCounts();
  const generalizedReplay=ok(await req('/api/replay',{events:[loweredSignal,heldSignal]}));assert.deepEqual(generalizedReplay.decisions.map(d=>d.eventId),[loweredSignal.eventId,heldSignal.eventId]);assert.equal(generalizedReplay.decisions[0].historical.transformation.severity,'info');assert.equal(generalizedReplay.decisions[0].proposed.transformation.severity,'warning');assert.equal(generalizedReplay.decisions[0].proposed.version,revised.version);assert.deepEqual(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),beforeGeneralizedAudit);assert.deepEqual(tableCounts(),countsAtReplay);assert.deepEqual(await archive(),beforeGeneralizedReplay);
  const beforeTransformFailure=await archive();w.sql("CREATE TRIGGER synthetic_oncall_436 BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic-oncall-436'); END");
  try{ok(await send(generalizedSignal('synthetic-oncall-436-rollback')),503)}finally{w.sql('DROP TRIGGER synthetic_oncall_436')};assert.deepEqual(await archive(),beforeTransformFailure);
  await w.stop();await w.start();assert.deepEqual(await archive(),beforeTransformFailure);
  console.log('PASS OC-043 severity/priority transformations: versioned reasoned lowering, open-alert floors, original fields, raising, duplicate identity, authority, stale/invalid zero writes, ordered replay table counts, audit rollback and restart');

  // Existing response rules and declarations consume effective severity without rewriting source evidence.
  ok(await req('/api/response/services/checkout',{baseVersion:0,defaultMode:'alert-only',recoveredNotice:'silent',rules:[{id:'synthetic-oncall-439',urgency:'*',severity:'warning',policy:'*',mode:'incident'}],reason:'Synthetic reviewed response classification'}),201);
  const automaticSignal=generalizedSignal('synthetic-oncall-439'),automaticReceipt=ok(await send(automaticSignal),201),automaticState=await state(),automaticAlert=automaticState.alerts.find(a=>a.events.includes(automaticReceipt.id)),automaticIncident=automaticState.incidents.find(i=>i.alerts.includes(automaticAlert.id));
  assert.ok(automaticIncident);assert.equal(automaticIncident.severity,'warning');assert.equal(automaticIncident.priority,'P3');assert.equal(automaticAlert.obligation.policy.rule,'synthetic-oncall-439');assert.equal(automaticState.events.find(e=>e.id===automaticReceipt.id).severity,'critical');
  ok(await send({...automaticSignal,eventId:'synthetic-oncall-439-recovery',intent:'recover',severity:'info'}),201);
  const recoveredState=await state(),retainedIncident=recoveredState.incidents.find(i=>i.id===automaticIncident.id);assert.equal(retainedIncident.state,'declared');assert.equal(retainedIncident.severity,'warning');assert.equal(retainedIncident.priority,'P3');assert.equal(recoveredState.alerts.find(a=>a.id===automaticAlert.id).obligation.state,'stopped');
  console.log('PASS OC-043 effective response classification: transformed severity selects response rule and declaration, original retained; recovery stops only the alert obligation and preserves human incident state');

  const priorityRule=ok(await req('/api/command',{...transformPolicy(revised.version),transformation:{field:'priority',values:{P2:{severity:'warning',priority:'P1'}},allowLowering:false,reason:'Synthetic declared priority classification'}}));
  const prioritySignal=generalizedSignal('synthetic-oncall-440','info'),priorityReceipt=ok(await send(prioritySignal),201),priorityEvent=(await state()).events.find(e=>e.id===priorityReceipt.id);assert.equal(priorityEvent.priority,'P2');assert.equal(priorityEvent.severity,'info');assert.equal(priorityEvent.decision.version,priorityRule.version);assert.equal(priorityEvent.decision.transformation.field,'priority');assert.equal(priorityEvent.decision.transformation.severity,'warning');assert.equal(priorityEvent.decision.transformation.priority,'P1');
  const beforeMalformedPriority=await state();
  for(const priority of [null,0,['P2']]){const rejected=ok(await send({...prioritySignal,eventId:'synthetic-oncall-441-'+JSON.stringify(priority),priority}),202),held=await state(),receipt=held.intakeReceipts.find(r=>r.id===rejected.incomplete.receipt),queued=held.alerts.find(a=>a.id===receipt.alert);assert.ok(receipt.incomplete);assert.equal(receipt.event,null);assert.equal(receipt.severity,'critical');assert.equal(receipt.priority,null);assert.equal(queued.urgency,'high');assert.equal(queued.service,null);assert.equal(queued.originalPriority,undefined);}
  const afterMalformedPriority=await state();assert.deepEqual(afterMalformedPriority.events,beforeMalformedPriority.events);assert.deepEqual(afterMalformedPriority.incidents,beforeMalformedPriority.incidents,'malformed source priority never reaches a transformation or declaration');
  console.log('PASS OC-043 declared priority field: severity/priority raises from source priority and original classification; malformed priority stays in OC-059 high incomplete custody without transformation or declaration');

  const futureA=generalizedSignal('synthetic-oncall-442-a','info',{key:'synthetic-oncall-442',generation:'synthetic-oncall-442',observedAt:'2000-01-01T00:00:00Z'}),futureB={...futureA,eventId:'synthetic-oncall-442-b',priority:'P4',observedAt:'2000-01-01T00:00:01Z'};
  const futureBefore=await archive(),futureAudit=w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),futureCounts=tableCounts(),futureReplay=ok(await req('/api/replay',{events:[futureB,futureA]}));
  assert.deepEqual(futureReplay.decisions.map(row=>row.eventId),[futureB.eventId,futureA.eventId]);assert.equal(futureReplay.decisions[1].proposed.transformation.severity,'warning');assert.equal(futureReplay.decisions[0].proposed.transformation.severity,'warning');assert.equal(futureReplay.decisions[0].proposed.transformation.priority,'P1');assert.equal(futureReplay.decisions[0].proposed.transformation.blocked,true,'an earlier hypothetical raise protects later events in the same ordered generation');assert.deepEqual(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),futureAudit);assert.deepEqual(tableCounts(),futureCounts);assert.deepEqual(await archive(),futureBefore);
  console.log('PASS OC-043 ordered future replay: prior hypothetical raises protect the same generation with zero durable or permanent-audit writes');

  const saved=await archive(),malformed=[
    value=>{delete value.events.find(e=>e.id===loweredEvent.id).decision.transformation;},
    value=>{value.events.find(e=>e.id===loweredEvent.id).decision.transformation.originalSeverity='warning';},
    value=>{value.alerts.find(a=>a.events.includes(loweredEvent.id)).originalPriority='P1';},
    value=>{value.policies.find(p=>p.service==='checkout'&&p.severity==='*').transformation.allowLowering='yes';},
    value=>{value.services.find(s=>s.id==='checkout').urgencyRules[0].by='missing-member';},
    value=>{value.events.find(e=>e.id===firstReceipt.id).urgency.reason='Forged explanation';},
    value=>{const decision=value.events.find(e=>e.id===firstReceipt.id).urgency;decision.version=severity.version+1;decision.rule.version=decision.version;},
    value=>{value.events.find(e=>e.id===firstReceipt.id).urgency.unexpected=true;},
    value=>{value.alerts.find(a=>a.id===alertId).urgencyHistory.at(-1).from='high';},
    value=>{value.alerts.find(a=>a.id===alertId).urgencyRevision++;},
  ];
  for(const damage of malformed) {
    const invalid=structuredClone(saved);damage(invalid);ok(await req('/api/restore',{mode:'replace',archive:invalid}),400);assert.deepEqual(await archive(),saved);
  }
  // Bring actual held-schema fixtures through the same strict restore door.
  const held=heldWorkspace(),portable=structuredClone(saved);
  for(const collection of ['members','services','policies','events','alerts','incidents','audit'])portable[collection].push(...held[collection]);
  const restored=await req('/api/restore',{mode:'replace',archive:portable});ok(restored);cookie=restored.cookie;
  const preserved=await state();
  for(const collection of ['services','events','alerts','incidents'])assert.deepEqual(preserved[collection],portable[collection]);
  for(const collection of ['services','events','alerts'])assert.equal(JSON.stringify(preserved[collection].filter(r=>held[collection].some(h=>h.id===r.id))),JSON.stringify(held[collection]),'held records retain their exact optional-field shape and bytes');
  ok(await send(signal('credential-after-restore','critical')),401);
  await w.stop();await w.start();
  const restarted=await state();for(const collection of ['services','events','alerts','incidents','audit'])assert.deepEqual(restarted[collection],preserved[collection]);
  console.log('PASS OC-057 urgency rules, previews and human changes hold; support-start raising is labelled not automatic');
  console.log('Urgency public Worker journey passed: immutable admission, severity raises, human edits and authority, DST/holiday previews, strict atomic archives, held records and restart');
} finally {await w.close();}

}
