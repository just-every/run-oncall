import {useState} from 'react';
import type {ScheduleReview} from './review';

export function ReviewedChange({review,busy,onApply}:{review:ScheduleReview;busy:boolean;onApply:()=>void}) {
 const [confirmed,setConfirmed]=useState(false);
 const name=(id:string|null)=>id===null?'Coverage gap':review.members.find(m=>m.id===id)?.name??'Unavailable member';
 const date=(at:number)=>new Date(at).toISOString();
 return <section className="scheduling-panel" aria-label="Review schedule changes">
  <h2>Review schedule changes</h2>
  <p>Revision {review.revision} → {review.schedule.revision}. Coverage shown for {date(review.from)} through {date(review.to)}. Applying saves the whole schedule; coverage outside this range is not shown. Paging OFF.</p>
  <p>Every interval shows its previous and proposed holder. Retained slots remain in the proposal; unavailable members stay visible as gaps.</p>
  <h3>Clock changes in named zones</h3>
  {review.clocks.length?<ul>{review.clocks.map(c=><li key={c.zone+c.at}>DST / clock change: {c.zone}, {date(c.at)}, {c.before} → {c.after}</li>)}</ul>:<p>No clock transition in this reviewed range.</p>}
  <div className="scheduling-window-list" tabIndex={0} role="region" aria-label="Coverage change intervals">{review.intervals.map(row=><div className="scheduling-window" key={row.role+row.start}>
   <p><time>{date(row.start)} → {date(row.end)}</time></p>
   <p><strong>{row.role}: {name(row.before)} → {name(row.after)}</strong></p>
   <p>{row.before===row.after?'Holder unchanged':`Loses: ${name(row.before)}. Gains: ${name(row.after)}.`} Rule: {row.rule}.</p>
   {row.newGap&&<strong>New coverage gap</strong>}{row.closedGap&&<strong>Previously uncovered interval becomes covered</strong>}
  </div>)}</div>
  <label style={{display:"flex",alignItems:"center",gap:"0.5rem",margin:"1rem 0"}}><input type="checkbox" style={{width:"auto",minHeight:"auto",flexShrink:0}} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I reviewed these assignments and gaps</span></label>
  <button type="button" disabled={busy||!confirmed} onClick={onApply}>Apply reviewed change</button>
  <p>A changed schedule or workspace requires a fresh review. Nothing is sent.</p>
 </section>;
}
