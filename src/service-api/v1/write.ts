import { setAuditSubject, auditKind } from '../../audit-store'
import { workspaceWrite } from '../../workspace-store'
import { command, type Incident, type State } from '../../family/response-operations/domain'
import { changeHash } from '../../changes/credentials'
import { accountGuard, actor, authenticate, inScope, require, type Caller } from './auth'
import { ApiError, notFound } from './errors'
import { actionView, incidentView } from './views'
import type { ApiPermission } from '../types.ts'

type Params = Record<string, string>
type Applied = { response: object; subject: string; service: string; status?: number }
type Mutation = { name: string; permission: ApiPermission; status: number; apply: (state: State, caller: Caller, input: any, context: { params: Params; key: string }) => Applied }
type Route = (permission: 'read' | ApiPermission | null, handler: (c: any, caller: Caller) => Promise<unknown> | unknown) => (c: any) => Promise<Response>

const canonical = (value: unknown): string => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
  : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as any)[key])).join(',') + '}' : JSON.stringify(value)
const idempotencyKey = (c: any) => {
  const key = c.req.header('idempotency-key') ?? ''
  if (!/^[A-Za-z0-9._:-]{8,100}$/.test(key)) throw new ApiError(400, 'idempotency_key_required', 'Send an Idempotency-Key header of 8–100 letters, digits or . _ : - so a retry cannot repeat the change')
  return key
}
async function readInput(c: any) {
  const raw = await c.req.text()
  if (new TextEncoder().encode(raw).length > 65536) throw new ApiError(413, 'payload_too_large', 'The request body is limited to 64 KiB')
  let input: unknown
  try { input = JSON.parse(raw) } catch { throw new ApiError(400, 'invalid_request', 'The request body must be JSON') }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'invalid_request', 'The request body must be a JSON object')
  return input as any
}
async function stored(db: D1Database, account: string, key: string, fingerprint: string, c: any) {
  const row = await db.prepare('SELECT fingerprint,status,response FROM oc_api_idempotency WHERE account=? AND key=?').bind(account, key).first<{ fingerprint: string; status: number; response: string }>()
  if (!row) return null
  if (row.fingerprint !== fingerprint) throw new ApiError(409, 'idempotency_conflict', 'This Idempotency-Key was already used for a different request')
  c.header('Idempotent-Replay', 'true')
  return c.json(JSON.parse(row.response), row.status)
}
/** The incident the token may see, at the revision the client last read. Anything else answers exactly like a missing record. */
function target(state: State, caller: Caller, id: string, input: any): Incident {
  const incident = state.incidents.find(candidate => candidate.id === id)
  if (!incident || !inScope(caller, incident.service)) throw notFound('Incident')
  if (!Number.isInteger(input.revision)) throw new ApiError(400, 'invalid_request', 'revision is required: send the incident revision you last read')
  if (input.revision !== incident.revision) throw new ApiError(409, 'stale_revision', 'The incident changed after you read it. Reload and apply your change again.', { revision: incident.revision })
  return incident
}
const automation = (summary: unknown) => typeof summary === 'string' && summary.trim() ? `Automation via service account (not a human attestation): ${summary.trim()}` : summary

const mutations: Record<string, Mutation & { path: string }> = {
  declare: { path: '/api/v1/incidents', name: 'incident.declare', permission: 'incidents:write', status: 201, apply(state, caller, input) {
    if (typeof input.service !== 'string' || !inScope(caller, input.service) || !state.services.some(service => service.id === input.service)) throw notFound('Service')
    const incident = command(state, actor(caller), { type: 'declare', service: input.service, severity: input.severity, title: input.title, summary: automation(input.summary), alerts: input.alerts }) as Incident
    return { response: incidentView(incident, true), subject: incident.id, service: incident.service }
  } },
  acknowledge: { path: '/api/v1/incidents/:id/acknowledge', name: 'incident.acknowledge', permission: 'incidents:write', status: 200, apply(state, caller, input, { params }) {
    const incident = target(state, caller, params.id, input)
    command(state, actor(caller), { type: 'transition', incident: incident.id, revision: incident.revision, state: 'acknowledged', summary: automation(input.summary), responsible: input.responsible })
    return { response: incidentView(incident, true), subject: incident.id, service: incident.service }
  } },
  reassign: { path: '/api/v1/incidents/:id/reassign', name: 'incident.reassign', permission: 'incidents:write', status: 200, apply(state, caller, input, { params, key }) {
    const incident = target(state, caller, params.id, input)
    if (!Object.hasOwn(input, 'member')) throw new ApiError(400, 'invalid_request', 'member is required: a responder id, or null to unassign')
    command(state, actor(caller), { type: 'reassign', incident: incident.id, revision: incident.revision, member: input.member, reason: automation(input.reason), operationId: key })
    return { response: incidentView(incident, true), subject: incident.id, service: incident.service }
  } },
  roles: { path: '/api/v1/incidents/:id/roles', name: 'incident.role', permission: 'incidents:write', status: 200, apply(state, caller, input, { params, key }) {
    const incident = target(state, caller, params.id, input)
    if (!['commander', 'scribe', 'communications'].includes(input.role) || !Object.hasOwn(input, 'member')) throw new ApiError(400, 'invalid_request', 'role must be commander, scribe or communications, and member a responder id or null')
    command(state, actor(caller), { type: 'assign-role', incident: incident.id, revision: incident.revision, role: input.role, member: input.member, reason: automation(input.reason), operationId: key })
    return { response: incidentView(incident, true), subject: incident.id, service: incident.service }
  } },
  resolve: { path: '/api/v1/incidents/:id/resolve', name: 'incident.resolve', permission: 'incidents:resolve', status: 200, apply(state, caller, input, { params }) {
    const incident = target(state, caller, params.id, input)
    if (incident.state === 'declared') throw new ApiError(409, 'invalid_state', 'Acknowledge the incident before resolving it')
    if (incident.state === 'resolved') throw new ApiError(409, 'invalid_state', 'The incident is already resolved')
    const summary = automation(input.summary)
    // Resolution needs recovery evidence and a summary. Both are recorded as automation-supplied claims, never as a human attestation.
    if (incident.state !== 'recovered') command(state, actor(caller), { type: 'transition', incident: incident.id, revision: incident.revision, state: 'recovered', summary, evidence: input.evidence })
    command(state, actor(caller), { type: 'transition', incident: incident.id, revision: incident.revision, state: 'resolved', summary })
    return { response: incidentView(incident, true), subject: incident.id, service: incident.service }
  } },
  createAction: { path: '/api/v1/incidents/:id/actions', name: 'action.create', permission: 'actions:write', status: 201, apply(state, caller, input, { params }) {
    const incident = target(state, caller, params.id, input)
    command(state, actor(caller), { type: 'action', incident: incident.id, revision: incident.revision, title: input.title, owner: input.owner, due: input.due, priority: input.priority, completionPolicy: input.completionPolicy, escalationRecipient: input.escalationRecipient })
    return { response: actionView(incident, incident.actions[incident.actions.length - 1]), subject: incident.id, service: incident.service }
  } },
  completeAction: { path: '/api/v1/incidents/:id/actions/:action/complete', name: 'action.complete', permission: 'actions:write', status: 200, apply(state, caller, input, { params }) {
    const incident = target(state, caller, params.id, input)
    command(state, actor(caller), { type: 'complete', incident: incident.id, revision: incident.revision, action: params.action, evidence: input.evidence })
    return { response: actionView(incident, incident.actions.find(action => action.id === params.action)!), subject: incident.id, service: incident.service }
  } },
}

async function run(c: any, first: Caller, mutation: Mutation) {
  const key = idempotencyKey(c), input = await readInput(c), db: D1Database = c.env.DB
  const fingerprint = await changeHash(canonical({ path: c.req.path, input }))
  const replay = await stored(db, first.account.id, key, fingerprint, c)
  if (replay) return replay
  auditKind(db, 'service-api.' + mutation.name)
  for (let attempt = 0; attempt < 4; attempt++) {
    // Every attempt reads the token, account scope and permission again: a revoked or narrowed token fails here, before any change.
    const caller = attempt === 0 ? first : await authenticate(c)
    require(caller, mutation.permission)
    const state = caller.state, revision = state.revision
    const applied = mutation.apply(state, caller, input, { params: c.req.param(), key })
    setAuditSubject(db, 'entity', applied.subject)
    const token = crypto.randomUUID(), gate = 'EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)'
    const statements = [...workspaceWrite(db, state, revision, accountGuard(caller), token),
      db.prepare(`INSERT INTO oc_api_idempotency(account,key,fingerprint,status,response,created_at) SELECT ?,?,?,?,?,? WHERE ${gate}`).bind(caller.account.id, key, fingerprint, mutation.status, JSON.stringify(applied.response), Date.now(), token),
      db.prepare(`DELETE FROM oc_api_idempotency WHERE created_at<? AND ${gate}`).bind(Date.now() - 86400000, token)]
    let results
    try { results = await db.batch(statements) }
    catch (error) {
      // A concurrent request with the same key committed first; its stored answer is the answer to this one too.
      if (/oc_api_idempotency/.test(String((error as Error)?.message))) { const winner = await stored(db, caller.account.id, key, fingerprint, c); if (winner) return winner }
      throw error
    }
    if (results[0].meta.changes === 1) return c.json(applied.response, mutation.status)
  }
  throw new ApiError(409, 'conflict', 'The workspace changed repeatedly while applying this request; retry it with the same Idempotency-Key')
}

export function installWrites(route: Route, api: any) {
  for (const mutation of Object.values(mutations)) api.post(mutation.path, route(mutation.permission, (c, caller) => run(c, caller, mutation)))
}
