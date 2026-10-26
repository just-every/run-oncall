import {useEffect,useState} from 'react'
import {FailureLine,useActionFailure,hasChangeBase} from './app/FailureLine'
import {InterruptedTransport} from './useWorkspace'
import {IncumbentActivation} from './intake/IncumbentActivation'
import {vendorNames} from './move-in/vendor-formats'
import { MoveInAdoption } from './MoveInAdoption'
import { ExportHelp } from './move-in/ExportHelp'
import { CompatibilityReview } from './move-in/CompatibilityReview'
import { ImportJournal } from './move-in/ImportJournal'
import { applyPlan, doorClient, previewFile, undoPlan } from './move-in/door-client'

type RunOptions={read?:boolean;retryInput?:boolean}

function statusOf(error:unknown):number|undefined {
 const status=(error as {status?:unknown})?.status
 if(typeof status==='number')return status
 return undefined
}

function transportError(error:unknown) {
 return error instanceof TypeError?new InterruptedTransport():error
}

export function MoveInWorkspace({admin,request}:{admin:boolean;request:(path:string,data?:unknown)=>Promise<any>}) {
 const [vendor,setVendor]=useState('opsgenie'),[source,setSource]=useState<Uint8Array|null>(null),[filename,setFilename]=useState(''),[preview,setPreview]=useState<any>(null),[job,setJob]=useState<any>(null),[jobs,setJobs]=useState<any[]>([]),[rows,setRows]=useState<any[]>([]),[choices,setChoices]=useState<any>({services:[],members:[]}),[busy,setBusy]=useState(false),[erasing,setErasing]=useState(''),[typed,setTyped]=useState(''),[erased,setErased]=useState<any>(null)
 const failures=useActionFailure()
 const door=doorClient(vendor)

 const run=async<T,>(action:()=>Promise<T>,options:RunOptions={}):Promise<T|null>=>{
  setBusy(true)
  failures.clear()
  try {
   return await action()
  } catch(caught) {
   const error=transportError(caught)
   const status=statusOf(error)
   const canRetry=options.retryInput===true&&(status===undefined||status>=500)
   failures.show(error,{read:options.read,target:options.read?null:undefined,retry:canRetry?async()=>{
    const result=await run(action,options)
    if(result===null)throw error
   }:undefined})
   return null
  } finally {
   setBusy(false)
  }
 }

 const load=async()=>{
  const [objects,latest,options]=await Promise.all([request('/api/move-in/objects'),request('/api/move-in/jobs?vendor='+vendor),request('/api/move-in/adoption')])
  setChoices(options);setRows(objects);setJobs(latest)
  setJob((current:any)=>current?latest.find((saved:any)=>saved.id===current.id)??null:null)
 }
 const refreshAfterSave=async()=>{try{await load()}catch(error){failures.show(transportError(error),{read:true,target:null})}}

 useEffect(()=>{if(admin){const read=()=>load();void run(read,{read:true,retryInput:true})}},[admin,vendor])

 if(!admin)return <section className="panel"><h2>Move-in kit</h2><p>An administrator reviews and imports schedule exports.</p></section>
 return <section className="scheduling-workspace"><section className="scheduling-panel"><h2>Bring your schedules beside your pager</h2><p>Select saved Opsgenie, PagerDuty, Splunk On-Call, Jira Service Management Ops or Better Stack responses. Preview writes nothing. Imports arrive paused. Review and make a schedule live below; paging stays OFF.</p>
 <label className="scheduling-field"><span id="move-in-source">Source</span><select aria-labelledby="move-in-source" value={vendor} onChange={e=>{setVendor(e.target.value);setPreview(null);setJob(null);failures.clear()}}>{Object.entries(vendorNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
 <ExportHelp vendor={vendor}/>
 <label className="scheduling-field">Export JSON<input type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];if(file){setSource(new Uint8Array(await file.arrayBuffer()));setFilename(file.name);setPreview(null);setJob(null)}}}/></label>
 <p>Choose the JSON bundle prepared above without keys or secrets. After review, an administrator can supply a supported incumbent integration key in the separate activation field.</p>
 <button disabled={busy||!source} onClick={()=>void run(async()=>{setJob(null);setPreview(null);setPreview(await previewFile(door,source!,filename,vendor))})}>Preview import</button>
 <FailureLine failure={failures.failure}/>{busy&&<p role="status">Working…</p>}
 {preview&&<CompatibilityReview preview={preview} busy={busy} hasJob={Boolean(job)} confirm={()=>{
  const planId=preview.planId,fingerprint=preview.fingerprint
  void run(async()=>{const result=await applyPlan(door,planId,fingerprint);setJob(result);await refreshAfterSave();return result},{retryInput:Boolean(planId)})
 }}/>}
 <ImportJournal jobs={jobs} job={job} busy={busy} select={setJob} resume={()=>{
  const selected=job
  const hasPlan=Boolean(selected?.door?.planId)
  void run(async()=>{
   const result=selected.door?selected.state==='rolling_back'?await undoPlan(door,selected.door.planId):await applyPlan(door,selected.door.planId,selected.door.fingerprint):await request(`/api/move-in/${selected.id}/resume`,{vendor})
   setJob(result);await refreshAfterSave();return result
  },{retryInput:hasPlan||Boolean(selected?.id)})
 }} undo={()=>{
  const selected=job
  const hasPlan=Boolean(selected?.door?.planId)
  void run(async()=>{
   const result=selected.door?await undoPlan(door,selected.door.planId):await request(`/api/move-in/${selected.id}/undo`,{vendor,confirm:true})
   setJob(result);await refreshAfterSave();return result
  },{retryInput:hasPlan||Boolean(selected?.id)})
 }}/>

 </section><section className="scheduling-panel"><h2>Paused imported data</h2><p>Schedules can be adopted into your workspace after the import completes. Choose Make schedule live, then match its service and people. Imported users and policies stay paused. An administrator may supply a key separately and activate compatible integration intake below; paging stays OFF.</p>{erased&&<p role="status">Erased. Receipt {erased.receiptId}.{erased.nativeMember==='kept'&&' A native member with this email was not changed.'}</p>}{rows.length?<ul>{rows.map(row=>{const email=row.value.email??row.targetId;return <li key={row.targetKind+row.targetId}><strong>{row.targetKind}: {row.value.name??row.value.schedule?.name??row.targetId}</strong> · {row.value.adopted?'source paused · live schedule adopted':'paused'}{row.targetKind==='user'&&<> <button type="button" disabled={busy} onClick={()=>{setErasing(erasing===row.targetId?'':row.targetId);setTyped('');setErased(null)}}>Erase person</button></>}
 {row.targetKind==='integration'&&<IncumbentActivation row={row} services={choices.services} request={request} reload={load}/>}
 {row.targetKind==='schedule'&&<MoveInAdoption row={row} rows={rows} choices={choices} busy={busy} adopt={input=>run(async()=>{await request('/api/move-in/adopt',input);await refreshAfterSave()},{retryInput:hasChangeBase(input)})}/>}
 {erasing===row.targetId&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{const receipt=await request('/api/move-in/erase',{email,confirmation:typed});await refreshAfterSave();setErasing('');setTyped('');setErased(receipt)})}}><label className="scheduling-field">Type "erase {email}" to erase this person from imported data<input value={typed} onChange={e=>setTyped(e.target.value)} autoComplete="off"/></label><button type="submit" disabled={busy||typed!==`erase ${email}`}>Erase permanently</button></form>}</li>})}</ul>:<p>No imported objects.</p>}</section></section>
}
