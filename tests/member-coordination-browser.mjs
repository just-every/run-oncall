import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {chromium} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {localWorker} from './worker.mjs'

// OC-018 real hosted member coordination persists after reload: the hosted
// member journey, maintained on the emitted production Worker. The owner claims
// through the setup token; admin-created members sign in by password at
// /signin/local, coordinate, reload and read attributed history; signed-out and
// revoked sessions get no workspace; paging refuses.
const worker=await localWorker({}, {clock:true})
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

 // OC-061: the existing shell carries internal status, with a status-only stakeholder session.
 const stakeholder={name:'Sam Stakeholder',password:'synthetic-oncall-61-password'}
 const sam=ok(await call(owner.page,'/api/members',{...stakeholder,role:'stakeholder'}),201)
 ok(await call(owner.page,'/api/command',{type:'service',id:'synthetic-oncall-61',name:'Payment gateway',environment:'production',owner:rosaRecord.id,runbook:['Private gateway recovery instructions'],pager:''}))
 await owner.page.goto(worker.origin+'/#status');await owner.page.reload()
 const statusPanel=owner.page.getByRole('region',{name:'Internal business status'})
 await statusPanel.getByRole('heading',{name:'Internal status',exact:true}).waitFor()
 await statusPanel.getByText('Add business service',{exact:true}).click()
 await statusPanel.getByLabel('Business-service name',{exact:true}).fill('Checkout')
 await statusPanel.getByLabel('Owning team label',{exact:true}).fill('Payments')
 await statusPanel.getByLabel('Supporting technical services',{exact:true}).selectOption('synthetic-oncall-61')
 await statusPanel.getByLabel('Communications owner',{exact:true}).selectOption(rosaRecord.id)
 await statusPanel.getByLabel('Stakeholder audience',{exact:true}).selectOption(sam.id)
 await statusPanel.getByRole('button',{name:'Create business service',exact:true}).click()
 const checkout=statusPanel.getByRole('article',{name:'Checkout',exact:true})
 await checkout.getByText('Derived status: operational',{exact:true}).waitFor()
 const statusIncident=ok(await call(owner.page,'/api/command',{type:'declare',service:'synthetic-oncall-61',severity:'warning',title:'Private gateway timeouts',summary:'Customer payment attempts delayed',alerts:[]}))
 await statusPanel.getByRole('button',{name:'Refresh status',exact:true}).click()
 await checkout.getByText('Derived status: degraded',{exact:true}).waitFor()
 const statusCapture=async(page,screen,width)=>{
  await page.setViewportSize({width,height:1000})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),screen+' fits '+width)
  assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0,'no hydration mismatch')
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()
  assert.deepEqual(axe.violations.filter(row=>['serious','critical'].includes(row.impact)),[],screen+' has no serious accessibility finding')
  await page.screenshot({path:`${captureDirectory}/${(/^(oc068|oc058)-/.test(screen))?screen:'oc061-'+screen}-${width}.png`,fullPage:true})
 }
 for(const width of [1440,390])await statusCapture(owner.page,'derived-status',width)
 await checkout.getByText('Manage internal status',{exact:true}).click()
 await checkout.getByLabel('Override status',{exact:true}).selectOption('operational')
 await checkout.getByLabel('Override reason',{exact:true}).fill('Alternate gateway is processing payments')
 await checkout.getByRole('button',{name:'Set status override',exact:true}).click()
 await checkout.getByText(/Manual override: operational/).waitFor()
 for(const width of [1440,390])await statusCapture(owner.page,'override-reason',width)
 const samView=await open(1440);await passwordSignIn(samView.page,stakeholder)
 await samView.page.getByRole('heading',{name:'Internal status',exact:true}).waitFor()
 const samCheckout=samView.page.getByRole('article',{name:'Checkout',exact:true})
 await samCheckout.getByLabel('Your subscription',{exact:true}).selectOption('true')
 await samCheckout.getByRole('button',{name:'Save subscription',exact:true}).click()
 await samCheckout.getByRole('heading',{name:'Recorded impact obligations',exact:true}).waitFor()
 for(const width of [1440,390]){
  await samView.page.setViewportSize({width,height:1000});await samView.page.reload()
  await samView.page.getByRole('heading',{name:'Recorded impact obligations',exact:true}).waitFor()
  assert.equal(await samView.page.locator('.timeline').count(),0)
  assert.equal(await samView.page.getByRole('link',{name:'Incidents',exact:true}).count(),0)
  for(const path of ['/api/state','/api/triage','/api/archive','/api/recovery/checkpoint','/api/audit/export','/api/handoffs/context/'+statusIncident.id,'/api/paging/state','/api/email','/api/automation/clients'])ok(await call(samView.page,path),403)
  ok(await call(samView.page,'/api/v1/incidents'),401)
  ok(await call(samView.page,'/api/command',{type:'declare',service:'synthetic-oncall-61',title:'Refused page',severity:'warning',summary:'No authority'}),403)
  const workspace=ok(await call(samView.page,'/api/workspace'));assert.equal(workspace.state,null)
  const html=await (await samView.context.request.get(worker.origin+'/')).text()
  assert.ok(!html.includes('Private gateway timeouts')&&!html.includes('Private gateway recovery instructions'),'stakeholder HTML bootstrap contains no response data')
  await statusCapture(samView.page,'stakeholder-status-and-refusals',width)
 }
 console.log('OC-061 browser: existing internal-status panel, derived degraded, attributed override and reason, stakeholder subscription and private-door refusals at 1440/390')
 await samView.context.close()

 // The new role is excluded from every responder selector on the existing screens.
 ok(await call(owner.page,'/api/paging/schedules',{id:'synthetic-oncall-62',name:'Payments primary',service:'synthetic-oncall-61',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[rosaRecord.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[ownerMember.id],ambiguity:'earlier'},overrides:[]}))
 const roleSession=await owner.context.newCDPSession(owner.page);await roleSession.send('Emulation.setCPUThrottlingRate',{rate:4})
 const excludesStakeholder=async locator=>assert.ok(!(await locator.locator('option').evaluateAll(options=>options.map(option=>option.value))).includes(sam.id),'stakeholders are never offered as responders')
 for(const screen of ['team','services','routing','schedules','incidents']){
  await owner.page.goto(worker.origin+'/#'+screen);await owner.page.reload()
  if(screen==='team')await owner.page.getByRole('heading',{name:'Team and access',exact:true}).waitFor()
  if(screen==='services'){await owner.page.getByRole('heading',{name:'Service ownership',exact:true}).waitFor();await excludesStakeholder(owner.page.getByLabel('Service owner',{exact:true}))}
  if(screen==='routing'){await owner.page.getByText('Create a routed integration key',{exact:true}).click();await excludesStakeholder(owner.page.getByLabel('Integration owner',{exact:true}))}
  if(screen==='schedules'){
   await owner.page.getByLabel('Schedule',{exact:true}).selectOption('synthetic-oncall-62')
   await excludesStakeholder(owner.page.getByLabel('Primary responder 1',{exact:true}))
   await owner.page.getByRole('button',{name:'Remove primary responder 1',exact:true}).focus()
   await owner.page.getByRole('tooltip').filter({hasText:'Remove primary responder 1'}).waitFor({state:'visible'})
  }
  if(screen==='incidents'){
   await owner.page.getByRole('button',{name:'Select this page',exact:true}).click()
   await owner.page.getByLabel('Bulk action',{exact:true}).selectOption('reassign')
   await excludesStakeholder(owner.page.getByLabel('Bulk assignee',{exact:true}))
   await owner.page.getByText('Change response ownership or priority',{exact:true}).click()
   await excludesStakeholder(owner.page.getByLabel('Assigned responder',{exact:true}))
  }
  for(const width of [1440,390])await statusCapture(owner.page,'role-'+screen,width)
 }
 await roleSession.send('Emulation.setCPUThrottlingRate',{rate:1});await roleSession.detach()
 console.log('OC-061 role selectors and tooltips: team, service, routing, schedule and incident/bulk screens at 1440/390 with own browser CPU rate 4; stakeholder excluded from response owners and keyboard tooltip immediate')

 // OC-068 uses the real manual-page form and independent target response controls.
 await owner.page.goto(worker.origin+'/#incidents');await owner.page.reload()
 await owner.page.getByRole('button',{name:'Declare incident',exact:true}).click()
 await owner.page.getByLabel('Incident title',{exact:true}).fill('Manual checkout responder request')
 await owner.page.getByLabel('Service',{exact:true}).selectOption('checkout')
 await owner.page.getByLabel('Page urgency',{exact:true}).selectOption('high')
 await owner.page.getByLabel('Page priority',{exact:true}).selectOption('P2')
 await owner.page.getByLabel('Customer impact and current evidence',{exact:true}).fill('Customer payments need investigation')
 const manualForm68=owner.page.locator('form').filter({has:owner.page.getByRole('button',{name:'Declare',exact:true})})
 await manualForm68.getByLabel('Named responders',{exact:true}).selectOption(rosaRecord.id)
 await owner.page.getByRole('button',{name:'Declare',exact:true}).waitFor()
 for(const width of [1440,390])await statusCapture(owner.page,'oc068-manual-page-form',width)
 await owner.page.getByRole('button',{name:'Declare',exact:true}).click()
 await owner.page.locator('.detail h2').filter({hasText:'Manual checkout responder request'}).waitFor()
 const manual68=ok(await call(owner.page,'/api/state')).incidents.find(i=>i.title==='Manual checkout responder request')
 assert.equal(manual68.manualPage.creator,ownerMember.id);assert.equal(manual68.manualPage.obligations[0].target.id,rosaRecord.id)
 const requests68=owner.page.getByRole('region',{name:'Manual obligations and responder requests'})
 await requests68.getByText('Request responders',{exact:true}).click()
 for(const message of ['Inspect payment provider','Inspect payment network']){
  await requests68.getByLabel('Named responders',{exact:true}).selectOption(rosaRecord.id)
  await requests68.getByLabel('Responder request message',{exact:true}).fill(message)
  await requests68.getByRole('button',{name:'Record responder requests',exact:true}).click()
  await requests68.getByText(message,{exact:true}).waitFor()
 }
 await openIncident(rosa.page,manual68.id);await rosa.page.reload()
 const responseRegion=rosa.page.getByRole('region',{name:'Manual obligations and responder requests'})
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment provider'}).getByRole('button',{name:'Accept request',exact:true}).click()
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment provider'}).getByText(/^accepted · requested/).waitFor()
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment network'}).getByRole('button',{name:'Decline request',exact:true}).click()
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment network'}).getByText(/^declined · requested/).waitFor()
 await responseRegion.getByText('Primary acknowledgment: Unacknowledged',{exact:true}).waitFor()
 for(const width of [1440,390])await statusCapture(rosa.page,'oc068-requests-and-obligations',width)
 await openIncident(vic.page,manual68.id);await vic.page.reload()
 await vic.page.getByText('Only responders and admins may create manual pages or request responders.',{exact:true}).waitFor()
 ok(await call(vic.page,'/api/command',{type:'manual-page',operationId:'synthetic-oncall-68-viewer',service:'checkout',title:'Refused',severity:'critical'}),403)
 for(const width of [1440,390])await statusCapture(vic.page,'oc068-viewer-refusal',width)
 await owner.page.goto(worker.origin+'/#services');await owner.page.reload()
 const assignment68=owner.page.locator('article.service-card').filter({has:owner.page.getByRole('heading',{name:'Checkout',exact:true})})
 await assignment68.getByText('User-assignment rule',{exact:true}).click()
 await assignment68.getByLabel('User-assignment outcome',{exact:true}).selectOption('repeat')
 await assignment68.getByLabel('Assignment delay (minutes)',{exact:true}).fill('7')
 await assignment68.getByRole('button',{name:'Save user assignment for Checkout',exact:true}).click()
 await assignment68.getByText(/Repeat to the user after 7 minutes · version 1/).waitFor()
 assert.equal(await assignment68.getByLabel('User-assignment outcome',{exact:true}).inputValue(),'repeat')
 for(const width of [1440,390])await statusCapture(owner.page,'oc068-service-assignment-rule',width)
 console.log('OC-068 browser: manual page urgency/target, recorded obligations, independent accepted and declined responder requests, viewer refusal and versioned assignment setting at 1440/390')
 await assignment68.getByText('Acknowledgment timeout · off',{exact:true}).click()
 await assignment68.getByLabel('Acknowledgment timeout (minutes, 0 is off)',{exact:true}).fill('1')
 await assignment68.getByRole('button',{name:'Save acknowledgment timeout for Checkout',exact:true}).click()
 await assignment68.getByText('Acknowledgment timeout · 1 minutes',{exact:true}).waitFor()
 for(const width of [1440,390])await statusCapture(owner.page,'oc058-service-timeout',width)
 let incident58=ok(await call(owner.page,'/api/command',{type:'declare',service:'checkout',title:'Snoozed checkout investigation',severity:'warning',summary:'Investigating a customer checkout delay'}))
 incident58=ok(await call(owner.page,'/api/command',{type:'transition',incident:incident58.id,revision:incident58.revision,state:'acknowledged',summary:'Owner investigating'}))
 await openIncident(owner.page,incident58.id)
 await owner.page.getByLabel('Snooze duration (minutes)',{exact:true}).fill('1')
 for(const width of [1440,390])await statusCapture(owner.page,'oc058-snooze-form',width)
 await owner.page.getByRole('button',{name:'Snooze incident',exact:true}).click()
 await owner.page.getByRole('status').filter({hasText:'Snoozed / acknowledgment held until'}).waitFor()
 for(const width of [1440,390])await statusCapture(owner.page,'oc058-snoozed',width)
 incident58=ok(await call(owner.page,'/api/state')).incidents.find(i=>i.id===incident58.id)
 await worker.time(Date.parse(incident58.deadlines.at(-1).dueAt))
 const expired58=await worker.send('/cdn-cgi/local/scheduled',undefined,{},'GET');assert.equal(expired58.status,200)
 await openIncident(owner.page,incident58.id)
 await owner.page.getByRole('region',{name:'Incident deadlines'}).getByText(/snooze · fired/).waitFor()
 assert.equal(ok(await call(owner.page,'/api/state')).incidents.find(i=>i.id===incident58.id).state,'declared')
 for(const width of [1440,390])await statusCapture(owner.page,'oc058-expired-triggered',width)
 console.log('OC-058 browser: timeout setting, snooze duration, persisted snoozed state and scheduled expiry back to triggered at 1440/390; paging OFF')


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
