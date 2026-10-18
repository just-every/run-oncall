import type { ImportMapping, ImportPlan, SourceBundle, TargetEffect } from '../modules/import-kit/src/types'
import { Fault } from '../family/response-operations/domain'

/** A move-in refusal: a sentence naming the people or schedules involved, with the kit's code kept in its own field. */
export class Refusal extends Fault {
 code: string
 constructor(status: number, message: string, code: string) { super(status, message); this.code = code }
}

const list = (names: string[]) => names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
const object = (kind: string, id: string) => kind === 'user' ? id : `${kind} ${id}`

/** DUPLICATE_TARGET: two source records become the same Oncall object; name both records and the object they share. Null when no two do. */
export function duplicateTargets(source: SourceBundle, mapping: ImportMapping) {
 const claims = new Map<string, { kind: string; id: string; records: string[] }>()
 for (const record of source.records) {
  const value = record.payload as any, contact = value?.email ?? value?.username
  const label = `${value?.fullName ?? value?.name ?? record.sourceId}${contact ? ` (${contact})` : ''}`
  for (const effect of mapping.map(record).effects) {
   const key = `${effect.targetKind}\u0000${effect.targetId}`, claim = claims.get(key) ?? { kind: effect.targetKind, id: effect.targetId, records: [] }
   claim.records.push(label); claims.set(key, claim)
  }
 }
 const clashes = [...claims.values()].filter(claim => claim.records.length > 1)
 if (!clashes.length) return null
 return new Refusal(400, `${clashes.map(c => `${list(c.records)} both become ${object(c.kind, c.id)}`).join('; ')}. Oncall matches people by email ignoring case and schedules by id, so it cannot tell them apart; give each a distinct email, or remove one, and preview again. Nothing was written.`, 'DUPLICATE_TARGET')
}

// A door import's kit job keeps an internal namespace (door:<hash>); its door plan names the vendor.
type Held = { kind: string; id: string; job: string; namespace: string }
async function holders(db: D1Database, effects: TargetEffect[], job?: string): Promise<Held[]> {
 const wanted = JSON.stringify(effects.map(e => [e.targetKind, e.targetId]))
 const rows = await db.prepare(`SELECT p.target_kind AS kind,p.target_id AS id,p.job_id AS job,COALESCE((SELECT d.namespace FROM ik_door_plans d WHERE d.job_id=j.id OR 'door:'||d.id=j.operation_key LIMIT 1),j.namespace) AS namespace FROM ik_provenance p JOIN ik_jobs j ON j.id=p.job_id WHERE p.destination='oncall' AND p.reversed=0 AND p.job_id IS NOT ? AND EXISTS(SELECT 1 FROM json_each(?) w WHERE json_extract(w.value,'$[0]')=p.target_kind AND json_extract(w.value,'$[1]')=p.target_id) ORDER BY p.target_kind,p.target_id`).bind(job ?? null, wanted).all<Held>()
 return rows.results
}
const vendorName = (namespace: string) => namespace === 'pagerduty' ? 'PagerDuty' : namespace === 'opsgenie' ? 'Opsgenie' : namespace

/** TARGET_REVISION_CONFLICT: the file brings people or schedules an earlier import already put in Oncall; name them and that import.
 * A catch-up's replacements carry the revision their own import wrote, so only new objects are checked. Null when nothing is held. */
export async function alreadyImported(db: D1Database, plan: ImportPlan, vendor: string, job?: string) {
 const held = await holders(db, plan.entries.flatMap(entry => entry.effects).filter(effect => effect.expectedRevision === undefined), job)
 if (!held.length) return null
 const imports = [...new Set(held.map(h => `the ${vendorName(h.namespace)} import ${h.job}`))]
 return new Refusal(409, `${list(held.map(h => object(h.kind, h.id)))} ${held.length > 1 ? 'are' : 'is'} already in Oncall from ${list(imports)}. Undo that import, or erase ${held.length > 1 ? 'those people' : 'that person'}, before bringing ${held.length > 1 ? 'them' : 'it'} in again from ${vendorName(vendor)}. Nothing from this file was written.`, 'TARGET_REVISION_CONFLICT')
}

/** NATIVE_EDIT_CONFLICT on undo: name what changed in Oncall after the import, which undo would otherwise overwrite. Null when nothing did. */
export async function changedSinceImport(db: D1Database, job: string) {
 const rows = await db.prepare(`SELECT p.target_kind AS kind,p.target_id AS id,json_extract(o.data,'$.adopted') IS NOT NULL AS adopted FROM ik_provenance p LEFT JOIN move_in_objects o ON o.kind=p.target_kind AND o.id=p.target_id WHERE p.job_id=? AND p.reversed=0 AND (o.id IS NULL OR o.revision IS NOT json_extract(p.record_json,'$.appliedRevision')) ORDER BY p.target_kind,p.target_id`).bind(job).all<{ kind: string; id: string; adopted: number }>()
 // An adopted schedule is a permanent native edit: the app offers no way to put it back.
 const adopted = rows.results.filter(r => r.adopted)
 if (adopted.length) return new Refusal(409, `${list(adopted.map(r => object(r.kind, r.id)))} ${adopted.length > 1 ? 'were' : 'was'} made live, so this import can no longer be undone; nothing was undone. The paused source stays as evidence.`, 'NATIVE_EDIT_CONFLICT')
 const changed = rows.results.map(r => object(r.kind, r.id))
 if (!changed.length) return null
 return new Refusal(409, `${list(changed)} changed in Oncall after this import, so undoing it would overwrite ${changed.length > 1 ? 'those changes' : 'that change'}; nothing was undone. Put ${changed.length > 1 ? 'them' : 'it'} back as imported, or keep the import.`, 'NATIVE_EDIT_CONFLICT')
}
