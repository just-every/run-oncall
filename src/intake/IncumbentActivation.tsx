import {useEffect, useState} from 'react';
import {FailureLine, useActionFailure, hasChangeBase} from '../app/FailureLine';
import {InterruptedTransport} from '../useWorkspace';

type Options = {read?: boolean; retryInput?: boolean};

function statusOf(error: unknown): number | undefined {
 const status = (error as {status?: unknown})?.status;
 return typeof status === 'number' ? status : undefined;
}

function transportError(error: unknown) {
 return error instanceof TypeError ? new InterruptedTransport() : error;
}

export function IncumbentActivation({row,services,request,reload}:{row:any;services:any[];request:(path:string,input?:unknown)=>Promise<any>;reload:()=>Promise<void>}) {
 const [id,setId]=useState(row.value.intakeSource??('import-'+row.value.sourceId).slice(0,80));
 const [service,setService]=useState(services[0]?.id??'');
 const [secret,setSecret]=useState('');
 const [status,setStatus]=useState<any>(null);
 const [nativeKey,setNativeKey]=useState('');
 const [busy,setBusy]=useState(false);
 const failures=useActionFailure();
 const supported=['pagerduty','opsgenie','splunk'].includes(row.value.provider);

 async function run<T>(action:()=>Promise<T>, options:Options = {}):Promise<T|null> {
  setBusy(true);
  failures.clear();
  try {
   return await action();
  } catch (caught) {
   const error=transportError(caught);
   const statusCode=statusOf(error);
   const canRetry=options.retryInput===true && (statusCode===undefined || statusCode>=500);
   failures.show(error,{read:options.read,target:options.read?null:undefined,retry:canRetry?async()=>{
    const result=await run(action,options);
    if(result===null)throw error;
   }:undefined});
   return null;
  } finally {
   setBusy(false);
  }
 }

 useEffect(()=>{
  if(!row.value.intakeSource)return;
  const sourceId=row.value.intakeSource;
  const read=()=>request(`/api/intake/sources/${encodeURIComponent(sourceId)}/incumbent`).then(value=>{
   setStatus(value);
   setService(value.source.service);
   setId(value.source.id);
  });
  void run(read,{read:true,retryInput:true});
 },[row.revision]);

 if(!supported)return <p>This integration kind stays inactive; a compatible activation path is not available.</p>;
 const name=`${row.value.vendor} ${row.value.sourceId}`;
 const retryAllowed=(revision:unknown)=>hasChangeBase({revision});
 const refreshAfterSave=async()=>{try{await reload()}catch(error){failures.show(transportError(error),{read:true,target:null})}};

 return <section aria-label={'Activate imported integration '+row.value.sourceId}>
  <h3>Activate imported integration</h3>
  <FailureLine failure={failures.failure}/>
  <p>{name}. {status?.source.active?'Active compatible intake':'Inactive compatible intake'}. Paging OFF. {status?.keySupplied?'Incumbent key supplied; never shown again.':'Incumbent key: not supplied.'}</p>
  <p>Supply the integration credential separately. It is never read from your saved file. Supplying or rotating it leaves intake inactive until you confirm activation.</p>
  <form onSubmit={e=>{
   e.preventDefault();
   const input={importedId:row.targetId,importedRevision:row.revision,id,service,name,revision:status?.source.revision??0,key:secret};
   const retryInput=retryAllowed(input.importedRevision)&&retryAllowed(input.revision);
   void run(async()=>{
    const value=await request('/api/intake/incumbent',input);
    setStatus(value);
    setNativeKey('');
    setSecret('');
    await refreshAfterSave();
   },{retryInput});
  }}>
   <fieldset disabled={busy}>
    <label className="scheduling-field">Oncall integration ID<input value={id} onChange={e=>setId(e.target.value)} disabled={Boolean(row.value.intakeSource)} required maxLength={80}/></label>
    <label className="scheduling-field">Service for imported integration<select value={service} onChange={e=>setService(e.target.value)} disabled={Boolean(row.value.intakeSource)} required>{services.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="scheduling-field">Incumbent integration key<input type="password" value={secret} onChange={e=>setSecret(e.target.value)} autoComplete="new-password" required minLength={32} maxLength={200}/></label>
    <button type="submit" disabled={!secret||!service}>{status?'Replace incumbent key · leave inactive':'Supply incumbent key · leave inactive'}</button>
   </fieldset>
  </form>
  {status?.keySupplied&&!status.source.active&&<button type="button" disabled={busy} onClick={()=>{
   const input={revision:status.source.revision,confirmed:true};
   void run(async()=>{
    const value=await request(`/api/intake/sources/${encodeURIComponent(id)}/activate-incumbent`,input);
    setStatus({source:value.source,keySupplied:value.keySupplied});
    setNativeKey(value.nativeKey);
    await refreshAfterSave();
   },{retryInput:retryAllowed(input.revision)});
  }}>Activate compatible intake · paging OFF</button>}
  {status?.keySupplied&&<button type="button" disabled={busy} onClick={()=>{
   const input={revision:status.source.revision};
   void run(async()=>{
    const source=await request(`/api/intake/sources/${encodeURIComponent(id)}/revoke`,input);
    setStatus({source,keySupplied:false});
    setNativeKey('');
    await refreshAfterSave();
   },{retryInput:retryAllowed(input.revision)});
  }}>Revoke imported integration keys</button>}
  {nativeKey&&<div role="status"><p>New Oncall key — shown once. Keep it privately; both this key and the supplied incumbent key now use the same integration.</p><output style={{overflowWrap:'anywhere'}}>{nativeKey}</output><button type="button" onClick={()=>setNativeKey('')}>I saved the Oncall key</button></div>}
  <p>Key custody is an explicit edit to this imported object; import undo cannot overwrite it. Restore keeps the integration inactive and requires keys again.</p>
 </section>;
}
