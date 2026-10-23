import {vendorName} from './vendor-formats'
const provider=(job:any)=>vendorName(job.vendor??job.namespace)
const label=(job:any)=>[provider(job),...(job.schedules??[]),...(job.files??[]),job.state,job.id.slice(0,8)].join(' · ')

// A door import continues and undoes through the door; Business's continue only through Business, and a failed one needs a new preview.
const resumable=(job:any)=>job.door?job.state==='rolling_back'||(!job.door.business&&['queued','applying'].includes(job.state)):['queued','applying','failed','rolling_back'].includes(job.state)
const undoable=(job:any)=>['completed','undoing'].includes(job.state)||(job.door&&job.state==='failed')

export function ImportJournal({jobs,job,busy,select,resume,undo}:{jobs:any[];job:any;busy:boolean;select:(job:any)=>void;resume:()=>void;undo:()=>void}) {
 return <>
 {jobs.length>0&&<label className="scheduling-field">Saved import journal<select aria-label="Saved import journal" value={job?.id??''} onChange={event=>select(jobs.find(saved=>saved.id===event.target.value)??null)}><option value="">Choose an import</option>{jobs.map(saved=><option key={saved.id} value={saved.id}>{label(saved)}</option>)}</select></label>}
 {job&&<div role="status"><h3>Import journal</h3><p>{label(job)} · {job.checkpoint}/{job.total} source objects processed</p>
 {job.exportedAt&&<p>Export date from filename: {new Date(job.exportedAt).toLocaleString()}</p>}
 {job.comparisons?.map((comparison:string)=><p key={comparison}>Coverage comparison: {comparison}</p>)}
 <p>Journal reference: {job.id}</p>
 {job.approval&&<p style={{overflowWrap:'anywhere'}}>{job.approval}</p>}
 {resumable(job)&&<button disabled={busy} onClick={resume}>{job.state==='rolling_back'?'Continue rollback':'Resume import'}</button>}
 {undoable(job)&&<button disabled={busy} onClick={undo}>{job.state==='undoing'?'Continue undo':'Undo this import'}</button>}
 {job.state==='undoing'&&<p>Undo is still in progress. Continue undo to finish removing the unchanged imported objects.</p>}
 {['undone','rolled_back'].includes(job.state)&&<p>To import this same file again, press Preview import above, review it, then press Confirm paused import. The new import gets its own journal entry.</p>}
 </div>}
 </>
}
