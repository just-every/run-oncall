import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {localWorker} from './worker.mjs';

// The real emitted Worker and D1; only Twilio's API is faked, inside the Worker at the network edge.
// No real text message is ever sent from a test.
const sid = 'AC' + '0'.repeat(32), token = 'synthetic-twilio-auth-token', from = '+15550100000', ownerNumber = '+15550100001', bobNumber = '+14155550123';
const twilio = `
let providerMode='normal',providerCalls=[],pkceChallenge='',pkceValid=true,revoked=false;
globalThis.fetch=async (input,init)=>{
 const request=new Request(input,init);
 if(request.url!=='https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json'||request.method!=='POST')throw Error('Unexpected outbound request '+request.url);
 const form=Object.fromEntries(new URLSearchParams(await request.text()));
 providerCalls.push({to:form.To,from:form.From,body:form.Body,auth:request.headers.get('authorization')==='Basic '+btoa('${sid}:${token}')});
 if(providerMode==='down')return Response.json({code:20500,message:'Down for '+form.To},{status:503});
 if(providerMode==='bad')return Response.json({code:21211,message:'The number '+form.To+' is not valid'},{status:400});
 return Response.json({sid:'SM'+providerCalls.length.toString().padStart(32,'0'),status:'queued'},{status:201});
};`;
const ok = (r, status = 200) => {assert.equal(r.status, status, JSON.stringify(r.value)); return r.value;};
const w = await localWorker({TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from, TWILIO_TO_NUMBER: ownerNumber}, {clock: true, fetchSource: twilio});
const bare = await localWorker({}, {outboundLedger: true});
try {
  const start = Date.now();
  let cookie;
  const req = (path, data) => w.request(path, data, cookie);
  const mode = async value => ok(await w.request('/__provider_control', {mode: value}));
  const calls = async () => (await w.request('/__provider_calls')).value.calls;
  const tick = async at => {await w.time(at); assert.equal((await w.send('/cdn-cgi/local/scheduled', undefined, {}, 'GET')).status, 200);};
  await w.time(start);
  cookie = (await w.request('/api/setup', {name: 'Paging operator', password: 'synthetic-paging-operator-password'})).cookie;
  const admin = ok(await req('/api/session')).member;
  // The deploying owner is this administrator: TWILIO_TO_NUMBER is theirs.
  w.sql(`INSERT INTO oa_operators(id,email,display_name,role,status,created_at) VALUES('op-owner','owner@example.test','Owner','owner','active',0)`);
  w.sql(`INSERT INTO operator_members(operator_id,member_id) VALUES('op-owner','${admin.id}')`);
  const bob = ok(await req('/api/members', {name: 'Second Responder', role: 'responder', password: 'synthetic-paging-bob-password'}), 201);
  ok(await req(`/api/members/${bob.id}/notification-rules`, {revision: 0, contacts: [{id: 'mobile', type: 'sms', label: 'Mobile', address: '4155550123', countryCode: 1}], rules: []}));
  ok(await req('/api/command', {type: 'service', id: 'checkout', name: 'Checkout', environment: 'production', owner: admin.id, runbook: [], pager: ''}));
  const schedule = ok(await req('/api/paging/schedules', {id: 'checkout', service: 'checkout', name: 'Checkout rota', revision: 0, timezone: 'UTC', validFrom: '2026-01-01T00:00:00.000Z', validUntil: null,
    primary: {anchorLocal: '2026-11-01T00:00', periodDays: 1, members: [admin.id], ambiguity: 'earlier'}, backup: {anchorLocal: '2026-11-01T00:00', periodDays: 1, members: [bob.id], ambiguity: 'earlier'}, overrides: []}));
  ok(await req('/api/paging/policies', {service: 'checkout', scheduleId: schedule.id, revision: 0, primaryWaitSeconds: 1200, backupWaitSeconds: 600, retrySeconds: 10, maxAttempts: 1}));
  ok(await req('/api/response/services/checkout', {baseVersion: 0, defaultMode: 'incident', recoveredNotice: 'silent', rules: [], reason: 'Coordinate checkout'}), 201);
  const key = randomBytes(32).toString('hex');
  ok(await req('/api/intake/sources', {id: 'monitor', name: 'Checkout monitoring', provider: 'pagerduty', service: 'checkout', key, revision: 0}), 201);
  const trigger = async dedup => ok(await w.request('/v2/enqueue', {routing_key: key, event_action: 'trigger', dedup_key: dedup, payload: {summary: 'Checkout latency ' + dedup, source: 'checkout-monitor', severity: 'critical'}}), 202);
  const alertFor = async dedup => (ok(await req('/api/state')).alerts).find(a => a.key === dedup);
  const pages = async dedup => ok(await req('/api/paging/sms/deliveries?alert=' + encodeURIComponent((await alertFor(dedup)).id))).deliveries;
  const acknowledge = async dedup => {
    const state = ok(await req('/api/state')), incident = state.incidents.find(i => i.alerts.includes(state.alerts.find(a => a.key === dedup).id));
    ok(await req('/api/command', {type: 'transition', incident: incident.id, revision: incident.revision, state: 'acknowledged', summary: 'On it'}));
  };

  // OFF by default: a sender is configured but no rota is switched on, so an alert pages nobody.
  assert.equal(ok(await req('/api/paging/sms')).configured, true);
  await trigger('off'); await tick(start + 1000);
  assert.deepEqual(await calls(), [], 'no rota has paging on');

  // Only an administrator switches a rota on; the owner then gets exactly one page per new alert however often it is delivered (an alert open before the switch is not texted about).
  const viewer = await w.request('/api/login', {name: 'Second Responder', password: 'synthetic-paging-bob-password'});
  ok(await w.request('/api/paging/sms/schedules', {schedule: schedule.id, enabled: true}, viewer.cookie), 403);
  ok(await req('/api/paging/sms/schedules', {schedule: 'missing', enabled: true}), 404);
  await w.time(start + 500);
  assert.deepEqual(ok(await req('/api/paging/sms/schedules', {schedule: schedule.id, enabled: true})), {schedule: schedule.id, enabled: true});
  await trigger('first'); await trigger('first');
  await Promise.all([tick(start + 61_000), tick(start + 61_000)]); await tick(start + 62_000);
  let sent = await calls();
  assert.equal(sent.length, 1, 'one alert, however many deliveries and overlapping crons, is one page');
  assert.deepEqual({to: sent[0].to, from: sent[0].from, auth: sent[0].auth}, {to: ownerNumber, from, auth: true});
  assert.match(sent[0].body, /Checkout latency first/); assert.match(sent[0].body, /\/alerts\//);
  let log = await pages('first');
  assert.deepEqual(log.map(p => [p.step, p.status, p.toHint, p.attempts]), [[1, 'sent', '0001', 1]]);
  assert.ok(!JSON.stringify(log).includes(ownerNumber.slice(1, 8)), 'the log keeps four digits, never the number');
  // Health and the alert's run record report the same sender and the same page, never a credential or a number.
  const health = ok(await w.request('/health'));
  assert.equal(health.paging, 'configured');
  assert.ok(![token, ownerNumber, from].some(secret => JSON.stringify(health).includes(secret)));
  let record = ok(await req('/api/on-call/notifications?alert=' + encodeURIComponent((await alertFor('first')).id)));
  assert.equal(record.sender, 'sms');
  assert.deepEqual([record.runs[0].sender, record.runs[0].paging, record.runs[0].pages.map(p => [p.step, p.status, p.toHint])], ['sms', 'ON', [[1, 'sent', '0001']]]);
  assert.ok(!/no sender|paging OFF/.test(JSON.stringify(record)), 'the run record no longer says nothing was sent');

  // No acknowledgment in 20 minutes: person 2 is paged, once.
  await tick(start + 1199_000 - 1000); assert.equal((await calls()).length, 1);
  await tick(start + 1200_000 + 61_000); await tick(start + 1200_000 + 62_000);
  sent = await calls(); assert.equal(sent.length, 2);
  assert.equal(sent[1].to, bobNumber); assert.match(sent[1].body, /^Escalated, no ack in 20 min/);
  assert.deepEqual((await pages('first')).map(p => [p.step, p.status]).sort(), [[1, 'sent'], [2, 'sent']]);

  // An acknowledgment stops escalation.
  const t2 = start + 4000_000; await w.time(t2);
  await trigger('acked'); await tick(t2 + 61_000); assert.equal((await calls()).length, 3);
  await acknowledge('acked'); await tick(t2 + 1300_000);
  assert.equal((await calls()).length, 3, 'no second page after an acknowledgment');
  assert.deepEqual((await pages('acked')).map(p => p.step), [1]);

  // A failed send is recorded and visible; transient failures retry on a ladder, a permanent one does not.
  const t3 = start + 9000_000; await w.time(t3);
  await mode('down'); await trigger('down'); await tick(t3 + 61_000);
  let [row] = await pages('down'); assert.deepEqual([row.status, row.attempts, row.detail], ['retry', 1, 'twilio 503 code 20500']);
  await tick(t3 + 62_000); assert.equal((await calls()).length, 1, 'a retry waits for its backoff');
  await tick(t3 + 125_000); await tick(t3 + 250_000);
  [row] = await pages('down'); assert.deepEqual([row.status, row.attempts, row.detail], ['failed', 3, 'twilio 503 code 20500']);
  await tick(t3 + 400_000); assert.equal((await calls()).length, 3, 'a failed page is not sent again');
  assert.ok(!JSON.stringify(await pages('down')).includes('Down for'), "the provider's message, which can echo a number, is not kept");
  await mode('bad'); await trigger('bad'); await tick(t3 + 460_000);
  [row] = await pages('bad'); assert.deepEqual([row.status, row.attempts, row.detail], ['failed', 1, 'twilio 400 code 21211']);
  await mode('down'); await trigger('flaky'); await tick(t3 + 520_000); await mode('normal'); await tick(t3 + 600_000);
  [row] = await pages('flaky'); assert.deepEqual([row.status, row.attempts, row.detail], ['sent', 2, null]);
  await mode('down'); await trigger('acked-retry'); await tick(t3 + 660_000); await acknowledge('acked-retry'); await mode('normal'); await tick(t3 + 800_000);
  [row] = await pages('acked-retry'); assert.equal(row.status, 'failed'); assert.match(row.detail, /not retried/);

  // The documented first check: one test page to the administrator's own number.
  await mode('normal'); const before = (await calls()).length;
  const test = ok(await req('/api/paging/sms/test', {}));
  assert.deepEqual([test.status, test.toHint, (await calls()).length - before], ['sent', '0001', 1]);
  assert.equal((await calls()).at(-1).body, 'Oncall test page. If you can read this, paging works.');

  // Switched off again, a new alert pages nobody.
  ok(await req('/api/paging/sms/schedules', {schedule: schedule.id, enabled: false}));
  const after = (await calls()).length; await w.time(start + 12_000_000);
  await trigger('off-again'); await tick(start + 12_100_000);
  assert.equal((await calls()).length, after);

  // Without a sender the switch refuses and nothing leaves the Worker.
  const bareCookie = (await bare.request('/api/setup', {name: 'Bare operator', password: 'synthetic-bare-operator-password'})).cookie;
  assert.equal(ok(await bare.request('/api/paging/sms', undefined, bareCookie)).configured, false);
  assert.equal(ok(await bare.request('/health')).paging, 'not-configured');
  ok(await bare.request('/api/paging/sms/test', {}, bareCookie), 409);
  assert.deepEqual(await bare.outboundRequests(), []);
  console.log('PASS paging sender: off by default, one page per alert, 20-minute escalation, ack stops it, failures recorded, no number or credential kept');
} finally {
  await w.close(); await bare.close();
}
