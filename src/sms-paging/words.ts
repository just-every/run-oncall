/** What GET /api/paging/sms returns: whether this Worker has an SMS sender, and each rota's paging switch. */
export type SmsPaging = {configured: boolean; schedules: Record<string, boolean>};
/** on: texts by SMS; off: a sender is configured but paging is not switched on; not-configured: no sender. */
export type PagingStatus = 'on' | 'off' | 'not-configured';

/** One rota's status when a rota is named, otherwise the installation's: on when any rota has paging on. */
export function pagingStatus(sms: SmsPaging, rota?: string): PagingStatus {
  if (!sms.configured) return 'not-configured';
  return (rota === undefined ? Object.values(sms.schedules).some(Boolean) : !!sms.schedules[rota]) ? 'on' : 'off';
}
export const rotasOn = (sms: SmsPaging) => sms.configured ? Object.values(sms.schedules).filter(Boolean).length : 0;
const rotas = (count: number) => count === 1 ? '1 rota' : `${count} rotas`;

/** The lead line on the On call, rota and contact screens. */
export function pagingLead(sms: SmsPaging, rota?: string) {
  const status = pagingStatus(sms, rota);
  if (status === 'on') return rota === undefined
    ? `Paging is on by SMS for ${rotas(rotasOn(sms))}: Oncall texts the on-call person when a high-urgency alert arrives, then the backup if nobody acknowledges. It doesn't call or push, so keep your pager for those.`
    : 'Paging is on by SMS for this rota: Oncall texts the on-call person when a high-urgency alert arrives, then the backup if nobody acknowledges. It doesn\'t call or push, so keep your pager for those.';
  if (status === 'off') return rota === undefined
    ? 'Paging is off: Oncall can text by SMS, but no rota has paging switched on. Keep your pager (PagerDuty, Opsgenie, your phone) to wake people.'
    : 'Paging is off for this rota: Oncall can text by SMS, but paging is not switched on here. Keep your pager (PagerDuty, Opsgenie, your phone) to wake people.';
  return 'Oncall doesn\'t text, call or page anyone: this installation has no text-message sender. Keep your pager (PagerDuty, Opsgenie, your phone) to wake people; Oncall keeps your rota, alerts and incident notes beside it.';
}

/** The readiness page's pager-coverage reason. Coverage stays unproven either way: health cannot prove a text arrives. */
export function coverageReason(sms: SmsPaging) {
  const status = pagingStatus(sms);
  if (status === 'on') return `Paging is on by SMS for ${rotas(rotasOn(sms))}. Oncall texts the on-call person for high-urgency alerts; it does not call or push. Web and storage health cannot prove a text arrives, and there is no independent standby. Keep your existing pager until drills pass.`;
  if (status === 'off') return 'Paging is off: an SMS sender is configured, but no rota has paging switched on. Web and storage health cannot prove pager coverage. Keep your existing pager.';
  return 'Paging is OFF: this installation has no text-message sender. Web and storage health cannot prove pager coverage. No localhost test, demo or provider sandbox substitutes for live acceptance. Keep your existing pager.';
}
