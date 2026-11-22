import type {Incident, Member, State} from '../family/response-operations/domain';
import {incidentAssignee, incidentUrgency} from '../family/response-operations/incident-controls';
import {memberName as timelineActor, timelineHeading} from '../incident/types';

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

export function incidentChangeSummary(incident: Incident, base: Incident | undefined, state: State) {
  if (!base) return undefined;
  const seen = new Set(base.timeline.map(entry => entry.id));
  const changes = incident.timeline.filter(entry => !seen.has(entry.id));
  const latest = changes.at(-1);
  // A source recovery can append a deadline cancellation in the same operation.
  const entry = latest?.kind === 'deadline-cancelled'
    ? changes.findLast(entry => entry.kind === 'source-recovery' && entry.at === latest.at) ?? latest
    : latest;
  if (!entry) return undefined;
  const actor = entry.metadata?.agent?.label ?? timelineActor(state, entry.actor);
  return `${timelineHeading(entry.kind)} · ${actor}${entry.kind === 'note' ? ` — ${entry.text}` : ''}`;
}

export function savedIncidentSummary(input: any, incident: Incident, members: Member[]) {
  if (input.type === 'assign-role' || input.type === 'reassign') {
    const role = input.type === 'reassign' ? 'assignee' : input.role;
    const saved = input.type === 'reassign' ? incidentAssignee(incident) : incident[role as 'commander' | 'scribe' | 'communications'];
    return summary([{label: 'Assigned responder', saved, edit: input.member, display: memberName(saved, members)}]);
  }
  if (input.type === 'set-priority') return summary([{label: 'Response priority', saved: incident.priority ?? null, edit: input.priority, display: incident.priority ?? 'Unset'}]);
  if (input.type === 'set-urgency') return summary([{label: 'Response urgency', saved: incidentUrgency(incident), edit: input.urgency}]);
  if (input.type === 'set-severity') return summary([{label: 'Response severity', saved: incident.severity, edit: input.severity}]);
  if (input.type === 'transition') return summary([
    {label: 'Status', saved: incident.state, edit: input.state},
    ...(input.state === 'recovered' && incident.sourceRecovery ? [{label: 'Source recovery', saved: 'Recorded', edit: null}] : []),
    ...(input.evidence ? [{label: 'Recovery evidence', saved: incident.recovery, edit: input.evidence, display: incident.recovery || 'None recorded'}] : []),
  ]);
  if (input.type === 'runbook') {
    const step = incident.runbook[input.index];
    return step ? summary([{label: step.text, saved: step.done, edit: input.done, display: step.done ? 'Completed' : 'Open'}]) : undefined;
  }
  return undefined;
}
