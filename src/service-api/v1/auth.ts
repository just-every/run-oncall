import { auditIdentity } from '../../audit-store'
import { rawDatabase } from '../../audit-database'
import { loadWorkspace } from '../../workspace-store'
import type { State } from '../../family/response-operations/domain'
import { actorId } from '../model.ts'
import { tokenDigest, tokenPrefix } from '../credentials'
import type { ApiPermission, ServiceAccount } from '../types.ts'
import { ApiError } from './errors'

export type Caller = { account: ServiceAccount; state: State; digest: string }
export const limits = { read: 120, write: 60 } as const
const windowMs = 60000

export function bearer(request: Request) {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token.startsWith(tokenPrefix) || token.length > 200) throw new ApiError(401, 'unauthorized', 'A service-account token is required')
  return token
}
/** The statement fragment every API mutation commits under: this exact token, on this exact account revision, still active. */
export function accountGuard(caller: Caller) {
  return { sql: `EXISTS(SELECT 1 FROM oc_api_credentials WHERE account=? AND digest=?) AND EXISTS(SELECT 1 FROM oc_service_accounts WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.revision')=?)`,
    values: [caller.account.id, caller.digest, caller.account.id, caller.account.revision] as (string | number | null)[] }
}
/** Reads the credential and account again; a revoked, rotated or deleted token fails here and never reaches a mutation. */
export async function authenticate(c: any, token = bearer(c.req.raw)): Promise<Caller> {
  const db: D1Database = c.env.DB, digest = await tokenDigest(token)
  const credential = await db.prepare('SELECT account,last_used_at FROM oc_api_credentials WHERE digest=?').bind(digest).first<{ account: string; last_used_at: string | null }>()
  const fail = () => new ApiError(401, 'unauthorized', 'The service-account token is invalid or revoked')
  if (!credential) throw fail()
  const state = await loadWorkspace(db), account = state.serviceAccounts?.find(candidate => candidate.id === credential.account && candidate.active)
  if (!account) throw fail()
  auditIdentity(db, { actor: { kind: 'service-account', id: account.id }, source: { kind: 'service-account', id: account.id } })
  const now = Date.now()
  if (!credential.last_used_at || now - Date.parse(credential.last_used_at) > windowMs)
    await rawDatabase(db).prepare('UPDATE oc_api_credentials SET last_used_at=? WHERE digest=?').bind(new Date(now).toISOString(), digest).run()
  return { account, state, digest }
}
export function require(caller: Caller, permission: ApiPermission) {
  if (!caller.account.permissions.includes(permission)) throw new ApiError(403, 'forbidden', `This token lacks the ${permission} permission`)
}
export const inScope = (caller: Caller, service: string) => caller.account.services.includes(service)
export const actor = (caller: Caller) => ({ id: actorId(caller.account.id), name: caller.account.name, role: 'responder' as const, active: true })

/** Fixed one-minute windows per token. Counters are throttling state only, so they are the one write that bypasses the audit batch. */
export async function throttle(c: any, caller: Caller, kind: 'read' | 'write') {
  const now = Date.now(), window = Math.floor(now / windowMs), db = rawDatabase(c.env.DB), limit = limits[kind]
  const row = await db.prepare('INSERT INTO oc_api_rate(account,bucket,window,count) VALUES(?,?,?,1) ON CONFLICT(account,bucket,window) DO UPDATE SET count=count+1 RETURNING count')
    .bind(caller.account.id, kind, window).first<{ count: number }>()
  const used = row?.count ?? limit + 1, reset = Math.ceil(((window + 1) * windowMs - now) / 1000)
  c.header('X-RateLimit-Limit', String(limit)); c.header('X-RateLimit-Remaining', String(Math.max(0, limit - used))); c.header('X-RateLimit-Reset', String(reset))
  if (used > limit) { c.header('Retry-After', String(reset)); throw new ApiError(429, 'rate_limited', `More than ${limit} ${kind} requests in a minute; retry after ${reset} seconds`) }
  if (used === 1) await db.prepare('DELETE FROM oc_api_rate WHERE window<?').bind(window - 2).run()
}
