import { useState } from 'react';
import { InlineConfirm } from '../app/autosave/InlineConfirm';
import { Form } from '../forms';
import { ClientCreate,permissionAreas } from './ClientCreate';
import { OneTimeSecret } from '../integrations/OneTimeSecret';
import { privateKey, shortTime, type IntegrationProps } from '../integrations/catalog';
import '../integrations/integrations.css';

export function AutomationSettings({state,admin,busy,run}:IntegrationProps) {
 const [clientForm,setClientForm]=useState(!(state.apiClients??[]).length),[recipientForm,setRecipientForm]=useState(false);
 const [recipient,setRecipient]=useState<{name:string;url:string;client:string}>(),[selected,setSelected]=useState('');
 const [action,setAction]=useState<{kind:'clients'|'endpoints'|'outbox';id:string;verb:'rotate'|'revoke'|'replay'}>(),[revealed,setRevealed]=useState('');
 const eventNames:Record<string,string>={trigger:'Triggered',acknowledgment:'Acknowledged',reassignment:'Reassigned',resolution:'Resolved',role:'People changed','follow-up':'Follow-up changed'},outcomes:Record<string,string>={queued:'Waiting',sending:'Sending',sent:'Sent',failed:'Failed',interrupted:'Interrupted',uncertain:'Unconfirmed',terminal:'Stopped'};
 const clients=state.apiClients??[],endpoints=state.apiEndpoints??[],outbox=state.apiOutbox??[],activeClients=clients.filter(c=>c.active);
 const confirmation=action&&action.kind!=='outbox'?(action.kind==='clients'?clients:endpoints).find(r=>r.id===action.id):undefined;
 return <section className="panel padded integrations" id="response-api" aria-label="API clients, recipients and outbox">
  {!admin&&<p>An administrator manages clients, recipients and delivery failures.</p>}
  <details><summary>API clients ({clients.length})</summary><h2>API clients</h2>
   {!clients.length&&<p>No API clients configured.</p>}
   <ul className="integration-rows">{clients.map(c=><li key={c.id}><strong>{c.name}</strong><p>{c.services.map(id=>state.services.find(s=>s.id===id)?.name??'Service unavailable').join(', ')}{!c.active?' · Inactive':''}</p><details><summary>Permissions</summary><ul>{permissionAreas.filter(([area])=>c.permissions.includes(area+':read')).map(([area,label])=><li key={area}>{label} · {c.permissions.includes(area+':write')?'Read and change':'Read'}</li>)}</ul></details>{admin&&<details className="integration-entry-actions"><summary>Client actions</summary><button disabled={busy} onClick={()=>setAction({kind:'clients',id:c.id,verb:'rotate'})}>Rotate {c.name}</button><button disabled={busy||!c.active} onClick={()=>setAction({kind:'clients',id:c.id,verb:'revoke'})}>Revoke {c.name}</button></details>}</li>)}</ul>
   {admin&&<>{clientForm||!clients.length?<ClientCreate state={state} busy={busy} run={run} onDone={()=>setClientForm(false)}/>:<button type="button" onClick={()=>setClientForm(true)}>Add client</button>}</>}
   <a className="integration-link" href="/docs/response-api">API reference</a>
  </details>
  <details><summary>Recipients ({endpoints.length})</summary><h2>Recipients</h2>
   {!endpoints.length&&<p>No recipients approved. Incident changes send nothing.</p>}
   <ul>{endpoints.map(e=><li key={e.id}><strong>{e.name}</strong><p>{e.url}{!e.active?' · Inactive':''}</p>{admin&&<details className="integration-entry-actions"><summary>Recipient actions</summary><button disabled={busy} onClick={()=>setAction({kind:'endpoints',id:e.id,verb:'rotate'})}>Renew {e.name}</button><button disabled={busy||!e.active} onClick={()=>setAction({kind:'endpoints',id:e.id,verb:'revoke'})}>Revoke {e.name}</button></details>}</li>)}</ul>
   {admin&&(!activeClients.length?<p>Create a client to approve a recipient.</p>:recipientForm||!endpoints.length?<Form busy={busy} label="Approve" onSubmit={async data=>{setRecipient({name:data.name,url:data.url,client:selected||activeClients[0].id});return false;}}>
    <label className="field">Name<input name="name" required maxLength={100}/></label><label className="field">Address<input name="url" type="url" required maxLength={1000}/></label>
    {activeClients.length>1?<label className="field">Client<select aria-label="Client" value={selected||activeClients[0].id} onChange={e=>setSelected(e.target.value)}>{activeClients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>:<p>Client · {activeClients[0].name}</p>}
   </Form>:<button onClick={()=>setRecipientForm(true)}>Add recipient</button>)}
   {recipient&&<InlineConfirm action="Approve recipient" keep="Keep editing" busy={busy} onCancel={()=>setRecipient(undefined)} onConfirm={async()=>{
    const client=clients.find(c=>c.id===recipient.client),key=privateKey();
    if(await run('/api/automation/endpoints',{...recipient,services:client?.services,key,approve:true},'Recipient approved')){setRecipient(undefined);setRecipientForm(false);setRevealed(key);}
   }}>{recipient.name} at {recipient.url} will receive signed incident events for {clients.find(c=>c.id===recipient.client)?.services.map(id=>state.services.find(s=>s.id===id)?.name).join(', ')}: event type, operation and incident identifiers, service, revision, state and time. Approve this recipient?</InlineConfirm>}
  </details>
  <details><summary>Outbox ({outbox.length})</summary><h2>Outbox</h2>{admin&&<button disabled={busy} onClick={()=>run('/api/automation/dispatch',{},'Outbox checked')}>Send next now</button>}
   {!outbox.length&&<p>No outbound events yet.</p>}
   <ul>{outbox.slice().reverse().map(o=><li key={o.id}><strong>{state.incidents.find(i=>i.id===o.incident)?.title??eventNames[o.event]}</strong>{o.history.findLast(h=>h.preparedBy)?.preparedBy&&<p>{o.history.findLast(h=>h.preparedBy)!.preparedBy!.label}{!!o.history.findLast(h=>h.preparedBy)!.preparedBy!.approvers.length&&' · Approved by '+o.history.findLast(h=>h.preparedBy)!.preparedBy!.approvers.map(p=>p.name).join(', ')}</p>}<p>{eventNames[o.event]} · {outcomes[o.status]} · {shortTime(o.due)} · {o.attempts} attempts</p><p>{({ 'receiver-refused':'The recipient refused this event.', 'network-ambiguous':'Delivery could not be confirmed.', 'receiver-failed':'The recipient could not accept this event.', 'budget-exhausted':'Delivery attempts are exhausted.', 'accepted':'The recipient accepted this event.' } as Record<string,string>)[o.history.at(-1)?.reason??'']}</p>{admin&&['failed','uncertain','interrupted','terminal'].includes(o.status)&&<button disabled={busy||o.attempts>=5} onClick={()=>setAction({kind:'outbox',id:o.id,verb:'replay'})}>Authorize replay {o.event}</button>}</li>)}</ul>
  </details>
  {action&&<InlineConfirm action={action.verb==='rotate'?'Rotate key':action.verb==='revoke'?'Revoke key':'Authorize replay'} keep="Cancel" busy={busy} onCancel={()=>setAction(undefined)} onConfirm={async()=>{
   const record=action.kind==='outbox'?outbox.find(o=>o.id===action.id):confirmation;if(!record)return;
   const key=action.verb==='rotate'?privateKey():undefined;
   const result=await run('/api/automation/'+action.kind+'/'+encodeURIComponent(action.id)+'/'+action.verb,{revision:record.revision,...(key?{key}:{}),...(action.kind==='endpoints'&&action.verb==='rotate'||action.verb==='replay'?{approve:true}:{})},action.verb==='revoke'?'Access revoked':action.verb==='rotate'?'Key rotated':'Replay authorized');
   if(result){setAction(undefined);if(key)setRevealed(key);}
  }}>{action.verb==='rotate'?`Replace the key for ${confirmation?.name}? The old key will stop working.`:action.verb==='revoke'?`Revoke ${confirmation?.name}? Queued work will be refused.`:'Try delivery again with the original operation? This never repeats the incident action.'}</InlineConfirm>}
  {revealed&&<OneTimeSecret value={revealed} onDone={()=>setRevealed('')}/>}
 </section>;
}
