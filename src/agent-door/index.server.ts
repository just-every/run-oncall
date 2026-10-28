import { createAgentDoor } from '../modules/agent-door/index.ts'
import { ownerClaimConfig, type Bindings } from '../auth.server'
import { oncallPeople } from './people'
import { localCredentials, currentScopes, runNativeOperation } from './native'
import { readTools } from './read-tools'
import { coordinationTools } from './coordination-tools'
import { scheduleTools } from './schedule-tools'
import { managementTools } from './management-tools'
import { automationTools } from './automation-tools'
import { oncallResources } from './resources'
import { serviceTools } from './service-tools'

export function oncallTools(env: Bindings) {
  return [...readTools(env), ...serviceTools(env), ...coordinationTools(env), ...scheduleTools(env), ...managementTools(env), ...automationTools(env)].map(tool=>tool.readOnly||tool.widens===false?tool:{...tool,inputSchema:{...tool.inputSchema,properties:{...tool.inputSchema.properties,native_operation:{type:'string',minLength:1,maxLength:100,description:'Opaque retained native API operation, when prepared by the native REST door.'}}},run:(args,ctx)=>runNativeOperation(env,tool.name,args,ctx,()=>tool.run(args,ctx))})
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

