import {vendorName} from './vendor-formats'
const provider=(job:any)=>vendorName(job.vendor??job.namespace)
const day=(value:string)=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(value))+' UTC':value
const artifactLabel=(value:string)=>value.startsWith('erased-artifact:')?'Import file containing erased data':value
const stateLabel=(job:any)=>job.checkUnavailable?'saved snapshot withdrawn':job.needsCheck?'needs checking':job.state.replaceAll('_',' ')
const label=(job:any)=>[provider(job),...(job.schedules??[]).map(artifactLabel),...(job.files??[]).map(artifactLabel),stateLabel(job)].join(' · ')

// A door import continues and undoes through the door; Business's continue only through Business, and a failed one needs a new preview.
const resumable=(job:any)=>job.door?job.state==='rolling_back'||(!job.door.business&&['queued','applying'].includes(job.state)):['queued','applying','failed','rolling_back'].includes(job.state)
const undoable=(job:any)=>['completed','undoing'].includes(job.state)||(job.door&&job.state==='failed')

export function ImportJournal({jobs,job,busy,select,resume,reconcile,undo}:{jobs:any[];job:any;busy:boolean;select:(job:any)=>void;resume:()=>void;reconcile:()=>void;undo:()=>void}) {
 return <>
 {jobs.length>1&&<label className="scheduling-field">Saved import journal<select aria-label="Saved import journal" value={job?.id??''} disabled={busy} onChange={event=>select(jobs.find(saved=>saved.id===event.target.value)??null)}>{jobs.map((saved,index)=><option key={saved.id} value={saved.id}>{provider(saved)} · {stateLabel(saved)} {index+1}{saved.files?.[0]&&` · ${artifactLabel(saved.files[0])}`}</option>)}</select></label>}
 {job&&<div role="status"><h3>Import journal</h3><p>{label(job)} · {job.checkpoint}/{job.total} source objects processed</p>
 {job.checkUnavailable&&<p>An erasure withdrew the saved snapshot. Oncall needs that snapshot to check the import. Review the coverage of the paused schedules or import a fresh export that excludes the erased person.</p>}
 {job.exportedAt&&<p>Export date from filename: {new Date(job.exportedAt).toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'})}</p>}
 {job.comparisons?.map((comparison:string)=><p key={comparison}>Coverage compared from {comparison.split(' → ').map(day).join(' to ')}</p>)}
 {job.approval&&<details><summary>Approval details</summary><p style={{overflowWrap:'anywhere'}}>{job.approval}</p></details>}
 {!job.checkOnly&&resumable(job)&&<button disabled={busy} onClick={resume}>{job.state==='rolling_back'?'Continue rollback':'Resume import'}</button>}
 {job.checkPlanId&&<button disabled={busy} onClick={reconcile}>{job.checkPlanId===job.door?.planId?'Check imported data':'Check latest import'}</button>}
 {!job.checkOnly&&undoable(job)&&<button disabled={busy} onClick={undo}>{job.state==='undoing'?'Continue undo':'Undo this import'}</button>}
 {job.state==='undoing'&&<p>Undo is still in progress. Continue undo to finish removing the unchanged imported objects.</p>}
 {['undone','rolled_back'].includes(job.state)&&<p>To import this file again, choose it under Other: from a file, review it, then confirm Import paused.</p>}
 </div>}
 </>
}
