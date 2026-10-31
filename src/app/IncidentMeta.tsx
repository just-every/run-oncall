import {incidentStateLabel, severityLabel, urgencyLabel} from '../reviews/display';
import {shortTime} from '../reviews/time';
import type {Incident, State} from '../family/response-operations/domain';
import {incidentAssignee, incidentUrgency} from '../family/response-operations/incident-controls';
import type {TriageStatus} from '../family/response-operations/triage';

// Keep low urgency visible alongside status; compact the optional response details.
export function IncidentMeta({incident: i, state, triageStatus}: {incident: Incident; state: State; triageStatus?: TriageStatus}) {
  const assignee = state.members.find(m => m.id === incidentAssignee(i))?.name;
  const open = i.actions.filter(a => !a.done).length;
  const extras = [
    assignee,
    i.priority,
    open ? `${open} open follow-up${open === 1 ? '' : 's'}` : '',
  ].filter((value): value is string => !!value);
  return <p className="incident-meta">
    <span>{state.services.find(v => v.id === i.service)?.name}</span>
    <span className={`sev-${i.severity}`}>{severityLabel(i.severity)}</span>
    <span className={i.state === 'resolved' ? 'state-resolved' : undefined}>{triageStatus === 'snoozed' ? 'Snoozed' : triageStatus === 'triggered' ? 'Triggered' : incidentStateLabel(i.state)}</span>
    {incidentUrgency(i) !== 'high' && <span>{urgencyLabel(incidentUrgency(i))} urgency</span>}
    <time dateTime={i.createdAt}>{shortTime(i.createdAt)}</time>
    {extras.length > 0 && <span title={extras.join(' · ')}>{extras[0]}{extras.length > 1 && ` +${extras.length - 1}`}</span>}
  </p>;
}
