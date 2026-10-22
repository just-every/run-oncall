import {seedReceipts,receiptCount,capacitySamples,assertCapacitySamples} from './capacity-samples.mjs';
import assert from 'node:assert/strict';
import {randomBytes,createHmac,createHash} from 'node:crypto';
import {localWorker} from './worker.mjs';

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
  else {assert.equal(held.outcome,'unrouted');assert.equal(held.alert,null);}
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
export async function nativeCapacity({persistTo}={}) {
 const w=await localWorker({},{clock:true,persistTo}),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value};
 const key=()=>randomBytes(32).toString('hex'),body=n=>`synthetic-oncall-${n}:`+'x'.repeat(70000);
 try {
  let cookie=(await w.request('/api/setup',{name:'Capacity owner',password:'synthetic-capacity-owner-password'})).cookie;
  const req=(path,data)=>w.request(path,data,cookie),actor=ok(await req('/api/session')).member;
  for(const id of ['payments','search']){ok(await req('/api/command',{type:'service',id,name:id,environment:'production',owner:actor.id,runbook:[],pager:''}));ok(await req('/api/command',{type:'policy',service:id,severity:'*',action:'route',owner:actor.id,reason:'Owner'}));}
  const keys={a:key(),b:key(),pd:key(),am:key()},declare=n=>req('/api/command',{type:'declare',service:'payments',severity:'critical',title:'Synthetic human declaration '+n,summary:'Capacity',alerts:[]});
  const configure=async suffix=>{
   ok(await req('/api/sources',{id:'capacity-a',key:keys.a,scopes:['payments']}));ok(await req('/api/sources',{id:'capacity-b',key:keys.b,scopes:['search']}));
   ok(await req('/api/routing/keys',{id:'capacity-pd'+suffix,name:'Capacity PagerDuty',provider:'pagerduty',scope:['payments'],owner:actor.id,key:keys.pd,revision:0,catchAll:'payments'}),201);
  };
  const post=(id,secret,raw)=>w.send('/api/ingress/'+id,raw,{authorization:'Bearer '+secret,'content-type':'application/json'});
  const pager=n=>w.send('/v2/enqueue',JSON.stringify({routing_key:keys.pd,event_action:'trigger',dedup_key:'capacity-'+n,payload:{summary:'Capacity '+n,source:'capacity',severity:'warning'}}),{'content-type':'application/json'});
  await w.time(Date.now());await configure('');
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
  // The derived intake budget (10,000 x the largest receipt footprint) is far above what held receipts occupy, so the count binds.
  const profile=await import('../src/workspace-profile.ts'),heldState=ok(await req('/api/state'));
  assert.ok(profile.intakeBytes(heldState)/heldState.intakeReceipts.length<profile.intakeReceiptFootprint&&profile.intakeBudgetBytes===profile.intakeReceiptCapacity*profile.intakeReceiptFootprint);
  const archive=await req('/api/archive');assert.equal(archive.status,413);assert.match(archive.value.error,/streaming portable export/);
  // Throttle notices are intake accounting: thousands of them leave human writes unaffected.
  w.sql("WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<3999) INSERT INTO oc_audit(id,ordinal,data) SELECT 'synthetic-oncall-notice-'||i,1000000+i,json_object('id','synthetic-oncall-notice-'||i,'at','2026-10-22T00:00:00.000Z','actor','source:intake:capacity-a','kind','intake-throttled','text',printf('%0400d',i)) FROM n");
  ok(await declare(2));
  // OC-073: valid linked custody, three real intake doors and three protected read doors.
  ok(await req('/api/intake/sources',{id:'synthetic-oncall-monitor',name:'synthetic-oncall-monitor',provider:'alertmanager',service:'payments',key:keys.am,revision:0}),201);
  const monitoring=()=>w.send('/api/monitoring/synthetic-oncall-monitor',JSON.stringify({version:'4',status:'firing',alerts:[{status:'firing',fingerprint:'synthetic-oncall-monitor',labels:{alertname:'Checkout latency',severity:'warning'},annotations:{summary:'Checkout latency'},startsAt:'2026-10-22T00:00:00Z'}]}),{authorization:'Bearer '+keys.am,'content-type':'application/json'});
  ok(await monitoring(),202);
  let sequence=10000;
  const doors=[{name:'native-incomplete-retry',run:()=>post('capacity-a',keys.a,body(10)),status:202},{name:'compatible-admission',run:()=>pager(sequence++),status:202},{name:'monitoring-retry',run:monitoring,status:202},{name:'incidents',run:()=>req('/api/triage'),status:200},{name:'alerts',run:()=>req('/api/state'),status:200},{name:'audit-page',run:()=>req('/api/audit/export?limit=25'),status:200}];
  seedReceipts(w,250);const small=await capacitySamples(w,doors,'small');
  seedReceipts(w,9991);const large=await capacitySamples(w,doors,'capacity');
  assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_intake_receipts')[0].n,9999);
  ok(await post('capacity-a',keys.a,body(1000)),202);
  const exact=await capacitySamples(w,doors.map(d=>d.name==='compatible-admission'?{...d,name:'compatible-capacity-refusal',status:429}:d),'exact-capacity',{warm:false});assert.equal(exact.before,10000);assert.equal(exact.after,10000);
  // Public cursor pages expose all held history while each response remains bounded.
  for(const collection of ['alerts','events','intakeReceipts','audit']) {
   const first=ok(await req('/api/records/'+collection+'?limit=25'));
   assert.equal(first.items.length,25);assert.ok(first.total>=10000&&first.nextCursor);
   const next=ok(await req('/api/records/'+collection+'?limit=25&cursor='+encodeURIComponent(first.nextCursor)));
   assert.equal(next.items.length,25);assert.equal(next.total,first.total);assert.ok(next.items.every(item=>!first.items.some(previous=>previous.id===item.id)));
  }
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
  assertCapacitySamples(small,large,exact);
  console.log('PASS native custody partition: restore carries exact prefixes, 70 KB custody beyond the authored profile, other keys and humans unaffected, 10,000 boundary and separate rate refusal');
 } finally {await w.close();}
}
