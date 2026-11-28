import type {Alert} from '../family/response-operations/domain';
import type {TriageRecord} from '../family/response-operations/triage';
import type {BusinessService} from '../business-status/types';
import type {ScheduleRecord} from '../schedule-coordination/model';
import {recordRows,oldest,type readinessWork} from './storage';

function alertObligations(db:D1Database) {
 // An alert's age considers its own event references and every retained
 // compatible or email receipt, including receipts from inactive sources.
 return db.prepare(`SELECT a.data,CASE WHEN json_extract(a.data,'$.obligation.state')='recorded'
  AND COALESCE(json_extract(a.data,'$.coordination.state'),'') NOT IN ('acknowledged','closed') THEN (
  SELECT MIN(at) FROM (
   SELECT (SELECT MIN(json_extract(r.data,'$.acceptedAt')) FROM oc_intake_receipts r
    WHERE json_extract(r.data,'$.alert')=+a.id AND json_extract(r.data,'$.acceptedAt')>'') AS at
   UNION ALL SELECT (SELECT MIN(json_extract(r.data,'$.at')) FROM oc_email_receipts r
    WHERE json_extract(r.data,'$.alert')=+a.id AND json_extract(r.data,'$.at')>'')
   UNION ALL SELECT MIN(json_extract(e.data,'$.acceptedAt')) FROM json_each(a.data,'$.events') ref
    CROSS JOIN oc_events e ON e.id=ref.value WHERE json_extract(e.data,'$.acceptedAt')>''
  )
 ) END AS admissionAt FROM oc_alerts a
 WHERE json_extract(a.data,'$.obligation.state')='recorded' OR json_extract(a.data,'$.obligation.recoveryNotice.state')='recorded'`);
}

export async function obligationMeasurements(db:D1Database,now:number,work:ReturnType<typeof readinessWork>) {
 const [obligations,incidents,outbox]=await Promise.all([
  db.batch<{data:string;admissionAt?:string|null}>([
   alertObligations(db),
   db.prepare("SELECT data FROM oc_triage WHERE json_extract(data,'$.kind')='bulk'"),
   db.prepare("SELECT data FROM oc_business_services WHERE json_array_length(data,'$.notices')>0"),
   db.prepare("SELECT data FROM oc_schedule_records WHERE json_extract(data,'$.kind')='notice'"),
  ]),
  work.incidents,work.outbox,
 ]);
 const [alerts,triage,business,schedules]=obligations;
 let recorded=0,unanswered=0,overdue=0,deadlineFailures=0;
 const times:(string|null|undefined)[]=[];
 const add=(obligation:{state:string;at?:string}|null|undefined,answered=false,at?:string)=>{
  if(obligation?.state==='recorded'){recorded++;if(!answered){unanswered++;times.push(obligation.at??at);}}
 };
 const answeredAlerts=new Set(incidents.flatMap(incident=>incident.state!=='declared'?incident.alerts:[]));
 for(const {data,admissionAt} of alerts.results){
  const alert=JSON.parse(data) as Alert;
  const answered=alert.coordination?.state==='acknowledged'||alert.coordination?.state==='closed'||answeredAlerts.has(alert.id);
  add(alert.obligation,answered,admissionAt??undefined);
  add(alert.obligation?.recoveryNotice,false,alert.obligation?.stoppedAt);
 }
 for(const incident of incidents){
  const answered=incident.state!=='declared';
  for(const obligation of incident.manualPage?.obligations??[])add(obligation,!!incident.manualPage?.acknowledgment,incident.createdAt);
  for(const request of incident.responderRequests??[]){add(request.obligation,request.status!=='pending');add(request.notice);}
  add(incident.sourceRecovery?.reminder,false,incident.sourceRecovery?.at);
  for(const deadline of incident.deadlines??[]){
   add(deadline.obligation,answered,deadline.endedAt??deadline.createdAt);
   if(deadline.state==='pending'&&Date.parse(deadline.dueAt)<=now){overdue++;times.push(deadline.dueAt);}
   if(deadline.state==='fired'&&!deadline.obligation)deadlineFailures++;
  }
 }
 for(const service of recordRows<BusinessService>(business))for(const obligation of service.notices)add(obligation,false,obligation.at);
 for(const row of recordRows<ScheduleRecord>(schedules))if(row.kind==='notice')add(row.data.obligation,false,row.at);
 const triageRecords=recordRows<TriageRecord>(triage);
 const failedWorkflowSteps=triageRecords.reduce((n,row)=>n+(row.kind==='bulk'?row.results.filter(result=>!result.ok).length:0),0);
 const ruleRuns=triageRecords.flatMap(row=>row.kind==='bulk'&&row.rule?[row.rule]:[]);
 const interrupted=outbox.filter(row=>row.status==='interrupted').length+ruleRuns.filter(row=>row.state==='interrupted').length;
 const uncertain=outbox.filter(row=>row.status==='uncertain'||row.status==='sending'&&row.leaseUntil!==null&&Date.parse(row.leaseUntil)<=now).length+ruleRuns.filter(row=>row.outcome==='uncertain'||row.state==='running'&&row.leaseUntil!==null&&Date.parse(row.leaseUntil)<=now).length;
 return {recorded,unanswered,overdue,deadlineFailures,failedWorkflowSteps,interrupted,uncertain,oldestKnownAt:oldest(times)};
}
