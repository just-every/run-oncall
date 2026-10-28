import {autosaveRequest, useAutosave} from '../app/autosave/useAutosave';
import {SavedState, SaveFeedback} from '../app/autosave/SavedState';
import {request} from '../useWorkspace';
import type {Incident} from '../family/response-operations/domain';
import {refreshAfterWrite} from './refreshAfterWrite';
import type {IncidentProps} from './types';

export function Runbook(props: IncidentProps) {
  const {incident} = props;
  const snapshot = (record: Incident) => ({revision: record.revision, values: Object.fromEntries([
    ...record.runbook.map((step, index) => ['runbook:' + index, step.done]),
    ...(record.template?.checklist ?? []).map(step => ['template:' + step.id, step.done]),
  ]) as Record<string, boolean>});
  const read = async () => {
    const state = await request('/api/state');
    const record = state.incidents.find((item: Incident) => item.id === incident.id);
    if (!record) throw Error('This incident is no longer available.');
    return snapshot(record);
  };
  const save = useAutosave({storageKey: 'incident:' + incident.id + ':runbook', snapshot: snapshot(incident), read, write: async change => {
    const [kind, id] = change.field.split(':');
    const result = await autosaveRequest('/api/command', {type: kind === 'runbook' ? 'runbook' : 'template-check', ...(kind === 'runbook' ? {index: Number(id)} : {item: id}), done: change.to, incident: incident.id, revision: change.revision});
    await refreshAfterWrite(props.refresh).catch(() => {});
    return snapshot(result);
  }});
  const steps = [...incident.runbook.map((step, index) => ({...step, key: 'runbook:' + index, editable: props.canEdit, history: [] as {by: string; at: string}[]})), ...(incident.template?.checklist ?? []).map(step => ({...step, key: 'template:' + step.id, editable: props.canEdit && incident.commander === props.actor.id && incident.state !== 'resolved'}))];
  return <section className="incident-runbook" aria-label="Runbook">
    <div className="right-title"><h3>Runbook</h3><span>{steps.filter(step => save.values[step.key]).length}/{steps.length}</span></div>
    {steps.length ? <ul>{steps.map(step => <li key={step.key}>
      <label><input type="checkbox" aria-label={step.text} checked={save.values[step.key]} disabled={!step.editable} onChange={event => save.change(step.key, event.target.checked, 'choice')} /><span>{step.text}{step.history.length > 0 && <small>Last changed by {props.state.members.find(member => member.id === step.history.at(-1)!.by)?.name ?? 'Erased member'}</small>}</span><SavedState state={save.states[step.key]} /></label>
      <SaveFeedback state={save.states[step.key]} retry={() => save.retry(step.key)} useMine={() => save.useMine(step.key)} />
    </li>)}</ul> : <p>No runbook was configured at declaration.</p>}
  </section>;
}
