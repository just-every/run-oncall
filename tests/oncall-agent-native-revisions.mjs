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

export async function staleNoteNativeRevision(runtime){
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
  const diagnostic='native required revision';
  const preparation=await http('/api/command',{type:'declare',service:'agent-service',title:'Synthetic '+diagnostic+' '+mode,
   summary:'Synthetic coordination without protected evidence',severity:'warning',alerts:[]});
  assert.equal(preparation.status,200);
  let incident=await preparation.json();
  const advance=await http('/api/command',{type:'note',incident:incident.id,revision:incident.revision,text:'Synthetic current coordination before the stale call'});
  assert.equal(advance.status,200);incident=await advance.json();
  const scopedKey='synthetic-oncall-'+randomUUID();
  const client=await http('/api/automation/clients',{name:'Synthetic foreign revision scope '+mode,key:scopedKey,services:['agent-foreign-service'],permissions:['services:read','incidents:write']});
  assert.equal(client.status,201);await client.json();
  const control=await tool('oncall.services.read',{id:'agent-foreign-service'},{},scopedKey);
  assert.equal(control.result.isError,false);assert.equal(control.result.structuredContent.data[0].id,'agent-foreign-service');
  const args={incident:incident.id,revision:incident.revision-1,
   text:'Synthetic note after revision reload '+mode,idempotency_key:randomUUID()};
  assert.equal(Object.hasOwn(args,'expected_revision'),false);
  const before=await snapshot(),priorAudit=await rows('SELECT * FROM agent_door_audit ORDER BY sequence');
  const priorNativeAudit=await rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
  const priorRelay=await rows('SELECT * FROM agent_door_relay ORDER BY sequence');
  const stale=await tool('oncall.notes.add',args);
  assert.equal(stale.status,200);assert.equal(stale.result.isError,true);
  const error=stale.result._meta['com.runeditrun/error'];
  assert.equal(error.code,'revision_conflict');assert.equal(error.current_revision,incident.revision);
  assert.deepEqual(JSON.parse(stale.result.content[0].text),{code:'revision_conflict',current_revision:incident.revision});
  assert.equal(stale.result.structuredContent,undefined);
  assert.deepEqual(await snapshot(),before,'Stale '+diagnostic+' preserves native records, revisions, timeline, state-changing audit, replay, approval, review and paging custody');
  const refusedAudit=await rows('SELECT * FROM agent_door_audit ORDER BY sequence');
  assert.deepEqual(refusedAudit.slice(0,priorAudit.length),priorAudit);
  assert.equal(refusedAudit.length,priorAudit.length+1);
  const refusal=JSON.parse(refusedAudit.at(-1).row);
  assert.equal(refusal.tool,'oncall.notes.add');assert.equal(refusal.code,'revision_conflict');assert.equal(refusal.outcome,'refused');
  assert.equal(refusal.idempotency_key,args.idempotency_key);assert.equal(refusal.agent.id,context.agentId);
  assert.deepEqual(refusal.resource,{kind:'incident',id:incident.id});
  assert.equal(refusal.approval,null);assert.equal(refusal.review,null);
  const nativeAudit=await rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
  assert.deepEqual(nativeAudit.slice(0,priorNativeAudit.length),priorNativeAudit,'Prior permanent audit is immutable');
  const bookkeeping=nativeAudit.slice(priorNativeAudit.length);
  assert.ok(bookkeeping.length>0,'Refusal custody retains its documented persistence audit');
  for(const row of bookkeeping){
   assert.equal(row.kind,'agent-door.persistence');
   for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after'],'Refusal audit commits no native mutation');
  }
  const relay=await rows('SELECT * FROM agent_door_relay ORDER BY sequence');
  assert.deepEqual(relay.slice(0,priorRelay.length),priorRelay);
  assert.deepEqual(relay.slice(priorRelay.length).map(row=>row.decision_id),[refusal.id],'Only the documented refusal audit is relayed');

  for(const [input,overrides,status,code,bearer] of [
   [args,{scope:'events:read'},403,'insufficient_scope'],
   [{...args,incident:'synthetic-oncall-missing'}, {},200,'not_found'],
   [args,{},200,'not_found',scopedKey],
   [{...args,incident:'synthetic-oncall-missing'}, {},200,'not_found',scopedKey],
  ]){
   const denied=await tool('oncall.notes.add',{...input,idempotency_key:randomUUID()},overrides,bearer);
   assert.equal(denied.status,status);
   const error=denied.result?._meta?.['com.runeditrun/error']??denied.body.error.data;
   assert.equal(error.code,code);assert.equal(error.current_revision,undefined);
   assert.equal(denied.result?.structuredContent,undefined);
   if(denied.result)assert.deepEqual(JSON.parse(denied.result.content[0].text),{code});
   assert.deepEqual(await snapshot(),before,'An unauthorized or missing target discloses no revision and changes no native effect or approval custody');
  }

  const freshArgs={...args,revision:error.current_revision,idempotency_key:randomUUID()};
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
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' '+diagnostic+': stale note with expected_revision omitted -> isError revision_conflict, exact current_revision '+error.current_revision+' in metadata and text; durable state and custody unchanged; fresh key using returned revision -> '+disposition+', one note and application commit; retry unchanged; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}

export async function staleCoordinationNativeRevision(runtime){
 const {db,http,tool,adopt,context}=runtime;
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const attempts=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
 const state=await (await http('/api/state')).json();
 const responder=state.members.find(row=>row.active&&row.role==='responder');assert.ok(responder);
 const scopedKey='synthetic-oncall-'+randomUUID();
 const client=await http('/api/automation/clients',{name:'Synthetic revision scope',key:scopedKey,
  services:['agent-foreign-service'],permissions:['incidents:write','actions:write']});
 assert.equal(client.status,201);await client.body?.cancel();
 const scopedProbe=await tool('oncall.incidents.acknowledge',{incident:'synthetic-oncall-missing-incident',revision:0,
  member:responder.id,summary:'Initialize the scoped refusal probe',idempotency_key:randomUUID()},{},scopedKey);
 assert.equal(scopedProbe.result._meta['com.runeditrun/error'].code,'not_found');
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  for(const name of ['oncall.incidents.acknowledge','oncall.actions.create']){
   let incident=await command({type:'declare',service:'agent-service',title:'Synthetic required revision '+name+' '+mode,
    summary:'Ordinary coordination without protected evidence',severity:'warning',alerts:[]});
   // A real person advances the parent, leaving a valid but stale native revision.
   incident=await command({type:'note',incident:incident.id,revision:incident.revision,text:'Synthetic revision advance'});
   const args={incident:incident.id,revision:incident.revision-1,idempotency_key:randomUUID(),
    ...(name==='oncall.incidents.acknowledge'?{member:responder.id,summary:'Synthetic acknowledgment for an active responder'}:
     {title:'Synthetic human-review follow-up',owner:responder.id,due:'2026-12-01',priority:'P1',completionPolicy:'human-review'})};
   assert.equal(Object.hasOwn(args,'expected_revision'),false);
   const before=await snapshot(),priorAudit=await attempts();
   assert.notEqual(before.application.revision,incident.revision,'Diagnostics must name the parent revision, not the workspace revision');
   const stale=await tool(name,args);
   assert.equal(stale.status,200);assert.equal(stale.body.error,undefined);assert.equal(stale.result.isError,true);
   assert.deepEqual(stale.decision.classes.map(row=>row.class),['standard']);
   const error=stale.result._meta['com.runeditrun/error'];
   assert.deepEqual(error,{code:'revision_conflict',current_revision:incident.revision});
   assert.deepEqual(JSON.parse(stale.result.content[0].text),error);
   assert.equal(stale.result.structuredContent,undefined);
   assert.deepEqual(await snapshot(),before,'Stale required revision preserves native records, revisions, timeline, permanent state-changing audit, original calls and outcomes, approvals, reviews and paging');
   const refusedAudit=await attempts();
   assert.deepEqual(refusedAudit.slice(0,-1),priorAudit);assert.equal(refusedAudit.length,priorAudit.length+1);
   const refusal=JSON.parse(refusedAudit.at(-1).row);
   assert.equal(refusal.tool,name);assert.equal(refusal.code,'revision_conflict');assert.equal(refusal.outcome,'refused');
   assert.equal(refusal.agent.id,context.agentId);assert.equal(refusal.idempotency_key,args.idempotency_key);
   assert.deepEqual(refusal.resource,{kind:'incident',id:incident.id});

   // A real service-scoped credential cannot learn an unauthorized parent's revision.
   for(const target of [incident.id,'synthetic-oncall-missing-incident']){
    const witness=await snapshot();
    const hidden=await tool(name,{...args,incident:target,idempotency_key:randomUUID()},{},scopedKey);
    assert.equal(hidden.status,200);assert.equal(hidden.result.isError,true);
    assert.deepEqual(hidden.result._meta['com.runeditrun/error'],{code:'not_found'});
    assert.deepEqual(JSON.parse(hidden.result.content[0].text),{code:'not_found'});
    assert.equal(hidden.result.structuredContent,undefined);
    assert.deepEqual(await snapshot(),witness,'Missing and unauthorized parents disclose no revision and change no retained effects');
   }
   const missing=await tool(name,{...args,incident:'synthetic-oncall-missing-incident',idempotency_key:randomUUID()});
   assert.equal(missing.result.isError,true);assert.deepEqual(missing.result._meta['com.runeditrun/error'],{code:'not_found'});
   assert.deepEqual(JSON.parse(missing.result.content[0].text),{code:'not_found'});assert.equal(missing.result.structuredContent,undefined);
   assert.deepEqual(await snapshot(),before);

   const freshArgs={...args,revision:error.current_revision,idempotency_key:randomUUID()};
   const fresh=await tool(name,freshArgs);
   assert.equal(fresh.status,200);assert.equal(fresh.body.error,undefined);assert.equal(fresh.result.isError,false);
   assert.deepEqual(fresh.decision.classes.map(row=>row.class),['standard']);assert.equal(fresh.decision.disposition,disposition);
   const once=await snapshot(),saved=once.application.incidents.find(row=>row.id===incident.id);
   assert.deepEqual(fresh.result.structuredContent,saved);assert.equal(saved.revision,incident.revision+1);
   assert.equal(once.application.revision,before.application.revision+1);
   assert.equal(saved.timeline.length,incident.timeline.length+1);assert.deepEqual(saved.timeline.slice(0,-1),incident.timeline);
   const entry=saved.timeline.at(-1);
   assert.equal(entry.actor,context.agentId);assert.equal(entry.metadata.agent.agent.id,context.agentId);
   assert.equal(entry.metadata.agent.for.id,state.members.find(row=>row.name==='Alex Chen').id);
   if(name==='oncall.incidents.acknowledge'){
    assert.equal(saved.state,'acknowledged');assert.equal(saved.commander,responder.id);assert.equal(saved.assignee,responder.id);
    assert.deepEqual(entry.lifecycle,{from:'declared',to:'acknowledged',member:responder.id});
    assert.ok(entry.text.includes(args.summary));assert.deepEqual(saved.actions,incident.actions);
   }else{
    assert.equal(saved.state,incident.state);assert.equal(saved.actions.length,1);
    const action=saved.actions[0];
    assert.equal(action.title,args.title);assert.equal(action.owner,responder.id);assert.equal(action.due,args.due);
    assert.equal(action.priority,'P1');assert.equal(action.completionPolicy,'human-review');assert.equal(action.done,false);
    assert.equal(action.evidence,'');assert.equal(action.submission,undefined);assert.equal(action.accepted,undefined);
   }
   assert.equal(once.records.oc_admin_audit.length,before.records.oc_admin_audit.length+1);
   assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals,'Standard-only recovery opens no approval');
   assert.equal(once.records.agent_door_reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
   for(const review of before.records.agent_door_reviews)assert.deepEqual(once.records.agent_door_reviews.find(row=>row.id===review.id),review);
   const review=fresh.result._meta['com.runeditrun/review'];
   if(mode==='held'){
    const row=once.records.agent_door_reviews.find(row=>row.id===review.id);assert.ok(row);assert.equal(row.state,'open');
    assert.equal(JSON.parse(row.saved).decision_id,fresh.decision.id);
   }else assert.equal(review,undefined);
   for(const table of Object.keys(before.records).filter(name=>name.startsWith('paging_')))assert.deepEqual(once.records[table],before.records[table]);
   const calls=once.records.agent_door_calls.filter(row=>row.agent===context.agentId&&row.key===freshArgs.idempotency_key);
   assert.equal(calls.length,1);assert.equal(calls[0].state,'done');assert.equal(calls[0].decision_id,fresh.decision.id);
   const stored=JSON.parse(calls[0].outcome);assert.deepEqual(stored.result,saved);assert.deepEqual(stored.review,review);
   const replay=await tool(name,freshArgs);
   assert.equal(replay.status,200);assert.notEqual(replay.body.id,fresh.body.id);assert.equal(replay.result.isError,false);
   assert.deepEqual(replay.result.structuredContent,stored.result);assert.deepEqual(replay.result._meta['com.runeditrun/review'],stored.review);
   assert.deepEqual(await snapshot(),once,'An identical new-RPC-id retry returns the stored outcome with no duplicate effect, revision, permanent audit, custody or review');
   const retried=JSON.parse((await attempts()).at(-1).row);assert.equal(retried.outcome,'replayed');assert.equal(retried.replay_of,fresh.decision.id);
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log(`PROBE BASE-AGENT-012 acceptance 4 ${mode} ${name}: stale required revision ${args.revision}, expected_revision omitted -> isError revision_conflict current_revision ${error.current_revision} in metadata and text; no retained effects; missing and unauthorized parents -> not_found without revision; fresh key -> one attributed ${name==='oncall.incidents.acknowledge'?'acknowledgment for active responder':'owned due-dated open P1 human-review follow-up'}, ${disposition}; identical new-RPC-id retry -> stored result without duplicate effect or review; zero outbound requests`);
  }
 }
 assert.equal((await adopt()).status,200);
}
