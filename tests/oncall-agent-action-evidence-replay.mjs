import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentRuntime,agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Evidence-policy completion occurs once; exact replay cannot replace its evidence. */
export async function actionEvidenceReplay(runtime,{approve,observe=async()=>{}}={}){
 const {db,http,tool,completeResource,context}=runtime,name='oncall.actions.submit';
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
 const snapshot=()=>agentEffectSnapshot(runtime),audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const permanent=()=>rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const owner=(await read('/api/workspace')).member;
 const responder=(await read('/api/state')).members.find(row=>row.active&&row.role==='responder');
 assert.ok(responder);assert.notEqual(owner.id,responder.id);
 const classes=[{class:'standard',facts:{measure:1}},{class:'sensitive',facts:{measure:1,kind:'personal_or_incident_evidence'}}];
 async function bookkeeping(prior){
  const after=await permanent();assert.deepEqual(after.slice(0,prior.length),prior);
  for(const row of after.slice(prior.length)){
   assert.equal(row.kind,'agent-door.persistence');assert.ok(['accepted','refused'].includes(row.outcome));
   for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after']);
  }
 }
 async function approveSaved({handle,saved,owner,mode,kind,revisionCase}){
  const url=new URL(handle.url);
  assert.equal(url.origin,runtime.origin);assert.equal(url.pathname,'/agents/approvals/'+handle.id);
  if(approve)await approve({handle,saved,owner,mode,kind,revisionCase});
  else{
   const page=await http(url.pathname);assert.equal(page.status,200);await page.body.cancel();
   const response=await http('/agents/api/approvals/'+handle.id+'/approve',{
    revision:saved.revision,summary_sha256:saved.summary_sha256});
   assert.equal(response.status,200);assert.equal((await response.json()).approval.state,'executed');
  }
 }
 async function exercise(mode,revisionCase){
  const label=revisionCase?mode+' '+revisionCase+' revision':mode;
  let incident=await command({type:'declare',service:'agent-service',title:'Synthetic evidence completion replay '+label,
   summary:'Ordinary coordination without protected evidence',severity:'warning',alerts:[]});
  incident=await command({type:'action',incident:incident.id,revision:incident.revision,title:'Synthetic companion follow-up',
   owner:owner.id,due:'2027-04-13',priority:'P3',completionPolicy:'human-review'});
  const staleRevision=incident.revision;
  incident=await command({type:'action',incident:incident.id,revision:incident.revision,title:'Synthetic evidence policy follow-up',
   owner:responder.id,escalationRecipient:owner.id,due:'2027-04-12',priority:'P2',completionPolicy:'evidence'});
  const action=incident.actions.at(-1);
  assert.equal(action.owner,responder.id);assert.equal(action.due,'2027-04-12');
  assert.equal(action.priority,'P2');assert.equal(action.completionPolicy,'evidence');
  assert.equal(action.escalationRecipient,owner.id);assert.notEqual(action.escalationRecipient,action.owner);
  assert.equal(incident.recovery,'');assert.deepEqual(incident.alerts,[]);
  assert.equal(action.done,false);assert.equal(action.evidence,'');assert.equal(action.submission,undefined);assert.equal(action.accepted,undefined);
  const args={incident:incident.id,revision:incident.revision,action:action.id,
   evidence:'https://evidence.example.invalid/synthetic-oncall-evidence-original',idempotency_key:randomUUID()};
  const before=await snapshot();
  if(revisionCase){
   const staleArgs={...args,idempotency_key:randomUUID()};
   if(revisionCase==='optional')staleArgs.expected_revision=staleRevision;
   else staleArgs.revision=staleRevision;
   assert.notEqual(staleArgs.idempotency_key,args.idempotency_key);
   assert.notEqual(before.application.revision,incident.revision,'The authorized parent revision differs from the workspace revision');
   assert.ok(before.records.agent_door_calls.some(row=>row.agent===context.agentId&&row.outcome),'The fixture already has an original outcome to preserve');
   const auditBefore=await audits(),permanentBefore=await permanent();
   const refused=await tool(name,staleArgs);
   const expected={code:'revision_conflict',current_revision:incident.revision};
   assert.equal(refused.status,200);assert.equal(refused.body.error,undefined);
   assert.equal(refused.result.isError,true);
   assert.deepEqual(refused.result._meta['com.runeditrun/error'],expected);
   assert.equal(refused.result.content.length,1);
   assert.equal(refused.result.content[0].type,'text');
   assert.deepEqual(JSON.parse(refused.result.content[0].text),expected);
   assert.equal(refused.result.structuredContent,undefined);
   assert.equal(refused.result._meta['com.runeditrun/approval'],undefined);
   assert.equal(refused.result._meta['com.runeditrun/review'],undefined);
   assert.deepEqual(await snapshot(),before,'Stale submission preserves native records, revisions, timeline, state-changing audit, calls and outcomes, approvals, reviews and paging');
   const afterAudit=await audits();
   assert.deepEqual(afterAudit.slice(0,-1),auditBefore);assert.equal(afterAudit.length,auditBefore.length+1);
   const refusal=JSON.parse(afterAudit.at(-1).row);
   assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,'revision_conflict');
   assert.equal(refusal.agent.id,context.agentId);assert.equal(refusal.sponsor.id,owner.id);
   assert.equal(refusal.idempotency_key,staleArgs.idempotency_key);assert.equal(refusal.approval,null);assert.equal(refusal.review,null);
   await bookkeeping(permanentBefore);
   assert.deepEqual(await runtime.outboundRequests(),[],'Revision refusal makes no outbound request');
   const currentRevision=refused.result._meta['com.runeditrun/error'].current_revision;
   args.revision=currentRevision;
   if(revisionCase==='optional')args.expected_revision=currentRevision;
  }
  const priorAudit=await audits();
  const first=await tool(name,args);
  assert.equal(first.status,200);assert.equal(first.body.error,undefined);
  assert.deepEqual(first.decision.classes.map(({class:cls,facts})=>({class:cls,facts})),classes);
  assert.equal(first.decision.disposition,mode==='held'?'approval':'autonomous');
  let handle,savedApproval;
  if(mode==='held'){
   assert.equal(first.result.resultType,'input_required');assert.equal(first.result.structuredContent,undefined);
   const pending=await snapshot();assert.deepEqual(pending.application,before.application);
   for(const table of Object.keys(before.records).filter(table=>/^(oc_|paging_|workspace_)/.test(table)))
    assert.deepEqual(pending.records[table],before.records[table],'Pending approval preserves native '+table);
   assert.equal(pending.records.agent_door_approvals.length,before.records.agent_door_approvals.length+1);
   assert.deepEqual(pending.records.agent_door_reviews,before.records.agent_door_reviews);
   handle=first.result._meta['com.runeditrun/approval'];assert.ok(handle);
   const url=new URL(handle.url);assert.equal(url.origin,runtime.origin);assert.equal(url.pathname,'/agents/approvals/'+handle.id);
   savedApproval=(await read('/agents/api/approvals/'+handle.id)).approval;
   assert.equal(savedApproval.state,'pending');assert.equal(savedApproval.decision_id,first.decision.id);
   assert.equal(savedApproval.revision,context.revision);assert.match(savedApproval.summary_sha256,/^[a-f0-9]{64}$/);
   assert.deepEqual(savedApproval.classes,classes);assert.deepEqual(savedApproval.approvers,['sponsor']);
   assert.equal(savedApproval.prepared_by.for.id,owner.id);assert.equal(savedApproval.prepared_by.agent.id,context.agentId);
   assert.deepEqual(savedApproval.summary.nativeTarget,{kind:'incident',id:incident.id});
   assert.ok(savedApproval.summary.items.includes('Revision '+args.revision));
   assert.ok(savedApproval.summary.items.includes('evidence: '+args.evidence));
   await approveSaved({handle,saved:savedApproval,owner,mode,kind:'write',revisionCase});
  }else assert.equal(first.result.isError,false);
  const once=await snapshot();
  const retained=once.records.agent_door_calls.filter(row=>row.agent===context.agentId&&row.key===args.idempotency_key);
  assert.equal(retained.length,1);const [call]=retained,saved=JSON.parse(call.outcome),result=saved.result;
  assert.equal(call.state,'done');assert.equal(saved.outcome,'done');assert.equal(call.decision_id,first.decision.id);
  assert.equal(saved.decision.id,first.decision.id);
  assert.deepEqual(saved.decision.classes.map(({class:cls,facts})=>({class:cls,facts})),classes);
  assert.equal(result.revision,incident.revision+1);assert.equal(result.timeline.length,incident.timeline.length+1);
  assert.deepEqual(result.timeline.slice(0,-1),incident.timeline);
  const completed={...action,done:true,evidence:args.evidence,
   submission:{by:context.agentId,at:result.timeline.at(-1).at,evidence:args.evidence},
   accepted:{by:context.agentId,at:result.timeline.at(-1).at}};
  assert.deepEqual(result.actions,incident.actions.map(row=>row.id===action.id?completed:row),
   'Evidence completion retains owner, due date, policy, escalation contact and companion fields');
  assert.equal(result.actions.filter(row=>row.done).length,1);
  assert.equal(result.timeline.filter(row=>row.kind==='complete').length,1);
  const entry=result.timeline.at(-1);
  assert.equal(entry.kind,'complete');assert.equal(entry.actor,context.agentId);
  assert.equal(entry.metadata.agent.agent.id,context.agentId);assert.equal(entry.metadata.agent.for.id,owner.id);
  assert.equal(entry.text,'Completed under evidence policy: '+action.title+' — '+args.evidence);
  assert.deepEqual(entry.metadata.agent.approvers,mode==='held'?[{id:owner.id,name:owner.name}]:[]);
  assert.deepEqual(result,{...incident,actions:result.actions,revision:incident.revision+1,timeline:result.timeline});
  assert.deepEqual(once.application,{...before.application,revision:before.application.revision+1,
   incidents:before.application.incidents.map(row=>row.id===incident.id?result:row),apiOutbox:once.application.apiOutbox});
  assert.deepEqual(JSON.parse(once.records.oc_incidents.find(row=>row.id===incident.id).data),result);
  assert.equal(once.records.workspace_control[0].revision,before.records.workspace_control[0].revision+1);
  const commits=once.records.oc_admin_audit.filter(row=>!before.records.oc_admin_audit.some(prior=>prior.id===row.id));
  assert.equal(commits.length,1);assert.equal(commits[0].kind,'actions.submit');assert.equal(commits[0].outcome,'accepted');
  assert.equal(commits[0].workspace_before,before.application.revision);assert.equal(commits[0].workspace_after,once.application.revision);
  for(const family of ['paging','handoff'])assert.equal(commits[0][family+'_before'],commits[0][family+'_after']);
  assert.equal(once.records.agent_door_calls.length,before.records.agent_door_calls.length+1);
  assert.deepEqual(once.records.agent_door_reviews,before.records.agent_door_reviews,'Sensitive held execution adds an approval, never a second standard review');
  assert.equal(once.records.agent_door_approvals.length,before.records.agent_door_approvals.length+Number(mode==='held'));
  for(const table of Object.keys(before.records).filter(table=>table.startsWith('paging_')))assert.deepEqual(once.records[table],before.records[table]);
  if(mode==='held'){
   const approval=once.records.agent_door_approvals.find(row=>row.id===handle.id);
   assert.equal(approval.state,'executed');assert.deepEqual(JSON.parse(approval.result),saved);
   assert.deepEqual(JSON.parse(approval.approvals).map(row=>({person:row.person,ref:row.ref})),[{person:owner.id,ref:'sponsor'}]);
   assert.equal(saved.approval.id,handle.id);assert.equal(saved.receipt.approval_id,handle.id);
   assert.equal(saved.receipt.decision_id,first.decision.id);assert.deepEqual(saved.receipt.approved_by,[owner.id]);
   assert.equal(saved.receipt.prepared_by.agent.id,context.agentId);assert.equal(saved.receipt.prepared_by.for.id,owner.id);
  }else{assert.deepEqual(first.result.structuredContent,result);assert.equal(saved.approval,undefined);assert.equal(saved.receipt,undefined)}
  const committedAudit=await audits();assert.deepEqual(committedAudit.slice(0,priorAudit.length),priorAudit);
  const original=JSON.parse(committedAudit.find(row=>row.id===call.decision_id).row);
  assert.equal(original.tool,name);assert.equal(original.outcome,mode==='held'?'pending':'done');
  assert.equal(original.replay_of,null);assert.equal(original.idempotency_key,args.idempotency_key);
  if(mode==='held'){
   const execution=JSON.parse(committedAudit.find(row=>row.id===saved.execution_id).row);
   assert.equal(execution.outcome,'done');assert.deepEqual(execution.approval,{id:handle.id,by:[owner.id]});
  }
  if(revisionCase){
   await observe({mode,revisionCase,incident:result,action:result.actions.find(row=>row.id===action.id),handle,saved:savedApproval});
   assert.deepEqual(await snapshot(),once,'Reading the saved follow-up leaves the retained outcome unchanged');
   assert.deepEqual(await runtime.outboundRequests(),[],'Submission, approval and readback never fetch evidence or send requests');
   const input=revisionCase==='optional'?'current required revision with stale expected_revision':'stale required revision with expected_revision absent';
   console.log('PROBE BASE-AGENT-012 acceptance 4 '+label+' oncall.actions.submit: '+input+' -> isError revision_conflict, exact parent current_revision '+incident.revision+' in metadata and text, no private result or native effect; fresh corrected call completes one P2 follow-up with agent submission and acceptance attribution '+(mode==='held'?'after exact sponsor approval':'autonomously')+'; zero outbound requests');
   return;
  }
  async function replay(previous){
   const auditBefore=await audits(),permanentBefore=await permanent();
   const retry=await tool(name,args);
   assert.equal(retry.status,200);assert.equal(retry.body.error,undefined);assert.notEqual(retry.body.id,first.body.id);if(previous)assert.notEqual(retry.body.id,previous.body.id);
   assert.equal(retry.result.isError,false);assert.deepEqual(retry.result.structuredContent,saved.result);
   assert.deepEqual(JSON.parse(retry.result.content[0].text),saved.result);
   assert.deepEqual(retry.result._meta['com.runeditrun/receipt'],saved.receipt?{...saved.receipt,decision:saved.decision}:undefined);assert.deepEqual(retry.result._meta['com.runeditrun/review'],saved.review);
   assert.deepEqual(retry.decision.classes,saved.decision.classes);
   assert.deepEqual(await snapshot(),once,'Exact retry retains all native records, revisions, timeline, permanent state-changing audit, original call and expiry, approval identity, reviews and paging');
   const afterAudit=await audits();assert.deepEqual(afterAudit.slice(0,-1),auditBefore);assert.equal(afterAudit.length,auditBefore.length+1);
   const attempt=JSON.parse(afterAudit.at(-1).row);
   assert.equal(attempt.id,retry.decision.id);assert.equal(attempt.tool,name);assert.equal(attempt.outcome,'replayed');
   assert.equal(attempt.replay_of,call.decision_id);assert.equal(attempt.operation_id,original.operation_id);
   assert.equal(attempt.agent.id,context.agentId);assert.equal(attempt.sponsor.id,owner.id);
   assert.equal(attempt.idempotency_key,args.idempotency_key);await bookkeeping(permanentBefore);
   return retry;
  }
  const immediate=await replay();
  const changed={...args,evidence:'https://evidence.example.invalid/synthetic-oncall-evidence-changed'};
  assert.deepEqual({...changed,evidence:args.evidence},args,'Only the schema-valid evidence URL changes');
  const auditBefore=await audits(),permanentBefore=await permanent();
  const conflict=await tool(name,changed),expected={code:'idempotency_conflict'};
  assert.equal(conflict.status,200);assert.equal(conflict.body.error,undefined);assert.notEqual(conflict.body.id,first.body.id);
  assert.equal(conflict.result.isError,true);assert.deepEqual(conflict.result._meta['com.runeditrun/error'],expected);
  assert.deepEqual(JSON.parse(conflict.result.content[0].text),expected);assert.equal(conflict.result.structuredContent,undefined);
  assert.deepEqual(await snapshot(),once,'Conflict preserves native effects, original outcome, approvals, reviews and paging');
  const afterAudit=await audits();assert.deepEqual(afterAudit.slice(0,-1),auditBefore);assert.equal(afterAudit.length,auditBefore.length+1);
  const refusal=JSON.parse(afterAudit.at(-1).row);
  assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,'idempotency_conflict');
  assert.equal(refusal.agent.id,context.agentId);assert.equal(refusal.sponsor.id,owner.id);
  assert.equal(refusal.idempotency_key,args.idempotency_key);assert.equal(refusal.approval,null);assert.equal(refusal.review,null);
  await bookkeeping(permanentBefore);
  await replay(conflict);assert.notEqual(immediate.body.id,conflict.body.id);
  assert.deepEqual(await runtime.outboundRequests(),[],'Submission, approval, conflict and retry never fetch evidence or send requests');
  // The held write first returns its completed result on the immediate MCP retry.
  const completedWrite=mode==='held'?immediate:first;
  const links=completedWrite.result.content.filter(row=>row.type==='resource_link');
  assert.equal(links.length,1);
  const [link]=links,readMethod=['resources','read'].join('/');
  assert.equal(link.uri,'oncall://incidents/'+incident.id);
  const pagingBefore=await read('/api/paging/state'),readAuditBefore=await audits(),readPermanentBefore=await permanent();
  assert.equal(pagingBefore.paging,'OFF');
  let readApprovalId;
  function assertReadPreserved(after){
   const readCustody=['agent_door_approvals','agent_door_events','agent_door_usage'];
   assert.deepEqual(after.application,once.application,'Resource read preserves all native state and revisions');
   for(const [table,records] of Object.entries(once.records)){
    if(!readCustody.includes(table))assert.deepEqual(after.records[table],records,'Resource read preserves '+table);
   }
   const approvals=after.records.agent_door_approvals;
   assert.deepEqual(approvals.filter(row=>row.id!==readApprovalId),once.records.agent_door_approvals,
    'Resource read preserves the original write approval and its result and receipt');
   return approvals.find(row=>row.id===readApprovalId);
  }
  const {initial,answer,content,value}=await completeResource(link.uri,{async approve({initial,handle:readHandle,saved:pending}){
   assert.equal(mode,'held');
   assert.equal(initial.status,200);assert.equal(initial.body.error.data.code,'approval_required');
   assert.equal(initial.result,undefined);
   assert.ok(!JSON.stringify(initial.body.error).includes(args.evidence),'Pending resource read withholds evidence');
   assert.notEqual(readHandle.id,handle.id);
   readApprovalId=readHandle.id;
   assert.equal(pending.state,'pending');assert.equal(pending.tool,readMethod);assert.equal(pending.summary.uri,link.uri);
   assert.deepEqual(pending.approvers,['sponsor']);
   assert.equal(pending.prepared_by.agent.id,context.agentId);assert.equal(pending.prepared_by.for.id,owner.id);
   const pendingRead=assertReadPreserved(await snapshot());
   assert.equal(pendingRead.state,'pending');assert.equal(pendingRead.result,null);
   assert.deepEqual(await read('/api/paging/state'),pagingBefore);
   await approveSaved({handle:readHandle,saved:pending,owner,mode,kind:'read'});
  }});
  assert.equal(content.uri,link.uri);
  assert.deepEqual(value,completedWrite.result.structuredContent,'The actual link returns the complete incident from the write');
  assert.deepEqual(value,(await read('/api/state')).incidents.find(row=>row.id===incident.id),
   'MCP returns the same complete incident as the sponsor sees, including the new revision, companion and attribution');
  assert.equal(initial.decision.revision,context.revision);
  assert.notEqual(initial.decision.id,first.decision.id);
  assert.deepEqual(initial.decision.classes.map(row=>row.class),['standard','sensitive']);
  assert.equal(initial.decision.disposition,mode==='held'?'approval':'autonomous');
  assert.equal(answer.decision.disposition,initial.decision.disposition);
  assert.equal(answer.result._meta['com.runeditrun/review'],undefined);
  const afterRead=await snapshot(),readApproval=assertReadPreserved(afterRead);
  if(mode==='held'){
   assert.notEqual(initial,answer);
   assert.equal(readApproval.state,'executed');
   const outcome=JSON.parse(readApproval.result);
   assert.equal(outcome.receipt.decision_id,initial.decision.id);assert.equal(outcome.receipt.approval_id,readApprovalId);
   assert.deepEqual(outcome.receipt.approved_by,[owner.id]);
   assert.deepEqual(outcome.result.contents,[content]);
  }else{
   assert.equal(initial,answer);assert.equal(readApproval,undefined);
  }
  const readAuditAfter=await audits();
  assert.deepEqual(readAuditAfter.slice(0,readAuditBefore.length),readAuditBefore,'The original write audit is unchanged');
  const entries=readAuditAfter.slice(readAuditBefore.length).map(row=>JSON.parse(row.row));
  assert.deepEqual(entries.map(row=>row.outcome),mode==='held'?['pending','done','replayed']:['done']);
  for(const row of entries){
   assert.equal(row.tool,readMethod);assert.equal(row.resource,link.uri);
   assert.equal(row.agent.id,context.agentId);assert.equal(row.sponsor.id,owner.id);
  }
  assert.deepEqual(await read('/api/paging/state'),pagingBefore);
  await bookkeeping(readPermanentBefore);
  await observe({mode,incident:result,action:result.actions.find(row=>row.id===action.id),handle,saved:savedApproval,linkedIncident:value});
  assert.deepEqual(await snapshot(),afterRead,'Viewing the saved follow-up leaves the write and read outcomes unchanged');
  console.log('PROBE BASE-AGENT-003 4 '+mode+': first completed P2 evidence submission link -> full incident matches completed MCP write and protected native state; '+(mode==='held'?'separate sponsor approval withholds content until exact authorization':'autonomous read without approval')+'; original write outcome and receipt, native records, revisions, mutation audit and paging preserved; zero outbound requests');
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PROBE BASE-AGENT-012 acceptances 1 and 3 '+mode+' oncall.actions.submit: one owned due-dated P2 evidence-policy completion, agent submission and accepted attribution, one complete timeline entry and native revision and actions.submit audit commit; standard plus sensitive; immediate exact replay with new RPC id equals stored outcome; changed evidence with original key and revision -> isError idempotency_conflict in metadata and text without private result; original arguments replay unchanged again with original executed approval and receipt where present; complete native custody unchanged apart from refusal and linked replay audit and capacity bookkeeping; zero outbound requests and no evidence fetch');
 }
 for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await runtime.adopt(policy)).status,200);
  await exercise(mode);
  await exercise(mode,'optional');
  await exercise(mode,'required');
 }
 assert.equal((await runtime.adopt()).status,200);
}

export async function focusedActionEvidenceReplay({connect}={}){
 const runtime=await agentRuntime({clock:null});let hooks;
 try{
  hooks=await connect?.(runtime);
  await actionEvidenceReplay(runtime,hooks);
 }finally{await hooks?.close?.();await runtime.close()}
}
