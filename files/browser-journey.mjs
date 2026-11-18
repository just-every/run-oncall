import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {join} from 'node:path';
import {chromium, expect} from '@playwright/test';
import {localWorker} from './tests/worker.mjs';

const directory = process.env.ONCALL_ACK_PACKET;
const w = await localWorker({}, {clock: true, outboundLedger: true});
const service = 'synthetic-browser-ack';
const title = 'Example checkout latency';
const responder = 'Example Responder';
let browser;
try {
  const ok = (result, status = 200) => {
    assert.equal(result.status, status, 'Unexpected HTTP status');
    return result.value;
  };
  const owner = await w.request('/api/setup', {name: 'Example Owner', password: randomBytes(32).toString('hex')});
  const admin = ok(owner).member;
  const req = (path, input) => w.request(path, input, owner.cookie);
  const read = async () => ok(await req('/api/state'));
  const primary = ok(await req('/api/members', {name: responder, role: 'responder', password: randomBytes(32).toString('hex')}), 201);
  ok(await req('/api/command', {type: 'service', id: service, name: 'Example Checkout', environment: 'test', owner: admin.id, runbook: [], pager: ''}));
  const schedule = ok(await req('/api/paging/schedules', {
    id: service, service, name: 'Example checkout rota', revision: 0, timezone: 'UTC',
    validFrom: '2026-01-01T00:00:00.000Z', validUntil: null,
    primary: {anchorLocal: '2026-01-01T00:00', periodDays: 1, members: [primary.id], ambiguity: 'earlier'},
    backup: {anchorLocal: '2026-01-01T00:00', periodDays: 1, members: [], ambiguity: 'earlier'}, overrides: [],
  }));
  ok(await req('/api/paging/policies', {service, scheduleId: schedule.id, revision: 0, primaryWaitSeconds: 180, backupWaitSeconds: 300, retrySeconds: 10, maxAttempts: 1}));
  ok(await req('/api/response/services/' + service, {baseVersion: 0, defaultMode: 'incident', recoveredNotice: 'silent', rules: [], reason: 'Coordinate new incidents'}), 201);
  const key = randomBytes(32).toString('hex');
  ok(await req('/api/intake/sources', {id: service, name: 'Example monitoring', provider: 'pagerduty', service, key, revision: 0}), 201);

  browser = await chromium.launch({headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  const context = await browser.newContext({baseURL: w.origin, viewport: {width: 1440, height: 1000}, locale: 'en-US', timezoneId: 'UTC', extraHTTPHeaders: {connection: 'close'}});
  await context.addCookies(owner.headers.getSetCookie().map(line => {
    const [pair] = line.split(';');
    const at = pair.indexOf('=');
    return {name: pair.slice(0, at), value: pair.slice(at + 1), url: w.origin, httpOnly: true, sameSite: 'Lax'};
  }));
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/settings/services/' + service);
  await page.getByText('Acknowledgment timeout', {exact: true}).click();
  const minutes = page.getByRole('spinbutton', {name: 'Acknowledgment timeout (minutes, 0 is off)'});
  const saved = page.waitForResponse(r => r.url().endsWith('/api/command') && r.request().postDataJSON()?.type === 'acknowledgment-timeout');
  await minutes.fill('1');
  await minutes.blur();
  assert.equal((await saved).status(), 200);
  assert.equal((await read()).services.find(s => s.id === service).ackTimeouts.at(-1).minutes, 1);

  const now = Date.now();
  await w.time(now);
  ok(await w.request('/v2/enqueue', {routing_key: key, event_action: 'trigger', dedup_key: 'example-latency', payload: {summary: title, source: 'example-monitor', severity: 'critical'}}), 202);
  const state = await read();
  const incident = state.incidents.find(i => i.title === title);
  assert.ok(incident, 'Native intake declared an incident');
  const alert = state.alerts.find(a => incident.alerts.includes(a.id));
  assert.ok(alert, 'Native intake linked an alert');
  const path = '/incidents/' + encodeURIComponent(incident.id);
  const pending = incident.deadlines.find(d => d.kind === 'initial-acknowledgment');
  assert.equal(pending.state, 'pending');
  assert.equal(Date.parse(pending.dueAt), now + 60000);
  await page.goto(path);
  await expect(page.getByText(/Waiting for acknowledgment · due/)).toBeVisible({timeout: 15000});
  await w.time(now + 60000);
  assert.equal((await w.send('/cdn-cgi/local/scheduled', undefined, {}, 'GET')).status, 200);
  const recorded = (await read()).incidents.find(i => i.id === incident.id);
  const expired = recorded.deadlines.find(d => d.id === pending.id);
  assert.equal(recorded.state, 'declared');
  assert.equal(expired.state, 'fired');
  assert.equal(expired.dueAt, pending.dueAt);
  assert.equal(expired.obligation.target.id, primary.id);

  const formatted = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'}).format(new Date(expired.dueAt));
  const screens = [
    ['incident', path],
    ['alert', '/alerts/' + encodeURIComponent(alert.id)],
    ['on-call', '/on-call'],
    ['reviews', '/reviews'],
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: width === 1440 ? 1000 : 844});
    for (const [screen, route] of screens) {
      await page.goto(route);
      const rendered = page.getByText(/Not acknowledged in time · missed at/).first();
      await rendered.waitFor({state: 'visible', timeout: 15000});
      if (width === 1440) {
        const text = await rendered.textContent();
        assert.ok(text.includes(formatted), 'Rendered status has the missed deadline: ' + text);
        assert.ok(text.includes(responder + ' was on call'), 'Rendered status identifies the on-call responder');
        assert.ok(text.includes('Paging is off.'), 'Rendered status discloses that paging is off');
      }
      await rendered.scrollIntoViewIfNeeded();
      await page.screenshot({path: join(directory, screen + '-' + width + '.png'), animations: 'disabled'});
    }
  }
  assert.deepEqual(pageErrors, [], 'The application emitted no page errors');
  assert.deepEqual(await w.outboundRequests(), [], 'The journey delivered no outbound requests');
  console.log('PASS browser missed acknowledgment: UI saves one minute, native intake declares and links, scheduled Worker stores the missed time and on-call responder, incident/alert/On call/Reviews agree at 1440, screenshots at 1440 and 390, no delivery.');
} finally {
  await browser?.close();
  await w.close();
}
