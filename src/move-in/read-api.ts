import { runtimeBindings } from '../auth.server'
import { auditIdentity, auditKind } from '../audit-store'
import { markMoveInReadStep } from './read-audit'
import { Fault, fail } from '../family/response-operations/domain'
import { changeHmac, equalSignature } from '../changes/credentials'
import { CollectionRefusal, collectStep, type CollectionState, type Provider, type Region } from './collect/bundle'
import { consentToken, currentMoveInAdmin, endConsent, installPagerdutyConsent } from './pagerduty-oauth'

type Cursor = { member: string; source: Provider; region: Region; expires: number; state: CollectionState }
const encode = (value: unknown) => {
 const bytes = new TextEncoder().encode(JSON.stringify(value)); let binary = ''
 for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
 return btoa(binary)
}
async function cursor(value: Cursor, secret: string) {
 const payload = encode(value)
 return payload + '.' + await changeHmac(secret, 'oncall-move-in-read-v1:' + payload)
}
async function openCursor(value: string, secret: string): Promise<Cursor> {
 try {
  if (value.length > 1600000) throw Error()
  const [payload, signature, extra] = value.split('.')
  if (extra || !signature || !equalSignature(signature, await changeHmac(secret, 'oncall-move-in-read-v1:' + payload))) throw Error()
  const result = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), char => char.charCodeAt(0))))
  if (result.expires <= Date.now()) throw Error()
  return result
 } catch { return fail('This read expired. Read the account again; nothing was imported.', 400) }
}
export function installMoveInRead(api: any) {
 installPagerdutyConsent(api)
 api.get('/api/move-in/connection', async (c: any) => {
  await currentMoveInAdmin(c)
  const held = await consentToken(c)
  if (!held) fail('Connect PagerDuty again.', 401)
  return c.json({ source: 'pagerduty', region: held!.region })
 })
 api.post('/api/move-in/read', async (c: any) => {
  await currentMoveInAdmin(c)
  // Credential-bearing input never enters the generic command/audit-input mapper.
  const raw = await c.req.text()
  if (new TextEncoder().encode(raw).length > 1800000) fail('This read is too large. Start again with a smaller provider access scope.', 413)
  let input: any
  try { input = JSON.parse(raw) } catch { fail('The read request could not be read. Start again.') }
  const env = runtimeBindings(c.env)
  if (!input || !['pagerduty', 'opsgenie'].includes(input.source) || !['us', 'eu'].includes(input.region)) fail('Choose PagerDuty or Opsgenie and a US or EU account region.')
  const source: Provider = input.source, region: Region = input.region
  if (input.cursor !== undefined && typeof input.cursor !== 'string') fail('This read expired. Read the account again.')
  const previous = input.cursor ? await openCursor(input.cursor, env.SESSION_SECRET) : null
  if (previous && (previous.member !== c.get('actor').id || previous.source !== source || previous.region !== region)) fail('Read this account again as the administrator who started it.', 403)
  const held = source === 'pagerduty' && !input.key ? await consentToken(c) : null
  if (held && held.region !== region) fail('Use the region selected when connecting PagerDuty.')
  const key = held?.token ?? input.key
  if (typeof key !== 'string' || !key.trim()) fail('Paste a read-only key, or connect PagerDuty.')
  let closing = false
  try {
   // Leave room under the Worker's subrequest limit for session checks, custody and audit.
   const result = await collectStep({ vendor: source, region, key, bearer: Boolean(held), request: async (url, options) => {
    if (held && held.expires <= Date.now()) throw new CollectionRefusal('The PagerDuty connection expired. Connect again. Nothing was imported.')
    const signal = held ? AbortSignal.any([...(options?.signal ? [options.signal] : []), AbortSignal.timeout(Math.max(1, held.expires - Date.now()))]) : options?.signal
    return fetch(url, { ...options, signal })
   } }, previous?.state, held ? 29 : 30)
   await currentMoveInAdmin(c)
   if (held && held.expires <= Date.now()) throw new CollectionRefusal('The PagerDuty connection expired. Connect again. Nothing was imported.')
   const next = result.next ? await cursor({ member: c.get('actor').id, source, region, expires: previous?.expires ?? Date.now() + 600000, state: result.next }, env.SESSION_SECRET) : null
   if (!next) {
    // Counts only: provider values and the credential never become an audit identity or row.
    auditIdentity(c.env.DB, { source: { kind: 'provider', id: source } })
    auditKind(c.env.DB, 'move-in.read.' + JSON.stringify({ provider: source, region, counts: Object.fromEntries(Object.entries(result.state.bundle).map(([kind, rows]) => [kind, rows.length])) }))
    if (held) { closing = true; await endConsent(c, held) }
   } else {
    // This step changed no durable data; only the finished read gets its audit entry.
    markMoveInReadStep(c.env.DB)
   }
   return c.json({ part: result.part, next })
  } catch (error) {
   if (held && !closing) await endConsent(c, held)
   // The collector exposes only fixed sentences. Never serialize the provider response or fetch exception.
   const message = (error instanceof CollectionRefusal || error instanceof Fault) && !error.message.includes(key) ? error.message : 'The provider could not complete this read. Nothing was imported.'
   return c.json({ error: message }, error instanceof Fault && error.status < 500 ? error.status : 400)
  }
 })
}
