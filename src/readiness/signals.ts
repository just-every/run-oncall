import {deliveryCapacity,type Outbox} from '../automation/model';
import {defaultAllowance} from '../intake-rate/model';
import type {Incident} from '../family/response-operations/domain';
import {records,newest,oldest,age} from './storage';
import {obligationMeasurements} from './obligations';
import type {Signal,SignalState} from './types';

type Measurement={state:SignalState;values:Signal['values'];at:string|null;reason:string};
export async function readinessSignals(db:D1Database,now:number):Promise<Signal[]> {
 const observedAt=new Date(now).toISOString();
 const definitions:{id:string;name:string;read:()=>Promise<Measurement>}[]=[
  {id:'intake',name:'Intake',read:async()=>{
   const result=await db.batch<{at:string|null;n:number;requests:number;events:number;limited:number}>([
    db.prepare(`SELECT MAX(at) AS at FROM (
     SELECT json_extract(data,'$.acceptedAt') AS at FROM oc_changes UNION ALL SELECT json_extract(data,'$.acceptedAt') FROM oc_events UNION ALL SELECT json_extract(data,'$.acceptedAt') FROM oc_intake_receipts
     UNION ALL SELECT json_extract(data,'$.at') FROM oc_email_receipts WHERE json_extract(data,'$.outcome') NOT IN ('refused','quarantined'))`),
    db.prepare("SELECT COUNT(*) AS n,MAX(at) AS at FROM oc_admin_audit WHERE outcome IN ('refused','failed') AND feature IN ('ingest','intake','monitoring','email','changes') AND at>=?").bind(new Date(now-3600000).toISOString()),
    db.prepare(`SELECT COALESCE(SUM(requests),0) AS requests,COALESCE(SUM(events),0) AS events,COALESCE(SUM(requests>=request_limit OR events>=event_limit),0) AS limited FROM (
     SELECT SUM(u.requests) AS requests,SUM(u.events) AS events,COALESCE(json_extract(a.data,'$.requests'),${defaultAllowance.requests}) AS request_limit,COALESCE(json_extract(a.data,'$.events'),${defaultAllowance.events}) AS event_limit
     FROM oc_key_rate_usage u LEFT JOIN oc_key_allowances a ON a.id=u.key_id WHERE u.at>? GROUP BY u.key_id)` ).bind(now-60000),
    db.prepare('SELECT COUNT(*) AS n,MAX(at) AS at FROM oc_key_rate_notified WHERE at>?').bind(now-60000)
   ]);
   const receipt=result[0].results[0],refusals=result[1].results[0],rate=result[2].results[0],throttles=result[3].results[0];
   return {state:refusals.n||throttles.n||rate.limited?'degraded':receipt.at?'ok':'degraded',at:receipt.at,
    values:{lastAdmittedAt:receipt.at,recentRefusals:refusals.n,refusalWindowSeconds:3600,requestsLastMinute:rate.requests,eventsLastMinute:rate.events,keysAtAllowance:rate.limited,keysThrottledLastMinute:throttles.n},
    reason:'Retained admissions and refusal audit; rolling-minute allowance usage. Silence is not proof that a sender is healthy.'};
  }},
  {id:'timers',name:'Timers',read:async()=>{
   const [incidents,outbox]=await Promise.all([records<Incident>(db,'oc_incidents'),records<Outbox>(db,'oc_api_outbox')]);
   const pending=incidents.flatMap(row=>row.deadlines??[]).filter(row=>row.state==='pending'),past=pending.filter(row=>Date.parse(row.dueAt)<=now);
   const queued=outbox.filter(row=>row.status==='queued'),oldestQueuedAt=oldest(queued.map(row=>row.at)),oldestPastDueAt=oldest(past.map(row=>row.dueAt));
   return {state:past.length?'failing':'degraded',at:oldestPastDueAt??oldestQueuedAt,
    values:{minuteTaskDefined:true,heartbeatRecorded:false,pendingDeadlines:pending.length,pastDueUnfired:past.length,oldestPastDueAt,oldestPastDueAgeSeconds:age(oldestPastDueAt,now),queued:queued.length,oldestQueuedAt,oldestQueuedAgeSeconds:age(oldestQueuedAt,now),externalWatchBuilt:false},
    reason:'The minute task is defined; only persisted effects are observable. No heartbeat proves it ran. A missed-deadline watch needs an external observer and is not built.'};
  }},
  {id:'authority',name:'Main and standby authority',read:async()=>{
   const control=await db.prepare('SELECT revision FROM workspace_control WHERE id=1').first<{revision:number}>();
   return {state:control?'degraded':'failing',at:null,values:{main:control?'single-installation':'missing',workspaceRevision:control?.revision??null,standby:'not-provided',fencingProven:false},reason:'One installation coordinates. No independent standby, authority lease, takeover or split-site fencing is provided.'};
  }},
  {id:'configuration',name:'Configuration freshness',read:async()=>{
   const results=await db.batch<{at:string|null;n:number}>([
    db.prepare("SELECT MAX(at) AS at FROM oc_admin_audit WHERE outcome='accepted' AND paging_after>paging_before AND (kind='paging.schedules' OR feature='schedules' OR kind LIKE 'schedule.%')"),
    db.prepare(`SELECT MAX(at) AS at FROM (
     SELECT at FROM oc_admin_audit WHERE outcome='accepted' AND (workspace_after>workspace_before OR paging_after>paging_before) AND kind IN ('command.policy','paging.policies','schedule.policy')
     UNION ALL SELECT json_extract(data,'$.at') FROM oc_audit WHERE json_extract(data,'$.kind') IN ('policy','urgency-rule','response-policy','user-assignment','acknowledgment-timeout'))`),
    db.prepare(`SELECT MAX(at) AS at FROM (
     SELECT at FROM oc_admin_audit WHERE outcome='accepted' AND workspace_after>workspace_before AND kind IN ('command.service','command.service-dependencies','command.service-template')
     UNION ALL SELECT json_extract(data,'$.at') FROM oc_audit WHERE json_extract(data,'$.kind') IN ('service','service-dependencies','service-template','urgency-rule','response-policy','user-assignment','acknowledgment-timeout'))`),
    db.prepare('SELECT COUNT(*) AS n FROM paging_schedules'),db.prepare('SELECT COUNT(*) AS n FROM oc_policies'),db.prepare('SELECT COUNT(*) AS n FROM oc_services')]);
   const [schedule,policy,service]=results.slice(0,3).map(r=>r.results[0].at);
   return {state:schedule&&policy&&service?'ok':'degraded',at:newest([schedule,policy,service]),values:{schedules:results[3].results[0].n,policies:results[4].results[0].n,services:results[5].results[0].n,scheduleChangedAt:schedule,scheduleAgeSeconds:age(schedule,now),policyChangedAt:policy,policyAgeSeconds:age(policy,now),serviceChangedAt:service,serviceAgeSeconds:age(service,now)},reason:'Last retained accepted change per category, not a synchronization guarantee. A missing timestamp is unknown; no maximum configuration age is defined.'};
  }},
  {id:'delivery',name:'Delivery backlog',read:async()=>{
   const rows=await records<Outbox>(db,'oc_api_outbox'),count=(status:string)=>rows.filter(row=>row.status===status).length;
   const unfinished=rows.filter(row=>['queued','sending','failed'].includes(row.status)),failed=count('failed'),uncertain=count('uncertain'),interrupted=count('interrupted'),terminal=count('terminal');
   const oldestAt=oldest(unfinished.map(row=>row.at));
   return {state:failed||uncertain||terminal||unfinished.length>=deliveryCapacity?'failing':unfinished.length||interrupted?'degraded':'ok',at:oldestAt,
    values:{unfinished:unfinished.length,capacity:deliveryCapacity,availableSlots:Math.max(0,deliveryCapacity-unfinished.length),queued:count('queued'),sending:count('sending'),failed,uncertain,interrupted,terminal,oldestUnfinishedAt:oldestAt},reason:'Response-event outbox slots, separate from paging. Failed work consumes a slot; uncertain and interrupted outcomes remain visible outside that count. This read dispatches nothing.'};
  }},
  {id:'obligations',name:'Failed and unanswered obligations',read:async()=>{
   const values=await obligationMeasurements(db,now);
   return {state:values.unanswered||values.overdue||values.deadlineFailures||values.failedWorkflowSteps||values.uncertain?'failing':values.interrupted?'degraded':'ok',at:values.oldestKnownAt,values,reason:'Recorded no-sender obligations, overdue unfired deadlines and interrupted or uncertain response work. These are custody records, never delivery receipts; unknown obligation times have no invented age.'};
  }},
 ];
 return Promise.all(definitions.map(async({id,name,read})=>{
  try {const {at,...measurement}=await read();return {id,name,...measurement,observedAt,ageSeconds:age(at,now)};}
  catch {return {id,name,state:'unavailable' as const,observedAt,ageSeconds:null,values:{},reason:'This signal’s durable source could not be read. No result is confirmed for this signal.'};}
 }));
}
