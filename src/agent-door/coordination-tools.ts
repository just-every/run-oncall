import type { Bindings } from '../auth.server'
import { command, fail, type Incident } from '../family/response-operations/domain'
import { defineTool, type JsonSchema, type ToolContext, type ToolDefinition } from '../modules/agent-door/index.ts'
import { nativeAccess, nativeActor, nativeAudit, nativeCall, persistNative } from './native'
import { protectedRecords } from './resources'
import { pagingSnapshot } from '../paging-store'
import { responseContext } from '../manual-pages/context'
import { auditIdentity } from '../audit-store'

const string = (maxLength = 3000): JsonSchema => ({ type: 'string', minLength: 1, maxLength })
const revision: JsonSchema = { type: 'integer', minimum: 0 }
const member: JsonSchema = { type: ['string', 'null'], maxLength: 100 }
type Args = Record<string, unknown>
type Operation = {
  name: string; title: string; description: string; scope: string; clauses: string[]
  properties: Record<string, JsonSchema>; required: string[]
  input(args: Args): Record<string, unknown>
}
const operations: Operation[] = [
  { name: 'incidents.declare', title: 'Declare an incident', description: 'Declare native coordination with a copied runbook. Paging remains off. Revision is the current workspace revision.', scope: 'incidents:write', clauses: ['OC-004', 'OC-005'],
    properties: { service: string(100), revision, title: string(300), summary: string(), severity: { enum: ['critical', 'warning', 'info'] }, alerts: { type: 'array', items: string(100), maxItems: 200, uniqueItems: true } }, required: ['service', 'title', 'summary', 'severity'],
    input: a => ({ type: 'declare', service: a.service, title: a.title, summary: a.summary, severity: a.severity, alerts: a.alerts ?? [] }) },
  { name: 'incidents.update', title: 'Update an incident', description: 'Reassign responsibility, change a coordination role, or record mitigation/recovery with native lifecycle rules and current revision.', scope: 'incidents:write', clauses: ['OC-004', 'OC-053'],
    properties: { incident: string(100), revision, change: { enum: ['reassign', 'assign-role', 'transition', 'manual-page', 'snooze', 'cancel-deadline'] }, service: string(100),title:string(300),severity:{enum:['critical','warning','info']},urgency:{enum:['high','low']},priority:{enum:['P1','P2','P3','P4','P5']},target:{type:'object'},targets:{type:'array',items:{type:'object'}},policy:string(100),users:{type:'array',items:string(100),maxItems:100},description:string(3000),incidentType:string(100),operationId:string(100),deadline:string(100),until:string(100),minutes:{type:'integer',minimum:1},state: { enum: ['mitigating', 'recovered'] }, summary: string(), evidence: string(2000), member, role: { enum: ['commander', 'scribe', 'communications', 'assignee'] }, reason: string() }, required: ['change'],
    input: a => ({ ...a, type: a.change }) },
  { name: 'incidents.acknowledge', title: 'Acknowledge for a named responder', description: 'Record the agent acknowledgment naming an active human responder. This is attributed to the agent, not a human attestation.', scope: 'incidents:write', clauses: ['OC-004', 'OC-053'],
    properties: { incident: string(100), revision, member: string(100), summary: string() }, required: ['incident', 'revision', 'member', 'summary'],
    input: a => ({ type: 'transition', state: 'acknowledged', incident: a.incident, revision: a.revision, member: a.member, summary: a.summary }) },
  { name: 'incidents.resolve', title: 'Resolve a recovered incident', description: 'Resolve an incident already in recovered state with retained recovery evidence and a resolution summary. Requires its current revision.', scope: 'incidents:write', clauses: ['OC-004'],
    properties: { incident: string(100), revision, summary: string() }, required: ['incident', 'revision', 'summary'],
    input: a => ({ type: 'transition', state: 'resolved', incident: a.incident, revision: a.revision, summary: a.summary }) },
  { name: 'notes.add', title: 'Add an incident note', description: 'Append a literal agent-attributed note at the current incident revision.', scope: 'incidents:write', clauses: ['OC-004', 'OC-008'],
    properties: { incident: string(100), revision, text: string() }, required: ['incident', 'revision', 'text'],
    input: a => ({ type: 'note', incident: a.incident, revision: a.revision, text: a.text }) },
  { name: 'actions.create', title: 'Create a follow-up', description: 'Create an owned, due-dated native follow-up. P1 requires human review; no production action runs.', scope: 'actions:write', clauses: ['OC-005', 'OC-053'],
    properties: { incident: string(100), revision, title: string(500), owner: string(100), due: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, priority: { enum: ['P1', 'P2', 'P3'] }, completionPolicy: { enum: ['evidence', 'human-review'] }, escalationRecipient: string(100) }, required: ['incident', 'revision', 'title', 'owner', 'due'],
    input: a => ({ type: 'action', incident: a.incident, revision: a.revision, title: a.title, owner: a.owner, due: a.due, priority: a.priority, completionPolicy: a.completionPolicy, escalationRecipient: a.escalationRecipient }) },
  { name: 'actions.submit', title: 'Submit follow-up evidence', description: 'Submit completion evidence at the current parent incident revision. Human-review work stays open until a human accepts it. Evidence-policy completion is an automation claim.', scope: 'actions:write', clauses: ['OC-005', 'OC-053'],
    properties: { incident: string(100), revision, action: string(100), evidence: string(2000) }, required: ['incident', 'revision', 'action', 'evidence'],
    input: a => ({ type: 'complete', incident: a.incident, revision: a.revision, action: a.action, evidence: a.evidence }) },
]

export function coordinationTools(env: Bindings): ToolDefinition[] {
  return operations.map(operation => {
    const access = async (args: Args, ctx: ToolContext) => {
      const current = await nativeAccess(env, ctx, operation.scope)
      const incident = args.incident === undefined ? undefined : current.state.incidents.find(row => row.id === args.incident)
      const service = operation.name === 'incidents.declare'||args.change==='manual-page' ? args.service : incident?.service
      if (typeof service !== 'string' || !current.services.includes(service) || !current.state.services.some(row => row.id === service)) fail('Record not found in this client scope', 404)
      return { current, incident }
    }
    return defineTool({
      name: `oncall.${operation.name}`, title: operation.title, description: operation.description,
      scope: operation.scope, readOnly: false, classes: operation.name==='incidents.declare'?['standard']:['standard','sensitive'], clauses: operation.clauses, untrusted: true,
      inputSchema: { type: 'object', additionalProperties: false, properties: operation.properties, required: operation.required },
      outputSchema: { type: 'object', properties: { id: string(100), revision: { type: 'integer', minimum: 1 } }, required: ['id', 'revision'] },
      classify: (args,ctx) => nativeCall(async()=>{ const {incident}=await access(args,ctx); const count=protectedRecords(incident)+Number(typeof args.evidence==='string'&&!!args.evidence); return [{class:'standard',facts:{measure:1}},...(count?[{class:'sensitive' as const,facts:{measure:count,kind:'personal_or_incident_evidence'}}]:[])] }),
      revision: (args, ctx) => nativeCall(async () => { const { current, incident } = await access(args, ctx); return incident?.revision ?? current.state.revision }),
      summary: (args, ctx) => nativeCall(async () => {
        const { current, incident } = await access(args, ctx)
        const target = incident ?? current.state.services.find(row => row.id === args.service)!
        const action = incident?.actions.find(row => row.id === args.action)
        return { target: { id: target.id, name: 'title' in target ? target.title : target.name }, items: [operation.title, `Revision ${args.revision}`, ...(action ? [action.title] : []), ...Object.entries(operation.input(args)).filter(([key, value]) => !['type', 'incident', 'revision'].includes(key) && value !== undefined).map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)] }
      }),
      run: (args, ctx) => nativeCall(async () => {
        const { current, incident } = await access(args, ctx)
        if ((incident||args.revision!==undefined)&&args.revision !== (incident?.revision ?? current.state.revision)) fail('Native revision changed; reload before applying', 409)
        const actor = nativeActor(current, ctx)
        actor.agent = { ...actor.agent!, approvers: ctx.approvers.map(({ id, name }) => ({ id, name })) }
        const nativeInput=operation.input(args)
        let context
        if(['manual-page','snooze','cancel-deadline'].includes(String(nativeInput.type))){
          const snapshot=await pagingSnapshot(env.DB)
          if(snapshot.workspace.revision!==current.state.revision)fail('Native revision changed; reload before applying',409)
          current.guard.sql+=' AND EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)';current.guard.values.push(snapshot.revision)
          context=responseContext(snapshot,ctx.now())
        }
        const result = command(current.state, actor, nativeInput, new Date(ctx.now()).toISOString(),context) as Incident
        nativeAudit(env, ctx, operation.name, result.id)
        if(operation.name==='incidents.acknowledge')auditIdentity(env.DB,{namedMember:{kind:'member',id:String(args.member)}})
        await persistNative(env, current)
        const uri = `oncall://incidents/${result.id}`
        ctx.emit(operation.name, uri, { incident: result.id, revision: result.revision })
        if(['action','complete'].includes(String(nativeInput.type))){const action=result.actions.find(row=>row.id===args.action)??result.actions.at(-1);if(action)ctx.emit('action.updated',`oncall://actions/${action.id}`,{incident:result.id,action:action.id,revision:result.revision})}
        return { result, resources: [{ uri, name: result.title }] }
      }),
    })
  })
}
