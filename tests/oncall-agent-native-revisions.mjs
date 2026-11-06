import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Native revision diagnostics use the current authorized target, without an optional guard. */
export async function nativeRevisions(runtime){
 const {db,http,tool,adopt}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const owner=(await read('/api/workspace')).member;
 const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const id='synthetic-oncall-'+randomUUID();
  await command({type:'service',id,name:'Synthetic revision service',environment:'test',owner:owner.id,
   runbook:['Synthetic copied coordination step','Synthetic human recovery review'],pager:'',dependencies:['agent-service']});
  const credential='synthetic-oncall-'+randomUUID();
  const response=await http('/api/automation/clients',{name:'Synthetic native revision scope',key:credential,services:[id,'agent-service'],
   permissions:['services:read','services:write','incidents:read','incidents:write']});
  assert.equal(response.status,201);const client=await response.json(),agent='oncall-client:'+client.id;
  const call=(name,args)=>tool(name,args,{},credential);
  const projected=async()=>{
   const answer=await call('oncall.services.read',{id});
   assert.equal(answer.status,200);assert.equal(answer.result.isError,false);
   const service=answer.result.structuredContent.data[0];assert.equal(service.id,id);
   assert.deepEqual(service.dependencies,['agent-service'],'The successful fixture retains its authorized dependency');
   return service;
  };
  const staleService=await projected();
  await command({type:'service',id,field:'name',from:staleService.name,to:'Synthetic current revision service'});
  const currentService=await projected();assert.notEqual(currentService.etag,staleService.etag);
  for(const name of ['oncall.incidents.declare','oncall.services.update']){
   const before=await snapshot(),paging=await read('/api/paging/state');
   const service=before.application.services.find(row=>row.id===id);
   const current=name==='oncall.incidents.declare'?before.application.revision:currentService.etag;
   const args=name==='oncall.incidents.declare'
    ? {service:id,revision:current-1,title:'Synthetic native revision declaration '+mode,summary:'Synthetic coordination without outbound work',severity:'warning',alerts:[],idempotency_key:randomUUID()}
    : {id,etag:staleService.etag,name:'Synthetic renamed service '+mode,environment:service.environment,owner:service.owner,runbook:service.runbook,pager:service.pager,idempotency_key:randomUUID()};
   assert.equal(Object.hasOwn(args,'expected_revision'),false);
   assert.ok(before.records.agent_door_calls.length>0,'Existing calls and outcomes are populated');
   assert.ok(before.records.agent_door_reviews.length>0,'Existing reviews are populated');
   const priorAudit=await audits(),stale=await call(name,args);
   assert.equal(stale.status,200);assert.equal(stale.body.error,undefined);assert.equal(stale.result.isError,true);
   const error={code:'revision_conflict',current_revision:current};
   assert.deepEqual(stale.result._meta['com.runeditrun/error'],error);
   assert.deepEqual(JSON.parse(stale.result.content[0].text),error);
   assert.equal(stale.result.structuredContent,undefined);
   assert.deepEqual(await snapshot(),before,'Native refusal preserves application records, revisions, timeline, state-changing audit, calls and outcomes, approvals, reviews and paging');
   assert.deepEqual(await read('/api/paging/state'),paging);
   const refused=await audits();assert.deepEqual(refused.slice(0,-1),priorAudit);assert.equal(refused.length,priorAudit.length+1);
   const refusal=JSON.parse(refused.at(-1).row);
   assert.equal(refusal.tool,name);assert.equal(refusal.code,'revision_conflict');assert.equal(refusal.outcome,'refused');
   assert.equal(refusal.agent.id,agent);assert.equal(refusal.idempotency_key,args.idempotency_key);
   assert.deepEqual(refusal.resource,{kind:'service',id});

   const returned=stale.result._meta['com.runeditrun/error'].current_revision;
   const freshArgs={...args,[name==='oncall.incidents.declare'?'revision':'etag']:returned,idempotency_key:randomUUID()};
   const fresh=await call(name,freshArgs);
   assert.equal(fresh.status,200);assert.equal(fresh.body.error,undefined);assert.equal(fresh.result.isError,false);
   assert.deepEqual(fresh.decision.classes.map(row=>row.class),['standard']);assert.equal(fresh.decision.disposition,disposition);
   const once=await snapshot(),result=fresh.result.structuredContent;
   assert.equal(once.application.revision,before.application.revision+1);
   assert.equal(once.records.oc_admin_audit.length,before.records.oc_admin_audit.length+1);
   assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals);
   for(const table of Object.keys(before.records).filter(name=>name.startsWith('paging_')))assert.deepEqual(once.records[table],before.records[table]);
   assert.deepEqual(await read('/api/paging/state'),{...paging,workspaceRevision:once.application.revision});
   if(name==='oncall.incidents.declare'){
    const incident=once.application.incidents.find(row=>row.id===result.id);
    assert.deepEqual(result,incident);assert.equal(incident.title,args.title);assert.equal(incident.service,id);assert.equal(incident.revision,1);
    assert.deepEqual(incident.runbook.map(step=>step.text),service.runbook);
    assert.equal(once.application.incidents.length,before.application.incidents.length+1);
    for(const prior of before.application.incidents)assert.deepEqual(once.application.incidents.find(row=>row.id===prior.id),prior);
    assert.equal(incident.timeline.length,1);assert.equal(incident.timeline[0].kind,'declared');
    assert.equal(incident.timeline[0].actor,client.id);assert.equal(incident.timeline[0].metadata.agent.agent.id,agent);
    assert.deepEqual(once.application.services,before.application.services);
   }else{
    assert.deepEqual(once.application.services,before.application.services.map(row=>row.id===id?{...row,name:args.name}:row),'Only the service name changes; every other service field is retained');
    assert.deepEqual(once.application.incidents,before.application.incidents);
    const {etag,...saved}=result;assert.notEqual(etag,returned);
    assert.deepEqual(saved,{...service,name:args.name});
    const entry=once.application.audit.at(-1);assert.equal(entry.actor,client.id);assert.equal(entry.metadata.agent.agent.id,agent);
   }
   const reviews=once.records.agent_door_reviews;
   assert.equal(reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
   for(const prior of before.records.agent_door_reviews)assert.deepEqual(reviews.find(row=>row.id===prior.id),prior);
   if(mode==='held'){
    const review=reviews.find(row=>row.id===fresh.result._meta['com.runeditrun/review'].id);
    assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,fresh.decision.id);
    assert.equal((await read('/agents/api/reviews')).reviews.find(row=>row.id===review.id).state,'open');
   }else assert.equal(fresh.result._meta['com.runeditrun/review'],undefined);
   const calls=await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',agent,freshArgs.idempotency_key);
   assert.equal(calls.length,1);assert.equal(calls[0].state,'done');assert.equal(calls[0].decision_id,fresh.decision.id);
   const stored=JSON.parse(calls[0].outcome);assert.equal(stored.outcome,'done');assert.deepEqual(stored.result,result);
   assert.deepEqual(stored.review,fresh.result._meta['com.runeditrun/review']);
   const original=await rows('SELECT * FROM agent_door_audit WHERE id=?',fresh.decision.id),beforeRetry=await audits();
   const replay=await call(name,freshArgs);
   assert.equal(replay.status,200);assert.equal(replay.result.isError,false);assert.notEqual(replay.body.id,fresh.body.id);
   assert.deepEqual(replay.result.structuredContent,stored.result);assert.deepEqual(replay.result._meta['com.runeditrun/review'],stored.review);
   assert.deepEqual(await snapshot(),once,'A new RPC id replays the stored outcome with one effect and one held review');
   assert.deepEqual(await rows('SELECT * FROM agent_door_audit WHERE id=?',fresh.decision.id),original);
   const retried=await audits();assert.deepEqual(retried.slice(0,-1),beforeRetry);assert.equal(retried.length,beforeRetry.length+1);
   const attempt=JSON.parse(retried.at(-1).row);assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,fresh.decision.id);
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' '+name+': stale native revision without expected_revision -> revision_conflict with exact authorized current_revision '+returned+' in metadata and text, no private result, custody unchanged; fresh key and returned revision -> one attributed '+(name==='oncall.incidents.declare'?'declaration with copied runbook':'name-only service edit preserving every other field')+', '+disposition+'; new RPC id retry -> stored outcome, no duplicate effect or review; zero outbound requests');

   const privateBefore=await snapshot();
   for(const target of ['agent-foreign-service','synthetic-oncall-'+randomUUID()]){
    const denied=await call(name,{...args,[name==='oncall.incidents.declare'?'service':'id']:target,idempotency_key:randomUUID()});
    assert.equal(denied.status,200);assert.equal(denied.result.isError,true);
    assert.deepEqual(denied.result._meta['com.runeditrun/error'],{code:'not_found'});
    assert.deepEqual(JSON.parse(denied.result.content[0].text),{code:'not_found'});
    assert.equal(denied.result.structuredContent,undefined);
    assert.deepEqual(await snapshot(),privateBefore,'Foreign and missing targets disclose no revision or private result and preserve custody');
   }
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' '+name+' non-disclosure: scoped-out and missing service -> not_found without revision or private result; custody unchanged; zero outbound requests');
  }
  // Separately distinguish the authorized ETag from one containing a private dependency.
  const beforeScope=await read('/api/state');
  await command({type:'service-dependencies',service:id,workspaceRevision:beforeScope.revision,dependencies:['agent-foreign-service']});
  const hiddenRead=await call('oncall.services.read',{id});assert.equal(hiddenRead.result.isError,false);
  const projection=hiddenRead.result.structuredContent.data[0];assert.deepEqual(projection.dependencies,[]);
  assert.notEqual(projection.etag,currentService.etag);
  const before=await snapshot(),paging=await read('/api/paging/state'),priorAudit=await audits();
  const nativeService=before.application.services.find(row=>row.id===id);
  assert.deepEqual(nativeService.dependencies,['agent-foreign-service']);
  const hidden=await call('oncall.services.update',{id,etag:currentService.etag,name:'Synthetic refused private dependency edit',
   environment:nativeService.environment,owner:nativeService.owner,runbook:nativeService.runbook,pager:nativeService.pager,idempotency_key:randomUUID()});
  assert.equal(hidden.status,200);assert.equal(hidden.result.isError,true);
  const error={code:'revision_conflict',current_revision:projection.etag};
  assert.deepEqual(hidden.result._meta['com.runeditrun/error'],error);
  assert.deepEqual(JSON.parse(hidden.result.content[0].text),error);assert.equal(hidden.result.structuredContent,undefined);
  assert.deepEqual(await snapshot(),before,'The scoped ETag refusal preserves the private dependency and all native custody');
  assert.deepEqual(await read('/api/paging/state'),paging);
  const refused=await audits();assert.deepEqual(refused.slice(0,-1),priorAudit);assert.equal(refused.length,priorAudit.length+1);
  assert.equal(JSON.parse(refused.at(-1).row).code,'revision_conflict');
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' oncall.services.update projected ETag: native service with hidden dependency and stale native etag, expected_revision omitted -> exact authorized projected current_revision '+projection.etag+' in metadata and text; no structured result; native custody and paging unchanged; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}
