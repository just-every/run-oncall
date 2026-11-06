import assert from 'node:assert/strict';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const {agentRuntime}=await import(pathToFileURL(root+'/tests/agent-door-runtime.mjs'));
const {autonomousPolicy,heldPolicy}=await import(pathToFileURL(root+'/src/modules/agent-door/conformance/crypto.mjs'));
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const receipt={schema:1,command:'node ../packet/dependency-probe.mjs <receipt.json>',source_head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 source_hashes:Object.fromEntries(await Promise.all(['src/agent-door/service-tools.ts','src/agent-door/read-tools.ts','CONTRACT.md','sources.lock.json','dist/server/index.js'].map(async path=>[path,await hash(path)]))),cases:[],privacy_failures:[]};
const rt=await agentRuntime();
const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
const native=async(path,input,status=200)=>{const response=await rt.http(path,input);assert.equal(response.status,status,path);return response.json()};
const state=()=>native('/api/state');
const call=(token,name,args)=>rt.tool('oncall.services.'+name,args,{},token);
const content=answer=>{assert.equal(answer.status,200);assert.equal(answer.result?.isError,false,JSON.stringify(answer.body));assert.ok(answer.result.structuredContent);return answer.result.structuredContent};
const service=async(token,id)=>{
 let answer=await call(token,'read',{id});
 if(answer.result?.resultType==='input_required'){
  const saved=(await native('/agents/api/approvals/'+answer.result._meta['com.runeditrun/approval'].id)).approval;
  assert.equal((await native('/agents/api/approvals/'+saved.id+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256})).approval.state,'executed');
  answer=await rt.mcpWithToken(token,'tools/call',{name:'oncall.services.read',arguments:{id},requestState:answer.result.requestState});
 }
 return content(answer).data[0];
};
const fields=row=>Object.fromEntries(['id','etag','name','environment','owner','runbook','pager'].map(key=>[key,row[key]]));
function privacy(label,answer,expected){
 const actual=answer.dependencies;
 if(JSON.stringify(actual)!==JSON.stringify(expected))receipt.privacy_failures.push({label,expected,actual});
 // Check the whole MCP response below as well as the typed dependency field.
}
try{
 const owner=(await native('/api/workspace')).member;
 const initial=(await state()).services.find(row=>row.id==='agent-service');
 await native('/api/command',{...initial,type:'service',dependencies:['agent-foreign-service']});
 const clients={};
 for(const [label,services] of [['scoped',['agent-service']],['authorized',['agent-service','agent-foreign-service']]]){
  const token=randomBytes(32).toString('hex');
  const client=await native('/api/automation/clients',{name:'Synthetic dependency '+label,key:token,services,permissions:['services:read','services:write']},201);
  clients[label]={token,id:client.id};
 }
 const approval=autonomousPolicy();approval.rules=[{id:'service-approval',class:'standard',do:'approval',approver:['sponsor'],wait:'PT1H'}];
 for(const [policy,document] of [['autonomous',autonomousPolicy()],['held-review',heldPolicy()],['held-approval',approval]]){
  assert.equal((await rt.adopt(document)).status,200);
  for(const [visibility,{token,id:clientId}] of Object.entries(clients)){
   const label=policy+'/'+visibility,expected=visibility==='scoped'?[]:['agent-foreign-service'];
   const before=await state(),stored=before.services.find(row=>row.id==='agent-service');
   const read=await service(token,'agent-service');
   assert.deepEqual(read.dependencies,expected,'The ordinary read already projects current visibility');
   const input={...fields(read),name:'Dependency rename '+label,idempotency_key:randomUUID()};
   const first=await call(token,'update',input);
   assert.equal(first.status,200);
   assert.equal(first.decision.disposition,policy==='autonomous'?'autonomous':policy==='held-review'?'review':'approval');
   let pendingId=null;
   if(policy==='held-approval'){
    pendingId=first.result?._meta?.['com.runeditrun/approval']?.id;assert.ok(pendingId);
    assert.deepEqual((await state()).services,before.services,'Approval preparation cannot rename or remove dependencies');
    const saved=(await native('/agents/api/approvals/'+pendingId)).approval;
    const executed=(await native('/agents/api/approvals/'+pendingId+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256})).approval;
    assert.equal(executed.state,'executed');
   }
   const success=policy==='held-approval'?await call(token,'update',input):first;
   const result=content(success);
   privacy(label+'/success',result,expected);
   if(visibility==='scoped'&&JSON.stringify(success.body).includes('agent-foreign-service'))receipt.privacy_failures.push({label:label+'/wire-success',foreign_identity:true});
   const once=await state(),saved=once.services.find(row=>row.id===stored.id);
   assert.deepEqual(saved,{...stored,name:input.name},'The native rename changes only its intended service field and retains every dependency');
   assert.equal(once.revision,before.revision+1);
   const fresh=await service(token,stored.id);
   assert.equal(result.etag,fresh.etag,'Success keeps the existing projected ETag semantics');
   assert.equal(result.name,input.name);
   assert.deepEqual(fresh.dependencies,expected);
   const replay=await call(token,'update',input),again=content(replay);
   assert.deepEqual(again,result,'Identical-key replay returns the same recorded success');
   privacy(label+'/replay',again,expected);
   if(visibility==='scoped'&&JSON.stringify(replay.body).includes('agent-foreign-service'))receipt.privacy_failures.push({label:label+'/wire-replay',foreign_identity:true});
   const afterReplay=await state();
   assert.deepEqual(afterReplay,once,'Replay has no second native effect');
   const audits=(await native('/agents/api/audit?agent='+encodeURIComponent('oncall-client:'+clientId))).rows;
   assert.ok(audits.some(row=>row.tool==='oncall.services.update'&&row.outcome==='done'&&row.sponsor.id===owner.id&&row.agent.id==='oncall-client:'+clientId),'Native service success retains attributed agent and sponsor audit');
   assert.ok(audits.some(row=>row.outcome==='replayed'&&row.replay_of),'Replay has a linked attempt audit');
   assert.equal(once.audit.at(-1).actor,clientId,'Native application audit is attributed to the service client');
   if(policy==='held-review')assert.ok(success.result._meta['com.runeditrun/review'],'Held standard review stays attached');
   if(policy==='held-approval')assert.ok(success.result._meta['com.runeditrun/receipt'],'Approved success retains its receipt');
   // Exact native request validation and current-grant target refusals.
   const stale=await call(token,'update',{...input,idempotency_key:randomUUID()});
   if(policy==='autonomous')assert.equal(code(stale),'revision_conflict');
   else if(stale.result?.resultType==='input_required'){
    const p=(await native('/agents/api/approvals/'+stale.result._meta['com.runeditrun/approval'].id)).approval;
    const response=await native('/agents/api/approvals/'+p.id+'/approve',{revision:p.revision,summary_sha256:p.summary_sha256});
    assert.notEqual(response.approval.state,'executed','Stale approved attempt cannot mutate');
   }else assert.equal(code(stale),'revision_conflict');
   for(const target of visibility==='scoped'?['agent-foreign-service','synthetic-absent-service']:['synthetic-absent-service']){
    const refused=await call(token,'update',{...input,id:target,idempotency_key:randomUUID()});
    assert.equal(code(refused),'not_found');assert.equal(refused.result?.structuredContent,undefined);
   }
   if(visibility==='scoped'){
    const refused=await call(token,'update',{...fields(fresh),dependencies:['agent-foreign-service'],idempotency_key:randomUUID()});
    if(policy!=='held-approval')assert.equal(code(refused),'not_found');
    else if(refused.result?.resultType==='input_required'){
     const p=(await native('/agents/api/approvals/'+refused.result._meta['com.runeditrun/approval'].id)).approval;
     const response=await native('/agents/api/approvals/'+p.id+'/approve',{revision:p.revision,summary_sha256:p.summary_sha256});assert.notEqual(response.approval.state,'executed');
    }else assert.equal(code(refused),'not_found');
   }
   assert.deepEqual((await state()).services,once.services,'Refusals preserve all native services and dependencies');
   receipt.cases.push({label,read_dependencies:read.dependencies,success_dependencies:result.dependencies,replay_dependencies:again.dependencies,stored_dependencies:saved.dependencies,
    rename_only:true,projected_etag_matches_read:true,single_native_revision:true,replay_no_effect:true,attributed_audit:true,foreign_missing_refused:true,policy_disposition:first.decision.disposition,approved:!!pendingId});
   console.log('CASE '+JSON.stringify(receipt.cases.at(-1)));
  }
 }
 // Keep a visible dependency alongside the hidden one: projection is selective.
 assert.equal((await rt.adopt()).status,200);
 const s=(await state()).services.find(row=>row.id==='agent-service');
 await native('/api/command',{type:'service',id:'synthetic-visible-dependency',name:'Visible coordination service',environment:'production',owner:owner.id,runbook:[],pager:''});
 await native('/api/command',{...s,type:'service',dependencies:['agent-foreign-service','synthetic-visible-dependency']});
 const token=randomBytes(32).toString('hex');
 await native('/api/automation/clients',{name:'Synthetic mixed dependency projection',key:token,services:['agent-service','synthetic-visible-dependency'],permissions:['services:read','services:write']},201);
 const read=await service(token,'agent-service');assert.deepEqual(read.dependencies,['synthetic-visible-dependency']);
 const input={...fields(read),name:'Mixed dependency projection',idempotency_key:randomUUID()};
 const answer=await call(token,'update',input),result=content(answer);
 privacy('mixed-visible/success',result,['synthetic-visible-dependency']);
 const replay=content(await call(token,'update',input));privacy('mixed-visible/replay',replay,['synthetic-visible-dependency']);assert.deepEqual(replay,result);
 assert.deepEqual((await state()).services.find(row=>row.id==='agent-service').dependencies,['agent-foreign-service','synthetic-visible-dependency']);
 receipt.cases.push({label:'mixed-visible',read_dependencies:read.dependencies,success_dependencies:result.dependencies,replay_dependencies:replay.dependencies,stored_dependencies:['agent-foreign-service','synthetic-visible-dependency']});
 assert.deepEqual(await rt.outboundRequests(),[],'This native reproduction sends no provider request');
 receipt.zero_outbound_requests=true;
 receipt.exit=receipt.privacy_failures.length?1:0;
 console.log('PRIVACY_FAILURES '+JSON.stringify(receipt.privacy_failures));
}catch(error){receipt.exit=2;receipt.error={name:error.name,message:error.message,stack:error.stack};console.error(error);}
finally{await rt.close();await writeFile(process.argv[2],JSON.stringify(receipt,null,2)+'\n');}
process.exitCode=receipt.exit;
