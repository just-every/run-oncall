import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** A completed service edit keeps its outcome when its old ETag is retried. */
export async function changedServiceNameReplay(runtime){
 const {db,http,tool,adopt,context}=runtime;
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const audit=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const name='oncall.services.update',owner=(await read('/api/workspace')).member;
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const found=await tool('oncall.services.read',{id:'agent-service'});
  assert.equal(found.status,200);assert.equal(found.result.isError,false);
  const service=found.result.structuredContent.data[0];
  assert.equal(service.id,'agent-service');assert.match(service.etag,/^[a-f0-9]{64}$/);
  const before=await snapshot(),pagingBefore=await read('/api/paging/state');
  const originalService=before.application.services.find(row=>row.id===service.id);
  const args={id:service.id,etag:service.etag,name:'Synthetic service replay '+mode,
   environment:service.environment,owner:service.owner,runbook:service.runbook,pager:service.pager,
   ...(originalService.dependencies===undefined?{}:{dependencies:service.dependencies}),idempotency_key:randomUUID()};
  assert.notEqual(args.name,originalService.name);
  const first=await tool(name,args);
  assert.equal(first.status,200);assert.equal(first.body.error,undefined);assert.equal(first.result.isError,false);
  assert.deepEqual(first.decision.classes.map(row=>row.class),['standard']);
  assert.equal(first.decision.disposition,disposition);
  const once=await snapshot(),pagingOnce=await read('/api/paging/state'),result=first.result.structuredContent;
  assert.equal(once.application.revision,before.application.revision+1,'One service edit advances the workspace once');
  const savedService=once.application.services.find(row=>row.id===service.id);
  assert.deepEqual(savedService,{...originalService,name:args.name},'Only the authorized service name changes');
  assert.deepEqual(once.application.services.filter(row=>row.id!==service.id),before.application.services.filter(row=>row.id!==service.id));
  assert.deepEqual(result,{...savedService,dependencies:service.dependencies,etag:result.etag});
  assert.match(result.etag,/^[a-f0-9]{64}$/);assert.notEqual(result.etag,args.etag,'Keep the original projected ETag after the write changes it');
  assert.deepEqual(once.application.incidents,before.application.incidents,'Service edits preserve incident records and timelines');
  assert.deepEqual(pagingOnce,{...pagingBefore,workspaceRevision:once.application.revision});
  const commits=once.records.oc_admin_audit.filter(row=>!before.records.oc_admin_audit.some(prior=>prior.id===row.id));
  assert.equal(commits.length,1,'Exactly one native state-changing audit commit');
  const commit=commits[0];assert.equal(commit.kind,'service.update');assert.equal(commit.outcome,'accepted');
  assert.equal(commit.workspace_before,before.application.revision);assert.equal(commit.workspace_after,once.application.revision);
  for(const [field,kind,id] of [['actor','agent',context.agentId],['subject','entity',service.id],['source','member',owner.id]]){
   const identity=await db.prepare('SELECT label FROM oc_audit_identities WHERE kind=? AND entity_id=?').bind(kind,id).first();
   assert.equal(commit[field],identity.label,'The service commit retains its native '+field+' attribution');
  }
  const entry=once.application.audit.at(-1);
  assert.equal(once.application.audit.length,before.application.audit.length+1);
  assert.equal(entry.actor,context.agentId);assert.equal(entry.kind,'service');
  assert.ok(entry.text.includes(args.name));
  assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals,'Standard service edits need no approval');
  const calls=await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key);
  assert.equal(calls.length,1);assert.equal(calls[0].state,'done');assert.equal(calls[0].decision_id,first.decision.id);
  const stored=JSON.parse(calls[0].outcome);
  assert.equal(stored.outcome,'done');assert.deepEqual(stored.result,result);
  assert.deepEqual(stored.review,first.result._meta['com.runeditrun/review']);
  assert.equal(once.records.agent_door_reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
  for(const prior of before.records.agent_door_reviews)assert.deepEqual(once.records.agent_door_reviews.find(row=>row.id===prior.id),prior);
  if(mode==='held'){
   const review=once.records.agent_door_reviews.find(row=>row.id===stored.review.id);
   assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,first.decision.id);
   assert.equal((await read('/agents/api/reviews')).reviews.find(row=>row.id===review.id).state,'open');
  }else assert.equal(stored.review,undefined);
  const originalAudit=await audit(),original=originalAudit.find(row=>row.id===first.decision.id);
  assert.ok(original);
  const originalRow=JSON.parse(original.row);
  assert.equal(originalRow.outcome,'done');assert.equal(originalRow.replay_of,null);
  assert.equal(originalRow.idempotency_key,args.idempotency_key);
  assert.deepEqual(originalRow.resource,{kind:'service',id:service.id});
  const conflict=await tool(name,{...args,name:'Different synthetic service name '+mode});
  assert.equal(conflict.status,200);assert.equal(conflict.body.error,undefined);assert.equal(conflict.result.isError,true);
  assert.notEqual(conflict.body.id,first.body.id);
  assert.equal(conflict.result._meta['com.runeditrun/error'].code,'idempotency_conflict');
  assert.equal(JSON.parse(conflict.result.content[0].text).code,'idempotency_conflict');
  assert.equal(conflict.result.structuredContent,undefined,'A name conflict discloses no private result');
  assert.deepEqual(await snapshot(),once,'Changed name preserves native records, revisions, timelines, state-changing audit, original call and outcome, approvals, reviews and paging');
  assert.deepEqual(await read('/api/paging/state'),pagingOnce);
  const refusedAudit=await audit();
  assert.deepEqual(refusedAudit.slice(0,-1),originalAudit);assert.equal(refusedAudit.length,originalAudit.length+1);
  const refusal=JSON.parse(refusedAudit.at(-1).row);
  assert.notEqual(refusal.id,first.decision.id);assert.equal(refusal.agent.id,context.agentId);
  assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,'idempotency_conflict');
  assert.equal(refusal.idempotency_key,args.idempotency_key);assert.equal(refusal.review,null);assert.equal(refusal.approval,null);
  const replay=await tool(name,args);
  assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.equal(replay.result.isError,false);
  assert.notEqual(replay.body.id,first.body.id);assert.notEqual(replay.body.id,conflict.body.id);
  assert.deepEqual(replay.result.structuredContent,stored.result);assert.deepEqual(replay.result._meta['com.runeditrun/review'],stored.review);
  assert.deepEqual(await snapshot(),once,'Exact original arguments and ETag return stored custody without another write or held review');
  assert.deepEqual(await read('/api/paging/state'),pagingOnce);
  const replayAudit=await audit();
  assert.deepEqual(replayAudit.slice(0,-1),refusedAudit);assert.equal(replayAudit.length,refusedAudit.length+1);
  const attempt=JSON.parse(replayAudit.at(-1).row);
  assert.equal(attempt.id,replay.decision.id);assert.equal(attempt.agent.id,context.agentId);
  assert.equal(attempt.tool,name);assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,first.decision.id);
  assert.equal(attempt.operation_id,originalRow.operation_id);assert.equal(attempt.idempotency_key,args.idempotency_key);
  assert.deepEqual(await runtime.outboundRequests(),[],'The original service edit, name conflict and exact retry attempt no outbound requests');
  console.log('PROBE BASE-AGENT-012 acceptance 3 '+mode+' oncall.services.update: name-only edit -> one workspace revision and agent-attributed native service audit; original key and projected ETag with different schema-valid name -> isError idempotency_conflict in metadata and text, no private result; exact original arguments with new RPC id -> stored result and original review; native records, revisions, timelines, state-changing audit, call and outcome custody, approvals, reviews and paging unchanged; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}

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
