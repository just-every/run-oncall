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
