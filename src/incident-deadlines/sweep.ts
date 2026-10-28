import {pagingSnapshot} from '../paging-store';
import {workspaceWrite} from '../workspace-store';
import {responseContext} from '../manual-pages/context';
import {fireDeadline,stopRecoveredDeadlines} from './model';
/** Absolute persisted deadlines use the same workspace CAS as human writes. No sender is invoked. */
export async function sweepDeadlines(db:D1Database,env?:import('../auth.server').Bindings) {
 const custody=(await db.prepare('SELECT id,incident,principal,operation_key FROM oc_agent_deadlines').all<{id:string;incident:string;principal:string;operation_key:string}>()).results
 let agentFired=0
 if(env&&custody.length) {
  const initial=await pagingSnapshot(db),{oncallAgentDoor}=await import('../agent-door/index')
  for(const row of custody) {
   const deadline=initial.workspace.incidents.find(i=>i.id===row.incident)?.deadlines?.find(d=>d.id===row.id)
   if(!deadline||deadline.state!=='pending'||Date.parse(deadline.dueAt)>Date.now())continue
   const saved=JSON.parse(row.principal)
   const result=await oncallAgentDoor({...env,DB:db}).invoke('oncall.deadlines.fire',{id:row.id,incident:row.incident,idempotency_key:row.operation_key},{
    person:{id:saved.sponsorId},agent:saved.agent,consent:saved.consent,clientId:saved.clientId,scopes:saved.scopes,
   })
   if(result.outcome==='done')agentFired+=Number((result.result as any)?.data?.processed??0)
  }
 }
 const snapshot=await pagingSnapshot(db),state=snapshot.workspace,revision=state.revision,at=new Date(Date.now()).toISOString();
 const before=JSON.stringify(state.incidents);stopRecoveredDeadlines(state,at);
 const context=responseContext(snapshot,Date.parse(at));let fired=0;
 for(const incident of state.incidents)for(const deadline of incident.deadlines??[])if(!custody.some(c=>c.id===deadline.id)&&fireDeadline(state,incident,deadline,at,context))fired++;
 if(before===JSON.stringify(state.incidents))return {fired:agentFired};
 const results=await db.batch(workspaceWrite(db,state,revision,{sql:'EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)',values:[snapshot.revision]}));
 return {fired:agentFired+(results[0].meta.changes===1?fired:0)};
}
