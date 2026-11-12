import type { MappingResult, SourceRecord } from '../modules/import-kit/src/types'
import type { RoutingCondition, RoutingDefinition } from '../routing/types'
import { exact, isObject, routingRules, routingScope } from '../routing/definition'
import { fail, type State } from '../family/response-operations/domain'

export type ImportedRoute={id:string;label:string;match:'all'|'any';conditions:RoutingCondition[];target:string}
export type RoutedImport={routes:ImportedRoute[];targets:{id:string;label:string}[];catchAllTarget:string|null;unconverted:{field:string;reason:string}[]}
const retained='Original retained in the saved export and move report; this condition is not converted.'
const textValue=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=1000

/** Convert saved routing configuration, never credentials or inferred service names.
 * A rejected rule retains its position as a review issue: an administrator sees
 * every unsupported condition before choosing native services and activation. */
export function routedImport(vendor:string,record:SourceRecord):MappingResult|undefined {
 const value=record.payload as any
 if(record.kind!=='integrations'||!(vendor==='opsgenie'&&value.type==='API'||vendor==='splunk'&&value.type==='REST'))return
 const candidates=vendor==='opsgenie'?value.actions?.create:value.routingKeys
 if(candidates===undefined&&!value.alertPolicies)return
 const definition:RoutedImport={routes:[],targets:[],catchAllTarget:null,unconverted:[]}
 const issue=(field:string,reason:string)=>definition.unconverted.push({field,reason:`${reason}. ${retained}`})
 const target=(recipient:any,field:string):string|undefined=>{
  if(!isObject(recipient)||recipient.type!=='team'||!textValue(recipient.id??recipient.slug)) {issue(field,`Unsupported ${String(recipient?.type??'unknown')} target ${String(recipient?.id??recipient?.slug??recipient?.name??'(missing)')}; only one team reference can be reviewed as a service target`);return}
  const id=String(recipient.id??recipient.slug)
  if(!definition.targets.some(t=>t.id===id))definition.targets.push({id,label:String(recipient.name??id)})
  return id
 }
 if(value.alertPolicies!==undefined) {
  issue('alertPolicies','Alert-policy criteria and transformations are unsupported')
  const criteria=(item:unknown,path:string):void=>{
   if(Array.isArray(item))item.forEach((child,index)=>criteria(child,path+'.'+index))
   else if(isObject(item))for(const [key,child] of Object.entries(item))criteria(child,path+'.'+key)
   else issue(path,`Unsupported alert-policy criterion ${JSON.stringify(item)}`)
  }
  const policies=Array.isArray(value.alertPolicies)?value.alertPolicies:[value.alertPolicies]
  policies.forEach((policy:any,index:number)=>{
   issue('alertPolicies.'+index,`Alert policy ${String(policy?.name??policy?.id??index)} cannot be converted`)
   if(policy?.criteria!==undefined)criteria(policy.criteria,`alertPolicies.${index}.criteria`)
   if(policy?.filter!==undefined)criteria(policy.filter,`alertPolicies.${index}.filter`)
  })
 }
 if(!Array.isArray(candidates)||candidates.length>100)issue(vendor==='opsgenie'?'actions.create':'routingKeys','Expected at most 100 saved ordered routes')
 else {let blocked=false;candidates.forEach((row:any,index:number)=>{
  const field=vendor==='opsgenie'?`actions.create.${index}`:`routingKeys.${index}`,before=definition.unconverted.length
  if(!isObject(row)){issue(field,'Invalid saved route');blocked=true;return}
  const recipients=vendor==='opsgenie'?row.responders:row.targets
  const recipient=Array.isArray(recipients)&&recipients.length===1?target(recipients[0],field+'.targets'):undefined
  if(!Array.isArray(recipients)||recipients.length!==1)issue(field+'.targets','Simultaneous or missing targets cannot choose exactly one service')
  const conditions:RoutingCondition[]=[]
  let match:'all'|'any'='all',isDefault=false
  if(vendor==='splunk') {
   if(textValue(row.routingLabel)&&row.routingLabel.length<=200)conditions.push({field:'routingKey',op:'equals',value:row.routingLabel})
   else issue(field+'.routingLabel','Missing or invalid non-secret URL routing label')
   for(const key of Object.keys(row).filter(k=>!['routingLabel','targets','name','id'].includes(k)))issue(field+'.'+key,'Unsupported Splunk route attribute')
  } else {
   const filter=row.filter
   if(row.order!==undefined&&row.order!==index)issue(field+'.order','Route order differs from the saved list; reorder the export explicitly before review')
   for(const key of Object.keys(row).filter(k=>!['name','id','order','filter','responders'].includes(k)))issue(field+'.'+key,'Unsupported create-action attribute or transformation')
   if(!isObject(filter)||!['match-all','match-any','match-all-conditions'].includes(filter.type))issue(field+'.filter','Unsupported Opsgenie filter')
   else {
    isDefault=filter.type==='match-all'&&(!filter.conditions||filter.conditions.length===0)
    if(filter.type==='match-all'&&!isDefault)issue(field+'.filter','An unconditional source filter also contains conditions; its meaning must be reviewed without approximation')
    match=filter.type==='match-any'?'any':'all'
    if(Object.keys(filter).some(k=>!['type','conditions'].includes(k)))issue(field+'.filter','Unknown filter attributes')
    if(!isDefault&&(!Array.isArray(filter.conditions)||!filter.conditions.length||filter.conditions.length>20))issue(field+'.filter.conditions','Expected 1–20 exact conditions')
    else for(const [n,c] of (filter.conditions??[]).entries()) {
     const at=field+`.filter.conditions.${n}`
     if(!isObject(c)){issue(at,'Invalid condition');continue}
     let path=c.field
     // Membership in a responder list is exact by the saved identifier, never
     // a substring of serialized team objects or an inferred native team.
     if(['responders','teams'].includes(path)&&c.operation==='contains'&&textValue(c.expectedValue))path+='.id'
     const allowed=['responders','responders.id','responders.name','teams','teams.id','teams.name','tags','entity','source'].includes(path)||typeof path==='string'&&/^details\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(path)&&!path.split('.').some((part:string)=>['__proto__','prototype','constructor'].includes(part))
     const op=c.operation==='contains'&&['responders','teams'].includes(c.field)?'equals':c.operation==='equals'?'equals':c.operation==='contains'?'contains':c.operation==='is-set'?'exists':undefined
     if(!allowed||!op||Object.keys(c).some(k=>!['field','operation','expectedValue'].includes(k))||op!=='exists'&&!textValue(c.expectedValue)||op==='exists'&&c.expectedValue!==undefined) {issue(at,`Unsupported condition ${JSON.stringify(c)}`);continue}
     conditions.push({field:path,op,...(op==='exists'?{}:{value:c.expectedValue})})
    }
   }
  }
  if(definition.unconverted.length!==before||!recipient){blocked=true;return}
  if(blocked){issue(field,'An earlier unsupported rule may match first; this later route is retained without conversion');return}
  if(isDefault) {
   if(index!==candidates.length-1){issue(field,'A source default before later rules cannot be represented as a catch-all');blocked=true}
   else definition.catchAllTarget=recipient
  } else definition.routes.push({id:'imported-'+(index+1),label:String(row.name??row.id??`Route ${index+1}`),match,conditions,target:recipient})
 })}
 const used=new Set([...definition.routes.map(r=>r.target),...(definition.catchAllTarget?[definition.catchAllTarget]:[])])
 definition.targets=definition.targets.filter(t=>used.has(t.id))
 // Every other exported setting remains individually named, with its original
 // in journal custody. Nothing in a saved file grants login or send authority.
 for(const key of Object.keys(value).filter(k=>!['id','name','type','actions','routingKeys','alertPolicies','enabled'].includes(k)))issue(key,'Unsupported integration setting')
 if(isObject(value.actions))for(const key of Object.keys(value.actions).filter(k=>k!=='create'))issue('actions.'+key,'Non-create actions require separate lifecycle review')
 const intakeSource='import-'+vendor+'-'+record.payloadHash.slice(0,32)
 return {effects:[{targetKind:'integration',targetId:vendor+':'+record.sourceId,value:{sourceId:record.sourceId,vendor,kind:value.type,provider:vendor,paused:true,paging:false,login:false,active:false,incumbentKey:'not supplied',intakeSource,routed:definition}}],unmapped:[
  {field:'routing',reason:`Inactive workspace routed key; ${definition.routes.length} ordered rules await explicit administrator service mappings. Catch-all: ${definition.catchAllTarget?'review the source default target':'record unrouted'}. Incumbent key: not supplied. No team authority or paging is activated.`},...definition.unconverted]}
}

/** The same rule validator as native routing, with every destination explicitly
 * selected from current services by the reviewing workspace administrator. */
export function reviewedRouting(state:State,imported:any,input:any,actor:string,at:string):RoutingDefinition {
 const template=imported.routed as RoutedImport
 exact(input,['scope','targets','owner','confirmed'])
 if(input.confirmed!==true)fail('Confirm the routed import review')
 const scope=routingScope(state,input.scope)
 if(!isObject(input.targets)||Object.keys(input.targets).length!==template.targets.length||template.targets.some(t=>!Object.hasOwn(input.targets,t.id)||!scope.includes(input.targets[t.id])))fail('Explicitly map every source target to an existing service in the allowed scope')
 if(!state.members.some(m=>m.id===input.owner&&m.active&&['admin','responder'].includes(m.role)))fail('Choose an active integration owner')
 const rules=template.routes.map(route=>({id:route.id,match:route.match,conditions:route.conditions,target:{service:input.targets[route.target]}}))
 return {scope,owner:input.owner,versions:[{version:1,...routingRules(scope,rules,template.catchAllTarget?input.targets[template.catchAllTarget]:null),publishedBy:actor,publishedAt:at}]}
}
