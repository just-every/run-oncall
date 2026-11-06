import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Recover a committed service edit without ever reading its first response. */
export async function droppedServiceReplay(runtime){
 const {db,http,tool,adopt,discardToolResponse,context}=runtime;
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audit=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const calls=key=>rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,key);
 const workspace=await http('/api/workspace');assert.equal(workspace.status,200);
 const owner=(await workspace.json()).member.id,serviceId='synthetic-oncall-'+randomUUID();
 const prepared=await http('/api/command',{type:'service',id:serviceId,name:'Synthetic service replay fixture',
  environment:'test',owner,runbook:['Retain synthetic recovery evidence'],
  pager:'https://example.test/synthetic-oncall-runbook',dependencies:['agent-service']});
 assert.equal(prepared.status,200);await prepared.body?.cancel();
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const read=await tool('oncall.services.read',{id:serviceId});
  assert.equal(read.status,200);assert.equal(read.result.isError,false);
  const service=read.result.structuredContent.data[0];
  assert.equal(service.id,serviceId);assert.match(service.etag,/^[a-f0-9]{64}$/);
  const args={id:service.id,etag:service.etag,name:'Synthetic recovered service '+mode,
   environment:service.environment,owner:service.owner,runbook:service.runbook,pager:service.pager,
   dependencies:service.dependencies??[],idempotency_key:randomUUID()};
  const before=await snapshot(),beforeAudit=await audit();
  const lost=await discardToolResponse('oncall.services.update',args);
  assert.equal(lost.status,200);
  assert.equal(lost.discarded,true);assert.equal(lost.aborted,true);assert.equal(lost.bodyRead,false);

  // Establish both the effect and original outcome directly from real D1.
  const committedCalls=await calls(args.idempotency_key);
  assert.equal(committedCalls.length,1);
  const call=committedCalls[0],saved=JSON.parse(call.outcome);
  assert.equal(call.state,'done');assert.equal(saved.outcome,'done');
  assert.equal(saved.decision.id,call.decision_id);assert.equal(saved.decision.disposition,disposition);
  assert.deepEqual(saved.decision.classes.map(row=>row.class),['standard']);
  const once=await snapshot(),committed=JSON.parse(once.records.oc_services.find(row=>row.id===service.id).data);
  const {etag,...result}=saved.result;
  assert.deepEqual(result,committed);
  assert.equal(committed.name,args.name);
  assert.notEqual(committed.name,service.name);
  for(const field of ['environment','owner','runbook','pager'])assert.deepEqual(committed[field],service[field]);
  assert.deepEqual(committed.dependencies??[],service.dependencies??[]);
  assert.notEqual(etag,args.etag);
  assert.equal(etag,createHash('sha256').update(JSON.stringify({...committed,dependencies:committed.dependencies??[]})).digest('hex'));
  assert.deepEqual(once.application.services.find(row=>row.id===service.id),committed);
  assert.equal(once.application.revision,before.application.revision+1);
  assert.equal(once.records.workspace_control[0].revision,before.records.workspace_control[0].revision+1);
  assert.deepEqual(once.application.incidents,before.application.incidents,'Service edit preserves every incident timeline');
  assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals);
  for(const name of Object.keys(before.records).filter(name=>name.startsWith('paging_')))assert.deepEqual(once.records[name],before.records[name]);

  const originals=await audit();
  assert.deepEqual(originals.slice(0,-1),beforeAudit);assert.equal(originals.length,beforeAudit.length+1);
  const originalRow=originals.at(-1),original=JSON.parse(originalRow.row);
  assert.equal(originalRow.id,call.decision_id);assert.equal(original.outcome,'done');assert.equal(original.replay_of,null);
  assert.equal(original.tool,'oncall.services.update');assert.equal(original.idempotency_key,args.idempotency_key);
  assert.equal(original.agent.id,context.agentId);assert.deepEqual(original.resource,{kind:'service',id:service.id});
  const commits=once.records.oc_admin_audit.filter(row=>!before.records.oc_admin_audit.some(prior=>prior.id===row.id));
  assert.equal(commits.length,1,'Lost response follows exactly one native state-changing audit commit');
  const commit=commits[0],label=(kind,id)=>once.records.oc_audit_identities.find(row=>row.kind===kind&&row.entity_id===id)?.label;
  assert.equal(commit.kind,'service.update');assert.equal(commit.outcome,'accepted');
  assert.equal(commit.workspace_before,before.application.revision);assert.equal(commit.workspace_after,once.application.revision);
  assert.ok(label('agent',context.agentId));assert.equal(commit.actor,label('agent',context.agentId));
  assert.ok(label('entity',service.id));assert.equal(commit.subject,label('entity',service.id));
  assert.ok(label('member',original.sponsor.id));assert.equal(commit.source,label('member',original.sponsor.id));
  const reviews=once.records.agent_door_reviews,priorReviews=before.records.agent_door_reviews;
  assert.equal(reviews.length,priorReviews.length+Number(mode==='held'));
  for(const review of priorReviews)assert.deepEqual(reviews.find(row=>row.id===review.id),review);
  if(mode==='held'){
   const review=reviews.find(row=>row.id===saved.review.id);
   assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,call.decision_id);
  }else assert.equal(saved.review,undefined);

  // Retry the original arguments, including the now-old ETag, with a new RPC id.
  const replay=await tool('oncall.services.update',args);
  assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.notEqual(replay.body.id,lost.id);
  assert.equal(replay.result.isError,false);assert.deepEqual(replay.result.structuredContent,saved.result);
  assert.equal(replay.result.structuredContent.etag,etag);
  assert.deepEqual(replay.result._meta['com.runeditrun/review'],saved.review);
  assert.deepEqual(await calls(args.idempotency_key),committedCalls,'Retry preserves the original call and stored outcome');
  assert.deepEqual(await snapshot(),once,'Retry preserves native records, revisions, timelines, state-changing audit, call and outcome custody, approvals, reviews and paging');
  const retried=await audit();
  assert.deepEqual(retried.slice(0,-1),originals);assert.equal(retried.length,originals.length+1);
  const attempt=JSON.parse(retried.at(-1).row);
  assert.equal(attempt.id,replay.decision.id);assert.notEqual(attempt.id,call.decision_id);
  assert.equal(attempt.tool,'oncall.services.update');assert.equal(attempt.outcome,'replayed');
  assert.equal(attempt.idempotency_key,args.idempotency_key);assert.equal(attempt.replay_of,call.decision_id);
  assert.equal(attempt.operation_id,original.operation_id);
  assert.deepEqual(await runtime.outboundRequests(),[],'Service edit and lost-response replay make zero outbound requests');
  console.log('PROBE BASE-AGENT-012 acceptance 2 '+mode+' oncall.services.update: authorized service name edit with current projected ETag; real response destroyed at headers with unread body; D1 confirms committed service and original outcome; identical arguments and original ETag with new RPC id -> exact saved result and resulting ETag; one workspace revision and agent-attributed native audit commit; '+(mode==='held'?'one original open review; ':'no review; ')+'retry preserves all native effects and custody; one linked replay-attempt audit; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}
