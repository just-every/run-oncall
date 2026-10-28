import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {randomBytes,randomUUID,webcrypto} from 'node:crypto'
import {automationRuntime} from './automation-runtime.mjs'
import initialize from './agent-owner.mjs'
import edge from './agent-network.mjs'
import specialist from './agent-specialist.mjs'
import {runAgentDoorConformance} from '../src/modules/agent-door/conformance/index.mjs'
import {signJws,seconds} from '../src/modules/agent-door/conformance/crypto.mjs'
import {pendingBase} from './agent-pending.mjs'

const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify'])
const kid=randomUUID(),installationId=randomUUID(),sub=randomUUID(),issuer='https://synthetic-agent-business.invalid',email='synthetic-agent-owner@example.test'
const {kty,crv,x,y}=await webcrypto.subtle.exportKey('jwk',pair.publicKey),keys={[kid]:{kty,crv,x,y,kid,alg:'ES256',use:'sig'}}
const token=randomBytes(32).toString('hex'),fixtures=new Map()
const runtime=await automationRuntime(request=>edge.fetch(request,{fixture:fixtures.get(new URL(request.url).origin)}),origin=>({
 OWNER_EMAIL:email,SETUP_TOKEN:token,RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installationId,RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify(keys),
 RER_BUSINESS_TRUST:JSON.stringify({v:1,issuer,audience:origin,subject:installationId,email,keys}),
}))
try {
 const origin=runtime.origin,request=(url,init)=>fetch(url,init)
 const bootstrap=await initialize({request,origin,email,sub,token,displayName:'Rowan Ellis',claim:{path:'/auth/bootstrap',mode:'setup-token',token},returnTo:'/',
  fixtures:{set:(origin,value)=>fixtures.set(origin,value)}})
 const cookie=bootstrap.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')
 const at=seconds()
 const settings=await signJws(pair.privateKey,kid,'rer-business-settings+jwt',{v:1,iss:issuer,aud:origin,sub:installationId,business:'rer-agent-conformance',email,jti:randomUUID(),iat:at,exp:at+300,rev:1,owner_id:sub,values:{},logo:null,team:null})
 const applied=await request(origin+'/api/rer/business-settings',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({settings})})
 assert.equal(applied.status,200,'ordinary signed settings must map the claimed owner')
 const surface=JSON.parse(await readFile('agent-surface.json','utf8'))
 const result=await runAgentDoorConformance({fetch:request,origin,surface,signer:{privateKey:pair.privateKey,kid,issuer,installationId},person:{email,cookie,sub},
  nativeJourney:({tool})=>specialist({request,origin,email,cookie,fixtures:{set:(origin,value)=>fixtures.set(origin,value)},tool})})
 for(const point of result.points)console.log((point.ok?'PASS ':'FAIL ')+point.id+(point.ok?'':': '+point.detail))
 console.log('Agent door conformance: '+result.points.filter(p=>p.ok).length+'/'+result.points.length+' points passed')
 console.log('Named pending Base assertions (28 October 2026): '+Object.keys(pendingBase).join(', '))
 // Pending names explain failures; they do not turn a failed assertion green.
 assert.equal(result.ok,true,'all declared Base points and the Oncall native journey are required')
} finally {await runtime.close()}
