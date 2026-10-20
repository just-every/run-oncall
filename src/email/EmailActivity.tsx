import { useState } from 'react';
import type { EmailReceipt, EmailSample, EmailQuarantine } from './types';
export function EmailActivity({receipts,samples,quarantine}:{receipts:EmailReceipt[];samples:EmailSample[];quarantine:EmailQuarantine[]}) {
 const [limit,setLimit]=useState(50);
 return <div className="email-activity"><h3>Address activity</h3><p>Every delivery has an outcome. Duplicate Message-ID deliveries retain one receipt with a delivery count. Quarantine never admits an alert. Source recovery never resolves a declared incident.</p>
  <h4>Quarantine</h4>{quarantine.length?<ul>{quarantine.map(r=><li key={r.id}>{r.reason} · receipt {r.receipt}</li>)}</ul>:<p>No quarantined mail.</p>}
  <h4>Receipts</h4><p>Showing {Math.min(limit,receipts.length)} of {receipts.length} receipts, newest first.</p>{!receipts.length&&<p>No deliveries yet.</p>}
  {[...receipts].reverse().slice(0,limit).map(r=><article key={r.id} className="receipt"><strong>{r.outcome} · {r.diagnostic}</strong><p>{samples.find(s=>s.id===r.sample)?.subject??'Source content not retained'} · {new Date(r.at).toLocaleString()}</p><p>Receipt <code>{r.id}</code> · {r.deliveries} deliveries{r.deliveries>1?' · latest delivery refused: '+r.lastDiagnostic:''}</p>
    {r.stop&&<p><strong>{r.stop}</strong> · email receipt {r.id}; labelled non-automatic state. Paging is OFF.</p>}
    {r.obligation&&<p>Obligation <code>{r.obligation}</code> · paging OFF; no automatic escalation.</p>}
    <details><summary>Routing explanation and safe text</summary><pre>{JSON.stringify({mode:r.decision?.mode,rule:r.decision?.rule,version:r.decision?.version,key:r.decision?.key,action:r.decision?.action,generation:r.generation,event:r.event},null,2)}</pre><pre>{samples.find(s=>s.id===r.sample)?.text??'No saved text'}</pre></details>
  </article>)}
  {receipts.length>limit&&<button onClick={()=>setLimit(limit+50)}>Show more receipts</button>}
 </div>;
}
