import assert from 'node:assert/strict';
import {randomBytes,randomUUID,webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {request as httpRequest} from 'node:http';
import {automationRuntime} from './worker.mjs';
import initialize from './initialize-agent-owner.mjs';
import edge from './oncall-provider-edge.mjs';
import {recoveredResolutionTarget} from './oncall-agent-fixtures.mjs';
import {signJws,seconds,accessToken,policyEnvelope,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Compare durable effects while permitting attempt audit and rate bookkeeping. */
export async function agentEffectSnapshot({db,http}){
 const response=await http('/api/state');assert.equal(response.status,200);
 const application=await response.json();
 const tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name").all()).results.map(row=>row.name)
  .filter(name=>!['agent_door_audit','agent_door_relay','oc_audit_clock'].includes(name));
 const statements=tables.map(name=>db.prepare(name==='agent_door_agents'
  ? 'SELECT id,name,specialist,sponsor,sponsor_name,revoked FROM agent_door_agents'
  : name==='oc_admin_audit'
   ? 'SELECT * FROM oc_admin_audit WHERE workspace_before<>workspace_after OR paging_before<>paging_after OR handoff_before<>handoff_after'
   : 'SELECT * FROM "'+name.replaceAll('"','""')+'"'));
 const records=Object.fromEntries((await db.batch(statements)).map((row,index)=>[tables[index],row.results.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
 return {application,records};
}

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
  async function agentHttp(path,input,{withOwnerCookie=false}={}){
   const token=await accessToken(context,{act:{sub:context.agentId,name:'Responder assistant',specialist:'oncall-responder'}});
   return request(runtime.origin+path,{method:'POST',redirect:'manual',headers:{Origin:runtime.origin,Authorization:'Bearer '+token,'Content-Type':'application/json',...(withOwnerCookie?{Cookie:cookie}:{})},body:JSON.stringify(input)});
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
  async function mcpRequest(method,params,overrides,bearer,transport={}){
   const version=transport.version??'2026-07-28';
   const token=bearer??await accessToken(context,{act:{sub:context.agentId,name:'Responder assistant',specialist:'oncall-responder'},...overrides}),id=randomUUID();
   return {id,url:runtime.origin+'/mcp',init:{method:'POST',headers:{Origin:runtime.origin,Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':version,'Mcp-Method':method,...(params.name||params.uri?{'Mcp-Name':params.name??params.uri}:{}),...transport.headers},body:JSON.stringify({jsonrpc:'2.0',id,method,params:version==='2026-07-28'?{...params,_meta:{...params._meta,'io.modelcontextprotocol/protocolVersion':version}}:params})}};
  }
  async function mcp(method,params={},overrides={},bearer,transport={}){
   const {url,init}=await mcpRequest(method,params,overrides,bearer,transport),response=await request(url,init);
   const body=await response.json();return {status:response.status,headers:response.headers,body,message:body,result:body.result,decision:body.result?._meta?.['com.runeditrun/decision']??body.error?.data?._meta?.['com.runeditrun/decision']};
  }
  async function discardToolResponse(name,args,overrides={}){
   const {id,url,init}=await mcpRequest('tools/call',{name,arguments:args},overrides);
   // Use the real HTTP socket, with no body consumer or JSON parser attached.
   // Destroy at headers so the caller cannot learn the committed tool outcome.
   return new Promise((resolve,reject)=>{
    const outgoing=httpRequest(url,{method:init.method,headers:init.headers,agent:false},response=>{
     try{
      assert.equal(response.readableFlowing,null);
      assert.equal(response.readableDidRead,false);
      assert.equal(response.readableEnded,false);
      response.once('close',()=>resolve({id,status:response.statusCode,discarded:response.destroyed,aborted:response.readableAborted,bodyRead:response.readableDidRead}));
      response.destroy();
     }catch(error){response.destroy();reject(error)}
    });
    outgoing.on('error',reject);
    outgoing.setTimeout(30_000,()=>outgoing.destroy(new Error('MCP response-loss request timed out')));
    outgoing.end(init.body);
   });
  }
  const mcpWithToken=(token,method,params={})=>mcp(method,params,{},token);
  const tool=(name,args,overrides,bearer)=>mcp('tools/call',{name,arguments:args},overrides,bearer);
  await settings();
  return {...runtime,request,http,agentHttp,cookie,context,settings,adopt,mcp,mcpWithToken,tool,discardToolResponse,fixtures};
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
  // Reuse an already admitted credential: observing a new policy cannot rely
  // on a token refresh or a new agent identity.
  const bearer=await accessToken(context,{act:{sub:context.agentId,name:'Responder assistant',specialist:'oncall-responder'}});
  const call=(name,args)=>tool(name,args,{},bearer);
  async function available(phase){
   const before=await snapshot(),args=await note();
   const served=await call('oncall.services.read',{id:'agent-service'});
   assert.equal(served.result?.isError,false);
   assert.equal(served.result.structuredContent.data[0].id,'agent-service');
   assert.equal(served.decision.disposition,label==='held'?'review':'autonomous');
   assert.equal(served.decision.revision,context.revision);
   const changed=await call('oncall.notes.add',args);
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
   assert.equal(readRow.decision,served.decision.disposition);
   assert.deepEqual(readRow.rules,served.decision.classes.map(({class:cls,rule,do:action})=>({class:cls,rule,do:action})));
   if(label==='held')assert.ok(readRow.review?.id,'A restored review read enters the review feed');
   const noteRow=rows.find(row=>row.id===changed.decision.id);
   assert.ok(noteRow,'The admitted note retains its policy decision');
   assert.equal(noteRow.revision,context.revision);
   assert.equal(noteRow.decision,changed.decision.disposition);
   assert.equal(noteRow.outcome,label==='held'?'pending':'done');
   assert.deepEqual(noteRow.rules,changed.decision.classes.map(({class:cls,rule,do:action})=>({class:cls,rule,do:action})));
   if(label==='held'){
    const execution=rows.find(row=>row.decision_id===changed.decision.id);
    assert.ok(execution,'The approved note retains its execution audit');
    assert.equal(execution.revision,context.revision);assert.equal(execution.outcome,'done');
    assert.deepEqual(execution.rules,noteRow.rules);
    assert.ok(execution.approval.by.includes(entry.metadata.agent.for.id));
   }
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log(`PROBE BASE-AGENT-007 7 ${label} ${phase}: same-bearer native MCP read served; note ${label==='held'?'held then person-approved':'executed'} and retained audit at signed revision ${context.revision}; zero outbound requests`);
  }
  await available('before adoption');
  // Resolve real targets and current revisions before adoption so these are
  // the very next MCP calls, with no stale or malformed input as a substitute.
  const args=await note(),before=await snapshot(),beforeApprovals=await read('/agents/api/approvals'),priorRevision=context.revision;
  const rule='stop-standard-'+label,blocked=structuredClone(document);
  blocked.rules.push({id:rule,class:'standard',do:'blocked'});
  const started=performance.now(),adoption=await adopt(blocked);
  assert.equal(adoption.status,200);
  const revision=context.revision,acknowledged=await adoption.json();
  assert.ok(revision>priorRevision);
  assert.deepEqual(acknowledged.adopted,{seq:context.seq,revision});
  const refusals=[];
  for(const [name,input] of [['oncall.services.read',{id:'agent-service'}],['oncall.notes.add',args]]){
   const answer=await call(name,input),elapsed=performance.now()-started;
   assert.ok(elapsed<60000,`Signed adoption must refuse the next ${name} within 60 seconds (${elapsed.toFixed(0)}ms)`);
   const error=answer.result?._meta?.['com.runeditrun/error'];
   assert.equal(error?.code,'policy_blocked');
   assert.equal(error.class,'standard');assert.equal(error.rule,rule);assert.equal(error.revision,revision);
   assert.equal(answer.decision.disposition,'blocked');assert.equal(answer.decision.revision,revision);
   const standard=answer.decision.classes.find(row=>row.class==='standard');
   assert.equal(standard.rule,rule);assert.equal(standard.do,'blocked');
   assert.equal(answer.result.structuredContent,undefined,'A policy refusal discloses no native content');
   assert.deepEqual(await snapshot(),before,'Each blocked call preserves application and paging state');
   assert.deepEqual(await read('/agents/api/approvals'),beforeApprovals,'A blocked call cannot enqueue an approval');
   refusals.push({name,id:answer.decision.id,elapsed,decision:answer.decision});
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
   assert.deepEqual(row.resource,refusal.name==='oncall.services.read'?{kind:'service',id:'agent-service'}:{kind:'incident',id:target.id});
   assert.deepEqual(row.classes,refusal.decision.classes.map(({class:cls,facts})=>({class:cls,facts})));
   assert.equal(row.decision,'blocked');assert.equal(row.outcome,'refused');assert.equal(row.revision,revision);
   assert.deepEqual(row.rules.find(item=>item.class==='standard'),{class:'standard',rule,do:'blocked'});
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log(`PROBE BASE-AGENT-007 7 ${label} ${refusal.name}: next schema-valid MCP call with admitted bearer -> policy_blocked in ${refusal.elapsed.toFixed(0)}ms; decision and retained audit rule ${rule}, revision ${revision}; application and paging unchanged; zero outbound requests`);
  }
  assert.equal((await adopt(document)).status,200);
  await available('after restoration');
  const restored=await audit();
  assert.equal(restored.differs_from_policy,0);
  for(const refusal of refusals)assert.deepEqual(restored.rows.find(row=>row.id===refusal.id),retained.rows.find(row=>row.id===refusal.id),'Restoring policy preserves the original refusal revision and rule');
 }
 assert.equal((await adopt()).status,200);
 console.log('PASS signed native policy adoption: same-bearer next read and coordination mutation blocked within 60 seconds under both policies; retained rule and revision survive restoration; policy-appropriate access restored; zero outbound requests');
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
  // Retain the exact admitted credential across every flag transition. Minting
  // a replacement for each call would not prove that Pause stops existing tokens.
  const retainedToken=await accessToken(runtime.context,{act:{sub:runtime.context.agentId,name:'Responder assistant',specialist:'oncall-responder'}});
  const retainedTool=(name,args)=>runtime.mcpWithToken(retainedToken,'tools/call',{name,arguments:args});
  async function available(phase){
   for(const [credential,call] of [['retained',retainedTool],['fresh',tool]]){
   const before=await snapshot(),args=await note();
   const result=await call('oncall.services.read',{id:'agent-service'});
   assert.equal(result.result?.isError,false);
   assert.equal(result.result.structuredContent.data[0].id,'agent-service');
   assert.equal(result.decision.disposition,label==='held'?'review':'autonomous');
   const changed=await call('oncall.notes.add',args);
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
   console.log(`PROBE BASE-AGENT-011 6 ${label} ${phase}: ${credential} bearer read served; note ${label==='held'?'held then human-approved':'executed'}; zero outbound requests`);
   }
  }
  async function cannotResume(expected){
   const before=await snapshot(),policy=await read('/agents/api/state');
   const token=await accessToken(runtime.context);
   for(const bearer of [retainedToken,token])for(const withCookie of [false,true]){
    const response=await runtime.request(runtime.origin+'/agents/api/pause',{method:'POST',headers:{Origin:runtime.origin,Authorization:'Bearer '+bearer,'Content-Type':'application/json',...(withCookie?{Cookie:runtime.cookie}:{})},body:JSON.stringify({paused:false})});
    assert.equal(response.status,403);
    assert.equal((await response.json()).code,'person_session_required');
    assert.deepEqual(await read('/agents/api/state'),policy,'Bearer resume cannot change either flag or the policy');
    assert.deepEqual(await snapshot(),before,'Bearer resume preserves application and paging state');
   }
   assert.deepEqual(await flags(),expected);
   console.log(`PROBE BASE-AGENT-011 7 ${label}: retained and fresh agent bearer resume with and without owner cookie -> 403; flags ${JSON.stringify(expected)} unchanged`);
  }
  async function refused(expected,started,phase){
   // Prepare schema-valid calls at the current native revision. A malformed or
   // stale request cannot substitute for the paused authority refusal.
   const args=await note(),before=await snapshot();
   for(const call of [retainedTool,tool])for(const [name,input] of [['oncall.services.read',{id:'agent-service'}],['oncall.notes.add',args]]){
    const answer=await call(name,input),elapsed=performance.now()-started;maximum=Math.max(maximum,elapsed);
    assert.equal(code(answer),'agents_paused',phase+' '+name);
    assert.equal(answer.result.structuredContent,undefined,'Pause discloses no native result');
    assert.ok(elapsed<60000,`Next ${name} refused in ${elapsed.toFixed(0)}ms`);
    assert.deepEqual(await snapshot(),before,'Pause refusal preserves application records, revisions, outbox and paging');
   }
   await cannotResume(expected);
   assert.deepEqual(await runtime.outboundRequests(),edge);
   await observe(label,phase,expected);
   console.log(`PROBE BASE-AGENT-011 6 ${label} ${phase}: retained and fresh bearer valid next MCP read and note -> agents_paused in ${(performance.now()-started).toFixed(0)}ms; application and paging unchanged; zero outbound requests`);
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
