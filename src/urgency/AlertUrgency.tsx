import { useState } from 'react';
import {request} from '../useWorkspace';
import {useAutosave,autosaveRequest} from '../app/autosave/useAutosave';
import {SavedState,SaveFeedback} from '../app/autosave/SavedState';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {shortTime} from '../reviews/time';
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

export function AlertUrgency({alert,state,canEdit,busy,run,onSaved,storageKey}:{alert:Alert;state:State;canEdit:boolean;busy:boolean;run:IntakeRun;onSaved?:(alert:Alert)=>void;storageKey?:string}) {
  const [lowering,setLowering]=useState(false), [latest,setLatest]=useState(alert);
  const current=(latest.urgencyRevision??0)>(alert.urgencyRevision??0)?latest:alert;
  const snapshot=(value:Alert)=>({values:{urgency:{value:value.urgency??'high',reason:''}},revision:value.urgencyRevision??0});
  const save=useAutosave({storageKey,equal:(a,b)=>(a as {value?:string}|null)?.value===(b as {value?:string}|null)?.value,snapshot:snapshot(current),read:async()=>{const value:State=await request('/api/state');return snapshot(value.alerts.find(a=>a.id===alert.id)!);},write:async change=>{
    const value:Alert=await autosaveRequest('/api/urgency/alerts/'+encodeURIComponent(alert.id),{revision:change.revision,urgency:change.to.value,reason:change.to.reason});
    setLatest(value);onSaved?.(value);return snapshot(value);
  }});
  const selectedValue=save.values.urgency?.value??current.urgency??'high';
  const rule=state.services.find(s=>s.id===alert.service)?.urgencyRules?.at(-1);
  const raise=current.state==='active'&&current.urgency==='low'&&rule?.mode==='support-hours'&&rule.inside==='high'&&rule.outside==='low';
  return <div className="alert-urgency">
    <label className="field"><span>Urgency <SavedState state={save.states.urgency}/></span>{canEdit&&alert.state==='active'?<select aria-label="Urgency" value={lowering?'low':selectedValue} onChange={event=>{
      if(event.target.value==='low'&&(current.urgency==='high'||selectedValue==='high'&&save.states.urgency?.status==='pending'))setLowering(true);
      else {setLowering(false);save.change('urgency',{value:event.target.value as 'high'|'low',reason:''},'choice');}
    }}><option value="high">High</option><option value="low">Low</option></select>:<span>{current.urgency??'Unknown'}</span>}</label>
    <SaveFeedback format={value=>(value as {value?:string})?.value??'Unknown'} state={save.states.urgency} retry={()=>save.retry('urgency')} useMine={()=>save.useMine('urgency')}/>
    {lowering&&<InlineConfirm action="Lower urgency" reasonRequired busy={busy||save.states.urgency?.status==='pending'} onConfirm={reason=>{setLowering(false);save.change('urgency',{value:'low',reason:reason??''},'choice');}} onCancel={()=>setLowering(false)}>Lower this alert’s urgency? The reason is recorded with your name.</InlineConfirm>}
    {raise&&<SupportStart rule={rule}/>}
    <details><summary>History</summary>{current.urgencyHistory?.map(entry=><article key={entry.id}><p><strong>{entry.from??'New'} → {entry.to}</strong> · {shortTime(entry.at)}</p>{entry.reason&&<p>{entry.reason}</p>}<span>{state.members.find(m=>m.id===entry.by)?.name??'Admission rule'} · {entry.ruleVersion===null?'Human decision':'Rule version '+entry.ruleVersion}</span></article>)??<p>No retained urgency history.</p>}</details>
  </div>;
}
