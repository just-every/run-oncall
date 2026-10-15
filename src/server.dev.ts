// Local-only Worker entry. vite.config.ts loads it only for `vite dev`; the
// deployed main stays src/server.ts, and `rer build` refuses any output that
// contains the dev layer. It adds dev sign-in, personas and the dev badge.
import worker from './server'
import { withDevIdentity } from './modules/operator-auth/dev/index.mjs'
import { authConfig, clearWorkspaceSession, runtimeBindings, type Bindings } from './auth.server'
import { devPersonas } from './dev-personas'
import { workspaceBadge } from './dev-badge'

const dev = withDevIdentity<Bindings, typeof worker>(worker, { bindings: runtimeBindings, config: authConfig, personas: devPersonas })
export default {
 ...dev,
 async fetch(request:Parameters<typeof dev.fetch>[0],env:Bindings,execution:ExecutionContext) {
  let response = await dev.fetch(request,env,execution)
  // Only a successful explicit identity switch retires a workspace cookie.
  // API requests must still reject sessions revoked by restore or logout.
  if(request.method === 'GET' && new URL(request.url).pathname === '/auth/dev/enter' && response.status === 303)
   response = clearWorkspaceSession(response, request)
  return workspaceBadge(response,request,env,execution)
 },
}
