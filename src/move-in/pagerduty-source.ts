import type { ParsedRecord } from '../modules/import-kit/src/types'
import { fail } from '../family/response-operations/domain'

const escape=(key:string)=>key.replaceAll('~','~0').replaceAll('/','~1')
const referenceKinds:Record<string,string>={user:'users',schedule:'schedules',escalation_policy:'escalation_policies',team:'teams',service:'services',incident:'incidents',event_orchestration:'event_orchestrations'}
const accountKinds=new Set(['services','integrations','teams','incidents','maintenance_windows','business_services','event_orchestrations'])
type Binding={pointer:string;parentKind:string;parentId:string}
const parentKinds:Record<string,string>={contact_methods:'users',notification_rules:'users',overrides:'schedules',integrations:'services',log_entries:'incidents',subscribers:'business_services',orchestration_routers:'event_orchestrations'}

/** Empty containers and nulls are leaves too. Paths always address original bytes. */
export function pagerdutyLeaves(value:any,pointer='',path:string[]=[]):{pointer:string;path:string[];original:any}[] {
 if(value&&typeof value==='object'&&Object.keys(value).length)return Object.entries(value).flatMap(([key,child])=>pagerdutyLeaves(child,`${pointer}/${escape(key)}`,[...path,key]))
 return [{pointer,path,original:value}]
}

// Validate pagination per endpoint/parent. Never infer that a more:true page is
// a complete export, or splice the offset pages of different parents together.
function pages(value:any,bindings:Binding[]) {
 for(const [kind,responses] of Object.entries(value)) {
  if(kind==='_bindings')continue
  const grouped=new Map<string,any[]>()
  for(const [index,page] of (Array.isArray(responses)?responses:[responses]).entries()) {
   if(!page||typeof page!=='object')continue
   const paged=Object.hasOwn(page,'more'),cursor=Object.hasOwn(page,'next_cursor')
   if(!paged&&!cursor)continue
   const wrapper=kind==='event_orchestrations'?'orchestrations':kind==='automation_actions'?'actions':kind
   const items=page[wrapper],parent=bindings.find(b=>b.pointer.startsWith(`/${escape(kind)}/${index}/${wrapper}/`))
   const key=parent?JSON.stringify([parent.parentKind,parent.parentId]):kind
   if(!Array.isArray(items)||!Number.isSafeInteger(page.limit)||page.limit<1||items.length>page.limit||paged&&(typeof page.more!=='boolean'||!Number.isSafeInteger(page.offset)||page.offset<0)||cursor&&page.next_cursor!==null&&typeof page.next_cursor!=='string')fail(`Incomplete PagerDuty ${kind} pagination; save complete ordered response pages and preview again`)
   const group=grouped.get(key)??[];group.push(page);grouped.set(key,group)
  }
  for(const group of grouped.values())for(const [index,page] of group.entries()) {
   const prior=group[index-1],last=index===group.length-1
   if(Object.hasOwn(page,'more')&&(page.offset!==(prior?prior.offset+prior.limit:0)||page.more===last||page.total!==undefined&&page.total!==null&&(!Number.isSafeInteger(page.total)||page.total<0)))fail(`Incomplete PagerDuty ${kind} pagination; missing, repeated or out-of-order pages. Nothing was imported.`)
   if(Object.hasOwn(page,'next_cursor')&&((page.next_cursor===null)!==last||page.next_cursor!==null&&group.slice(0,index).some(p=>p.next_cursor===page.next_cursor)))fail(`Incomplete PagerDuty ${kind} cursor pagination; save all pages. Nothing was imported.`)
   const wrapper=kind==='event_orchestrations'?'orchestrations':kind==='automation_actions'?'actions':kind
   if(Object.hasOwn(page,'more')&&(page.more&&page[wrapper].length!==page.limit||page.total!==undefined&&page.total!==null&&page.total!==group.reduce((n,p)=>n+p[wrapper].length,0)))fail(`Incomplete PagerDuty ${kind} pagination; page counts do not reconcile with the saved total. Nothing was imported.`)
  }
 }
}

/** Embedded integrations are review records in their own right, joined only to the source service.
 * Never infer a native service or lose the original JSON pointer. */
export function pagerdutyRecords(input:ParsedRecord[],savedBindings?:unknown,original?:unknown):ParsedRecord[] {
 const bound=savedBindings!==undefined
 if(bound&&(!Array.isArray(savedBindings)||savedBindings.some(b=>!b||typeof b!=='object'||Object.keys(b).sort().join(',')!=='parentId,parentKind,pointer'||typeof b.pointer!=='string'||typeof b.parentKind!=='string'||typeof b.parentId!=='string')))fail('PagerDuty _bindings must list pointer, parentKind and parentId outside the saved responses')
 const bindings=(savedBindings??[]) as Binding[],byPointer=new Map<string,Binding>()
 for(const binding of bindings){if(byPointer.has(binding.pointer))fail(`Duplicate PagerDuty parent binding at ${binding.pointer}`);byPointer.set(binding.pointer,binding)}
 if(bound)pages(original,bindings)
 const records:ParsedRecord[]=[]
 for(const row of input) {
  if(!row.payload||Array.isArray(row.payload)||typeof row.payload!=='object')fail(`PagerDuty ${row.kind} at ${row.pointer} must be a complete object detail`)
  row.payload={...row.payload}
  if(bound&&!['subscribers','orchestration_routers'].includes(row.kind)&&(typeof (row.payload as any).id!=='string'||!(row.payload as any).id.trim()))fail(`PagerDuty ${row.kind} at ${row.pointer} has no source id; save the full object detail`)
  if(bound&&row.kind==='orchestration_routers'&&!(row.payload as any).parent?.id)fail(`PagerDuty router at ${row.pointer} has no original parent identity; save the full router detail`)
  const binding=byPointer.get(row.pointer??'')
  if(bound&&parentKinds[row.kind]&&!binding)fail(`PagerDuty ${row.kind} at ${row.pointer} is missing its separate parent binding`)
  if(binding) {
   if(parentKinds[row.kind]!==binding.parentKind)fail(`PagerDuty ${row.kind} at ${row.pointer} has the wrong parent kind`)
   const value=row.payload as any
   if((value.service?.id??value.parent?.id??value.schedule_id??value._parent?.id??value._service?.id??binding.parentId)!==binding.parentId)fail(`PagerDuty ${row.kind} at ${row.pointer} contradicts its parent binding`)
   value._pdParent={kind:binding.parentKind,id:binding.parentId,...(binding.parentKind==='users'?{type:'user_reference'}:{})}
   if(row.kind==='overrides')value._parent??={id:binding.parentId}
   if(row.kind==='integrations')value._service??={id:binding.parentId,type:'service_reference'}
   if(row.kind==='orchestration_routers')row.sourceId=String(value.parent?.id??binding.parentId)
   if(row.kind==='subscribers') {
    if(typeof value.subscriber_id!=='string'||!['user','team'].includes(value.subscriber_type))fail(`PagerDuty subscriber at ${row.pointer} needs subscriber_id and subscriber_type`)
    row.sourceId=`${binding.parentId}:${value.subscriber_type}:${value.subscriber_id}`
   }
  }
  records.push(row)
  const value=row.payload as any
  if(row.kind==='services'&&value?.integrations!==undefined) {
   const body=value.integrations,items=Array.isArray(body)?body:body?.integrations
   if(!Array.isArray(items))fail(`Service ${value.name??row.sourceId} integrations at ${row.pointer}/integrations must be a saved list; export the integration details again. Nothing was imported.`)
   items.forEach((integration:any,index:number)=>{
    const item=integration?.integration??integration
    if(bound&&(item?.type==='integration_reference'||typeof item?.type==='string'&&item.type.endsWith('_integration_reference')))return
    records.push({kind:'integrations',sourceId:String(item?.id??''),payload:{...item,_service:{id:row.sourceId,type:'service_reference'}},
     pointer:`${row.pointer}/integrations${Array.isArray(body)?'':'/integrations'}/${index}${integration?.integration?'/integration':''}`})
   })
  }
 }
 for(const binding of bindings)if(!records.some(row=>row.pointer===binding.pointer))fail(`PagerDuty parent binding at ${binding.pointer} names no saved object`)
 const identities=new Map<string,ParsedRecord>()
 for(const row of records) {
  const key=JSON.stringify([row.kind,row.sourceId]),prior=identities.get(key)
  if(prior)fail(`Duplicate PagerDuty ${row.kind} source id "${row.sourceId}" at ${row.pointer} and ${prior.pointer}; keep one saved detail per object and preview again. Nothing was imported.`)
  identities.set(key,row)
  if(accountKinds.has(row.kind)&&(!row.sourceId||((row.payload as any)?.id??(row.kind==='event_orchestrations'?(row.payload as any)?.parent?.id:undefined))===undefined))
   fail(`PagerDuty ${row.kind} at ${row.pointer} has no source id; save the full object detail and preview again. Nothing was imported.`)
 }
 const has=(kind:string,id:unknown)=>identities.has(JSON.stringify([kind,String(id)]))
 for(const row of records) {
  const value=row.payload as any,parent=value._pdParent
  if(parent&&!has(parent.kind,parent.id))fail(`PagerDuty ${row.kind} ${row.sourceId} has a dangling parent ${parent.id}`)
  if(bound&&['users','services'].includes(row.kind))for(const field of row.kind==='users'?['contact_methods','notification_rules']:['integrations']) {
   for(const reference of value[field]??[])if(!records.some(child=>child.kind===field&&child.sourceId===reference.id&&(child.payload as any)._pdParent?.id===row.sourceId))fail(`PagerDuty ${row.kind} ${row.sourceId} is missing ${field} detail ${reference.id}; include its original response and parent binding`)
  }
  if(parent?.kind==='users') {
   const user=identities.get(JSON.stringify(['users',parent.id]))!.payload as any
   const key=row.kind==='contact_methods'?'_pdContacts':'_pdNotifications'
   ;(user[key]??=[]).push(value)
  }
  // A bound override changes its receiving schedule even when the schedule
  // endpoint's own bytes are identical. Include that dependency in its source
  // hash so the shared catch-up cannot skip the schedule's complete mapping.
  if(parent?.kind==='schedules'&&row.kind==='overrides') {
   const schedule=identities.get(JSON.stringify(['schedules',parent.id]))!.payload as any
   ;(schedule._pdOverrides??=[]).push(value)
  }
 }
 // Keep the established strict converter's schedule/policy refusals unchanged.
 // Account evidence may not claim a relationship to an object the file omitted.
 const account=input.some(row=>accountKinds.has(row.kind))
 // The shipped four-category exporter retains user team metadata without reading team details.
 for(const row of records.filter(row=>bound||accountKinds.has(row.kind)||account&&row.kind==='users')) {
  const visit=(value:any,pointer:string):void=>{
   if(Array.isArray(value)){value.forEach((item,index)=>visit(item,`${pointer}/${index}`));return}
   if(!value||typeof value!=='object')return
   const type=typeof value.type==='string'?value.type.replace(/_reference$/,''):'',kind=referenceKinds[type]
   if(kind&&value.id!==undefined&&!has(kind,value.id))
    fail(`PagerDuty ${row.kind} ${(row.payload as any)?.name??row.sourceId} has a dangling ${kind} reference "${value.id}" at ${pointer}; include that object's saved detail or correct the reference and preview again. Nothing was imported.`)
   if(bound&&['phone_contact_method','sms_contact_method','email_contact_method','push_notification_contact_method'].includes(type)&&value.id!==undefined&&!has('contact_methods',value.id))fail(`PagerDuty ${row.kind} ${row.sourceId} is missing contact detail ${value.id}`)
   for(const [key,child] of Object.entries(value)) {
    if(['event_orchestrations','orchestration_routers'].includes(row.kind)&&key==='route_to'&&typeof child==='string'&&child!=='unrouted'&&!has('services',child))
     fail(`PagerDuty orchestration ${row.sourceId} has a dangling services route "${child}" at ${pointer}/route_to; include that service's saved detail or correct the route and preview again. Nothing was imported.`)
    visit(child,`${pointer}/${escape(key)}`)
   }
  }
  visit(row.payload,row.pointer??'')
 }
 // Assign each original leaf once to the deepest source record, so embedded
 // integration fields cannot also be counted as service fields. Envelope and
 // packaging leaves stay explicitly retained, attached to the first record.
 if(original!==undefined&&records.length) {
  const ordered=[...records].sort((a,b)=>(b.pointer?.length??0)-(a.pointer?.length??0))
  const leaves=new Map(records.map(row=>[row,[] as string[]])),envelopes=new Map(records.map(row=>[row,[] as any[]]))
  const atPointer=new Map(records.map(row=>[row.pointer,row]))
  for(const leaf of pagerdutyLeaves(original)) {
   const row=ordered.find(row=>leaf.pointer===row.pointer||leaf.pointer.startsWith(row.pointer+'/'))
   if(row) {
    leaves.get(row)!.push(leaf.pointer)
    if(leaf.pointer===row.pointer)(row.payload as any)._pdRootEmpty=true
   } else {
    // Binding metadata belongs to its child, not an unrelated first person.
    // Erasing that parent then retires the right custody without linking all
    // people in the file to one profile. Store original envelope values only;
    // ordinary leaf values already exist at their exact payload paths.
    const binding=leaf.path[0]==='_bindings'?bindings[Number(leaf.path[1])]:undefined
    const owner=binding?atPointer.get(binding.pointer):undefined
    envelopes.get(owner??records[0])!.push([leaf.pointer,leaf.original])
   }
  }
  for(const row of records) {
   ;(row.payload as any)._pdFields=leaves.get(row)
   if(envelopes.get(row)!.length)(row.payload as any)._pdEnvelope=envelopes.get(row)
  }
 }
 return records
}
