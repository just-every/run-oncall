import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

const errorCode = answer => answer.result?._meta?.['com.runeditrun/error']?.code ?? answer.body?.error?.data?.code ?? answer.message?.error?.data?.code;

// Specialist completion through the emitted Worker and real MCP tool wrapper.
export default async function journey({ request, origin, cookie, fixtures, tool }) {
  async function http(path, input, expected = 200, session = cookie, headers = {}) {
    const response = await request(new URL(path, origin).href, {
      method: input === undefined ? 'GET' : 'POST', redirect: 'manual',
      headers: { Origin: origin, Cookie: session, 'Content-Type': 'application/json', ...headers },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    });
    assert.equal(response.status, expected, `Native journey HTTP refused ${path}`);
    const body = await response.json();
    return { body, cookie: response.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ') };
  }
  const state = async () => (await http('/api/state')).body;
  async function call(name, args, mutation = false) {
    const answer = await tool(`oncall.${name}`, { ...args, ...(mutation ? { idempotency_key: randomUUID() } : {}) });
    assert.equal(answer.status, 200, `Native specialist tool failed: ${name}`);
    assert.equal(Boolean(answer.result?.isError), false, `Native specialist tool refused: ${name}`);
    assert.notEqual(answer.result?.structuredContent, undefined, `Native specialist tool omitted its result: ${name}`);
    return answer.result.structuredContent;
  }
  let current = await state();
  const owner = (await http('/api/workspace')).body.member;
  const responder = current.members.find(member => member.role === 'responder' && member.active);
  assert.ok(owner?.role === 'admin' && responder, 'Native owner and active responder fixtures must exist');
  const services = await call('services.read', { id: 'agent-service' });
  assert.equal(services.data[0]?.id, 'agent-service');
  const generation=services.data[0].alertGenerations.find(row=>row.generation==='agent-monitor-generation');
  assert.ok(generation,'Read the actual monitoring generation before declaring');
  const changes = await call('changes.read', { service: 'agent-service', at: new Date().toISOString(), hours: 24 });
  assert.equal(changes.data.service, 'agent-service');
  const schedules = await call('schedules.read', { id: 'agent-schedule' });
  let schedule = schedules.schedules.find(row => row.id === 'agent-schedule');
  assert.ok(schedule, 'Native rota fixture must be discoverable');
  const from = Date.now(), to = from + 3600000;
  const covered = await call('schedules.coverage', { id: schedule.id, from, to });
  assert.equal(covered.paging, 'OFF');
  assert.ok(covered.coverage.length, 'Native coverage must contain a resolved interval');

  // This specialist phase provisions its own receiver. Earlier generic effects
  // remain behind the same typed dispatch policy.
  const receiver = (await http('/api/automation/clients', { name: 'Agent fixture receiver', key: randomBytes(32).toString('hex'),
    services: ['agent-service'], permissions: ['incidents:read'] }, 201)).body;
  const receiverKey = randomBytes(32).toString('hex');
  fixtures.set('https://8.8.8.8', { key: receiverKey });
  const endpoint = (await http('/api/automation/endpoints', { name: 'Agent fixture receiver', client: receiver.id,
    services: ['agent-service'], url: 'https://8.8.8.8/oncall-agent', key: receiverKey, approve: true }, 201)).body;

  current = await state();
  let incident = await call('incidents.declare', { service: 'agent-service', revision: current.revision,
    title: 'Payment authorization failures after deployment', summary: 'Investigate retained service evidence; paging remains off', severity: 'warning', alerts: [generation.id] }, true);
  incident = await call('incidents.acknowledge', { incident: incident.id, revision: incident.revision,
    member: responder.id, summary: 'Agent records responsibility for the named active responder' }, true);
  assert.equal(incident.commander, responder.id);
  assert.equal(incident.state, 'acknowledged');
  const staleRevision = incident.revision;
  incident = await call('notes.add', { incident: incident.id, revision: incident.revision,
    text: 'Retained deployment evidence is a source observation, not a recovery attestation.' }, true);
  const beforeStale = await state();
  const stale = await tool('oncall.notes.add', { incident: incident.id, revision: staleRevision, text: 'Stale write must not publish', idempotency_key: randomUUID() });
  assert.equal(errorCode(stale), 'revision_conflict');
  const afterStale = await state();
  assert.equal(afterStale.revision, beforeStale.revision);
  assert.deepEqual(afterStale.incidents.find(row => row.id === incident.id), beforeStale.incidents.find(row => row.id === incident.id));
  incident = await call('actions.create', { incident: incident.id, revision: incident.revision, title: 'Human review of deployment evidence',
    owner: responder.id, due: new Date(Date.now() + 86400000).toISOString().slice(0, 10), priority: 'P1', completionPolicy: 'human-review' }, true);
  const action = incident.actions.at(-1);
  assert.ok(action?.id, 'Native follow-up must retain its identity');
  incident = await call('actions.submit', { incident: incident.id, revision: incident.revision, action: action.id,
    evidence: 'https://evidence.example.invalid/agent-review' }, true);
  const submitted = incident.actions.find(row => row.id === action.id);
  assert.equal(submitted.done, false);
  assert.ok(submitted.submission && !submitted.accepted, 'Machine submission must await native human acceptance');
  const beforeAccept = await state();
  const forbidden = await tool('oncall.actions.accept', { incident: incident.id, action: action.id, revision: incident.revision, idempotency_key: randomUUID() });
  assert.equal(forbidden.status, 400);
  assert.equal(forbidden.body?.error?.code, -32602, 'Machine acceptance is absent from the tool registry');
  const afterAccept = await state();
  assert.equal(afterAccept.revision, beforeAccept.revision);
  assert.deepEqual(afterAccept.incidents.find(row => row.id === incident.id), beforeAccept.incidents.find(row => row.id === incident.id));
  const review = await call('reviews.read', { id: incident.id });
  assert.equal(review.data.incident, incident.id);
  assert.equal(review.data.followups.find(row => row.id === action.id).done, false);
  const monitorKey=randomBytes(32).toString('hex');
  await http('/api/sources',{id:'agent-monitor',key:monitorKey,scopes:['agent-service']});
  await http('/api/ingress/agent-monitor',{source:'agent-monitor',eventId:'payment-errors-recovered-'+randomUUID(),service:'agent-service',environment:'production',key:'payment-authorizations',generation:'agent-monitor-generation',intent:'recover',severity:'warning',title:'Payment authorization error rate recovered',observedAt:new Date().toISOString(),evidence:'https://monitoring.example.invalid/payment-authorizations/recovery'},201,'',{Authorization:'Bearer '+monitorKey});
  const recovered=await call('reviews.read',{id:incident.id});
  assert.ok(recovered.data.observations.some(row=>row.intent==='recover'&&row.classification==='reported source observation'));
  assert.equal((await state()).incidents.find(row=>row.id===incident.id).state,'acknowledged','Source recovery is not incident resolution or human acceptance');

  const proposal = { ...schedule, name: 'Agent reviewed coordination rota' };
  const reviewed = await call('schedules.review', { id: schedule.id, revision: schedule.revision, schedule: proposal, from, to });
  assert.ok(reviewed.digest, 'Native schedule review must produce the exact proposal digest');
  const updated = await call('schedules.update', { id: schedule.id, revision: schedule.revision, schedule: proposal, from, to, digest: reviewed.digest }, true);
  assert.equal(updated.schedule.name, proposal.name);
  schedule = updated.schedule;
  const start = new Date(Date.now() + 60000).toISOString(), end = new Date(Date.now() + 3660000).toISOString();
  const override = { id: randomUUID(), role: 'primary', start, end, member: responder.id };
  const overridden = await call('schedules.override', { id: schedule.id, revision: schedule.revision, override }, true);
  assert.ok(overridden.schedule.overrides.some(row => row.id === override.id && row.member === responder.id));
  const observed = (await http(`/api/schedules/${schedule.id}/now-next?at=${encodeURIComponent(start)}`)).body;
  assert.equal(observed.now.primary, responder.id);

  const pending = (await state()).apiOutbox.find(row => row.incident === incident.id && row.endpoint === endpoint.id && row.status === 'queued');
  assert.ok(pending, 'Explicitly approved receiver must have a queued native event');
  await call('automation.dispatch', { id: pending.id, revision: pending.revision }, true);
  const delivered = (await state()).apiOutbox.find(row => row.id === pending.id);
  assert.equal(delivered.status, 'sent');
  assert.equal(delivered.history.at(-1).reason, 'accepted');
  const automation = await call('automation.read', {});
  assert.equal(automation.data.outbox.find(row => row.id === delivered.id).status, 'sent');

  // A separate real administrator sponsors a local client. The owner's native
  // session can demote that administrator without losing its own authority.
  const password = randomBytes(32).toString('hex');
  const sponsor = (await http('/api/members', { name: `Agent client sponsor ${randomUUID()}`, role: 'admin', password }, 201)).body;
  const sponsorSession = await http('/api/login', { name: sponsor.name, password });
  const localKey = randomBytes(32).toString('hex');
  const local = (await http('/api/automation/clients', { name: 'Agent scoped client', key: localKey,
    services: ['agent-service'], permissions: ['services:read', 'incidents:read'] }, 201, sponsorSession.cookie)).body;
  const authorization = { Authorization: `Bearer ${localKey}` };
  assert.equal((await http('/api/v1/services/agent-service', undefined, 200, '', authorization)).body.id, 'agent-service');
  await http('/api/v1/services/agent-foreign-service', undefined, 404, '', authorization);
  async function resource(uri) {
    const response = await request(new URL('/mcp', origin).href, { method: 'POST',
      headers: { Origin: origin, ...authorization, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': 'resources/read', 'Mcp-Name': uri },
      body: JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method: 'resources/read', params: { uri, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' } } }),
    });
    return response.json();
  }
  assert.ok((await resource('oncall://services/agent-service')).result?.contents?.length);
  const hidden = await resource('oncall://services/agent-foreign-service');
  const absent = await resource('oncall://services/not-present');
  assert.equal(hidden.error.data.code, 'resource_unavailable');
  assert.equal(absent.error.data.code, hidden.error.data.code);
  assert.equal(hidden.result, undefined); assert.equal(absent.result, undefined);

  await http('/api/command', { type: 'member', id: sponsor.id, role: 'viewer', active: true });
  await http('/api/v1/services/agent-service', undefined, 401, '', authorization);
  assert.ok((await state()).apiClients.some(row => row.id === local.id), 'Revocation refusal must retain the native client history');
  fixtures.set('https://8.8.8.8', null);
}
