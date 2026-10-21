import { authenticate, require, throttle, type Caller } from './auth'
import { problem } from './errors'
import { installReads } from './read'
import { installWrites } from './write'
import type { ApiPermission } from '../types.ts'

type Handler = (c: any, caller: Caller) => Promise<unknown> | unknown
/** Documented in docs/api.md. Every route authenticates the token itself; a browser session cookie is never read here. */
export function installServiceApi(api: any) {
  const route = (permission: 'read' | ApiPermission | null, handler: Handler) => async (c: any): Promise<Response> => {
    try {
      c.header('X-Oncall-Api-Version', '1')
      const caller = await authenticate(c)
      await throttle(c, caller, c.req.method === 'GET' ? 'read' : 'write')
      if (permission) require(caller, permission)
      const result = await handler(c, caller)
      return result instanceof Response ? result : c.json(result)
    } catch (error) { return problem(c, error) }
  }
  installReads(route, api)
  installWrites(route, api)
  // Unknown versions and paths answer with the same explicit error shape instead of a session sign-in prompt.
  api.all('/api/v1/*', (c: any) => c.json({ error: { code: 'not_found', message: 'Unknown API route' } }, 404))
}
