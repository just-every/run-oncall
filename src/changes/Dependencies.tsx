import { useEffect, useState } from 'react';
import { request } from '../useWorkspace';
import type { Service } from '../family/response-operations/domain';
import './changes.css';
export function ServiceDependencies({service, services, revision, busy, run}: {service:Service;services:Service[];revision:number;busy:boolean;run:(path:string,data:any,message?:string)=>Promise<any>}) {
  const [selected,setSelected]=useState(service.dependencies??[]),[base,setBase]=useState(revision),[error,setError]=useState(''),[dirty,setDirty]=useState(false);
  useEffect(()=>{if(!dirty){setBase(revision);setSelected(service.dependencies??[])}},[revision,service.dependencies,dirty]);
  return <details className="service-dependencies"><summary>Edit direct dependencies</summary>
    <p>Recent changes include this service and the dependencies selected here. This does not change access or paging.</p>
    <form onSubmit={async e=>{e.preventDefault();const result=await run('/api/command',{type:'service-dependencies',service:service.id,dependencies:selected,workspaceRevision:base},'Dependencies saved');if(result){const latest=await request('/api/state');setBase(latest.revision);setSelected(result.dependencies??[]);setDirty(false)}}}>
      <fieldset disabled={busy}><legend>Direct dependencies for {service.name}</legend>{services.filter(s=>s.id!==service.id).map(s=><label className="dependency-choice" key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={e=>{setDirty(true);setSelected(old=>e.target.checked?[...old,s.id]:old.filter(id=>id!==s.id))}} />{s.name} · {s.environment}</label>)}{services.length<2&&<p>Create another service before adding a dependency.</p>}<button>Save dependencies for {service.name}</button></fieldset>
    </form>
    <button disabled={busy} onClick={async()=>{try{const current=await request('/api/state');setSelected(current.services.find((s:Service)=>s.id===service.id).dependencies??[]);setBase(current.revision);setDirty(false);setError('')}catch(e){setError((e as Error).message)}}}>Reload dependencies for {service.name}</button>
    {error&&<p role="alert">{error}</p>}
  </details>;
}
