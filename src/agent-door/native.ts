import {ToolRefusal,type ToolContext,type ResourceContext,type Person} from '../modules/agent-door/index.ts'
import {command,Fault,authority,type Member,type State,type Incident} from '../family/response-operations/domain'
import {loadWorkspace,workspaceWrite} from '../workspace-store'
import {pagingSnapshot,putSchedule,bound} from '../paging-store'
import {coverage,validateSchedule} from '../family/response-operations/schedules'
import {reviewSchedule} from '../schedule-coverage/review'
import {scheduleChanges} from '../schedule-coordination/model'
import {requireTeamCoverage,editTeam} from '../teams/model'
import {reviewMaterial} from '../reviews/material'
import {recentChanges} from '../changes/model'
import {responseReport} from '../reviews/report'
import {dispatchOutbox,updateOutcome} from '../automation/dispatch'
import {activeOwner,unfinishedDeliveries,deliveryCapacity} from '../automation/model'
import {auditIdentity,auditKind,setAuditSubject} from '../audit-store'
import {clientIdentity,clientScopes,isNativeClient} from './people'
import {responseContext} from '../manual-pages/context'
import {fireDeadline} from '../incident-deadlines/model'
import catalogue from './catalogue.json'
import {incidentWithinServices} from '../incident-workflows/scope'
import {canonical} from '../modules/agent-door/policy/document.ts'
import type {Bindings} from '../auth.server'
type Context=ToolContext|ResourceContext
export type NativeContext={state:State;member:Member;services:string[];guard:{sql:string;values:(string|number|null)[]}}
export const refuse=(code:string):never=>{throw new ToolRefusal(code)}
/** Credential-use metadata follows successful policy admission, never a refusal. */
export async function touchClient(env:Bindings,ctx:ToolContext) {
 if(!isNativeClient(ctx.clientId))return
 const client=clientIdentity(ctx.clientId),at=new Date().toISOString(),token=crypto.randomUUID()
 auditKind(env.DB,'automation.read')
 auditIdentity(env.DB,{actor:{kind:'api-client',id:client.id},source:{kind:'api-client',id:client.id}})
 const guard="EXISTS(SELECT 1 FROM oc_api_clients c JOIN oc_api_credentials k ON k.client=c.id JOIN oc_members m ON m.id=json_extract(c.data,'$.owner') WHERE c.id=? AND json_extract(c.data,'$.revision')=? AND json_extract(c.data,'$.active')=1 AND m.id=? AND json_extract(m.data,'$.role')='admin' AND json_extract(m.data,'$.active')=1)"
 const result=await env.DB.batch([
  env.DB.prepare('UPDATE workspace_control SET revision=revision+1,write_token=? WHERE id=1 AND '+guard).bind(token,client.id,client.revision,ctx.person.id),
  env.DB.prepare("UPDATE oc_api_clients SET data=json_set(data,'$.lastUsed',?) WHERE id=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)").bind(at,client.id,token),
 ])
 if(result[0].meta.changes!==1)return refuse('unauthenticated')
}
export async function nativeContext(env:Bindings,ctx:Context,scope:string,admin=false):Promise<NativeContext> {
 if(ctx.agent.id.length>200||ctx.agent.name.length>200||/[\x00-\x1f\x7f-\x9f]/.test(ctx.agent.id+ctx.agent.name))return refuse('invalid_arguments')
 if(!ctx.scopes.includes(scope))return refuse('insufficient_scope')
 const state=await loadWorkspace(env.DB),member=state.members.find(m=>m.id===ctx.person.id&&m.active&&!m.erased)
 if(!member||member.role==='stakeholder')return refuse('unauthenticated')
 if(admin&&member.role!=='admin')return refuse('insufficient_role')
 const linked=await env.DB.prepare('SELECT o.status FROM operator_members l JOIN oa_operators o ON o.id=l.operator_id WHERE l.member_id=?').bind(member.id).first<{status:string}>()
 if(linked&&linked.status!=='active')return refuse('unauthenticated')
 let services=state.services.map(s=>s.id)
 let sql="EXISTS(SELECT 1 FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.role')=?) AND NOT EXISTS(SELECT 1 FROM operator_members l JOIN oa_operators o ON o.id=l.operator_id WHERE l.member_id=? AND o.status<>'active')"
 const values:(string|number|null)[]=[member.id,member.role,member.id]
 if(isNativeClient(ctx.clientId)) {
  const key=clientIdentity(ctx.clientId),client=state.apiClients?.find(c=>c.id===key.id&&c.active&&c.revision===key.revision&&c.owner===member.id)
  if(!client||!activeOwner(state,client.owner)||!(await clientScopes(env,ctx)).includes(scope))return refuse('insufficient_scope')
  services=client.services
  sql+=" AND EXISTS(SELECT 1 FROM oc_api_clients c JOIN oc_api_credentials k ON k.client=c.id WHERE c.id=? AND c.data=?)"
  values.push(client.id,JSON.stringify(client))
 }
 if(!isNativeClient(ctx.clientId)&&env.RER_OWNER_CLAIM_ISSUER) {
  const {oncallPeople}=await import('./people')
  const binding=await oncallPeople(env).businessMember!({...ctx.person,role:member.role,active:member.active})
  if(!binding)return refuse('unauthenticated')
  sql+=" AND EXISTS(SELECT 1 FROM bs_settings WHERE singleton=1 AND stopped=0 AND ((owner_id=? AND EXISTS(SELECT 1 FROM oa_bootstrap b JOIN oa_operators o ON o.id=b.claim_id JOIN operator_members l ON l.operator_id=o.id WHERE o.role='owner' AND o.status='active' AND l.member_id=?)) OR EXISTS(SELECT 1 FROM bs_team WHERE business_id=? AND operator_id=? AND state='active' AND (business_role<>'admin' OR ?='admin'))))"
  values.push(binding.id,member.id,binding.id,member.id,member.role)
 }
 const policy=await env.DB.prepare('SELECT envelope,local_document,local_revision FROM agent_door_state WHERE id=1').first<{envelope:string|null;local_document:string|null;local_revision:number}>()
 if(policy) {
  sql+=" AND EXISTS(SELECT 1 FROM agent_door_state WHERE id=1 AND envelope IS ? AND local_document IS ? AND local_revision=? AND local_paused=0 AND (envelope IS NULL OR (json_extract(envelope,'$.paused')=0 AND json_extract(envelope,'$.exp')*1000>round((julianday('now')-2440587.5)*86400000) AND NOT EXISTS(SELECT 1 FROM json_each(envelope,'$.revoked.agents') WHERE value=?) AND NOT EXISTS(SELECT 1 FROM json_each(envelope,'$.revoked.consents') WHERE value=?)))) AND NOT EXISTS(SELECT 1 FROM agent_door_agents WHERE id=? AND revoked=1)"
  values.push(policy.envelope,policy.local_document,policy.local_revision,ctx.agent.id,ctx.consent??null,ctx.agent.id)
 }
 return {state,member,services,guard:{sql,values}}
}
export function service(n:NativeContext,id:unknown) {
 const record=n.state.services.find(s=>s.id===id&&n.services.includes(s.id))
 if(!record)return refuse('not_found')
 return record
}
export function incident(n:NativeContext,id:unknown,retainedAction=false):Incident {
 const record=n.state.incidents.find(i=>i.id===id&&n.services.includes(i.service))
 if(!record||record.mergedInto&&!retainedAction)return refuse('not_found')
 // Merged/multi-service relationships cannot disclose an ungranted service.
 if(!retainedAction&&!incidentWithinServices(n.state,record,n.services))return refuse('not_found')
 return record
}
export function projected(n:NativeContext):State {
 return {...n.state,services:n.state.services.filter(s=>n.services.includes(s.id)),incidents:n.state.incidents.filter(i=>!i.mergedInto&&incidentWithinServices(n.state,i,n.services)),
  changes:n.state.changes?.filter(c=>n.services.includes(c.service)),events:n.state.events.filter(e=>n.services.includes(e.service)),
  alerts:n.state.alerts.filter(a=>a.service!==null&&n.services.includes(a.service))}
}
export async function readNative(env:Bindings,ctx:Context,area:string,verb:string,args:Record<string,any>):Promise<any> {
 const scope=area==='changes'||area==='reviews'?'incidents:read':area+':read'
 const n=await nativeContext(env,ctx,scope,['access','imports','automation'].includes(area))
 if(area==='services') {
  const project=(s:State['services'][number])=>({...s,dependencies:(s.dependencies??[]).filter(id=>n.services.includes(id))})
  return verb==='list'?n.state.services.filter(s=>n.services.includes(s.id)).map(project):project(service(n,args.id))
 }
 if(area==='incidents')return verb==='list'?projected(n).incidents:incident(n,args.id)
 if(area==='changes'){service(n,args.service);return recentChanges(projected(n),args.service,args.at??new Date().toISOString(),args.hours??24)}
 if(area==='reviews'){const i=incident(n,args.id);return reviewMaterial(projected(n),i.id)}
 if(area==='analytics')return isNativeClient(ctx.clientId)?n.state.services.filter(s=>n.services.includes(s.id)).map(s=>({id:s.id,service:s.id,incidents:projected(n).incidents.filter(i=>i.service===s.id).length,open:projected(n).incidents.filter(i=>i.service===s.id&&i.state!=='resolved').length,followups:n.state.incidents.filter(i=>i.service===s.id).flatMap(i=>i.actions).filter(a=>!a.done).length})):responseReport(projected(n),args)
 if(area==='actions') {
  if(verb==='list')return n.state.incidents.filter(i=>n.services.includes(i.service)).flatMap(i=>i.actions.map(a=>({...a,incident:i.id,service:i.service,revision:i.revision})))
  // Follow-ups retain the original service custody after an incident merge.
  const i=incident(n,args.incident,true)
  return args.id?{...i.actions.find(a=>a.id===args.id)??refuse('not_found'),incident:i.id,service:i.service,revision:i.revision}:{incident:i.id,revision:i.revision,actions:i.actions}
 }
 if(area==='schedules') {
  if(verb==='list')return (await pagingSnapshot(env.DB)).archive.schedules.filter(s=>n.services.includes(s.service))
  const snapshot=await pagingSnapshot(env.DB),s=snapshot.archive.schedules.find(s=>s.id===args.id&&n.services.includes(s.service))
  if(!s)return refuse('not_found')
  if(verb==='read')return s
  const at=args.at?Date.parse(args.at):Date.now()
  if(!Number.isFinite(at))return refuse('invalid_arguments')
  const now=coverage(s,n.state.members,at)
  return {paging:'OFF',schedule:s,now,next:Object.fromEntries(now.windows.map(w=>[w.role,w.end?coverage(s,n.state.members,Date.parse(w.end)):null])),
   history:n.state.scheduleRecords?.filter(r=>r.data.schedule===s.id)??[]}
 }
 if(area==='automation')return {clients:n.state.apiClients?.filter(c=>c.services.every(id=>n.services.includes(id))),endpoints:n.state.apiEndpoints?.filter(e=>e.services.every(id=>n.services.includes(id))).map(({url,...e})=>({...e,recipient:new URL(url).origin})),
  outbox:n.state.apiOutbox?.filter(o=>n.services.includes(o.service)&&(!args.incident||o.incident===args.incident)),paging:'OFF'}
 if(area==='integrations') {
  const native=(await env.DB.prepare('SELECT id,scopes FROM sources').all()).results
  return [...(n.state.intakeSources??[]).filter(s=>n.services.includes(s.service)).map(s=>({id:'intake:'+s.id,active:s.active,service:s.service,provider:s.provider})),
   ...(n.state.changeSources??[]).filter(s=>n.services.includes(s.service)).map(s=>({id:'change:'+s.id,active:s.active,service:s.service,provider:s.provider})),
   ...(n.state.emailAddresses??[]).filter(s=>n.services.includes(s.service)).map(s=>({id:'email:'+s.id,active:s.active,service:s.service,provider:'email'})),
   ...native.filter((s:any)=>{const g=JSON.parse(s.scopes);return g.length&&g.every((id:string)=>n.services.includes(id))}).map((s:any)=>({id:'native:'+s.id,active:true,services:JSON.parse(s.scopes),provider:'native'}))]
 }
 if(area==='access')return {members:n.state.members.map(({id,name,role,active})=>({id,name,role,active})),teams:n.state.teams??[],
  clients:n.state.apiClients??[],endpoints:(n.state.apiEndpoints??[]).map(({url,...e})=>({...e,recipient:new URL(url).origin})),paging:'OFF'}
 if(area==='imports')return (await env.DB.prepare('SELECT kind,id,revision FROM move_in_objects ORDER BY kind,id LIMIT 1000').all()).results
 return refuse('not_found')
}
export async function saveNative(env:Bindings,n:NativeContext,extra:(token:string)=>D1PreparedStatement[]=()=>[]) {
 const token=crypto.randomUUID()
 const result=await env.DB.batch([...workspaceWrite(env.DB,n.state,n.state.revision,n.guard,token),...extra(token)])
 if(result[0].meta.changes!==1)return refuse('revision_conflict')
}
async function operationResult(env:Bindings,n:NativeContext,ctx:ToolContext,args:Record<string,any>,result:any) {
 if(!args.operation_id)return result
 const transport=await env.DB.prepare('SELECT * FROM oc_agent_transport WHERE id=?').bind(args.operation_id).first<{id:string;client:string;key_hash:string;request_hash:string;family:string;service:string}>()
 if(!transport||!isNativeClient(ctx.clientId)||clientIdentity(ctx.clientId).id!==transport.client)return refuse('invalid_operation')
 const operation={id:transport.id,client:transport.client,key:transport.key_hash,request:transport.request_hash,resource:transport.family,service:transport.service,entity:transport.family==='actions'?args.incident:result.id,revision:result.revision??1,at:new Date().toISOString()}
 ;(n.state.apiOperations??=[]).push(operation)
 if(n.state.apiOperations.length>1000)return refuse('capacity_exhausted')
 return {...result,operation}
}
export function prepared(ctx:ToolContext) {
 return {agent:{id:ctx.agent.id,name:ctx.agent.name},sponsor:{id:ctx.person.id,name:ctx.person.name},label:ctx.actor.label,approvers:ctx.approvers}
}
export async function mutateNative(env:Bindings,ctx:ToolContext,area:string,verb:string,args:Record<string,any>):Promise<any> {
 const scope=['notes','deadlines'].includes(area)||area==='automation'&&verb==='dispatch'?'incidents:write':area==='automation'?'automation:write':area+':write'
 const n=await nativeContext(env,ctx,scope,['services','access','clients','endpoints','automation','teams'].includes(area))
 if(args.operation_id&&isNativeClient(ctx.clientId)) {
  const client=clientIdentity(ctx.clientId).id,prior=n.state.apiOperations?.find(o=>o.id===args.operation_id&&o.client===client&&n.services.includes(o.service))
  if(prior){
   const record=await env.DB.prepare('SELECT args,tool,client FROM oc_agent_transport WHERE id=?').bind(args.operation_id).first<{args:string;tool:string;client:string}>()
   const definition=catalogue.find(t=>t.name==='oncall.'+area+'.'+verb)
   const properties=definition?.inputSchema.properties??{}
   const saved=record?JSON.parse(record.args):{}
   const projected=Object.fromEntries(Object.entries(saved).filter(([key])=>Object.hasOwn(properties,key)))
   if(!record||record.client!==client||record.tool!==definition?.name||canonical(projected)!==canonical(args))return refuse('idempotency_conflict')
   return {id:prior.entity,revision:prior.revision,operation:prior}
  }
 }
 const before=new Set(n.state.incidents.flatMap(i=>i.timeline.map(e=>e.id)))
 const oldOutbox=new Set(n.state.apiOutbox?.map(o=>o.id)??[])
 const oldDeadlines=new Set(n.state.incidents.flatMap(i=>(i.deadlines??[]).map(d=>d.id)))
 const who=prepared(ctx)
 const actor:Member={...n.member,agent:who,...(isNativeClient(ctx.clientId)?{id:clientIdentity(ctx.clientId).id,machine:true as const}:{})}
 auditKind(env.DB,isNativeClient(ctx.clientId)?'automation.'+area:'agent.'+area+'.'+verb)
 auditIdentity(env.DB,{actor:{kind:isNativeClient(ctx.clientId)?'api-client':'agent',id:ctx.agent.id},source:{kind:isNativeClient(ctx.clientId)?'api-client':'member',id:isNativeClient(ctx.clientId)?ctx.agent.id:ctx.person.id},
  ...(area==='incidents'&&verb==='acknowledge'?{namedMember:{kind:'member',id:String(args.member)}}:{})})
 let result:any
 if(area==='deadlines') {
  authority(n.state,n.member)
  const i=incident(n,args.incident),deadline=i.deadlines?.find(d=>d.id===args.id)
  const record=await env.DB.prepare('SELECT principal FROM oc_agent_deadlines WHERE id=? AND incident=?').bind(args.id,i.id).first<{principal:string}>()
  const saved=record?JSON.parse(record.principal):null
  if(!deadline||!saved||saved.sponsorId!==ctx.person.id||saved.agent.id!==ctx.agent.id)return refuse('not_found')
  const snapshot=await pagingSnapshot(env.DB)
  const fired=fireDeadline(n.state,i,deadline,new Date().toISOString(),responseContext(snapshot,Date.now()))
  if(!fired)return {id:deadline.id,incident:i.id,revision:i.revision,processed:0}
  n.guard.sql+=' AND EXISTS(SELECT 1 FROM paging_control WHERE revision=?)';n.guard.values.push(snapshot.revision)
  result={id:deadline.id,incident:i.id,revision:i.revision,processed:1}
 } else if(area==='incidents'||area==='actions'||area==='notes'||area==='services'||area==='access') {
  if(area==='access') {
   if(isNativeClient(ctx.clientId))return refuse('insufficient_scope')
   const target=n.state.members.find(m=>m.id===args.id)
   if(!target)return refuse('not_found')
   result=command(n.state,actor,{type:'member',id:target.id,role:args.role,active:args.active})
  } else if(area==='services') {
   const current=service(n,args.id)
   result=command(n.state,actor,verb==='ownership'?{type:'service',id:current.id,field:'team',from:current.team??null,to:args.team}:{...args,type:'service'})
  } else if(area==='incidents'&&['declare','page'].includes(verb)) {
   service(n,args.service)
   const snapshot=await pagingSnapshot(env.DB)
   if(args.policy)service(n,args.policy)
   result=command(n.state,actor,{...args,type:verb==='page'?'manual-page':'declare',operationId:args.operation_id??crypto.randomUUID()},new Date().toISOString(),responseContext(snapshot,Date.now()))
  } else {
   const i=incident(n,args.incident??args.id,area==='actions')
   const input=area==='notes'?{type:'note',text:args.text}:area==='actions'?
    {...args,type:verb==='create'?'action':verb==='submit'?'complete':'action-update',action:args.id}:
    verb==='acknowledge'?{type:'transition',state:'acknowledged',member:args.member}:
    verb==='resolve'?{type:'transition',state:'resolved',summary:args.summary}:
    verb==='snooze'?{type:'snooze',minutes:args.minutes}:
    verb==='cancel'?{type:'cancel-deadline',deadline:args.deadline}:
    verb==='reassign'?{type:'reassign',member:args.member}:
    verb==='role'?{type:'assign-role',role:args.role,member:args.member}:
    args.field==='state'?{type:'transition',state:args.value,evidence:args.evidence}:
    args.field==='assignee'?{type:'reassign',member:args.value}:
    {type:'set-'+args.field,[args.field]:args.value}
   const snapshot=await pagingSnapshot(env.DB)
   result=command(n.state,actor,{...input,summary:args.summary??'Coordination recorded by '+ctx.actor.label,reason:args.reason??'Coordination recorded by '+ctx.actor.label,incident:i.id,revision:i.revision},new Date().toISOString(),responseContext(snapshot,Date.now()))
   if(area==='actions')result={...i.actions.find(a=>a.id===(verb==='create'?i.actions.at(-1)?.id:args.id)),incident:i.id,service:i.service,revision:i.revision}
  }
 } else if(area==='teams') {
  if(isNativeClient(ctx.clientId))return refuse('insufficient_scope')
  result=editTeam(n.state,n.member,args)
 } else if(area==='clients'||area==='endpoints') {
  if(isNativeClient(ctx.clientId))return refuse('insufficient_scope')
  const record=(area==='clients'?n.state.apiClients:n.state.apiEndpoints)?.find(c=>c.id===args.id)
  if(!record)return refuse('not_found')
  record.active=false;record.revision++
  setAuditSubject(env.DB,area,record.id)
  await saveNative(env,n,token=>[env.DB.prepare('DELETE FROM '+(area==='clients'?'oc_api_credentials':'oc_endpoint_credentials')+' WHERE '+(area==='clients'?'client':'endpoint')+"=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)").bind(record.id,token)])
  ctx.emit(area+'.revoked','oncall://services/'+record.services[0],{id:record.id})
  return record
 } else if(area==='schedules') {
  const snapshot=await pagingSnapshot(env.DB),old=snapshot.archive.schedules.find(s=>s.id===args.id&&n.services.includes(s.service))
  if(verb==='create') {
   const proposed=args.schedule
   service(n,proposed?.service)
   if(!isNativeClient(ctx.clientId))requireTeamCoverage(n.state,n.member,proposed.service)
   if(proposed.revision!==0||snapshot.archive.schedules.some(s=>s.id===proposed.id))return refuse('revision_conflict')
   const next=validateSchedule({...proposed,revision:1},n.state)
   bound({...snapshot.archive,schedules:[...snapshot.archive.schedules,next]})
   scheduleChanges(n.state,[],[next],actor.id,who)
   const returned=await operationResult(env,n,ctx,args,next)
   n.guard.sql+=' AND EXISTS(SELECT 1 FROM paging_control WHERE revision=?)';n.guard.values.push(snapshot.revision)
   await saveNative(env,n,token=>[env.DB.prepare("UPDATE paging_control SET revision=revision+1,write_token=? WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)").bind(token,snapshot.revision,token),putSchedule(env.DB,next,token)])
   ctx.emit('coverage.created','oncall://schedules/'+next.id+'/coverage')
   return returned
  }
  if(!old)return refuse('not_found')
  if(!isNativeClient(ctx.clientId))requireTeamCoverage(n.state,n.member,old.service)
  let schedule
  if(verb==='override')schedule=validateSchedule({...old,revision:old.revision+1,overrides:[...old.overrides,args.override]},n.state)
  else {
   if(n.member.role!=='admin'&&(JSON.stringify(args.schedule?.companyDates)!==JSON.stringify(old.companyDates)||args.schedule?.pto?.some((p:any)=>!old.pto?.some(old=>old.id===p.id)&&p.member!==n.member.id)))return refuse('insufficient_role')
   const review=await reviewSchedule(old,args.schedule,n.state,args.from,args.to)
   if(args.digest!==review.digest)return refuse('review_changed')
   schedule=review.schedule
  }
  bound({...snapshot.archive,schedules:snapshot.archive.schedules.map(s=>s.id===old.id?schedule:s)})
  scheduleChanges(n.state,[old],[schedule],actor.id,who)
  const returned=await operationResult(env,n,ctx,args,schedule)
  n.guard.sql+=' AND EXISTS(SELECT 1 FROM paging_control WHERE revision=?)';n.guard.values.push(snapshot.revision)
  await saveNative(env,n,token=>[env.DB.prepare("UPDATE paging_control SET revision=revision+1,write_token=? WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)").bind(token,snapshot.revision,token),putSchedule(env.DB,schedule,token)])
  ctx.emit('coverage.updated','oncall://schedules/'+old.id+'/coverage',{revision:schedule.revision})
  return returned
 } else if(area==='automation') {
  const item=n.state.apiOutbox?.find(o=>o.id===args.id&&n.services.includes(o.service))
  if(!item)return refuse('not_found')
  if(isNativeClient(ctx.clientId)&&item.client!==clientIdentity(ctx.clientId).id)return refuse('not_found')
  if(verb==='dispatch'){const outcome=await dispatchOutbox(env,n.guard,{id:item.id,agentAdmitted:true,preparedBy:who});if(outcome.processed)ctx.emit('automation.updated','oncall://automation/outbox/'+item.id,{operationId:item.id,status:outcome.status});return outcome}
  if(!['failed','terminal','interrupted'].includes(item.status)||item.history.some(h=>h.reason==='network-ambiguous'||h.reason==='lease-expired'))return refuse('outcome_uncertain')
  if(item.attempts>=5||unfinishedDeliveries(n.state)>=deliveryCapacity)return refuse('capacity_exhausted')
  const endpoint=n.state.apiEndpoints?.find(e=>e.id===item.endpoint&&e.active),client=n.state.apiClients?.find(c=>c.id===item.client&&c.active)
  const receiver=n.state.apiClients?.find(c=>c.id===endpoint?.client&&c.active)
  if(!endpoint||!client||!receiver||![endpoint.owner,client.owner,receiver.owner].every(id=>activeOwner(n.state,id))||!receiver.permissions.includes('incidents:read')||![client,receiver,endpoint].every(c=>c.services.includes(item.service)))return refuse('authority_revoked')
  item.clientRevision=client.revision;item.receiverRevision=receiver.revision;item.endpointRevision=endpoint.revision
  item.authorized=true;item.due=new Date().toISOString();updateOutcome(item,'queued','protected-replay')
  result=item
 } else return refuse('not_found')
 if(result?.changed===false&&!args.operation_id)return result
 if(isNativeClient(ctx.clientId)) {
  const nativeClient=clientIdentity(ctx.clientId).id
  const client=n.state.apiClients?.find(c=>c.id===nativeClient)
  if(client)client.lastUsed=new Date().toISOString()
 }
 for(const i of n.state.incidents)for(const entry of i.timeline)if(!before.has(entry.id)){entry.preparedBy=who;ctx.emit('incident.updated','oncall://incidents/'+i.id,{revision:i.revision})}
 for(const entry of n.state.audit)if(entry.actor===actor.id&&entry.at>=new Date(ctx.now()-1000).toISOString())entry.preparedBy=who
 const target=result?.id??args.id??args.incident
 if(target)setAuditSubject(env.DB,area,String(target))
 result=await operationResult(env,n,ctx,args,result)
 const custody={sponsorId:ctx.person.id,agent:ctx.agent,consent:ctx.consent,scopes:ctx.scopes,clientId:ctx.clientId}
 await saveNative(env,n,token=>[
  ...(n.state.apiOutbox??[]).filter(o=>!oldOutbox.has(o.id)).map(o=>env.DB.prepare("INSERT INTO oc_agent_outbox(id,principal,operation_key) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)").bind(o.id,JSON.stringify(custody),'agent-dispatch-'+o.id,token)),
  ...n.state.incidents.flatMap(i=>(i.deadlines??[]).filter(d=>!oldDeadlines.has(d.id)).map(d=>env.DB.prepare("INSERT INTO oc_agent_deadlines(id,incident,principal,operation_key) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)").bind(d.id,i.id,JSON.stringify(custody),'agent-deadline-'+d.id,token))),
  ...(area==='automation'?[env.DB.prepare("UPDATE oc_agent_outbox SET operation_key=? WHERE id=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)").bind('agent-replay-'+result.id+'-'+result.revision,result.id,token)]:[]),
 ])
 for(const item of n.state.apiOutbox??[])if(!oldOutbox.has(item.id))ctx.emit('automation.queued','oncall://automation/outbox/'+item.id,{operationId:item.id,incident:item.incident,revision:item.revision})
 if(area==='automation')ctx.emit('automation.updated','oncall://automation/outbox/'+String(result.id),{operationId:result.id,status:result.status})
 if(area==='actions')ctx.emit('action.updated','oncall://actions/'+result.id,{incident:result.incident,revision:result.revision})
 if(area==='services'||area==='teams'||area==='access')ctx.emit(area+'.updated','oncall://services/'+(area==='services'?result.id:n.services[0]),{id:target})
 return result
}
export async function nativeRevision(env:Bindings,ctx:ToolContext,area:string,args:Record<string,any>,scope?:string):Promise<number|string|null> {
 const n=await nativeContext(env,ctx,scope??(area==='notes'?'incidents:write':area+':write'))
 if(area==='incidents'&&args.service)return n.state.revision
 if(area==='schedules'&&args.schedule&&!args.id)return (await pagingSnapshot(env.DB)).archive.schedules.find(s=>s.id===args.schedule.id)?.revision??0
 if(['incidents','actions','notes','deadlines'].includes(area))return incident(n,args.incident??args.id,area==='actions').revision
 if(area==='schedules')return (await pagingSnapshot(env.DB)).archive.schedules.find(s=>s.id===args.id&&n.services.includes(s.service))?.revision??refuse('not_found')
 if(area==='clients'||area==='endpoints')return (area==='clients'?n.state.apiClients:n.state.apiEndpoints)?.find(c=>c.id===args.id)?.revision??refuse('not_found')
 if(area==='automation')return n.state.apiOutbox?.find(o=>o.id===args.id&&n.services.includes(o.service))?.revision??refuse('not_found')
 return n.state.revision
}
export async function nativeFailure<T>(run:()=>Promise<T>):Promise<T> {
 try{return await run()}catch(error){if(error instanceof Fault)throw new ToolRefusal(({401:'unauthenticated',403:'insufficient_role',404:'not_found',409:'revision_conflict',429:'capacity_exhausted'} as Record<number,string>)[error.status]??'invalid_arguments',error.message);throw error}
}
