import {autosaveRequest,useAutosave} from '../app/autosave/useAutosave';
import {SavedState,SaveFeedback} from '../app/autosave/SavedState';
import {FailureLine,useActionFailure,hasChangeBase} from '../app/FailureLine';
import {useEffect,useState} from 'react';
import {Field,Form} from '../forms';
import {request} from '../useWorkspace';
import type {Schedule} from '../family/response-operations/schedules';
import type {State,Member} from '../family/response-operations/domain';
import type {ScheduleRecord} from './model';
type Row=ScheduleRecord&{status?:string;dueAt?:string|null;label?:string};
export function ScheduleCoordination({schedule,state,actor,onChanged}:{schedule:Schedule;state:State;actor:Member;onChanged:()=>Promise<any>}){
 const [rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false),[url,setUrl]=useState('');
 const failures=useActionFailure(),[ready,setReady]=useState(false);
 const load=async()=>{setRows((await request('/api/schedule-coordination')).records);setReady(true);if(failures.current.current?.read)failures.clear();};
 useEffect(()=>{load().catch(e=>failures.show(e,{read:true,target:null,retry:async()=>{await load();failures.clear();}}));},[schedule.id,schedule.revision,state]);
 const send=async(data:any)=>{setBusy(true);failures.clear();setUrl('');try{const result=await request('/api/schedule-coordination',data);if(result.url)setUrl(result.url);await load();await onChanged();return result;}catch(e){failures.show(e,{retry:hasChangeBase(data)?()=>send(data):undefined});return null;}finally{setBusy(false);}};
 const name=(id:string)=>state.members.find(m=>m.id===id)?.name??'Erased member',policy=rows.find(r=>r.kind==='policy'&&r.data.schedule===schedule.id),reminder=rows.find(r=>r.kind==='reminder'&&r.member===actor.id),editable=['admin','responder'].includes(actor.role);
 if(!ready)return <section className="scheduling-panel" aria-label="Shift coordination"><h2>Shift coordination</h2><FailureLine failure={failures.failure}/>{!failures.failure&&<p role="status">Loading shift coordination…</p>}</section>;
 return <section className="scheduling-panel" aria-label="Shift coordination"><h2>Shift coordination</h2><FailureLine failure={failures.failure}/>
 <p>Substitutes decide swaps explicitly. Overdue requests remain undecided. Paging OFF.</p>
 {rows.filter(r=>r.kind==='swap'&&r.data.schedule===schedule.id).map(row=><article key={row.id}><h3>{name(row.member)} → {name(row.data.substitute)}</h3><p>{row.data.role} · {row.data.start} → {row.data.end} · {row.active?row.status:'restored inactive'} · {row.data.approved?'approval recorded':'admin approval required'}</p>{row.active&&row.data.status==='pending'&&<div className="routing-actions">{actor.role==='admin'&&!row.data.approved&&<button disabled={busy} onClick={()=>send({action:'approve',id:row.id,revision:row.revision})}>Approve swap</button>}{actor.id===row.data.substitute&&<><button disabled={busy} onClick={()=>send({action:'accept',id:row.id,revision:row.revision})}>Accept swap</button><button disabled={busy} onClick={()=>send({action:'decline',id:row.id,revision:row.revision})}>Decline swap</button></>}{actor.id===row.member&&<button disabled={busy} onClick={()=>send({action:'cancel',id:row.id,revision:row.revision})}>Cancel swap</button>}</div>}</article>)}
 {editable&&<details><summary>Request a swap</summary><Form busy={busy} label="Request substitute" onSubmit={data=>send({...data,action:'request',schedule:schedule.id,scheduleRevision:schedule.revision,start:new Date(data.start+'Z').toISOString(),end:new Date(data.end+'Z').toISOString()})}>
 <Field name="substitute" label="Swap substitute">{state.members.filter(m=>m.active&&m.id!==actor.id&&['admin','responder'].includes(m.role)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</Field>
 <Field name="role" label="Swap role"><option>primary</option><option>backup</option></Field><Field name="start" label="Swap start (UTC)" type="datetime-local"/><Field name="end" label="Swap end (UTC)" type="datetime-local"/>
 </Form></details>}
 <details><summary>Settings</summary>
 {actor.role==='admin'&&<SwapApprovalSetting schedule={schedule} policy={policy} onChanged={load}/>}
 {editable&&<><ShiftReminderSetting reminder={reminder} actor={actor} onChanged={load}/>
 {reminder&&<p>Due at {reminder.dueAt??'next assigned shift boundary'} · {reminder.active?'not sent (no timer)':'restored inactive'}</p>}
 <Form busy={busy} label="Create calendar subscription" onSubmit={data=>send({...data,action:'subscribe',target:data.scope==='service'?schedule.service:schedule.id})}><Field name="scope" label="Calendar scope"><option value="schedule">This schedule</option><option value="service">This service</option><option value="own">My shifts</option></Field></Form>
 {url&&<div role="status"><p>Copy this private subscription URL now. It is shown once.</p><input aria-label="New private calendar URL" readOnly value={url}/><button onClick={()=>setUrl('')}>Hide calendar URL</button></div>}
 {rows.filter(r=>r.kind==='subscription').map(row=><p key={row.id}>{row.data.scope} · {row.active?'active':'revoked or restored inactive'} {row.active&&<button disabled={busy} onClick={()=>send({action:'revoke',id:row.id,revision:row.revision})}>Revoke subscription</button>}</p>)}</>}
 </details>
 <details><summary>Recorded schedule changes</summary>{rows.filter(r=>r.kind==='notice'&&r.data.schedule===schedule.id).map(row=><p key={row.id}>Recorded obligation · {name(row.member)} · {row.data.obligation.reason} · {row.data.obligation.outcome} · non-automatic</p>)}</details>
 </section>;
}

function SwapApprovalSetting({schedule,policy,onChanged}:{schedule:Schedule;policy?:Row;onChanged:()=>Promise<any>}){
 const snapshot=(row?:Row)=>({values:{swapApproval:String(row?.data.swapApproval??'admin')},revision:row?.revision??0});
 const save=useAutosave({storageKey:'swap-approval:'+schedule.id,snapshot:snapshot(policy),read:async()=>snapshot((await request('/api/schedule-coordination')).records.find((row:Row)=>row.kind==='policy'&&row.data.schedule===schedule.id)),write:async({values,revision},{keepalive})=>{
  const result=await autosaveRequest('/api/schedule-coordination',{...values,action:'policy',schedule:schedule.id,revision});
  if(!keepalive)await onChanged();
  return snapshot(result.record);
 }});
 return <div className="autosave-form"><label className="field"><span>Swap approval <SavedState state={save.states.swapApproval}/></span><select aria-label="Swap approval" value={save.values.swapApproval} onChange={e=>save.change('swapApproval',e.target.value,'choice')}><option value="admin">Administrator approval</option><option value="none">Substitute acceptance only</option></select></label><SaveFeedback state={save.states.swapApproval} retry={()=>save.retry('swapApproval')} useMine={()=>save.useMine('swapApproval')} format={value=>value==='admin'?'Administrator approval':'Substitute acceptance only'}/></div>;
}
function ShiftReminderSetting({reminder,actor,onChanged}:{reminder?:Row;actor:Member;onChanged:()=>Promise<any>}){
 const snapshot=(row?:Row)=>({values:{leadMinutes:String(row?.data.leadMinutes??15),channel:String(row?.data.channel??'email')},revision:row?.revision??0});
 const save=useAutosave({storageKey:'reminder:'+actor.id,snapshot:snapshot(reminder),read:async()=>snapshot((await request('/api/schedule-coordination')).records.find((row:Row)=>row.kind==='reminder'&&row.member===actor.id)),write:async({values,revision},{keepalive})=>{
  if(!values.leadMinutes.trim())throw Error('Enter the reminder lead in minutes.');
  const result=await autosaveRequest('/api/schedule-coordination',{...values,action:'reminder',revision,leadMinutes:Number(values.leadMinutes)});
  if(!keepalive)await onChanged();
  return snapshot(result.record);
 }});
 return <div className="autosave-form"><label className="field"><span>Reminder lead minutes <SavedState state={save.states.leadMinutes}/></span><input aria-label="Reminder lead minutes" type="number" min="0" max="10080" value={save.values.leadMinutes} onChange={e=>save.change('leadMinutes',e.target.value,'text')} onBlur={()=>save.blur('leadMinutes')}/></label><SaveFeedback state={save.states.leadMinutes} retry={()=>save.retry('leadMinutes')} useMine={()=>save.useMine('leadMinutes')}/>
 <label className="field"><span>Reminder channel <SavedState state={save.states.channel}/></span><select aria-label="Reminder channel" value={save.values.channel} onChange={e=>save.change('channel',e.target.value,'choice')}>{['email','sms','voice','push'].map(value=><option key={value}>{value}</option>)}</select></label><SaveFeedback state={save.states.channel} retry={()=>save.retry('channel')} useMine={()=>save.useMine('channel')}/></div>;
}
