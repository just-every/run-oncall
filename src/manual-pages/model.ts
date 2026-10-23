import { authority, fail, text, type Incident, type Member, type State } from '../family/response-operations/domain';
import { serviceUrgency } from '../urgency/model';
import type { RecordedResponseObligation } from '../alert-obligation';
import type { AssignmentRule, ResponseTarget } from './types';
export type PolicyContext = {policies:{service:string;revision:number}[];eligible:Record<string,string[]>};
const responsive=(state:State,id:string)=>state.members.some(m=>m.id===id&&m.active&&['admin','responder'].includes(m.role));
export function assignmentRule(state:State,service:string):AssignmentRule {
  return state.services.find(s=>s.id===service)?.userAssignments?.at(-1)??{version:0,mode:'escalate',minutes:10,policy:service,by:'',at:'1970-01-01T00:00:00.000Z'};
}
function targets(state:State,input:any,service:string,context:PolicyContext,required:boolean):ResponseTarget[] {
  if(input.policy&&input.users?.length)fail('Choose named users or one policy, not both');
  if(input.policy){const policy=context.policies.find(p=>p.service===input.policy);if(!policy)fail('Choose an existing escalation policy');return [{kind:'policy',id:policy.service,policyRevision:policy.revision}];}
  if(input.users!==undefined&&(!Array.isArray(input.users)||input.users.length>100||new Set(input.users).size!==input.users.length))fail('Choose up to 100 distinct responders');
  if(input.users?.length){if(input.users.some((id:string)=>!responsive(state,id)))fail('Choose active responders or admins');return input.users.map((id:string)=>({kind:'user',id}));}
  if(required)fail('Choose at least one responder or policy');
  const policy=context.policies.find(p=>p.service===service);return [{kind:policy?'policy':'service',id:service,...(policy?{policyRevision:policy.revision}:{})}];
}
function obligation(actor:Member,target:ResponseTarget,urgency:'high'|'low',at:string,outcome:string,assignment?:AssignmentRule):RecordedResponseObligation {
  return {id:crypto.randomUUID(),state:'recorded',paging:'off',automatic:false,label:'no sender',target,urgency,creator:actor.id,at,outcome,...(assignment?{assignment:structuredClone(assignment)}:{})};
}
export function manualCommand(state:State,actor:Member,input:any,at:string,context:PolicyContext,declare:(input:any)=>Incident) {
  authority(state,actor,input.type==='user-assignment');
  if(input.type==='user-assignment') {
    const service=state.services.find(s=>s.id===input.service);if(!service)fail('Unknown service',404);
    const previous=assignmentRule(state,service.id);if(input.baseVersion!==previous.version)fail('Assignment setting changed; reload',409);
    if(!['repeat','escalate'].includes(input.mode)||!Number.isSafeInteger(input.minutes)||input.minutes<1||input.minutes>1440)fail('Choose repeat or escalate after 1–1440 minutes');
    const policy=input.policy||service.id;if(input.mode==='escalate'&&!context.policies.some(p=>p.service===policy))fail('Choose an existing escalation policy');
    if((service.userAssignments?.length??0)>=100)fail('Assignment rule history capacity reached',429);
    const rule:AssignmentRule={version:previous.version+1,mode:input.mode,minutes:input.minutes,policy,by:actor.id,at};(service.userAssignments??=[]).push(rule);
    state.audit.push({id:crypto.randomUUID(),actor:actor.id,at,kind:input.type,text:`User-assignment rule ${service.id} version ${rule.version}: ${rule.mode} after ${rule.minutes} minutes; recorded only`});return service;
  }
  if(input.type==='manual-page') {
    const service=state.services.find(s=>s.id===input.service);if(!service)fail('Unknown service',404);
    const operation=text(input.operationId,'Operation ID',100);if(!/^[A-Za-z0-9_-]{16,100}$/.test(operation))fail('Use an opaque operation ID');
    const fingerprint=JSON.stringify({service:input.service,title:input.title,severity:input.severity,description:input.description??input.summary??'',urgency:input.urgency??'',priority:input.priority??null,users:input.users??[],policy:input.policy??''});
    const prior=state.incidents.find(i=>i.manualPage?.creator===actor.id&&i.manualPage.operation===operation);
    if(prior){if(prior.manualPage!.fingerprint!==fingerprint)fail('Operation ID already names different page input',409);return prior;}
    const chosen=targets(state,input,service.id,context,false),rule=service.urgencyRules?.at(-1);
    const urgency=input.urgency||(!rule||rule.mode==='severity'?'high':serviceUrgency(state,service.id,input.severity,at).urgency);
    if(!['high','low'].includes(urgency))fail('Choose high or low urgency');
    if(input.priority&& !['P1','P2','P3','P4','P5'].includes(input.priority))fail('Choose a priority');
    const description=input.description??input.summary??'';if(typeof description!=='string'||description.length>3000)fail('Description must be at most 3000 characters');
    const incident=declare({type:'declare',service:service.id,title:input.title,severity:input.severity??'critical',summary:description.trim()||'Impact not yet assessed.',alerts:[]});
    incident.urgency=urgency;incident.priority=input.priority||null;
    const assignment=structuredClone(assignmentRule(state,service.id));
    incident.manualPage={creator:actor.id,operation,fingerprint,description,assignment,acknowledgment:null,obligations:chosen.map(target=>obligation(actor,target,urgency,at,target.kind==='service'?'No configured escalation policy; operator action required':'Manual page obligation recorded; no sender',target.kind==='user'?assignment:undefined))};
    incident.timeline.push({id:crypto.randomUUID(),actor:actor.id,at,kind:'manual-page',text:`Manual page recorded by ${actor.name}; ${urgency} urgency; ${chosen.map(t=>t.kind+' '+t.id).join(', ')}. User assignment ${assignment.mode} after ${assignment.minutes} minutes, version ${assignment.version}; automatic action unavailable; paging OFF.`});return incident;
  }
  const incident=state.incidents.find(i=>i.id===input.incident);if(!incident)fail('Unknown incident',404);
  if(input.revision!==incident.revision)fail('Incident changed; reload',409);
  if(incident.state==='resolved')fail('Responder requests require an open incident',409);
  let detail='';
  if(input.type==='request-responders') {
    const chosen=targets(state,input,incident.service,context,true),message=text(input.message,'Responder request message',3000);
    const rows=incident.responderRequests??=[];if(rows.length+chosen.length>500)fail('Responder request history capacity reached',429);
    for(const target of chosen)rows.push({id:crypto.randomUUID(),requester:actor.id,message,at,status:'pending',response:null,notice:null,obligation:obligation(actor,target,incident.urgency??'high',at,'Responder request pending; no sender')});
    detail=`Requested ${chosen.map(t=>t.kind+' '+t.id).join(', ')}: ${message}; recorded only, paging OFF`;
  } else if(input.type==='respond-request'||input.type==='cancel-request') {
    const request=incident.responderRequests?.find(r=>r.id===input.request);if(!request||request.status!=='pending')fail('Request is no longer pending',409);
    if(input.type==='cancel-request') {if(request.requester!==actor.id)fail('Only the requester may cancel',403);request.status='cancelled';}
    else {
      const target=request.obligation.target;
      if(!(target.kind==='user'?target.id===actor.id:context.eligible[target.id]?.includes(actor.id)))fail('Only the named responder or current policy on-call may respond',403);
      if(!['accept','decline'].includes(input.decision))fail('Choose accept or decline');
      request.status=input.decision==='accept'?'accepted':'declined';
      if(input.decision==='accept')incident.responders=[...new Set([...(incident.responders??[]),actor.id])];
      else request.notice=obligation(actor,{kind:'user',id:request.requester},incident.urgency??'high',at,'Responder declined; requester notice recorded, no sender');
    }
    request.response={by:actor.id,at};request.obligation.state='stopped';request.obligation.outcome=request.status;
    detail=`Responder request ${request.id} ${request.status} by ${actor.name}; primary acknowledgment unchanged`;
  } else fail('Unknown responder request action');
  incident.revision++;incident.timeline.push({id:crypto.randomUUID(),at,actor:actor.id,kind:input.type,text:detail});return incident;
}
export function finishManualRecords(incident:Incident,actor:Member,at:string) {
  if(incident.manualPage&&incident.state==='acknowledged'&&!incident.manualPage.acknowledgment)incident.manualPage.acknowledgment={by:actor.id,at};
  if(incident.state!=='resolved')return;
  for(const o of incident.manualPage?.obligations??[]){o.state='stopped';o.outcome='Incident resolved';}
  for(const request of incident.responderRequests??[]){if(request.status==='pending')request.status='ended';request.obligation.state='stopped';request.obligation.outcome='Incident resolved';if(request.notice)request.notice.state='stopped';}
}
