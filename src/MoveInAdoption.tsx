import { InlineConfirm } from './app/autosave/InlineConfirm'
import { useState } from 'react'

export function MoveInAdoption({row,rows,choices,busy,adopt}:{row:any;rows:any[];choices:any;busy:boolean;adopt:(input:any)=>Promise<any>}) {
 const [open,setOpen]=useState(false),[service,setService]=useState(''),[members,setMembers]=useState<Record<string,string>>({})
 const schedule=row.value.schedule
 const people=[...new Set<string>([...schedule.primary.members,...schedule.backup.members,...schedule.overrides.flatMap((o:any)=>o.member===null?[]:[o.member])])]
 const names=new Map(rows.filter(r=>r.targetKind==='user').map(r=>[r.targetId,r.value.name]))
 const chosenService=choices.services.length===1?choices.services[0].id:service
 const chosenMembers=Object.fromEntries(people.map(person=>[person,choices.members.length===1?choices.members[0].id:members[person]]))
 if(row.value.adopted)return <p>Adopted into <a href="/on-call">On call</a>. Paging is OFF. Once a schedule is live, this import can no longer be undone.</p>
 return <div><button type="button" disabled={busy} onClick={()=>setOpen(!open)}>{open?'Close adoption':'Make schedule live'}</button>
 {open&&<form onSubmit={e=>e.preventDefault()}>
 <p>Choose a service and match each person to a workspace member.</p>
 {choices.services.length===1?<p>Service: <strong>{choices.services[0].name}</strong></p>:choices.services.length>1&&<label className="scheduling-field"><span id={row.targetId+'-service'}>Service for {schedule.name}</span><select aria-labelledby={row.targetId+'-service'} value={service} onChange={e=>setService(e.target.value)} required><option value="">Choose a service</option>{choices.services.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
 {people.map(person=>choices.members.length===1?<p key={person}>Workspace member for {names.get(person)??'Erased person'}: <strong>{choices.members[0].name}</strong></p>:choices.members.length>1&&<label key={person} className="scheduling-field"><span id={row.targetId+person+'-member'}>Workspace member for {names.get(person)??'Erased person'}</span><select aria-labelledby={row.targetId+person+'-member'} value={members[person]??''} onChange={e=>setMembers({...members,[person]:e.target.value})} required><option value="">Choose a member</option>{choices.members.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>)}
 {!choices.services.length&&<p><a href="/settings/services">Add a service</a> before adopting.</p>}
 {!choices.members.length&&<p><a href="/settings/team">Add a person</a> before adopting.</p>}
 {people.some(person=>!names.has(person))&&<p>This schedule contains erased person slots. Keep it paused and create a new schedule with explicit coverage gaps.</p>}
 {chosenService&&people.every(person=>chosenMembers[person]&&names.has(person))&&<InlineConfirm action="Confirm live schedule · paging OFF" keep="Keep paused" busy={busy} onCancel={()=>setOpen(false)} onConfirm={()=>void adopt({id:row.targetId,revision:row.revision,service:chosenService,members:chosenMembers,confirm:true})}>Adopt this schedule with these people? Coverage becomes visible. Paging stays off. Adoption cannot be undone through this import.</InlineConfirm>}
 </form>}</div>
}
