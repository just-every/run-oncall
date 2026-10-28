import type {Alert,Incident} from '../family/response-operations/domain';
import type {Outbox} from '../automation/model';
import type {TriageRecord} from '../family/response-operations/triage';
import type {BusinessService} from '../business-status/types';
import type {ScheduleRecord} from '../schedule-coordination/model';
import {records,oldest} from './storage';

export async function obligationMeasurements(db:D1Database,now:number) {
 const [alerts,incidents,outbox,triage,business,schedules]=await Promise.all([
  records<Alert>(db,'oc_alerts'),records<Incident>(db,'oc_incidents'),records<Outbox>(db,'oc_api_outbox'),
  records<TriageRecord>(db,'oc_triage'),records<BusinessService>(db,'oc_business_services'),records<ScheduleRecord>(db,'oc_schedule_records')]);
 let recorded=0,unanswered=0,overdue=0,deadlineFailures=0;
 const times:(string|null|undefined)[]=[];
 const add=(obligation:{state:string;at?:string}|null|undefined,answered=false,at?:string)=>{
  if(obligation?.state==='recorded'){recorded++;if(!answered){unanswered++;times.push(obligation.at??at);}}
 };
 for(const alert of alerts)add(alert.obligation,alert.coordination?.state==='acknowledged'||alert.coordination?.state==='closed');
 for(const incident of incidents){
  const answered=incident.state!=='declared';
  for(const obligation of incident.manualPage?.obligations??[])add(obligation,!!incident.manualPage?.acknowledgment,incident.createdAt);
  for(const request of incident.responderRequests??[]){add(request.obligation,request.status!=='pending');add(request.notice);}
  for(const deadline of incident.deadlines??[]){
   add(deadline.obligation,answered,deadline.endedAt??deadline.createdAt);
   if(deadline.state==='pending'&&Date.parse(deadline.dueAt)<=now){overdue++;times.push(deadline.dueAt);}
   if(deadline.state==='fired'&&!deadline.obligation)deadlineFailures++;
  }
 }
 for(const service of business)for(const obligation of service.notices)add(obligation,false,obligation.at);
 for(const row of schedules)if(row.kind==='notice')add(row.data.obligation,false,row.at);
 const ruleRuns=triage.flatMap(row=>row.kind==='bulk'&&row.rule?[row.rule]:[]);
 const interrupted=outbox.filter(row=>row.status==='interrupted').length+ruleRuns.filter(row=>row.state==='interrupted').length;
 const uncertain=outbox.filter(row=>row.status==='uncertain'||row.status==='sending'&&row.leaseUntil!==null&&Date.parse(row.leaseUntil)<=now).length+ruleRuns.filter(row=>row.outcome==='uncertain'||row.state==='running'&&row.leaseUntil!==null&&Date.parse(row.leaseUntil)<=now).length;
 return {recorded,unanswered,overdue,deadlineFailures,interrupted,uncertain,oldestKnownAt:oldest(times)};
}
