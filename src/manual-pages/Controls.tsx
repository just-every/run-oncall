import {autosaveRequest,useAutosave} from '../app/autosave/useAutosave';
import {SavedState,SaveFeedback} from '../app/autosave/SavedState';
import {FailureLine,useActionFailure} from '../app/FailureLine';
import {useEffect,useState} from 'react';
import {Field,Form} from '../forms';
import {request} from '../useWorkspace';
import type {Incident,Member,Service,State} from '../family/response-operations/domain';
import {assignmentRule} from './model';
import {memberName} from '../incident/types';
function usePolicies(){
 const [policies,setPolicies]=useState<{service:string;revision:number}[]|null>(null), failures=useActionFailure();
 const load=async()=>{try{setPolicies((await request('/api/paging/state')).policies);failures.clear();}catch(error){failures.show(error,{read:true,target:null,retry:load});}};
 useEffect(()=>{void load();},[]);return {policies,failure:failures.failure};
}
function Targets({state,policies,compact=false}:{state:State;policies:{service:string;revision:number}[];compact?:boolean}){const people=state.members.filter(m=>m.active&&['admin','responder'].includes(m.role));return <>
 {compact&&people.length===1?<label className="workflow-choice"><input type="checkbox" name="users" value={people[0].id}/><span>{people[0].name}</span></label>:<label className="field"><span>Named responders</span><select name="users" multiple aria-label="Named responders">{state.members.filter(m=>m.active&&['admin','responder'].includes(m.role)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
 {(!!policies.length||!compact)&&<Field name="policy" label="Escalation policy" required={false}><option value="">No policy override</option>{policies.map(p=><option key={p.service} value={p.service}>{state.services.find(s=>s.id===p.service)?.name} · version {p.revision}</option>)}</Field>}
 {!compact&&<p>Choose named users or one policy. Each target is a recorded obligation; paging OFF.</p>}
 </>;}
export function ManualDeclare({state,busy,submit}:{state:State;busy:boolean;submit:(data:any)=>Promise<any>}){
 const {policies,failure}=usePolicies(),[operation]=useState(()=>crypto.randomUUID()),[serviceId,setServiceId]=useState(state.services[0]?.id??'');
 const template=state.services.find(s=>s.id===serviceId)?.incidentTemplates?.at(-1);
 return <><p>Manual page records an incident and its intended targets. No sender runs.</p><FailureLine failure={failure}/><Form busy={busy} disabled={policies===null} label="Declare" onSubmit={data=>submit({...data,type:'manual-page',operationId:operation,users:data.users??[]})}>
 <Field name="title" label="Incident title"/><label className="field"><span id="declaration-service-label">Service</span><select aria-labelledby="declaration-service-label" name="service" required value={serviceId} onChange={event=>setServiceId(event.target.value)}>{state.services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <Field key={serviceId} name="incidentType" label="Incident type (service template)" required={false}><option value="">Service template default</option>{(template?.incidentTypes??[]).map(type=><option key={type}>{type}</option>)}</Field>
 <Field name="severity" label="Severity">{(['critical','warning','info'] as const).map(severity=><option key={severity} value={severity}>{template?.severityWording[severity]??severity}</option>)}</Field>
 <Field name="urgency" label="Page urgency" required={false}><option value="">Service rule (high when severity is required)</option><option value="high">High</option><option value="low">Low</option></Field>
 <Field name="priority" label="Page priority" required={false}><option value="">Unset</option>{['P1','P2','P3','P4','P5'].map(p=><option key={p}>{p}</option>)}</Field>
 <Field name="summary" label="Customer impact and current evidence" help={template?.impactPrompt} type="textarea" required={false}/><Targets state={state} policies={policies??[]}/>
 </Form></>;
}
export function UserAssignment({service,state}:{service:Service;state:State;busy:boolean;submit:(data:any)=>Promise<any>}){
 const {policies,failure}=usePolicies(),rule=assignmentRule(state,service.id);
 const snapshot=(current:State)=>{const value=assignmentRule(current,service.id);return {values:{mode:value.mode,minutes:String(value.minutes),policy:value.policy},revision:value.version}};
 const save=useAutosave({storageKey:'assignment:'+service.id,snapshot:snapshot(state),read:async()=>snapshot(await request('/api/state')),write:async({values,revision},{keepalive})=>{
  await autosaveRequest('/api/command',{...values,type:'user-assignment',service:service.id,baseVersion:revision,minutes:Number(values.minutes)});
  return keepalive?{values,revision:revision+1}:snapshot(await request('/api/state'));
 }});
 const feedback=(field:'mode'|'minutes'|'policy')=><SaveFeedback state={save.states[field]} retry={()=>save.retry(field)} useMine={()=>save.useMine(field)} format={value=>field==='policy'?state.services.find(s=>s.id===value)?.name??'No policy':field==='mode'?value==='repeat'?'Repeat to user':'Escalate to policy':String(value)}/>;
 return <details><summary>Assign new incidents</summary><p>This records the setting. Use your existing pager for automatic repeat or escalation.</p><FailureLine failure={failure}/><div className="autosave-form">
 <label className="field"><span>User-assignment outcome <SavedState state={save.states.mode}/></span><select aria-label="User-assignment outcome" disabled={policies===null} value={save.values.mode} onChange={e=>save.change('mode',e.target.value as typeof rule.mode,'choice')}><option value="escalate">Escalate to policy</option><option value="repeat">Repeat to user</option></select></label>{feedback('mode')}
 <label className="field"><span>Assignment delay (minutes) <SavedState state={save.states.minutes}/></span><input aria-label="Assignment delay (minutes)" type="number" min="1" max="1440" value={save.values.minutes} onChange={e=>save.change('minutes',e.target.value,'text')} onBlur={()=>save.blur('minutes')}/></label>{feedback('minutes')}
 {(policies??[]).length>0&&<><label className="field"><span>Assignment policy <SavedState state={save.states.policy}/></span>{policies?.length===1&&policies[0].service===save.values.policy?<output aria-label="Assignment policy">{state.services.find(s=>s.id===save.values.policy)?.name??'Escalation policy'}</output>:<select aria-label="Assignment policy" value={save.values.policy} onChange={e=>save.change('policy',e.target.value,'choice')}>{!(policies??[]).some(p=>p.service===save.values.policy)&&<option value={save.values.policy}>No policy configured</option>}{(policies??[]).map(p=><option key={p.service} value={p.service}>{state.services.find(s=>s.id===p.service)?.name}</option>)}</select>}</label>{feedback('policy')}</>}
 </div></details>;
}
export function ResponderRequests({incident,state,actor,busy,submit,expanded=false}:{incident:Incident;state:State;actor:Member;busy:boolean;submit:(data:any)=>Promise<any>;expanded?:boolean}){
 const {policies,failure}=usePolicies(),editable=['admin','responder'].includes(actor.role),name=(id:string)=>state.services.find(s=>s.id===id)?.name??memberName(state,id);
 const send=(data:any)=>submit({...data,incident:incident.id,revision:incident.revision});
 return <section className="response-controls" aria-label="Manual obligations and responder requests">{!expanded&&<h3>Manual obligations and responder requests</h3>}
 {incident.manualPage&&<><p>Created by {incident.manualPage.erasedCreator?'Erased member':name(incident.manualPage.creator)} · {incident.urgency} urgency · {incident.manualPage.assignment.mode} after {incident.manualPage.assignment.minutes} minutes (version {incident.manualPage.assignment.version}) · automatic action unavailable.</p><p>Primary acknowledgment: {incident.manualPage.acknowledgment&&incident.state!=='declared'?(incident.manualPage.erasedAcknowledgment?'Erased member':name(incident.manualPage.acknowledgment.by)):'Unacknowledged'}</p>{incident.state==='declared'&&incident.manualPage.acknowledgment&&<p>Earlier manual-page acknowledgment: {incident.manualPage.erasedAcknowledgment?'Erased member':name(incident.manualPage.acknowledgment.by)} · {expanded?new Date(incident.manualPage.acknowledgment.at).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):incident.manualPage.acknowledgment.at}</p>}{incident.manualPage.obligations.map(o=><p key={o.id}>Recorded obligation · {o.target.kind}: {name(o.target.id)} · {o.state} · {o.outcome} · no sender · paging OFF</p>)}</>}
 {!editable&&<p>Only responders and admins may create manual pages or request responders.</p>}<p>Additional responders: {(incident.responders??[]).map(name).join(', ')||'None'}</p>
 {(incident.responderRequests??[]).map(r=><article key={r.id}><h4>Request to {name(r.obligation.target.id)}</h4><p>{r.message}</p><p>{r.status} · requested by {name(r.requester)} · {r.response&&'response by '+name(r.response.by)} · no sender · paging OFF</p>{r.notice&&<p>Requester notice: {r.notice.outcome} · {r.notice.state} · non-automatic</p>}{r.status==='pending'&&editable&&<div className="routing-actions"><button disabled={busy} onClick={()=>send({type:'respond-request',request:r.id,decision:'accept'})}>Accept request</button><button disabled={busy} onClick={()=>send({type:'respond-request',request:r.id,decision:'decline'})}>Decline request</button>{actor.id===r.requester&&<button disabled={busy} onClick={()=>send({type:'cancel-request',request:r.id})}>Cancel request</button>}</div>}</article>)}
 <FailureLine failure={failure}/>{editable&&incident.state!=='resolved'&&<details open={expanded||undefined}><summary>Request responders</summary><Form busy={busy} disabled={policies===null} label="Record responder requests" onSubmit={data=>send({...data,type:'request-responders',users:Array.isArray(data.users)?data.users:data.users?[data.users]:[]})}><Targets state={state} policies={policies??[]} compact={expanded}/><Field name="message" label="Responder request message" type="textarea"/></Form></details>}
 </section>;
}
