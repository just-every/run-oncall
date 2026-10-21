import type { Incident, State } from '../family/response-operations/domain.ts'
import { incidentAssignee } from '../family/response-operations/incident-controls.ts'
import { noticeText, type EventPayload, type EventType, type Principal } from './types.ts'

export type DomainEvent = { type: EventType; incident: Incident; change: Record<string, unknown> }
const roles = ['commander', 'scribe', 'communications'] as const
const brief = (action: Incident['actions'][number]) => ({ id: action.id, owner: action.owner, due: action.due, priority: action.priority ?? 'P2', completionPolicy: action.completionPolicy ?? 'human-review' })

/** Events are derived from the committed difference between two incident sets, so every door that saves an incident reports the same facts. */
export function diffIncidentEvents(before: Incident[], after: Incident[], only?: string): DomainEvent[] {
  const prior = new Map(before.map(incident => [incident.id, incident]))
  const events: DomainEvent[] = []
  for (const next of after) {
    if (only !== undefined && next.id !== only) continue
    const old = prior.get(next.id)
    if (!old) { events.push({ type: 'incident.triggered', incident: next, change: { linkedAlerts: next.alerts.length } }); continue }
    if (old.revision === next.revision) continue
    const acknowledged = old.state !== 'acknowledged' && next.state === 'acknowledged'
    if (acknowledged) events.push({ type: 'incident.acknowledged', incident: next, change: { assignee: incidentAssignee(next), commander: next.commander } })
    if (old.state !== 'resolved' && next.state === 'resolved') events.push({ type: 'incident.resolved', incident: next, change: { from: old.state } })
    if (!acknowledged && incidentAssignee(old) !== incidentAssignee(next))
      events.push({ type: 'incident.reassigned', incident: next, change: { role: 'assignee', from: incidentAssignee(old), to: incidentAssignee(next) } })
    for (const role of roles) {
      const from = old[role] ?? null, to = next[role] ?? null
      if (from !== to && !(acknowledged && role === 'commander')) events.push({ type: 'incident.role_assigned', incident: next, change: { role, from, to } })
    }
    const known = new Map(old.actions.map(action => [action.id, action]))
    for (const action of next.actions) {
      const was = known.get(action.id)
      if (!was) events.push({ type: 'incident.followup_created', incident: next, change: { action: { ...brief(action), title: action.title } } })
      else if (!was.done && action.done) events.push({ type: 'incident.followup_completed', incident: next, change: { action: brief(action) } })
    }
  }
  return events
}

/** The frozen, minimized body: identity, state and the single change. No timeline, runbook, evidence text or contacts. */
export function eventPayload(state: State, event: DomainEvent, ids: { operationId: string; eventId: string }, actor: Principal, occurredAt: string): EventPayload {
  const service = state.services.find(candidate => candidate.id === event.incident.service)!
  return {
    specVersion: 'oncall.event.v1', operationId: ids.operationId, eventId: ids.eventId, type: event.type, occurredAt,
    service: { id: service.id, name: service.name, environment: service.environment },
    incident: { id: event.incident.id, title: event.incident.title, severity: event.incident.severity, state: event.incident.state, revision: event.incident.revision },
    actor, change: event.change, notice: noticeText,
  }
}
