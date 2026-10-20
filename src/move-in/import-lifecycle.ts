import type { D1Database as ImportDatabase, D1Statement } from '../modules/import-kit/src/d1/types'
import { interruptRestoredImports } from './import-lifecycle-sql.mjs'
import { auditOutcome } from '../audit-store'

const LEASE_MS = 300_000
const nowSql = 'unixepoch()*1000'

/** Recovery is bookkeeping, never authority to publish another imported row.
 * The entire transition, including the failure fact and fence, is one commit. */
export async function expireInterruptedImports(db: ImportDatabase) {
 const stale = `state='active' AND lease_expires<=${nowSql}`
 const due = await db.prepare(`SELECT 1 AS found FROM oc_import_lifecycle WHERE ${stale} LIMIT 1`).first()
 if (!due) return
 auditOutcome(db as unknown as D1Database, 'interrupted')
 try { await db.batch([
  db.prepare(`UPDATE oc_import_lifecycle SET state='interrupted',reason_code='import_interrupted_lease',
   lease_token=NULL,lease_expires=NULL,updated_at=${nowSql} WHERE ${stale}`),
  db.prepare(`INSERT OR IGNORE INTO ik_door_apply_failures(plan_id,reason_code)
   SELECT plan_id,reason_code FROM oc_import_lifecycle WHERE state='interrupted' AND plan_id IS NOT NULL`),
  db.prepare(`UPDATE ik_jobs SET state='failed',error='import_interrupted_lease',fence=fence+1,lease_token=NULL,lease_expires=NULL
   WHERE id IN (SELECT job_id FROM oc_import_lifecycle WHERE state='interrupted') AND state IN ('queued','applying')`),
 ]) } finally { auditOutcome(db as unknown as D1Database) }
}

export async function interruptImportsBeforeRestore(db: ImportDatabase) {
 auditOutcome(db as unknown as D1Database, 'interrupted')
 try { await db.batch(interruptRestoredImports.map((query: string) => db.prepare(query))) }
 finally { auditOutcome(db as unknown as D1Database) }
}

type Scope = { planId: string } | { jobId: string }
/** Each bounded apply owns a lease only when its first real job mutation
 * commits. The acceptance and lease share the kit's authority transaction.
 * A competing request cannot renew or release another Worker's lease. */
export function importAttempt(db: ImportDatabase, scope: Scope) {
 const token = crypto.randomUUID(), key = 'planId' in scope ? 'plan:' + scope.planId : 'job:' + scope.jobId
 const wrapped = new WeakMap<object, { statement: D1Statement; query: string }>()
 const wrap = (statement: D1Statement, query: string): D1Statement => {
  const proxy = new Proxy(statement, { get(target, property) {
   if (property === 'bind') return (...values: unknown[]) => wrap(target.bind(...values), query)
   const value = Reflect.get(target, property, target)
   return typeof value === 'function' ? value.bind(target) : value
  } })
  wrapped.set(proxy, { statement, query }); return proxy
 }
 const where = 'planId' in scope ? 'plan_id=?' : 'job_id=?', id = 'planId' in scope ? scope.planId : scope.jobId
 const resumable = 'planId' in scope ? "'active','idle'" : "'active','idle','failed'"
 let touched = false
 const database: ImportDatabase = {
  prepare(query) { return wrap(db.prepare(query), query) },
  async batch(statements) {
   const queries = statements.map(statement => wrapped.get(statement)), native = statements.map((statement, index) => queries[index]?.statement ?? statement)
   if (!queries.some(query => query && /\b(?:INSERT\s+INTO|UPDATE)\s+ik_jobs\b/i.test(query.query))) return db.batch(native)
   const accepted = 'planId' in scope
    ? db.prepare(`INSERT OR IGNORE INTO oc_import_lifecycle(job_key,plan_id,job_id,state,accepted_at,updated_at)
      SELECT ?,p.id,j.id,'idle',${nowSql},${nowSql} FROM ik_door_plans p LEFT JOIN ik_jobs j ON j.operation_key='door:'||p.id WHERE p.id=?`).bind(key, id)
    : db.prepare(`INSERT OR IGNORE INTO oc_import_lifecycle(job_key,job_id,state,accepted_at,updated_at)
      SELECT ?,id,'idle',${nowSql},${nowSql} FROM ik_jobs WHERE id=?`).bind(key, id)
   const guard = db.prepare(`INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN EXISTS
    (SELECT 1 FROM oc_import_lifecycle WHERE ${where} AND state IN (${resumable})
     AND (lease_token IS NULL OR lease_token=?) AND (lease_expires IS NULL OR lease_expires>${nowSql})) THEN 1 ELSE 0 END`).bind(id, token)
   const lease = db.prepare(`UPDATE oc_import_lifecycle SET state='active',reason_code=NULL,lease_token=?,lease_expires=${nowSql}+?,updated_at=${nowSql} WHERE ${where}`).bind(token, LEASE_MS, id)
   const failed = queries.some(query => query && /\bUPDATE\s+ik_jobs\s+SET\s+state='failed'/i.test(query.query))
   if (failed) auditOutcome(db as unknown as D1Database, 'failed')
   let result: unknown[]
   try { result = await db.batch([accepted, guard, lease, ...native]) }
   finally { if (failed) auditOutcome(db as unknown as D1Database) }
   touched = true
   return result.slice(3)
  },
 }
 return { database, async finish(success: boolean) {
  if (!touched) return
  // A lost response after a native commit is conservatively uncertain. Keep
  // its active lease so status can publish one durable interrupted outcome.
  if (!success) return
  await expireInterruptedImports(db)
  await db.batch([
   db.prepare(`UPDATE oc_import_lifecycle SET state='idle',lease_token=NULL,lease_expires=NULL,
    updated_at=${nowSql} WHERE ${where} AND state='active' AND lease_token=? AND lease_expires>${nowSql}`).bind(id, token),
   db.prepare(`SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM oc_import_lifecycle WHERE ${where} AND state='interrupted')
    THEN 1 ELSE json('IMPORT_INTERRUPTED_REQUIRES_ROLLBACK') END`).bind(id),
  ])
 } }
}
