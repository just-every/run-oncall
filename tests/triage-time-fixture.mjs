import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

export async function alertTriageTimeFixture({call, admit, setTime, service, actor}) {
  const source = 'synthetic-oncall-60605';
  const key = randomBytes(32).toString('hex');
  const title = 'Synthetic triage chronology';
  const times = {
    opened: '2026-11-03T10:00:00.000Z',
    earlierHuman: '2026-11-03T10:02:00.000Z',
    humanOpened: '2026-11-03T10:05:00.000Z',
    untouchedOpened: '2026-11-03T10:10:00.000Z',
    recovered: '2026-11-03T10:15:00.000Z',
    laterHuman: '2026-11-03T10:20:00.000Z',
    duplicate: '2026-11-03T10:25:00.000Z',
  };
  await call('/api/sources', {id: source, key, scopes: [service.id]});
  const state = () => call('/api/state');
  const clock = at => setTime(Date.parse(at));
  const signal = (suffix, group, generation) => ({
    source, eventId: source + '-' + suffix, service: service.id, environment: service.environment,
    key: source + '-' + group, generation: source + '-' + generation, intent: 'trigger',
    severity: 'warning', title: title + ' ' + suffix, observedAt: times.opened, evidence: '',
  });
  const send = async (at, input, status = 201) => {
    await clock(at);
    return admit('/api/ingress/' + source, input, key, status);
  };
  const getAlert = (workspace, receipt) => {
    const alert = workspace.alerts.find(row => row.events.includes(receipt.id));
    assert.ok(alert);
    return alert;
  };
  const acknowledge = async (at, alert, suffix) => {
    await clock(at);
    const result = await call('/api/triage/bulk', {
      operationId: source + '-' + suffix, action: 'acknowledge', confirmedCount: 1,
      items: [{id: alert.id, kind: 'alert', revision: alert.revision ?? 1}],
      reason: 'Responder reviews this alert generation',
    });
    assert.deepEqual(result.results, [{id: alert.id, kind: 'alert', ok: true, revision: (alert.revision ?? 1) + 1}]);
  };
  const olderInput = signal('older', 'shared', 'older');
  const opened = await send(times.opened, olderInput);
  const older = getAlert(await state(), opened);
  await acknowledge(times.earlierHuman, older, 'first-response');
  const humanOpened = await send(times.humanOpened, signal('human', 'human', 'human'));
  const untouchedOpened = await send(times.untouchedOpened, signal('untouched', 'shared', 'newer'));
  const recoveryInput = {...olderInput, eventId: source + '-recovery', intent: 'recover'};
  const recovery = await send(times.recovered, recoveryInput);
  const human = getAlert(await state(), humanOpened);
  await acknowledge(times.laterHuman, human, 'later-response');
  const retained = await state();
  const replay = await send(times.duplicate, recoveryInput, 200);
  assert.deepEqual(replay, {...recovery, duplicate: true});
  assert.deepEqual(await state(), retained, 'exact recovery replay preserves retained events, alerts and workspace revision');
  const recovered = getAlert(retained, recovery), coordinated = getAlert(retained, humanOpened), untouched = getAlert(retained, untouchedOpened);
  assert.equal(recovered.id, older.id);
  assert.notEqual(recovered.id, untouched.id);
  assert.equal(recovered.key, untouched.key);
  assert.notEqual(recovered.generation, untouched.generation);
  assert.equal(recovered.state, 'recovered');
  assert.equal(untouched.state, 'active');
  assert.equal(untouched.coordination, undefined);
  assert.deepEqual(recovered.events, [opened.id, recovery.id]);
  assert.deepEqual(untouched.events, [untouchedOpened.id]);
  assert.deepEqual(coordinated.events, [humanOpened.id]);
  assert.deepEqual(recovered.coordination.history.map(entry => [entry.at, entry.actor]), [[times.earlierHuman, actor.id]]);
  assert.deepEqual(coordinated.coordination.history.map(entry => [entry.at, entry.actor]), [[times.laterHuman, actor.id]]);
  for (const [receipt, at] of [[opened, times.opened], [humanOpened, times.humanOpened], [untouchedOpened, times.untouchedOpened], [recovery, times.recovered]]) {
    const event = retained.events.find(row => row.id === receipt.id);
    assert.deepEqual([event.service, event.acceptedAt, event.observedAt], [service.id, at, times.opened]);
  }
  assert.ok(!retained.incidents.some(incident => incident.alerts.some(id => [recovered.id, coordinated.id, untouched.id].includes(id))));
  return {query: {kind: 'alerts', service: service.id, q: title}, times, recovered, coordinated, untouched};
}
