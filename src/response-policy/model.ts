import { recordAlertObligation } from '../alert-obligation.ts';
import { enqueueEvents } from '../automation/model.ts';
import { authority, fail, type Alert, type Entry, type Event, type Incident, type Member, type State } from '../family/response-operations/domain.ts';
import { decideResponse, historicalResponsePolicy, publishedResponsePolicy, responseFields, responsePolicyAuditText, validateResponsePolicy } from './rules.ts';
import { latestRecovery, receiptForEvent, responseReceipt } from './receipts.ts';
import type { ResponsePolicy } from './types.ts';

export { decideResponse, publishedResponsePolicy, responsePolicyAuditText } from './rules.ts';
export const cancellationText = 'No attempt handed to a provider; nothing to cancel';
export const sourceRecoveryText = 'All alerts recovered — awaiting resolution. Source recovery stopped the alert obligations; the incident still requires human recovery evidence and a summary. Reminder recorded; no timer until OC-027.';

export function publishResponsePolicy(state: State, actor: Member, serviceId: string, input: unknown, at: string): ResponsePolicy {
  authority(state, actor, true);
  if (actor.machine) fail('Response policy publication requires an administrator session', 403);
  const v = responseFields(input, ['baseVersion', 'defaultMode', 'recoveredNotice', 'rules', 'reason']);
  const service = state.services.find(s => s.id === serviceId);
  if (!service) fail('Unknown service', 404);
  const previous = publishedResponsePolicy(service);
  if (v.baseVersion !== (previous?.version ?? 0)) fail('Response policy changed; reload before publishing', 409);
  if ((service.responsePolicies?.length ?? 0) >= 100) fail('Service response policy history capacity reached', 429);
  const {baseVersion, ...draft} = v;
  const policy = validateResponsePolicy({...draft, version: (previous?.version ?? 0) + 1, by: actor.id, at});
  if (policy.rules.some(r => r.policy !== '*' && !state.policies.some(p => p.id === r.policy && p.service === service.id))) fail('Response rule must reference an orchestration policy on this service');
  (service.responsePolicies ??= []).push(policy);
  state.audit.push({id: crypto.randomUUID(), at, actor: actor.id, kind: 'response-policy', text: responsePolicyAuditText(service, policy)});
  return policy;
}

/** Reproduce final first-admission urgency, including email and incomplete-custody overrides. */
export function responseAdmissionUrgency(state: State, alert: Alert, first: Event): 'high' | 'low' {
  let urgency = first.urgency?.urgency ?? (first.severity === 'critical' ? 'high' : 'low');
  for (const entry of alert.urgencyHistory ?? []) {
    if (entry.id === `urgency:${first.id}` || entry.id === `email:${first.eventId}` ||
      entry.id.startsWith('incomplete:') && state.intakeReceipts?.some(r => r.id === entry.id.slice(11) && r.event === first.id)) urgency = entry.to;
  }
  return urgency;
}

export const automaticDeclarationText = (event: Event, policyVersion: number, rule: string | null) =>
  `Automatically declared from alert: ${event.title}. Response policy ${policyVersion}; rule ${rule ?? 'default'}. No human acknowledgment has been recorded.`;

/** Called once admission has its final urgency and its durable receipt. No paging or timer is executed here. */
export function finishResponseAdmission(state: State, alert: Alert, event: Event | null, receiptId: string, automatic = true) {
  recordAlertObligation(alert);
  const obligation = alert.obligation!;
  if (!obligation.policy) {
    const first = state.events.find(e => e.id === alert.events[0]);
    const policy = first && alert.state !== 'recovered' ? historicalResponsePolicy(state, alert.service, first.acceptedAt) : undefined;
    obligation.policy = decideResponse(policy, first ? responseAdmissionUrgency(state, alert, first) : 'high', first?.severity ?? 'critical', first?.decision.policy ?? null);
  }
  if (!event) return;
  if (alert.state === 'recovered') {
    const recovered = state.events.find(e => alert.events.includes(e.id) && e.intent === 'recover');
    if (recovered && !obligation.stoppedAt) {
      const receipt = event.id === recovered.id ? receiptId : receiptForEvent(state, recovered);
      const reference = responseReceipt(state, receipt);
      if (!reference || reference.alert.id !== alert.id || reference.event.id !== recovered.id) fail('Missing source recovery receipt');
      Object.assign(obligation, {state: 'stopped', outcome: 'stopped by source recovery', stoppedAt: recovered.acceptedAt,
        receipt, cancellation: cancellationText, recoveryNotice: {
          state: obligation.policy.recoveredNotice === 'silent' ? 'silent' : 'recorded',
          automatic: false, label: 'no sender until OC-026', mode: obligation.policy.recoveredNotice, recipients: [],
        }});
    }
    for (const incident of state.incidents.filter(i => i.alerts.includes(alert.id))) refreshIncidentRecovery(state, incident, event.acceptedAt, obligation.receipt ?? undefined);
    return;
  }
  if (!automatic || event.intent !== 'trigger' || alert.suppressed || obligation.policy.mode !== 'incident' ||
    state.incidents.some(i => i.alerts.includes(alert.id))) return;
  const service = state.services.find(s => s.id === alert.service);
  const policy = service?.responsePolicies?.find(p => p.version === obligation.policy!.version);
  if (!service || !policy) fail('Missing automatic declaration policy');
  const author = state.members.find(m => m.id === policy.by);
  if (!author) fail('Missing response policy author');
  const entry: Entry = {id: crypto.randomUUID(), at: event.acceptedAt, actor: `source:${event.source}`, kind: 'declared',
    text: automaticDeclarationText(event, policy.version, obligation.policy.rule), lifecycle: {from: null, to: 'declared'},
    metadata: {event: event.id, policyVersion: policy.version, rule: obligation.policy.rule}};
  const incident: Incident = {id: crypto.randomUUID(), title: event.title, service: service.id, severity: event.severity,
    state: 'declared', commander: null, revision: 1, createdAt: event.acceptedAt, alerts: [alert.id], timeline: [entry],
    runbook: service.runbook.map(text => ({text, done: false})), actions: [], recovery: '', review: '', urgency: alert.urgency ?? 'high',
    automaticDeclaration: {alert: alert.id, event: event.id, receipt: receiptId, policyVersion: policy.version, rule: obligation.policy.rule, by: policy.by}};
  state.incidents.unshift(incident);
  enqueueEvents(state, incident, {type: 'declare'}, author);
}

export function refreshIncidentRecovery(state: State, incident: Incident, at: string, receiptId?: string, actor?: Member | string) {
  const linked = state.alerts.filter(a => incident.alerts.includes(a.id));
  if (!linked.length || linked.length !== incident.alerts.length || linked.some(a => a.state !== 'recovered')) return;
  if (incident.sourceRecovery) {
    const reminder = incident.sourceRecovery.reminder, next = incident.state === 'resolved' ? 'completed' : 'recorded';
    if (reminder.commander !== incident.commander || reminder.state !== next) {
      reminder.commander = incident.commander; reminder.state = next; incident.revision++;
    }
    return;
  }
  if (incident.state === 'resolved') return;
  const recovered = latestRecovery(state, linked);
  if (!recovered) return;
  const receipt = receiptId ?? receiptForEvent(state, recovered), reference = responseReceipt(state, receipt);
  if (!reference || reference.event.intent !== 'recover' || !incident.alerts.includes(reference.alert.id)) fail('Invalid incident source recovery receipt');
  const id = crypto.randomUUID();
  incident.sourceRecovery = {at, receipt, reminder: {id, commander: incident.commander, automatic: false,
    label: 'no timer until OC-027', state: 'recorded'}};
  incident.timeline.push({id, at, actor: typeof actor === 'string' ? actor : actor?.id ?? `source:${reference.event.source}`,
    kind: 'source-recovery', text: sourceRecoveryText, metadata: {receipt}});
  incident.revision++;
}
