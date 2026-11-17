import {fail, text, type Alert, type Member, type State} from '../family/response-operations/domain';

/** Human closure is distinct from a sender's recovery event. */
export function closeAlert(alert: Alert, actor: Member, at: string, reason = '') {
  if (alert.state === 'recovered' || alert.coordination?.state === 'closed') return;
  const coordination = alert.coordination ??= {state: 'open', assignee: alert.owner, snoozeDue: null, history: []};
  if (coordination.history.length >= 10000) fail('Alert history capacity reached', 429);
  coordination.state = 'closed'; coordination.snoozeDue = null;
  coordination.history.push({id: crypto.randomUUID(), operationId: crypto.randomUUID(), at, actor: actor.id, kind: 'bulk-resolve', text: `Closed by ${actor.name}${reason ? ': ' + text(reason, 'Resolution note', 3000) : ''}`});
  if (alert.obligation) Object.assign(alert.obligation, {state: 'stopped', outcome: 'stopped by human resolution', receipt: null});
  alert.revision = (alert.revision ?? 1) + 1;
}
export function alertCommand(state: State, actor: Member, input: any, at: string) {
  const alert = state.alerts.find(alert => alert.id === input.alert);
  if (!alert) fail('Unknown alert', 404);
  if ((alert.revision ?? 1) !== input.revision) fail('Alert changed. Reload before applying your edit.', 409);
  if (input.type === 'close-alert') closeAlert(alert, actor, at);
  else {
    if (alert.state !== 'active' || alert.coordination?.state === 'closed') fail('This alert is closed', 409);
    if (alert.owner === actor.id) return alert;
    alert.owner = actor.id;
    if (alert.service === null && alert.obligation) alert.obligation.target = {kind: 'user', id: actor.id};
    if (alert.coordination) alert.coordination.assignee = actor.id;
    state.audit.push({id: crypto.randomUUID(), at, actor: actor.id, kind: 'take-alert', text: `Took alert ${alert.id}`});
    alert.revision = (alert.revision ?? 1) + 1;
  }
  return alert;
}
