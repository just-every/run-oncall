import {sendText, type PagingEnv} from './twilio';

/** The retry ladder for a transient provider failure: three attempts a minute or two apart, then a recorded failure. */
export const maxAttempts = 3;
export type Page = {id: string; alert: string | null; step: number | null; schedule: string | null; member: string | null};
export type Delivery = {
  id: string; alert: string | null; step: number | null; schedule: string | null; member: string | null; toHint: string | null;
  status: 'sending' | 'sent' | 'retry' | 'failed' | 'skipped'; attempts: number; nextAttempt: number;
  providerRef: string | null; detail: string | null; createdAt: number; updatedAt: number;
};
export const deliveryColumns = 'id,alert,step,schedule,member,to_hint AS toHint,status,attempts,next_attempt AS nextAttempt,provider_ref AS providerRef,detail,created_at AS createdAt,updated_at AS updatedAt';
export const hint = (to: string) => to.slice(-4);

/** Records a page that was never sent (nobody on call, no number). INSERT OR IGNORE keeps it one row however often the alert is delivered. */
export async function recordSkipped(db: D1Database, page: Page, detail: string) {
  const at = Date.now();
  await db.prepare("INSERT OR IGNORE INTO oc_page_deliveries(id,alert,step,schedule,member,status,attempts,next_attempt,detail,created_at,updated_at) VALUES(?,?,?,?,?,'skipped',0,?,?,?,?)")
    .bind(page.id, page.alert, page.step, page.schedule, page.member, at, detail, at, at).run();
}
async function settle(db: D1Database, env: PagingEnv, id: string, to: string, text: string, attempts: number) {
  const result = await sendText(env, to, text), at = Date.now();
  const [status, nextAttempt, ref, detail] = result.ok ? ['sent', at, result.ref, null]
    : result.retry && attempts < maxAttempts ? ['retry', at + 60_000 * attempts, null, result.detail]
    : ['failed', at, null, result.detail];
  await db.prepare('UPDATE oc_page_deliveries SET status=?,next_attempt=?,provider_ref=?,detail=?,updated_at=? WHERE id=? AND status=?').bind(status, nextAttempt, ref, detail, at, id, 'sending').run();
  return status;
}
/** The idempotent first send: the insert is the claim, so a second caller for the same id changes nothing and sends nothing. */
export async function sendNew(db: D1Database, env: PagingEnv, page: Page, to: string, text: string) {
  const at = Date.now();
  const claim = await db.prepare("INSERT OR IGNORE INTO oc_page_deliveries(id,alert,step,schedule,member,to_hint,status,attempts,next_attempt,created_at,updated_at) VALUES(?,?,?,?,?,?,'sending',1,?,?,?)")
    .bind(page.id, page.alert, page.step, page.schedule, page.member, hint(to), at, at, at).run();
  return claim.meta.changes === 1 ? settle(db, env, page.id, to, text, 1) : null;
}
/** A retry is claimed by moving retry to sending, so overlapping crons cannot both send it. */
export async function sendRetry(db: D1Database, env: PagingEnv, id: string, attempts: number, to: string, text: string) {
  const at = Date.now();
  const claim = await db.prepare("UPDATE oc_page_deliveries SET status='sending',attempts=attempts+1,to_hint=?,updated_at=? WHERE id=? AND status='retry' AND attempts=? AND next_attempt<=?")
    .bind(hint(to), at, id, attempts, at).run();
  return claim.meta.changes === 1 ? settle(db, env, id, to, text, attempts + 1) : null;
}
export async function closeDelivery(db: D1Database, id: string, from: 'sending' | 'retry', detail: string) {
  await db.prepare("UPDATE oc_page_deliveries SET status='failed',detail=?,updated_at=? WHERE id=? AND status=?").bind(detail, Date.now(), id, from).run();
}
