import {authority,fail,type Incident,type Member,type State} from '../family/response-operations/domain.ts';
import type {PolicyContext} from '../manual-pages/model.ts';
import type {IncidentDeadline} from './types.ts';
export const deadlineActor='system:incident-deadlines';
const pending=(i:Incident)=>(i.deadlines??[]).filter(d=>d.state==='pending');
export function cancelDeadlines(incident:Incident,at:string,reason:string,actor=deadlineActor) {
 let changed=false;
 for(const d of pending(incident)){changed=true;d.state='cancelled';d.endedAt=at;d.outcome=reason;incident.timeline.push({id:'deadline-cancelled:'+d.id,actor,at,kind:'deadline-cancelled',text:`${d.kind}: ${d.minutes} minutes, due ${d.dueAt}: ${d.outcome}; paging OFF`});}
 for(const d of incident.deadlines??[])if(d.obligation?.state==='recorded'){changed=true;d.obligation.state='stopped';d.obligation.outcome=reason;}
 if(changed)incident.revision++;
}
function record(state:State,incident:Incident,actor:Member,kind:IncidentDeadline['kind'],minutes:number,at:string,context:PolicyContext) {
 if((incident.deadlines?.length??0)>=500)fail('Deadline history capacity reached',429);
 cancelDeadlines(incident,at,'Replaced by a new acknowledgment or snooze',actor.id);
 const level=(context.levels?.[incident.service]??context.eligible[incident.service])?.indexOf(incident.assignee??'')??-1;
 const deadline:IncidentDeadline={id:crypto.randomUUID(),kind,state:'pending',actor:actor.id,createdAt:at,dueAt:new Date(Date.parse(at)+minutes*60000).toISOString(),minutes,level:kind==='acknowledgment-timeout'?0:level===0||level===1?level:null,policyVersion:state.services.find(s=>s.id===incident.service)?.ackTimeouts?.at(-1)?.version??0,endedAt:null,outcome:'Awaiting durable deadline; paging OFF',obligation:null};
 (incident.deadlines??=[]).push(deadline);
 incident.timeline.push({id:'deadline:'+deadline.id,at,actor:actor.id,kind:'incident-deadline',text:`${kind}: ${minutes} minutes, due ${deadline.dueAt}; recorded deadline, paging OFF`});
 return incident;
}
export function deadlineCommand(state:State,actor:Member,input:any,at:string,context:PolicyContext) {
 authority(state,actor,input.type==='acknowledgment-timeout');
 if(input.type==='acknowledgment-timeout') {
  if(actor.machine)fail('Timeout settings require an admin session',403);
  const service=state.services.find(s=>s.id===input.service);if(!service)fail('Unknown service',404);
  const previous=service.ackTimeouts?.at(-1);if(input.baseVersion!==(previous?.version??0))fail('Timeout policy changed; reload',409);
  if(!Number.isSafeInteger(input.minutes)||input.minutes<0||input.minutes>1440)fail('Timeout must be off (0) or 1–1440 minutes');
  if((service.ackTimeouts?.length??0)>=100)fail('Timeout policy history capacity reached',429);
  (service.ackTimeouts??=[]).push({version:(previous?.version??0)+1,minutes:input.minutes,by:actor.id,at});
  if(input.minutes===0)for(const i of state.incidents.filter(i=>i.service===service.id))for(const d of pending(i).filter(d=>d.kind==='acknowledgment-timeout')){d.state='cancelled';d.endedAt=at;d.outcome='Timeout policy turned off';i.revision++;i.timeline.push({id:'deadline-cancelled:'+d.id,actor:actor.id,at,kind:'deadline-cancelled',text:`${d.kind}: ${d.minutes} minutes, due ${d.dueAt}: ${d.outcome}; paging OFF`});}
  state.audit.push({id:crypto.randomUUID(),actor:actor.id,at,kind:input.type,text:`Acknowledgment timeout ${service.id}, version ${(previous?.version??0)+1}: ${input.minutes===0?'off':input.minutes+' minutes'}`});return service;
 }
 const incident=state.incidents.find(i=>i.id===input.incident);if(!incident)fail('Unknown incident',404);
 if(incident.revision!==input.revision)fail('Incident changed; reload',409);
 if(input.type==='cancel-deadline') {if(!pending(incident).length)fail('No pending deadline',409);cancelDeadlines(incident,at,'Cancelled by authorized responder',actor.id);incident.timeline.push({id:crypto.randomUUID(),actor:actor.id,at,kind:'incident-deadline',text:'Pending deadline cancelled; no re-trigger obligation'});}
 else {if(incident.state!=='acknowledged')fail('Snooze requires an acknowledged incident',409);if(!Number.isSafeInteger(input.minutes)||input.minutes<1||input.minutes>1440)fail('Snooze must be 1–1440 minutes');record(state,incident,actor,'snooze',input.minutes,at,context);}
 incident.revision++;return incident;
}
export function afterDeadlineCommand(state:State,incident:Incident,actor:Member,input:any,at:string,context:PolicyContext) {
 if(input.type==='bulk-acknowledge'||input.type==='transition'&&input.state==='acknowledged') {
  cancelDeadlines(incident,at,'Replaced by new acknowledgment',actor.id);
  const minutes=state.services.find(s=>s.id===incident.service)?.ackTimeouts?.at(-1)?.minutes??0;
  if(minutes)record(state,incident,actor,'acknowledgment-timeout',minutes,at,context);
 }
 if(incident.state==='resolved'||incident.sourceRecovery)cancelDeadlines(incident,at,incident.sourceRecovery?'Source recovered; no re-trigger obligation':'Incident resolved; no re-trigger obligation');
}
export function stopRecoveredDeadlines(state:State,at:string) {
 for(const i of state.incidents)if(i.state==='resolved'||i.sourceRecovery||i.alerts.length>0&&i.alerts.every(id=>state.alerts.some(a=>a.id===id&&a.state==='recovered')))cancelDeadlines(i,at,i.state==='resolved'?'Incident resolved; no re-trigger obligation':'Source recovered; no re-trigger obligation');
}
export function fireDeadline(state:State,incident:Incident,d:IncidentDeadline,at:string,context:PolicyContext) {
 if(d.state!=='pending'||Date.parse(d.dueAt)>Date.parse(at))return false;
 const eligible=context.levels?.[incident.service]??context.eligible[incident.service]??[],assignee=incident.assignee;
 const target=d.kind==='snooze'&&assignee&&eligible.includes(assignee)?assignee:d.level===null?undefined:eligible[d.level];
 d.state='fired';d.endedAt=at;d.outcome=target?'Re-trigger obligation recorded; no sender':'No eligible on-call target at the recorded level; operator action required';
 if(target)d.obligation={id:'deadline-obligation:'+d.id,state:'recorded',paging:'off',automatic:false,label:'no sender',target:{kind:'user',id:target},urgency:incident.urgency??'high',creator:d.actor,at,outcome:d.kind==='acknowledgment-timeout'?'Restart at level one recorded; no sender':'Snooze expired; re-trigger recorded; no sender'};
 incident.state='declared';incident.commander=null;incident.assignee=target??null;incident.revision++;
 incident.timeline.push({id:'deadline-fired:'+d.id,actor:deadlineActor,at,kind:'deadline-fired',text:`${d.kind}: ${d.minutes} minutes, due ${d.dueAt}: ${d.outcome}; paging OFF`});return true;
}
export function holdDeadlines(state:State) {for(const i of state.incidents)for(const d of i.deadlines??[]){if(d.state==='pending'){d.state='held';d.outcome='Restored inactive; deadline will not resume';}if(d.obligation)d.obligation.state='stopped';}}
