import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Diagnose a stale optional string revision without consuming native custody. */
export async function staleServiceRevision(runtime){
 const {db,http,tool,adopt,context}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const owner=(await read('/api/workspace')).member;
 const name='oncall.services.update';
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const id='synthetic-oncall-'+randomUUID();
  const original={id,name:'Synthetic service before reload '+mode,environment:'test',owner:owner.id,
   runbook:['Inspect retained coordination evidence'],pager:''};
  const prepare=async input=>{const response=await http('/api/command',{...input,type:'service'});assert.equal(response.status,200);return response.json()};
  await prepare(original);
  const serviceRead=async bearer=>{
   const response=await tool('oncall.services.read',{id},{},bearer);
   assert.equal(response.status,200);assert.equal(response.result.isError,false);
   return response.result.structuredContent.data[0];
  };
  const old=await serviceRead();
  await prepare({...original,name:'Synthetic service after reload '+mode});
  const current=await serviceRead();
  assert.match(current.etag,/^[a-f0-9]{64}$/);assert.notEqual(current.etag,old.etag);
  const credential='synthetic-oncall-'+randomUUID();
  const response=await http('/api/automation/clients',{name:'Synthetic service revision scope '+mode,key:credential,
   services:[id],permissions:['services:read','services:write']});
  assert.equal(response.status,201);await response.json();
  const scoped=await serviceRead(credential);
  assert.equal(scoped.etag,current.etag,'The authorized service projection supplies the native ETag');
  const args={...original,name:'Synthetic agent service edit '+mode,etag:current.etag,
   expected_revision:old.etag,idempotency_key:randomUUID()};
  const before=await snapshot(),pagingBefore=await read('/api/paging/state'),priorAudit=await audits();
  assert.ok(before.records.agent_door_calls.length>0,'Refusal starts with populated original replay custody');
  assert.ok(before.records.agent_door_reviews.length>0,'Refusal starts with populated review custody');
  const stale=await tool(name,args);
  assert.equal(stale.status,200);assert.equal(stale.body.error,undefined);assert.equal(stale.result.isError,true);
  const error={code:'revision_conflict',current_revision:current.etag};
  assert.deepEqual(stale.result._meta['com.runeditrun/error'],error);
  assert.deepEqual(JSON.parse(stale.result.content[0].text),error);
  assert.equal(stale.result.structuredContent,undefined);
  assert.deepEqual(await snapshot(),before,'Optional revision refusal preserves records, revisions, timeline, state-changing audit, original outcomes, approvals, reviews and paging');
  assert.deepEqual(await read('/api/paging/state'),pagingBefore);
  const refusedAudit=await audits();
  assert.deepEqual(refusedAudit.slice(0,-1),priorAudit);assert.equal(refusedAudit.length,priorAudit.length+1);
  const refusal=JSON.parse(refusedAudit.at(-1).row);
  assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,'revision_conflict');
  assert.equal(refusal.idempotency_key,args.idempotency_key);assert.equal(refusal.agent.id,context.agentId);
  assert.deepEqual(refusal.resource,{kind:'service',id});

  const returned=stale.result._meta['com.runeditrun/error'].current_revision;
  const freshArgs={...args,etag:returned,expected_revision:returned,idempotency_key:randomUUID()};
  const fresh=await tool(name,freshArgs);
  assert.equal(fresh.status,200);assert.equal(fresh.body.error,undefined);assert.equal(fresh.result.isError,false);
  assert.deepEqual(fresh.decision.classes.map(row=>row.class),['standard']);assert.equal(fresh.decision.disposition,disposition);
  const once=await snapshot(),saved=once.application.services.find(row=>row.id===id);
  const previous=before.application.services.find(row=>row.id===id);
  assert.deepEqual(saved,{...previous,name:args.name},'The supported write changes only the service name');
  assert.equal(once.application.audit.length,before.application.audit.length+1);
  assert.deepEqual(once.application.audit.slice(0,-1),before.application.audit);
  const entry=once.application.audit.at(-1);
  assert.equal(entry.kind,'service');assert.equal(entry.actor,context.agentId);
  assert.equal(entry.metadata.agent.agent.id,context.agentId);assert.equal(entry.metadata.agent.for.id,owner.id);
  assert.ok(entry.text.includes(args.name));
  assert.deepEqual(once.application,{...before.application,revision:before.application.revision+1,
   services:before.application.services.map(row=>row.id===id?saved:row),audit:once.application.audit});
  const savedEtag=fresh.result.structuredContent.etag;
  assert.match(savedEtag,/^[a-f0-9]{64}$/);assert.notEqual(savedEtag,returned);
  assert.deepEqual(fresh.result.structuredContent,{...saved,etag:savedEtag});
  assert.equal(once.records.oc_admin_audit.length,before.records.oc_admin_audit.length+1);
  for(const record of before.records.oc_admin_audit)assert.deepEqual(once.records.oc_admin_audit.find(row=>row.id===record.id),record);
  const commit=once.records.oc_admin_audit.find(row=>!before.records.oc_admin_audit.some(prior=>prior.id===row.id));
  assert.equal(commit.kind,'service.update');assert.equal(commit.outcome,'accepted');
  const actor=await rows('SELECT * FROM oc_audit_identities WHERE kind=? AND entity_id=?','agent',context.agentId);
  assert.equal(actor.length,1);assert.equal(commit.actor,actor[0].label,'The native service edit retains the actual agent attribution');
  assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals);
  for(const table of Object.keys(before.records).filter(value=>value.startsWith('paging_')))assert.deepEqual(once.records[table],before.records[table]);
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
  assert.equal(stored.outcome,'done');assert.deepEqual(stored.result,fresh.result.structuredContent);
  assert.deepEqual(stored.review,fresh.result._meta['com.runeditrun/review']);
  const originalAudit=await rows('SELECT * FROM agent_door_audit WHERE id=?',fresh.decision.id),beforeRetry=await audits();
  const replay=await tool(name,freshArgs);
  assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.equal(replay.result.isError,false);
  assert.notEqual(replay.body.id,fresh.body.id);assert.notEqual(replay.body.id,stale.body.id);
  assert.deepEqual(replay.result.structuredContent,stored.result);assert.deepEqual(replay.result._meta['com.runeditrun/review'],stored.review);
  assert.deepEqual(await snapshot(),once,'A new RPC id replays the original outcome without another effect, revision, state-changing audit or review');
  assert.deepEqual(await rows('SELECT * FROM agent_door_audit WHERE id=?',fresh.decision.id),originalAudit);
  const retried=await audits();assert.deepEqual(retried.slice(0,-1),beforeRetry);assert.equal(retried.length,beforeRetry.length+1);
  const attempt=JSON.parse(retried.at(-1).row);assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,fresh.decision.id);
  const reread=await serviceRead();assert.equal(reread.etag,savedEtag);

  const privateBefore=await snapshot();
  for(const target of ['agent-foreign-service','synthetic-oncall-'+randomUUID()]){
   const denied=await tool(name,{...args,id:target,idempotency_key:randomUUID()},{},credential);
   assert.equal(denied.status,200);assert.equal(denied.body.error,undefined);assert.equal(denied.result.isError,true);
   assert.deepEqual(denied.result._meta['com.runeditrun/error'],{code:'not_found'});
   assert.deepEqual(JSON.parse(denied.result.content[0].text),{code:'not_found'});assert.equal(denied.result.structuredContent,undefined);
   assert.deepEqual(await snapshot(),privateBefore,'Missing and scoped-out services disclose no revision or result and preserve custody');
  }
  // A retained private dependency makes the authorized ETag differ from the
  // owner's full-record ETag; the refusal must reveal only the former.
  await prepare({...saved,dependencies:['agent-foreign-service']});
  const ownerView=await serviceRead(),scopedView=await serviceRead(credential);
  assert.deepEqual(ownerView.dependencies,['agent-foreign-service']);assert.deepEqual(scopedView.dependencies,[]);
  assert.notEqual(scopedView.etag,ownerView.etag);assert.notEqual(scopedView.etag,returned);
  const projectedBefore=await snapshot();
  const projected=await tool(name,{...args,etag:scopedView.etag,expected_revision:returned,idempotency_key:randomUUID()},{},credential);
  assert.equal(projected.status,200);assert.equal(projected.body.error,undefined);assert.equal(projected.result.isError,true);
  const projectedError={code:'revision_conflict',current_revision:scopedView.etag};
  assert.deepEqual(projected.result._meta['com.runeditrun/error'],projectedError);
  assert.deepEqual(JSON.parse(projected.result.content[0].text),projectedError);assert.equal(projected.result.structuredContent,undefined);
  assert.deepEqual(await snapshot(),projectedBefore,'A scoped diagnostic preserves private dependencies and all retained custody');
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' '+name+': valid native ETag with stale string expected_revision -> isError revision_conflict with exact authorized current_revision in metadata and text, no private result or effect; fresh key and returned ETag in both revision fields -> one agent-attributed name-only edit, '+disposition+'; new RPC id retry -> stored result, no duplicate effect or review; missing and scoped-out services -> not_found without revision or private result; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}
