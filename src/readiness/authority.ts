import {operatorAuth, runtimeBindings, type Bindings} from '../auth.server';
import {AuthError} from '../modules/operator-auth/index.mjs';
import {changeHash} from '../changes/credentials';
import {readSessionCookie} from '../session-cookie';
import type {Member} from '../family/response-operations/domain';

/** Same current password/Base member authority as read doors, without creating
 * owner mappings, syncing names, sealing keys or minting a workspace session. */
export async function readinessMember(env: Bindings, request: Request): Promise<Member | null> {
 const native = async () => {
  if (!env.OWNER_EMAIL || !env.SESSION_SECRET) return null;
  try { return await operatorAuth(runtimeBindings(env)).getSession(request); }
  catch (error) { if (error instanceof AuthError) return null; throw error; }
 };
 const token = readSessionCookie(request);
 if (token) {
  const row = await env.DB.prepare(`SELECT m.data,s.operator_session FROM oc_current_sessions s JOIN oc_members m ON m.id=s.member
   WHERE s.token=? AND s.expires>? AND json_extract(m.data,'$.active')=1`)
   .bind(await changeHash(token), Date.now()).first<{data:string;operator_session:string|null}>();
  if (!row) return null;
  const member:Member = JSON.parse(row.data);
  if (row.operator_session) {
   const session = await native();
   if (!session || session.id !== row.operator_session) return null;
   const link = await env.DB.prepare('SELECT member_id FROM operator_members WHERE operator_id=?').bind(session.operator.id).first<{member_id:string}>();
   if (link?.member_id !== member.id) return null;
  }
  return member;
 }
 const session = await native();
 if (!session) return null;
 const link = await env.DB.prepare(`SELECT m.data FROM operator_members l JOIN oc_members m ON m.id=l.member_id
  WHERE l.operator_id=? AND json_extract(m.data,'$.active')=1`).bind(session.operator.id).first<{data:string}>();
 return link ? JSON.parse(link.data) as Member : null;
}
