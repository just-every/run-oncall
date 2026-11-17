import { InlineConfirm } from './app/autosave/InlineConfirm'
import { useState } from 'react'

export function MoveInAdoption({row,rows,choices,busy,adopt}:{row:any;rows:any[];choices:any;busy:boolean;adopt:(input:any)=>Promise<any>}) {
 const [open,setOpen]=useState(false),[service,setService]=useState(''),[members,setMembers]=useState<Record<string,string>>({}),[extraServices,setExtraServices]=useState<string[]>([]),[policyId,setPolicyId]=useState(''),[both,setBoth]=useState(false)
 const schedule=row.value.schedule
 const people=[...new Set<string>([...schedule.primary.members,...schedule.backup.members,...schedule.overrides.flatMap((o:any)=>o.member===null?[]:[o.member])])]
 const names=new Map(rows.filter(r=>r.targetKind==='user').map(r=>[r.targetId,r.value.name]))
 const chosenService=choices.services.length===1?choices.services[0].id:service
 const policies=rows.filter(r=>r.targetKind==='policy'&&!r.value.adopted&&r.value.steps?.every((step:any)=>step.scheduleId===row.targetId)),policy=policies.find(r=>r.targetId===policyId);
 // A service with a rota gains a second one: say so, and make keeping both a choice.
 const liveServices=[chosenService,...extraServices].filter(Boolean)
 const existing=(choices.rotas??[]).filter((rota:any)=>rota.services.some((id:string)=>liveServices.includes(id)))
 const serviceName=(id:string)=>choices.services.find((s:any)=>s.id===id)?.name??'this service'
 const chosenMembers=Object.fromEntries(people.map(person=>[person,choices.members.length===1?choices.members[0].id:members[person]]))
 if(row.value.adopted)return <p>Adopted into <a href="/on-call">On call</a>. Paging is OFF. Once a schedule is live, this import can no longer be undone.</p>
 return <div><button type="button" disabled={busy} onClick={()=>setOpen(!open)}>{open?'Close adoption':'Make schedule live'}</button>
 {open&&<form onSubmit={e=>e.preventDefault()}>
 <p>Choose a service and match each person to a workspace member.</p>
 {choices.services.length===1?<p>Service: <strong>{choices.services[0].name}</strong></p>:choices.services.length>1&&<label className="scheduling-field"><span id={row.targetId+'-service'}>Service for {schedule.name}</span><select aria-labelledby={row.targetId+'-service'} value={service} onChange={e=>setService(e.target.value)} required><option value="">Choose a service</option>{choices.services.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
 {chosenService&&choices.services.length>1&&<fieldset className="shared-rota-services"><legend>Other services sharing this rota</legend>{choices.services.filter((s:any)=>s.id!==chosenService).map((s:any)=><label key={s.id}><input type="checkbox" value={s.id} checked={extraServices.includes(s.id)} onChange={event=>setExtraServices(current=>event.target.checked?[...current,s.id]:current.filter(id=>id!==s.id))}/>{s.name}</label>)}</fieldset>}
 {policies.length>0&&<label className="scheduling-field">Shared escalation policy<select aria-label="Shared escalation policy" value={policyId} onChange={event=>setPolicyId(event.target.value)}><option value="">Keep imported policy paused</option>{policies.map((p:any)=><option key={p.targetId} value={p.targetId}>{p.value.name}</option>)}</select></label>}
 {policy&&<p>One policy and one rota will cover the selected services. Source services: {(policy.value.serviceSources??[]).map((s:any)=>s.name).join(', ')||'not supplied'}. Recorded notifications only; no sender. Policy waits: {policy.value.steps.map((step:any)=>step.delayMinutes+' minutes').join(', ')}. Review retained timing differences before confirming.</p>}
 {people.map(person=>choices.members.length===1?<p key={person}>Workspace member for {names.get(person)??'Erased person'}: <strong>{choices.members[0].name}</strong></p>:choices.members.length>1&&<label key={person} className="scheduling-field"><span id={row.targetId+person+'-member'}>Workspace member for {names.get(person)??'Erased person'}</span><select aria-labelledby={row.targetId+person+'-member'} value={members[person]??''} onChange={e=>setMembers({...members,[person]:e.target.value})} required><option value="">Choose a member</option>{choices.members.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>)}
 {!choices.services.length&&<p><a href="/settings/services">Add a service</a> before adopting.</p>}
 {!choices.members.length&&<p><a href="/settings/team">Add a person</a> before adopting.</p>}
 {people.some(person=>!names.has(person))&&<p>This schedule contains erased person slots. Keep it paused and create a new schedule with explicit coverage gaps.</p>}
 {existing.length>0&&<><p role="alert">{existing.map((rota:any)=>serviceName(rota.services.find((id:string)=>liveServices.includes(id))))[0]} already has {existing.length===1?'the rota':'these rotas'} {existing.map((rota:any)=><strong key={rota.id}>{rota.name}</strong>).reduce((all:any[],part:any,index:number)=>index?[...all,', ',part]:[part],[])}. Making this schedule live adds another rota for the same service, and On call will list both with their own hand-overs. To replace it, edit or remove the existing rota under On call afterwards.</p>
 <label><input type="checkbox" checked={both} onChange={e=>setBoth(e.target.checked)}/> Keep both rotas for now</label></>}
 {chosenService&&(existing.length===0||both)&&people.every(person=>chosenMembers[person]&&names.has(person))&&<InlineConfirm action="Confirm live schedule · paging OFF" keep="Keep paused" busy={busy} onCancel={()=>setOpen(false)} onConfirm={()=>void adopt({id:row.targetId,revision:row.revision,service:chosenService,...(extraServices.filter(id=>id!==chosenService).length?{services:[chosenService,...extraServices.filter(id=>id!==chosenService)]}:{}),...(policy?{policy:{id:policy.targetId,revision:policy.revision}}:{}),members:chosenMembers,confirm:true})}>Adopt this schedule with these people? Coverage becomes visible. Paging stays off. Adoption cannot be undone through this import.</InlineConfirm>}
 </form>}</div>
}
