import { createAgentDoor } from '../modules/agent-door/index.ts'
import { ownerClaimConfig, type Bindings } from '../auth.server'
import { oncallPeople } from './people'
import { localCredentials, currentScopes } from './native'
import { readTools } from './read-tools'
import { coordinationTools } from './coordination-tools'
import { scheduleTools } from './schedule-tools'
import { managementTools } from './management-tools'
import { automationTools } from './automation-tools'
import { oncallResources } from './resources'
import { serviceTools } from './service-tools'

export function oncallTools(env: Bindings) {
  return [...readTools(env), ...serviceTools(env), ...coordinationTools(env), ...scheduleTools(env), ...managementTools(env), ...automationTools(env)]
}
export const oncallNotTools = [
  { clauses: ['OC-029'], reason: 'device' as const },
  { clauses: ['OC-003', 'OC-036', 'OC-049'], reason: 'screen' as const },
  { clauses: ['OC-001', 'OC-065', 'OC-070'], reason: 'connector' as const },
  { clauses: ['OC-007', 'OC-038', 'OC-052'], reason: 'import-door' as const },
  { clauses: ['OC-010', 'OC-016'], reason: 'installation' as const },
]

/** All MCP, embedded and durable agent work shares this native composition. */
export function oncallAgentDoor(env: Bindings) {
  const claim = ownerClaimConfig(env)
  return createAgentDoor({
    seed: 'oncall', name: 'Oncall', specialist: 'oncall-responder', db: env.DB, origin: env.AUTH_ORIGIN,
    trust: claim ? { issuer: claim.issuer, installationId: claim.installationId, appOrigin: claim.appOrigin, publicKeys: claim.publicKeys } : null,
    people: oncallPeople(env), tools: oncallTools(env), resources: oncallResources(env), notTools: oncallNotTools,
    localCredentials: request => localCredentials(env, request), currentScopes: principal => currentScopes(env, principal),
    prompts: [{ name: 'oncall-responder', title: 'Coordinate beside the existing pager', description: 'Read a selected service and real coverage; coordinate an incident, submit follow-up evidence and inspect a minimal signed event outcome. Paging is OFF.', clauses: ['OC-003', 'OC-004', 'OC-036', 'OC-053'], messages: () => [{ role: 'user', content: { type: 'text', text: 'Read the selected service, copied runbook, current changes and coverage first. Preserve alert generations, observed recovery and assertions separately. Name an active responder for acknowledgment; keep your agent identity. Submit human-review follow-up evidence without accepting it. Review the exact coverage digest before applying. Dispatch only an existing authorized minimal event, inspect its authenticated receipt or uncertainty, and never resend uncertain work. Follow current company policy and native scopes. No paging, remediation executor, invitations, private teams or money-moving capability exists.' } }] }],
  })
}

export async function dispatchAgentOutbox(env: Bindings) {
  const rows = (await env.DB.prepare(`SELECT o.data,c.principal FROM oc_api_outbox o JOIN oc_agent_outbox c ON c.outbox=o.id
    WHERE json_extract(o.data,'$.status') IN ('queued','failed') AND json_extract(o.data,'$.authorized')=1
    ORDER BY o.rowid LIMIT 10`).all<{ data: string; principal: string }>()).results
  const door = oncallAgentDoor(env)
  for (const row of rows) {
    const item = JSON.parse(row.data), who = JSON.parse(row.principal)
    await door.invoke('oncall.automation.dispatch', { id: item.id, revision: item.revision, idempotency_key: `outbox-${item.id}-${item.revision}` }, who)
  }
}
