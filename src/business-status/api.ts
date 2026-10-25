import { auditKind,setAuditSubject } from '../audit-store.ts';
import { businessCommand, statusView } from './model.ts';
export function installBusinessStatus(api: any, deps: any) {
  api.get('/api/status', async (c: any) => c.json({services: statusView(await deps.state(c), c.get('actor'))}));
  api.post('/api/status', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c), revision = state.revision;
    const result = businessCommand(state, c.get('actor'), input);
    if(['email-list-add','email-list-subscription'].includes(input.action)){auditKind(c.env.DB,'business.'+input.action);setAuditSubject(c.env.DB,'email-list',input.action==='email-list-add'?result.emailLists!.at(-1)!.id:input.list);}else setAuditSubject(c.env.DB, 'entity', result.id);
    await deps.save(c.env.DB, state, revision, deps.guard(c));
    return c.json({services: statusView(state, c.get('actor'))});
  });
}
