import assert from 'node:assert/strict';
import {randomBytes,randomUUID,webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {request as httpRequest} from 'node:http';
import {automationRuntime} from './worker.mjs';
import initialize from './initialize-agent-owner.mjs';
import edge from './oncall-provider-edge.mjs';
import {signJws,seconds,accessToken,policyEnvelope,autonomousPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

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
  const request=(absolute,init={})=>{const url=new URL(absolute);assert.equal(url.origin,runtime.origin);return fetch(url,init)};
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
  async function mcpRequest(method,params,overrides){
   const token=await accessToken(context,{act:{sub:context.agentId,name:'Responder assistant',specialist:'oncall-responder'},...overrides}),id=randomUUID();
   return {id,url:runtime.origin+'/mcp',init:{method:'POST',headers:{Origin:runtime.origin,Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2026-07-28','Mcp-Method':method,...(params.name||params.uri?{'Mcp-Name':params.name??params.uri}:{})},body:JSON.stringify({jsonrpc:'2.0',id,method,params:{...params,_meta:{...params._meta,'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}};
  }
  async function mcp(method,params={},overrides={}){
   const {url,init}=await mcpRequest(method,params,overrides),response=await request(url,init);
   const body=await response.json();return {status:response.status,body,message:body,result:body.result,decision:body.result?._meta?.['com.runeditrun/decision']??body.error?.data?._meta?.['com.runeditrun/decision']};
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
  const tool=(name,args,overrides)=>mcp('tools/call',{name,arguments:args},overrides);
  await settings();
  return {...runtime,request,http,cookie,context,settings,adopt,mcp,tool,discardToolResponse,fixtures};
 }catch(error){await runtime.close();throw error}
}
