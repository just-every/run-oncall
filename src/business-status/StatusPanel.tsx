import { useEffect, useState } from 'react';
import { Field, Form } from '../forms';
import { request } from '../useWorkspace';
import type { Member, State } from '../family/response-operations/domain';

export function StatusPanel({actor, state}: {actor: Member; state?: State | null}) {
  const [services, setServices] = useState<any[]>([]), [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const refresh = async () => { const result = await request('/api/status'); setServices(result.services); setReady(true); };
  useEffect(() => { refresh().catch(error => setError(error.message)); }, [state?.revision, actor]);
  const save = async (input: any) => {
    setBusy(true); setError(''); setNotice('');
    try { const result = await request('/api/status', input); setServices(result.services); setNotice('Status records saved. No delivery was sent.'); return result; }
    catch (error) { setError((error as Error).message); return null; }
    finally { setBusy(false); }
  };
  const admin = actor.role === 'admin';
  return <section className="panel padded" aria-label="Internal business status">
    <h2>Internal status</h2>
    <p>Business-service impact for your workspace. This view is internal and is never published to a public status page.</p>
    <p className="muted">Subscriptions record your chosen channel. Impact obligations have no sender; email, push and chat delivery are off.</p>
    <button disabled={busy} onClick={() => refresh().catch(error => setError(error.message))}>Refresh status</button>
    <div role="status" aria-live="polite">{busy ? 'Saving…' : notice || (!ready && !error ? 'Loading internal status…' : '')}</div>
    {error && <p role="alert">{error}</p>}
    {ready && !services.length && <p>No business services are available to you.</p>}
    {services.map(service => <article className="service-card" key={service.id} aria-label={service.name}>
      <h3>{service.name}</h3><p>Owning team: {service.owningTeam}</p>
      <p><strong>Derived status: {service.derived}</strong>{!service.active && ' · inactive after restore'}</p>
      {service.override && <p>Manual override: <strong>{service.override.value}</strong> · {service.override.reason} · {new Date(service.override.at).toLocaleString()}{service.override.by && ` · ${state?.members.find(member => member.id === service.override.by)?.name ?? 'Erased member'}`}</p>}
      <Form key={'subscription:'+service.id+':'+service.revision} busy={busy} label="Save subscription" onSubmit={data => save({...data, action:'subscribe', id:service.id, revision:service.revision, active:data.active==='true'})}>
        <Field name="channel" label="Recorded delivery channel" value={service.subscription?.channel ?? 'email'}><option value="email">Email (record only)</option><option value="push">Push (record only)</option><option value="chat">Chat (record only)</option></Field>
        <Field name="active" label="Your subscription" value={String(service.subscription?.active ?? false)}><option value="true">Subscribed</option><option value="false">Unsubscribed</option></Field>
      </Form>
      {service.notices.length > 0 && <div aria-label="Recorded impact obligations"><h4>Recorded impact obligations</h4>{service.notices.map((record: any) => <p key={record.id}>{record.businessName} · {record.phase?`impact ${record.phase} · `:''}{record.derivedStatus} · {record.channel} · {record.state} · no sender · non-automatic · paging OFF. {record.approvedUpdate === null && 'No approved update is available.'}</p>)}</div>}
      {(admin || actor.id === service.communicationsOwner) && <details><summary>Manage internal status</summary>
        <Form busy={busy} label="Set status override" onSubmit={data => save({...data, action:'override', id:service.id, revision:service.revision})}>
          <Field name="value" label="Override status"><option value="operational">Operational</option><option value="degraded">Degraded</option><option value="major outage">Major outage</option></Field>
          <Field name="reason" label="Override reason" type="textarea" />
        </Form>
        {service.override && <button disabled={busy} onClick={() => save({action:'override',id:service.id,revision:service.revision,value:null})}>Clear override</button>}
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
    {admin && state && <details><summary>Add business service</summary><Form busy={busy} label="Create business service" onSubmit={data => save({...data, action:'create',supporting:Array.isArray(data.supporting)?data.supporting:[data.supporting].filter(Boolean),audience:Array.isArray(data.audience)?data.audience:[data.audience].filter(Boolean),highUrgencyImpact:data.highUrgencyImpact==='true'})}>
      <Field name="name" label="Business-service name" /><Field name="owningTeam" label="Owning team label" help="A label; team permissions are not yet available." />
      <label className="field"><span>Supporting technical services</span><select name="supporting" multiple required aria-label="Supporting technical services">{state.services.map(service=><option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
      <Field name="communicationsOwner" label="Communications owner">{state.members.filter(member=>member.active&&['admin','responder'].includes(member.role)).map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</Field>
      <label className="field"><span>Stakeholder audience</span><select name="audience" multiple aria-label="Stakeholder audience">{state.members.filter(member=>member.active&&member.role==='stakeholder').map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <Field name="highUrgencyImpact" label="High-urgency alert impact"><option value="false">Declared incidents only</option><option value="true">Declared incidents and high-urgency alerts</option></Field>
    </Form></details>}
  </section>;
}
