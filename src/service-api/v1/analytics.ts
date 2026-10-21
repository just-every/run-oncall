import type { Incident } from '../../family/response-operations/domain'
import { ApiError } from './errors'

const at = (value: string | undefined, fallback: number, name: string) => {
  if (value === undefined) return fallback
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) throw new ApiError(400, 'invalid_request', `${name} must be an ISO-8601 timestamp`)
  return parsed
}
const mean = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
const median = (values: number[]) => values.length ? [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) / 2)] : null
const count = <T extends string>(values: T[]) => values.reduce<Record<string, number>>((result, value) => ({ ...result, [value]: (result[value] ?? 0) + 1 }), {})

/** Counts and durations over incidents created in the window. Durations come from recorded lifecycle entries; nothing is estimated. */
export function incidentAnalytics(incidents: Incident[], query: { from?: string; to?: string }, now = Date.now()) {
  const to = at(query.to, now, 'to'), from = at(query.from, to - 30 * 86400000, 'from')
  if (from >= to || to - from > 366 * 86400000) throw new ApiError(400, 'invalid_request', 'Choose a window of up to 366 days with from before to')
  const inside = incidents.filter(incident => Date.parse(incident.createdAt) >= from && Date.parse(incident.createdAt) < to)
  const lifecycle = (incident: Incident, state: string) => incident.timeline.find(entry => entry.lifecycle?.to === state)
  const acknowledge = inside.flatMap(incident => { const entry = lifecycle(incident, 'acknowledged'); return entry ? [Date.parse(entry.at) - Date.parse(incident.createdAt)] : [] })
  const resolve = inside.flatMap(incident => { const entry = lifecycle(incident, 'resolved'); return entry ? [Date.parse(entry.at) - Date.parse(incident.createdAt)] : [] })
  const today = new Date(now).toISOString().slice(0, 10), followUps = inside.flatMap(incident => incident.actions)
  return {
    window: { from: new Date(from).toISOString(), to: new Date(to).toISOString() }, incidents: inside.length,
    byState: count(inside.map(incident => incident.state)), bySeverity: count(inside.map(incident => incident.severity)), byService: count(inside.map(incident => incident.service)),
    timeToAcknowledgeMs: { samples: acknowledge.length, mean: mean(acknowledge), median: median(acknowledge) },
    timeToResolveMs: { samples: resolve.length, mean: mean(resolve), median: median(resolve) },
    followUps: { total: followUps.length, open: followUps.filter(action => !action.done).length, overdue: followUps.filter(action => !action.done && action.due.slice(0, 10) < today).length },
    note: 'Durations are measured from incident declaration to the recorded lifecycle entry. Recovery and resolution remain human or automation claims.',
  }
}
