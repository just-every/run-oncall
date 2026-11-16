// Local-only Worker entry. vite.config.ts loads it only for `vite dev`; the
// deployed main stays src/server.ts, and `rer build` refuses any output that
// contains the dev layer. It adds dev sign-in, personas and Base's Dev/Demo label.
import worker from './server'
import { withDevIdentity } from './modules/operator-auth/dev/index.mjs'
import { authConfig, clearWorkspaceSession, runtimeBindings, type Bindings } from './auth.server'
import { devPersonas } from './dev-personas'

const linkStyle = 'main a{color:var(--rer-link,#1d2a35);font-weight:600;text-underline-offset:3px}main a:focus-visible{outline:2px solid var(--rer-focus,#1d2a35);outline-offset:2px}'
const dev = withDevIdentity<Bindings, typeof worker>(worker, { bindings: runtimeBindings, config: authConfig, personas: devPersonas })
export default {
 ...dev,
 async fetch(request:Parameters<typeof dev.fetch>[0],env:Bindings,execution:ExecutionContext) {
  let response = await dev.fetch(request,env,execution)
  if (request.method === 'GET' && new URL(request.url).pathname === '/__dev/key' && response.headers.get('content-type')?.includes('text/html') && await env.DB.prepare('SELECT 1 FROM credentials LIMIT 1').first()) {
   // The gate page's CSP admits only hashed inline styles, so the teammate link's style is hashed too.
   const hash = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(linkStyle)))))
   const headers = new Headers(response.headers)
   headers.set('content-security-policy', (headers.get('content-security-policy') ?? '').replace(/style-src /, `style-src 'sha256-${hash}' `))
   response = new HTMLRewriter().on('head', { element(head) { head.append(`<style>${linkStyle}</style>`, { html: true }) } }).on('main', { element(main) {
    main.append('<p>Joining this workspace as a teammate? <a href="/signin/local">Sign in with a workspace password</a> supplied by your administrator.</p>', { html: true })
   } }).transform(new Response(response.body, { status: response.status, headers }))
  }
  // Only a successful explicit identity switch retires a workspace cookie.
  // API requests must still reject sessions revoked by restore or logout.
  if(request.method === 'GET' && new URL(request.url).pathname === '/auth/dev/enter' && response.status === 303)
   response = clearWorkspaceSession(response, request)
  return response
 },
}
