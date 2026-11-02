import type { Bindings } from '../auth.server.ts'
import type { Member } from '../family/response-operations/domain.ts'
import { nativeMember } from '../native-member.ts'
import { readSessionCookie } from '../session-cookie.ts'
import type { PeopleAdapter, Person } from '../modules/agent-door/types.ts'

export interface ClaimedOncallOwner {
  id: string
  data: string
  operatorId: string
  operatorVersion: number
  email: string
}

/** Ownership comes from the claimed OA identity and its explicit native link. */
export function claimedOncallOwner(env: Bindings): Promise<ClaimedOncallOwner | null> {
  return env.DB.prepare(`SELECT m.id,m.data,o.id AS operatorId,o.version AS operatorVersion,o.email
    FROM oa_bootstrap b JOIN oa_operators o ON o.id=b.claim_id
    JOIN operator_members l ON l.operator_id=o.id JOIN oc_members m ON m.id=l.member_id
    WHERE b.singleton=1 AND o.role='owner' AND o.status='active'
    AND json_extract(m.data,'$.id')=m.id
    AND json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin'
    AND COALESCE(json_extract(m.data,'$.machine'),0)=0
    AND COALESCE(json_extract(m.data,'$.erased'),0)=0`).first<ClaimedOncallOwner>()
}

const roles = new Set(['admin', 'responder', 'viewer', 'stakeholder'])
function asPerson(id: string, data: string, email: string): Person | null {
  const member = JSON.parse(data) as Member
  if (member.id !== id || member.active !== true || member.erased || member.machine || !roles.has(member.role)) return null
  return { id, name: member.name, email, role: member.role, active: true }
}

/** Agent identity is always an oc_members ID, including the installation owner. */
export function oncallPeople(env: Bindings): PeopleAdapter {
  const rolesById=new Map<string,'owner'|'editor'|null>()
  async function person(id: string): Promise<Person | null> {
    const owner = await claimedOncallOwner(env)
    if (owner?.id === id){rolesById.set(id,'owner');return asPerson(id, owner.data, owner.email)}
    const row = await env.DB.prepare(`SELECT m.data,
      COALESCE((SELECT t.email FROM bs_team t JOIN bs_settings s ON s.singleton=1 AND s.stopped=0
        WHERE t.operator_id=m.id AND t.state='active' AND t.business_id IS NOT NULL
        ORDER BY t.business_id LIMIT 1),'') AS email
      FROM oc_members m WHERE m.id=? AND json_extract(m.data,'$.active')=1
      AND EXISTS(SELECT 1 FROM credentials c WHERE c.member=m.id)
      AND NOT EXISTS(SELECT 1 FROM operator_members l WHERE l.member_id=m.id)`)
      .bind(id).first<{ data: string; email: string }>()
    const current=row?asPerson(id,row.data,row.email):null
    let role:'owner'|'editor'|null=null
    if(current?.role==='admin'){
      // Standalone native administrators already manage the installation's
      // clients and settings. Pairing switches policy roles to applied IDs.
      if(!env.RER_BUSINESS_TRUST&&!env.RER_OWNER_CLAIM_PUBLIC_KEYS)role='owner'
      else if(await env.DB.prepare("SELECT 1 FROM bs_team t JOIN bs_settings s ON s.singleton=1 AND s.stopped=0 WHERE t.operator_id=? AND t.state='active' AND t.business_id IS NOT NULL AND t.business_role='admin'").bind(id).first())role='editor'
    }
    rolesById.set(id,role)
    return current
  }

  async function businessMember(candidate: Person): Promise<{ id: string; role: 'owner' | 'editor' | null } | null> {
    const settings = await env.DB.prepare('SELECT owner_id FROM bs_settings WHERE singleton=1 AND stopped=0')
      .first<{ owner_id: string | null }>()
    if (!settings) return null
    const current = await person(candidate.id)
    if (!current) return null
    const owner = await claimedOncallOwner(env)
    if (owner?.id === current.id) return settings.owner_id ? { id: settings.owner_id, role: 'owner' } : null
    const rows = (await env.DB.prepare(`SELECT business_id,business_role FROM bs_team
      WHERE operator_id=? AND state='active' AND business_id IS NOT NULL`)
      .bind(current.id).all<{ business_id: string; business_role: string | null }>()).results
    if (rows.length !== 1 || rows[0].business_id === settings.owner_id) return null
    return { id: rows[0].business_id, role: rows[0].business_role === 'admin' && current.role === 'admin' ? 'editor' : null }
  }

  return {
    person,
    // A native administrator is not implicitly a Business policy editor.
    businessRole: current => rolesById.get(current.id)??null,
    businessMember,
    async sponsor({ sub }) {
      const settings = await env.DB.prepare('SELECT owner_id FROM bs_settings WHERE singleton=1 AND stopped=0')
        .first<{ owner_id: string | null }>()
      if (!settings) return null
      if (settings.owner_id === sub) {
        const owner = await claimedOncallOwner(env)
        return owner ? person(owner.id) : null
      }
      const row = await env.DB.prepare(`SELECT operator_id FROM bs_team
        WHERE business_id=? AND state='active' AND operator_id IS NOT NULL`)
        .bind(sub).first<{ operator_id: string }>()
      if (!row) return null
      const current = await person(row.operator_id)
      return current && (await businessMember(current))?.id === sub ? current : null
    },
    async session(request) {
      const token = readSessionCookie(request)
      if (token) {
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))))
          .map(byte => byte.toString(16).padStart(2, '0')).join('')
        const session = await env.DB.prepare('SELECT member,operator_session FROM oc_current_sessions WHERE token=? AND expires>?')
          .bind(digest, Date.now()).first<{ member: string; operator_session: string | null }>()
        if (!session) return null
        if (session.operator_session) {
          const native = await nativeMember(env, request)
          if (!native || native.digest !== `native:${session.operator_session}` || native.member.id !== session.member) return null
        }
        return person(session.member)
      }
      const native = await nativeMember(env, request)
      if (!native) return null
      const current = await env.DB.prepare(`SELECT member FROM oc_current_sessions
        WHERE token=? AND member=? AND expires>? AND operator_session IS NOT NULL`)
        .bind(native.digest, native.member.id, Date.now()).first<{ member: string }>()
      return current ? person(current.member) : null
    },
  }
}
