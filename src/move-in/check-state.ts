export const snapshotHeld = (plan: string) =>
 `EXISTS(SELECT 1 FROM ik_door_plan_chunks WHERE plan_id=${plan})`

export type ImportCheckState = 'pending' | 'withdrawn' | null

// Erasure withdraws the snapshot even if a successful check already removed the marker.
export const journalCheckState = `(SELECT CASE
 WHEN NOT ${snapshotHeld('d.id')} THEN 'withdrawn'
 WHEN EXISTS(SELECT 1 FROM move_in_previews v WHERE v.plan_id=d.id) THEN 'pending' END
 FROM ik_door_plans d WHERE d.job_id=j.id AND j.state='completed')`
