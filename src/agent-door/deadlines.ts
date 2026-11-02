import type { Bindings } from '../auth.server'
import type { Incident } from '../family/response-operations/domain'
import { fireDeadline, stopRecoveredDeadlines } from '../incident-deadlines/model'
import { responseContext } from '../manual-pages/context'
import { pagingSnapshot } from '../paging-store'
import { ToolRefusal, type ToolContext } from '../modules/agent-door/index.ts'
import { nativeAccess, nativeActor, nativeAudit, nativeCall, persistNative, type NativePrincipal } from './native'

export type AgentDeadlineArgs = { incident: string; deadline: string; revision: number }
export type DeadlinePrincipal = NativePrincipal & { consent?: string }

/** A due deadline re-enters the same policy door before any native re-trigger. */
export async function expireAgentDeadline(env: Bindings, args: Record<string, unknown>, ctx: ToolContext): Promise<{ result: Incident; resources: { uri: string; name: string }[] }> {
  return nativeCall(async () => {
    const access = await nativeAccess(env, ctx, 'incidents:write')
    const snapshot = await pagingSnapshot(env.DB)
    if (snapshot.workspace.revision !== access.state.revision) throw new ToolRefusal('revision_conflict')
    access.state = snapshot.workspace
    const incident = access.state.incidents.find(row => row.id === args.incident && access.services.includes(row.service))
    if (!incident) throw new ToolRefusal('not_found')
    if (!Number.isSafeInteger(args.revision) || incident.revision !== args.revision) throw new ToolRefusal('revision_conflict')
    const deadline = incident.deadlines?.find(row => row.id === args.deadline)
    if (!deadline) throw new ToolRefusal('not_found')
    const binding = await env.DB.prepare('SELECT principal FROM oc_agent_deadlines WHERE deadline=?').bind(deadline.id).first<{ principal: string }>()
    if (!binding) throw new ToolRefusal('not_found')
    const origin = JSON.parse(binding.principal) as DeadlinePrincipal
    if (origin.person?.id !== ctx.person.id || origin.agent?.id !== ctx.agent.id || (origin.consent ?? null) !== (ctx.consent ?? null) || (origin.clientId ?? null) !== (ctx.clientId ?? null)) throw new ToolRefusal('native_authority_required')
    if (access.client && !origin.scopes?.includes(`oncall-client-revision:${access.client.revision}`)) throw new ToolRefusal('unauthenticated')
    const actor = nativeActor(access, ctx)
    const created = incident.timeline.find(entry => entry.id === `deadline:${deadline.id}` && entry.actor === deadline.actor)
    const createdBy = created?.metadata?.agent
    if (deadline.actor !== actor.id || !createdBy || createdBy.agent.id !== ctx.agent.id || createdBy.sponsor !== ctx.person.id) throw new ToolRefusal('native_authority_required')
    const now = ctx.now(), at = new Date(now).toISOString()
    if (deadline.state !== 'pending' || !Number.isFinite(Date.parse(deadline.dueAt)) || Date.parse(deadline.dueAt) > now) throw new ToolRefusal('revision_conflict', 'Deadline is stopped or not yet due')
    // Source recovery and resolution retain their native stopping authority.
    stopRecoveredDeadlines(access.state, at)
    if (!fireDeadline(access.state, incident, deadline, at, responseContext(snapshot, now))) throw new ToolRefusal('revision_conflict', 'Deadline no longer has authority to re-trigger')
    const entry = incident.timeline.find(row => row.id === `deadline-fired:${deadline.id}`)!
    entry.actor = actor.id
    entry.metadata = { ...entry.metadata, agent: JSON.parse(JSON.stringify(actor.agent)) }
    access.guard.sql += ' AND EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?) AND EXISTS(SELECT 1 FROM oc_agent_deadlines WHERE deadline=? AND principal=?)'
    access.guard.values.push(snapshot.revision, deadline.id, binding.principal)
    nativeAudit(env, ctx, 'incident.deadline-expire', incident.id)
    await persistNative(env, access)
    const uri = `oncall://incidents/${encodeURIComponent(incident.id)}`
    ctx.emit('incident.deadline-expired', uri, { incident: incident.id, deadline: deadline.id, revision: incident.revision, paging: 'OFF' })
    return { result: incident, resources: [{ uri, name: incident.title }] }
  })
}
