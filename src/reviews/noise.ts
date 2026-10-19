import type { State } from '../family/response-operations/domain.ts';
import type { ResponseReport } from './report.ts';

/** Repeat and noisy alerts: trigger events accepted in the cohort range, suppressed alerts included. */
export function alertNoise(state: State, report: ResponseReport) {
  const from = Date.parse(report.cohort.from), to = Date.parse(report.cohort.to);
  const events = new Map(state.events.map(e => [e.id, e])), inRange = (at: string) => Date.parse(at) >= from && Date.parse(at) < to;
  const alerts = state.alerts.filter(a => report.cohort.service === null || a.service === report.cohort.service).flatMap(alert => {
    const triggers = alert.events.map(id => events.get(id)).filter(e => e?.intent === 'trigger' && inRange(e.acceptedAt));
    return triggers.length ? [{alert, title: triggers.at(-1)!.title, triggers: triggers.length}] : [];
  });
  const keys = new Map<string, typeof alerts>();
  for (const row of alerts) {
    const key = JSON.stringify([row.alert.source, row.alert.service, row.alert.key]);
    keys.set(key, [...keys.get(key) ?? [], row]);
  }
  const noisy = [...keys.values()].map(group => ({source: group[0].alert.source, service: group[0].alert.service, key: group[0].alert.key,
    title: group.at(-1)!.title, alerts: group.length, triggers: group.reduce((sum, r) => sum + r.triggers, 0),
    suppressed: group.filter(r => r.alert.suppressed).length, active: group.filter(r => r.alert.state === 'active').length}))
    .filter(k => k.alerts > 1 || k.triggers > 1)
    .sort((a, b) => b.triggers - a.triggers || b.alerts - a.alerts || a.key.localeCompare(b.key) || a.source.localeCompare(b.source));
  return {alerts: alerts.length, triggers: alerts.reduce((sum, r) => sum + r.triggers, 0), repeatedAlerts: alerts.filter(r => r.triggers > 1).length,
    suppressedAlerts: alerts.filter(r => r.alert.suppressed).length, noisyKeys: noisy.length, noisy: noisy.slice(0, 20),
    definition: 'Alerts with a trigger event accepted in the cohort range [from,to), suppressed alerts included. An alert repeats when it has more than one trigger in range; a source/service/key is noisy when it repeats or opens more than one alert generation in range. The 20 noisiest keys are listed; the counts cover all of them.'};
}
export type AlertNoise = ReturnType<typeof alertNoise>;
