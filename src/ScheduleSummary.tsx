import { useEffect,useState } from 'react'
import type { Schedule } from './family/response-operations/schedules'
import type { State } from './family/response-operations/domain'

// The hand-over as the schedule's own clock shows it, like "Mon 09:00".
function handoffLabel(instant:string|undefined,timezone:string) {
 if(!instant)return 'No next hand-off'
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:timezone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(Date.parse(instant)).map(p=>[p.type,p.value]))
 return `${parts.weekday} ${parts.hour}:${parts.minute}`
}

export function ScheduleSummary({schedule,state,admin,request,onSaveStart,onSaved}:{schedule:Schedule;state:State;admin:boolean;request:(path:string,data?:unknown)=>Promise<any>;onSaveStart?:()=>void;onSaved?:()=>void}) {
 const [value,setValue]=useState<any>(null),[error,setError]=useState(''),[policy,setPolicy]=useState<any>(null)
 const [saving,setSaving]=useState(false)
 const load=async()=>{setError('');try{setValue(await request(`/api/schedules/${encodeURIComponent(schedule.id)}/now-next`));const data=await request('/api/paging/state');setPolicy(data.policies.find((p:any)=>p.service===schedule.service)??{service:schedule.service,scheduleId:schedule.id,revision:0,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3})}catch(e){setError((e as Error).message)}}
 useEffect(()=>{void load()},[schedule.id,schedule.revision])
 const name=(id:string|null)=>state.members.find(m=>m.id===id)?.name??'Coverage gap'
 return <section className="scheduling-panel scheduling-now-next"><h2>On call now and next</h2>{error&&<p role="alert">{error}</p>}{value&&<div className="scheduling-form-grid two">{(['primary','backup'] as const).map(role=><div key={role} className="scheduling-now-role"><h3>{role}</h3><p className="now">Now: {name(value.now[role])}</p><p className="next">Next: {name(value.next[role]?.[role])}</p><p className="handoff">{handoffLabel(value.now.windows.find((w:any)=>w.role===role)?.end,schedule.timezone)}</p></div>)}</div>}
 <p className="scheduling-feed"><a href={`/api/schedules/${encodeURIComponent(schedule.id)}/calendar.ics`}>Open private ICS feed (next 7 days)</a></p><p>The feed uses your session. Download it into a calendar; no bearer URL or public feed is created.</p>
 <h2>Escalation policy as data</h2><p>Primary then backup. These saved delays send no pages.</p>{policy&&<form className="scheduling-escalation" onSubmit={async e=>{e.preventDefault();setError('');setSaving(true);onSaveStart?.();try{setPolicy(await request('/api/paging/policies',policy));onSaved?.()}catch(e){setError((e as Error).message)}finally{setSaving(false)}}}><fieldset disabled={!admin||saving}>{['primaryWaitSeconds','backupWaitSeconds','retrySeconds','maxAttempts'].map(field=><label className="scheduling-field" key={field}><span>{field.replace(/([A-Z])/g,' $1')}</span><input type="number" required min="1" value={policy[field]} onChange={e=>setPolicy({...policy,[field]:Number(e.target.value)})}/></label>)}{admin&&<button type="submit">Save escalation data</button>}</fieldset></form>}
 </section>
}
