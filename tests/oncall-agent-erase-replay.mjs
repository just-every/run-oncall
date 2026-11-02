import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {ownerDoor} from './worker.mjs';
import {autonomousPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Real MCP approval, native erasure transaction and current-owner admission. */
export async function eraseReplay(runtime) {
 const {http,tool,adopt,db}=runtime;
 const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
 const state=async()=>(await (await http('/api/state')).json());
 assert.equal((await adopt()).status,200);
 const password=randomBytes(32).toString('hex');
 const other=await (await http('/api/members',{name:'Erasure authority administrator',role:'admin',password})).json();
 const login=await http('/api/login',{name:other.name,password});
 assert.equal(login.status,200);
 const cookie=login.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');await login.body?.cancel();
 const created=await tool('oncall.incidents.declare',{service:'agent-service',title:'Erasure receipt privacy check',summary:'Content must disappear with its native subject',severity:'warning',idempotency_key:randomUUID()});
 assert.equal(created.result?.isError,false);
 const id=created.result.structuredContent.id;
 const args={kind:'incident',id,workspaceRevision:(await state()).revision,confirmation:'erase '+id,idempotency_key:randomUUID()};
 // A failure writing custody must roll back the erase and its fence together.
 await db.exec("CREATE TRIGGER refuse_erasure_receipt BEFORE INSERT ON oc_agent_erasure_receipts BEGIN SELECT RAISE(ABORT,'receipt storage unavailable'); END");
 const before=await state(),failed=await tool('oncall.privacy.erase',args);
 assert.ok(failed.result?.isError || failed.body?.error,'Custody storage failure refuses the erase');
 assert.equal(failed.result?.structuredContent,undefined);
 assert.deepEqual(await state(),before);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM oc_agent_erasure_receipts').first()).n,0);
 await db.exec('DROP TRIGGER refuse_erasure_receipt');
 args.idempotency_key=randomUUID();
 const held=autonomousPolicy();held.rules.unshift({id:'erase-review',class:'destructive',do:'approval',approver:['sponsor'],wait:'PT1H'});
 assert.equal((await adopt(held)).status,200);
 const pending=await tool('oncall.privacy.erase',args),approval=pending.result?._meta?.['com.runeditrun/approval'];
 assert.ok(approval,JSON.stringify(pending.body));
 const saved=(await (await http('/agents/api/approvals/'+approval.id)).json()).approval;
 const approved=await http('/agents/api/approvals/'+approval.id+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256});
 assert.equal((await approved.json()).approval.state,'executed');
 const once=await state(),first=await tool('oncall.privacy.erase',args),again=await tool('oncall.privacy.erase',args);
 assert.equal(first.result?.isError,false,JSON.stringify(first.body));
 assert.equal(first.result.structuredContent.state,'complete');
 assert.ok(!once.incidents.some(row=>row.id===id));
 assert.deepEqual(again.result.structuredContent,first.result.structuredContent);
 assert.equal(first.result._meta['com.runeditrun/receipt'].id,again.result._meta['com.runeditrun/receipt'].id);
 assert.deepEqual(await state(),once,'Completed erasure replay has no second native effect');
 const receipts=(await db.prepare('SELECT * FROM oc_agent_erasure_receipts').all()).results;
 assert.equal(receipts.length,1);
 assert.equal(receipts[0].approval,approval.id);
 for(const content of [id,args.confirmation,'Erasure receipt privacy check','Content must disappear with its native subject'])assert.ok(!JSON.stringify(receipts).includes(content),'Custody retains binding digests and ids without erased content');
 assert.equal(code(await tool('oncall.privacy.erase',{...args,idempotency_key:randomUUID()})),'not_found');
 assert.equal(code(await tool('oncall.privacy.erase',{...args,workspaceRevision:args.workspaceRevision+1})),'idempotency_conflict');
 assert.equal(code(await tool('oncall.privacy.erase',args,{scope:'incidents:read'})),'insufficient_scope');
 assert.equal(code(await tool('oncall.privacy.erase',args,{consent:randomUUID()})),'idempotency_conflict');
 assert.equal(code(await tool('oncall.privacy.erase',args,{client_id:randomUUID()})),'idempotency_conflict');
 assert.equal((await http('/agents/api/pause',{paused:true})).status,200);
 assert.equal(code(await tool('oncall.privacy.erase',args)),'agents_paused');
 assert.equal((await http('/agents/api/pause',{paused:false})).status,200);
 assert.equal((await adopt(held,{revoked:{agents:[],consents:[runtime.context.consent]}})).status,200);
 assert.equal((await tool('oncall.privacy.erase',args)).status,401);
 assert.equal((await adopt(held)).status,200);
 assert.equal((await adopt(held,{paused:true})).status,200);
 assert.equal(code(await tool('oncall.privacy.erase',args)),'agents_paused');
 assert.equal((await adopt(held)).status,200);
 assert.deepEqual(await state(),once,'Refused replay makes no new erase or native effect');
 // Apply the additive upgrade to a genuinely held receipt without class facts.
 // The prior binding survives byte-for-byte; no historical facts are invented.
 await db.exec('ALTER TABLE oc_agent_erasure_receipts DROP COLUMN classification');
 const heldReceipts=(await db.prepare('SELECT * FROM oc_agent_erasure_receipts').all()).results;
 await db.prepare(await readFile('migrations/core/0160_agent_erasure_classes.sql','utf8')).run();
 const upgraded=(await db.prepare('SELECT * FROM oc_agent_erasure_receipts').all()).results;
 assert.deepEqual(upgraded,heldReceipts.map(row=>({...row,classification:null})));
 assert.equal(code(await tool('oncall.privacy.erase',args)),'erasure_classification_unavailable');
 assert.deepEqual(await state(),once,'An older receipt cannot repeat the erase or disclose a cached result');
 const owner=(await (await http('/api/workspace')).json()).member;
 assert.equal((await http('/api/command',{type:'member',id:owner.id,role:'viewer',active:true})).status,200);
 const demoted=await tool('oncall.privacy.erase',args);
 assert.equal(demoted.status,401);assert.equal(demoted.result?.structuredContent,undefined);
 const restore=await runtime.request(runtime.origin+'/api/command',{method:'POST',headers:{Origin:runtime.origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({type:'member',id:owner.id,role:'admin',active:true})});
 assert.equal(restore.status,200);await restore.body?.cancel();
 assert.equal((await adopt()).status,200);
 console.log('PASS native erasure receipts: atomic rollback, held approval, equal one-effect replay, no retained content; new key, changed arguments, scope, consent, client, Pause and owner demotion refused');
}

/** Native subject effects, company policy and durable replay share the MCP door. */
export async function eraseClasses(runtime) {
 const {http,tool,adopt,db}=runtime,service='agent-foreign-service';
 const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
 const state=async()=>(await (await http('/api/state')).json());
 const json=async(path,input,status=200)=>{const response=await http(path,input);assert.equal(response.status,status,path);return response.json()};
 const owner=(await json('/api/workspace')).member;
 const facts=answer=>answer.decision.classes.map(({class:risk,facts})=>({class:risk,facts}));
 const destructive={class:'destructive',facts:{measure:1}},access={class:'access',facts:{measure:1,direction:'narrows'}},security={class:'security',facts:{measure:1,setting:'erasure-credentials'}},live={class:'live',facts:{measure:1,service}};
 const tables=['sources','oc_api_credentials','oc_endpoint_credentials','oc_intake_credentials','oc_incumbent_credentials','oc_change_credentials','oc_email_credentials','paging_control','paging_schedules','paging_jobs','oc_agent_erasure_receipts'];
 const snapshot=async()=>({state:await state(),imported:await json('/api/move-in/objects'),audit:(await db.prepare("SELECT * FROM oc_admin_audit WHERE outcome='accepted' AND (workspace_before<>workspace_after OR paging_before<>paging_after OR handoff_before<>handoff_after) ORDER BY ordinal").all()).results,tables:Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results])))});
 const fresh=()=>randomUUID();
 let sequence=500;
 async function fixture(type) {
  const id='synthetic-oncall-'+sequence++,key='synthetic-oncall-'+sequence+++'-credential-material';
  if(type==='history'||type==='pending') {
   const incident=await json('/api/command',{type:'declare',service:type==='pending'?'agent-service':service,title:id,summary:'Retained local coordination',severity:'warning',alerts:[]});
   return {kind:'incident',id:incident.id,expected:[destructive,...(type==='pending'?[{class:'live',facts:{measure:1,service:'agent-service'}}]:[])]};
  }
  if(type==='member'||type==='scheduled') {
   const member=await json('/api/members',{name:id,role:'responder',password:key},201);
   if(type==='scheduled') await json('/api/paging/schedules',{id,name:id,service,revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[member.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]});
   return {kind:'member',id:member.id,expected:[destructive,access,...(type==='scheduled'?[live]:[])],identitiesReviewed:true,importedPeople:[]};
  }
  if(type==='client'||type==='pending-client') {
   const client=await json('/api/automation/clients',{name:id,key,services:[service],permissions:['incidents:read']},201);
   if(type==='pending-client') {
    await json('/api/automation/endpoints',{name:id,client:client.id,services:[service],url:'https://8.8.8.8/'+id,key:'synthetic-oncall-'+sequence+++'-receiver-credential',approve:true},201);
    await json('/api/command',{type:'declare',service,title:id,summary:'Pending response must be removed',severity:'warning',alerts:[]});
   }
   return {kind:'client',id:client.id,expected:[destructive,access,security,...(type==='pending-client'?[live]:[])]};
  }
  if(type==='native') await json('/api/sources',{id,key,scopes:[service]});
  if(type==='imported-intake') {
   const door=ownerDoor({request:async(path,input,cookie,headers)=>{
    const response=await runtime.request(runtime.origin+path,{method:input===undefined?'GET':'POST',headers:{Origin:runtime.origin,Cookie:cookie,'Content-Type':'application/json',...headers},...(input===undefined?{}:{body:JSON.stringify(input)})});
    return {status:response.status,value:await response.json()};
   }},runtime.cookie);
   const before=new Set((await json('/api/move-in/objects')).map(row=>row.targetId));
   const plan=await door.preview('splunk',JSON.stringify({integrations:[{id,type:'REST',name:id}]}));
   assert.equal(plan.status,200,JSON.stringify(plan.value));
   const applied=await door.apply('splunk',plan.value);
   assert.equal(applied.status,200,JSON.stringify(applied.value));assert.equal(applied.value.job.state,'completed');
   const imported=(await json('/api/move-in/objects')).filter(row=>row.targetKind==='integration'&&!before.has(row.targetId));
   assert.equal(imported.length,1);
   await json('/api/intake/incumbent',{importedId:imported[0].targetId,importedRevision:imported[0].revision,id,service,name:id,revision:0,key},201);
   const activated=await http('/api/intake/sources/'+id+'/activate-incumbent',{revision:1,confirmed:true});
   assert.equal(activated.status,200);await activated.body?.cancel();
   return {kind:'intake',id,expected:[destructive,security,live]};
  }
  if(type==='intake'||type==='inactive-intake') {
   await json('/api/intake/sources',{id,name:id,provider:'pagerduty',service,key,revision:0},201);
   if(type==='inactive-intake') await json('/api/intake/sources/'+id+'/revoke',{revision:1});
  }
  if(type==='change') await json('/api/changes/sources',{id,name:id,provider:'native',service,repository:'',mode:'bearer',revision:0,key},201);
  if(type==='email') await json('/api/email/addresses',{id,name:id,service,owner:owner.id,localPart:'synthetic-oncall-'+sequence+++'-mailbox-credential',mode:'subject',fallback:'subject',rules:[]},201);
  return {kind:type==='inactive-intake'?'intake':type,id,expected:[destructive,...(type==='inactive-intake'?[]:[security,live])]};
 }
 for(const mode of ['autonomous','held']) for(const type of ['history','pending','member','scheduled','client','pending-client','native','intake','inactive-intake','change','email','imported-intake']) {
  assert.equal((await adopt()).status,200);
  const {expected,...target}=await fixture(type);
  const args={...target,workspaceRevision:(await state()).revision,confirmation:'erase '+target.id,idempotency_key:fresh()};
  let before=await snapshot();
  // Every affected class independently stops the dangerous path, and the
  // refusal audit retains exactly the server-computed facts.
  for(const {class:risk} of expected) {
   const policy=autonomousPolicy();policy.rules.unshift({id:'erase-stop-'+risk,class:risk,do:'blocked'});
   assert.equal((await adopt(policy)).status,200);
   const cursor=(await db.prepare('SELECT COALESCE(MAX(sequence),0) AS n FROM agent_door_audit').first()).n;
   const refused=await tool('oncall.privacy.erase',{...args,idempotency_key:fresh()});
   assert.equal(code(refused),'policy_blocked',type+' '+risk);
   assert.deepEqual(facts(refused),expected,type);
   assert.deepEqual(await snapshot(),before,'Blocked erasure has no native or credential effect');
   const audit=(await json('/agents/api/audit?agent='+runtime.context.agentId+'&after='+cursor)).rows.find(row=>row.id===refused.decision.id);
   assert.deepEqual(audit.classes.map(({class:risk,facts})=>({class:risk,facts})),expected);
  }
  if(type==='pending-client'&&mode==='autonomous') for(const [name,table,when] of [
   ['receipt','oc_agent_erasure_receipts',''],['audit','oc_admin_audit',"WHEN NEW.kind='client.erase' AND NEW.outcome='accepted'"]
  ]) {
   assert.equal((await adopt()).status,200);
   await db.exec(`CREATE TRIGGER refuse_erase_${name} BEFORE INSERT ON ${table} ${when} BEGIN SELECT RAISE(ABORT,'erasure transaction unavailable'); END`);
   const failed=await tool('oncall.privacy.erase',{...args,idempotency_key:fresh()});
   assert.ok(failed.result?.isError||failed.body?.error);
   assert.deepEqual(await snapshot(),before,'Audit and receipt failures roll back credentials, outbox, native audit and class custody');
   await db.exec('DROP TRIGGER refuse_erase_'+name);
  }
  const policy=autonomousPolicy();
  if(mode==='held') policy.rules.unshift({id:'erase-hold',class:'*',do:'approval',approver:['sponsor'],wait:'PT1H'});
  assert.equal((await adopt(policy)).status,200);
  if(type==='pending-client'&&mode==='held') {
   const stale=await tool('oncall.privacy.erase',args),approval=stale.result._meta['com.runeditrun/approval'];
   const saved=(await json('/agents/api/approvals/'+approval.id)).approval;
   await json('/api/members',{name:'synthetic-oncall-'+sequence++,role:'viewer',password:'synthetic-oncall-stale-review-password'},201);
   before=await snapshot();
   const refused=await json('/agents/api/approvals/'+approval.id+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256});
   assert.equal(refused.approval.state,'refused');assert.equal(refused.approval.code,'approval_evidence_changed');
   assert.deepEqual(await snapshot(),before,'Changed native revision requires fresh erasure review');
   args.workspaceRevision=before.state.revision;args.idempotency_key=fresh();
  }
  const result=await tool('oncall.privacy.erase',args);
  assert.deepEqual(facts(result),expected,type+' admitted facts');
  if(mode==='held') {
   const approval=result.result?._meta?.['com.runeditrun/approval'];assert.ok(approval,JSON.stringify(result.body));
   assert.deepEqual(await snapshot(),before,'Held erasure changes nothing before approval');
   const saved=(await json('/agents/api/approvals/'+approval.id)).approval;
   for(const input of [{revision:saved.revision+1,summary_sha256:saved.summary_sha256},{revision:saved.revision,summary_sha256:'0'.repeat(64)}]) {
    assert.equal((await http('/agents/api/approvals/'+approval.id+'/approve',input)).status,409);
    assert.deepEqual(await snapshot(),before,'A different approval revision or digest cannot erase');
   }
   const approved=await json('/agents/api/approvals/'+approval.id+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256});
   if(target.kind==='member') {
    // Released Base redacts this approval's raw subject arguments with the
    // member. Its tombstone deliberately preempts classification on replay.
    // Keep that privacy boundary; completing class-aware replay needs Base.
    assert.equal(approved.approval.code,'subject_erased',JSON.stringify(approved));
   } else assert.equal(approved.approval.state,'executed',JSON.stringify(approved));
  } else assert.equal(result.result?.isError,false,JSON.stringify(result.body));
  const once=await snapshot(),first=await tool('oncall.privacy.erase',args),again=await tool('oncall.privacy.erase',args);
  if(target.kind==='incident') assert.ok(!once.state.incidents.some(row=>row.id===target.id));
  if(target.kind==='member') assert.ok(once.state.members.some(row=>row.id===target.id&&row.erased&&!row.active));
  if(target.kind==='client') {
   assert.ok(!once.state.apiClients.some(row=>row.id===target.id));
   assert.ok(!once.state.apiEndpoints.some(row=>row.client===target.id));
   assert.ok(!(once.state.apiOutbox??[]).some(row=>row.client===target.id));
   assert.ok(!once.tables.oc_api_credentials.some(row=>row.client===target.id));
  }
  if(target.kind==='native') assert.ok(!once.tables.sources.some(row=>row.id===target.id));
  for(const [kind,rows] of [['intake',once.state.intakeSources],['change',once.state.changeSources],['email',once.state.emailAddresses]]) if(target.kind===kind) assert.ok(!(rows??[]).some(row=>row.id===target.id));
  if(mode==='held'&&target.kind==='member') {
   assert.equal(once.state.revision,before.state.revision+1);
   assert.ok(once.state.members.find(row=>row.id===target.id)?.erased);
   assert.deepEqual(JSON.parse(once.tables.oc_agent_erasure_receipts[0].classification),{v:1,classes:expected});
   assert.equal(code(first),'subject_erased');assert.equal(code(again),'subject_erased');
   assert.equal(first.result.structuredContent,undefined);
   assert.deepEqual(await snapshot(),once,'A redacted member approval cannot resurrect erased data or repeat its effect');
   console.log('PROBE SURFACE-004 acceptance4 held '+type+': one native erasure and retained '+expected.map(row=>row.class).join(', ')+'; Base subject_erased replay preempts class-aware policy admission (remaining dependency)');
   continue;
  }
  assert.equal(first.result?.isError,false,JSON.stringify(first.body));
  if(type==='imported-intake') {
   assert.equal(first.result.structuredContent.importCustody.state,'complete');
   assert.ok(!once.imported.some(row=>row.value.intakeSource===target.id),'Native erasure retires the owned import binding too');
  }
  assert.equal(first.result.structuredContent.standby,'not-reconciled');
  assert.equal(once.state.revision,before.state.revision+1,'Exactly one native erasure committed');
  assert.deepEqual(facts(first),expected,'A consumed target retains all admitted classes');
  assert.deepEqual(facts(again),expected);
  assert.deepEqual(first.result.structuredContent,again.result.structuredContent);
  if(mode==='held') assert.equal(first.result._meta['com.runeditrun/receipt'].id,again.result._meta['com.runeditrun/receipt'].id);
  assert.deepEqual(await snapshot(),once,'Completed retries have no duplicate effect');
  const receipts=once.tables.oc_agent_erasure_receipts;
  assert.equal(receipts.length,1);
  assert.deepEqual(JSON.parse(receipts[0].classification),{v:1,classes:expected});
  for(const value of [target.id,args.confirmation,args.idempotency_key]) assert.ok(!JSON.stringify(receipts).includes(value),'Class custody excludes erased content and raw arguments');
  for(const {class:risk} of expected) {
   const blocked=autonomousPolicy();blocked.rules.unshift({id:'completed-stop-'+risk,class:risk,do:'blocked'});
   assert.equal((await adopt(blocked)).status,200);
   const denied=await tool('oncall.privacy.erase',args);
   assert.equal(code(denied),'policy_blocked');assert.deepEqual(facts(denied),expected);
   assert.equal(denied.result.structuredContent,undefined);
   assert.deepEqual(await snapshot(),once,'Current policy fences completed erased targets');
  }
  console.log('PROBE SURFACE-004 acceptance4 '+mode+' '+type+': MCP erase -> '+expected.map(row=>row.class).join(', ')+'; isolated blocks, exact approval and stable one-effect replay passed');
 }
 assert.equal((await adopt()).status,200);
}
