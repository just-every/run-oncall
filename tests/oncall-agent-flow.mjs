import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {agentRuntime,pauseMatrix} from './agent-door-runtime.mjs';
import {recoveredResolutionTarget} from './oncall-agent-fixtures.mjs';
import {eraseReplay,eraseClasses} from './oncall-agent-erase-replay.mjs';
import specialist from './oncall-agent-native.mjs';
import {scheduleReplay} from './oncall-agent-schedule-replay.mjs';
import {teamReplay} from './oncall-agent-team-replay.mjs';
import {accessToken,seconds,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';
import {AGENT_CLASSES} from '../src/modules/agent-door/conformance/surface.mjs';

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
 await pauseMatrix(runtime);
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
 // A Business credential keeps its original scopes while current native
 // membership, not the signed roster's role, decides each later call.
 const roster=[{id:teammate,email:['mira','example.invalid'].join('@'),name:'Mira Patel',role:'member',invite:1}];
 let rosterRevision=2;
 // Keep real pending work populated so an authority refusal cannot silently
 // clear another saved action while appearing to preserve an empty queue.
 const pendingWitness=await recoveredResolutionTarget(runtime,'Pending work retained across sponsor transitions');
 assert.equal((await adopt(heldPolicy())).status,200);
 const pendingNote=await tool('oncall.notes.add',{incident:pendingWitness.id,revision:pendingWitness.revision,text:'Unrelated saved coordination remains pending',idempotency_key:randomUUID()});
 assert.equal(pendingNote.result.resultType,'input_required');
 for(const [label,document] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await adopt(document)).status,200);
  const password=randomBytes(32).toString('hex');
  const memberResponse=await http('/api/members',{name:'Synthetic oncall sponsor '+label,role:'responder',password});
  assert.equal(memberResponse.status,201);
  const sponsor=await memberResponse.json();
  const login=await runtime.request(runtime.origin+'/api/login',{method:'POST',headers:{Origin:runtime.origin,'Content-Type':'application/json'},body:JSON.stringify({name:sponsor.name,password})});
  assert.equal(login.status,200);
  const sponsorCookie=login.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');
  assert.ok(sponsorCookie&&sponsorCookie!==runtime.cookie);await login.body?.cancel();
  const businessId=randomUUID(),email=['synthetic-oncall-sponsor-'+label,'example.invalid'].join('@'),agent='synthetic-oncall-'+randomUUID();
  roster.push({id:businessId,email,name:sponsor.name,role:'member',invite:1});
  await runtime.settings(roster,++rosterRevision);
  assert.equal((await http('/api/rer/people-link',{businessId,memberId:sponsor.id,revision:rosterRevision})).status,303);
  const token=await accessToken(runtime.context,{sub:businessId,email,act:{sub:agent,name:'Synthetic sponsor assistant'},exp:seconds()+900});
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  assert.ok(claims.scope.split(' ').includes('incidents:write'));
  const call=(name,args)=>runtime.mcpWithToken(token,'tools/call',{name,arguments:args});
  const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
  const target=await recoveredResolutionTarget(runtime,'Current Business sponsor '+label);
  const current=async()=> (await read('/api/state')).incidents.find(row=>row.id===target.id);
  const snapshot=async()=>({application:await read('/api/state'),paging:await read('/api/paging/state'),
   approvals:(await runtime.db.prepare('SELECT * FROM agent_door_approvals ORDER BY id').all()).results,
   pending:(await runtime.db.prepare("SELECT * FROM agent_door_calls WHERE state='pending' ORDER BY agent,key").all()).results,
   operations:(await runtime.db.prepare('SELECT * FROM oc_agent_operations ORDER BY id').all()).results,
   sponsorLink:await runtime.db.prepare('SELECT business_id,business_role,operator_id,state FROM bs_team WHERE business_id=?').bind(businessId).first()});
  const note=async text=>({incident:target.id,revision:(await current()).revision,text,idempotency_key:randomUUID()});
  const edge=await runtime.outboundRequests(),args=await note('Admitted Business sponsor note '+label),before=await snapshot();
  assert.ok(before.pending.length>0,'Authority comparisons include real pending work');
  const admitted=await call('oncall.notes.add',args);
  assert.equal(admitted.status,200);
  assert.equal(admitted.decision.disposition,label==='held'?'approval':'autonomous');
  if(label==='held'){
   assert.equal(admitted.result.resultType,'input_required');
   assert.deepEqual((await snapshot()).application,before.application,'Approval preparation changes no native records');
   const pendingResponse=await runtime.request(runtime.origin+'/agents/api/approvals/'+admitted.result._meta['com.runeditrun/approval'].id,{headers:{Cookie:sponsorCookie}});
   assert.equal(pendingResponse.status,200);
   const saved=(await pendingResponse.json()).approval;
   assert.equal(saved.prepared_by.for.id,sponsor.id);
   const approval=await runtime.request(runtime.origin+'/agents/api/approvals/'+saved.id+'/approve',{method:'POST',headers:{Origin:runtime.origin,Cookie:sponsorCookie,'Content-Type':'application/json'},body:JSON.stringify({revision:saved.revision,summary_sha256:saved.summary_sha256})});
   assert.equal(approval.status,200);
   const executed=(await approval.json()).approval;
   assert.equal(executed.state,'executed');assert.ok(executed.approvals.some(row=>row.person===sponsor.id));
  }else assert.equal(admitted.result.isError,false);
  const after=await current(),entry=after.timeline.at(-1);
  assert.equal(after.revision,args.revision+1);assert.equal(entry.text,args.text);
  assert.equal(entry.metadata?.agent?.agent.id,agent);assert.equal(entry.metadata?.agent?.for.id,sponsor.id);
  const admittedReplay=await call('oncall.notes.add',args);
  assert.equal(admittedReplay.result.isError,false);
  assert.deepEqual(await current(),after,'The supported same-token retry retains one attributed note');
  const retained=await runtime.db.prepare('SELECT state,outcome FROM agent_door_calls WHERE agent=? AND key=?').bind(agent,args.idempotency_key).first();
  assert.equal(retained.state,'done');
  assert.equal(JSON.parse(retained.outcome).outcome,'done','The later refusal must fence a populated successful receipt');
  const audit=async()=> (await read('/agents/api/audit?agent='+encodeURIComponent(agent))).rows;
  assert.ok((await audit()).some(row=>row.sponsor.id===sponsor.id&&row.outcome==='done'));
  assert.equal((await http('/api/command',{type:'member',id:sponsor.id,role:'viewer',active:true})).status,200);
  const deniedArgs=await note('Viewer cannot append this valid note'),downgraded=await snapshot();
  assert.equal((await read('/api/state')).members.find(row=>row.id===sponsor.id).role,'viewer');
  assert.ok(claims.exp>seconds(),'The preissued token remains unexpired after downgrade');
  const priorAudit=await audit(),denied=await call('oncall.notes.add',deniedArgs);
  assert.equal(code(denied),'native_authority_required');assert.equal(denied.result?.structuredContent,undefined);
  assert.deepEqual(await snapshot(),downgraded,'Role refusal changes no application record, revision, timeline, pending work or paging state');
  const refusalAudit=(await audit()).filter(row=>!priorAudit.some(before=>before.id===row.id));
  assert.equal(refusalAudit.length,1);assert.equal(refusalAudit[0].code,'native_authority_required');
  assert.equal(refusalAudit[0].sponsor.id,sponsor.id);assert.equal(refusalAudit[0].role,'viewer');
  assert.deepEqual(refusalAudit[0].scopes,claims.scope.split(' '),'Native downgrade does not replace the signed token scopes');
  assert.deepEqual(downgraded.sponsorLink,before.sponsorLink,'Only the native role changes; the signed Business roster and explicit link remain current');
  const refusedReplay=await call('oncall.notes.add',args);
  assert.equal(code(refusedReplay),'native_authority_required');
  assert.equal(refusedReplay.result?.structuredContent,undefined,'A downgraded sponsor cannot disclose its earlier successful receipt');
  assert.deepEqual(await snapshot(),downgraded,'Refused successful-call replay preserves native records and populated pending work');
  assert.deepEqual(await runtime.db.prepare('SELECT state,outcome FROM agent_door_calls WHERE agent=? AND key=?').bind(agent,args.idempotency_key).first(),retained,'Authority refusal retains the original receipt');
  const permitted=await call('oncall.services.read',{id:'agent-service'});
  assert.equal(permitted.status,200);assert.equal(permitted.result.isError,false);assert.equal(permitted.result.structuredContent.data[0].id,'agent-service');
  assert.deepEqual(await snapshot(),downgraded,'The viewer read preserves application, pending work, paging and Business linkage');
  assert.equal((await http('/api/command',{type:'member',id:sponsor.id,role:'viewer',active:false})).status,200);
  const suspended=await snapshot();
  assert.equal(suspended.application.members.find(row=>row.id===sponsor.id).active,false);
  assert.ok(claims.exp>seconds(),'The same token remains unexpired after suspension');
  const unavailable=await call('oncall.notes.add',await note('Inactive sponsor cannot append this valid note'));
  assert.equal(unavailable.status,401);assert.equal(unavailable.result,undefined);
  const suspendedReplay=await call('oncall.notes.add',args);
  assert.equal(suspendedReplay.status,401);assert.equal(suspendedReplay.result,undefined,'Suspension also fences the retained successful receipt');
  assert.equal((await call('oncall.services.read',{id:'agent-service'})).status,401);
  assert.deepEqual(await snapshot(),suspended,'Suspension refusal preserves native state and pending work');
  assert.deepEqual(suspended.sponsorLink,before.sponsorLink,'Native suspension needs no Business roster change or token replacement');
  assert.deepEqual(await runtime.outboundRequests(),edge,'Sponsor transitions attempt zero outbound requests');
  assert.equal(edge.length,0,'This sponsor journey has no provider activity');
  console.log(`PROBE BASE-AGENT-005 3 ${label}: linked native responder and preissued Business token -> attributed note ${label==='held'?'approved by its signed-in sponsor':'executed'} and once-only retry; owner downgrade -> fresh note and successful-call replay native_authority_required with no disclosure or effect and permitted read; owner suspension -> fresh call, replay and read with the same unexpired token 401; Business link, pending work and paging unchanged; zero outbound requests`);
 }
 assert.equal((await adopt()).status,200);
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
