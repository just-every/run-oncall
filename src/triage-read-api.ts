import type { createApi } from './api-boundary';
import type { State } from './family/response-operations/domain';
import { triagePage, triageQuery } from './family/response-operations/triage';

export function installTriageReads(api: ReturnType<typeof createApi>, authorizedState: (c: any) => Promise<State>) {
  api.get('/api/triage', async (c: any) => {
    const state = await authorizedState(c);
    return c.json(triagePage(state, c.get('actor'), triageQuery(c.req.query()), c.req.query('cursor'), Number(c.req.query('limit') ?? 25)));
  });
  api.get('/api/triage/views', async (c: any) => {
    const state = await authorizedState(c);
    return c.json({views: (state.triage ?? []).filter(r => r.kind === 'view' && r.actor === c.get('actor').id)});
  });}
