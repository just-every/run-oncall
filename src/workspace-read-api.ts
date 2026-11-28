import { createApi } from './api-boundary';
import { readOnCall, readWorkspace } from './workspace-read';

export function installWorkspaceReads(api: ReturnType<typeof createApi>) {
  api.get('/api/workspace', async c => c.json(await readWorkspace(c.env, c.req.raw)));
  api.get('/api/on-call', async c => c.json(await readOnCall(c.env, c.req.raw, c.req.query('at'))));
}

export const workspaceReadApi = createApi();
installWorkspaceReads(workspaceReadApi);
