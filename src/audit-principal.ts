import { AuthError } from './modules/operator-auth/index.mjs'
import { operatorAuth, runtimeBindings, type Bindings } from './auth.server'
import { changeHash, equalSignature } from './changes/credentials'
import { readSessionCookie } from './session-cookie'
import type { AuditIdentity } from './audit-store'

/** Attribute the request after bounded transport consumption, including refused uploads.
 * The ordinary handler still repeats its authority fence in the state transaction. */
export async function auditPrincipal(request: Request, env: Bindings): Promise<{ actor?: AuditIdentity; source?: AuditIdentity }> {
  const path = new URL(request.url).pathname
  if (!path.startsWith('/api/') && !path.startsWith('/auth/')) return {}
  const sourcePath = /^\/api\/(ingress|changes\/ingress|monitoring)\/([^/]+)$/.exec(path)
  const bearer = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (sourcePath && bearer && request.headers.get('authorization')?.startsWith('Bearer ')) {
    const id = decodeURIComponent(sourcePath[2]), type = sourcePath[1]
    const query = type === 'ingress'
      ? 'SELECT digest FROM sources WHERE id=? AND signing_custody IS NULL AND signing_secret IS NULL'
      : type === 'monitoring'
        ? "SELECT c.key_digest AS digest FROM oc_intake_credentials c JOIN oc_intake_sources s ON s.id=c.source WHERE c.source=? AND json_extract(s.data,'$.active')=1"
        : "SELECT c.key_digest AS digest FROM oc_change_credentials c JOIN oc_change_sources s ON s.id=c.source WHERE c.source=? AND json_extract(s.data,'$.active')=1 AND json_extract(s.data,'$.provider')='native' AND json_extract(s.data,'$.mode')='bearer'"
    const credential = await env.DB.prepare(query).bind(id).first<{ digest: string }>()
    if (credential && equalSignature(credential.digest, await changeHash(bearer))) {
      const identity = { kind: type === 'ingress' ? 'source' : type === 'monitoring' ? 'intake-source' : 'change-source', id }
      return { actor: identity, source: identity }
    }
  }
  const token = readSessionCookie(request)
  const native = async () => {
    if (!env.OWNER_EMAIL || !env.SESSION_SECRET) return null
    try { return await operatorAuth(runtimeBindings(env)).getSession(request) }
    catch (error) { if (error instanceof AuthError) return null; throw error }
  }
  if (token) {
    const session = await env.DB.prepare(`SELECT s.member,s.operator_session FROM oc_current_sessions s JOIN oc_members m ON m.id=s.member
      WHERE s.token=? AND s.expires>? AND json_extract(m.data,'$.active')=1`).bind(await changeHash(token), Date.now()).first<{ member: string; operator_session: string | null }>()
    if (!session) return {}
    if (session.operator_session) {
      const authenticated = await native()
      if (!authenticated || authenticated.id !== session.operator_session) return {}
      const mapped = await env.DB.prepare('SELECT member_id FROM operator_members WHERE operator_id=?').bind(authenticated.operator.id).first<{ member_id: string }>()
      if (mapped?.member_id !== session.member) return {}
    }
    return { actor: { kind: 'member', id: session.member } }
  }
  const authenticated = await native()
  if (!authenticated) return {}
  const mapped = await env.DB.prepare('SELECT member_id FROM operator_members WHERE operator_id=?').bind(authenticated.operator.id).first<{ member_id: string }>()
  return { actor: { kind: 'member', id: mapped?.member_id ?? authenticated.operator.id } }
}
