import { compare, crossesOffsetChange } from './equivalence';
import type { ImportMapping, SourceRecord, MappingResult } from '../modules/import-kit/src/types'
import { validateSchedule } from '../family/response-operations/schedules'
import { mailbox, mapSchedule, type Mapped } from './rotations'
import type { Vendor } from './source'

type MappingRecord=Pick<SourceRecord,'kind'|'sourceId'|'payload'|'location'>
export function mapping(vendor:Vendor,source:{records:MappingRecord[]},now:number):ImportMapping {
 const emails=new Map<string,string>()
 for(const row of source.records.filter(r=>r.kind==='users')) {
  const user=row.payload as any
  try {const email=mailbox(user.email??user.username);emails.set(String(user.id),email);emails.set(email,email)}catch{}
 }
 const scheduleRows=source.records.filter(r=>r.kind==='schedules')
 const schedules=new Map<string,Mapped>(),errors=new Map<string,string>()
 // A schedule keeps every reason it is refused: an override's own refusal is added beside the schedule's, never in its place.
 const refuse=(id:string,why:string)=>errors.set(id,errors.has(id)?`${errors.get(id)}; ${why}`:why)
 for(const row of scheduleRows) {
  try {schedules.set(row.sourceId,mapSchedule(vendor,row.payload,emails,now))}catch(e){refuse(row.sourceId,(e as Error).message)}
 }
 const rawRotation=new Map<string,any>(scheduleRows.map(r=>[r.sourceId,((r.payload as any).rotations??[])[0]]))
 const scheduleName=(id:string)=>(scheduleRows.find(r=>r.sourceId===id)?.payload as any)?.name??id
 // A saved override list names no schedule unless the file adds it beside the list; then it belongs to the bundle's only schedule, and with several it is unknown.
 const parentOf=(input:any)=>{const id=input.scheduleId??input.schedule_id??input._parent?.id;return id!==undefined?String(id):scheduleRows.length===1?scheduleRows[0].sourceId:undefined}
 const overrideErrors=new Map<string,string>(),place=(record:MappingRecord)=>record.location.pointer??record.sourceId
 for(const row of source.records.filter(r=>r.kind==='overrides')) {
  const input=row.payload as any,alias=input.alias??input.id,id=parentOf(input)
  if(id===undefined) {
   overrideErrors.set(place(row),`it names no schedule and the export holds ${scheduleRows.length} schedules; save the overrides list with ${vendor==='opsgenie'?'scheduleId':'schedule_id'} beside it`)
   // Any of them may be the schedule it changes, so none can claim its coverage during the override.
   for(const other of scheduleRows)refuse(other.sourceId,`Override ${alias} names no schedule, so coverage during it is unknown`)
   continue
  }
  try {
   const allowed=['id','alias','scheduleId','schedule_id','_parent','user','participants','rotations','startDate','endDate','start','end','type','self']
   const unknown=Object.keys(input).filter(k=>!allowed.includes(k));if(unknown.length)throw Error(`unknown fields ${unknown.join(', ')}`)
   const refs=vendor==='opsgenie'?input.user??input.participants?.[0]:input.user
   if(vendor==='opsgenie'&&input.participants&&input.participants.length!==1)throw Error('multiple override participants')
   if(refs?.type&&!['user','user_reference'].includes(refs.type))throw Error(`override recipient ${refs.type} cannot map (teams and escalations are unsupported)`)
   // An Opsgenie override may name the rotations it covers; Oncall maps exactly one, so it must be that one.
   const named=(input.rotations??[]) as any[],own=rawRotation.get(id)
   if(named.some(r=>r.id!==own?.id&&r.name!==own?.name))throw Error(`override covers rotation ${named.map(r=>r.name??r.id).join(', ')}, which is not the one rotation mapped`)
   const member=refs?.username?mailbox(refs.username):emails.get(String(refs?.id))
   if(!member||!emails.has(member))throw Error(`override user ${refs?.username??refs?.id??'(none)'} is not among the exported users; Oncall never invents a responder`)
   const override={id:String(alias),role:'primary',start:new Date(input.startDate??input.start).toISOString(),end:new Date(input.endDate??input.end).toISOString(),member}
   const mapped=schedules.get(id)
   if(!mapped){overrideErrors.set(place(row),scheduleRows.some(r=>r.sourceId===id)?`its schedule ${scheduleName(id)} is refused: ${errors.get(id)}`:`schedule ${id} is not in the export`);continue}
   mapped.schedule=validateSchedule({...mapped.schedule,overrides:[...mapped.schedule.overrides,override]})
  }catch(e){overrideErrors.set(place(row),(e as Error).message);refuse(id,`Override ${alias}: ${(e as Error).message}`)}
 }
 const equivalence=new Map<string,any>()
 for(const row of source.records.filter(r=>r.kind==='schedules')) {
  if(errors.has(row.sourceId))continue
  const raw=row.payload as any, timeline=vendor==='opsgenie'?source.records.find(r=>r.kind==='timelines'&&String((r.payload as any)._parent?.id)===row.sourceId)?.payload:raw.final_schedule
  try {
   const mapped=schedules.get(row.sourceId)!,result=compare(mapped.schedule,vendor,timeline,emails)
   if(mapped.zone) {
    const refuse=(why:string)=>{throw Error(`${mapped.zone!.layer}: fixed-second turns in ${mapped.zone!.zone} need incumbent DST equivalence evidence; calendar-day conversion refused (${why})`)}
    if(result.status==='not-supplied')refuse('no final timeline supplied')
    if(result.status==='differences')refuse(`timeline differs: ${result.differences.slice(0,3).join('; ')}`)
    if(!crossesOffsetChange(mapped.zone.zone,result.from!,result.to!))refuse(`the supplied timeline ${result.from} to ${result.to} has no UTC-offset change in ${mapped.zone.zone}`)
   }
   equivalence.set(row.sourceId,result)
  }catch(e){errors.set(row.sourceId,`Timeline equivalence: ${(e as Error).message}`)}
 }
 const effect=(kind:string,id:string,value:any):MappingResult=>({effects:[{targetKind:kind,targetId:id,value:{...value,paused:true,paging:false,login:false}}]})
 return {version:'oncall-move-in-1',map(record){
  const value=record.payload as any,label=value?.fullName??value?.name??value?.summary??value?.username??value?.email??record.sourceId
  try {
   if(record.kind==='users') {
    const email=mailbox(value.email??value.username)
    const result=effect('user',email,{id:email,name:value.fullName??value.name??email,email,sourceId:record.sourceId})
    result.unmapped=Object.keys(value).filter(k=>!['id','email','username','name','fullName'].includes(k)).flatMap(field=>Array.isArray(value[field])?value[field].map((rule:any,i:number)=>({field:field+'.'+i,reason:`User ${label} rule ${rule.name??rule.id??i}: retained only; no delivery or access is activated`})): [{field,reason:`User ${label}: profile/contact/notification rule is retained only; no delivery or access is activated`}])
    return result
   }
   if(record.kind==='schedules') {
    if(errors.has(record.sourceId))throw Error(errors.get(record.sourceId))
    const mapped=schedules.get(record.sourceId);if(!mapped)throw Error('missing rotation definitions')
    return {...effect('schedule',mapped.schedule.id,{schedule:mapped.schedule,sourceId:record.sourceId,equivalence:equivalence.get(record.sourceId),...mapped.history.length?{history:mapped.history}:{}}),unmapped:mapped.unmapped}
   }
   if(record.kind==='timelines')return {effects:[],unmapped:[{field:'timeline',reason:'Retained final timeline is compared with every model/source boundary; no delivery is inferred.'}]}
   if(record.kind==='overrides') {
    const id=parentOf(value)
    if(overrideErrors.has(place(record)))throw Error(overrideErrors.get(place(record)))
    if(errors.has(id!))throw Error(`its schedule ${scheduleName(id!)} is refused: ${errors.get(id!)}`)
    return {effects:[],unmapped:[{field:'override',reason:`${label}: represented in the complete paused schedule; retained here as source evidence`}]}
   }
   if(['escalations','escalation_policies'].includes(record.kind)) {
    const steps=value.rules??value.escalation_rules
    if(!Array.isArray(steps)||!steps.length||steps.length>2)throw Error(`Policy ${label}: missing or more than two steps`)
    if((value.repeat?.count??value.num_loops??0)!==0||value.repeatEnabled)throw Error(`Policy ${label}: repeats are unsupported`)
    const differences:{field:string;reason:string}[]=[]
    const normalized=steps.map((step:any,index:number)=>{
     if(step.condition&&step.condition!=='if-not-acked')throw Error(`Policy ${label} step ${index+1}: notification condition ${step.condition}`)
     if(step.timeRestriction||step.restrictions?.length)throw Error(`Policy ${label} step ${index+1}: time restrictions`)
     const targets=step.targets??[step.recipient]
     if(targets.length!==1||!targets[0])throw Error(`Policy ${label} step ${index+1}: simultaneous or missing recipients`)
     const target=targets[0],scheduleId=target.id
     if(!['schedule','schedule_reference'].includes(target.type)||!schedules.has(scheduleId)||errors.has(scheduleId))throw Error(`Policy ${label} step ${index+1}: direct user, nested or unmapped schedule ${scheduleId}`)
     const minutes=step.escalation_delay_in_minutes??step.delay?.timeAmount
     if(step.delay&&step.delay.timeUnit!=='minutes')throw Error(`Policy ${label} step ${index+1}: unsupported delay unit`)
     if(!Number.isSafeInteger(minutes)||minutes<0||(minutes===0&&index!==0))throw Error(`Policy ${label} step ${index+1}: delay must be a whole number of at least 1 minute after the first step`)
     if(minutes===0)differences.push({field:'rules.0.delay',reason:`Policy ${label}: immediate first notification (0 minutes) is mapped to 1 minute in the paused policy. This changes timing; it is not equivalent. The original remains in the journal. No policy is activated and paging stays OFF.`})
     const allowed=['id','condition','recipient','targets','delay','escalation_delay_in_minutes','notifyType','timeRestriction','restrictions']
     const unknown=Object.keys(step).filter(k=>!allowed.includes(k));if(unknown.length)throw Error(`Policy ${label} step ${index+1}: unmapped rules ${unknown.join(', ')}`)
     if(step.notifyType&&step.notifyType!=='default')throw Error(`Policy ${label} step ${index+1}: notifyType ${step.notifyType}`)
     return {scheduleId:`${vendor}:${scheduleId}`,delayMinutes:Math.max(1,minutes),condition:'if-not-acked'}
    })
    const result=effect('policy',`${vendor}:${record.sourceId}`,{name:label,steps:normalized,sourceId:record.sourceId})
    result.unmapped=[...differences,...Object.keys(value).filter(k=>!['id','name','rules','escalation_rules','num_loops','repeat','repeatEnabled'].includes(k)).map(field=>({field,reason:`Policy ${label}: metadata is retained only, not an active rule`}))]
    return result
   }
   return {effects:[],rejection:`${record.kind} ${label}: unsupported object (incident history, routes, event rules, maintenance windows and notification rules are not migrated)`}
  }catch(error){return {effects:[],rejection:`${record.kind} ${label}: ${(error as Error).message}`}}
 }}
}
