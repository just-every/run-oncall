import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {chromium} from '@playwright/test'
import {localWorker} from './worker.mjs'

// OC-018 real hosted member coordination persists after reload: the hosted
// member journey, maintained on the emitted production Worker. The owner claims
// through the setup token; admin-created members sign in by password at
// /signin/local, coordinate, reload and read attributed history; signed-out and
// revoked sessions get no workspace; paging refuses.
const worker=await localWorker()
const captureDirectory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
await mkdir(captureDirectory,{recursive:true})
const responder={name:'Rosa Responder',password:'synthetic-responder-testing-password'},viewer={name:'Vic Viewer',password:'synthetic-viewer-testing-password'}
const ackText='Rosa acknowledged: checking the card provider.',noteText='Rosa note: provider status shows degraded card auth.'
const errors=[]
let browser
const call=(page,path,body)=>page.evaluate(async([p,b])=>{const r=await fetch(p,b===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});let value;try{value=await r.json()}catch{value=null}return {status:r.status,value}},[path,body])
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value}
async function open(width){const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return {context,page}}
async function passwordSignIn(page,who){
 await page.goto(worker.origin+'/signin/local')
 await page.getByLabel('Name',{exact:true}).fill(who.name)
 await page.getByLabel('Password',{exact:true}).fill(who.password)
 await page.getByRole('button',{name:'Sign in',exact:true}).click()
 await page.waitForURL(worker.origin+'/')
 return (await call(page,'/api/session')).value.member
}
async function openIncident(page,id){await page.goto(`${worker.origin}/?incident=${id}#incidents`);await page.reload();await page.locator('.detail h2').waitFor()}
const entry=(page,text)=>page.locator('.timeline .event').filter({hasText:text})
async function denied(page,label,id){
 const state=await page.context().request.get(worker.origin+'/api/state'),workspace=await (await page.context().request.get(worker.origin+'/api/workspace')).json()
 assert.equal(state.status(),401,`${label}: protected state refused`)
 assert.equal(workspace.state,null,`${label}: no workspace returned`)
 await page.goto(`${worker.origin}/?incident=${id}#incidents`);await page.reload();await page.waitForLoadState('networkidle')
 assert.equal(await page.locator('.timeline').count(),0,`${label}: no incident history rendered`)
 assert.ok(!(await page.locator('body').innerText()).includes(noteText),`${label}: no coordination text in the page`)
}
try {
 const claimed=await worker.request('/auth/bootstrap',{token:worker.vars.SETUP_TOKEN,displayName:'Oncall lead'},undefined,{'CF-Connecting-IP':'127.0.0.1'})
 assert.equal(claimed.status,303,JSON.stringify(claimed.value))
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 const owner=await open(1440)
 await owner.context.addCookies(claimed.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}}))
 await owner.page.goto(worker.origin+'/setup')
 const confirmation=owner.page.getByRole('checkbox')
 if(await confirmation.count()){await confirmation.check();await owner.page.getByRole('button',{name:'Finish setup'}).click()}
 await owner.page.getByRole('link',{name:'Services',exact:true}).waitFor({timeout:60000})
 const ownerMember=ok(await call(owner.page,'/api/session')).member
 const rosaRecord=ok(await call(owner.page,'/api/members',{...responder,role:'responder'}),201)
 ok(await call(owner.page,'/api/members',{...viewer,role:'viewer'}),201)
 ok(await call(owner.page,'/api/command',{type:'service',id:'checkout',name:'Checkout',environment:'production',owner:rosaRecord.id,runbook:['Check payment provider status'],pager:''}))
 const declared=ok(await call(owner.page,'/api/command',{type:'declare',title:'Checkout payments failing',service:'checkout',severity:'critical',summary:'Card payments fail at checkout.',alerts:[]}))

 // The responder coordinates through the incident page, then reloads at both widths.
 const rosa=await open(1440)
 const rosaMember=await passwordSignIn(rosa.page,responder)
 assert.equal(rosaMember.id,rosaRecord.id);assert.equal(rosaMember.role,'responder')
 assert.notEqual(rosaMember.id,ownerMember.id,'member and owner identities stay separate')
 await openIncident(rosa.page,declared.id)
 await rosa.page.getByLabel('Next state').selectOption('acknowledged')
 await rosa.page.getByLabel('Reason and observed outcome').fill(ackText)
 await rosa.page.getByRole('button',{name:'Record transition'}).click()
 await rosa.page.locator('.detail .tag.state-acknowledged').waitFor()
 await rosa.page.getByLabel('Observation, decision or evidence').fill(noteText)
 await rosa.page.getByRole('button',{name:'Add timeline note'}).click()
 await entry(rosa.page,noteText).waitFor()
 assert.equal(await rosa.page.getByRole('button',{name:/Send test page/}).count(),0,'no paging control is offered')
 for(const page of [rosa.page,owner.page])assert.equal((await call(page,'/api/paging/jobs',{incident:declared.id})).status,409,'paging stays OFF and refuses')
 for(const width of [1440,390]) {
  await rosa.page.setViewportSize({width,height:1000});await rosa.page.reload();await rosa.page.locator('.detail h2').waitFor()
  for(const text of [ackText,noteText])assert.match(await entry(rosa.page,text).innerText(),new RegExp(responder.name),`"${text}" stays attributed to the member after reload`)
  assert.equal(await rosa.page.locator('.detail .tag.state-acknowledged').count(),1,'acknowledgement persists after reload')
  assert.ok(await rosa.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`no horizontal scroll at ${width}`)
  await rosa.page.locator('.timeline').scrollIntoViewIfNeeded();await rosa.page.screenshot({path:`${captureDirectory}/member-coordination-reloaded-${width}.png`,fullPage:true})
 }
 const kept=ok(await call(rosa.page,'/api/workspace')).state.incidents.find(i=>i.id===declared.id)
 assert.equal(kept.state,'acknowledged')
 for(const text of [ackText,noteText])assert.equal(kept.timeline.find(e=>e.text.includes(text)).actor,rosaMember.id,'the stored entry names the member')
 assert.ok(kept.timeline.some(e=>e.kind==='declared'&&e.actor===ownerMember.id),'the declaration stays the owner’s')

 // A second permitted session, the viewer, reads the same history and cannot write.
 const vic=await open(390)
 assert.equal((await passwordSignIn(vic.page,viewer)).role,'viewer')
 await openIncident(vic.page,declared.id)
 for(const text of [ackText,noteText])assert.match(await entry(vic.page,text).innerText(),new RegExp(responder.name))
 assert.equal(await vic.page.getByLabel('Observation, decision or evidence').count(),0,'viewers get no coordination controls')
 ok(await call(vic.page,'/api/command',{type:'note',incident:declared.id,revision:kept.revision,text:'viewer write'}),403)
 await vic.page.locator('.timeline').scrollIntoViewIfNeeded();await vic.page.screenshot({path:`${captureDirectory}/member-coordination-viewer-390.png`,fullPage:true})

 // Signed out, anonymous and revoked sessions see no workspace.
 await rosa.page.setViewportSize({width:1440,height:1000});await rosa.page.goto(worker.origin+'/#incidents')
 await rosa.page.getByRole('button',{name:'Sign out',exact:true}).click();await rosa.page.waitForURL(u=>u.pathname.startsWith('/signin'))
 await denied(rosa.page,'signed-out member',declared.id)
 const anonymous=await open(390);await denied(anonymous.page,'anonymous visitor',declared.id)
 const again=await open(390);await passwordSignIn(again.page,responder);await openIncident(again.page,declared.id)
 await owner.page.goto(worker.origin+'/#team');await owner.page.reload()
 const card=owner.page.locator('article.service-card').filter({has:owner.page.getByRole('heading',{name:responder.name,exact:true})})
 await card.getByLabel('Access',{exact:true}).selectOption('false')
 await card.getByRole('button',{name:'Update access'}).click()
 await card.locator('p').filter({hasText:/· Revoked/}).waitFor()
 await denied(again.page,'revoked member session',declared.id)
 assert.equal((await again.context.request.post(worker.origin+'/api/login',{data:responder,headers:{origin:worker.origin}})).status(),401,'a revoked member cannot sign in again')
 await again.page.screenshot({path:`${captureDirectory}/member-coordination-revoked-390.png`,fullPage:true})
 const after=ok(await call(owner.page,'/api/workspace')).state.incidents.find(i=>i.id===declared.id)
 assert.ok(after.timeline.some(e=>e.text===noteText&&e.actor===rosaMember.id),'revocation keeps the attributed history')
 assert.deepEqual(errors,[])
 console.log('OC-018 real hosted member coordination persists after reload: on the emitted production Worker a password member acknowledged and noted an incident, reloaded at 1440 and 390 and kept attribution; a viewer read it; signed-out, anonymous and revoked sessions got no workspace; paging refused (409)')
} finally {
 await browser?.close()
 await worker.close()
}
