import { auditedDatabase } from '../audit-database'
import type { AuditContext } from '../audit-store'
import type { Bindings } from '../auth.server'
import { dispatchOutbox } from './dispatch'

/** Delivery after a committed change. A failure here leaves every operation queued, due and visible; it never alters the change that was accepted. */
export async function deliverInBackground(env: Bindings) {
  const context: AuditContext = { feature: 'outbox', kind: 'outbox.dispatch', actor: { kind: 'service', id: 'outbox' }, source: { kind: 'door', id: 'outbox' }, commits: 0, storageFailed: false }
  try { await dispatchOutbox(auditedDatabase(env.DB, context).db, env) }
  catch (error) { console.error('oncall outbox delivery failure', error instanceof Error ? error.name : 'Error') }
}
