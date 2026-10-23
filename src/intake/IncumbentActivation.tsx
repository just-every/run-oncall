import {useEffect,useState} from 'react';

export function IncumbentActivation({row,services,request,reload}:{row:any;services:any[];request:(path:string,input?:unknown)=>Promise<any>;reload:()=>Promise<void>}) {
 const [id,setId]=useState(row.value.intakeSource??('import-'+row.value.sourceId).slice(0,80)),[service,setService]=useState(services[0]?.id??''),[secret,setSecret]=useState(''),[status,setStatus]=useState<any>(null),[nativeKey,setNativeKey]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const supported=['pagerduty','opsgenie','splunk'].includes(row.value.provider);
 useEffect(()=>{if(row.value.intakeSource)void request(`/api/intake/sources/${encodeURIComponent(row.value.intakeSource)}/incumbent`).then(value=>{setStatus(value);setService(value.source.service);setId(value.source.id)}).catch(e=>setError(e.message))},[row.revision]);
 async function run(action:()=>Promise<void>){setBusy(true);setError('');try{await action()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 if(!supported)return <p>This integration kind stays inactive; a compatible activation path is not available.</p>;
 const name=`${row.value.vendor} ${row.value.sourceId}`;
 return <section aria-label={'Activate imported integration '+row.value.sourceId}>
  <h3>Activate imported integration</h3>
  <p>{name}. {status?.source.active?'Active compatible intake':'Inactive compatible intake'}. Paging OFF. {status?.keySupplied?'Incumbent key supplied; never shown again.':'Incumbent key: not supplied.'}</p>
  <p>Supply the integration credential separately. It is never read from your saved file. Supplying or rotating it leaves intake inactive until you confirm activation.</p>
  <form onSubmit={e=>{e.preventDefault();const key=secret;setSecret('');setNativeKey('');void run(async()=>{const value=await request('/api/intake/incumbent',{importedId:row.targetId,importedRevision:row.revision,id,service,name,revision:status?.source.revision??0,key});setStatus(value);await reload()})}}>
   <fieldset disabled={busy}>
    <label className="scheduling-field">Oncall integration ID<input value={id} onChange={e=>setId(e.target.value)} disabled={Boolean(row.value.intakeSource)} required maxLength={80}/></label>
    <label className="scheduling-field">Service for imported integration<select value={service} onChange={e=>setService(e.target.value)} disabled={Boolean(row.value.intakeSource)} required>{services.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="scheduling-field">Incumbent integration key<input type="password" value={secret} onChange={e=>setSecret(e.target.value)} autoComplete="new-password" required minLength={32} maxLength={200}/></label>
    <button type="submit" disabled={!secret||!service}>{status?'Replace incumbent key · leave inactive':'Supply incumbent key · leave inactive'}</button>
   </fieldset>
  </form>
  {status?.keySupplied&&!status.source.active&&<button type="button" disabled={busy} onClick={()=>void run(async()=>{const value=await request(`/api/intake/sources/${encodeURIComponent(id)}/activate-incumbent`,{revision:status.source.revision,confirmed:true});setStatus({source:value.source,keySupplied:value.keySupplied});setNativeKey(value.nativeKey)})}>Activate compatible intake · paging OFF</button>}
  {status?.keySupplied&&<button type="button" disabled={busy} onClick={()=>void run(async()=>{const source=await request(`/api/intake/sources/${encodeURIComponent(id)}/revoke`,{revision:status.source.revision});setStatus({source,keySupplied:false});setNativeKey('')})}>Revoke imported integration keys</button>}
  {nativeKey&&<div role="status"><p>New Oncall key — shown once. Keep it privately; both this key and the supplied incumbent key now use the same integration.</p><output style={{overflowWrap:'anywhere'}}>{nativeKey}</output><button type="button" onClick={()=>setNativeKey('')}>I saved the Oncall key</button></div>}
  <p>Key custody is an explicit edit to this imported object; import undo cannot overwrite it. Restore keeps the integration inactive and requires keys again.</p>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
