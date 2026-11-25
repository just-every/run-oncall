import { latestQuery, readTracked } from './read-cache'

// The minute cron keeps the stored copy a cold reader starts from close to the
// change log, so a cold read costs the copy's parts and at most `stale` entries
// instead of every stored row. The check reads a few indexed rows; the copy is
// rewritten only when the log has moved on or no longer follows from it.
const stale = 256
// UTF-16 code units per part: at most three UTF-8 bytes each, under D1's 2 MB row.
const partSize = 400_000

const checkQuery = `SELECT h.seq,h.nonce,(SELECT nonce FROM oc_read_changes WHERE seq=h.seq) AS held,
 EXISTS(SELECT 1 FROM oc_read_changes WHERE tbl='*' AND seq>h.seq) AS broken
 FROM oc_read_snapshot h WHERE h.part=0`

// The erasure transaction clears the snapshot and logs changes to its rows.
// Guard both the delete and every insert in the same atomic D1 batch, so a
// rewrite computed before that transaction cannot put erased data back.
const sameHead = `(?,?) = (${latestQuery})`

function split(text: string) {
  const parts: string[] = []
  for (let start = 0; start < text.length;) {
    let end = Math.min(text.length, start + partSize)
    // Never split a surrogate pair: D1 keeps each part as UTF-8 text.
    if (end < text.length && /[\ud800-\udbff]/.test(text[end - 1])) end--
    parts.push(text.slice(start, end))
    start = end
  }
  return parts
}

async function rewrite(db: D1Database) {
  const read = await readTracked(db)
  const parts = split(JSON.stringify({ seq: read.seq, nonce: read.nonce, tables: read.all() }))
  const head = [read.seq, read.nonce]
  const [, firstPart] = await db.batch([
    db.prepare(`DELETE FROM oc_read_snapshot WHERE ${sameHead}`).bind(...head),
    ...parts.map((data, part) => db.prepare(`INSERT INTO oc_read_snapshot(part,seq,nonce,parts,data)
      SELECT ?,?,?,?,? WHERE ${sameHead}`).bind(part, ...head, parts.length, data, ...head)),
  ])
  return firstPart.meta.changes ? parts.length : 0
}

export async function storeReadSnapshot(db: D1Database) {
  const [check, latest] = (await db.batch<any>([db.prepare(checkQuery), db.prepare(latestQuery)])).map(result => result.results[0])
  const seq = latest?.seq ?? 0
  const follows = check && !check.broken && check.held === check.nonce
  if (follows && seq >= check.seq && seq - check.seq < stale) return { stored: false }
  // Retry once with fresh rows. If writes keep moving the head, the next cron
  // checks again and rebuilds immediately when erasure has cleared the table.
  const parts = await rewrite(db) || await rewrite(db)
  return parts ? { stored: true, parts } : { stored: false }
}
