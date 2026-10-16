import { operatorAuth, runtimeBindings, type Bindings } from './auth.server'
import { loadWorkspace, workspaceRows } from './workspace-store'
import type { Member } from './family/response-operations/domain'

/** Base sessions retain Base's key gate, expiry and revocation checks. */
export async function nativeMember(env:Bindings,request:Request):Promise<{member:Member;digest:string}|null> {
  if(!env.SESSION_SECRET || !env.OWNER_EMAIL) return null
  const native=await operatorAuth(runtimeBindings(env)).getSession(request)
  if(!native) return null
  const digest=`native:${native.id}`
  // Authentication needs the mapped current member, not every incident/event.
  const read=()=>env.DB.prepare(`SELECT m.data,EXISTS(SELECT 1 FROM sessions WHERE token=?) AS linked
    FROM operator_members l JOIN oc_members m ON m.id=l.member_id
    WHERE l.operator_id=? AND json_extract(m.data,'$.active')=1`)
    .bind(digest,native.operator.id).first<{data:string;linked:number}>()
  let link=await read()
  if(!link && native.operator.role==='owner') {
    const state=await loadWorkspace(env.DB)
    if(!state.members.length) {
      const member:Member={id:native.operator.id,name:native.operator.displayName,role:'admin',active:true}
      state.members=[member]
      const token=crypto.randomUUID()
      await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO workspace_control(id,revision,write_token) SELECT 1,0,? WHERE EXISTS(SELECT 1 FROM oa_sessions s JOIN oa_operators o ON o.id=s.operator_id WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND o.role=\'owner\' AND o.status=\'active\' AND o.version=s.operator_version)').bind(token,native.id,Date.now()),
        ...workspaceRows(env.DB,state,token),
        env.DB.prepare('INSERT OR IGNORE INTO operator_members SELECT ?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(native.operator.id,member.id,token),
      ])
      link=await read()
    }
  }
  if(!link) return null
  const member:Member=JSON.parse(link.data)
  if(!link.linked) await env.DB.prepare('INSERT INTO sessions(token,member,expires,operator_session) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM oa_sessions s JOIN oa_operators o ON o.id=s.operator_id WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND o.status=\'active\' AND o.version=s.operator_version) ON CONFLICT(token) DO NOTHING').bind(digest,member.id,native.expiresAt,native.id,native.id,Date.now()).run()
  return {member,digest}
}
