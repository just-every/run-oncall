import { memo, useCallback, useRef, useState, type RefObject } from 'react';
import {request} from '../useWorkspace';
import {useAutosave,autosaveRequest} from '../app/autosave/useAutosave';
import {SavedState,SaveFeedback} from '../app/autosave/SavedState';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {urgencyLabel} from '../reviews/display';
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
  return <p className="urgency-support-start" role="note">Support-start raises are not automatic. Raise urgency here{when?<> when support opens at <time dateTime={new Date(next!).toISOString()}>{when}</time></>: ' when support begins'}.</p>;
}

const UrgencySelect=memo(function UrgencySelect({value,onChoose,selectRef}:{value:'high'|'low';onChoose:(value:'high'|'low')=>void;selectRef:RefObject<HTMLSelectElement|null>}) {
  return <select ref={selectRef} aria-label="Urgency" value={value} onChange={event=>onChoose(event.currentTarget.value as 'high'|'low')}><option value="high">High</option><option value="low">Low</option></select>;
});

export function AlertUrgency({alert,state,canEdit,busy,run,onSaved,storageKey}:{alert:Alert;state:State;canEdit:boolean;busy:boolean;run:IntakeRun;onSaved?:(alert:Alert)=>void;storageKey?:string}) {
  const [lowering,setLowering]=useState(false), [latest,setLatest]=useState(alert);
  const current=(latest.urgencyRevision??0)>(alert.urgencyRevision??0)?latest:alert;
  const snapshot=(value:Alert)=>({values:{urgency:{value:value.urgency??'high',reason:''}},revision:value.urgencyRevision??0});
  const save=useAutosave({storageKey,equal:(a,b)=>(a as {value?:string}|null)?.value===(b as {value?:string}|null)?.value,snapshot:snapshot(current),read:async()=>{const value:State=await request('/api/state');return snapshot(value.alerts.find(a=>a.id===alert.id)!);},write:async change=>{
    const value:Alert=await autosaveRequest('/api/urgency/alerts/'+encodeURIComponent(alert.id),{revision:change.revision,urgency:change.to.value,reason:change.to.reason});
    setLatest(value);onSaved?.(value);return snapshot(value);
  }});
  const selectedValue=save.values.urgency?.value??current.urgency??'high';
  const selectRef=useRef<HTMLSelectElement>(null);
  const finishSave=async()=>{if(!await save.flush())return false;setLowering(false);selectRef.current?.focus({preventScroll:true});return true;};
  const choose=useRef<(value:'high'|'low')=>void>(()=>{});
  choose.current=value=>{
    if(value==='low'&&(current.urgency==='high'||selectedValue==='high'&&save.states.urgency?.status==='pending'))setLowering(true);
    else {setLowering(false);save.change('urgency',{value,reason:''},'choice');}
  };
  const onChoose=useCallback((value:'high'|'low')=>choose.current(value),[]);
  const rule=state.services.find(s=>s.id===alert.service)?.urgencyRules?.at(-1);
  const raise=current.state==='active'&&current.urgency==='low'&&rule?.mode==='support-hours'&&rule.inside==='high'&&rule.outside==='low';
  return <div className="alert-urgency">
    <label className="field"><span>Urgency <SavedState state={save.states.urgency}/></span>{canEdit&&alert.state==='active'?<UrgencySelect selectRef={selectRef} value={lowering?'low':selectedValue} onChoose={onChoose}/>:<span>{current.urgency ? urgencyLabel(current.urgency) : 'Unknown'}</span>}</label>
    <SaveFeedback format={value=>(value as {value?:string})?.value ? urgencyLabel((value as {value:string}).value) : 'Unknown'} state={save.states.urgency} retry={async()=>{await save.retry('urgency');return finishSave();}} useMine={async()=>{await save.useMine('urgency');return finishSave();}}/>
    {lowering&&<fieldset disabled={busy||save.states.urgency?.status==='pending'}><InlineConfirm action="Lower urgency" reasonRequired busy={busy||save.states.urgency?.status==='pending'} onConfirm={reason=>{save.change('urgency',{value:'low',reason:reason??''},'choice');return finishSave();}} onCancel={()=>{setLowering(false);save.change('urgency',{value:current.urgency??'high',reason:''},'choice');selectRef.current?.focus({preventScroll:true});}}>Lower this alert’s urgency? The reason is recorded with your name.</InlineConfirm></fieldset>}
    {raise&&<SupportStart rule={rule}/>}
    <details><summary>History</summary>{current.urgencyHistory?.map(entry=><article key={entry.id}><p><strong>{entry.from ? urgencyLabel(entry.from) : 'New'} → {urgencyLabel(entry.to)}</strong> · {shortTime(entry.at)}</p>{entry.reason&&<p>{entry.reason}</p>}<span>{state.members.find(m=>m.id===entry.by)?.name??'Admission rule'} · {entry.ruleVersion===null?(state.members.some(m=>m.id===entry.by)?'Human decision':'Admission decision'):entry.ruleVersion === 0 ? 'Service default' : 'Policy version '+entry.ruleVersion}</span></article>)??<p>No retained urgency history.</p>}</details>
  </div>;
}
