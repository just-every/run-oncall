import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

export async function staleDeclarationExpectedRevision(runtime){
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
  for(const name of ['oncall.incidents.declare']){
   const declaration=name==='oncall.incidents.declare';
   const preparation=await http('/api/command',{type:'declare',service:'agent-service',title:'Synthetic expected revision '+mode,
    summary:'Synthetic coordination without protected evidence',severity:'warning',alerts:[]});
   assert.equal(preparation.status,200);
   const incident=await preparation.json();
   const workspace=await read('/api/state'),service=workspace.services.find(row=>row.id==='agent-service');
   const current=declaration?workspace.revision:incident.revision;
   assert.ok(service.runbook.length>0,'The declaration must copy a populated native runbook');
   assert.notEqual(workspace.revision,incident.revision,'Workspace and incident revisions must be distinct');
   const args={...(declaration?{service:service.id,title:'Synthetic declaration after revision reload '+mode,
    summary:'Synthetic internal coordination',severity:'warning'}:{incident:incident.id,revision:incident.revision,text:'Synthetic note after revision reload '+mode}),
    expected_revision:current-1,idempotency_key:randomUUID()};
   if(declaration)assert.equal(Object.hasOwn(args,'revision'),false,'Omit the native declaration revision');
   const effects=()=>agentEffectSnapshot(runtime);
   const beforeEffects=await effects();
   const before=await snapshot(),priorAudit=await rows('SELECT * FROM agent_door_audit ORDER BY sequence');
   const stale=await tool(name,args);
   assert.equal(stale.status,200);assert.equal(stale.result.isError,true);
   const error=stale.result._meta['com.runeditrun/error'];
   assert.equal(error.code,'revision_conflict');assert.equal(error.current_revision,current);
   assert.deepEqual(JSON.parse(stale.result.content[0].text),{code:'revision_conflict',current_revision:current});
   assert.equal(stale.result.structuredContent,undefined);
   assert.deepEqual(await snapshot(),before,'Stale optional revision preserves native records, revisions, timeline, state-changing audit, replay, approval, review and paging custody');
   assert.deepEqual(await effects(),beforeEffects,'Optional revision refusal preserves original calls and outcomes, approvals and reviews');
   const refusedAudit=await rows('SELECT * FROM agent_door_audit ORDER BY sequence');
   assert.deepEqual(refusedAudit.slice(0,priorAudit.length),priorAudit);
   assert.equal(refusedAudit.length,priorAudit.length+1);
   const refusal=JSON.parse(refusedAudit.at(-1).row);
   assert.equal(refusal.tool,name);assert.equal(refusal.code,'revision_conflict');assert.equal(refusal.outcome,'refused');
   assert.equal(refusal.idempotency_key,args.idempotency_key);assert.equal(refusal.agent.id,context.agentId);
   assert.deepEqual(refusal.resource,declaration?{kind:'service',id:service.id}:{kind:'incident',id:incident.id});

   const freshArgs={...args,expected_revision:error.current_revision,idempotency_key:randomUUID()};
   const fresh=await tool(name,freshArgs);
   assert.equal(fresh.status,200);assert.equal(fresh.result.isError,false);assert.equal(fresh.decision.disposition,disposition);
   assert.deepEqual(fresh.decision.classes.map(row=>row.class),['standard']);
   const once=await snapshot(),saved=once.application.incidents.find(row=>row.id===fresh.result.structuredContent.id);
   if(declaration){
    assert.equal(once.application.incidents.length,before.application.incidents.length+1);
    assert.equal(saved.title,args.title);assert.equal(saved.timeline.find(row=>row.kind==='declared').text,args.summary);assert.equal(saved.service,service.id);
    assert.deepEqual(saved.runbook,service.runbook.map(text=>({text,done:false})));assert.equal(saved.revision,1);
    assert.equal(saved.timeline.filter(row=>row.kind==='declared').length,1);
   }else{
    assert.equal(fresh.result.structuredContent.id,incident.id);
    assert.equal(saved.revision,incident.revision+1);
    assert.equal(saved.timeline.length,incident.timeline.length+1);
    assert.deepEqual(saved.timeline.slice(0,-1),incident.timeline);
    assert.equal(saved.timeline.at(-1).text,args.text);
   }
   assert.deepEqual(fresh.result.structuredContent,saved);
   assert.equal(once.application.revision,before.application.revision+1);
   const entry=saved.timeline.at(-1);
   assert.equal(entry.metadata.agent.agent.id,context.agentId);
   assert.equal(entry.metadata.agent.for.id,before.application.members.find(row=>row.name==='Alex Chen').id);
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
   const calls=await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,freshArgs.idempotency_key);
   assert.equal(calls.length,1);assert.equal(calls[0].state,'done');
   const stored=JSON.parse(calls[0].outcome);
   assert.deepEqual(stored.result,saved);assert.equal(stored.decision.id,fresh.decision.id);
   const onceEffects=await effects();
   const replay=await tool(name,freshArgs);
   assert.notEqual(replay.body.id,fresh.body.id);assert.equal(replay.result.isError,false);
   assert.deepEqual(replay.result.structuredContent,fresh.result.structuredContent);
   assert.deepEqual(replay.result._meta['com.runeditrun/review'],fresh.result._meta['com.runeditrun/review']);
   assert.deepEqual(await snapshot(),once,'Fresh-key replay adds no duplicate incident or note, revision, native audit commit, review or custody');
   assert.deepEqual(await effects(),onceEffects,'Replay preserves the original completed call and stored outcome with no additional effect or review');
   if(declaration){
    // The revision diagnostic is available only after native target authority.
    assert.ok(workspace.services.some(row=>row.id==='agent-foreign-service'));
    const key=randomBytes(32).toString('hex');
    const client=await http('/api/automation/clients',{name:'Synthetic revision scope '+mode,key,
     services:[service.id],permissions:['services:read','incidents:write']});
    assert.equal(client.status,201);await client.body?.cancel();
    const admitted=await tool('oncall.services.read',{id:service.id},{},key);
    assert.equal(admitted.result.isError,false);
    for(const [target,bearer] of [['synthetic-oncall-missing',undefined],['synthetic-oncall-missing',key],['agent-foreign-service',key]]){
     const before=await effects();
     const hidden=await tool(name,{...args,service:target,idempotency_key:randomUUID()},{},bearer);
     assert.equal(hidden.status,200);assert.equal(hidden.result.isError,true);
     assert.deepEqual(hidden.result._meta['com.runeditrun/error'],{code:'not_found'});
     assert.deepEqual(JSON.parse(hidden.result.content[0].text),{code:'not_found'});
     assert.equal(hidden.result.structuredContent,undefined);
     assert.deepEqual(await effects(),before,'Missing or out-of-scope targets reveal no revision and create no native or replay effect');
    }
   }
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' '+name+': stale expected_revision at '+(declaration?'workspace':'incident')+' revision '+current+' -> isError revision_conflict, exact current_revision in metadata and text; durable state and custody unchanged; fresh key using returned revision -> '+disposition+', one attributed '+(declaration?'incident with copied runbook':'note')+' and application commit; new RPC id retry unchanged; zero outbound requests');
  }
 }
 assert.equal((await adopt()).status,200);
}
