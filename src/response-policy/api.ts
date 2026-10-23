import type { State } from '../family/response-operations/domain.ts';
import { publishResponsePolicy } from './model.ts';

type Dependencies = {
  body: (c: any) => Promise<unknown>;
  state: (c: any, admin?: boolean) => Promise<State>;
  save: (db: D1Database, state: State, revision: number, guard: {sql: string; values: (string | number | null)[]}) => Promise<void>;
  guard: (c: any) => {sql: string; values: (string | number | null)[]};
};
export function installResponsePolicy(api: any, deps: Dependencies) {
  api.post('/api/response/services/:id', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c, true), revision = state.revision;
    const policy = publishResponsePolicy(state, c.get('actor'), c.req.param('id'), input, new Date().toISOString());
    await deps.save(c.env.DB, state, revision, deps.guard(c));
    return c.json(policy, 201);
  });
}
