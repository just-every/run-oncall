import { fail } from '../family/response-operations/domain'
import { maxReplays, outboxStates, type OutboxOperation, type OutboxState } from './types.ts'

type Row = { id: string; rev: number; data: string }
export type StoredOperation = { operation: OutboxOperation; rev: number }
export const parseRow = (row: Row): StoredOperation => ({ operation: JSON.parse(row.data) as OutboxOperation, rev: row.rev })
const gate = 'EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)'

export async function loadOutbox(db: D1Database): Promise<OutboxOperation[]> {
  const rows = (await db.prepare('SELECT id,rev,data FROM oc_outbox ORDER BY ordinal').all<Row>()).results
  return rows.map(row => parseRow(row).operation)
}
export async function getOperation(db: D1Database, id: string): Promise<StoredOperation | null> {
  const row = await db.prepare('SELECT id,rev,data FROM oc_outbox WHERE id=?').bind(id).first<Row>()
  return row ? parseRow(row) : null
}
export async function listOperations(db: D1Database, state: string | undefined, before: number | undefined, limit: number) {
  if (state !== undefined && !outboxStates.includes(state as OutboxState)) fail('Unknown outbox state')
  const rows = (await db.prepare(`SELECT id,rev,data,ordinal FROM oc_outbox WHERE (?1 IS NULL OR state=?1) AND (?2 IS NULL OR ordinal<?2) ORDER BY ordinal DESC LIMIT ?3`)
    .bind(state ?? null, before ?? null, limit + 1).all<Row & { ordinal: number }>()).results
  return { rows: rows.slice(0, limit).map(row => ({ ...parseRow(row), ordinal: row.ordinal })), more: rows.length > limit }
}
export async function outboxCounts(db: D1Database) {
  const rows = (await db.prepare('SELECT state,COUNT(*) AS n FROM oc_outbox GROUP BY state').all<{ state: string; n: number }>()).results
  return Object.fromEntries(outboxStates.map(state => [state, rows.find(row => row.state === state)?.n ?? 0]))
}
/** The row mirrors of a transition: one function keeps state, due time and lease columns equal to the stored operation. */
export function columns(operation: OutboxOperation) {
  return [operation.state, operation.dueAt, operation.leaseExpiresAt, operation.started ? 1 : 0, JSON.stringify(operation)] as const
}
/** One guarded transition. Zero changes means another worker, a replay or a restore won the revision. */
export async function transition(db: D1Database, id: string, rev: number, operation: OutboxOperation, expect?: readonly OutboxState[]) {
  const [state, dueAt, lease, started, data] = columns(operation)
  const result = await db.prepare(`UPDATE oc_outbox SET state=?,due_at=?,lease_expires=?,started=?,data=?,rev=rev+1 WHERE id=? AND rev=?${expect ? ` AND state IN (${expect.map(() => '?').join(',')})` : ''}`)
    .bind(state, dueAt, lease, started, data, id, rev, ...(expect ?? [])).run()
  return result.meta.changes === 1
}
export function replayed(operation: OutboxOperation, by: string, reason: string, at: Date): OutboxOperation {
  if (operation.state === 'queued' || operation.state === 'sending') fail('This delivery is already queued or in flight', 409)
  if (operation.replays >= maxReplays) fail('This delivery reached its replay limit', 409)
  return { ...operation, state: 'queued', dueAt: at.getTime(), leaseExpiresAt: null, started: false, attempts: 0, replays: operation.replays + 1,
    authorizedBy: { kind: 'member', id: by }, reason: undefined,
    history: [...operation.history, { at: at.toISOString(), attempt: operation.attempts, outcome: 'replay', status: null, by, reason }].slice(-20) }
}

/** Archive restore: replace the whole table with the archive's history. The caller has already held every unfinished operation. */
export function restoreStatements(db: D1Database, operations: OutboxOperation[], token: string): D1PreparedStatement[] {
  return [
    db.prepare(`DELETE FROM oc_outbox WHERE ${gate}`).bind(token),
    db.prepare(`INSERT INTO oc_outbox(id,ordinal,endpoint,event_id,rev,state,due_at,lease_expires,started,data) SELECT json_extract(value,'$.id'),CAST(key AS INTEGER)+1,json_extract(value,'$.endpoint'),json_extract(value,'$.eventId'),1,json_extract(value,'$.state'),json_extract(value,'$.dueAt'),json_extract(value,'$.leaseExpiresAt'),0,value FROM json_each(?) WHERE ${gate}`)
      .bind(JSON.stringify(operations), token),
  ]
}
