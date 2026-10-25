import { hasErasedSubject } from './subject-erasure-identity.ts'
import { hasErasedChange } from './changes/identity.ts'
import { fail, Fault, type State } from './family/response-operations/domain.ts'

// These are the existing portability journal's value-free digests and source
// epochs. The mirror lets every native snapshot carry the same durable fence.
export type ErasureFence = { id: string; epoch: number }
export const syncErasureFences = `INSERT INTO oc_erasure_fences(id,epoch)
 SELECT j.tombstone,MAX(e.epoch) FROM rer_portability_journal j
 JOIN rer_portability_epochs e ON e.source=j.source GROUP BY j.tombstone
 ON CONFLICT(id) DO UPDATE SET epoch=MAX(epoch,excluded.epoch)`
// Older portable installations have the original journal but no mirror rows.
// Read both in the same snapshot; neither custody source may lower the other.
export const erasureFencesQuery = `SELECT id,MAX(epoch) AS epoch FROM (
 SELECT id,epoch FROM oc_erasure_fences
 UNION ALL SELECT j.tombstone AS id,e.epoch FROM rer_portability_journal j
 JOIN rer_portability_epochs e ON e.source=j.source) GROUP BY id`
export const erasureFenceCondition = `NOT EXISTS(SELECT 1 FROM (${erasureFencesQuery}) f
 WHERE NOT EXISTS(SELECT 1 FROM json_each(?) incoming
 WHERE json_extract(incoming.value,'$.id')=f.id AND json_extract(incoming.value,'$.epoch')>=f.epoch))`
export const fenceValues = (state: State) => JSON.stringify(state.erasureFences ?? [])
export async function requireErasureFence(db: D1Database, state: State) {
 // A current fence cannot be used to remove or change an anonymous declaration denominator.
 const lost=await db.prepare(`SELECT 1 FROM oc_erased_report_cases held WHERE NOT EXISTS(
  SELECT 1 FROM json_each(?) incoming WHERE json_extract(incoming.value,'$.id')=held.id
  AND json_extract(incoming.value,'$.service')=json_extract(held.data,'$.service')
  AND json_extract(incoming.value,'$.declaredAt')=json_extract(held.data,'$.declaredAt')) LIMIT 1`).bind(JSON.stringify(state.erasedReportCases??[])).first();
 if(lost)fail('Archive omits or changes an anonymous erased declaration case; refresh the archive. Nothing was replaced.',409)

 if (!(await db.prepare(`SELECT ${erasureFenceCondition} AS allowed`).bind(fenceValues(state)).first<{allowed:number}>())?.allowed || await hasErasedChange(state) || await hasErasedSubject(state))
  throw Object.assign(new Fault(409,'Archive predates the subject erasure fence; use a current archive. Nothing was replaced.'),{code:'subject_erasure_fence'})
}
export function validateErasureFences(value: unknown): asserts value is ErasureFence[] {
 if (!Array.isArray(value) || value.some(row => !row || Object.keys(row).sort().join(',')!=='epoch,id' || typeof row.id!=='string' || !/^[a-f0-9]{64}$/.test(row.id) || !Number.isSafeInteger(row.epoch) || row.epoch<0) || new Set(value.map(row=>row.id)).size!==value.length)
  fail('Invalid subject erasure fence')
}
export function restoreErasureFences(db: D1Database,state: State,token: string) {
 return db.prepare(`INSERT INTO oc_erasure_fences(id,epoch)
  SELECT json_extract(value,'$.id'),json_extract(value,'$.epoch') FROM json_each(?)
  WHERE EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)
  ON CONFLICT(id) DO UPDATE SET epoch=MAX(epoch,excluded.epoch) WHERE excluded.epoch>epoch`).bind(fenceValues(state),token)
}
