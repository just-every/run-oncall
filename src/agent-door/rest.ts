import { runtimeBindings, type Bindings } from '../auth.server'
import { fail } from '../family/response-operations/domain'
import type { Operation } from '../automation/model'
import type { CallResult } from '../modules/agent-door/index.ts'
import { localCredentials, withNativeOperation } from './native'

type Args = Record<string, unknown>
const select = (value: Args, keys: string[]) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]))
// Composition imports automation management. Load it at request time so its
// REST adapter never creates an initialization cycle through this module.
const agentDoor = async (env: Bindings) => (await import('./index.server')).oncallAgentDoor(runtimeBindings(env))

/** REST credentials are the same real local service-account principal as MCP. */
async function principal(env: Bindings, request: Request) {
  const local = await localCredentials(env, request)
  if (!local) fail('Invalid or revoked token', 401)
  return { person: local.sponsor, agent: local.agent, scopes: local.scopes, clientId: local.clientId }
}

export async function invokeRestRead(env: Bindings, request: Request, family: string, id?: string): Promise<CallResult> {
  const who = await principal(env, request), door = await agentDoor(env)
  const tool = family === 'services' ? id ? 'services.read' : 'services.list'
    : family === 'incidents' ? id ? 'incidents.read' : 'incidents.list'
    : family === 'schedules' ? 'schedules.read'
    : family === 'actions' ? 'actions.list'
    : family === 'analytics' ? 'analytics.read' : 'integrations.read'
  return door.invoke(`oncall.${tool}`, id && ['services', 'incidents', 'schedules'].includes(family) ? { id } : {}, who)
}

export async function invokeRestReceipt(env: Bindings, request: Request, family: string, key: string): Promise<CallResult> {
  const who=await principal(env,request);return (await agentDoor(env)).invoke(`oncall.${family}.receipt`, { key }, who)
}

/** Translate the existing wire commands; the registry remains the only effect executor. */
export function restMutation(family: string, input: Args, keyHash: string): { name: string; args: Args } {
  if (family === 'services') {
    if (input.type !== 'service') fail('Action is not available in this API family', 403)
    return { name: 'oncall.services.update', args: select(input, ['id', 'etag', 'name', 'environment', 'owner', 'runbook', 'pager', 'dependencies']) }
  }
  if (family === 'schedules') {
    const schedule = (input.schedule ?? input) as Args
    if (schedule.revision === 0) return { name: 'oncall.schedules.create', args: { schedule } }
    // Existing schedule changes now carry the same native reviewed proposal as MCP.
    if (!input.schedule || typeof input.digest !== 'string' || !Number.isSafeInteger(input.from) || !Number.isSafeInteger(input.to)) fail('Review the schedule change and provide its exact digest and range before applying', 409)
    return { name: 'oncall.schedules.update', args: { id: schedule.id, revision: schedule.revision, schedule, from: input.from, to: input.to, digest: input.digest } }
  }
  if (family === 'actions') {
    const common = select(input, ['incident', 'revision'])
    if (input.type === 'action') return { name: 'oncall.actions.create', args: { ...common, ...select(input, ['title', 'owner', 'due', 'priority', 'completionPolicy', 'escalationRecipient']) } }
    if (input.type === 'complete') return { name: 'oncall.actions.submit', args: { ...common, ...select(input, ['action', 'evidence']) } }
    fail('Action is not available in this API family', 403)
  }
  if (family !== 'incidents') fail('Unknown API family', 404)
  const common = select(input, ['incident', 'revision'])
  if (input.type === 'declare') return { name: 'oncall.incidents.declare', args: select(input, ['service', 'revision', 'title', 'summary', 'severity', 'alerts']) }
  if (input.type === 'transition' && input.state === 'acknowledged') return { name: 'oncall.incidents.acknowledge', args: { ...common, ...select(input, ['member', 'summary']) } }
  if (input.type === 'transition' && input.state === 'resolved') return { name: 'oncall.incidents.resolve', args: { ...common, ...select(input, ['summary']) } }
  if (['transition', 'reassign', 'assign-role', 'manual-page', 'snooze', 'cancel-deadline'].includes(String(input.type))) {
    return { name: 'oncall.incidents.update', args: { ...common, change: input.type,
      ...select(input, ['service', 'state', 'summary', 'evidence', 'member', 'role', 'reason', 'title', 'severity', 'urgency', 'priority', 'description', 'users', 'policy', 'incidentType', 'minutes']),
      ...(input.type === 'manual-page' ? { operationId: keyHash } : {}) } }
  }
  fail('Action is not available in this API family', 403)
}

export async function invokeRestMutation(env: Bindings, request: Request, family: string, input: Args, operation: Operation): Promise<CallResult> {
  const tool = restMutation(family, input, operation.key), who = await principal(env, request)
  if (who.clientId !== operation.client) fail('Invalid or revoked token', 401)
  const door=await agentDoor(env)
  return withNativeOperation(env, operation, () => door.invoke(tool.name, { ...tool.args, idempotency_key: `api-v1-${operation.key}` }, who),{agent:who.agent.id,tool:tool.name,args:tool.args})
}

/** Pending approval and policy refusal stay explicit on the original REST door. */
export function restRefusal(result: CallResult): Response | null {
  if (result.outcome === 'done') return null
  const code = result.outcome === 'pending' ? 'approval_required' : result.code ?? 'request_refused'
  const status = result.outcome === 'pending' ? 202
    : ['unauthenticated', 'invalid_token', 'consent_revoked'].includes(code) ? 401
    : code === 'not_found' ? 404
    : ['revision_conflict', 'idempotency_conflict', 'call_in_progress', 'decision_busy', 'native_operation_replay', 'approval_expired', 'approval_evidence_changed'].includes(code) ? 409
    : ['invalid_arguments', 'native_request_invalid', 'idempotency_key_required'].includes(code) ? 400
    : ['rate_limited','rate_or_capacity_limit','capacity_exceeded'].includes(code) ? 429
    : code === 'request_too_large' ? 413
    : ['execution_failed', 'output_invalid', 'policy_unavailable'].includes(code) ? 503 : 403
  return Response.json({ error: { code, message: code.replaceAll('_', ' ') }, decision: result.decision, ...(result.fields ? { fields: result.fields } : {}),
    ...(result.approval ? { approval: result.approval } : {}), ...(result.requestState ? { requestState: result.requestState } : {}) },
    { status, headers: { 'cache-control': 'no-store' } })
}
