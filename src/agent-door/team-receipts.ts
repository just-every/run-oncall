import type { Bindings } from '../auth.server'
import { changeHash } from '../changes/credentials'
import { canonical } from '../paging-store'
import type { Team } from '../teams/model'
import { ToolRefusal, type ClassAndFacts, type ToolContext } from '../modules/agent-door/index.ts'
import { nativeAccess } from './native'
import { oncallPeople } from './people'

const tool = 'oncall.teams.update'
type Args = Record<string, unknown>
interface Receipt {
  person: string; client: string | null; consent: string | null; approval: string | null
  args_sha256: string; team: string; team_sha256: string; requested_revision: number
  team_revision: number; workspace_revision: number; manager_gains: string; current_commit: number
}

export function teamFacts(gains: readonly string[]): ClassAndFacts[] {
  return gains.length ? [{ class: 'access', facts: { measure: gains.length, direction: 'widens' } }] : [{ class: 'standard', facts: { measure: 1 } }]
}

/** Bind admission metadata without taking ownership of Base's saved outcome. */
async function approvalId(env: Bindings, ctx: ToolContext, args: Args) {
  const row = await env.DB.prepare(`SELECT id,saved FROM agent_door_approvals
    WHERE json_extract(saved,'$.principal.agent.id')=? AND json_extract(saved,'$.key')=?
    AND json_extract(saved,'$.tool')=?`).bind(ctx.agent.id, ctx.idempotencyKey, tool)
    .first<{ id: string; saved: string }>()
  if (!row) return null
  const saved = JSON.parse(row.saved)
  if (saved.principal.person.id !== ctx.person.id || (saved.principal.clientId ?? null) !== (ctx.clientId ?? null)
    || (saved.principal.consent ?? null) !== (ctx.consent ?? null) || canonical(saved.args) !== canonical(args)) throw new ToolRefusal('idempotency_conflict')
  return row.id
}

/** A completed effect consumes its revision, never its current authority checks. */
export async function completedTeamChange(env: Bindings, ctx: ToolContext, args: Args, completed: readonly ClassAndFacts[]) {
  const access = await nativeAccess(env, ctx, 'teams:write', undefined, true)
  const person = await oncallPeople(env).person(ctx.person.id)
  if (!person?.active || person.role !== 'admin') throw new ToolRefusal('native_authority_required')
  const policy = await env.DB.prepare('SELECT envelope,local_paused FROM agent_door_state WHERE id=1')
    .first<{ envelope: string | null; local_paused: number }>()
  const envelope = policy?.envelope ? JSON.parse(policy.envelope) : null
  if (policy?.local_paused || envelope?.paused) throw new ToolRefusal('agents_paused')
  if (ctx.consent && envelope?.revoked?.consents.includes(ctx.consent)) throw new ToolRefusal('consent_revoked')
  const agent = await env.DB.prepare('SELECT sponsor,revoked FROM agent_door_agents WHERE id=?')
    .bind(ctx.agent.id).first<{ sponsor: string; revoked: number }>()
  if (!agent || agent.revoked || agent.sponsor !== ctx.person.id || envelope?.revoked?.agents.includes(ctx.agent.id)) throw new ToolRefusal('unauthenticated')
  if (!ctx.idempotencyKey) throw new ToolRefusal('idempotency_key_required')
  const receipt = await env.DB.prepare(`SELECT receipt.*,
    EXISTS(SELECT 1 FROM workspace_control w JOIN rer_portability_state p ON p.id=w.id
      WHERE w.id=1 AND w.write_token=receipt.workspace_token AND p.source_identity=receipt.workspace) AS current_commit
    FROM oc_agent_team_receipts receipt WHERE agent=? AND key_sha256=?`)
    .bind(ctx.agent.id, await changeHash(ctx.idempotencyKey)).first<Receipt>()
  if (!receipt) throw new ToolRefusal('not_found')
  if (receipt.person !== ctx.person.id || receipt.client !== (ctx.clientId ?? null) || receipt.consent !== (ctx.consent ?? null)
    || receipt.args_sha256 !== await changeHash(canonical(args)) || receipt.requested_revision !== args.revision
    || receipt.approval !== await approvalId(env, ctx, args)) throw new ToolRefusal('idempotency_conflict')
  const team = access.state.teams?.find(row => row.id === receipt.team)
  if (!receipt.current_commit || receipt.workspace_revision !== access.state.revision || !team
    || receipt.team_revision !== team.revision || receipt.team_sha256 !== await changeHash(canonical(team))) throw new ToolRefusal('revision_conflict')
  const facts = teamFacts(JSON.parse(receipt.manager_gains) as string[])
  if (canonical(facts) !== canonical(completed)) throw new ToolRefusal('revision_conflict')
  return facts
}

/** The team, permanent audit and receipt share the native workspace CAS batch. */
export async function teamReceipt(env: Bindings, ctx: ToolContext, args: Args, team: Team, gains: string[]) {
  if (!ctx.idempotencyKey) throw new ToolRefusal('idempotency_key_required')
  const approval = await approvalId(env, ctx, args)
  if (ctx.approvers.length && !approval) throw new ToolRefusal('approval_required')
  const key = await changeHash(ctx.idempotencyKey), digest = await changeHash(canonical(args)), effect = await changeHash(canonical(team))
  return (token: string) => [
    // Initialize the lazy installation identity only with a successful native
    // effect, inside the same transaction as its receipt.
    env.DB.prepare(`INSERT OR IGNORE INTO rer_portability_state(id,source_identity)
      SELECT 1,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)`).bind(crypto.randomUUID(), token),
    env.DB.prepare(`INSERT INTO oc_agent_team_receipts
      (agent,key_sha256,person,client,consent,approval,operation,args_sha256,team,team_sha256,requested_revision,team_revision,manager_gains,workspace,workspace_revision,workspace_token)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,p.source_identity,w.revision,w.write_token
      FROM workspace_control w JOIN rer_portability_state p ON p.id=w.id WHERE w.id=1 AND w.write_token=?`)
      .bind(ctx.agent.id, key, ctx.person.id, ctx.clientId ?? null, ctx.consent ?? null, approval, ctx.operationId,
        digest, team.id, effect, args.revision, team.revision, JSON.stringify(gains), token),
  ]
}
