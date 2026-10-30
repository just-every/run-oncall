import {incidentStateLabel, severityLabel, urgencyLabel} from '../reviews/display';
import {shortTime} from '../reviews/time';
import type {Incident, State} from '../family/response-operations/domain';
import {incidentAssignee, incidentUrgency} from '../family/response-operations/incident-controls';

// One quiet line under an incident's name. Defaults (high urgency, no assignee,
// no open follow-ups) stay hidden; what is set shows as the first item plus "+n".
export function IncidentMeta({incident: i, state}: {incident: Incident; state: State}) {
  const assignee = state.members.find(m => m.id === incidentAssignee(i))?.name;
  const open = i.actions.filter(a => !a.done).length;
  const extras = [
    assignee,
    incidentUrgency(i) !== 'high' ? urgencyLabel(incidentUrgency(i)) + ' urgency' : '',
    i.priority,
    open ? `${open} open follow-up${open === 1 ? '' : 's'}` : '',
  ].filter((value): value is string => !!value);
  return <p className="incident-meta">
    <span>{state.services.find(v => v.id === i.service)?.name}</span>
    <span className={`sev-${i.severity}`}>{severityLabel(i.severity)}</span>
    <span className={i.state === 'resolved' ? 'state-resolved' : undefined}>{incidentStateLabel(i.state)}</span>
    <time dateTime={i.createdAt}>{shortTime(i.createdAt)}</time>
    {extras.length > 0 && <span title={extras.join(' · ')}>{extras[0]}{extras.length > 1 && ` +${extras.length - 1}`}</span>}
  </p>;
}
