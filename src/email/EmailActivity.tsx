import {useState} from 'react';
import type {EmailReceipt,EmailSample,EmailQuarantine} from './types';
import {shortTime} from '../integrations/catalog';
export function EmailActivity({receipts,samples,quarantine}:{receipts:EmailReceipt[];samples:EmailSample[];quarantine:EmailQuarantine[]}) {
 const [limit,setLimit]=useState(50);
 return <div className="email-activity"><h3>Receipts</h3>{!receipts.length&&<p>No deliveries yet.</p>}
  <ol className="integration-receipts">{receipts.slice().reverse().slice(0,limit).map(r=><li key={r.id}><strong>{samples.find(s=>s.id===r.sample)?.subject??'Email received'}</strong><p>{r.outcome} · {shortTime(r.at)}{r.deliveries>1?' · '+r.deliveries+' deliveries':''}</p><details><summary>Message and decision</summary><p>{r.decision?.action==='quarantine'?'Held for review':r.decision?.action==='resolve'?'Recover the matching alert':'Trigger an alert'}{r.decision?' · rules version '+r.decision.version:''}</p>{r.stop&&<p>Stopped by source recovery. A declared incident stays open.</p>}<pre>{samples.find(s=>s.id===r.sample)?.text??'Message text is not retained.'}</pre></details></li>)}</ol>
  {receipts.length>limit&&<button onClick={()=>setLimit(limit+50)}>Show more receipts</button>}
  <details><summary>Held for review ({quarantine.length})</summary>{quarantine.length?<p>{quarantine.length} messages did not match an active receiving rule. Review the rules above.</p>:<p>No messages held for review.</p>}</details>
 </div>;
}
