import {useState,useEffect,useRef} from 'react';
import type {ScheduleReview} from './review';

export function ReviewedChange({review,busy,onApply,focusOnOpen=true}:{review:ScheduleReview;busy:boolean;onApply:()=>void;focusOnOpen?:boolean}) {
 const [confirmed,setConfirmed]=useState(false),[shown,setShown]=useState(80);
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{if(!focusOnOpen)return;const heading=panel.current?.querySelector<HTMLElement>('h2');heading?.focus();heading?.scrollIntoView({block:'nearest'});},[]);
 const rows=[...review.intervals].sort((a,b)=>Number(b.after===null)-Number(a.after===null)||a.start-b.start||a.role.localeCompare(b.role));
 const name=(id:string|null)=>id===null?'Coverage gap':review.members.find(m=>m.id===id)?.name??'Unavailable member';
 const date=(at:number,zone=review.schedule.timezone)=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(at);
 const rule=(value:string)=>value.replace(/^rotation/,'Regular rotation').replace(/^override/,'Cover').replace(/^gap/,'Coverage gap');
 return <section ref={panel} tabIndex={-1} className="scheduling-panel oc-review" aria-label="Review schedule changes">
  <h2 tabIndex={-1}>Review change</h2>
  <p>{date(review.from)} – {date(review.to)} · {review.schedule.timezone}</p>
  {review.clocks.length>0&&<><h3>Clock changes</h3><ul>{review.clocks.map(c=><li key={c.zone+c.at}>DST / clock change: {c.zone}, {date(c.at,c.zone)}, {c.before} → {c.after}</li>)}</ul></>}
  <p>{review.intervals.length} resolved role spans; {review.intervals.filter(row=>row.after===null).length} uncovered spans. Gaps first.</p>
  <div className="scheduling-window-list" tabIndex={0} role="region" aria-label="Coverage change intervals">{rows.slice(0,shown).map(row=><div className="scheduling-window" key={row.role+row.start}>
   <p><time>{date(row.start)} → {date(row.end)}</time></p>
   <p><strong>{row.role}: {name(row.before)} → {name(row.after)}</strong></p>
   <p>{row.before===row.after?'Holder unchanged':`Loses: ${name(row.before)}. Gains: ${name(row.after)}.`}</p>
   <details><summary>Why this assignment</summary><p>{rule(row.rule)}.</p></details>
   {row.newGap&&<strong>New coverage gap</strong>}{row.closedGap&&<strong>Previously uncovered interval becomes covered</strong>}
  </div>)}</div>
  {shown<rows.length&&<button type="button" onClick={()=>setShown(n=>n+80)}>Show more spans</button>}
  <label style={{display:"flex",alignItems:"center",gap:"0.5rem",margin:"1rem 0"}}><input type="checkbox" style={{width:"auto",minHeight:"auto",flexShrink:0}} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I reviewed these assignments and gaps</span></label>
  <button type="button" disabled={busy||!confirmed} onClick={onApply}>Apply reviewed change</button>
  <details><summary>About this review</summary><p>Applying changes the whole rota; only the coverage in this range is shown. Existing slots stay in the proposal, and unavailable people show as gaps. A changed rota or workspace needs a fresh review. Paging stays off.</p></details>
 </section>;
}
