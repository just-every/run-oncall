import { workspaceTables } from './workspace-tables'

// An isolate-local copy of the workspace and paging records. Triggers log every
// change to their tables by key in oc_read_changes (migration 0172), so a repeat
// read costs the control rows and the new log entries, and a changed read also
// the changed rows. A cold isolate starts from oc_read_snapshot, which the
// minute cron keeps within a few hundred entries of the log (read-snapshot.ts).
// Anything the log cannot vouch for (a gap, a '*' break, or a different entry
// where this copy's last one was) is answered by one consistent full read.

export type TrackedRow = Record<string, any> & { _r: number }
type Spec = { columns: string; key: string }
const record: Spec = { columns: 'id,ordinal,data', key: 'id' }
const logged: Record<string, Spec> = {
  ...Object.fromEntries(Object.values(workspaceTables).map(table => [table, record])),
  paging_schedules: { columns: '*', key: 'id' },
  paging_policies: { columns: '*', key: 'service' },
  paging_jobs: { columns: '*', key: 'id' },
  paging_receipts: { columns: '*', key: 'id' },
  paging_callbacks: { columns: '*', key: 'id' },
}
// Read in full every time (one row each); never logged.
const controls = ['workspace_control', 'paging_control'] as const
const ordinalOrder = new Set<string>(Object.values(workspaceTables))
const workspaceReads = Object.values(workspaceTables)
const pagingReads = Object.keys(logged).filter(table => !ordinalOrder.has(table))
// Keep each compound query within D1's SQLite limit while amortizing its
// result metadata across similarly shaped tables in the same read batch.
const tablesPerQuery = 5
const workspaceQueries: string[] = []
for (let start = 0; start < workspaceReads.length; start += tablesPerQuery) {
  workspaceQueries.push(workspaceReads.slice(start, start + tablesPerQuery).map(table =>
    `SELECT '${table}' AS table_name,rowid AS _r,id,ordinal,data FROM ${table}`).join(' UNION ALL '))
}

type Tables = Map<string, Map<string, TrackedRow>>
type Cache = { seq: number; nonce: string | null; tables: Tables; sorted: Map<string, TrackedRow[]> }
type Result = { cache: Cache; extras: D1Result<any>[] }
export type TrackedRead = { seq: number; nonce: string | null; rows(table: string): TrackedRow[]; all(): Record<string, TrackedRow[]>; extras: D1Result<any>[] }
type Entry = { seq: number; tbl: string; pk: unknown; nonce: string }

let current: Cache | undefined

const feedLimit = 1024
// The entry this copy follows, then everything after it.
const feedQuery = `SELECT seq,tbl,pk,nonce FROM oc_read_changes WHERE seq>=? ORDER BY seq LIMIT ${feedLimit + 2}`
export const latestQuery = 'SELECT seq,nonce FROM oc_read_changes ORDER BY seq DESC LIMIT 1'
const controlReads = (db: D1Database) => controls.map(table => db.prepare(`SELECT rowid AS _r,* FROM ${table}`))

const keyed = (rows: TrackedRow[], key: string) => new Map(rows.map(row => [String(row[key]), row]))
const keyOf = (table: string) => logged[table]?.key ?? 'id'
const latest = (result: D1Result<any>) => ({ seq: result.results[0]?.seq ?? 0, nonce: result.results[0]?.nonce ?? null })

function withControls(tables: Tables, results: D1Result<any>[]) {
  controls.forEach((table, i) => tables.set(table, keyed(results[i].results, 'id')))
}

async function full(db: D1Database, extras: D1PreparedStatement[]): Promise<Result> {
  const results = await db.batch<any>([
    db.prepare(latestQuery), ...controlReads(db),
    ...workspaceQueries.map(query => db.prepare(query)),
    ...pagingReads.map(table => db.prepare(`SELECT rowid AS _r,${logged[table].columns} FROM ${table}`)),
    ...extras,
  ])
  const workspaceIndex = 1 + controls.length
  const pagingIndex = workspaceIndex + workspaceQueries.length
  const tables: Tables = new Map(workspaceReads.map(table => [table, new Map()]))
  for (const group of results.slice(workspaceIndex, pagingIndex))
    for (const {table_name, ...row} of group.results)
      tables.get(table_name)!.set(String(row.id), row as TrackedRow)
  pagingReads.forEach((table, i) => tables.set(table, keyed(results[pagingIndex + i].results, keyOf(table))))
  withControls(tables, results.slice(1))
  return { cache: { ...latest(results[0]), tables, sorted: new Map() }, extras: results.slice(pagingIndex + pagingReads.length) }
}

function changed(table: string, keys: unknown[], db: D1Database) {
  const { columns, key } = logged[table]
  const selected = columns === '*' ? 't.*' : columns.split(',').map(column => 't.' + column).join(',')
  return db.prepare(`SELECT t.rowid AS _r,${selected} FROM json_each(?) j JOIN ${table} t ON t.${key}=j.value`).bind(JSON.stringify(keys))
}

/** Entries after this copy's own last one, or undefined when the log cannot vouch for them. */
function following(cache: Cache, rows: Entry[]): Entry[] | undefined {
  const [anchor, ...entries] = rows
  if (anchor?.seq !== cache.seq || anchor.nonce !== cache.nonce) return undefined
  if (entries.length > feedLimit || entries.some(entry => !Object.hasOwn(logged, entry.tbl))) return undefined
  if (entries.length && entries[0].seq !== cache.seq + 1) return undefined
  return entries
}

async function refresh(db: D1Database, cache: Cache, extras: D1PreparedStatement[]): Promise<Result | undefined> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const [feed, ...rest] = await db.batch<any>([db.prepare(feedQuery).bind(cache.seq), ...controlReads(db), ...extras])
    const entries = following(cache, feed.results)
    if (!entries) return undefined
    const tables: Tables = new Map(cache.tables), sorted = new Map(cache.sorted)
    if (!entries.length) {
      withControls(tables, rest)
      for (const table of controls) sorted.delete(table)
      return { cache: { ...cache, tables, sorted }, extras: rest.slice(controls.length) }
    }
    const touched = new Map<string, Map<string, unknown>>()
    for (const { tbl, pk } of entries) {
      const keys = touched.get(tbl) ?? new Map<string, unknown>()
      keys.set(String(pk), pk)
      touched.set(tbl, keys)
    }
    const order = [...touched.keys()], last = entries.at(-1)!
    const [end, ...more] = await db.batch<any>([
      db.prepare(latestQuery), ...controlReads(db),
      ...order.map(table => changed(table, [...touched.get(table)!.values()], db)), ...extras,
    ])
    // Consistent only when nothing was logged after `last` before this batch's own reads.
    if (latest(end).seq !== last.seq || latest(end).nonce !== last.nonce) continue
    withControls(tables, more)
    for (const table of controls) sorted.delete(table)
    order.forEach((table, i) => {
      const rows = new Map(tables.get(table))
      for (const key of touched.get(table)!.keys()) rows.delete(key)
      for (const [key, row] of keyed(more[controls.length + i].results, keyOf(table))) rows.set(key, row)
      tables.set(table, rows)
      sorted.delete(table)
    })
    return { cache: { seq: last.seq, nonce: last.nonce, tables, sorted }, extras: more.slice(controls.length + order.length) }
  }
  return undefined
}

/** The stored copy written by storeReadSnapshot, if it is complete and holds every logged table. */
function stored(parts: { part: number; seq: number; nonce: string | null; parts: number; data: string }[]): Cache | undefined {
  if (!parts.length || parts.length !== parts[0].parts || parts.some((row, i) => row.part !== i || row.seq !== parts[0].seq || row.nonce !== parts[0].nonce)) return undefined
  const value = JSON.parse(parts.map(row => row.data).join(''))
  if (value.seq !== parts[0].seq || value.nonce !== parts[0].nonce || Object.keys(logged).some(table => !Array.isArray(value.tables?.[table]))) return undefined
  const tables: Tables = new Map(Object.keys(logged).map(table => [table, keyed(value.tables[table], keyOf(table))]))
  for (const table of controls) tables.set(table, new Map())
  return { seq: value.seq, nonce: value.nonce, tables, sorted: new Map() }
}

function sortedRows(cache: Cache, table: string) {
  let rows = cache.sorted.get(table)
  if (!rows) {
    rows = [...cache.tables.get(table)!.values()]
    rows.sort(ordinalOrder.has(table) ? (a, b) => a.ordinal - b.ordinal || a._r - b._r : (a, b) => a._r - b._r)
    cache.sorted.set(table, rows)
  }
  return rows
}

/** The workspace and paging rows as of one consistent read, with `extras` run in that same final batch. */
export async function readTracked(db: D1Database, extras: D1PreparedStatement[] = []): Promise<TrackedRead> {
  // A copy that fell too far behind (or a new isolate) tries the stored copy first.
  let result = current && await refresh(db, current, extras)
  if (!result) {
    const [snapshot] = await db.batch<any>([db.prepare('SELECT part,seq,nonce,parts,data FROM oc_read_snapshot ORDER BY part')])
    const start = stored(snapshot.results)
    if (start && start.seq !== current?.seq) result = await refresh(db, start, extras)
  }
  result ??= await full(db, extras)
  const cache = current = result.cache
  return {
    seq: cache.seq, nonce: cache.nonce, extras: result.extras, rows: table => sortedRows(cache, table),
    all: () => Object.fromEntries(Object.keys(logged).map(table => [table, [...cache.tables.get(table)!.values()]])),
  }
}
