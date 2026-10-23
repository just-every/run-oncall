import {useEffect,useId,useState} from 'react';
import {Form} from '../forms';
import {request} from '../useWorkspace';
import type {IntakeSource} from '../intake/model';
import type {IntakeRun} from '../intake/CompatibleTest';
export function GrafanaSigning({sources,busy,run,revision}:{sources:IntakeSource[];busy:boolean;run:IntakeRun;revision:number}){
  const uid=useId();
  const [selected,setSelected]=useState(''),[secret,setSecret]=useState(''),[setting,setSetting]=useState<any>(null),[error,setError]=useState('');
  const source=sources.find(s=>s.id===selected)??sources[0];
  useEffect(()=>{let live=true;setSetting(null);setError('');if(source)request('/api/monitoring/'+encodeURIComponent(source.id)+'/signing').then(v=>{if(live)setSetting(v)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false};},[source?.id,revision]);
  if(!source)return null;
  return <section aria-label="Grafana signature settings"><h3>Grafana signature check</h3>
    <p>A configured signing secret requires HMAC SHA-256 in addition to the bearer credential. No secret is returned after saving; restore excludes it.</p>
    <label className="field"><span id={uid+'integration'}>Grafana signing integration</span><select aria-labelledby={uid+'integration'} value={source.id} onChange={e=>{setSelected(e.target.value);setSecret('')}}>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    {error&&<p role="alert">{error}</p>}{setting&&<><p role="status">{setting.configured?'Signature required with bearer authentication':'Bearer authentication only; signing is optional'}</p>
      <Form busy={busy} label="Save Grafana signing secret" onSubmit={async()=>{const result=await run('/api/monitoring/'+encodeURIComponent(source.id)+'/signing',{revision:setting.revision,secret},'Grafana signature check saved');if(result){setSecret('');setSetting(result)}return false;}}>
        <label className="field">Grafana signing secret<input type="password" autoComplete="new-password" required minLength={32} maxLength={200} value={secret} onChange={e=>setSecret(e.target.value)}/></label>
        <button type="button" onClick={()=>setSecret(Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''))}>Generate Grafana signing secret</button>
        {secret&&<output aria-label="One-time Grafana signing secret">{secret}</output>}
        <p>Copy the secret privately into Grafana’s HMAC Signature setting before saving. Saving rotates it immediately.</p>
      </Form>{setting.configured&&<button disabled={busy} onClick={async()=>{const result=await run('/api/monitoring/'+encodeURIComponent(source.id)+'/signing',{revision:setting.revision,secret:null},'Grafana signature check disabled');if(result){setSecret('');setSetting(result)}}}>Disable Grafana signature check</button>}</>}
  </section>;
}
