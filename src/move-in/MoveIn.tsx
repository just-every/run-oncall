import {useEffect,useState,useRef} from 'react'
import {FailureLine,useActionFailure,hasChangeBase} from '../app/FailureLine'
import {InterruptedTransport} from '../useWorkspace'
import {IncumbentActivation} from '../intake/IncumbentActivation'
import {vendorNames} from './vendor-formats'
import { MoveInAdoption } from '../MoveInAdoption'
import { ConnectStep } from './ConnectStep'
import { ReviewStep } from './ReviewStep'
import { ImportStep } from './ImportStep'
import { InlineConfirm } from '../app/autosave/InlineConfirm'
import { readAccount } from './read-client'
import type { Provider, Region } from './collect/bundle'
import './move-in.css'
import { ImportJournal } from './ImportJournal'
import { applyPlan, doorClient, previewFile, undoPlan } from './door-client'

type RunOptions={read?:boolean;retryInput?:boolean}

function statusOf(error:unknown):number|undefined {
 const status=(error as {status?:unknown})?.status
 if(typeof status==='number')return status
 return undefined
}

function transportError(error:unknown) {
 return error instanceof TypeError?new InterruptedTransport():error
}

export function MoveIn({admin,request}:{admin:boolean;request:(path:string,data?:unknown)=>Promise<any>}) {
 const [vendor,setVendor]=useState('pagerduty'),[source,setSource]=useState<Uint8Array|null>(null),[filename,setFilename]=useState(''),[preview,setPreview]=useState<any>(null),[job,setJob]=useState<any>(null),[jobs,setJobs]=useState<any[]>([]),[rows,setRows]=useState<any[]>([]),[choices,setChoices]=useState<any>({services:[],members:[]}),[busy,setBusy]=useState(false),[erasing,setErasing]=useState(''),[typed,setTyped]=useState(''),[erased,setErased]=useState<any>(null)
 const [step,setStep]=useState(1),[sourceChoice,setSourceChoice]=useState('pagerduty'),[connect,setConnect]=useState(false),[confirmUndo,setConfirmUndo]=useState(false),[labels,setLabels]=useState<Record<string,string>>({})
 const pending=useRef(0),loadVersion=useRef(0),activeVendor=useRef(vendor)
 activeVendor.current=vendor
 const failures=useActionFailure()
 const door=doorClient(vendor)

 const run=async<T,>(action:()=>Promise<T>,options:RunOptions={}):Promise<T|null>=>{
  pending.current++;setBusy(true)
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
   pending.current--;setBusy(pending.current>0)
  }
 }

 const load=async()=>{
  const version=++loadVersion.current
  let objects:any,latest:any,options:any
  try { [objects,latest,options]=await Promise.all([request('/api/move-in/objects'),request('/api/move-in/jobs?vendor='+vendor),request('/api/move-in/adoption')]) } catch(error){if(version!==loadVersion.current||vendor!==activeVendor.current)return;throw error}
  if(version!==loadVersion.current||vendor!==activeVendor.current)return
  setChoices(options);setRows(objects);setJobs(latest)
  setLabels(current=>Object.assign({},current,...[...latest].reverse().map((saved:any)=>saved.labels??{})))
  setJob((current:any)=>current?latest.find((saved:any)=>saved.id===current.id)??null:null)
 }
 const refreshAfterSave=async()=>{try{await load()}catch(error){failures.show(transportError(error),{read:true,target:null})}}

 useEffect(()=>{if(admin){const read=()=>load();void run(read,{read:true,retryInput:true})}},[admin,vendor])

 const previewBytes=async(bytes:Uint8Array,name:string,provider=vendor)=>{
  const result=await run(()=>previewFile(doorClient(provider),bytes,name,provider),{read:true})
  if(result){setSource(bytes);setFilename(name);setPreview(result);setJob(null);setStep(2)}
 }
 const read=async(provider:Provider,region:Region,key?:string)=>{
  const bytes=await run(()=>readAccount(request,provider,region,key),{read:true})
  if(bytes)await previewBytes(bytes,provider+'-export.json',provider)
 }
 useEffect(()=>{
  if(!admin)return
  void request('/api/workspace').then(value=>setConnect(value.moveIn?.pagerdutyConnect===true)).catch(error=>failures.show(transportError(error),{read:true,target:null}))
  const connection=new URLSearchParams(location.search).get('connection')
  if(connection==='failed'||connection==='revoke-failed'){
   history.replaceState(history.state,'',location.pathname)
   failures.show(new Error(connection==='revoke-failed'?'PagerDuty could not close the connection. Revoke this app in PagerDuty before connecting again.':'PagerDuty could not connect. Connect again or use a read-only key.'),{read:true,target:null})
  }
  if(new URLSearchParams(location.search).get('connected')==='pagerduty'){
   history.replaceState(history.state,'',location.pathname)
   void request('/api/move-in/connection').then(value=>read('pagerduty',value.region)).catch(error=>failures.show(transportError(error),{read:true,target:null}))
  }
 },[admin])
 if(!admin)return <section className="panel"><h2>Move in</h2><p>An administrator reads and imports schedules.</p></section>
 return <section className="scheduling-workspace move-in-workspace">
 {step===1&&<ConnectStep source={sourceChoice} vendor={vendor} connect={connect} busy={busy}
  choose={value=>{setSourceChoice(value);if(value!=='file')setVendor(value);setPreview(null);failures.clear()}}
  fileVendor={setVendor} read={read} file={file=>{void run(async()=>{await previewBytes(new Uint8Array(await file.arrayBuffer()),file.name)},{read:true})}}/>}
 <FailureLine failure={failures.failure}/>{busy&&<p role="status">Working…</p>}
 {step===2&&preview&&<ReviewStep preview={preview} bytes={source} filename={filename} busy={busy} back={()=>setStep(1)} next={()=>setStep(3)}/>}
 {step===3&&preview&&!job&&<ImportStep busy={busy} back={()=>setStep(2)} confirm={()=>{
  const planId=preview.planId,fingerprint=preview.fingerprint
  void run(async()=>{const result=await applyPlan(door,planId,fingerprint);setJob(result);setStep(4);await refreshAfterSave();return result},{retryInput:Boolean(planId)})
 }}/>}
 {step===4&&<section className="scheduling-panel move-in-data"><h2>Import complete</h2><p>Review imported data below. Adopt a schedule when you’re ready.</p><button onClick={()=>{setStep(1);setPreview(null)}}>Read another account or file</button></section>}
 {(jobs.length>0||job)&&<section className="scheduling-panel move-in-data">
 <ImportJournal jobs={jobs} job={job} busy={busy} select={setJob} resume={()=>{
  const selected=job
  const hasPlan=Boolean(selected?.door?.planId)
  void run(async()=>{
   const result=selected.door?selected.state==='rolling_back'?await undoPlan(door,selected.door.planId):await applyPlan(door,selected.door.planId,selected.door.fingerprint):await request(`/api/move-in/${selected.id}/resume`,{vendor})
   setJob(result);await refreshAfterSave();return result
  },{retryInput:hasPlan||Boolean(selected?.id)})
 }} undo={()=>setConfirmUndo(true)}/>
 {confirmUndo&&<InlineConfirm action="Confirm undo" keep="Keep this import" busy={busy} onCancel={()=>setConfirmUndo(false)} onConfirm={()=>{
  const selected=job
  const hasPlan=Boolean(selected?.door?.planId)
  void run(async()=>{
   const result=selected.door?await undoPlan(door,selected.door.planId):await request(`/api/move-in/${selected.id}/undo`,{vendor,confirm:true})
   setJob(result);setConfirmUndo(false);setStep(1);setPreview(null);await refreshAfterSave();return result
  },{retryInput:hasPlan||Boolean(selected?.id)})
 }}>Remove the unchanged objects from this import? Adopted or edited data cannot be undone.</InlineConfirm>}


 </section>}<section className="scheduling-panel move-in-data" hidden={!rows.length&&!erased}><h2>Imported data</h2><p>Data stays paused until you adopt a schedule or activate an integration.</p>{erased&&<p role="status">Erased. Receipt {erased.receiptId}.{erased.nativeMember==='kept'&&' A native member with this email was not changed.'}</p>}{rows.length?<ul className="move-in-objects">{rows.map(row=>{const email=row.value.email??row.targetId,label=row.value.name??row.value.schedule?.name??labels[row.targetKind+':'+row.targetId]??row.value.email??'Imported item';return <li key={row.targetKind+row.targetId}><strong>{label}</strong> {row.value.adopted&&<span>Adopted · source paused</span>}{row.targetKind==='user'&&<> <button type="button" disabled={busy} onClick={()=>{setErasing(erasing===row.targetId?'':row.targetId);setTyped('');setErased(null)}}>Erase person</button></>}
 {row.targetKind==='integration'&&<IncumbentActivation row={{...row,value:{...row.value,name:label}}} services={choices.services} request={request} reload={load}/>}
 {row.targetKind==='schedule'&&<MoveInAdoption row={row} rows={rows} choices={choices} busy={busy} adopt={input=>run(async()=>{await request('/api/move-in/adopt',input);await refreshAfterSave()},{retryInput:hasChangeBase(input)})}/>}
 {erasing===row.targetId&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{const receipt=await request('/api/move-in/erase',{email,confirmation:typed});await refreshAfterSave();setErasing('');setTyped('');setErased(receipt)})}}><label className="scheduling-field">Type "erase {email}" to erase this person from imported data<input value={typed} onChange={e=>setTyped(e.target.value)} autoComplete="off"/></label><button type="submit" disabled={busy||typed!==`erase ${email}`}>Erase permanently</button></form>}</li>})}</ul>:<p>No imported objects.</p>}</section><a className="move-in-footer" href="/docs/move-in">How move-in works</a></section>
}
