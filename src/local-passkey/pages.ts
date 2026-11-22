import script from './client.js?raw'
import { operatorAuth, type Bindings } from '../auth.server'
import { brandDocumentResponse } from '../brand/document-response'
import { escapeHtml, securityHeaders } from '../modules/operator-auth/http.mjs'
import { pageResponse } from '../modules/operator-auth/page.mjs'
import { safeReturnTo } from '../modules/operator-auth/policy.mjs'
import { localhost } from './door'
import { PasskeyStore } from './store'

function control(operation: 'enroll' | 'signin', returnTo = '/on-call') {
 return `<button type="button" disabled data-passkey="${operation}" data-return-to="${escapeHtml(returnTo)}">${operation === 'enroll' ? 'Enroll passkey' : 'Sign in with a passkey'}</button><p id="passkey-status" role="status"></p><noscript><p>Turn on JavaScript to use your passkey.</p></noscript>`
}

async function scripted(response: Response) {
 const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(script)))
 const headers = new Headers(response.headers)
 const hash = `'sha256-${btoa(String.fromCharCode(...digest))}'`
 const policy = headers.get('Content-Security-Policy') ?? ''
 const scripts = /(^|;\s*)script-src [^;]+/
 headers.set('Content-Security-Policy', (scripts.test(policy)
  ? policy.replace(scripts, directive => `${directive} ${hash}`)
  : `${policy}; script-src ${hash}`) + "; connect-src 'self'")
 headers.delete('Content-Length')
 return new HTMLRewriter().on('body', { element(element) {
  element.append(`<script>${script}</script>`, { html: true })
 } }).transform(new Response(response.body, { status: response.status, headers }))
}

export async function passkeySignIn(request: Request, env: Bindings) {
 const store = new PasskeyStore(env.DB), owner = await store.owner()
 if (!owner || !await store.credential(owner.id)) return null
 const returnTo = safeReturnTo(new URL(request.url).searchParams.get('returnTo'), '/on-call')
 const auth = operatorAuth(env)
 if (await auth.getSession(request)) return new Response(null, { status: 303, headers: { ...securityHeaders(), Location: returnTo } })
 const teammates = await env.DB.prepare('SELECT 1 FROM credentials LIMIT 1').first()
 const document = await pageResponse({
  branding: auth.presentation, heading: 'Sign in', method: request.method, referrer: 'strict-origin',
  content: '<p>Use the passkey you enrolled for this local Oncall installation.</p>'
   + control('signin', returnTo)
   + (teammates ? '<p class="secondary-link"><a href="/signin/local">Sign in with a workspace password</a></p>' : '')
   + '<p class="secondary-link"><a href="/__dev/key">Use a private link from rer dev</a></p>',
 })
 return brandDocumentResponse(request.method === 'HEAD' ? document : await scripted(document))
}

export async function passkeySettings(request: Request, response: Response, env: Bindings) {
 const store = new PasskeyStore(env.DB), owner = await store.owner()
 if (!owner || (await operatorAuth(env).getSession(request))?.operator.id !== owner.id) return response
 const enrolled = await store.credential(owner.id)
 const content = '<h2>Local passkey</h2>' + (!localhost(env.AUTH_ORIGIN)
  ? '<p>Start this checkout on localhost to use a passkey. <a href="/docs/getting-started#sign-in-with-a-local-passkey">See the steps</a>.</p>'
  : enrolled
   ? '<p role="status">Passkey enrolled. You can use it the next time you sign in on localhost.</p>'
   : '<p>Use your device or security key to sign in to this local installation without email.</p>' + control('enroll'))
 const settings = new HTMLRewriter().on('main h1', { element(heading) {
  heading.after(`<section>${content}</section>`, { html: true })
 } }).transform(response)
 return !enrolled && localhost(env.AUTH_ORIGIN) ? scripted(settings) : settings
}
