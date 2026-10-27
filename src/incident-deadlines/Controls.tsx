import {autosaveRequest,useAutosave} from '../app/autosave/useAutosave';
import {SavedState,SaveFeedback} from '../app/autosave/SavedState';
import {request} from '../useWorkspace';
import {Field,Form} from '../forms';
import type {Incident,Member,Service,State} from '../family/response-operations/domain';
export function DeadlineControls({incident,actor,busy,submit}:{incident:Incident;actor:Member;busy:boolean;submit:(input:any)=>Promise<any>}) {
 const editable=['admin','responder'].includes(actor.role),pending=incident.deadlines?.find(d=>d.state==='pending');
 return <section aria-label="Incident deadlines"><h3>Incident deadlines</h3>
 {pending&&<p role="status">Snoozed / acknowledgment held until {pending.dueAt} · {pending.kind} · {pending.minutes} minutes. Paging OFF.</p>}
 {(incident.deadlines??[]).map(d=><p key={d.id}>{d.kind} · {d.state} · due {d.dueAt} · {d.outcome}{d.obligation&&` · recorded obligation for ${d.obligation.target.id} · ${d.obligation.state} · no sender`}</p>)}
 {editable&&incident.state==='acknowledged'&&<Form key={incident.id} busy={busy} label="Snooze incident" onSubmit={input=>submit({type:'snooze',incident:incident.id,revision:incident.revision,minutes:Number(input.minutes)})}><Field name="minutes" label="Snooze duration (minutes)" type="number" value="10"/><p>1 minute to 24 hours. Expiry records a re-trigger obligation; no page is sent.</p></Form>}
 {editable&&pending&&<button disabled={busy} onClick={()=>submit({type:'cancel-deadline',incident:incident.id,revision:incident.revision})}>Cancel pending deadline</button>}
 </section>;
}
export function TimeoutSetting({service}:{service:Service;busy:boolean;submit:(input:any)=>Promise<any>}) {
 const setting=service.ackTimeouts?.at(-1);
 const snapshot=(state:State)=>{const value=state.services.find(s=>s.id===service.id)?.ackTimeouts?.at(-1);return {values:{minutes:String(value?.minutes??0)},revision:value?.version??0}};
 const save=useAutosave({storageKey:'timeout:'+service.id,snapshot:{values:{minutes:String(setting?.minutes??0)},revision:setting?.version??0},read:async()=>snapshot(await request('/api/state')),
  write:async({to,revision},{keepalive})=>{if(!to.trim())throw Error('Enter the timeout in minutes.');const result=await autosaveRequest('/api/command',{type:'acknowledgment-timeout',service:service.id,baseVersion:revision,minutes:Number(to)});return keepalive?{values:{minutes:to},revision:revision+1}:snapshot(await request('/api/state'));}});
 return <details><summary>Acknowledgment timeout</summary><div className="autosave-form"><label className="field"><span>Acknowledgment timeout (minutes, 0 is off) <SavedState state={save.states.minutes}/></span><input aria-label="Acknowledgment timeout (minutes, 0 is off)" type="number" min="0" max="1440" value={save.values.minutes} onChange={e=>save.change('minutes',e.target.value,'text')} onBlur={()=>save.blur('minutes')}/></label><SaveFeedback state={save.states.minutes} retry={()=>save.retry('minutes')} useMine={()=>save.useMine('minutes')}/></div></details>;
}
