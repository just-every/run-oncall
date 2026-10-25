import {decideResponse} from '../response-policy/rules.ts';
import {serviceUrgency} from '../urgency/model.ts';
import {authority,fail,text,type State,type Member,type Event,type Alert,type Decision} from '../family/response-operations/domain.ts';
import {applyCoordinationStep,coordinationTasks} from '../triage-orchestration.ts';
import type {BulkOperation} from '../family/response-operations/triage.ts';
export type ApprovedWorkflow={version:number;approved:true;held?:true;by:string;at:string;member:string;reason:string};
export type RuleRun={policy:string;policyVersion:number;workflowVersion:number;templateVersion:number|null;service:string;alert:string;generation:string;revision:number;state:'ready'|'running'|'interrupted'|'complete';outcome:'uncertain'|'interrupted'|null;lease:string|null;leaseUntil:string|null};
export function workflowShape(value:any):ApprovedWorkflow {
 if(!value||Object.keys(value).filter(k=>k!=='held').sort().join(',')!=='approved,at,by,member,reason,version'||value.held!==undefined&&value.held!==true||value.approved!==true||!Number.isSafeInteger(value.version)||value.version<1||!Number.isFinite(Date.parse(value.at)))fail('Invalid approved workflow');
 text(value.by,'Workflow approver',100);text(value.member,'Workflow responder',100);text(value.reason,'Workflow reason',1000);return structuredClone(value);
}
export function approveWorkflow(state:State,actor:Member,input:any,old:ApprovedWorkflow|undefined,at:string){
 authority(state,actor,true);
 if(!input||Object.keys(input).sort().join(',')!=='approved,member,reason,version'||input.approved!==true||input.version!==(old?.version??0)+1)fail('Explicit approval of the current workflow version is required',409);
 if(!state.members.some(m=>m.id===input.member&&m.active&&['admin','responder'].includes(m.role)))fail('Choose a current workflow responder',409);
 return workflowShape({...input,by:actor.id,at});
}
export function launchRuleWorkflow(state:State,event:Event,alert:Alert,created:boolean){
 const policy=state.policies.find(p=>p.id===event.decision.policy&&p.version===event.decision.version),workflow=policy?.workflow;
 if(!created||event.intent!=='trigger'||event.decision.action!=='route'||!workflow)return;
 const actor=state.members.find(m=>m.id===workflow.by&&m.active&&m.role==='admin');
 if(workflow.held||!actor||!state.members.some(m=>m.id===workflow.member&&m.active&&['admin','responder'].includes(m.role)))fail('Approved workflow authority changed; review the service rule',409);
 const id='rule:'+alert.id;
 if(state.triage?.some(row=>row.id===id))return;
 if((state.triage?.length??0)>=10000)fail('Recorded workflow capacity reached',429);
 const seed=crypto.randomUUID().replaceAll('-','');
 const operation:BulkOperation={id,kind:'bulk',actor:actor.id,fingerprint:seed+seed,at:event.acceptedAt,results:[],workflow:{action:'orchestrate',version:1,items:[{id:alert.id,revision:alert.revision??1,kind:'alert'}],member:workflow.member,reason:workflow.reason},rule:{policy:policy!.id,policyVersion:policy!.version,workflowVersion:workflow.version,templateVersion:state.services.find(s=>s.id===policy!.service)?.incidentTemplates?.at(-1)?.version??null,service:policy!.service,alert:alert.id,generation:alert.generation,revision:1,state:'ready',outcome:null,lease:null,leaseUntil:null}};
 const task=coordinationTasks(operation.workflow!.items,true)[0],changed=applyCoordinationStep(state,actor,task,workflow.member,workflow.reason,[],id,event.acceptedAt);
 operation.results.push({id:task.id,ok:true,revision:changed.revision,kind:'workflow',step:'reassign'});
 (state.triage??=[]).push(operation);
}
export function validateRuleRun(state:State,record:BulkOperation){
 const rule=record.rule;if(!rule)return;
 if(Object.keys(rule).sort().join(',')!=='alert,generation,lease,leaseUntil,outcome,policy,policyVersion,revision,service,state,templateVersion,workflowVersion'||!Number.isSafeInteger(rule.revision)||rule.revision<1||!['ready','running','interrupted','complete'].includes(rule.state)||!record.workflow||record.workflow.action!=='orchestrate'||record.workflow.items.length!==1||record.workflow.items[0].id!==rule.alert||record.id!=='rule:'+rule.alert)fail('Invalid rule workflow custody');
 const alert=state.alerts.find(a=>a.id===rule.alert&&a.service===rule.service&&a.generation===rule.generation),event=state.events.find(e=>e.id===alert?.events[0]);
 const policy=event?.routingSnapshot.policies.find(p=>p.id===rule.policy&&p.version===rule.policyVersion),workflow=policy?.workflow;
 if(rule.templateVersion!==null&&!state.services.find(s=>s.id===rule.service)?.incidentTemplates?.some(t=>t.version===rule.templateVersion))fail('Invalid frozen workflow template');
 if(!alert||!workflow||workflow.by!==record.actor||workflow.member!==record.workflow.member||workflow.reason!==record.workflow.reason||workflow.version!==rule.workflowVersion||event?.decision.policy!==rule.policy||event.decision.action!=='route'||event.intent!=='trigger')fail('Invalid approved rule workflow reference');
 if(rule.state==='running'?(typeof rule.lease!=='string'||!rule.lease||!Number.isFinite(Date.parse(rule.leaseUntil!))):(rule.lease!==null||rule.leaseUntil!==null))fail('Invalid workflow execution lease');
 const tasks=coordinationTasks(record.workflow.items,true);if(record.results.length>3||record.results.some((r,i)=>r.id!==tasks[i].id))fail('Invalid rule workflow step order');
 if(rule.outcome!==(rule.state==='running'?'uncertain':rule.state==='interrupted'?'interrupted':null))fail('Invalid workflow execution outcome');
 if((rule.state==='complete')!==(record.results.length===3))fail('Invalid workflow completion');
}
export function workflowPreview(state:State,decision:Decision,signal:{intent:string;source:string;service:string;environment:string;key:string;generation:string;severity:'critical'|'warning'|'info'},eventId?:string,at=new Date().toISOString()){
 const policy=state.policies.find(p=>p.id===decision.policy&&p.version===decision.version),workflow=policy?.workflow;
 if(signal.intent!=='trigger'||decision.action!=='route'||!workflow||workflow.held)return null;
 const service=state.services.find(s=>s.id===signal.service);if(!service)return null;
 const urgency=serviceUrgency(state,signal.service,signal.severity,at).urgency;
 if(decideResponse(service.responsePolicies?.at(-1),urgency,decision.transformation?.severity??signal.severity,decision.policy).mode!=='alert-only')return null;
 if(!state.members.some(m=>m.id===workflow.by&&m.active&&m.role==='admin')||!state.members.some(m=>m.id===workflow.member&&m.active&&['admin','responder'].includes(m.role)))return null;
 const existing=state.alerts.find(a=>a.source===signal.source&&a.service===signal.service&&a.environment===signal.environment&&a.key===signal.key&&a.generation===signal.generation);
 if(existing&&existing.events[0]!==eventId)return null;
 return {action:'launch',policy:policy!.id,policyVersion:policy!.version,workflowVersion:workflow.version,steps:['reassign','declare','notify'],member:workflow.member,obligation:'recorded',automatic:false,paging:'OFF'};
}

export function holdRuleWorkflows(state:State){for(const policy of state.policies)if(policy.workflow)policy.workflow.held=true;for(const row of state.triage??[])if(row.kind==='bulk'&&row.rule&&row.rule.state!=='complete'&&(row.rule.state!=='interrupted'||row.rule.lease!==null))Object.assign(row.rule,{state:'interrupted',outcome:'interrupted',lease:null,leaseUntil:null,revision:row.rule.revision+1});}
