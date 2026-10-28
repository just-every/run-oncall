import {nativeMember} from './native-member'
import {readSessionCookie} from './session-cookie'
import {changeHash} from './changes/credentials'
import type {Bindings} from './auth.server'
import type {Member} from './family/response-operations/domain'

/** Shared native admission for application pages and the person side of the door. */
export async function nativeSession(env:Bindings,request:Request):Promise<{member:Member;digest:string}|null> {
 const token=readSessionCookie(request)
 if(!token)return nativeMember(env,request)
 const digest=await changeHash(token)
 const row=await env.DB.prepare('SELECT m.data,s.operator_session FROM oc_current_sessions s JOIN oc_members m ON m.id=s.member WHERE s.token=? AND s.expires>?')
  .bind(digest,Date.now()).first<{data:string;operator_session:string|null}>()
 if(!row)return null
 if(row.operator_session) {
  const native=await nativeMember(env,request)
  if(!native||native.digest!=='native:'+row.operator_session||native.member.id!==JSON.parse(row.data).id)return null
 }
 const member:Member=JSON.parse(row.data)
 return member.active&&!member.erased?{member,digest}:null
}
