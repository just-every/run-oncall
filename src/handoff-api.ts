import { requireHandoffErasureFence, requireNewSubjectIdentity } from './subject-erasure-identity.ts'
import { fail, Fault, type Member } from './family/response-operations/domain';
import {
  sourceSnapshot, prepareHandoff, reviewHandoff, withdrawHandoff, handoffEligibility,
  exportHandoff, validateHandoffArchive, holdHandoffsForRecovery,
  type HandoffArchive, type HandoffRecord,
} from './family/response-operations/handoffs';
import { handoffSnapshot, commitHandoffs, type HandoffSnapshot } from './handoff-store';

function exact(input: any, required: string[], optional: string[] = []) {
  const allowed = [...required, ...optional];
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(input, key)))
    fail('Missing or unknown handoff request fields');
  return input;
}
function currentActor(snapshot: HandoffSnapshot, id: string, permission: 'read' | 'respond' | 'admin'): Member {
  const member = snapshot.workspace.members.find(member => member.id === id && member.active);
  if (!member) fail('Access revoked', 401);
  if ((permission === 'respond' && !['admin','responder'].includes(member.role)) ||
      (permission === 'admin' && member.role !== 'admin')) fail('Insufficient current role', 403);
  return member;
}
function recordIn(snapshot: HandoffSnapshot, id: string): HandoffRecord {
  const record = snapshot.archive.records.find(record => record.id === id);
  if (!record) fail('Unknown handoff', 404);
  return record;
}
const metadata = (snapshot: HandoffSnapshot) => ({ mode: 'local-only', delivery: 'unsent',
  revision: snapshot.revision, workspaceRevision: snapshot.workspace.revision });
async function contextFor(snapshot: HandoffSnapshot, id: string) {
  const result = await sourceSnapshot(snapshot.workspace, id);
  return { ...metadata(snapshot), incident: result.source.incident.id,
    incidentRevision: result.source.incident.revision, ...result };
}
async function availableContext(snapshot: HandoffSnapshot, id: string) {
  try { return await contextFor(snapshot, id); }
  catch (error) {
    if (error instanceof Fault && [400, 409].includes(error.status)) return null;
    throw error;
  }
}
async function recordView(snapshot: HandoffSnapshot, record: HandoffRecord) {
  const eligibility = await handoffEligibility(snapshot.workspace, record);
  const incident = snapshot.workspace.incidents.find(incident => incident.id === record.source.incident.id);
  const service = incident && snapshot.workspace.services.find(service => service.id === incident.service);
  const context = incident && service ? await availableContext(snapshot, incident.id) : null;
  return { ...metadata(snapshot), record, eligibility, context };
}

/** Mounted only after the root's session and same-origin middleware. No send route. */
export function installHandoffs(api: any, body: (c: any, max?: number) => Promise<any>) {
  const authority = (c: any) => ({ digest: c.get('sessionDigest'), member: c.get('actor').id });
  async function context(c: any, permission: 'read' | 'respond' | 'admin' = 'read') {
    const snapshot = await handoffSnapshot(c.env.DB);
    return { snapshot, actor: currentActor(snapshot, c.get('actor').id, permission) };
  }
  api.get('/api/handoffs', async (c: any) => {
    const { snapshot } = await context(c);
    const eligibility = await Promise.all(snapshot.archive.records.map(async record =>
      ({ id: record.id, ...await handoffEligibility(snapshot.workspace, record) })));
    const contexts = await Promise.all(snapshot.workspace.incidents.map(async incident =>
      await availableContext(snapshot, incident.id) ?? { ...metadata(snapshot), incident: incident.id,
        incidentRevision: incident.revision, unavailable: true, diagnostics: ['source-unavailable'] }));
    return c.json({ ...metadata(snapshot), records: snapshot.archive.records, eligibility, contexts });
  });
  api.get('/api/handoffs/context/:incident', async (c: any) => {
    const { snapshot } = await context(c);
    return c.json(await contextFor(snapshot, c.req.param('incident')));
  });
  // Register the fixed archive path before the record parameter route.
  api.get('/api/handoffs/archive', async (c: any) => {
    const { snapshot } = await context(c, 'admin');
    c.header('Content-Disposition', 'attachment; filename="oncall-reviewed-handoffs.json"');
    return c.json(snapshot.archive);
  });
  api.post('/api/handoffs/restore', async (c: any) => {
    const { snapshot } = await context(c, 'admin');
    const input = exact(await body(c, 1024 * 1024 + 64), ['mode', 'archive']);
    if (input.mode !== 'replace') fail('Explicit handoff replacement required');
    const archive = await validateHandoffArchive(input.archive);
    await requireHandoffErasureFence(snapshot.workspace, archive);
    const held = await holdHandoffsForRecovery(archive, Date.now(), crypto.randomUUID(),
      'Handoff archive restore; explicit review required');
    await commitHandoffs(c.env.DB, snapshot, held, authority(c));
    return c.json(held);
  });
  api.post('/api/handoffs/prepare', async (c: any) => {
    const { snapshot, actor } = await context(c, 'respond');
    const input = exact(await body(c), ['id', 'incident', 'incidentRevision', 'serviceHash', 'payload'], ['supersedes']);
    await requireNewSubjectIdentity(snapshot.workspace,'handoff',input.id)
    const existing = snapshot.archive.records.find(record => record.id === input.id);
    const prior = input.supersedes ? snapshot.archive.records.find(record => record.id === input.supersedes) : undefined;
    const record = await prepareHandoff(snapshot.workspace, actor, input, Date.now(), existing, prior);
    if (existing) return c.json(await recordView(snapshot, record));
    const archive: HandoffArchive = { ...snapshot.archive, records: [...snapshot.archive.records, record] };
    const revision = await commitHandoffs(c.env.DB, snapshot, archive, authority(c));
    return c.json(await recordView({ ...snapshot, revision, archive }, record), 201);
  });
  for (const action of ['review', 'withdraw'] as const) api.post(`/api/handoffs/:id/${action}`, async (c: any) => {
    const { snapshot, actor } = await context(c, 'respond');
    const input = exact(await body(c), ['actionId', 'revision', 'payloadHash', 'sourceHash', 'reason']);
    const previous = recordIn(snapshot, c.req.param('id'));
    const record = await (action === 'review' ? reviewHandoff : withdrawHandoff)(snapshot.workspace, actor, previous, input, Date.now());
    if (record.revision === previous.revision) return c.json(await recordView(snapshot, record));
    const archive: HandoffArchive = { ...snapshot.archive,
      records: snapshot.archive.records.map(existing => existing.id === record.id ? record : existing) };
    const revision = await commitHandoffs(c.env.DB, snapshot, archive, authority(c));
    return c.json(await recordView({ ...snapshot, revision, archive }, record));
  });
  api.get('/api/handoffs/:id/export', async (c: any) => {
    const { snapshot, actor } = await context(c);
    const record = recordIn(snapshot, c.req.param('id'));
    const eligibility = await handoffEligibility(snapshot.workspace, record);
    if (!eligibility.eligible) fail(`Handoff is not currently eligible: ${eligibility.diagnostics.join('; ')}`, 409);
    const packet = await exportHandoff(snapshot.workspace, actor, record);
    c.header('Content-Disposition', 'attachment; filename="oncall-reviewed-handoff.json"');
    return c.json(packet);
  });
  api.get('/api/handoffs/:id', async (c: any) => {
    const { snapshot } = await context(c);
    return c.json(await recordView(snapshot, recordIn(snapshot, c.req.param('id'))));
  });
}
