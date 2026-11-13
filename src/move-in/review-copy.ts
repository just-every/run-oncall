/** Presentation only: the saved plan, its differences and fingerprint stay untouched. */
const kinds:Record<string,string>={users:'Person',schedules:'Schedule',services:'Service',integrations:'Integration',escalations:'Escalation policy',escalation_policies:'Escalation policy',overrides:'Override',timelines:'Coverage comparison',teams:'Team',business_services:'Business service',maintenance_windows:'Maintenance window',event_orchestrations:'Event routing',incidents:'Incident'}
const fields:Record<string,string>={
 related_users:'people referenced by the source',backup:'backup coverage',final_schedule:'final coverage list',schedule_layers:'schedule rotations',rendered_schedule_entries:'coverage periods',
 contact_methods:'contact methods',notification_rules:'notification rules',country_code:'country calling code',phone_contact_method:'phone contact',sms_contact_method:'SMS contact',email_contact_method:'email contact',push_notification_contact_method:'push contact',
 alert_grouping_parameters:'alert grouping',support_hours:'support hours',incident_urgency_rule:'incident urgency',auto_resolve_timeout:'automatic resolution timeout',acknowledgement_timeout:'acknowledgment timeout',escalation_policy:'escalation policy',catch_all:'default route',dynamic_route_to:'dynamic routing',
 generic_events_api_inbound_integration:'Events API',events_api_v1_inbound_integration:'Events API v1',events_api_v2_inbound_integration:'Events API v2',email_inbound_integration:'email integration',
}
const words=(value:string)=>fields[value.replaceAll('-','_')]??value.replaceAll('_',' ').replace(/([a-z])([A-Z])/g,'$1 $2')
export const reviewKind=(kind:string)=>kinds[kind]??words(kind)
const sentence=(text:string)=>/[.!?]$/.test(text)?text:text+'.'

export function reviewCopy(items:any[]) {
 const names=new Map<string,string>()
 for(const item of items) {
  names.set(item.id,item.name)
  for(const effect of item.effects??[]) {
   names.set(effect.targetId,item.name)
   if(effect.value.email)names.set(effect.value.email,item.name)
  }
 }
 // Replace whole source references, longest first, without touching a name that
 // happens to contain another reference. Never interpolate file text into HTML.
 const refs=[...names.keys()].filter(key=>key&&names.get(key)!==key).sort((a,b)=>b.length-a.length)
 const pattern=refs.length?new RegExp(`(?<![\\w@.-])(?:${refs.map(key=>key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})(?![\\w@.-])`,'g'):null
 const named=(text:string)=>pattern?text.replace(pattern,ref=>names.get(ref)!):text
 const readable=(text:string)=>named(text).replace(/\b[a-zA-Z][a-zA-Z0-9]*(?:_[a-zA-Z0-9]+)+\b/g,words)
 const date=(value:string)=>new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(value))+' UTC'
 return {
  rejection:(item:any)=>sentence(readable(item.rejection).replace(new RegExp('^'+item.kind+'\\s'),reviewKind(item.kind)+' ')),
  effect:(item:any)=>{
   if(item.rejection)return 'Oncall will keep the original for review and will not create an active object from it.'
   if(item.effects?.some((effect:any)=>effect.targetKind==='user'))return `The file includes ${item.name}. Oncall will match this person by email and keep the imported profile paused, without sign-in or paging access.`
   const schedule=item.effects?.find((effect:any)=>effect.targetKind==='schedule')?.value.schedule
   if(schedule)return `The file defines ${item.name} with ${[...new Set<string>(schedule.primary.members)].map(member=>names.get(member)??'a person missing from the exported people list').join(', ')}. Oncall will import the schedule paused; you must choose a service and match each person before making it live.`
   if(item.effects?.some((effect:any)=>effect.targetKind==='policy'))return `The file defines ${item.name}. Oncall will keep the mapped escalation steps paused; no notifications start.`
   return ''
  },
  difference:(item:any,difference:any)=>{
   if(difference.field==='related-users')return `The file refers to ${named(difference.reason.replace(/^Retained source references: /,'').replace(/\. No login or paging authority is granted\.$/,''))}. Oncall keeps these references for review; they grant no sign-in or paging access.`
   if(difference.field==='backup')return `The file defines one rotation for ${item.name}. Oncall will leave backup coverage empty. Add a backup after adopting the schedule, or continue with this gap.`
   if(item.kind==='schedules'&&difference.reason==='Retained source metadata; not an active Oncall rule.')return `The source’s ${words(difference.field)} for ${item.name} will be kept for review, without becoming an active Oncall rule.`
   return sentence(readable(difference.reason))
  },
  comparison:(item:any,equivalence:any):string[]=>{
   if(equivalence.status==='not-supplied')return [equivalence.differences?.some((text:string)=>text.includes('outside'))
    ?`The source’s coverage list does not overlap the rotation imported for ${item.name}. Export coverage for this rotation’s dates and preview again, or continue without a coverage comparison. The schedule stays paused.`
    :`The file does not include the source’s final coverage list for ${item.name}. Oncall cannot compare who is on call. Export that list and preview again, or continue without this comparison. The schedule stays paused.`]
   const window=equivalence.from&&equivalence.to?` from ${date(equivalence.from)} to ${date(equivalence.to)}`:''
   if(equivalence.status==='equivalent-in-window')return [`The source and Oncall assign the same people to ${item.name}${window}. Dates outside this comparison have not been checked.`]
   return [`The source and Oncall differ for ${item.name}${window}. Review the assignments before adopting the schedule.`,...(equivalence.differences??[]).map((text:string)=>{
    const match=text.match(/^(\S+): incumbent (.+), Oncall (.+)$/)
    if(match)return `At ${date(match[1])}, the source assigns ${match[2]==='gap'?'no one':named(match[2])}; Oncall assigns ${match[3]==='gap'?'no one':named(match[3])}.`
    return 'The source coverage list contains invalid or overlapping periods, or recipients missing from the exported people list. Export the people and final coverage lists again and preview them together; do not adopt this schedule until you have reviewed the difference.'
   })]
  },
 }
}
