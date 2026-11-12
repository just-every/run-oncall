import { InlineConfirm } from '../app/autosave/InlineConfirm';
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

export function IncumbentActivation({row,services,members=[],request,reload}:{row:any;services:any[];members?:any[];request:(path:string,input?:unknown)=>Promise<any>;reload:()=>Promise<void>}) {
 const [id,setId]=useState(row.value.intakeSource??('import-'+crypto.randomUUID()));
 const [service,setService]=useState(services[0]?.id??'');
 const [secret,setSecret]=useState('');
 const template=row.value.routed;
 const [scope,setScope]=useState<string[]>([]),[targets,setTargets]=useState<Record<string,string>>({}),[owner,setOwner]=useState('');
 const [status,setStatus]=useState<any>(null);
 const [nativeKey,setNativeKey]=useState('');
 const [confirmation,setConfirmation]=useState('');
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
   if(!value.source)return;
   setStatus(value);
   if(value.source.routing){setScope(value.source.routing.scope);setOwner(value.source.routing.owner);setTargets(Object.fromEntries(template.targets.map((target:any)=>[target.id,value.source.routing.versions[0].rules.find((rule:any)=>template.routes.some((route:any)=>route.target===target.id&&route.id===rule.id))?.target.service??value.source.routing.versions[0].catchAll??''])))}
   setService(value.source.service);
   setId(value.source.id);
  });
  void run(read,{read:true,retryInput:true});
 },[row.revision]);

 if(!supported)return <p>This integration kind stays inactive; a compatible activation path is not available.</p>;
 const name=row.value.name??'Imported integration';
 const retryAllowed=(revision:unknown)=>hasChangeBase({revision});
 const refreshAfterSave=async()=>{try{await reload()}catch(error){failures.show(transportError(error),{read:true,target:null})}};
 const supply=()=>{
   const input={importedId:row.targetId,importedRevision:row.revision,id,service,name,revision:status?.source.revision??0,key:secret,...(template?{routing:{scope,targets,owner,confirmed:true}}:{})};
   const retryInput=retryAllowed(input.importedRevision)&&retryAllowed(input.revision);
   void run(async()=>{
    const value=await request('/api/intake/incumbent',input);
    setStatus(value);
    setNativeKey('');
    setSecret('');
    setConfirmation('');
    await refreshAfterSave();
   },{retryInput});
 };

 return <section aria-label={'Activate imported integration '+name}>
  <h3>Activate imported integration</h3>
  <FailureLine failure={failures.failure}/>
  <p>{name}. {status?.source.active?'Active compatible intake':'Inactive compatible intake'}. Paging OFF. {status?.keySupplied?'Incumbent key supplied; never shown again.':'Incumbent key: not supplied.'}</p>
  <p>Supply the integration credential separately. It is never read from your saved file. Supplying or rotating it leaves intake inactive until you confirm activation.</p>
  <form onSubmit={e=>{e.preventDefault();if(status)setConfirmation('replace');else supply()}}>

   <fieldset disabled={busy}>
    {template?<fieldset disabled={Boolean(status)}><legend>Review workspace routing targets</legend><p>Choose the allowed services and map every source target explicitly. Names do not grant team authority. {template.catchAllTarget?'The source default uses its mapped service.':'Unmatched alerts are recorded unrouted for the integration owner.'}</p>
    {services.map(item=><label key={item.id}><input type="checkbox" checked={scope.includes(item.id)} onChange={e=>setScope(e.target.checked?[...scope,item.id]:scope.filter(id=>id!==item.id))}/>{item.name}</label>)}
    {template.targets.map((target:any,index:number)=><label className="scheduling-field" key={target.id}><span id={id+'-target-'+index}>Service for source target {target.label}</span><select aria-labelledby={id+'-target-'+index} value={targets[target.id]??''} onChange={e=>setTargets({...targets,[target.id]:e.target.value})} required><option value="">Choose a service</option>{services.filter(item=>scope.includes(item.id)).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>)}
    <label className="scheduling-field"><span id={id+'-owner-label'}>Routed integration owner</span><select aria-labelledby={id+'-owner-label'} value={owner} onChange={e=>setOwner(e.target.value)} required><option value="">Choose a responder</option>{members.filter(item=>item.active&&['admin','responder'].includes(item.role)).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <p>{template.routes.length} ordered rules · first rule-set version. {template.unconverted.length} unconverted conditions or settings; originals remain in the saved import journal.</p>
    {template.unconverted.map((issue:any)=><p key={issue.field}>{issue.field}: {issue.reason}</p>)}
    </fieldset>:services.length>1?<label className="scheduling-field"><span id={id+'-service-label'}>Service for imported integration</span><select aria-labelledby={id+'-service-label'} value={service} onChange={e=>setService(e.target.value)} disabled={Boolean(row.value.intakeSource)} required>{services.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>:<p>Service: {services[0]?.name??'Add a service before activating this integration.'}</p>}
    <label className="scheduling-field">Incumbent integration key<input type="password" value={secret} onChange={e=>{setSecret(e.target.value);setConfirmation('');failures.clear()}} autoComplete="new-password" required minLength={32} maxLength={200}/></label>
    <button type="submit" disabled={!secret||(template?(!scope.length||!owner||template.targets.some((target:any)=>!scope.includes(targets[target.id]))):!service)}>{status?'Replace incumbent key · leave inactive':'Supply incumbent key · leave inactive'}</button>
   </fieldset>
  </form>
  {confirmation==='replace'&&<InlineConfirm action="Confirm key replacement" keep="Keep the old key" busy={busy} onCancel={()=>setConfirmation('')} onConfirm={supply}>Replace this credential and leave compatible intake inactive?</InlineConfirm>}
  {status?.keySupplied&&!status.source.active&&<button type="button" disabled={busy} onClick={()=>setConfirmation('activate')}>Activate integration</button>}
  {confirmation==='activate'&&<InlineConfirm action="Confirm activation" keep="Keep inactive" busy={busy} onCancel={()=>setConfirmation('')} onConfirm={()=>{
   const input={revision:status.source.revision,confirmed:true};
   void run(async()=>{
    const value=await request(`/api/intake/sources/${encodeURIComponent(id)}/activate-incumbent`,input);
    setStatus({source:value.source,keySupplied:value.keySupplied});
    setNativeKey(value.nativeKey);
    setConfirmation('');
    await refreshAfterSave();
   },{retryInput:retryAllowed(input.revision)});
  }}>Accept compatible alerts using this integration’s reviewed scope and routing? Paging stays off.</InlineConfirm>}
  {status?.keySupplied&&<button type="button" disabled={busy} onClick={()=>setConfirmation('revoke')}>Revoke imported integration keys</button>}
  {confirmation==='revoke'&&<InlineConfirm action="Confirm revoke" keep="Keep these keys" busy={busy} onCancel={()=>setConfirmation('')} onConfirm={()=>{
   const input={revision:status.source.revision};
   void run(async()=>{
    const source=await request(`/api/intake/sources/${encodeURIComponent(id)}/revoke`,input);
    setStatus({source,keySupplied:false});
    setConfirmation('');
    setNativeKey('');
    await refreshAfterSave();
   },{retryInput:retryAllowed(input.revision)});
  }}>Stop accepting alerts through this integration’s keys?</InlineConfirm>}
  {nativeKey&&<div role="status"><p>New Oncall key — shown once. Keep it privately; both this key and the supplied incumbent key now use the same integration.</p><output style={{overflowWrap:'anywhere'}}>{nativeKey}</output><button type="button" onClick={()=>setNativeKey('')}>I saved the Oncall key</button></div>}
  <p>{template?'Undoing or replacing this import fences both keys.':'Key custody is an explicit edit to this imported object; import undo cannot overwrite it.'} Restore keeps the integration inactive and requires keys again.</p>
 </section>;
}
