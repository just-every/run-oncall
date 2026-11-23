export const snapshotHeld = (plan: string) =>
 `EXISTS(SELECT 1 FROM ik_door_plan_chunks WHERE plan_id=${plan})`

export type ImportCheckState = 'pending' | 'withdrawn' | null

// The same retained marker drives both journal readers and the adoption gate.
export const journalCheckState = `(SELECT CASE WHEN ${snapshotHeld('d.id')} THEN 'pending' ELSE 'withdrawn' END
 FROM ik_door_plans d JOIN move_in_previews v ON v.plan_id=d.id WHERE d.job_id=j.id AND j.state='completed')`
