import {deliveryColumns, type Delivery} from './deliveries';
import {smsPaging} from './state';
import {pagingStatus} from './words';
import type {PagingEnv} from './twilio';

type RunView = {alert: string; policy: {scheduleId: string}};

/**
 * The on-call run record, told what the SMS sender did: the sender this Worker has, the run's rota paging status
 * (the same state GET /api/paging/sms returns), and every page oc_page_deliveries holds for the alert.
 */
export async function withPages<R extends RunView>(db: D1Database, env: PagingEnv, view: {runs: R[]}) {
  const [sms, rows] = await Promise.all([
    smsPaging(db, env),
    db.prepare(`SELECT ${deliveryColumns} FROM oc_page_deliveries WHERE alert IN (SELECT value FROM json_each(?)) ORDER BY created_at,id`).bind(JSON.stringify(view.runs.map(run => run.alert))).all<Delivery>(),
  ]);
  const sender = sms.configured ? 'sms' as const : 'none' as const;
  const pages = new Map<string, Delivery[]>();
  for (const page of rows.results) pages.set(page.alert!, [...pages.get(page.alert!) ?? [], page]);
  return {sender, runs: view.runs.map(run => ({...run, sender, paging: pagingStatus(sms, run.policy.scheduleId), pages: pages.get(run.alert) ?? []}))};
}
