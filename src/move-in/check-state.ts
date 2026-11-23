import { fail } from '../family/response-operations/domain'
import type { DoorRequest } from '../modules/import-kit/src/door/types'

export const snapshotHeld = (plan: string) =>
 `EXISTS(SELECT 1 FROM ik_door_plan_chunks WHERE plan_id=${plan})`

export type ImportCheckState = 'pending' | 'withdrawn' | null

// The same retained marker drives both journal readers and the adoption gate.
export const journalCheckState = `(SELECT CASE WHEN ${snapshotHeld('d.id')} THEN 'pending' ELSE 'withdrawn' END
 FROM ik_door_plans d JOIN move_in_previews v ON v.plan_id=d.id WHERE d.job_id=j.id AND j.state='completed')`

export const markedTargets = `FROM ik_provenance p JOIN ik_door_plans d ON d.job_id=p.job_id
 JOIN move_in_previews v ON v.plan_id=d.id JOIN ik_jobs j ON j.id=p.job_id
 WHERE p.destination='oncall' AND p.reversed=0 AND j.state='completed'`

export const uncheckedTarget = (kind:'schedule'|'integration',id='?') =>
 `SELECT 1 ${markedTargets} AND ${snapshotHeld('d.id')} AND p.target_kind='${kind}' AND p.target_id=${id}`

export const uncheckedBinding = (field:'intakeSource'|'emailAddress') =>
 `SELECT 1 FROM move_in_objects WHERE kind='integration' AND json_extract(data,'$.${field}')=?
 AND EXISTS(${uncheckedTarget('integration','move_in_objects.id')})`

export async function requireIntegrationCheck(db:D1Database,query:string,id:string) {
 if(await db.prepare(query).bind(id).first())fail('Check imported data in the saved journal before activating this integration',409)
}

/** The head compares inherited targets. A replacement matched its predecessor
 * before writing, and Undo can only restore that exact revision. */
export async function clearCheckedLineage({options:{database},access:{installationId,namespace},authority}:DoorRequest,planId:string) {
 await database.batch([database.prepare(`WITH RECURSIVE lineage(id, previous_id) AS (
  SELECT p.id,p.previous_id FROM ik_door_plans p JOIN ik_jobs j ON j.id=p.job_id
  JOIN ik_door_namespaces n ON n.installation_id=p.installation_id AND n.namespace=p.namespace AND n.head_id=p.id
  WHERE p.id=? AND p.installation_id=? AND p.namespace=? AND j.state='completed' AND ${snapshotHeld('p.id')}
  UNION SELECT p.id,p.previous_id FROM ik_door_plans p JOIN lineage l ON l.previous_id=p.id
  WHERE p.installation_id=? AND p.namespace=?
 ) DELETE FROM move_in_previews WHERE plan_id IN (
  SELECT l.id FROM lineage l JOIN ik_door_plans p ON p.id=l.id JOIN ik_jobs j ON j.id=p.job_id
  WHERE j.state='completed' AND ${snapshotHeld('l.id')}
 ) AND (${authority.sql})`).bind(planId,installationId,namespace,installationId,namespace,...authority.params??[])])
}
