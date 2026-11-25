import {senderConfigured, type PagingEnv} from './twilio';
import {pageDestination} from './destination';
import {closeDelivery, recordSkipped, sendNew, sendRetry, type Page} from './deliveries';

type OpenRow = {id: string; alert: string; status: 'sending' | 'retry'; attempts: number; nextAttempt: number; updatedAt: number};
type Running = {alert: string; service: string; event: string | null; run: any};
const clean = (value: unknown, max: number) => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

async function pageText(db: D1Database, origin: string, item: Running, step: number) {
  const title = item.event ? await db.prepare("SELECT json_extract(data,'$.title') AS title FROM oc_events WHERE id=?").bind(item.event).first<{title: string}>() : null;
  const escalated = step === 2 ? `Escalated, no ack in ${Math.round(item.run.policy.primaryWaitSeconds / 60)} min: ` : '';
  return `${escalated}Oncall ${clean(item.service, 40)}: ${clean(title?.title ?? 'alert', 100)} ${origin}/alerts/${encodeURIComponent(item.alert)}`;
}

/**
 * The minute cron's sender. With no sender configured it reads nothing. A page goes only for a running,
 * high-urgency on-call run that began after its rota's paging was switched on (switching on never texts about an
 * alert that was already open); the run's current step decides who is paged, so an
 * acknowledgment (which ends the run) stops both the next page and any retry.
 */
export async function sweepPages(db: D1Database, env: PagingEnv, origin: string) {
  if (!senderConfigured(env)) return;
  const at = Date.now();
  const [enabled, open] = await db.batch<any>([
    db.prepare('SELECT schedule,changed_at AS changedAt FROM oc_paging_schedules WHERE enabled=1'),
    db.prepare("SELECT id,alert,status,attempts,next_attempt AS nextAttempt,updated_at AS updatedAt FROM oc_page_deliveries WHERE status IN ('sending','retry')"),
  ]);
  const on = new Map<string, number>(enabled.results.map((row: any) => [row.schedule, row.changedAt])), unsettled = open.results as OpenRow[];
  if (!on.size && !unsettled.length) return;
  const running = new Map<string, Running>();
  if (on.size) {
    const rows = await db.prepare("SELECT a.id AS alert,json_extract(a.data,'$.service') AS service,json_extract(a.data,'$.events[0]') AS event,json_extract(a.data,'$.onCall') AS run FROM oc_on_call_due d JOIN oc_alerts a ON a.id=d.alert").all<any>();
    for (const row of rows.results) {
      const run = JSON.parse(row.run);
      if (run.state === 'running' && run.urgency === 'high' && Date.parse(run.startedAt) >= (on.get(run.policy.scheduleId) ?? Infinity)) running.set(row.alert, {alert: row.alert, service: row.service, event: row.event, run});
    }
  }
  const known = new Map<string, OpenRow>();
  for (const row of unsettled) {
    if (row.status === 'sending' && row.updatedAt < at - 300_000) await closeDelivery(db, row.id, 'sending', 'outcome unknown: the worker stopped while sending; not sent again');
    else if (row.status === 'retry' && !running.has(row.alert)) await closeDelivery(db, row.id, 'retry', 'not retried: acknowledged, ended or paging switched off');
    else known.set(row.id, row);
  }
  const settled = new Set<string>(running.size ? (await db.prepare('SELECT id FROM oc_page_deliveries WHERE alert IN (SELECT value FROM json_each(?))').bind(JSON.stringify([...running.keys()])).all<{id: string}>()).results.map(row => row.id) : []);
  for (const item of running.values()) {
    const step = item.run.step as 1 | 2, id = `page:${item.alert}:${step}`;
    const retry = known.get(id)?.status === 'retry' ? known.get(id) : undefined;
    if (settled.has(id) && (!retry || retry.nextAttempt > at)) continue;
    const member: string | null = item.run.records.find((record: any) => record.step === step)?.member ?? null;
    const page: Page = {id, alert: item.alert, step, schedule: item.run.policy.scheduleId, member};
    if (!member) {await recordSkipped(db, page, `no one on call at step ${step}`); continue;}
    const to = await pageDestination(db, env, member);
    if (!to) {
      if (retry) await closeDelivery(db, id, 'retry', 'not retried: the person no longer has a number');
      else await recordSkipped(db, page, 'no text-message number for this person: add one in Settings, Team');
      continue;
    }
    const text = await pageText(db, origin, item, step);
    if (retry) await sendRetry(db, env, id, retry.attempts, to, text);
    else await sendNew(db, env, page, to, text);
  }
}
