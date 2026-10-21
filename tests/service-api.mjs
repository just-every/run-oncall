import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {localWorker} from './worker.mjs'
import {receiver} from './service-api-edge.mjs'

// OC-053: scoped service-account API and durable signed outbound events, through the emitted Worker and real D1.
const w=await localWorker(),edge=await receiver(),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value}
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
try {
 const cookie=(await w.request('/api/setup',{name:'Api owner',password:'synthetic-api-testing-password'})).cookie
 const owner=(path,data)=>w.request(path,data,cookie),admin=ok(await owner('/api/session')).member
 const responder=ok(await owner('/api/members',{name:'Api responder',role:'responder',password:'synthetic-api-responder-password'}),201)
 for(const [id,name] of [['alpha','Alpha'],['beta','Beta']])ok(await owner('/api/command',{type:'service',id,name,environment:'production',owner:admin.id,runbook:['Check dashboards'],pager:''}))
 const key=()=>'k-'+randomBytes(8).toString('hex')
 const bearer=(token,path,data,idem)=>w.request(path,data,undefined,{authorization:'Bearer '+token,...(data!==undefined?{'idempotency-key':idem??key()}:{})})
 const account=async(name,services,permissions=['read','incidents:write','incidents:resolve','actions:write'])=>ok(await owner('/api/service-accounts',{name,services,permissions,revision:0}),201)
 const A=await account('Alpha automation',['alpha']),B=await account('Beta reader',['beta'],['read']),R=await account('Rate probe',['alpha'],['read'])
 for(const created of [A,B,R])assert.match(created.token,/^ocsa_/)

 // Lifecycle reads never reveal a reusable credential.
 const listed=ok(await owner('/api/service-accounts'));assert.ok(!JSON.stringify([listed,ok(await owner('/api/state')),ok(await owner('/api/archive')),ok(await owner('/api/audit/export'))]).includes(A.token))
 assert.equal(listed.accounts.find(a=>a.id===A.account.id).lastUsedAt,null)
 ok(await owner('/api/service-accounts',{name:'No read',services:['alpha'],permissions:['incidents:write'],revision:0}),400)
 ok(await owner('/api/service-accounts',{name:'Foreign',services:['missing'],permissions:['read'],revision:0}),400)

 // Authentication: no token, a forged token and a browser session are all refused; a token is no human session.
 assert.equal((await w.request('/api/v1/services')).status,401)
 assert.equal((await bearer('ocsa_forged','/api/v1/services')).status,401)
 assert.equal((await w.request('/api/v1/services',undefined,cookie)).status,401)
 for(const path of ['/api/state','/api/service-accounts','/api/outbox','/api/archive'])assert.equal((await bearer(A.token,path)).status,401,path+' needs a human session')
 assert.equal((await bearer(A.token,'/api/command',{type:'service',name:'x'})).status,401)
 assert.equal((await bearer(A.token,'/api/nothing')).status,401)
 assert.equal((await w.request('/api/v1/nothing')).status,404)

 // Reads are scoped, including direct IDs and filters.
 const me=ok(await bearer(A.token,'/api/v1/me'));assert.deepEqual(me.services,['alpha'])
 assert.deepEqual(ok(await bearer(A.token,'/api/v1/services')).data.map(s=>s.id),['alpha'])
 assert.deepEqual(ok(await bearer(B.token,'/api/v1/services')).data.map(s=>s.id),['beta'])
 ok(await bearer(A.token,'/api/v1/services/beta'),404);ok(await bearer(A.token,'/api/v1/services/missing'),404)
 assert.deepEqual((await bearer(A.token,'/api/v1/incidents?service=beta')).value.error.code,'not_found')
 assert.notEqual(listed.accounts.length,0)
 assert.ok(owner&&ok(await owner('/api/service-accounts')).accounts.find(a=>a.id===A.account.id).lastUsedAt,'last use is recorded')

 // Mutations: idempotency, scope, permission, stale revisions.
 const before=ok(await owner('/api/state'))
 const declare=(token,service,title,idem)=>bearer(token,'/api/v1/incidents',{service,severity:'critical',title,summary:'Checkout errors'},idem)
 assert.equal((await w.request('/api/v1/incidents',{service:'alpha'},undefined,{authorization:'Bearer '+A.token})).value.error.code,'idempotency_key_required')
 ok(await declare(A.token,'beta','Foreign'),404)
 ok(await declare(B.token,'beta','Read only'),403)
 const unchanged=ok(await owner('/api/state'));assert.equal(unchanged.incidents.length,before.incidents.length,'refused declarations leave no incident');
 const idem='declare-once-1',first=ok(await declare(A.token,'alpha','Checkout down',idem),201)
 const again=await declare(A.token,'alpha','Checkout down',idem);assert.equal(again.status,201);assert.equal(again.value.id,first.id);assert.equal(again.headers.get('idempotent-replay'),'true')
 ok(await declare(A.token,'alpha','Different body',idem),409)
 assert.equal(ok(await owner('/api/state')).incidents.length,before.incidents.length+1,'a replayed key does not repeat the change')
 assert.equal(first.timeline[0].actor,'sa:'+A.account.id)
 // Cross-service reference: an incident of another service is invisible.
 const hidden=ok(await owner('/api/command',{type:'declare',service:'beta',severity:'warning',title:'Beta private',summary:'x',alerts:[]}))
 ok(await bearer(A.token,'/api/v1/incidents/'+hidden.id),404)
 ok(await bearer(A.token,`/api/v1/incidents/${hidden.id}/acknowledge`,{revision:1,responsible:responder.id,summary:'x'}),404)
 assert.equal(ok(await owner('/api/state')).incidents.find(i=>i.id===hidden.id).revision,1)
 // Acknowledge needs a named human; stale edits conflict.
 ok(await bearer(A.token,`/api/v1/incidents/${first.id}/acknowledge`,{revision:first.revision,summary:'Taking it'}),400)
 const stale=await bearer(A.token,`/api/v1/incidents/${first.id}/acknowledge`,{revision:first.revision+5,responsible:responder.id,summary:'Taking it'});assert.equal(stale.status,409);assert.equal(stale.value.error.code,'stale_revision');assert.equal(stale.value.error.details.revision,first.revision)
 let incident=ok(await bearer(A.token,`/api/v1/incidents/${first.id}/acknowledge`,{revision:first.revision,responsible:responder.id,summary:'Taking it'}))
 assert.equal(incident.state,'acknowledged');assert.equal(incident.assignee,responder.id)
 incident=ok(await bearer(A.token,`/api/v1/incidents/${first.id}/reassign`,{revision:incident.revision,member:admin.id,reason:'Handover'}))
 incident=ok(await bearer(A.token,`/api/v1/incidents/${first.id}/roles`,{revision:incident.revision,role:'scribe',member:responder.id,reason:'Notes'}))
 const action=ok(await bearer(A.token,`/api/v1/incidents/${first.id}/actions`,{revision:incident.revision,title:'Add alert',owner:responder.id,due:'2026-12-01',priority:'P2',completionPolicy:'evidence'}),201)
 incident=ok(await bearer(A.token,'/api/v1/incidents/'+first.id))
 const done=ok(await bearer(A.token,`/api/v1/incidents/${first.id}/actions/${action.id}/complete`,{revision:incident.revision,evidence:'https://example.test/pr/1'}));assert.equal(done.done,true)
 incident=ok(await bearer(A.token,'/api/v1/incidents/'+first.id))
 ok(await bearer(A.token,`/api/v1/incidents/${first.id}/resolve`,{revision:incident.revision,summary:'Fixed'}),400)
 incident=ok(await bearer(A.token,`/api/v1/incidents/${first.id}/resolve`,{revision:incident.revision,evidence:'https://example.test/recovery',summary:'Fixed'}))
 assert.equal(incident.state,'resolved');assert.match(incident.timeline.at(-1).text,/not a human attestation/)
 assert.equal(ok(await owner('/api/state')).incidents.find(i=>i.id===first.id).reviewAcceptance,undefined,'a token never accepts a review or follow-up as a human')

 // Pagination over real records, filters and cursor misuse.
 const ids=[first.id];for(let n=0;n<4;n++)ids.push(ok(await declare(A.token,'alpha','Page '+n),201).id)
 const pages=[];let cursor='';do{const page=ok(await bearer(A.token,'/api/v1/incidents?limit=2'+(cursor?'&cursor='+cursor:'')));pages.push(...page.data.map(i=>i.id));cursor=page.next}while(cursor)
 assert.deepEqual([...pages].sort(),[...ids].sort());assert.equal(new Set(pages).size,5)
 const pageOne=ok(await bearer(A.token,'/api/v1/incidents?limit=2'))
 ok(await bearer(A.token,'/api/v1/incidents?limit=2&state=resolved&cursor='+pageOne.next),400);ok(await bearer(A.token,'/api/v1/incidents?cursor=garbage'),400);ok(await bearer(A.token,'/api/v1/incidents?limit=500'),400)
 assert.deepEqual(ok(await bearer(A.token,'/api/v1/incidents?state=resolved')).data.map(i=>i.id),[first.id])
 assert.equal(ok(await bearer(B.token,'/api/v1/incidents')).data.length,1,'the beta token sees only beta work');assert.equal(ok(await bearer(B.token,'/api/v1/actions')).data.length,0)
 assert.equal(ok(await bearer(A.token,'/api/v1/actions?done=true')).data.length,1)
 const stats=ok(await bearer(A.token,'/api/v1/analytics/incidents'));assert.equal(stats.incidents,5);assert.equal(stats.byState.resolved,1);assert.deepEqual(Object.keys(stats.byService),['alpha'])
 assert.equal(ok(await bearer(B.token,'/api/v1/analytics/incidents')).incidents,1)
 const integrations=ok(await bearer(B.token,'/api/v1/integrations'));assert.deepEqual(integrations.webhookEndpoints,[])
 assert.deepEqual(ok(await bearer(A.token,'/api/v1/schedules')).data,[])

 // Rate limits are explicit and per token.
 const burst=await Promise.all(Array.from({length:130},()=>bearer(R.token,'/api/v1/me')))
 const limited=burst.filter(r=>r.status===429);assert.ok(limited.length>=9);assert.equal(limited[0].value.error.code,'rate_limited');assert.ok(limited[0].headers.get('retry-after'));assert.equal(limited[0].headers.get('x-ratelimit-limit'),'120')
 assert.equal((await bearer(A.token,'/api/v1/me')).status,200,'another token is not throttled')

 // Revocation applies on the next request; rotation retires the old token.
 const rotated=ok(await owner(`/api/service-accounts/${B.account.id}/rotate`,{revision:B.account.revision}));assert.notEqual(rotated.token,B.token)
 assert.equal((await bearer(B.token,'/api/v1/me')).status,401);assert.equal((await bearer(rotated.token,'/api/v1/me')).status,200)
 console.log('PASS OC-053 scoped service-account API: scope, idempotency, pagination, limits, concurrency and revocation')
 globalThis.__ctx={w,edge,owner,admin,responder,A,B,R,bearer,declare,key,ok,sleep,cookie,first}
 await (await import('./service-api-events.mjs')).events(globalThis.__ctx)
} finally { await edge.close();await w.close() }
