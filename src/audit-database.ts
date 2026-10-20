import { auditTransaction, bindAuditContext, type AuditContext, type AuditOutcome } from './audit-store'

// Only SQL structure is inspected. SQL text, bindings and returned payloads are never audited.
const writes = (sql: string) => /^(?:INSERT|REPLACE|UPDATE|DELETE)\b/i.test(sql.replace(/\/\*[\s\S]*?\*\/|--[^\n]*/g, '').trim())
  || /^WITH\b[\s\S]*\b(?:INSERT|REPLACE|UPDATE|DELETE)\b/i.test(sql)

/** Every application write, including a single-statement run/RETURNING, shares D1's batch rollback. */
export function auditedDatabase(database: D1Database, context: AuditContext) {
  const originals = new WeakMap<object, { statement: D1PreparedStatement; sql: string }>()
  async function batch<T>(statements: D1PreparedStatement[], finalOutcome?: AuditOutcome): Promise<D1Result<T>[]> {
    const entries = statements.map(statement => originals.get(statement) ?? { statement, sql: '' })
    if (!finalOutcome && !entries.some(entry => writes(entry.sql))) return database.batch<T>(entries.map(entry => entry.statement))
    const transaction = auditTransaction(database, context, entries.map(entry => entry.statement), finalOutcome)
    try {
      const result = await database.batch<T>(transaction.statements)
      context.commits++
      return result.slice(transaction.offset, transaction.offset + statements.length)
    } catch (error) {
      context.storageFailed = true
      throw error
    }
  }
  function prepare(sql: string, original = database.prepare(sql)): D1PreparedStatement {
    const statement = new Proxy(original, { get(target, property) {
      if (property === 'bind') return (...values: unknown[]) => prepare(sql, target.bind(...values))
      if (writes(sql)) {
        if (property === 'run' || property === 'all') return async () => (await batch([statement]))[0]
        if (property === 'first') return async (column?: string) => {
          const row = (await batch<Record<string, unknown>>([statement]))[0].results[0] ?? null
          if (column && row && !(column in row)) throw Error('D1_COLUMN_NOTFOUND')
          return column && row ? row[column] : row
        }
        if (property === 'raw') return async (options?: { columnNames?: boolean }) => {
          const rows = (await batch<Record<string, unknown>>([statement]))[0].results
          return [...(options?.columnNames && rows.length ? [Object.keys(rows[0])] : []), ...rows.map(row => Object.values(row))]
        }
      }
      const value = Reflect.get(target, property)
      return typeof value === 'function' ? value.bind(target) : value
    } })
    originals.set(statement, { statement: original, sql })
    return statement
  }
  const db = new Proxy(database, { get(target, property) {
    if (property === 'prepare') return prepare
    if (property === 'batch') return batch
    // New transports must use the same atomic boundary rather than an unaudited session/exec.
    if (property === 'exec' || property === 'withSession') return () => { throw Error('OC_AUDIT_BATCH_REQUIRED') }
    const value = Reflect.get(target, property)
    return typeof value === 'function' ? value.bind(target) : value
  } })
  bindAuditContext(db, context)
  return { db, record: (outcome: AuditOutcome) => batch([], outcome) }
}
