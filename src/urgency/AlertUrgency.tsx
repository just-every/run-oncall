import { useId, useState } from 'react';
import { Form } from '../forms';
import type { Alert, State } from '../family/response-operations/domain';
import type { IntakeRun } from '../intake/CompatibleTest';
import { nextSupportStart } from './support-hours';
import type { UrgencyRule } from './types';
import './urgency.css';

// Oncall has no timer yet, so a support-hours raise is described, never claimed as applied.
function SupportStart({rule}:{rule:UrgencyRule}) {
  const [next]=useState(()=>nextSupportStart(rule,Date.now()));
  const when=next===null?null:new Date(next).toLocaleString('en-US',{timeZone:rule.timezone,weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
  return <p className="urgency-support-start" role="note"><strong>Support-start raise is not automatic.</strong> This service's support-hours rule (v{rule.version}, {rule.timezone}) raises open low alerts to high when support hours begin{when?<>, next at <time dateTime={new Date(next!).toISOString()}>{when}</time></>:', but none begins within a year'}. Oncall has no timer yet, so the raise is applied only when a timer runs; change urgency by hand to raise it now.</p>;
}

export function AlertUrgency({alert,state,canEdit,busy,run}:{alert:Alert;state:State;canEdit:boolean;busy:boolean;run:IntakeRun}) {
  const uid=useId(),[urgency,setUrgency]=useState(alert.urgency??'high'),[reason,setReason]=useState('');
  const rule=state.services.find(s=>s.id===alert.service)?.urgencyRules?.at(-1);
  const raise=alert.state==='active'&&alert.urgency==='low'&&rule?.mode==='support-hours'&&rule.inside==='high'&&rule.outside==='low';
  return <div className="alert-urgency"><p><strong>Urgency: {alert.urgency??'unknown (legacy alert)'}</strong> · revision {alert.urgencyRevision??0}</p>
    {raise&&<SupportStart rule={rule}/>}
    {canEdit&&alert.state==='active'&&<details><summary>Change alert urgency</summary><Form busy={busy} label="Save alert urgency" onSubmit={async()=>{const result=await run('/api/urgency/alerts/'+encodeURIComponent(alert.id),{revision:alert.urgencyRevision??0,urgency,reason},urgency===alert.urgency?'Alert urgency already has this value':'Alert urgency changed with attribution');if(result)setReason('');return false;}}><label className="field"><span id={uid}>New alert urgency</span><select aria-labelledby={uid} value={urgency} onChange={e=>setUrgency(e.target.value as 'high'|'low')}><option value="high">High</option><option value="low">Low</option></select></label><label className="field">Alert urgency reason<textarea required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label></Form></details>}
    <details><summary>Urgency decisions and history</summary>{alert.urgencyHistory?.map(entry=><article key={entry.id}><p><strong>{entry.from??'new'} → {entry.to}</strong> · {new Date(entry.at).toLocaleString()}</p><p>{entry.reason}</p><small>{state.members.find(m=>m.id===entry.by)?.name??entry.by} · {entry.id.startsWith('incomplete:')?'Incomplete-intake rule':entry.ruleVersion===null?'Human decision':'Rule v'+entry.ruleVersion}</small></article>)??<p>No retained urgency history on this legacy alert.</p>}
      {alert.events.map(id=>state.events.find(e=>e.id===id)).filter(e=>e?.urgency).map(event=><p key={event!.id}>Admission {event!.eventId}: {event!.urgency!.urgency} · rule v{event!.urgency!.version} · {event!.urgency!.reason}</p>)}
    </details>
  </div>;
}
