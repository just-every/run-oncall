import {focusWorkspace,openIncidentAction,openWorkspaceSection} from './keyboard.mjs'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {chromium,expect} from '@playwright/test'
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
const noteText='Rosa note: provider status shows degraded card auth.'
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
 await page.waitForURL(url=>url.pathname==='/on-call'||url.pathname==='/status')
 return (await call(page,'/api/session')).value.member
}
async function openIncident(page,id){await page.goto(`${worker.origin}/incidents/${encodeURIComponent(id)}`);await page.reload();await page.locator('.detail h1').waitFor()}
const entry=(page,text)=>page.locator('.timeline .event').filter({hasText:text})
async function denied(page,label,id){
 const state=await page.context().request.get(worker.origin+'/api/state'),workspace=await (await page.context().request.get(worker.origin+'/api/workspace')).json()
 assert.equal(state.status(),401,`${label}: protected state refused`)
 assert.equal(workspace.state,null,`${label}: no workspace returned`)
 await page.goto(`${worker.origin}/incidents/${encodeURIComponent(id)}`);await page.reload();await page.waitForLoadState('networkidle')
 assert.equal(await page.locator('.timeline').count(),0,`${label}: no incident history rendered`)
 assert.ok(!(await page.locator('body').innerText()).includes(noteText),`${label}: no coordination text in the page`)
}
try {
 const claimed=await worker.request('/auth/bootstrap',{token:worker.vars.SETUP_TOKEN,displayName:'Oncall lead'},undefined,{'CF-Connecting-IP':'127.0.0.1'})
 assert.equal(claimed.status,303,JSON.stringify(claimed.value))
 browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 const owner=await open(1440)
 await owner.context.addCookies(claimed.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}}))
 await owner.page.goto(worker.origin+'/setup')
 const confirmation=owner.page.getByRole('checkbox')
 if(await confirmation.count()){await confirmation.check();await owner.page.getByRole('button',{name:'Finish setup'}).click()}
 await owner.page.locator('.oncall-frame').waitFor({timeout:60000})
 const ownerMember=ok(await call(owner.page,'/api/session')).member
 const rosaRecord=ok(await call(owner.page,'/api/members',{...responder,role:'responder'}),201)
 ok(await call(owner.page,'/api/members',{...viewer,role:'viewer'}),201)
 ok(await call(owner.page,'/api/command',{type:'service',id:'checkout',name:'Checkout',environment:'production',owner:rosaRecord.id,runbook:['Check payment provider status'],pager:''}))
 // OC4: per-value save survives immediate menu departure; offline Retry commits once.
 await owner.page.goto(worker.origin+'/settings/services/checkout');
 const autosaveCard=owner.page.locator('.service-page'),ownerField=autosaveCard.getByLabel('Owner',{exact:true});
 await ownerField.selectOption(ownerMember.id);await openWorkspaceSection(owner.page,'team');
 await openWorkspaceSection(owner.page,'services');await owner.page.locator('a[href="/settings/services/checkout"]').click();await owner.page.reload();
 await expect(ownerField).toHaveValue(ownerMember.id);
 const beforeRetry=ok(await call(owner.page,'/api/state')).audit.length;
 const blockWrite=route=>route.request().postDataJSON()?.type==='service'&&route.request().postDataJSON()?.field==='owner'?route.abort():route.continue();
 await owner.page.route('**/api/command',blockWrite);await ownerField.selectOption(rosaRecord.id);
 await expect(autosaveCard.getByRole('button',{name:'Retry',exact:true})).toBeVisible();await expect(ownerField).toHaveValue(rosaRecord.id);
 assert.equal(await autosaveCard.getByText('Saved',{exact:true}).count(),0,'failed save never announces success');
 await owner.page.unroute('**/api/command',blockWrite);
 const retryWrite=owner.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().postDataJSON()?.type==='service'&&r.request().postDataJSON()?.field==='owner');
 await autosaveCard.getByRole('button',{name:'Retry',exact:true}).click();assert.equal((await retryWrite).status(),200);
 await expect(autosaveCard.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 const afterRetry=ok(await call(owner.page,'/api/state'));assert.equal(afterRetry.audit.length,beforeRetry+1,'Retry adds exactly one audit row');assert.equal(afterRetry.services.find(s=>s.id==='checkout').owner,rosaRecord.id);
 console.log('OC4 autosave: menu departure retains owner after reload; offline retains input; Retry audit +1');
 // OC-023 public-team forms use the existing Team section at both widths.
 for(const width of [1440]){
  await owner.page.setViewportSize({width,height:1000});await owner.page.goto(worker.origin+'/settings/team');await owner.page.reload();
  const panel=owner.page.getByRole('region',{name:'Teams',exact:true});await panel.getByRole('heading',{name:'Teams',exact:true}).waitFor();
  const teamWrite=()=>owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/teams'&&response.request().method()==='POST');
  await panel.locator('summary').filter({hasText:/^Create team$/}).click();
  const create=panel.locator('details').filter({has:owner.page.locator('summary').filter({hasText:/^Create team$/})});
  await create.getByLabel('Team name',{exact:true}).fill('synthetic-oncall-145-'+width+' pending');
  await create.getByRole('checkbox',{name:'Member '+responder.name,exact:true}).check();
  await create.getByRole('checkbox',{name:'Manager '+responder.name,exact:true}).check();
  await owner.context.setOffline(true);await create.getByRole('button',{name:'Create team',exact:true}).click();
  await expect(create.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
  assert.equal(await create.getByLabel('Team name',{exact:true}).inputValue(),'synthetic-oncall-145-'+width+' pending');
  await owner.context.setOffline(false);await create.getByLabel('Team name',{exact:true}).fill('synthetic-oncall-145-'+width);
  await create.getByRole('checkbox',{name:'Member '+viewer.name,exact:true}).click();
  await expect(create.getByRole('checkbox',{name:'Member '+responder.name,exact:true})).toBeChecked();
  await expect(create.getByRole('checkbox',{name:'Member '+viewer.name,exact:true})).toBeChecked();
  const created=teamWrite();await create.getByRole('button',{name:'Retry',exact:true}).click();assert.equal((await created).status(),200);
  const card=panel.getByRole('article').filter({has:owner.page.getByRole('heading',{name:'synthetic-oncall-145-'+width,exact:true})});
  await card.getByRole('heading').waitFor();await expect(create.getByLabel('Team name',{exact:true})).toHaveValue('');await card.getByText('Edit team',{exact:true}).click();
  const name=card.getByLabel('Team name',{exact:true}),edited='synthetic-oncall-145-'+width+' edited';
  await name.fill(edited);
  await owner.context.setOffline(true);await name.press('Enter');
  await expect(card.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
  assert.equal(await name.inputValue(),edited);
  await owner.context.setOffline(false);
  const retried=teamWrite();await card.getByRole('button',{name:'Retry',exact:true}).click();assert.equal((await retried).status(),200);
  const saved=panel.getByRole('article').filter({has:owner.page.getByRole('heading',{name:edited,exact:true})});await saved.getByRole('heading').waitFor();
  await saved.getByLabel('Team name',{exact:true}).fill(edited+' pending');
  await expect(saved.getByLabel('Team name',{exact:true}).locator('..').getByRole('status')).toBeEmpty();
  assert.equal(ok(await call(owner.page,'/api/state')).teams.some(t=>t.name===edited+' pending'),false);
  await saved.getByLabel('Team name',{exact:true}).fill(edited);
  const teamState=ok(await call(owner.page,'/api/state')),owning=teamState.teams.find(t=>t.name===edited);
  assert.ok(owning.members.includes(rosaRecord.id));assert.equal(owning.members.length,2);assert.deepEqual(owning.managers,[rosaRecord.id]);
  // A stale edit keeps a different member change saved by another administrator.
  const other=await owner.context.newPage();await other.goto(worker.origin+'/settings/team');
  const otherCard=other.getByRole('region',{name:'Teams',exact:true}).getByRole('article').filter({has:other.getByRole('heading',{name:edited,exact:true})});
  await otherCard.getByText('Edit team',{exact:true}).click();
  const otherWrite=other.waitForResponse(response=>new URL(response.url()).pathname==='/api/teams'&&response.request().method()==='POST'&&response.status()===200);
  await otherCard.getByRole('checkbox',{name:'Member '+ownerMember.name,exact:true}).check();assert.equal((await otherWrite).status(),200);
  const firstEdit=teamWrite();await saved.getByRole('checkbox',{name:'Member '+viewer.name,exact:true}).uncheck();
  const firstAnswer=await firstEdit;
  if(firstAnswer.status()===409){
   const kept=owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/teams'&&response.request().method()==='POST'&&response.status()===200);
   await saved.getByRole('button',{name:'Retry',exact:true}).click();assert.equal((await kept).status(),200);
  }else assert.equal(firstAnswer.status(),200);
  const combined=ok(await call(owner.page,'/api/state')).teams.find(t=>t.id===owning.id);
  const viewerRecord=ok(await call(owner.page,'/api/state')).members.find(m=>m.name===viewer.name);
  assert.ok(combined.members.includes(ownerMember.id));assert.ok(!combined.members.includes(viewerRecord.id));
  await expect(saved.getByRole('checkbox',{name:'Member '+ownerMember.name,exact:true})).toBeChecked();
  await other.close();
  let reset=teamWrite();await saved.getByRole('checkbox',{name:'Member '+ownerMember.name,exact:true}).uncheck();assert.equal((await reset).status(),200);
  reset=teamWrite();await saved.getByRole('checkbox',{name:'Member '+viewer.name,exact:true}).check();assert.equal((await reset).status(),200);
  const archived=teamWrite();await saved.getByLabel('Team state',{exact:true}).selectOption('false');assert.equal((await archived).status(),200);
  assert.equal(ok(await call(owner.page,'/api/state')).teams.find(t=>t.id===owning.id).active,false);
  const restored=teamWrite();await saved.getByLabel('Team state',{exact:true}).selectOption('true');assert.equal((await restored).status(),200);
  assert.equal(ok(await call(owner.page,'/api/state')).teams.find(t=>t.id===owning.id).active,true);
  const ownershipSaved=owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().postDataJSON()?.field==='team'&&response.request().method()==='POST');
  await owner.page.goto(worker.origin+'/settings/services/checkout');await owner.page.getByLabel('Team',{exact:true}).selectOption(owning.id);await owner.page.getByRole('button',{name:'Change team',exact:true}).click();assert.equal((await ownershipSaved).status(),200);
  await owner.page.reload();assert.equal(await owner.page.getByLabel('Team',{exact:true}).inputValue(),owning.id);await owner.page.goto(worker.origin+'/settings/team');await panel.getByRole('heading',{name:'Teams',exact:true}).waitFor();
  assert.ok(await owner.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`teams fit ${width}`);
  assert.equal(await owner.page.evaluate(()=>window.__rerHydration?.count??0),0);
  assert.deepEqual((await new AxeBuilder({page:owner.page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations,[]);
  await panel.scrollIntoViewIfNeeded();await owner.page.screenshot({path:`${captureDirectory}/oc023-public-teams-${width}.png`,fullPage:true});
 }
 // The same Teams panel imports the pasted catalog through Preview and Apply at the journey's desktop width.
 await owner.page.setViewportSize({width:1440,height:1000});await owner.page.goto(worker.origin+'/settings/team');const importPanel=owner.page.locator('.teams-import'),catalogTeam=ok(await call(owner.page,'/api/state')).teams[0];
 await importPanel.getByText('Import from Backstage',{exact:true}).click();await importPanel.getByLabel('Backstage catalog',{exact:true}).fill(JSON.stringify([{kind:'Component',metadata:{name:'checkout'},spec:{owner:catalogTeam.name}}]));await importPanel.getByRole('button',{name:'Preview import',exact:true}).click();await importPanel.getByLabel('Import choice for Checkout',{exact:true}).selectOption('backstage');
 await importPanel.getByRole('button',{name:'Apply import',exact:true}).click();await expect(importPanel.getByRole('status')).toHaveText('Saved');assert.equal(ok(await call(owner.page,'/api/state')).services.find(s=>s.id==='checkout').ownership.source,'backstage');
 // OC-023: both service forms preserve explicit unassigned ownership.
 for(const width of [1440]) {
  await owner.page.setViewportSize({width,height:1000});await owner.page.goto(worker.origin+'/settings/services');await owner.page.reload();
  await owner.page.getByRole('button',{name:'Add service',exact:true}).click();
  const add=owner.page.locator('.service-create');
  await add.getByLabel('Service name',{exact:true}).fill('synthetic-oncall-23-'+width);
  await add.getByLabel('Service owner',{exact:true}).selectOption('');
  await add.getByRole('button',{name:'Create service',exact:true}).click();
  const card=owner.page.locator('.service-page');
  await card.getByRole('heading',{name:'synthetic-oncall-23-'+width,exact:true}).waitFor();
  assert.equal(await card.getByLabel('Owner',{exact:true}).inputValue(),'');
  const renamed=owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().postDataJSON()?.field==='name');
  await card.getByLabel('Name',{exact:true}).fill('synthetic-oncall-23-'+width+' edited');await card.getByLabel('Name',{exact:true}).press('Tab');
  assert.equal((await renamed).status(),200);
  await owner.page.reload();const edited=owner.page.locator('.service-page');
  await edited.getByRole('heading',{name:'synthetic-oncall-23-'+width+' edited',exact:true}).waitFor();
  assert.equal(await edited.getByLabel('Owner',{exact:true}).inputValue(),'');
  assert.ok(await owner.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`ownerless services fit ${width}`);
  assert.equal(await owner.page.evaluate(()=>window.__rerHydration?.count??0),0);
  const axe=await new AxeBuilder({page:owner.page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();
  assert.deepEqual(axe.violations,[],'ownerless services have no accessibility violations');
  await edited.scrollIntoViewIfNeeded();await owner.page.screenshot({path:`${captureDirectory}/oc023-ownerless-services-${width}.png`,fullPage:true});
 }
 const declared=ok(await call(owner.page,'/api/command',{type:'declare',title:'Checkout payments failing',service:'checkout',severity:'critical',summary:'Card payments fail at checkout.',alerts:[]}))

 // The responder coordinates through the incident page, then reloads at both widths.
 const rosa=await open(1440)
 const rosaMember=await passwordSignIn(rosa.page,responder)
 assert.equal(rosaMember.id,rosaRecord.id);assert.equal(rosaMember.role,'responder')
 assert.notEqual(rosaMember.id,ownerMember.id,'member and owner identities stay separate')
 await openIncident(rosa.page,declared.id)
 await rosa.page.getByRole('button',{name:'Acknowledge',exact:true}).click()
 await rosa.page.locator('.incident-state.state-acknowledged').waitFor()
 const ackText=ok(await call(rosa.page,'/api/state')).incidents.find(i=>i.id===declared.id).timeline.find(e=>e.lifecycle?.to==='acknowledged').text
 await rosa.page.getByLabel('Observation, decision or evidence').fill(noteText)
 await rosa.page.getByRole('button',{name:'Add note'}).click()
 await entry(rosa.page,noteText).waitFor()
 assert.equal(await rosa.page.getByRole('button',{name:/Send test page/}).count(),0,'no paging control is offered')
 for(const page of [rosa.page,owner.page])assert.equal((await call(page,'/api/paging/jobs',{incident:declared.id})).status,409,'paging stays OFF and refuses')
 for(const width of [1440]) {
  await rosa.page.setViewportSize({width,height:1000});await rosa.page.reload();await rosa.page.locator('.detail h1').waitFor()
  for(const text of [ackText,noteText])assert.match(await entry(rosa.page,text).innerText(),new RegExp(responder.name),`"${text}" stays attributed to the member after reload`)
  assert.equal(await rosa.page.locator('.incident-state.state-acknowledged').count(),1,'acknowledgement persists after reload')
  assert.ok(await rosa.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`no horizontal scroll at ${width}`)
  await rosa.page.locator('.timeline').scrollIntoViewIfNeeded();await rosa.page.screenshot({path:`${captureDirectory}/member-coordination-reloaded-${width}.png`,fullPage:true})
 }
 const kept=ok(await call(rosa.page,'/api/workspace')).state.incidents.find(i=>i.id===declared.id)
 assert.equal(kept.state,'acknowledged')
 for(const text of [ackText,noteText])assert.equal(kept.timeline.find(e=>e.text.includes(text)).actor,rosaMember.id,'the stored entry names the member')
 assert.ok(kept.timeline.some(e=>e.kind==='declared'&&e.actor===ownerMember.id),'the declaration stays the owner’s')

 // The independently signed-in responder sees a second session's note on return.
 const draft='Rosa draft: checking the next provider update.'
 await rosa.page.getByLabel('Observation, decision or evidence',{exact:true}).fill(draft)
 const responseSettings=await openIncidentAction(rosa.page,'People and priority')
 await openIncident(owner.page,declared.id)
 const secondNote='Owner update: provider recovery is being verified.'
 await owner.page.getByLabel('Observation, decision or evidence',{exact:true}).fill(secondNote)
 const written=owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().method()==='POST')
 await owner.page.getByRole('button',{name:'Add note',exact:true}).click()
 assert.equal((await written).status(),200)
 await entry(owner.page,secondNote).waitFor()
 await focusWorkspace(rosa.page)
 await entry(rosa.page,secondNote).waitFor()
 assert.match(await entry(rosa.page,secondNote).innerText(),new RegExp(ownerMember.name),'the second session note stays attributed to its author')
 assert.equal(await rosa.page.getByLabel('Observation, decision or evidence',{exact:true}).inputValue(),draft,'background refresh preserves the typed note')
 assert.equal(await responseSettings.evaluate(element=>element.open),true,'background refresh preserves the open response sheet')
 await responseSettings.getByRole('button',{name:'Close',exact:true}).click()

 // A public-team manager can edit own coverage without workspace configuration authority.
 const managedRotation={anchorLocal:'2026-01-01T00:00',periodDays:1,members:[rosaRecord.id],ambiguity:'earlier'};
 ok(await call(owner.page,'/api/paging/schedules',{id:'synthetic-oncall-145',name:'synthetic-oncall-145',service:'checkout',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:managedRotation,backup:{...managedRotation,members:[]},overrides:[]}));
 for(const width of [1440]){
  await rosa.page.setViewportSize({width,height:1000});await rosa.page.goto(worker.origin+'/on-call/synthetic-oncall-145/edit');
  await expect(rosa.page.getByLabel('Rota name',{exact:true})).toBeEnabled();
  const draft=rosa.page.waitForRequest(request=>new URL(request.url()).pathname==='/api/paging/preview'&&!!request.postDataJSON()?.schedule);
  await rosa.page.goto(worker.origin+'/on-call/new');
  assert.equal((await draft).postDataJSON().schedule.service,'checkout','the manager’s new rota uses its one authorized service');
  assert.ok(await rosa.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`manager coverage fits ${width}`);
  assert.equal(await rosa.page.evaluate(()=>window.__rerHydration?.count??0),0);
  assert.deepEqual((await new AxeBuilder({page:rosa.page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations,[]);
  await rosa.page.screenshot({path:`${captureDirectory}/oc023-manager-coverage-${width}.png`,fullPage:true});
 }

 // A second permitted session, the viewer, reads the same history and cannot write.
 const vic=await open(1440)
 assert.equal((await passwordSignIn(vic.page,viewer)).role,'viewer')
 await openIncident(vic.page,declared.id)
 for(const text of [ackText,noteText])assert.match(await entry(vic.page,text).innerText(),new RegExp(responder.name))
 assert.equal(await vic.page.getByLabel('Observation, decision or evidence').count(),0,'viewers get no coordination controls')
 ok(await call(vic.page,'/api/command',{type:'note',incident:declared.id,revision:kept.revision,text:'viewer write'}),403)
 await vic.page.locator('.timeline').scrollIntoViewIfNeeded();await vic.page.screenshot({path:`${captureDirectory}/member-coordination-viewer-1440.png`,fullPage:true})

 // OC-061: the existing shell carries internal status, with a status-only stakeholder session.
 const stakeholder={name:'Sam Stakeholder',password:'synthetic-oncall-61-password'}
 const sam=ok(await call(owner.page,'/api/members',{...stakeholder,role:'stakeholder'}),201)
 ok(await call(owner.page,'/api/command',{type:'service',id:'synthetic-oncall-61',name:'Payment gateway',environment:'production',owner:rosaRecord.id,runbook:['Private gateway recovery instructions'],pager:''}))
 await owner.page.goto(worker.origin+'/status');await owner.page.reload()
 const statusPanel=owner.page.getByRole('region',{name:'Internal business status'})
 await statusPanel.getByRole('heading',{name:'Business services',exact:true}).waitFor()
 // With no business services, creation opens automatically after the status read.
 await statusPanel.getByLabel('Business-service name',{exact:true}).fill('Checkout')
 const teamField=statusPanel.getByLabel('Owning team',{exact:true})
 if(await teamField.count()){
  if(await teamField.evaluate(e=>e.tagName==='SELECT'))await teamField.selectOption({index:0});else await teamField.fill('Payments')
 }else{
  const teams=ok(await call(owner.page,'/api/state')).teams
  assert.equal(teams.length,1,'a form without an Owning team control has one team')
  await expect(statusPanel.locator('input[type="hidden"][name="owningTeam"]')).toHaveValue(teams[0].name)
  await expect(statusPanel.getByText('Owning team: '+teams[0].name,{exact:true})).toBeVisible()
  console.log('OC-061 one-team branch: the form names its sole created team',teams[0].name)
 }
 await statusPanel.getByLabel('Supporting technical services',{exact:true}).selectOption('synthetic-oncall-61')
 await statusPanel.getByLabel('Communications owner',{exact:true}).selectOption(rosaRecord.id)
 await statusPanel.getByRole('group',{name:'Stakeholder audience',exact:true}).getByRole('checkbox',{name:sam.name,exact:true}).check()
 await statusPanel.getByRole('button',{name:'Create business service',exact:true}).click()
 const checkout=statusPanel.getByRole('article',{name:'Checkout',exact:true})
 await checkout.getByText('Derived status: operational',{exact:true}).waitFor()
 const statusIncident=ok(await call(owner.page,'/api/command',{type:'declare',service:'synthetic-oncall-61',severity:'warning',title:'Private gateway timeouts',summary:'Customer payment attempts delayed',alerts:[]}))
 await focusWorkspace(owner.page)
 await checkout.getByText('Derived status: degraded',{exact:true}).waitFor()
 const statusCapture=async(page,screen,width)=>{
  await page.setViewportSize({width,height:1000})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),screen+' fits '+width)
  assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0,'no hydration mismatch')
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()
  assert.deepEqual(axe.violations.filter(row=>['serious','critical'].includes(row.impact)),[],screen+' has no serious accessibility finding')
  console.log(`Member coordination ${screen} at ${width}: overflow, hydration and accessibility passed`);
  await page.screenshot({path:`${captureDirectory}/${(/^(oc068|oc058)-/.test(screen))?screen:'oc061-'+screen}-${width}.png`,fullPage:true})
 }
 for(const width of [1440])await statusCapture(owner.page,'derived-status',width)
 await checkout.getByText('Manage internal status',{exact:true}).click()
 await checkout.getByLabel('Status set by hand',{exact:true}).selectOption('operational')
 await checkout.getByLabel('Reason',{exact:true}).fill('Alternate gateway is processing payments')
 await checkout.getByRole('button',{name:'Set status',exact:true}).click()
 await checkout.getByText(/Manual override: operational/).waitFor()
 for(const width of [1440])await statusCapture(owner.page,'override-reason',width)
 const samView=await open(1440);await passwordSignIn(samView.page,stakeholder)
 await samView.page.getByRole('heading',{name:'Status',exact:true}).waitFor()
 const samCheckout=samView.page.getByRole('article',{name:'Checkout',exact:true})
 await samCheckout.getByText('Your subscription',{exact:true}).click()
 const subscribed=samView.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/status'&&r.request().method()==='POST');
 await samCheckout.getByLabel('Subscription',{exact:true}).selectOption('true')
 assert.equal((await subscribed).status(),200)
 await samCheckout.getByRole('heading',{name:'Recorded impact obligations',exact:true}).waitFor()
 for(const width of [1440]){
  await samView.page.setViewportSize({width,height:1000});await samView.page.reload()
  await samView.page.getByRole('heading',{name:'Recorded impact obligations',exact:true}).waitFor()
  assert.equal(await samView.page.locator('.timeline').count(),0)
  assert.equal(await samView.page.locator('nav a[href="/incidents"]').count(),0)
  for(const path of ['/api/state','/api/triage','/api/archive','/api/recovery/checkpoint','/api/audit/export','/api/handoffs/context/'+statusIncident.id,'/api/paging/state','/api/email','/api/automation/clients'])ok(await call(samView.page,path),403)
  ok(await call(samView.page,'/api/v1/incidents'),401)
  ok(await call(samView.page,'/api/command',{type:'declare',service:'synthetic-oncall-61',title:'Refused page',severity:'warning',summary:'No authority'}),403)
  const workspace=ok(await call(samView.page,'/api/workspace'));assert.equal(workspace.state,null)
  const html=await (await samView.context.request.get(worker.origin+'/')).text()
  assert.ok(!html.includes('Private gateway timeouts')&&!html.includes('Private gateway recovery instructions'),'stakeholder HTML bootstrap contains no response data')
  await statusCapture(samView.page,'stakeholder-status-and-refusals',width)
 }
 console.log('OC-061 browser: existing internal-status panel, derived degraded, attributed override and reason, stakeholder subscription and private-door refusals at 1440')
 await samView.context.close()

 // OC-061 email lists: configure in Settings, inspect start/end records, unsubscribe and use shared erasure.
 for(const width of [1440]){
  await owner.page.setViewportSize({width,height:1000});const serviceId='synthetic-oncall-614-'+width,name='Synthetic list status '+width,address='synthetic-oncall-614-'+width+'@example.test';
  ok(await call(owner.page,'/api/command',{type:'service',id:serviceId,name:'Synthetic list service '+width,environment:'test',owner:ownerMember.id,runbook:[],pager:''}));
  ok(await call(owner.page,'/api/status',{action:'create',name,owningTeam:'Synthetic team label',supporting:[serviceId],communicationsOwner:ownerMember.id,audience:[],highUrgencyImpact:false}));
  await owner.page.goto(worker.origin+'/status');await owner.page.reload();const panel=owner.page.getByRole('region',{name:'Internal business status'}),card=panel.getByRole('article',{name,exact:true});
  await card.getByText('Manage internal status',{exact:true}).click();await card.getByText('Email-list subscription settings',{exact:true}).click();await card.getByLabel('Email-list address',{exact:true}).fill(address);await card.getByRole('button',{name:'Add email-list subscriber',exact:true}).click();await card.getByText(address+' · email · subscribed',{exact:true}).waitFor();
  let impact=ok(await call(owner.page,'/api/command',{type:'declare',service:serviceId,title:'Synthetic private list impact '+width,summary:'Synthetic local response context',severity:'warning'}));await focusWorkspace(owner.page);await card.getByText(/impact started/).first().waitFor();await card.scrollIntoViewIfNeeded();await statusCapture(owner.page,'email-list-started',width);await owner.page.screenshot({path:`${captureDirectory}/oc061-email-list-started-focus-${width}.png`});
  for(const state of ['acknowledged','recovered','resolved'])impact=ok(await call(owner.page,'/api/command',{type:'transition',incident:impact.id,revision:impact.revision,state,summary:'Synthetic recovery verified',evidence:'https://example.test/synthetic-oncall-614'}));await focusWorkspace(owner.page);await card.getByText(/impact ended/).first().waitFor();await statusCapture(owner.page,'email-list-ended',width);
  const listRow=card.locator('.saved-view').filter({hasText:address});await listRow.getByRole('button',{name:'Unsubscribe email list',exact:true}).click();await card.getByText(address+' · email · unsubscribed',{exact:true}).waitFor();
  ok(await call(owner.page,'/api/command',{type:'declare',service:serviceId,title:'Synthetic subsequent impact '+width,summary:'Synthetic local response only',severity:'warning'}));await focusWorkspace(owner.page);
  const saved=ok(await call(owner.page,'/api/state')).businessServices.find(row=>row.name===name),list=saved.emailLists.find(row=>row.address===address);assert.equal(saved.notices.filter(row=>row.target.kind==='email-list'&&row.target.id===list.id).length,2);assert.ok(saved.notices.every(row=>row.label==='no sender'&&row.automatic===false));assert.ok(!JSON.stringify(saved.notices).includes('Synthetic private list impact'));await statusCapture(owner.page,'email-list-unsubscribed',width);
  await owner.page.goto(worker.origin+'/settings/archive');await focusWorkspace(owner.page);const erasure=owner.page.locator('.erase-data');await erasure.locator(':scope > summary').click();await erasure.getByLabel('Erasure category',{exact:true}).waitFor();
  await erasure.getByLabel('Erasure category',{exact:true}).selectOption('email-list');await erasure.getByLabel('Erasure subject',{exact:true}).selectOption(list.id);await erasure.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+await erasure.locator('select').nth(1).evaluate(select=>select.selectedOptions[0].label));await erasure.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await statusCapture(owner.page,'email-list-erasure-review',width);
  const erased=owner.page.waitForResponse(response=>response.url().endsWith('/api/erasure/email-list/'+list.id));await erasure.getByRole('button',{name:'Erase selected subject',exact:true}).click();assert.equal((await erased).status(),200);assert.equal((await (await erased).json()).stores.oc_business_services.deleted,0);assert.equal((await (await erased).json()).stores.oc_business_services.updated,1);await erasure.getByRole('status').scrollIntoViewIfNeeded();await statusCapture(owner.page,'email-list-erasure-receipt',width);await owner.page.screenshot({path:`${captureDirectory}/oc061-email-list-erasure-receipt-focus-${width}.png`});assert.ok(!JSON.stringify(ok(await call(owner.page,'/api/state'))).includes(address));
 }
 console.log('OC-061 email-list browser: Settings authoring, started/ended recorded no-sender obligations, unsubscribe prevents future records and shared erasure receipt at 1440; overflow, axe and hydration passed')

 // The new role is excluded from every responder selector on the existing screens.
 ok(await call(owner.page,'/api/paging/schedules',{id:'synthetic-oncall-62',name:'Payments primary',service:'synthetic-oncall-61',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[rosaRecord.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[ownerMember.id],ambiguity:'earlier'},overrides:[]}))
 const roleSession=await owner.context.newCDPSession(owner.page);await roleSession.send('Emulation.setCPUThrottlingRate',{rate:4})
 const excludesStakeholder=async locator=>assert.ok(!(await locator.locator('option').evaluateAll(options=>options.map(option=>option.value))).includes(sam.id),'stakeholders are never offered as responders')
 for(const screen of ['team','services','routing','schedules','incidents']){
  await owner.page.goto(worker.origin+({team:'/settings/team',services:'/settings/services',routing:'/settings/routing',schedules:'/on-call'}[screen]??'/'+screen));await owner.page.reload()
  if(screen==='team')await owner.page.getByRole('heading',{name:'Team',exact:true,level:2}).waitFor()
  if(screen==='services'){await owner.page.getByRole('button',{name:'Add service',exact:true}).click();await excludesStakeholder(owner.page.getByLabel('Service owner',{exact:true}))}
  if(screen==='routing'){if(!await owner.page.getByLabel('Owner',{exact:true}).isVisible())await owner.page.getByText('Add routed key',{exact:true}).click();await excludesStakeholder(owner.page.getByLabel('Owner',{exact:true}))}
  if(screen==='schedules'){
   await owner.page.goto(worker.origin+'/on-call/synthetic-oncall-62/edit')
   await owner.page.getByLabel('Rota name',{exact:true}).waitFor()
   await owner.page.getByRole('button',{name:'Continue',exact:true}).click()
   await owner.page.getByRole('heading',{name:'Who is on, in order',exact:true}).waitFor()
   await excludesStakeholder(owner.page.getByLabel('Primary person 1',{exact:true}))
   await owner.page.getByRole('button',{name:'Remove person',exact:true}).first().focus()
   await owner.page.getByRole('tooltip',{name:'Remove person',exact:true}).first().waitFor({state:'visible'})
  }
  if(screen==='incidents'){
   await owner.page.getByRole('button',{name:'Select this page',exact:true}).click()
   await owner.page.getByLabel('Bulk action',{exact:true}).selectOption('reassign')
   await excludesStakeholder(owner.page.getByLabel('Bulk assignee',{exact:true}))
   await owner.page.locator('.incident').filter({hasText:'Checkout payments failing'}).click()
   const people=await openIncidentAction(owner.page,'People and priority')
   await excludesStakeholder(people.getByLabel('Scribe',{exact:true}))
   await people.getByRole('button',{name:'Close',exact:true}).click()
  }
  for(const width of [1440])await statusCapture(owner.page,'role-'+screen,width)
 }
 await roleSession.send('Emulation.setCPUThrottlingRate',{rate:1});await roleSession.detach()
 console.log('OC-061 role selectors and tooltips: team, service, routing, schedule and incident/bulk screens at 1440 with own browser CPU rate 4; stakeholder excluded from response owners and keyboard tooltip immediate')

 // OC-068 uses the real manual-page form and independent target response controls.
 await owner.page.goto(worker.origin+'/incidents');await owner.page.reload()
 await owner.page.getByRole('button',{name:'Declare incident',exact:true}).click()
 await owner.page.getByLabel('Incident title',{exact:true}).fill('Manual checkout responder request')
 await owner.page.getByLabel('Service',{exact:true}).selectOption('checkout')
 await owner.page.locator('form').filter({has:owner.page.getByRole('button',{name:'Declare',exact:true})}).getByText('More options',{exact:true}).click()
 await owner.page.getByLabel('Page urgency',{exact:true}).selectOption('high')
 await owner.page.getByLabel('Page priority',{exact:true}).selectOption('P2')
 await owner.page.getByLabel('Customer impact and current evidence',{exact:true}).fill('Customer payments need investigation')
 const manualForm68=owner.page.locator('form').filter({has:owner.page.getByRole('button',{name:'Declare',exact:true})})
 await manualForm68.getByLabel('Named responders',{exact:true}).selectOption(rosaRecord.id)
 await owner.page.getByRole('button',{name:'Declare',exact:true}).waitFor()
 for(const width of [1440])await statusCapture(owner.page,'oc068-manual-page-form',width)
 await owner.page.getByRole('button',{name:'Declare',exact:true}).click()
 await owner.page.locator('.detail h1').filter({hasText:'Manual checkout responder request'}).waitFor()
 const manual68=ok(await call(owner.page,'/api/state')).incidents.find(i=>i.title==='Manual checkout responder request')
 assert.equal(manual68.manualPage.creator,ownerMember.id);assert.equal(manual68.manualPage.obligations[0].target.id,rosaRecord.id)
 await openIncidentAction(owner.page,'Request responders')
 const requests68=owner.page.getByRole('region',{name:'Manual obligations and responder requests'})
 for(const message of ['Inspect payment provider','Inspect payment network']){
  await requests68.getByLabel('Named responders',{exact:true}).selectOption(rosaRecord.id)
  await requests68.getByLabel('Responder request message',{exact:true}).fill(message)
  await requests68.getByRole('button',{name:'Record responder requests',exact:true}).click()
  await requests68.getByText(message,{exact:true}).waitFor()
 }
 await openIncident(rosa.page,manual68.id);await rosa.page.reload()
 await openIncidentAction(rosa.page,'Request responders')
 const responseRegion=rosa.page.getByRole('region',{name:'Manual obligations and responder requests'})
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment provider'}).getByRole('button',{name:'Accept request',exact:true}).click()
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment provider'}).getByText(/^accepted · requested/).waitFor()
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment network'}).getByRole('button',{name:'Decline request',exact:true}).click()
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment network'}).getByText(/^declined · requested/).waitFor()
 await responseRegion.getByText('Primary acknowledgment: Unacknowledged',{exact:true}).waitFor()
 for(const width of [1440])await statusCapture(rosa.page,'oc068-requests-and-obligations',width)
 await openIncident(vic.page,manual68.id);await vic.page.reload()
 await openIncidentAction(vic.page,'Request responders')
 await vic.page.getByText('Only responders and admins may create manual pages or request responders.',{exact:true}).waitFor()
 ok(await call(vic.page,'/api/command',{type:'manual-page',operationId:'synthetic-oncall-68-viewer',service:'checkout',title:'Refused',severity:'critical'}),403)
 for(const width of [1440])await statusCapture(vic.page,'oc068-viewer-refusal',width)
 await owner.page.goto(worker.origin+'/settings/services/checkout');await owner.page.reload()
 const assignment68=owner.page.locator('.service-page')
 await assignment68.getByText('Assign new incidents',{exact:true}).click()
 const assignmentChoice=owner.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().postDataJSON()?.type==='user-assignment');
 await assignment68.getByLabel('User-assignment outcome',{exact:true}).selectOption('repeat');assert.equal((await assignmentChoice).status(),200)
 await assignment68.getByLabel('Assignment delay (minutes)',{exact:true}).fill('7')
 const assignmentText=owner.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().postDataJSON()?.type==='user-assignment');
 await assignment68.getByLabel('Assignment delay (minutes)',{exact:true}).blur();assert.equal((await assignmentText).status(),200);
 assert.equal(ok(await call(owner.page,'/api/state')).services.find(s=>s.id==='checkout').userAssignments.at(-1).minutes,7)
 assert.equal(await assignment68.getByLabel('User-assignment outcome',{exact:true}).inputValue(),'repeat')
 for(const width of [1440])await statusCapture(owner.page,'oc068-service-assignment-rule',width)
 console.log('OC-068 browser: manual page urgency/target, recorded obligations, independent accepted and declined responder requests, viewer refusal and versioned assignment setting at 1440')
 await assignment68.getByText('Acknowledgment timeout',{exact:true}).click()
 await assignment68.getByLabel('Acknowledgment timeout (minutes, 0 is off)',{exact:true}).fill('1')
 const timeoutSave=owner.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().postDataJSON()?.type==='acknowledgment-timeout');
 await assignment68.getByLabel('Acknowledgment timeout (minutes, 0 is off)',{exact:true}).blur();assert.equal((await timeoutSave).status(),200);
 assert.equal(ok(await call(owner.page,'/api/state')).services.find(s=>s.id==='checkout').ackTimeouts.at(-1).minutes,1)
 for(const width of [1440])await statusCapture(owner.page,'oc058-service-timeout',width)
 let incident58=ok(await call(owner.page,'/api/command',{type:'manual-page',operationId:'synthetic-oncall-58-browser',service:'checkout',title:'Snoozed checkout investigation',severity:'warning',summary:'Investigating a customer checkout delay'}))
 incident58=ok(await call(owner.page,'/api/command',{type:'transition',incident:incident58.id,revision:incident58.revision,state:'acknowledged',summary:'Owner investigating'}))
 await openIncident(owner.page,incident58.id)
 await openIncidentAction(owner.page,'Snooze')
 await owner.page.getByLabel('Snooze duration (minutes)',{exact:true}).fill('1')
 for(const width of [1440])await statusCapture(owner.page,'oc058-snooze-form',width)
 await owner.page.getByRole('button',{name:'Snooze incident',exact:true}).click()
 await owner.page.getByRole('status').filter({hasText:'Snoozed / acknowledgment held until'}).waitFor()
 for(const width of [1440])await statusCapture(owner.page,'oc058-snoozed',width)
 incident58=ok(await call(owner.page,'/api/state')).incidents.find(i=>i.id===incident58.id)
 await worker.time(Date.parse(incident58.deadlines.at(-1).dueAt))
 const expired58=await worker.send('/cdn-cgi/local/scheduled',undefined,{},'GET');assert.equal(expired58.status,200)
 await openIncident(owner.page,incident58.id)
 await openIncidentAction(owner.page,'Snooze')
 await owner.page.getByRole('region',{name:'Incident deadlines'}).getByText(/snooze · fired/).waitFor()
 await owner.page.getByRole('button',{name:'Close',exact:true}).click()
 await openIncidentAction(owner.page,'Request responders')
 assert.equal(ok(await call(owner.page,'/api/state')).incidents.find(i=>i.id===incident58.id).state,'declared')
 await owner.page.getByRole('region',{name:'Manual obligations and responder requests'}).getByText('Primary acknowledgment: Unacknowledged',{exact:true}).waitFor()
 await owner.page.getByText(/^Earlier manual-page acknowledgment:/).waitFor()
 await owner.page.getByRole('button',{name:'Close',exact:true}).click()
 await owner.page.getByText('Deadline scheduler',{exact:true}).waitFor()
 for(const width of [1440])await statusCapture(owner.page,'oc058-expired-triggered',width)
 console.log('OC-058 browser: timeout setting, snooze duration, persisted snoozed state and scheduled expiry back to triggered at 1440; paging OFF')


 // Signed out, anonymous and revoked sessions see no workspace.
 await rosa.page.setViewportSize({width:1440,height:1000});await rosa.page.goto(worker.origin+'/incidents')
 await rosa.page.locator('.shell-rail .owner-button').click();await rosa.page.getByRole('menuitem',{name:'Sign out',exact:true}).click();await rosa.page.waitForURL(u=>u.pathname.startsWith('/signin'))
 await denied(rosa.page,'signed-out member',declared.id)
 const anonymous=await open(1440);await denied(anonymous.page,'anonymous visitor',declared.id)
 const again=await open(1440);await passwordSignIn(again.page,responder);await openIncident(again.page,declared.id)
 await owner.page.goto(worker.origin+'/settings/team');await owner.page.reload()
 const card=owner.page.getByRole('article',{name:responder.name,exact:true});
 await card.getByRole('button',{name:'Member actions',exact:true}).click();await card.getByRole('button',{name:'Revoke access',exact:true}).click();
 await card.locator('.autosave-confirm').getByRole('button',{name:'Revoke access',exact:true}).click();
 await expect.poll(async()=>ok(await call(owner.page,'/api/state')).members.find(m=>m.id===rosaRecord.id).active).toBe(false);
 await denied(again.page,'revoked member session',declared.id)
 assert.equal((await again.context.request.post(worker.origin+'/api/login',{data:responder,headers:{origin:worker.origin}})).status(),401,'a revoked member cannot sign in again')
 await again.page.screenshot({path:`${captureDirectory}/member-coordination-revoked-1440.png`,fullPage:true})
 const after=ok(await call(owner.page,'/api/workspace')).state.incidents.find(i=>i.id===declared.id)
 assert.ok(after.timeline.some(e=>e.text===noteText&&e.actor===rosaMember.id),'revocation keeps the attributed history')
 assert.deepEqual(errors,[])
 console.log('OC-018 real hosted member coordination persists after reload: on the emitted production Worker a password member acknowledged and noted an incident, reloaded at 1440 and kept attribution; a viewer read it; signed-out, anonymous and revoked sessions got no workspace; paging refused (409)')
} finally {
 await browser?.close()
 await worker.close()
}

// Finish identity management with owner correction, sign-out and honest mail availability.
{
const {default:assert}=await import('node:assert/strict')
const {mkdir,readFile}=await import('node:fs/promises')
const {chromium}=await import('@playwright/test')
const {localWorker}=await import('./worker.mjs')

// The emitted Worker owns production email sign-in. Base's local dev wrapper
// deliberately replaces /signin with one-click owner entry in v2.
let worker=await localWorker()
const owner=worker.vars.OWNER_EMAIL
const {surfaces:{app:{signIn}}}=JSON.parse(await readFile('management/integration/deployment-spec.json','utf8'))
const openApp=email=>{
 const url=new URL(signIn.path,worker.origin)
 if(signIn.loginHint)url.searchParams.set('login_hint',email)
 return url.href
}
let browser
const captureDirectory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
await mkdir(captureDirectory,{recursive:true})
try {
 const claimed=await worker.request('/auth/bootstrap',{token:worker.vars.SETUP_TOKEN,displayName:'Oncall lead'},undefined,{'CF-Connecting-IP':'127.0.0.1'})
 assert.equal(claimed.status,303,JSON.stringify(claimed.value))
 browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 const context=await browser.newContext({viewport:{width:1440,height:1000},extraHTTPHeaders:{'CF-Connecting-IP':'127.0.0.1'}}),page=await context.newPage()
 await context.addCookies(claimed.headers.getSetCookie().map(line=>{
  const pair=line.split(';')[0],at=pair.indexOf('=')
  return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}
 }))
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 const initialState=await context.request.get(worker.origin+'/api/state')
 assert.equal(initialState.status(),200)
 const initialMember=(await initialState.json()).members.find(member=>member.role==='admin')
 assert.equal(initialMember.name,'Oncall lead','claim name becomes the owner member name')
 for(const width of [1440]) {
  await page.setViewportSize({width,height:1000})
  for(const [suffix,location] of [['','/app'],['?returnTo=%2Fapp%2Fincidents','/app/incidents'],['?returnTo=https%3A%2F%2Fexample.test','/app'],['?returnTo=%2F%252Fexample.test','/app']]) {
   const forward=await context.request.get(worker.origin+'/signin'+suffix,{maxRedirects:0})
   assert.equal(forward.status(),303,'signed-in owner forwards from /signin')
   assert.equal(forward.headers().location,location)
  }
  const auditBefore=new Set((await (await context.request.get(worker.origin+'/api/audit/export')).json()).rows.map(row=>row.id))
  const oldName=worker.sql("SELECT data FROM oc_members WHERE id='"+initialMember.id+"'")[0].data
  const corrected='synthetic-oncall-'+width
  const changed=await context.request.post(worker.origin+'/setup',{form:{displayName:corrected,confirm:'yes'},headers:{origin:worker.origin},maxRedirects:0})
  assert.equal(changed.status(),303)
  worker.sql("CREATE TRIGGER synthetic_owner_name_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='member.owner-name' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-owner-name-audit'); END")
  try {assert.equal((await context.request.get(worker.origin+'/api/state')).status(),503);assert.equal(worker.sql("SELECT data FROM oc_members WHERE id='"+initialMember.id+"'")[0].data,oldName,'audit failure rolls back the name and workspace mutation')} finally {worker.sql('DROP TRIGGER synthetic_owner_name_audit')}
  const state=await context.request.get(worker.origin+'/api/state')
  assert.equal((await state.json()).members.find(member=>member.id===initialMember.id).name,corrected,'later setup correction follows into the mapped member')
  const auditAfter=(await (await context.request.get(worker.origin+'/api/audit/export')).json()).rows.filter(row=>!auditBefore.has(row.id)&&row.kind==='member.owner-name'&&row.outcome==='accepted')
  assert.equal(auditAfter.length,1,'one attributed owner-name synchronization commits with its audit')
  assert.equal(auditAfter[0].workspaceAfter,auditAfter[0].workspaceBefore+1)
  await page.goto(worker.origin+'/app')
  await page.locator('.oncall-frame').waitFor()
  const phone=await page.getByRole('button',{name:'Menu',exact:true}).isVisible()
  if(phone)await page.getByRole('button',{name:'Menu',exact:true}).click()
  await page.locator(phone?'.shell-sheet .profile':'.shell-rail .profile').getByText(corrected,{exact:true}).waitFor()
  await page.screenshot({path:`${captureDirectory}/signin-owner-name-${width}.png`,fullPage:true})
 }
 await page.goto(worker.origin+'/setup')
 await page.waitForURL(worker.origin+'/on-call')
 await page.locator('.oncall-frame').waitFor({timeout:60000})
 await page.locator('.shell-rail .owner-button').press('Enter');await page.getByRole('menuitem',{name:'Sign out',exact:true}).click()
 await page.waitForURL(worker.origin+signIn.path)
 assert.equal((await context.request.get(worker.origin+'/api/state')).status(),401)
 for(const width of [1440]) {
  await page.setViewportSize({width,height:1000})
  await page.goto(openApp(owner))
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByLabel('Email',{exact:true}).count(),0,'unconfigured mail offers no unusable email form')
  await page.screenshot({path:`${captureDirectory}/signin-mail-unavailable-${width}.png`,fullPage:true})
 }
 const refused=await worker.request('/auth/magic-link',{email:owner},undefined,{'CF-Connecting-IP':'127.0.0.1'})
 assert.equal(refused.status,503)
 assert.equal(refused.value.error,'mail_unavailable')
 assert.equal((await context.request.get(worker.origin+'/api/state')).status(),401,'unavailable mail never authenticates anyone')
 await context.close()
 await worker.close()
 // Only public page reads: synthetic provider configuration makes the email
 // form available; no delivery request is submitted or sent to the network.
 worker=await localWorker({MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-example-mail-credential',MAIL_FROM:'auth@example.test'})
 const configured=await browser.newContext({viewport:{width:1440,height:1000}}),hintPage=await configured.newPage()
 hintPage.on('pageerror',error=>errors.push(error.message))
 let submitted=0
 hintPage.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/auth/magic-link')submitted++})
 for(const width of [1440]) {
  await hintPage.setViewportSize({width,height:1000})
  await hintPage.goto(openApp(owner))
  const email=hintPage.getByLabel('Email',{exact:true})
  assert.equal(await email.inputValue(),owner)
  await email.fill('relief.lead@example.test')
  assert.equal(await email.inputValue(),'relief.lead@example.test','a hint stays editable')
  await hintPage.goto(openApp(owner))
  assert.equal(await email.inputValue(),owner)
  assert.equal(submitted,0,'a hint never submits the form')
  await hintPage.screenshot({path:`${captureDirectory}/signin-login-hint-${width}.png`,fullPage:true})
 }
 for(const hint of ['','invalid<address>']) {
  await hintPage.goto(openApp(hint))
  assert.equal(await hintPage.getByLabel('Email',{exact:true}).inputValue(),'')
 }
 await configured.close()
 assert.deepEqual(errors,[])
 console.log('Production sign-in browser flow passed at 1440: configured editable hints without a send, unconfigured mail refusal, sign-out and denied access without a session')
} finally {
 await browser?.close()
 await worker.close()
}

}
