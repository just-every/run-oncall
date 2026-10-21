import type { Action, Incident, Service, State } from '../../family/response-operations/domain'
import { incidentAssignee, incidentUpdated, incidentUrgency } from '../../family/response-operations/incident-controls'

export const serviceView = (service: Service) => ({ id: service.id, name: service.name, environment: service.environment, owner: service.owner,
  dependencies: service.dependencies ?? [], runbook: service.runbook, pager: service.pager })
export const actionView = (incident: Incident, action: Action) => ({ id: action.id, incident: incident.id, service: incident.service, title: action.title, owner: action.owner,
  due: action.due, done: action.done, priority: action.priority ?? 'P2', completionPolicy: action.completionPolicy ?? 'human-review', evidence: action.evidence || null,
  submission: action.submission ?? null, accepted: action.accepted ?? null, awaitingHumanAcceptance: !action.done && !!action.submission })
export const incidentView = (incident: Incident, detail = false) => ({
  id: incident.id, title: incident.title, service: incident.service, severity: incident.severity, state: incident.state, revision: incident.revision,
  commander: incident.commander, assignee: incidentAssignee(incident), scribe: incident.scribe ?? null, communications: incident.communications ?? null,
  urgency: incidentUrgency(incident), priority: incident.priority ?? null, createdAt: incident.createdAt, updatedAt: incidentUpdated(incident),
  recoveryEvidence: incident.recovery || null, alerts: incident.alerts.length, followUps: incident.actions.map(action => actionView(incident, action)),
  ...(detail ? { timeline: incident.timeline.map(entry => ({ id: entry.id, at: entry.at, actor: entry.actor, kind: entry.kind, text: entry.text })) } : {}),
})
export const scoped = (state: State, services: string[]) => ({
  incidents: state.incidents.filter(incident => services.includes(incident.service)),
  services: state.services.filter(service => services.includes(service.id)),
})
