import {Field,Form} from '../forms';
import type {Incident,Member,Service} from '../family/response-operations/domain';
export function DeadlineControls({incident,actor,busy,submit}:{incident:Incident;actor:Member;busy:boolean;submit:(input:any)=>Promise<any>}) {
 const editable=['admin','responder'].includes(actor.role),pending=incident.deadlines?.find(d=>d.state==='pending');
 return <section aria-label="Incident deadlines"><h3>Incident deadlines</h3>
 {pending&&<p role="status">Snoozed / acknowledgment held until {pending.dueAt} · {pending.kind} · {pending.minutes} minutes. Paging OFF.</p>}
 {(incident.deadlines??[]).map(d=><p key={d.id}>{d.kind} · {d.state} · due {d.dueAt} · {d.outcome}{d.obligation&&` · recorded obligation for ${d.obligation.target.id} · ${d.obligation.state} · no sender`}</p>)}
 {editable&&incident.state==='acknowledged'&&<Form key={incident.id} busy={busy} label="Snooze incident" onSubmit={input=>submit({type:'snooze',incident:incident.id,revision:incident.revision,minutes:Number(input.minutes)})}><Field name="minutes" label="Snooze duration (minutes)" type="number" value="10"/><p>1 minute to 24 hours. Expiry records a re-trigger obligation; no page is sent.</p></Form>}
 {editable&&pending&&<button disabled={busy} onClick={()=>submit({type:'cancel-deadline',incident:incident.id,revision:incident.revision})}>Cancel pending deadline</button>}
 </section>;
}
export function TimeoutSetting({service,busy,submit}:{service:Service;busy:boolean;submit:(input:any)=>Promise<any>}) {
 const setting=service.ackTimeouts?.at(-1);
 return <details><summary>Acknowledgment timeout · {setting?.minutes?setting.minutes+' minutes':'off'}</summary><p>Version {setting?.version??0}. A new acknowledgment starts this timeout; a snooze replaces it. Expiry records a level-one re-trigger obligation; paging OFF.</p><Form key={service.id} busy={busy} label={'Save acknowledgment timeout for '+service.name} onSubmit={input=>submit({type:'acknowledgment-timeout',service:service.id,baseVersion:setting?.version??0,minutes:Number(input.minutes)})}><Field name="minutes" label="Acknowledgment timeout (minutes, 0 is off)" type="number" value={String(setting?.minutes??0)}/></Form></details>;
}
