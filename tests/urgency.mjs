import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {localWorker} from './worker.mjs';
import {heldWorkspace} from './runtime-held-workspace.mjs';

// Real public Worker doors; all monitoring inputs and held records are test data.
const w=await localWorker();
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

  const replayAuditBefore=w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal');
  const beforeReplay=await archive(),replay=ok(await req('/api/replay',{events:[firstSignal]}));
  assert.deepEqual(replay.decisions[0].historicalUrgency,initial.urgency);
  assert.equal(replay.decisions[0].proposedUrgency.version,severity.version);
  assert.equal(replay.decisions[0].proposedUrgency.urgency,'high');assert.deepEqual(await archive(),beforeReplay);
  assert.deepEqual(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),replayAuditBefore,'OC-043 service replay writes no permanent audit');
  const unordered=ok(await req('/api/replay',{events:[signal('synthetic-oncall-43-z','warning',{observedAt:'2026-10-24T00:00:00Z'}),signal('synthetic-oncall-43-b','warning',{observedAt:'2026-10-23T00:00:00Z'}),signal('synthetic-oncall-43-a','warning',{observedAt:'2026-10-23T00:00:00Z'})]}));
  assert.deepEqual(unordered.decisions.map(row=>row.eventId),['synthetic-oncall-43-a','synthetic-oncall-43-b','synthetic-oncall-43-z']);assert.deepEqual(await archive(),beforeReplay);assert.deepEqual(w.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal'),replayAuditBefore);
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
  const lowered=ok(await w.request(alertPath,edit,responderCookie));
  assert.equal(lowered.urgency,'low');assert.equal(lowered.urgencyRevision,edit.revision+1);
  const human=lowered.urgencyHistory.at(-1);assert.equal(human.by,responder.id);assert.equal(human.reason,edit.reason);assert.equal(human.ruleVersion,null);
  assert.ok((await archive()).audit.some(e=>e.id===human.id&&e.actor===responder.id&&e.kind==='alert-urgency'));
  const beforeStale=await archive();ok(await w.request(alertPath,{...edit,urgency:'high'},responderCookie),409);
  ok(await w.request(alertPath,{...edit,revision:lowered.urgencyRevision,reason:''},responderCookie),400);assert.deepEqual(await archive(),beforeStale);
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

  const saved=await archive(),malformed=[
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
