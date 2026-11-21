import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Recover the original Scribe assignment after losing the real MCP response. */
export async function droppedScribeAssignmentReplay(runtime){
 await droppedRoleAssignmentReplay(runtime,'scribe','Scribe');
}

/** Shared native role recovery journey, including D1 custody before retry. */
export async function droppedRoleAssignmentReplay(runtime,role,label){
 const {db,http,tool,adopt,discardToolResponse,context}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const permanent=()=>rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const calls=key=>rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,key);
 const owner=(await read('/api/workspace')).member,name='oncall.incidents.update';
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  let incident=await command({type:'declare',service:'agent-service',title:'Synthetic lost '+label+' response '+mode,
   summary:'Ordinary coordination without protected evidence',severity:'warning',alerts:[]});
  if(role==='commander'){
   const state=await read('/api/state'),peer=state.members.find(row=>row.active&&row.role==='responder');
   assert.ok(peer);assert.notEqual(peer.id,owner.id);
   // Keep populated companion roles and a distinct explicit assignee as custody witnesses.
   for(const input of [{type:'reassign',member:owner.id},{type:'assign-role',role:'scribe',member:owner.id},{type:'assign-role',role:'communications',member:peer.id}])
    incident=await command({...input,incident:incident.id,revision:incident.revision,reason:'Synthetic retained coordination witness'});
   assert.equal(incident.commander,null);assert.equal(incident.assignee,owner.id);
   assert.equal(incident.scribe,owner.id);assert.equal(incident.communications,peer.id);
  }
  const before=await snapshot(),pagingBefore=await read('/api/paging/state'),priorAudit=await audits();
  assert.equal(incident[role]??null,null);assert.equal(incident.state,'declared');
  assert.deepEqual(incident.alerts,[]);assert.deepEqual(incident.actions,[]);assert.equal(incident.recovery,'');
  const responder=before.application.members.find(row=>row.active&&row.role==='responder');
  assert.ok(responder,label+' assignment names an existing active responder');
  const args=Object.freeze({change:'assign-role',role,incident:incident.id,revision:incident.revision,member:responder.id,
   reason:'Synthetic literal '+label+' reason <keep this text> & retain it',idempotency_key:randomUUID()});
  const lost=await discardToolResponse(name,args);
  assert.equal(lost.status,200);assert.equal(lost.discarded,true);assert.equal(lost.aborted,true);assert.equal(lost.bodyRead,false);
  // The lost body is never parsed: D1 establishes the completed call and result before retry.
  const committedCalls=await calls(args.idempotency_key);
  assert.equal(committedCalls.length,1);assert.equal(committedCalls[0].state,'done');
  const call=committedCalls[0],saved=JSON.parse(call.outcome),once=await snapshot(),originalAudit=await audits();
  assert.equal(saved.outcome,'done');assert.equal(saved.decision.id,call.decision_id);
  assert.deepEqual(saved.decision.classes.map(row=>row.class),['standard']);assert.equal(saved.decision.disposition,disposition);
  const stored=JSON.parse(once.records.oc_incidents.find(row=>row.id===incident.id).data);
  assert.deepEqual(saved.result,stored);assert.deepEqual(once.application.incidents.find(row=>row.id===incident.id),stored);
  assert.deepEqual(stored,{...incident,[role]:responder.id,revision:incident.revision+1,timeline:stored.timeline},'Only '+label+', revision and the appended timeline entry change');
  assert.equal(stored.revision,args.revision+1);assert.equal(once.application.revision,before.application.revision+1);
  assert.equal(once.records.workspace_control[0].revision,before.records.workspace_control[0].revision+1);
  assert.equal(once.application.incidents.length,before.application.incidents.length);
  assert.deepEqual(once.application.incidents.filter(row=>row.id!==incident.id),before.application.incidents.filter(row=>row.id!==incident.id));
  assert.equal(stored.timeline.length,incident.timeline.length+1);assert.deepEqual(stored.timeline.slice(0,-1),incident.timeline);
  const entry=stored.timeline.at(-1);
  assert.equal(entry.kind,'assign-role');assert.equal(stored.timeline.filter(row=>row.kind==='assign-role').length,incident.timeline.filter(row=>row.kind==='assign-role').length+1);
  assert.equal(entry.text,role+': Unassigned → '+responder.name+': '+args.reason);
  assert.equal(entry.actor,context.agentId);assert.notEqual(entry.actor,responder.id);
  assert.equal(entry.metadata.agent.agent.id,context.agentId);assert.equal(entry.metadata.agent.for.id,owner.id);
  const commits=once.records.oc_admin_audit,priorCommits=before.records.oc_admin_audit;
  assert.equal(commits.length,priorCommits.length+1,'One native state-changing audit commits before retry');
  for(const prior of priorCommits)assert.deepEqual(commits.find(row=>row.id===prior.id),prior);
  const commit=commits.find(row=>!priorCommits.some(prior=>prior.id===row.id));
  assert.equal(commit.kind,role==='scribe'?'command.assign-role':'incidents.update');assert.equal(commit.outcome,'accepted');
  assert.equal(commit.workspace_before,before.application.revision);assert.equal(commit.workspace_after,once.application.revision);
  assert.equal(commit.paging_before,commit.paging_after);assert.equal(commit.handoff_before,commit.handoff_after);
  for(const [field,kind,id] of [['actor','agent',context.agentId],['subject','entity',incident.id],['source','member',owner.id]]){
   const identity=await db.prepare('SELECT label FROM oc_audit_identities WHERE kind=? AND entity_id=?').bind(kind,id).first();
   assert.equal(commit[field],identity.label,'The native commit retains its '+field+' attribution');
  }
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
  for(const table of Object.keys(before.records).filter(table=>table.startsWith('paging_')))assert.deepEqual(once.records[table],before.records[table]);
  const pagingOnce=await read('/api/paging/state');
  assert.deepEqual(pagingOnce,{...pagingBefore,workspaceRevision:once.application.revision});
  assert.deepEqual(originalAudit.slice(0,-1),priorAudit);assert.equal(originalAudit.length,priorAudit.length+1);
  const original=JSON.parse(originalAudit.at(-1).row);
  assert.equal(original.id,call.decision_id);assert.equal(original.tool,name);assert.equal(original.outcome,'done');
  assert.equal(original.idempotency_key,args.idempotency_key);assert.equal(original.replay_of,null);
  assert.equal(original.agent.id,context.agentId);assert.equal(original.sponsor.id,owner.id);
  const permanentOnce=await permanent(),relayOnce=await rows('SELECT * FROM agent_door_relay ORDER BY sequence');
  // Identical arguments deliberately carry the original, now-stale native revision and key.
  const replay=await tool(name,args);
  assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.notEqual(replay.body.id,lost.id);
  assert.equal(replay.result.isError,false);assert.deepEqual(replay.result.structuredContent,saved.result);
  assert.deepEqual(replay.result._meta['com.runeditrun/review'],saved.review);
  assert.deepEqual(await calls(args.idempotency_key),committedCalls,'The original call and stored outcome remain unchanged');
  assert.deepEqual(await snapshot(),once,'Retry preserves native records, revisions, timeline, state-changing audit, original calls and outcomes, approvals, reviews and paging');
  assert.deepEqual(await read('/api/paging/state'),pagingOnce);
  const retried=await audits();assert.deepEqual(retried.slice(0,-1),originalAudit);assert.equal(retried.length,originalAudit.length+1);
  const retry=JSON.parse(retried.at(-1).row);
  assert.equal(retry.id,replay.decision.id);assert.notEqual(retry.id,original.id);
  assert.equal(retry.tool,name);assert.equal(retry.outcome,'replayed');assert.equal(retry.replay_of,call.decision_id);
  assert.equal(retry.operation_id,original.operation_id);assert.equal(retry.idempotency_key,args.idempotency_key);
  assert.equal(retry.agent.id,context.agentId);assert.equal(retry.sponsor.id,owner.id);
  const relayAfter=await rows('SELECT * FROM agent_door_relay ORDER BY sequence');
  assert.deepEqual(relayAfter.slice(0,relayOnce.length),relayOnce);
  assert.deepEqual(relayAfter.slice(relayOnce.length).map(row=>row.decision_id),[retry.id]);
  if(mode==='held'){
   const review=(await read('/agents/api/reviews')).reviews.find(row=>row.id===saved.review.id);
   assert.equal(review.state,'open');assert.equal(review.decision_id,call.decision_id);
  }
  const permanentAfter=await permanent();assert.deepEqual(permanentAfter.slice(0,permanentOnce.length),permanentOnce);
  const bookkeeping=permanentAfter.slice(permanentOnce.length);assert.ok(bookkeeping.length>0);
  for(const record of bookkeeping){
   assert.equal(record.kind,'agent-door.persistence');assert.ok(['accepted','refused'].includes(record.outcome));
   for(const family of ['workspace','paging','handoff'])assert.equal(record[family+'_before'],record[family+'_after'],'Replay audit never commits another application effect');
  }
  assert.deepEqual(await runtime.outboundRequests(),[],label+' assignment and lost-response retry attempt zero outbound requests');
  console.log('PROBE BASE-AGENT-012 acceptance 2 '+mode+' '+label+' assignment: real MCP response destroyed at headers with unread body; D1 confirms completed standard-only call, saved outcome and one agent-attributed assign-role before retry; original revision and key with new RPC id return exact result and original review identity; one incident and workspace revision increment and native audit commit; '+(mode==='held'?'one original open review; ':'')+'native custody and paging unchanged; one linked replay-attempt audit and capacity bookkeeping only; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}

/** A first Scribe assignment matches the signed-in command and retains its outcome on retry. */
export async function changedScribeReasonConflict(runtime,{person,assignAsPerson,observe}={}){
 const {db,http,tool,adopt,context}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const permanent=()=>rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const owner=(await read('/api/workspace')).member;
 person??=await runtime.memberSession('Synthetic signed-in Scribe assigner','responder');
 const human=person.member;
 assert.notEqual(human.id,owner.id);
 assignAsPerson??=async (incident,member,reason)=>{
  const response=await person.http('/api/command',{type:'assign-role',role:'scribe',incident:incident.id,revision:incident.revision,member,reason});
  assert.equal(response.status,200);
  return response.json();
 };
 const auditLabel=async(kind,id)=>{
  const [identity]=await rows('SELECT label FROM oc_audit_identities WHERE kind=? AND entity_id=?',kind,id);
  assert.ok(identity,'Permanent audit retains '+kind+' attribution');
  return identity.label;
 };
 const name='oncall.incidents.update';
 const service='synthetic-oncall-first-scribe';
 await command({type:'service',id:service,name:'Synthetic Scribe coordination service',environment:'production',owner:owner.id,runbook:[],pager:''});
 const savedPairs=[];
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const responder=(await read('/api/state')).members.find(row=>row.active&&row.role==='responder'&&row.id!==human.id);
  assert.ok(responder,'Scribe assignment names an active responder distinct from the actor and sponsor');
  const roles={commander:owner.id,assignee:human.id,communications:owner.id};
  const makeIncident=async()=>{
   let incident=await command({type:'declare',service,title:'Synthetic first Scribe assignment '+mode,
    summary:'Native coordination without protected evidence',severity:'warning',alerts:[]});
   for(const [role,member] of Object.entries(roles)){
    incident=await command({type:'assign-role',role,member,incident:incident.id,revision:incident.revision});
    assert.equal(incident[role],member);
   }
   assert.equal(incident.scribe??null,null);
   assert.equal(incident.state,'declared');
   assert.deepEqual(incident.alerts,[]);assert.deepEqual(incident.actions,[]);assert.equal(incident.recovery,'');
   return incident;
  };
  const incident=await makeIncident(),humanIncident=await makeIncident();
  const reason='Synthetic literal Scribe reason <keep this text> & retain it';
  const humanBefore=await snapshot(),auditBeforeHuman=await permanent(),pagingBeforeHuman=await read('/api/paging/state');
  assert.equal(pagingBeforeHuman.paging,'OFF');
  const humanResult=await assignAsPerson(humanIncident,responder.id,reason);
  const before=await snapshot(),pagingBefore=await read('/api/paging/state'),priorAudit=await audits();
  const [humanEntry]=humanResult.timeline.slice(humanIncident.timeline.length);
  assert.deepEqual(humanResult,{...humanIncident,scribe:responder.id,revision:humanIncident.revision+1,timeline:[...humanIncident.timeline,humanEntry]});
  assert.equal(humanEntry.kind,'assign-role');assert.equal(humanEntry.actor,human.id);assert.equal(humanEntry.metadata?.agent,undefined);
  assert.deepEqual(before.application,{...humanBefore.application,revision:humanBefore.application.revision+1,
   incidents:humanBefore.application.incidents.map(row=>row.id===humanIncident.id?humanResult:row)});
  assert.deepEqual(before.records.agent_door_reviews,humanBefore.records.agent_door_reviews);
  assert.deepEqual(pagingBefore,{...pagingBeforeHuman,workspaceRevision:before.application.revision});
  const auditAfterHuman=await permanent(),[humanEvent]=auditAfterHuman.slice(auditBeforeHuman.length);
  assert.deepEqual(auditAfterHuman,[...auditBeforeHuman,humanEvent],'The signed-in assignment appends exactly one permanent event');
  assert.equal(humanEvent.kind,'command.assign-role');assert.equal(humanEvent.outcome,'accepted');
  assert.equal(humanEvent.workspace_before,humanBefore.application.revision);assert.equal(humanEvent.workspace_after,before.application.revision);
  assert.equal(humanEvent.actor,await auditLabel('member',human.id));assert.equal(humanEvent.subject,await auditLabel('entity',humanIncident.id));
  const args=Object.freeze({change:'assign-role',role:'scribe',incident:incident.id,revision:incident.revision,member:responder.id,
   reason,idempotency_key:randomUUID()});
  const first=await tool(name,args);
  assert.equal(first.status,200);assert.equal(first.body.error,undefined);assert.equal(first.result.isError,false);
  assert.deepEqual(first.decision.classes.map(row=>row.class),['standard']);assert.equal(first.decision.disposition,disposition);
  const once=await snapshot(),result=first.result.structuredContent,pagingOnce=await read('/api/paging/state');
  const native=JSON.parse(once.records.oc_incidents.find(row=>row.id===incident.id).data);
  assert.deepEqual(result,native);assert.deepEqual(once.application.incidents.find(row=>row.id===incident.id),native);
  assert.equal(result.scribe,responder.id);
  assert.deepEqual(result,{...incident,scribe:responder.id,revision:incident.revision+1,timeline:result.timeline},'Only Scribe, revision and the appended timeline entry change');
  assert.equal(result.revision,args.revision+1);assert.equal(once.application.revision,before.application.revision+1);
  assert.equal(once.records.workspace_control[0].revision,before.records.workspace_control[0].revision+1);
  assert.equal(once.application.incidents.length,before.application.incidents.length);
  assert.deepEqual(once.application.incidents.filter(row=>row.id!==incident.id),before.application.incidents.filter(row=>row.id!==incident.id));
  assert.deepEqual(result.timeline.slice(0,-1),incident.timeline);assert.equal(result.timeline.length,incident.timeline.length+1);
  const entry=result.timeline.at(-1);
  assert.equal(entry.kind,'assign-role');assert.equal(entry.text,'scribe: Unassigned → '+responder.name+': '+args.reason);
  assert.equal(entry.text,humanEntry.text,'Both doors retain the same Scribe change and literal reason');
  assert.equal(entry.actor,context.agentId);assert.notEqual(entry.actor,responder.id);
  assert.equal(entry.metadata.agent.agent.id,context.agentId);assert.equal(entry.metadata.agent.for.id,owner.id);
  assert.equal(result.timeline.filter(row=>row.kind==='assign-role').length,incident.timeline.filter(row=>row.kind==='assign-role').length+1);
  assert.deepEqual(result.actions,incident.actions);assert.deepEqual(result.alerts,incident.alerts);
  const commits=once.records.oc_admin_audit.filter(row=>!before.records.oc_admin_audit.some(prior=>prior.id===row.id));
  assert.equal(commits.length,1,'Exactly one native state-changing audit commits the Scribe assignment');
  const commit=commits[0];assert.equal(commit.kind,humanEvent.kind);assert.equal(commit.outcome,'accepted');
  assert.equal(commit.workspace_before,before.application.revision);assert.equal(commit.workspace_after,once.application.revision);
  assert.equal(commit.paging_before,commit.paging_after);assert.equal(commit.handoff_before,commit.handoff_after);
  for(const [field,kind,id] of [['actor','agent',context.agentId],['subject','entity',incident.id],['source','member',owner.id]])
   assert.equal(commit[field],await auditLabel(kind,id),'The native commit retains its '+field+' attribution');
  assert.notEqual(commit.actor,humanEvent.actor);assert.notEqual(commit.source,humanEvent.actor);
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
  const events=once.records.agent_door_events.filter(row=>!before.records.agent_door_events.some(prior=>prior.id===row.id));
  assert.equal(events.length,1);
  const event=JSON.parse(events[0].event);
  assert.equal(event.type,'incidents.update');assert.equal(event.incident,incident.id);assert.equal(event.revision,result.revision);
  assert.equal(event.actor.agent.id,context.agentId);assert.equal(event.actor.for.id,owner.id);
  const permanentOnce=await permanent(),relayOnce=await rows('SELECT * FROM agent_door_relay ORDER BY sequence');
  assert.deepEqual(permanentOnce.slice(0,auditAfterHuman.length),auditAfterHuman);
  assert.deepEqual(permanentOnce.slice(auditAfterHuman.length).filter(row=>
   row.workspace_before!==row.workspace_after||[humanEvent.kind,'incidents.update'].includes(row.kind)),[commit]);
  // Both calls below retain the original key and now-stale native revision.
  const changed={...args,reason:'Another schema-valid literal Scribe reason'};
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
  assert.notEqual(refusal.id,first.decision.id);
  assert.equal(refusal.idempotency_key,args.idempotency_key);assert.equal(refusal.agent.id,context.agentId);assert.equal(refusal.sponsor.id,owner.id);
  assert.equal(refusal.review,null);assert.equal(refusal.approval,null);
  assert.deepEqual(await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key),calls);
  const replay=await tool(name,args);
  assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.equal(replay.result.isError,false);
  assert.notEqual(replay.body.id,first.body.id);assert.notEqual(replay.body.id,conflict.body.id);
  assert.deepEqual(replay.result.structuredContent,stored.result);assert.deepEqual(replay.result._meta['com.runeditrun/review'],stored.review);
  assert.deepEqual(await snapshot(),once,'Exact original arguments return the saved outcome with no second Scribe assignment, revision, state-changing audit or held review');
  assert.deepEqual(await read('/api/paging/state'),pagingOnce);
  assert.deepEqual(await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key),calls);
  const retried=await audits();assert.deepEqual(retried.slice(0,-1),refused);assert.equal(retried.length,refused.length+1);
  const retry=JSON.parse(retried.at(-1).row);
  assert.equal(retry.id,replay.decision.id);assert.equal(retry.tool,name);assert.equal(retry.outcome,'replayed');
  assert.equal(retry.replay_of,first.decision.id);assert.equal(retry.operation_id,original.operation_id);
  assert.equal(retry.idempotency_key,args.idempotency_key);assert.equal(retry.agent.id,context.agentId);assert.equal(retry.sponsor.id,owner.id);
  const relayAfter=await rows('SELECT * FROM agent_door_relay ORDER BY sequence');
  assert.deepEqual(relayAfter.slice(0,relayOnce.length),relayOnce);
  assert.deepEqual(relayAfter.slice(relayOnce.length).map(row=>row.decision_id),[refusal.id,retry.id]);
  if(mode==='held'){
   const review=(await read('/agents/api/reviews')).reviews.find(row=>row.id===stored.review.id);
   assert.equal(review.state,'open');assert.equal(review.decision_id,first.decision.id);
  }
  const permanentAfter=await permanent();assert.deepEqual(permanentAfter.slice(0,permanentOnce.length),permanentOnce);
  const bookkeeping=permanentAfter.slice(permanentOnce.length);assert.ok(bookkeeping.length>0);
  for(const record of bookkeeping){
   assert.equal(record.kind,'agent-door.persistence');assert.ok(['accepted','refused'].includes(record.outcome));
   for(const family of ['workspace','paging','handoff'])assert.equal(record[family+'_before'],record[family+'_after'],'Attempt audit never commits another application effect');
  }
  assert.deepEqual(await runtime.outboundRequests(),[],'Scribe assignment, changed reason and exact retry attempt zero outbound requests');
  savedPairs.push({mode,human:humanResult,agent:result,humanLabel:human.name,agentLabel:entry.metadata.agent.label,responder,reason,roles,leadLabel:owner.name});
  console.log('PROBE BASE-AGENT-002 5 first Scribe '+mode+': signed-in and MCP assignments saved the same Scribe and reason, kept companion roles, advanced both revisions once per door and appended one command.assign-role with distinct attribution; '+Number(mode==='held')+' open review, paging OFF and zero outbound requests');
  console.log('PROBE BASE-AGENT-012 acceptance 3 '+mode+' Scribe assignment: one standard-only agent-attributed assign-role from unassigned to an existing active responder, one incident and workspace revision and native audit commit; original key and revision with changed reason -> isError idempotency_conflict in metadata and text, no private result; exact original arguments with new RPC id -> saved result and original review; native effect custody and paging unchanged; attributed refusal and linked replay audit only; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
 await observe?.(savedPairs);
}
