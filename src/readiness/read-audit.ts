// A generated readiness report is an authorized, zero-write observation even
// when a source is unavailable (HTTP 503). Auditing that partial read would
// itself depend on workspace_control and hide every independent observation
// during a control-table outage. Permission denials retain ordinary read audit.
const reports=new WeakSet<D1Database>();
export function markReadinessReport(db:D1Database){reports.add(db);}
export function isReadinessReport(db:D1Database){return reports.has(db);}
