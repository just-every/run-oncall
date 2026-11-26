import {deliveryColumns, type Delivery} from './deliveries';
import {senderConfigured, type PagingEnv} from './twilio';

type RunView = {alert: string; policy: {scheduleId: string}};

/**
 * The on-call run record, told what the SMS sender did: the sender this Worker has, whether the run's rota has
 * paging on, and every page oc_page_deliveries holds for the alert (the one source of truth for what was texted).
 */
export async function withPages<R extends RunView>(db: D1Database, env: PagingEnv, view: {runs: R[]}) {
  const sender = senderConfigured(env) ? 'sms' as const : 'none' as const;
  const alerts = JSON.stringify(view.runs.map(run => run.alert));
  const [enabled, rows] = await db.batch<any>([
    db.prepare('SELECT schedule FROM oc_paging_schedules WHERE enabled=1'),
    db.prepare(`SELECT ${deliveryColumns} FROM oc_page_deliveries WHERE alert IN (SELECT value FROM json_each(?)) ORDER BY created_at,id`).bind(alerts),
  ]);
  const on = new Set<string>(enabled.results.map((row: any) => row.schedule));
  const pages = new Map<string, Delivery[]>();
  for (const page of rows.results as Delivery[]) pages.set(page.alert!, [...pages.get(page.alert!) ?? [], page]);
  return {sender, runs: view.runs.map(run => ({...run, sender, paging: sender === 'sms' && on.has(run.policy.scheduleId) ? 'ON' as const : 'OFF' as const, pages: pages.get(run.alert) ?? []}))};
}
