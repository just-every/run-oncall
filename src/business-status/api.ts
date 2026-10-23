import { setAuditSubject } from '../audit-store.ts';
import { businessCommand, statusView } from './model.ts';
export function installBusinessStatus(api: any, deps: any) {
  api.get('/api/status', async (c: any) => c.json({services: statusView(await deps.state(c), c.get('actor'))}));
  api.post('/api/status', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c), revision = state.revision;
    const result = businessCommand(state, c.get('actor'), input);
    setAuditSubject(c.env.DB, 'entity', result.id);
    await deps.save(c.env.DB, state, revision, deps.guard(c));
    return c.json({services: statusView(state, c.get('actor'))});
  });
}
