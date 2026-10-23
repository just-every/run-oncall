import { fail, type State } from '../family/response-operations/domain.ts';
import { exact, incompleteUrgencyReason, ruleAuditText, urgencyEntryText } from './model.ts';
import { validateUrgencyDecision, validateUrgencyRule, validateUrgencyTimestamp } from './rules.ts';
import type { UrgencyRule } from './types.ts';

export function validateUrgencyRuleHistory(value: unknown): UrgencyRule[] {
  if (!Array.isArray(value) || !value.length || value.length > 100) fail('Invalid service urgency history');
  const rules = Array.from(value, validateUrgencyRule);
  if (rules.some((r, i) => r.version !== i + 1 || i > 0 && Date.parse(r.at) < Date.parse(rules[i - 1].at))) fail('Invalid urgency rule version history');
  return rules;
}
export function validateUrgencyArchive(state: State) {
  const services = new Map(state.services.map(s => [s.id, s])), events = new Map(state.events.map(e => [e.id, e]));
  const members = new Set(state.members.map(m => m.id)), audit = new Map(state.audit.map(e => [e.id, e]));
  const receipts = new Map((state.intakeReceipts ?? []).map(r => [r.id, r]));
  const histories = new Map<string, UrgencyRule[]>();
  for (const service of state.services) {
    if (service.urgencyRules === undefined) continue;
    const rules = validateUrgencyRuleHistory(service.urgencyRules);
    histories.set(service.id, rules);
    for (const rule of rules) {
      if (!members.has(rule.by) || !state.audit.some(e => e.actor === rule.by && e.at === rule.at &&
        e.kind === 'urgency-rule' && e.text === ruleAuditText(service, rule))) fail('Invalid urgency policy attribution');
    }
  }
  for (const event of state.events) {
    if (event.urgency === undefined) continue;
    const decision = validateUrgencyDecision(event.urgency, event.severity), rules = histories.get(event.service) ?? [];
    if (decision.evaluatedAt !== event.acceptedAt) fail('Urgency must be evaluated at admission');
    const historical = rules.find(r => r.version === decision.version);
    if (decision.rule && (!historical || JSON.stringify(historical) !== JSON.stringify(decision.rule) || Date.parse(historical.at) > Date.parse(event.acceptedAt))) fail('Invalid admission urgency rule reference');
    if (rules.some(r => r.version > decision.version && Date.parse(r.at) < Date.parse(event.acceptedAt))) fail('Admission urgency used a stale rule');
  }
  const identities = new Set<string>();
  for (const alert of state.alerts) {
    const values = [alert.urgency, alert.urgencyRevision, alert.urgencyHistory];
    if (values.every(v => v === undefined)) {
      if (events.get(alert.events[0])?.urgency !== undefined) fail('Missing initial alert urgency history');
      continue;
    }
    if (!['high', 'low'].includes(alert.urgency!) || !Array.isArray(alert.urgencyHistory) || !alert.urgencyHistory.length ||
      alert.urgencyHistory.length > 10000 || alert.urgencyRevision !== alert.urgencyHistory.length) fail('Invalid alert urgency history');
    const first = events.get(alert.events[0]);
    if (first?.urgency && alert.urgencyHistory[0].id !== `urgency:${first.id}`) fail('Missing admission urgency history');
    let previous: 'high' | 'low' | null = null, previousAt = -Infinity;
    for (const entry of alert.urgencyHistory) {
      exact(entry, ['id', 'at', 'by', 'from', 'to', 'reason', 'ruleVersion']);
      validateUrgencyTimestamp(entry.at);
      if (typeof entry.id !== 'string' || !entry.id.trim() || entry.id.length > 150 || identities.has(entry.id) ||
        typeof entry.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(entry.at) || !Number.isFinite(Date.parse(entry.at)) ||
        Date.parse(entry.at) < previousAt || entry.from !== previous || !['high', 'low'].includes(entry.to) || entry.from === entry.to ||
        typeof entry.reason !== 'string' || !entry.reason.trim() || entry.reason.length > 1000) fail('Invalid alert urgency transition');
      const recorded = audit.get(entry.id);
      if (!recorded || recorded.kind !== 'alert-urgency' || recorded.actor !== entry.by || recorded.at !== entry.at ||
        recorded.text !== urgencyEntryText(alert, entry)) fail('Missing alert urgency audit attribution');
      if (entry.id.startsWith('incomplete:')) {
        const receipt = receipts.get(entry.id.slice('incomplete:'.length)), event = receipt?.event ? events.get(receipt.event) : undefined;
        if (!receipt?.incomplete || receipt.alert !== alert.id || (alert.service!==null&&!event) || entry.by !== `source:${event?.source??alert.source}` || entry.at !== receipt.acceptedAt ||
          entry.to !== 'high' || entry.ruleVersion !== null || entry.reason !== incompleteUrgencyReason) fail('Invalid incomplete-intake urgency transition');
      } else if(entry.id.startsWith('email:')) {
        const receipt=state.emailReceipts?.find(r=>r.id===entry.id.slice(6));
        if(!receipt||receipt.alert!==alert.id||receipt.decision?.action!=='trigger'||receipt.decision.urgency!==entry.to||entry.by!=='source:email:'+receipt.address||entry.at!==receipt.at||entry.reason!==`Email rule ${receipt.decision.rule} version ${receipt.decision.version}`||entry.ruleVersion!==null||alert.events.indexOf(receipt.event!)>0&&entry.to!=='high')fail('Invalid email urgency transition');
      } else if (entry.ruleVersion === null) {
        if (!members.has(entry.by)) fail('Invalid human alert urgency attribution');
      } else {
        const event = events.get(entry.id.replace(/^urgency:/, ''));
        if (!entry.id.startsWith('urgency:') || !event || !alert.events.includes(event.id) || !event.urgency ||
          event.urgency.version !== entry.ruleVersion || entry.by !== `source:${event.source}` || entry.at !== event.acceptedAt ||
          entry.reason !== event.urgency.reason || entry.to !== event.urgency.urgency ||
          previous !== null && (entry.to !== 'high' || event.intent !== 'trigger')) fail('Invalid automatic alert urgency transition');
        const position = alert.events.indexOf(event.id);
        if (position > 0 && (entry.to !== 'high' || event.intent !== 'trigger' || alert.events.slice(0, position).some(id => events.get(id)?.intent === 'recover'))) fail('Recovery cannot raise alert urgency');
      }
      identities.add(entry.id); previous = entry.to; previousAt = Date.parse(entry.at);
    }
    if (previous !== alert.urgency) fail('Alert urgency differs from its history');
    if (alert.service!==null&&!services.has(alert.service)) fail('Invalid alert urgency service');
  }
}
