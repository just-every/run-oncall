import assert from 'node:assert/strict';
import {randomBytes,createHmac,createHash} from 'node:crypto';

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
  const response=await fetch(w.origin+path,{method:'POST',headers:{'content-type':'application/json',...headers},body});
  return {status:response.status,value:await response.json()};
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
 const beforeEcho=ok(await req('/api/archive'));
 for(const echo of [bearer.toUpperCase(),[...bearer].map(c=>'%'+c.charCodeAt(0).toString(16)).join(''),[...bearer].map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join('')])ok(await send('{"echo":"'+echo+'"',bearer,'bearer','/api/ingress/intake:native'),400);
 assert.deepEqual(ok(await req('/api/archive')),beforeEcho,'credential spellings never reach retained prefixes');
 assert.equal((await w.request('/api/state',undefined,undefined,{authorization:'Bearer '+bearer})).status,401);
 const source=ok(await req('/api/state')).intakeSources.find(s=>s.id==='native');
 const rotate={id:source.id,name:source.name,provider:'native',scope:source.routing.scope,owner:actor.id,key:key(),revision:source.revision};
 const beforeFailure=ok(await req('/api/archive'));
 w.sql("CREATE TRIGGER native_audit_fail BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic native audit failure'); END");
 try {ok(await req('/api/routing/keys',rotate),503);ok(await send(event('audit-rollback')),503);ok(await send('{"audit-failed":',bearer,'bearer','/api/ingress/intake:native'),503);}finally{w.sql('DROP TRIGGER native_audit_fail');}
 assert.deepEqual(ok(await req('/api/archive')),beforeFailure);
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
