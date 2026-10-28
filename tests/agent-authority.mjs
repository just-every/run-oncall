import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
import {autonomousPolicy} from '../src/modules/agent-door/conformance/crypto.mjs'

export async function agentAuthority(app) {
 const checks=[],check=(id,ok,detail)=>checks.push({id,ok:!!ok,...(!ok?{detail}:{})})
 const ack=await app.adopt(autonomousPolicy())
 check('ONCALL.pending-base.complete-class-ack',ack.door.classes.every(row=>JSON.stringify(row.tools)===JSON.stringify(app.surface.tools.filter(t=>t.classes.includes(row.class)).map(t=>t.name).sort())),'Base policy-store truncates each class mapping at 20 tools')
 const workspace=await app.personJson('/api/workspace'),owner=workspace.member,mara=workspace.state.members.find(m=>m.name==='Mara Chen')
 const businessMara='business-responder-'+randomUUID(),businessAdmin='business-admin-'+randomUUID(),avery=workspace.state.members.find(m=>m.name==='Avery Grant'),team=[{id:businessMara,email:'mara@example.test',name:'Mara Chen',role:'member',invite:1},{id:businessAdmin,email:'avery@example.test',name:'Avery Grant',role:'admin',invite:1}]
 await app.personJson('/api/command',{type:'member',id:avery.id,role:'admin',active:true})
 await app.settings(2,team)
 const unbound=await app.tool('oncall.incidents.list',{}, {sub:businessMara,email:app.person.email})
 check('ONCALL.people.unbound',unbound.status===401,'An unbound teammate must not inherit authority from token email')
 await app.personJson('/api/agent-members',{business_id:businessMara,member_id:mara.id})
 const bound=await app.tool('oncall.incidents.list',{}, {sub:businessMara,email:app.person.email,scope:'incidents:read'})
 check('ONCALL.people.bound',bound.status===200&&!bound.result?.isError,'Signed teammate ID must resolve its explicitly bound active native member')
 const coverageId='native-class-coverage-'+randomUUID()
 const schedule=await app.tool('oncall.schedules.create',{schedule:{id:coverageId,name:'Native member eligibility witness',service:'agent-service',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[mara.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]},idempotency_key:randomUUID()})
 assert.ok(!schedule.result?.isError,'native coverage fixture must be created through MCP')
 await app.personJson('/api/agent-members',{business_id:businessAdmin,member_id:avery.id})
 const validAdmin=await app.tool('oncall.incidents.list',{}, {sub:businessAdmin,scope:'incidents:read'})
 check('ONCALL.people.business-admin',validAdmin.status===200&&!validAdmin.result?.isError,'A Business admin requires a separately authorized native administrator')
 await app.personJson('/api/command',{type:'member',id:avery.id,role:'viewer',active:true})
 const demotedAdmin=await app.tool('oncall.incidents.list',{}, {sub:businessAdmin,scope:'incidents:read'})
 check('ONCALL.people.business-admin-demotion',demotedAdmin.status===401,'Native demotion must immediately suspend a Business admin mapping')
 const wrongAudience=await app.tool('oncall.incidents.list',{}, {aud:app.origin+'/elsewhere'})
 check('ONCALL.people.audience',wrongAudience.status===401,'Wrong audience must fail')
 const unknown=await app.tool('oncall.incidents.list',{}, {sub:'unmapped-'+randomUUID(),email:app.person.email})
 check('ONCALL.people.subject',unknown.status===401,'A privileged email cannot authorize an unmapped subject')
 const deactivated=await app.tool('oncall.access.update',{id:mara.id,role:'responder',active:false,idempotency_key:randomUUID()})
 assert.ok(!deactivated.result?.isError,'current admin may narrow a separately scheduled responder')
 const inactive=await app.tool('oncall.incidents.list',{}, {sub:businessMara,email:app.person.email,scope:'incidents:read'})
 check('ONCALL.people.inactive',inactive.status===401,'Revoked native admission must apply to the next Business call')
 const reactivated=await app.tool('oncall.access.update',{id:mara.id,role:'responder',active:true,idempotency_key:randomUUID()})
 const classes=answer=>answer.result?._meta?.['com.runeditrun/decision']?.classes?.map(row=>row.class).sort()
 check('ONCALL.classes.coverage-membership',JSON.stringify(classes(deactivated))===JSON.stringify(['access','live'])&&JSON.stringify(classes(reactivated))===JSON.stringify(['access','live'])&&!reactivated.result?.isError,'Actual native rota eligibility changes carry access and live in both directions')
 const emailOnly=await app.tool('oncall.incidents.list',{}, {email:'mara@example.test'})
 check('ONCALL.people.email-is-not-identity',emailOnly.status===200&&!emailOnly.result?.isError,'A changed token address must retain the subject binding')
 const missing=await app.mcp('resources/read',{uri:'oncall://incidents/missing-'+randomUUID()})
 check('ONCALL.pending-base.resource-error-code',missing.error?.data?.code==='resource_unavailable','Base transport omits JSON-RPC error.data.code for a missing/restricted resource')
 // A fresh known mutation supplies a native target witness for the audit assertion.
 const declaration={service:'agent-service',title:'Native authority evidence',summary:'No recovery or delivery claim.',severity:'info',idempotency_key:randomUUID()}
 const created=await app.tool('oncall.incidents.declare',declaration)
 assert.ok(created.result?.structuredContent?.data?.id,'native declaration must complete: '+JSON.stringify(created))
 const id=created.result.structuredContent.data.id
 let cursor=0,rows=[]
 for(let page=0;page<50;page++){
  const audit=await app.personJson('/agents/api/audit?after='+cursor)
  rows.push(...audit.rows)
  if(!audit.rows.length||!audit.cursor||audit.cursor===cursor)break
  cursor=audit.cursor
 }
 check('ONCALL.pending-base.native-audit-target',rows.some(row=>row.tool==='oncall.incidents.declare'&&(row.target?.uri??row.target??row.resource)==='oncall://incidents/'+id),'Base audit has no native tool target attribution')
 // A new consent or agent cannot take over a queued operation after revocation.
 const consent=randomUUID(),queuedIncident=await app.tool('oncall.incidents.declare',{...declaration,title:'Durable consent custody',idempotency_key:randomUUID()},{consent})
 const queue=(await app.personJson('/api/automation')).outbox.find(o=>o.incident===queuedIncident.result.structuredContent.data.id&&o.status==='queued')
 assert.ok(queue,'the native declaration transaction must create a queued minimal event')
 await app.adopt(autonomousPolicy(),{revoked:{agents:[],consents:[consent]}})
 const revoked=await app.tool('oncall.automation.dispatch',{id:queue.id,idempotency_key:randomUUID()},{consent})
 const replacement=await app.tool('oncall.automation.dispatch',{id:queue.id,idempotency_key:randomUUID()},{consent:randomUUID()})
 const otherAgent=await app.tool('oncall.automation.dispatch',{id:queue.id,idempotency_key:randomUUID()},{consent:randomUUID(),act:{sub:'replacement-'+randomUUID(),name:'Replacement responder'}})
 const heldQueue=(await app.personJson('/api/automation')).outbox.find(o=>o.id===queue.id)
 check('ONCALL.custody.original-consent',revoked.status===401&&replacement.result?._meta?.['com.runeditrun/error']?.code==='operation_principal_changed'&&otherAgent.result?._meta?.['com.runeditrun/error']?.code==='operation_principal_changed'&&heldQueue.attempts===0&&JSON.stringify(heldQueue.history)===JSON.stringify(queue.history),'Queued work retains its original agent, sponsor and consent; replacement credentials cannot bypass revocation')
 await app.adopt(autonomousPolicy())
 const witnessScope={scope:'witness:read'}
 const protectedRead=await app.tool('oncall.access.read',{},witnessScope)
 const witnessBefore=await app.tool('oncall.witness.read',{},witnessScope)
 const privateTitle='Disposable privacy audit witness'
 const privacyIncident=await app.tool('oncall.incidents.declare',{...declaration,title:privateTitle,idempotency_key:randomUUID()})
 const witnessAfter=await app.tool('oncall.witness.read',{},witnessScope),projection=witnessAfter.result?.structuredContent?.data
 check('ONCALL.witness.protected-content',protectedRead.status===403&&!protectedRead.result?.structuredContent&&projection?.state?.records&&[owner.name,mara.name,privateTitle].every(text=>!JSON.stringify(projection).includes(text))&&JSON.stringify(witnessBefore.result?.structuredContent?.data?.state?.records?.incidents)!==JSON.stringify(projection.state.records.incidents),'A witness-only credential fingerprints changed objects without bypassing record-read scopes or exposing native content')
 const beforeErasure=await app.personJson('/api/state')
 const erased=await app.tool('oncall.privacy.erase',{kind:'incident',id:privacyIncident.result.structuredContent.data.id,workspaceRevision:beforeErasure.revision,idempotency_key:randomUUID()})
 assert.equal(erased.result?.structuredContent?.data?.state,'complete','the policy-authorized native erasure must complete')
 const nativeAudit=(await app.personJson('/api/audit/export')).rows.findLast(row=>row.kind==='incident.erase'&&row.outcome==='accepted'&&row.workspaceBefore===beforeErasure.revision&&row.workspaceAfter===beforeErasure.revision+1)
 check('ONCALL.audit.privacy-preparer',typeof nativeAudit?.actor==='string'&&typeof nativeAudit?.source==='string'&&nativeAudit.actor!==nativeAudit.source,'Native erasure audit must retain distinct agent-preparer and sponsor identities')
 const credentialClient=(await app.personJson('/api/automation')).clients.find(c=>c.name==='Disposable credential-erasure receiver')
 assert.ok(credentialClient,'ordinary native bootstrap must provide the disposable current credential fixture')
 const erasureRevision=(await app.personJson('/api/state')).revision
 const credentialErasure=await app.tool('oncall.privacy.erase',{kind:'client',id:credentialClient.id,workspaceRevision:erasureRevision,idempotency_key:randomUUID()})
 const receipt=credentialErasure.result?.structuredContent?.data
 check('ONCALL.classes.credential-erasure',receipt?.state==='complete'&&JSON.stringify(classes(credentialErasure))===JSON.stringify(['access','destructive','live','security'])&&receipt.stores?.oc_api_credentials?.deleted===1&&receipt.stores?.oc_endpoint_credentials?.deleted===1,'Native credential erasure computes every affected class and deletes the real keys and queued custody')
 await app.adopt(autonomousPolicy())
 // Removing a Business mapping stops an already held native effect too.
 await app.adopt({...autonomousPolicy(),rules:[{id:'held-mapping',class:'*',do:'approval',approver:['role:owner'],wait:'PT1H'}]})
 const queuedText='Removed Business mapping must not execute this note'
 const queued=await app.tool('oncall.notes.add',{incident:id,text:queuedText,idempotency_key:randomUUID()},{sub:businessMara,scope:'incidents:write'})
 assert.ok(queued.result?._meta?.['com.runeditrun/approval']?.id,'real company policy must hold the native note')
 const pending=(await app.personJson('/agents/api/approvals')).approvals.find(a=>a.id===queued.result._meta['com.runeditrun/approval'].id)
 await app.settings(3,[])
 const decided=await app.personJson('/agents/api/approvals/'+pending.id+'/approve',{revision:pending.revision,summary_sha256:pending.summary_sha256})
 const unchanged=(await app.personJson('/api/state')).incidents.find(i=>i.id===id)
 check('ONCALL.people.queued-mapping-removal',decided.approval.state==='refused'&&decided.approval.code==='insufficient_scope'&&!unchanged.timeline.some(e=>e.text===queuedText),'A removed Business mapping must stop held execution without removing the native person')
 await app.adopt(autonomousPolicy())
 // Native merges retain follow-up custody, without widening a selected service.
 const make=service=>app.personJson('/api/command',{type:'declare',service,title:'Scoped merge evidence',summary:'Actual native relation fixture',severity:'info'})
 let source=await make('agent-service'),target=await make('agent-service'),foreign=await make('agent-foreign')
 source=await app.personJson('/api/command',{type:'action',incident:source.id,revision:source.revision,title:'Retained source follow-up',owner:mara.id,due:'2099-12-01',completionPolicy:'human-review'})
 const action=source.actions.at(-1)
 target=await app.personJson('/api/command',{type:'merge-incidents',incident:target.id,revision:target.revision,sources:[{id:source.id,revision:source.revision}],reason:'Retain the source’s independent follow-up'})
 const key=randomBytes(32).toString('hex')
 await app.personJson('/api/automation/clients',{name:'Scoped retained-source client',key,services:['agent-service'],permissions:['incidents:read','actions:read']})
 const alias=await app.request(app.origin+'/api/v1/incidents/'+source.id,{headers:{authorization:'Bearer '+key}})
 check('ONCALL.scopes.native-alias',alias.status===200&&(await alias.json()).id===target.id,'A native scoped alias must retain its canonical response through the shared policy')
 const retained=await app.localTool('oncall.actions.read',{id:action.id,incident:source.id},key)
 check('ONCALL.scopes.retained-action',retained.result?.structuredContent?.data?.id===action.id,'A retained follow-up remains available under its original service custody')
 target=await app.personJson('/api/command',{type:'merge-incidents',incident:target.id,revision:target.revision,sources:[{id:foreign.id,revision:foreign.revision}],reason:'Cross-service relation must narrow the machine projection'})
 const hidden=await app.localTool('oncall.incidents.read',{id:target.id},key),listed=await app.localTool('oncall.incidents.list',{},key)
 check('ONCALL.scopes.merged-records',hidden.result?._meta?.['com.runeditrun/error']?.code==='not_found'&&!listed.result?.structuredContent?.data?.some(i=>i.id===target.id),'A selected-service credential must not disclose a merged foreign-service record in reads or lists')
 // Use a real second administrator and their password session for live demotion.
 const password='synthetic-authority-admin-password'
 await app.personJson('/api/members',{name:'Morgan Patel',role:'admin',password})
 const login=await app.personRequest('/api/login',{name:'Morgan Patel',password})
 assert.equal(login.status,200)
 const otherCookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')
 await app.personJson('/api/command',{type:'member',id:owner.id,role:'viewer',active:true},{as:otherCookie})
 const replay=await app.tool('oncall.incidents.declare',declaration)
 check('ONCALL.pending-base.replay-native-authority',replay.result?._meta?.['com.runeditrun/error']?.code==='insufficient_role','Base returns cached mutation success before checking the sponsor’s narrowed native role')
 const fresh=await app.tool('oncall.incidents.declare',{...declaration,idempotency_key:randomUUID()})
 check('ONCALL.people.live-role',fresh.result?._meta?.['com.runeditrun/error']?.code==='insufficient_role','Fresh mutation must retain native role authority')
 return checks
}
