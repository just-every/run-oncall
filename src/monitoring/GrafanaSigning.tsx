import {useEffect,useState} from 'react';
import {request} from '../useWorkspace';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {OneTimeSecret} from '../integrations/OneTimeSecret';
import {privateKey} from '../integrations/catalog';
import type {IntakeSource} from '../intake/model';
import type {IntakeRun} from '../intake/CompatibleTest';
export function GrafanaSigning({sources,busy,run,revision}:{sources:IntakeSource[];busy:boolean;run:IntakeRun;revision:number}) {
 const source=sources[0],[setting,setSetting]=useState<any>(),[failed,setFailed]=useState(false),[confirm,setConfirm]=useState(false),[secret,setSecret]=useState('');
 async function read(){try{setSetting(await request('/api/monitoring/'+encodeURIComponent(source.id)+'/signing'));setFailed(false);}catch{setFailed(true);}}
 useEffect(()=>{if(source)void read();},[source?.id,revision]);
 if(!source)return null;
 return <details aria-label="Grafana signature settings"><summary>Grafana signature check</summary>
  {failed&&<p role="alert">Signature settings could not be read. <button onClick={read}>Retry</button></p>}
  {setting&&<><p>{setting.configured?'Signature required with bearer authentication':'Bearer authentication only'}</p><button disabled={busy} onClick={()=>setConfirm(true)}>{setting.configured?'Disable signature check':'Enable signature check'}</button>
   {confirm&&<InlineConfirm action={setting.configured?'Disable check':'Create signing key'} keep="Cancel" busy={busy} onCancel={()=>setConfirm(false)} onConfirm={async()=>{const key=setting.configured?null:privateKey(),result=await run('/api/monitoring/'+encodeURIComponent(source.id)+'/signing',{revision:setting.revision,secret:key},'Signature settings changed');if(result){setSetting(result);setConfirm(false);if(key)setSecret(key);}}}>{setting.configured?'Accept this source with its bearer key alone?':'Require a signature as well as the bearer key? Add the new signing key to Grafana before sending again.'}</InlineConfirm>}
  </>}{secret&&<OneTimeSecret value={secret} label="Signing key" onDone={()=>setSecret('')}/>}
 </details>;
}
