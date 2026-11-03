import assert from 'node:assert/strict';
import {randomBytes,randomUUID,webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {automationRuntime} from './worker.mjs';
import initialize from './initialize-agent-owner.mjs';
import edge from './oncall-provider-edge.mjs';
import {recoveredResolutionTarget} from './oncall-agent-fixtures.mjs';
import {signJws,seconds,accessToken,policyEnvelope,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Real emitted Worker, native D1 and native owner lifecycle; only paid egress is replaced. */
export async function agentRuntime(){
 const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const kid=randomUUID(),publicKeys={[kid]:await webcrypto.subtle.exportKey('jwk',pair.publicKey)};
 const issuer='https://oncall-fixture.invalid',installationId=randomUUID(),sub=randomUUID(),email='alex@example.invalid',setupToken=randomBytes(32).toString('hex');
 let providerFixture=null;
 const fixtures={set(origin,value){assert.equal(origin,'https://8.8.8.8');providerFixture=value}};
 const runtime=await automationRuntime(request=>edge.fetch(request,{fixture:providerFixture}),{bindings:origin=>({
  OWNER_EMAIL:email,SETUP_TOKEN:setupToken,INBOUND_EMAIL_DOMAIN:'inbound.example.test',RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installationId,RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify(publicKeys),
  RER_BUSINESS_TRUST:JSON.stringify({v:1,issuer,audience:origin,subject:installationId,email,keys:publicKeys}),
 })});
 try{
  // The Worker answers early refusals (401/403) without draining the request body and closes the socket; a pooled undici connection reused after that raises ECONNRESET. Every request opens its own connection.
  const request=(absolute,init={})=>{const url=new URL(absolute);assert.equal(url.origin,runtime.origin);const headers=new Headers(init.headers);headers.set('Connection','close');return fetch(url,{...init,headers})};
  const bootstrap=await initialize({request,origin:runtime.origin,email,sub,displayName:'Alex Chen',token:setupToken,returnTo:'/',fixtures});
  const cookie=bootstrap.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');await bootstrap.body?.cancel();
  const surface=JSON.parse(await readFile('agent-surface.json','utf8'));
  const context={origin:runtime.origin,business:'northline-response',signer:{issuer,installationId,kid,privateKey:pair.privateKey},person:{email,sub},agentId:'responder-'+randomUUID(),consent:randomUUID(),surface,seq:0,revision:0};
  async function http(path,input,method=input===undefined?'GET':'POST'){
   return request(runtime.origin+path,{method,redirect:'manual',headers:{Origin:runtime.origin,Cookie:cookie,'Content-Type':'application/json'},...(input===undefined?{}:{body:JSON.stringify(input)})});
  }
  async function settings(team=null,rev=1){
   const now=seconds(),settings=await signJws(pair.privateKey,kid,'rer-business-settings+jwt',{v:1,iss:issuer,aud:runtime.origin,sub:installationId,business:context.business,email,owner_id:sub,jti:randomUUID(),iat:now,exp:now+300,rev,values:{display_name:'Northline Operations'},logo:null,team});
   const response=await http('/api/rer/business-settings',{settings});assert.equal(response.status,200);return response.json();
  }
  async function adopt(document=autonomousPolicy(),options={}){
   const signed=await policyEnvelope(context,document,options),response=await http('/api/rer/agent-policy',{policy:signed.policy});
   if(response.ok){context.seq=signed.payload.seq;context.revision=signed.payload.revision}
   return response;
  }
  async function mcp(method,params={},{token:retainedToken,...overrides}={}){
   const token=retainedToken??await accessToken(context,{act:{sub:context.agentId,name:'Responder assistant',specialist:'oncall-responder'},...overrides}),response=await request(runtime.origin+'/mcp',{method:'POST',headers:{Origin:runtime.origin,Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2026-07-28','Mcp-Method':method,...(params.name||params.uri?{'Mcp-Name':params.name??params.uri}:{})},body:JSON.stringify({jsonrpc:'2.0',id:randomUUID(),method,params:{...params,_meta:{...params._meta,'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})});
   const body=await response.json();return {status:response.status,headers:response.headers,body,message:body,result:body.result,decision:body.result?._meta?.['com.runeditrun/decision']??body.error?.data?._meta?.['com.runeditrun/decision']};
  }
  const tool=(name,args,overrides)=>mcp('tools/call',{name,arguments:args},overrides);
  await settings();
  return {...runtime,request,http,cookie,context,settings,adopt,mcp,tool,fixtures};
 }catch(error){await runtime.close();throw error}
}

/** Signed policy changes govern the next native calls and their retained audit. */
export async function policyAdoption(runtime){
 const {http,tool,adopt,context}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const snapshot=async()=>({application:await read('/api/state'),paging:await read('/api/paging/state')});
 const audit=()=>read('/agents/api/audit?agent='+encodeURIComponent(context.agentId));
 const target=await recoveredResolutionTarget(runtime,'Signed policy adoption coordination');
 const current=async()=> (await read('/api/state')).incidents.find(row=>row.id===target.id);
 const note=async()=>({incident:target.id,revision:(await current()).revision,text:'Synthetic coordination under the current signed policy',idempotency_key:randomUUID()});
 assert.deepEqual(await runtime.outboundRequests(),[]);
 for(const [label,document] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await adopt(document)).status,200);
  async function available(phase){
   const before=await snapshot(),args=await note();
   const served=await tool('oncall.services.read',{id:'agent-service'});
   assert.equal(served.result?.isError,false);
   assert.equal(served.result.structuredContent.data[0].id,'agent-service');
   assert.equal(served.decision.disposition,label==='held'?'review':'autonomous');
   assert.equal(served.decision.revision,context.revision);
   const changed=await tool('oncall.notes.add',args);
   assert.equal(changed.decision.revision,context.revision);
   assert.equal(changed.decision.disposition,label==='held'?'approval':'autonomous');
   if(label==='held'){
    assert.equal(changed.result.resultType,'input_required');
    assert.deepEqual(await snapshot(),before,'Approval preserves native state until the person approves');
    const pending=(await read('/agents/api/approvals/'+changed.result._meta['com.runeditrun/approval'].id)).approval;
    assert.equal(pending.revision,context.revision);
    const response=await http('/agents/api/approvals/'+pending.id+'/approve',{revision:pending.revision,summary_sha256:pending.summary_sha256});
    assert.equal(response.status,200);assert.equal((await response.json()).approval.state,'executed');
   }else assert.equal(changed.result?.isError,false);
   const saved=await current(),entry=saved.timeline.at(-1);
   assert.equal(saved.revision,args.revision+1);
   assert.equal(entry.text,args.text);
   assert.equal(entry.metadata?.agent?.agent.id,context.agentId);
   const rows=(await audit()).rows;
   const readRow=rows.find(row=>row.id===served.decision.id);
   assert.equal(readRow.revision,context.revision);
   assert.equal(readRow.outcome,'done');
   if(label==='held')assert.ok(readRow.review?.id,'A restored review read enters the review feed');
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log(`PROBE BASE-AGENT-007 7 ${label} ${phase}: native MCP read served; note ${label==='held'?'held then person-approved':'executed'} at signed revision ${context.revision}; zero outbound requests`);
  }
  await available('before adoption');
  // Resolve real targets and current revisions before adoption so these are
  // the very next MCP calls, with no stale or malformed input as a substitute.
  const args=await note(),before=await snapshot(),priorRevision=context.revision;
  const rule='stop-standard-'+label,blocked=structuredClone(document);
  blocked.rules.push({id:rule,class:'standard',do:'blocked'});
  const started=performance.now(),adoption=await adopt(blocked);
  assert.equal(adoption.status,200);
  const revision=context.revision,acknowledged=await adoption.json();
  assert.ok(revision>priorRevision);
  assert.deepEqual(acknowledged.adopted,{seq:context.seq,revision});
  const refusals=[];
  for(const [name,input] of [['oncall.services.read',{id:'agent-service'}],['oncall.notes.add',args]]){
   const answer=await tool(name,input),elapsed=performance.now()-started;
   assert.ok(elapsed<60000,`Signed adoption must refuse the next ${name} within 60 seconds (${elapsed.toFixed(0)}ms)`);
   const error=answer.result?._meta?.['com.runeditrun/error'];
   assert.equal(error?.code,'policy_blocked');
   assert.equal(error.class,'standard');assert.equal(error.rule,rule);assert.equal(error.revision,revision);
   assert.equal(answer.decision.disposition,'blocked');assert.equal(answer.decision.revision,revision);
   const standard=answer.decision.classes.find(row=>row.class==='standard');
   assert.equal(standard.rule,rule);assert.equal(standard.do,'blocked');
   assert.equal(answer.result.structuredContent,undefined,'A policy refusal discloses no native content');
   refusals.push({name,id:answer.decision.id,elapsed});
  }
  assert.deepEqual(await snapshot(),before,'Adoption and refused calls preserve application and paging state');
  const adopted=await read('/agents/api/state');
  assert.equal(adopted.policy.revision,revision);
  const retained=await audit();
  assert.equal(retained.differs_from_policy,0);
  for(const refusal of refusals){
   const row=retained.rows.find(row=>row.id===refusal.id);
   assert.ok(row,'The refusal must have a retained native audit row');
   assert.equal(row.tool,refusal.name);assert.equal(row.code,'policy_blocked');
   assert.equal(row.decision,'blocked');assert.equal(row.outcome,'refused');assert.equal(row.revision,revision);
   assert.deepEqual(row.rules.find(item=>item.class==='standard'),{class:'standard',rule,do:'blocked'});
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log(`PROBE BASE-AGENT-007 7 ${label} ${refusal.name}: next schema-valid MCP call -> policy_blocked in ${refusal.elapsed.toFixed(0)}ms; decision and retained audit rule ${rule}, revision ${revision}; application and paging unchanged; zero outbound requests`);
  }
  assert.equal((await adopt(document)).status,200);
  await available('after restoration');
  const restored=await audit();
  assert.equal(restored.differs_from_policy,0);
  for(const refusal of refusals)assert.deepEqual(restored.rows.find(row=>row.id===refusal.id),retained.rows.find(row=>row.id===refusal.id),'Restoring policy preserves the original refusal revision and rule');
 }
 assert.equal((await adopt()).status,200);
 console.log('PASS signed native policy adoption: next read and coordination mutation blocked within 60 seconds under both policies; retained rule and revision survive restoration; policy-appropriate access restored; zero outbound requests');
}

/** Business consent receiving-door proof; signed fixtures confer no account proof. */
export async function consentRevocationMatrix(runtime){
 const {http,tool,adopt,db,context}=runtime;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const owner=(await read('/api/workspace')).member;
 const rows=async table=>(await db.prepare('SELECT * FROM "'+table.replaceAll('"','""')+'"').all()).results.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 const names=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name").all()).results.map(row=>row.name);
 // Refusal audit, its Business relay and native audit bookkeeping are checked
 // separately. Approval, review, replay, usage and event custody stay exact.
 const tables=names.filter(name=>!['agent_door_audit','agent_door_relay','oc_admin_audit','oc_audit_clock'].includes(name));
 const snapshot=async()=>({application:await read('/api/state'),paging:await read('/api/paging/state'),tables:Object.fromEntries(await Promise.all(tables.map(async name=>[name,await rows(name)])))});
 const audit=async()=>(await db.prepare('SELECT * FROM agent_door_audit ORDER BY sequence').all()).results;
 const relay=async()=>(await db.prepare('SELECT * FROM agent_door_relay ORDER BY sequence').all()).results;
 const nativeAudit=async()=>(await db.prepare('SELECT * FROM oc_admin_audit ORDER BY ordinal').all()).results;
 const revokedConsents=[];
 let maximum=0;
 for(const [label,document] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await adopt(document)).status,200);
  const target=await recoveredResolutionTarget(runtime,'Business consent revocation '+label);
  const current=async()=> (await read('/api/state')).incidents.find(row=>row.id===target.id);
  const note=async()=>({incident:target.id,revision:(await current()).revision,text:'Synthetic consent coordination '+label,idempotency_key:randomUUID()});
  async function client(){
   const agentId='synthetic-oncall-'+randomUUID(),consent=randomUUID();
   const token=await accessToken({...context,agentId,consent});
   const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
   return {agentId,consent,token,expires:claims.exp};
  }
  const revoked=await client(),control=await client();
  async function available(client,phase,args){
   assert.ok(seconds()<client.expires,'The exact retained bearer is still unexpired');
   const found=await tool('oncall.services.read',{id:'agent-service'},{token:client.token});
   assert.equal(found.status,200);assert.equal(found.result?.isError,false);
   assert.equal(found.result.structuredContent.data[0].id,'agent-service');
   assert.equal(found.decision.disposition,label==='held'?'review':'autonomous');
   args??=await note();
   const before=await read('/api/state'),paging=await read('/api/paging/state');
   const changed=await tool('oncall.notes.add',args,{token:client.token});
   assert.equal(changed.status,200);
   assert.equal(changed.decision.disposition,label==='held'?'approval':'autonomous');
   if(label==='held'){
    assert.equal(changed.result.resultType,'input_required');
    assert.deepEqual(await read('/api/state'),before,'A separately consented held note waits for the human');
    assert.deepEqual(await read('/api/paging/state'),paging);
    const pending=(await read('/agents/api/approvals/'+changed.result._meta['com.runeditrun/approval'].id)).approval;
    const approved=await http('/agents/api/approvals/'+pending.id+'/approve',{revision:pending.revision,summary_sha256:pending.summary_sha256});
    assert.equal(approved.status,200);assert.equal((await approved.json()).approval.state,'executed');
   }else assert.equal(changed.result?.isError,false);
   const after=await current(),entry=after.timeline.at(-1);
   assert.equal(after.revision,args.revision+1);assert.equal(entry.text,args.text);
   assert.equal(entry.metadata?.agent?.agent.id,client.agentId);
   assert.equal(entry.metadata?.agent?.for.id,owner.id);
   const retained=(await audit()).map(row=>JSON.parse(row.row)).find(row=>row.id===found.decision.id);
   assert.equal(retained.consent,client.consent);assert.equal(retained.sponsor.id,owner.id);
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log(`PROBE BASE-AGENT-004 6 ${label} ${phase}: retained bearer reads native service; note ${label==='held'?'held then human-approved':'executed'} with actual agent and sponsor attribution; zero outbound requests`);
   return args;
  }
  const completedNote=await available(revoked,'before revocation');
  const completedState=await read('/api/state'),completedPaging=await read('/api/paging/state');
  const replay=await tool('oncall.notes.add',completedNote,{token:revoked.token});
  assert.equal(replay.status,200);assert.equal(replay.result?.isError,false);
  assert.equal(replay.result.structuredContent.id,target.id);
  assert.equal(replay.result.structuredContent.revision,completedNote.revision+1);
  assert.equal(replay.result.structuredContent.timeline.at(-1).text,completedNote.text,'The retained key returns its private native note before revocation');
  assert.deepEqual(await read('/api/state'),completedState,'An admitted completed retry cannot append the note again');
  assert.deepEqual(await read('/api/paging/state'),completedPaging);
  assert.equal((await audit()).map(row=>JSON.parse(row.row)).find(row=>row.id===replay.decision.id).outcome,'replayed');
  await available(control,'control before revocation');
  revokedConsents.push(revoked.consent);
  const started=performance.now();
  assert.equal((await adopt(document,{revoked:{agents:[],consents:revokedConsents}})).status,200);
  // Adoption may expire prior approvals. Only subsequent refused calls are
  // compared with this post-revocation baseline, never with pre-adoption state.
  const before=await snapshot(),auditBefore=await audit(),relayBefore=await relay(),nativeBefore=await nativeAudit(),clockBefore=await rows('oc_audit_clock'),args=await note();
  if(label==='held'){
   assert.ok(before.tables.agent_door_approvals.some(row=>row.state==='executed'),'Approval custody is populated before refusal isolation');
   assert.ok(before.tables.agent_door_reviews.length>0,'Review custody is populated before refusal isolation');
  }
  const attempts=[['read','oncall.services.read',{id:'agent-service'}],['fresh mutation','oncall.notes.add',args],['completed retry','oncall.notes.add',completedNote]];
  for(const [attempt,name,input] of attempts){
   assert.ok(seconds()<revoked.expires,'Expiration cannot substitute for consent revocation');
   const refused=await tool(name,input,{token:revoked.token}),elapsed=performance.now()-started;
   maximum=Math.max(maximum,elapsed);
   assert.equal(refused.status,401,label+' '+name);
   assert.ok(elapsed<60000,`Next ${name} refused in ${elapsed.toFixed(0)}ms`);
   assert.ok(seconds()<revoked.expires,'The refused bearer remains unexpired');
   assert.equal(refused.result,undefined,'Revocation returns no private native outcome');
   assert.deepEqual(refused.body.error,{code:-32001,message:'Unauthorized',data:{code:'unauthenticated'}});
   assert.match(refused.headers.get('www-authenticate'),/resource_metadata="/);
   const after=await snapshot();
   assert.ok(isDeepStrictEqual(after.application,before.application),'Revoked consent preserves application records, revisions and timeline');
   assert.ok(isDeepStrictEqual(after.paging,before.paging),'Revoked consent preserves paging state');
   for(const table of tables)assert.ok(isDeepStrictEqual(after.tables[table],before.tables[table]),`Revoked consent preserves ${table}`);
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log(`PROBE BASE-AGENT-004 6 ${label} ${attempt} ${name}: exact still-unexpired bearer after signed consent revocation -> 401 in ${elapsed.toFixed(0)}ms; no private outcome; all non-audit D1 rows and outbound ledger unchanged`);
  }
  const auditAfter=await audit(),relayAfter=await relay();
  assert.deepEqual(auditAfter.slice(0,auditBefore.length),auditBefore,'Prior audit custody is immutable');
  const refusals=auditAfter.slice(auditBefore.length);
  assert.equal(refusals.length,attempts.length,'Only one refusal audit per attempted call');
  for(const [index,record] of refusals.entries()){
   const row=JSON.parse(record.row);
   assert.equal(row.tool,attempts[index][1]);
   assert.equal(row.agent.id,revoked.agentId);assert.equal(row.consent,revoked.consent);
   assert.equal(row.sponsor.id,owner.id);assert.equal(row.outcome,'refused');assert.equal(row.code,'unauthenticated');
   assert.equal(row.approval,null);assert.equal(row.review,null);
  }
  assert.deepEqual(relayAfter.slice(0,relayBefore.length),relayBefore);
  assert.deepEqual(relayAfter.slice(relayBefore.length).map(row=>({decision_id:row.decision_id,business:row.business})),refusals.map(row=>({decision_id:row.id,business:context.business})),'Only the documented refusal audits enter the Business relay');
  const nativeAfter=await nativeAudit();
  assert.ok(isDeepStrictEqual(nativeAfter.slice(0,nativeBefore.length),nativeBefore),'Prior permanent audit rows stay immutable');
  const persistence=nativeAfter.slice(nativeBefore.length);
  // Each refused tool first sweeps expired replay custody (no change here),
  // then stores its refusal audit. "accepted" records that audit insert only.
  assert.equal(persistence.length,attempts.length*2);
  for(const [index,row] of persistence.entries()){
   assert.equal(row.kind,'agent-door.persistence');assert.equal(row.feature,'workspace');
   assert.equal(row.outcome,index%2===0?'refused':'accepted');
   assert.equal(row.before_revision,clockBefore[0].revision+Math.floor(index/2));
   assert.equal(row.after_revision,row.before_revision+index%2);
   for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after'],'Refusal audit never commits native application changes');
   assert.equal(row.named_member,null);assert.equal(row.detail,null);
  }
  const [clockAfter]=await rows('oc_audit_clock'),last=persistence.at(-1);
  assert.ok(Number.isSafeInteger(clockAfter.changes_before)&&clockAfter.changes_before>clockBefore[0].changes_before);
  assert.deepEqual(clockAfter,{...clockBefore[0],revision:clockBefore[0].revision+attempts.length,changed:1,changes_before:clockAfter.changes_before,actor_label:last.actor,subject_label:last.subject,source_label:last.source},'Only the refusal audit clock and attribution advance');
  // The control completes the exact payload the revoked bearer could not run.
  // Its current native revision and fields must remain valid after refusal.
  await available(control,'control after revocation with the identical refused mutation',args);
 }
 assert.equal((await adopt()).status,200);
 console.log(`PASS Business consent receiving door: both company policies, same unexpired bearers, maximum refusal ${maximum.toFixed(0)}ms, fresh mutation and completed retry refused without cached content, exact native and approval and review and paging isolation, attributed refusal audit only, separately consented controls and zero outbound requests; no Business account propagation claim`);
}

/** Public-door Pause matrix; the browser supplies the real local control. */
export async function pauseMatrix(runtime,{setLocal=async paused=>{
 const response=await runtime.http('/agents/api/pause',{paused});
 assert.equal(response.status,200);await response.json();
},observe=async()=>{}}={}){
 const {http,tool,adopt}=runtime;
 const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
 const read=async path=>{const response=await http(path);assert.equal(response.status,200);return response.json()};
 const flags=async()=> (await read('/agents/api/state')).paused;
 const snapshot=async()=>({application:await read('/api/state'),paging:await read('/api/paging/state')});
 const owner=(await read('/api/workspace')).member;
 const target=await recoveredResolutionTarget(runtime,'Independent Pause flag coordination');
 const current=async()=> (await read('/api/state')).incidents.find(row=>row.id===target.id);
 const note=async()=>({incident:target.id,revision:(await current()).revision,text:'Synthetic coordination through the current policy',idempotency_key:randomUUID()});
 const edge=await runtime.outboundRequests();
 let maximum=0;
 for(const [label,document] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await adopt(document)).status,200);
  assert.deepEqual(await flags(),{business:false,local:false});
  async function available(phase){
   const before=await snapshot(),args=await note();
   const result=await tool('oncall.services.read',{id:'agent-service'});
   assert.equal(result.result?.isError,false);
   assert.equal(result.result.structuredContent.data[0].id,'agent-service');
   assert.equal(result.decision.disposition,label==='held'?'review':'autonomous');
   const changed=await tool('oncall.notes.add',args);
   assert.equal(changed.decision.disposition,label==='held'?'approval':'autonomous');
   if(label==='held'){
    assert.equal(changed.result.resultType,'input_required');
    assert.deepEqual(await snapshot(),before,'Held coordination waits without a native effect');
    const pending=(await read('/agents/api/approvals/'+changed.result._meta['com.runeditrun/approval'].id)).approval;
    const approval=await http('/agents/api/approvals/'+pending.id+'/approve',{revision:pending.revision,summary_sha256:pending.summary_sha256});
    assert.equal(approval.status,200);assert.equal((await approval.json()).approval.state,'executed');
   }else assert.equal(changed.result?.isError,false);
   const after=await current(),entry=after.timeline.at(-1);
   assert.equal(after.revision,args.revision+1);
   assert.equal(entry.text,args.text);
   assert.equal(entry.metadata?.agent?.agent.id,runtime.context.agentId);
   assert.deepEqual(await runtime.outboundRequests(),edge);
   console.log(`PROBE BASE-AGENT-011 6 ${label} ${phase}: next MCP read served; note ${label==='held'?'held then human-approved':'executed'}; zero outbound requests`);
  }
  async function cannotResume(expected){
   const before=await snapshot(),policy=await read('/agents/api/state');
   const token=await accessToken(runtime.context);
   for(const withCookie of [false,true]){
    const response=await runtime.request(runtime.origin+'/agents/api/pause',{method:'POST',headers:{Origin:runtime.origin,Authorization:'Bearer '+token,'Content-Type':'application/json',...(withCookie?{Cookie:runtime.cookie}:{})},body:JSON.stringify({paused:false})});
    assert.equal(response.status,403);
    assert.equal((await response.json()).code,'person_session_required');
    assert.deepEqual(await read('/agents/api/state'),policy,'Bearer resume cannot change either flag or the policy');
    assert.deepEqual(await snapshot(),before,'Bearer resume preserves application and paging state');
   }
   assert.deepEqual(await flags(),expected);
   console.log(`PROBE BASE-AGENT-011 7 ${label}: agent bearer resume with and without owner cookie -> 403; flags ${JSON.stringify(expected)} unchanged`);
  }
  async function refused(expected,started,phase){
   // Prepare schema-valid calls at the current native revision. A malformed or
   // stale request cannot substitute for the paused authority refusal.
   const args=await note(),before=await snapshot();
   for(const [name,input] of [['oncall.services.read',{id:'agent-service'}],['oncall.notes.add',args]]){
    const answer=await tool(name,input),elapsed=performance.now()-started;maximum=Math.max(maximum,elapsed);
    assert.equal(code(answer),'agents_paused',phase+' '+name);
    assert.equal(answer.result.structuredContent,undefined,'Pause discloses no native result');
    assert.ok(elapsed<60000,`Next ${name} refused in ${elapsed.toFixed(0)}ms`);
    assert.deepEqual(await snapshot(),before,'Pause refusal preserves application records, revisions, outbox and paging');
   }
   await cannotResume(expected);
   assert.deepEqual(await runtime.outboundRequests(),edge);
   await observe(label,phase,expected);
   console.log(`PROBE BASE-AGENT-011 6 ${label} ${phase}: valid next MCP read and note -> agents_paused in ${(performance.now()-started).toFixed(0)}ms; application and paging unchanged; zero outbound requests`);
  }
  async function change(action,expected,phase){const started=performance.now();await action();await refused(expected,started,phase)}
  await available('initially on');
  await change(()=>setLocal(true),{business:false,local:true},'local-only');
  await change(async()=>assert.equal((await adopt(document,{paused:true})).status,200),{business:true,local:true},'both');
  // The signed-in human still reads and coordinates with both flags set.
  const personBefore=await current(),pagingBefore=await read('/api/paging/state');
  const humanText='Human coordination remains available during both Pause flags';
  const human=await http('/api/command',{type:'note',incident:target.id,revision:personBefore.revision,text:humanText});
  assert.equal(human.status,200);await human.json();
  const personAfter=await current(),entry=personAfter.timeline.at(-1);
  assert.equal(personAfter.revision,personBefore.revision+1);
  assert.equal(entry.text,humanText);assert.equal(entry.actor,owner.id);assert.equal(entry.metadata?.agent,undefined);
  const pagingAfter=await read('/api/paging/state');
  assert.deepEqual({...pagingAfter,workspaceRevision:0},{...pagingBefore,workspaceRevision:0});
  console.log(`PROBE BASE-AGENT-011 6 ${label}: owner session reads and adds an attributed note with both flags set; paging unchanged`);
  await change(()=>setLocal(false),{business:true,local:false},'Business-only after local resume');
  await change(()=>setLocal(true),{business:true,local:true},'both again');
  await change(async()=>assert.equal((await adopt(document)).status,200),{business:false,local:true},'local-only after Business resume');
  await setLocal(false);
  assert.deepEqual(await flags(),{business:false,local:false});
  await available('both resumed');
  await observe(label,'resumed',{business:false,local:false});
 }
 assert.deepEqual(await runtime.outboundRequests(),edge);
 assert.equal((await adopt()).status,200);
 console.log(`PASS independent Pause flags: both policies, valid next reads and mutations, maximum refusal ${maximum.toFixed(0)}ms, bearer resume 403 including owner cookie, human coordination and policy-appropriate resume; zero outbound requests`);
}
