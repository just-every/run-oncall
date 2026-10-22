import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

// Continue the existing real Worker routing journey; the platform clock, not the
// application, is injected by worker.mjs. No admission or storage is faked.
export async function rateJourney(w,cookie,actor) {
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
 const req=(path,body)=>w.request(path,body,cookie),secret=()=>randomBytes(32).toString('hex');
 let key=secret(),second=secret(),now=Date.now();await w.time(now);
 const configure=(id,value,revision=0)=>req('/api/routing/keys',{id,name:'Rate boundary '+id,provider:'native',scope:['payments'],owner:actor.id,key:value,revision,catchAll:'payments'});
 ok(await configure('rate-main',key),201);ok(await configure('rate-second',second),201);
 const event=(id,source='rate-main')=>({source:'intake:'+source,eventId:'rate-'+id,service:'hint',environment:'hint',key:'rate-'+id,generation:'window',intent:'trigger',severity:'warning',title:'Payment timeout',observedAt:new Date(now).toISOString()});
 const send=async(input,value=key,path='/api/ingress/'+input.source)=>{
  const response=await fetch(w.origin+path,{method:'POST',headers:{authorization:'Bearer '+value,'content-type':'application/json'},body:typeof input==='string'?input:JSON.stringify(input)});
  return {status:response.status,value:await response.json(),headers:response.headers};
 };
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
 // A lower owner-configured event allowance refuses before grouped mutation.
 state=ok(await req('/api/state'));ok(await req('/api/intake/allowances',{id:'intake:rate-main',requests:600,events:1,revision:state.revision}));
 const grouped={...event('grouped'),key:'rate-recovered'};ok(await send(grouped),201);
 const beforeRefusal=await protectedState();ok(await send(event('new-window-full')),429);assert.deepEqual(await protectedState(),beforeRefusal);
 assert.equal(ok(await req('/api/state')).audit.filter(a=>a.kind==='intake-throttled'&&a.actor==='source:intake:rate-main').length,2);
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
 console.log('PASS OC-072 per-record rolling allowances: default 121st event, other-key isolation, duplicate request boundary, rotation, exact-window recovery, owner notices, pre-grouping and incomplete refusal, checkpoint policy custody');
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
  const send=async()=>{const r=await fetch(w.origin+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});return {status:r.status,value:await r.json(),headers:r.headers};};
  const first=await send();assert.ok([200,201,202].includes(first.status),JSON.stringify(first.value));
  const before=ok(await req('/api/archive')),denied=await send();ok(denied,429);assert.ok(Number(denied.headers.get('retry-after'))>0);
  const after=ok(await req('/api/archive'));assert.deepEqual(after.events,before.events);assert.deepEqual(after.alerts,before.alerts);assert.deepEqual(after.intakeReceipts,before.intakeReceipts);
  if(provider==='opsgenie'){const status=await fetch(w.origin+'/v2/alerts/requests/'+first.value.requestId,{headers});assert.equal(status.status,429);}
 }
 const batchKey=randomBytes(32).toString('hex');
 ok(await req('/api/routing/keys',{id:'rate-batch',name:'Atomic group rate boundary',provider:'alertmanager',scope:['payments'],owner:actor.id,key:batchKey,revision:0,catchAll:'payments'}),201);
 ok(await req('/api/intake/allowances',{id:'intake:rate-batch',requests:600,events:2,revision:ok(await req('/api/state')).revision}));
 const batch=monitoring('alertmanager','batch-first');batch.alerts=Array.from({length:3},(_,i)=>monitoring('alertmanager','batch-'+i).alerts[0]);
 const held=ok(await req('/api/archive'));
 const batchReply=await fetch(w.origin+'/api/monitoring/rate-batch',{method:'POST',headers:{authorization:'Bearer '+batchKey,'content-type':'application/json'},body:JSON.stringify(batch)});
 assert.equal(batchReply.status,429);assert.equal(batchReply.headers.get('retry-after'),null);
 const batchRefusal=await batchReply.json();assert.equal(batchRefusal.rateLimit.code,'batch_exceeds_allowance');assert.equal(batchRefusal.rateLimit.batchCount,3);assert.equal(batchRefusal.rateLimit.allowance,2);assert.match(batchRefusal.rateLimit.instruction,/Split/);
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
