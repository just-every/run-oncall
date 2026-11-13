import type { Bindings } from '../auth.server'
import { ToolRefusal, type ToolContext } from '../modules/agent-door/index.ts'
import { pagingSnapshot } from '../paging-store'
import { responseReport } from '../reviews/report'
import { coverageLoad } from '../reviews/load'
import { alertNoise } from '../reviews/noise'
import { nativeAccess } from './native'
import { scopedState } from './resources'
import { incidentWithinServices } from '../incident-workflows/scope'

/** Existing REST counts and native report views share the same analytics grant. */
export async function readAnalytics(env: Bindings, args: Record<string, unknown>, ctx: ToolContext) {
  const access = await nativeAccess(env, ctx, 'analytics:read', args.service)
  if (args.view === undefined) {
    if (Object.keys(args).length) throw new ToolRefusal('invalid_arguments')
    // Keep the OC-053 REST response and its class unchanged.
    return access.state.services.filter(row => access.services.includes(row.id)).map(service => {
      const rows = access.state.incidents.filter(row => row.service === service.id && incidentWithinServices(access.state, row, access.services))
      return { service: service.id, incidents: rows.length, open: rows.filter(row => row.state !== 'resolved').length,
        followups: rows.flatMap(row => row.actions).filter(row => !row.done).length }
    })
  }
  if (args.view === 'readiness') {
    if (Object.keys(args).some(key => key !== 'view')) throw new ToolRefusal('invalid_arguments')
    // Signals and matrix observations are workspace-wide. Refuse before assembly
    // without disclosing a service, a count or whether any observation exists.
    if (!access.state.services.every(row => access.services.includes(row.id))) throw new ToolRefusal('not_found')
    const { assembleReadiness } = await import('../readiness/api')
    const report = await assembleReadiness(env)
    const current = await nativeAccess(env, ctx, 'analytics:read')
    if (current.state.revision !== access.state.revision ||
        !current.state.services.every(row => current.services.includes(row.id))) throw new ToolRefusal('not_found')
    return report
  }
  if (args.view !== 'response') throw new ToolRefusal('invalid_arguments')
  if (args.at !== undefined && (typeof args.at !== 'string' || !Number.isFinite(Date.parse(args.at)) || Date.parse(args.at) > Date.now()))
    throw new ToolRefusal('invalid_arguments')
  // Use one native paging snapshot, then scope before any report or coverage
  // generator can join incidents, alerts, schedules or responder hours.
  const snapshot = await pagingSnapshot(env.DB)
  if (snapshot.workspace.revision !== access.state.revision) throw new ToolRefusal('revision_conflict')
  const state = scopedState({ ...access, state: snapshot.workspace })
  const input = Object.fromEntries(['from', 'to', 'service'].filter(key => args[key] !== undefined).map(key => [key, args[key]]))
  const report = responseReport(state, input, args.at as string | undefined)
  const result = { ...report,
    load: coverageLoad(state, { revision: snapshot.revision,
      schedules: snapshot.archive.schedules.filter(row => access.services.includes(row.service)) }, report),
    noise: alertNoise(state, report) }
  const current = await nativeAccess(env, ctx, 'analytics:read', args.service)
  if (current.state.revision !== state.revision || access.services.some(id => !current.services.includes(id)))
    throw new ToolRefusal('revision_conflict')
  return result
}
