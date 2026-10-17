import { useId, useState } from 'react';
import { Form } from '../forms';
import type { Alert, State } from '../family/response-operations/domain';
import type { IntakeRun } from '../intake/CompatibleTest';
import './urgency.css';

export function AlertUrgency({alert,state,canEdit,busy,run}:{alert:Alert;state:State;canEdit:boolean;busy:boolean;run:IntakeRun}) {
  const uid=useId(),[urgency,setUrgency]=useState(alert.urgency??'high'),[reason,setReason]=useState('');
  return <div className="alert-urgency"><p><strong>Urgency: {alert.urgency??'unknown (legacy alert)'}</strong> · revision {alert.urgencyRevision??0}</p>
    {canEdit&&alert.state==='active'&&<details><summary>Change alert urgency</summary><Form busy={busy} label="Save alert urgency" onSubmit={async()=>{const result=await run('/api/urgency/alerts/'+encodeURIComponent(alert.id),{revision:alert.urgencyRevision??0,urgency,reason},urgency===alert.urgency?'Alert urgency already has this value':'Alert urgency changed with attribution');if(result)setReason('');return false;}}><label className="field"><span id={uid}>New alert urgency</span><select aria-labelledby={uid} value={urgency} onChange={e=>setUrgency(e.target.value as 'high'|'low')}><option value="high">High</option><option value="low">Low</option></select></label><label className="field">Alert urgency reason<textarea required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label></Form></details>}
    <details><summary>Urgency decisions and history</summary>{alert.urgencyHistory?.map(entry=><article key={entry.id}><p><strong>{entry.from??'new'} → {entry.to}</strong> · {new Date(entry.at).toLocaleString()}</p><p>{entry.reason}</p><small>{state.members.find(m=>m.id===entry.by)?.name??entry.by} · {entry.ruleVersion===null?'Human decision':'Rule v'+entry.ruleVersion}</small></article>)??<p>No retained urgency history on this legacy alert.</p>}
      {alert.events.map(id=>state.events.find(e=>e.id===id)).filter(e=>e?.urgency).map(event=><p key={event!.id}>Admission {event!.eventId}: {event!.urgency!.urgency} · rule v{event!.urgency!.version} · {event!.urgency!.reason}</p>)}
    </details>
  </div>;
}
