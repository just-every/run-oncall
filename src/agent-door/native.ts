import type { Bindings } from '../auth.server'
import type { Member, State } from '../family/response-operations/domain'
import { Fault } from '../family/response-operations/domain'
import { loadWorkspace, workspaceWrite } from '../workspace-store'
import { changeHash } from '../changes/credentials'
import { auditIdentity, auditKind } from '../audit-store'
import { ToolRefusal, type ToolContext, type ResourceContext, type Principal } from '../modules/agent-door/index.ts'
import type { Client } from '../automation/model'

export type NativePrincipal = Pick<Principal, 'person' | 'agent' | 'scopes' | 'clientId'>
export type NativeAccess = { state: State; member: Member; client?: Client; services: string[]; principal: NativePrincipal & {consent?: string}; guard: { sql: string; values: (string | number | null)[] } }
const denied = (code = 'not_found'): never => { throw new ToolRefusal(code) }

/** Current domain membership and immutable client sponsorship, never token email. */
export async function nativeAccess(env: Bindings, ctx: NativePrincipal, permission: string, service?: unknown, admin = false): Promise<NativeAccess> {
  const state = await loadWorkspace(env.DB)
  const member = state.members.find(row => row.id === ctx.person.id && row.active)
  if (!member) return denied('unauthenticated')
  if (member.role === 'stakeholder' || admin && member.role !== 'admin' || permission.endsWith(':write') && !['admin', 'responder'].includes(member.role)) return denied('native_authority_required')
  let client: Client | undefined
  // Business client_id is an OAuth client, not an Oncall service account.
  // Local credentials use this reserved namespace and bind their exact revision.
  const local = ctx.agent.id.startsWith('oncall-client:')
  if (local) {
    client = state.apiClients?.find(row => row.id === ctx.clientId && row.active && row.owner === member.id && ctx.agent.id === `oncall-client:${row.id}:${row.revision}`)
    if (!client || member.role !== 'admin' || !await env.DB.prepare('SELECT 1 FROM oc_api_credentials WHERE client=?').bind(client.id).first()) return denied('unauthenticated')
    if (admin || !client.permissions.includes(permission)) return denied('insufficient_scope')
  } else if (ctx.clientId?.startsWith('api-')) return denied('unauthenticated')
  if (!ctx.scopes.includes(permission)) return denied('insufficient_scope')
  const services = client?.services ?? state.services.map(row => row.id)
  if (service !== undefined && (typeof service !== 'string' || !services.includes(service) || !state.services.some(row => row.id === service))) return denied()
  const guard = { sql: "EXISTS(SELECT 1 FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.role')=?)", values: [member.id, member.role] as (string | number | null)[] }
  if (client) {
    guard.sql += " AND EXISTS(SELECT 1 FROM oc_api_clients WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.revision')=? AND json_extract(data,'$.owner')=?) AND EXISTS(SELECT 1 FROM oc_api_credentials WHERE client=?)"
    guard.values.push(client.id, client.revision, member.id, client.id)
  }
  const policy = await env.DB.prepare('SELECT envelope,local_document,local_revision,local_paused FROM agent_door_state WHERE id=1').first<{envelope:string|null;local_document:string|null;local_revision:number;local_paused:number}>()
  if (!policy || policy.local_paused) return denied(policy?.local_paused ? 'agents_paused' : 'policy_unset')
  guard.sql += ' AND EXISTS(SELECT 1 FROM agent_door_state WHERE id=1 AND envelope IS ? AND local_document IS ? AND local_revision=? AND local_paused=0) AND NOT EXISTS(SELECT 1 FROM agent_door_agents WHERE id=? AND revoked=1)'
  guard.values.push(policy.envelope,policy.local_document,policy.local_revision,ctx.agent.id)
  if (!await env.DB.prepare(`SELECT 1 WHERE ${guard.sql}`).bind(...guard.values).first()) return denied('unauthenticated')
  return { state, member, client, services, guard, principal: ctx }
}

export async function persistNative(env: Bindings, access: NativeAccess, extra: (token: string) => D1PreparedStatement[] = () => []) {
  const token = crypto.randomUUID()
  const durable = (access.state.apiOutbox ?? []).filter(item => access.state.incidents.some(incident => incident.timeline.some(entry => entry.id === item.entry && entry.metadata?.agent?.agent.id === access.principal.agent.id)))
  const result = await env.DB.batch([...workspaceWrite(env.DB, access.state, access.state.revision, access.guard, token), ...extra(token), ...durable.map(item => env.DB.prepare(`INSERT OR IGNORE INTO oc_agent_outbox(outbox,principal) SELECT ?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)`).bind(item.id,JSON.stringify({person:{id:access.member.id},agent:access.principal.agent,scopes:access.principal.scopes,clientId:access.principal.clientId,consent:access.principal.consent}),token))])
  if (result[0].meta.changes !== 1) return denied('revision_conflict')
}

export function nativeActor(access: NativeAccess, ctx: ToolContext): Member {
  return { ...access.member, id: access.client?.id ?? ctx.agent.id, name: ctx.actor.label, machine: true, agent: { ...ctx.actor, sponsor: access.member.id, client: access.client?.id, approvers: ctx.approvers } } as Member
}

export function nativeAudit(env: Bindings, ctx: ToolContext, kind: string, id: string) {
  auditKind(env.DB, kind)
  auditIdentity(env.DB, { actor: { kind: 'agent', id: ctx.agent.id }, subject: { kind: 'entity', id }, source: { kind: 'member', id: ctx.person.id } })
}

export async function nativeCall<T>(run: () => Promise<T> | T): Promise<T> {
  try { return await run() } catch (error) {
    if (error instanceof Fault) throw new ToolRefusal(error.status === 409 ? 'revision_conflict' : error.status === 404 ? 'not_found' : error.status === 403 ? 'native_authority_required' : 'native_request_invalid', error.message)
    throw error
  }
}

export async function localCredentials(env: Bindings, request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer ([^\s]{32,200})$/)?.[1]
  if (!bearer) return null
  const digest = await changeHash(bearer)
  const row = await env.DB.prepare('SELECT client FROM oc_api_credentials WHERE digest=?').bind(digest).first<{ client: string }>()
  if (!row) return null
  const state = await loadWorkspace(env.DB), client = state.apiClients?.find(value => value.id === row.client && value.active)
  const sponsor = client && state.members.find(value => value.id === client.owner && value.active && value.role === 'admin')
  if (!client || !sponsor) return null
  return { sponsor: { id: sponsor.id }, agent: { id: `oncall-client:${client.id}:${client.revision}`, name: client.name, specialist: 'oncall-responder' }, scopes: client.permissions, clientId: client.id }
}

export async function currentScopes(env: Bindings, principal: NativePrincipal) {
  if (!principal.agent.id.startsWith('oncall-client:')) return principal.scopes
  const state = await loadWorkspace(env.DB), client = state.apiClients?.find(value => value.id === principal.clientId && value.active && value.owner === principal.person.id && principal.agent.id === `oncall-client:${value.id}:${value.revision}`)
  if (!client || !state.members.some(value => value.id === client.owner && value.active && value.role === 'admin') || !await env.DB.prepare('SELECT 1 FROM oc_api_credentials WHERE client=?').bind(client.id).first()) return []
  return client.permissions
}
