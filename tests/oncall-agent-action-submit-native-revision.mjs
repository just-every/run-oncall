import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentRuntime,agentEffectSnapshot} from './agent-door-runtime.mjs';
import {actionSubmitReplay} from './oncall-agent-action-submit-replay.mjs';

/** Required parent revision is checked before sensitive submission approval. */
export async function actionSubmitNativeRevision(runtime,options={}){
 const {db,http,tool}=runtime,name='oncall.actions.submit';
 const rows=async(sql,...values)=>(await db.prepare(sql).bind(...values).all()).results;
 const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
 const snapshot=()=>agentEffectSnapshot(runtime),audits=()=>rows('SELECT * FROM agent_door_audit ORDER BY sequence');
 const permanent=()=>rows('SELECT * FROM oc_admin_audit ORDER BY ordinal');
 const credential='synthetic-oncall-'+randomUUID();
 const client=await http('/api/automation/clients',{name:'Synthetic native submission revision scope',key:credential,
  services:['agent-service'],permissions:['services:read','incidents:read','actions:write']});
 assert.equal(client.status,201);await client.json();
 await actionSubmitReplay(runtime,{...options,async beforeSubmit({mode,incident,action,args,owner}){
  assert.equal(Object.hasOwn(args,'expected_revision'),false,'The optional revision is explicitly absent');
  assert.equal(incident.state,'declared');assert.equal(action.done,false);assert.equal(action.evidence,'');
  assert.equal(action.submission,undefined);assert.equal(action.accepted,undefined);
  let foreign=await command({type:'declare',service:'agent-foreign-service',title:'Synthetic private submission '+mode,
   summary:'Ordinary coordination without protected evidence',severity:'warning',alerts:[]});
  foreign=await command({type:'action',incident:foreign.id,revision:foreign.revision,title:'Synthetic scoped-out follow-up',
   owner:action.owner,due:action.due,priority:'P1',completionPolicy:'human-review'});
  for(const bearer of [undefined,credential]){
   const admitted=await tool('oncall.services.read',{id:'agent-service'},{},bearer);
   assert.equal(admitted.status,200);assert.equal(admitted.result.isError,false);
   assert.equal(admitted.result.structuredContent.data[0].id,'agent-service');
  }
  const before=await snapshot();assert.notEqual(before.application.revision,incident.revision,'Parent and workspace revisions are distinct');
  async function refused(input,expected,bearer){
   assert.equal(Object.hasOwn(input,'expected_revision'),false);
   const prior=await audits(),priorPermanent=await permanent();
   const answer=await tool(name,input,{},bearer);
   assert.equal(answer.status,200);assert.equal(answer.body.error,undefined);
   assert.equal(answer.result.isError,true,'Stale required revision must refuse before opening an approval');
   assert.deepEqual(answer.result._meta['com.runeditrun/error'],expected);
   assert.deepEqual(JSON.parse(answer.result.content[0].text),expected);
   assert.equal(answer.result.structuredContent,undefined);
   assert.equal(answer.result._meta['com.runeditrun/approval'],undefined);
   assert.equal(answer.result._meta['com.runeditrun/review'],undefined);
   assert.deepEqual(await snapshot(),before,'Refusal preserves native records, revisions, timeline, state-changing audit, calls and outcomes, approvals, reviews and paging');
   const after=await audits();assert.deepEqual(after.slice(0,-1),prior);assert.equal(after.length,prior.length+1);
   const refusal=JSON.parse(after.at(-1).row);
   assert.equal(refusal.tool,name);assert.equal(refusal.outcome,'refused');assert.equal(refusal.code,expected.code);
   assert.equal(refusal.idempotency_key,input.idempotency_key);assert.equal(refusal.sponsor.id,owner.id);
   assert.equal(refusal.approval,null);assert.equal(refusal.review,null);
   const afterPermanent=await permanent();assert.deepEqual(afterPermanent.slice(0,priorPermanent.length),priorPermanent);
   for(const row of afterPermanent.slice(priorPermanent.length)){
    assert.equal(row.kind,'agent-door.persistence');assert.ok(['accepted','refused'].includes(row.outcome));
    for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after']);
   }
   assert.deepEqual(await runtime.outboundRequests(),[],'No evidence URL fetch or other outbound request');
   return answer;
  }
  const staleArgs={...args,revision:incident.revision-1,idempotency_key:randomUUID()};
  const stale=await refused(staleArgs,{code:'revision_conflict',current_revision:incident.revision});
  // A scoped-out incident and an absent incident or action disclose the same
  // not-found diagnostic, even when their supplied parent revision is stale.
  for(const target of [
   {incident:foreign.id,action:foreign.actions.at(-1).id},
   {incident:'synthetic-oncall-'+randomUUID(),action:action.id},
   {incident:incident.id,action:'synthetic-oncall-'+randomUUID()},
  ])await refused({...staleArgs,...target,idempotency_key:randomUUID()},{code:'not_found'},credential);
  args.revision=stale.result._meta['com.runeditrun/error'].current_revision;
  args.idempotency_key=randomUUID();assert.notEqual(args.idempotency_key,staleArgs.idempotency_key);
  assert.equal(Object.hasOwn(args,'expected_revision'),false);
  console.log('PROBE BASE-AGENT-012 acceptance 4 '+mode+' oncall.actions.submit: stale required parent revision with expected_revision absent -> isError revision_conflict and exact authorized parent current_revision '+args.revision+' in metadata and text, distinct from workspace revision '+before.application.revision+'; no private result, approval, review or native effect; missing and scoped-out targets -> identical not_found with no revision; zero outbound requests');
 }});
}

export async function focusedActionSubmitNativeRevision(){
 const runtime=await agentRuntime({clock:null});
 try{await actionSubmitNativeRevision(runtime)}finally{await runtime.close()}
}
