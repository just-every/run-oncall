import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {agentRuntime} from './agent-door-runtime.mjs';
import {eraseReplay} from './oncall-agent-erase-replay.mjs';
import specialist from './oncall-agent-native.mjs';
import {scheduleReplay} from './oncall-agent-schedule-replay.mjs';
import {autonomousPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

const runtime=await agentRuntime();
const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
try{
 const {tool,mcp,http,adopt}=runtime;
 assert.equal(code(await tool('oncall.services.read',{id:'agent-service'})),'policy_unset');
 assert.equal((await adopt()).status,200);
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
 await scheduleReplay(runtime);
 await eraseReplay(runtime);
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
