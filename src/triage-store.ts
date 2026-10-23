import { refreshBusinessStatus } from './business-status/model';
import { auditOutcome, setAuditSubject } from './audit-store'
import { fail, type State } from './family/response-operations/domain';
import { checkWorkspaceSize } from './workspace-store';

/** One independent incident + receipt transaction, without rewriting other entities. */
export async function saveTriageItem(db: D1Database, state: State, revision: number, operationId: string,
  incidentId: string | undefined, authority: {sql: string; values: (string | number | null)[]}) {
  refreshBusinessStatus(state);
  state.revision = revision + 1;
  checkWorkspaceSize(state);
  const token = crypto.randomUUID(), gate = 'EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)';
  const operation = state.triage!.find(r => r.id === operationId)!;
  const incident = state.incidents.find(i => i.id === incidentId);
  const statements = [db.prepare(`UPDATE workspace_control SET revision=?,write_token=? WHERE id=1 AND revision=? AND ${authority.sql} AND EXISTS(SELECT 1 FROM oc_triage WHERE id=?)${incidentId ? ' AND EXISTS(SELECT 1 FROM oc_incidents WHERE id=?)' : ''}`)
    .bind(state.revision, token, revision, ...authority.values, operationId, ...(incidentId ? [incidentId] : []))];
  if (incident) statements.push(db.prepare(`UPDATE oc_incidents SET data=? WHERE id=? AND ${gate}`).bind(JSON.stringify(incident), incident.id, token));
  // Bulk coordination uses this narrower transaction instead of workspaceWrite.
  // Persist every newly frozen recipient outcome with its incident and receipt.
  if (incident) for (const [ordinal, event] of (state.apiOutbox ?? []).entries()) {
    if (event.incident === incident.id && event.entry === incident.timeline.at(-1)?.id)
      statements.push(db.prepare(`INSERT INTO oc_api_outbox(id,ordinal,data) SELECT ?,?,? WHERE ${gate}`).bind(event.id, ordinal, JSON.stringify(event), token));
  }
  for (const [ordinal, business] of (state.businessServices ?? []).entries()) statements.push(db.prepare(`UPDATE oc_business_services SET ordinal=?,data=? WHERE id=? AND ${gate}`).bind(ordinal,JSON.stringify(business),business.id,token));
  statements.push(db.prepare(`UPDATE oc_triage SET data=? WHERE id=? AND ${gate}`).bind(JSON.stringify(operation), operationId, token));
  const item=operation.kind==='bulk'?operation.results.at(-1):undefined;
  setAuditSubject(db,'entity',incidentId??item?.id??operationId);
  auditOutcome(db,item?.ok===false?'refused':undefined);
  try {
    const result = await db.batch(statements);
    if (result[0].meta.changes !== 1) fail('Workspace or authority changed. Replay the same operation to inspect committed outcomes.', 409);
  } finally { auditOutcome(db); }
}
