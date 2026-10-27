import {useRef} from 'react';
import {request} from '../useWorkspace';
import type {Incident, State} from '../family/response-operations/domain';
import {autosaveRequest, useAutosave} from '../app/autosave/useAutosave';
import {incidentAssignee, incidentUrgency} from '../family/response-operations/incident-controls';
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
export function useIncidentValues(props: Pick<IncidentProps, 'incident' | 'refresh'>, fields: string[]) {
  const {incident} = props;
  const reasons = useRef<Record<string, string>>({});
  const snapshot = (record: Incident) => ({revision: record.revision, values: Object.fromEntries(fields.map(field => [field, responseValue(record, field)]))});
  const read = async () => {
    const state: State = await request('/api/state');
    const record = state.incidents.find(item => item.id === incident.id);
    if (!record) throw Error('This incident is no longer available.');
    return snapshot(record);
  };
  const save = useAutosave({snapshot: snapshot(incident), read, write: async change => {
    const result = await autosaveRequest('/api/command', {...responseCommand(change.field, change.to, reasons.current[change.field]), incident: incident.id, revision: change.revision});
    const answer = result.changed === false ? await read() : snapshot(result);
    // The field is already durable. A later workspace read failure must not
    // turn that accepted write into another response command.
    await props.refresh().catch(() => {});
    return answer;
  }});
  return {...save, reasons};
}
