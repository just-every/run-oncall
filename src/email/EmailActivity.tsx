import {useState} from 'react';
import type {EmailDecision,EmailMode,EmailPreview,EmailReceipt,EmailSample,EmailQuarantine} from './types';
import {shortTime} from '../integrations/catalog';
export const emailModeLabels: Record<EmailMode, string> = {
  subject: 'Group by subject', single: 'One open alert', each: 'New alert per email', custom: 'Custom rules',
};
const actionLabels: Record<EmailDecision['action'], string> = {
  trigger: 'Trigger an alert', resolve: 'Recover the matching alert', quarantine: 'Held for review',
};

function Decision({label,decision}:{label:string;decision?:EmailDecision|null}) {
  return <div role="group" aria-label={label}>
    <p><strong>{label}</strong></p>
    {decision ? <>
      <p>{actionLabels[decision.action]}</p>
      <p>Mode: {emailModeLabels[decision.mode]}</p>
      <p>Rules version: {decision.version}</p>
      <p>Matched rule: {decision.rule ?? 'None'}</p>
      <p>Key: {decision.key ?? 'None'}</p>
    </> : <p>No retained decision</p>}
  </div>;
}

export function EmailDraftComparison({preview,samples}:{preview:EmailPreview;samples:EmailSample[]}) {
  const subjects = new Map(samples.map(sample => [sample.id, sample.subject]));
  const decisions = preview.decisions.filter(row => subjects.has(row.sample));
  return <>
    <p role="status">{decisions.length} saved messages compared. No records changed.</p>
    <ol className="integration-receipts" aria-label="Saved mail decisions">
      {decisions.map(row => <li key={row.sample}>
        <strong>{subjects.get(row.sample) || 'No subject'}</strong>
        <div className="email-decision-pair">
          <Decision label="Historical decision" decision={row.historical}/>
          <Decision label="Tested draft decision" decision={row.proposed}/>
        </div>
      </li>)}
    </ol>
  </>;
}

export function EmailActivity({receipts,samples,quarantine}:{receipts:EmailReceipt[];samples:EmailSample[];quarantine:EmailQuarantine[]}) {
 const [limit,setLimit]=useState(50);
 return <div className="email-activity"><h3>Receipts</h3>{!receipts.length&&<p>No deliveries yet.</p>}
  <ol className="integration-receipts">{receipts.slice().reverse().slice(0,limit).map(r=><li key={r.id}><strong>{samples.find(s=>s.id===r.sample)?.subject??'Email received'}</strong><p>{r.outcome} · {shortTime(r.at)}{r.deliveries>1?' · '+r.deliveries+' deliveries':''}</p><details><summary>Message and decision</summary><p>{actionLabels[r.decision?.action??'trigger']}{r.decision?' · rules version '+r.decision.version:''}</p>{r.stop&&<p>Stopped by source recovery. A declared incident stays open.</p>}<pre>{samples.find(s=>s.id===r.sample)?.text??'Message text is not retained.'}</pre></details></li>)}</ol>
  {receipts.length>limit&&<button onClick={()=>setLimit(limit+50)}>Show more receipts</button>}
  <details><summary>Held for review ({quarantine.length})</summary>{quarantine.length?<p>{quarantine.length} messages did not match an active receiving rule. Review the rules above.</p>:<p>No messages held for review.</p>}</details>
 </div>;
}
