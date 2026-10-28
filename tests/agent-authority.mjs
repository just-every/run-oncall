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
 await app.personJson('/api/command',{type:'member',id:mara.id,role:'responder',active:false})
 const inactive=await app.tool('oncall.incidents.list',{}, {sub:businessMara,email:app.person.email,scope:'incidents:read'})
 check('ONCALL.people.inactive',inactive.status===401,'Revoked native admission must apply to the next Business call')
 await app.personJson('/api/command',{type:'member',id:mara.id,role:'responder',active:true})
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
 check('ONCALL.pending-base.native-audit-target',rows.some(row=>row.tool==='oncall.incidents.declare'&&row.resource==='oncall://incidents/'+id),'Base audit has no native tool target attribution')
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
