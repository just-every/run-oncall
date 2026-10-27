import {useRef} from 'react';
import {request} from '../useWorkspace';
import type {Incident, State} from '../family/response-operations/domain';
import {autosaveRequest, useAutosave} from '../app/autosave/useAutosave';
import {incidentAssignee, incidentUrgency} from '../family/response-operations/incident-controls';
import {refreshAfterWrite} from './refreshAfterWrite';
import type {IncidentProps} from './types';

export function responseValue(incident: Incident, field: string) {
  if (field === 'assignee') return incidentAssignee(incident) ?? '';
  if (field === 'urgency') return incidentUrgency(incident);
  return (incident as any)[field] ?? '';
}
export function responseCommand(field: string, value: string, reason?: string) {
  const command = ['commander', 'scribe', 'communications'].includes(field)
    ? {type: 'assign-role', role: field, member: value || null}
    : field === 'assignee' ? {type: 'reassign', member: value || null}
    : {type: 'set-' + field, [field]: value || null};
  return {...command, ...(reason ? {reason} : {})};
}
export const savedResponseValue = (value: unknown) => value && typeof value === 'object' && 'value' in value ? (value as {value: string}).value : value;

type Choice = {value: string; reason: string; draftReason?: string};
export function useIncidentValues(props: Pick<IncidentProps, 'incident' | 'refresh'>, fields: string[], onSaved?: (field: string, reason: string | undefined) => void) {
  const {incident} = props;
  const reasons = useRef<Record<string, string>>({});
  const snapshot = (record: Incident) => ({revision: record.revision, values: Object.fromEntries(fields.map(field => [field, {value: responseValue(record, field), reason: ''}])) as Record<string, Choice>});
  const read = async () => {
    const state: State = await request('/api/state');
    const record = state.incidents.find(item => item.id === incident.id);
    if (!record) throw Error('This incident is no longer available.');
    return snapshot(record);
  };
  const save = useAutosave({storageKey: 'incident:' + incident.id + ':response:' + fields.join(','), snapshot: snapshot(incident), read, write: async change => {
    const draftReason = change.to.draftReason;
    const result = await autosaveRequest('/api/command', {...responseCommand(change.field, change.to.value, change.to.reason), incident: incident.id, revision: change.revision});
    const answer = result.changed === false ? await read() : snapshot(result);
    // Consume this change's reason only after acceptance. A later draft and a
    // refused change keep their own reason.
    if (reasons.current[change.field] === draftReason) delete reasons.current[change.field];
    onSaved?.(change.field, draftReason);
    // The field is already durable. A later workspace read failure must not
    // turn that accepted write into another response command.
    await refreshAfterWrite(props.refresh).catch(() => {});
    return {...answer, changed: result.changed !== false};
  }});
  return {...save, reasons,
    values: Object.fromEntries(fields.map(field => [field, save.values[field].value])),
    reasonValues: Object.fromEntries(fields.map(field => [field, save.values[field].reason])),
    change: (field: string, value: string, kind: 'choice' | 'text' = 'choice', reason = reasons.current[field] ?? '') => save.change(field, {value, reason, draftReason: reasons.current[field]}, kind),
  };
}
