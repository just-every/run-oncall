import type { ParsedRecord } from '../modules/import-kit/src/types'
import { fail } from '../family/response-operations/domain'

const escape=(key:string)=>key.replaceAll('~','~0').replaceAll('/','~1')
const referenceKinds:Record<string,string>={user:'users',schedule:'schedules',escalation_policy:'escalation_policies',team:'teams',service:'services'}
const accountKinds=new Set(['services','integrations','teams','incidents','maintenance_windows','business_services','event_orchestrations'])

/** Embedded integrations are review records in their own right, joined only to the source service.
 * Never infer a native service or lose the original JSON pointer. */
export function pagerdutyRecords(input:ParsedRecord[]):ParsedRecord[] {
 const records:ParsedRecord[]=[]
 for(const row of input) {
  records.push(row)
  const value=row.payload as any
  if(row.kind==='services'&&value?.integrations!==undefined) {
   const body=value.integrations,items=Array.isArray(body)?body:body?.integrations
   if(!Array.isArray(items))fail(`Service ${value.name??row.sourceId} integrations at ${row.pointer}/integrations must be a saved list; export the integration details again. Nothing was imported.`)
   items.forEach((integration:any,index:number)=>{
    const item=integration?.integration??integration
    records.push({kind:'integrations',sourceId:String(item?.id??''),payload:{...item,_service:{id:row.sourceId,type:'service_reference'}},
     pointer:`${row.pointer}/integrations${Array.isArray(body)?'':'/integrations'}/${index}${integration?.integration?'/integration':''}`})
   })
  }
 }
 const identities=new Map<string,ParsedRecord>()
 for(const row of records) {
  const key=JSON.stringify([row.kind,row.sourceId]),prior=identities.get(key)
  if(prior)fail(`Duplicate PagerDuty ${row.kind} source id "${row.sourceId}" at ${row.pointer} and ${prior.pointer}; keep one saved detail per object and preview again. Nothing was imported.`)
  identities.set(key,row)
  if(accountKinds.has(row.kind)&&(!row.sourceId||(row.payload as any)?.id===undefined&&row.kind!=='event_orchestrations'))
   fail(`PagerDuty ${row.kind} at ${row.pointer} has no source id; save the full object detail and preview again. Nothing was imported.`)
 }
 const has=(kind:string,id:unknown)=>identities.has(JSON.stringify([kind,String(id)]))
 // Keep the established strict converter's schedule/policy refusals unchanged.
 // Account evidence may not claim a relationship to an object the file omitted.
 for(const row of records.filter(row=>accountKinds.has(row.kind))) {
  const visit=(value:any,pointer:string):void=>{
   if(Array.isArray(value)){value.forEach((item,index)=>visit(item,`${pointer}/${index}`));return}
   if(!value||typeof value!=='object')return
   const type=typeof value.type==='string'?value.type.replace(/_reference$/,''):'',kind=referenceKinds[type]
   if(kind&&value.id!==undefined&&!has(kind,value.id))
    fail(`PagerDuty ${row.kind} ${(row.payload as any)?.name??row.sourceId} has a dangling ${kind} reference "${value.id}" at ${pointer}; include that object's saved detail or correct the reference and preview again. Nothing was imported.`)
   for(const [key,child] of Object.entries(value))visit(child,`${pointer}/${escape(key)}`)
  }
  visit(row.payload,row.pointer??'')
 }
 return records
}
