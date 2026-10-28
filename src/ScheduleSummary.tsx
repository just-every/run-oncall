import {autosaveRequest,useAutosave} from './app/autosave/useAutosave'
import {SavedState,SaveFeedback} from './app/autosave/SavedState'
import {useViewAnchor} from './app/useViewAnchor'
import {FailureLine,useActionFailure} from './app/FailureLine'
import { useEffect,useState } from 'react'
import type { Coverage, Schedule } from './family/response-operations/schedules'
import type { State } from './family/response-operations/domain'

// Keep the schedule's named clock and the offset at this hand-over visible.
function handoffLabel(instant:string|null|undefined,timezone:string) {
 if(!instant)return 'No next hand-off'
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:timezone,weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'}).formatToParts(Date.parse(instant)).map(p=>[p.type,p.value]))
 return `Hand-over: ${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute} ${timezone} (${parts.timeZoneName})`
}

type ReadProps = {schedule:Schedule;state:State;request:(path:string,data?:unknown)=>Promise<any>}
type NowNext = {now:Coverage;next:Record<'primary'|'backup',Coverage|null>}

export function ScheduleNowNext({schedule,state,request}:ReadProps) {
 const [value,setValue]=useState<NowNext|null>(null)
 const failures=useActionFailure()
 const preserveView=useViewAnchor()
 useEffect(()=>{
  let current=true
  request(`/api/schedules/${encodeURIComponent(schedule.id)}/now-next`).then(data=>{if(current){preserveView();setValue(data);if(failures.current.current?.read)failures.clear()}}).catch(e=>{if(current)failures.show(e,{read:true,target:null})})
  return ()=>{current=false}
 },[schedule,request])
 const name=(id:string|null|undefined)=>state.members.find(m=>m.id===id)?.name??'Coverage gap'
 return <section className="scheduling-panel scheduling-now-next"><h2>On call now and next</h2><FailureLine failure={failures.failure}/>{!value&&!failures.failure&&<p>Loading current coverage…</p>}{value&&<div className="scheduling-form-grid two">{(['primary','backup'] as const).map(role=><div key={role} className="scheduling-now-role"><h3>{role}</h3><p className="now">Now: {name(value.now[role])}</p><p className="next">Next: {name(value.next[role]?.[role])}</p><p className="handoff">{handoffLabel(value.now.windows.find(w=>w.role===role)?.end,schedule.timezone)}</p></div>)}</div>}</section>
}

const escalationFields = ['primaryWaitSeconds','backupWaitSeconds','retrySeconds','maxAttempts'] as const;
const escalationLabels = {primaryWaitSeconds:'Primary wait (seconds)',backupWaitSeconds:'Backup wait (seconds)',retrySeconds:'Retry (seconds)',maxAttempts:'Maximum attempts'};
function EscalationSummary({schedule,policies,admin,request,onSaveStart}:{schedule:Schedule;policies:import("./family/response-operations/escalation").EscalationPolicy[];admin:boolean;request:(path:string,data?:unknown)=>Promise<any>;onSaveStart?:()=>void;onSaved?:()=>void}) {
 const snapshot=(policies:import("./family/response-operations/escalation").EscalationPolicy[])=>{
  const policy=policies.find(p=>p.service===schedule.service)??{service:schedule.service,scheduleId:schedule.id,revision:0,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3};
  return {values:{scheduleId:policy.scheduleId,primaryWaitSeconds:String(policy.primaryWaitSeconds),backupWaitSeconds:String(policy.backupWaitSeconds),retrySeconds:String(policy.retrySeconds),maxAttempts:String(policy.maxAttempts)},revision:policy.revision};
 };
 const save=useAutosave({storageKey:'escalation:'+schedule.service,snapshot:snapshot(policies),read:async()=>snapshot((await request('/api/paging/state')).policies),write:async({values,revision},{keepalive})=>{
  onSaveStart?.();
  const result=await autosaveRequest('/api/paging/policies',{service:schedule.service,scheduleId:values.scheduleId,revision,...Object.fromEntries(escalationFields.map(field=>[field,Number(values[field])]))});
  return snapshot([result]);
 }});
 return <section className="scheduling-panel scheduling-summary">
 <p className="scheduling-feed"><a href={`/api/schedules/${encodeURIComponent(schedule.id)}/calendar.ics`}>Open private ICS feed (next 7 days)</a></p><p>The feed uses your session. Download it into a calendar; no bearer URL or public feed is created.</p>
 <h2>Escalation policy as data</h2><p>Primary then backup. These values are stored as policy data only. Paging is OFF: no wait, retry or attempt runs.</p>
 <div className="scheduling-escalation autosave-form"><fieldset disabled={!admin}>{escalationFields.map(field=><div key={field}><label className="scheduling-field"><span>{escalationLabels[field]} <SavedState state={save.states[field]}/></span><input aria-label={escalationLabels[field]} type="number" required min="1" value={save.values[field]} onChange={e=>save.change(field,e.target.value,'text')} onBlur={()=>save.blur(field)}/></label><SaveFeedback state={save.states[field]} retry={()=>save.retry(field)} useMine={()=>save.useMine(field)}/></div>)}</fieldset></div>
 </section>;
}

export function ScheduleSummary(props:Parameters<typeof EscalationSummary>[0]) {
 return <EscalationSummary key={props.schedule.service} {...props}/>;
}
