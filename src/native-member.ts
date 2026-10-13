import { operatorAuth, runtimeBindings, type Bindings } from './auth.server'
import { loadWorkspace, workspaceRows } from './workspace-store'
import type { Member } from './family/response-operations/domain'

/** Base sessions retain Base's key gate, expiry and revocation checks. */
export async function nativeMember(env:Bindings,request:Request):Promise<{member:Member;digest:string}|null> {
  if(!env.SESSION_SECRET || !env.OWNER_EMAIL) return null
  const native=await operatorAuth(runtimeBindings(env)).getSession(request)
  if(!native) return null
  let state=await loadWorkspace(env.DB)
  if(!state.members.length && native.operator.role==='owner') {
    const member:Member={id:native.operator.id,name:native.operator.displayName,role:'admin',active:true}
    state.members=[member]
    const token=crypto.randomUUID()
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO workspace_control(id,revision,write_token) SELECT 1,0,? WHERE EXISTS(SELECT 1 FROM oa_sessions s JOIN oa_operators o ON o.id=s.operator_id WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND o.role=\'owner\' AND o.status=\'active\' AND o.version=s.operator_version)').bind(token,native.id,Date.now()),
      ...workspaceRows(env.DB,state,token),
      env.DB.prepare('INSERT OR IGNORE INTO operator_members SELECT ?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(native.operator.id,member.id,token),
    ])
    state=await loadWorkspace(env.DB)
  }
  const link=await env.DB.prepare('SELECT member_id FROM operator_members WHERE operator_id=?').bind(native.operator.id).first<{member_id:string}>()
  const member=state.members.find(m=>m.id===link?.member_id && m.active)
  if(!member) return null
  const digest=`native:${native.id}`
  await env.DB.prepare('INSERT INTO sessions(token,member,expires,operator_session) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM oa_sessions s JOIN oa_operators o ON o.id=s.operator_id WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND o.status=\'active\' AND o.version=s.operator_version) ON CONFLICT(token) DO NOTHING').bind(digest,member.id,native.expiresAt,native.id,native.id,Date.now()).run()
  return {member,digest}
}
