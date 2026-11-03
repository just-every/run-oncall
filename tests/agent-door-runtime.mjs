import assert from 'node:assert/strict';
import {randomBytes,randomUUID,webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {automationRuntime} from './worker.mjs';
import initialize from './initialize-agent-owner.mjs';
import edge from './oncall-provider-edge.mjs';
import {recoveredResolutionTarget} from './oncall-agent-fixtures.mjs';
import {signJws,seconds,accessToken,policyEnvelope,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Real emitted Worker, native D1 and native owner lifecycle; only paid egress is replaced. */
export async function agentRuntime({clock}={}){
 let platformTime=clock;
 const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const kid=randomUUID(),publicKeys={[kid]:await webcrypto.subtle.exportKey('jwk',pair.publicKey)};
 const issuer='https://oncall-fixture.invalid',installationId=randomUUID(),sub=randomUUID(),email='alex@example.invalid',setupToken=randomBytes(32).toString('hex');
 let providerFixture=null;
 const fixtures={set(origin,value){assert.equal(origin,'https://8.8.8.8');providerFixture=value}};
 const runtime=await automationRuntime(request=>edge.fetch(request,{fixture:providerFixture}),{clock,bindings:origin=>({
  OWNER_EMAIL:email,SETUP_TOKEN:setupToken,INBOUND_EMAIL_DOMAIN:'inbound.example.test',RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installationId,RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify(publicKeys),
  RER_BUSINESS_TRUST:JSON.stringify({v:1,issuer,audience:origin,subject:installationId,email,keys:publicKeys}),
 })});
 try{
  // The Worker answers early refusals (401/403) without draining the request body and closes the socket; a pooled undici connection reused after that raises ECONNRESET. Every request opens its own connection.
  const request=(absolute,init={})=>{const url=new URL(absolute);assert.equal(url.origin,runtime.origin);const headers=new Headers(init.headers);headers.set('Connection','close');return fetch(url,{...init,headers})};
  const bootstrap=await initialize({request,origin:runtime.origin,email,sub,displayName:'Alex Chen',token:setupToken,returnTo:'/',fixtures});
  const cookie=bootstrap.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');await bootstrap.body?.cancel();
  const surface=JSON.parse(await readFile('agent-surface.json','utf8'));
  const context={origin:runtime.origin,business:'northline-response',signer:{issuer,installationId,kid,privateKey:pair.privateKey},person:{email,sub},agentId:'responder-'+randomUUID(),consent:randomUUID(),surface,seq:0,revision:0,now:()=>platformTime??Date.now()};
  async function http(path,input,method=input===undefined?'GET':'POST'){
   return request(runtime.origin+path,{method,redirect:'manual',headers:{Origin:runtime.origin,Cookie:cookie,'Content-Type':'application/json'},...(input===undefined?{}:{body:JSON.stringify(input)})});
  }
  async function settings(team=null,rev=1){
   const now=seconds(context.now),settings=await signJws(pair.privateKey,kid,'rer-business-settings+jwt',{v:1,iss:issuer,aud:runtime.origin,sub:installationId,business:context.business,email,owner_id:sub,jti:randomUUID(),iat:now,exp:now+300,rev,values:{display_name:'Northline Operations'},logo:null,team});
   const response=await http('/api/rer/business-settings',{settings});assert.equal(response.status,200);return response.json();
  }
  async function adopt(document=autonomousPolicy(),options={}){
   const signed=await policyEnvelope(context,document,options),response=await http('/api/rer/agent-policy',{policy:signed.policy});
   if(response.ok){context.seq=signed.payload.seq;context.revision=signed.payload.revision}
   return response;
  }
  async function mcp(method,params={},overrides={}){
   const token=await accessToken(context,{act:{sub:context.agentId,name:'Responder assistant',specialist:'oncall-responder'},...overrides}),response=await request(runtime.origin+'/mcp',{method:'POST',headers:{Origin:runtime.origin,Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2026-07-28','Mcp-Method':method,...(params.name||params.uri?{'Mcp-Name':params.name??params.uri}:{})},body:JSON.stringify({jsonrpc:'2.0',id:randomUUID(),method,params:{...params,_meta:{...params._meta,'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})});
   const body=await response.json();return {status:response.status,body,message:body,result:body.result,decision:body.result?._meta?.['com.runeditrun/decision']??body.error?.data?._meta?.['com.runeditrun/decision']};
  }
  const tool=(name,args,overrides)=>mcp('tools/call',{name,arguments:args},overrides);
  await settings();
  return {...runtime,request,http,cookie,context,settings,adopt,mcp,tool,fixtures,async time(at){await runtime.time(at);platformTime=at}};
 }catch(error){await runtime.close();throw error}
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
