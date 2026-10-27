import { auditIdentity, auditOutcome } from '../audit-store'
import { runtimeBindings, type Bindings } from '../auth.server'
import { openCredential, sealCredential, type Custody } from '../changes/credentials'
import { fail } from '../family/response-operations/domain'
import { adminSession } from './owner-door'
import type { Region } from './collect/bundle'

const tokenCookie = 'oncall_move_in_token', transactionCookie = 'oncall_move_in_consent'
const tokenCustody: Custody = { label: 'oncall-move-in-token-v1', unavailable: 'Finish installation setup before connecting PagerDuty.', unreadable: 'The PagerDuty connection expired. Connect again.' }
const transactionCustody = { ...tokenCustody, label: 'oncall-move-in-consent-v1' }
export const pagerdutyScopes = 'users.read schedules.read escalation_policies.read'
// PagerDuty documents separate US/EU identity endpoints; a region never supplies a host.
export const identityOrigin = (region: Region) => region === 'eu' ? 'https://identity.eu.pagerduty.com' : 'https://identity.pagerduty.com'
export const pagerdutyConnect = (env: Pick<Bindings, 'PAGERDUTY_OAUTH_CLIENT_ID' | 'PAGERDUTY_OAUTH_CLIENT_SECRET'>) => Boolean(env.PAGERDUTY_OAUTH_CLIENT_ID?.trim() && env.PAGERDUTY_OAUTH_CLIENT_SECRET?.trim())
const cookie = (name: string, value: string, origin: string, age = 600) => `${name}=${encodeURIComponent(value)}; Path=/api/move-in/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(origin).protocol === 'https:' ? '; Secure' : ''}`
const getCookie = (request: Request, name: string) => {
 try { return decodeURIComponent(request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1) ?? '') } catch { return '' }
}
export async function currentMoveInAdmin(c: any) {
 if (c.get('actor')?.role !== 'admin') fail('An administrator must read and review this account.', 403)
 const guard = adminSession(c.get('sessionDigest'), c.get('actor').id)
 const row = await c.env.DB.prepare(`SELECT CASE WHEN (${guard.sql}) THEN 1 ELSE 0 END AS ok`).bind(...guard.params!).first()
 if (!row?.ok) fail('Sign in again as an administrator.', 403)
}
// The callback has no app session on a cross-site return. Its sealed transaction
// names the member; current stored membership is checked before exchange and
// again in the token-custody write, so a demotion cannot publish a token.
const consentAdmin = (member: string) => ({
 sql: "EXISTS(SELECT 1 FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.role')='admin')",
 params: [member],
})
async function currentConsentAdmin(c: any, member: string) {
 const guard = consentAdmin(member)
 const row = await c.env.DB.prepare(`SELECT CASE WHEN (${guard.sql}) THEN 1 ELSE 0 END AS ok`).bind(...guard.params).first()
 if (!row?.ok) throw Error()
 auditIdentity(c.env.DB, { actor: { kind: 'member', id: member } })
}
export type ConsentToken = { id: string; token: string; region: Region; member: string; expires: number }
export async function consentToken(c: any): Promise<ConsentToken | null> {
 const value = getCookie(c.req.raw, tokenCookie)
 if (!value) return null
 let held: ConsentToken
 try { held = JSON.parse(await openCredential(value, runtimeBindings(c.env).SESSION_SECRET, tokenCustody)) } catch { return fail('The PagerDuty connection expired. Connect again.', 401) }
 const lease = await c.env.DB.prepare('SELECT id FROM oc_move_in_consent WHERE id=? AND expires>?').bind(held.id, Date.now()).first()
 if (!lease) fail('The PagerDuty connection expired. Connect again.', 401)
 if (held.member !== c.get('actor').id || !['us', 'eu'].includes(held.region) || typeof held.token !== 'string') fail('Connect PagerDuty again as this administrator.', 403)
 if (held.expires <= Date.now()) {
  await endConsent(c, held)
  fail('The PagerDuty connection expired. Connect again.', 401)
 }
 return held
}
export async function revokeConsent(env: Bindings, held: ConsentToken, request: typeof fetch = fetch) {
 try {
 const response = await request(new URL('/oauth/revoke', identityOrigin(held.region)), { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + btoa(env.PAGERDUTY_OAUTH_CLIENT_ID + ':' + env.PAGERDUTY_OAUTH_CLIENT_SECRET) }, body: new URLSearchParams({ token_type_hint: 'access_token', token: held.token }) })
 if (!response.ok) throw Error()
 } catch { auditOutcome(env.DB,'failed'); fail('PagerDuty could not close this connection. Revoke this app in PagerDuty before continuing.', 502) }
}
export async function endConsent(c: any, held: ConsentToken, request: typeof fetch = fetch) {
 c.header('Set-Cookie', cookie(tokenCookie, '', runtimeBindings(c.env).AUTH_ORIGIN, 0), { append: true })
 try { await revokeConsent(runtimeBindings(c.env), held, request); await c.env.DB.prepare('DELETE FROM oc_move_in_consent WHERE id=?').bind(held.id).run() }
 catch { fail('PagerDuty could not close this connection. Revoke this app in PagerDuty before continuing.', 502) }
}
export function installPagerdutyConsent(api: any) {
 api.get('/api/move-in/pagerduty/start', async (c: any) => {
  await currentMoveInAdmin(c)
  const env = runtimeBindings(c.env)
  if (!pagerdutyConnect(env)) fail('This install needs its PagerDuty app. Use a read-only key instead.', 409)
  const region: Region = c.req.query('region') === 'eu' ? 'eu' : 'us'
  const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('')
  const verifier = random(), state = random(), expires = Date.now() + 600000
  const challenge = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  const transaction = await sealCredential(JSON.stringify({ verifier, state, region, expires, member: c.get('actor').id }), env.SESSION_SECRET, transactionCustody)
  c.header('Set-Cookie', cookie(transactionCookie, transaction, env.AUTH_ORIGIN), { append: true })
  const url = new URL('/oauth/authorize', identityOrigin(region))
  url.search = new URLSearchParams({ client_id: env.PAGERDUTY_OAUTH_CLIENT_ID!, redirect_uri: new URL('/api/move-in/pagerduty/callback', env.AUTH_ORIGIN).href, response_type: 'code', scope: pagerdutyScopes, state, code_challenge: challenge, code_challenge_method: 'S256' }).toString()
  return c.redirect(url.href, 302)
 })
 api.get('/api/move-in/pagerduty/callback', async (c: any) => {
  const env = runtimeBindings(c.env), encoded = getCookie(c.req.raw, transactionCookie)
  c.header('Set-Cookie', cookie(transactionCookie, '', env.AUTH_ORIGIN, 0), { append: true })
  let issued: ConsentToken | null = null
  try {
   // Retire a previous lease before replacing it, including on a refused return.
   const prior = getCookie(c.req.raw, tokenCookie)
   if (prior) {
    const held = JSON.parse(await openCredential(prior, env.SESSION_SECRET, tokenCustody)) as ConsentToken
    const lease = await c.env.DB.prepare('SELECT id FROM oc_move_in_consent WHERE id=? AND custody=?').bind(held.id, prior).first()
    if (lease) await endConsent(c, held)
   }
   if (!pagerdutyConnect(env) || !encoded) throw Error()
   const transaction = JSON.parse(await openCredential(encoded, env.SESSION_SECRET, transactionCustody))
   if (typeof transaction.expires !== 'number' || transaction.expires <= Date.now() || typeof transaction.member !== 'string' || c.req.query('state') !== transaction.state || !['us', 'eu'].includes(transaction.region)) throw Error()
   await currentConsentAdmin(c, transaction.member)
   const code = c.req.query('code')
   if (!code || code.length > 4096 || c.req.query('error')) throw Error()
   const response = await fetch(new URL('/oauth/token', identityOrigin(transaction.region)), { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: env.PAGERDUTY_OAUTH_CLIENT_ID!, client_secret: env.PAGERDUTY_OAUTH_CLIENT_SECRET!, redirect_uri: new URL('/api/move-in/pagerduty/callback', env.AUTH_ORIGIN).href, code_verifier: transaction.verifier }) })
   if (!response.ok) throw Error()
   const reader = response.body?.getReader()
   if (!reader) throw Error()
   const chunks: Uint8Array[] = []; let size = 0
   try {
    while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > 16384) { await reader.cancel(); throw Error() } chunks.push(next.value) }
   } finally { reader.releaseLock() }
   const bytes = new Uint8Array(size); let offset = 0
   for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
   const result = JSON.parse(new TextDecoder().decode(bytes))
   if (typeof result.access_token !== 'string' || !result.access_token || result.access_token.length > 4096 || /\s/.test(result.access_token)) throw Error()
   const expires = Date.now() + Math.min(600, Number(result.expires_in) > 0 ? Number(result.expires_in) : 600) * 1000
   issued = { id: crypto.randomUUID(), token: result.access_token, region: transaction.region, member: transaction.member, expires }
   const scopes: string[] = typeof result.scope === 'string' ? result.scope.split(' ') : []
   if (result.token_type?.toLowerCase() !== 'bearer' || !pagerdutyScopes.split(' ').every(scope => scopes.includes(scope)) || scopes.some(scope => scope !== 'openid' && !pagerdutyScopes.split(' ').includes(scope))) throw Error()
   await currentConsentAdmin(c, issued.member)
   const sealed = await sealCredential(JSON.stringify(issued), env.SESSION_SECRET, tokenCustody)
   if (encodeURIComponent(sealed).length > 3700) throw Error()
   const guard = consentAdmin(issued.member)
   const inserted = await c.env.DB.prepare(`INSERT INTO oc_move_in_consent(id,custody,revoke_at,expires) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM oc_move_in_consent)<10 AND (${guard.sql})`).bind(issued.id, sealed, Math.min(expires, Date.now() + 480000), expires, ...guard.params!).run()
   if (inserted.meta.changes !== 1) throw Error()
   c.header('Set-Cookie', cookie(tokenCookie, sealed, env.AUTH_ORIGIN, Math.max(1, Math.floor((expires - Date.now()) / 1000))), { append: true })
   return c.redirect('/settings/move-in?connected=pagerduty', 302)
  } catch {
   c.header('Set-Cookie', cookie(tokenCookie, '', env.AUTH_ORIGIN, 0), { append: true })
   auditOutcome(env.DB,'failed')
   let revokeFailed=false
   if (issued) {
    try { await revokeConsent(env, issued) } catch { revokeFailed=true }
    if(!revokeFailed)await c.env.DB.prepare('DELETE FROM oc_move_in_consent WHERE id=?').bind(issued.id).run()
   }
   return c.redirect('/settings/move-in?connection=failed', 302)
  }
 })
}

/** Called by the installation's existing minute cron; tokens never enter archive/export custody. */
export async function sweepMoveInConsent(env: Bindings, request: typeof fetch = fetch) {
 const rows = await env.DB.prepare('SELECT id,custody,expires FROM oc_move_in_consent WHERE revoke_at<=? ORDER BY revoke_at LIMIT 10').bind(Date.now()).all<{ id: string; custody: string; expires: number }>()
 let failed=0
 await Promise.all(rows.results.map(async row => {
  try {
   const held = JSON.parse(await openCredential(row.custody, env.SESSION_SECRET, tokenCustody)) as ConsentToken
   await revokeConsent(env, held, request)
   await env.DB.prepare('DELETE FROM oc_move_in_consent WHERE id=?').bind(row.id).run()
  } catch {
   failed++
   // An unavailable provider is a failed external operation, never a success.
   // Stop using expired custody; the owner can revoke the app at PagerDuty.
   if (row.expires <= Date.now()) await env.DB.prepare('DELETE FROM oc_move_in_consent WHERE id=?').bind(row.id).run()
   console.error('PagerDuty move-in connection cleanup failed; revoke the app at PagerDuty.')
  }
 }))
 return {processed:rows.results.length,failed}
}
