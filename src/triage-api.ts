import { auditKind, auditOutcome } from './audit-store'
import { authority, command, fail, Fault, text, type Member, type State } from './family/response-operations/domain';
import { matchingIncidents, triagePage, triageQuery, type BulkOperation, type BulkResult, type SavedView } from './family/response-operations/triage';

export function memberWorkspace(state: State, actor: Member): State {
  if(actor.role!=='admin'){const {emailSamples,emailAddresses,emailRules,emailReceipts,emailQuarantine,...visible}=state;state=visible;}
  if (!state.triage) return state;
  return {...state, triage: state.triage.filter(r => r.kind !== 'view' || r.actor === actor.id)};
}

type Dependencies = {
  body: (c: any, max?: number) => Promise<any>;
  state: (c: any) => Promise<State>;
  save: (c: any, state: State, revision: number) => Promise<void>;
  saveItem: (c: any, state: State, revision: number, operationId: string, incidentId?: string) => Promise<void>;
};
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');

export function installTriage(api: any, deps: Dependencies) {
  api.get('/api/triage', async (c: any) => {
    const state = await deps.state(c);
    return c.json(triagePage(state, c.get('actor'), triageQuery(c.req.query()), c.req.query('cursor'), Number(c.req.query('limit') ?? 25)));
  });
  api.get('/api/triage/views', async (c: any) => {
    const state = await deps.state(c);
    return c.json({views: (state.triage ?? []).filter(r => r.kind === 'view' && r.actor === c.get('actor').id)});
  });
  api.post('/api/triage/views', async (c: any) => {
    const input = await deps.body(c);
    const state = await deps.state(c), revision = state.revision, actor: Member = c.get('actor');
    // Personal list preferences do not confer incident-write authority.
    const records = state.triage ??= [];
    if (input.remove) {
      const index = records.findIndex(r => r.id === input.remove && r.kind === 'view' && r.actor === actor.id);
      if (index < 0) fail('Saved view not found', 404);
      records.splice(index, 1);
    } else {
      if (records.filter(r => r.kind === 'view' && r.actor === actor.id).length >= 20) fail('Maximum 20 saved views per person', 429);
      const view: SavedView = {id: crypto.randomUUID(), kind: 'view', actor: actor.id, name: text(input.name, 'View name', 100), query: triageQuery(input.query ?? {})};
      records.push(view);
    }
    await deps.save(c, state, revision);
    return c.json({views: records.filter(r => r.kind === 'view' && r.actor === actor.id)});
  });
  api.post('/api/triage/bulk', async (c: any) => {
    const input = await deps.body(c, 256 * 1024);
    const id = text(input.operationId, 'Operation ID', 100);
    if (!['acknowledge', 'resolve', 'reassign', 'set-priority', 'set-urgency'].includes(input.action)) fail('Unsupported bulk action');
    auditKind(c.env.DB, `triage.${input.action}`);
    if (!Array.isArray(input.items) || !input.items.length || input.items.length > (input.allMatching ? 1000 : 500)) fail('Choose 1–500 incidents, or confirm up to 1,000 matching incidents');
    const items = input.items.map((i: any) => ({id: text(i?.id, 'Incident ID', 100), revision: i?.revision}));
    if (new Set(items.map((i: any) => i.id)).size !== items.length || items.some((i: any) => !Number.isSafeInteger(i.revision) || i.revision < 1)) fail('Each selected incident needs one revision');
    const payload = {action: input.action, items, reason: input.reason ?? '', evidence: input.evidence ?? '', member: input.member || null, priority: input.priority ?? null, urgency: input.urgency ?? null, allMatching: input.allMatching ? triageQuery(input.query ?? {}) : null, confirmedCount: input.confirmedCount ?? null};
    const fingerprint = await digest(JSON.stringify(payload));
    const actor: Member = c.get('actor');
    let initial = await deps.state(c);
    let operation = (initial.triage ?? []).find(r => r.id === id);
    if (operation && (operation.kind !== 'bulk' || operation.actor !== actor.id || operation.fingerprint !== fingerprint)) fail('Operation ID conflicts with different content or actor', 409);
    if (initial.members.find(m => m.id === actor.id)?.role === 'viewer') {
      auditOutcome(c.env.DB,'refused');
      const committed = operation?.kind === 'bulk' ? operation.results : [];
      return c.json({operationId: id, results: items.map((i: any) => committed.find(r => r.id === i.id) ?? {id: i.id, ok: false, error: 'Insufficient role'}), remaining: operation ? items.length - committed.length : 0, interrupted: true});
    }
    authority(initial, actor);
    if (!operation) {
      if (input.allMatching) {
        const all = matchingIncidents(initial, actor, payload.allMatching!);
        if (input.workspaceRevision !== initial.revision || input.confirmedCount !== all.length || items.length !== all.length || all.some(i => !items.some((item: any) => item.id === i.id && item.revision === i.revision))) fail('Matching incidents changed. Confirm the current count and selection.', 409);
      }
      operation = {id, kind: 'bulk', actor: actor.id, fingerprint, at: new Date().toISOString(), results: []};
      (initial.triage ??= []).push(operation);
      await deps.save(c, initial, initial.revision);
    }
    const completed = new Map((operation as BulkOperation).results.map(r => [r.id, r]));
    const results: BulkResult[] = [...completed.values()];
    let interrupted = false;
    // Bound each invocation, including the first reservation, below D1 Free's
    // query budget. Continuations keep the exact request identity and revisions.
    for (const item of items.filter((i: any) => !completed.has(i.id)).slice(0, 2)) {
      let state: State | undefined, result: BulkResult;
      try {
        state = await deps.state(c);
        authority(state, actor);
        const receipt = state.triage?.find(r => r.id === id && r.kind === 'bulk') as BulkOperation | undefined;
        if (!receipt || receipt.fingerprint !== fingerprint || receipt.actor !== actor.id) fail('Bulk operation was replaced; reload before continuing', 409);
        const old = receipt.results.find(r => r.id === item.id);
        if (old) { completed.set(item.id, old); results.push(old); continue; }
        const revision = state.revision;
        // Domain mutation can fail after changing its working copy. Keep failures
        // separate from the state whose receipt is committed.
        const proposed = structuredClone(state);
        try {
          const changed = command(proposed, actor, {type: input.action === 'acknowledge' ? 'bulk-acknowledge' : input.action === 'resolve' ? 'bulk-resolve' : input.action,
            incident: item.id, revision: item.revision, operationId: id, reason: payload.reason, evidence: payload.evidence, member: payload.member, priority: payload.priority, urgency: payload.urgency}) as any;
          result = {id: item.id, ok: true, revision: changed.revision};
          (proposed.triage!.find(r => r.id === id) as BulkOperation).results.push(result);
          await deps.saveItem(c, proposed, revision, id, item.id);
          completed.set(item.id, result);
        } catch (error) {
          if (!(error instanceof Fault) || error.status >= 500) throw error;
          result = {id: item.id, ok: false, error: error.message};
          receipt.results.push(result);
          await deps.saveItem(c, state, revision, id);
          completed.set(item.id, result);
        }
      } catch (error) {
        auditOutcome(c.env.DB,error instanceof Fault && error.status < 500 ? 'refused' : 'uncertain');
        interrupted = true;
        result = {id: item.id, ok: false, error: error instanceof Fault ? error.message : 'Storage failure; outcome unconfirmed. Replay this operation to inspect committed results.'};
      }
      results.push(result);
      if (interrupted) break;
    }
    const byId = new Map(results.map(r => [r.id, r]));
    return c.json({operationId: id, results: items.flatMap((item: any) => byId.has(item.id) ? [byId.get(item.id)] : []), remaining: items.length - completed.size, interrupted});
  });
}
