import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

export async function staleDeclarationExpectedRevision(runtime){
 const {db,http,tool,adopt,context}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const name='oncall.incidents.declare';
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const preparation=await http('/api/command',{type:'declare',service:'agent-service',title:'Synthetic expected revision '+mode,
   summary:'Synthetic coordination without protected evidence',severity:'warning',alerts:[]});
  assert.equal(preparation.status,200);
  const incident=await preparation.json();
  const workspace=await read('/api/state'),service=workspace.services.find(row=>row.id==='agent-service');
  const current=workspace.revision;
  assert.ok(service.runbook.length>0,'The declaration must copy a populated native runbook');
  assert.notEqual(workspace.revision,incident.revision,'Workspace and incident revisions must be distinct');
  const args={service:service.id,title:'Synthetic declaration after revision reload '+mode,
   summary:'Synthetic internal coordination',severity:'warning',
   expected_revision:current-1,idempotency_key:randomUUID()};
  assert.equal(Object.hasOwn(args,'revision'),false,'Omit the native declaration revision');
  const pagingBefore=await read('/api/paging/state');
  const before=await snapshot(),priorAudit=await rows('SELECT * FROM agent_door_audit ORDER BY sequence');
  const stale=await tool(name,args);
  assert.equal(stale.status,200);assert.equal(stale.result.isError,true);
  const error=stale.result._meta['com.runeditrun/error'];
  assert.equal(error.code,'revision_conflict');assert.equal(error.current_revision,current);
  assert.deepEqual(JSON.parse(stale.result.content[0].text),{code:'revision_conflict',current_revision:current});
  assert.equal(stale.result.structuredContent,undefined);
  assert.deepEqual(await snapshot(),before,'Stale optional revision preserves native records, revisions, timeline, state-changing audit, replay, approval, review and paging custody');
  assert.deepEqual(await read('/api/paging/state'),pagingBefore);
  const refusedAudit=await rows('SELECT * FROM agent_door_audit ORDER BY sequence');
  assert.deepEqual(refusedAudit.slice(0,priorAudit.length),priorAudit);
  assert.equal(refusedAudit.length,priorAudit.length+1);
  const refusal=JSON.parse(refusedAudit.at(-1).row);
  assert.equal(refusal.tool,name);assert.equal(refusal.code,'revision_conflict');assert.equal(refusal.outcome,'refused');
  assert.equal(refusal.idempotency_key,args.idempotency_key);assert.equal(refusal.agent.id,context.agentId);
  assert.deepEqual(refusal.resource,{kind:'service',id:service.id});

  const freshArgs={...args,expected_revision:error.current_revision,idempotency_key:randomUUID()};
  const fresh=await tool(name,freshArgs);
  assert.equal(fresh.status,200);assert.equal(fresh.result.isError,false);assert.equal(fresh.decision.disposition,disposition);
  assert.deepEqual(fresh.decision.classes.map(row=>row.class),['standard']);
  const once=await snapshot(),saved=once.application.incidents.find(row=>row.id===fresh.result.structuredContent.id);
  assert.equal(once.application.incidents.length,before.application.incidents.length+1);
  assert.equal(saved.title,args.title);assert.equal(saved.timeline.find(row=>row.kind==='declared').text,args.summary);assert.equal(saved.service,service.id);
  assert.deepEqual(saved.runbook,service.runbook.map(text=>({text,done:false})));assert.equal(saved.revision,1);
  assert.equal(saved.timeline.filter(row=>row.kind==='declared').length,1);
  assert.deepEqual(fresh.result.structuredContent,saved);
  assert.equal(once.application.revision,before.application.revision+1);
  const entry=saved.timeline.at(-1);
  assert.equal(entry.metadata.agent.agent.id,context.agentId);
  assert.equal(entry.metadata.agent.for.id,before.application.members.find(row=>row.name==='Alex Chen').id);
  assert.equal(once.records.oc_admin_audit.length,before.records.oc_admin_audit.length+1);
  for(const prior of before.records.oc_admin_audit)assert.deepEqual(once.records.oc_admin_audit.find(row=>row.id===prior.id),prior);
  assert.deepEqual(await read('/api/paging/state'),{...pagingBefore,workspaceRevision:once.application.revision});
  for(const name of Object.keys(before.records).filter(name=>name.startsWith('paging_')))assert.deepEqual(once.records[name],before.records[name]);
  assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals);
  const reviews=once.records.agent_door_reviews;
  assert.equal(reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
  for(const review of before.records.agent_door_reviews)assert.deepEqual(reviews.find(row=>row.id===review.id),review);
  if(mode==='held'){
   const review=reviews.find(row=>row.id===fresh.result._meta['com.runeditrun/review'].id);
   assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,fresh.decision.id);
  }else assert.equal(fresh.result._meta['com.runeditrun/review'],undefined);
  const calls=await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,freshArgs.idempotency_key);
  assert.equal(calls.length,1);assert.equal(calls[0].state,'done');
  const stored=JSON.parse(calls[0].outcome);
  assert.deepEqual(stored.result,saved);assert.equal(stored.decision.id,fresh.decision.id);
  const replay=await tool(name,freshArgs);
  assert.notEqual(replay.body.id,fresh.body.id);assert.equal(replay.result.isError,false);
  assert.deepEqual(replay.result.structuredContent,fresh.result.structuredContent);
  assert.deepEqual(replay.result._meta['com.runeditrun/review'],fresh.result._meta['com.runeditrun/review']);
  assert.deepEqual(await snapshot(),once,'Fresh-key replay adds no duplicate incident, revision, native audit commit, review or custody');
  // The revision diagnostic is available only after native target authority.
  assert.ok(workspace.services.some(row=>row.id==='agent-foreign-service'));
  const key='synthetic-oncall-'+randomUUID();
  const client=await http('/api/automation/clients',{name:'Synthetic revision scope '+mode,key,
   services:[service.id],permissions:['services:read','incidents:write']});
  assert.equal(client.status,201);await client.body?.cancel();
  const admitted=await tool('oncall.services.read',{id:service.id},{},key);
  assert.equal(admitted.result.isError,false);
  for(const [target,bearer] of [['synthetic-oncall-missing',undefined],['synthetic-oncall-missing',key],['agent-foreign-service',key]]){
   const before=await snapshot();
   const hidden=await tool(name,{...args,service:target,idempotency_key:randomUUID()},{},bearer);
   assert.equal(hidden.status,200);assert.equal(hidden.result.isError,true);
   assert.deepEqual(hidden.result._meta['com.runeditrun/error'],{code:'not_found'});
   assert.deepEqual(JSON.parse(hidden.result.content[0].text),{code:'not_found'});
   assert.equal(hidden.result.structuredContent,undefined);
   assert.deepEqual(await snapshot(),before,'Missing or out-of-scope targets reveal no revision and create no native or replay effect');
  }
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' '+name+': stale expected_revision at workspace revision '+current+' -> isError revision_conflict, exact current_revision in metadata and text; durable state and custody unchanged; fresh key using returned revision -> '+disposition+', one attributed incident with copied runbook and application commit; new RPC id retry unchanged; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}
