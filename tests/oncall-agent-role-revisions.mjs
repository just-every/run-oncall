import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** A stale optional role revision diagnoses only an authorized parent. */
export async function staleRoleExpectedRevision(runtime,role,label){
 const {db,http,tool,adopt,context}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const permanent=()=>rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const bookkeeping=async prior=>{
  const after=await permanent();assert.deepEqual(after.slice(0,prior.length),prior);
  const appended=after.slice(prior.length);assert.ok(appended.length>0);
  for(const record of appended){
   assert.equal(record.kind,'agent-door.persistence');assert.ok(['accepted','refused'].includes(record.outcome));
   for(const family of ['workspace','paging','handoff'])assert.equal(record[family+'_before'],record[family+'_after'],'Attempt audit never commits another application effect');
  }
 };
 const owner=(await read('/api/workspace')).member;
 const name='oncall.incidents.update';
 const credential='synthetic-oncall-'+randomUUID();
 const client=await http('/api/automation/clients',{name:`Synthetic ${label} revision scope`,key:credential,
  services:['agent-service'],permissions:['services:read','incidents:read','incidents:write']});
 assert.equal(client.status,201);await client.json();
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const incident=await command({type:'declare',service:'agent-service',title:`Synthetic optional ${label} revision `+mode,
   summary:'Native coordination without protected evidence',severity:'warning',alerts:[]});
  const before=await snapshot(),pagingBefore=await read('/api/paging/state'),priorAudit=await audits(),permanentBefore=await permanent();
  assert.ok(before.records.agent_door_calls.some(row=>row.outcome),'Refusal preserves populated original outcome custody');
  assert.ok(before.records.agent_door_approvals.length>0,'Refusal preserves existing approval custody');
  assert.ok(before.records.agent_door_reviews.length>0,'Refusal preserves existing review custody');
  assert.notEqual(before.application.revision,incident.revision,'The diagnostic names the parent incident revision, not the workspace revision');
  assert.equal(incident[role]??null,null);assert.equal(incident.state,'declared');
  const responder=before.application.members.find(row=>row.active&&row.role==='responder');
  assert.ok(responder,`${label} assignment names an existing active responder`);
  assert.deepEqual(incident.alerts,[]);assert.deepEqual(incident.actions,[]);assert.equal(incident.recovery,'');
  const args={change:'assign-role',role,incident:incident.id,revision:incident.revision,member:responder.id,
   reason:`Synthetic literal ${label} reason <keep this text> & retain it`,idempotency_key:randomUUID()};
  const staleArgs={...args,expected_revision:incident.revision-1};
  assert.equal(staleArgs.revision,incident.revision,'The required native revision is current');
  assert.notEqual(staleArgs.expected_revision,staleArgs.revision);
  const stale=await tool(name,staleArgs);
  assert.equal(stale.status,200);assert.equal(stale.body.error,undefined);assert.equal(stale.result.isError,true);
  const error={code:'revision_conflict',current_revision:incident.revision};
  assert.deepEqual(stale.result._meta['com.runeditrun/error'],error);
  assert.deepEqual(JSON.parse(stale.result.content[0].text),error);assert.equal(stale.result.structuredContent,undefined);
  assert.deepEqual(await snapshot(),before,'Optional revision refusal preserves records, revisions, timeline, state-changing audit, original calls and outcomes, approvals, reviews and paging');
  assert.deepEqual(await read('/api/paging/state'),pagingBefore);
  const refusedAudit=await audits();assert.deepEqual(refusedAudit.slice(0,-1),priorAudit);assert.equal(refusedAudit.length,priorAudit.length+1);
  const refusal=JSON.parse(refusedAudit.at(-1).row);
  assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,'revision_conflict');
  assert.equal(refusal.idempotency_key,staleArgs.idempotency_key);assert.equal(refusal.agent.id,context.agentId);assert.equal(refusal.sponsor.id,owner.id);
  assert.deepEqual(refusal.resource,{kind:'incident',id:incident.id});
  await bookkeeping(permanentBefore);
  const returned=stale.result._meta['com.runeditrun/error'].current_revision;
  args.revision=returned;args.expected_revision=returned;args.idempotency_key=randomUUID();
  assert.notEqual(args.idempotency_key,staleArgs.idempotency_key);
  const first=await tool(name,args);
  assert.equal(first.status,200);assert.equal(first.body.error,undefined);assert.equal(first.result.isError,false);
  assert.deepEqual(first.decision.classes.map(row=>row.class),['standard']);assert.equal(first.decision.disposition,disposition);
  const once=await snapshot(),result=first.result.structuredContent,pagingOnce=await read('/api/paging/state');
  const native=JSON.parse(once.records.oc_incidents.find(row=>row.id===incident.id).data);
  assert.deepEqual(result,native);assert.deepEqual(once.application.incidents.find(row=>row.id===incident.id),native);
  assert.deepEqual(result,{...incident,[role]:responder.id,revision:returned+1,timeline:result.timeline},`Only ${label}, revision and the appended timeline entry change`);
  assert.equal(result.revision,args.revision+1);assert.equal(once.application.revision,before.application.revision+1);
  assert.equal(once.records.workspace_control[0].revision,before.records.workspace_control[0].revision+1);
  assert.equal(once.application.incidents.length,before.application.incidents.length);
  assert.deepEqual(once.application.incidents.filter(row=>row.id!==incident.id),before.application.incidents.filter(row=>row.id!==incident.id));
  assert.deepEqual(result.timeline.slice(0,-1),incident.timeline);assert.equal(result.timeline.length,incident.timeline.length+1);
  const entry=result.timeline.at(-1);
  assert.equal(entry.kind,'assign-role');assert.equal(entry.text,role+': Unassigned → '+responder.name+': '+args.reason);
  assert.equal(entry.actor,context.agentId);assert.notEqual(entry.actor,responder.id);
  assert.equal(entry.metadata.agent.agent.id,context.agentId);assert.equal(entry.metadata.agent.for.id,owner.id);
  assert.equal(result.timeline.filter(row=>row.kind==='assign-role').length,1);
  assert.deepEqual(result.actions,incident.actions);assert.deepEqual(result.alerts,incident.alerts);
  const commits=once.records.oc_admin_audit.filter(row=>!before.records.oc_admin_audit.some(prior=>prior.id===row.id));
  assert.equal(commits.length,1,`Exactly one native state-changing audit commits the ${label} assignment`);
  const commit=commits[0];assert.equal(commit.kind,'incidents.update');assert.equal(commit.outcome,'accepted');
  assert.equal(commit.workspace_before,before.application.revision);assert.equal(commit.workspace_after,once.application.revision);
  assert.equal(commit.paging_before,commit.paging_after);assert.equal(commit.handoff_before,commit.handoff_after);
  for(const [field,kind,id] of [['actor','agent',context.agentId],['subject','entity',incident.id],['source','member',owner.id]]){
   const identity=await db.prepare('SELECT label FROM oc_audit_identities WHERE kind=? AND entity_id=?').bind(kind,id).first();
   assert.equal(commit[field],identity.label,'The native commit retains its '+field+' attribution');
  }
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
  assert.deepEqual(await snapshot(),once,`Exact original arguments return the saved outcome with no second ${label} assignment, revision, state-changing audit or held review`);
  assert.deepEqual(await read('/api/paging/state'),pagingOnce);
  assert.deepEqual(await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key),calls);
  const retried=await audits();assert.deepEqual(retried.slice(0,-1),originalAudit);assert.equal(retried.length,originalAudit.length+1);
  const retry=JSON.parse(retried.at(-1).row);
  assert.equal(retry.id,replay.decision.id);assert.equal(retry.tool,name);assert.equal(retry.outcome,'replayed');
  assert.equal(retry.replay_of,first.decision.id);assert.equal(retry.operation_id,original.operation_id);
  assert.equal(retry.idempotency_key,args.idempotency_key);assert.equal(retry.agent.id,context.agentId);assert.equal(retry.sponsor.id,owner.id);
  await bookkeeping(permanentOnce);
  assert.deepEqual(await runtime.outboundRequests(),[],`${label} optional revision refusal, recovery and exact retry attempt zero outbound requests`);
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+` ${label} optional revision: current native revision with stale expected_revision -> isError revision_conflict and exact authorized current_revision `+error.current_revision+' in metadata and text, no private result or native effect; fresh key and returned revision in both fields -> standard-only '+disposition+', one agent-attributed assign-role, incident and workspace increment and native audit commit; new RPC id replay -> saved result and original review without another effect; zero outbound requests');

  const scoped=await tool('oncall.services.read',{id:'agent-service'},{},credential);
  assert.equal(scoped.result.isError,false);assert.equal(scoped.result.structuredContent.data[0].id,'agent-service');
  const foreign=await command({type:'declare',service:'agent-foreign-service',title:`Synthetic private ${label} revision `+mode,
   summary:'Ordinary private coordination',severity:'warning',alerts:[]});
  const privateBefore=await snapshot(),privatePaging=await read('/api/paging/state'),denials=[];
  for(const target of [foreign,{id:'synthetic-oncall-'+randomUUID(),revision:foreign.revision}]){
   const deniedArgs={...args,incident:target.id,revision:target.revision,expected_revision:target.revision-1,idempotency_key:randomUUID()};
   const prior=await audits(),permanentPrior=await permanent(),denied=await tool(name,deniedArgs,{},credential);
   assert.equal(denied.status,200);assert.equal(denied.body.error,undefined);assert.equal(denied.result.isError,true);
   assert.deepEqual(denied.result._meta['com.runeditrun/error'],{code:'not_found'});
   assert.deepEqual(JSON.parse(denied.result.content[0].text),{code:'not_found'});assert.equal(denied.result.structuredContent,undefined);
   denials.push({error:denied.result._meta['com.runeditrun/error'],content:denied.result.content});
   assert.deepEqual(await snapshot(),privateBefore,'Missing and scoped-out refusals preserve all native and saved replay custody');
   assert.deepEqual(await read('/api/paging/state'),privatePaging);
   const after=await audits();assert.deepEqual(after.slice(0,-1),prior);assert.equal(after.length,prior.length+1);
   const row=JSON.parse(after.at(-1).row);assert.equal(row.outcome,'refused');assert.equal(row.code,'not_found');
   assert.equal(row.tool,name);assert.equal(row.idempotency_key,deniedArgs.idempotency_key);
   await bookkeeping(permanentPrior);
  }
  assert.deepEqual(denials[0],denials[1],'Missing and scoped-out incidents have identical public errors');
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+` ${label} non-disclosure: valid scoped client with current native revision and stale optional revision against foreign and missing incidents -> identical not_found, no revision or private result, custody and paging unchanged, zero outbound requests`);
 }
 assert.equal((await adopt()).status,200);
}

export async function staleScribeExpectedRevision(runtime){
 await staleRoleExpectedRevision(runtime,'scribe','Scribe');
}
