import type { Bindings } from '../auth.server'
import type { ToolContext } from '../modules/agent-door/index.ts'
import { ToolRefusal } from '../modules/agent-door/index.ts'
import { matchingItems, triageQuery } from '../family/response-operations/triage'
import { incidentWithinServices } from '../incident-workflows/scope'
import { resolveIncidentAlias } from '../incident-workflows/relations'
import { changeHash } from '../changes/credentials'
import { canonical } from '../paging-store'
import { nativeAccess, nativeCall } from './native'
import { projectAlert } from './alert-tools'

/** Scope the search input before matching, counting or selecting a page. */
export async function listTriage(env: Bindings, args: Record<string, unknown>, ctx: ToolContext) {
  const query = { ...await nativeCall(() => triageQuery(args)) }
  query.kind ??= 'incidents'
  query.sort ??= 'created'
  if (query.q) query.q = query.q.toLocaleLowerCase().split(/\s+/).filter(Boolean).join(' ')
  const access = await nativeAccess(env, ctx, 'incidents:read', query.service)
  const { state, services } = access
  const incidents = state.incidents.filter(row => incidentWithinServices(state, row, services)
    && incidentWithinServices(state, resolveIncidentAlias(state, row.id), services))
  const events = state.events.filter(row => services.includes(row.service))
  const eventIds = new Set(events.map(row => row.id))
  const linkedAlerts = new Set(state.incidents.flatMap(row => row.alerts))
  const alerts = state.alerts.filter(row => row.service !== null && services.includes(row.service)
    // An alert linked to an excluded incident must not reappear as alert-only.
    && (query.kind !== 'alerts' || !linkedAlerts.has(row.id)))
    .map(row => ({ ...row, events: row.events.filter(id => eventIds.has(id)) }))
  const scoped = { ...state, incidents, alerts, events,
    services: state.services.filter(row => services.includes(row.id)),
    intakeReceipts: state.intakeReceipts?.filter(row => row.service !== null && services.includes(row.service)),
  }
  const rows = matchingItems(scoped, access.member, query)
  const binding = await changeHash(canonical([state.revision, query,
    ctx.person.id, ctx.agent.id, ctx.clientId ?? null, ctx.consent ?? null, [...services].sort()]))
  let offset = 0
  if (args.cursor !== undefined) {
    try {
      const cursor = JSON.parse(atob(String(args.cursor)))
      if (cursor.binding !== binding || !Number.isSafeInteger(cursor.offset)
        || cursor.offset < 1 || cursor.offset >= rows.length) throw new Error()
      offset = cursor.offset
    } catch { throw new ToolRefusal('invalid_cursor') }
  }
  const limit = Number(args.limit ?? 25)
  const items = rows.slice(offset, offset + limit).map(row => {
    if (row.kind === 'alert') return { ...projectAlert(scoped, alerts.find(alert => alert.id === row.id)!),
      kind: row.kind, triageStatus: row.triageStatus }
    const incident = incidents.find(incident => incident.id === row.id)!
    return { ...incident, erasureConfirmation: `erase ${incident.id}`, kind: row.kind, triageStatus: row.triageStatus }
  })
  return { items, total: rows.length, workspaceRevision: state.revision,
    nextCursor: offset + limit < rows.length ? btoa(JSON.stringify({ binding, offset: offset + limit })) : null }
}
