import {fail,type State} from '../domain.ts';
import {setAuditSubject} from '../../../audit-store.ts';
import {notificationRulesView,writeNotificationRules} from './rules.ts';
import {onCallNotifications} from './read.ts';
import {withPages} from '../../../sms-paging/run-pages.ts';

type Dependencies = {
  body: (c: any) => Promise<unknown>;
  state: (c: any, admin?: boolean) => Promise<State>;
  save: (db: D1Database, state: State, revision: number, guard: {sql: string; values: (string | number | null)[]}) => Promise<void>;
  guard: (c: any) => {sql: string; values: (string | number | null)[]};
};
/** recorded contacts, notification rules and on-call notification records, with the pages the SMS sender sent for each run. */
export function installOnCallNotifications(api: any, deps: Dependencies) {
  api.get('/api/members/:id/notification-rules', async (c: any) => {
    const state = await deps.state(c);
    if (!state.members.some(m => m.id === c.req.param('id') && !m.erased)) fail('Unknown member', 404);
    return c.json(notificationRulesView(state, c.req.param('id')));
  });
  api.post('/api/members/:id/notification-rules', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c), revision = state.revision;
    setAuditSubject(c.env.DB, 'member', c.req.param('id'));
    const result = writeNotificationRules(state, c.get('actor'), c.req.param('id'), input, new Date().toISOString());
    await deps.save(c.env.DB, state, revision, deps.guard(c));
    return c.json(result);
  });
  api.get('/api/on-call/notifications', async (c: any) => {
    const state = await deps.state(c);
    return c.json(await withPages(c.env.DB, c.env, onCallNotifications(state, {incident: c.req.query('incident'), alert: c.req.query('alert')})));
  });
}
