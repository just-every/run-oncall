import {useEffect,useState} from 'react';
import {PagerNotice} from '../on-call/PagerNotice';
import {useSmsPaging} from '../sms-paging/useSmsPaging';
import {request} from '../useWorkspace';
import {failureMessage} from '../app/FailureLine';
import type {NotificationRules} from '../family/response-operations/on-call-notifications/rules';

type View=NotificationRules & {revision:number};
/** Person-owned contact methods and rules. With an SMS sender, a page goes to the person's first SMS (else phone) contact; the rest are records. */
export function PersonNotifications({member,editable}:{member:string;editable:boolean}) {
 const [value,setValue]=useState<View|null>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const {sms}=useSmsPaging();
 const path='/api/members/'+encodeURIComponent(member)+'/notification-rules';
 useEffect(()=>{if(!open)return;let active=true;void request(path).then(next=>{if(active){setValue(next);setError('');}}).catch(cause=>{if(active)setError(failureMessage(cause));});return()=>{active=false;};},[open,path]);
 const change=(next:View)=>{setValue(next);setNotice('');};
 return <details className="person-notifications" onToggle={event=>setOpen(event.currentTarget.open)}><summary>Contact methods and notification rules</summary>
  <PagerNotice sms={sms}/>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {value&&<form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');setNotice('');try{setValue(await request(path,{revision:value.revision,contacts:value.contacts,rules:value.rules}));setNotice('Contact methods and notification rules saved');}catch(cause){setError(failureMessage(cause));}finally{setBusy(false);}}}>
   <h4>Contact methods</h4><p>{sms?.configured?'When Oncall pages you on a rota with paging on, it texts your first SMS method, or your first phone method if you have no SMS one. Email methods and the rules below are for your records.':'These are for your records. Nothing is sent to them.'}</p>{!value.contacts.length&&<p>No contact methods recorded.</p>}
   {value.contacts.map((contact,index)=><fieldset key={contact.id} disabled={!editable||busy}><legend>Contact {index+1}</legend>
    <label className="field">Label<input required maxLength={100} value={contact.label} onChange={event=>change({...value,contacts:value.contacts.map(c=>c.id===contact.id?{...c,label:event.target.value}:c)})}/></label>
    <label className="field">Method<select aria-label="Method" value={contact.type} onChange={event=>{const type=event.target.value as 'email'|'sms'|'phone';change({...value,contacts:value.contacts.map(c=>c.id===contact.id?{...c,type,countryCode:type==='email'?null:c.countryCode??1}:c)});}}><option value="email">Email</option><option value="sms">SMS</option><option value="phone">Phone</option></select></label>
    {contact.type!=='email'&&<label className="field">Country calling code<input required type="number" min={1} max={999} value={contact.countryCode??''} onChange={event=>change({...value,contacts:value.contacts.map(c=>c.id===contact.id?{...c,countryCode:Number(event.target.value)}:c)})}/></label>}
    <label className="field">{contact.type==='email'?'Email address':'National number'}<input required type={contact.type==='email'?'email':'tel'} value={contact.address} onChange={event=>change({...value,contacts:value.contacts.map(c=>c.id===contact.id?{...c,address:event.target.value}:c)})}/></label>
    {editable&&<button type="button" onClick={()=>change({...value,contacts:value.contacts.filter(c=>c.id!==contact.id),rules:value.rules.filter(r=>r.contact!==contact.id)})}>Remove contact {index+1}</button>}
   </fieldset>)}
   {editable&&<button type="button" disabled={busy||value.contacts.length>=20} onClick={()=>change({...value,contacts:[...value.contacts,{id:crypto.randomUUID(),type:'email',label:'Work email',address:'',countryCode:null}]})}>Add contact method</button>}
   <h4>Notification rules</h4>{!value.rules.length&&<p>No notification rules recorded.</p>}
   {value.rules.map((rule,index)=><fieldset key={rule.id} disabled={!editable||busy}><legend>Rule {index+1}</legend>
    <label className="field">Contact<select aria-label="Contact" value={rule.contact} onChange={event=>change({...value,rules:value.rules.map(r=>r.id===rule.id?{...r,contact:event.target.value}:r)})}>{value.contacts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
    <label className="field">Urgency<select aria-label="Urgency" value={rule.urgency} onChange={event=>change({...value,rules:value.rules.map(r=>r.id===rule.id?{...r,urgency:event.target.value as 'high'|'low'}:r)})}><option value="high">High</option><option value="low">Low</option></select></label>
    <label className="field">Delay in minutes<input required type="number" min={0} max={1440} value={rule.delayMinutes} onChange={event=>change({...value,rules:value.rules.map(r=>r.id===rule.id?{...r,delayMinutes:Number(event.target.value)}:r)})}/></label>
    {editable&&<button type="button" onClick={()=>change({...value,rules:value.rules.filter(r=>r.id!==rule.id)})}>Remove rule {index+1}</button>}
   </fieldset>)}
   {editable&&<><button type="button" disabled={busy||!value.contacts.length||value.rules.length>=40} onClick={()=>change({...value,rules:[...value.rules,{id:crypto.randomUUID(),contact:value.contacts[0].id,delayMinutes:0,urgency:'high'}]})}>Add notification rule</button><button type="submit" disabled={busy}>Save notification rules</button></>}
  </form>}
 </details>;
}
