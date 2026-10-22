import {fail,type State} from '../family/response-operations/domain.ts';
import {assertWorkspaceRevision,selectWorkspaceWhere,selectWorkspaceIds,selectAlertEvidence} from '../workspace-selection.ts';
import type {IntakeSource} from '../intake/model.ts';
import {validateRoutingPreviewInput} from './preview.ts';

/** Readmission identity is durable even when its original receipt has left the
 * recent window. Fetch both before deciding whether this operation is new. */
export async function selectReadmissionReceipts(db:D1Database,state:State,source:string,receipt:unknown,operationId:string) {
 const rows=await selectWorkspaceWhere(db,state,'intakeReceipts',`(id=? AND json_extract(data,'$.source')=?) OR (json_extract(data,'$.source')=? AND json_extract(data,'$.routing.readmission.operationId')=?)`,[typeof receipt==='string'?receipt:'',source,source,operationId]);
 await selectWorkspaceIds(db,state,'intakeReceipts',rows.map(row=>JSON.parse(row.data).id));
}

/** A replay is an explicit protected selection, bounded by the existing 10,000
 * receipt contract. Count in SQL before requesting any selected record bytes. */
export async function selectRoutingPreview(db:D1Database,state:State,source:IntakeSource,input:any) {
 validateRoutingPreviewInput(input);
 let where="json_extract(data,'$.source')=?";
 const values:(string|number|null)[]=[source.id];
 if(input.receiptIds!==undefined){where+=' AND id IN (SELECT value FROM json_each(?))';values.push(JSON.stringify(input.receiptIds));}
 if(input.from){where+=" AND julianday(json_extract(data,'$.acceptedAt'))>=julianday(?)";values.push(new Date(input.from).toISOString());}
 if(input.to){where+=" AND julianday(json_extract(data,'$.acceptedAt'))<=julianday(?)";values.push(new Date(input.to).toISOString());}
 const count=await db.prepare(`SELECT COUNT(*) AS count FROM oc_intake_receipts WHERE ${where}`).bind(...values).first<{count:number}>();
 if((count?.count??0)>10000)fail('Replay supports at most 10,000 receipts');
 await selectWorkspaceWhere(db,state,'intakeReceipts',where,values);
 const active=await selectWorkspaceWhere(db,state,'alerts',"json_extract(data,'$.source')=? AND json_extract(data,'$.state')='active'",['intake:'+source.id]);
 const alertIds=active.map(row=>JSON.parse(row.data).id);
 if(alertIds.length) {
  await selectWorkspaceWhere(db,state,'intakeReceipts',`id IN (SELECT id FROM (
   SELECT id,ROW_NUMBER() OVER(PARTITION BY json_extract(data,'$.alert') ORDER BY ordinal DESC,id DESC) AS rank
   FROM oc_intake_receipts WHERE json_extract(data,'$.source')=? AND json_extract(data,'$.action')='trigger' AND json_extract(data,'$.alert') IN (SELECT value FROM json_each(?))
  ) WHERE rank=1)`,[source.id,JSON.stringify(alertIds)]);
  await selectAlertEvidence(db,state,alertIds);
 }
 await assertWorkspaceRevision(db,state);
}
