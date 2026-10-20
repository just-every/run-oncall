import type { EmailReceipt, EmailSample } from './types';
export function EmailActivity({receipts,samples}:{receipts:EmailReceipt[];samples:EmailSample[]}) {
 return <div className="email-activity"><h3>Address activity</h3><p>Every delivery has an outcome. Duplicate Message-ID deliveries retain one receipt with a delivery count. Quarantine never admits an alert. Source recovery never resolves a declared incident.</p>
  <h4>Quarantine</h4>{receipts.filter(r=>['quarantined','refused'].includes(r.outcome)).length?<ul>{receipts.filter(r=>['quarantined','refused'].includes(r.outcome)).map(r=><li key={r.id}>{r.diagnostic} · receipt {r.id}</li>)}</ul>:<p>No quarantined mail.</p>}
  <h4>Receipts</h4>{!receipts.length&&<p>No deliveries yet.</p>}
  {[...receipts].reverse().slice(0,50).map(r=><article key={r.id} className="receipt"><strong>{r.outcome} · {r.diagnostic}</strong><p>{samples.find(s=>s.id===r.sample)?.subject??'Source content not retained'} · {new Date(r.at).toLocaleString()}</p><p>Receipt <code>{r.id}</code> · {r.deliveries} deliveries{r.deliveries>1?' · duplicate Message-ID refused':''}</p>
    {r.stop&&<p><strong>{r.stop}</strong> · email receipt {r.id}; labelled non-automatic state. Paging is OFF.</p>}
    {r.obligation&&<p>Obligation <code>{r.obligation}</code> · paging OFF; no automatic escalation.</p>}
    <details><summary>Routing explanation and safe text</summary><pre>{JSON.stringify({mode:r.decision?.mode,rule:r.decision?.rule,version:r.decision?.version,key:r.decision?.key,action:r.decision?.action,generation:r.generation,event:r.event},null,2)}</pre><pre>{samples.find(s=>s.id===r.sample)?.text??'No saved text'}</pre></details>
  </article>)}
 </div>;
}
