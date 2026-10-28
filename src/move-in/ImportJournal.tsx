import {vendorName} from './vendor-formats'
const provider=(job:any)=>vendorName(job.vendor??job.namespace)
const shortProvider=(job:any)=>(({splunk:'Splunk',jsm:'Jira',betterstack:'Better Stack'} as Record<string,string>)[job.vendor??job.namespace]??provider(job))
const label=(job:any)=>[provider(job),...(job.schedules??[]),...(job.files??[]),job.state.replaceAll('_',' ')].join(' · ')

// A door import continues and undoes through the door; Business's continue only through Business, and a failed one needs a new preview.
const resumable=(job:any)=>job.door?job.state==='rolling_back'||(!job.door.business&&['queued','applying'].includes(job.state)):['queued','applying','failed','rolling_back'].includes(job.state)
const undoable=(job:any)=>['completed','undoing'].includes(job.state)||(job.door&&job.state==='failed')

export function ImportJournal({jobs,job,busy,select,resume,undo}:{jobs:any[];job:any;busy:boolean;select:(job:any)=>void;resume:()=>void;undo:()=>void}) {
 return <>
 {jobs.length>1&&<label className="scheduling-field">Saved import journal<select aria-label="Saved import journal" value={job?.id??''} onChange={event=>select(jobs.find(saved=>saved.id===event.target.value)??null)}><option value="">Choose an import</option>{jobs.map((saved,index)=><option key={saved.id} value={saved.id}>{shortProvider(saved)} · {saved.state.replaceAll('_',' ')} {index+1}</option>)}</select></label>}
 {jobs.length===1&&!job&&<button disabled={busy} onClick={()=>select(jobs[0])}>Open saved import</button>}
 {job&&<div role="status"><h3>Import journal</h3><p>{label(job)} · {job.checkpoint}/{job.total} source objects processed</p>
 {job.exportedAt&&<p>Export date from filename: {new Date(job.exportedAt).toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'})}</p>}
 {job.comparisons?.map((comparison:string)=><p key={comparison}>Coverage comparison: {comparison}</p>)}
 {job.approval&&<details><summary>Approval details</summary><p style={{overflowWrap:'anywhere'}}>{job.approval}</p></details>}
 {resumable(job)&&<button disabled={busy} onClick={resume}>{job.state==='rolling_back'?'Continue rollback':'Resume import'}</button>}
 {undoable(job)&&<button disabled={busy} onClick={undo}>{job.state==='undoing'?'Continue undo':'Undo this import'}</button>}
 {job.state==='undoing'&&<p>Undo is still in progress. Continue undo to finish removing the unchanged imported objects.</p>}
 {['undone','rolled_back'].includes(job.state)&&<p>To import this file again, choose it under Other: from a file, review it, then confirm Import paused.</p>}
 </div>}
 </>
}
