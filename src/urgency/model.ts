import { recordAlertObligation } from '../alert-obligation';
import { authority, fail, type Alert, type Event, type Member, type Service, type State } from '../family/response-operations/domain.ts';
import { evaluateUrgency, validateUrgencyRule } from './rules.ts';
import type { AlertUrgencyEntry, Urgency, UrgencyDecision, UrgencyRule } from './types.ts';

export function exact(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || required.some(k => !Object.hasOwn(value, k)) ||
    Object.keys(value).some(k => !required.includes(k) && !optional.includes(k))) fail('Missing or unknown urgency fields');
  return value as Record<string, unknown>;
}
export const draftFields = ['mode', 'timezone', 'weekly', 'holidays', 'inside', 'outside', 'reason'];
export const publishedUrgency = (service: Service) => service.urgencyRules?.at(-1);
export function serviceUrgency(state: State, serviceId: string, severity: unknown, at: string): UrgencyDecision {
  const service = state.services.find(s => s.id === serviceId);
  if (!service) fail('Unknown service', 404);
  return evaluateUrgency(publishedUrgency(service), severity, at);
}
export function alertUrgency(state: State, alert: Alert): Urgency {
  if (alert.urgency !== undefined) return alert.urgency;
  return alert.events.some(id => {
    const event = state.events.find(e => e.id === id);
    return event && (event.urgency?.urgency ?? (event.severity === 'warning' || event.severity === 'info' ? 'low' : 'high')) === 'high';
  }) ? 'high' : 'low';
}
export const urgencyEntryText = (alert: Alert, entry: AlertUrgencyEntry) =>
  `Alert ${alert.id}: ${entry.from ?? 'unset'} → ${entry.to}; rule ${entry.ruleVersion ?? 'human'}: ${entry.reason}`;
function append(state: State, alert: Alert, entry: AlertUrgencyEntry) {
  if ((alert.urgencyHistory?.length ?? 0) >= 10000) fail('Alert urgency history capacity reached', 429);
  alert.urgency = entry.to;
  (alert.urgencyHistory ??= []).push(entry);
  alert.urgencyRevision = alert.urgencyHistory.length;
  state.audit.push({id: entry.id, at: entry.at, actor: entry.by, kind: 'alert-urgency', text: urgencyEntryText(alert, entry)});
}
export function admitAlertUrgency(state: State, alert: Alert, event: Event, created: boolean) {
  const decision = event.urgency!;
  if (!created && (event.intent !== 'trigger' || alert.state !== 'active' || decision.urgency !== 'high' || alertUrgency(state, alert) === 'high')) return;
  append(state, alert, {id: `urgency:${event.id}`, at: event.acceptedAt, by: `source:${event?.source??alert.source}`,
    from: alert.urgency ?? null, to: decision.urgency, reason: decision.reason, ruleVersion: decision.version});
}
export const incompleteUrgencyReason = 'Incomplete intake is always high urgency, whatever the service rule decided';
/** An incomplete-intake alert is high urgency under every service rule (OC-059), raised in its admission commit. */
export function raiseIncompleteUrgency(state: State, alert: Alert, receipt: {id: string; event: string | null; acceptedAt: string}) {
  const event = state.events.find(e => e.id === receipt.event);
  if (alert.urgency === 'high') return;
  if (!event && alert.service!==null) return;
  append(state, alert, {id: `incomplete:${receipt.id}`, at: receipt.acceptedAt, by: `source:${event?.source??alert.source}`,
    from: alert.urgency ?? null, to: 'high', reason: incompleteUrgencyReason, ruleVersion: null});
  recordAlertObligation(alert);
}
export function changeAlertUrgency(state: State, actor: Member, alertId: string, input: unknown, at: string): {alert: Alert; changed: boolean} {
  authority(state, actor);
  const v = exact(input, ['revision', 'urgency', 'reason']), alert = state.alerts.find(a => a.id === alertId);
  if (!alert) fail('Unknown alert', 404);
  if(alert.service===null)fail('Incomplete unrouted alerts remain high urgency until assigned to a service',409);
  if (v.revision !== (alert.urgencyRevision ?? 0)) fail('Alert urgency changed; reload before saving', 409);
  if (v.urgency !== 'high' && v.urgency !== 'low') fail('Choose high or low urgency');
  if (typeof v.reason !== 'string' || !v.reason.trim() || v.reason.length > 500) fail('An urgency reason of at most 500 characters is required');
  const changed = alert.urgency === undefined || alert.urgency !== v.urgency;
  if (changed) append(state, alert, {id: crypto.randomUUID(), at, by: actor.id, from: alert.urgency ?? null,
    to: v.urgency, reason: v.reason, ruleVersion: null});
  return {alert, changed};
}
export const ruleAuditText = (service: Service, rule: UrgencyRule) => `Service ${service.id} urgency rule ${rule.version}: ${rule.reason}`;
export function publishUrgency(state: State, actor: Member, serviceId: string, input: unknown, at: string): UrgencyRule {
  authority(state, actor, true);
  const v = exact(input, ['baseVersion', ...draftFields]), service = state.services.find(s => s.id === serviceId);
  if (!service) fail('Unknown service', 404);
  const previous = publishedUrgency(service);
  if (v.baseVersion !== (previous?.version ?? 0)) fail('Urgency rule changed; reload before publishing', 409);
  if ((service.urgencyRules?.length ?? 0) >= 100) fail('Service urgency history capacity reached', 429);
  const {baseVersion, ...draft} = v;
  const rule = validateUrgencyRule({...draft, version: (previous?.version ?? 0) + 1, by: actor.id, at});
  (service.urgencyRules ??= []).push(rule);
  state.audit.push({id: crypto.randomUUID(), at, actor: actor.id, kind: 'urgency-rule', text: ruleAuditText(service, rule)});
  return rule;
}
export function declarationUrgency(state: State, service: Service, ids: string[], severity: unknown, at: string): Urgency | undefined {
  const alerts = state.alerts.filter(a => ids.includes(a.id));
  if (!service.urgencyRules && !alerts.some(a => a.urgency !== undefined)) return undefined;
  return alerts.length ? (alerts.some(a => alertUrgency(state, a) === 'high') ? 'high' : 'low') : serviceUrgency(state, service.id, severity, at).urgency;
}

/** A versioned email rule can lower at first admission; a repeat can only raise. */
export function emailAlertUrgency(state:State,alert:Alert,receipt:import('../email/types').EmailReceipt,to:Urgency,created:boolean) {
  if(alert.urgency===to||!created&&to==='low')return;
  append(state,alert,{id:'email:'+receipt.id,at:receipt.at,by:'source:email:'+receipt.address,from:alert.urgency??null,to,reason:`Email rule ${receipt.decision!.rule} version ${receipt.decision!.version}`,ruleVersion:null});
}
