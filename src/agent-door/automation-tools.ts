import type { Bindings } from '../auth.server'
import { ToolRefusal, type ToolDefinition, type ToolContext } from '../modules/agent-door/index.ts'
import { dispatchOutbox, updateOutcome } from '../automation/dispatch'
import { activeOwner, deliveryCapacity, unfinishedDeliveries } from '../automation/model'
import { nativeAccess, nativeAudit, nativeCall, persistNative } from './native'
import { loadWorkspace } from '../workspace-store'

export function automationTools(env: Bindings): ToolDefinition[] {
  const access = async (args: Record<string, unknown>, ctx: ToolContext) => {
    const current = await nativeAccess(env, ctx, 'automation:write')
    if(!current.client&&current.member.role!=='admin')throw new ToolRefusal('native_authority_required')
    const item = current.state.apiOutbox?.find(row => row.id === args.id)
    const endpoint = item && current.state.apiEndpoints?.find(row => row.id === item.endpoint)
    if (!item || !endpoint || !current.services.includes(item.service)||current.client&&item.client!==current.client.id) throw new ToolRefusal('not_found')
    const binding = await env.DB.prepare('SELECT principal FROM oc_agent_outbox WHERE outbox=?').bind(item.id).first<{principal:string}>()
    if (binding) {
      const who = JSON.parse(binding.principal)
      if (who.person.id !== ctx.person.id || who.agent.id !== ctx.agent.id || who.consent !== ctx.consent) throw new ToolRefusal('native_authority_required')
    }
    return { current, item, endpoint, bound:!!binding }
  }
  return ['dispatch', 'replay'].map(action => ({
    name: `oncall.automation.${action}`, title: `${action} a minimal response event`, description: 'Use an existing approved receiver and its frozen minimal event. Authenticated receiver acceptance is distinct from an uncertain network outcome. No paging.', scope: 'automation:write', readOnly: false, classes: ['external'], clauses: ['OC-006', 'OC-053'],
    inputSchema: { type: 'object', properties: { id: { type: 'string', minLength: 1, maxLength: 100 }, revision: { type: 'integer', minimum: 1 } }, required: ['id', 'revision'], additionalProperties: false },
    outputSchema: { type: 'object', properties: { operation: { type: 'object' }, paging: { const: 'OFF' } }, required: ['operation', 'paging'] },
    classify: (args, ctx) => nativeCall(async () => { await access(args, ctx); return [{ class: 'external', facts: { measure: 1, counterparty: 'known' } }] }),
    revision: (args, ctx) => nativeCall(async () => (await access(args, ctx)).item.revision),
    summary: (args, ctx) => nativeCall(async () => { const { item, endpoint } = await access(args, ctx); return { target: { id: item.id, name: `Response event ${item.event}` }, recipients: [endpoint.url], items: [JSON.stringify(item.payload), `Endpoint revision ${endpoint.revision}`, `Operation revision ${item.revision}`] } }),
    run: (args, ctx) => nativeCall(async () => {
      const { current, item, bound } = await access(args, ctx)
      if (item.revision !== args.revision) throw new ToolRefusal('revision_conflict')
      nativeAudit(env, ctx, `automation.${action}`, item.id)
      if (action === 'replay') {
        if(current.client)throw new ToolRefusal('native_authority_required')
        if (!['failed', 'uncertain', 'interrupted', 'terminal'].includes(item.status) || item.attempts >= 5) throw new ToolRefusal('native_request_invalid')
        // Uncertain bytes require a person's native reconciliation, never an agent resend.
        if (item.status === 'uncertain' || item.history.at(-1)?.reason === 'lease-expired') throw new ToolRefusal('outcome_uncertain')
        if (unfinishedDeliveries(current.state) - Number(item.status === 'failed') >= deliveryCapacity) throw new ToolRefusal('capacity_exceeded')
        const endpoint = current.state.apiEndpoints?.find(row => row.id === item.endpoint && row.active), origin = current.state.apiClients?.find(row => row.id === item.client && row.active), receiver = current.state.apiClients?.find(row => row.id === endpoint?.client && row.active)
        if (!endpoint || !origin || !receiver || ![endpoint.owner,origin.owner,receiver.owner].every(id => activeOwner(current.state,id)) || !origin.services.includes(item.service) || !receiver.services.includes(item.service) || !receiver.permissions.includes('incidents:read')) throw new ToolRefusal('native_authority_required')
        item.clientRevision=origin.revision;item.receiverRevision=receiver.revision;item.endpointRevision=endpoint.revision;item.authorized=true;item.due=new Date(ctx.now()).toISOString();updateOutcome(item,'queued','protected-replay')
        await persistNative(env,current)
      } else {
        if(!bound){
          try{await env.DB.prepare(`INSERT OR IGNORE INTO oc_agent_outbox(outbox,principal) SELECT ?,? WHERE ${current.guard.sql}`).bind(item.id,JSON.stringify({person:{id:ctx.person.id},agent:ctx.agent,scopes:ctx.scopes,clientId:ctx.clientId,consent:ctx.consent}),...current.guard.values).run()}
          catch{throw new ToolRefusal('storage_unavailable')}
          const saved=await env.DB.prepare('SELECT principal FROM oc_agent_outbox WHERE outbox=?').bind(item.id).first<{principal:string}>()
          if(!saved)throw new ToolRefusal('native_authority_required')
          const who=JSON.parse(saved.principal)
          if(who.person.id!==ctx.person.id||who.agent.id!==ctx.agent.id||who.consent!==ctx.consent)throw new ToolRefusal('native_authority_required')
        }
        await dispatchOutbox(env,current.guard,{id:item.id,agent:{id:ctx.agent.id,label:ctx.actor.label}})
      }
      // Report the committed transport outcome even if Pause/revocation arrives
      // during flight. It cannot retract bytes or turn a receiver receipt into refusal.
      const operation=(await loadWorkspace(env.DB)).apiOutbox?.find(row=>row.id===item.id)
      if (!operation) throw new ToolRefusal('not_found')
      const uri=`oncall://automation/outbox/${item.id}`
      ctx.emit(`automation.${action}`,uri,{status:operation.status})
      return {result:{operation,paging:'OFF'},resources:[{uri,name:'Response event outcome'}]}
    }),
  } as ToolDefinition))
}
