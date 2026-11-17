import {useEffect,useState} from 'react';
import {request} from '../useWorkspace';
import {failureMessage} from '../app/FailureLine';
import type {Contact,NotificationRules} from '../family/response-operations/on-call-notifications/rules';
import {browserCallingCode,formatPhone,normalizePhone,phoneCountries} from './phone';

type View=NotificationRules & {revision:number};
const displayContacts=(value:View):View=>({...value,contacts:value.contacts.map(contact=>contact.type==='email'?contact:{...contact,address:formatPhone(contact.address,contact.countryCode)})});
const methodLabel={email:'Work email',sms:'Mobile number',phone:'Phone number'};
function changeMethod(contact:Contact,type:Contact['type']):Contact {
 return {...contact,type,label:Object.values(methodLabel).includes(contact.label)?methodLabel[type]:contact.label,address:'',countryCode:type==='email'?null:contact.countryCode??browserCallingCode()};
}
function changeCountry(contact:Contact,countryCode:number):Contact {
 let address=contact.address;
 if(address){try{address=normalizePhone(address,contact.countryCode).address;}catch{return {...contact,countryCode};}}
 return {...contact,countryCode,address:address?formatPhone(address,countryCode):''};
}
/** Person-owned settings are recorded destinations only. No sender is enabled. */
export function PersonNotifications({member,editable}:{member:string;editable:boolean}) {
 const [value,setValue]=useState<View|null>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const path='/api/members/'+encodeURIComponent(member)+'/notification-rules';
 useEffect(()=>{if(!open)return;let active=true;void request(path).then(next=>{if(active){setValue(displayContacts(next));setError('');}}).catch(cause=>{if(active)setError(failureMessage(cause));});return()=>{active=false;};},[open,path]);
 const change=(next:View)=>{setValue(next);setNotice('');};
 return <details className="person-notifications" onToggle={event=>setOpen(event.currentTarget.open)}><summary>Contact methods and notification rules</summary>
  <p>Recorded destinations only. Unverified · paging OFF · nothing is sent.</p>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {value&&<form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');setNotice('');try{const contacts=value.contacts.map(contact=>contact.type==='email'?contact:{...contact,...normalizePhone(contact.address,contact.countryCode)});setValue(displayContacts(await request(path,{revision:value.revision,contacts,rules:value.rules})));setNotice('Contact methods and notification rules saved');}catch(cause){setError(failureMessage(cause));}finally{setBusy(false);}}}>
   <h4>Contact methods</h4>{!value.contacts.length&&<p>No contact methods recorded.</p>}
   {value.contacts.map((contact,index)=><fieldset key={contact.id} disabled={!editable||busy}><legend>Contact {index+1}</legend>
    <label className="field">Label<input required maxLength={100} value={contact.label} onChange={event=>change({...value,contacts:value.contacts.map(c=>c.id===contact.id?{...c,label:event.target.value}:c)})}/></label>
    <label className="field">Method<select aria-label="Method" value={contact.type} onChange={event=>{const type=event.target.value as Contact['type'];change({...value,contacts:value.contacts.map(c=>c.id===contact.id?changeMethod(c,type):c)});}}><option value="email">Email</option><option value="sms">SMS</option><option value="phone">Phone</option></select></label>
    {contact.type!=='email'&&<label className="field">Country<select required value={contact.countryCode??''} onChange={event=>change({...value,contacts:value.contacts.map(c=>c.id===contact.id?changeCountry(c,Number(event.target.value)):c)})}>
     <option value="" disabled>Choose country</option>{contact.countryCode!==null&&!phoneCountries.some(country=>country.code===contact.countryCode)&&<option value={contact.countryCode}>+{contact.countryCode}</option>}{phoneCountries.map(country=><option key={country.code} value={country.code}>{country.label}</option>)}
    </select></label>}
    <label className="field">{contact.type==='email'?'Email address':'Phone number'}<input required type={contact.type==='email'?'email':'tel'} autoComplete={contact.type==='email'?'email':'tel'} value={contact.address} onChange={event=>change({...value,contacts:value.contacts.map(c=>c.id===contact.id?{...c,address:event.target.value}:c)})}/></label>
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
