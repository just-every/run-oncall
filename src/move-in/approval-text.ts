// One readable sentence for a journal's approval: who, in words, and when, in a person's date.
// The fingerprint and approval record stay on the job's `door` data for the apply path; nobody reads them.
const when = (value: string) => Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-US', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC'}).format(new Date(value)) + ' UTC'
  : value

export async function approvalText(db: D1Database, entry: {owner: string; approvedAt: string; approvalRecordId: string; reviewer: string; failureCode?: unknown}): Promise<string> {
  const person = await db.prepare('SELECT display_name FROM oa_operators WHERE lower(email)=lower(?) LIMIT 1').bind(entry.owner).first<{display_name: string}>().catch(() => null)
  const via = entry.reviewer === entry.approvalRecordId ? ' through Business' : ''
  return `Approved${via} by ${person?.display_name || entry.owner} on ${when(entry.approvedAt)}${entry.failureCode ? '; the import then failed and needs a new preview' : ''}.`
}
