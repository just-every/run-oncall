import type { Bindings } from '../auth.server'
import { auditIdentity } from '../audit-store'
import { command, fail, type Member } from '../family/response-operations/domain'
import { editTeam, type Team } from '../teams/model'
import { eraseSubject, type SubjectErasureInput } from '../subject-erasure'
import { nativeImportErasureContext } from '../move-in/native-erasure'
import { subjectErasureIdentity } from '../subject-erasure-identity'
import { defineTool, type JsonSchema, type ToolContext, type ToolDefinition } from '../modules/agent-door/index.ts'
import { nativeAccess, nativeActor, nativeAudit, nativeCall, persistNative, type NativeAccess } from './native'

type Args = Record<string, unknown>
const string = (maxLength = 100): JsonSchema => ({ type: 'string', minLength: 1, maxLength })
const revision: JsonSchema = { type: 'integer', minimum: 0 }
const ids: JsonSchema = { type: 'array', items: string(), maxItems: 1000, uniqueItems: true }
const memberOutput: JsonSchema = { type: 'object', properties: { id: string(), name: string(), role: { enum: ['admin', 'responder', 'viewer', 'stakeholder'] }, active: { type: 'boolean' } }, required: ['id', 'name', 'role', 'active'] }
const teamOutput: JsonSchema = { type: 'object', properties: { id: string(), name: string(200), revision, visibility: { enum: ['public'] }, active: { type: 'boolean' }, members: ids, managers: ids }, required: ['id', 'name', 'revision', 'visibility', 'active', 'members', 'managers'] }
const revokedOutput: JsonSchema = { type: 'object', properties: { id: string(), name: string(), active: { const: false }, revision }, required: ['id', 'name', 'active', 'revision'] }
const erasureOutput: JsonSchema = { type: 'object', properties: { state: { enum: ['complete'] }, stores: { type: 'object' }, standby: { enum: ['not-reconciled'] }, repeated: { type: 'boolean' }, outstanding: { type: 'array', items: { type: 'object' } }, importCustody: { type: 'object' } }, required: ['state', 'stores', 'standby'] }
const rank: Record<Member['role'], number> = { stakeholder: 0, viewer: 1, responder: 2, admin: 3 }
const uri = (path: string, id: string) => `oncall://${path}/${encodeURIComponent(id)}`

function requireRevision(actual: number, expected: unknown) {
  if (actual !== expected) fail('Native revision changed; reload before applying', 409)
}

/** Authorization uses the current person; the record of the act uses the agent. */
function recordAgent(access: NativeAccess, ctx: ToolContext, kind: string, text: string) {
  const actor = nativeActor(access, ctx)
  const agent = JSON.parse(JSON.stringify({ ...actor.agent!, approvers: ctx.approvers.map(({ id, name }) => ({ id, name })) })) as NonNullable<Member['agent']>
  access.state.audit.push({ id: crypto.randomUUID(), at: new Date(ctx.now()).toISOString(), actor: actor.id, kind, text, metadata: { agent } })
}

function accessTool(env: Bindings): ToolDefinition {
  const current = async (args: Args, ctx: ToolContext) => {
    const access = await nativeAccess(env, ctx, 'access:write', undefined, true)
    const target = access.state.members.find(member => member.id === args.id)
    if (!target) fail('Unknown member', 404)
    return { access, target }
  }
  const widens = (target: Member, args: Args) => args.active===true&&(!target.active||rank[args.role as Member['role']] > rank[target.role])
  return defineTool({
    name: 'oncall.access.update', title: 'Change member access',
    description: 'Change an existing native member’s role and active access using a current administrator sponsor. Local service-account clients cannot manage members. Revision is the current workspace revision; no invitation is sent.',
    scope: 'access:write', readOnly: false, classes: ['access'], clauses: ['OC-003', 'OC-041', 'OC-053'], untrusted: true,
    inputSchema: { type: 'object', additionalProperties: false, properties: { id: string(), revision, role: { enum: ['admin', 'responder', 'viewer', 'stakeholder'] }, active: { type: 'boolean' } }, required: ['id', 'revision', 'role', 'active'] },
    outputSchema: memberOutput,
    classify: (args, ctx) => nativeCall(async () => { const { target } = await current(args, ctx); return [{ class: 'access', facts: { measure: 1, direction: widens(target, args) ? 'widens' : 'narrows' } }] }),
    authority: (args, ctx) => nativeCall(async () => { const { target } = await current(args, ctx); return { subject: target.id, widens: widens(target, args) } }),
    target: (args, ctx) => nativeCall(async () => ({ kind: 'member', id: (await current(args, ctx)).target.id })),
    revision: (args, ctx) => nativeCall(async () => (await current(args, ctx)).access.state.revision),
    summary: (args, ctx) => nativeCall(async () => {
      const { access, target } = await current(args, ctx)
      return { target: { id: target.id, name: target.name }, role: String(args.role), items: [`Role: ${target.role} → ${args.role}`, `Access: ${target.active ? 'active' : 'revoked'} → ${args.active ? 'active' : 'revoked'}`, `Workspace revision ${access.state.revision}`] }
    }),
    run: (args, ctx) => nativeCall(async () => {
      const { access, target } = await current(args, ctx)
      requireRevision(access.state.revision, args.revision)
      const actor = nativeActor(access, ctx)
      actor.agent = { ...actor.agent!, approvers: ctx.approvers.map(({ id, name }) => ({ id, name })) }
      command(access.state, actor, { type: 'member', id: target.id, role: args.role, active: args.active }, new Date(ctx.now()).toISOString())
      nativeAudit(env, ctx, 'member', target.id)
      auditIdentity(env.DB, { subject: { kind: 'member', id: target.id } })
      await persistNative(env, access)
      const resource = uri('members', target.id)
      ctx.emit('access.updated', resource, { member: target.id })
      return { result: target, resources: [{ uri: resource, name: target.name }] }
    }),
  })
}

function teamsTool(env: Bindings): ToolDefinition {
  const current = async (args: Args, ctx: ToolContext) => {
    const access = await nativeAccess(env, ctx, 'teams:write', undefined, true)
    const target = args.id === undefined ? undefined : access.state.teams?.find(team => team.id === args.id)
    // Run the native validator on an isolated candidate during classification,
    // so policy sees the actual accepted team rather than caller assertions.
    const candidate = { ...access.state, teams: access.state.teams?.map(team => ({ ...team, members: [...team.members], managers: [...team.managers] })) }
    const team = editTeam(candidate, access.member, args)
    const prior = new Set(target?.active ? target.managers : [])
    const gains = team.active ? team.managers.filter(id => !prior.has(id)&&access.state.members.some(member=>member.id===id&&member.active&&member.role==='responder')) : []
    return { access, target, team, gains }
  }
  return defineTool({
    name: 'oncall.teams.update', title: 'Save a public team',
    description: 'Create or edit a native public team as a current administrator. Revision is the team revision, or zero for a new team. Manager grants are access changes; private teams and invitations are unavailable.',
    scope: 'teams:write', readOnly: false, classes: ['standard', 'access'], clauses: ['OC-023', 'OC-041'], untrusted: true,
    inputSchema: { type: 'object', additionalProperties: false, properties: { id: string(), revision, name: string(200), visibility: { enum: ['public'] }, active: { type: 'boolean' }, members: ids, managers: ids }, required: ['revision', 'name', 'visibility', 'active', 'members', 'managers'] },
    outputSchema: teamOutput,
    classify: (args, ctx) => nativeCall(async () => {
      const { gains } = await current(args, ctx)
      return gains.length ? [{ class: 'access', facts: { measure: gains.length, direction: 'widens' } }] : [{ class: 'standard', facts: { measure: 1 } }]
    }),
    authority: (args, ctx) => nativeCall(async () => {
      const { target, gains } = await current(args, ctx)
      return { subject: gains.includes(ctx.person.id) ? ctx.person.id : gains.includes(ctx.agent.id) ? ctx.agent.id : gains[0] ?? target?.id ?? 'new-public-team', widens: gains.length > 0 }
    }),
    target: (args, ctx) => nativeCall(async () => { const { target } = await current(args, ctx); return target ? { kind: 'team', id: target.id } : null }),
    revision: (args, ctx) => nativeCall(async () => (await current(args, ctx)).target?.revision ?? 0),
    summary: (args, ctx) => nativeCall(async () => {
      const { target, team, gains } = await current(args, ctx)
      return { target: { ...(args.id !== undefined ? { id: team.id } : {}), name: team.name }, items: [`Public team: ${team.active ? 'active' : 'archived'}`, `Revision ${target?.revision ?? 0}`, `Members: ${team.members.join(', ') || 'none'}`, `Managers: ${team.managers.join(', ') || 'none'}`, ...(gains.length ? [`New manager authority: ${gains.join(', ')}`] : [])] }
    }),
    run: (args, ctx) => nativeCall(async () => {
      const { access } = await current(args, ctx)
      const team: Team = editTeam(access.state, access.member, args)
      recordAgent(access, ctx, 'team', `Saved public team ${team.name}`)
      nativeAudit(env, ctx, 'team', team.id)
      await persistNative(env, access)
      const resource = uri('teams', team.id)
      ctx.emit('teams.updated', resource, { team: team.id, revision: team.revision })
      return { result: team, resources: [{ uri: resource, name: team.name }] }
    }),
  })
}

function revokeTool(env: Bindings, kind: 'client' | 'endpoint'): ToolDefinition {
  const plural = kind === 'client' ? 'clients' : 'endpoints'
  const current = async (args: Args, ctx: ToolContext) => {
    const access = await nativeAccess(env, ctx, `${plural}:write`, undefined, true)
    const target = (kind === 'client' ? access.state.apiClients : access.state.apiEndpoints)?.find(row => row.id === args.id)
    if (!target) fail(`Unknown ${kind}`, 404)
    return { access, target }
  }
  return defineTool({
    name: `oncall.${plural}.update`, title: `Revoke an API ${kind}`,
    description: `Revoke an existing native ${kind} and delete its local credential in the same transaction. This only narrows authority. Creating, rotating or revealing secrets remains on person-only native screens. Revocation cannot recall bytes already sent.`,
    scope: `${plural}:write`, readOnly: false, classes: ['access'], clauses: ['OC-041', 'OC-053'], untrusted: true,
    widens: false, narrowing: { effect: 'revoke', target: 'id' },
    inputSchema: { type: 'object', additionalProperties: false, properties: { id: string() }, required: ['id'] }, outputSchema: revokedOutput,
    classify: (args, ctx) => nativeCall(async () => { await current(args, ctx); return [{ class: 'access', facts: { measure: 1, direction: 'narrows' } }] }),
    authority: (args, ctx) => nativeCall(async () => ({ subject: (await current(args, ctx)).target.id, widens: false })),
    target: (args, ctx) => nativeCall(async () => ({ kind, id: (await current(args, ctx)).target.id })),
    revision: (args, ctx) => nativeCall(async () => (await current(args, ctx)).target.revision),
    summary: (args, ctx) => nativeCall(async () => {
      const { target } = await current(args, ctx)
      return { target: { id: target.id, name: target.name }, items: [`Revoke ${kind}`, `Revision ${target.revision}`, 'Delete the installation-local credential; already sent bytes remain with recipients.'] }
    }),
    run: (args, ctx) => nativeCall(async () => {
      const { access, target } = await current(args, ctx)
      target.active = false
      target.revision++
      recordAgent(access, ctx, `automation.${kind}-revoke`, `Revoked ${kind} ${target.name}`)
      nativeAudit(env, ctx, `automation.${kind}-revoke`, target.id)
      auditIdentity(env.DB, { subject: { kind: kind === 'client' ? 'api-client' : 'endpoint', id: target.id } })
      const table = kind === 'client' ? 'oc_api_credentials' : 'oc_endpoint_credentials'
      await persistNative(env, access, token => [env.DB.prepare(`DELETE FROM ${table} WHERE ${kind}=? AND EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)`).bind(target.id, token)])
      const resource = uri(`automation/${plural}`, target.id)
      ctx.emit(`${plural}.revoked`, resource, { id: target.id, revision: target.revision })
      return { result: target, resources: [{ uri: resource, name: target.name }] }
    }),
  })
}

const erasureKinds = ['incident', 'member', 'email-list', 'email', 'client', 'endpoint', 'native', 'intake', 'change']
function privacyTool(env: Bindings): ToolDefinition {
  const current = async (args: Args, ctx: ToolContext) => {
    const access = await nativeAccess(env, ctx, 'privacy:write', undefined, true)
    const id = String(args.id), kind = String(args.kind), state = access.state
    let target: { id: string; name?: string; title?: string } | undefined
    switch (kind) {
      case 'incident': target = state.incidents.find(row => row.id === id); break
      case 'member': target = state.members.find(row => row.id === id); break
      case 'client': target = state.apiClients?.find(row => row.id === id); break
      case 'endpoint': target = state.apiEndpoints?.find(row => row.id === id); break
      case 'email': target = state.emailAddresses?.find(row => row.id === id); break
      case 'intake': target = state.intakeSources?.find(row => row.id === id); break
      case 'change': target = state.changeSources?.find(row => row.id === id); break
      case 'email-list': target = state.businessServices?.flatMap(row => row.emailLists ?? []).find(row => row.id === id); break
      case 'native': target = await env.DB.prepare('SELECT id FROM sources WHERE id=?').bind(id).first<{ id: string }>() ?? undefined; break
    }
    if (!target) fail('Unknown erasure subject', 404)
    return { access, target, kind, id }
  }
  return defineTool({
    name: 'oncall.privacy.erase', title: 'Erase a native subject',
    description: 'Irreversibly erase a native subject and its owned local and imported custody with the native transaction and counts receipt. Requires the exact confirmation “erase <id>” and current workspaceRevision; member erasure also requires explicit retained importedPeople selection and identitiesReviewed. The confirmation is an agent request, never a human approval. Own-sponsor erasure, owner-identity erasure and sending or uncertain delivery remain refused. External or standby deletion is not claimed. There is no Undo.',
    scope: 'privacy:write', readOnly: false, classes: ['destructive'], clauses: ['OC-040', 'OC-041', 'OC-052'], untrusted: true,
    inputSchema: { type: 'object', additionalProperties: false, properties: { kind: { enum: erasureKinds }, id: string(), workspaceRevision: revision, confirmation: string(110), identitiesReviewed: { type: 'boolean' }, importedPeople: { type: 'array', items: string(254), maxItems: 1000, uniqueItems: true } }, required: ['kind', 'id', 'workspaceRevision', 'confirmation'] },
    outputSchema: erasureOutput,
    classify: (args, ctx) => nativeCall(async () => { await current(args, ctx); return [{ class: 'destructive', facts: { measure: 1 } }] }),
    authority: (args, ctx) => nativeCall(async () => ({ subject: (await current(args, ctx)).id, widens: false })),
    target: (args, ctx) => nativeCall(async () => { const { kind, id } = await current(args, ctx); return { kind: 'erasure', id: await subjectErasureIdentity(kind, id) } }),
    revision: (args, ctx) => nativeCall(async () => (await current(args, ctx)).access.state.revision),
    summary: (args, ctx) => nativeCall(async () => {
      const { access, target, kind, id } = await current(args, ctx)
      return { target: { id, ...(target.name || target.title ? { name: target.name ?? target.title } : {}) }, items: [`Irreversibly erase ${kind} ${id}`, `Workspace revision ${access.state.revision}`, ...(kind === 'member' ? [`Imported identities selected: ${JSON.stringify(args.importedPeople ?? [])}`] : []), 'Includes owned local copies, credentials and import custody; no Undo, no remote deletion claim.'] }
    }),
    run: (args, ctx) => nativeCall(async () => {
      const { access, kind, id } = await current(args, ctx)
      const actor = nativeActor(access, ctx)
      actor.agent = { ...actor.agent!, approvers: ctx.approvers.map(({ id, name }) => ({ id, name })) }
      nativeAudit(env, ctx, `${kind}.erase`, id)
      const importContext = nativeImportErasureContext(env.DB, access.member.id, () => ({ sql: access.guard.sql, params: access.guard.values }))
      const input: SubjectErasureInput = { confirmation: args.confirmation as string, workspaceRevision: args.workspaceRevision as number, identitiesReviewed: args.identitiesReviewed as boolean | undefined, importedPeople: args.importedPeople as string[] | undefined }
      const result = await eraseSubject({ db: env.DB, state: access.state, actor, guard: access.guard, input, kind, id, importContext })
      const resource = uri('erasures', await subjectErasureIdentity(kind,id))
      ctx.emit('privacy.erased', resource, { kind, id, state: result.state })
      return { result, resources: [{ uri: resource, name: `Erased ${kind}` }] }
    }),
  })
}

export function managementTools(env: Bindings): ToolDefinition[] {
  return [accessTool(env), teamsTool(env), revokeTool(env, 'client'), revokeTool(env, 'endpoint'), privacyTool(env)]
}
