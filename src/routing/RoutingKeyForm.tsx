import { useId, useState } from 'react';
import { Form } from '../forms';
import type { State } from '../family/response-operations/domain';
import type { IntakeRun } from '../intake/CompatibleTest';

export function RoutingKeyForm({state,busy,run}:{state:State;busy:boolean;run:IntakeRun}) {
  const uid=useId(),[id,setId]=useState(''),[name,setName]=useState(''),[provider,setProvider]=useState('pagerduty'),[scope,setScope]=useState<string[]>([]),[owner,setOwner]=useState(''),[key,setKey]=useState(''),[copied,setCopied]=useState('');
  return <details className="panel padded routing-create"><summary>Create a routed integration key</summary>
    <p>One key routes each event to one allowed service. Unmatched events are retained in this key’s unrouted queue. An acceptance records coordination data; paging stays OFF.</p>
    {!state.services.length?<p><a href="#services">Create services first.</a></p>:<Form busy={busy} label="Create routed key" onSubmit={async()=>{
      const result=await run('/api/routing/keys',{id,name,provider,scope,owner:owner||state.members.find(m=>m.active&&m.role==='admin')?.id,key,revision:0,rules:[],catchAll:null},'Routed key created');
      if(result){setId('');setName('');setKey('');setCopied('');}return false;
    }}>
      <div className="routing-fields"><label className="field">Routed key ID<input required maxLength={80} value={id} onChange={e=>setId(e.target.value)}/></label><label className="field">Routed key name<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label></div>
      <div className="routing-fields"><label className="field"><span id={uid+'provider'}>Routed provider</span><select aria-labelledby={uid+'provider'} value={provider} onChange={e=>setProvider(e.target.value)}><option value="pagerduty">PagerDuty v1 and v2</option><option value="opsgenie">Opsgenie</option><option value="splunk">Splunk On-Call</option><option value="alertmanager">Prometheus Alertmanager</option><option value="grafana">Grafana alerting</option><option value="datadog">Datadog webhooks</option></select></label>
      <label className="field"><span id={uid+'owner'}>Integration owner</span><select aria-labelledby={uid+'owner'} value={owner||state.members.find(m=>m.active&&m.role==='admin')?.id} onChange={e=>setOwner(e.target.value)}>{state.members.filter(m=>m.active&&m.role!=='viewer').map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div>
      <fieldset className="routing-scope"><legend>Allowed services (choose at least one)</legend>{state.services.map(s=><label key={s.id}><input type="checkbox" checked={scope.includes(s.id)} onChange={e=>setScope(e.target.checked?[...scope,s.id]:scope.filter(id=>id!==s.id))}/>{s.name} · {s.environment}</label>)}</fieldset>
      <label className="field">Private routed key<input required type="password" autoComplete="new-password" minLength={32} maxLength={200} value={key} onChange={e=>{setKey(e.target.value);setCopied('');}}/><small>Copy the key into your sender before saving. It cannot be read back and stays outside archives.</small></label>
      <div className="routing-actions"><button type="button" onClick={()=>{setKey(Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''));setCopied('');}}>Generate routed key</button><button type="button" disabled={!key} onClick={async()=>{try{await navigator.clipboard.writeText(key);setCopied('Copied. Store this key privately in your sender.');}catch{setCopied('Clipboard unavailable. Copy the password field into your sender.');}}}>Copy routed key</button></div><p role="status">{copied}</p>
    </Form>}
  </details>;
}
