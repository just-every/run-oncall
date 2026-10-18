import { useEffect,useState } from 'react'
import { MoveInAdoption } from './MoveInAdoption'
import { ExportHelp } from './move-in/ExportHelp'
import { CompatibilityReview } from './move-in/CompatibilityReview'
import { ImportJournal } from './move-in/ImportJournal'
import { applyPlan, doorClient, previewFile, undoPlan } from './move-in/door-client'

export function MoveInWorkspace({admin,request}:{admin:boolean;request:(path:string,data?:unknown)=>Promise<any>}) {
 const [vendor,setVendor]=useState('opsgenie'),[source,setSource]=useState<Uint8Array|null>(null),[filename,setFilename]=useState(''),[preview,setPreview]=useState<any>(null),[job,setJob]=useState<any>(null),[jobs,setJobs]=useState<any[]>([]),[rows,setRows]=useState<any[]>([]),[choices,setChoices]=useState<any>({services:[],members:[]}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[erasing,setErasing]=useState(''),[typed,setTyped]=useState(''),[erased,setErased]=useState<any>(null)
 const door=doorClient(vendor)
 const run=async(action:()=>Promise<any>)=>{setBusy(true);setError('');try{return await action()}catch(e){setError((e as Error).message);return null}finally{setBusy(false)}}
 const load=async()=>{const [objects,latest,options]=await Promise.all([request('/api/move-in/objects'),request('/api/move-in/jobs?vendor='+vendor),request('/api/move-in/adoption')]);setChoices(options);setRows(objects);setJobs(latest);setJob((current:any)=>current?latest.find((saved:any)=>saved.id===current.id)??null:null)}
 useEffect(()=>{if(admin)void run(load)},[admin,vendor])
 if(!admin)return <section className="panel"><h2>Move-in kit</h2><p>An administrator reviews and imports schedule exports.</p></section>
 return <section className="scheduling-workspace"><section className="scheduling-panel"><h2>Bring your schedules beside your pager</h2><p>Opsgenie first, then PagerDuty. Select saved export files. Preview writes nothing. Imports arrive paused. Review and make a schedule live below; paging stays OFF.</p>
 <label className="scheduling-field"><span id="move-in-source">Source</span><select aria-labelledby="move-in-source" value={vendor} onChange={e=>{setVendor(e.target.value);setPreview(null);setJob(null)}}><option value="opsgenie">Opsgenie</option><option value="pagerduty">PagerDuty</option></select></label>
 <ExportHelp vendor={vendor}/>
 <label className="scheduling-field">Export JSON<input type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];if(file){setSource(new Uint8Array(await file.arrayBuffer()));setFilename(file.name);setPreview(null);setJob(null)}}}/></label>
 <p>Choose the JSON bundle prepared above. Oncall never asks for your provider API key.</p>
 <button disabled={busy||!source} onClick={()=>run(async()=>{setJob(null);setPreview(null);setPreview(await previewFile(door,source!,filename))})}>Preview import</button>
 {error&&<p role="alert">{error}</p>}{busy&&<p role="status">Working…</p>}
 {preview&&<CompatibilityReview preview={preview} busy={busy} hasJob={Boolean(job)} confirm={()=>void run(async()=>{setJob(await applyPlan(door,preview.planId,preview.fingerprint));await load()})}/>}
 <ImportJournal jobs={jobs} job={job} busy={busy} select={setJob} resume={()=>void run(async()=>{setJob(job.door?job.state==='rolling_back'?await undoPlan(door,job.door.planId):await applyPlan(door,job.door.planId,job.door.fingerprint):await request(`/api/move-in/${job.id}/resume`,{vendor}));await load()})} undo={()=>void run(async()=>{setJob(job.door?await undoPlan(door,job.door.planId):await request(`/api/move-in/${job.id}/undo`,{vendor,confirm:true}));await load()})}/>

 </section><section className="scheduling-panel"><h2>Paused imported data</h2><p>Schedules can be adopted into your workspace after the import completes. Choose Make schedule live, then match its service and people. Imported users and policies stay paused.</p>{erased&&<p role="status">Erased. Receipt {erased.receiptId}.{erased.nativeMember==='kept'&&' A native member with this email was not changed.'}</p>}{rows.length?<ul>{rows.map(row=>{const email=row.value.email??row.targetId;return <li key={row.targetKind+row.targetId}><strong>{row.targetKind}: {row.value.name??row.value.schedule?.name??row.targetId}</strong> · {row.value.adopted?'source paused · live schedule adopted':'paused'}{row.targetKind==='user'&&<> <button type="button" disabled={busy} onClick={()=>{setErasing(erasing===row.targetId?'':row.targetId);setTyped('');setErased(null)}}>Erase person</button></>}
 {row.targetKind==='schedule'&&<MoveInAdoption row={row} rows={rows} choices={choices} busy={busy} adopt={input=>run(async()=>{await request('/api/move-in/adopt',input);await load()})}/>}
 {erasing===row.targetId&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{const receipt=await request('/api/move-in/erase',{email,confirmation:typed});setErasing('');setTyped('');await load();setErased(receipt)})}}><label className="scheduling-field">Type "erase {email}" to erase this person from imported data<input value={typed} onChange={e=>setTyped(e.target.value)} autoComplete="off"/></label><button type="submit" disabled={busy||typed!==`erase ${email}`}>Erase permanently</button></form>}</li>})}</ul>:<p>No imported objects.</p>}</section></section>
}
