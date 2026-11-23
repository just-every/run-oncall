import { pagingSnapshot } from '../paging-store'
import { workspaceWrite } from '../workspace-store'
import { responseContext } from '../manual-pages/context'
import { fireDeadline, stopRecoveredDeadlines } from './model'
import type { CallResult } from '../modules/agent-door/index.ts'
import type { AgentDeadlineArgs, DeadlinePrincipal } from '../agent-door/deadlines'

export type InvokeAgentDeadline = (args: AgentDeadlineArgs, principal: DeadlinePrincipal) => Promise<CallResult>

/** Agent-origin work requires fresh typed admission; an absent callback never fires it. */
export async function sweepDeadlines(db: D1Database, invoke?: InvokeAgentDeadline) {
  const at = new Date(Date.now()).toISOString()
  let agentFired = 0
  if (invoke) {
    const due = (await db.prepare(`SELECT d.incident,d.deadline,json_extract(i.data,'$.revision') AS revision,origin.principal
      FROM oc_pending_incident_deadlines d
      CROSS JOIN oc_agent_deadlines origin ON origin.deadline=d.deadline
      CROSS JOIN oc_incidents i ON i.id=d.incident
      WHERE d.due_at<=julianday(?) ORDER BY d.due_at,d.deadline LIMIT 100`).bind(at).all<AgentDeadlineArgs & { principal: string }>()).results
    for (const row of due) {
      const result = await invoke({ incident: row.incident, deadline: row.deadline, revision: row.revision }, JSON.parse(row.principal) as DeadlinePrincipal)
      if (result.outcome === 'done') agentFired++
    }
  }
  const humanDue = `FROM oc_pending_incident_deadlines d WHERE d.due_at<=julianday(?)
    AND NOT EXISTS(SELECT 1 FROM oc_agent_deadlines origin WHERE origin.deadline=d.deadline)`
  if (!await db.prepare(`SELECT 1 ${humanDue} LIMIT 1`).bind(at).first()) return { fired: agentFired }
  // Every admitted agent action has its own native CAS. Human work then starts
  // from a fresh snapshot, independently of policy refusal or Pause above.
  const snapshot = await pagingSnapshot(db), state = snapshot.workspace, revision = state.revision
  const due = (await db.prepare(`SELECT d.deadline ${humanDue}`).bind(at).all<{ deadline: string }>()).results
  const human = new Set(due.map(row => row.deadline))
  const before = JSON.stringify(state.incidents)
  stopRecoveredDeadlines(state, at)
  const context = responseContext(snapshot, Date.parse(at))
  let fired = 0
  for (const incident of state.incidents) for (const deadline of incident.deadlines ?? []) if (human.has(deadline.id) && fireDeadline(state, incident, deadline, at, context)) fired++
  if (before === JSON.stringify(state.incidents)) return { fired: agentFired }
  const results = await db.batch(workspaceWrite(db, state, revision, { sql: 'EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)', values: [snapshot.revision] }))
  return { fired: agentFired + (results[0].meta.changes === 1 ? fired : 0) }
}
