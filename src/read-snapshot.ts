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

export async function storeReadSnapshot(db: D1Database) {
  const [check, latest] = (await db.batch<any>([db.prepare(checkQuery), db.prepare(latestQuery)])).map(result => result.results[0])
  const seq = latest?.seq ?? 0
  const follows = check && !check.broken && check.held === check.nonce
  if (follows && seq >= check.seq && seq - check.seq < stale) return { stored: false }
  const read = await readTracked(db)
  const parts = split(JSON.stringify({ seq: read.seq, nonce: read.nonce, tables: read.all() }))
  await db.batch([
    db.prepare('DELETE FROM oc_read_snapshot'),
    ...parts.map((data, part) => db.prepare('INSERT INTO oc_read_snapshot(part,seq,nonce,parts,data) VALUES(?,?,?,?,?)').bind(part, read.seq, read.nonce, parts.length, data)),
  ])
  return { stored: true, parts: parts.length }
}
