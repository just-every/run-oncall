import {e164, type PagingEnv} from './twilio';

/** Where a person's page goes: their own text-message contact (Settings → Team), else, for the installation owner only, the deploy-time TWILIO_TO_NUMBER. Null means no page can be sent. */
export async function pageDestination(db: D1Database, env: PagingEnv, member: string): Promise<string | null> {
  const person = await db.prepare("SELECT 1 AS ok FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.erased') IS NULL").bind(member).first();
  if (!person) return null;
  const row = await db.prepare("SELECT json_extract(data,'$.data.contacts') AS contacts FROM oc_schedule_records WHERE json_extract(data,'$.kind')='notification-rules' AND json_extract(data,'$.member')=? AND json_extract(data,'$.active')=1").bind(member).first<{contacts: string | null}>();
  const contacts: {type: string; countryCode: number | null; address: string}[] = row?.contacts ? JSON.parse(row.contacts) : [];
  const own = ['sms', 'phone'].map(type => contacts.find(contact => contact.type === type)).find(Boolean);
  if (own) return `+${own.countryCode}${own.address}`;
  const number = env.TWILIO_TO_NUMBER?.trim() ?? '';
  if (!e164.test(number)) return null;
  const owner = await db.prepare("SELECT 1 AS ok FROM operator_members l JOIN oa_operators o ON o.id=l.operator_id WHERE l.member_id=? AND o.role='owner'").bind(member).first();
  return owner ? number : null;
}
