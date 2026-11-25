import assert from 'node:assert/strict';
import {randomBytes, randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {localWorker} from './worker.mjs';

// D1 read budget for the routine doors on Workers Free, where every tool on the
// account shares 5,000,000 rows read a day. With 30 days of history at 40 alerts
// a day, the console's workspace poll (unchanged and changed), a due on-call
// sweep on the minute cron and a cold isolate's first read must each stay under
// a ceiling far below one read of every stored row, and that ceiling does not
// move with history. Rows are D1's own meta.rows_read for every statement.
const alertsPerDay = 40, days = 30, ceiling = 600, coldCeiling = 1500;

// Meters each request's and cron run's D1 statements inside the Worker.
const meterSource = `const meter={rows:0,statements:0};const originals=new WeakMap();
let pendingErase, erasure;
const count=result=>{if(result&&result.meta){meter.rows+=result.meta.rows_read??0;meter.statements++}return result};
const statement=(original,sql)=>{const wrapped=new Proxy(original,{get(target,key){
 if(key==='bind')return(...values)=>statement(target.bind(...values),sql);
 if(key==='all'||key==='run')return async()=>count(await target[key]());
 if(key==='first')return async column=>{const row=count(await target.all()).results[0]??null;return column&&row?row[column]:row};
 if(key==='raw')return async options=>{const rows=count(await target.all()).results;return [...(options?.columnNames&&rows.length?[Object.keys(rows[0])]:[]),...rows.map(row=>Object.values(row))]};
 const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value}});originals.set(wrapped,{original,sql});return wrapped};
const metered=(db,beforeSnapshotWrite)=>new Proxy(db,{get(target,key){
 if(key==='prepare')return sql=>statement(target.prepare(sql),sql);
 if(key==='batch')return async list=>{
  if (originals.get(list[0])?.sql.startsWith('DELETE FROM oc_read_snapshot')) await beforeSnapshotWrite?.();
  return (await target.batch(list.map(item=>originals.get(item)?.original??item))).map(count);
 };
 const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value}});
const appFetch=app.fetch,appScheduled=app.scheduled;
app.fetch=async(request,env,ctx)=>{
 const url=new URL(request.url);
 if(url.pathname==='/__d1_meter'){const value={...meter,erasure};meter.rows=0;meter.statements=0;return Response.json(value)}
 if(url.pathname==='/__d1_erase_during_snapshot'){
  const {id,input}=await request.json();
  pendingErase={url:new URL('/api/erasure/member/'+id,url),headers:{
   origin:request.headers.get('origin'),cookie:request.headers.get('cookie'),'content-type':'application/json',
  },input};
  return Response.json({armed:true});
 }
 return appFetch(request,{...env,DB:metered(env.DB)},ctx);
};
app.scheduled=(event,env,ctx)=>appScheduled(event,{...env,DB:metered(env.DB,async()=>{
 if(!pendingErase)return;
 const {url,headers,input}=pendingErase;
 pendingErase=undefined;
 const response=await appFetch(new Request(url,{method:'POST',headers,body:JSON.stringify(input)}),env,ctx);
 erasure={status:response.status,receipt:await response.json(),
  parts:await env.DB.prepare('SELECT COUNT(*) AS n FROM oc_read_snapshot').first('n')};
})},ctx);`;

const tables = ['oc_teams', 'oc_erased_report_cases', 'oc_schedule_records', 'oc_business_services', 'oc_key_allowances', 'oc_api_clients', 'oc_api_endpoints', 'oc_api_operations', 'oc_api_outbox', 'oc_members', 'oc_services', 'oc_policies', 'oc_events', 'oc_alerts', 'oc_incidents', 'oc_audit', 'oc_triage', 'oc_changes', 'oc_change_sources', 'oc_intake_sources', 'oc_intake_receipts', 'oc_email_addresses', 'oc_email_rules', 'oc_email_samples', 'oc_email_receipts', 'oc_email_quarantine'];
const start = Date.now();
const persist = await mkdtemp(join(tmpdir(), 'oncall-read-budget-'));
const w = await localWorker({}, {clock: true, fetchSource: meterSource, persistTo: persist});
const ok = (response, status = 200) => {assert.equal(response.status, status, JSON.stringify(response.value)); return response.value;};
const rows = async () => ok(await w.send('/__d1_meter', undefined, {}, 'GET')).rows;
const report = {};
try {
  await w.time(start);
  const setup = await w.request('/api/setup', {name: 'Synthetic Budget Owner', password: 'synthetic-oncall-budget-password'});
  const cookie = setup.cookie, owner = ok(setup).member;
  const req = (path, input) => w.request(path, input, cookie);
  const tick = async () => ok(await w.send('/cdn-cgi/local/scheduled', undefined, {}, 'GET'));
  const target = ok(await req('/api/members', {name: 'Alice Example', role: 'responder', password: 'synthetic-oncall-erasure-password'}), 201);
  const keep = ok(await req('/api/members', {name: 'Sam Example', role: 'responder', password: 'synthetic-oncall-retained-password'}), 201);
  const snapshot = () => w.sql('SELECT data FROM oc_read_snapshot ORDER BY part').map(row => row.data).join('');
  await tick();
  assert.ok(snapshot().includes(target.name), 'the cron stored the member before erasure');

  // Make an existing snapshot due for rewrite with unrelated changes.
  w.sql(`WITH RECURSIVE revisions(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM revisions WHERE n<300)
    INSERT INTO oc_read_changes(tbl,pk) SELECT 'oc_members', '${keep.id.replaceAll("'", "''")}' FROM revisions`);
  ok(await req('/__d1_erase_during_snapshot', {id: target.id, input: {
    workspaceRevision: ok(await req('/api/state')).revision, confirmation: 'erase ' + target.id, identitiesReviewed: true, importedPeople: [],
  }}));
  await tick();
  const {erasure} = ok(await w.send('/__d1_meter', undefined, {}, 'GET'));
  assert.equal(erasure.status, 200, JSON.stringify(erasure.receipt));
  assert.equal(erasure.receipt.state, 'complete');
  assert.equal(erasure.parts, 0, 'erasure clears the existing snapshot in its own transaction');
  assert.ok(!snapshot().includes(target.name), 'the in-flight rewrite never restores the erased name');
  await tick();
  assert.ok(snapshot().includes(keep.name) && !snapshot().includes(target.name), 'the snapshot contains only the retained name after a quiet cron');
  assert.ok(!JSON.stringify(ok(await req('/api/workspace')).state).includes(target.name));

  const service = 'synthetic-budget-support';
  const primary = ok(await req('/api/members', {name: 'Synthetic budget primary', role: 'responder', password: 'synthetic-oncall-primary-password'}), 201);
  const backup = ok(await req('/api/members', {name: 'Synthetic budget backup', role: 'responder', password: 'synthetic-oncall-backup-password'}), 201);
  ok(await req('/api/command', {type: 'service', id: service, name: 'Support queue', environment: 'test', owner: owner.id, runbook: [], pager: ''}));
  const contacts = [{id: 'email', type: 'email', label: 'Work inbox', address: 'synthetic-primary@example.test', countryCode: null}];
  ok(await req(`/api/members/${primary.id}/notification-rules`, {revision: 0, contacts, rules: [{id: 'first', contact: 'email', delayMinutes: 0, urgency: 'high'}, {id: 'later', contact: 'email', delayMinutes: 2, urgency: 'high'}]}));
  const rotation = members => ({anchorLocal: '2026-01-01T00:00', periodDays: 1, members, ambiguity: 'earlier'});
  const schedule = ok(await req('/api/paging/schedules', {id: service, name: 'Support rota', service, revision: 0, timezone: 'UTC', validFrom: '2026-01-01T00:00:00.000Z', validUntil: null, primary: rotation([primary.id]), backup: rotation([backup.id]), overrides: []}));
  ok(await req('/api/paging/policies', {service, scheduleId: schedule.id, revision: 0, primaryWaitSeconds: 300, backupWaitSeconds: 180, retrySeconds: 10, maxAttempts: 1}));
  const key = randomBytes(32).toString('hex');
  ok(await req('/api/intake/sources', {id: service, name: 'Synthetic monitoring', provider: 'pagerduty', service, key, revision: 0}), 201);
  const send = (id, action = 'trigger') => w.request('/v2/enqueue', {routing_key: key, event_action: action, dedup_key: id, ...(action === 'trigger' ? {payload: {summary: 'Synthetic support alert ' + id, source: 'synthetic-monitor', severity: 'critical'}} : {})});

  // One real alert lifecycle through the public doors, then its stored rows
  // copied under fresh identities until the history holds 30 days at 40 a day.
  const before = new Map(tables.map(table => [table, new Set(w.sql(`SELECT id FROM ${table}`).map(row => row.id))]));
  const template = 'history-' + randomBytes(8).toString('hex');
  ok(await send(template), 202);
  await w.time(start + 60_000);
  ok(await send(template, 'resolve'), 202);
  const lifecycle = tables.flatMap(table => w.sql(`SELECT id,data FROM ${table}`).filter(row => !before.get(table).has(row.id)).map(row => ({table, ...row})));
  const identities = [...new Set([template, ...lifecycle.map(row => row.id), ...lifecycle.filter(row => row.table === 'oc_events').map(row => JSON.parse(row.data).eventId)])].filter(Boolean);
  assert.ok(lifecycle.some(row => row.table === 'oc_alerts') && lifecycle.some(row => row.table === 'oc_events'), 'the template lifecycle stored an alert and its events');
  const d1 = join(persist, 'v3/d1/miniflare-D1DatabaseObject');
  const db = new DatabaseSync(join(d1, readdirSync(d1).find(name => name.endsWith('.sqlite'))));
  try {
    db.exec('PRAGMA busy_timeout=10000');
    db.exec('BEGIN');
    const next = new Map(tables.map(table => [table, db.prepare(`SELECT COALESCE(MAX(ordinal),-1)+1 AS n FROM ${table}`).get().n]));
    const insert = new Map(tables.map(table => [table, db.prepare(`INSERT INTO ${table}(id,ordinal,data) VALUES(?,?,?)`)]));
    for (let copy = 1; copy < alertsPerDay * days; copy++) {
      const rename = text => identities.reduce((value, identity) => value.replaceAll(identity, `${identity}-h${copy}`), text);
      for (const row of lifecycle) {
        insert.get(row.table).run(rename(row.id), next.get(row.table), rename(row.data));
        next.set(row.table, next.get(row.table) + 1);
      }
    }
    db.prepare('UPDATE workspace_control SET revision=revision+1,write_token=? WHERE id=1').run(randomUUID());
    db.exec('COMMIT');
  } finally {db.close();}
  report.storedRecords = tables.reduce((sum, table) => sum + w.sql(`SELECT COUNT(*) AS n FROM ${table}`)[0].n, 0);

  const poll = async (previous = {}) => ok(await w.request('/api/workspace', undefined, cookie, {
    'x-oncall-workspace-refresh': 'coverage',
    ...(previous.stateVersion ? {'x-oncall-workspace-version': previous.stateVersion} : {}),
    ...(previous.coverageVersion ? {'x-oncall-coverage-version': previous.coverageVersion} : {}),
  }));
  await rows();
  let view = await poll();
  report.firstRead = await rows();
  assert.ok(view.state.alerts.length >= alertsPerDay * days, 'the console reads the whole history');
  view = {...view, ...await poll(view)};
  report.unchangedPoll = await rows();

  // A live alert arrives; its on-call run has a record due two minutes in.
  await w.time(start + 3_600_000);
  ok(await send('live-' + randomBytes(4).toString('hex')), 202);
  report.acceptedAlert = await rows();
  const changed = await poll(view);
  report.changedPoll = await rows();
  assert.ok(!changed.unchanged && changed.state.alerts.some(alert => alert.onCall?.state === 'running'), 'the changed poll carries the live alert and its on-call run');
  await w.time(start + 3_600_000 + 150_000);
  await tick();
  report.dueOnCallSweep = await rows();
  assert.ok(w.sql("SELECT COUNT(*) AS n FROM oc_alerts WHERE json_extract(data,'$.onCall.state')='running'")[0].n === 1);
  const after = await poll(changed);
  report.pollAfterSweep = await rows();
  assert.ok(!after.unchanged, 'the sweep recorded the due notification');
  await tick();
  report.quietCron = await rows();

  // A new isolate starts from the stored copy the cron keeps near the log.
  await w.stop(); await w.start(); await w.time(start + 3_600_000 + 200_000);
  await poll(after);
  report.coldPoll = await rows();
  await w.stop(); await w.start(); await w.time(start + 3_600_000 + 400_000);
  await tick();
  report.coldDueSweep = await rows();

  console.log(JSON.stringify({alertsPerDay, days, ...report}));
  assert.ok(report.firstRead > 4 * ceiling, `the seeded history is realistic: one full read costs ${report.firstRead} rows`);
  for (const name of ['unchangedPoll', 'changedPoll', 'dueOnCallSweep', 'pollAfterSweep', 'quietCron'])
    assert.ok(report[name] < ceiling, `${name} read ${report[name]} D1 rows; expected under ${ceiling} with ${report.storedRecords} stored records`);
  for (const name of ['coldPoll', 'coldDueSweep'])
    assert.ok(report[name] < coldCeiling, `${name} read ${report[name]} D1 rows; expected under ${coldCeiling} with ${report.storedRecords} stored records`);
  // Every tracked table must keep its change triggers through later migrations.
  const triggers = new Set(w.sql("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'oc_read_%'").map(row => row.name));
  for (const table of [...tables, 'paging_schedules', 'paging_policies', 'paging_jobs', 'paging_receipts', 'paging_callbacks'])
    for (const event of ['insert', 'update', 'delete']) assert.ok(triggers.has(`oc_read_${table}_${event}`), `${table} logs ${event}s for readers`);
  console.log('PASS D1 read budget: console polls, a due on-call sweep and cold reads stay flat with 30 days of history');
} finally {
  await w.stop();
  await rm(persist, {recursive: true, force: true});
}
