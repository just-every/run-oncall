import type { ImportMapping, ImportPlan, SourceBundle, TargetEffect } from '../modules/import-kit/src/types'
import { Fault } from '../family/response-operations/domain'

/** A move-in refusal: a sentence naming the people or schedules involved, with the kit's code kept in its own field. */
export class Refusal extends Fault {
 code: string
 constructor(status: number, message: string, code: string, public details?: unknown) { super(status, message); this.code = code }
}

const list = (names: string[]) => names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
const cap = (text: string) => text[0].toUpperCase() + text.slice(1)
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
type Held = { kind: string; id: string; job: string; namespace: string; live: number; name: string | null }
async function holders(db: D1Database, effects: TargetEffect[], job?: string): Promise<Held[]> {
 const wanted = JSON.stringify(effects.map(e => [e.targetKind, e.targetId]))
 // live: one of this import's schedules was made live, which no undo can take back.
 const rows = await db.prepare(`SELECT p.target_kind AS kind,p.target_id AS id,p.job_id AS job,COALESCE((SELECT d.namespace FROM ik_door_plans d WHERE d.job_id=j.id OR 'door:'||d.id=j.operation_key LIMIT 1),j.namespace) AS namespace,
  EXISTS(SELECT 1 FROM ik_provenance q JOIN move_in_objects o ON o.kind=q.target_kind AND o.id=q.target_id WHERE q.job_id=p.job_id AND q.reversed=0 AND json_extract(o.data,'$.adopted') IS NOT NULL) AS live,
  (SELECT COALESCE(json_extract(n.data,'$.schedule.name'),json_extract(n.data,'$.name')) FROM move_in_objects n WHERE n.kind=p.target_kind AND n.id=p.target_id) AS name
  FROM ik_provenance p JOIN ik_jobs j ON j.id=p.job_id WHERE p.destination='oncall' AND p.reversed=0 AND p.job_id IS NOT ? AND EXISTS(SELECT 1 FROM json_each(?) w WHERE json_extract(w.value,'$[0]')=p.target_kind AND json_extract(w.value,'$[1]')=p.target_id) ORDER BY p.target_kind,p.target_id`).bind(job ?? null, wanted).all<Held>()
 return rows.results
}
const vendorName = (namespace: string) => namespace === 'pagerduty' ? 'PagerDuty' : namespace === 'opsgenie' ? 'Opsgenie' : namespace

/** The objects in this plan that an earlier import already holds, for flagging them in the preview. */
export async function heldObjects(db: D1Database, plan: ImportPlan, job?: string) {
 return (await holders(db, plan.entries.flatMap(entry => entry.effects).filter(effect => effect.expectedRevision === undefined), job)).map(h => ({ kind: h.kind, id: h.id }))
}

/** TARGET_REVISION_CONFLICT: the file brings people or schedules an earlier import already put in Oncall; name them and that import
 * by its provider and file, and give the way out that still works. A catch-up's replacements carry the revision their own import
 * wrote, so only new objects are checked. Null when nothing is held. `files` names an import's saved files; the preview and the
 * refusal share this sentence so the owner hears it before confirming. */
export async function alreadyImported(db: D1Database, plan: ImportPlan, vendor: string, job?: string, files?: (job: string, namespace: string) => Promise<string | null>) {
 const held = await holders(db, plan.entries.flatMap(entry => entry.effects).filter(effect => effect.expectedRevision === undefined), job)
 if (!held.length) return null
 const jobs = [...new Map(held.map(h => [h.job, h])).values()]
 const named = await Promise.all(jobs.map(async h => { const file = await files?.(h.job, h.namespace) ?? null; return { ...h, text: `the ${vendorName(h.namespace)} import${file ? ` of ${file}` : ''}` } }))
 const many = held.length > 1, live = named.filter(h => h.live), undoable = named.filter(h => !h.live)
 const erase = `erase ${many ? 'those people' : 'that person'} under Settings → Archive → Erase someone’s data`
 const way = !live.length ? `Undo that import in Saved import journal, or ${erase}`
  : !undoable.length ? `${cap(list(live.map(h => h.text)))} ${live.length > 1 ? 'have' : 'has'} a schedule that is already live, so ${live.length > 1 ? 'they' : 'it'} can no longer be undone. ${cap(erase)}`
  : `Undo ${list(undoable.map(h => h.text))} in Saved import journal; ${list(live.map(h => h.text))} can no longer be undone because ${live.length > 1 ? 'their schedules are' : 'its schedule is'} live, so ${erase}`
 return new Refusal(409, `${list(held.map(h => h.kind !== 'user' && h.name ? `${h.kind === 'policy' ? 'escalation policy' : h.kind} “${h.name}”` : object(h.kind, h.id)))} ${many ? 'are' : 'is'} already in Oncall from ${list(named.map(h => h.text))}. ${way}, before bringing ${many ? 'them' : 'it'} in again from ${vendorName(vendor)}. Nothing from this file was written.`, 'TARGET_REVISION_CONFLICT')
}

/** NATIVE_EDIT_CONFLICT on undo: name what changed in Oncall after the import, which undo would otherwise overwrite. Null when nothing did. */
export async function changedSinceImport(db: D1Database, job: string) {
 const rows = await db.prepare(`SELECT p.target_kind AS kind,p.target_id AS id,COALESCE(json_extract(o.data,'$.schedule.name'),json_extract(o.data,'$.name')) AS name,json_extract(o.data,'$.adopted') IS NOT NULL AS adopted FROM ik_provenance p LEFT JOIN move_in_objects o ON o.kind=p.target_kind AND o.id=p.target_id WHERE p.job_id=? AND p.reversed=0 AND (o.id IS NULL OR o.revision IS NOT json_extract(p.record_json,'$.appliedRevision')) ORDER BY p.target_kind,p.target_id`).bind(job).all<{ kind: string; id: string; name: string | null; adopted: number }>()
 // An adopted schedule is a permanent native edit: the app offers no way to put it back.
 const label = (row: { kind: string; id: string; name: string | null }) => row.name ? `${row.kind === 'user' ? 'Person' : row.kind[0].toUpperCase()+row.kind.slice(1)} “${row.name}”` : object(row.kind, row.id)
 const adopted = rows.results.filter(r => r.adopted)
 if (adopted.length) return new Refusal(409, `${list(adopted.map(label))} ${adopted.length > 1 ? 'were' : 'was'} made live, so this import can no longer be undone; nothing was undone. The paused source stays as evidence.`, 'NATIVE_EDIT_CONFLICT', {objects: adopted})
 const changed = rows.results.map(r => object(r.kind, r.id))
 if (!changed.length) return null
 return new Refusal(409, `${list(changed)} changed in Oncall after this import, so undoing it would overwrite ${changed.length > 1 ? 'those changes' : 'that change'}; nothing was undone. Put ${changed.length > 1 ? 'them' : 'it'} back as imported, or keep the import.`, 'NATIVE_EDIT_CONFLICT')
}

/** IMPORT_SUPERSEDED on undo: a later import (an owner catch-up, say) replaced records this one wrote, so this one
 * undoes only after it; name that import by vendor and journal id. Null when no later import holds this one's records. */
export async function supersededBy(db: D1Database, job: string) {
 const rows = await db.prepare(`SELECT DISTINCT s.job_id AS job,COALESCE((SELECT d.namespace FROM ik_door_plans d WHERE d.job_id=j.id OR 'door:'||d.id=j.operation_key LIMIT 1),j.namespace) AS namespace
  FROM ik_d1_history h JOIN (SELECT id,job_id FROM ik_provenance UNION ALL SELECT id,job_id FROM ik_d1_history) s ON s.id=h.successor_id JOIN ik_jobs j ON j.id=s.job_id
  WHERE h.job_id=? AND s.job_id<>? ORDER BY s.job_id`).bind(job, job).all<{ job: string; namespace: string }>()
 if (!rows.results.length) return null
 const one = rows.results.length === 1
 return new Refusal(409, `The later ${list(rows.results.map(r => `${vendorName(r.namespace)} import ${r.job}`))} replaced records from this one, so undo ${one ? 'that import' : 'those imports'} first in Saved import journal, then this one; nothing was undone.`, 'IMPORT_SUPERSEDED')
}
