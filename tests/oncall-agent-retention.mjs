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
   const audit=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
   const envelope=async()=>JSON.parse((await rows('SELECT envelope FROM agent_door_state WHERE id=1'))[0].envelope);
   const authority=({iat,exp,...value})=>value;
   const token=()=>accessToken(context,{act:{sub:context.agentId,name:'Responder assistant',specialist:'oncall-responder'}});
   const claims=value=>JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString());
   const identity=({iat,exp,jti,...value})=>value;
   const bearer=await token(),originalClaims=claims(bearer),prepared=[];
   assert.equal(originalClaims.iat,started/1000);assert.equal(originalClaims.exp-originalClaims.iat,300);
   async function complete(name,args){
    const before=await snapshot(),first=await tool(name,args,{},bearer);
    assert.equal(first.status,200);assert.equal(first.body.error,undefined);assert.equal(first.result.isError,false);
    assert.deepEqual(first.decision.classes.map(row=>row.class),['standard']);
    assert.equal(first.decision.disposition,disposition);
    const after=await snapshot(),result=first.result.structuredContent;
    assert.equal(after.application.revision,before.application.revision+1);
    assert.equal(after.records.oc_admin_audit.length,before.records.oc_admin_audit.length+1);
    assert.deepEqual(after.application.incidents.find(row=>row.id===result.id),result);
    assert.equal(result.timeline.at(-1).metadata.agent.agent.id,context.agentId);
    if(name==='oncall.incidents.declare'){
     assert.equal(after.application.incidents.length,before.application.incidents.length+1);
     assert.equal(result.title,args.title);assert.equal(result.revision,1);
     assert.equal(result.timeline.filter(row=>row.kind==='declared').length,1);
    }else{
     const prior=before.application.incidents.find(row=>row.id===args.incident);
     assert.equal(after.application.incidents.length,before.application.incidents.length);
     assert.equal(result.revision,prior.revision+1);
     assert.deepEqual(result.timeline.slice(0,-1),prior.timeline);
     assert.equal(result.timeline.length,prior.timeline.length+1);assert.equal(result.timeline.at(-1).text,args.text);
    }
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
    const original=(await audit()).find(row=>row.id===call.decision_id);
    assert.equal(JSON.parse(original.row).outcome,'done');
    prepared.push({name,args:structuredClone(args),first,saved,calls,original});
    return result;
   }
   const incident=await complete('oncall.incidents.declare',{service:'agent-service',title:'Synthetic retained coordination '+mode,
    summary:'Native coordination without outbound action',severity:'warning',idempotency_key:randomUUID()});
   await complete('oncall.notes.add',{incident:incident.id,revision:incident.revision,text:'Synthetic retained internal note '+mode,idempotency_key:randomUUID()});
   const originalPolicy=await envelope(),effects=await snapshot(),ids=new Set(prepared.map(item=>item.first.body.id));
   for(const elapsed of [day,day+1000]){
    await runtime.time(started+elapsed);
    assert.ok(originalClaims.exp<seconds(context.now),'The initial short-lived bearer has expired');
    const previousPolicy=await envelope();
    assert.equal((await runtime.renewPolicy()).status,200);
    const renewed=await envelope();
    assert.deepEqual(authority(renewed),authority(originalPolicy),'Receiving-door renewal keeps document, sequence, revision and signed authority');
    assert.ok(renewed.iat>previousPolicy.iat);assert.equal(renewed.exp-renewed.iat,300);
    // Renewal intentionally updates signed custody; establish the replay
    // baseline afterwards so that only replay effects are compared.
    const before=await snapshot();
    assert.deepEqual(before.application,effects.application);
    for(const table of ['agent_door_calls','agent_door_reviews','agent_door_approvals'])assert.deepEqual(before.records[table],effects.records[table]);
    const fresh=await token(),freshClaims=claims(fresh);
    assert.notEqual(fresh,bearer);assert.notEqual(freshClaims.jti,originalClaims.jti);
    assert.deepEqual(identity(freshClaims),identity(originalClaims),'Fresh bearer preserves person, agent, client, consent and scopes');
    assert.equal(freshClaims.iat,(started+elapsed)/1000);assert.equal(freshClaims.exp-freshClaims.iat,300);
    for(const {name,args,first,saved,calls,original} of prepared){
     const auditBefore=await audit(),replay=await tool(name,args,{},fresh);
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
     assert.deepEqual(await runtime.outboundRequests(),[]);
     console.log('PROBE BASE-AGENT-012 acceptance 1 '+mode+' '+name+' T+'+elapsed+'ms: renewed same policy and fresh same-identity token; new RPC id -> original structured outcome; one original native effect and no duplicate held review; all replay-baseline records unchanged; linked attempt audit only; original expiry retained; zero outbound requests');
    }
   }
  }finally{await runtime.close()}
 }
}

