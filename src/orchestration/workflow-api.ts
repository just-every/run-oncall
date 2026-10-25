import {inheritWorkspaceSnapshot} from '../workspace-store.ts';
import {authority,fail,Fault,type State} from '../family/response-operations/domain.ts';
import type {BulkOperation} from '../family/response-operations/triage.ts';
import {coordinationTasks,applyCoordinationStep} from '../triage-orchestration.ts';
import {auditKind,auditOutcome,auditRefusalCommitted} from '../audit-store.ts';
type Dependencies={state:(c:any)=>Promise<State>;save:(c:any,s:State,r:number)=>Promise<void>};
export async function advanceRuleWorkflow(c:any,record:BulkOperation,input:any,deps:Dependencies,clear=false){
 const save=async(s:State,r:number)=>{try{await deps.save(c,s,r)}catch(error){if(error instanceof Fault&&error.status===409)auditRefusalCommitted(c.env.DB);throw error;}};
 const actor=c.get('actor');let state=await deps.state(c);
 authority(state,actor,true);
 const current=state.triage?.find(r=>r.id===record.id&&r.kind==='bulk') as BulkOperation|undefined;
 if(!current?.rule||current.actor!==actor.id||input.approve!==true)fail('Only the current approving administrator can explicitly advance this workflow',403);
 const rule=current.rule;
 if(input.revision!==rule.revision)fail('Workflow changed; reload its progress',409);
 if(clear){
  if(rule.state!=='running'||Date.parse(rule.leaseUntil!)>Date.now())fail('Only an expired workflow lease can be explicitly cleared',409);
  Object.assign(rule,{state:'interrupted',outcome:'interrupted',lease:null,leaseUntil:null,revision:rule.revision+1});
  auditKind(c.env.DB,'triage.workflow-clear-expired');auditOutcome(c.env.DB,'interrupted');
  await save(state,state.revision);return c.json(current);
 }
 if(rule.state==='running')fail('Workflow has an active or uncertain lease; explicitly clear it after expiry',409);
 if(rule.state==='complete')return c.json(current);
 const token=crypto.randomUUID();Object.assign(rule,{state:'running',outcome:'uncertain',lease:token,leaseUntil:new Date(Date.now()+60000).toISOString(),revision:rule.revision+1});
 // A crash after reservation already has a durable uncertain outcome. No timer resumes it.
 auditKind(c.env.DB,'triage.workflow-reserve');
 await save(state,state.revision);auditOutcome(c.env.DB);
 state=await deps.state(c);authority(state,actor,true);
 const held=state.triage!.find(r=>r.id===record.id) as BulkOperation;
 if(held.rule?.lease!==token||held.rule.state!=='running'||Date.parse(held.rule.leaseUntil!)<=Date.now())fail('Workflow execution lease changed or expired',409);
 const task=coordinationTasks(held.workflow!.items,true).find(t=>!held.results.some(r=>r.id===t.id))!;
 const proposed=inheritWorkspaceSnapshot(structuredClone(state),state),next=proposed.triage!.find(r=>r.id===record.id) as BulkOperation;
 auditKind(c.env.DB,'triage.workflow-'+task.step);
 try{
  const changed=applyCoordinationStep(proposed,actor,task,held.workflow!.member!,held.workflow!.reason,held.results,held.id,new Date().toISOString(),held.rule!.templateVersion);
  for(const incident of proposed.incidents)for(const entry of incident.timeline)if(!state.incidents.find(i=>i.id===incident.id)?.timeline.some(e=>e.id===entry.id))entry.operationId=held.id;
  next.results.push({id:task.id,ok:true,revision:changed.revision,kind:'workflow',step:task.step,...(task.step==='reassign'?{}:{incident:changed.id})});
 }catch(error){
  if(!(error instanceof Fault)||error.status>=500)throw error;
  // Discard domain changes before recording a refused step.
  next.results=held.results.concat({id:task.id,ok:false,error:error.message,kind:'workflow',step:task.step});
  state=inheritWorkspaceSnapshot(structuredClone(state),state);const refused=state.triage!.find(r=>r.id===record.id) as BulkOperation;refused.results=next.results;
  Object.assign(refused.rule!,{state:refused.results.length===3?'complete':'ready',outcome:null,lease:null,leaseUntil:null,revision:refused.rule!.revision+1});
  auditOutcome(c.env.DB,'refused');await save(state,state.revision);return c.json(refused);
 }
 Object.assign(next.rule!,{state:next.results.length===3?'complete':'ready',outcome:null,lease:null,leaseUntil:null,revision:next.rule!.revision+1});
 await save(proposed,state.revision);return c.json(next);
}
