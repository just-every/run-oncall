import {auditOutcome,setAuditSubject} from './audit-store';
import {fail,type State} from './family/response-operations/domain';
import {workspaceWrite} from './workspace-store';
/** One item and its receipt share a CAS transaction. Snapshot inheritance keeps
 * multi-incident merges and alert writes incremental, including their history. */
export async function saveTriageItem(db:D1Database,state:State,revision:number,operationId:string,incidentId:string|undefined,authority:{sql:string;values:(string|number|null)[]}){
 const operation=state.triage!.find(r=>r.id===operationId)!,item=operation.kind==='bulk'?operation.results.at(-1):undefined;
 setAuditSubject(db,'entity',incidentId??item?.id??operationId);auditOutcome(db,item?.ok===false?'refused':undefined);
 try{
  const result=await db.batch(workspaceWrite(db,state,revision,{sql:authority.sql+' AND EXISTS(SELECT 1 FROM oc_triage WHERE id=?)',values:[...authority.values,operationId]}));
  if(result[0].meta.changes!==1)fail('Workspace or authority changed. Replay the same operation to inspect committed outcomes.',409);
 }finally{auditOutcome(db);}
}
