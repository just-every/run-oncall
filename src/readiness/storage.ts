import type {Outbox} from '../automation/model';
import type {Incident} from '../family/response-operations/domain';

export function recordRows<T>(result:D1Result<{data:string}>):T[] {
 return result.results.map(row => JSON.parse(row.data) as T);
}

type ReadinessIncident=Pick<Incident,'state'|'alerts'|'manualPage'|'responderRequests'|'sourceRecovery'|'deadlines'|'createdAt'>;
type ReadinessOutbox=Pick<Outbox,'status'|'at'|'leaseUntil'>;

// Match the partitions in the retained-admission indexes. Every row belongs
// to one partition, including older rows with no provider or source value.
export const directEvent = "COALESCE(source NOT LIKE 'email:%' AND source NOT LIKE 'intake:%',0)";
export const routedEvent = "COALESCE(json_extract(data,'$.provider')='native',0)";

// Share the same narrow reads within a report. A source failure still affects
// only the signals that require it.
export function readinessWork(db:D1Database) {
 const incidents=async()=>recordRows<ReadinessIncident>(await db.prepare(`SELECT json_object(
   'state',json_extract(data,'$.state'),'alerts',json_extract(data,'$.alerts'),
   'manualPage',json_extract(data,'$.manualPage'),'responderRequests',json_extract(data,'$.responderRequests'),
   'sourceRecovery',json_extract(data,'$.sourceRecovery'),'deadlines',json_extract(data,'$.deadlines'),
   'createdAt',json_extract(data,'$.createdAt')) AS data FROM oc_incidents`).all<{data:string}>());
 const outbox=async()=>(await db.prepare(`SELECT json_extract(data,'$.status') AS status,json_extract(data,'$.at') AS at,
   json_extract(data,'$.leaseUntil') AS leaseUntil FROM oc_api_outbox
   WHERE json_extract(data,'$.status')<>'sent'`)
   .all<ReadinessOutbox>()).results;
 return {incidents:incidents(),outbox:outbox()};
}

export const newest = (values: (string | null | undefined)[]) => values.filter((v):v is string => !!v).sort().at(-1) ?? null;
export const oldest = (values: (string | null | undefined)[]) => values.filter((v):v is string => !!v).sort()[0] ?? null;
export const age = (at: string | null, now: number) => at === null ? null : Math.max(0, Math.floor((now - Date.parse(at)) / 1000));
