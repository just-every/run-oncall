import {fail} from '../family/response-operations/domain';
import {deliveryColumns, hint, type Delivery} from './deliveries';
import {sendText, senderConfigured, senderInputs, type PagingEnv} from './twilio';
import {pageDestination} from './destination';

/** The SMS paging switch and its delivery log. Off until a rota is switched on here AND the Worker has a sender. */
export function installSmsPaging(api: any, body: (c: any) => Promise<any>) {
  const admin = (c: any) => {if (c.get('actor').role !== 'admin') fail('Current admin required', 403);};
  const member = (c: any) => {if (c.get('actor').role === 'stakeholder') fail('Stakeholders may only access internal status and approved updates', 403);};
  api.get('/api/paging/sms', async (c: any) => {
    member(c);
    const rows = await c.env.DB.prepare('SELECT schedule,enabled FROM oc_paging_schedules').all();
    return c.json({configured: senderConfigured(c.env as PagingEnv), schedules: Object.fromEntries(rows.results.map((row: any) => [row.schedule, row.enabled === 1]))});
  });
  api.post('/api/paging/sms/schedules', async (c: any) => {
    admin(c);
    const input = await body(c);
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).sort().join() !== 'enabled,schedule' || typeof input.schedule !== 'string' || typeof input.enabled !== 'boolean') fail('Send {schedule, enabled}');
    if (!await c.env.DB.prepare('SELECT 1 AS ok FROM paging_schedules WHERE id=?').bind(input.schedule).first()) fail('Unknown schedule', 404);
    if (input.enabled && !senderConfigured(c.env as PagingEnv)) fail(`Paging cannot be switched on: this installation has no sender. Set ${senderInputs} with rer deploy.`, 409);
    await c.env.DB.prepare('INSERT INTO oc_paging_schedules(schedule,enabled,changed_by,changed_at) VALUES(?,?,?,?) ON CONFLICT(schedule) DO UPDATE SET enabled=excluded.enabled,changed_by=excluded.changed_by,changed_at=excluded.changed_at')
      .bind(input.schedule, input.enabled ? 1 : 0, c.get('actor').id, Date.now()).run();
    return c.json({schedule: input.schedule, enabled: input.enabled});
  });
  api.get('/api/paging/sms/deliveries', async (c: any) => {
    member(c);
    const alert = c.req.query('alert');
    const rows = alert === undefined
      ? await c.env.DB.prepare(`SELECT ${deliveryColumns} FROM oc_page_deliveries ORDER BY created_at DESC,id LIMIT 50`).all()
      : await c.env.DB.prepare(`SELECT ${deliveryColumns} FROM oc_page_deliveries WHERE alert=? ORDER BY created_at DESC,id LIMIT 50`).bind(alert).all();
    return c.json({deliveries: rows.results as Delivery[]});
  });
  // The documented first check: one real text to the administrator's own number, through the configured sender.
  api.post('/api/paging/sms/test', async (c: any) => {
    admin(c);
    const env = c.env as PagingEnv;
    if (!senderConfigured(env)) fail(`This installation has no sender. Set ${senderInputs} with rer deploy.`, 409);
    const actor = c.get('actor').id, to = await pageDestination(c.env.DB, env, actor);
    if (!to) fail('You have no text-message number: add one under Settings, Team, or set TWILIO_TO_NUMBER if you are the installation owner.', 409);
    const id = `test:${crypto.randomUUID()}`, at = Date.now();
    await c.env.DB.prepare("INSERT INTO oc_page_deliveries(id,member,to_hint,status,attempts,next_attempt,created_at,updated_at) VALUES(?,?,?,'sending',1,?,?,?)").bind(id, actor, hint(to), at, at, at).run();
    const result = await sendText(env, to, 'Oncall test page. If you can read this, paging works.');
    await c.env.DB.prepare('UPDATE oc_page_deliveries SET status=?,provider_ref=?,detail=?,updated_at=? WHERE id=?').bind(result.ok ? 'sent' : 'failed', result.ok ? result.ref : null, result.ok ? null : result.detail, Date.now(), id).run();
    return c.json((await c.env.DB.prepare(`SELECT ${deliveryColumns} FROM oc_page_deliveries WHERE id=?`).bind(id).first()));
  });
}
