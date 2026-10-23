import type { Alert, Event, State } from '../family/response-operations/domain.ts';

export type ResponseReceipt = {event: Event; alert: Alert; at: string};
/** Provider/email receipt identities are retained; native admission uses its event ID. */
export function responseReceipt(state: State, id: string): ResponseReceipt | undefined {
  const intake = state.intakeReceipts?.find(r => r.id === id);
  const email = state.emailReceipts?.find(r => r.id === id);
  if (intake && email) return undefined;
  const row = intake ?? email;
  const event = row ? state.events.find(e => e.id === row.event) : state.events.find(e => e.id === id && !e.source.startsWith('email:') && !e.source.startsWith('intake:'));
  const alert = event && state.alerts.find(a => a.events.includes(event.id) && (!row || a.id === row.alert));
  if (!event || !alert) return undefined;
  const at = intake?.acceptedAt ?? email?.at ?? event.acceptedAt;
  if (at !== event.acceptedAt) return undefined;
  return {event, alert, at};
}
export function receiptForEvent(state: State, event: Event): string {
  return state.intakeReceipts?.find(r => r.event === event.id)?.id ?? state.emailReceipts?.find(r => r.event === event.id)?.id ?? event.id;
}
export function latestRecovery(state: State, alerts: Alert[]) {
  return state.events.filter(e => e.intent === 'recover' && alerts.some(a => a.events.includes(e.id)))
    .sort((a, b) => Date.parse(a.acceptedAt) - Date.parse(b.acceptedAt)).at(-1);
}
