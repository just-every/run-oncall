import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentRuntime,agentEffectSnapshot} from './agent-door-runtime.mjs';
import {accessToken,seconds,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Aged native MCP outcomes survive short-lived credential and policy renewal. */
export async function agedReplayRetention(){
 // Keep bootstrap sessions current for D1's wall-clock expiry checks while
 // retaining whole-second claims and advancing the platform clock to age calls.
 const started=Math.floor(Date.now()/3600000)*3600000,day=24*60*60*1000;
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  // Each policy has an isolated emitted Worker and actual D1 custody. Advancing
  // this platform clock ages real calls, rather than inserting synthetic rows.
  const runtime=await agentRuntime({clock:started});
  try{
   const {db,http,tool,context}=runtime;
   assert.equal((await runtime.adopt(policy)).status,200);
   const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
   const snapshot=()=>agentEffectSnapshot(runtime);
   const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
   const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
   const owner=(await read('/api/workspace')).member;
   const responder=(await read('/api/state')).members.find(row=>row.active&&row.role==='responder');
   assert.ok(responder);assert.notEqual(responder.id,owner.id);
   const ordinary=title=>command({type:'declare',service:'agent-service',title:'Synthetic retained '+title+' '+mode,
    summary:'Ordinary coordination without protected evidence',severity:'warning',alerts:[]});
   const audit=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
   const envelope=async()=>JSON.parse((await rows('SELECT envelope FROM agent_door_state WHERE id=1'))[0].envelope);
   const authority=({iat,exp,...value})=>value;
   const token=()=>accessToken(context,{act:{sub:context.agentId,name:'Responder assistant',specialist:'oncall-responder'}});
   const claims=value=>JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString());
   const identity=({iat,exp,jti,...value})=>value;
   const bearer=await token(),originalClaims=claims(bearer),prepared=[],tokenIds=new Set([originalClaims.jti]);
   assert.equal(originalClaims.iat,started/1000);assert.equal(originalClaims.exp-originalClaims.iat,300);
   async function complete(name,args,label=name){
    const before=await snapshot(),first=await tool(name,args,{},bearer);
    assert.equal(first.status,200);assert.equal(first.body.error,undefined);assert.equal(first.result.isError,false);
    assert.deepEqual(first.decision.classes.map(row=>row.class),['standard']);
    assert.equal(first.decision.disposition,disposition);
    const after=await snapshot(),result=first.result.structuredContent;
    assert.equal(after.application.revision,before.application.revision+1);
    assert.equal(after.records.oc_admin_audit.length,before.records.oc_admin_audit.length+1);
    assert.equal(after.records.workspace_control[0].revision,before.records.workspace_control[0].revision+1);
    const serviceEdit=name==='oncall.services.update';
    let entry;
    if(serviceEdit){
     const prior=before.application.services.find(row=>row.id===args.id),native=after.application.services.find(row=>row.id===args.id);
     assert.deepEqual(native,{...prior,name:args.name},'Only the authorized service name changes');
     assert.deepEqual(result,{...native,dependencies:args.dependencies??[],etag:result.etag});
     assert.match(result.etag,/^[a-f0-9]{64}$/);assert.notEqual(result.etag,args.etag);
     assert.deepEqual(after.application.services.filter(row=>row.id!==args.id),before.application.services.filter(row=>row.id!==args.id));
     assert.deepEqual(after.application.incidents,before.application.incidents);
     assert.equal(after.application.audit.length,before.application.audit.length+1);
     entry=after.application.audit.at(-1);
     assert.equal(entry.kind,'service');assert.ok(entry.text.includes(args.name));
    }else{
     assert.deepEqual(after.application.incidents.find(row=>row.id===result.id),result);
     assert.deepEqual(JSON.parse(after.records.oc_incidents.find(row=>row.id===result.id).data),result);
     entry=result.timeline.at(-1);
     assert.equal(entry.metadata.agent.agent.id,context.agentId);
     assert.equal(entry.metadata.agent.for.id,owner.id);
     if(name==='oncall.incidents.declare'){
      assert.equal(after.application.incidents.length,before.application.incidents.length+1);
      assert.equal(result.title,args.title);assert.equal(result.revision,1);
      assert.equal(result.timeline.filter(row=>row.kind==='declared').length,1);
     }else{
      const prior=before.application.incidents.find(row=>row.id===args.incident);
      assert.equal(after.application.incidents.length,before.application.incidents.length);
      assert.deepEqual(after.application.incidents.filter(row=>row.id!==args.incident),before.application.incidents.filter(row=>row.id!==args.incident));
      assert.equal(result.revision,prior.revision+1);
      assert.deepEqual(result.timeline.slice(0,-1),prior.timeline);
      assert.equal(result.timeline.length,prior.timeline.length+1);
      const changed={revision:prior.revision+1,timeline:result.timeline};
      if(name==='oncall.notes.add'){
       assert.equal(entry.kind,'note');assert.equal(entry.text,args.text);
      }else if(name==='oncall.incidents.acknowledge'){
       assert.equal(prior.state,'declared');assert.equal(result.state,'acknowledged');
       assert.equal(result.commander,responder.id);assert.equal(result.assignee,responder.id);
       Object.assign(changed,{state:'acknowledged',commander:responder.id,assignee:responder.id});
       assert.equal(entry.kind,'transition');
       assert.deepEqual(entry.lifecycle,{from:'declared',to:'acknowledged',member:responder.id});
       assert.equal(entry.text,'declared → acknowledged: '+args.summary);
      }else if(name==='oncall.actions.create'){
       assert.equal(result.actions.length,prior.actions.length+1);
       assert.deepEqual(result.actions.slice(0,-1),prior.actions);
       const action=result.actions.at(-1);assert.ok(action.id);
       assert.equal(action.title,args.title);assert.equal(action.owner,owner.id);assert.equal(action.due,args.due);
       assert.equal(action.priority,'P1');assert.equal(action.completionPolicy,'human-review');
       assert.equal(action.done,false);assert.equal(action.evidence,'');
       changed.actions=result.actions;
       assert.equal(entry.kind,'action');assert.ok(entry.text.includes(action.title));assert.ok(entry.text.includes(action.due));
      }else if(args.change==='transition'){
       assert.equal(args.state,'mitigating');assert.equal(prior.state,'acknowledged');
       assert.equal(prior.recovery,'');assert.deepEqual(prior.alerts,[]);assert.deepEqual(prior.actions,[]);
       changed.state='mitigating';
       assert.equal(entry.kind,'transition');
       assert.deepEqual(entry.lifecycle,{from:'acknowledged',to:'mitigating'});
       assert.equal(entry.text,'acknowledged → mitigating: '+args.summary);
      }else if(args.change==='reassign'){
       assert.equal(prior.assignee,owner.id);assert.equal(result.assignee,responder.id);
       changed.assignee=responder.id;
       assert.equal(entry.kind,'reassign');
       assert.equal(entry.text,'assignee: '+owner.name+' → '+responder.name+': '+args.reason);
       assert.equal(result.timeline.filter(row=>row.kind==='reassign').length,prior.timeline.filter(row=>row.kind==='reassign').length+1);
      }else{
       assert.equal(args.change,'assign-role');assert.equal(prior[args.role]??null,null);
       assert.equal(result[args.role],responder.id);changed[args.role]=responder.id;
       assert.equal(entry.kind,'assign-role');
       assert.equal(entry.text,args.role+': Unassigned → '+responder.name+': '+args.reason);
       assert.equal(result.timeline.filter(row=>row.kind==='assign-role').length,prior.timeline.filter(row=>row.kind==='assign-role').length+1);
      }
      assert.deepEqual(result,{...prior,...changed},'Selected fields change once; every companion field survives');
     }
    }
    assert.equal(entry.actor,context.agentId);assert.notEqual(entry.actor,responder.id);
    const commits=after.records.oc_admin_audit.filter(row=>!before.records.oc_admin_audit.some(prior=>prior.id===row.id));
    assert.equal(commits.length,1);
    const commit=commits[0];assert.equal(commit.outcome,'accepted');
    assert.equal(commit.workspace_before,before.application.revision);assert.equal(commit.workspace_after,after.application.revision);
    assert.equal(commit.paging_before,commit.paging_after);assert.equal(commit.handoff_before,commit.handoff_after);
    for(const [field,kind,id] of [['actor','agent',context.agentId],['subject','entity',serviceEdit?args.id:result.id],['source','member',owner.id]]){
     const identity=await db.prepare('SELECT label FROM oc_audit_identities WHERE kind=? AND entity_id=?').bind(kind,id).first();
     assert.ok(identity);assert.equal(commit[field],identity.label,'The native commit retains its '+field+' attribution');
    }
    for(const prior of before.records.oc_admin_audit)assert.deepEqual(after.records.oc_admin_audit.find(row=>row.id===prior.id),prior);
    for(const table of Object.keys(before.records).filter(table=>table.startsWith('paging_')))assert.deepEqual(after.records[table],before.records[table]);
    assert.equal(after.records.agent_door_reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
    assert.deepEqual(after.records.agent_door_approvals,before.records.agent_door_approvals);
    const calls=await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key);
    assert.equal(calls.length,1);
    const [call]=calls,saved=JSON.parse(call.outcome);
    assert.equal(call.created_at,started);assert.ok(call.expires_at>started+day);
    assert.equal(call.state,'done');assert.equal(call.decision_id,first.decision.id);
    assert.equal(saved.outcome,'done');assert.deepEqual(saved.result,result);
    assert.deepEqual(saved.review,first.result._meta['com.runeditrun/review']);
    if(mode==='held'){
     const review=after.records.agent_door_reviews.find(row=>row.id===saved.review.id);
     assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,call.decision_id);
    }else assert.equal(saved.review,undefined);
    for(const prior of before.records.agent_door_reviews)assert.deepEqual(after.records.agent_door_reviews.find(row=>row.id===prior.id),prior);
    for(const prior of before.records.agent_door_calls)assert.deepEqual(after.records.agent_door_calls.find(row=>row.agent===prior.agent&&row.key===prior.key),prior);
    assert.equal(after.records.agent_door_calls.length,before.records.agent_door_calls.length+1);
    const original=(await audit()).find(row=>row.id===call.decision_id),originalRow=JSON.parse(original.row);
    assert.equal(originalRow.outcome,'done');assert.equal(originalRow.replay_of,null);
    assert.equal(originalRow.tool,name);assert.equal(originalRow.idempotency_key,args.idempotency_key);
    assert.equal(originalRow.agent.id,context.agentId);assert.equal(originalRow.sponsor.id,owner.id);
    assert.deepEqual(await runtime.outboundRequests(),[]);
    prepared.push({name,label,args:structuredClone(args),first,saved,calls,original});
    return result;
   }
   const incident=await complete('oncall.incidents.declare',{service:'agent-service',title:'Synthetic retained coordination '+mode,
    summary:'Native coordination without outbound action',severity:'warning',idempotency_key:randomUUID()});
   await complete('oncall.notes.add',{incident:incident.id,revision:incident.revision,text:'Synthetic retained internal note '+mode,idempotency_key:randomUUID()});
   const acknowledge=await ordinary('acknowledgment');
   await complete('oncall.incidents.acknowledge',{incident:acknowledge.id,revision:acknowledge.revision,member:responder.id,
    summary:'Synthetic retained responder acknowledgment',idempotency_key:randomUUID()});
   const followUp=await ordinary('follow-up');
   await complete('oncall.actions.create',{incident:followUp.id,revision:followUp.revision,title:'Synthetic retained open follow-up',
    owner:owner.id,due:'2026-12-01',priority:'P1',completionPolicy:'human-review',idempotency_key:randomUUID()});
   const found=await tool('oncall.services.read',{id:'agent-service'},{},bearer);
   assert.equal(found.status,200);assert.equal(found.result.isError,false);
   const service=found.result.structuredContent.data[0];
   assert.match(service.etag,/^[a-f0-9]{64}$/);
   const originalService=(await read('/api/state')).services.find(row=>row.id===service.id);
   await complete('oncall.services.update',{id:service.id,etag:service.etag,name:'Synthetic retained service name '+mode,
    environment:service.environment,owner:service.owner,runbook:service.runbook,pager:service.pager,
    ...(originalService.dependencies===undefined?{}:{dependencies:service.dependencies}),idempotency_key:randomUUID()});
   let reassign=await ordinary('reassignment');
   reassign=await command({type:'transition',incident:reassign.id,revision:reassign.revision,state:'acknowledged',summary:'Synthetic initial human responsibility'});
   await complete('oncall.incidents.update',{change:'reassign',incident:reassign.id,revision:reassign.revision,member:responder.id,
    reason:'Synthetic retained reassignment reason',idempotency_key:randomUUID()},'reassign');
   for(const role of ['scribe','communications','commander']){
    let target=await ordinary(role+' assignment');
    // Populate companion roles and an explicit assignee before Commander changes.
    if(role==='commander')for(const input of [{type:'reassign',member:owner.id},{type:'assign-role',role:'scribe',member:owner.id},{type:'assign-role',role:'communications',member:responder.id}])
     target=await command({...input,incident:target.id,revision:target.revision,reason:'Synthetic retained companion responsibility'});
    await complete('oncall.incidents.update',{change:'assign-role',role,incident:target.id,revision:target.revision,member:responder.id,
     reason:'Synthetic retained '+role+' reason',idempotency_key:randomUUID()},'assign-role '+role);
   }
   let mitigation=await ordinary('mitigation');
   mitigation=await command({type:'transition',incident:mitigation.id,revision:mitigation.revision,state:'acknowledged',summary:'Synthetic initial human acknowledgment'});
   for(const [role,member] of [['scribe',responder.id],['communications',owner.id]])
    mitigation=await command({type:'assign-role',incident:mitigation.id,revision:mitigation.revision,role,member,reason:'Synthetic retained companion responsibility'});
   await complete('oncall.incidents.update',{change:'transition',state:'mitigating',incident:mitigation.id,revision:mitigation.revision,
    summary:'Synthetic retained evidence-free mitigation',idempotency_key:randomUUID()},'transition mitigating');
   // The focused transition journey covers immediate replay and response loss;
   // this helper ages the same real call alongside the existing nine cases.
   const originalPolicy=await envelope(),effects=await snapshot(),ids=new Set(prepared.map(item=>item.first.body.id));
   for(const elapsed of [day,day+1000]){
    await runtime.time(started+elapsed);
    assert.ok(originalClaims.exp<seconds(context.now),'The initial short-lived bearer has expired');
    const previousPolicy=await envelope(),beforeRenewal=await snapshot();
    assert.equal((await runtime.renewPolicy()).status,200);
    const renewed=await envelope();
    assert.deepEqual(authority(renewed),authority(originalPolicy),'Receiving-door renewal keeps document, sequence, revision and signed authority');
    assert.ok(renewed.iat>previousPolicy.iat);assert.equal(renewed.exp-renewed.iat,300);
    // Renewal intentionally updates signed custody; establish the replay
    // baseline afterwards so that only replay effects are compared.
    const before=await snapshot();
    assert.deepEqual(before.application,effects.application);
    for(const table of Object.keys(effects.records).filter(table=>!['agent_door_state','agent_door_events'].includes(table)))
     assert.deepEqual(before.records[table],effects.records[table],'Policy renewal preserves retained native and call custody: '+table);
    const previousEvents=beforeRenewal.records.agent_door_events,renewedEvents=before.records.agent_door_events;
    for(const event of previousEvents)assert.deepEqual(renewedEvents.find(row=>row.id===event.id),event);
    const addedEvents=renewedEvents.filter(row=>!previousEvents.some(prior=>prior.id===row.id));
    assert.equal(addedEvents.length,1,'Renewal appends only its own policy event before the replay baseline');
    const event=JSON.parse(addedEvents[0].event),priorEvent=JSON.parse(previousEvents
     .filter(row=>JSON.parse(row.event).type==='policy.adopted').sort((a,b)=>a.sequence-b.sequence).at(-1).event);
    assert.equal(event.type,'policy.adopted');assert.notEqual(event.id,priorEvent.id);
    assert.equal(event.at,new Date(started+elapsed).toISOString());
    assert.deepEqual(event,{...priorEvent,id:event.id,at:event.at},'The renewal event retains the same signed policy authority');
    for(const {name,label,args,first,saved,calls,original} of prepared){
     const fresh=await token(),freshClaims=claims(fresh);
     assert.notEqual(fresh,bearer);assert.ok(!tokenIds.has(freshClaims.jti));tokenIds.add(freshClaims.jti);
     assert.deepEqual(identity(freshClaims),identity(originalClaims),'Fresh bearer preserves person, agent, client, consent and scopes');
     assert.equal(freshClaims.iat,(started+elapsed)/1000);assert.equal(freshClaims.exp-freshClaims.iat,300);
     const auditBefore=await audit(),permanentBefore=await rows('SELECT * FROM oc_admin_audit ORDER BY ordinal'),
      relayBefore=await rows('SELECT * FROM agent_door_relay ORDER BY sequence'),replay=await tool(name,args,{},fresh);
     assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.equal(replay.result.isError,false);
     assert.ok(!ids.has(replay.body.id),'Each aged retry has a new JSON-RPC id');ids.add(replay.body.id);
     assert.deepEqual(replay.result.structuredContent,saved.result,'Return the original native structured outcome even after a later note');
     assert.deepEqual(replay.result._meta['com.runeditrun/review'],saved.review);
     assert.deepEqual(await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key),calls,'Original call, outcome and expiry custody do not slide on replay');
     assert.deepEqual(await snapshot(),before,'Aged replay preserves application records, revisions, timeline, state-changing audit, approvals, original reviews and paging');
     const auditAfter=await audit();
     assert.deepEqual(auditAfter.slice(0,-1),auditBefore);assert.equal(auditAfter.length,auditBefore.length+1);
     assert.deepEqual(auditAfter.find(row=>row.id===original.id),original);
     const attempt=JSON.parse(auditAfter.at(-1).row),initial=JSON.parse(original.row);
     assert.equal(attempt.id,replay.decision.id);assert.notEqual(attempt.id,first.decision.id);
     assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,first.decision.id);
     assert.equal(attempt.operation_id,initial.operation_id);assert.equal(attempt.idempotency_key,args.idempotency_key);
     assert.equal(attempt.tool,name);assert.equal(attempt.agent.id,context.agentId);assert.equal(attempt.sponsor.id,owner.id);
     const relayAfter=await rows('SELECT * FROM agent_door_relay ORDER BY sequence');
     assert.deepEqual(relayAfter.slice(0,relayBefore.length),relayBefore);
     assert.deepEqual(relayAfter.slice(relayBefore.length).map(row=>row.decision_id),[attempt.id]);
     const permanentAfter=await rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
     assert.deepEqual(permanentAfter.slice(0,permanentBefore.length),permanentBefore);
     for(const record of permanentAfter.slice(permanentBefore.length)){
      assert.equal(record.kind,'agent-door.persistence');assert.ok(['accepted','refused'].includes(record.outcome));
      for(const family of ['workspace','paging','handoff'])assert.equal(record[family+'_before'],record[family+'_after'],'Replay audit commits no native effect');
     }
     assert.deepEqual(await runtime.outboundRequests(),[]);
     console.log('PROBE BASE-AGENT-012 acceptance 1 '+mode+' '+label+' T+'+elapsed+'ms: renewed same policy and fresh same-identity token; new RPC id -> original structured outcome; one original native effect and no duplicate held review; all replay-baseline records unchanged; linked attempt audit only; original expiry retained; zero outbound requests');
    }
   }
  }finally{await runtime.close()}
 }
}

