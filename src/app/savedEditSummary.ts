import type {Incident, Member} from '../family/response-operations/domain';
import {incidentAssignee, incidentUrgency} from '../family/response-operations/incident-controls';

type Difference = {label: string; saved: unknown; edit: unknown; display?: string};
const summary = (fields: Difference[]) => fields
  .filter(field => JSON.stringify(field.saved) !== JSON.stringify(field.edit))
  .map(field => `${field.label}: ${field.display ?? String(field.saved ?? 'None')}`)
  .join(' · ') || undefined;
const memberName = (id: unknown, members: Member[]) => !id ? 'Unassigned' : members.find(member => member.id === id)?.name ?? 'Unavailable responder';

/** Describe only the saved fields that differ from the retained form edit. */
export function savedRecordSummary(input: any, base: Record<string, unknown>, desiredValue: (key: string) => unknown, members: Member[]) {
  const labels: Record<string, string> = input.type === 'service'
    ? {name: 'Name', environment: 'Environment (immutable)', owner: 'Owner', runbook: 'Runbook steps (one per line)', pager: 'Existing pager URL'}
    : {role: 'Role', active: 'Access'};
  return summary(Object.entries(labels).filter(([key]) => key in base).map(([key, label]) => {
    const saved = base[key];
    const display = key === 'owner' ? memberName(saved, members)
      : key === 'active' ? saved ? 'Active' : 'Revoked'
      : key === 'runbook' && Array.isArray(saved) ? saved.join('; ') || 'No steps'
      : String(saved || 'None');
    return {label, saved, edit: desiredValue(key), display};
  }));
}

export function savedIncidentSummary(input: any, incident: Incident, members: Member[]) {
  if (input.type === 'note') {
    const saved = incident.timeline.filter(entry => entry.kind === 'note').at(-1)?.text;
    return saved === input.text.trim() ? undefined : saved ?? 'No timeline note.';
  }
  if (input.type === 'assign-role' || input.type === 'reassign') {
    const role = input.type === 'reassign' ? 'assignee' : input.role;
    const saved = input.type === 'reassign' ? incidentAssignee(incident) : incident[role as 'commander' | 'scribe' | 'communications'];
    return summary([{label: 'Assigned responder', saved, edit: input.member, display: memberName(saved, members)}]);
  }
  if (input.type === 'set-priority') return summary([{label: 'Response priority', saved: incident.priority ?? null, edit: input.priority, display: incident.priority ?? 'Unset'}]);
  if (input.type === 'set-urgency') return summary([{label: 'Response urgency', saved: incidentUrgency(incident), edit: input.urgency}]);
  if (input.type === 'set-severity') return summary([{label: 'Response severity', saved: incident.severity, edit: input.severity}]);
  if (input.type === 'transition') return summary([
    {label: 'Next state', saved: incident.state, edit: input.state},
    ...(input.evidence ? [{label: 'Recovery evidence URL (required for recovered)', saved: incident.recovery, edit: input.evidence}] : []),
  ]);
  if (input.type === 'runbook') {
    const step = incident.runbook[input.index];
    return step ? summary([{label: step.text, saved: step.done, edit: input.done, display: step.done ? 'Completed' : 'Open'}]) : undefined;
  }
  return undefined;
}
