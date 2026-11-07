import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Recover a committed reassignment after losing the real MCP response body. */
export async function droppedReassignmentReplay(runtime){
 const {db,http,tool,adopt,discardToolResponse,context}=runtime;
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audit=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const calls=key=>rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,key);
 async function command(input){
  const response=await http('/api/command',input);assert.equal(response.status,200);
  return response.json();
 }
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  let incident=await command({type:'declare',service:'agent-service',title:'Synthetic lost reassignment response '+mode,
   summary:'Ordinary coordination without protected evidence',severity:'warning',alerts:[]});
  incident=await command({type:'transition',incident:incident.id,revision:incident.revision,
   state:'acknowledged',summary:'Human accepts initial responsibility before reassignment'});
  const before=await snapshot(),priorAudit=await audit();
  const previous=incident.assignee??incident.commander;
  assert.ok(previous,'Reassignment starts with an assigned incident');
  const responder=before.application.members.find(row=>row.active&&row.role==='responder'&&row.id!==previous);
  assert.ok(responder,'Reassignment names an existing distinct active responder');
  const args={change:'reassign',incident:incident.id,revision:incident.revision,member:responder.id,
   reason:'Synthetic handoff keeps <coordination> & responsibility literal under '+mode,idempotency_key:randomUUID()};
  const lost=await discardToolResponse('oncall.incidents.update',args);
  assert.equal(lost.status,200);
  assert.equal(lost.discarded,true);assert.equal(lost.aborted,true);assert.equal(lost.bodyRead,false);
  // Establish the first outcome directly from D1 before issuing any retry.
  const committedCalls=await calls(args.idempotency_key);
  assert.equal(committedCalls.length,1);assert.equal(committedCalls[0].state,'done');
  const call=committedCalls[0],saved=JSON.parse(call.outcome),once=await snapshot(),committedAudit=await audit();
  assert.equal(saved.outcome,'done');assert.equal(saved.decision.id,call.decision_id);
  assert.equal(saved.decision.disposition,disposition);
  assert.deepEqual(saved.decision.classes.map(row=>row.class),['standard']);
  const stored=JSON.parse(once.records.oc_incidents.find(row=>row.id===incident.id).data);
  assert.deepEqual(saved.result,stored);assert.deepEqual(once.application.incidents.find(row=>row.id===incident.id),stored);
  assert.equal(stored.assignee,responder.id);assert.notEqual(stored.assignee,previous);
  assert.equal(stored.commander,incident.commander);assert.equal(stored.state,incident.state);
  assert.deepEqual(stored.actions,incident.actions);assert.deepEqual(stored.alerts,[]);
  assert.equal(stored.revision,args.revision+1);
  assert.equal(once.application.revision,before.application.revision+1);
  assert.equal(once.records.workspace_control[0].revision,before.records.workspace_control[0].revision+1);
  assert.equal(once.application.incidents.length,before.application.incidents.length);
  assert.deepEqual(once.application.incidents.filter(row=>row.id!==incident.id),before.application.incidents.filter(row=>row.id!==incident.id));
  assert.equal(stored.timeline.length,incident.timeline.length+1);assert.deepEqual(stored.timeline.slice(0,-1),incident.timeline);
  const entry=stored.timeline.at(-1),previousMember=before.application.members.find(row=>row.id===previous);
  assert.equal(entry.kind,'reassign');assert.equal(stored.timeline.filter(row=>row.kind==='reassign').length,1);
  assert.equal(entry.text,'assignee: '+previousMember.name+' → '+responder.name+': '+args.reason);
  assert.equal(entry.actor,context.agentId);assert.equal(entry.metadata.agent.agent.id,context.agentId);
  assert.notEqual(entry.actor,responder.id,'The agent never impersonates the new assignee');
  const commits=once.records.oc_admin_audit,priorCommits=before.records.oc_admin_audit;
  assert.equal(commits.length,priorCommits.length+1,'One native state-changing audit commits before retry');
  for(const prior of priorCommits)assert.deepEqual(commits.find(row=>row.id===prior.id),prior);
  const commit=commits.find(row=>!priorCommits.some(prior=>prior.id===row.id));
  assert.equal(commit.outcome,'accepted');assert.equal(commit.workspace_before,before.application.revision);
  assert.equal(commit.workspace_after,once.application.revision);
  assert.equal(commit.paging_after,commit.paging_before);assert.equal(commit.handoff_after,commit.handoff_before);
  assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals);
  assert.equal(once.records.agent_door_calls.length,before.records.agent_door_calls.length+1);
  for(const prior of before.records.agent_door_calls)assert.deepEqual(once.records.agent_door_calls.find(row=>row.agent===prior.agent&&row.key===prior.key),prior);
  const reviews=once.records.agent_door_reviews;
  assert.equal(reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
  for(const prior of before.records.agent_door_reviews)assert.deepEqual(reviews.find(row=>row.id===prior.id),prior);
  if(mode==='held'){
   const review=reviews.find(row=>row.id===saved.review.id);
   assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,call.decision_id);
  }else assert.equal(saved.review,undefined);
  for(const name of Object.keys(once.records).filter(name=>name.startsWith('paging_')))assert.deepEqual(once.records[name],before.records[name]);
  assert.deepEqual(committedAudit.slice(0,-1),priorAudit);assert.equal(committedAudit.length,priorAudit.length+1);
  const original=JSON.parse(committedAudit.at(-1).row);
  assert.equal(original.id,call.decision_id);assert.equal(original.tool,'oncall.incidents.update');
  assert.equal(original.outcome,'done');assert.equal(original.replay_of,null);assert.equal(original.idempotency_key,args.idempotency_key);
  const replay=await tool('oncall.incidents.update',args);
  assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.notEqual(replay.body.id,lost.id);
  assert.equal(replay.result.isError,false);assert.deepEqual(replay.result.structuredContent,saved.result);
  assert.deepEqual(replay.result._meta['com.runeditrun/review'],saved.review);
  assert.deepEqual(await calls(args.idempotency_key),committedCalls);
  assert.deepEqual(await snapshot(),once,'Retry preserves all native effects, revisions, timeline, state-changing audit, original call and outcome, approvals, reviews and paging');
  const retried=await audit();
  assert.deepEqual(retried.slice(0,-1),committedAudit);assert.equal(retried.length,committedAudit.length+1);
  const attempt=JSON.parse(retried.at(-1).row);
  assert.equal(attempt.id,replay.decision.id);assert.notEqual(attempt.id,original.id);
  assert.equal(attempt.tool,'oncall.incidents.update');assert.equal(attempt.idempotency_key,args.idempotency_key);
  assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,call.decision_id);
  assert.equal(attempt.operation_id,original.operation_id);
  assert.deepEqual(await runtime.outboundRequests(),[],'Reassignment and retry attempt zero outbound requests');
  console.log('PROBE BASE-AGENT-012 acceptance 2 '+mode+' reassign: real MCP response destroyed at headers with unread body; D1 confirms completed call, saved outcome and one attributed reassignment before retry; original revision and key with new RPC id return exact result; one incident and workspace revision increment, one native audit commit; '+(mode==='held'?'one original open review; ':'')+'retained effects unchanged; one linked replay-attempt audit; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}
