import { useId, useState } from 'react';
import { Form } from '../forms';
import type { IntakeSource } from '../intake/model';
import type { IntakeRun } from '../intake/CompatibleTest';

function namedCheck(provider:string) {
  const now=new Date().toISOString();
  return provider==='datadog'?{id:'oncall-check-'+crypto.randomUUID(),alert_id:'oncall-receiver-check',alert_cycle_key:crypto.randomUUID(),alert_scope:'',alert_transition:'Triggered',date:Date.now(),alert_type:'warning',tags:'team:operations',title:'Oncall named receiver check',body:'Local receiver verification; no external provider send'}:{version:provider==='grafana'?'1':'4',receiver:'Oncall named receiver check',groupKey:'oncall-receiver-check',status:'firing',groupLabels:{},commonLabels:{},commonAnnotations:{},alerts:[{status:'firing',labels:{alertname:'Oncall named receiver check',severity:'warning',team:'operations'},annotations:{summary:'Oncall named receiver check'},startsAt:now,endsAt:'0001-01-01T00:00:00Z',fingerprint:crypto.randomUUID(),generatorURL:''}]};
}
export function MonitoringTest({sources,busy,run}:{sources:IntakeSource[];busy:boolean;run:IntakeRun}) {
  const uid=useId(),[selected,setSelected]=useState(''),[secret,setSecret]=useState(''),[payload,setPayload]=useState(''),[result,setResult]=useState<any>(null),source=sources.find(s=>s.id===selected)??sources[0];
  if(!source)return null;
  return <details><summary>Send a named receiver check</summary><p>Send a real request to this receiver. Its alerts become coordination records. To verify the external sender, use the provider’s own test/send door and then fire and recover a real rule.</p>
    <p>Receiver path: <code>/api/monitoring/{source.id}</code> · bearer Authorization · 2 MiB readable request limit</p>
    <Form busy={busy} label="Send provider request" onSubmit={async()=>{const response=await run(async()=>{let body;try{body=JSON.parse(payload);}catch{throw Error('Enter valid provider JSON');}const reply=await fetch('/api/monitoring/'+encodeURIComponent(source.id),{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+secret},body:JSON.stringify(body)});const value=await reply.json() as {error?:string;[key:string]:unknown};if(!reply.ok)throw Error(value.error??'Receiver refused request');return value;},undefined,'Provider request accepted');if(response)setResult(response);return false;}}>
      <label className="field"><span id={uid+'source'}>Receiver check source</span><select aria-labelledby={uid+'source'} value={source.id} onChange={e=>{setSelected(e.target.value);setPayload('');setSecret('');setResult(null);}}>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="field">Receiver check private key<input type="password" autoComplete="off" required value={secret} onChange={e=>{setSecret(e.target.value);setResult(null);}}/></label>
      <button type="button" onClick={()=>{setPayload(JSON.stringify(namedCheck(source.provider),null,2));setResult(null);}}>Prepare named provider check</button>
      <label className="field">Provider request JSON<textarea required rows={10} value={payload} onChange={e=>{setPayload(e.target.value);setResult(null);}}/></label>
    </Form>{result&&<div role="status"><strong>Receiver response</strong><pre tabIndex={0}>{JSON.stringify(result,null,2)}</pre></div>}
  </details>;
}
