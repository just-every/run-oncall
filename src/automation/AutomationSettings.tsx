import { useState } from 'react';
import type { State } from '../family/response-operations/domain';
import { Form, Field } from '../forms';
import type { IntakeRun } from '../intake/CompatibleTest';
import { permissions } from './model';

// Extend the existing integration list/form pattern, using its controls and styles.
export function AutomationSettings({state,admin,busy,run}:{state:State;admin:boolean;busy:boolean;run:IntakeRun}) {
 const [key,setKey]=useState(''),[notice,setNotice]=useState(''),[grants,setGrants]=useState<string[]>(['incidents:read']),[selected,setSelected]=useState('');
 const clients=state.apiClients??[],endpoints=state.apiEndpoints??[],outbox=state.apiOutbox??[];
 const generate=()=>{setKey(Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''));setNotice('Private key generated. Copy it before saving; it cannot be read back.');};
 const save=async(path:string,data:unknown,message:string)=>{const result=await run(path,data,message);if(result)setKey('');return result;};
 return <section className="panel padded" id="response-api"><h2>Response API and outbound events</h2><p>Scoped clients coordinate incidents. Signed event delivery is not a human acknowledgment. Paging is OFF; keep your existing pager.</p>
 {!admin?<p>An administrator manages clients, recipients and delivery failures.</p>:<>
 <label className="field">Private client or endpoint key<input aria-label="Private client or endpoint key" type="password" autoComplete="new-password" minLength={32} maxLength={200} value={key} onChange={e=>setKey(e.target.value)}/></label>
 <div className="intake-actions"><button type="button" onClick={generate}>Generate private key</button><button type="button" disabled={!key} onClick={async()=>{try{await navigator.clipboard.writeText(key);setNotice('Private key copied.');}catch{setNotice('Copy failed. Select the private key field and copy it manually.');}}} >Copy private key</button></div>
 <p role="status">{notice}</p>
 <h3>Service-account clients</h3>
 {!clients.length&&<p>No API clients configured.</p>}
 <ul>{clients.map(c=><li key={c.id}><p><strong>{c.name}</strong> · {c.active?'active':'revoked or restored inactive'} · revision {c.revision}<br/>Services: {c.services.map(id=>state.services.find(s=>s.id===id)?.name??id).join(', ')}<br/>Last use: {c.lastUsed??'Never'}<br/>{c.permissions.join(', ')}</p><div className="intake-actions"><button disabled={busy||key.length<32} onClick={()=>save(`/api/automation/clients/${c.id}/rotate`,{revision:c.revision,key},'Client key rotated; previous key revoked')}>Rotate {c.name}</button><button disabled={busy||!c.active} onClick={()=>run(`/api/automation/clients/${c.id}/revoke`,{revision:c.revision},'Client revoked; queued work will be refused')}>Revoke {c.name}</button></div></li>)}</ul>
 <Form busy={busy} disabled={!state.services.length||key.length<32} label="Create scoped client" onSubmit={async data=>!!await save('/api/automation/clients',{name:data.name,services:[data.service],permissions:grants,key},'Scoped client created')}>
 <Field name="name" label="Client name"/><Field name="service" label="Client service">{state.services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Field>
 <fieldset><legend>Client permissions</legend>{permissions.map(p=><label key={p}><input type="checkbox" checked={grants.includes(p)} onChange={e=>setGrants(e.target.checked?[...grants,p]:grants.filter(v=>v!==p))}/>{p}<br/></label>)}</fieldset>
 </Form>
 <h3>Approved recipients</h3><p>Recipients receive only event type, operation and incident IDs, service, revision, state and time. The endpoint uses HTTPS on a public IPv4 address. Install the shared key at the receiver and approve this exact destination.</p>
 {!endpoints.length&&<p>No outbound endpoints approved. Incident changes send nothing.</p>}
 <ul>{endpoints.map(e=><li key={e.id}><p><strong>{e.name}</strong> · {e.active?'approved':'revoked or restored inactive'} · revision {e.revision}<br/>{e.url}</p><div className="intake-actions"><button disabled={busy||key.length<32} onClick={()=>save(`/api/automation/endpoints/${e.id}/rotate`,{revision:e.revision,key,approve:true},'Endpoint key rotated and recipient authorization renewed')}>Renew {e.name}</button><button disabled={busy||!e.active} onClick={()=>run(`/api/automation/endpoints/${e.id}/revoke`,{revision:e.revision},'Endpoint revoked; queued work will be refused')}>Revoke {e.name}</button></div></li>)}</ul>
 <Form busy={busy} disabled={!clients.some(c=>c.active)||key.length<32} label="Approve endpoint" onSubmit={async data=>{const client=clients.find(c=>c.id===(selected||clients.find(c=>c.active)?.id));return !!await save('/api/automation/endpoints',{name:data.name,url:data.url,client:client?.id,services:client?.services,key,approve:data.approve==='on'},'Endpoint approved for minimal signed incident events');}}>
 <Field name="name" label="Endpoint name"/><Field name="url" label="Public HTTPS IPv4 endpoint" type="url"/>
 <label className="field">Receiving client<select aria-label="Receiving client" value={selected||clients.find(c=>c.active)?.id||''} onChange={e=>setSelected(e.target.value)}>{clients.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label><input type="checkbox" name="approve" required/> I authorize this recipient to receive the selected services’ minimal event data.</label>
 </Form>
 <h3>Durable outbox</h3><p>Hosted dispatch checks due work each minute, up to ten deliveries. An uncertain result may already have reached the receiver. Replay uses its original operation ID and never repeats the incident action. Five total attempts per operation.</p>
 <button disabled={busy} onClick={()=>run('/api/automation/dispatch',{},'Dispatch check complete; inspect the durable outcome below')}>Dispatch next due event</button>
 {!outbox.length&&<p>No outbound operations yet.</p>}
 <ul>{outbox.slice().reverse().map(o=><li key={o.id}><p><strong>{o.event} · {o.status}</strong> · attempts {o.attempts}/5<br/>Owner: {state.members.find(m=>m.id===o.owner)?.name??'Unavailable'}<br/>Due: {o.due}<br/>Operation: <span style={{overflowWrap:'anywhere'}}>{o.id}</span><br/>Latest outcome: {o.history.at(-1)?.reason}{!o.authorized?' · held after restore':''}</p>{['failed','uncertain','interrupted','terminal'].includes(o.status)&&<button disabled={busy||o.attempts>=5} onClick={()=>run(`/api/automation/outbox/${o.id}/replay`,{revision:o.revision,approve:true},'Replay authorized with the original operation ID')}>Authorize replay {o.event}</button>}</li>)}</ul>
 <p><a href="/docs/response-api">API, signatures, receiver receipts and recovery</a></p>
 </>}
 </section>;
}
