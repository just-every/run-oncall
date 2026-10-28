import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// Trusted verifier tooling. Every native fixture enters through ordinary HTTP.
export default async function initialize({ request, origin, token, displayName, returnTo, fixtures }) {
  const bootstrap = await request(new URL('/auth/bootstrap', origin).href, {
    method: 'POST', redirect: 'manual', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, displayName, returnTo }),
  });
  assert.equal(bootstrap.status, 303, 'Native owner bootstrap must succeed');
  const cookie = bootstrap.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ');
  assert.ok(cookie, 'Native bootstrap must issue a session');
  const setup = await request(new URL('/setup', origin).href, {
    method: 'POST', redirect: 'manual', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ confirm: 'yes' }).toString(),
  });
  assert.equal(setup.status, 303, 'Native first-run confirmation must succeed');
  await setup.body?.cancel();
  async function json(path, input, status = 200, headers = {}) {
    const response = await request(new URL(path, origin).href, {
      method: input === undefined ? 'GET' : 'POST', redirect: 'manual',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', ...headers },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    });
    assert.equal(response.status, status, `Native fixture request failed: ${path}`);
    return response.json();
  }
  const workspace = await json('/api/workspace');
  assert.equal(workspace.member?.role, 'admin', 'Native owner must link to an active Oncall administrator');
  const owner = workspace.member.id;
  const members = {};
  for (const role of ['responder', 'viewer', 'admin']) {
    members[role] = await json('/api/members', { name: `Agent ${role}`, role, password: randomBytes(32).toString('hex') }, 201);
  }
  for (const [id, name] of [['agent-service', 'Agent coordination service'], ['agent-foreign-service', 'Foreign coordination service']]) {
    await json('/api/command', { type: 'service', id, name, environment: 'verification', owner,
      runbook: ['Inspect the retained deployment evidence', 'Record recovery evidence for human review'], pager: '' });
  }
  const changeKey = randomBytes(32).toString('hex');
  await json('/api/changes/sources', { id: 'agent-change-source', name: 'Agent retained deployment evidence', provider: 'native',
    service: 'agent-service', repository: '', mode: 'bearer', revision: 0, key: changeKey }, 201);
  await json('/api/changes/ingress/agent-change-source', { eventId: 'agent-deployment', summary: 'Retained coordination deployment observation',
    timestamp: new Date().toISOString(), author: 'Agent fixture release engineer', links: ['https://evidence.example.invalid/agent-deployment'],
    custom_details: { change: 'retained deployment observation' } }, 201, { Authorization: `Bearer ${changeKey}` });
  const start = new Date(Date.now() - 86400000).toISOString();
  await json('/api/paging/schedules', { id: 'agent-schedule', name: 'Agent coordination rota', service: 'agent-service', revision: 0,
    timezone: 'UTC', validFrom: start, validUntil: null,
    primary: { anchorLocal: start.slice(0, 16), periodDays: 1, members: [owner, members.responder.id], ambiguity: 'earlier' },
    backup: { anchorLocal: start.slice(0, 16), periodDays: 1, members: [members.admin.id], ambiguity: 'earlier' }, overrides: [] });
  const keys = Object.fromEntries(['/oncall-revoke', '/oncall-agent', '/oncall-retry'].map(path => [path, randomBytes(32).toString('hex')]));
  fixtures.set('https://8.8.8.8', { keys });
  // Separate real objects preserve the generic receiver when the first pair is
  // revoked by the narrowing journey. Neither setup action sends an event.
  for (const [name, path] of [['Agent revocation fixture', '/oncall-revoke'], ['Agent conformance receiver', '/oncall-agent'], ['Agent retry fixture', '/oncall-retry']]) {
    const client = await json('/api/automation/clients', { name, key: randomBytes(32).toString('hex'),
      services: ['agent-service'], permissions: ['incidents:read'] }, 201);
    await json('/api/automation/endpoints', { name, client: client.id, services: ['agent-service'],
      url: `https://8.8.8.8${path}`, key: keys[path], approve: true }, 201);
  }
  return bootstrap;
}
