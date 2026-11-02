import type { Bindings } from '../auth.server.ts'
import type { Member as NativeMember } from '../family/response-operations/domain.ts'
import { auditIdentity, auditKind } from '../audit-store.ts'
import { createBusinessSettings } from '../modules/business-settings/index.ts'
import { SettingsError } from '../modules/business-settings/types.ts'
import type { BusinessManifest, ManagedMember, Statement, TeamAdapter } from '../modules/business-settings/types.ts'
import { claimedOncallOwner } from './people.ts'

type BusinessBindings = Bindings & { RER_BUSINESS_TRUST?: string }
type NativeRow = { id: string; data: string; credential: number; linked: number }

export const oncallBusinessManifest: BusinessManifest = {
  settings: 1,
  values: ['display_name'],
  team: { roles: { admin: 'admin', member: 'responder' } },
}

/** Business can narrow an established local account, but cannot onboard one. */
function oncallTeam(env: Bindings): TeamAdapter {
  return {
    async ownerEmail() {
      const owner = await claimedOncallOwner(env)
      if (!owner) throw new SettingsError('owner_required')
      return owner.email
    },
    async prepare({ members, managed, ownerEmail, roles, guard }) {
      const [owner, stored, control] = await Promise.all([
        claimedOncallOwner(env),
        env.DB.prepare(`SELECT email,operator_id AS operatorId,invite,state,
          business_id AS businessId,business_role AS businessRole FROM bs_team`).all<ManagedMember>(),
        env.DB.prepare('SELECT revision FROM workspace_control WHERE id=1').first<{ revision: number }>(),
      ])
      if (!owner || owner.email !== ownerEmail || !control) throw new SettingsError('owner_required')
      if (roles.admin !== 'admin' || roles.member !== 'responder') throw new SettingsError('invalid_role', 400)
      const authority = `(${guard.sql}) AND EXISTS(SELECT 1 FROM oa_bootstrap b
        JOIN oa_operators o ON o.id=b.claim_id JOIN operator_members l ON l.operator_id=o.id
        JOIN oc_members m ON m.id=l.member_id WHERE b.singleton=1 AND o.id=? AND o.version=?
        AND o.email=? AND o.role='owner' AND o.status='active' AND l.member_id=? AND m.data=?)`
      const authorityArgs = [...guard.args, owner.operatorId, owner.operatorVersion, owner.email, owner.id, owner.data]
      const statements: Statement[] = []
      const assert = (sql: string, args: unknown[]) => statements.push(env.DB.prepare(
        `INSERT INTO bs_assert(value) VALUES(CASE WHEN ${sql} THEN 1 ELSE NULL END)`).bind(...args))
      // Even a conflicts-only roster must retain current claimed-owner authority.
      assert(authority, authorityArgs)
      const ids = stored.results.flatMap(row => row.operatorId ? [row.operatorId] : [])
      const native = new Map((await env.DB.prepare(`SELECT m.id,m.data,
        EXISTS(SELECT 1 FROM credentials c WHERE c.member=m.id) AS credential,
        EXISTS(SELECT 1 FROM operator_members l WHERE l.member_id=m.id) AS linked
        FROM oc_members m WHERE m.id IN (SELECT value FROM json_each(?))`)
        .bind(JSON.stringify(ids)).all<NativeRow>()).results.map(row => [row.id, row]))
      const storedById = new Map(stored.results.filter(row => row.businessId).map(row => [row.businessId!, row]))
      const desired = new Map(members.map(member => [member.email, member]))
      const previous = new Map(managed.map(row => [row.email, row]))
      const rows: ManagedMember[] = []
      const changes: { before: NativeRow; after: NativeMember }[] = []
      const bound = new Set<string>()
      for (const email of new Set([...desired.keys(), ...previous.keys()])) {
        const member = desired.get(email), prior = previous.get(email)
        // projectManaged also supports legacy email-keyed adapters. Re-read the
        // unprojected ledger: its signed ID must already own this exact binding.
        const businessId = member ? member.id : prior?.businessId
        const storedRow = businessId ? storedById.get(businessId) : undefined
        const target = storedRow?.operatorId ? native.get(storedRow.operatorId) : undefined
        const value = target ? JSON.parse(target.data) as NativeMember : null
        const unique = storedRow?.operatorId && stored.results.filter(row => row.operatorId === storedRow.operatorId).length === 1
        const admissible = storedRow && ['active', 'inactive'].includes(storedRow.state) && storedRow.operatorId &&
          prior?.operatorId === storedRow.operatorId && prior.businessId === storedRow.businessId && unique &&
          target?.credential && !target.linked && value && value.id === target.id && !value.erased && !value.machine &&
          ['admin', 'responder', 'viewer', 'stakeholder'].includes(value.role) && target.id !== owner.id
        if (!admissible || !storedRow || !target || !value || bound.has(target.id)) {
          rows.push({ email, operatorId: null, invite: member?.invite ?? prior?.invite ?? 0, state: 'conflict' })
          continue
        }
        bound.add(target.id)
        const mapping = `EXISTS(SELECT 1 FROM bs_team WHERE email=? AND operator_id=?
          AND business_id=? AND state=? AND invite=? AND business_role IS ?)`
        const mappingArgs = [storedRow.email, target.id, storedRow.businessId, storedRow.state, storedRow.invite, storedRow.businessRole ?? null]
        assert(`(${authority}) AND ${mapping} AND EXISTS(SELECT 1 FROM oc_members m WHERE m.id=? AND m.data=?
          AND EXISTS(SELECT 1 FROM credentials c WHERE c.member=m.id)
          AND NOT EXISTS(SELECT 1 FROM operator_members l WHERE l.member_id=m.id))`,
        [...authorityArgs, ...mappingArgs, target.id, target.data])
        // Names are native workspace login names. Signed roster names/emails do
        // not rename credentials, transfer ownership or establish new access.
        const after = { ...value }
        if (!member) after.active = false
        else if (member.role === 'member' && after.role === 'admin') after.role = 'responder'
        if (after.active !== value.active || after.role !== value.role) changes.push({ before: target, after })
        rows.push({ email, operatorId: target.id, invite: member?.invite ?? prior!.invite,
          state: member && after.active ? 'active' : 'inactive' })
      }
      if (changes.length) {
        const token = crypto.randomUUID()
        statements.push(env.DB.prepare(`UPDATE workspace_control SET revision=revision+1,write_token=?
          WHERE id=1 AND revision=? AND ${authority}`).bind(token, control.revision, ...authorityArgs))
        assert('EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)', [token])
        const gate = `(${authority}) AND EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)`
        const gateArgs = [...authorityArgs, token]
        for (const { before, after } of changes) {
          const data = JSON.stringify(after)
          statements.push(env.DB.prepare(`UPDATE oc_members SET data=? WHERE id=? AND data=? AND ${gate}`)
            .bind(data, before.id, before.data, ...gateArgs))
          assert(`EXISTS(SELECT 1 FROM oc_members WHERE id=? AND data=?) AND ${gate}`, [before.id, data, ...gateArgs])
          statements.push(env.DB.prepare(`DELETE FROM sessions WHERE member=? AND ${gate}`).bind(before.id, ...gateArgs))
          const entry = { id: crypto.randomUUID(), at: new Date().toISOString(), actor: owner.id,
            kind: 'member', text: `Changed ${after.name} ${after.active ? 'role' : 'access'} via Business` }
          statements.push(env.DB.prepare(`INSERT INTO oc_audit(id,ordinal,data)
            SELECT ?,COALESCE((SELECT MAX(ordinal)+1 FROM oc_audit),0),? WHERE ${gate}`)
            .bind(entry.id, JSON.stringify(entry), ...gateArgs))
        }
        auditIdentity(env.DB, { actor: { kind: 'member', id: owner.id }, source: { kind: 'service', id: 'business' } })
        auditKind(env.DB, 'member.business')
      }
      return { statements, rows, async afterCommit() {} }
    },
  }
}

export function businessSettings(env: BusinessBindings) {
  return createBusinessSettings({ db: env.DB, trust: env.RER_BUSINESS_TRUST,
    business: oncallBusinessManifest, team: oncallTeam(env) })
}
