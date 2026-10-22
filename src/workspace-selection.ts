import {fail,type Signal,type State} from './family/response-operations/domain.ts';
import {mergeWorkspaceRows,type WorkspaceRow} from './workspace-store.ts';
import {tables,type Collection} from './workspace-tables.ts';
import {intakeSourceIdentity,type IntakeSource} from './intake/model.ts';
import {evaluateRouting} from './routing/engine.ts';

type Value=string|number|null;
/** These selections extend the original SQL row map as well as the working set.
 * A revision check follows every complete selection, including an empty result. */
export async function assertWorkspaceRevision(db:D1Database,state:State) {
 const control=await db.prepare('SELECT revision FROM workspace_control WHERE id=1').first<{revision:number}>();
 if(!control||control.revision!==state.revision)fail('Workspace changed; retry the request',409);
}
export async function selectWorkspaceWhere(db:D1Database,state:State,key:Collection,where:string,values:Value[]=[]) {
 const rows=(await db.prepare(`SELECT '${key}' AS collection,ordinal,data FROM ${tables[key]} WHERE ${where} ORDER BY ordinal,id`).bind(...values).all<WorkspaceRow>()).results;
 mergeWorkspaceRows(state,rows);return rows;
}
async function ids(db:D1Database,state:State,key:Collection,selected:string[]) {
 if(!selected.length)return;
 await selectWorkspaceWhere(db,state,key,'id IN (SELECT value FROM json_each(?))',[JSON.stringify([...new Set(selected)])]);
}
/** Load boundary/recovery evidence, never an alert's entire event history. */
export async function selectAlertEvidence(db:D1Database,state:State,selected:string[]) {
 if(!selected.length)return;
 const held=JSON.stringify([...new Set(selected)]);
 await selectWorkspaceWhere(db,state,'events',`id IN (
  SELECT json_extract(data,'$.events[0]') FROM oc_alerts WHERE id IN (SELECT value FROM json_each(?))
  UNION SELECT json_extract(data,'$.events[#-1]') FROM oc_alerts WHERE id IN (SELECT value FROM json_each(?))
  UNION SELECT (SELECT e.id FROM json_each(json_extract(a.data,'$.events')) j JOIN oc_events e ON e.id=j.value WHERE json_extract(e.data,'$.intent')='recover' ORDER BY CAST(j.key AS INTEGER) DESC LIMIT 1) FROM oc_alerts a WHERE a.id IN (SELECT value FROM json_each(?))
  UNION SELECT (SELECT e.id FROM json_each(json_extract(a.data,'$.events')) j JOIN oc_events e ON e.id=j.value WHERE COALESCE(json_extract(e.data,'$.urgency.urgency'),CASE WHEN json_extract(e.data,'$.severity')='critical' THEN 'high' ELSE 'low' END)='high' LIMIT 1) FROM oc_alerts a WHERE json_extract(a.data,'$.urgency') IS NULL AND a.id IN (SELECT value FROM json_each(?))
 )`,[held,held,held,held]);
}
async function receiptLinks(db:D1Database,state:State,selected:string[]) {
 const wanted=new Set(selected),receipts=(state.intakeReceipts??[]).filter(r=>wanted.has(r.id));
 await ids(db,state,'alerts',receipts.flatMap(r=>r.alert?[r.alert]:[]));
 await ids(db,state,'events',receipts.flatMap(r=>r.event?[r.event]:[]));
 await ids(db,state,'intakeSources',receipts.map(r=>r.source));
 await selectAlertEvidence(db,state,receipts.flatMap(r=>r.alert?[r.alert]:[]));
}
export async function selectWorkspaceIds(db:D1Database,state:State,key:Collection,selected:string[]) {
 await ids(db,state,key,selected);
 if(key==='alerts')await selectAlertEvidence(db,state,selected);
 if(key==='intakeReceipts')await receiptLinks(db,state,selected);
 await assertWorkspaceRevision(db,state);
}
export async function selectNativeSignals(db:D1Database,state:State,signals:Signal[]) {
 const input=JSON.stringify(signals.map(({source,eventId,service,environment,key,generation})=>({source,eventId,service,environment,key,generation})));
 await selectWorkspaceWhere(db,state,'events',`id IN (SELECT e.id FROM json_each(?) s JOIN oc_events e ON json_extract(e.data,'$.source')=json_extract(s.value,'$.source') AND json_extract(e.data,'$.eventId')=json_extract(s.value,'$.eventId'))`,[input]);
 const alerts=await selectWorkspaceWhere(db,state,'alerts',`id IN (SELECT a.id FROM json_each(?) s JOIN oc_alerts a ON json_extract(a.data,'$.source')=json_extract(s.value,'$.source') AND json_extract(a.data,'$.key')=json_extract(s.value,'$.key') AND json_extract(a.data,'$.generation')=json_extract(s.value,'$.generation') AND json_extract(a.data,'$.service')=json_extract(s.value,'$.service') AND json_extract(a.data,'$.environment')=json_extract(s.value,'$.environment'))`,[input]);
 await selectAlertEvidence(db,state,alerts.map(r=>JSON.parse(r.data).id));
 await assertWorkspaceRevision(db,state);
}
export const selectNativeSignal=(db:D1Database,state:State,signal:Signal)=>selectNativeSignals(db,state,[signal]);
export const selectNativeIncompleteSource=(db:D1Database,state:State,id:string)=>selectWorkspaceIds(db,state,'intakeSources',[id]);

export type IntakeSelection={key:string;generation?:string;eventId?:string;kind?:'native'|'monitoring';sha256?:string;routingInput?:Record<string,unknown>;service?:string|null;incomplete?:boolean;intent?:'trigger'|'recover'};
/** Select identity before mutation. The destination uses the same normalized rule
 * input as admission, so routing changes preserve per-service provider identity. */
export async function selectIntakeAdmissions(db:D1Database,state:State,source:IntakeSource,inputs:IntakeSelection[]) {
 const selected=inputs.map(input=>{
  const service=input.service!==undefined?input.service:source.routing?(input.incomplete?source.routing.versions.at(-1)!.catchAll:evaluateRouting(state,source.id,source.routing,source.routing.versions.at(-1)!,input.routingInput??{}).service):source.service;
  const {routingInput,...identity}=input;
  return {...identity,service,environment:state.services.find(s=>s.id===service)?.environment??null};
 });
 const input=JSON.stringify(selected),identity=intakeSourceIdentity(source.id);
 const receipts=await selectWorkspaceWhere(db,state,'intakeReceipts',`id IN (
  SELECT r.id FROM json_each(?) s JOIN oc_intake_receipts r ON json_extract(r.data,'$.source')=? AND json_extract(r.data,'$.native.eventId')=json_extract(s.value,'$.eventId') WHERE json_extract(s.value,'$.kind')='native' AND json_extract(r.data,'$.routing.readmission') IS NULL
  UNION SELECT r.id FROM json_each(?) s JOIN oc_intake_receipts r ON json_extract(r.data,'$.source')=? AND json_extract(r.data,'$.monitoring.eventId')=json_extract(s.value,'$.eventId') WHERE json_extract(s.value,'$.kind')='monitoring' AND json_extract(r.data,'$.service') IS json_extract(s.value,'$.service') AND json_extract(r.data,'$.routing.readmission') IS NULL
  UNION SELECT r.id FROM json_each(?) s JOIN oc_intake_receipts r ON json_extract(r.data,'$.source')=? AND json_extract(r.data,'$.incomplete.sha256')=json_extract(s.value,'$.sha256') WHERE json_extract(s.value,'$.sha256') IS NOT NULL AND json_extract(r.data,'$.service') IS json_extract(s.value,'$.service') AND json_extract(r.data,'$.routing.readmission') IS NULL
 )`,[input,source.id,input,source.id,input,source.id]);
 const alerts=await selectWorkspaceWhere(db,state,'alerts',`id IN (
  SELECT a.id FROM json_each(?) s JOIN oc_alerts a ON json_extract(a.data,'$.source')=? AND json_extract(a.data,'$.key')=json_extract(s.value,'$.key') AND json_extract(a.data,'$.generation')=json_extract(s.value,'$.generation') AND json_extract(a.data,'$.service')=json_extract(s.value,'$.service') AND json_extract(a.data,'$.environment')=json_extract(s.value,'$.environment')
  UNION SELECT id FROM (
   SELECT a.id,ROW_NUMBER() OVER(PARTITION BY json_extract(a.data,'$.key'),json_extract(a.data,'$.service'),json_extract(a.data,'$.environment') ORDER BY a.ordinal,a.id) AS rank
   FROM oc_alerts a WHERE json_extract(a.data,'$.source')=? AND json_extract(a.data,'$.state')='active' AND json_extract(a.data,'$.key') IN (
    SELECT json_extract(s.value,'$.key') FROM json_each(?) s WHERE (json_extract(s.value,'$.kind') IS NULL AND COALESCE(json_extract(s.value,'$.incomplete'),0)=0) OR (json_extract(s.value,'$.kind')='native' AND json_extract(s.value,'$.intent')='recover')
   )
  ) WHERE rank=1
 )`,[input,identity,identity,input]);
 const native=selected.filter(s=>s.kind==='native');
 if(native.length)await selectWorkspaceWhere(db,state,'events',`id IN (SELECT e.id FROM json_each(?) s JOIN oc_events e ON json_extract(e.data,'$.source')=? AND json_extract(e.data,'$.eventId')=json_extract(s.value,'$.eventId'))`,[JSON.stringify(native),identity]);
 await receiptLinks(db,state,receipts.map(r=>JSON.parse(r.data).id));
 await selectAlertEvidence(db,state,alerts.map(r=>JSON.parse(r.data).id));
 await assertWorkspaceRevision(db,state);
}
export const selectIntakeAdmission=(db:D1Database,state:State,source:IntakeSource,input:IntakeSelection)=>selectIntakeAdmissions(db,state,source,[input]);
export const selectIncompleteIntake=(db:D1Database,state:State,source:IntakeSource,sha256:string)=>selectIntakeAdmission(db,state,source,{key:'incomplete:'+sha256,generation:'incomplete:'+sha256,sha256,incomplete:true});
