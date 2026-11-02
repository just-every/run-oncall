import {severityLabel, urgencyLabel} from '../reviews/display';
import {useId, useState} from 'react';
import type {Incident, Member} from '../family/response-operations/domain';
import {InlineConfirm} from './autosave/InlineConfirm';
import {SavedState, SaveFeedback} from './autosave/SavedState';
import {savedResponseValue, useIncidentValues} from '../incident/useIncidentValues';

export function IncidentResponseControls({incident, members, canEdit, refresh = async () => {}}: {incident: Incident; members: Member[]; busy: boolean; canEdit: boolean; mutate: (data: any) => Promise<any>; refresh?: () => Promise<void>}) {
  const id = useId();
  const fields = ['scribe', 'communications', 'priority', 'urgency', 'severity'];
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});
  const save = useIncidentValues({incident, refresh}, fields, (field, reason) => {
    setReasonInputs(previous => previous[field] === reason ? {...previous, [field]: ''} : previous);
  });
  const [lowering, setLowering] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const eligible = members.filter(member => member.active && !member.machine && ['admin', 'responder'].includes(member.role));
  const options: Record<string, {value: string; label: string}[]> = {
    scribe: [{value: '', label: 'Unassigned'}, ...eligible.map(member => ({value: member.id, label: member.name}))],
    communications: [{value: '', label: 'Unassigned'}, ...eligible.map(member => ({value: member.id, label: member.name}))],
    priority: [{value: '', label: 'Unset'}, ...['P1', 'P2', 'P3', 'P4', 'P5'].map(value => ({value, label: value}))],
    urgency: [{value: 'high', label: 'High'}, {value: 'low', label: 'Low'}],
    severity: ['critical', 'warning', 'info'].map(value => ({value, label: severityLabel(value)})),
  };
  const labels: Record<string, string> = {scribe: 'Scribe', communications: 'Communications', priority: 'Priority', urgency: 'Urgency', severity: 'Severity'};
  return <section className="incident-response-fields" aria-label="People and priority">{fields.map(field => <div key={field}>
    <label className="field" htmlFor={id + field}><span>{labels[field]} <SavedState state={answers[field] ? undefined : save.states[field]} /></span></label>
    <select id={id + field} aria-label={labels[field]} disabled={!canEdit} value={field === 'urgency' && lowering ? 'low' : save.values[field]} onChange={event => {
      const value = event.target.value;
      if (field === 'urgency' && lowering && value === 'high') {setLowering(false);return;}
      if (value === save.values[field]) {setAnswers({...answers, [field]: 'Nothing to change'});return;}
      setAnswers({...answers, [field]: ''});
      if (field === 'urgency' && value === 'low' && save.values[field] === 'high') {setLowering(true);return;}
      save.change(field, value, 'choice');
    }}>
      {options[field].map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {canEdit && !(field === 'urgency' && lowering) && <label className="field incident-optional-reason"><span>Reason for {labels[field].toLowerCase()} (optional)</span><input aria-label={`Reason for ${labels[field].toLowerCase()} (optional)`} value={reasonInputs[field] ?? save.reasonValues[field] ?? ''} onChange={event => {const value=event.target.value;save.reasons.current[field] = value;setReasonInputs(previous => ({...previous, [field]: value}));}} /></label>}
    {field === 'urgency' && lowering && <InlineConfirm action="Lower urgency" keep="Keep high urgency" reasonRequired onConfirm={reason => {setReasonInputs(previous => ({...previous, urgency: ''}));save.change('urgency', 'low', 'choice', reason ?? '');setLowering(false);}} onCancel={() => setLowering(false)}>Lower this incident to low urgency?</InlineConfirm>}
    <SaveFeedback state={save.states[field]} retry={() => save.retry(field)} useMine={() => save.useMine(field)} format={value => ['scribe', 'communications'].includes(field) ? members.find(member => member.id === savedResponseValue(value))?.name ?? 'Unassigned' : field === 'severity' ? severityLabel(String(savedResponseValue(value))) : field === 'urgency' ? urgencyLabel(String(savedResponseValue(value))) : String(savedResponseValue(value) || 'Unset')} />
    {answers[field] && <p role="status">{answers[field]}</p>}
  </div>)}</section>;
}
