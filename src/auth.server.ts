import { auditIdentity } from './audit-store'
import { createOwnerClaimHandler } from './modules/owner-claim/index.mjs'
import { firstRunResponse } from './base/setup'
import { admitted } from './base/setup-state'
import { brandDocumentResponse } from './brand/document-response'
import { createOperatorAuth, createAuthHandler, createSignInHandler, devGate, devNotFound, isLoopbackHost, normalizeEmail, type AuthConfig } from './modules/operator-auth/index.mjs'
import { operatorMail } from './mail.server.mjs'
import branding from './branding.json'
import { sessionCookieLine } from './session-cookie'
import { importSettingsResponse, importSettingsRow, readImportSettings } from './move-in/door-settings'
import type { OwnerClaimConfig } from './modules/owner-claim/index.mjs'
import { rejectedResponse } from './base/rejected-response'

// The edition's declared theme (public/rer-theme.css), as Base frames link it.
const theme = { href: '/rer-theme.css', productName: branding.name, accentColor: branding.primaryColor }

export interface Bindings {
 RER_DEMO?: string
 RER_OWNER_CLAIM_PUBLIC_KEYS?: string
 RER_OWNER_CLAIM_ISSUER?: string
 RER_OWNER_CLAIM_INSTALLATION_ID?: string
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
 MAIL_PROVIDER?: 'development' | 'rer' | 'resend' | 'sendgrid' | 'cloudflare'
 MAIL_RELAY_URL?: string
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
export const authConfig = (env: Bindings): AuthConfig => ({ origin: env.AUTH_ORIGIN, local: env.AUTH_LOCAL === 'true', OWNER_EMAIL: env.OWNER_EMAIL, SESSION_SECRET: env.SESSION_SECRET, SETUP_TOKEN: env.SETUP_TOKEN, MAIL_FROM: env.MAIL_FROM ?? (env.RER_DEMO === '1' ? 'oncall@northline.example' : undefined), branding: { productName: branding.name, accentColor: branding.primaryColor, signInPath: '/signin', theme: theme.href } })
export function operatorAuth(env: Bindings) {
 return createOperatorAuth({ db: env.DB, config: authConfig(env), mailSender: operatorMail(env), clientIp: request => request.headers.get('CF-Connecting-IP') ?? '' })
}

export function ownerClaimConfig(env:Bindings):OwnerClaimConfig|null {
 if(!env.RER_OWNER_CLAIM_PUBLIC_KEYS)return null
 return {issuer:env.RER_OWNER_CLAIM_ISSUER??'',installationId:env.RER_OWNER_CLAIM_INSTALLATION_ID??'',
  appOrigin:env.AUTH_ORIGIN,expectedEmail:env.OWNER_EMAIL,publicKeys:JSON.parse(env.RER_OWNER_CLAIM_PUBLIC_KEYS)}
}

export function clearWorkspaceSession(response: Response, request: Request): Response {
 const headers = new Headers(response.headers)
 headers.append('set-cookie', sessionCookieLine(request, '', 0))
 return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

const privateHeaders = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex, nofollow' }
export async function authResponse(request: Request, original: Bindings): Promise<Response | null> {
 const env = runtimeBindings(original), url = new URL(request.url)
 const claim=ownerClaimConfig(env)
 if (claim) {
  const signed = await createOwnerClaimHandler({ db: env.DB, authConfig: authConfig(env),
   clientIp: req => req.headers.get('CF-Connecting-IP') ?? '', ...claim })(request)
  if (signed) return signed
 }
 if (url.pathname === '/signin' || url.pathname === '/signin/local') {
  if (!admitted(request, env.AUTH_ORIGIN)) return new Response('Not found', { status: 404, headers: privateHeaders })
 }
 // Keep rer's private local owner-entry key exchange independent of mail.
 if (url.pathname === '/__dev/key') {
  const gate = devGate({ key: env.RER_DEV_KEY, origin: env.AUTH_ORIGIN, local: env.AUTH_LOCAL === 'true' })
  return await gate?.exchange(request) ?? devNotFound()
 }
 // The shared server-rendered sign-in page: plain forms that work before any script.
 if (url.pathname === '/signin') {
  const page = await createSignInHandler(operatorAuth(env), {
   defaultReturnTo: '/setup',
   links: async () => [
    ...(isLoopbackHost(url.hostname) ? [{ href: '/docs/install#sign-in-emails-on-your-computer', label: 'Local owner entry and sign-in email settings' }] : []),
    // Workspace members use installation-local credentials on local and hosted apps.
    ...(await env.DB.prepare('SELECT 1 FROM credentials LIMIT 1').first() ? [{ href: '/signin/local', label: 'Sign in with a workspace password' }] : []),
   ],
  })(request)
  if (page) {
   let hint = ''
   try { hint = normalizeEmail(url.searchParams.get('login_hint')) } catch { /* Invalid hints leave the field empty. */ }
   const document = hint && request.method === 'GET'
    ? new HTMLRewriter().on('#signin-email', { element(input) { input.setAttribute('value', hint) } }).transform(page)
    : page
   return brandDocumentResponse(document)
  }
 }
 if (url.pathname.startsWith('/auth/')) {
  const actor=await operatorAuth(env).getSession(request)
  if(actor) {
   const mapped=await env.DB.prepare('SELECT member_id FROM operator_members WHERE operator_id=?').bind(actor.operator.id).first<{member_id:string}>()
   auditIdentity(env.DB,{actor:{kind:'member',id:mapped?.member_id??actor.operator.id}})
  }
  const settings=await importSettingsResponse(request,env)
  if(settings)return rejectedResponse(request,settings)
  let response = await createAuthHandler(operatorAuth(env))(request)
  if(url.pathname==='/auth/settings/identity'&&request.method==='GET'&&response?.ok&&response.headers.get('content-type')?.includes('text/html')) {
   const row=importSettingsRow(await readImportSettings(env))
   response=new HTMLRewriter().on('.secondary-link',{element(element){element.before(row,{html:true})}}).transform(response)
  }
  // Only an explicit, successful new sign-in replaces the held workspace
  // cookie. Ordinary requests must still reject rotated/revoked sessions.
  // Confirmation issues a native cookie on success; failed confirmations do not.
  if (url.pathname === '/auth/confirm' && request.method === 'POST' && response?.status === 303 && response.headers.has('set-cookie')) {
   response = clearWorkspaceSession(response, request)
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
