import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** A stale native reassignment revision diagnoses only an authorized parent. */
export async function staleReassignmentNativeRevision(runtime,optional=false){
 const {db,http,tool,adopt,context}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const permanent=()=>rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const owner=(await read('/api/workspace')).member;
 const name='oncall.incidents.update';
 const credential='synthetic-oncall-'+randomUUID();
 const client=await http('/api/automation/clients',{name:'Synthetic native revision scope',key:credential,
  services:['agent-service'],permissions:['services:read','incidents:read','incidents:write']});
 assert.equal(client.status,201);await client.json();
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  let incident=await command({type:'declare',service:'agent-service',title:'Synthetic native reassignment revision '+mode,
   summary:'Native coordination without protected evidence',severity:'warning',alerts:[]});
  incident=await command({type:'transition',incident:incident.id,revision:incident.revision,state:'acknowledged',summary:'Synthetic current assignee'});
  const before=await snapshot(),pagingBefore=await read('/api/paging/state'),priorAudit=await audits();
  assert.ok(before.records.agent_door_calls.some(row=>row.outcome),'Refusal preserves populated original outcome custody');
  assert.ok(before.records.agent_door_approvals.length>0,'Refusal preserves existing approval custody');
  assert.ok(before.records.agent_door_reviews.length>0,'Refusal preserves existing review custody');
  assert.notEqual(before.application.revision,incident.revision,'The diagnostic names the parent incident revision, not the workspace revision');
  assert.equal(incident.assignee,owner.id);
  const assignee=before.application.members.find(row=>row.id===incident.assignee);
  const responder=before.application.members.find(row=>row.active&&row.role==='responder'&&row.id!==assignee.id);
  assert.ok(assignee.active);assert.ok(responder,'Reassignment must name an existing distinct active responder');
  assert.deepEqual(incident.alerts,[]);assert.deepEqual(incident.actions,[]);assert.equal(incident.recovery,'');
  const args={change:'reassign',incident:incident.id,revision:incident.revision,member:responder.id,
   reason:'Synthetic literal reassignment reason <keep this text>',idempotency_key:randomUUID()};
  const staleArgs={...args,...(optional?{expected_revision:incident.revision-1}:{revision:incident.revision-1})};
  assert.equal(Object.hasOwn(staleArgs,'expected_revision'),optional);
  const stale=await tool(name,staleArgs);
  assert.equal(stale.status,200);assert.equal(stale.body.error,undefined);assert.equal(stale.result.isError,true);
  const error={code:'revision_conflict',current_revision:incident.revision};
  assert.deepEqual(stale.result._meta['com.runeditrun/error'],error);
  assert.deepEqual(JSON.parse(stale.result.content[0].text),error);assert.equal(stale.result.structuredContent,undefined);
  assert.deepEqual(await snapshot(),before,'Native revision refusal preserves records, revisions, timeline, state-changing audit, original calls and outcomes, approvals, reviews and paging');
  assert.deepEqual(await read('/api/paging/state'),pagingBefore);
  const refusedAudit=await audits();assert.deepEqual(refusedAudit.slice(0,-1),priorAudit);assert.equal(refusedAudit.length,priorAudit.length+1);
  const refusal=JSON.parse(refusedAudit.at(-1).row);
  assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,'revision_conflict');
  assert.equal(refusal.idempotency_key,staleArgs.idempotency_key);assert.equal(refusal.agent.id,context.agentId);assert.equal(refusal.sponsor.id,owner.id);
  assert.deepEqual(refusal.resource,{kind:'incident',id:incident.id});
  if(optional)args.expected_revision=incident.revision;
  args.revision=stale.result._meta['com.runeditrun/error'].current_revision;args.idempotency_key=randomUUID();
  assert.notEqual(args.idempotency_key,staleArgs.idempotency_key);
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
  const originalAudit=await audits();assert.deepEqual(originalAudit.slice(0,-1),refusedAudit);assert.equal(originalAudit.length,refusedAudit.length+1);
  const original=JSON.parse(originalAudit.at(-1).row);
  assert.equal(original.id,first.decision.id);assert.equal(original.tool,name);assert.equal(original.outcome,'done');
  assert.equal(original.idempotency_key,args.idempotency_key);assert.equal(original.replay_of,null);
  assert.equal(original.agent.id,context.agentId);assert.equal(original.sponsor.id,owner.id);
  const permanentOnce=await permanent();
  const replay=await tool(name,args);
  assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.equal(replay.result.isError,false);
  assert.notEqual(replay.body.id,first.body.id);assert.notEqual(replay.body.id,stale.body.id);
  assert.deepEqual(replay.result.structuredContent,stored.result);assert.deepEqual(replay.result._meta['com.runeditrun/review'],stored.review);
  assert.deepEqual(await snapshot(),once,'Exact original arguments return the saved outcome with no second reassignment, revision, state-changing audit or held review');
  assert.deepEqual(await read('/api/paging/state'),pagingOnce);
  assert.deepEqual(await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key),calls);
  const retried=await audits();assert.deepEqual(retried.slice(0,-1),originalAudit);assert.equal(retried.length,originalAudit.length+1);
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
  assert.deepEqual(await runtime.outboundRequests(),[],'Reassignment revision refusal, recovery and exact retry attempt zero outbound requests');
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' reassignment '+(optional?'optional expected revision':'native revision')+': stale revision -> isError revision_conflict and exact authorized current_revision '+error.current_revision+' in metadata and text, no private result or native effect; fresh key and returned revision -> standard-only '+disposition+', one agent-attributed reassignment, incident and workspace increment and native audit commit; new RPC id replay -> saved result and original review without another effect; zero outbound requests');

  const scoped=await tool('oncall.services.read',{id:'agent-service'},{},credential);
  assert.equal(scoped.result.isError,false);assert.equal(scoped.result.structuredContent.data[0].id,'agent-service');
  const foreign=await command({type:'declare',service:'agent-foreign-service',title:'Synthetic private native revision '+mode,
   summary:'Ordinary private coordination',severity:'warning',alerts:[]});
  const privateBefore=await snapshot(),privatePaging=await read('/api/paging/state'),denials=[];
  for(const target of [foreign,{id:'synthetic-oncall-'+randomUUID(),revision:foreign.revision}]){
   const deniedArgs={...args,incident:target.id,revision:optional?target.revision:target.revision-1,...(optional?{expected_revision:target.revision-1}:{}),idempotency_key:randomUUID()};
   const prior=await audits(),denied=await tool(name,deniedArgs,{},credential);
   assert.equal(denied.status,200);assert.equal(denied.body.error,undefined);assert.equal(denied.result.isError,true);
   assert.deepEqual(denied.result._meta['com.runeditrun/error'],{code:'not_found'});
   assert.deepEqual(JSON.parse(denied.result.content[0].text),{code:'not_found'});assert.equal(denied.result.structuredContent,undefined);
   denials.push({error:denied.result._meta['com.runeditrun/error'],content:denied.result.content});
   assert.deepEqual(await snapshot(),privateBefore,'Missing and scoped-out refusals preserve all native and saved replay custody');
   assert.deepEqual(await read('/api/paging/state'),privatePaging);
   const after=await audits();assert.deepEqual(after.slice(0,-1),prior);assert.equal(after.length,prior.length+1);
   const row=JSON.parse(after.at(-1).row);assert.equal(row.outcome,'refused');assert.equal(row.code,'not_found');
   assert.equal(row.tool,name);assert.equal(row.idempotency_key,deniedArgs.idempotency_key);
  }
  assert.deepEqual(denials[0],denials[1],'Missing and scoped-out incidents have identical public errors');
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' reassignment non-disclosure: valid scoped client with stale revision against foreign and missing incidents -> identical not_found, no revision or private result, custody and paging unchanged, zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}
