import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** A completed reassignment rejects a changed reason and retains its first outcome. */
export async function changedReassignmentReasonConflict(runtime){
 const {db,http,tool,adopt,context}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const permanent=()=>rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const owner=(await read('/api/workspace')).member;
 const name='oncall.incidents.update';
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  let incident=await command({type:'declare',service:'agent-service',title:'Synthetic reassignment reason conflict '+mode,
   summary:'Native coordination without protected evidence',severity:'warning',alerts:[]});
  incident=await command({type:'transition',incident:incident.id,revision:incident.revision,state:'acknowledged',summary:'Synthetic current assignee'});
  const before=await snapshot(),pagingBefore=await read('/api/paging/state'),priorAudit=await audits();
  assert.equal(incident.assignee,owner.id);
  const assignee=before.application.members.find(row=>row.id===incident.assignee);
  const responder=before.application.members.find(row=>row.active&&row.role==='responder'&&row.id!==assignee.id);
  assert.ok(assignee.active);assert.ok(responder,'Reassignment must name an existing distinct active responder');
  assert.deepEqual(incident.alerts,[]);assert.deepEqual(incident.actions,[]);assert.equal(incident.recovery,'');
  const args={change:'reassign',incident:incident.id,revision:incident.revision,member:responder.id,
   reason:'Synthetic literal reassignment reason <keep this text>',idempotency_key:randomUUID()};
  const first=await tool(name,args);
  assert.equal(first.status,200);assert.equal(first.body.error,undefined);assert.equal(first.result.isError,false);
  assert.deepEqual(first.decision.classes.map(row=>row.class),['standard']);assert.equal(first.decision.disposition,disposition);
  const once=await snapshot(),result=first.result.structuredContent,pagingOnce=await read('/api/paging/state');
  const native=JSON.parse(once.records.oc_incidents.find(row=>row.id===incident.id).data);
  assert.deepEqual(result,native);assert.deepEqual(once.application.incidents.find(row=>row.id===incident.id),native);
  assert.equal(result.assignee,responder.id);assert.notEqual(result.assignee,incident.assignee);
  assert.equal(result.commander,incident.commander);assert.equal(result.state,incident.state);
  assert.equal(result.revision,args.revision+1);assert.equal(once.application.revision,before.application.revision+1);
  assert.equal(once.records.workspace_control[0].revision,before.records.workspace_control[0].revision+1);
  assert.equal(once.application.incidents.length,before.application.incidents.length);
  assert.deepEqual(once.application.incidents.filter(row=>row.id!==incident.id),before.application.incidents.filter(row=>row.id!==incident.id));
  assert.deepEqual(result.timeline.slice(0,-1),incident.timeline);assert.equal(result.timeline.length,incident.timeline.length+1);
  const entry=result.timeline.at(-1);
  assert.equal(entry.kind,'reassign');assert.equal(entry.text,'assignee: '+assignee.name+' → '+responder.name+': '+args.reason);
  assert.equal(entry.actor,context.agentId);assert.notEqual(entry.actor,responder.id);
  assert.equal(entry.metadata.agent.agent.id,context.agentId);assert.equal(entry.metadata.agent.for.id,owner.id);
  assert.equal(result.timeline.filter(row=>row.kind==='reassign').length,1);
  assert.deepEqual(result.actions,incident.actions);assert.deepEqual(result.alerts,incident.alerts);
  const commits=once.records.oc_admin_audit.filter(row=>!before.records.oc_admin_audit.some(prior=>prior.id===row.id));
  assert.equal(commits.length,1,'Exactly one native state-changing audit commits the reassignment');
  const commit=commits[0];assert.equal(commit.kind,'incidents.update');assert.equal(commit.outcome,'accepted');
  assert.equal(commit.workspace_before,before.application.revision);assert.equal(commit.workspace_after,once.application.revision);
  assert.equal(commit.paging_before,commit.paging_after);assert.equal(commit.handoff_before,commit.handoff_after);
  for(const prior of before.records.oc_admin_audit)assert.deepEqual(once.records.oc_admin_audit.find(row=>row.id===prior.id),prior);
  assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals);
  assert.equal(once.records.agent_door_calls.length,before.records.agent_door_calls.length+1);
  for(const prior of before.records.agent_door_calls)assert.deepEqual(once.records.agent_door_calls.find(row=>row.agent===prior.agent&&row.key===prior.key),prior);
  const calls=await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key);
  assert.equal(calls.length,1);assert.equal(calls[0].state,'done');assert.equal(calls[0].decision_id,first.decision.id);
  const stored=JSON.parse(calls[0].outcome);
  assert.equal(stored.outcome,'done');assert.deepEqual(stored.result,result);
  assert.deepEqual(stored.review,first.result._meta['com.runeditrun/review']);
  const reviews=once.records.agent_door_reviews;
  assert.equal(reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
  for(const prior of before.records.agent_door_reviews)assert.deepEqual(reviews.find(row=>row.id===prior.id),prior);
  if(mode==='held'){
   const review=reviews.find(row=>row.id===stored.review.id);
   assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,first.decision.id);
   assert.equal((await read('/agents/api/reviews')).reviews.find(row=>row.id===review.id).state,'open');
  }else assert.equal(stored.review,undefined);
  for(const table of Object.keys(before.records).filter(table=>table.startsWith('paging_')))assert.deepEqual(once.records[table],before.records[table]);
  assert.deepEqual(pagingOnce,{...pagingBefore,workspaceRevision:once.application.revision});
  const originalAudit=await audits();assert.deepEqual(originalAudit.slice(0,-1),priorAudit);assert.equal(originalAudit.length,priorAudit.length+1);
  const original=JSON.parse(originalAudit.at(-1).row);
  assert.equal(original.id,first.decision.id);assert.equal(original.tool,name);assert.equal(original.outcome,'done');
  assert.equal(original.idempotency_key,args.idempotency_key);assert.equal(original.replay_of,null);
  assert.equal(original.agent.id,context.agentId);assert.equal(original.sponsor.id,owner.id);
  const permanentOnce=await permanent();
  // Both calls below retain the original key and now-stale native revision.
  const changed={...args,reason:'Another schema-valid literal reassignment reason'};
  assert.deepEqual({...changed,reason:args.reason},args,'Only the reason changes');
  const conflict=await tool(name,changed);
  assert.equal(conflict.status,200);assert.equal(conflict.body.error,undefined);assert.notEqual(conflict.body.id,first.body.id);
  assert.equal(conflict.result.isError,true);assert.equal(conflict.result._meta['com.runeditrun/error'].code,'idempotency_conflict');
  assert.equal(JSON.parse(conflict.result.content[0].text).code,'idempotency_conflict');assert.equal(conflict.result.structuredContent,undefined);
  assert.deepEqual(await snapshot(),once,'Changed reason preserves native records, revisions, timeline, permanent state-changing audit, original calls and outcomes, approvals, reviews and paging');
  assert.deepEqual(await read('/api/paging/state'),pagingOnce);
  const refused=await audits();assert.deepEqual(refused.slice(0,-1),originalAudit);assert.equal(refused.length,originalAudit.length+1);
  const refusal=JSON.parse(refused.at(-1).row);
  assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,'idempotency_conflict');
  assert.equal(refusal.idempotency_key,args.idempotency_key);assert.equal(refusal.agent.id,context.agentId);assert.equal(refusal.sponsor.id,owner.id);
  const replay=await tool(name,args);
  assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.equal(replay.result.isError,false);
  assert.notEqual(replay.body.id,first.body.id);assert.notEqual(replay.body.id,conflict.body.id);
  assert.deepEqual(replay.result.structuredContent,stored.result);assert.deepEqual(replay.result._meta['com.runeditrun/review'],stored.review);
  assert.deepEqual(await snapshot(),once,'Exact original arguments return the saved outcome with no second reassignment, revision, state-changing audit or held review');
  assert.deepEqual(await read('/api/paging/state'),pagingOnce);
  assert.deepEqual(await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key),calls);
  const retried=await audits();assert.deepEqual(retried.slice(0,-1),refused);assert.equal(retried.length,refused.length+1);
  const retry=JSON.parse(retried.at(-1).row);
  assert.equal(retry.id,replay.decision.id);assert.equal(retry.tool,name);assert.equal(retry.outcome,'replayed');
  assert.equal(retry.replay_of,first.decision.id);assert.equal(retry.operation_id,original.operation_id);
  assert.equal(retry.idempotency_key,args.idempotency_key);assert.equal(retry.agent.id,context.agentId);assert.equal(retry.sponsor.id,owner.id);
  const permanentAfter=await permanent();assert.deepEqual(permanentAfter.slice(0,permanentOnce.length),permanentOnce);
  const bookkeeping=permanentAfter.slice(permanentOnce.length);assert.ok(bookkeeping.length>0);
  for(const record of bookkeeping){
   assert.equal(record.kind,'agent-door.persistence');assert.ok(['accepted','refused'].includes(record.outcome));
   for(const family of ['workspace','paging','handoff'])assert.equal(record[family+'_before'],record[family+'_after'],'Attempt audit never commits another application effect');
  }
  assert.deepEqual(await runtime.outboundRequests(),[],'Reassignment, changed reason and exact retry attempt zero outbound requests');
  console.log('PROBE BASE-AGENT-012 acceptance 3 '+mode+' reassignment: one standard-only agent-attributed assignment to a distinct active responder, one incident and workspace revision and native audit commit; original key and revision with changed reason -> isError idempotency_conflict in metadata and text, no private result; exact original arguments with new RPC id -> saved result and original review; native effect custody and paging unchanged; attributed refusal and linked replay audit only; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}
