import {resolveLocal, validateSchedule, type Rotation} from '../family/response-operations/schedules'
import type {Mapped} from './rotations'

const scheduleFields=['id','name','type','time_zone','team_id','slack','shifts','on_call_now','enable_web_overrides','ical_url_overrides']
const shiftFields=['id','name','type','time_zone','team_id','schedule','level','start','rotation_start','duration','frequency','interval','until','week_start','by_day','by_month','by_monthday','rolling_users','start_rotation_from_user_index']
const weekdays=['SU','MO','TU','WE','TH','FR','SA']
const utc=(zone:unknown)=>zone==='UTC'||zone==='Etc/UTC'
const empty=(value:unknown)=>value==null||Array.isArray(value)&&value.length===0

export function grafanaSchedule(original:any,details:any[],emails:Map<string,string>):Mapped {
 if(original?.type!=='calendar')throw Error(`schedule type ${original?.type??'missing'} is unsupported; import requires a calendar schedule with one rolling shift`)
 const unknown=Object.keys(original).filter(key=>!scheduleFields.includes(key))
 if(unknown.length)throw Error(`unsupported schedule fields ${unknown.join(', ')}`)
 if(original.ical_url_overrides!==null||![false,null].includes(original.enable_web_overrides))throw Error('missing override settings or externally managed overrides; a calendar must explicitly have no override calendar or web overrides')
 if(!utc(original.time_zone))throw Error(`time zone ${original.time_zone??'missing'} is unsupported; only UTC rolling shifts can map`)
 if(typeof original.id!=='string'||!original.id)throw Error('missing exported schedule ID')
 if(!Array.isArray(original.shifts)||original.shifts.length!==1||typeof original.shifts[0]!=='string'||details.length>1)
  throw Error(`expected exactly one rolling shift; found ${details.map((shift:any)=>shift?.name??shift?.id).join(', ')||'missing shift definitions'}`)
 const shift=details[0]
 if(shift?.id!==original.shifts[0])throw Error(`missing saved detail for shift ${original.shifts[0]}`)
 const label=shift.name??shift.id
 if(shift.type!=='rolling_users')throw Error(`shift ${label}: ${shift.type??'missing shift type'} cannot map`)
 const unknownShift=Object.keys(shift).filter(key=>!shiftFields.includes(key))
 if(unknownShift.length)throw Error(`shift ${label}: unsupported fields ${unknownShift.join(', ')}`)
 if(shift.time_zone!=null&&!utc(shift.time_zone))throw Error(`shift ${label}: time zone ${shift.time_zone} is unsupported`)
 const days=shift.frequency==='daily'?1:shift.frequency==='weekly'?7:0
 if(!days||shift.interval!==1||shift.duration!==days*86400)throw Error(`shift ${label}: ${shift.frequency??'missing frequency'} must be a continuous daily or weekly rotation with one full turn per interval`)
 if(shift.until!==null||!empty(shift.by_month)||!empty(shift.by_monthday))throw Error(`shift ${label}: finite rotations and month restrictions are unsupported`)
 if(typeof shift.start!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(shift.start)||shift.start!==shift.rotation_start)
  throw Error(`shift ${label}: start and rotation start must be the same exact calendar minute`)
 const anchorLocal=shift.start.slice(0,16), at=resolveLocal(anchorLocal,'UTC','reject')
 if(at===null)throw Error(`shift ${label}: invalid UTC hand-off`)
 const weekday=weekdays[new Date(at).getUTCDay()]
 if(days===7?shift.week_start!==weekday||!(empty(shift.by_day)||Array.isArray(shift.by_day)&&shift.by_day.length===1&&shift.by_day[0]===weekday):!empty(shift.by_day)||shift.week_start!==undefined)
  throw Error(`shift ${label}: weekday restrictions or a different week start are unsupported`)
 if(!Array.isArray(shift.rolling_users)||!shift.rolling_users.length)throw Error(`shift ${label}: missing rolling users`)
 const slots=shift.rolling_users.map((slot:unknown,index:number)=>{
  if(!Array.isArray(slot)||slot.length!==1||typeof slot[0]!=='string')throw Error(`shift ${label}: slot ${index+1} must contain exactly one person`)
  const email=emails.get(slot[0]);if(!email)throw Error(`shift ${label}: missing exported email for user ${slot[0]}`)
  return email
 })
 const first=shift.start_rotation_from_user_index??0
 if(!Number.isSafeInteger(first)||first<0||first>=slots.length)throw Error(`shift ${label}: invalid starting slot`)
 const primary:Rotation={anchorLocal,periodDays:days,members:[...slots.slice(first),...slots.slice(0,first)],ambiguity:'reject'}
 const id=`grafana:${original.id}`
 const schedule=validateSchedule({id,name:original.name,service:id,revision:1,timezone:'UTC',validFrom:new Date(at).toISOString(),validUntil:null,primary,backup:{...primary,members:[]},overrides:[]})
 const unmapped=[{field:'backup',reason:'Source has one rotation; backup is an explicit gap. No backup authority is inferred.'}]
 if(original.on_call_now!==undefined)unmapped.push({field:'on_call_now',reason:'Grafana’s current on-call snapshot is kept for review. The recurring rota comes from the saved shift.'})
 for(const field of ['team_id','slack'])if(original[field]!=null)unmapped.push({field,reason:'Retained source metadata; not an active Oncall rule.'})
 return {schedule,unmapped,history:[]}
}
