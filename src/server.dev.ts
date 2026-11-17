import { installationDocument } from './brand/installation';
// Local-only Worker entry. vite.config.ts loads it only for `vite dev`; the
// deployed main stays src/server.ts, and `rer build` refuses any output that
// contains the dev layer. Keep its guarded owner entry and personas.
import worker from './server'
import { withDevIdentity } from './modules/operator-auth/dev/index.mjs'
import { authConfig, clearWorkspaceSession, runtimeBindings, type Bindings } from './auth.server'
import { devPersonas } from './dev-personas'

const linkStyle = 'a{color:var(--rer-link,var(--rer-text,#17212e));text-underline-offset:3px}a:focus-visible{outline:3px solid var(--rer-focus,#17212e);outline-offset:3px}'
const dev = withDevIdentity<Bindings, typeof worker>(worker, { bindings: runtimeBindings, config: authConfig, personas: devPersonas })
export default {
 ...dev,
 async fetch(request:Parameters<typeof dev.fetch>[0],env:Bindings,execution:ExecutionContext) {
  let response = await dev.fetch(request,env,execution)
  if (request.method === 'GET' && new URL(request.url).pathname === '/__dev/key' && response.headers.get('content-type')?.includes('text/html') && await env.DB.prepare('SELECT 1 FROM credentials LIMIT 1').first()) {
   // The gate page's own style has no link rule and its CSP admits only hashed styles: add this one hashed rule so the link reads as the brand's.
   const hash = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(linkStyle)))))
   const headers = new Headers(response.headers)
   headers.set('content-security-policy', (headers.get('content-security-policy') ?? '').replace(/style-src ([^;]*)/, (_, sources) => `style-src ${sources} 'sha256-${hash}'`))
   response = new HTMLRewriter().on('head', { element(head) { head.append(`<style>${linkStyle}</style>`, { html: true }) } })
    .on('main', { element(main) {
    main.append('<p>Joining this workspace as a teammate? <a href="/signin/local">Sign in with a workspace password</a> supplied by your administrator.</p>', { html: true })
   } }).transform(new Response(response.body, { status: response.status, statusText: response.statusText, headers }))
  }
  // Only a successful explicit identity switch retires a workspace cookie.
  // API requests must still reject sessions revoked by restore or logout.
  if(request.method === 'GET' && new URL(request.url).pathname === '/auth/dev/enter' && response.status === 303)
   response = clearWorkspaceSession(response, request)
  if (env.RER_DEMO !== '1' && response.headers.get('content-type')?.startsWith('text/html')) {
   // The local wrapper adds its suffix after the seed renders. Keep this
   // installation's name on ordinary pages, including client navigation.
   const html = (await response.text()).replace(/<style data-rer-label="Dev">[\s\S]*?<\/style><script>[\s\S]*?<\/script>/g, '')
   const headers = new Headers(response.headers); headers.delete('content-length')
   response = await installationDocument(new Response(html, {status: response.status, statusText: response.statusText, headers}), runtimeBindings(env), new URL(request.url).pathname)
  }
  return response
 },
}
