import {senderConfigured, type PagingEnv} from './twilio';
import type {SmsPaging} from './words';

/**
 * The one source of truth for whether Oncall pages: the Worker has an SMS sender, and which rotas an administrator
 * switched on. GET /api/paging/sms returns it as is; readiness and the screens read it from there.
 */
export async function smsPaging(db: D1Database, env: PagingEnv): Promise<SmsPaging> {
  const rows = await db.prepare('SELECT schedule,enabled FROM oc_paging_schedules').all<{schedule: string; enabled: number}>();
  return {configured: senderConfigured(env), schedules: Object.fromEntries(rows.results.map(row => [row.schedule, row.enabled === 1]))};
}
