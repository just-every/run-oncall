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
