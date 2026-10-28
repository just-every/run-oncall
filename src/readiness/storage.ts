/** Narrow read sets keep an unrelated broken collection out of a signal. */
export type ReadinessTable = 'oc_incidents' | 'oc_alerts' | 'oc_api_outbox' | 'oc_triage' | 'oc_business_services' | 'oc_schedule_records' | 'oc_events' | 'oc_intake_receipts' | 'oc_email_receipts';
export async function records<T>(db: D1Database, table: ReadinessTable): Promise<T[]> {
 const result = await db.prepare(`SELECT data FROM ${table} ORDER BY ordinal`).all<{data:string}>();
 return result.results.map(row => JSON.parse(row.data) as T);
}
export const newest = (values: (string | null | undefined)[]) => values.filter((v):v is string => !!v).sort().at(-1) ?? null;
export const oldest = (values: (string | null | undefined)[]) => values.filter((v):v is string => !!v).sort()[0] ?? null;
export const age = (at: string | null, now: number) => at === null ? null : Math.max(0, Math.floor((now - Date.parse(at)) / 1000));
