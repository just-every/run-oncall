/** Run these statements inside the restore publication transaction, after rows
 * are installed. Their old leases carry no authority in the new installation. */
export const interruptRestoredImports = [
 `INSERT OR IGNORE INTO oc_import_lifecycle(job_key,job_id,plan_id,state,accepted_at,updated_at,reason_code)
  SELECT 'job:'||j.id,j.id,p.id,'interrupted',unixepoch()*1000,unixepoch()*1000,'import_interrupted_restore'
  FROM ik_jobs j LEFT JOIN ik_door_plans p ON j.operation_key='door:'||p.id WHERE j.state IN ('queued','applying')`,
 `UPDATE oc_import_lifecycle SET state='interrupted',lease_token=NULL,lease_expires=NULL,
  updated_at=unixepoch()*1000,reason_code='import_interrupted_restore'
  WHERE job_id IN (SELECT id FROM ik_jobs WHERE state IN ('queued','applying'))`,
 `INSERT OR IGNORE INTO ik_door_apply_failures(plan_id,reason_code)
  SELECT plan_id,reason_code FROM oc_import_lifecycle WHERE state='interrupted' AND plan_id IS NOT NULL`,
 `UPDATE ik_jobs SET state='failed',error='import_interrupted_restore',fence=fence+1,lease_token=NULL,lease_expires=NULL
  WHERE state IN ('queued','applying')`,
]
