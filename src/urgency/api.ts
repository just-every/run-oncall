import {selectWorkspaceIds} from '../workspace-selection';
import { fail, type State } from '../family/response-operations/domain.ts';
import { changeAlertUrgency, draftFields, exact, publishedUrgency, publishUrgency } from './model.ts';
import { evaluateUrgency, validateUrgencyRule } from './rules.ts';

type Dependencies = {
  body: (c: any) => Promise<unknown>;
  state: (c: any, admin?: boolean) => Promise<State>;
  save: (db: D1Database, state: State, revision: number, guard: {sql: string; values: (string | number | null)[]}) => Promise<void>;
  guard: (c: any) => {sql: string; values: (string | number | null)[]};
};
export function installUrgency(api: any, deps: Dependencies) {
  api.post('/api/urgency/services/:id', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c, true), revision = state.revision;
    const rule = publishUrgency(state, c.get('actor'), c.req.param('id'), input, new Date().toISOString());
    await deps.save(c.env.DB, state, revision, deps.guard(c));
    return c.json(rule, 201);
  });
  api.post('/api/urgency/alerts/:id', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c), revision = state.revision;
    await selectWorkspaceIds(c.env.DB,state,'alerts',[c.req.param('id')]);
    const result = changeAlertUrgency(state, c.get('actor'), c.req.param('id'), input, new Date().toISOString());
    if (result.changed) await deps.save(c.env.DB, state, revision, deps.guard(c));
    return c.json(result.alert);
  });
  api.post('/api/urgency/preview', async (c: any) => {
    const input = exact(await deps.body(c), ['service', 'severity', 'at'], ['rule']), state = await deps.state(c);
    const service = state.services.find(s => s.id === input.service);
    if (!service) fail('Unknown service', 404);
    const at = new Date().toISOString();
    const rule = input.rule === undefined ? publishedUrgency(service) : validateUrgencyRule({
      ...exact(input.rule, draftFields), version: (publishedUrgency(service)?.version ?? 0) + 1, by: c.get('actor').id, at,
    });
    return c.json({decision: evaluateUrgency(rule, input.severity, input.at as string)});
  });
}
