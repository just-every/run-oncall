import type {Alert, State} from '../family/response-operations/domain';
export function alertDisplay(alert: Alert, state: State) {
  const events = alert.events.map(id => state.events.find(event => event.id === id)).filter(event => event !== undefined);
  const triggers = events.filter(event => event.intent === 'trigger');
  const admission = triggers[0]?.decision;
  const unmatchedReason = alert.service !== null && admission?.action === 'unmatched' ? admission.reason : null;
  const inUnmatchedQueue = unmatchedReason !== null && alert.state === 'active' && alert.owner === null && !alert.suppressed;
  const severity = alert.service === null ? 'critical' : (['critical', 'warning', 'info'] as const).find(level => (triggers.length ? triggers : events).some(event => (event.decision.transformation?.severity ?? event.severity) === level));
  return {events, triggers, severity, unmatchedReason, inUnmatchedQueue, title: events[0]?.title ?? state.intakeReceipts?.find(r => r.alert === alert.id)?.title ?? 'Retained alert', service: state.services.find(service => service.id === alert.service), incidents: state.incidents.filter(incident => incident.alerts.includes(alert.id))};
}
