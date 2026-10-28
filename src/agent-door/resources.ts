import type { Bindings } from '../auth.server'
import type { Incident, State } from '../family/response-operations/domain'
import { Fault } from '../family/response-operations/domain'
import { coverage } from '../family/response-operations/schedules'
import { incidentWithinServices } from '../incident-workflows/scope'
import { resolveIncidentAlias } from '../incident-workflows/relations'
import { recentChanges } from '../changes/model'
import { reviewMaterial } from '../reviews/material'
import { pagingSnapshot } from '../paging-store'
import { ToolRefusal, type ClassAndFacts, type ResourceContext, type ResourceDefinition } from '../modules/agent-door/index.ts'
import { nativeAccess, type NativeAccess } from './native'

type RecordBody = { json: unknown; service: string }
type Reader = (access: NativeAccess, id: string) => Promise<RecordBody | null> | RecordBody | null

/** Identifiers alone are not a disclosure of a person's native profile. */
export function protectedRecords(value: unknown): number {
  if (Array.isArray(value)) return value.reduce((total, item) => total + protectedRecords(item), 0)
  if (!value || typeof value !== 'object') return 0
  const fields = value as Record<string, unknown>
  const evidence = ['evidence', 'recovery', 'rootCause', 'impact', 'review', 'actorName', 'author']
    .some(key => typeof fields[key] === 'string' && Boolean((fields[key] as string).trim()))
  const people = Array.isArray(fields.people) ? fields.people.length : 0
  return Number(evidence) + people + Object.entries(fields)
    .filter(([key]) => key !== 'people').reduce((total, [, child]) => total + protectedRecords(child), 0)
}

function classify(record: { json?: unknown }): ClassAndFacts[] {
  const sensitive = protectedRecords(record.json)
  return [{ class: 'standard', facts: { measure: 1 } },
    ...(sensitive ? [{ class: 'sensitive' as const, facts: { measure: sensitive, kind: 'personal_or_incident_evidence' } }] : [])]
}

function visibleIncident(state: State, id: string, services: string[]): Incident | null {
  const requested = state.incidents.find(row => row.id === id)
  if (!requested || !incidentWithinServices(state, requested, services)) return null
  const canonical = resolveIncidentAlias(state, id)
  if (!incidentWithinServices(state, canonical, services)) return null
  return requested
}

/** Scope before generators join dependency changes, source evidence or people. */
function scopedState(access: NativeAccess): State {
  const { state, services } = access
  const events = state.events.filter(row => services.includes(row.service))
  const eventIds = new Set(events.map(row => row.id))
  const alerts = state.alerts.filter(row => row.service !== null && services.includes(row.service))
    .map(row => ({ ...row, events: row.events.filter(id => eventIds.has(id)) }))
  const alertIds = new Set(alerts.map(row => row.id))
  return { ...state,
    services: state.services.filter(row => services.includes(row.id))
      .map(row => ({ ...row, dependencies: row.dependencies?.filter(id => services.includes(id)) })),
    incidents: state.incidents.filter(row => visibleIncident(state, row.id, services))
      .map(row => ({ ...row, alerts: row.alerts.filter(id => alertIds.has(id)) })),
    alerts, events,
    changes: state.changes?.filter(row => services.includes(row.service)),
    changeSources: state.changeSources?.filter(row => services.includes(row.service)),
    erasedReportCases: state.erasedReportCases?.filter(row => services.includes(row.service)),
  }
}

function resource(env: Bindings, path: string, name: string, permission: string, read: Reader, admin = false): ResourceDefinition {
  const template = `oncall://${path}`
  const [prefix, suffix] = template.split('{id}')
  return {
    uriTemplate: template, name, mimeType: 'application/json', scope: permission,
    classes: ['standard', 'sensitive'], classify,
    async read(uri: string, ctx: ResourceContext) {
      if (!uri.startsWith(prefix) || !uri.endsWith(suffix)) return null
      const segment = uri.slice(prefix.length, suffix ? -suffix.length : undefined)
      let id: string
      try { id = decodeURIComponent(segment) } catch { return null }
      if (!id || segment.includes('/') || /[/?#]/.test(id)) return null
      try {
        const access = await nativeAccess(env, ctx, permission, undefined, admin)
        const record = await read(access, id)
        if (!record || !access.services.includes(record.service)) return null
        // Generation may await scheduling storage. Re-read native membership,
        // client revision and service grants immediately before disclosing it.
        const current = await nativeAccess(env, ctx, permission, record.service, admin)
        if (current.state.revision !== access.state.revision ||
          access.services.some(service => !current.services.includes(service))) return null
        return { json: record.json, untrusted: true }
      } catch (error) {
        if (error instanceof ToolRefusal || error instanceof Fault && [401, 403, 404].includes(error.status)) return null
        throw error
      }
    },
  }
}

export function oncallResources(env: Bindings): ResourceDefinition[] {
  return [
    resource(env, 'services/{id}', 'Service', 'services:read', (access, id) => {
      const service = access.state.services.find(row => row.id === id && access.services.includes(row.id))
      return service ? { service: id, json: { ...service, dependencies: service.dependencies?.filter(value => access.services.includes(value)) } } : null
    }),
    resource(env, 'incidents/{id}', 'Incident', 'incidents:read', (access, id) => {
      const incident = visibleIncident(access.state, id, access.services)
      return incident ? { service: incident.service, json: incident } : null
    }),
    resource(env, 'incidents/{id}/review-material', 'Incident review material', 'incidents:read', (access, id) => {
      const incident = visibleIncident(access.state, id, access.services)
      return incident ? { service: incident.service, json: reviewMaterial(scopedState(access), id) } : null
    }),
    resource(env, 'services/{id}/changes', 'Recent service changes', 'services:read', (access, id) => {
      if (!access.services.includes(id) || !access.state.services.some(row => row.id === id)) return null
      return { service: id, json: recentChanges(scopedState(access), id, new Date().toISOString(), 24) }
    }),
    resource(env, 'schedules/{id}/coverage', 'Current schedule coverage', 'schedules:read', async (access, id) => {
      const snapshot = await pagingSnapshot(env.DB)
      const schedule = snapshot.archive.schedules.find(row => row.id === id && access.services.includes(row.service))
      if (!schedule || snapshot.workspace.revision !== access.state.revision) return null
      const now = coverage(schedule, snapshot.workspace.members, Date.now())
      const ids = new Set([now.primary, now.backup, ...now.windows.map(window => window.member)])
      const people = snapshot.workspace.members.filter(member => ids.has(member.id))
        .map(({ id, name, active, role }) => ({ id, name, active, role }))
      return { service: schedule.service, json: { paging: 'OFF', service: schedule.service, now, people } }
    }),
    resource(env, 'actions/{id}', 'Incident follow-up', 'actions:read', (access, id) => {
      const incident = access.state.incidents.find(row => row.actions.some(action => action.id === id))
      if (!incident || !visibleIncident(access.state, incident.id, access.services)) return null
      return { service: incident.service, json: { ...incident.actions.find(action => action.id === id)!, incident: incident.id, service: incident.service, revision: incident.revision } }
    }),
    resource(env, 'automation/outbox/{id}', 'Response event delivery record', 'integrations:read', (access, id) => {
      const row = access.state.apiOutbox?.find(item => item.id === id)
      if (!row || !access.services.includes(row.service) || !visibleIncident(access.state, row.incident, access.services)) return null
      const { lease: _lease, leaseUntil: _leaseUntil, ...record } = row
      return { service: row.service, json: record }
    }, true),
  ]
}
