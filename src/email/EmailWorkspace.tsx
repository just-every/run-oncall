import {useState} from 'react';
import {request} from '../useWorkspace';
import {useAutosave,autosaveRequest} from '../app/autosave/useAutosave';
import {SavedState,SaveFeedback} from '../app/autosave/SavedState';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {useVersionDraft} from '../integrations/useVersionDraft';
import {IntegrationCreate} from '../integrations/AddIntegration';
import {OneTimeSecret} from '../integrations/OneTimeSecret';
import {privateKey,type IntegrationProps} from '../integrations/catalog';
import {EmailRuleEditor} from './EmailRuleEditor';
import {EmailActivity} from './EmailActivity';
import type {EmailMode,EmailRule} from './types';
import './email.css';
type Rules={mode:EmailMode;fallback:'subject'|'quarantine';rules:EmailRule[]};
const names={subject:'Group by subject',single:'One open alert',each:'New alert per email',custom:'Custom rules'};
export function EmailWorkspace(props:IntegrationProps&{addressId?:string}) {
 if(!props.addressId)return <IntegrationCreate {...props} kind="email"/>;
 const address=props.state.emailAddresses?.find(a=>a.id===props.addressId);
 if(!address)return <p>Address not found.</p>;
 return <EmailAddressPage key={address.id} {...props} address={address}/>;
}
function EmailAddressPage({state,admin,busy,run,address}:IntegrationProps&{address:NonNullable<IntegrationProps['state']['emailAddresses']>[number]}) {
 const version=state.emailRules?.filter(v=>v.address===address.id).at(-1)!;
 const draft=useVersionDraft<Rules>('email',address.id,version.version,{mode:version.mode,fallback:version.fallback,rules:version.rules});
 const [service,setService]=useState<string>(),[confirm,setConfirm]=useState<'publish'|'rotate'|'revoke'>(),[secret,setSecret]=useState(''),[preview,setPreview]=useState<any>(),[sampleCopied,setSampleCopied]=useState(false);
 const fields=(value:typeof address)=>({values:{name:value.name,service:value.service},revision:value.revision});
 const save=useAutosave({storageKey:'email:'+address.id,snapshot:fields(address),read:async()=>{const value=await request('/api/email');return fields(value.addresses.find((a:any)=>a.id===address.id));},write:async change=>fields(await autosaveRequest('/api/email/addresses/'+encodeURIComponent(address.id)+'/field',{revision:change.revision,field:change.field,from:change.from,to:change.to}))});
 const feedback=(field:'name'|'service')=><SaveFeedback state={save.states[field]} retry={()=>save.retry(field)} useMine={()=>save.useMine(field)} format={value=>field==='service'?state.services.find(s=>s.id===value)?.name??'Service unavailable':String(value)}/>;
 const samples=(state.emailSamples??[]).filter(s=>s.address===address.id);
 return <div className="email-workspace">{!admin&&<p>An administrator changes this address and its rules.</p>}
  <label className="field"><span>Name <SavedState state={save.states.name}/></span><input aria-label="Name" disabled={!admin} value={save.values.name} onChange={e=>save.change('name',e.target.value,'text')} onBlur={()=>save.blur('name')}/></label>{feedback('name')}
  {state.services.length>1?<><label className="field"><span>Service <SavedState state={save.states.service}/></span><select aria-label="Service" disabled={!admin} value={service??save.values.service} onChange={e=>setService(e.target.value===save.values.service?undefined:e.target.value)}>{state.services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{service&&<InlineConfirm action="Change service" busy={busy} onCancel={()=>setService(undefined)} onConfirm={()=>{save.change('service',service,'choice');setService(undefined);}}>Send new mail for this address to {state.services.find(s=>s.id===service)?.name}? Existing alerts stay with their service.</InlineConfirm>}{feedback('service')}</>:<p>{state.services[0]?.name}</p>}
  <details><summary>Rules · version {version.version}</summary>
   {draft.stale&&<p role="alert">A newer version is published. Your draft is still here. <button onClick={draft.useMine}>Use mine</button></p>}
   <fieldset disabled={!admin}><label className="field">Email mode<select aria-label="Email mode" value={draft.value.mode} onChange={e=>draft.edit({...draft.value,mode:e.target.value as EmailMode,rules:draft.value.rules.filter(r=>e.target.value==='custom'||r.action==='resolve')})}>{Object.entries(names).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field">Unmatched mail<select aria-label="Unmatched mail" value={draft.value.fallback} onChange={e=>draft.edit({...draft.value,fallback:e.target.value as Rules['fallback']})}><option value="subject">Group by subject</option><option value="quarantine">Hold for review</option></select></label>
    <EmailRuleEditor rules={draft.value.rules} custom={draft.value.mode==='custom'} onChange={rules=>draft.edit({...draft.value,rules})}/>
   </fieldset>
   {admin&&draft.changed&&<button disabled={busy||draft.stale} onClick={()=>setConfirm('publish')}>Publish version {version.version+1}</button>}
   {confirm==='publish'&&<InlineConfirm action={'Publish version '+(version.version+1)} busy={busy} onCancel={()=>setConfirm(undefined)} onConfirm={async()=>{
    if(!await save.flush())return;
    const latest=await request('/api/email'),current=latest.addresses.find((a:any)=>a.id===address.id);
    const result=await run('/api/email/addresses/'+encodeURIComponent(address.id)+'/publish',{revision:current.revision,baseVersion:draft.baseVersion,...draft.value},'Email rules published');
    if(result){draft.accepted(version.version+1,draft.value);setConfirm(undefined);}
   }}>Apply this draft to new mail? Existing receipts keep their original decisions.</InlineConfirm>}
   <details><summary>Test draft against saved mail</summary><button disabled={!admin||busy||!samples.length} onClick={async()=>{const value=await run('/api/email/addresses/'+encodeURIComponent(address.id)+'/preview',{revision:address.revision,...draft.value,samples:samples.map(s=>s.id)},'Draft compared without changes');if(value)setPreview(value);}}>Test draft rules</button>{preview&&<p role="status">{preview.decisions.length} saved messages compared. No records changed.</p>}</details>
  </details>
  <details><summary>Send a test</summary><p>Send a message from your email app to the private address you copied. Its receipt appears below.</p></details>
  <details><summary>Sample request</summary><pre>Subject: Service latency{String.fromCharCode(10,10)}The service is taking longer than usual to respond.</pre><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText('Subject: Service latency\n\nThe service is taking longer than usual to respond.');setSampleCopied(true);}catch{setSampleCopied(false);}}}>Copy sample message</button>{sampleCopied&&<p role="status">Copied</p>}</details>
  <EmailActivity samples={samples} receipts={(state.emailReceipts??[]).filter(r=>r.address===address.id&&r.outcome!=='refused')} quarantine={(state.emailQuarantine??[]).filter(q=>q.address===address.id)}/>
  {admin&&<details><summary>Address actions</summary><button disabled={busy} onClick={()=>setConfirm('rotate')}>Rotate address</button><button disabled={busy||!address.active} onClick={()=>setConfirm('revoke')}>Revoke address</button>{confirm&&confirm!=='publish'&&<InlineConfirm action={confirm==='rotate'?'Rotate address':'Revoke address'} keep="Cancel" busy={busy} onCancel={()=>setConfirm(undefined)} onConfirm={async()=>{
   const localPart='oncall-'+privateKey(20),domain=confirm==='rotate'?(await request('/api/email')).domain:null;
   if(confirm==='rotate'&&!domain)return;
   if(await run('/api/email/addresses/'+encodeURIComponent(address.id)+'/'+confirm,{revision:address.revision,...(confirm==='rotate'?{localPart}:{})},'Address '+(confirm==='rotate'?'rotated':'revoked'))){if(domain)setSecret(localPart+'@'+domain);setConfirm(undefined);}
  }}>Stop mail sent to the old address? Accepted history stays.</InlineConfirm>}</details>}
  {secret&&<OneTimeSecret value={secret} label="Private address" onDone={()=>setSecret('')}/>}
 </div>;
}
