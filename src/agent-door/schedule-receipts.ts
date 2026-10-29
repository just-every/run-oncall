import type { Bindings } from '../auth.server'
import { changeHash } from '../changes/credentials'
import { canonical } from '../paging-store'
import { ToolRefusal, type ToolContext } from '../modules/agent-door/index.ts'
import type { Schedule } from '../family/response-operations/schedules'

interface Receipt {
  person: string; client: string | null; consent: string | null; tool: string
  args_sha256: string; schedule: string; schedule_revision: number
  workspace_revision: number; before_schedule: string; after_schedule: string; current_commit: number
}

/** Called only after the schedule's current native authority has been read. */
export async function completedScheduleChange(env: Bindings, ctx: ToolContext, tool: string, args: Record<string, unknown>, current: Schedule, workspaceRevision: number): Promise<{ schedule: Schedule; next: Schedule } | null> {
  if (!ctx.idempotencyKey) return null
  const receipt = await env.DB.prepare(`SELECT receipt.*, EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=receipt.workspace_token) AS current_commit
    FROM oc_agent_schedule_receipts receipt WHERE agent=? AND key=?`).bind(ctx.agent.id, ctx.idempotencyKey).first<Receipt>()
  if (!receipt) return null
  if (receipt.person !== ctx.person.id || receipt.client !== (ctx.clientId ?? null) || receipt.consent !== (ctx.consent ?? null) || receipt.tool !== tool || receipt.args_sha256 !== await changeHash(canonical(args))) throw new ToolRefusal('idempotency_conflict')
  // A receipt acknowledges only its own committed revision and exact review.
  // Subsequent schedule, membership, erasure or workspace changes require review.
  if (receipt.schedule !== current.id || receipt.schedule_revision !== current.revision || receipt.workspace_revision !== workspaceRevision || !receipt.current_commit) throw new ToolRefusal('revision_conflict')
  return { schedule: JSON.parse(receipt.before_schedule) as Schedule, next: JSON.parse(receipt.after_schedule) as Schedule }
}

/** Join the real schedule and workspace CAS; a rolled-back effect has no receipt. */
export async function scheduleReceipt(env: Bindings, ctx: ToolContext, tool: string, args: Record<string, unknown>, before: Schedule, next: Schedule, workspaceRevision: number) {
  if (!ctx.idempotencyKey) throw new ToolRefusal('idempotency_key_required')
  const digest = await changeHash(canonical(args))
  return (token: string) => env.DB.prepare(`INSERT INTO oc_agent_schedule_receipts(agent,key,person,client,consent,tool,args_sha256,schedule,schedule_revision,workspace_revision,workspace_token,operation,before_schedule,after_schedule)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)`)
    .bind(ctx.agent.id, ctx.idempotencyKey, ctx.person.id, ctx.clientId ?? null, ctx.consent ?? null, tool, digest, next.id, next.revision, workspaceRevision + 1, token, ctx.operationId, JSON.stringify(before), JSON.stringify(next), token)
}
