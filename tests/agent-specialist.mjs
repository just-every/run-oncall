import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'

export default async function specialist({request,origin,cookie,tool}) {
 async function person(path,data) {
  const response=await request(origin+path,{method:data===undefined?'GET':'POST',headers:{origin,cookie,'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})})
  assert.ok(response.ok,'native person request '+path+': '+response.status)
  return response.json()
 }
 async function call(name,args={},key=randomUUID()) {
  const result=await tool(name,{...args,idempotency_key:key})
  assert.ok(!result.result?.isError,name+': '+JSON.stringify(result.result?._meta?.['com.runeditrun/error']))
  return result.result.structuredContent.data
 }
 const workspace=await person('/api/workspace'),responder=workspace.state.members.find(m=>m.name==='Mara Chen')
 // Probe 1: current named responder, one transition, a stale conflict, native client compatibility.
 let incident=await call('oncall.incidents.declare',{service:'agent-service',title:'Payments query latency',summary:'Investigating an observed latency alert. Paging remains on the existing pager.',severity:'warning'})
 const args={id:incident.id,member:responder.id,expected_revision:incident.revision},key=randomUUID()
 const ack=await call('oncall.incidents.acknowledge',args,key),again=await call('oncall.incidents.acknowledge',args,key)
 assert.deepEqual(again,ack)
 assert.equal(ack.commander,responder.id)
 assert.equal(ack.timeline.at(-1).preparedBy.sponsor.id,workspace.member.id)
 assert.ok(ack.timeline.at(-1).preparedBy.label.endsWith(' for '+workspace.member.name))
 const stale=await tool('oncall.notes.add',{incident:ack.id,text:'Stale note',expected_revision:1,idempotency_key:randomUUID()})
 assert.equal(stale.result?._meta?.['com.runeditrun/error']?.code,'revision_conflict')
 const clientKey=randomBytes(32).toString('hex')
 const client=await person('/api/automation/clients',{name:'Payments coordination client',key:clientKey,services:['agent-service'],permissions:['incidents:read','incidents:write','actions:read','actions:write']})
 const fresh=await person('/api/command',{type:'declare',service:'agent-service',title:'Payments dependency incident',summary:'Separate compatibility probe',severity:'warning'})
 const nativeInput={type:'transition',incident:fresh.id,revision:fresh.revision,state:'acknowledged',member:responder.id,summary:'Client names Mara; this is not her attestation'}
 const headers={origin,'content-type':'application/json',authorization:'Bearer '+clientKey,'idempotency-key':randomUUID()}
 const response=await request(origin+'/api/v1/incidents',{method:'POST',headers,body:JSON.stringify(nativeInput)})
 assert.equal(response.status,201)
 const receipt=await response.json(),repeat=await request(origin+'/api/v1/incidents',{method:'POST',headers,body:JSON.stringify(nativeInput)})
 assert.equal(repeat.status,200);assert.deepEqual(await repeat.json(),receipt)
 const record=await request(origin+'/api/v1/incidents/'+fresh.id,{headers})
 assert.equal(record.status,200)
 const native=await record.json()
 assert.equal(native.commander,responder.id)
 assert.equal(native.timeline.at(-1).actor,client.id)
 assert.equal(native.timeline.at(-1).preparedBy.label,'Payments coordination client for '+workspace.member.name)
 await call('oncall.incidents.update',{id:fresh.id,field:'state',value:'recovered',evidence:'https://evidence.example.test/machine-recovery-claim'})
 await call('oncall.incidents.resolve',{id:fresh.id,summary:'Coordination closed with an agent evidence claim; independent recovery is unknown'})
 const recovery=await call('oncall.reviews.read',{id:fresh.id})
 assert.equal(recovery.response.recovery.status,'unknown','an agent recovery claim must not become a human attestation')
 assert.match(recovery.response.recovery.reason,/Agent|machine/)
 console.log('PASS ONCALL probe 1: Business and retained scoped client acknowledgment, named responder, one effect and stale revision refusal; paging OFF')
 // Probe 2: submission cannot complete human-review work or become observed recovery.
 const action=await call('oncall.actions.create',{incident:ack.id,title:'Review the mitigation evidence',owner:responder.id,due:'2099-12-01',priority:'P1',completionPolicy:'human-review'})
 const submitted=await call('oncall.actions.submit',{incident:ack.id,id:action.id,evidence:'https://evidence.example.test/probe-follow-up'})
 assert.equal(submitted.done,false);assert.ok(submitted.submission);assert.equal(submitted.accepted,undefined)
 const denied=await request(origin+'/api/v1/actions',{method:'POST',headers:{...headers,'idempotency-key':randomUUID()},body:JSON.stringify({type:'accept-action',incident:ack.id,revision:submitted.revision,action:action.id,reason:'Machine acceptance is not permitted'})})
 assert.equal(denied.status,403)
 const accepted=await person('/api/command',{type:'accept-action',incident:ack.id,revision:submitted.revision,action:action.id,reason:'I reviewed the linked evidence and accept this follow-up'})
 assert.equal(accepted.actions.find(a=>a.id===action.id).accepted.by,workspace.member.id)
 assert.equal(accepted.state,'acknowledged')
 console.log('PASS ONCALL probe 2: machine submission stays open; machine acceptance refuses; a real eligible person accepts without fabricating recovery')
 // Probe 3 uses the existing approved minimal event and its genuine signature/receipt boundary.
 const events=await call('oncall.automation.read',{incident:incident.id}),item=events.outbox.find(o=>o.status==='queued')
 assert.ok(item,'native event must be created by the incident transaction')
 let scheduledError
 await person('/agents/api/pause',{paused:true})
 try {
  const paused=await tool('oncall.automation.dispatch',{id:item.id,idempotency_key:randomUUID()})
  assert.equal(paused.result?._meta?.['com.runeditrun/error']?.code,'agents_paused')
  const scheduled=await request(origin+'/cdn-cgi/local/scheduled');await scheduled.text()
  // Named pending Base assertion, 28 October 2026: the hosted verifier needs
  // a native scheduled-trigger hook. Keep the assertion, and restore Pause
  // before the remaining policy/audit phases even when that hook is missing.
  try {assert.equal(scheduled.status,200,'native scheduled-trigger admission must be reachable by the production verifier')} catch(error){scheduledError=error}
  const held=(await person('/api/automation')).outbox.find(o=>o.id===item.id)
  assert.equal(held.attempts,0);assert.deepEqual(held.history,item.history)
  const current=(await person('/api/state')).incidents.find(i=>i.id===incident.id)
  await person('/api/command',{type:'note',incident:current.id,revision:current.revision,text:'A real person can coordinate while agents are paused.'})
 }finally{await person('/agents/api/pause',{paused:false})}
 const first=await call('oncall.automation.dispatch',{id:item.id})
 assert.equal(first.status,'failed','authenticated retry receipt is a native failed attempt')
 await call('oncall.automation.replay',{id:item.id})
 const sent=await call('oncall.automation.dispatch',{id:item.id})
 assert.equal(sent.status,'sent','only a valid signed receiver acceptance yields sent')
 const outbox=(await call('oncall.automation.read',{incident:incident.id})).outbox.find(o=>o.id===item.id)
 assert.equal(outbox.attempts,2);assert.deepEqual(Object.keys(outbox.payload).sort(),['at','incident','operationId','revision','service','state','type'])
 if(scheduledError){console.log('PENDING Base native scheduler verifier hook (2026-10-28); required scheduled-trigger assertion failed');throw scheduledError}
 console.log('PASS ONCALL probe 3: Pause holds queued agent execution while a person coordinates; exact minimal signed event, authenticated retry then acceptance, protected replay and two retained attempts; no paging')
}
