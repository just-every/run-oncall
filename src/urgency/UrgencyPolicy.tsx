import { useId, useState } from 'react';
import { Form } from '../forms';
import { request } from '../useWorkspace';
import type { Service, State } from '../family/response-operations/domain';
import type { IntakeRun } from '../intake/CompatibleTest';
import type { Urgency, UrgencyRule } from './types';
import './urgency.css';

const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export function UrgencyPolicy({service,state,admin,busy,run}:{service:Service;state:State;admin:boolean;busy:boolean;run:IntakeRun}) {
  const current=service.urgencyRules?.at(-1),uid=useId(),[base,setBase]=useState(current?.version??0),[mode,setMode]=useState<UrgencyRule['mode']>(current?.mode??'severity'),[zone,setZone]=useState(current?.timezone??'America/New_York'),[selectedDays,setDays]=useState<number[]>(current?.weekly.map(w=>w.day)??[1,2,3,4,5]),[start,setStart]=useState(current?.weekly[0]?.start??'09:00'),[end,setEnd]=useState(current?.weekly[0]?.end??'17:00'),[holidays,setHolidays]=useState(current?.holidays.join('\n')??''),[inside,setInside]=useState<Urgency>(current?.inside??'high'),[outside,setOutside]=useState<Urgency>(current?.outside??'low'),[reason,setReason]=useState(current?.reason??''),[at,setAt]=useState(new Date().toISOString().slice(0,16)),[severity,setSeverity]=useState('warning'),[preview,setPreview]=useState<any>(null),[error,setError]=useState('');
  const [advanced,setAdvanced]=useState(current&&current.weekly.some(w=>w.start!==current.weekly[0]?.start||w.end!==current.weekly[0]?.end)?JSON.stringify(current.weekly,null,2):'');
  function draft(){return {mode,timezone:zone,weekly:advanced.trim()?JSON.parse(advanced):[...new Set(selectedDays)].sort().map(day=>({day,start,end})),holidays:holidays.split('\n').map(d=>d.trim()).filter(Boolean),inside,outside,reason};}
  const changed=()=>{setPreview(null);setError('');};
  return <details className="urgency-policy"><summary>Urgency policy · {current?`v${current.version} · ${current.mode}`:'by severity (default)'}</summary>
    <p>Decide urgency when an alert is admitted. A later low decision never silently lowers an open high-urgency alert. Paging and per-channel delivery are OFF.</p>
    {admin&&<Form busy={busy} label="Publish urgency policy" onSubmit={async()=>{try{const result=await run('/api/urgency/services/'+encodeURIComponent(service.id),{baseVersion:base,...draft()},'Urgency policy published');if(result){setBase(result.version);changed();}return false;}catch(e){setError((e as Error).message);return false;}}}>
      {base!==(current?.version??0)&&<p role="alert">Draft v{base} is stale; the current version is {current?.version??0}. Reload the service before publishing.</p>}
      <label className="field"><span id={uid+'mode'}>Urgency decision mode</span><select aria-labelledby={uid+'mode'} value={mode} onChange={e=>{setMode(e.target.value as UrgencyRule['mode']);changed();}}><option value="severity">By severity</option><option value="high">Constant high</option><option value="low">Constant low</option><option value="support-hours">By support hours</option></select></label>
      {mode==='support-hours'&&<>
        <label className="field">Support-hours IANA zone<input required value={zone} onChange={e=>{setZone(e.target.value);changed();}}/></label>
        <fieldset className="urgency-days"><legend>Weekly support days</legend>{days.map((day,i)=><label key={day}><input type="checkbox" checked={selectedDays.includes(i)} onChange={e=>{setDays(e.target.checked?[...selectedDays,i]:selectedDays.filter(d=>d!==i));setAdvanced('');changed();}}/>{day}</label>)}</fieldset>
        <div className="urgency-fields"><label className="field">Support starts (local)<input required type="time" value={start} onChange={e=>{setStart(e.target.value);setAdvanced('');changed();}}/></label><label className="field">Support ends (local)<input required value={end} pattern="([01][0-9]|2[0-3]):[0-5][0-9]|24:00" onChange={e=>{setEnd(e.target.value);setAdvanced('');changed();}}/><small>Use HH:mm; 24:00 is accepted for the end of a day.</small></label></div>
        <div className="urgency-fields"><label className="field"><span id={uid+'inside'}>Inside support hours</span><select aria-labelledby={uid+'inside'} value={inside} onChange={e=>{setInside(e.target.value as Urgency);changed();}}><option value="high">High</option><option value="low">Low</option></select></label><label className="field"><span id={uid+'outside'}>Outside support hours and holidays</span><select aria-labelledby={uid+'outside'} value={outside} onChange={e=>{setOutside(e.target.value as Urgency);changed();}}><option value="low">Low</option><option value="high">High</option></select></label></div>
        <label className="field">Local holiday dates (one per line)<textarea rows={3} placeholder="2026-12-25" value={holidays} onChange={e=>{setHolidays(e.target.value);changed();}}/><small>Only dates explicitly chosen here count as holidays.</small></label>
        <details><summary>Multiple daily windows</summary><label className="field">Advanced weekly windows JSON<textarea rows={6} value={advanced} onChange={e=>{setAdvanced(e.target.value);changed();}}/><small>Optional array of day (0 Sunday–6 Saturday), start and end. Same-day windows cannot overlap. Clear to use the weekly controls above.</small></label></details>
      </>}
      <label className="field">Urgency policy reason<textarea required maxLength={500} value={reason} onChange={e=>{setReason(e.target.value);changed();}}/></label>
    </Form>}
    {error&&<p role="alert">{error}</p>}
    <h4>Preview urgency without changes</h4><Form busy={busy} label="Preview urgency decision" onSubmit={async()=>{try{setPreview(null);setError('');const value=await request('/api/urgency/preview',{service:service.id,severity,at:new Date(at+'Z').toISOString(),...(admin?{rule:draft()}:{})});setPreview(value.decision);return false;}catch(e){setError((e as Error).message);return false;}}}>
      <div className="urgency-fields"><label className="field">Preview instant (UTC)<input required type="datetime-local" value={at} onChange={e=>{setAt(e.target.value);changed();}}/></label><label className="field"><span id={uid+'severity'}>Preview severity</span><select aria-labelledby={uid+'severity'} value={severity} onChange={e=>{setSeverity(e.target.value);changed();}}><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Info</option><option value="unknown">Unknown</option></select></label></div>
    </Form>
    {preview&&<div className="urgency-preview" role="status"><strong>{preview.urgency} urgency · rule v{preview.version}</strong><p>{preview.reason}</p><p>Evaluated {preview.evaluatedAt}. No records changed.</p></div>}
    <details><summary>Urgency policy history ({service.urgencyRules?.length??0})</summary>{service.urgencyRules?.slice().reverse().map(rule=><article key={rule.version}><strong>v{rule.version} · {rule.mode}</strong><p>{rule.reason}</p><p>{new Date(rule.at).toLocaleString()} · {state.members.find(m=>m.id===rule.by)?.name??rule.by}</p><pre tabIndex={0}>{JSON.stringify(rule,null,2)}</pre></article>)??<p>No published override; the severity default applies.</p>}</details>
    <p className="muted">Support-hours changes apply at admission. Automatic raising when support hours begin, per-channel notification rules and escalation remain unimplemented.</p>
  </details>;
}
