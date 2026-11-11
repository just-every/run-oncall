import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,access} from 'node:fs/promises';
import {lexer} from 'marked';
import {agentRuntime,agentEffectSnapshot,pauseMatrix,policyAdoption,consentRevocationMatrix} from './agent-door-runtime.mjs';
import {recoveredResolutionTarget} from './oncall-agent-fixtures.mjs';
import {eraseReplay,eraseClasses} from './oncall-agent-erase-replay.mjs';
import specialist from './oncall-agent-native.mjs';
import {scheduleReplay} from './oncall-agent-schedule-replay.mjs';
import {teamReplay} from './oncall-agent-team-replay.mjs';
import {staleReassignmentNativeRevision} from './oncall-agent-incident-revisions.mjs';
import {staleScribeExpectedRevision} from './oncall-agent-role-revisions.mjs';
import {staleCommunicationsExpectedRevision,staleCommunicationsNativeRevision} from './oncall-agent-communications-revisions.mjs';
import {changedServiceNameReplay} from './oncall-agent-service-replay.mjs';
import {auditRows} from '../src/modules/agent-door/conformance/audit-pages.mjs';
import {droppedReassignmentReplay} from './oncall-agent-incident-replay.mjs';
import {changedReassignmentReasonConflict} from './oncall-agent-incident-replay.mjs';
import {changedScribeReasonConflict,droppedScribeAssignmentReplay,droppedRoleAssignmentReplay} from './oncall-agent-role-replay.mjs';
import {changedCommunicationsReasonConflict,droppedCommunicationsAssignmentReplay} from './oncall-agent-communications-replay.mjs';
import {scopedSurface} from '../src/modules/agent-door/conformance/subset.mjs';
import {nativeTransport} from './oncall-agent-transport.mjs';
import {accessToken,seconds,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';
import {AGENT_CLASSES} from '../src/modules/agent-door/conformance/surface.mjs';

/** Lose the real MCP response, establish its native commit, then recover by key. */
async function droppedDeclarationReplay(runtime){
 const {db,http,tool,adopt,discardToolResponse,context}=runtime;
 const state=async()=> (await (await http('/api/state')).json());
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const native=async()=>({
  control:await rows('SELECT * FROM workspace_control ORDER BY id'),
  incidents:await rows('SELECT * FROM oc_incidents ORDER BY id'),
  audit:await rows('SELECT * FROM oc_audit ORDER BY id'),
  commits:await rows("SELECT * FROM oc_admin_audit WHERE outcome='accepted' AND (workspace_before<>workspace_after OR paging_before<>paging_after OR handoff_before<>handoff_after) ORDER BY ordinal"),
  paging:await rows('SELECT * FROM paging_control ORDER BY id'),
  jobs:await rows('SELECT * FROM paging_jobs ORDER BY id'),
  receipts:await rows('SELECT * FROM paging_receipts ORDER BY id'),
 });
 const calls=key=>rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,key);
 const reviews=()=>rows('SELECT * FROM agent_door_reviews ORDER BY id');
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const before=await native(),beforeState=await state(),beforeReviews=await reviews();
  const args={service:'agent-service',title:'Lost response under '+mode+' policy',summary:'Native coordination with no outbound work',severity:'warning',idempotency_key:randomUUID()};
  const lost=await discardToolResponse('oncall.incidents.declare',args);
  assert.equal(lost.status,200);
  assert.equal(lost.discarded,true);assert.equal(lost.aborted,true);assert.equal(lost.bodyRead,false);
  // The first outcome comes only from native D1, never from the discarded body.
  const committedCalls=await calls(args.idempotency_key);
  assert.equal(committedCalls.length,1);assert.equal(committedCalls[0].state,'done');
  const call=committedCalls[0],saved=JSON.parse(call.outcome),once=await native(),onceState=await state(),onceReviews=await reviews();
  assert.equal(saved.outcome,'done');assert.equal(saved.decision.id,call.decision_id);
  assert.equal(saved.decision.disposition,disposition);
  assert.equal(once.control[0].revision,before.control[0].revision+1);
  assert.equal(once.incidents.length,before.incidents.length+1);
  const incident=JSON.parse(once.incidents.find(row=>row.id===saved.result.id).data);
  assert.deepEqual(incident,saved.result);
  assert.equal(incident.title,args.title);assert.equal(incident.service,args.service);assert.equal(incident.revision,1);
  const declarations=incident.timeline.filter(row=>row.kind==='declared');
  assert.equal(declarations.length,1);assert.equal(declarations[0].metadata.agent.agent.id,context.agentId);
  assert.equal(once.commits.length,before.commits.length+1,'The lost response follows exactly one native application audit commit');
  assert.deepEqual(once.jobs,before.jobs);assert.deepEqual(once.receipts,before.receipts);assert.deepEqual(once.paging,before.paging);
  assert.equal(onceState.revision,beforeState.revision+1);
  assert.equal(onceReviews.length,beforeReviews.length+Number(mode==='held'));
  if(mode==='held'){
   const review=onceReviews.find(row=>row.id===saved.review.id);
   assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,call.decision_id);
  }else assert.equal(saved.review,undefined);
  const originalRows=await rows('SELECT * FROM agent_door_audit WHERE id=?',call.decision_id);
  assert.equal(originalRows.length,1);
  const original=JSON.parse(originalRows[0].row);
  assert.equal(original.outcome,'done');assert.equal(original.replay_of,null);
  assert.equal(original.idempotency_key,args.idempotency_key);
  const attempts=await rows('SELECT * FROM agent_door_audit WHERE agent=? AND json_extract(row,\'$.idempotency_key\')=? ORDER BY sequence',context.agentId,args.idempotency_key);
  assert.equal(attempts.length,1);
  const replay=await tool('oncall.incidents.declare',args);
  assert.equal(replay.status,200);assert.notEqual(replay.body.id,lost.id);
  assert.equal(replay.result.isError,false);assert.deepEqual(replay.result.structuredContent,saved.result);
  assert.deepEqual(replay.result._meta['com.runeditrun/review'],saved.review);
  assert.deepEqual(await calls(args.idempotency_key),committedCalls,'Retry preserves the original call and stored outcome');
  assert.deepEqual(await native(),once,'Retry creates no second incident, declaration timeline, application revision or state-changing audit commit');
  assert.deepEqual(await state(),onceState);
  assert.deepEqual(await reviews(),onceReviews,'Held replay keeps the one original review');
  assert.deepEqual(await rows('SELECT * FROM agent_door_audit WHERE id=?',call.decision_id),originalRows);
  const retried=await rows('SELECT * FROM agent_door_audit WHERE agent=? AND json_extract(row,\'$.idempotency_key\')=? ORDER BY sequence',context.agentId,args.idempotency_key);
  assert.equal(retried.length,2);
  const attempt=JSON.parse(retried[1].row);
  assert.equal(attempt.id,replay.decision.id);assert.notEqual(attempt.id,original.id);
  assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,call.decision_id);
  assert.equal(attempt.operation_id,original.operation_id);
  assert.deepEqual(await runtime.outboundRequests(),[],'Declaration and lost-response replay attempt no outbound requests');
  console.log('PROBE BASE-AGENT-012 acceptance 2 '+mode+': real MCP declaration response destroyed at headers with unread body; native D1 outcome replayed with new RPC id; one incident, declaration and application commit; '+(mode==='held'?'one original open review; ':'')+'separate linked replay audit; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}

/** Lost acknowledgment and follow-up responses recover the original native effect. */
async function droppedCoordinationReplay(runtime){
 const {db,http,tool,adopt,discardToolResponse,context}=runtime;
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audit=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const calls=key=>rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,key);
 const fixtures=['acknowledge','follow-up'].map(id=>context.surface.journey.find(row=>row.id===id));
 const initial=await snapshot(),responder=initial.application.members.find(row=>row.active&&row.role==='responder');
 assert.ok(responder,'Lost-response coordination names a real active responder');
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const preparation=await http('/api/command',{type:'declare',service:'agent-service',title:'Synthetic lost coordination response '+mode,
   summary:'Native coordination without protected evidence',severity:'warning',alerts:[]});
  assert.equal(preparation.status,200);
  let incident=await preparation.json();
  for(const fixture of fixtures){
   const args={...fixture.args,incident:incident.id,revision:incident.revision,idempotency_key:randomUUID(),
    ...(fixture.id==='acknowledge'?{member:responder.id}:{owner:responder.id})};
   const before=await snapshot(),priorAudit=await audit();
   const lost=await discardToolResponse(fixture.tool,args);
   assert.equal(lost.status,200);
   assert.equal(lost.discarded,true);assert.equal(lost.aborted,true);assert.equal(lost.bodyRead,false);
   // Establish the first result from D1 before retrying; the HTTP body was destroyed.
   const committedCalls=await calls(args.idempotency_key);
   assert.equal(committedCalls.length,1);assert.equal(committedCalls[0].state,'done');
   const call=committedCalls[0],saved=JSON.parse(call.outcome),once=await snapshot(),onceAudit=await audit();
   assert.equal(saved.outcome,'done');assert.equal(saved.decision.id,call.decision_id);
   assert.deepEqual(saved.decision.classes.map(({class:cls})=>({class:cls})),fixture.expect);
   assert.equal(saved.decision.disposition,disposition);
   const native=JSON.parse(once.records.oc_incidents.find(row=>row.id===incident.id).data);
   assert.deepEqual(native,saved.result);
   assert.deepEqual(once.application.incidents.find(row=>row.id===incident.id),native);
   assert.equal(native.revision,args.revision+1);
   assert.equal(once.application.revision,before.application.revision+1);
   assert.equal(once.records.workspace_control[0].revision,before.records.workspace_control[0].revision+1);
   assert.equal(once.application.incidents.length,before.application.incidents.length);
   assert.equal(native.timeline.length,incident.timeline.length+1);
   assert.deepEqual(native.timeline.slice(0,-1),incident.timeline);
   const entry=native.timeline.at(-1);
   assert.equal(entry.metadata.agent.agent.id,context.agentId);
   assert.notEqual(entry.actor,responder.id,'The agent does not impersonate the named human');
   if(fixture.id==='acknowledge'){
    assert.equal(native.state,'acknowledged');assert.equal(native.commander,responder.id);assert.equal(native.assignee,responder.id);
    assert.deepEqual(entry.lifecycle,{from:'declared',to:'acknowledged',member:responder.id});
    assert.equal(entry.kind,'transition');assert.ok(entry.text.endsWith(args.summary));
    assert.deepEqual(native.actions,incident.actions);
   }else{
    assert.equal(native.state,incident.state);assert.equal(native.commander,responder.id);assert.equal(native.assignee,responder.id);
    assert.equal(native.actions.length,incident.actions.length+1);assert.deepEqual(native.actions.slice(0,-1),incident.actions);
    const action=native.actions.at(-1);
    assert.ok(action.id);assert.equal(action.title,args.title);assert.equal(action.owner,responder.id);
    assert.equal(action.due,args.due);assert.equal(action.priority,'P1');assert.equal(action.completionPolicy,'human-review');
    assert.equal(action.done,false);assert.equal(action.evidence,'');assert.equal(action.submission,undefined);assert.equal(action.accepted,undefined);
    assert.equal(entry.kind,'action');assert.ok(entry.text.includes(action.title));
   }
   assert.equal(once.records.oc_admin_audit.length,before.records.oc_admin_audit.length+1,'Exactly one state-changing native audit commits before retry');
   assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals,'Standard-only coordination creates no approval');
   const reviews=once.records.agent_door_reviews;
   assert.equal(reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
   for(const review of before.records.agent_door_reviews)assert.deepEqual(reviews.find(row=>row.id===review.id),review);
   if(mode==='held'){
    const review=reviews.find(row=>row.id===saved.review.id);
    assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,call.decision_id);
   }else assert.equal(saved.review,undefined);
   for(const name of Object.keys(once.records).filter(name=>name.startsWith('paging_')))assert.deepEqual(once.records[name],before.records[name]);
   assert.deepEqual(onceAudit.slice(0,-1),priorAudit);assert.equal(onceAudit.length,priorAudit.length+1);
   const original=JSON.parse(onceAudit.at(-1).row);
   assert.equal(original.id,call.decision_id);assert.equal(original.tool,fixture.tool);
   assert.equal(original.outcome,'done');assert.equal(original.replay_of,null);assert.equal(original.idempotency_key,args.idempotency_key);
   const replay=await tool(fixture.tool,args);
   assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.notEqual(replay.body.id,lost.id);
   assert.equal(replay.result.isError,false);assert.deepEqual(replay.result.structuredContent,saved.result);
   assert.deepEqual(replay.result._meta['com.runeditrun/review'],saved.review);
   assert.deepEqual(await calls(args.idempotency_key),committedCalls);
   assert.deepEqual(await snapshot(),once,'Retry preserves application records, revisions, timeline, state-changing audit, original call and outcome, approvals, reviews and paging');
   const retried=await audit();
   assert.deepEqual(retried.slice(0,-1),onceAudit);assert.equal(retried.length,onceAudit.length+1);
   const attempt=JSON.parse(retried.at(-1).row);
   assert.equal(attempt.id,replay.decision.id);assert.notEqual(attempt.id,original.id);
   assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,call.decision_id);assert.equal(attempt.operation_id,original.operation_id);
   assert.equal(attempt.tool,fixture.tool);assert.equal(attempt.idempotency_key,args.idempotency_key);
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log('PROBE BASE-AGENT-012 acceptance 2 '+mode+' '+fixture.tool+': real MCP response destroyed at headers with unread body; native D1 original call, outcome and one agent-attributed '+(fixture.id==='acknowledge'?'acknowledgment for '+responder.name:'open owned P1 human-review follow-up '+native.actions.at(-1).id)+' committed before retry; new RPC id returns exact stored result; all retained effects unchanged; '+(mode==='held'?'one original open review; ':'')+'one linked replay-attempt audit; zero outbound requests');
   incident=native;
  }
 }
 assert.equal((await adopt()).status,200);
}

/** A lost note response replays native custody without appending another note. */
async function droppedNoteReplay(runtime){
 const {db,http,tool,adopt,discardToolResponse,context}=runtime;
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audit=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const preparation=await http('/api/command',{type:'declare',service:'agent-service',title:'Synthetic lost note response '+mode,
   summary:'Synthetic coordination without protected evidence',severity:'warning',alerts:[]});
  assert.equal(preparation.status,200);
  const incident=await preparation.json();
  const args={incident:incident.id,revision:incident.revision,text:'Synthetic internal note with lost response '+mode,idempotency_key:randomUUID()};
  const before=await snapshot(),priorAudit=await audit();
  const lost=await discardToolResponse('oncall.notes.add',args);
  assert.equal(lost.status,200);
  assert.equal(lost.discarded,true);assert.equal(lost.aborted,true);assert.equal(lost.bodyRead,false);
  // Establish the completed call and its effect from D1 before any retry.
  const calls=await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key);
  assert.equal(calls.length,1);assert.equal(calls[0].state,'done');
  const call=calls[0],saved=JSON.parse(call.outcome),once=await snapshot();
  assert.equal(saved.outcome,'done');assert.equal(saved.decision.id,call.decision_id);
  assert.equal(saved.decision.disposition,disposition);
  assert.deepEqual(saved.decision.classes.map(row=>row.class),['standard']);
  const stored=once.application.incidents.find(row=>row.id===incident.id);
  assert.deepEqual(saved.result,stored);
  assert.deepEqual(JSON.parse(once.records.oc_incidents.find(row=>row.id===incident.id).data),stored);
  assert.equal(once.application.incidents.length,before.application.incidents.length);
  assert.deepEqual(once.application.incidents.filter(row=>row.id!==incident.id),before.application.incidents.filter(row=>row.id!==incident.id));
  assert.equal(once.application.revision,before.application.revision+1);
  assert.equal(stored.revision,incident.revision+1);
  assert.equal(stored.timeline.length,incident.timeline.length+1);
  assert.deepEqual(stored.timeline.slice(0,-1),incident.timeline);
  const note=stored.timeline.at(-1);
  assert.equal(note.kind,'note');assert.equal(note.text,args.text);
  assert.equal(note.metadata.agent.agent.id,context.agentId);
  assert.equal(stored.timeline.filter(row=>row.kind==='note'&&row.text===args.text).length,1);
  assert.equal(once.records.oc_admin_audit.length,before.records.oc_admin_audit.length+1,'The lost note response follows one native state-changing audit commit');
  for(const commit of before.records.oc_admin_audit)assert.deepEqual(once.records.oc_admin_audit.find(row=>row.id===commit.id),commit);
  assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals);
  assert.equal(once.records.agent_door_calls.length,before.records.agent_door_calls.length+1);
  for(const prior of before.records.agent_door_calls)assert.deepEqual(once.records.agent_door_calls.find(row=>row.agent===prior.agent&&row.key===prior.key),prior);
  const reviews=once.records.agent_door_reviews;
  assert.equal(reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
  for(const review of before.records.agent_door_reviews)assert.deepEqual(reviews.find(row=>row.id===review.id),review);
  if(mode==='held'){
   const review=reviews.find(row=>row.id===saved.review.id);
   assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,call.decision_id);
  }else assert.equal(saved.review,undefined);
  for(const name of Object.keys(once.records).filter(name=>name.startsWith('paging_')))assert.deepEqual(once.records[name],before.records[name]);
  const committedAudit=await audit();
  assert.deepEqual(committedAudit.slice(0,-1),priorAudit);assert.equal(committedAudit.length,priorAudit.length+1);
  const original=JSON.parse(committedAudit.at(-1).row);
  assert.equal(original.id,call.decision_id);assert.equal(original.tool,'oncall.notes.add');
  assert.equal(original.outcome,'done');assert.equal(original.replay_of,null);
  assert.equal(original.idempotency_key,args.idempotency_key);
  assert.equal(original.agent.id,context.agentId);
  const replay=await tool('oncall.notes.add',args);
  assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.notEqual(replay.body.id,lost.id);
  assert.equal(replay.result.isError,false);assert.deepEqual(replay.result.structuredContent,saved.result);
  assert.deepEqual(replay.result._meta['com.runeditrun/review'],saved.review);
  assert.deepEqual(await snapshot(),once,'Lost-response retry preserves application records, revisions, timeline, state-changing audit, original calls and outcomes, approvals, reviews and paging');
  const retried=await audit();
  assert.deepEqual(retried.slice(0,-1),committedAudit);assert.equal(retried.length,committedAudit.length+1);
  const attempt=JSON.parse(retried.at(-1).row);
  assert.equal(attempt.id,replay.decision.id);assert.notEqual(attempt.id,original.id);
  assert.equal(attempt.tool,'oncall.notes.add');assert.equal(attempt.idempotency_key,args.idempotency_key);
  assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,call.decision_id);
  assert.equal(attempt.operation_id,original.operation_id);
  assert.deepEqual(await runtime.outboundRequests(),[],'Note and lost-response retry attempt no outbound requests');
  console.log('PROBE BASE-AGENT-012 acceptance 2 '+mode+' note: real MCP response destroyed at headers with unread body; native D1 confirms one completed call, stored outcome and agent-attributed note before retry; new RPC id returns exact stored result; records, revisions, timeline, state-changing audit, call custody, approvals, reviews and paging unchanged; '+(mode==='held'?'one original open review; ':'')+'one linked replay audit; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}

/** Completed native writes refuse changed arguments without consuming custody. */
async function changedArgumentConflicts(runtime){
 const {db,http,tool,adopt,context}=runtime;
 const ownerResponse=await http('/api/workspace');assert.equal(ownerResponse.status,200);
 const owner=(await ownerResponse.json()).member;
 const acknowledgeFixture=context.surface.journey.find(row=>row.id==='acknowledge');
 const followUpFixture=context.surface.journey.find(row=>row.id==='follow-up');
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const attempts=key=>rows("SELECT * FROM agent_door_audit WHERE agent=? AND json_extract(row,'$.idempotency_key')=? ORDER BY sequence",context.agentId,key);
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  async function complete(name,args,field,changed){
   const before=await snapshot(),first=await tool(name,args);
   assert.equal(first.status,200);assert.equal(first.body.error,undefined);assert.equal(first.result.isError,false);
   assert.deepEqual(first.decision.classes.map(row=>row.class),['standard']);
   assert.equal(first.decision.disposition,disposition);
   const once=await snapshot(),result=first.result.structuredContent;
   assert.equal(once.application.revision,before.application.revision+1);
   assert.deepEqual(once.application.incidents.find(row=>row.id===result.id),result);
   assert.equal(once.records.oc_admin_audit.length,before.records.oc_admin_audit.length+1,'The supported write commits exactly one native state-changing audit');
   assert.equal(once.records.agent_door_approvals.length,before.records.agent_door_approvals.length,'A standard-only write needs no approval');
   assert.equal(once.records.agent_door_reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
   if(name==='oncall.incidents.declare'){
    assert.equal(once.application.incidents.length,before.application.incidents.length+1);
    assert.equal(result.title,args.title);assert.equal(result.revision,1);
    assert.equal(result.timeline.filter(row=>row.kind==='declared').length,1);
   }else{
    const prior=before.application.incidents.find(row=>row.id===args.incident);
    assert.equal(once.application.incidents.length,before.application.incidents.length);
    assert.equal(result.revision,args.revision+1);assert.equal(result.timeline.length,prior.timeline.length+1);
    assert.deepEqual(result.timeline.slice(0,-1),prior.timeline);
    const entry=result.timeline.at(-1);
    if(name==='oncall.notes.add')assert.equal(entry.text,args.text);
    if(name==='oncall.incidents.acknowledge'){
     assert.equal(prior.state,'declared');assert.equal(result.state,'acknowledged');
     assert.equal(result.commander,args.member);assert.equal(result.assignee,args.member);
     assert.equal(entry.kind,'transition');
     assert.deepEqual(entry.lifecycle,{from:'declared',to:'acknowledged',member:args.member});
     assert.equal(entry.text,'declared → acknowledged: '+args.summary);
     assert.deepEqual(result.actions,prior.actions);
    }
    if(name==='oncall.actions.create'){
     assert.equal(result.state,prior.state);assert.equal(result.commander,prior.commander);
     assert.equal(result.actions.length,prior.actions.length+1);
     assert.deepEqual(result.actions.slice(0,-1),prior.actions);
     const action=result.actions.at(-1);assert.ok(action.id);
     assert.equal(action.title,args.title);assert.equal(action.owner,args.owner);assert.equal(action.due,args.due);
     assert.equal(action.priority,args.priority);assert.equal(action.completionPolicy,args.completionPolicy);
     assert.equal(action.done,false);assert.equal(action.evidence,'');
     assert.equal(entry.kind,'action');
     assert.ok(entry.text.includes(action.title));assert.ok(entry.text.includes(action.due));
    }
   }
   assert.equal(result.timeline.at(-1).metadata.agent.agent.id,context.agentId);
   assert.equal(result.timeline.at(-1).actor,context.agentId);
   assert.equal(result.timeline.at(-1).metadata.agent.for.id,owner.id);
   const calls=await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key);
   assert.equal(calls.length,1);assert.equal(calls[0].state,'done');assert.equal(calls[0].decision_id,first.decision.id);
   const stored=JSON.parse(calls[0].outcome);
   assert.equal(stored.outcome,'done');assert.deepEqual(stored.result,result);
   assert.deepEqual(stored.review,first.result._meta['com.runeditrun/review']);
   if(mode==='held'){
    const review=once.records.agent_door_reviews.find(row=>row.id===stored.review.id);
    assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,first.decision.id);
   }else assert.equal(stored.review,undefined);
   const original=await attempts(args.idempotency_key);
   assert.equal(original.length,1);assert.equal(JSON.parse(original[0].row).outcome,'done');
   const conflict=await tool(name,{...args,[field]:changed});
   assert.equal(conflict.status,200);assert.equal(conflict.body.error,undefined);
   assert.notEqual(conflict.body.id,first.body.id);assert.equal(conflict.result.isError,true);
   assert.equal(conflict.result._meta['com.runeditrun/error'].code,'idempotency_conflict');
   assert.equal(JSON.parse(conflict.result.content[0].text).code,'idempotency_conflict');
   assert.equal(conflict.result.structuredContent,undefined);
   assert.deepEqual(await snapshot(),once,'Changed arguments preserve all native records, revisions, timeline, state-changing audit, original calls and outcomes, approvals, reviews and paging');
   const refused=await attempts(args.idempotency_key);
   assert.deepEqual(refused.slice(0,-1),original,'Refusal preserves original outcome audit custody');assert.equal(refused.length,2);
   const refusal=JSON.parse(refused.at(-1).row);
   assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,'idempotency_conflict');
   assert.equal(refusal.idempotency_key,args.idempotency_key);
   const replay=await tool(name,args);
   assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.equal(replay.result.isError,false);
   assert.notEqual(replay.body.id,first.body.id);assert.notEqual(replay.body.id,conflict.body.id);
   assert.deepEqual(replay.result.structuredContent,stored.result);assert.deepEqual(replay.result._meta['com.runeditrun/review'],stored.review);
   assert.deepEqual(await snapshot(),once,'Exact retry returns the stored outcome without another native effect or held review');
   const retried=await attempts(args.idempotency_key);
   assert.deepEqual(retried.slice(0,-1),refused);assert.equal(retried.length,3);
   const retry=JSON.parse(retried.at(-1).row);
   assert.equal(retry.outcome,'replayed');assert.equal(retry.replay_of,first.decision.id);
   assert.deepEqual(await runtime.outboundRequests(),[],'Supported write, conflict and exact retry make zero outbound requests');
   console.log('PROBE BASE-AGENT-012 acceptance 3 '+mode+' '+name+': completed standard-only write; original key with changed '+field+' -> isError idempotency_conflict; native records, revisions, timeline, state-changing audit, call and outcome custody, approvals, reviews and paging unchanged; exact arguments with new RPC id -> stored outcome and no duplicate effect or held review; zero outbound requests');
   return result;
  }
  const declared=await complete('oncall.incidents.declare',{service:'agent-service',title:'Synthetic coordination conflict '+mode,summary:'Native coordination without outside action',severity:'warning',idempotency_key:randomUUID()},'title','Changed synthetic coordination title');
  const acknowledged=await complete(acknowledgeFixture.tool,{...acknowledgeFixture.args,incident:declared.id,revision:declared.revision,member:owner.id,idempotency_key:randomUUID()},'summary','Changed synthetic responsibility summary');
  const noted=await complete('oncall.notes.add',{incident:declared.id,revision:acknowledged.revision,text:'Synthetic internal coordination note',idempotency_key:randomUUID()},'text','Changed synthetic internal coordination note');
  await complete(followUpFixture.tool,{...followUpFixture.args,incident:declared.id,revision:noted.revision,owner:owner.id,idempotency_key:randomUUID()},'title','Changed synthetic follow-up title');
 }
 assert.equal((await adopt()).status,200);
}

/** Aged native MCP outcomes survive short-lived credential and policy renewal. */
async function agedReplayRetention(){
 // Keep bootstrap sessions current for D1's wall-clock expiry checks while
 // retaining whole-second claims and advancing the platform clock to age calls.
 const started=Math.floor(Date.now()/3600000)*3600000,day=24*60*60*1000;
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  // Each policy has an isolated emitted Worker and actual D1 custody. Advancing
  // this platform clock ages real calls, rather than inserting synthetic rows.
  const runtime=await agentRuntime({clock:started});
  try{
   const {db,http,tool,context}=runtime;
   assert.equal((await runtime.adopt(policy)).status,200);
   const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
   const snapshot=()=>agentEffectSnapshot(runtime);
   const audit=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
   const envelope=async()=>JSON.parse((await rows('SELECT envelope FROM agent_door_state WHERE id=1'))[0].envelope);
   const authority=({iat,exp,...value})=>value;
   const token=()=>accessToken(context,{act:{sub:context.agentId,name:'Responder assistant',specialist:'oncall-responder'}});
   const claims=value=>JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString());
   const identity=({iat,exp,jti,...value})=>value;
   const bearer=await token(),originalClaims=claims(bearer),prepared=[];
   assert.equal(originalClaims.iat,started/1000);assert.equal(originalClaims.exp-originalClaims.iat,300);
   async function complete(name,args){
    const before=await snapshot(),first=await tool(name,args,{},bearer);
    assert.equal(first.status,200);assert.equal(first.body.error,undefined);assert.equal(first.result.isError,false);
    assert.deepEqual(first.decision.classes.map(row=>row.class),['standard']);
    assert.equal(first.decision.disposition,disposition);
    const after=await snapshot(),result=first.result.structuredContent;
    assert.equal(after.application.revision,before.application.revision+1);
    assert.equal(after.records.oc_admin_audit.length,before.records.oc_admin_audit.length+1);
    assert.deepEqual(after.application.incidents.find(row=>row.id===result.id),result);
    assert.equal(result.timeline.at(-1).metadata.agent.agent.id,context.agentId);
    if(name==='oncall.incidents.declare'){
     assert.equal(after.application.incidents.length,before.application.incidents.length+1);
     assert.equal(result.title,args.title);assert.equal(result.revision,1);
     assert.equal(result.timeline.filter(row=>row.kind==='declared').length,1);
    }else{
     const prior=before.application.incidents.find(row=>row.id===args.incident);
     assert.equal(after.application.incidents.length,before.application.incidents.length);
     assert.equal(result.revision,prior.revision+1);
     assert.deepEqual(result.timeline.slice(0,-1),prior.timeline);
     assert.equal(result.timeline.length,prior.timeline.length+1);assert.equal(result.timeline.at(-1).text,args.text);
    }
    assert.equal(after.records.agent_door_reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
    assert.deepEqual(after.records.agent_door_approvals,before.records.agent_door_approvals);
    const calls=await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key);
    assert.equal(calls.length,1);
    const [call]=calls,saved=JSON.parse(call.outcome);
    assert.equal(call.created_at,started);assert.ok(call.expires_at>started+day);
    assert.equal(call.state,'done');assert.equal(call.decision_id,first.decision.id);
    assert.equal(saved.outcome,'done');assert.deepEqual(saved.result,result);
    assert.deepEqual(saved.review,first.result._meta['com.runeditrun/review']);
    if(mode==='held'){
     const review=after.records.agent_door_reviews.find(row=>row.id===saved.review.id);
     assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,call.decision_id);
    }else assert.equal(saved.review,undefined);
    const original=(await audit()).find(row=>row.id===call.decision_id);
    assert.equal(JSON.parse(original.row).outcome,'done');
    prepared.push({name,args:structuredClone(args),first,saved,calls,original});
    return result;
   }
   const incident=await complete('oncall.incidents.declare',{service:'agent-service',title:'Synthetic retained coordination '+mode,
    summary:'Native coordination without outbound action',severity:'warning',idempotency_key:randomUUID()});
   await complete('oncall.notes.add',{incident:incident.id,revision:incident.revision,text:'Synthetic retained internal note '+mode,idempotency_key:randomUUID()});
   const originalPolicy=await envelope(),effects=await snapshot(),ids=new Set(prepared.map(item=>item.first.body.id));
   for(const elapsed of [day,day+1000]){
    await runtime.time(started+elapsed);
    assert.ok(originalClaims.exp<seconds(context.now),'The initial short-lived bearer has expired');
    const previousPolicy=await envelope();
    assert.equal((await runtime.renewPolicy()).status,200);
    const renewed=await envelope();
    assert.deepEqual(authority(renewed),authority(originalPolicy),'Receiving-door renewal keeps document, sequence, revision and signed authority');
    assert.ok(renewed.iat>previousPolicy.iat);assert.equal(renewed.exp-renewed.iat,300);
    // Renewal intentionally updates signed custody; establish the replay
    // baseline afterwards so that only replay effects are compared.
    const before=await snapshot();
    assert.deepEqual(before.application,effects.application);
    for(const table of ['agent_door_calls','agent_door_reviews','agent_door_approvals'])assert.deepEqual(before.records[table],effects.records[table]);
    const fresh=await token(),freshClaims=claims(fresh);
    assert.notEqual(fresh,bearer);assert.notEqual(freshClaims.jti,originalClaims.jti);
    assert.deepEqual(identity(freshClaims),identity(originalClaims),'Fresh bearer preserves person, agent, client, consent and scopes');
    assert.equal(freshClaims.iat,(started+elapsed)/1000);assert.equal(freshClaims.exp-freshClaims.iat,300);
    for(const {name,args,first,saved,calls,original} of prepared){
     const auditBefore=await audit(),replay=await tool(name,args,{},fresh);
     assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.equal(replay.result.isError,false);
     assert.ok(!ids.has(replay.body.id),'Each aged retry has a new JSON-RPC id');ids.add(replay.body.id);
     assert.deepEqual(replay.result.structuredContent,saved.result,'Return the original native structured outcome even after a later note');
     assert.deepEqual(replay.result._meta['com.runeditrun/review'],saved.review);
     assert.deepEqual(await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key),calls,'Original call, outcome and expiry custody do not slide on replay');
     assert.deepEqual(await snapshot(),before,'Aged replay preserves application records, revisions, timeline, state-changing audit, approvals, original reviews and paging');
     const auditAfter=await audit();
     assert.deepEqual(auditAfter.slice(0,-1),auditBefore);assert.equal(auditAfter.length,auditBefore.length+1);
     assert.deepEqual(auditAfter.find(row=>row.id===original.id),original);
     const attempt=JSON.parse(auditAfter.at(-1).row),initial=JSON.parse(original.row);
     assert.equal(attempt.id,replay.decision.id);assert.notEqual(attempt.id,first.decision.id);
     assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,first.decision.id);
     assert.equal(attempt.operation_id,initial.operation_id);assert.equal(attempt.idempotency_key,args.idempotency_key);
     assert.deepEqual(await runtime.outboundRequests(),[]);
     console.log('PROBE BASE-AGENT-012 acceptance 1 '+mode+' '+name+' T+'+elapsed+'ms: renewed same policy and fresh same-identity token; new RPC id -> original structured outcome; one original native effect and no duplicate held review; all replay-baseline records unchanged; linked attempt audit only; original expiry retained; zero outbound requests');
    }
   }
  }finally{await runtime.close()}
 }
}

/** Optional expected revision refuses before custody, then permits a fresh call. */
async function staleNoteRevision(runtime){
 const {db,http,tool,adopt,context}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 // Request-audit scratch and refusal relay bookkeeping are separate from
 // retained state-changing audit, which is compared explicitly below.
 const tables=(await rows("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name"))
  .map(row=>row.name).filter(name=>!['agent_door_audit','agent_door_relay','oc_admin_audit','oc_audit_clock'].includes(name));
 const commits=()=>rows("SELECT * FROM oc_admin_audit WHERE outcome='accepted' AND (workspace_before<>workspace_after OR paging_before<>paging_after OR handoff_before<>handoff_after) ORDER BY ordinal");
 const snapshot=async()=>({
  application:await read('/api/state'),paging:await read('/api/paging/state'),commits:await commits(),
  records:Object.fromEntries((await db.batch(tables.map(name=>db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"')))).map((result,index)=>[
   tables[index],result.results.map(row=>{
    // Capacity counters may advance; agent identity and authority must not.
    if(tables[index]==='agent_door_agents'){const {window,requests,...identity}=row;return identity}
    return row;
   }).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
  ])),
 });
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const preparation=await http('/api/command',{type:'declare',service:'agent-service',title:'Synthetic expected revision '+mode,
   summary:'Synthetic coordination without protected evidence',severity:'warning',alerts:[]});
  assert.equal(preparation.status,200);
  const incident=await preparation.json();
  const args={incident:incident.id,revision:incident.revision,expected_revision:incident.revision-1,
   text:'Synthetic note after revision reload '+mode,idempotency_key:randomUUID()};
  const before=await snapshot(),priorAudit=await rows('SELECT * FROM agent_door_audit ORDER BY sequence');
  const stale=await tool('oncall.notes.add',args);
  assert.equal(stale.status,200);assert.equal(stale.result.isError,true);
  const error=stale.result._meta['com.runeditrun/error'];
  assert.equal(error.code,'revision_conflict');assert.equal(error.current_revision,incident.revision);
  assert.deepEqual(JSON.parse(stale.result.content[0].text),{code:'revision_conflict',current_revision:incident.revision});
  assert.equal(stale.result.structuredContent,undefined);
  assert.deepEqual(await snapshot(),before,'Stale optional revision preserves native records, revisions, timeline, state-changing audit, replay, approval, review and paging custody');
  const refusedAudit=await rows('SELECT * FROM agent_door_audit ORDER BY sequence');
  assert.deepEqual(refusedAudit.slice(0,priorAudit.length),priorAudit);
  assert.equal(refusedAudit.length,priorAudit.length+1);
  const refusal=JSON.parse(refusedAudit.at(-1).row);
  assert.equal(refusal.tool,'oncall.notes.add');assert.equal(refusal.code,'revision_conflict');assert.equal(refusal.outcome,'refused');
  assert.equal(refusal.idempotency_key,args.idempotency_key);assert.equal(refusal.agent.id,context.agentId);
  assert.deepEqual(refusal.resource,{kind:'incident',id:incident.id});

  const freshArgs={...args,expected_revision:error.current_revision,idempotency_key:randomUUID()};
  const fresh=await tool('oncall.notes.add',freshArgs);
  assert.equal(fresh.status,200);assert.equal(fresh.result.isError,false);assert.equal(fresh.decision.disposition,disposition);
  assert.equal(fresh.result.structuredContent.id,incident.id);
  const once=await snapshot(),saved=once.application.incidents.find(row=>row.id===incident.id);
  assert.deepEqual(fresh.result.structuredContent,saved);
  assert.equal(saved.revision,incident.revision+1);assert.equal(once.application.revision,before.application.revision+1);
  assert.equal(saved.timeline.length,incident.timeline.length+1);
  assert.deepEqual(saved.timeline.slice(0,-1),incident.timeline);
  const entry=saved.timeline.at(-1);
  assert.equal(entry.text,args.text);assert.equal(entry.metadata.agent.agent.id,context.agentId);
  assert.equal(once.commits.length,before.commits.length+1);assert.deepEqual(once.commits.slice(0,-1),before.commits);
  assert.deepEqual(once.paging,{...before.paging,workspaceRevision:once.application.revision});
  for(const name of tables.filter(name=>name.startsWith('paging_')))assert.deepEqual(once.records[name],before.records[name]);
  assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals);
  const reviews=once.records.agent_door_reviews;
  assert.equal(reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
  for(const review of before.records.agent_door_reviews)assert.deepEqual(reviews.find(row=>row.id===review.id),review);
  if(mode==='held'){
   const review=reviews.find(row=>row.id===fresh.result._meta['com.runeditrun/review'].id);
   assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,fresh.decision.id);
  }else assert.equal(fresh.result._meta['com.runeditrun/review'],undefined);
  const replay=await tool('oncall.notes.add',freshArgs);
  assert.notEqual(replay.body.id,fresh.body.id);assert.equal(replay.result.isError,false);
  assert.deepEqual(replay.result.structuredContent,fresh.result.structuredContent);
  assert.deepEqual(replay.result._meta['com.runeditrun/review'],fresh.result._meta['com.runeditrun/review']);
  assert.deepEqual(await snapshot(),once,'Fresh-key replay adds no duplicate note, revision, native audit commit, review or custody');
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+': valid native note revision '+incident.revision+' with stale expected_revision -> isError revision_conflict, exact current_revision '+error.current_revision+'; durable state and custody unchanged; fresh key using returned revision -> '+disposition+', one note and application commit; retry unchanged; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}

/** Ordinary coordination tools diagnose optional revision before any effect. */
async function staleCoordinationRevision(runtime){
 const {db,http,tool,adopt,context}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const responder=(await read('/api/state')).members.find(row=>row.active&&row.role==='responder');
 assert.ok(responder,'The acknowledgment and follow-up name a real active responder');
 const credential='synthetic-oncall-'+randomUUID();
 const client=await http('/api/automation/clients',{name:'Synthetic revision scope',key:credential,
  services:['agent-service'],permissions:['services:read','incidents:read','incidents:write','actions:write']});
 assert.equal(client.status,201);await client.json();
 async function declare(service,title){
  const response=await http('/api/command',{type:'declare',service,title,summary:'Synthetic coordination without protected evidence',severity:'warning',alerts:[]});
  assert.equal(response.status,200);return response.json();
 }
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const scoped=await tool('oncall.services.read',{id:'agent-service'},{},credential);
  assert.equal(scoped.status,200);assert.equal(scoped.result.isError,false);
  assert.equal(scoped.result.structuredContent.data[0].id,'agent-service');
  const foreign=await declare('agent-foreign-service','Synthetic private revision '+mode);
  for(const name of ['oncall.incidents.acknowledge','oncall.actions.create']){
   const incident=await declare('agent-service','Synthetic optional revision '+name+' '+mode);
   assert.equal(incident.state,'declared');assert.deepEqual(incident.alerts,[]);assert.deepEqual(incident.actions,[]);
   const input=name==='oncall.incidents.acknowledge'
    ? {member:responder.id,summary:'Synthetic agent acknowledgment for the active responder'}
    : {title:'Synthetic human-reviewed follow-up',owner:responder.id,due:'2026-12-01',priority:'P1',completionPolicy:'human-review'};
   const args={...input,incident:incident.id,revision:incident.revision,expected_revision:incident.revision-1,idempotency_key:randomUUID()};
   const before=await snapshot(),pagingBefore=await read('/api/paging/state'),priorAudit=await audits();
   assert.ok(before.records.agent_door_calls.length>0,'Original replay custody is populated before refusal');
   assert.ok(before.records.agent_door_reviews.length>0,'Existing review custody is populated before refusal');
   const stale=await tool(name,args);
   assert.equal(stale.status,200);assert.equal(stale.body.error,undefined);assert.equal(stale.result.isError,true);
   const error={code:'revision_conflict',current_revision:incident.revision};
   assert.deepEqual(stale.result._meta['com.runeditrun/error'],error);
   assert.deepEqual(JSON.parse(stale.result.content[0].text),error);
   assert.equal(stale.result.structuredContent,undefined);
   assert.deepEqual(await snapshot(),before,'Stale optional revision preserves native records, revisions, timeline, state-changing audit, original replay outcomes, approvals, reviews and paging');
   assert.deepEqual(await read('/api/paging/state'),pagingBefore);
   const refusedAudit=await audits();
   assert.deepEqual(refusedAudit.slice(0,-1),priorAudit);assert.equal(refusedAudit.length,priorAudit.length+1);
   const refusal=JSON.parse(refusedAudit.at(-1).row);
   assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,'revision_conflict');
   assert.equal(refusal.idempotency_key,args.idempotency_key);assert.equal(refusal.agent.id,context.agentId);
   assert.deepEqual(refusal.resource,{kind:'incident',id:incident.id});

   const returned=stale.result._meta['com.runeditrun/error'].current_revision;
   const freshArgs={...args,revision:returned,expected_revision:returned,idempotency_key:randomUUID()};
   const fresh=await tool(name,freshArgs);
   assert.equal(fresh.status,200);assert.equal(fresh.body.error,undefined);assert.equal(fresh.result.isError,false);
   assert.deepEqual(fresh.decision.classes.map(row=>row.class),['standard']);
   assert.equal(fresh.decision.disposition,disposition);
   const once=await snapshot(),saved=once.application.incidents.find(row=>row.id===incident.id);
   assert.deepEqual(fresh.result.structuredContent,saved);
   assert.equal(once.application.revision,before.application.revision+1);assert.equal(saved.revision,returned+1);
   assert.equal(once.application.incidents.length,before.application.incidents.length);
   assert.equal(saved.timeline.length,incident.timeline.length+1);assert.deepEqual(saved.timeline.slice(0,-1),incident.timeline);
   const entry=saved.timeline.at(-1);
   assert.equal(entry.actor,context.agentId);assert.equal(entry.metadata.agent.agent.id,context.agentId);
   assert.notEqual(entry.actor,responder.id,'An agent acknowledgment never becomes a human attestation');
   if(name==='oncall.incidents.acknowledge'){
    assert.equal(saved.state,'acknowledged');assert.equal(saved.commander,responder.id);assert.equal(saved.assignee,responder.id);
    assert.deepEqual(entry.lifecycle,{from:'declared',to:'acknowledged',member:responder.id});
    assert.ok(entry.text.includes(input.summary));
    assert.equal(saved.timeline.filter(row=>row.lifecycle?.to==='acknowledged').length,1);
    assert.deepEqual(saved.actions,incident.actions);
   }else{
    assert.equal(saved.state,incident.state);assert.equal(saved.actions.length,incident.actions.length+1);
    const action=saved.actions.at(-1);assert.ok(action.id);assert.equal(action.title,input.title);
    assert.equal(action.owner,responder.id);assert.equal(action.due,input.due);
    assert.equal(action.priority,'P1');assert.equal(action.completionPolicy,'human-review');
    assert.equal(action.done,false);assert.equal(action.evidence,'');
    assert.equal(action.submission,undefined);assert.equal(action.accepted,undefined);
   }
   assert.equal(once.records.oc_admin_audit.length,before.records.oc_admin_audit.length+1,'Exactly one native state-changing audit commit');
   for(const record of before.records.oc_admin_audit)assert.deepEqual(once.records.oc_admin_audit.find(row=>row.id===record.id),record);
   assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals);
   for(const table of Object.keys(before.records).filter(name=>name.startsWith('paging_')))assert.deepEqual(once.records[table],before.records[table]);
   assert.deepEqual(await read('/api/paging/state'),{...pagingBefore,workspaceRevision:once.application.revision});
   const reviews=once.records.agent_door_reviews;
   assert.equal(reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
   for(const record of before.records.agent_door_reviews)assert.deepEqual(reviews.find(row=>row.id===record.id),record);
   if(mode==='held'){
    const review=reviews.find(row=>row.id===fresh.result._meta['com.runeditrun/review'].id);
    assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,fresh.decision.id);
    assert.equal((await read('/agents/api/reviews')).reviews.find(row=>row.id===review.id).state,'open');
   }else assert.equal(fresh.result._meta['com.runeditrun/review'],undefined);
   const calls=await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,freshArgs.idempotency_key);
   assert.equal(calls.length,1);assert.equal(calls[0].state,'done');assert.equal(calls[0].decision_id,fresh.decision.id);
   const stored=JSON.parse(calls[0].outcome);
   assert.equal(stored.outcome,'done');assert.deepEqual(stored.result,saved);
   assert.deepEqual(stored.review,fresh.result._meta['com.runeditrun/review']);
   const originalAudit=await rows('SELECT * FROM agent_door_audit WHERE id=?',fresh.decision.id);
   const beforeRetry=await audits(),replay=await tool(name,freshArgs);
   assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.equal(replay.result.isError,false);
   assert.notEqual(replay.body.id,fresh.body.id);assert.notEqual(replay.body.id,stale.body.id);
   assert.deepEqual(replay.result.structuredContent,stored.result);
   assert.deepEqual(replay.result._meta['com.runeditrun/review'],stored.review);
   assert.deepEqual(await snapshot(),once,'Identical retry preserves the original outcome, single native effect and single held review');
   assert.deepEqual(await rows('SELECT * FROM agent_door_audit WHERE id=?',fresh.decision.id),originalAudit);
   const retried=await audits();assert.deepEqual(retried.slice(0,-1),beforeRetry);assert.equal(retried.length,beforeRetry.length+1);
   const attempt=JSON.parse(retried.at(-1).row);
   assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,fresh.decision.id);
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' '+name+': current native revision '+incident.revision+' with stale expected_revision -> isError revision_conflict and exact parent current_revision '+returned+' in metadata and text; no private result or native effect; fresh returned revision and key -> one agent-attributed '+(name==='oncall.incidents.acknowledge'?'acknowledgment naming active responder':'owned due-dated P1 human-review follow-up still open')+', '+disposition+'; new RPC id retry -> stored result, no duplicate effect or review; zero outbound requests');

   // Target authority is checked before revision disclosure, under both policies.
   const privateBefore=await snapshot();
   for(const target of [foreign,{id:'synthetic-oncall-'+randomUUID(),revision:foreign.revision}]){
    const denied=await tool(name,{...input,incident:target.id,revision:target.revision,expected_revision:target.revision-1,idempotency_key:randomUUID()},{},credential);
    assert.equal(denied.status,200);assert.equal(denied.body.error,undefined);assert.equal(denied.result.isError,true);
    assert.deepEqual(denied.result._meta['com.runeditrun/error'],{code:'not_found'});
    assert.deepEqual(JSON.parse(denied.result.content[0].text),{code:'not_found'});
    assert.equal(denied.result.structuredContent,undefined);
    assert.deepEqual(await snapshot(),privateBefore,'Missing and scoped-out targets expose no revision and change no native or replay custody');
   }
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' '+name+' non-disclosure: scoped client with valid current native revision and stale optional revision against foreign and missing incidents -> identical not_found, no revision or private result; native custody unchanged; zero outbound requests');
  }
 }
 assert.equal((await adopt()).status,200);
}
await agedReplayRetention();

const runtime=await agentRuntime();
const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
try{
 const {tool,mcp,http,adopt}=runtime;
 assert.equal(code(await tool('oncall.services.read',{id:'agent-service'})),'policy_unset');
 assert.equal((await adopt()).status,200);
 const listing=await mcp('tools/list');
 assert.equal(listing.status,200);assert.equal(listing.body.error,undefined);
 assert.ok(listing.result.tools.length>0,'The adopted policy must expose real tools');
 for(const listedTool of listing.result.tools){
  const classes=listedTool._meta?.['com.runeditrun/classes'];
  assert.ok(Array.isArray(classes)&&classes.length>0,`${listedTool.name} must declare its possible classes`);
  for(const cls of classes)assert.ok(AGENT_CLASSES.includes(cls),`${listedTool.name} declares uncatalogued class ${cls}`);
 }
 assert.equal(listing.result.nextCursor,undefined,'The catalog probe must enumerate the complete emitted list');
 console.log(`PROBE BASE-AGENT-006 point 5 listed tools: emitted Worker MCP -> all ${listing.result.tools.length} returned tools declare only fleet-catalog classes`);
 // Compare the whole generated inventory with a separately built public door.
 // The existing conformance journey executes each referenced computed class;
 // this check refuses dangling, wrong-tool and wrong-class fixture references.
 execFileSync(process.execPath,['scripts/write-agent-surface.mjs','--check'],{stdio:'inherit'});
 const surface=scopedSurface(runtime.context.surface),guide=await readFile('docs/agents.md','utf8');
 const codes=text=>[...text.matchAll(/`([^`]+)`/g)].map(match=>match[1]);
 const inventory=lexer(guide).filter(token=>token.type==='table'&&token.header.map(cell=>cell.text).join('|')==='Tool|Scope|Possible risk classes|Computed class checks');
 assert.ok(inventory.length>0,'The guide must contain its generated tool inventory');
 const documented=inventory.flatMap(table=>table.rows.map(row=>({name:codes(row[0].text)[0],scope:codes(row[1].text)[0],classes:codes(row[2].text),checks:row[3].text.split('; ').map(text=>codes(text))})));
 assert.deepEqual(documented.map(row=>row.name),surface.tools.map(row=>row.name));
 for(const row of documented){
  assert.deepEqual(row.checks.map(([cls])=>cls),row.classes,`${row.name} documents every possible computed class`);
  for(const [cls,test,...ids] of row.checks){
   assert.equal(test,'tests/agent-door.mjs','Class evidence must name the maintained executable journey');
   await access(test);
   const fixtures=surface.journey.filter(step=>step.tool===row.name&&step.expect.some(item=>item.class===cls));
   assert.ok(fixtures.length>0,`${row.name} ${cls} has executable class coverage`);
   assert.deepEqual(ids,fixtures.map(step=>step.id),`${row.name} ${cls} references its complete maintained coverage`);
  }
 }
 const inventoryState=async()=>({native:await (await http('/api/state')).json(),paging:await (await http('/api/paging/state')).json()});
 const permanentAudit=async()=>(await runtime.db.prepare('SELECT * FROM oc_admin_audit ORDER BY id').all()).results;
 for(const [label,document] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await adopt(document)).status,200);
  const before=await inventoryState(),edge=await runtime.outboundRequests();
  const discovered=await mcp('server/discover'),listed=await mcp('tools/list'),templates=await mcp('resources/templates/list');
  assert.equal(discovered.status,200);assert.equal(listed.status,200);assert.equal(templates.status,200);
  assert.deepEqual(discovered.result._meta['com.runeditrun/capabilities'].declared,runtime.context.surface.capabilities);
  assert.equal(discovered.result.capabilities.resources,undefined);
  assert.equal(listed.result.nextCursor,undefined);
  assert.deepEqual(documented.map(({checks,...row})=>row),listed.result.tools.map(row=>({name:row.name,scope:row._meta['com.runeditrun/scope'],classes:row._meta['com.runeditrun/classes']})));
  assert.deepEqual(templates.result.resourceTemplates,surface.resources);
  assert.deepEqual(surface.resources,[]);
  // MCP retains its required protocol bookkeeping; the public guide itself
  // makes no permanent audit write or native effect.
  const beforeGuideAudit=await permanentAudit();
  const response=await http('/docs/agents');assert.equal(response.status,200);
  const html=await response.text(),tables=[...html.matchAll(/<table>([\s\S]*?)<\/table>/g)].map(match=>match[1]);
  const served=tables.filter(table=>table.includes('<th>Computed class checks</th>')).flatMap(table=>[...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].filter(match=>match[1].includes('<td>')).map(match=>[...match[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(cell=>[...cell[1].matchAll(/<code>([^<]+)<\/code>/g)].map(code=>code[1]))));
  assert.deepEqual(served,documented.map(row=>[[row.name],[row.scope],row.classes,row.checks.flat()]));
  assert.deepEqual(await permanentAudit(),beforeGuideAudit,'The public guide writes no permanent audit');
  assert.deepEqual(await inventoryState(),before,'Guide and discovery reads preserve native data and paging');
  assert.deepEqual(await runtime.outboundRequests(),edge);
  console.log(`PROBE BASE-AGENT-013 1 ${label}: GET /docs/agents and MCP discovery -> ${documented.length} exact tools, scopes and class sets; no resource templates; event target withheld; native and paging unchanged; zero outbound requests`);
  console.log(`PROBE BASE-AGENT-013 2 ${label}: generated class references -> every documented class names tests/agent-door.mjs and all matching maintained fixture IDs`);
 }
 assert.equal((await adopt()).status,200);
 await policyAdoption(runtime);
 await pauseMatrix(runtime);
 await droppedDeclarationReplay(runtime);
 await droppedCoordinationReplay(runtime);
 await droppedNoteReplay(runtime);
 await droppedReassignmentReplay(runtime);
 await droppedScribeAssignmentReplay(runtime);
 await droppedRoleAssignmentReplay(runtime,'commander','Commander');
 await droppedCommunicationsAssignmentReplay(runtime);
 await changedArgumentConflicts(runtime);
 await changedServiceNameReplay(runtime);
 await changedReassignmentReasonConflict(runtime);
 await changedScribeReasonConflict(runtime);
 await changedCommunicationsReasonConflict(runtime);
 await consentRevocationMatrix(runtime);
 await staleNoteRevision(runtime);
 await staleCoordinationRevision(runtime);
 // Resolve native targets before any policy disposition; cached outcomes
 // still require current policy, scopes and live native record authority.
 const owner=(await (await http('/api/workspace')).json()).member;
 // Create real coordination work under the held policy. Retained pending work
 // must remain a person's decision even if the company later allows autonomy.
 {
 const native=async()=> (await (await http('/api/state')).json());
 const tables=(await runtime.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name").all()).results.map(row=>row.name);
 const records=async()=>Object.fromEntries((await runtime.db.batch(tables.map(name=>runtime.db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"')))).map((row,index)=>[tables[index],row.results.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
 for(const mode of ['autonomous','held']){
  assert.equal((await adopt(heldPolicy())).status,200);
  const reviewArgs={service:'agent-service',title:'Synthetic coordination review '+mode,summary:'Native coordination with no outside action',severity:'warning',idempotency_key:randomUUID()};
  const prepared=await tool('oncall.incidents.declare',reviewArgs);
  assert.equal(prepared.result.isError,false);
  assert.equal(prepared.decision.disposition,'review');
  const reviewId=prepared.result._meta['com.runeditrun/review'].id;
  const target=await recoveredResolutionTarget(runtime,'Synthetic person-only approval '+mode);
  const resolveArgs={incident:target.id,revision:target.revision,summary:'Retained recovery supports this coordination decision',idempotency_key:randomUUID()};
  const pending=await tool('oncall.incidents.resolve',resolveArgs);
  assert.equal(pending.decision.disposition,'approval');
  const approvalId=pending.result._meta['com.runeditrun/approval'].id;
  if(mode==='autonomous')assert.equal((await adopt()).status,200);
  const approvalPath='/agents/api/approvals/'+approvalId;
  const saved=(await (await http(approvalPath)).json()).approval;
  assert.equal(saved.state,'pending');assert.deepEqual(saved.approvals,[]);
  assert.deepEqual(saved.summary.nativeTarget,{kind:'incident',id:target.id});
  assert.ok(saved.summary.items.includes('Revision '+target.revision));
  assert.ok(Number.isInteger(saved.revision)&&saved.summary_sha256);
  assert.equal(saved.prepared_by.agent.id,runtime.context.agentId);
  assert.equal(saved.prepared_by.for.id,owner.id);
  const actionBody={revision:saved.revision,summary_sha256:saved.summary_sha256};
  const review=async()=>(await (await http('/agents/api/reviews')).json()).reviews.find(row=>row.id===reviewId);
  assert.equal((await review()).state,'open');
  assert.equal((await review()).marked_by,null);assert.equal((await review()).marked_at,null);
  const witness=async()=>({application:await native(),approval:(await (await http(approvalPath)).json()).approval,review:await review(),policy:await (await http('/agents/api/state')).json(),records:await records(),outbound:await runtime.outboundRequests()});
  const before=await witness();
  assert.deepEqual(before.outbound,[]);
  for(const withOwnerCookie of [false,true]){
   for(const [action,path,body] of [
    ['approve',approvalPath+'/approve',actionBody],
    ['mark reviewed','/agents/api/reviews/'+reviewId+'/reviewed',{}],
   ]){
    const refused=await runtime.agentHttp(path,body,{withOwnerCookie});
    assert.equal(refused.status,403,action+' requires a person even alongside an owner cookie');
    assert.deepEqual(await refused.json(),{code:'person_session_required'});
    assert.deepEqual(await witness(),before,action+' refusal preserves marks, policy, all durable records and outbound work');
    console.log('PROBE BASE-AGENT-008 acceptance2 '+mode+' '+action+' agent'+(withOwnerCookie?' with owner cookie':' alone')+': valid native action -> 403 person_session_required; approval, review, policy, application and outbound unchanged');
   }
  }
  const marked=await http('/agents/api/reviews/'+reviewId+'/reviewed',{});
  assert.equal(marked.status,200);
  const humanReview=(await marked.json()).review;
  assert.equal(humanReview.state,'reviewed');assert.equal(humanReview.marked_by,owner.id);
  assert.ok(Number.isFinite(Date.parse(humanReview.marked_at)));
  assert.equal(humanReview.prepared_by.agent,'Responder assistant');
  assert.equal(humanReview.prepared_by.for,owner.name);
  assert.deepEqual(await review(),humanReview);
  assert.deepEqual(await native(),before.application,'Mark reviewed does not repeat the native declaration');
  if(mode==='held'){
   const approved=await http(approvalPath+'/approve',actionBody);
   assert.equal(approved.status,200);
   const humanApproval=(await approved.json()).approval;
   assert.equal(humanApproval.state,'executed');
   assert.equal(humanApproval.revision,saved.revision);assert.equal(humanApproval.summary_sha256,saved.summary_sha256);
   assert.deepEqual(humanApproval.prepared_by,saved.prepared_by);
   assert.equal(humanApproval.approvals.length,1);
   assert.equal(humanApproval.approvals[0].person,owner.id);assert.equal(humanApproval.approvals[0].name,owner.name);
   const once=await native(),resolved=once.incidents.find(row=>row.id===target.id);
   assert.equal(resolved.state,'resolved');assert.equal(resolved.revision,target.revision+1);
   const entry=resolved.timeline.filter(row=>row.lifecycle?.to==='resolved');
   assert.equal(entry.length,1);assert.equal(entry[0].metadata.agent.agent.id,runtime.context.agentId);
   assert.equal(entry[0].metadata.agent.for.id,owner.id);
   assert.deepEqual(entry[0].metadata.agent.approvers,[{id:owner.id,name:owner.name}]);
   const retryApproval=await http(approvalPath+'/approve',actionBody);
   assert.equal(retryApproval.status,200);assert.deepEqual((await retryApproval.json()).approval,humanApproval);
   const retried=await tool('oncall.incidents.resolve',resolveArgs);
   assert.equal(retried.result.isError,false);assert.equal(retried.result.structuredContent.state,'resolved');
   assert.deepEqual(await native(),once,'Human approval and agent retry cannot duplicate the native resolution');
  }
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PASS person-only coordination '+mode+': native open review and pending approval; exact saved action bodies refused for agent alone and with owner cookie; actual human reviewer'+(mode==='held'?' and approver, agent preparer and once-only resolution':''));
 }
 assert.equal((await adopt()).status,200);
 }
 const key=randomUUID();
 const args={service:'agent-service',title:'Replay admission proof',summary:'Internal coordination beside the existing pager',severity:'warning',idempotency_key:key};
 const created=await tool('oncall.incidents.declare',args);
 assert.equal(created.result.isError,false);
 const replay=await tool('oncall.incidents.declare',args);
 assert.deepEqual(replay.result.structuredContent,created.result.structuredContent);
 const snapshot=async()=>JSON.stringify((await (await http('/api/state')).json()).incidents);
 const once=await snapshot();
 const audit=async(agentId=runtime.context.agentId)=>{
  const result=await auditRows({agentId,personJson:async path=>{
   const response=await http(path);assert.equal(response.status,200);return response.json();
  }});
  return {rows:result.rows,differs_from_policy:result.differs};
 };
 const original=(await audit()).rows.find(row=>row.id===created.decision.id);
 assert.deepEqual(original.resource,{kind:'service',id:'agent-service'});
 assert.equal(original.sponsor.id,owner.id);
 for(const [document,options,expected] of [
  [autonomousPolicy(),{paused:true},'agents_paused'],
  [{...autonomousPolicy(),rules:[{id:'stop',class:'*',do:'blocked'}]}, {},'policy_blocked'],
  [{...autonomousPolicy(),rules:[{id:'hold',class:'*',do:'approval',approver:['sponsor'],wait:'PT1H'}]}, {},'approval_required'],
 ]){
  assert.equal((await adopt(document,options)).status,200);
  const refused=await tool('oncall.incidents.declare',args);
  assert.equal(code(refused),expected);
  assert.equal(refused.result.structuredContent,undefined,'Refused replay cannot disclose its cached result');
  assert.equal(await snapshot(),once,'Refused replay cannot repeat the native mutation');
  const row=(await audit()).rows.find(row=>row.id===refused.decision.id);
  assert.deepEqual(row.resource,{kind:'service',id:'agent-service'});
  assert.equal(row.code,expected);
  assert.equal(row.sponsor.id,owner.id);

 }
 const missingScope=await tool('oncall.incidents.declare',args,{scope:'events:read'});
 assert.equal(code(missingScope),'insufficient_scope');
 assert.equal(missingScope.result?.structuredContent,undefined);
 assert.equal(await snapshot(),once);
 const freshHeld=await tool('oncall.incidents.declare',{...args,idempotency_key:randomUUID()});
 const pending=freshHeld.result._meta['com.runeditrun/approval'];
 assert.ok(pending,'A new held effect must have a real approval');
 const view=await (await http('/agents/api/approvals/'+pending.id)).json();
 assert.deepEqual(view.approval.summary.nativeTarget,{kind:'service',id:'agent-service'});
 const decision={revision:view.approval.revision,summary_sha256:view.approval.summary_sha256};
 assert.equal((await http('/agents/api/approvals/'+pending.id+'/approve',{...decision,summary_sha256:'stale-summary'})).status,409);
 assert.equal(await snapshot(),once,'A mismatched summary cannot execute the held action');
 const approved=await http('/agents/api/approvals/'+pending.id+'/approve',decision);
 assert.equal(approved.status,200);
 assert.equal((await approved.json()).approval.state,'executed');
 const execution=(await audit()).rows.find(row=>row.decision_id===freshHeld.decision.id);
 assert.deepEqual(execution.resource,{kind:'service',id:'agent-service'});
 assert.equal(execution.outcome,'done');assert.ok(execution.approval.by.includes(owner.id));
 assert.equal((await adopt()).status,200);
 console.log('PASS native-target-audit and mutation-replay-native-authority: once-only outcome; Pause, changed policy, new approval and scope checked before cached content');
 // A declared incident's final decision carries commitment even for an internal
 // coordination-only installation. Only native retained evidence adds sensitive.
 const resolveName='oncall.incidents.resolve';
 const listed=(await mcp('tools/list')).result.tools.find(row=>row.name===resolveName);
 assert.deepEqual(listed._meta['com.runeditrun/classes'],['commitment','sensitive']);
 assert.deepEqual(listed._meta['com.runeditrun/classes'],runtime.context.surface.tools.find(row=>row.name===resolveName).classes);
 const resolutionFacts=[{class:'commitment',facts:{measure:0,currency:'XXX',counterparty:'internal'}},
  {class:'sensitive',facts:{measure:2,kind:'personal_or_incident_evidence'}}];
 const facts=answer=>answer.decision.classes.map(({class:cls,facts})=>({class:cls,facts}));
 async function resolutionAudit(answer,outcome){
  assert.deepEqual(facts(answer),resolutionFacts);
  const row=(await audit()).rows.find(row=>row.id===answer.decision.id);
  assert.equal(row.tool,resolveName);assert.equal(row.outcome,outcome);
  assert.deepEqual(row.classes,resolutionFacts);
  return row;
 }
 const resolutionState=async()=> (await (await http('/api/state')).json());
 const autoTarget=await recoveredResolutionTarget(runtime,'Native commitment under autonomous policy');
 const autoArgs={incident:autoTarget.id,revision:autoTarget.revision,summary:'Retained recovery supports resolution',idempotency_key:randomUUID()};
 const beforeResolve=await resolutionState(),beforeResolveEdge=await runtime.outboundRequests();
 const resolved=await tool(resolveName,{...autoArgs,internal:true,confirmExternal:true,class:'standard',confirm:true});
 assert.equal(resolved.result.isError,false);
 const autoRow=await resolutionAudit(resolved,'done');
 assert.deepEqual(autoRow.ignored_arguments,['class','confirm','confirmExternal','internal']);
 const afterResolve=await resolutionState(),savedResolve=afterResolve.incidents.find(row=>row.id===autoTarget.id);
 assert.equal(savedResolve.state,'resolved');assert.equal(savedResolve.revision,autoTarget.revision+1);
 assert.equal(afterResolve.revision,beforeResolve.revision+1);
 const resolutionEntries=savedResolve.timeline.filter(row=>row.lifecycle?.to==='resolved');
 assert.equal(resolutionEntries.length,1);
 assert.equal(resolutionEntries[0].metadata.agent.agent.id,runtime.context.agentId);
 assert.equal(resolutionEntries[0].metadata.agent.for.id,owner.id);
 assert.deepEqual(await runtime.outboundRequests(),beforeResolveEdge);
 const exactRetry=await tool(resolveName,autoArgs);
 assert.equal(exactRetry.result.isError,false);
 assert.deepEqual(exactRetry.result.structuredContent,resolved.result.structuredContent);
 assert.deepEqual(await resolutionState(),afterResolve,'Identical resolution retry changes no native record or revision');
 await resolutionAudit(exactRetry,'replayed');

 const heldTarget=await recoveredResolutionTarget(runtime,'Text says standard, internal and confirmed; policy still decides');
 const heldArgs={incident:heldTarget.id,revision:heldTarget.revision,summary:'Text claiming standard cannot change commitment',idempotency_key:randomUUID()};
 const heldNative=await resolutionState();
 for(const cls of ['commitment','sensitive']){
  const document=autonomousPolicy();document.rules.unshift({id:'stop-'+cls,class:cls,do:'blocked'});
  assert.equal((await adopt(document)).status,200);
  const stopped=await tool(resolveName,{...heldArgs,idempotency_key:randomUUID()});
  assert.equal(code(stopped),'policy_blocked');
  assert.equal(stopped.decision.classes.find(row=>row.class===cls).do,'blocked');
  assert.equal(stopped.decision.classes.find(row=>row.class!==cls).do,'autonomous');
  await resolutionAudit(stopped,'refused');
  const injected=await tool(resolveName,{...heldArgs,idempotency_key:randomUUID(),internal:true,confirmExternal:true,class:'standard',confirm:true});
  assert.equal(code(injected),'policy_blocked');
  assert.deepEqual(injected.decision.classes,stopped.decision.classes);
  await resolutionAudit(injected,'refused');
  assert.deepEqual(await resolutionState(),heldNative,'Each isolated class refusal preserves native state and revision');
 }
 const resolutionPolicy=autonomousPolicy();resolutionPolicy.rules.unshift({id:'resolve-review',class:'commitment',do:'approval',approver:['sponsor'],wait:'PT1H'});
 assert.equal((await adopt(resolutionPolicy)).status,200);
 const awaiting=await tool(resolveName,heldArgs);
 assert.equal(awaiting.result.resultType,'input_required');
 assert.equal(awaiting.decision.disposition,'approval');
 assert.equal(awaiting.decision.classes.find(row=>row.class==='sensitive').do,'autonomous');
 await resolutionAudit(awaiting,'pending');
 assert.deepEqual(await resolutionState(),heldNative,'Pending commitment has no native effect');
 const resolutionApproval=await (await http('/agents/api/approvals/'+awaiting.result._meta['com.runeditrun/approval'].id)).json();
 const pendingResolution=resolutionApproval.approval;
 assert.deepEqual(pendingResolution.summary.nativeTarget,{kind:'incident',id:heldTarget.id});
 const exactDecision={revision:pendingResolution.revision,summary_sha256:pendingResolution.summary_sha256};
 assert.equal((await http('/agents/api/approvals/'+pendingResolution.id+'/approve',{...exactDecision,summary_sha256:'changed-summary'})).status,409);
 assert.deepEqual(await resolutionState(),heldNative);
 assert.equal((await http('/api/command',{type:'note',incident:heldTarget.id,revision:heldTarget.revision,text:'Human adds new evidence after preparation'})).status,200);
 const changedResolution=await resolutionState();
 const staleResolution=await http('/agents/api/approvals/'+pendingResolution.id+'/approve',exactDecision);
 assert.equal((await staleResolution.json()).approval.state,'refused');
 assert.deepEqual(await resolutionState(),changedResolution,'An exact saved approval cannot resolve a changed native revision');
 assert.equal((await adopt()).status,200);
 console.log('PASS incident resolution classification: commitment and sensitive facts, autonomous and isolated blocked policies, immutable pending and stale approval, ignored caller and record claims, attributed once-only resolution and effect-free retry');

 const missing=await mcp('resources/read',{uri:'oncall://incidents/not-present'});
 assert.equal(missing.body.error.data.code,'capability_not_declared');
 assert.equal(missing.body.error.data.capability,'resources');
 assert.equal(missing.result,undefined);
 const noReadScope=await tool('oncall.services.read',{id:'agent-service'},{scope:'events:read'});
 assert.equal(code(noReadScope),'insufficient_scope');
 const blockedReads={...autonomousPolicy(),rules:[{id:'private-read-stop',class:'*',do:'blocked'}]};
 assert.equal((await adopt(blockedReads)).status,200);
 const blockedResource=await tool('oncall.services.read',{id:'agent-service'});
 assert.equal(code(blockedResource),'policy_blocked');
 assert.equal(blockedResource.result.structuredContent,undefined);
 assert.equal((await adopt()).status,200);
 console.log('PASS core read admission: undeclared resources refuse without content; tools retain insufficient_scope and policy_blocked');
 const before=await (await http('/agents/api/state')).json();
 assert.equal((await http('/api/rer/agent-policy',{policy:'invalid.signature.document'})).status,400);
 assert.deepEqual(await (await http('/agents/api/state')).json(),before,'Invalid adoption retains the exact prior policy');
 for(const overrides of [{sub:'unmapped-person'},{aud:'https://foreign.invalid/mcp'}])assert.equal((await tool('oncall.services.read',{id:'agent-service'},overrides)).status,401);
 const state=await (await http('/api/state')).json(),responder=state.members.find(row=>row.role==='responder');
 const teammate=randomUUID();
 await runtime.settings([{id:teammate,email:'mira@example.invalid',name:'Mira Patel',role:'member',invite:1}],2);
 assert.equal((await tool('oncall.services.read',{id:'agent-service'},{sub:teammate,email:runtime.context.person.email})).status,401,'Matching token email cannot establish native authority');
 assert.equal((await http('/api/rer/people-link',{businessId:teammate,memberId:responder.id,revision:2})).status,303);
 const linked=await tool('oncall.services.read',{id:'agent-service'},{sub:teammate,email:'mira@example.invalid',act:{sub:'mira-agent',name:'Mira assistant'}});
 assert.equal(linked.status,200);assert.equal(linked.result.isError,false);
 // A Business credential keeps its original scopes while current native
 // membership, not the signed roster's role, decides each later call.
 const roster=[{id:teammate,email:['mira','example.invalid'].join('@'),name:'Mira Patel',role:'member',invite:1}];
 let rosterRevision=2;
 // Keep real pending work populated so an authority refusal cannot silently
 // clear another saved action while appearing to preserve an empty queue.
 const pendingWitness=await recoveredResolutionTarget(runtime,'Pending work retained across sponsor transitions');
 assert.equal((await adopt(heldPolicy())).status,200);
 const pendingNote=await tool('oncall.notes.add',{incident:pendingWitness.id,revision:pendingWitness.revision,text:'Unrelated saved coordination remains pending',idempotency_key:randomUUID()});
 assert.equal(pendingNote.result.resultType,'input_required');
 for(const [label,document] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await adopt(document)).status,200);
  const password=randomBytes(32).toString('hex');
  const memberResponse=await http('/api/members',{name:'Synthetic oncall sponsor '+label,role:'responder',password});
  assert.equal(memberResponse.status,201);
  const sponsor=await memberResponse.json();
  const login=await runtime.request(runtime.origin+'/api/login',{method:'POST',headers:{Origin:runtime.origin,'Content-Type':'application/json'},body:JSON.stringify({name:sponsor.name,password})});
  assert.equal(login.status,200);
  const sponsorCookie=login.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');
  assert.ok(sponsorCookie&&sponsorCookie!==runtime.cookie);await login.body?.cancel();
  const businessId=randomUUID(),email=['synthetic-oncall-sponsor-'+label,'example.invalid'].join('@'),agent='synthetic-oncall-'+randomUUID();
  roster.push({id:businessId,email,name:sponsor.name,role:'member',invite:1});
  await runtime.settings(roster,++rosterRevision);
  assert.equal((await http('/api/rer/people-link',{businessId,memberId:sponsor.id,revision:rosterRevision})).status,303);
  const token=await accessToken(runtime.context,{sub:businessId,email,act:{sub:agent,name:'Synthetic sponsor assistant'},exp:seconds()+900});
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  assert.ok(claims.scope.split(' ').includes('incidents:write'));
  const call=(name,args)=>runtime.mcpWithToken(token,'tools/call',{name,arguments:args});
  const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
  const target=await recoveredResolutionTarget(runtime,'Current Business sponsor '+label);
  const current=async()=> (await read('/api/state')).incidents.find(row=>row.id===target.id);
  const snapshot=async()=>({application:await read('/api/state'),paging:await read('/api/paging/state'),
   approvals:(await runtime.db.prepare('SELECT * FROM agent_door_approvals ORDER BY id').all()).results,
   pending:(await runtime.db.prepare("SELECT * FROM agent_door_calls WHERE state='pending' ORDER BY agent,key").all()).results,
   operations:(await runtime.db.prepare('SELECT * FROM oc_agent_operations ORDER BY id').all()).results});
  const note=async text=>({incident:target.id,revision:(await current()).revision,text,idempotency_key:randomUUID()});
  const edge=await runtime.outboundRequests(),args=await note('Admitted Business sponsor note '+label),before=await snapshot();
  assert.ok(before.pending.length>0,'Authority comparisons include real pending work');
  const admitted=await call('oncall.notes.add',args);
  assert.equal(admitted.status,200);
  assert.equal(admitted.decision.disposition,label==='held'?'approval':'autonomous');
  if(label==='held'){
   assert.equal(admitted.result.resultType,'input_required');
   assert.deepEqual((await snapshot()).application,before.application,'Approval preparation changes no native records');
   const pendingResponse=await runtime.request(runtime.origin+'/agents/api/approvals/'+admitted.result._meta['com.runeditrun/approval'].id,{headers:{Cookie:sponsorCookie}});
   assert.equal(pendingResponse.status,200);
   const saved=(await pendingResponse.json()).approval;
   assert.equal(saved.prepared_by.for.id,sponsor.id);
   const approval=await runtime.request(runtime.origin+'/agents/api/approvals/'+saved.id+'/approve',{method:'POST',headers:{Origin:runtime.origin,Cookie:sponsorCookie,'Content-Type':'application/json'},body:JSON.stringify({revision:saved.revision,summary_sha256:saved.summary_sha256})});
   assert.equal(approval.status,200);
   const executed=(await approval.json()).approval;
   assert.equal(executed.state,'executed');assert.ok(executed.approvals.some(row=>row.person===sponsor.id));
  }else assert.equal(admitted.result.isError,false);
  const after=await current(),entry=after.timeline.at(-1);
  assert.equal(after.revision,args.revision+1);assert.equal(entry.text,args.text);
  assert.equal(entry.metadata?.agent?.agent.id,agent);assert.equal(entry.metadata?.agent?.for.id,sponsor.id);
  const audit=async()=>{
   const rows=[];let after=0;
   while(true){
    const page=await read('/agents/api/audit?agent='+encodeURIComponent(agent)+'&after='+after);
    rows.push(...page.rows);
    if(page.cursor===null||page.cursor===after)break;
    assert.ok(page.cursor>after,'Audit pagination must advance through all retained decisions');
    after=page.cursor;
   }
   return rows;
  };
  assert.ok((await audit()).some(row=>row.sponsor.id===sponsor.id&&row.outcome==='done'));
  assert.equal((await http('/api/command',{type:'member',id:sponsor.id,role:'viewer',active:true})).status,200);
  const deniedArgs=await note('Viewer cannot append this valid note'),downgraded=await snapshot();
  assert.equal((await read('/api/state')).members.find(row=>row.id===sponsor.id).role,'viewer');
  assert.ok(claims.exp>seconds(),'The preissued token remains unexpired after downgrade');
  const priorAudit=await audit(),denied=await call('oncall.notes.add',deniedArgs);
  assert.equal(code(denied),'native_authority_required');assert.equal(denied.result?.structuredContent,undefined);
  assert.deepEqual(await snapshot(),downgraded,'Role refusal changes no application record, revision, timeline, pending work or paging state');
  const refusalAudit=(await audit()).filter(row=>!priorAudit.some(before=>before.id===row.id));
  assert.equal(refusalAudit.length,1);assert.equal(refusalAudit[0].code,'native_authority_required');
  assert.equal(refusalAudit[0].sponsor.id,sponsor.id);assert.equal(refusalAudit[0].role,'viewer');
  assert.deepEqual(refusalAudit[0].scopes,claims.scope.split(' '),'Native downgrade does not replace the signed token scopes');
  const permitted=await call('oncall.services.read',{id:'agent-service'});
  assert.equal(permitted.status,200);assert.equal(permitted.result.isError,false);assert.equal(permitted.result.structuredContent.data[0].id,'agent-service');
  assert.equal((await http('/api/command',{type:'member',id:sponsor.id,role:'viewer',active:false})).status,200);
  const suspended=await snapshot();
  assert.equal(suspended.application.members.find(row=>row.id===sponsor.id).active,false);
  assert.ok(claims.exp>seconds(),'The same token remains unexpired after suspension');
  const unavailable=await call('oncall.notes.add',await note('Inactive sponsor cannot append this valid note'));
  assert.equal(unavailable.status,401);assert.equal(unavailable.result,undefined);
  assert.equal((await call('oncall.services.read',{id:'agent-service'})).status,401);
  assert.deepEqual(await snapshot(),suspended,'Suspension refusal preserves native state and pending work');
  assert.deepEqual(await runtime.outboundRequests(),edge,'Sponsor transitions attempt zero outbound requests');
  assert.equal(edge.length,0,'This sponsor journey has no provider activity');
  console.log(`PROBE BASE-AGENT-005 3 ${label}: linked native responder and preissued Business token -> attributed note ${label==='held'?'approved by its signed-in sponsor':'executed'}; owner downgrade -> native_authority_required with no effect and permitted read; owner suspension -> same unexpired token 401; pending work and paging unchanged; zero outbound requests`);
 }
 assert.equal((await adopt()).status,200);
 // Native immutable service fields remain enforced; the conformance fixture
 // must preserve the current environment when exercising an allowed edit.
 const serviceRead=await tool('oncall.services.read',{id:'agent-service'});
 const service=serviceRead.result.structuredContent.data[0];
 const serviceInput={id:service.id,etag:service.etag,name:'Payments API coordination',environment:service.environment,owner:service.owner,runbook:service.runbook,pager:service.pager,dependencies:service.dependencies??[]};
 const serviceEdit=await tool('oncall.services.update',{...serviceInput,idempotency_key:randomUUID()});
 assert.equal(serviceEdit.result.isError,false);
 const savedService=serviceEdit.result.structuredContent;
 const beforeEnvironment=await (await http('/api/state')).json();
 const changedEnvironment=await tool('oncall.services.update',{...serviceInput,etag:savedService.etag,environment:'verification',idempotency_key:randomUUID()});
 assert.equal(code(changedEnvironment),'native_request_invalid');
 assert.deepEqual((await (await http('/api/state')).json()).services,beforeEnvironment.services);
 // An approval creates the schedule once; the same key must then return the
 // cached outcome after current policy and native authority are rechecked.
 const rota=(await tool('oncall.schedules.read',{id:'agent-schedule'})).result.structuredContent.schedules[0];
 const createRota={schedule:{...rota,id:randomUUID(),name:'Payments coordination backup',revision:0},idempotency_key:randomUUID()};
 const heldRota=autonomousPolicy();heldRota.rules.unshift({id:'coverage-review',class:'live',do:'approval',approver:['sponsor'],wait:'PT1H'});
 assert.equal((await adopt(heldRota)).status,200);
 const heldCreate=await tool('oncall.schedules.create',createRota);
 const rotaApproval=heldCreate.result._meta['com.runeditrun/approval'];assert.ok(rotaApproval);
 const rotaView=(await (await http('/agents/api/approvals/'+rotaApproval.id)).json()).approval;
 const rotaDecision=await http('/agents/api/approvals/'+rotaApproval.id+'/approve',{revision:rotaView.revision,summary_sha256:rotaView.summary_sha256});
 assert.equal((await rotaDecision.json()).approval.state,'executed');
 const rotaReplay=await tool('oncall.schedules.create',createRota);assert.equal(rotaReplay.result.isError,false);
 const rotaRepeated=await tool('oncall.schedules.create',createRota);assert.deepEqual(rotaRepeated.result.structuredContent,rotaReplay.result.structuredContent);
 const rotaRead=await tool('oncall.schedules.read',{id:createRota.schedule.id});
 assert.equal(rotaRead.result.structuredContent.schedules.length,1);assert.equal(rotaRead.result.structuredContent.schedules[0].revision,1);
 assert.equal(code(await tool('oncall.schedules.create',{...createRota,idempotency_key:randomUUID()})),'revision_conflict','A new key cannot create an existing native schedule');
 assert.equal(code(await tool('oncall.schedules.create',{...createRota,schedule:{...createRota.schedule,name:'Changed key content'}})),'idempotency_conflict');
 assert.equal((await adopt()).status,200);
 console.log('PASS native service immutable environment and approved schedule creation replay: allowed edit, no-effect environment refusal, one schedule, fresh-key conflict and changed-argument conflict');
 await nativeTransport(runtime);
 await teamReplay(runtime);
 await scheduleReplay(runtime);
 await eraseReplay(runtime);
 await eraseClasses(runtime);
 await staleReassignmentNativeRevision(runtime);
 await staleScribeExpectedRevision(runtime);
 await staleCommunicationsExpectedRevision(runtime);
 await staleCommunicationsNativeRevision(runtime);
 await specialist({request:runtime.request,origin:runtime.origin,cookie:runtime.cookie,fixtures:runtime.fixtures,tool});
 const events=await tool('oncall.events.list',{limit:200});assert.equal(code(events),'capability_not_declared');assert.equal(events.result.structuredContent,undefined);
 assert.ok((await audit()).rows.some(row=>row.agent.id===runtime.context.agentId&&row.outcome==='done'));
 const native=await (await http('/api/state')).json(),incident=native.incidents.find(row=>row.title==='Payment authorization failures after deployment');
 const agentEntries=incident.timeline.filter(row=>row.metadata?.agent);
 assert.ok(agentEntries.length>0&&agentEntries.every(row=>row.metadata.agent.for.id===native.members.find(row=>row.name==='Alex Chen').id));
 assert.ok(incident.timeline.some(row=>row.kind==='source-recovery'&&!row.metadata?.agent),'Source observation retains its separate native actor');
 assert.equal(incident.actions[0].done,false);
 // Oncall's actual workspace-password door returns HTTP 200. A distinct
 // signed-in responder accepts the machine submission with a native reason.
 const reviewerPassword=randomBytes(32).toString('hex');
 const reviewer=await (await http('/api/members',{name:'Sam Ortega',role:'responder',password:reviewerPassword})).json();
 const login=await runtime.request(runtime.origin+'/api/login',{method:'POST',headers:{Origin:runtime.origin,'Content-Type':'application/json'},body:JSON.stringify({name:reviewer.name,password:reviewerPassword})});
 assert.equal(login.status,200);
 const reviewerCookie=login.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');
 assert.ok(reviewerCookie&&reviewerCookie!==runtime.cookie);
 await login.body?.cancel();
 const accepted=await runtime.request(runtime.origin+'/api/command',{method:'POST',headers:{Origin:runtime.origin,Cookie:reviewerCookie,'Content-Type':'application/json'},body:JSON.stringify({type:'accept-action',incident:incident.id,revision:incident.revision,action:incident.actions[0].id,reason:'Sam independently reviewed the retained deployment evidence'})});
 assert.equal(accepted.status,200);
 const reviewed=await accepted.json();
 assert.equal(reviewed.actions[0].done,true);
 assert.equal(reviewed.actions[0].accepted.by,reviewer.id);
 assert.notEqual(reviewed.actions[0].submission.by,reviewer.id);
 assert.ok(reviewed.timeline.some(row=>row.actor===reviewer.id&&row.text.includes('Human accepted follow-up')&&!row.metadata?.agent));
 console.log('PASS native reviewer lifecycle: distinct workspace-password responder; machine submission retained; actual named human acceptance');

 incident.revision=reviewed.revision;
 const pause=await adopt(autonomousPolicy(),{paused:true});assert.equal(pause.status,200);
 const witness=JSON.stringify((await (await http('/api/state')).json()).incidents);
 assert.equal(code(await tool('oncall.notes.add',{incident:incident.id,revision:incident.revision,text:'Held by company Pause',idempotency_key:randomUUID()})),'agents_paused');
 assert.equal(JSON.stringify((await (await http('/api/state')).json()).incidents),witness);
 assert.equal((await http('/api/command',{type:'note',incident:incident.id,revision:incident.revision,text:'The current person can still coordinate during agent Pause'})).status,200);
 assert.equal((await adopt()).status,200);
 const personTimeline=(await (await http('/api/state')).json()).incidents.find(row=>row.id===incident.id).timeline;
 assert.ok(personTimeline.some(row=>row.actor===owner.id&&!row.metadata?.agent&&row.text.includes('The current person can still coordinate')),'Native person changes retain their separate timeline attribution');
 assert.equal((await audit()).differs_from_policy,0,'Native agent decisions must agree with the policy in force');
 // Erasure uses the native person door and leaves retained audit IDs stable,
 // with the former sponsor's name removed and their next Business call refused.
 const beforeErasure=await (await http('/api/state')).json(),currentIncident=beforeErasure.incidents.find(row=>row.id===incident.id);
 const mira={sub:teammate,email:'mira@example.invalid',act:{sub:'mira-agent',name:'Mira assistant'}};
 const miraNote=await tool('oncall.notes.add',{incident:incident.id,revision:currentIncident.revision,text:'Independent coordination observation',idempotency_key:randomUUID()},mira);
 assert.equal(miraNote.result.isError,false);
 const miraAudit=async()=>(await audit('mira-agent')).rows;
 const beforeActorEvents=(await miraAudit()).filter(row=>row.sponsor.id===responder.id);
 assert.ok(beforeActorEvents.length>0);
 const eraseState=await (await http('/api/state')).json();
 const erased=await http('/api/erasure/member/'+responder.id,{workspaceRevision:eraseState.revision,confirmation:'erase '+responder.id,identitiesReviewed:true,importedPeople:[]});
 assert.equal(erased.status,200);
 const afterActorEvents=await miraAudit();
 for(const before of beforeActorEvents){const after=afterActorEvents.find(row=>row.id===before.id);assert.ok(after);assert.equal(after.sponsor.name,'Erased member');assert.equal(after.label,'Mira assistant for Erased member');}
 assert.equal((await tool('oncall.services.read',{id:'agent-service'},{...mira,email:runtime.context.person.email})).status,401);
 console.log('PASS native sponsor erasure: retained agent audit IDs, redacted sponsor name/label and immediate Business admission refusal');
 console.log('PASS Oncall agent native flow: signed owner/team mapping, MCP coordination, open human review, reviewed coverage, signed receiver receipt, client scope/demotion, Pause, native audit and undeclared event refusal; paging OFF');
}finally{await runtime.close()}
