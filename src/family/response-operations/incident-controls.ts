import { fail, link, text, type Incident, type Member, type State } from './domain.ts';

export function incidentAssignee(i: Incident): string | null {
  return i.assignee === undefined ? i.commander : i.assignee;
}
export const incidentUrgency = (i: Incident) => i.urgency ?? (i.severity === 'critical' ? 'high' : 'low');
export const incidentUpdated = (i: Incident) => new Date(i.timeline.at(-1)?.at ?? i.createdAt).toISOString();

export function incidentControl(state: State, actor: Member, i: Incident, input: any, at: string): boolean {
  if (!['assign-role', 'reassign', 'set-priority', 'set-urgency', 'set-severity', 'bulk-acknowledge', 'bulk-resolve'].includes(input.type)) return false;
  let description: string;
  const reason = text(input.reason, 'Reason', 3000);
  if (input.type === 'assign-role' || input.type === 'reassign') {
    const role = input.type === 'reassign' ? 'assignee' : input.role;
    if (!['commander', 'scribe', 'communications', 'assignee'].includes(role)) fail('Unknown response role');
    const member = input.member === null ? null : state.members.find(m => m.id === input.member && m.active && m.role !== 'viewer');
    if (input.member !== null && !member) fail('Choose an active responder');
    const old = (i as any)[role] ?? (role === 'assignee' ? incidentAssignee(i) : null);
    (i as any)[role] = member?.id ?? null;
    description = `${role}: ${state.members.find(m => m.id === old)?.name ?? 'Unassigned'} → ${member?.name ?? 'Unassigned'}: ${reason}`;
  } else if (input.type === 'set-priority') {
    if (input.priority !== null && !['P1', 'P2', 'P3', 'P4', 'P5'].includes(input.priority)) fail('Invalid priority');
    description = `Priority: ${i.priority ?? 'unset'} → ${input.priority ?? 'unset'}: ${reason}`;
    i.priority = input.priority;
  } else if (input.type === 'set-urgency') {
    if (!['high', 'low'].includes(input.urgency)) fail('Invalid urgency');
    description = `Urgency: ${incidentUrgency(i)} → ${input.urgency}: ${reason}`;
    i.urgency = input.urgency;
  } else if (input.type === 'set-severity') {
    if (!['critical', 'warning', 'info'].includes(input.severity)) fail('Invalid severity');
    description = `Severity: ${i.severity} → ${input.severity}: ${reason}`;
    // A lower severity must not silently lower the independent urgency.
    i.urgency = incidentUrgency(i);
    i.severity = input.severity;
  } else if (input.type === 'bulk-acknowledge') {
    if (i.state !== 'declared') fail(`Cannot acknowledge an incident in ${i.state} state`, 409);
    i.state = 'acknowledged';
    i.assignee = actor.id;
    if (!i.commander) i.commander = actor.id;
    description = `declared → acknowledged: ${reason}`;
  } else {
    if (i.state === 'resolved') fail('Incident is already resolved', 409);
    const evidence = link(input.evidence);
    if (!evidence) fail('Recovery evidence URL is required');
    i.recovery = evidence;
    i.state = 'resolved';
    description = `Resolved with human recovery attestation ${evidence}: ${reason}`;
  }
  i.revision++;
  i.timeline.push({id: crypto.randomUUID(), at, actor: actor.id, kind: input.type, text: description,
    ...(input.operationId ? {operationId: text(input.operationId, 'Operation ID', 100)} : {})});
  return true;
}

export function validateIncidentControls(i: any, members: Member[]) {
  for (const key of ['assignee', 'scribe', 'communications']) {
    if (i[key] !== undefined && i[key] !== null && !members.some(m => m.id === i[key])) fail('Invalid incident response role reference');
  }
  if (i.urgency !== undefined && !['high', 'low'].includes(i.urgency)) fail('Invalid incident urgency');
  if (i.priority !== undefined && i.priority !== null && !['P1', 'P2', 'P3', 'P4', 'P5'].includes(i.priority)) fail('Invalid incident priority');
}
