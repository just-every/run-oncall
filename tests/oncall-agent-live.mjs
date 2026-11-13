import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {auditRows} from '../src/modules/agent-door/conformance/audit-pages.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';
import {recoveredResolutionTarget,manualPageFixture,manualPageClasses,manualPageSnapshot,manualPagePolicy,deadlineTarget} from './oncall-agent-fixtures.mjs';

/** Use the existing public audit cursor reader after earlier native journeys. */
async function decisionAudit(runtime, id) {
 const {rows,differs}=await auditRows({agentId:runtime.context.agentId,personJson:async path=>{
  const response=await runtime.http(path);assert.equal(response.status,200);return response.json();
 }});
 assert.equal(differs,0);
 const row=rows.find(row=>row.id===id);
 assert.ok(row,'The decision is retained in the complete public audit');
 return row;
}

/** Existing manual-page updates carry live even while physical paging is off. */
export async function manualPageClassification(runtime) {
 const {tool,http,adopt,db,context}=runtime,name='oncall.incidents.update';
 const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
 const facts=answer=>answer.decision.classes.map(({class:risk,facts})=>({class:risk,facts}));
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const owner=(await read('/api/workspace')).member;
 const responder=(await read('/api/state')).members.find(row=>row.role==='responder');
 const snapshot=()=>manualPageSnapshot(runtime);
 const audit=answer=>decisionAudit(runtime,answer.decision.id);
 assert.equal((await adopt()).status,200);
 const listed=(await runtime.mcp('tools/list')).result.tools.find(row=>row.name===name);
 assert.deepEqual(listed._meta['com.runeditrun/classes'],['standard','sensitive','live']);
 assert.deepEqual(listed._meta['com.runeditrun/classes'],context.surface.tools.find(row=>row.name===name).classes);
 const manualPolicy=await manualPagePolicy(runtime);
 await manualPagePolicy(runtime,'agent-foreign-service');
 const control=await recoveredResolutionTarget(runtime,'Nonpaging update control');
 assert.equal((await adopt()).status,200);
 const update=await tool(name,{change:'transition',incident:control.id,revision:control.revision,state:'mitigating',summary:'Continue native coordination',idempotency_key:randomUUID()});
 assert.equal(update.result?.isError,false,JSON.stringify(update.body));
 assert.deepEqual(facts(update),[{class:'standard',facts:{measure:1}},{class:'sensitive',facts:{measure:2,kind:'personal_or_incident_evidence'}}]);
 const nonpaging=autonomousPolicy();nonpaging.rules.unshift({id:'nonpaging-live-block',class:'live',do:'blocked'});
 assert.equal((await adopt(nonpaging)).status,200);
 let currentControl=update.result.structuredContent;
 for(const input of [
  {change:'reassign',member:responder.id,reason:'Keep native responsibility inside coordination'},
  {change:'assign-role',role:'scribe',member:responder.id,reason:'Record a coordination role'},
 ]){
  const changed=await tool(name,{...input,incident:control.id,revision:currentControl.revision,idempotency_key:randomUUID()});
  assert.equal(changed.result?.isError,false,JSON.stringify(changed.body));
  assert.deepEqual(facts(changed),facts(update),'Nonpaging role and responsibility updates add no live class');
  currentControl=changed.result.structuredContent;
 }
 const note=await tool('oncall.notes.add',{incident:control.id,revision:currentControl.revision,text:'Literal coordination note; this does not page anyone',idempotency_key:randomUUID()});
 assert.equal(note.result?.isError,false,JSON.stringify(note.body));assert.deepEqual(facts(note),facts(update));

 for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  for(const target of ['user','policy']){
   const args=manualPageFixture(target==='user'?responder.id:undefined,`Synthetic ${mode} ${target} coordination`);
   const blocked=autonomousPolicy();blocked.rules.unshift({id:'stop-live',class:'live',do:'blocked'});
   assert.equal((await adopt(blocked)).status,200);
   const before=await snapshot();
   const refused=await tool(name,{...args,internal:true,confirm:true,confirmExternal:true,class:'standard'});
   assert.equal(code(refused),'policy_blocked');assert.equal(refused.result.structuredContent,undefined);
   assert.deepEqual(facts(refused),manualPageClasses);
   assert.equal(refused.decision.classes.find(row=>row.class==='standard').do,'autonomous');
   assert.equal(refused.decision.classes.find(row=>row.class==='live').do,'blocked');
   const refusedAudit=await audit(refused);assert.equal(refusedAudit.outcome,'refused');
   assert.deepEqual(refusedAudit.resource,{kind:'service',id:'agent-service'});assert.deepEqual(refusedAudit.classes,manualPageClasses);
   assert.deepEqual(refusedAudit.ignored_arguments,['class','confirm','confirmExternal','internal']);
   assert.deepEqual(await snapshot(),before,'Live refusal changes no application record, revision, timeline, manual obligation, paging job or receipt');
   assert.equal((await adopt(policy)).status,200);
   const ready=await snapshot();
   args.expected_revision=ready.application.revision;
   const staleExpected=await tool(name,{...args,expected_revision:args.expected_revision-1,idempotency_key:randomUUID()});
   assert.equal(code(staleExpected),'revision_conflict');assert.deepEqual(await snapshot(),ready);
   const answer=await tool(name,args);
   assert.deepEqual(facts(answer),manualPageClasses);
   assert.equal(answer.decision.disposition,mode==='held'?'approval':'autonomous');
   let pending;
   if(mode==='held'){
    assert.equal(answer.result.resultType,'input_required');
    assert.deepEqual(await snapshot(),ready,'Pending manual page creates no application effect');
    const handle=answer.result._meta['com.runeditrun/approval'];
    assert.equal(new URL(handle.url).origin,runtime.origin);
    const page=await http(new URL(handle.url).pathname);assert.equal(page.status,200);await page.body?.cancel();
    pending=(await read('/agents/api/approvals/'+handle.id)).approval;
    assert.deepEqual(pending.classes,manualPageClasses);assert.deepEqual(pending.summary.nativeTarget,{kind:'service',id:'agent-service'});
    assert.ok(pending.summary.items.some(item=>item.startsWith('Native revision '+ready.application.revision+':')));
    const decision={revision:pending.revision,summary_sha256:pending.summary_sha256};
    assert.equal((await http('/agents/api/approvals/'+handle.id+'/approve',{...decision,summary_sha256:'changed-summary'})).status,409);
    assert.deepEqual(await snapshot(),ready,'Wrong saved summary cannot execute');
    const approval=await http('/agents/api/approvals/'+handle.id+'/approve',decision);
    assert.equal(approval.status,200);assert.equal((await approval.json()).approval.state,'executed');
   }else assert.equal(answer.result?.isError,false,JSON.stringify(answer.body));
   const once=await snapshot(),incident=once.application.incidents.find(row=>row.manualPage?.operation===args.operationId);
   assert.ok(incident);assert.equal(once.application.incidents.length,ready.application.incidents.length+1);
   assert.equal(once.application.revision,ready.application.revision+1);assert.equal(incident.revision,1);
   assert.equal(once.commits.length,ready.commits.length+1);
   assert.equal(incident.manualPage.creator,context.agentId);assert.equal(incident.manualPage.obligations.length,1);
   const obligation=incident.manualPage.obligations[0];
   assert.equal(obligation.state,'recorded');assert.equal(obligation.paging,'off');assert.equal(obligation.automatic,false);assert.equal(obligation.label,'no sender');
   if(target==='user')assert.deepEqual(obligation.target,{kind:'user',id:responder.id});
   else {assert.equal(obligation.target.kind,'policy');assert.equal(obligation.target.id,'agent-service');assert.ok(obligation.target.policyRevision>0);}
   const entry=incident.timeline.filter(row=>row.kind==='manual-page');assert.equal(entry.length,1);
   assert.equal(entry[0].metadata.agent.agent.id,context.agentId);assert.equal(entry[0].metadata.agent.for.id,owner.id);
   if(pending)assert.ok(entry[0].metadata.agent.approvers.some(row=>row.id===owner.id));
   for(const table of Object.keys(ready.records).filter(name=>name.startsWith('paging_')))assert.deepEqual(once.records[table],ready.records[table]);
   const retry=await tool(name,args);assert.equal(retry.result?.isError,false,JSON.stringify(retry.body));
   assert.deepEqual(retry.result.structuredContent,incident);assert.deepEqual(facts(retry),manualPageClasses);
   assert.deepEqual(await snapshot(),once,'Identical retry creates no second recorded operation or application commit');
   assert.equal((await adopt(blocked)).status,200);
   const blockedRetry=await tool(name,args);
   assert.equal(code(blockedRetry),'policy_blocked');assert.deepEqual(facts(blockedRetry),manualPageClasses);
   assert.equal(blockedRetry.result.structuredContent,undefined);assert.deepEqual(await snapshot(),once);

   assert.deepEqual(await runtime.outboundRequests(),[],'Manual recording never attempts provider egress');
   console.log(`PROBE SURFACE-002 8 ${mode} ${target}: emitted MCP manual-page -> standard and live with service agent-service; isolated live block unchanged; ${pending?'exact saved approval, ':''}one attributed recorded obligation, effect-free retry, paging OFF and zero outbound requests`);
  }
 }
 assert.equal((await adopt()).status,200);
 // A paging policy edit is a separate native revision and invalidates a saved page.
 assert.equal((await adopt(heldPolicy())).status,200);
 const staleArgs=manualPageFixture(),stale=await tool(name,staleArgs);
 const handle=stale.result._meta['com.runeditrun/approval'];
 const saved=(await read('/agents/api/approvals/'+handle.id)).approval;
 const changed=await http('/api/paging/policies',{...manualPolicy,primaryWaitSeconds:manualPolicy.primaryWaitSeconds+1});
 assert.equal(changed.status,200);await changed.json();
 const afterPolicy=await snapshot();
 const approval=await http('/agents/api/approvals/'+handle.id+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256});
 assert.equal(approval.status,200);const staleResult=(await approval.json()).approval;
 assert.equal(staleResult.state,'refused');assert.equal(staleResult.code,'approval_evidence_changed');
 assert.deepEqual(await snapshot(),afterPolicy,'Changed paging custody cannot execute the old approved operation');
 assert.equal((await adopt()).status,200);
 const cross=manualPageFixture();cross.policy='agent-foreign-service';
 const crossBefore=await snapshot(),crossPage=await tool(name,cross);
 assert.equal(crossPage.result?.isError,false,JSON.stringify(crossPage.body));
 assert.deepEqual(facts(crossPage),[{class:'standard',facts:{measure:1}},{class:'live',facts:{measure:1,service:'agent-foreign-service, agent-service'}}]);
 assert.equal(crossPage.result.structuredContent.manualPage.obligations[0].target.id,'agent-foreign-service');
 assert.equal((await snapshot()).application.revision,crossBefore.application.revision+1);
 console.log('PROBE SURFACE-002 8 custody: saved policy revision changed -> approval_evidence_changed without an application effect; authorized cross-service policy -> live facts include both affected services');
 const args=manualPageFixture(responder.id,'Synthetic authority refusals'),before=await snapshot();
 assert.equal(code(await tool(name,args,{scope:'incidents:read'})),'insufficient_scope');
 assert.equal(code(await tool(name,{...args,users:['synthetic-oncall-absent']})),'native_request_invalid');
 assert.equal(code(await tool(name,{...args,users:undefined,policy:'synthetic-oncall-absent'})),'native_request_invalid');
 assert.deepEqual(await snapshot(),before);
 await db.exec("CREATE TRIGGER synthetic_manual_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.outcome='accepted' AND NEW.workspace_after>NEW.workspace_before BEGIN SELECT RAISE(ABORT,'synthetic-oncall-manual-audit'); END");
 try{
  const failed=await tool(name,{...args,idempotency_key:randomUUID()});
  assert.ok(failed.result?.isError||failed.body?.error,'Permanent audit failure refuses the operation');
  assert.equal(failed.result?.structuredContent,undefined);
  assert.deepEqual(await snapshot(),before,'Permanent audit failure rolls back the incident and all recorded obligations');
 }finally{await db.exec('DROP TRIGGER synthetic_manual_audit');}
 // Native service-account scope must also cover a policy's service.
 const credential='synthetic-oncall-manual-client-credential-material';
 const clientResponse=await http('/api/automation/clients',{name:'Synthetic scoped manual writer',key:credential,services:['agent-service'],permissions:['incidents:write']});
 assert.equal(clientResponse.status,201);const client=await clientResponse.json();
 const nativeBefore=await snapshot();
 const scoped=await tool(name,{...manualPageFixture(),policy:'agent-foreign-service'},{},credential);
 assert.equal(code(scoped),'not_found');assert.deepEqual(await snapshot(),nativeBefore);
 // A named user also carries its configured escalation policy in recorded custody.
 const assignment=await http('/api/command',{type:'user-assignment',service:'agent-service',baseVersion:0,mode:'escalate',minutes:10,policy:'agent-foreign-service'});
 assert.equal(assignment.status,200);await assignment.body.cancel();
 const assignedBefore=await snapshot(),assignedArgs=manualPageFixture(responder.id,'Synthetic cross-service assignment');
 const assignedRefusal=await tool(name,assignedArgs,{},credential);
 assert.equal(code(assignedRefusal),'not_found');assert.deepEqual(await snapshot(),assignedBefore);
 const assigned=await tool(name,assignedArgs);
 assert.equal(assigned.result?.isError,false,JSON.stringify(assigned.body));
 assert.deepEqual(facts(assigned),[{class:'standard',facts:{measure:1}},{class:'live',facts:{measure:1,service:'agent-foreign-service, agent-service'}}]);
 assert.equal(assigned.result.structuredContent.manualPage.obligations[0].assignment.policy,'agent-foreign-service');
 const reset=await http('/api/command',{type:'user-assignment',service:'agent-service',baseVersion:1,mode:'escalate',minutes:10,policy:'agent-service'});
 assert.equal(reset.status,200);await reset.body.cancel();
 const clientArgs=manualPageFixture(responder.id,'Synthetic native client manual custody');
 const clientPage=await tool(name,clientArgs,{},credential);
 assert.equal(clientPage.result?.isError,false,JSON.stringify(clientPage.body));assert.deepEqual(facts(clientPage),manualPageClasses);
 const revoked=await http('/api/automation/clients/'+client.id+'/revoke',{revision:client.revision});
 assert.equal(revoked.status,200);await revoked.body.cancel();
 const revokedBefore=await snapshot(),revokedReplay=await tool(name,clientArgs,{},credential);
 assert.equal(revokedReplay.status,401);assert.equal(revokedReplay.result?.structuredContent,undefined);
 assert.deepEqual(await snapshot(),revokedBefore,'Revoked client cannot recover or repeat its recorded manual operation');


 const authorityPassword='synthetic-oncall-manual-authority-password';
 const authorityResponse=await http('/api/members',{name:'Synthetic manual authority administrator',role:'admin',password:authorityPassword});
 assert.equal(authorityResponse.status,201);const authority=await authorityResponse.json();
 const login=await http('/api/login',{name:authority.name,password:authorityPassword});assert.equal(login.status,200);
 const authorityCookie=login.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');await login.body?.cancel();
 assert.equal((await http('/api/command',{type:'member',id:owner.id,role:'viewer',active:true})).status,200);
 const demotedBefore=await snapshot(),demoted=await tool(name,manualPageFixture(responder.id));
 assert.equal(demoted.status,401);assert.equal(demoted.result?.structuredContent,undefined);
 assert.deepEqual(await snapshot(),demotedBefore);
 const restored=await runtime.request(runtime.origin+'/api/command',{method:'POST',headers:{Origin:runtime.origin,Cookie:authorityCookie,'Content-Type':'application/json'},body:JSON.stringify({type:'member',id:owner.id,role:'admin',active:true})});
 assert.equal(restored.status,200);await restored.body?.cancel();
 assert.deepEqual(await runtime.outboundRequests(),[]);
 console.log('PROBE SURFACE-002 8 refusals: nonpaging control retained sensitive without live; missing scope, unknown responder or policy, foreign policy scope and sponsor demotion refused; permanent-audit failure rolled back; zero outbound requests');
}

export async function deadlineClassification(runtime) {
 const {tool,http,adopt}=runtime;
 const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
 const owner=(await (await http('/api/workspace')).json()).member;
 // Recorded deadlines change re-trigger timing even while paging remains OFF.
 {
 const name='oncall.incidents.update';
 const classes=answer=>answer.decision?.classes.map(({class:cls,facts})=>({class:cls,facts}));
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const rows=async sql=>(await runtime.db.prepare(sql).all()).results;
 const custody=async()=>({
  application:await read('/api/state'),paging:await read('/api/paging/state'),
  deadlines:await rows('SELECT * FROM oc_agent_deadlines ORDER BY deadline'),
  pagingControl:await rows('SELECT * FROM paging_control ORDER BY id'),
  jobs:await rows('SELECT * FROM paging_jobs ORDER BY id'),receipts:await rows('SELECT * FROM paging_receipts ORDER BY id'),
  commits:await rows("SELECT * FROM oc_admin_audit WHERE outcome='accepted' AND (workspace_before<>workspace_after OR paging_before<>paging_after OR handoff_before<>handoff_after) ORDER BY ordinal"),
 });
 const foreignKey=randomBytes(32).toString('hex');
 const foreignClient=await http('/api/automation/clients',{name:'Synthetic foreign deadline client',key:foreignKey,services:['agent-foreign-service'],permissions:['incidents:write']});
 assert.equal(foreignClient.status,201);await foreignClient.body.cancel();
 const expected=[{class:'standard',facts:{measure:1}},{class:'sensitive',facts:{measure:2,kind:'personal_or_incident_evidence'}},{class:'live',facts:{measure:1,service:'agent-service'}}];
 for(const mode of ['autonomous','held'])for(const change of ['snooze','cancel-deadline','expire-deadline']){
  await runtime.time(Date.parse('2026-11-04T12:00:00.000Z'));
  assert.equal((await adopt()).status,200);
  const {incident,deadline,args}=await deadlineTarget(runtime,change,mode+' '+change);
  if(change==='expire-deadline'){
   const beforeDue=await custody();
   assert.equal(code(await tool(name,args)),'revision_conflict','A not-yet-due deadline is not executable');
   assert.deepEqual(await custody(),beforeDue);
   await runtime.time(Date.parse(deadline.dueAt)+1);
  }
  const before=await custody();
  const blocked=autonomousPolicy();blocked.rules.unshift({id:'stop-deadline-live',class:'live',do:'blocked'});
  assert.equal((await adopt(blocked)).status,200);
  for(const inject of [false,true]){
   const answer=await tool(name,{...args,idempotency_key:randomUUID(),...(inject?{class:'standard',classes:['standard'],service:'agent-foreign-service',internal:true,confirm:true}:{})});
   assert.equal(code(answer),'policy_blocked');assert.deepEqual(classes(answer),expected);
   assert.equal(answer.decision.classes.find(row=>row.class==='live').do,'blocked');
   assert.ok(answer.decision.classes.filter(row=>row.class!=='live').every(row=>row.do==='autonomous'));
   assert.equal(answer.result.structuredContent,undefined);
   assert.deepEqual(await custody(),before,'Live-only refusal changes no application, deadline or paging custody');
  }
  assert.equal((await adopt()).status,200);
  const stale=await tool(name,{...args,revision:args.revision-1,idempotency_key:randomUUID()});
  assert.equal(code(stale),'revision_conflict');assert.deepEqual(await custody(),before);
  if(change==='expire-deadline'){
   const missing=await tool(name,{...args,deadline:before.deadlines.find(row=>row.deadline!==deadline.id).deadline,idempotency_key:randomUUID()});
   assert.equal(code(missing),'not_found');assert.deepEqual(await custody(),before);
   const foreign=await tool(name,{...args,idempotency_key:randomUUID()},{act:{sub:'synthetic-oncall-foreign-agent',name:'Foreign agent',specialist:'oncall-responder'}});
   assert.equal(code(foreign),'native_authority_required');assert.equal(foreign.result.structuredContent,undefined);
   assert.deepEqual(await custody(),before,'Another agent cannot expire the retained deadline');
  }
  const outside=await tool(name,{...args,idempotency_key:randomUUID()},{},foreignKey);
  assert.equal(code(outside),'not_found');assert.equal(outside.result.structuredContent,undefined);assert.deepEqual(await custody(),before);
  const insufficient=await tool(name,{...args,idempotency_key:randomUUID()},{scope:'incidents:read'});
  assert.equal(code(insufficient),'insufficient_scope');assert.deepEqual(await custody(),before);
  // Permanent audit is part of the same D1 transaction as the deadline change.
  await runtime.db.exec("CREATE TRIGGER refuse_deadline_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.workspace_before<>NEW.workspace_after BEGIN SELECT RAISE(ABORT,'synthetic permanent audit unavailable'); END");
  try{
   const failed=await tool(name,{...args,idempotency_key:randomUUID()});
   assert.ok(failed.result?.isError||failed.body.error,'Permanent audit failure must refuse');
   assert.equal(failed.result?.structuredContent,undefined);
   assert.deepEqual(await custody(),before,'Permanent audit failure rolls back the entire deadline effect');
  }finally{await runtime.db.exec('DROP TRIGGER refuse_deadline_audit')}
  const policy=mode==='held'?heldPolicy():autonomousPolicy();
  assert.equal((await adopt(policy)).status,200);
  const answer=await tool(name,args);
  assert.deepEqual(classes(answer),expected);
  assert.equal(answer.decision.disposition,mode==='held'?'approval':'autonomous');
  if(mode==='held'){
   assert.equal(answer.result.resultType,'input_required');assert.deepEqual(await custody(),before);
   const handle=answer.result._meta['com.runeditrun/approval'];
   assert.equal(new URL(handle.url).origin,runtime.origin);
   const page=await http(new URL(handle.url).pathname);assert.equal(page.status,200);await page.body.cancel();
   const saved=(await read('/agents/api/approvals/'+handle.id)).approval;
   assert.equal(saved.revision,runtime.context.revision);
   assert.deepEqual(saved.summary.nativeTarget,{kind:'incident',id:incident.id});
   assert.ok(saved.summary.items.includes({snooze:'Record a snooze; paging OFF','cancel-deadline':'Cancel pending re-trigger deadlines; paging OFF','expire-deadline':'Record due re-trigger expiry; paging OFF'}[change]));
   assert.deepEqual(saved.classes,expected);
   assert.equal((await http('/agents/api/approvals/'+handle.id+'/approve',{revision:saved.revision,summary_sha256:'changed-summary'})).status,409);
   assert.deepEqual(await custody(),before);
   const approve=await http('/agents/api/approvals/'+handle.id+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256});
   assert.equal(approve.status,200);assert.equal((await approve.json()).approval.state,'executed');
   const executed=(await read('/agents/api/approvals/'+handle.id)).approval;
   assert.equal(executed.revision,saved.revision);assert.equal(executed.summary_sha256,saved.summary_sha256);
  }else assert.equal(answer.result.isError,false,JSON.stringify(answer.body));
  const once=await custody(),saved=once.application.incidents.find(row=>row.id===incident.id);
  assert.equal(once.application.revision,before.application.revision+1);
  assert.equal(once.commits.length,before.commits.length+1,'Exactly one state-changing permanent audit commit');
  assert.deepEqual(once.paging,{...before.paging,workspaceRevision:before.application.revision+1});assert.deepEqual(once.pagingControl,before.pagingControl);
  assert.deepEqual(once.jobs,before.jobs);assert.deepEqual(once.receipts,before.receipts);
  const entries=saved.timeline.filter(row=>!incident.timeline.some(prior=>prior.id===row.id));
  assert.ok(entries.length>0);
  for(const row of entries){
   assert.equal(row.metadata.agent.agent.id,runtime.context.agentId);
   assert.equal(row.metadata.agent.for.id,owner.id);
   assert.equal(row.metadata.agent.approvers.some(person=>person.id===owner.id),mode==='held');
  }
  if(change==='snooze'){
   const pending=saved.deadlines.filter(row=>row.state==='pending');assert.equal(pending.length,1);
   assert.equal(pending[0].minutes,5);assert.equal(Date.parse(pending[0].dueAt)-Date.parse(pending[0].createdAt),300000);
   assert.equal(once.deadlines.length,before.deadlines.length+1);
  }else if(change==='cancel-deadline'){
   assert.equal(saved.deadlines.find(row=>row.id===deadline.id).state,'cancelled');
   assert.ok(!saved.deadlines.some(row=>row.state==='pending'||row.obligation?.state==='recorded'));
  }else{
   const fired=saved.deadlines.find(row=>row.id===deadline.id);
   assert.equal(fired.state,'fired');assert.equal(fired.obligation.state,'recorded');
   assert.equal(fired.obligation.paging,'off');assert.equal(fired.obligation.automatic,false);
   assert.equal(fired.obligation.target.id,incident.assignee);
   assert.equal(saved.state,'declared');
   assert.equal(saved.timeline.filter(row=>row.id==='deadline-fired:'+deadline.id).length,1);
  }
  const retry=await tool(name,args);assert.equal(retry.result?.isError,false,JSON.stringify(retry.body));
  assert.deepEqual(classes(retry),expected);
  assert.deepEqual(retry.result.structuredContent,saved);
  assert.deepEqual(await custody(),once,'Identical retry creates no second deadline, obligation or application audit commit');
  const row=await decisionAudit(runtime,answer.decision.id);
  assert.deepEqual(row.classes,expected);
  assert.deepEqual(await runtime.outboundRequests(),[],'Deadline changes attempt zero outbound requests');
  assert.equal((await adopt(blocked)).status,200);
  const stoppedReplay=await tool(name,args);
  assert.equal(code(stoppedReplay),'policy_blocked');assert.deepEqual(classes(stoppedReplay),expected);
  assert.equal(stoppedReplay.result.structuredContent,undefined);assert.deepEqual(await custody(),once);
  console.log('PROBE SURFACE-002 acceptance 8 '+mode+' '+change+': emitted MCP -> standard, sensitive and live for validated agent-service; live-only policy refusal, stale and scope refusals, permanent-audit rollback, '+(mode==='held'?'no-effect pending and exact saved signed-in approval; ':'')+'one attributed recorded effect, identical retry and zero outbound requests');
 }

 // A paging-only edit leaves incident revision intact but invalidates the held evidence.
 for(const change of ['snooze','cancel-deadline','expire-deadline']){
  await runtime.time(Date.parse('2026-11-04T12:00:00.000Z'));
  assert.equal((await adopt()).status,200);
  const {deadline,args}=await deadlineTarget(runtime,change,'stale paging '+change);
  if(change==='expire-deadline')await runtime.time(Date.parse(deadline.dueAt)+1);
  assert.equal((await adopt(heldPolicy())).status,200);
  const pending=await tool(name,args);
  assert.equal(pending.result?.resultType,'input_required');
  const handle=pending.result._meta['com.runeditrun/approval'];
  const saved=(await read('/agents/api/approvals/'+handle.id)).approval;
  const policy=(await read('/api/paging/state')).policies.find(row=>row.service==='agent-service');
  assert.ok(saved.summary.items.some(item=>item.startsWith('Paging revision ')));
  const changed=await http('/api/paging/policies',{...policy,primaryWaitSeconds:policy.primaryWaitSeconds+1});
  assert.equal(changed.status,200);await changed.body.cancel();
  const before=await custody();
  const approved=await http('/agents/api/approvals/'+handle.id+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256});
  assert.equal(approved.status,200);
  const refused=(await approved.json()).approval;
  assert.equal(refused.state,'refused');assert.equal(refused.code,'approval_evidence_changed');
  assert.deepEqual(await custody(),before,'Stale paging evidence cannot execute a held deadline change');
 }
 console.log('PROBE SURFACE-002 acceptance 8 saved paging custody: all three held deadline changes refuse after a paging-only revision without a native effect');
 await runtime.time(null);
 assert.equal((await adopt()).status,200);
 }

}
