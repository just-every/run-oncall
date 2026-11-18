import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentRuntime,agentEffectSnapshot} from './agent-door-runtime.mjs';
import {roleClearReplay} from './oncall-agent-role-clear-replay.mjs';

/** Follow the original assignee-clear link as the admitted writer. */
export async function readClearedAssignee(runtime,{mode,first}){
 const {completeResource,http,context}=runtime;
 const links=first.result.content.filter(row=>row.type==='resource_link');
 assert.equal(links.length,1);
 const [link]=links;
 const paging=async()=>{
  const response=await http('/api/paging/state');assert.equal(response.status,200);return response.json();
 };
 const before=await agentEffectSnapshot(runtime),pagingBefore=await paging();
 const outboundBefore=await runtime.outboundRequests();
 const {initial,answer,content,value}=await completeResource(link.uri);
 assert.equal(initial,answer,'This standard read completes under the current policy without a separate approval');
 assert.equal(content.uri,link.uri);
 assert.deepEqual(answer.decision.classes.map(row=>row.class),['standard']);
 assert.equal(answer.decision.disposition,mode==='held'?'review':'autonomous');
 assert.notEqual(answer.decision.id,first.decision.id);
 assert.deepEqual(value,first.result.structuredContent,'Read the full original assignee-clear result');
 assert.equal(value.assignee,null,'The resource keeps an explicit null despite a populated Lead');
 const after=await agentEffectSnapshot(runtime);
 assert.deepEqual(value,after.application.incidents.find(row=>row.id===value.id),'The resource matches the sponsor’s protected native state');
 assert.deepEqual(after.application,before.application);
 const {agent_door_reviews:afterReviews,agent_door_usage:afterUsage,...afterRecords}=after.records;
 const {agent_door_reviews:beforeReviews,agent_door_usage:beforeUsage,...beforeRecords}=before.records;
 assert.deepEqual(afterRecords,beforeRecords,'The read preserves native records, revisions, state-changing audit, approvals and original call outcomes');
 assert.deepEqual(afterUsage.filter(row=>row.decision_id!==answer.decision.id),beforeUsage);
 const usage=afterUsage.filter(row=>row.decision_id===answer.decision.id);
 assert.equal(usage.length,1);assert.equal(usage[0].agent,context.agentId);
 const review=answer.result._meta['com.runeditrun/review'];
 if(mode==='held'){
  const writeReview=first.result._meta['com.runeditrun/review'];
  assert.ok(writeReview?.id);assert.ok(review?.id);assert.notEqual(review.id,writeReview.id);
  assert.equal(beforeReviews.find(row=>row.id===writeReview.id)?.state,'open');
  const added=afterReviews.find(row=>row.id===review.id);
  assert.equal(added?.state,'open');assert.equal(JSON.parse(added.saved).decision_id,answer.decision.id);
  assert.deepEqual(afterReviews.filter(row=>row.id!==review.id),beforeReviews,'The original open write review is unchanged');
 }else{
  assert.equal(review,undefined);assert.deepEqual(afterReviews,beforeReviews);
 }
 assert.deepEqual(await paging(),pagingBefore);
 assert.deepEqual(await runtime.outboundRequests(),outboundBefore,'The link read makes zero outbound requests');
 console.log('PROBE BASE-AGENT-003 4 '+mode+' assignee clear: first returned resource link matched full native incident, explicit null assignee, new revision, companion roles and attributed reassign history; '+(review?'separate open read review':'autonomous read')+'; original write outcome, native records, revisions, state-changing audit and paging unchanged; zero outbound requests');
 return value;
}

/** Explicit Assignee Unassigned retains the Commander without restoring its fallback. */
export async function focusedAssigneeClearReplay(){
 const runtime=await agentRuntime({clock:null});
 try{
  assert.equal((await runtime.adopt()).status,200);
  const workspace=await runtime.http('/api/workspace');assert.equal(workspace.status,200);
  const owner=(await workspace.json()).member;
  const service=await runtime.http('/api/command',{type:'service',id:'agent-foreign-service',
   name:'Synthetic separate clear scope',environment:'production',owner:owner.id,runbook:[],pager:''});
  assert.equal(service.status,200);await service.json();
  // Preserve completed calls from other tools in every clear and replay baseline.
  const declared=await runtime.tool('oncall.incidents.declare',{service:'agent-service',title:'Synthetic unrelated retained incident',
   summary:'Synthetic independent coordination',severity:'warning',idempotency_key:randomUUID()});
  assert.equal(declared.status,200);assert.equal(declared.result.isError,false);
  const incident=declared.result.structuredContent;
  const noted=await runtime.tool('oncall.notes.add',{incident:incident.id,revision:incident.revision,
   text:'Synthetic unrelated retained note',idempotency_key:randomUUID()});
  assert.equal(noted.status,200);assert.equal(noted.result.isError,false);
  assert.deepEqual(await runtime.outboundRequests(),[]);
  const originals=(await runtime.db.prepare('SELECT * FROM agent_door_calls ORDER BY agent,key').all()).results;
  assert.equal(originals.length,2,'Both unrelated native mutations retain their original calls');
  await roleClearReplay(runtime,'assignee','Assignee',observation=>readClearedAssignee(runtime,observation));
  const retained=(await runtime.db.prepare('SELECT * FROM agent_door_calls ORDER BY agent,key').all()).results;
  for(const call of originals)assert.deepEqual(retained.find(row=>row.agent===call.agent&&row.key===call.key),call,
   'The complete matrix and its final policy restoration retain unrelated outcomes and their original expiry');
 }finally{await runtime.close()}
}
