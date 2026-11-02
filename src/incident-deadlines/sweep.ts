import { pagingSnapshot } from '../paging-store'
import { workspaceWrite } from '../workspace-store'
import { responseContext } from '../manual-pages/context'
import { fireDeadline, stopRecoveredDeadlines } from './model'
import type { CallResult } from '../modules/agent-door/index.ts'
import type { AgentDeadlineArgs, DeadlinePrincipal } from '../agent-door/deadlines'

export type InvokeAgentDeadline = (args: AgentDeadlineArgs, principal: DeadlinePrincipal) => Promise<CallResult>

/** Agent-origin work requires fresh typed admission; an absent callback never fires it. */
export async function sweepDeadlines(db: D1Database, invoke?: InvokeAgentDeadline) {
  const at = new Date(Date.now()).toISOString(), admitted = new Set<string>()
  if (invoke) {
    const due = (await db.prepare(`SELECT incident.id AS incident,origin.deadline,json_extract(incident.data,'$.revision') AS revision,origin.principal
      FROM oc_agent_deadlines origin JOIN oc_incidents incident
      JOIN json_each(incident.data,'$.deadlines') deadline ON json_extract(deadline.value,'$.id')=origin.deadline
      WHERE json_extract(deadline.value,'$.state')='pending' AND julianday(json_extract(deadline.value,'$.dueAt'))<=julianday(?)
      ORDER BY json_extract(deadline.value,'$.dueAt'),origin.deadline LIMIT 100`).bind(at).all<AgentDeadlineArgs & { principal: string }>()).results
    for (const row of due) {
      const result = await invoke({ incident: row.incident, deadline: row.deadline, revision: row.revision }, JSON.parse(row.principal) as DeadlinePrincipal)
      if (result.outcome === 'done') admitted.add(row.deadline)
    }
  }
  // Every admitted agent action has its own native CAS. Human work then starts
  // from a fresh snapshot, independently of policy refusal or Pause above.
  const snapshot = await pagingSnapshot(db), state = snapshot.workspace, revision = state.revision
  const bindings = (await db.prepare('SELECT deadline FROM oc_agent_deadlines').all<{ deadline: string }>()).results
  const bound = new Set(bindings.map(row => row.deadline))
  const agentFired = state.incidents.reduce((count, incident) => count + (incident.deadlines ?? []).filter(deadline => admitted.has(deadline.id) && deadline.state === 'fired').length, 0)
  const before = JSON.stringify(state.incidents)
  stopRecoveredDeadlines(state, at)
  const context = responseContext(snapshot, Date.parse(at))
  let fired = 0
  for (const incident of state.incidents) for (const deadline of incident.deadlines ?? []) if (!bound.has(deadline.id) && fireDeadline(state, incident, deadline, at, context)) fired++
  if (before === JSON.stringify(state.incidents)) return { fired: agentFired }
  const results = await db.batch(workspaceWrite(db, state, revision, { sql: 'EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)', values: [snapshot.revision] }))
  return { fired: agentFired + (results[0].meta.changes === 1 ? fired : 0) }
}
