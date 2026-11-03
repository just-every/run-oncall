import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {agentRuntime,pauseMatrix,policyAdoption,noteParity} from './agent-door-runtime.mjs';
import {recoveredResolutionTarget} from './oncall-agent-fixtures.mjs';
import {eraseReplay,eraseClasses} from './oncall-agent-erase-replay.mjs';
import specialist from './oncall-agent-native.mjs';
import {scheduleReplay} from './oncall-agent-schedule-replay.mjs';
import {teamReplay} from './oncall-agent-team-replay.mjs';
import {nativeTransport} from './oncall-agent-transport.mjs';
import {AGENT_CLASSES} from '../src/modules/agent-door/conformance/surface.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Lose the real MCP response, establish its native commit, then recover by key. */
async function droppedDeclarationReplay(runtime){
 const {db,http,tool,adopt,discardToolResponse,context}=runtime;
 const state=async()=> (await (await http('/api/state')).json());
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const native=async()=>({
  control:await rows('SELECT * FROM workspace_control ORDER BY id'),
  incidents:await rows('SELECT * FROM oc_incidents ORDER BY id'),
  audit:await rows('SELECT * FROM oc_audit ORDER BY id'),
  commits:await rows("SELECT * FROM oc_admin_audit WHERE outcome='accepted' AND (workspace_before<>workspace_after OR paging_before<>paging_after OR handoff_before<>handoff_after) ORDER BY ordinal"),
  paging:await rows('SELECT * FROM paging_control ORDER BY id'),
  jobs:await rows('SELECT * FROM paging_jobs ORDER BY id'),
  receipts:await rows('SELECT * FROM paging_receipts ORDER BY id'),
 });
 const calls=key=>rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,key);
 const reviews=()=>rows('SELECT * FROM agent_door_reviews ORDER BY id');
 for(const [mode,policy,disposition] of [['autonomous',autonomousPolicy(),'autonomous'],['held',heldPolicy(),'review']]){
  assert.equal((await adopt(policy)).status,200);
  const before=await native(),beforeState=await state(),beforeReviews=await reviews();
  const args={service:'agent-service',title:'Lost response under '+mode+' policy',summary:'Native coordination with no outbound work',severity:'warning',idempotency_key:randomUUID()};
  const lost=await discardToolResponse('oncall.incidents.declare',args);
  assert.equal(lost.status,200);
  assert.equal(lost.discarded,true);assert.equal(lost.aborted,true);assert.equal(lost.bodyRead,false);
  // The first outcome comes only from native D1, never from the discarded body.
  const committedCalls=await calls(args.idempotency_key);
  assert.equal(committedCalls.length,1);assert.equal(committedCalls[0].state,'done');
  const call=committedCalls[0],saved=JSON.parse(call.outcome),once=await native(),onceState=await state(),onceReviews=await reviews();
  assert.equal(saved.outcome,'done');assert.equal(saved.decision.id,call.decision_id);
  assert.equal(saved.decision.disposition,disposition);
  assert.equal(once.control[0].revision,before.control[0].revision+1);
  assert.equal(once.incidents.length,before.incidents.length+1);
  const incident=JSON.parse(once.incidents.find(row=>row.id===saved.result.id).data);
  assert.deepEqual(incident,saved.result);
  assert.equal(incident.title,args.title);assert.equal(incident.service,args.service);assert.equal(incident.revision,1);
  const declarations=incident.timeline.filter(row=>row.kind==='declared');
  assert.equal(declarations.length,1);assert.equal(declarations[0].metadata.agent.agent.id,context.agentId);
  assert.equal(once.commits.length,before.commits.length+1,'The lost response follows exactly one native application audit commit');
  assert.deepEqual(once.jobs,before.jobs);assert.deepEqual(once.receipts,before.receipts);assert.deepEqual(once.paging,before.paging);
  assert.equal(onceState.revision,beforeState.revision+1);
  assert.equal(onceReviews.length,beforeReviews.length+Number(mode==='held'));
  if(mode==='held'){
   const review=onceReviews.find(row=>row.id===saved.review.id);
   assert.ok(review);assert.equal(review.state,'open');assert.equal(JSON.parse(review.saved).decision_id,call.decision_id);
  }else assert.equal(saved.review,undefined);
  const originalRows=await rows('SELECT * FROM agent_door_audit WHERE id=?',call.decision_id);
  assert.equal(originalRows.length,1);
  const original=JSON.parse(originalRows[0].row);
  assert.equal(original.outcome,'done');assert.equal(original.replay_of,null);
  assert.equal(original.idempotency_key,args.idempotency_key);
  const attempts=await rows('SELECT * FROM agent_door_audit WHERE agent=? AND json_extract(row,\'$.idempotency_key\')=? ORDER BY sequence',context.agentId,args.idempotency_key);
  assert.equal(attempts.length,1);
  const replay=await tool('oncall.incidents.declare',args);
  assert.equal(replay.status,200);assert.notEqual(replay.body.id,lost.id);
  assert.equal(replay.result.isError,false);assert.deepEqual(replay.result.structuredContent,saved.result);
  assert.deepEqual(replay.result._meta['com.runeditrun/review'],saved.review);
  assert.deepEqual(await calls(args.idempotency_key),committedCalls,'Retry preserves the original call and stored outcome');
  assert.deepEqual(await native(),once,'Retry creates no second incident, declaration timeline, application revision or state-changing audit commit');
  assert.deepEqual(await state(),onceState);
  assert.deepEqual(await reviews(),onceReviews,'Held replay keeps the one original review');
  assert.deepEqual(await rows('SELECT * FROM agent_door_audit WHERE id=?',call.decision_id),originalRows);
  const retried=await rows('SELECT * FROM agent_door_audit WHERE agent=? AND json_extract(row,\'$.idempotency_key\')=? ORDER BY sequence',context.agentId,args.idempotency_key);
  assert.equal(retried.length,2);
  const attempt=JSON.parse(retried[1].row);
  assert.equal(attempt.id,replay.decision.id);assert.notEqual(attempt.id,original.id);
  assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,call.decision_id);
  assert.equal(attempt.operation_id,original.operation_id);
  assert.deepEqual(await runtime.outboundRequests(),[],'Declaration and lost-response replay attempt no outbound requests');
  console.log('PROBE BASE-AGENT-012 acceptance 2 '+mode+': real MCP declaration response destroyed at headers with unread body; native D1 outcome replayed with new RPC id; one incident, declaration and application commit; '+(mode==='held'?'one original open review; ':'')+'separate linked replay audit; zero outbound requests');
 }
 assert.equal((await adopt()).status,200);
}

const runtime=await agentRuntime();
const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
try{
 const {tool,mcp,http,adopt}=runtime;
 assert.equal(code(await tool('oncall.services.read',{id:'agent-service'})),'policy_unset');
 assert.equal((await adopt()).status,200);
 const listing=await mcp('tools/list');
 assert.equal(listing.status,200);assert.equal(listing.body.error,undefined);
 assert.ok(listing.result.tools.length>0,'The adopted policy must expose real tools');
 for(const listedTool of listing.result.tools){
  const classes=listedTool._meta?.['com.runeditrun/classes'];
  assert.ok(Array.isArray(classes)&&classes.length>0,`${listedTool.name} must declare its possible classes`);
  for(const cls of classes)assert.ok(AGENT_CLASSES.includes(cls),`${listedTool.name} declares uncatalogued class ${cls}`);
 }
 assert.equal(listing.result.nextCursor,undefined,'The catalog probe must enumerate the complete emitted list');
 console.log(`PROBE BASE-AGENT-006 point 5 listed tools: emitted Worker MCP -> all ${listing.result.tools.length} returned tools declare only fleet-catalog classes`);
 await noteParity(runtime);
 await policyAdoption(runtime);
 await pauseMatrix(runtime);
 await droppedDeclarationReplay(runtime);
 // Resolve native targets before any policy disposition; cached outcomes
 // still require current policy, scopes and live native record authority.
 const owner=(await (await http('/api/workspace')).json()).member;
 const key=randomUUID();
 const args={service:'agent-service',title:'Replay admission proof',summary:'Internal coordination beside the existing pager',severity:'warning',idempotency_key:key};
 const created=await tool('oncall.incidents.declare',args);
 assert.equal(created.result.isError,false);
 const replay=await tool('oncall.incidents.declare',args);
 assert.deepEqual(replay.result.structuredContent,created.result.structuredContent);
 const snapshot=async()=>JSON.stringify((await (await http('/api/state')).json()).incidents);
 const once=await snapshot();
 const audit=async()=> (await (await http('/agents/api/audit?agent='+encodeURIComponent(runtime.context.agentId))).json());
 const original=(await audit()).rows.find(row=>row.id===created.decision.id);
 assert.deepEqual(original.resource,{kind:'service',id:'agent-service'});
 assert.equal(original.sponsor.id,owner.id);
 for(const [document,options,expected] of [
  [autonomousPolicy(),{paused:true},'agents_paused'],
  [{...autonomousPolicy(),rules:[{id:'stop',class:'*',do:'blocked'}]}, {},'policy_blocked'],
  [{...autonomousPolicy(),rules:[{id:'hold',class:'*',do:'approval',approver:['sponsor'],wait:'PT1H'}]}, {},'approval_required'],
 ]){
  assert.equal((await adopt(document,options)).status,200);
  const refused=await tool('oncall.incidents.declare',args);
  assert.equal(code(refused),expected);
  assert.equal(refused.result.structuredContent,undefined,'Refused replay cannot disclose its cached result');
  assert.equal(await snapshot(),once,'Refused replay cannot repeat the native mutation');
  const row=(await audit()).rows.find(row=>row.id===refused.decision.id);
  assert.deepEqual(row.resource,{kind:'service',id:'agent-service'});
  assert.equal(row.code,expected);
  assert.equal(row.sponsor.id,owner.id);

 }
 const missingScope=await tool('oncall.incidents.declare',args,{scope:'events:read'});
 assert.equal(code(missingScope),'insufficient_scope');
 assert.equal(missingScope.result?.structuredContent,undefined);
 assert.equal(await snapshot(),once);
 const freshHeld=await tool('oncall.incidents.declare',{...args,idempotency_key:randomUUID()});
 const pending=freshHeld.result._meta['com.runeditrun/approval'];
 assert.ok(pending,'A new held effect must have a real approval');
 const view=await (await http('/agents/api/approvals/'+pending.id)).json();
 assert.deepEqual(view.approval.summary.nativeTarget,{kind:'service',id:'agent-service'});
 const decision={revision:view.approval.revision,summary_sha256:view.approval.summary_sha256};
 assert.equal((await http('/agents/api/approvals/'+pending.id+'/approve',{...decision,summary_sha256:'stale-summary'})).status,409);
 assert.equal(await snapshot(),once,'A mismatched summary cannot execute the held action');
 const approved=await http('/agents/api/approvals/'+pending.id+'/approve',decision);
 assert.equal(approved.status,200);
 assert.equal((await approved.json()).approval.state,'executed');
 const execution=(await audit()).rows.find(row=>row.decision_id===freshHeld.decision.id);
 assert.deepEqual(execution.resource,{kind:'service',id:'agent-service'});
 assert.equal(execution.outcome,'done');assert.ok(execution.approval.by.includes(owner.id));
 assert.equal((await adopt()).status,200);
 console.log('PASS native-target-audit and mutation-replay-native-authority: once-only outcome; Pause, changed policy, new approval and scope checked before cached content');
 // A declared incident's final decision carries commitment even for an internal
 // coordination-only installation. Only native retained evidence adds sensitive.
 const resolveName='oncall.incidents.resolve';
 const listed=(await mcp('tools/list')).result.tools.find(row=>row.name===resolveName);
 assert.deepEqual(listed._meta['com.runeditrun/classes'],['commitment','sensitive']);
 assert.deepEqual(listed._meta['com.runeditrun/classes'],runtime.context.surface.tools.find(row=>row.name===resolveName).classes);
 const resolutionFacts=[{class:'commitment',facts:{measure:0,currency:'XXX',counterparty:'internal'}},
  {class:'sensitive',facts:{measure:2,kind:'personal_or_incident_evidence'}}];
 const facts=answer=>answer.decision.classes.map(({class:cls,facts})=>({class:cls,facts}));
 async function resolutionAudit(answer,outcome){
  assert.deepEqual(facts(answer),resolutionFacts);
  const row=(await audit()).rows.find(row=>row.id===answer.decision.id);
  assert.equal(row.tool,resolveName);assert.equal(row.outcome,outcome);
  assert.deepEqual(row.classes,resolutionFacts);
  return row;
 }
 const resolutionState=async()=> (await (await http('/api/state')).json());
 const autoTarget=await recoveredResolutionTarget(runtime,'Native commitment under autonomous policy');
 const autoArgs={incident:autoTarget.id,revision:autoTarget.revision,summary:'Retained recovery supports resolution',idempotency_key:randomUUID()};
 const beforeResolve=await resolutionState(),beforeResolveEdge=await runtime.outboundRequests();
 const resolved=await tool(resolveName,{...autoArgs,internal:true,confirmExternal:true,class:'standard',confirm:true});
 assert.equal(resolved.result.isError,false);
 const autoRow=await resolutionAudit(resolved,'done');
 assert.deepEqual(autoRow.ignored_arguments,['class','confirm','confirmExternal','internal']);
 const afterResolve=await resolutionState(),savedResolve=afterResolve.incidents.find(row=>row.id===autoTarget.id);
 assert.equal(savedResolve.state,'resolved');assert.equal(savedResolve.revision,autoTarget.revision+1);
 assert.equal(afterResolve.revision,beforeResolve.revision+1);
 const resolutionEntries=savedResolve.timeline.filter(row=>row.lifecycle?.to==='resolved');
 assert.equal(resolutionEntries.length,1);
 assert.equal(resolutionEntries[0].metadata.agent.agent.id,runtime.context.agentId);
 assert.equal(resolutionEntries[0].metadata.agent.for.id,owner.id);
 assert.deepEqual(await runtime.outboundRequests(),beforeResolveEdge);
 const exactRetry=await tool(resolveName,autoArgs);
 assert.equal(exactRetry.result.isError,false);
 assert.deepEqual(exactRetry.result.structuredContent,resolved.result.structuredContent);
 assert.deepEqual(await resolutionState(),afterResolve,'Identical resolution retry changes no native record or revision');
 await resolutionAudit(exactRetry,'replayed');

 const heldTarget=await recoveredResolutionTarget(runtime,'Text says standard, internal and confirmed; policy still decides');
 const heldArgs={incident:heldTarget.id,revision:heldTarget.revision,summary:'Text claiming standard cannot change commitment',idempotency_key:randomUUID()};
 const heldNative=await resolutionState();
 for(const cls of ['commitment','sensitive']){
  const document=autonomousPolicy();document.rules.unshift({id:'stop-'+cls,class:cls,do:'blocked'});
  assert.equal((await adopt(document)).status,200);
  const stopped=await tool(resolveName,{...heldArgs,idempotency_key:randomUUID()});
  assert.equal(code(stopped),'policy_blocked');
  assert.equal(stopped.decision.classes.find(row=>row.class===cls).do,'blocked');
  assert.equal(stopped.decision.classes.find(row=>row.class!==cls).do,'autonomous');
  await resolutionAudit(stopped,'refused');
  const injected=await tool(resolveName,{...heldArgs,idempotency_key:randomUUID(),internal:true,confirmExternal:true,class:'standard',confirm:true});
  assert.equal(code(injected),'policy_blocked');
  assert.deepEqual(injected.decision.classes,stopped.decision.classes);
  await resolutionAudit(injected,'refused');
  assert.deepEqual(await resolutionState(),heldNative,'Each isolated class refusal preserves native state and revision');
 }
 const resolutionPolicy=autonomousPolicy();resolutionPolicy.rules.unshift({id:'resolve-review',class:'commitment',do:'approval',approver:['sponsor'],wait:'PT1H'});
 assert.equal((await adopt(resolutionPolicy)).status,200);
 const awaiting=await tool(resolveName,heldArgs);
 assert.equal(awaiting.result.resultType,'input_required');
 assert.equal(awaiting.decision.disposition,'approval');
 assert.equal(awaiting.decision.classes.find(row=>row.class==='sensitive').do,'autonomous');
 await resolutionAudit(awaiting,'pending');
 assert.deepEqual(await resolutionState(),heldNative,'Pending commitment has no native effect');
 const resolutionApproval=await (await http('/agents/api/approvals/'+awaiting.result._meta['com.runeditrun/approval'].id)).json();
 const pendingResolution=resolutionApproval.approval;
 assert.deepEqual(pendingResolution.summary.nativeTarget,{kind:'incident',id:heldTarget.id});
 const exactDecision={revision:pendingResolution.revision,summary_sha256:pendingResolution.summary_sha256};
 assert.equal((await http('/agents/api/approvals/'+pendingResolution.id+'/approve',{...exactDecision,summary_sha256:'changed-summary'})).status,409);
 assert.deepEqual(await resolutionState(),heldNative);
 assert.equal((await http('/api/command',{type:'note',incident:heldTarget.id,revision:heldTarget.revision,text:'Human adds new evidence after preparation'})).status,200);
 const changedResolution=await resolutionState();
 const staleResolution=await http('/agents/api/approvals/'+pendingResolution.id+'/approve',exactDecision);
 assert.equal((await staleResolution.json()).approval.state,'refused');
 assert.deepEqual(await resolutionState(),changedResolution,'An exact saved approval cannot resolve a changed native revision');
 assert.equal((await adopt()).status,200);
 console.log('PASS incident resolution classification: commitment and sensitive facts, autonomous and isolated blocked policies, immutable pending and stale approval, ignored caller and record claims, attributed once-only resolution and effect-free retry');

 const missing=await mcp('resources/read',{uri:'oncall://incidents/not-present'});
 assert.equal(missing.body.error.data.code,'capability_not_declared');
 assert.equal(missing.body.error.data.capability,'resources');
 assert.equal(missing.result,undefined);
 const noReadScope=await tool('oncall.services.read',{id:'agent-service'},{scope:'events:read'});
 assert.equal(code(noReadScope),'insufficient_scope');
 const blockedReads={...autonomousPolicy(),rules:[{id:'private-read-stop',class:'*',do:'blocked'}]};
 assert.equal((await adopt(blockedReads)).status,200);
 const blockedResource=await tool('oncall.services.read',{id:'agent-service'});
 assert.equal(code(blockedResource),'policy_blocked');
 assert.equal(blockedResource.result.structuredContent,undefined);
 assert.equal((await adopt()).status,200);
 console.log('PASS core read admission: undeclared resources refuse without content; tools retain insufficient_scope and policy_blocked');
 const before=await (await http('/agents/api/state')).json();
 assert.equal((await http('/api/rer/agent-policy',{policy:'invalid.signature.document'})).status,400);
 assert.deepEqual(await (await http('/agents/api/state')).json(),before,'Invalid adoption retains the exact prior policy');
 for(const overrides of [{sub:'unmapped-person'},{aud:'https://foreign.invalid/mcp'}])assert.equal((await tool('oncall.services.read',{id:'agent-service'},overrides)).status,401);
 const state=await (await http('/api/state')).json(),responder=state.members.find(row=>row.role==='responder');
 const teammate=randomUUID();
 await runtime.settings([{id:teammate,email:'mira@example.invalid',name:'Mira Patel',role:'member',invite:1}],2);
 assert.equal((await tool('oncall.services.read',{id:'agent-service'},{sub:teammate,email:runtime.context.person.email})).status,401,'Matching token email cannot establish native authority');
 assert.equal((await http('/api/rer/people-link',{businessId:teammate,memberId:responder.id,revision:2})).status,303);
 const linked=await tool('oncall.services.read',{id:'agent-service'},{sub:teammate,email:'mira@example.invalid',act:{sub:'mira-agent',name:'Mira assistant'}});
 assert.equal(linked.status,200);assert.equal(linked.result.isError,false);
 // Native immutable service fields remain enforced; the conformance fixture
 // must preserve the current environment when exercising an allowed edit.
 const serviceRead=await tool('oncall.services.read',{id:'agent-service'});
 const service=serviceRead.result.structuredContent.data[0];
 const serviceInput={id:service.id,etag:service.etag,name:'Payments API coordination',environment:service.environment,owner:service.owner,runbook:service.runbook,pager:service.pager,dependencies:service.dependencies??[]};
 const serviceEdit=await tool('oncall.services.update',{...serviceInput,idempotency_key:randomUUID()});
 assert.equal(serviceEdit.result.isError,false);
 const savedService=serviceEdit.result.structuredContent;
 const beforeEnvironment=await (await http('/api/state')).json();
 const changedEnvironment=await tool('oncall.services.update',{...serviceInput,etag:savedService.etag,environment:'verification',idempotency_key:randomUUID()});
 assert.equal(code(changedEnvironment),'native_request_invalid');
 assert.deepEqual((await (await http('/api/state')).json()).services,beforeEnvironment.services);
 // An approval creates the schedule once; the same key must then return the
 // cached outcome after current policy and native authority are rechecked.
 const rota=(await tool('oncall.schedules.read',{id:'agent-schedule'})).result.structuredContent.schedules[0];
 const createRota={schedule:{...rota,id:randomUUID(),name:'Payments coordination backup',revision:0},idempotency_key:randomUUID()};
 const heldRota=autonomousPolicy();heldRota.rules.unshift({id:'coverage-review',class:'live',do:'approval',approver:['sponsor'],wait:'PT1H'});
 assert.equal((await adopt(heldRota)).status,200);
 const heldCreate=await tool('oncall.schedules.create',createRota);
 const rotaApproval=heldCreate.result._meta['com.runeditrun/approval'];assert.ok(rotaApproval);
 const rotaView=(await (await http('/agents/api/approvals/'+rotaApproval.id)).json()).approval;
 const rotaDecision=await http('/agents/api/approvals/'+rotaApproval.id+'/approve',{revision:rotaView.revision,summary_sha256:rotaView.summary_sha256});
 assert.equal((await rotaDecision.json()).approval.state,'executed');
 const rotaReplay=await tool('oncall.schedules.create',createRota);assert.equal(rotaReplay.result.isError,false);
 const rotaRepeated=await tool('oncall.schedules.create',createRota);assert.deepEqual(rotaRepeated.result.structuredContent,rotaReplay.result.structuredContent);
 const rotaRead=await tool('oncall.schedules.read',{id:createRota.schedule.id});
 assert.equal(rotaRead.result.structuredContent.schedules.length,1);assert.equal(rotaRead.result.structuredContent.schedules[0].revision,1);
 assert.equal(code(await tool('oncall.schedules.create',{...createRota,idempotency_key:randomUUID()})),'revision_conflict','A new key cannot create an existing native schedule');
 assert.equal(code(await tool('oncall.schedules.create',{...createRota,schedule:{...createRota.schedule,name:'Changed key content'}})),'idempotency_conflict');
 assert.equal((await adopt()).status,200);
 console.log('PASS native service immutable environment and approved schedule creation replay: allowed edit, no-effect environment refusal, one schedule, fresh-key conflict and changed-argument conflict');
 await nativeTransport(runtime);
 await teamReplay(runtime);
 await scheduleReplay(runtime);
 await eraseReplay(runtime);
 await eraseClasses(runtime);
 await specialist({request:runtime.request,origin:runtime.origin,cookie:runtime.cookie,fixtures:runtime.fixtures,tool});
 const events=await tool('oncall.events.list',{limit:200});assert.equal(code(events),'capability_not_declared');assert.equal(events.result.structuredContent,undefined);
 assert.ok((await audit()).rows.some(row=>row.agent.id===runtime.context.agentId&&row.outcome==='done'));
 const native=await (await http('/api/state')).json(),incident=native.incidents.find(row=>row.title==='Payment authorization failures after deployment');
 const agentEntries=incident.timeline.filter(row=>row.metadata?.agent);
 assert.ok(agentEntries.length>0&&agentEntries.every(row=>row.metadata.agent.for.id===native.members.find(row=>row.name==='Alex Chen').id));
 assert.ok(incident.timeline.some(row=>row.kind==='source-recovery'&&!row.metadata?.agent),'Source observation retains its separate native actor');
 assert.equal(incident.actions[0].done,false);
 // Oncall's actual workspace-password door returns HTTP 200. A distinct
 // signed-in responder accepts the machine submission with a native reason.
 const reviewerPassword=randomBytes(32).toString('hex');
 const reviewer=await (await http('/api/members',{name:'Sam Ortega',role:'responder',password:reviewerPassword})).json();
 const login=await runtime.request(runtime.origin+'/api/login',{method:'POST',headers:{Origin:runtime.origin,'Content-Type':'application/json'},body:JSON.stringify({name:reviewer.name,password:reviewerPassword})});
 assert.equal(login.status,200);
 const reviewerCookie=login.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');
 assert.ok(reviewerCookie&&reviewerCookie!==runtime.cookie);
 await login.body?.cancel();
 const accepted=await runtime.request(runtime.origin+'/api/command',{method:'POST',headers:{Origin:runtime.origin,Cookie:reviewerCookie,'Content-Type':'application/json'},body:JSON.stringify({type:'accept-action',incident:incident.id,revision:incident.revision,action:incident.actions[0].id,reason:'Sam independently reviewed the retained deployment evidence'})});
 assert.equal(accepted.status,200);
 const reviewed=await accepted.json();
 assert.equal(reviewed.actions[0].done,true);
 assert.equal(reviewed.actions[0].accepted.by,reviewer.id);
 assert.notEqual(reviewed.actions[0].submission.by,reviewer.id);
 assert.ok(reviewed.timeline.some(row=>row.actor===reviewer.id&&row.text.includes('Human accepted follow-up')&&!row.metadata?.agent));
 console.log('PASS native reviewer lifecycle: distinct workspace-password responder; machine submission retained; actual named human acceptance');

 incident.revision=reviewed.revision;
 const pause=await adopt(autonomousPolicy(),{paused:true});assert.equal(pause.status,200);
 const witness=JSON.stringify((await (await http('/api/state')).json()).incidents);
 assert.equal(code(await tool('oncall.notes.add',{incident:incident.id,revision:incident.revision,text:'Held by company Pause',idempotency_key:randomUUID()})),'agents_paused');
 assert.equal(JSON.stringify((await (await http('/api/state')).json()).incidents),witness);
 assert.equal((await http('/api/command',{type:'note',incident:incident.id,revision:incident.revision,text:'The current person can still coordinate during agent Pause'})).status,200);
 assert.equal((await adopt()).status,200);
 const personTimeline=(await (await http('/api/state')).json()).incidents.find(row=>row.id===incident.id).timeline;
 assert.ok(personTimeline.some(row=>row.actor===owner.id&&!row.metadata?.agent&&row.text.includes('The current person can still coordinate')),'Native person changes retain their separate timeline attribution');
 assert.equal((await audit()).differs_from_policy,0,'Native agent decisions must agree with the policy in force');
 // Erasure uses the native person door and leaves retained audit IDs stable,
 // with the former sponsor's name removed and their next Business call refused.
 const beforeErasure=await (await http('/api/state')).json(),currentIncident=beforeErasure.incidents.find(row=>row.id===incident.id);
 const mira={sub:teammate,email:'mira@example.invalid',act:{sub:'mira-agent',name:'Mira assistant'}};
 const miraNote=await tool('oncall.notes.add',{incident:incident.id,revision:currentIncident.revision,text:'Independent coordination observation',idempotency_key:randomUUID()},mira);
 assert.equal(miraNote.result.isError,false);
 const miraAudit=async()=>(await (await http('/agents/api/audit?agent=mira-agent')).json()).rows;
 const beforeActorEvents=(await miraAudit()).filter(row=>row.sponsor.id===responder.id);
 assert.ok(beforeActorEvents.length>0);
 const eraseState=await (await http('/api/state')).json();
 const erased=await http('/api/erasure/member/'+responder.id,{workspaceRevision:eraseState.revision,confirmation:'erase '+responder.id,identitiesReviewed:true,importedPeople:[]});
 assert.equal(erased.status,200);
 const afterActorEvents=await miraAudit();
 for(const before of beforeActorEvents){const after=afterActorEvents.find(row=>row.id===before.id);assert.ok(after);assert.equal(after.sponsor.name,'Erased member');assert.equal(after.label,'Mira assistant for Erased member');}
 assert.equal((await tool('oncall.services.read',{id:'agent-service'},{...mira,email:runtime.context.person.email})).status,401);
 console.log('PASS native sponsor erasure: retained agent audit IDs, redacted sponsor name/label and immediate Business admission refusal');
 console.log('PASS Oncall agent native flow: signed owner/team mapping, MCP coordination, open human review, reviewed coverage, signed receiver receipt, client scope/demotion, Pause, native audit and undeclared event refusal; paging OFF');
}finally{await runtime.close()}
