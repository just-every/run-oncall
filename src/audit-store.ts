export type AuditIdentity = { kind: string; id: string }
export type AuditOutcome = 'accepted' | 'refused' | 'failed' | 'interrupted' | 'uncertain'
export type AuditContext = {
  feature: string; kind: string; actor?: AuditIdentity; subject?: AuditIdentity; namedMember?: AuditIdentity;
  source: AuditIdentity; outcome?: AuditOutcome; commits: number; storageFailed: boolean; ownerCustodyRefusal?: boolean
}
const contexts = new WeakMap<object, AuditContext>()
export function bindAuditContext(db: D1Database, context: AuditContext) { contexts.set(db, context) }
export function auditIdentity(db: D1Database, value: { actor?: AuditIdentity; subject?: AuditIdentity; source?: AuditIdentity; namedMember?: AuditIdentity }) {
  const context = contexts.get(db)
  if (context) Object.assign(context, value)
}
export function setAuditSubject(db: D1Database, kind: string, id: string) { auditIdentity(db, { subject: { kind, id } }) }
export function auditOutcome(db: D1Database, outcome?: AuditOutcome) {
  const context = contexts.get(db)
  if (context) context.outcome = outcome
}
/** The owner custody boundary must refuse without changing any table. */
export function ownerCustodyRefusal(db: D1Database) {
  const context = contexts.get(db)
  if (context) context.ownerCustodyRefusal = true
}
export function auditKind(db: D1Database, kind: string) {
  const context = contexts.get(db)
  if (context) context.kind = kind
}
export function forgetAuditIdentityQueries(ids: string[]) {
  return [{ sql: 'DELETE FROM oc_audit_identities WHERE entity_id IN (SELECT value FROM json_each(?))', params: [JSON.stringify(ids)] }]
}
export function forgetAuditIdentities(db: D1Database, ids: string[]) {
  return forgetAuditIdentityQueries(ids).map(query => db.prepare(query.sql).bind(...query.params))
}
const revision = (table: string) => `COALESCE((SELECT revision FROM ${table} WHERE id=1),0)`
const label = '(SELECT label FROM oc_audit_identities WHERE kind=? AND entity_id=?)'

/** Identity links can be erased; the random label in an audit row is never changed or reused. */
export function auditTransaction(db: D1Database, context: AuditContext, statements: D1PreparedStatement[], outcome?: AuditOutcome) {
  const actor = context.actor ?? { kind: 'service', id: 'installation' }
  const subject = context.subject ?? context.source
  const identities = [actor, subject, context.source, ...(context.namedMember ? [context.namedMember] : [])]
  const prefix = identities.map(identity => db.prepare('INSERT OR IGNORE INTO oc_audit_identities(kind,entity_id,label) VALUES(?,?,?)')
    .bind(identity.kind, identity.id, `anon-${crypto.randomUUID()}`))
  prefix.push(db.prepare(`UPDATE oc_audit_clock SET workspace_before=${revision('workspace_control')},paging_before=${revision('paging_control')},handoff_before=${revision('handoff_state')},actor_label=${label},subject_label=${label},source_label=${label},named_member_label=${context.namedMember ? label : 'NULL'},changes_before=total_changes(),changed=0 WHERE id=1`).bind(...identities.flatMap(identity => [identity.kind, identity.id])))
  const suffix = [db.prepare(`UPDATE oc_audit_clock SET changed=CASE WHEN total_changes()>changes_before+1 THEN 1 ELSE 0 END,revision=revision+CASE WHEN total_changes()>changes_before+1 THEN 1 ELSE 0 END WHERE id=1`),
    db.prepare(`INSERT INTO oc_admin_audit(id,kind,feature,actor,subject,source,at,before_revision,after_revision,outcome,workspace_before,workspace_after,paging_before,paging_after,handoff_before,handoff_after,named_member)
      SELECT ?,?,?,actor_label,subject_label,source_label,?,revision-changed,revision,COALESCE(?,CASE changed WHEN 1 THEN 'accepted' ELSE 'refused' END),workspace_before,${revision('workspace_control')},paging_before,${revision('paging_control')},handoff_before,${revision('handoff_state')},named_member_label FROM oc_audit_clock WHERE id=1`)
      .bind(crypto.randomUUID(), context.kind, context.feature, new Date().toISOString(), outcome ?? context.outcome ?? null)]
  return { statements: [...prefix, ...statements, ...suffix], offset: prefix.length }
}
export async function exportAudit(db: D1Database) {
  const result = await db.prepare(`SELECT id,kind,feature,actor,subject,source,named_member AS namedMember,at,before_revision AS beforeRevision,after_revision AS afterRevision,outcome,
    workspace_before AS workspaceBefore,workspace_after AS workspaceAfter,paging_before AS pagingBefore,paging_after AS pagingAfter,handoff_before AS handoffBefore,handoff_after AS handoffAfter
    FROM oc_admin_audit ORDER BY ordinal`).all()
  return { schemaVersion: 1, rows: result.results }
}
