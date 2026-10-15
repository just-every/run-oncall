import { validateSchedule, resolveLocal, type Rotation, type Schedule } from '../family/response-operations/schedules'
import type { Vendor } from './source'

export const mailbox=(value:unknown)=>{if(typeof value!=='string'||!/^\S+@\S+\.\S+$/.test(value.trim()))throw Error('A user email is required for identity matching');return value.trim().toLowerCase()}
export function wall(instant:string,timezone:string) {
 const at=Date.parse(instant);if(!Number.isFinite(at)||at%60000!==0)throw Error('Handoff must be an exact calendar minute')
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at).map(p=>[p.type,p.value]))
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
export type Mapped={schedule:Schedule;unmapped:{field:string;reason:string}[];history:{name:string;start:string;end:string}[];zone?:{zone:string;layer:string}}
export function mapSchedule(vendor:Vendor,input:any,emails:Map<string,string>,now:number):Mapped {
 const timezone=vendor==='opsgenie'?input.timezone:input.time_zone
 let layers=vendor==='opsgenie'?input.rotations:input.schedule_layers
 const history:Mapped['history']=[]
 // A disabled Opsgenie schedule puts no one on call; importing it as coverage would page people the incumbent does not.
 if(vendor==='opsgenie'&&input.enabled!==undefined&&input.enabled!==true)throw Error('the schedule is disabled in Opsgenie (enabled: false), so it puts no one on call and Oncall does not import it as coverage; enable it in Opsgenie and export again, or leave it out')
 // PagerDuty keeps a replaced layer in the list with its own documented end. Layers that ended before the one open-ended layer began are history, not coverage.
 if(vendor==='pagerduty'&&Array.isArray(layers)&&layers.length>1) {
  const open=layers.filter((l:any)=>l?.end==null),active=open[0]
  if(open.length===1&&layers.every((l:any)=>l===active||(typeof l?.end==='string'&&Date.parse(l.end)<=Date.parse(active.start)))) {
   // A layer is active from its own start until its own end, whatever starts later: one that has not ended yet is coverage now, not history.
   const running=layers.find((l:any)=>l!==active&&Date.parse(l.end)>now),name=(l:any)=>l.name??l.id??'unnamed layer'
   if(running)throw Error(`layer ${name(running)} is still active until ${new Date(running.end).toISOString()}, and layer ${name(active)} replaces it from ${new Date(active.start).toISOString()}; Oncall holds one rotation per schedule, so this schedule can be imported once ${name(running)} has ended`)
   for(const ended of layers.filter((l:any)=>l!==active))history.push({name:ended.name??ended.id??'unnamed layer',start:new Date(ended.start).toISOString(),end:new Date(ended.end).toISOString()})
   layers=[active]
  }
 }
 if(!Array.isArray(layers)||layers.length!==1)throw Error(`Concurrent/layered rotations cannot be mapped: ${(layers??[]).map((v:any)=>v.name??v.id).join(', ')||'missing definitions'}`)
 const layer=layers[0],label=layer.name??layer.id??'unnamed rotation'
 if(layer.timeRestriction || layer.restrictions?.length)throw Error(`${label}: time restrictions are unsupported`)
 let days:number,zone:Mapped['zone']
 if(vendor==='opsgenie') {
  if(!['daily','weekly'].includes(layer.type))throw Error(`${label}: ${layer.type} rotation cannot map to calendar days`)
  days=layer.length*(layer.type==='weekly'?7:1)
 } else {
  days=layer.rotation_turn_length_seconds/86400
  // Fixed-second turns in a zone with offset changes are calendar days only where the incumbent's own timeline says so (mapping.ts checks it).
  if(timezone!=='UTC'&&timezone!=='Etc/UTC'&&Number.isSafeInteger(days)&&days>=1)zone={zone:timezone,layer:label}
 }
 if(!Number.isSafeInteger(days)||days<1||days>366)throw Error(`${label}: sub-day or invalid rotation length`)
 const start=vendor==='opsgenie'?layer.startDate:layer.start
 const anchor=vendor==='opsgenie'?start:layer.rotation_virtual_start
 const anchorLocal=wall(anchor,timezone),resolved=resolveLocal(anchorLocal,timezone,'reject')
 if(resolved===null||resolved!==Date.parse(anchor))throw Error(`${label}: ambiguous or nonexistent hand-off boundary`)
 const participants=vendor==='opsgenie'?layer.participants:layer.users
 if(!Array.isArray(participants)||!participants.length)throw Error(`${label}: participants are missing`)
 const members=participants.map((p:any)=>{
  const user=vendor==='opsgenie'?p:p.user
  if(vendor==='opsgenie'&&user.type!=='user')throw Error(`${label}: participant ${user.type} cannot map (team, nested schedule and empty slots are unsupported)`)
  const email=user.username?mailbox(user.username):emails.get(String(user.id))
  if(!email||!emails.has(email))throw Error(`${label}: missing exported user ${user.id??user.username}`)
  return email
 })
 const primary:Rotation={anchorLocal,periodDays:days,members,ambiguity:'reject'}
 const schedule=validateSchedule({id:`${vendor}:${input.id}`,name:input.name,service:`${vendor}:${input.id}`,revision:1,timezone,validFrom:new Date(start).toISOString(),validUntil:layer.endDate||layer.end?new Date(layer.endDate??layer.end).toISOString():null,primary,backup:{...primary,members:[]},overrides:[]})
 const keys=vendor==='opsgenie'?['id','name','timezone','rotations','enabled','description','ownerTeam']:['id','name','time_zone','schedule_layers','description','summary','type','self','html_url','users','teams','escalation_policies','overrides_subschedule','final_schedule','next_oncall_for_user']
 const layerKeys=vendor==='opsgenie'?['id','name','startDate','endDate','type','length','participants','timeRestriction']:['id','name','start','end','rotation_virtual_start','rotation_turn_length_seconds','users','restrictions','rendered_schedule_entries','rendered_coverage_percentage']
 const unknown=[...Object.keys(input).filter(k=>!keys.includes(k)),...(vendor==='opsgenie'?input.rotations:input.schedule_layers).flatMap((l:any)=>Object.keys(l).filter(k=>!layerKeys.includes(k)).map(k=>`rotation.${k}`))]
 if(unknown.length)throw Error(`${label}: unknown rotation/rule fields ${unknown.join(', ')}`)
 const unmapped=[{field:'backup',reason:'Source has one rotation; backup is an explicit gap. No backup authority is inferred.'}]
 for(const key of keys.filter(k=>!['id','name','timezone','time_zone','rotations','schedule_layers'].includes(k)))if(input[key]!==undefined)unmapped.push({field:key,reason:'Retained source metadata; not an active Oncall rule.'})
 for(const ended of history)unmapped.push({field:'schedule_layers.history',reason:`Ended layer ${ended.name} (${ended.start} → ${ended.end}) is retained as history only; it is not concurrent coverage`})
 return {schedule,unmapped,history,zone}
}
