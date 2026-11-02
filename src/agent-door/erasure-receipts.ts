import type { Bindings } from '../auth.server'
import { changeHash } from '../changes/credentials'
import { canonical } from '../paging-store'
import { subjectErasureIdentity } from '../subject-erasure-identity'
import { ToolRefusal, type ToolContext } from '../modules/agent-door/index.ts'
import { nativeAccess } from './native'
import { oncallPeople } from './people'

const tool = 'oncall.privacy.erase'
type Args = Record<string, unknown>
interface Receipt {
  person: string; client: string | null; consent: string | null; approval: string | null
  args_sha256: string; target_sha256: string; requested_revision: number
  workspace_revision: number; current_commit: number
}

/** Admission metadata only: Base alone owns approval state and cached outcomes. */
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

/** Run inside classify even when preparation and the erased target are gone. */
export async function completedErasure(env: Bindings, ctx: ToolContext, args: Args) {
  const access = await nativeAccess(env, ctx, 'privacy:write', undefined, true)
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
    FROM oc_agent_erasure_receipts receipt WHERE agent=? AND key_sha256=?`)
    .bind(ctx.agent.id, await changeHash(ctx.idempotencyKey)).first<Receipt>()
  if (!receipt) throw new ToolRefusal('not_found')
  if (receipt.person !== ctx.person.id || receipt.client !== (ctx.clientId ?? null) || receipt.consent !== (ctx.consent ?? null)
    || receipt.args_sha256 !== await changeHash(canonical(args)) || receipt.target_sha256 !== await subjectErasureIdentity(String(args.kind), String(args.id))
    || receipt.requested_revision !== args.workspaceRevision || receipt.approval !== await approvalId(env, ctx, args)) throw new ToolRefusal('idempotency_conflict')
  if (!receipt.current_commit || receipt.workspace_revision !== access.state.revision) throw new ToolRefusal('revision_conflict')
  // One retained, committed native subject erasure is one destructive item.
  return [{ class: 'destructive' as const, facts: { measure: 1 } }]
}

/** The erasure batch's CAS guard precedes this insert; rollback removes both. */
export async function erasureReceipt(env: Bindings, ctx: ToolContext, args: Args) {
  if (!ctx.idempotencyKey) throw new ToolRefusal('idempotency_key_required')
  const approval = await approvalId(env, ctx, args)
  if (ctx.approvers.length && !approval) throw new ToolRefusal('approval_required')
  return env.DB.prepare(`INSERT INTO oc_agent_erasure_receipts
    (agent,key_sha256,person,client,consent,approval,operation,args_sha256,target_sha256,requested_revision,workspace,workspace_revision,workspace_token)
    SELECT ?,?,?,?,?,?,?,?,?,?,p.source_identity,w.revision,w.write_token
    FROM workspace_control w JOIN rer_portability_state p ON p.id=w.id WHERE w.id=1 AND w.revision=?`)
    .bind(ctx.agent.id, await changeHash(ctx.idempotencyKey), ctx.person.id, ctx.clientId ?? null, ctx.consent ?? null, approval,
      ctx.operationId, await changeHash(canonical(args)), await subjectErasureIdentity(String(args.kind), String(args.id)), args.workspaceRevision,
      Number(args.workspaceRevision) + 1)
}
