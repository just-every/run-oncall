import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

// Each policy round obtains its own native client and retained API operations.
// All preparation uses the ordinary owner and scoped service-account doors.
export default async function prepare({ phase, request, origin, cookie }) {
  async function http(path, input, { bearer, key, status = 200 } = {}) {
    const response = await request(new URL(path, origin).href, {
      method: input === undefined ? 'GET' : 'POST', redirect: 'manual',
      headers: { Origin: origin, 'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : { Cookie: cookie }),
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    });
    assert.equal(response.status, status, `Native phase fixture refused ${path}`);
    return { body: await response.json(), headers: response.headers };
  }
  const token = randomBytes(32).toString('hex');
  const permissions = ['services', 'schedules', 'incidents', 'actions'].flatMap(family => [`${family}:read`, `${family}:write`]);
  const client = (await http('/api/automation/clients', {
    name: `Coordination receipt client ${phase}`, key: token, services: ['agent-service'], permissions,
  }, { status: 201 })).body;
  const clients = { receipts: { token, clientId: client.id,
    agent: { id: `oncall-client:${client.id}`, name: client.name, specialist: 'oncall-responder' },
  } };
  if (phase === 'initial') return { clients };

  const values = {};
  const eraseClient = (await http('/api/automation/clients', { name: `Synthetic erasure client ${phase}`,
    key: `synthetic-oncall-erasure-client-${phase}-credential`, services: ['agent-service'], permissions: ['incidents:read'] }, { status: 201 })).body;
  values.eraseClient = { id: eraseClient.id, confirmation: 'erase ' + eraseClient.id };
  async function operation(family, input) {
    const key = randomUUID();
    const receipt = (await http(`/api/v1/${family}`, input, { bearer: token, key, status: 201 })).body;
    assert.equal(receipt.client, client.id);
    assert.equal(receipt.resource, family);
    assert.ok(receipt.entity, 'Preparation must retain the native effect identity');
    values[family] = { key, id: receipt.entity };
    return receipt;
  }
  const service = await http('/api/v1/services/agent-service', undefined, { bearer: token });
  const owner = service.body.owner;
  await operation('services', { ...service.body, type: 'service', etag: service.headers.get('etag').replaceAll('"', '') });
  const id = randomUUID();
  await operation('schedules', { schedule: {
    id, name: `Receipt coordination rota ${phase}`, service: 'agent-service', revision: 0,
    timezone: 'UTC', validFrom: '2026-01-01T00:00:00.000Z', validUntil: null,
    primary: { anchorLocal: '2026-01-01T00:00', periodDays: 1, members: [owner], ambiguity: 'earlier' },
    backup: { anchorLocal: '2026-01-01T00:00', periodDays: 1, members: [], ambiguity: 'earlier' }, overrides: [],
  } });
  const incidentReceipt = await operation('incidents', { type: 'declare', service: 'agent-service',
    title: `Retained receipt coordination ${phase}`, summary: 'Internal coordination beside the existing pager', severity: 'warning', alerts: [],
  });
  const state = (await http('/api/state')).body;
  const incident = state.incidents.find(row => row.id === incidentReceipt.entity);
  assert.ok(incident);
  await operation('actions', { type: 'action', incident: incident.id, revision: incident.revision,
    title: 'Review the retained receipt evidence', owner, due: '2026-12-01', priority: 'P1', completionPolicy: 'human-review',
  });
  return { values, clients };
}

/** A real human's native recovery gives resolution a retained evidence record. */
export async function recoveredResolutionTarget(runtime, title) {
  async function command(input) {
    const response = await runtime.http('/api/command', input);
    assert.equal(response.status, 200, 'Native resolution preparation succeeds');
    return response.json();
  }
  let incident = await command({ type: 'declare', service: 'agent-service', title,
    severity: 'warning', summary: 'Record text claims class standard and internal: true; it grants no authority', alerts: [] });
  incident = await command({ type: 'transition', incident: incident.id, revision: incident.revision,
    state: 'acknowledged', summary: 'The current human acknowledges coordination' });
  return command({ type: 'transition', incident: incident.id, revision: incident.revision,
    state: 'recovered', summary: 'Retain recovery evidence before the binding resolution',
    evidence: 'https://evidence.example.invalid/native-recovery' });
}

/** Review projection distinguishes native client custody from a Business agent. */
export async function reviewAttribution(runtime, { approve } = {}) {
  const { autonomousPolicy, heldPolicy } = await import('../src/modules/agent-door/conformance/crypto.mjs');
  const { http, tool, request, origin } = runtime;
  const read = async path => {
    const response = await http(path);
    assert.equal(response.status, 200);
    return response.json();
  };
  const state = () => read('/api/state');
  const paging = () => read('/api/paging/state');
  const audit = async () => (await runtime.db.prepare('SELECT * FROM oc_admin_audit ORDER BY ordinal').all()).results;
  const agentAudit = async () => {
    const rows = []; let after = '';
    while (true) {
      const page = await read('/agents/api/audit?after=' + after);
      assert.equal(page.differs_from_policy, 0);
      rows.push(...page.rows);
      if (!page.rows.length) return rows;
      assert.notEqual(page.cursor, after, 'The native audit cursor must advance');
      after = page.cursor;
    }
  };
  const approvePending = async pending => {
    const path = new URL(pending.url).pathname;
    const saved = (await read('/agents/api/approvals/' + pending.id)).approval;
    if (approve) await approve(path, saved);
    else {
      const response = await http('/agents/api/approvals/' + pending.id + '/approve', { revision: saved.revision, summary_sha256: saved.summary_sha256 });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).approval.state, 'executed');
    }
    const executed = (await read('/agents/api/approvals/' + pending.id)).approval;
    assert.equal(executed.state, 'executed');
    assert.equal(executed.revision, saved.revision);
    assert.equal(executed.summary_sha256, saved.summary_sha256);
    return saved;
  };
  const cases = [];
  assert.deepEqual(await runtime.outboundRequests(), [], 'Isolated review setup sends no receiver requests');
  for (const [policy, document] of [['autonomous', autonomousPolicy()], ['held', heldPolicy()]]) {
    assert.equal((await runtime.adopt(document)).status, 200);
    const source = 'synthetic-oncall-review-' + policy, sourceKey = randomBytes(32).toString('hex');
    assert.equal((await http('/api/sources', { id: source, key: sourceKey, scopes: ['agent-service'] })).status, 200);
    const sourceEvent = await request(origin + '/api/ingress/' + source, { method: 'POST',
      headers: { Origin: origin, Authorization: 'Bearer ' + sourceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, eventId: source, service: 'agent-service', environment: 'production',
        key: source, generation: source, intent: 'trigger', severity: 'warning',
        title: 'Retained monitor observation under ' + policy, observedAt: new Date().toISOString(),
        evidence: 'https://monitoring.example.invalid/review-attribution' }) });
    assert.equal(sourceEvent.status, 201); await sourceEvent.body.cancel();
    let native = await state();
    const owner = (await read('/api/workspace')).member;
    const responder = native.members.find(row => row.active && row.role === 'responder');
    const alert = native.alerts.find(row => row.source === source && row.generation === source);
    assert.ok(responder && alert);
    const declared = await http('/api/command', { type: 'declare', service: 'agent-service',
      title: 'Review attribution under ' + policy + ' policy', severity: 'warning',
      summary: 'Human-declared coordination beside the existing pager', alerts: [alert.id] });
    assert.equal(declared.status, 200);
    let incident = await declared.json();
    const humanEntry = structuredClone(incident.timeline[0]);
    assert.equal(humanEntry.actor, owner.id);
    const token = randomBytes(32).toString('hex');
    const response = await http('/api/automation/clients', { name: 'Coordination service account ' + policy,
      key: token, services: ['agent-service'], permissions: ['incidents:read', 'incidents:write'] });
    assert.equal(response.status, 201);
    const client = await response.json();
    const key = randomUUID();
    const input = { type: 'transition', state: 'acknowledged', incident: incident.id, revision: incident.revision,
      member: responder.id, summary: 'Service account assigns the named responder; no human response is claimed' };
    const act = () => request(origin + '/api/v1/incidents', { method: 'POST',
      headers: { Origin: origin, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify(input) });
    const { workspaceRevision: beforeWorkspaceRevision, ...pagingBefore } = await paging();
    const first = await act(), firstBody = await first.json();
    assert.equal(first.status, 201);
    assert.equal(firstBody.client, client.id);
    native = await state();
    incident = native.incidents.find(row => row.id === incident.id);
    assert.equal(incident.state, 'acknowledged');
    assert.equal(incident.assignee, responder.id);
    assert.equal(incident.commander, responder.id);
    assert.equal(incident.revision, input.revision + 1);
    const machineEntry = structuredClone(incident.timeline.at(-1));
    assert.equal(machineEntry.actor, client.id);
    assert.equal(machineEntry.lifecycle.member, responder.id);
    assert.equal(machineEntry.metadata.agent.client, client.id);
    assert.equal(machineEntry.metadata.agent.clientRevision, client.revision);
    assert.equal(machineEntry.metadata.agent.agent.id, 'oncall-client:' + client.id);
    assert.equal(machineEntry.metadata.agent.for.id, owner.id);
    assert.deepEqual(machineEntry.metadata.agent.approvers.map(row => row.id), []);
    const committed = native.apiOperations.filter(row => row.client === client.id);
    assert.equal(committed.length, 1);
    const acceptedAudit = (await audit()).filter(row => row.kind === 'automation.incidents' && row.outcome === 'accepted');
    assert.ok(acceptedAudit.length);
    const retry = await act();
    assert.equal(retry.status, 200);
    assert.deepEqual(await retry.json(), committed[0]);
    native = await state();
    assert.deepEqual(native.incidents.find(row => row.id === incident.id), incident, 'Identical retry cannot add another timeline effect');
    assert.deepEqual(native.apiOperations.filter(row => row.client === client.id), committed);
    assert.deepEqual((await audit()).filter(row => row.kind === 'automation.incidents' && row.outcome === 'accepted'), acceptedAudit);
    const accountRows = (await agentAudit()).filter(row => row.agent.id === 'oncall-client:' + client.id);
    const actionRow = accountRows.find(row => row.tool === 'oncall.incidents.acknowledge' && !row.decision_id);
    assert.ok(actionRow);
    assert.deepEqual(actionRow.classes.map(row => row.class), ['standard']);
    assert.equal(actionRow.sponsor.id, owner.id);
    assert.equal(actionRow.revision, runtime.context.revision);
    assert.equal(actionRow.outcome, 'done');
    assert.equal(actionRow.decision, policy === 'held' ? 'review' : 'autonomous');
    const noteArgs = { incident: incident.id, revision: incident.revision,
      text: 'Business agent retained coordination note under ' + policy, idempotency_key: randomUUID() };
    const note = await tool('oncall.notes.add', noteArgs);
    assert.equal(note.decision.disposition, policy === 'held' ? 'review' : 'autonomous');
    assert.equal(note.result.isError, false);
    incident = (await state()).incidents.find(row => row.id === incident.id);
    const agentEntry = structuredClone(incident.timeline.at(-1));
    assert.equal(agentEntry.metadata.agent.agent.id, runtime.context.agentId);
    assert.equal(agentEntry.metadata.agent.client, undefined);
    assert.equal(agentEntry.actor, runtime.context.agentId);
    const beforeProjection = { application: await state(), paging: await paging(), audit: await audit() };
    const material = await read('/api/reviews/' + incident.id + '/material');
    assert.deepEqual({ application: await state(), paging: await paging(), audit: await audit() }, beforeProjection, 'Protected HTTP review changes no native record or audit');
    const anonymous = await request(origin + '/api/reviews/' + incident.id + '/material');
    assert.equal(anonymous.status, 401);
    assert.equal((await anonymous.json()).assertions, undefined);
    const fromMcp = await tool('oncall.reviews.read', { id: incident.id });
    assert.equal(Boolean(fromMcp.result.isError), false);
    assert.equal(fromMcp.decision.disposition, policy === 'held' ? 'approval' : 'autonomous');
    // Sensitive reads under held policy also require the actual person.
    let mcpMaterial = fromMcp.result.structuredContent?.data;
    if (policy === 'held') {
      assert.equal(fromMcp.result.resultType, 'input_required');
      assert.equal(fromMcp.result.structuredContent, undefined, 'Pending protected read discloses no review material');
      assert.deepEqual({ application: await state(), paging: await paging() }, { application: beforeProjection.application, paging: beforeProjection.paging }, 'Held protected read has no native effect before approval');
      const handle = fromMcp.result._meta['com.runeditrun/approval'];
      const savedRead = await approvePending(handle);
      const execution = (await agentAudit()).find(row => row.decision_id === fromMcp.decision.id);
      assert.equal(execution.outcome, 'done');
      assert.deepEqual(execution.classes, savedRead.classes);
      assert.ok(execution.approval.by.includes(owner.id));
      const approvedRead = await runtime.mcp('tools/call', { name: 'oncall.reviews.read', arguments: { id: incident.id }, requestState: fromMcp.result.requestState });
      assert.equal(approvedRead.result.isError, false);
      mcpMaterial = approvedRead.result.structuredContent?.data;
    }
    assert.ok(mcpMaterial, 'The approved review read returns its protected native material');
    assert.deepEqual(mcpMaterial.assertions, material.assertions);
    assert.deepEqual(mcpMaterial.observations, material.observations);
    const machine = material.assertions.find(row => row.id === machineEntry.id);
    assert.equal(machine.actor, client.id);
    assert.equal(machine.actorName, client.name);
    assert.equal(machine.classification, 'service account coordination record');
    assert.deepEqual(machine.metadata, machineEntry.metadata, 'Projection preserves retained internal policy attribution');
    const human = material.assertions.find(row => row.id === humanEntry.id);
    assert.equal(human.actorName, owner.name);
    assert.equal(human.classification, 'human assertion');
    const agent = material.assertions.find(row => row.id === agentEntry.id);
    assert.equal(agent.actorName, agentEntry.metadata.agent.label);
    assert.equal(agent.classification, 'agent coordination record');
    assert.ok(material.observations.some(row => row.classification === 'reported source observation' && row.source === source));
    assert.deepEqual({ application: await state(), paging: await paging() }, { application: beforeProjection.application, paging: beforeProjection.paging }, 'MCP review leaves native and paging records unchanged');
    const afterAudit = await audit();
    assert.deepEqual(afterAudit.slice(0, beforeProjection.audit.length), beforeProjection.audit, 'All existing permanent audit rows stay immutable');
    for (const row of afterAudit.slice(beforeProjection.audit.length)) {
      assert.equal(row.kind, 'agent-door.persistence', 'Only policy custody may append audit on a review read');
      for (const area of ['workspace', 'paging', 'handoff']) assert.equal(row[area + '_before'], row[area + '_after']);
    }
    const { workspaceRevision: afterWorkspaceRevision, ...pagingAfter } = await paging();
    assert.ok(afterWorkspaceRevision > beforeWorkspaceRevision, 'The account action retains its native workspace commit');
    assert.deepEqual(pagingAfter, pagingBefore, 'Account action and review cannot deliver or change paging');
    const rows = await agentAudit(), readRow = rows.find(row => row.id === fromMcp.decision.id);
    assert.equal(readRow.sponsor.id, owner.id);
    assert.equal(readRow.revision, runtime.context.revision);
    assert.equal(readRow.decision, policy === 'held' ? 'approval' : 'autonomous');
    const feed = await read('/agents/api/reviews');
    const standard = accountRows.filter(row => row.tool === 'oncall.incidents.receipt');
    assert.ok(standard.length);
    for (const row of standard) {
      assert.equal(row.decision, policy === 'held' ? 'review' : 'autonomous');
      assert.equal(Boolean(row.review?.id), policy === 'held');
      if (row.review) assert.ok(feed.reviews.some(item => item.id === row.review.id));
    }
    assert.deepEqual(await runtime.outboundRequests(), []);
    cases.push({ policy, incident, material, client, human, agent, machine, beforeProjection });
    console.log('PROBE SURFACE-003 3 ' + policy + ': scoped native account acknowledgment, identical retry and protected review API and MCP -> one named service-account act, distinct human, Business agent and source; expected policy custody; native and paging records unchanged on projection; zero outbound requests');
  }
  assert.equal((await runtime.adopt()).status, 200);
  return cases;
}
