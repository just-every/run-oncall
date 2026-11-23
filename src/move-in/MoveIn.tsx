import {useEffect,useState,useRef} from 'react'
import {createPortal} from 'react-dom'
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
import { CopyDetails } from './CopyDetails'
import { ImportJournal } from './ImportJournal'
import { applyPlan, doorClient, previewFile, reconcilePlan, undoPlan, type Reconciliation } from './door-client'

type RunOptions={read?:boolean;retryInput?:boolean}

function statusOf(error:unknown):number|undefined {
 const status=(error as {status?:unknown})?.status
 if(typeof status==='number')return status
 return undefined
}

function transportError(error:unknown) {
 return error instanceof TypeError?new InterruptedTransport():error
}

export function MoveIn({admin,connect,request}:{admin:boolean;connect:boolean;request:(path:string,data?:unknown)=>Promise<any>}) {
 const [vendor,setVendor]=useState('pagerduty'),[source,setSource]=useState<Uint8Array|null>(null),[filename,setFilename]=useState(''),[preview,setPreview]=useState<any>(null),[job,setJob]=useState<any>(null),[jobs,setJobs]=useState<any[]>([]),[rows,setRows]=useState<any[]>([]),[choices,setChoices]=useState<any>({services:[],members:[]}),[busy,setBusy]=useState(false),[erasing,setErasing]=useState(''),[typed,setTyped]=useState(''),[erased,setErased]=useState<any>(null)
 const [step,setStep]=useState(1),[sourceChoice,setSourceChoice]=useState('pagerduty'),[confirmUndo,setConfirmUndo]=useState(false),[labels,setLabels]=useState<Record<string,string>>({})
 const [reconciliation,setReconciliation]=useState<Reconciliation|null>(null)
 const pending=useRef(0),loadVersion=useRef(0),activeVendor=useRef(vendor)
 activeVendor.current=vendor
 const failures=useActionFailure()
 const [failureDetails,setFailureDetails]=useState<unknown>(null)
 const door=doorClient(vendor)

 const run=async<T,>(action:()=>Promise<T>,options:RunOptions={}):Promise<T|null>=>{
  pending.current++;setBusy(true)
  failures.clear();setFailureDetails(null)
  try {
   return await action()
  } catch(caught) {
   const error=transportError(caught)
   setFailureDetails((caught as {details?:unknown})?.details??null)
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
  let objects:any,latest:any,options:any,histories:any[]
  try { [objects,histories,options]=await Promise.all([request('/api/move-in/objects'),Promise.all(Object.keys(vendorNames).map(source=>request('/api/move-in/jobs?vendor='+source))),request('/api/move-in/adoption')]);latest=histories[Object.keys(vendorNames).indexOf(vendor)] } catch(error){if(version!==loadVersion.current||vendor!==activeVendor.current)return;throw error}
  if(version!==loadVersion.current||vendor!==activeVendor.current)return
  setChoices(options);setRows(objects);setJobs(latest)
  // Names remain in erasable journal custody. Read every source so a reload or
  // another Source selection cannot replace distinct integration names.
  setLabels(Object.assign({},...histories.flatMap(history=>[...history].reverse().map((saved:any)=>saved.labels??{}))))
  setJob((current:any)=>current?latest.find((saved:any)=>saved.id===current.id)??null:null)
 }
 const refreshAfterSave=async()=>{try{await load()}catch(error){failures.show(transportError(error),{read:true,target:null})}}
 const checkImport=async(planId:string)=>{
  setReconciliation(null);setErased(null);setStep(4)
  const result=await reconcilePlan(door,planId)
  setReconciliation(result)
  return result
 }
 const applyAndCheck=async(planId:string,fingerprint:string)=>{
  setReconciliation(null);setErased(null)
  try {
   const result=await applyPlan(door,planId,fingerprint)
   setJob(result)
   if(result.state==='completed')await checkImport(planId)
   return result
  } finally {await refreshAfterSave()}
 }

 useEffect(()=>{if(admin){const read=()=>load();void run(read,{read:true,retryInput:true})}},[admin,vendor])
 // The server keeps an unconfirmed preview until it is confirmed, discarded or replaced. Connect says so, and the owner continues or drops it.
 const [waiting,setWaiting]=useState<{vendor:string;review:any}|null>(null)
 useEffect(()=>{
  if(!admin)return
  let current=true
  void (async()=>{
   const response=await fetch('/api/operator/import/pending').catch(()=>null)
   const saved=(response?.ok?await response.json().catch(()=>null):null) as {vendor?:string;review?:any}|null
   if(current&&saved?.review&&saved.vendor)setWaiting({vendor:saved.vendor,review:saved.review})
  })()
  return()=>{current=false}
 },[admin])
 const continueReview=()=>{if(!waiting)return;setVendor(waiting.vendor);setSourceChoice(waiting.vendor==='pagerduty'||waiting.vendor==='opsgenie'?waiting.vendor:'file');setPreview(waiting.review);setSource(null);setFilename('');setStep(2);setWaiting(null)}
 const discardReview=()=>{const saved=waiting;if(!saved)return;void run(async()=>{await doorClient(saved.vendor)('discard',{planId:saved.review.planId});setWaiting(null)})}

 const previewBytes=async(bytes:Uint8Array,name:string,provider=vendor)=>{
  const result=await run(()=>previewFile(doorClient(provider),bytes,name,provider),{read:true})
  if(result){setSource(bytes);setFilename(name);setPreview(result);setJob(null);setReconciliation(null);setWaiting(null);setStep(2)}
 }
 const read=async(provider:Provider,region:Region,key?:string)=>{
  const bytes=await run(()=>readAccount(request,provider,region,key),{read:true})
  if(bytes)await previewBytes(bytes,provider+'-export.json',provider)
 }
 useEffect(()=>{
  if(!admin)return
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
 {step===1&&<ConnectStep waiting={waiting&&{vendor:waiting.vendor,name:vendorNames[waiting.vendor as keyof typeof vendorNames]??waiting.vendor,continueReview,discardReview}} source={sourceChoice} vendor={vendor} connect={connect} busy={busy}
  choose={value=>{setSourceChoice(value);if(value!=='file')setVendor(value);setPreview(null);failures.clear()}}
  fileVendor={setVendor} read={read} file={file=>{void run(async()=>{await previewBytes(new Uint8Array(await file.arrayBuffer()),file.name)},{read:true})}}/>}
 <FailureLine failure={failures.failure}/>{failures.failure&&failureDetails!=null&&(failures.failure.target?.isConnected?createPortal(<CopyDetails value={failureDetails}/>,failures.failure.target):<CopyDetails value={failureDetails}/>)} {busy&&<p role="status">Working…</p>}
 {step===2&&preview&&<ReviewStep preview={preview} bytes={source} filename={filename} busy={busy} back={()=>{void run(async()=>{ if(preview.planId)await door('discard',{planId:preview.planId}).catch(()=>null);setStep(1);setPreview(null)})}} next={()=>setStep(3)}/>}
 {step===3&&preview&&!job&&<ImportStep busy={busy} back={()=>setStep(2)} confirm={()=>{
  const planId=preview.planId,fingerprint=preview.fingerprint
  void run(()=>applyAndCheck(planId,fingerprint),{retryInput:Boolean(planId)})
 }}/>}
 {step===4&&<section className="scheduling-panel move-in-data" aria-live="polite">
 {erased&&!reconciliation?<><h2>Person erased from this import</h2><p>This import no longer matches its saved export: the person and the source records kept for them are permanently gone. The rest of the imported data is unchanged.</p></>:<>
 <h2>{reconciliation?.ok?'Import complete':reconciliation?'Import differences':busy?'Checking imported data':'Import needs checking'}</h2>
 {reconciliation?<>
 <p>{reconciliation.ok?'Oncall checked the imported records against the saved export.':'The native data differs from the saved export. Review these differences before continuing.'}</p>
 {reconciliation.details?.coverageNotCompared.includes('missing')&&<p>The saved export was missing a final coverage list for one or more schedules. Oncall could not compare who was on call for those schedules.</p>}
 {reconciliation.details?.coverageNotCompared.includes('outside')&&<p>Some final coverage lists fell outside the imported schedule dates. Oncall could not compare who was on call for those schedules.</p>}
 <p>{reconciliation.counts.sourceRecords} {reconciliation.counts.sourceRecords===1?'object':'objects'} in the file, {reconciliation.counts.present+reconciliation.counts.explained} accounted for ({reconciliation.counts.nativeTargets} created in Oncall, the rest kept as source evidence)</p>
 {!reconciliation.ok&&<ul>{reconciliation.sourceIds.filter(row=>row.status==='mismatched').map(row=><li key={JSON.stringify([row.kind,row.sourceId])}>{row.kind}: {row.sourceId}<ul>{row.conflicts?.map(conflict=><li key={conflict}>Changed or missing native object: {conflict}</li>)}</ul></li>)}</ul>}
 {reconciliation.ok&&<p>Review imported data below. Adopt a schedule when you’re ready.</p>}
 </>:<p>Check the native data before treating this import as complete. Use Check imported data in the saved journal to try again.</p>}</>}
 <button onClick={()=>{setStep(1);setPreview(null);setReconciliation(null)}}>Read another account or file</button></section>}
 {(jobs.length>0||job)&&<section className="scheduling-panel move-in-data">
 <ImportJournal jobs={jobs} job={job} busy={busy} select={selected=>{setJob(selected);setReconciliation(null);setStep(1)}} reconcile={()=>{void run(()=>checkImport(job.door.planId),{read:true,retryInput:true})}} resume={()=>{
  const selected=job
  const hasPlan=Boolean(selected?.door?.planId)
  void run(async()=>{
   if(selected.door&&selected.state!=='rolling_back')return applyAndCheck(selected.door.planId,selected.door.fingerprint)
   const result=selected.door?await undoPlan(door,selected.door.planId):await request(`/api/move-in/${selected.id}/resume`,{vendor})
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


 </section>}<section className="scheduling-panel move-in-data" hidden={!rows.length&&!erased}><h2>Imported data</h2><p>Data stays paused until you adopt a schedule or activate an integration.</p>{erased&&<p role="status">Imported person erased{erased.recordsErased>0&&<>: {erased.recordsErased} saved {erased.recordsErased===1?'record':'records'} removed permanently</>}.{erased.nativeMember==='kept'&&' A native member with this email was not changed.'}</p>}{rows.length?<ul className="move-in-objects">{rows.map((row,index)=>{const email=row.value.email??row.targetId,label=[row.value.name,row.value.schedule?.name,labels[row.targetKind+':'+row.targetId],row.value.email].find(value=>typeof value==='string'&&value.trim())??`${vendorNames[(row.value.vendor??row.targetId.split(':')[0]) as keyof typeof vendorNames]??'Imported'} ${row.targetKind==='user'?'person':row.targetKind==='policy'?'escalation policy':row.targetKind} ${index+1}`;return <li key={row.targetKind+row.targetId}><strong>{label}</strong> {row.value.adopted&&<span>Adopted · source paused</span>}{row.targetKind==='user'&&<> <button type="button" disabled={busy} onClick={()=>{setErasing(erasing===row.targetId?'':row.targetId);setTyped('');setErased(null)}}>Erase person</button></>}
 {row.targetKind==='integration'&&<IncumbentActivation row={{...row,value:{...row.value,name:label}}} services={choices.services} request={request} reload={load}/>}
 {row.targetKind==='schedule'&&<MoveInAdoption row={row} rows={rows} choices={choices} busy={busy} adopt={input=>run(async()=>{await request('/api/move-in/adopt',input);await refreshAfterSave()},{retryInput:hasChangeBase(input)})}/>}
 {erasing===row.targetId&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{const receipt=await request('/api/move-in/erase',{email,confirmation:typed});await refreshAfterSave();setErasing('');setTyped('');setReconciliation(null);setErased(receipt)})}}><label className="scheduling-field">Type "erase {email}" to erase this person from imported data<input value={typed} onChange={e=>setTyped(e.target.value)} autoComplete="off"/></label><button type="submit" disabled={busy||typed!==`erase ${email}`}>Erase permanently</button></form>}</li>})}</ul>:<p>No imported objects.</p>}</section><a className="move-in-footer" href="/docs/move-in">How move-in works</a></section>
}
