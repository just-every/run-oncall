import type { Alert, Event, State } from '../family/response-operations/domain'
import type { IntakeReceipt } from '../intake/model'
import { ToolRefusal, type ToolContext } from '../modules/agent-door/index.ts'
import type { Bindings } from '../auth.server'
import { nativeAccess } from './native'
import { changeHash } from '../changes/credentials'

function routing(receipt?: IntakeReceipt) {
  const held = receipt?.routing
  // Diagnostics and routing input may name other services or contain source
  // payloads. Only the retained selection for this observation is disclosed.
  return held ? { key: held.key, version: held.version, rule: held.rule,
    kind: held.kind, service: held.service,
    ...(held.dynamic ? { dynamic: { field: held.dynamic.field, value: held.dynamic.value } } : {}),
  } : null
}

function observation(event: Event | undefined, receipt: IntakeReceipt | undefined) {
  const decision = event?.decision ?? receipt?.routing?.serviceDecision
  return {
    id: event?.id ?? receipt!.id, eventId: event?.eventId ?? null, receipt: receipt?.id ?? null,
    source: event?.source ?? 'intake:' + receipt!.source, provider: receipt?.provider ?? 'native',
    service: event?.service ?? receipt!.service, environment: event?.environment ?? null,
    key: event?.key ?? receipt!.key, generation: event?.generation ?? receipt!.generation,
    intent: event?.intent ?? receipt!.action, title: event?.title ?? receipt!.title,
    severity: event?.severity ?? receipt!.severity, priority: event?.priority ?? receipt?.priority ?? null,
    observedAt: event?.observedAt ?? receipt?.observedAt ?? null,
    acceptedAt: event?.acceptedAt ?? receipt!.acceptedAt, evidence: event?.evidence ?? '',
    truncated: receipt?.truncated ?? false, incomplete: Boolean(receipt?.incomplete),
    decision: decision ? { policy: decision.policy, version: decision.version, action: decision.action,
      owner: decision.owner, reason: decision.reason, service: event?.service ?? receipt!.service } : null,
    routing: routing(receipt),
  }
}

/** An allowlist, never a spread of payload custody or a routing member snapshot. */
function project(state: State, alert: Alert) {
  const events = state.events.filter(event => event.service === alert.service && alert.events.includes(event.id))
  const receipts = (state.intakeReceipts ?? []).filter(receipt => receipt.alert === alert.id && receipt.service === alert.service)
  const first = events.find(event => event.intent === 'trigger') ?? events[0]
  const observations = [
    ...events.map(event => observation(event, receipts.find(receipt => receipt.event === event.id))),
    ...receipts.filter(receipt => receipt.event === null).map(receipt => observation(undefined, receipt)),
  ].sort((a, b) => compare(a.acceptedAt, b.acceptedAt) || compare(a.id, b.id))
  return { id: alert.id, service: alert.service, source: alert.source, environment: alert.environment,
    key: alert.key, generation: alert.generation, state: alert.state, urgency: alert.urgency ?? null,
    originalSeverity: alert.originalSeverity ?? first?.severity ?? receipts[0]?.severity ?? null,
    originalPriority: alert.originalPriority !== undefined ? alert.originalPriority : first?.priority ?? receipts[0]?.priority ?? null,
    priority: alert.priority ?? null, suppressed: alert.suppressed, owner: alert.owner, observations }
}

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0

/** Cursors contain only an authorized anchor and bind its filters and principal. */
export async function listAlerts(env: Bindings, args: Record<string, unknown>, ctx: ToolContext) {
  const access = await nativeAccess(env, ctx, 'incidents:read', args.service)
  const rows = access.state.alerts.filter(alert => alert.service !== null && access.services.includes(alert.service)
    && (args.service === undefined || alert.service === args.service)
    && (args.state === undefined || alert.state === args.state)
    && (args.urgency === undefined || alert.urgency === args.urgency)).sort((a, b) => compare(a.id, b.id))
  const query = await changeHash(JSON.stringify([ctx.agent.id, [...access.services].sort(), args.service ?? null, args.state ?? null, args.urgency ?? null]))
  let after = -1
  if (args.cursor !== undefined) {
    try {
      const cursor = JSON.parse(atob(String(args.cursor)))
      if (cursor.query !== query || typeof cursor.id !== 'string') throw new Error()
      after = rows.findIndex(row => row.id === cursor.id)
      if (after < 0) throw new Error()
    } catch { throw new ToolRefusal('invalid_cursor') }
  }
  const limit = Number(args.limit ?? 50), page = rows.slice(after + 1, after + 1 + limit)
  return { alerts: page.map(alert => project(access.state, alert)),
    ...(after + 1 + limit < rows.length ? { nextCursor: btoa(JSON.stringify({ query, id: page.at(-1)!.id })) } : {}) }
}
