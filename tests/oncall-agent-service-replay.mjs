import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

async function assertServiceCommit({db,context},before,after,serviceId,ownerId){
 const commits=after.records.oc_admin_audit.filter(row=>!before.records.oc_admin_audit.some(prior=>prior.id===row.id));
 assert.equal(commits.length,1,'Exactly one native state-changing audit commit');
 const commit=commits[0];assert.equal(commit.kind,'service.update');assert.equal(commit.outcome,'accepted');
 assert.equal(commit.workspace_before,before.application.revision);assert.equal(commit.workspace_after,after.application.revision);
 for(const [field,kind,id] of [['actor','agent',context.agentId],['subject','entity',serviceId],['source','member',ownerId]]){
  const identity=await db.prepare('SELECT label FROM oc_audit_identities WHERE kind=? AND entity_id=?').bind(kind,id).first();
  assert.equal(commit[field],identity.label,'The service commit retains its native '+field+' attribution');
 }
}

/** A completed service edit keeps its outcome when its old ETag is retried. */
export async function changedServiceNameReplay(runtime){
 const {db,http,tool,adopt,context}=runtime;
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const snapshot=()=>agentEffectSnapshot(runtime);
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const audit=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const name='oncall.services.update',owner=(await read('/api/workspace')).member;
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const found=await tool('oncall.services.read',{id:'agent-service'});
  assert.equal(found.status,200);assert.equal(found.result.isError,false);
  const service=found.result.structuredContent.data[0];
  assert.equal(service.id,'agent-service');assert.match(service.etag,/^[a-f0-9]{64}$/);
  const before=await snapshot(),pagingBefore=await read('/api/paging/state');
  const originalService=before.application.services.find(row=>row.id===service.id);
  const args={id:service.id,etag:service.etag,name:'Synthetic service replay '+mode,
   environment:service.environment,owner:service.owner,runbook:service.runbook,pager:service.pager,
   ...(originalService.dependencies===undefined?{}:{dependencies:service.dependencies}),idempotency_key:randomUUID()};
  assert.notEqual(args.name,originalService.name);
  const first=await tool(name,args);
  assert.equal(first.status,200);assert.equal(first.body.error,undefined);assert.equal(first.result.isError,false);
  assert.deepEqual(first.decision.classes.map(row=>row.class),['standard']);
  assert.equal(first.decision.disposition,disposition);
  const once=await snapshot(),pagingOnce=await read('/api/paging/state'),result=first.result.structuredContent;
  assert.equal(once.application.revision,before.application.revision+1,'One service edit advances the workspace once');
  const savedService=once.application.services.find(row=>row.id===service.id);
  assert.deepEqual(savedService,{...originalService,name:args.name},'Only the authorized service name changes');
  assert.deepEqual(once.application.services.filter(row=>row.id!==service.id),before.application.services.filter(row=>row.id!==service.id));
  assert.deepEqual(result,{...savedService,dependencies:service.dependencies,etag:result.etag});
  assert.match(result.etag,/^[a-f0-9]{64}$/);assert.notEqual(result.etag,args.etag,'Keep the original projected ETag after the write changes it');
  assert.deepEqual(once.application.incidents,before.application.incidents,'Service edits preserve incident records and timelines');
  assert.deepEqual(pagingOnce,{...pagingBefore,workspaceRevision:once.application.revision});
  await assertServiceCommit(runtime,before,once,service.id,owner.id);
  const entry=once.application.audit.at(-1);
  assert.equal(once.application.audit.length,before.application.audit.length+1);
  assert.equal(entry.actor,context.agentId);assert.equal(entry.kind,'service');
  assert.ok(entry.text.includes(args.name));
  assert.deepEqual(once.records.agent_door_approvals,before.records.agent_door_approvals,'Standard service edits need no approval');
  const calls=await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key);
  assert.equal(calls.length,1);assert.equal(calls[0].state,'done');assert.equal(calls[0].decision_id,first.decision.id);
  const stored=JSON.parse(calls[0].outcome);
  assert.equal(stored.outcome,'done');assert.deepEqual(stored.result,result);
  assert.deepEqual(stored.review,first.result._meta['com.runeditrun/review']);
  assert.equal(once.records.agent_door_reviews.length,before.records.agent_door_reviews.length+Number(mode==='held'));
  for(const prior of before.records.agent_door_reviews)assert.deepEqual(once.records.agent_door_reviews.find(row=>row.id===prior.id),prior);
  if(mode==='held'){
   const review=once.records.agent_door_reviews.find(row=>row.id===stored.review.id);
   assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,first.decision.id);
   assert.equal((await read('/agents/api/reviews')).reviews.find(row=>row.id===review.id).state,'open');
  }else assert.equal(stored.review,undefined);
  const originalAudit=await audit(),original=originalAudit.find(row=>row.id===first.decision.id);
  assert.ok(original);
  const originalRow=JSON.parse(original.row);
  assert.equal(originalRow.outcome,'done');assert.equal(originalRow.replay_of,null);
  assert.equal(originalRow.idempotency_key,args.idempotency_key);
  assert.deepEqual(originalRow.resource,{kind:'service',id:service.id});
  const conflict=await tool(name,{...args,name:'Different synthetic service name '+mode});
  assert.equal(conflict.status,200);assert.equal(conflict.body.error,undefined);assert.equal(conflict.result.isError,true);
  assert.notEqual(conflict.body.id,first.body.id);
  assert.equal(conflict.result._meta['com.runeditrun/error'].code,'idempotency_conflict');
  assert.equal(JSON.parse(conflict.result.content[0].text).code,'idempotency_conflict');
  assert.equal(conflict.result.structuredContent,undefined,'A name conflict discloses no private result');
  assert.deepEqual(await snapshot(),once,'Changed name preserves native records, revisions, timelines, state-changing audit, original call and outcome, approvals, reviews and paging');
  assert.deepEqual(await read('/api/paging/state'),pagingOnce);
  const refusedAudit=await audit();
  assert.deepEqual(refusedAudit.slice(0,-1),originalAudit);assert.equal(refusedAudit.length,originalAudit.length+1);
  const refusal=JSON.parse(refusedAudit.at(-1).row);
  assert.notEqual(refusal.id,first.decision.id);assert.equal(refusal.agent.id,context.agentId);
  assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,'idempotency_conflict');
  assert.equal(refusal.idempotency_key,args.idempotency_key);assert.equal(refusal.review,null);assert.equal(refusal.approval,null);
  const replay=await tool(name,args);
  assert.equal(replay.status,200);assert.equal(replay.body.error,undefined);assert.equal(replay.result.isError,false);
  assert.notEqual(replay.body.id,first.body.id);assert.notEqual(replay.body.id,conflict.body.id);
  assert.deepEqual(replay.result.structuredContent,stored.result);assert.deepEqual(replay.result._meta['com.runeditrun/review'],stored.review);
  assert.deepEqual(await snapshot(),once,'Exact original arguments and ETag return stored custody without another write or held review');
  assert.deepEqual(await read('/api/paging/state'),pagingOnce);
  const replayAudit=await audit();
  assert.deepEqual(replayAudit.slice(0,-1),refusedAudit);assert.equal(replayAudit.length,refusedAudit.length+1);
  const attempt=JSON.parse(replayAudit.at(-1).row);
  assert.equal(attempt.id,replay.decision.id);assert.equal(attempt.agent.id,context.agentId);
  assert.equal(attempt.tool,name);assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,first.decision.id);
  assert.equal(attempt.operation_id,originalRow.operation_id);assert.equal(attempt.idempotency_key,args.idempotency_key);
  assert.deepEqual(await runtime.outboundRequests(),[],'The original service edit, name conflict and exact retry attempt no outbound requests');
  console.log('PROBE BASE-AGENT-012 acceptance 3 '+mode+' oncall.services.update: name-only edit -> one workspace revision and agent-attributed native service audit; original key and projected ETag with different schema-valid name -> isError idempotency_conflict in metadata and text, no private result; exact original arguments with new RPC id -> stored result and original review; native records, revisions, timelines, state-changing audit, call and outcome custody, approvals, reviews and paging unchanged; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}

/** A literal runbook replacement is one standard native edit under either policy. */
export async function standardServiceRunbookUpdate(runtime){
 const {db,http,tool,adopt,context}=runtime;
 const read=async(path,input)=>{
  const response=await http(path,input);
  assert.equal(response.status,200,path);
  return response.json();
 };
 const {member:owner}=await read('/api/workspace');
 assert.equal(owner.role,'admin');
 const id='synthetic-oncall-runbook',originalSteps=['Check the rollout dashboard','Record the recovery decision'];
 const serviceInput={type:'service',id,name:'Synthetic checkout runbook',environment:'production',
  owner:owner.id,runbook:originalSteps,pager:'https://pager.example.invalid/checkout',dependencies:['agent-service']};
 await read('/api/command',serviceInput);
 const team=await read('/api/teams',{id:id,name:'Synthetic checkout team',visibility:'public',active:true,
  revision:0,members:[owner.id],managers:[owner.id]});
 await read('/api/teams/ownership',{service:id,team:team.id,workspaceRevision:(await read('/api/state')).revision});
 const incident=await read('/api/command',{type:'declare',service:id,title:'Synthetic checkout investigation',
  summary:'Check the retained rollout',severity:'warning'});
 const originalRunbook=originalSteps.map(step=>({text:step,done:false}));
 assert.deepEqual(incident.runbook,originalRunbook);
 const {name:serviceName,environment:serviceEnvironment,owner:ownerId,pager:servicePager,dependencies:serviceDependencies}=serviceInput;
 let savedService;
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const found=await tool('oncall.services.read',{id});
  assert.equal(found.status,200);
  assert.equal(found.result.isError,false);
  const [projected]=found.result.structuredContent.data;
  const {etag,name,environment,owner:serviceOwner,pager,dependencies,runbook}=projected;
  assert.match(etag,/^[a-f0-9]{64}$/);
  assert.deepEqual(runbook,savedService?.runbook??originalSteps);
  assert.deepEqual({id:projected.id,name,environment,owner:serviceOwner,pager,dependencies,team:projected.team},
   {id,name:serviceName,environment:serviceEnvironment,owner:ownerId,pager:servicePager,dependencies:serviceDependencies,team:team.id},'The projected service retains the seeded fields');
  const before=await agentEffectSnapshot(runtime),pagingBefore=await read('/api/paging/state');
  assert.equal(pagingBefore.paging,'OFF');
  const priorService=before.application.services.find(row=>row.id===id);

  const replacement=['<check> Confirm healthy checkout after '+mode+' rollout',originalSteps[1]];
  const key=randomUUID();
  const result=await tool('oncall.services.update',{id,etag,name,environment,owner:serviceOwner,pager,dependencies,
   runbook:replacement,idempotency_key:key});
  assert.equal(result.status,200);
  assert.equal(result.result.isError,false);
  assert.deepEqual(result.decision.classes.map(({class:risk,facts})=>({class:risk,facts})),[
   {class:'standard',facts:{measure:1}},
  ]);
  assert.equal(result.decision.disposition,disposition);
  const call=await db.prepare('SELECT state, decision_id FROM agent_door_calls WHERE agent=? AND key=?').bind(context.agentId,key).first();
  assert.deepEqual(call,{state:'done',decision_id:result.decision.id});

  const after=await agentEffectSnapshot(runtime);
  savedService=after.application.services.find(row=>row.id===id);
  assert.deepEqual(savedService,{...priorService,runbook:replacement},'Only one runbook step changes in protected state');
  const saved=result.result.structuredContent;
  assert.match(saved.etag,/^[a-f0-9]{64}$/);
  assert.notEqual(saved.etag,etag);
  assert.deepEqual(saved,{...savedService,etag:saved.etag});
  assert.equal(after.application.revision,before.application.revision+1);
  assert.deepEqual(after.application.services,before.application.services.map(row=>row.id===id?savedService:row));
  assert.deepEqual(after.application.teams,before.application.teams);
  assert.deepEqual(after.application.incidents,before.application.incidents,'Declared incidents retain their copied steps and history');
  assert.deepEqual(after.application.incidents.find(row=>row.id===incident.id).runbook,originalRunbook);
  assert.deepEqual(await read('/api/paging/state'),{...pagingBefore,workspaceRevision:after.application.revision});
  await assertServiceCommit(runtime,before,after,id,owner.id);

  const review=result.result._meta['com.runeditrun/review'];
  const reviews=after.records.agent_door_reviews.filter(row=>!before.records.agent_door_reviews.some(prior=>prior.id===row.id));
  assert.deepEqual(after.records.agent_door_approvals,before.records.agent_door_approvals);
  if(mode==='held'){
   assert.ok(review?.id,'Held standard edits return the open review');
   assert.deepEqual(reviews.map(({id,state})=>({id,state})),[{id:review.id,state:'open'}]);
   assert.equal(JSON.parse(reviews[0].saved).decision_id,result.decision.id);
   assert.equal((await read('/agents/api/reviews')).reviews.find(row=>row.id===review.id).state,'open');
  }else{
   assert.equal(review,undefined);
   assert.deepEqual(reviews,[]);
  }
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PROBE SURFACE-002 1 '+mode+': current service ETag and one literal step replacement -> standard only, '+disposition+
   ', one workspace revision and one attributed service commit; protected service, original incident copy, paging OFF and zero outbound confirmed');
 }
 assert.equal((await adopt()).status,200);
 return savedService;
}
