import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentEffectSnapshot} from './agent-door-runtime.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Optional revision conflicts precede policy decisions and diagnose only an authorized parent. */
export async function staleActionSubmitExpectedRevision(runtime,{approve,observe=async()=>{}}={}){
 const {db,http,tool,context}=runtime,name='oncall.actions.submit';
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
 const snapshot=()=>agentEffectSnapshot(runtime),audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const permanent=()=>rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const owner=(await read('/api/workspace')).member;
 const responder=(await read('/api/state')).members.find(row=>row.active&&row.role==='responder');
 assert.ok(responder);assert.notEqual(owner.id,responder.id);
 const credential='synthetic-oncall-'+randomUUID();
 const client=await http('/api/automation/clients',{name:'Synthetic submission revision scope',key:credential,
  services:['agent-service'],permissions:['services:read','incidents:read','actions:write']});
 assert.equal(client.status,201);await client.json();
 const classes=[{class:'standard',facts:{measure:1}},{class:'sensitive',facts:{measure:1,kind:'personal_or_incident_evidence'}}];
 async function bookkeeping(prior){
  const after=await permanent();assert.deepEqual(after.slice(0,prior.length),prior);
  for(const row of after.slice(prior.length)){
   assert.equal(row.kind,'agent-door.persistence');assert.ok(['accepted','refused'].includes(row.outcome));
   for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after']);
  }
 }
 for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await runtime.adopt(policy)).status,200);
  let incident=await command({type:'declare',service:'agent-service',title:'Synthetic optional submission revision '+mode,
   summary:'Ordinary coordination without protected evidence',severity:'warning',alerts:[]});
  incident=await command({type:'action',incident:incident.id,revision:incident.revision,title:'Synthetic human review follow-up',
   owner:responder.id,due:'2027-04-12',priority:'P1',completionPolicy:'human-review'});
  const action=incident.actions.at(-1);
  assert.equal(action.owner,responder.id);assert.equal(action.due,'2027-04-12');
  assert.equal(action.priority,'P1');assert.equal(action.completionPolicy,'human-review');
  assert.equal(incident.recovery,'');assert.deepEqual(incident.alerts,[]);
  assert.equal(action.done,false);assert.equal(action.evidence,'');assert.equal(action.submission,undefined);assert.equal(action.accepted,undefined);
  const args={incident:incident.id,revision:incident.revision,action:action.id,
   evidence:'https://evidence.example.invalid/synthetic-oncall-original',idempotency_key:randomUUID()};
  const before=await snapshot(),priorAudit=await audits();
  assert.notEqual(before.application.revision,incident.revision,'The diagnostic distinguishes the parent incident from the workspace');
  const staleArgs={...args,expected_revision:incident.revision-1};
  assert.equal(staleArgs.revision,incident.revision,'The required parent revision remains current');
  const permanentBefore=await permanent(),stale=await tool(name,staleArgs);
  assert.equal(stale.status,200);assert.equal(stale.body.error,undefined);assert.equal(stale.result.isError,true);
  const error={code:'revision_conflict',current_revision:incident.revision};
  assert.deepEqual(stale.result._meta['com.runeditrun/error'],error);
  assert.deepEqual(JSON.parse(stale.result.content[0].text),error);assert.equal(stale.result.structuredContent,undefined);
  assert.deepEqual(await snapshot(),before,'Pre-decision mismatch preserves all native and original outcome custody, including approvals and reviews');
  const refusedAudit=await audits();assert.deepEqual(refusedAudit.slice(0,-1),priorAudit);assert.equal(refusedAudit.length,priorAudit.length+1);
  const refusal=JSON.parse(refusedAudit.at(-1).row);
  assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,'revision_conflict');
  assert.equal(refusal.agent.id,context.agentId);assert.equal(refusal.sponsor.id,owner.id);
  assert.equal(refusal.idempotency_key,staleArgs.idempotency_key);assert.deepEqual(refusal.resource,{kind:'incident',id:incident.id});
  assert.equal(refusal.approval,null);assert.equal(refusal.review,null);await bookkeeping(permanentBefore);
  const returned=stale.result._meta['com.runeditrun/error'].current_revision;
  args.revision=returned;args.expected_revision=returned;args.idempotency_key=randomUUID();
  assert.notEqual(args.idempotency_key,staleArgs.idempotency_key);
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
   assert.equal(savedApproval.prepared_by.agent.id,context.agentId);
   assert.equal(savedApproval.prepared_by.for.id,owner.id);
   assert.deepEqual(savedApproval.summary.nativeTarget,{kind:'incident',id:incident.id});
   assert.ok(savedApproval.summary.items.includes('Revision '+args.revision));
   assert.ok(savedApproval.summary.items.includes('evidence: '+args.evidence));
   if(approve)await approve({handle,saved:savedApproval,owner,mode});
   else{
    const page=await http(url.pathname);assert.equal(page.status,200);await page.body.cancel();
    const response=await http('/agents/api/approvals/'+handle.id+'/approve',{
     revision:savedApproval.revision,summary_sha256:savedApproval.summary_sha256});
    assert.equal(response.status,200);assert.equal((await response.json()).approval.state,'executed');
   }
  }else assert.equal(first.result.isError,false);
  const once=await snapshot();
  const retained=once.records.agent_door_calls.filter(row=>row.agent===context.agentId&&row.key===args.idempotency_key);
  assert.equal(retained.length,1);const [call]=retained,saved=JSON.parse(call.outcome),result=saved.result;
  assert.equal(call.state,'done');assert.equal(saved.outcome,'done');assert.equal(call.decision_id,first.decision.id);
  assert.equal(saved.decision.id,first.decision.id);
  assert.deepEqual(saved.decision.classes.map(({class:cls,facts})=>({class:cls,facts})),classes);
  assert.equal(result.revision,incident.revision+1);assert.equal(result.timeline.length,incident.timeline.length+1);
  assert.deepEqual(result.timeline.slice(0,-1),incident.timeline);
  assert.deepEqual(result.actions,[{...action,evidence:args.evidence,submission:{by:context.agentId,at:result.timeline.at(-1).at,evidence:args.evidence}}]);
  const entry=result.timeline.at(-1);
  assert.equal(entry.kind,'complete');assert.equal(entry.actor,context.agentId);
  assert.equal(entry.metadata.agent.agent.id,context.agentId);assert.equal(entry.metadata.agent.for.id,owner.id);
  assert.equal(entry.text,'Completion evidence submitted; awaiting human acceptance: '+action.title+' — '+args.evidence);
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
  const committedAudit=await audits();assert.deepEqual(committedAudit.slice(0,refusedAudit.length),refusedAudit);
  const original=JSON.parse(committedAudit.find(row=>row.id===call.decision_id).row);
  assert.equal(original.tool,name);assert.equal(original.outcome,mode==='held'?'pending':'done');
  assert.equal(original.replay_of,null);assert.equal(original.idempotency_key,args.idempotency_key);
  if(mode==='held'){
   const execution=JSON.parse(committedAudit.find(row=>row.id===saved.execution_id).row);
   assert.equal(execution.outcome,'done');assert.deepEqual(execution.approval,{id:handle.id,by:[owner.id]});
  }
  const auditBefore=committedAudit,permanentOnce=await permanent();
  const retry=await tool(name,args);
  assert.equal(retry.status,200);assert.equal(retry.body.error,undefined);assert.notEqual(retry.body.id,first.body.id);assert.notEqual(retry.body.id,stale.body.id);
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
  assert.equal(attempt.idempotency_key,args.idempotency_key);await bookkeeping(permanentOnce);
  assert.deepEqual(await runtime.outboundRequests(),[],'Revision refusal, submission, approval and retry never fetch evidence or send requests');
  await observe({mode,incident:result,action:result.actions[0],handle,saved:savedApproval});
  assert.deepEqual(await snapshot(),once,'Reading the saved follow-up leaves the retained outcome unchanged');
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' oncall.actions.submit: current required parent revision with stale optional expected_revision -> isError revision_conflict, exact authorized current_revision '+returned+' in metadata and text, no private result or native effect or approval or review; fresh key and returned revision in both fields -> standard plus sensitive, one agent-attributed open P1 human-review submission '+(mode==='held'?'after exact sponsor approval':'autonomously')+'; new RPC id returns original stored outcome and approval identity without another effect; zero outbound requests and no evidence fetch');

  const scoped=await tool('oncall.services.read',{id:'agent-service'},{},credential);
  assert.equal(scoped.result.isError,false);assert.equal(scoped.result.structuredContent.data[0].id,'agent-service');
  let foreign=await command({type:'declare',service:'agent-foreign-service',title:'Synthetic private submission revision '+mode,
   summary:'Ordinary private coordination',severity:'warning',alerts:[]});
  foreign=await command({type:'action',incident:foreign.id,revision:foreign.revision,title:'Synthetic private follow-up',
   owner:responder.id,due:'2027-04-12',priority:'P1',completionPolicy:'human-review'});
  const privateBefore=await snapshot(),denials=[];
  for(const target of [foreign,{id:'synthetic-oncall-'+randomUUID(),revision:foreign.revision}]){
   const deniedArgs={...args,incident:target.id,action:foreign.actions[0].id,revision:target.revision,
    expected_revision:target.revision-1,idempotency_key:randomUUID()};
   const prior=await audits(),permanentPrior=await permanent(),denied=await tool(name,deniedArgs,{},credential);
   assert.equal(denied.status,200);assert.equal(denied.body.error,undefined);assert.equal(denied.result.isError,true);
   assert.deepEqual(denied.result._meta['com.runeditrun/error'],{code:'not_found'});
   assert.deepEqual(JSON.parse(denied.result.content[0].text),{code:'not_found'});assert.equal(denied.result.structuredContent,undefined);
   denials.push({error:denied.result._meta['com.runeditrun/error'],content:denied.result.content});
   assert.deepEqual(await snapshot(),privateBefore,'Missing and scoped-out refusals preserve native, replay, approval, review and paging custody');
   const after=await audits();assert.deepEqual(after.slice(0,-1),prior);assert.equal(after.length,prior.length+1);
   const row=JSON.parse(after.at(-1).row);assert.equal(row.outcome,'refused');assert.equal(row.code,'not_found');
   assert.equal(row.tool,name);assert.equal(row.idempotency_key,deniedArgs.idempotency_key);
   assert.equal(row.approval,null);assert.equal(row.review,null);await bookkeeping(permanentPrior);
  }
  assert.deepEqual(denials[0],denials[1],'Missing and scoped-out parent incidents disclose identical not_found without a revision');
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' submission non-disclosure: valid scoped client against populated foreign and missing parent incidents -> identical not_found without revision or private result; retained custody unchanged; zero outbound requests');
 }
 assert.equal((await runtime.adopt()).status,200);
}
