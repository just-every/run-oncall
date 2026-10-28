import {useViewAnchor} from '../app/useViewAnchor';
import { useEffect, useState } from 'react';
import { Field, Form } from '../forms';
import {FailureLine, useActionFailure, hasChangeBase} from '../app/FailureLine';
import { HttpFailure, request } from '../useWorkspace';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {useAutosave,autosaveRequest} from '../app/autosave/useAutosave';
import {SavedState,SaveFeedback} from '../app/autosave/SavedState';
import './status-work.css';
import {shortTime} from '../reviews/time';
import type { Member, State } from '../family/response-operations/domain';

export function StatusPanel({actor, state}: {actor: Member; state?: State | null}) {
  const preserveView=useViewAnchor();
  const failures=useActionFailure();
  const [services, setServices] = useState<any[]>([]), [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [audience,setAudience]=useState<string[]>([]);
  const receiveServices = (rows: any[]) => {
    preserveView();
    setServices(current => rows.map(row => {
      const retained = current.find(service => service.id === row.id);
      return retained && retained.revision > row.revision ? retained : row;
    }));
  };
  const refresh = async () => { const result = await request('/api/status'); receiveServices(result.services); setReady(true); if(failures.current.current?.read)failures.clear(); return result; };
  const failedRead=(error:unknown)=>{if(!failures.current.current||failures.current.current.read)failures.show(error,{read:true,target:null,retry:async()=>{try{await refresh();failures.clear();}catch(error){failedRead(error);}}});};
  useEffect(() => { refresh().catch(failedRead); }, [state?.revision, actor]);
  const save = async (input: any, onSaved?: () => void): Promise<any> => {
    setBusy(true); failures.clear(); setNotice('');
    try { const result = await request('/api/status', input); receiveServices(result.services); setNotice('Saved'); onSaved?.(); return result; }
    catch (error) {
      if (error instanceof HttpFailure && error.status === 409 && hasChangeBase(input)) {
        // Keep the chosen change, but never replay a revision already refused.
        const retry = async (): Promise<any> => {
          try {
            const result = await refresh();
            const current = result.services.find((service: any) => service.id === input.id);
            if (!current) throw new Error('This business service is no longer available.');
            return save({...input, revision: current.revision}, onSaved);
          } catch (readError) { failures.show(readError, {retry}); return null; }
        };
        try { await refresh(); }
        catch (readError) { failures.show(readError, {retry}); return null; }
        failures.show(error, {retry});
      } else failures.show(error,{retry:hasChangeBase(input)?()=>save(input,onSaved):undefined});
      return null;
    }
    finally { setBusy(false); }
  };
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),2000);return()=>clearTimeout(timer);},[notice]);
  const admin = actor.role === 'admin';
  return <section className="panel padded status-work" aria-label="Internal business status">
    <h2>Business services</h2>
<details><summary>About this status</summary><p>Internal business-service impact. Subscriptions record a channel; email, push and chat delivery are off.</p></details>
    <div role="status" aria-live="polite">{busy ? 'Saving…' : notice || (!ready && !failures.failure ? 'Loading internal status…' : '')}</div>
    <FailureLine failure={failures.failure} />
    {ready && !services.length && <p>No business services are available to you.</p>}
    {services.map(service => <article className="service-card" key={service.id} aria-label={service.name}>
      <h3>{service.name}</h3><p>Owning team: {service.owningTeam}</p>
      <p><strong>Derived status: {service.derived}</strong>{!service.active && ' · inactive after restore'}</p>
      {service.override && <p>Manual override: <strong>{service.override.value}</strong> · {service.override.reason} · {shortTime(service.override.at)}{service.override.by && ` · ${state?.members.find(member => member.id === service.override.by)?.name ?? 'Erased member'}`}</p>}
      <StatusSubscription actorId={actor.id} service={service} onServices={receiveServices}/>
      {service.notices.length > 0 && <div aria-label="Recorded impact obligations"><h4>Recorded impact obligations</h4>{service.notices.map((record: any) => <p key={record.id}>{record.businessName} · {record.phase?`impact ${record.phase} · `:''}{record.derivedStatus} · {record.channel} · {record.state} · no sender · non-automatic · paging OFF. {record.approvedUpdate === null && 'No approved update is available.'}</p>)}</div>}
      {(admin || actor.id === service.communicationsOwner) && <details><summary>Manage internal status</summary>
        <ManualStatus service={service} busy={busy} save={save}/>
        {state && <Form busy={busy} label="Subscribe member" onSubmit={data => save({...data,action:'subscribe',id:service.id,revision:service.revision,active:data.active==='true'})}>
          <Field name="member" label="Subscriber">{state.members.filter(member => member.active && (member.role !== 'stakeholder' || service.audience.includes(member.id))).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</Field>
          <Field name="channel" label="Member recorded channel"><option value="email">Email (record only)</option><option value="push">Push (record only)</option><option value="chat">Chat (record only)</option></Field>
          <Field name="active" label="Member subscription"><option value="true">Subscribed</option><option value="false">Unsubscribed</option></Field>
        </Form>}
        <details><summary>Email-list subscription settings</summary><p>Email lists record obligations only. No email is sent; an approved sender is still required.</p>
          <Form busy={busy} label="Add email-list subscriber" onSubmit={data=>save({...data,action:'email-list-add',id:service.id,revision:service.revision,category:'email-list',channel:'email'})}>
            <Field name="address" label="Email-list address" type="email" />
          </Form>
          {(service.emailLists??[]).map((list:any)=><div className="saved-view" key={list.id} style={{flexWrap:"wrap"}}><span style={{overflowWrap:"anywhere",minWidth:0,flex:"1 1 220px"}}>{list.address} · email · {list.active?'subscribed':'unsubscribed'}</span><button disabled={busy} onClick={()=>save({action:'email-list-subscription',id:service.id,revision:service.revision,list:list.id,category:'email-list',channel:'email',active:!list.active})}>{list.active?'Unsubscribe email list':'Subscribe email list'}</button></div>)}
        </details>
        {!service.active && admin && <button disabled={busy} onClick={() => save({action:'activate',id:service.id,revision:service.revision})}>Activate status records</button>}
      </details>}
    </article>)}
    {admin && state && <details open={ready&&!services.length?true:undefined}><summary>Add business service</summary><Form busy={busy} label="Create business service" onSubmit={async data=>{const result=await save({...data,action:'create',supporting:Array.isArray(data.supporting)?data.supporting:[data.supporting].filter(Boolean),audience,highUrgencyImpact:data.highUrgencyImpact==='true'});if(result)setAudience([]);return result;}}>
      <Field name="name" label="Business-service name" />{state.teams?.length===1?<><span>Owning team: {state.teams[0].name}</span><input type="hidden" name="owningTeam" value={state.teams[0].name}/></>:state.teams?.length?<Field name="owningTeam" label="Owning team">{state.teams.map(team=><option value={team.name} key={team.id}>{team.name}</option>)}</Field>:<Field name="owningTeam" label="Owning team"/>}
      <label className="field"><span>Supporting technical services</span><select name="supporting" multiple required aria-label="Supporting technical services">{state.services.map(service=><option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
      <Field name="communicationsOwner" label="Communications owner">{state.members.filter(member=>member.active&&['admin','responder'].includes(member.role)).map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</Field>
      {!!state.members.some(member=>member.active&&member.role==='stakeholder')&&<fieldset className="status-audience"><legend>Stakeholder audience</legend>{state.members.filter(member=>member.active&&member.role==='stakeholder').map(member=><label className="status-audience-choice" key={member.id}><input type="checkbox" name="audience" value={member.id} checked={audience.includes(member.id)} onChange={e=>setAudience(current=>e.target.checked?[...current,member.id]:current.filter(id=>id!==member.id))}/><span>{member.name}</span></label>)}</fieldset>}
      <Field name="highUrgencyImpact" label="High-urgency alert impact"><option value="false">Declared incidents only</option><option value="true">Declared incidents and high-urgency alerts</option></Field>
    </Form></details>}
  </section>;
}

function ManualStatus({service,busy,save}:{service:any;busy:boolean;save:(input:any,onSaved?:()=>void)=>Promise<any>}) {
 const [pending,setPending]=useState<string|null|undefined>(undefined);
 return <><label className="field">Status set by hand<select aria-label="Status set by hand" value={pending===undefined?(service.override?.value??'derived'):(pending??'derived')} onChange={e=>setPending(e.target.value==='derived'?null:e.target.value)}><option value="derived">Use derived status</option><option value="operational">Operational</option><option value="degraded">Degraded</option><option value="major outage">Major outage</option></select></label>
 {pending!==undefined&&<InlineConfirm action="Set status" keep="Keep current status" reasonRequired busy={busy} onCancel={()=>setPending(undefined)} onConfirm={reason=>save({action:'override',id:service.id,revision:service.revision,value:pending,reason},()=>setPending(undefined))}>Set {service.name} to {pending??'its derived status'}? Your reason is recorded.</InlineConfirm>}
 </>;
}
function StatusSubscription({service,actorId,onServices}:{service:any;actorId:string;onServices:(services:any[])=>void}) {
 const snapshot=(row:any)=>({values:{channel:row.subscription?.channel??'email',active:row.subscription?.active??false},revision:row.revision});
 const save=useAutosave({storageKey:'status-subscription:'+actorId+':'+service.id,snapshot:snapshot(service),read:async()=>{const result=await request('/api/status');onServices(result.services);return snapshot(result.services.find((s:any)=>s.id===service.id));},write:async change=>{const result=await autosaveRequest('/api/status',{action:'subscribe',id:service.id,revision:change.revision,...change.values});onServices(result.services);return snapshot(result.services.find((s:any)=>s.id===service.id));}});
 return <details><summary>Your subscription</summary><label className="field"><span>Recorded channel <SavedState state={save.states.channel}/></span><select aria-label="Recorded channel" value={save.values.channel} onChange={e=>save.change('channel',e.target.value,'choice')}><option value="email">Email</option><option value="push">Push</option><option value="chat">Chat</option></select></label><SaveFeedback state={save.states.channel} retry={()=>save.retry('channel')} useMine={()=>save.useMine('channel')}/><label className="field"><span>Subscription <SavedState state={save.states.active}/></span><select aria-label="Subscription" value={String(save.values.active)} onChange={e=>save.change('active',e.target.value==='true','choice')}><option value="true">Subscribed</option><option value="false">Unsubscribed</option></select></label><SaveFeedback state={save.states.active} retry={()=>save.retry('active')} useMine={()=>save.useMine('active')}/></details>;
}
