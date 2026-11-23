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
import { reviewCoverageWarnings } from './review-copy'

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
 const pending=useRef(0),loadVersion=useRef(0)
 const failures=useActionFailure()
 const [failureDetails,setFailureDetails]=useState<unknown>(null)

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
  let objects:any,options:any,histories:any[][]
  try {
   [objects,histories,options]=await Promise.all([
    request('/api/move-in/objects'),
    Promise.all(Object.keys(vendorNames).map(source=>request('/api/move-in/jobs?vendor='+source))),
    request('/api/move-in/adoption'),
   ])
  } catch(error){if(version!==loadVersion.current)return;throw error}
  if(version!==loadVersion.current)return
  const history=histories.flat().sort((a,b)=>b.sequence-a.sequence)
  setChoices(options);setRows(objects);setJobs(history)
  // Names remain in erasable journal custody. Prefer the latest saved name for each target.
  setLabels(Object.assign({},...[...history].reverse().map(saved=>saved.labels??{})))
  setJob((current:any)=>history.find(saved=>saved.id===current?.id)??history.find(saved=>saved.state==='completed')??history[0]??null)
 }
 const refreshAfterSave=async()=>{try{await load()}catch(error){failures.show(transportError(error),{read:true,target:null})}}
 const checkImport=async(provider:string,planId:string)=>{
  setReconciliation(null);setErased(null);setStep(4)
  const result=await reconcilePlan(doorClient(provider),planId).finally(refreshAfterSave)
  setReconciliation(result)
  return result
 }
 const applyAndCheck=async(provider:string,planId:string,fingerprint:string)=>{
  setReconciliation(null);setErased(null)
  const result=await applyPlan(doorClient(provider),planId,fingerprint).catch(async error=>{await refreshAfterSave();throw error})
  const needsCheck=result.state==='completed'
  setJob({...result,vendor:provider,door:{planId,fingerprint},needsCheck,checkPlanId:needsCheck?planId:undefined})
  // Apply has committed. A check interruption is a read failure, and retrying
  // the check must not ask the owner to submit the import again.
  if(needsCheck)await run(()=>checkImport(provider,planId),{read:true})
  else {setStep(1);setPreview(null);await refreshAfterSave()}
  return result
 }

 useEffect(()=>{if(admin){const read=()=>load();void run(read,{read:true,retryInput:true})}},[admin])
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
  if(result){setSource(bytes);setFilename(name);setPreview(result);setReconciliation(null);setWaiting(null);setStep(2)}
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
 const coverageWarnings=reconciliation?.details.coverageWarnings
  ??(preview?.planId===job?.door?.planId&&preview?reviewCoverageWarnings(preview.items):job?.coverageWarnings??[])
 const connecting=step===1||(step===4&&job?.checkUnavailable)
 return <section className="scheduling-workspace move-in-workspace">
 {(jobs.length>0||job)&&<section className="scheduling-panel move-in-data" hidden={step===2||step===3}>
 <ImportJournal jobs={jobs} job={job} busy={busy} select={selected=>{setJob(selected);setConfirmUndo(false);setPreview(null);setReconciliation(null);setStep(selected?.needsCheck||selected?.checkUnavailable?4:1)}} reconcile={()=>{void run(()=>checkImport(job.vendor,job.checkPlanId),{read:true,retryInput:true})}} resume={()=>{
  const selected=job
  const hasPlan=Boolean(selected?.door?.planId)
  void run(async()=>{
   if(selected.door&&selected.state!=='rolling_back')return applyAndCheck(selected.vendor,selected.door.planId,selected.door.fingerprint)
   const result=selected.door?await undoPlan(doorClient(selected.vendor),selected.door.planId):await request(`/api/move-in/${selected.id}/resume`,{vendor:selected.vendor})
   setJob(result);await refreshAfterSave();return result
  },{retryInput:hasPlan||Boolean(selected?.id)})
 }} undo={()=>setConfirmUndo(true)}/>
 {confirmUndo&&<InlineConfirm action="Confirm undo" keep="Keep this import" busy={busy} onCancel={()=>setConfirmUndo(false)} onConfirm={()=>{
  const selected=job
  const hasPlan=Boolean(selected?.door?.planId)
  void run(async()=>{
   const result=selected.door?await undoPlan(doorClient(selected.vendor),selected.door.planId):await request(`/api/move-in/${selected.id}/undo`,{vendor:selected.vendor,confirm:true})
   setJob(result);setConfirmUndo(false);setStep(1);setPreview(null);await refreshAfterSave();return result
  },{retryInput:hasPlan||Boolean(selected?.id)})
 }}>Remove the unchanged objects from this import? Adopted or edited data cannot be undone.</InlineConfirm>}
 </section>}
 {connecting&&<ConnectStep waiting={waiting&&{vendor:waiting.vendor,name:vendorNames[waiting.vendor as keyof typeof vendorNames]??waiting.vendor,continueReview,discardReview}} source={sourceChoice} vendor={vendor} connect={connect} busy={busy}
  choose={value=>{setSourceChoice(value);if(value!=='file')setVendor(value);setPreview(null);failures.clear()}}
  fileVendor={setVendor} read={read} file={file=>{void run(async()=>{await previewBytes(new Uint8Array(await file.arrayBuffer()),file.name)},{read:true})}}/>}
 <FailureLine failure={failures.failure}/>{failures.failure&&failureDetails!=null&&(failures.failure.target?.isConnected?createPortal(<CopyDetails value={failureDetails}/>,failures.failure.target):<CopyDetails value={failureDetails}/>)} {busy&&<p role="status">Working…</p>}
 {step===2&&preview&&<ReviewStep preview={preview} bytes={source} filename={filename} busy={busy} back={()=>{void run(async()=>{ if(preview.planId)await doorClient(vendor)('discard',{planId:preview.planId}).catch(()=>null);setStep(1);setPreview(null)})}} next={()=>setStep(3)}/>}
 {step===3&&preview&&<ImportStep busy={busy} back={()=>setStep(2)} confirm={()=>{
  const planId=preview.planId,fingerprint=preview.fingerprint
  void run(()=>applyAndCheck(vendor,planId,fingerprint),{retryInput:Boolean(planId)})
 }}/>}
 {step===4&&!job?.checkUnavailable&&<section className="scheduling-panel move-in-data" aria-live="polite">
 {erased&&!reconciliation?<><h2>Person erased from this import</h2><p>This import no longer matches its saved export: the person and the source records kept for them are permanently gone. The rest of the imported data is unchanged.</p></>:<>
 <h2>{reconciliation?.ok?(coverageWarnings.length?'Import complete with coverage warnings':'Import complete'):reconciliation?'Import differences':busy?'Checking imported data':(job?.needsCheck||failures.failure)?'Import needs checking':'Import complete'}</h2>
 {reconciliation?
 <p>{reconciliation.ok?'Oncall checked the imported records against the saved import plan.':'The native data differs from the saved import plan. Review these differences before continuing.'}</p>
 :job?.needsCheck?<p>Use the saved import journal to check the imported data before making schedules live.</p>
 :null}
 {coverageWarnings.length>0&&<><h3>Schedule coverage from the import review</h3><ul>{coverageWarnings.map((warning:string,index:number)=><li key={index}>{warning}</li>)}</ul></>}
 {reconciliation&&<>
 <p>{reconciliation.counts.sourceRecords} {reconciliation.counts.sourceRecords===1?'source object':'source objects'} checked. {reconciliation.counts.nativeTargets} Oncall {reconciliation.counts.nativeTargets===1?'object matches':'objects match'} the saved plan.</p>
 {!reconciliation.ok&&<ul>{reconciliation.sourceIds.filter(row=>row.status==='mismatched').map(row=><li key={JSON.stringify([row.kind,row.sourceId])}>{row.kind}: {row.sourceId}<ul>{row.conflicts?.map(conflict=><li key={conflict}>Changed or missing native object: {conflict}</li>)}</ul></li>)}</ul>}
 {reconciliation.ok&&<p>{coverageWarnings.length?'Review the coverage warnings before adopting a schedule.':'Review imported data below. Adopt a schedule when you’re ready.'}</p>}
 </>}</>}
 <button onClick={()=>{setStep(1);setPreview(null);setReconciliation(null)}}>Read another account or file</button></section>}
 <section className="scheduling-panel move-in-data" hidden={!rows.length&&!erased}><h2>Imported data</h2><p>Data stays paused until you adopt a schedule or activate an integration.</p>{erased&&<p role="status">Imported person erased{erased.recordsErased>0&&<>: {erased.recordsErased} saved {erased.recordsErased===1?'record':'records'} removed permanently</>}.{erased.nativeMember==='kept'&&' A native member with this email was not changed.'}</p>}{rows.length?<ul className="move-in-objects">{rows.map((row,index)=>{const email=row.value.email??row.targetId,label=[row.value.name,row.value.schedule?.name,labels[row.targetKind+':'+row.targetId],row.value.email].find(value=>typeof value==='string'&&value.trim())??`${vendorNames[(row.value.vendor??row.targetId.split(':')[0]) as keyof typeof vendorNames]??'Imported'} ${row.targetKind==='user'?'person':row.targetKind==='policy'?'escalation policy':row.targetKind} ${index+1}`;return <li key={row.targetKind+row.targetId}><strong>{label}</strong> {row.value.adopted&&<span>Adopted · source paused</span>}{row.targetKind==='user'&&<> <button type="button" disabled={busy} onClick={()=>{setErasing(erasing===row.targetId?'':row.targetId);setTyped('');setErased(null)}}>Erase person</button></>}
 {row.targetKind==='integration'&&<IncumbentActivation row={{...row,value:{...row.value,name:label}}} services={choices.services} request={request} reload={load}/>}
 {row.targetKind==='schedule'&&(row.value.adopted||!choices.uncheckedSchedules?.includes(row.targetId)
  ?<MoveInAdoption row={row} rows={rows} choices={choices} busy={busy} adopt={input=>run(async()=>{await request('/api/move-in/adopt',input);await refreshAfterSave()},{retryInput:hasChangeBase(input)})}/>
  :<p>Check imported data in the saved journal before making this schedule live.</p>)}
 {erasing===row.targetId&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{const receipt=await request('/api/move-in/erase',{email,confirmation:typed});await refreshAfterSave();setErasing('');setTyped('');setReconciliation(null);setErased(receipt)})}}><label className="scheduling-field">Type "erase {email}" to erase this person from imported data<input value={typed} onChange={e=>setTyped(e.target.value)} autoComplete="off"/></label><button type="submit" disabled={busy||typed!==`erase ${email}`}>Erase permanently</button></form>}</li>})}</ul>:<p>No imported objects.</p>}</section><a className="move-in-footer" href="/docs/move-in">How move-in works</a></section>
}
