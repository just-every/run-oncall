import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentRuntime,agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Recover only a lost completed result; pending approval and its POST are consumed once. */
export async function actionSubmitResponseLoss(runtime,options={}){
 await followUpResponseLoss(runtime,'P1','human-review',options);
 await followUpResponseLoss(runtime,'P2','evidence',options);
}

async function followUpResponseLoss(runtime,priority,completionPolicy,{approve,observe=async()=>{}}){
 const {db,http,tool,discardToolResponse,context}=runtime,name='oncall.actions.submit';
 const completesWithEvidence=completionPolicy==='evidence';
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
 const assertLost=lost=>{
  assert.equal(lost.status,200);assert.equal(lost.discarded,true);
  assert.equal(lost.aborted,true);assert.equal(lost.bodyRead,false);
 };
 for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await runtime.adopt(policy)).status,200);
  let incident=await command({type:'declare',service:'agent-service',title:`Synthetic lost submission result ${priority} ${mode}`,
   summary:'Ordinary coordination without protected evidence',severity:'warning',alerts:[]});
  incident=await command({type:'action',incident:incident.id,revision:incident.revision,title:`Synthetic ${priority} ${completionPolicy} follow-up`,
   owner:responder.id,due:'2027-04-12',priority,completionPolicy});
  const action=incident.actions.at(-1);
  assert.equal(action.owner,responder.id);assert.equal(action.due,'2027-04-12');
  assert.equal(action.priority,priority);assert.equal(action.completionPolicy,completionPolicy);
  assert.equal(action.done,false);assert.equal(action.evidence,'');assert.equal(action.submission,undefined);assert.equal(action.accepted,undefined);
  const args={incident:incident.id,revision:incident.revision,action:action.id,
   evidence:'https://evidence.example.invalid/synthetic-oncall-lost-result',idempotency_key:randomUUID()};
  const before=await snapshot(),priorAudit=await audits();
  let pendingCall,handle,savedApproval,lost;
  if(mode==='held'){
   // Consume the initial pending response. Never drop it or replay an approval POST.
   pendingCall=await tool(name,args);
   assert.equal(pendingCall.status,200);assert.equal(pendingCall.body.error,undefined);
   assert.equal(pendingCall.result.resultType,'input_required');assert.equal(pendingCall.result.structuredContent,undefined);
   assert.equal(pendingCall.decision.disposition,'approval');
   assert.deepEqual(pendingCall.decision.classes.map(({class:cls,facts})=>({class:cls,facts})),classes);
   const pending=await snapshot();assert.deepEqual(pending.application,before.application);
   for(const table of Object.keys(before.records).filter(table=>/^(oc_|paging_|workspace_)/.test(table)))
    assert.deepEqual(pending.records[table],before.records[table],'Pending approval preserves native '+table);
   assert.equal(pending.records.agent_door_approvals.length,before.records.agent_door_approvals.length+1);
   assert.deepEqual(pending.records.agent_door_reviews,before.records.agent_door_reviews);
   const pendingRecord=pending.records.agent_door_calls.find(row=>row.agent===context.agentId&&row.key===args.idempotency_key);
   assert.equal(pendingRecord.state,'pending');
   handle=pendingCall.result._meta['com.runeditrun/approval'];assert.ok(handle);
   const url=new URL(handle.url);assert.equal(url.origin,runtime.origin);assert.equal(url.pathname,'/agents/approvals/'+handle.id);
   savedApproval=(await read('/agents/api/approvals/'+handle.id)).approval;
   assert.equal(savedApproval.state,'pending');assert.equal(savedApproval.decision_id,pendingCall.decision.id);
   assert.equal(savedApproval.revision,context.revision);assert.match(savedApproval.summary_sha256,/^[a-f0-9]{64}$/);
   assert.deepEqual(savedApproval.classes,classes);assert.deepEqual(savedApproval.approvers,['sponsor']);
   assert.equal(savedApproval.prepared_by.agent.id,context.agentId);assert.equal(savedApproval.prepared_by.for.id,owner.id);
   assert.deepEqual(savedApproval.summary.nativeTarget,{kind:'incident',id:incident.id});
   assert.ok(savedApproval.summary.items.includes('Revision '+args.revision));
   assert.ok(savedApproval.summary.items.includes('evidence: '+args.evidence));
   assert.deepEqual(await runtime.outboundRequests(),[],'A pending submission performs no outbound work');
   if(approve)await approve({handle,saved:savedApproval,owner,mode,completionPolicy});
   else{
    const page=await http(url.pathname);assert.equal(page.status,200);await page.body.cancel();
    const response=await http('/agents/api/approvals/'+handle.id+'/approve',{
     revision:savedApproval.revision,summary_sha256:savedApproval.summary_sha256});
    assert.equal(response.status,200);assert.equal((await response.json()).approval.state,'executed');
   }
  }else{
   lost=await discardToolResponse(name,args);assertLost(lost);
  }
  // Establish the terminal original call, expiry, outcome and single native effect
  // directly from D1 before recovering any completed result through MCP.
  const once=await snapshot();
  const retained=once.records.agent_door_calls.filter(row=>row.agent===context.agentId&&row.key===args.idempotency_key);
  assert.equal(retained.length,1);const [call]=retained,saved=JSON.parse(call.outcome),result=saved.result;
  assert.equal(call.state,'done');assert.equal(saved.outcome,'done');assert.equal(saved.decision.id,call.decision_id);
  assert.ok(call.expires_at>context.now());
  assert.equal(saved.decision.disposition,mode==='held'?'approval':'autonomous');
  assert.deepEqual(saved.decision.classes.map(({class:cls,facts})=>({class:cls,facts})),classes);
  if(pendingCall)assert.equal(call.decision_id,pendingCall.decision.id);
  assert.equal(result.revision,incident.revision+1);assert.equal(result.timeline.length,incident.timeline.length+1);
  assert.deepEqual(result.timeline.slice(0,-1),incident.timeline);
  const entry=result.timeline.at(-1);
  const accepted=completesWithEvidence?{by:context.agentId,at:entry.at}:undefined;
  assert.deepEqual(result.actions,[{
   ...action,done:completesWithEvidence,evidence:args.evidence,
   submission:{by:context.agentId,at:entry.at,evidence:args.evidence},
   ...(accepted&&{accepted}),
  }]);
  assert.equal(result.actions[0].done,completesWithEvidence);assert.deepEqual(result.actions[0].accepted,accepted);
  assert.equal(entry.kind,'complete');assert.equal(entry.actor,context.agentId);
  assert.equal(entry.metadata.agent.agent.id,context.agentId);assert.equal(entry.metadata.agent.for.id,owner.id);
  const completionText=completesWithEvidence?'Completed under evidence policy':'Completion evidence submitted; awaiting human acceptance';
  assert.equal(entry.text,completionText+': '+action.title+' — '+args.evidence);
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
  for(const prior of before.records.agent_door_calls)
   assert.deepEqual(once.records.agent_door_calls.find(row=>row.agent===prior.agent&&row.key===prior.key),prior);
  assert.deepEqual(once.records.agent_door_reviews,before.records.agent_door_reviews,'Sensitive approval creates no standard review');
  assert.equal(once.records.agent_door_approvals.length,before.records.agent_door_approvals.length+Number(mode==='held'));
  for(const prior of before.records.agent_door_approvals)assert.deepEqual(once.records.agent_door_approvals.find(row=>row.id===prior.id),prior);
  for(const table of Object.keys(before.records).filter(table=>table.startsWith('paging_')))assert.deepEqual(once.records[table],before.records[table]);
  if(mode==='held'){
   const approval=once.records.agent_door_approvals.find(row=>row.id===handle.id);
   assert.equal(approval.state,'executed');assert.deepEqual(JSON.parse(approval.result),saved);
   const executed=(await read('/agents/api/approvals/'+handle.id)).approval;
   assert.equal(executed.state,'executed');assert.equal(executed.revision,savedApproval.revision);
   assert.equal(executed.summary_sha256,savedApproval.summary_sha256);
   assert.deepEqual(JSON.parse(approval.approvals).map(row=>({person:row.person,ref:row.ref})),[{person:owner.id,ref:'sponsor'}]);
   assert.equal(saved.approval.id,handle.id);assert.equal(saved.receipt.approval_id,handle.id);
   assert.equal(saved.receipt.decision_id,call.decision_id);assert.deepEqual(saved.receipt.approved_by,[owner.id]);
   assert.equal(saved.receipt.prepared_by.agent.id,context.agentId);assert.equal(saved.receipt.prepared_by.for.id,owner.id);
  }else{assert.equal(saved.approval,undefined);assert.equal(saved.receipt,undefined)}
  let auditBefore=await audits();assert.deepEqual(auditBefore.slice(0,priorAudit.length),priorAudit);
  const original=JSON.parse(auditBefore.find(row=>row.id===call.decision_id).row);
  assert.equal(original.tool,name);assert.equal(original.outcome,mode==='held'?'pending':'done');
  assert.equal(original.replay_of,null);assert.equal(original.idempotency_key,args.idempotency_key);
  if(mode==='held'){
   const execution=JSON.parse(auditBefore.find(row=>row.id===saved.execution_id).row);
   assert.equal(execution.outcome,'done');assert.deepEqual(execution.approval,{id:handle.id,by:[owner.id]});
  }
  async function linkedAttempt(prior,id){
   const after=await audits();assert.deepEqual(after.slice(0,-1),prior);assert.equal(after.length,prior.length+1);
   const attempt=JSON.parse(after.at(-1).row);
   if(id)assert.equal(attempt.id,id);
   assert.notEqual(attempt.id,call.decision_id);assert.equal(attempt.tool,name);assert.equal(attempt.outcome,'replayed');
   assert.equal(attempt.replay_of,call.decision_id);assert.equal(attempt.operation_id,original.operation_id);
   assert.equal(attempt.agent.id,context.agentId);assert.equal(attempt.sponsor.id,owner.id);assert.equal(attempt.idempotency_key,args.idempotency_key);
   return after;
  }
  if(mode==='held'){
   const permanentBefore=await permanent();
   // This is the first completed tools/call result. The pending response and
   // the one signed-in approval above were fully consumed, never discarded.
   lost=await discardToolResponse(name,args);assertLost(lost);assert.notEqual(lost.id,pendingCall.body.id);
   assert.deepEqual(await snapshot(),once,'Losing the completed held result preserves the terminal original call, approval and all native effects');
   auditBefore=await linkedAttempt(auditBefore);await bookkeeping(permanentBefore);
  }
  assert.deepEqual(await runtime.outboundRequests(),[],'No evidence fetch or outbound work before recovery');
  const permanentBefore=await permanent(),retry=await tool(name,args);
  assert.equal(retry.status,200);assert.equal(retry.body.error,undefined);assert.notEqual(retry.body.id,lost.id);
  if(pendingCall)assert.notEqual(retry.body.id,pendingCall.body.id);
  assert.equal(retry.result.isError,false);assert.deepEqual(retry.result.structuredContent,saved.result);
  assert.deepEqual(JSON.parse(retry.result.content[0].text),saved.result);
  assert.deepEqual(retry.result._meta['com.runeditrun/receipt'],saved.receipt?{...saved.receipt,decision:saved.decision}:undefined);
  assert.deepEqual(retry.result._meta['com.runeditrun/review'],saved.review);assert.deepEqual(retry.decision.classes,saved.decision.classes);
  assert.deepEqual(await snapshot(),once,'Recovery preserves native records, revisions, timeline, state-changing audit, original outcome and expiry, approvals, reviews and paging');
  await linkedAttempt(auditBefore,retry.decision.id);await bookkeeping(permanentBefore);
  await observe({mode,incident:result,action:result.actions[0],handle,saved:savedApproval});
  assert.deepEqual(await snapshot(),once,'Reading the saved follow-up preserves terminal custody');
  assert.deepEqual(await runtime.outboundRequests(),[],'No submission or recovery fetches the evidence URL or sends outbound requests');
  const nativeOutcome=completesWithEvidence?'done=true with agent submission and acceptance attribution':'done=false with agent submission and no human acceptance';
  console.log(`PROBE BASE-AGENT-012 acceptance 2 ${mode} oncall.actions.submit: completed MCP stream destroyed at headers with unread body; D1 terminal original and one owned due-dated ${priority} ${completionPolicy} follow-up with ${nativeOutcome} before recovery; new RPC id returns original outcome and executed approval receipt where present; one native audit commit and revision increment; custody unchanged apart from linked replay-attempt audit and capacity bookkeeping; zero outbound requests and no evidence fetch`);
 }
 assert.equal((await runtime.adopt()).status,200);
}

export async function focusedActionSubmitResponseLoss(){
 const runtime=await agentRuntime({clock:null});
 try{await actionSubmitResponseLoss(runtime)}finally{await runtime.close()}
}
