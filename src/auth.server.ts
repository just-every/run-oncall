import { firstRunResponse } from './base/setup'
import { admitted } from './base/setup-state'
import { fontHead } from './brand/font-head'
import { brandDocumentResponse } from './brand/document-response'
import { themeFrame } from './base/theme-frame'
import { createOperatorAuth, createAuthHandler, createSignInHandler, devGate, devNotFound, isLoopbackHost, type AuthConfig } from './modules/operator-auth/index.mjs'
import { operatorMail } from './mail.server.mjs'
import { createD1DevelopmentOutbox, createDevelopmentOutboxHandler } from './modules/mail/src/development/index.mjs'
import branding from './branding.json'

// The edition's declared theme (public/rer-theme.css), as Base frames link it.
const theme = { href: '/rer-theme.css', productName: branding.name, accentColor: branding.primaryColor }

export interface Bindings {
 LOCAL_ONLY: string
 DB: D1Database
 AUTH_ORIGIN: string
 AUTH_LOCAL?: string
 RER_DEV_ORIGIN?: string
 /** Local runtimes only: the checkout's key gate and dev identity switch. Deploy refuses both. */
 RER_DEV_KEY?: string
 RER_DEV_IDENTITY?: string
 RER_INSTALLATION_ID?: string
 RER_MANAGEMENT_ORIGIN?: string
 OWNER_EMAIL: string
 SESSION_SECRET: string
 SETUP_TOKEN?: string
 MAIL_PROVIDER?: 'development' | 'resend' | 'sendgrid' | 'cloudflare'
 MAIL_FROM?: string
 MAIL_API_KEY?: string
 MAIL_ACCOUNT_ID?: string
 /** Hosted deploys: built files and the deploy identity the deploy kit binds. */
 ASSETS?: Fetcher
 RER_DEPLOY_SOURCE?: string
 RER_DEPLOY_FINGERPRINT?: string
 RER_VERSION?: { id: string }
}

export const runtimeBindings = (env: Bindings): Bindings => env.RER_DEV_ORIGIN && env.AUTH_LOCAL === 'true' ? { ...env, AUTH_ORIGIN: env.RER_DEV_ORIGIN } : env
export const authConfig = (env: Bindings): AuthConfig => ({ origin: env.AUTH_ORIGIN, local: env.AUTH_LOCAL === 'true', OWNER_EMAIL: env.OWNER_EMAIL, SESSION_SECRET: env.SESSION_SECRET, SETUP_TOKEN: env.SETUP_TOKEN, MAIL_FROM: env.MAIL_FROM, branding: { productName: branding.name, accentColor: branding.primaryColor, signInPath: '/signin', theme: theme.href } })
export function operatorAuth(env: Bindings) {
 return createOperatorAuth({ db: env.DB, config: authConfig(env), mailSender: operatorMail(env), clientIp: request => request.headers.get('CF-Connecting-IP') ?? '' })
}

export function clearWorkspaceSession(response: Response): Response {
 const headers = new Headers(response.headers)
 headers.append('set-cookie', 'oncall_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
 return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

const privateHeaders = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex, nofollow' }
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
async function html(body: string) {
 const frame = await themeFrame(theme)
 return new Response(`<!doctype html><html lang="en"${frame.htmlClass}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(branding.name)}</title>${fontHead}${frame.head}</head><body><main>${frame.brand}${body}</main></body></html>`, { headers: { ...privateHeaders, 'content-type': 'text/html; charset=utf-8', 'content-security-policy': `default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; ${frame.policy}` } })
}

export async function authResponse(request: Request, original: Bindings): Promise<Response | null> {
 const env = runtimeBindings(original), url = new URL(request.url)
 if (url.pathname === '/signin' || url.pathname === '/signin/local') {
  if (!admitted(request, env.AUTH_ORIGIN)) return new Response('Not found', { status: 404, headers: privateHeaders })
  // Workspace passwords and restore mapping use the loopback-only API. Hosted
  // compatibility links serve the same native sign-in document at this alias.
  if (url.pathname === '/signin/local' && !isLoopbackHost(url.hostname)) {
   if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { ...privateHeaders, allow: 'GET, HEAD' } })
   url.pathname = '/signin'
   request = new Request(url, request)
  }
 }
 // The outbox and key exchange answer only a local runtime holding RER_DEV_KEY;
 // the outbox also needs the key gate's cookie (or the rer harness's header).
 if (url.pathname === '/__dev/outbox' || url.pathname === '/__dev/key') {
  const gate = env.MAIL_PROVIDER === 'development' ? devGate({ key: env.RER_DEV_KEY, origin: env.AUTH_ORIGIN, local: env.AUTH_LOCAL === 'true' }) : null
  if (!gate) return devNotFound()
  if (url.pathname === '/__dev/key') return await gate.exchange(request) ?? devNotFound()
  if (!await gate.admits(request)) {
   if (!admitted(request, env.AUTH_ORIGIN) || !['GET', 'HEAD'].includes(request.method)) return devNotFound()
   const page = await html('<h1>Open the local development outbox</h1><p>This browser needs the private link from the terminal running this checkout. Messages stay protected until you open it.</p><ol><li>In this checkout, run <code>rer dev --as signed-out</code>.</li><li>Open the <code>RER_OPEN</code> link it prints in this same browser.</li><li>Return to sign-in and choose <strong>Open the local development outbox</strong>.</li></ol><p>No external email is sent. Keep the terminal link private.</p><p><a href="/signin">Return to sign-in</a></p>')
   return new Response(request.method === 'HEAD' ? null : page.body, { status: 404, headers: page.headers })
  }
  return await createDevelopmentOutboxHandler({ local: true, origin: env.AUTH_ORIGIN, outbox: createD1DevelopmentOutbox({ db: env.DB }) })(request) ?? devNotFound()
 }
 // The shared server-rendered sign-in page: plain forms that work before any script.
 if (url.pathname === '/signin') {
  const page = await createSignInHandler(operatorAuth(env), {
   defaultReturnTo: '/setup',
   links: async () => [
    // Held installations keep their workspace name-and-password accounts; their door is /signin/local.
    ...(isLoopbackHost(url.hostname) && await env.DB.prepare('SELECT 1 FROM credentials LIMIT 1').first() ? [{ href: '/signin/local', label: 'Sign in with a workspace password' }] : []),
    ...(env.MAIL_PROVIDER === 'development' && env.AUTH_LOCAL === 'true' ? [{ href: '/__dev/outbox', label: 'Open the local development outbox' }] : []),
   ],
  })(request)
  if (page) return brandDocumentResponse(page)
 }
 if (url.pathname.startsWith('/auth/')) {
  let response = await createAuthHandler(operatorAuth(env))(request)
  // Only an explicit, successful new sign-in replaces the held workspace
  // cookie. Ordinary requests must still reject rotated/revoked sessions.
  // Confirmation issues a native cookie on success; failed confirmations do not.
  if (url.pathname === '/auth/confirm' && request.method === 'POST' && response?.status === 303 && response.headers.has('set-cookie')) {
   response = clearWorkspaceSession(response)
  }
  return brandDocumentResponse(response)
 }
 if (url.pathname === '/setup' || url.pathname === '/app' || url.pathname.startsWith('/app/')) {
  const setup = await firstRunResponse(request, env, operatorAuth(env), { theme })
  if (setup) return brandDocumentResponse(setup)
 }
 if (url.pathname === '/app') return new Response(null,{status:303,headers:{location:'/'}})
 return null
}
