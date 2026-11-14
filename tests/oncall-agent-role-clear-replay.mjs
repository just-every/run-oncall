import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Clearing a populated Scribe keeps its original outcome across conflicts and response loss. */
export async function roleClearReplay(runtime){
 const {db,http,tool,adopt,context}=runtime,name='oncall.incidents.update';
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
 const snapshot=()=>agentEffectSnapshot(runtime),audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const permanent=()=>rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const calls=key=>rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,key);
 const owner=(await read('/api/workspace')).member;
 const responder=(await read('/api/state')).members.find(row=>row.active&&row.role==='responder');
 assert.ok(responder);assert.notEqual(responder.id,owner.id);
 const service='synthetic-oncall-scribe-clear';
 await command({type:'service',id:service,name:'Synthetic Scribe clear coordination',environment:'production',owner:owner.id,runbook:['Synthetic retained response steps'],pager:''});
 const credential='synthetic-oncall-'+randomUUID();
 const client=await http('/api/automation/clients',{name:'Synthetic Scribe clear scope',key:credential,
  services:[service],permissions:['services:read','incidents:read','incidents:write']});
 assert.equal(client.status,201);await client.json();
 const observed=[];
 async function target(label,targetService=service){
  let incident=await command({type:'declare',service:targetService,title:'Synthetic Scribe clear '+label,
   summary:'Ordinary coordination without protected evidence',severity:'warning',alerts:[]});
  incident=await command({type:'transition',incident:incident.id,revision:incident.revision,state:'acknowledged',summary:'Synthetic human acknowledgment'});
  incident=await command({type:'reassign',incident:incident.id,revision:incident.revision,member:responder.id,reason:'Synthetic explicit assignee'});
  for(const [role,member] of [['scribe',responder.id],['communications',owner.id]])
   incident=await command({type:'assign-role',incident:incident.id,revision:incident.revision,role,member,reason:'Synthetic companion responsibility'});
  assert.equal(incident.state,'acknowledged');assert.equal(incident.recovery,'');
  assert.deepEqual(incident.alerts,[]);assert.deepEqual(incident.actions,[]);
  assert.equal(incident.commander,owner.id);assert.equal(incident.assignee,responder.id);
  assert.equal(incident.scribe,responder.id);assert.equal(incident.communications,owner.id);
  return incident;
 }
 const argumentsFor=incident=>({change:'assign-role',role:'scribe',member:null,incident:incident.id,revision:incident.revision,
  reason:'Synthetic literal Scribe clear <retain this text> & coordination',idempotency_key:randomUUID()});
 async function bookkeeping(before){
  const after=await permanent();assert.deepEqual(after.slice(0,before.length),before);
  for(const row of after.slice(before.length)){
   assert.equal(row.kind,'agent-door.persistence');assert.ok(['accepted','refused'].includes(row.outcome));
   for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after']);
  }
 }
 async function attempt(prior,answer,args,outcome,code,original){
  const after=await audits();assert.deepEqual(after.slice(0,-1),prior);assert.equal(after.length,prior.length+1);
  const row=JSON.parse(after.at(-1).row);
  if(outcome==='replayed')assert.equal(row.id,answer.decision.id);
  assert.equal(row.tool,name);assert.equal(row.outcome,outcome);
  assert.equal(row.idempotency_key,args.idempotency_key);
  if(code)assert.equal(row.code,code);
  if(original){assert.equal(row.replay_of,original.id);assert.equal(row.operation_id,original.operation_id)}
  if(outcome==='refused'){assert.equal(row.review,null);assert.equal(row.approval,null)}
  return row;
 }
 function error(answer,expected){
  assert.equal(answer.status,200);assert.equal(answer.body.error,undefined);assert.equal(answer.result.isError,true);
  assert.deepEqual(answer.result._meta['com.runeditrun/error'],expected);
  assert.deepEqual(JSON.parse(answer.result.content[0].text),expected);assert.equal(answer.result.structuredContent,undefined);
 }
 async function committed(incident,args,before,priorAudit,mode,disposition){
  const retained=await calls(args.idempotency_key);assert.equal(retained.length,1);
  const [call]=retained,saved=JSON.parse(call.outcome),after=await snapshot(),result=saved.result;
  assert.equal(call.state,'done');assert.equal(saved.outcome,'done');assert.equal(saved.decision.id,call.decision_id);
  assert.deepEqual(saved.decision.classes.map(row=>row.class),['standard']);assert.equal(saved.decision.disposition,disposition);
  assert.equal(result.timeline.length,incident.timeline.length+1);assert.deepEqual(result.timeline.slice(0,-1),incident.timeline);
  assert.deepEqual(result,{...incident,scribe:null,revision:incident.revision+1,timeline:result.timeline},'All companion roles and every other field survive');
  const entry=result.timeline.at(-1);
  assert.equal(entry.kind,'assign-role');assert.equal(entry.text,'scribe: '+responder.name+' → Unassigned: '+args.reason);
  assert.equal(result.timeline.filter(row=>row.kind==='assign-role').length,incident.timeline.filter(row=>row.kind==='assign-role').length+1);
  assert.equal(entry.lifecycle,undefined);
  assert.equal(entry.actor,context.agentId);assert.notEqual(entry.actor,responder.id);assert.notEqual(entry.actor,owner.id);
  assert.equal(entry.metadata.agent.agent.id,context.agentId);assert.equal(entry.metadata.agent.for.id,owner.id);
  assert.deepEqual(after.application.incidents.find(row=>row.id===incident.id),result);
  assert.deepEqual(JSON.parse(after.records.oc_incidents.find(row=>row.id===incident.id).data),result);
  assert.equal(after.application.revision,before.application.revision+1);
  assert.equal(after.records.workspace_control[0].revision,before.records.workspace_control[0].revision+1);
  assert.deepEqual(after.application,{...before.application,revision:before.application.revision+1,
   incidents:before.application.incidents.map(row=>row.id===incident.id?result:row)});
  const commits=after.records.oc_admin_audit.filter(row=>!before.records.oc_admin_audit.some(prior=>prior.id===row.id));
  assert.equal(commits.length,1,'Exactly one native state-changing audit commits Scribe clear');
  const [commit]=commits;assert.equal(commit.kind,'incidents.update');assert.equal(commit.outcome,'accepted');
  assert.equal(commit.workspace_before,before.application.revision);assert.equal(commit.workspace_after,after.application.revision);
  assert.equal(commit.paging_before,commit.paging_after);assert.equal(commit.handoff_before,commit.handoff_after);
  for(const [field,kind,id] of [['actor','agent',context.agentId],['subject','entity',incident.id],['source','member',owner.id]]){
   const identity=await db.prepare('SELECT label FROM oc_audit_identities WHERE kind=? AND entity_id=?').bind(kind,id).first();
   assert.ok(identity);assert.equal(commit[field],identity.label);
  }
  for(const prior of before.records.oc_admin_audit)assert.deepEqual(after.records.oc_admin_audit.find(row=>row.id===prior.id),prior);
  assert.equal(after.records.agent_door_calls.length,before.records.agent_door_calls.length+1);
  for(const prior of before.records.agent_door_calls)assert.deepEqual(after.records.agent_door_calls.find(row=>row.agent===prior.agent&&row.key===prior.key),prior);
  assert.equal(after.records.agent_door_reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
  for(const prior of before.records.agent_door_reviews)assert.deepEqual(after.records.agent_door_reviews.find(row=>row.id===prior.id),prior);
  if(mode==='held'){
   const review=after.records.agent_door_reviews.find(row=>row.id===saved.review.id);
   assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,call.decision_id);
   assert.equal((await read('/agents/api/reviews')).reviews.find(row=>row.id===review.id).state,'open');
  }else assert.equal(saved.review,undefined);
  for(const table of Object.keys(before.records).filter(table=>!['oc_incidents','workspace_control','oc_admin_audit','oc_audit_identities','agent_door_calls','agent_door_reviews','agent_door_events','agent_door_usage'].includes(table)))
   assert.deepEqual(after.records[table],before.records[table],'Scribe clear preserves '+table);
  for(const prior of before.records.agent_door_usage)assert.deepEqual(after.records.agent_door_usage.find(row=>row.decision_id===prior.decision_id),prior);
  const usage=after.records.agent_door_usage.filter(row=>!before.records.agent_door_usage.some(prior=>prior.decision_id===row.decision_id));
  assert.equal(usage.length,1);assert.equal(usage[0].decision_id,call.decision_id);assert.equal(usage[0].agent,context.agentId);
  assert.deepEqual(JSON.parse(usage[0].classes),[{class:'standard',facts:{measure:1}}]);
  for(const prior of before.records.agent_door_events)assert.deepEqual(after.records.agent_door_events.find(row=>row.id===prior.id),prior);
  const events=after.records.agent_door_events.filter(row=>!before.records.agent_door_events.some(prior=>prior.id===row.id));
  assert.equal(events.length,1);
  const event=JSON.parse(events[0].event);
  assert.equal(event.type,'incidents.update');assert.equal(event.incident,incident.id);assert.equal(event.revision,result.revision);
  assert.equal(event.actor.kind,'agent');assert.equal(event.actor.agent.id,context.agentId);assert.equal(event.actor.for.id,owner.id);
  assert.deepEqual(after.records.oc_incidents.filter(row=>row.id!==incident.id),before.records.oc_incidents.filter(row=>row.id!==incident.id));
  const currentAudit=await audits();assert.deepEqual(currentAudit.slice(0,-1),priorAudit);assert.equal(currentAudit.length,priorAudit.length+1);
  const original=JSON.parse(currentAudit.at(-1).row);
  assert.equal(original.id,call.decision_id);assert.equal(original.tool,name);assert.equal(original.outcome,'done');
  assert.equal(original.replay_of,null);assert.equal(original.idempotency_key,args.idempotency_key);
  assert.equal(original.agent.id,context.agentId);assert.equal(original.sponsor.id,owner.id);
  assert.deepEqual(await runtime.outboundRequests(),[]);
  return {args,saved,retained,after,original};
 }
 async function replay(completion,previousId){
  const {args,saved,retained,after,original}=completion;
  const prior=await audits(),permanentBefore=await permanent(),relayBefore=await rows('SELECT * FROM agent_door_relay ORDER BY sequence');
  const answer=await tool(name,args);
  assert.equal(answer.status,200);assert.equal(answer.body.error,undefined);assert.equal(answer.result.isError,false);
  assert.notEqual(answer.body.id,previousId);assert.deepEqual(answer.result.structuredContent,saved.result);
  assert.deepEqual(answer.result._meta['com.runeditrun/review'],saved.review);
  assert.deepEqual(await snapshot(),after,'Replay preserves all native records, revisions, timeline, permanent state-changing audit, original call and outcome, expiry, approvals, reviews and paging');
  assert.deepEqual(await calls(args.idempotency_key),retained);
  const row=await attempt(prior,answer,args,'replayed',undefined,original);
  assert.equal(row.agent.id,context.agentId);assert.equal(row.sponsor.id,owner.id);
  const relayAfter=await rows('SELECT * FROM agent_door_relay ORDER BY sequence');
  assert.deepEqual(relayAfter.slice(0,relayBefore.length),relayBefore);
  assert.deepEqual(relayAfter.slice(relayBefore.length).map(row=>row.decision_id),[row.id]);
  await bookkeeping(permanentBefore);assert.deepEqual(await runtime.outboundRequests(),[]);
  return answer;
 }
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const admitted=await tool('oncall.services.read',{id:service});
  assert.equal(admitted.result.isError,false);
  const scoped=await tool('oncall.services.read',{id:service},{},credential);
  assert.equal(scoped.result.isError,false);assert.equal(scoped.result.structuredContent.data[0].id,service);
  const incident=await target('changed reason '+mode),args=argumentsFor(incident),before=await snapshot(),prior=await audits();
  const first=await tool(name,args);
  assert.equal(first.status,200);assert.equal(first.body.error,undefined);assert.equal(first.result.isError,false);
  const completion=await committed(incident,args,before,prior,mode,disposition);
  assert.deepEqual(first.result.structuredContent,completion.saved.result);
  assert.deepEqual(first.result._meta['com.runeditrun/review'],completion.saved.review);
  const immediate=await replay(completion,first.body.id);
  const changed={...args,reason:'Another schema-valid Scribe clear reason'};
  assert.deepEqual({...changed,reason:args.reason},args,'Only the schema-valid reason changes, keeping the original key and completed revision');
  const priorConflict=await audits(),permanentBefore=await permanent();
  const conflict=await tool(name,changed);error(conflict,{code:'idempotency_conflict'});
  assert.notEqual(conflict.body.id,immediate.body.id);
  assert.deepEqual(await snapshot(),completion.after);assert.deepEqual(await calls(args.idempotency_key),completion.retained);
  await attempt(priorConflict,conflict,changed,'refused','idempotency_conflict');await bookkeeping(permanentBefore);
  await replay(completion,conflict.body.id);
  console.log('PROBE BASE-AGENT-012 acceptance 1 and 3 '+mode+' Scribe clear: standard-only populated Scribe to null once, companion fields retained; new RPC id returns equal original result; original key and revision with changed reason -> isError idempotency_conflict in metadata and text without private result; original arguments still replay; zero outbound requests');
  const lostTarget=await target('lost response '+mode),lostArgs=argumentsFor(lostTarget),lostBefore=await snapshot(),lostPrior=await audits();
  const lost=await runtime.discardToolResponse(name,lostArgs);
  assert.equal(lost.status,200);assert.equal(lost.discarded,true);assert.equal(lost.aborted,true);assert.equal(lost.bodyRead,false);
  // Establish native call and outcome from D1 before retrying the unread response.
  const lostCompletion=await committed(lostTarget,lostArgs,lostBefore,lostPrior,mode,disposition);
  await replay(lostCompletion,lost.id);
  console.log('PROBE BASE-AGENT-012 acceptance 2 '+mode+' Scribe clear: real MCP response destroyed at headers without reading body; D1 proves completed original call, outcome and one native Scribe clear; new RPC id recovers original result and review; zero outbound requests');
  for(const diagnostic of ['expected','native']){
   const current=await target(diagnostic+' revision '+mode),fresh=argumentsFor(current);
   const stale=diagnostic==='expected'?{...fresh,expected_revision:current.revision-1}:{...fresh,revision:current.revision-1};
   if(diagnostic==='native')assert.equal(Object.hasOwn(stale,'expected_revision'),false);
   else assert.equal(stale.revision,current.revision);
   const baseline=await snapshot(),auditBefore=await audits(),permanentPrior=await permanent();
   assert.notEqual(baseline.application.revision,current.revision,'Diagnostic names the authorized incident revision, not the workspace revision');
   const refused=await tool(name,stale);error(refused,{code:'revision_conflict',current_revision:current.revision});
   assert.deepEqual(await snapshot(),baseline);
   await attempt(auditBefore,refused,stale,'refused','revision_conflict');await bookkeeping(permanentPrior);
   const returned=refused.result._meta['com.runeditrun/error'].current_revision;
   const corrected={...fresh,revision:returned,idempotency_key:randomUUID(),...(diagnostic==='expected'?{expected_revision:returned}:{})};
   assert.notEqual(corrected.idempotency_key,stale.idempotency_key);
   if(diagnostic==='native')assert.equal(Object.hasOwn(corrected,'expected_revision'),false);
   const correctedPrior=await audits(),accepted=await tool(name,corrected);
   assert.equal(accepted.status,200);assert.equal(accepted.body.error,undefined);assert.equal(accepted.result.isError,false);
   const recovered=await committed(current,corrected,baseline,correctedPrior,mode,disposition);
   assert.deepEqual(accepted.result.structuredContent,recovered.saved.result);
   await replay(recovered,accepted.body.id);
   console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' Scribe clear '+diagnostic+' revision: stale '+diagnostic+' revision -> revision_conflict and exact parent current_revision '+returned+' in metadata and text without private result; fresh key corrected from diagnostic clears Scribe once; exact retry adds no effect or review; zero outbound requests');
   const foreign=await target('private '+diagnostic+' '+mode,'agent-foreign-service'),privateBefore=await snapshot(),denials=[];
   for(const id of [foreign.id,'synthetic-oncall-'+randomUUID()]){
    const deniedArgs={...stale,incident:id,idempotency_key:randomUUID()},priorDenial=await audits(),permanentDenial=await permanent();
    const denied=await tool(name,deniedArgs,{},credential);error(denied,{code:'not_found'});
    denials.push({error:denied.result._meta['com.runeditrun/error'],content:denied.result.content});
    assert.deepEqual(await snapshot(),privateBefore);
    await attempt(priorDenial,denied,deniedArgs,'refused','not_found');await bookkeeping(permanentDenial);
   }
   assert.deepEqual(denials[0],denials[1],'Scoped-out and missing targets have identical not_found without revision disclosure');
   assert.deepEqual(await runtime.outboundRequests(),[]);
  }
  observed.push({mode,incident:completion.saved.result});
 }
 assert.equal((await adopt()).status,200);
 return observed;
}
