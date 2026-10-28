import {useState} from 'react';
import type {ScheduleReview} from './review';

export function ReviewedChange({review,busy,onApply}:{review:ScheduleReview;busy:boolean;onApply:()=>void}) {
 const [confirmed,setConfirmed]=useState(false);
 const name=(id:string|null)=>id===null?'Coverage gap':review.members.find(m=>m.id===id)?.name??'Unavailable member';
 const date=(at:number,zone=review.schedule.timezone)=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(at);
 const rule=(value:string)=>value.replace(/^rotation/,'Regular rotation').replace(/^override/,'Cover').replace(/^gap/,'Coverage gap');
 return <section className="scheduling-panel oc-review" aria-label="Review schedule changes">
  <h2>Review change</h2>
  <p>{date(review.from)} – {date(review.to)} · {review.schedule.timezone}</p>
  {review.clocks.length>0&&<><h3>Clock changes</h3><ul>{review.clocks.map(c=><li key={c.zone+c.at}>DST / clock change: {c.zone}, {date(c.at,c.zone)}, {c.before} → {c.after}</li>)}</ul></>}
  <div className="scheduling-window-list" tabIndex={0} role="region" aria-label="Coverage change intervals">{review.intervals.map(row=><div className="scheduling-window" key={row.role+row.start}>
   <p><time>{date(row.start)} → {date(row.end)}</time></p>
   <p><strong>{row.role}: {name(row.before)} → {name(row.after)}</strong></p>
   <p>{row.before===row.after?'Holder unchanged':`Loses: ${name(row.before)}. Gains: ${name(row.after)}.`}</p>
   <details><summary>Why this assignment</summary><p>{rule(row.rule)}.</p></details>
   {row.newGap&&<strong>New coverage gap</strong>}{row.closedGap&&<strong>Previously uncovered interval becomes covered</strong>}
  </div>)}</div>
  <label style={{display:"flex",alignItems:"center",gap:"0.5rem",margin:"1rem 0"}}><input type="checkbox" style={{width:"auto",minHeight:"auto",flexShrink:0}} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I reviewed these assignments and gaps</span></label>
  <button type="button" disabled={busy||!confirmed} onClick={onApply}>Apply reviewed change</button>
  <details><summary>About this review</summary><p>Applying changes the whole rota; only the coverage in this range is shown. Existing slots stay in the proposal, and unavailable people show as gaps. A changed rota or workspace needs a fresh review. Paging stays off.</p></details>
 </section>;
}
