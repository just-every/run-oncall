import assert from 'node:assert/strict';
import {agentRuntime,agentEffectSnapshot} from './agent-door-runtime.mjs';
import {accessToken,seconds,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

const day=86_400_000;
const claims=token=>JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
const tokenIdentity=({iat,exp,jti,...identity})=>identity;
const policyContents=({iat,exp,...policy})=>policy;

async function retainedEvidenceCompletion(runtime,{mode,policy,completeEvidenceAction,approve,observe=async()=>{},started}){
 const {db,http,context,tool}=runtime;
 const rows=async sql=>(await db.prepare(sql).all()).results;
 const read=async path=>{
  const response=await http(path);
  assert.equal(response.status,200);
  return response.json();
 };
 const envelope=async()=>JSON.parse((await db.prepare('SELECT envelope FROM agent_door_state WHERE id=1').first()).envelope);
 const snapshot=()=>agentEffectSnapshot(runtime);
 const audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const relay=()=>rows('SELECT * FROM agent_door_relay ORDER BY sequence');
 const permanent=()=>rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const token=()=>accessToken(context,{act:{sub:context.agentId,name:'Responder assistant',specialist:'oncall-responder'}});

 const originalPaging=await read('/api/paging/state');
 assert.equal(originalPaging.paging,'OFF');
 const bearer=await token(),initial=claims(bearer),startedAt=new Date(started).toISOString();
 assert.equal(initial.iat,started/1000);
 assert.equal(initial.exp-initial.iat,300);
 const {name,args,first,call,saved,once,original,owner,handle,incident,action}=await completeEvidenceAction(
  runtime,{mode,policy,approve,bearer});
 assert.equal(call.created_at,started);
 assert.ok(call.expires_at>started+day+1000);
 assert.equal(incident.timeline.at(-1).at,startedAt);
 assert.equal(action.done,true);
 assert.deepEqual(action.submission,{by:context.agentId,at:startedAt,evidence:args.evidence});
 assert.deepEqual(action.accepted,{by:context.agentId,at:startedAt});
 const approvalPath=handle&&'/agents/api/approvals/'+handle.id;
 const approved=approvalPath&&(await read(approvalPath)).approval;
 if(approved){
  assert.equal(approved.state,'executed');
  assert.equal(approved.id,saved.receipt.approval_id);
  assert.equal(approved.decision_id,saved.receipt.decision_id);
  assert.deepEqual(approved.approvals,[{ref:'sponsor',person:owner.id,name:owner.name,at:startedAt}]);
  assert.ok(Date.parse(approved.expires_at)<started+day);
 }
 const originalPolicy=await envelope();
 const rpcIds=new Set([first.body.id]),tokenIds=new Set([initial.jti]);
 assert.deepEqual(await runtime.outboundRequests(),[]);

 for(const elapsed of [day,day+1000]){
  await runtime.time(started+elapsed);
  assert.ok(initial.exp<seconds(context.now));
  const beforeRenewal=await snapshot();
  const previousPolicy=await envelope();
  assert.equal((await runtime.renewPolicy()).status,200);
  const renewed=await envelope();
  assert.deepEqual(policyContents(renewed),policyContents(originalPolicy),'Only signed policy times change');
  assert.ok(renewed.iat>previousPolicy.iat);
  assert.equal(renewed.iat,(started+elapsed)/1000);
  assert.equal(renewed.exp-renewed.iat,300);
  const fresh=await token(),freshClaims=claims(fresh);
  assert.ok(!tokenIds.has(freshClaims.jti));
  tokenIds.add(freshClaims.jti);
  assert.deepEqual(tokenIdentity(freshClaims),tokenIdentity(initial),'Same person, agent, client, consent and scopes');
  assert.equal(freshClaims.iat,renewed.iat);
  assert.equal(freshClaims.exp-freshClaims.iat,300);

  const before=await snapshot();
  assert.deepEqual(before.application,once.application);
  for(const table of Object.keys(once.records).filter(table=>!['agent_door_state','agent_door_events'].includes(table)))
   assert.deepEqual(before.records[table],once.records[table],'Policy renewal preserves native records and outcome custody: '+table);
  const events=before.records.agent_door_events,priorEvents=beforeRenewal.records.agent_door_events;
  const previousEvents=new Set(priorEvents.map(row=>row.id));
  assert.deepEqual(events.filter(row=>previousEvents.has(row.id)),priorEvents);
  const added=events.filter(row=>!previousEvents.has(row.id));
  assert.equal(added.length,1);
  const event=JSON.parse(added[0].event);
  const priorAdoption=priorEvents.toSorted((a,b)=>a.sequence-b.sequence).map(row=>JSON.parse(row.event))
   .filter(row=>row.type==='policy.adopted').at(-1);
  assert.deepEqual(event,{...priorAdoption,id:event.id,at:new Date(started+elapsed).toISOString()});

  const auditBefore=await audits(),relayBefore=await relay(),permanentBefore=await permanent();
  const retry=await tool(name,args,{},fresh);
  assert.equal(retry.status,200);
  assert.equal(retry.body.error,undefined);
  assert.equal(retry.result.isError,false);
  assert.equal(typeof retry.body.id,'string');
  assert.ok(!rpcIds.has(retry.body.id),'Each retrieval uses a new JSON-RPC id');
  rpcIds.add(retry.body.id);
  assert.deepEqual(retry.result.structuredContent,saved.result);
  assert.deepEqual(JSON.parse(retry.result.content[0].text),saved.result);
  assert.deepEqual(retry.result._meta['com.runeditrun/receipt'],saved.receipt?{...saved.receipt,decision:saved.decision}:undefined);
  assert.deepEqual(retry.result._meta['com.runeditrun/review'],saved.review);
  assert.equal(retry.result._meta['com.runeditrun/approval'],undefined,'A retained completion has no pending approval');
  assert.deepEqual(retry.decision.classes,saved.decision.classes);

  const material=await read('/api/reviews/'+incident.id+'/material');
  assert.equal(material.incidentRevision,incident.revision);
  assert.deepEqual(material.followups,retry.result.structuredContent.actions,'Protected review material agrees with the replayed MCP result');
  assert.deepEqual(await read('/api/paging/state'),{...originalPaging,workspaceRevision:once.application.revision});
  if(approved)assert.deepEqual((await read(approvalPath)).approval,approved);
  if(elapsed===day+1000)await observe({mode,incident,action,handle,approved});
  assert.deepEqual(await snapshot(),before,'Aged retrieval and inspection preserve terminal call, expiry, native records, audit commits, approvals, reviews and paging');
  const auditAfter=await audits();
  assert.deepEqual(auditAfter.slice(0,-1),auditBefore);
  assert.equal(auditAfter.length,auditBefore.length+1);
  const attempt=JSON.parse(auditAfter.at(-1).row);
  assert.equal(attempt.id,retry.decision.id);
  assert.equal(attempt.tool,name);
  assert.equal(attempt.outcome,'replayed');
  assert.equal(attempt.replay_of,call.decision_id);
  assert.equal(attempt.operation_id,original.operation_id);
  assert.equal(attempt.idempotency_key,args.idempotency_key);
  assert.equal(attempt.agent.id,context.agentId);
  assert.equal(attempt.sponsor.id,owner.id);
  const relayAfter=await relay();
  assert.deepEqual(relayAfter.slice(0,relayBefore.length),relayBefore);
  assert.deepEqual(relayAfter.slice(relayBefore.length).map(row=>row.decision_id),[attempt.id]);
  const permanentAfter=await permanent();
  assert.deepEqual(permanentAfter.slice(0,permanentBefore.length),permanentBefore);
  for(const row of permanentAfter.slice(permanentBefore.length)){
   assert.equal(row.kind,'agent-door.persistence');
   assert.ok(['accepted','refused'].includes(row.outcome));
   for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after']);
  }
  assert.deepEqual(await runtime.outboundRequests(),[],'No outbound requests or evidence URL fetch');
  console.log('PROBE BASE-AGENT-012 acceptance 1 '+mode+' evidence-policy completion at T+'+elapsed+'ms: original key and arguments with fresh authority -> equal stored result and original receipt where present, unchanged completed action, approval, terminal call and expiry, native revisions, timeline, audit and paging. One linked replay attempt and zero outbound requests.');
 }
}

/** Retain completed evidence-policy results for a full day under each policy. */
export async function agedActionEvidenceRetention({completeEvidenceAction,connect=async()=>({})}){
 // Freeze a current whole hour so native SQLite sessions remain usable while
 // the platform clock advances through both retention boundaries.
 const started=Math.floor(Date.now()/3_600_000)*3_600_000;
 for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  const runtime=await agentRuntime({clock:started});
  let hooks;
  try{
   hooks=await connect(runtime,mode);
   await retainedEvidenceCompletion(runtime,{...hooks,mode,policy,completeEvidenceAction,started});
  }finally{
   try{await hooks?.close?.()}finally{await runtime.close()}
  }
 }
}
