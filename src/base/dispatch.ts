import { compatiblePath } from '../intake/paths';
// Hono owns declared HTTP surfaces; Start owns documents and server functions.
// Keep Worker event handlers and named exports in the edition's server entry.
export function isHonoRequest(pathname: string): boolean {
  return compatiblePath(pathname) || pathname === '/v2/change/enqueue' || pathname === '/health' || pathname === '/api' || pathname.startsWith('/api/')
}

export function dispatch(
  request: Request,
  hono: () => Response | Promise<Response>,
  start: () => Response | Promise<Response>,
): Response | Promise<Response> {
  return isHonoRequest(new URL(request.url).pathname) ? hono() : start()
}
