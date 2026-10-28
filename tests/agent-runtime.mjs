import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {randomBytes,randomUUID,webcrypto} from 'node:crypto'
import {automationRuntime} from './automation-runtime.mjs'
import initialize from './agent-owner.mjs'
import edge from './agent-network.mjs'
import {signJws,seconds,policyEnvelope,accessToken} from '../src/modules/agent-door/conformance/crypto.mjs'

export async function agentRuntime() {
 const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify'])
 const kid=randomUUID(),installationId=randomUUID(),sub=randomUUID(),issuer='https://synthetic-agent-business.invalid',email='synthetic-agent-owner@example.test'
 const {kty,crv,x,y}=await webcrypto.subtle.exportKey('jwk',pair.publicKey),keys={[kid]:{kty,crv,x,y,kid,alg:'ES256',use:'sig'}}
 const token=randomBytes(32).toString('hex'),values=new Map(),fixtures={set:(origin,value)=>values.set(origin,value)}
 const runtime=await automationRuntime(request=>edge.fetch(request,{fixture:values.get(new URL(request.url).origin)}),origin=>({
  OWNER_EMAIL:email,SETUP_TOKEN:token,RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installationId,RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify(keys),
  RER_BUSINESS_TRUST:JSON.stringify({v:1,issuer,audience:origin,subject:installationId,email,keys}),
 }))
 try {
  const origin=runtime.origin,request=(url,init)=>fetch(url,init)
  const bootstrap=await initialize({request,origin,email,sub,token,displayName:'Rowan Ellis',claim:{path:'/auth/bootstrap',mode:'setup-token',token},returnTo:'/',fixtures})
  const cookie=bootstrap.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')
  const signer={privateKey:pair.privateKey,kid,issuer,installationId},person={email,cookie,sub}
  const surface=JSON.parse(await readFile('agent-surface.json','utf8'))
  async function settings(rev,team=null) {
   const at=seconds(),settings=await signJws(pair.privateKey,kid,'rer-business-settings+jwt',{v:1,iss:issuer,aud:origin,sub:installationId,business:'rer-agent-conformance',email,jti:randomUUID(),iat:at,exp:at+300,rev,owner_id:sub,values:{},logo:null,team})
   const response=await request(origin+'/api/rer/business-settings',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({settings})})
   assert.equal(response.status,200,'ordinary signed settings must map the claimed owner')
  }
  await settings(1)
  async function personRequest(path,data,{method,as=cookie}={}) {
   return request(origin+path,{method:method??(data===undefined?'GET':'POST'),headers:{origin,cookie:as,'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})})
  }
  async function personJson(path,data,options) {
   const response=await personRequest(path,data,options)
   assert.ok(response.ok,'native person request '+path+': '+response.status)
   return response.json()
  }
  const context={origin,surface,signer,person,business:'rer-agent-conformance',consent:randomUUID(),agentId:'oncall-native-'+randomUUID()}
  async function adopt(document,options={}) {
   const state=await personJson('/agents/api/state')
   const signed=await policyEnvelope({...context,seq:state.policy.seq??0,revision:state.policy.revision??0},document,options)
   const response=await request(origin+'/api/rer/agent-policy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({policy:signed.policy})})
   assert.equal(response.status,200,'signed policy must be accepted through its native receiver')
   return response.json()
  }
  let rpcId=0
  async function mcp(method,params={},claims={},localBearer) {
   const teammate=claims.sub&&claims.sub!==person.sub?{act:{sub:context.agentId+'-'+claims.sub,name:'Oncall teammate responder',specialist:surface.specialist}}:{}
   const bearer=localBearer??await accessToken(context,{...teammate,...claims})
   const response=await request(origin+'/mcp',{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream',authorization:'Bearer '+bearer,'mcp-protocol-version':'2026-07-28','mcp-method':method,...(['tools/call','resources/read','prompts/get'].includes(method)?{'mcp-name':params.name??params.uri}:{})},body:JSON.stringify({jsonrpc:'2.0',id:++rpcId,method,params:{...params,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})})
   return {status:response.status,...await response.json()}
  }
  return {runtime,origin,request,person,signer,surface,fixtures,settings,personRequest,personJson,adopt,mcp,
   tool:(name,args,claims)=>mcp('tools/call',{name,arguments:args},claims),localTool:(name,args,bearer)=>mcp('tools/call',{name,arguments:args},{},bearer),close:()=>runtime.close()}
 }catch(error){await runtime.close();throw error}
}
