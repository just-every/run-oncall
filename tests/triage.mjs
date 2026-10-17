import assert from 'node:assert/strict';
import {localWorker} from './worker.mjs';

// One storm journey through emitted Worker/D1 HTTP: query, coordinate and restore.
const w = await localWorker();
const ok = (r, status = 200) => {assert.equal(r.status, status, JSON.stringify(r.value)); return r.value;};
try {
  const setup = await w.request('/api/setup', {name: 'Storm commander', password: 'synthetic-storm-testing-password'});
  const cookie = setup.cookie; ok(setup);
  let continuations = 0;
  const req = async (path, data) => {
    let response;
    do {response = await w.request(path, data, cookie); if (response.value.remaining > 0) continuations++;}
    while (response.status === 200 && response.value.remaining > 0 && !response.value.interrupted);
    return response;
  };
  const actor = ok(await req('/api/session')).member;
  const service = ok(await req('/api/command', {type: 'service', name: 'Payments', environment: 'production', owner: actor.id, runbook: ['Inspect queue pressure'], pager: ''}));
  const backup = ok(await req('/api/members', {name: 'Response scribe', role: 'responder', password: 'synthetic-scribe-testing-password'}), 201);
  const incidents = [];
  for (let n = 0; n < 50; n++) incidents.push(ok(await req('/api/command', {type: 'declare', service: service.id, severity: n < 40 ? 'critical' : 'warning', title: `Payment processing ${n}`, summary: 'Queue backlog with customer checkout delays'})));
  let page = ok(await req('/api/triage?q=backlog&service=' + service.id + '&limit=25'));
  assert.equal(page.total, 50); assert.equal(page.items.length, 25);
  const next = ok(await req('/api/triage?q=backlog&service=' + service.id + '&limit=25&cursor=' + encodeURIComponent(page.nextCursor)));
  assert.equal(new Set([...page.items, ...next.items].map(i => i.id)).size, 50);
  const view = ok(await req('/api/triage/views', {name: 'Payments storm', query: {q: 'backlog', service: service.id}})).views[0];
  assert.equal(ok(await req('/api/triage/views')).views[0].id, view.id);
  // One selected revision becomes stale while the remaining 49 stay valid.
  ok(await req('/api/command', {type: 'note', incident: incidents[0].id, revision: 1, text: 'Confirmed elevated database latency'}));
  const bulk = {operationId: 'storm-ack', action: 'acknowledge', reason: 'Payments response started', items: incidents.map(i => ({id: i.id, revision: i.revision}))};
  const result = ok(await req('/api/triage/bulk', bulk));
  assert.equal(result.results.filter(r => r.ok).length, 49);
  assert.ok(continuations > 0, 'one logical storm operation continues across bounded invocations');
  assert.match(result.results.find(r => r.id === incidents[0].id).error, /changed/i);
  assert.deepEqual(ok(await req('/api/triage/bulk', bulk)), result, 'same operation replays its original per-item outcomes');
  ok(await req('/api/triage/bulk', {...bulk, reason: 'different content'}), 409);
  const state = ok(await req('/api/state'));
  for (const i of state.incidents.filter(i => i.id !== incidents[0].id)) {
    assert.equal(i.state, 'acknowledged');
    assert.equal(i.timeline.filter(e => e.operationId === 'storm-ack').length, 1);
    assert.equal(i.assignee, actor.id);
  }
  assert.equal(ok(await req('/api/triage?mine=true')).total, 49);
  assert.equal(ok(await req('/api/triage?q=database')).total, 1, 'search includes notes');
  assert.equal(ok(await req('/api/triage?severity=critical&urgency=high')).total, 40);
  assert.equal(ok(await req('/api/triage?createdAfter=2090-01-01T00%3A00%3A00Z')).total, 0);
  let target = state.incidents.find(i => i.id === incidents[1].id);
  target = ok(await req('/api/command', {type: 'assign-role', incident: target.id, revision: target.revision, role: 'scribe', member: backup.id, reason: 'Record investigation decisions'}));
  assert.equal(target.scribe, backup.id); assert.equal(target.commander, actor.id);
  target = ok(await req('/api/command', {type: 'reassign', incident: target.id, revision: target.revision, member: backup.id, reason: 'Transfer operational responsibility'}));
  assert.equal(target.assignee, backup.id); assert.equal(target.commander, actor.id, 'response attribution is separate from assignment and authorization');
  target = ok(await req('/api/command', {type: 'set-priority', incident: target.id, revision: target.revision, priority: 'P1', reason: 'Checkout impact'}));
  assert.equal(ok(await req('/api/triage?priority=P1&assignee=' + backup.id)).items[0].id, target.id);
  const resolve = {operationId: 'storm-resolve-refused', action: 'resolve', items: [{id: target.id, revision: target.revision}]};
  assert.equal(ok(await req('/api/triage/bulk', resolve)).results[0].ok, false, 'declared incidents require summary and evidence');
  assert.equal(ok(await req('/api/state')).incidents.find(i => i.id === target.id).state, 'acknowledged');
  const resolved = ok(await req('/api/triage/bulk', {...resolve, operationId: 'storm-resolve', reason: 'Database pool repaired; checkout verified by operator', evidence: 'https://example.test/checks/checkout'}));
  assert.equal(resolved.results[0].ok, true);
  assert.equal(ok(await req('/api/state')).incidents.find(i => i.id === target.id).state, 'resolved');
  const viewer = ok(await req('/api/members', {name: 'Storm observer', role: 'viewer', password: 'synthetic-observer-testing-password'}), 201);
  const viewerCookie = (await w.request('/api/login', {name: viewer.name, password: 'synthetic-observer-testing-password'})).cookie;
  const denied = ok(await w.request('/api/triage/bulk', {...bulk, operationId: 'viewer-ack'}, viewerCookie));
  assert.equal(denied.results.length, 50); assert.ok(denied.results.every(r => !r.ok));
  assert.equal(ok(await w.request('/api/triage/views', undefined, viewerCookie)).views.length, 0);
  assert.ok(!(ok(await w.request('/api/workspace', undefined, viewerCookie)).state.triage ?? []).some(r => r.kind === 'view'), 'private bootstrap does not expose another person’s saved views');
  page = ok(await req('/api/triage?status=declared'));
  const all = {operationId: 'all-matching', action: 'acknowledge', reason: 'Remaining storm item', items: page.items.map(i => ({id: i.id, revision: i.revision})), allMatching: true, query: {status: 'declared'}, confirmedCount: page.total, workspaceRevision: page.workspaceRevision};
  ok(await req('/api/triage/bulk', {...all, confirmedCount: 99}), 409);
  assert.ok(ok(await req('/api/triage/bulk', all)).results.every(r => r.ok));
  const backupCookie = (await w.request('/api/login', {name: backup.name, password: 'synthetic-scribe-testing-password'})).cookie;
  const beforeDowngrade = ok(await req('/api/state'));
  const continuing = {operationId: 'authority-continuation', action: 'set-priority', priority: 'P2', reason: 'Rebalance response priority', items: beforeDowngrade.incidents.map(i => ({id: i.id, revision: i.revision}))};
  const started = ok(await w.request('/api/triage/bulk', continuing, backupCookie));
  assert.ok(started.remaining > 0 && started.results.some(r => r.ok));
  ok(await req('/api/command', {type: 'member', id: backup.id, role: 'viewer', active: true}));
  const beforeDenied = ok(await req('/api/state'));
  const stopped = ok(await w.request('/api/triage/bulk', continuing, backupCookie));
  assert.equal(stopped.results.filter(r => r.ok).length, started.results.filter(r => r.ok).length, 'downgrade preserves already committed outcomes');
  assert.ok(stopped.interrupted && stopped.remaining > 0);
  assert.ok(stopped.results.filter(r => !started.results.some(old => old.id === r.id)).every(r => !r.ok));
  assert.deepEqual(ok(await req('/api/state')), beforeDenied, 'a downgraded continuation commits no further changes');
  const archive = ok(await req('/api/archive'));
  const bad = structuredClone(archive); bad.incidents[0].scribe = 'unknown-responder';
  ok(await req('/api/restore', {mode: 'replace', archive: bad}), 400);
  assert.deepEqual(ok(await req('/api/archive')), archive, 'invalid role references preserve all prior data');
  const orphan = structuredClone(archive); orphan.triage.find(r => r.kind === 'bulk').results.find(r => r.ok).id = 'missing-incident';
  ok(await req('/api/restore', {mode: 'replace', archive: orphan}), 400);
  assert.deepEqual(ok(await req('/api/archive')), archive, 'orphan bulk outcomes cannot replace valid state');
  const restored = await req('/api/restore', {mode: 'replace', archive}); ok(restored);
  const restoredState = ok(await w.request('/api/state', undefined, restored.cookie));
  assert.deepEqual(restoredState.triage, archive.triage, 'restore retains saved views and durable bulk outcomes');
  assert.deepEqual(restoredState.incidents, archive.incidents, 'restore retains roles, assignment, priority and operation attribution');
  await w.stop(); await w.start();
  const login = await w.request('/api/login', {name: 'Storm commander', password: 'synthetic-storm-testing-password'}); ok(login);
  assert.deepEqual(ok(await w.request('/api/state', undefined, login.cookie)).triage, archive.triage, 'durable receipts survive restart');
  console.log('Triage storm: 50 incidents, 49 independent commits plus stale failure, replay, roles, queries, viewer denial, confirmed matching and archive/restart passed');
} finally {await w.close();}
