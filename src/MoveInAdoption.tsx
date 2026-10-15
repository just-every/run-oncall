import { useState } from 'react'

export function MoveInAdoption({row,rows,choices,busy,adopt}:{row:any;rows:any[];choices:any;busy:boolean;adopt:(input:any)=>Promise<any>}) {
 const [open,setOpen]=useState(false),[service,setService]=useState(''),[members,setMembers]=useState<Record<string,string>>({})
 const schedule=row.value.schedule
 const people=[...new Set<string>([...schedule.primary.members,...schedule.backup.members,...schedule.overrides.flatMap((o:any)=>o.member===null?[]:[o.member])])]
 const names=new Map(rows.filter(r=>r.targetKind==='user').map(r=>[r.targetId,r.value.name]))
 if(row.value.adopted)return <p>Adopted into <a href="#schedules">Schedules</a>. Paging is OFF. Import undo preserves this native edit and refuses with a conflict.</p>
 return <div><button type="button" disabled={busy} onClick={()=>setOpen(!open)}>{open?'Close adoption':'Make schedule live'}</button>
 {open&&<form onSubmit={e=>{e.preventDefault();void adopt({id:row.targetId,revision:row.revision,service,members,confirm:true})}}>
 <p>Choose an existing service and match each person to an active workspace member. Create missing people under Team first. This makes coverage visible in Schedules, now/next and the calendar; paging stays OFF. Policies and sign-in are not activated.</p>
 <label className="scheduling-field">Service for {schedule.name}<select value={service} onChange={e=>setService(e.target.value)} required><option value="">Choose a service</option>{choices.services.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 {people.map(person=><label key={person} className="scheduling-field">Workspace member for {names.get(person)??person}<small>{person}</small><select value={members[person]??''} onChange={e=>setMembers({...members,[person]:e.target.value})} required><option value="">Choose a member</option>{choices.members.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>)}
 {!choices.services.length&&<p>Add a service under Services before adopting.</p>}
 {people.some(person=>!names.has(person))&&<p>This schedule contains erased person slots. Keep it paused and create a new schedule with explicit coverage gaps.</p>}
 <p>Adoption is a native edit: undoing the import will stop with a conflict and keep the adopted schedule. The imported source stays paused as evidence. Review coverage under Schedules before relying on it.</p>
 <button disabled={busy||!service||people.some(person=>!members[person]||!names.has(person))}>Confirm live schedule · paging OFF</button>
 </form>}</div>
}
