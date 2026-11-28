import type { createApi } from './api-boundary';
import { fail, type Role, type State } from './family/response-operations/domain';
import { triagePage, triageQuery, type SavedView } from './family/response-operations/triage';

export function installTriageReads(api: ReturnType<typeof createApi>, authorizedState: (c: any) => Promise<State>) {
  api.get('/api/triage', async (c: any) => {
    const state = await authorizedState(c);
    return c.json(triagePage(state, c.get('actor'), triageQuery(c.req.query()), c.req.query('cursor'), Number(c.req.query('limit') ?? 25)));
  });
  api.get('/api/triage/views', async c => {
    const {results} = await c.env.DB.prepare(`SELECT json_extract(m.data,'$.role') AS role,t.data AS saved_view
      FROM oc_members m LEFT JOIN oc_triage t
        ON json_extract(t.data,'$.kind')='view' AND json_extract(t.data,'$.actor')=m.id
        AND json_extract(m.data,'$.role') IS NOT 'stakeholder'
      WHERE m.id=? AND json_extract(m.data,'$.active')=1
      ORDER BY t.ordinal,t.rowid`).bind(c.get('actor').id).all<{role: Role; saved_view: string | null}>();
    const member = results[0];
    if (!member) fail('Access revoked', 401);
    if (member.role === 'stakeholder') fail('Stakeholders may only access internal status and approved updates', 403);
    return c.json({views: results.flatMap(row => row.saved_view === null ? [] : [JSON.parse(row.saved_view) as SavedView])});
  });
}
