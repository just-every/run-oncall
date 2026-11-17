import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentRuntime,agentEffectSnapshot} from './agent-door-runtime.mjs';
import {accessToken,seconds,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Completed evidence submission is retained across a full day without reapproval. */
export async function agedActionSubmitRetention({connect=async()=>({})}={}){
 // Sessions also use SQLite's wall clock. Freeze a whole-second current hour,
 // then age only the platform clock, keeping native signed-in sessions usable.
 const started=Math.floor(Date.now()/3600000)*3600000,day=86400000;
 for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  const runtime=await agentRuntime({clock:started});
  let hooks;
  try{
   hooks=await connect(runtime,mode);
   const {approve,observe=async()=>{}}=hooks;
   const envelope=async()=>JSON.parse((await runtime.db.prepare('SELECT envelope FROM agent_door_state WHERE id=1').first()).envelope);
   const authority=({iat,exp,...value})=>value;
   const claims=value=>JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString());
   const identity=({iat,exp,jti,...value})=>value;
   const token=()=>accessToken(runtime.context,{act:{sub:runtime.context.agentId,name:'Responder assistant',specialist:'oncall-responder'}});
   const bearer=await token(),originalClaims=claims(bearer),tokenIds=new Set([originalClaims.jti]);
   assert.equal(originalClaims.iat,started/1000);assert.equal(originalClaims.exp-originalClaims.iat,300);
  const {db,http,tool,context}=runtime,name='oncall.actions.submit';
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

  assert.equal((await runtime.adopt(policy)).status,200);
  let incident=await command({type:'declare',service:'agent-service',title:'Synthetic retained evidence submission '+mode,
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
  const first=await tool(name,args,{},bearer);
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
  for(const [field,kind,id] of [['actor','agent',context.agentId],['subject','entity',incident.id],['source','member',owner.id]]){
   const identity=await db.prepare('SELECT label FROM oc_audit_identities WHERE kind=? AND entity_id=?').bind(kind,id).first();
   assert.ok(identity);assert.equal(commits[0][field],identity.label,'The native submission audit retains its '+field+' attribution');
  }
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
  assert.equal(call.created_at,started);assert.ok(call.expires_at>started+day);
  assert.equal(result.timeline.at(-1).at,new Date(started).toISOString());
  assert.equal(result.actions[0].done,false);assert.equal(result.actions[0].accepted,undefined);
  assert.equal(saved.review,undefined,'Sensitive approval creates no standard review');
  const approved=handle?(await read('/agents/api/approvals/'+handle.id)).approval:undefined;
  const originalPolicy=await envelope(),ids=new Set([first.body.id]);
  const originalRow=committedAudit.find(row=>row.id===call.decision_id);
  // Establish each comparison after renewal: replay must not take credit for
  // the receiving door's one new signed-policy event or refreshed custody.
  for(const elapsed of [day,day+1000]){
   await runtime.time(started+elapsed);
   assert.ok(originalClaims.exp<seconds(context.now));
   const previousPolicy=await envelope(),beforeRenewal=await snapshot();
   assert.equal((await runtime.renewPolicy()).status,200);
   const renewed=await envelope();
   assert.deepEqual(authority(renewed),authority(originalPolicy),'Renew only the unchanged signed policy');
   assert.ok(renewed.iat>previousPolicy.iat);assert.equal(renewed.exp-renewed.iat,300);
   const fresh=await token(),freshClaims=claims(fresh);
   assert.notEqual(fresh,bearer);assert.ok(!tokenIds.has(freshClaims.jti));tokenIds.add(freshClaims.jti);
   assert.deepEqual(identity(freshClaims),identity(originalClaims),'Same person, agent, client, consent and scopes');
   assert.equal(freshClaims.iat,(started+elapsed)/1000);assert.equal(freshClaims.exp-freshClaims.iat,300);
   const before=await snapshot();assert.deepEqual(before.application,once.application);
   for(const table of Object.keys(once.records).filter(table=>!['agent_door_state','agent_door_events'].includes(table)))
    assert.deepEqual(before.records[table],once.records[table],'Renewal preserves retained native and original outcome custody: '+table);
   const previousEvents=beforeRenewal.records.agent_door_events,renewedEvents=before.records.agent_door_events;
   for(const event of previousEvents)assert.deepEqual(renewedEvents.find(row=>row.id===event.id),event);
   const added=renewedEvents.filter(row=>!previousEvents.some(prior=>prior.id===row.id));assert.equal(added.length,1);
   const event=JSON.parse(added[0].event),priorEvent=JSON.parse(previousEvents
    .filter(row=>JSON.parse(row.event).type==='policy.adopted').sort((a,b)=>a.sequence-b.sequence).at(-1).event);
   assert.equal(event.type,'policy.adopted');assert.notEqual(event.id,priorEvent.id);
   assert.equal(event.at,new Date(started+elapsed).toISOString());
   assert.deepEqual(event,{...priorEvent,id:event.id,at:event.at});
   const auditBefore=await audits(),permanentBefore=await permanent(),relayBefore=await rows('SELECT * FROM agent_door_relay ORDER BY sequence');
   const retry=await tool(name,args,{},fresh);
   assert.equal(retry.status,200);assert.equal(retry.body.error,undefined);assert.equal(retry.result.isError,false);
   assert.ok(!ids.has(retry.body.id),'Every retained-result retry has a new JSON-RPC id');ids.add(retry.body.id);
   assert.deepEqual(retry.result.structuredContent,saved.result);assert.deepEqual(JSON.parse(retry.result.content[0].text),saved.result);
   assert.deepEqual(retry.result._meta['com.runeditrun/receipt'],saved.receipt?{...saved.receipt,decision:saved.decision}:undefined);
   assert.deepEqual(retry.result._meta['com.runeditrun/review'],saved.review);
   assert.deepEqual(retry.decision.classes,saved.decision.classes);
   assert.deepEqual(await rows('SELECT * FROM agent_door_calls WHERE agent=? AND key=?',context.agentId,args.idempotency_key),retained,'Original terminal call, outcome and expiry never slide');
   assert.deepEqual(await snapshot(),before,'Aged retry preserves complete native records, revisions, timeline, state-changing audit, approvals, reviews and paging');
   const auditAfter=await audits();assert.deepEqual(auditAfter.slice(0,-1),auditBefore);assert.equal(auditAfter.length,auditBefore.length+1);
   assert.deepEqual(auditAfter.find(row=>row.id===call.decision_id),originalRow);
   const attempt=JSON.parse(auditAfter.at(-1).row);
   assert.equal(attempt.id,retry.decision.id);assert.notEqual(attempt.id,first.decision.id);
   assert.equal(attempt.tool,name);assert.equal(attempt.outcome,'replayed');assert.equal(attempt.replay_of,call.decision_id);
   assert.equal(attempt.operation_id,original.operation_id);assert.equal(attempt.idempotency_key,args.idempotency_key);
   assert.equal(attempt.agent.id,context.agentId);assert.equal(attempt.sponsor.id,owner.id);
   const relayAfter=await rows('SELECT * FROM agent_door_relay ORDER BY sequence');
   assert.deepEqual(relayAfter.slice(0,relayBefore.length),relayBefore);
   assert.deepEqual(relayAfter.slice(relayBefore.length).map(row=>row.decision_id),[attempt.id]);
   await bookkeeping(permanentBefore);
   if(handle)assert.deepEqual((await read('/agents/api/approvals/'+handle.id)).approval,approved,'Read original executed approval; never POST it again');
   await observe({mode,elapsed,incident:result,action:result.actions[0],handle,approved});
   assert.deepEqual(await snapshot(),before,'Signed-in retained-result inspection changes no custody');
   assert.deepEqual(await runtime.outboundRequests(),[],'Aged submission retrieval and human inspection never fetch evidence or send requests');
   console.log('PROBE BASE-AGENT-012 acceptance 1 '+mode+' oncall.actions.submit T+'+elapsed+'ms: unchanged policy renewal and fresh same-identity token; original arguments and key with new RPC id -> original structured outcome, receipt and review identity; original terminal call and expiry, agent-attributed submission, open human acceptance, native revisions, timeline, audit, approvals, reviews and paging unchanged; linked replay attempt only; zero outbound requests and no evidence fetch');
  }
  }finally{try{await hooks?.close?.()}finally{await runtime.close()}}
 }
}
