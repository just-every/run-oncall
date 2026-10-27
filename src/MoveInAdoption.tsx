import { InlineConfirm } from './app/autosave/InlineConfirm'
import { useState } from 'react'

export function MoveInAdoption({row,rows,choices,busy,adopt}:{row:any;rows:any[];choices:any;busy:boolean;adopt:(input:any)=>Promise<any>}) {
 const [open,setOpen]=useState(false),[service,setService]=useState(''),[members,setMembers]=useState<Record<string,string>>({})
 const schedule=row.value.schedule
 const people=[...new Set<string>([...schedule.primary.members,...schedule.backup.members,...schedule.overrides.flatMap((o:any)=>o.member===null?[]:[o.member])])]
 const names=new Map(rows.filter(r=>r.targetKind==='user').map(r=>[r.targetId,r.value.name]))
 if(row.value.adopted)return <p>Adopted into <a href="/schedules">Schedules</a>. Paging is OFF. Once a schedule is live, this import can no longer be undone.</p>
 return <div><button type="button" disabled={busy} onClick={()=>setOpen(!open)}>{open?'Close adoption':'Make schedule live'}</button>
 {open&&<form onSubmit={e=>e.preventDefault()}>
 <p>Choose a service and match each person to a workspace member.</p>
 <label className="scheduling-field"><span id={row.targetId+'-service'}>Service for {schedule.name}</span><select aria-labelledby={row.targetId+'-service'} value={service} onChange={e=>setService(e.target.value)} required><option value="">Choose a service</option>{choices.services.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 {people.map(person=><label key={person} className="scheduling-field"><span id={row.targetId+person+'-member'}>Workspace member for {names.get(person)??person}</span><select aria-labelledby={row.targetId+person+'-member'} value={members[person]??''} onChange={e=>setMembers({...members,[person]:e.target.value})} required><option value="">Choose a member</option>{choices.members.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>)}
 {!choices.services.length&&<p>Add a service under Services before adopting.</p>}
 {people.some(person=>!names.has(person))&&<p>This schedule contains erased person slots. Keep it paused and create a new schedule with explicit coverage gaps.</p>}
 <InlineConfirm action="Confirm live schedule · paging OFF" keep="Keep paused" busy={busy||!service||people.some(person=>!members[person]||!names.has(person))} onCancel={()=>setOpen(false)} onConfirm={()=>void adopt({id:row.targetId,revision:row.revision,service,members,confirm:true})}>Adopt this schedule with these people? Coverage becomes visible. Paging stays off. Adoption cannot be undone through this import.</InlineConfirm>
 </form>}</div>
}
