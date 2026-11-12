import {fail} from '../family/response-operations/domain'
import type {IntakeSource} from './model'

/** An undone or replaced import fences both incumbent and replacement keys.
 * This predicate also joins the admission transaction, so undo cannot race a
 * credential lookup into admitting another event. */
export function importBinding(source:IntakeSource) {
 if(!source.imported)return {sql:'1=1',values:[] as (string|number|null)[]}
 return {sql:`EXISTS(SELECT 1 FROM move_in_objects o JOIN ik_provenance p ON p.target_kind=o.kind AND p.target_id=o.id JOIN ik_jobs j ON j.id=p.job_id
  WHERE o.kind='integration' AND o.id=? AND o.revision=? AND json_extract(o.data,'$.intakeSource')=?
  AND p.destination='oncall' AND p.reversed=0 AND json_extract(p.record_json,'$.appliedRevision')=o.revision AND j.state='completed')`,values:[source.imported.id,source.imported.revision,source.id]}
}

/** Native creation must not occupy an imported key's reserved review identity. */
export function unreservedImport(id:string) {
 return {sql:"NOT EXISTS(SELECT 1 FROM move_in_objects WHERE kind='integration' AND json_extract(data,'$.intakeSource')=?)",values:[id]}
}
export async function requireUnreservedImport(db:D1Database,id:string) {
 const guard=unreservedImport(id)
 if(!await db.prepare('SELECT 1 AS ok WHERE '+guard.sql).bind(...guard.values).first()) {
  fail('Use the imported integration review and activation door for this identity',409)
 }
 return guard
}
