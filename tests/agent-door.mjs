import assert from 'node:assert/strict'
import {agentRuntime} from './agent-runtime.mjs'
import {agentAuthority} from './agent-authority.mjs'
import specialist from './agent-specialist.mjs'
import {runAgentDoorConformance} from '../src/modules/agent-door/conformance/index.mjs'
import {pendingBase} from './agent-pending.mjs'

const app=await agentRuntime()
try {
 const {origin,surface,signer,person,request,fixtures}=app
 const result=await runAgentDoorConformance({fetch:request,origin,surface,signer,person,
  nativeJourney:({tool})=>specialist({request,origin,email:person.email,cookie:person.cookie,fixtures,tool})})
 for(const point of result.points)console.log((point.ok?'PASS ':'FAIL ')+point.id+(point.ok?'':': '+point.detail))
 const extra=await agentAuthority(app),points=[...result.points,...extra]
 for(const point of extra)console.log((point.ok?'PASS ':'FAIL ')+point.id+(point.ok?'':': '+point.detail))
 console.log('Agent door conformance: '+points.filter(p=>p.ok).length+'/'+points.length+' points passed')
 console.log('Named pending Base assertions (28 October 2026): '+Object.keys(pendingBase).join(', '))
 // Pending names explain failures; they do not turn a failed assertion green.
 assert.equal(points.every(p=>p.ok),true,'all declared Base points and the Oncall native journey are required')
} finally {await app.close()}
