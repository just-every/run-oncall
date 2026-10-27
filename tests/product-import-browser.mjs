import {fileSource,confirmImport,confirmUndo,fileJourney} from './import-door-browser.mjs'
import {openWorkspaceSection} from './keyboard.mjs'
import AxeBuilder from '@axe-core/playwright'
import assert from 'node:assert/strict'
import {providerExport} from './provider-export-browser.mjs'

export async function productImport(page,context,width,session) {
  if(width!==1440)return
  const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
  await openWorkspaceSection(page,'move-in')
  await fileJourney(page,context,new URL(page.url()).origin)
  await providerExport(page,context,width)
  // OC-038 source-specific file guidance and a new-source review at both viewports.
  for(const vendor of ['splunk','jsm','betterstack']) {
   await fileSource(page,vendor)
   await page.locator('.move-in-fallback > summary').click()
   const help=page.locator('.move-in-export-help');await help.locator('summary').click()
   await help.getByText(/Format assumptions are unverified/).waitFor()
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   await page.screenshot({path:`${directory}/saved-${vendor}-${width}.png`,fullPage:true})
  }
  await fileSource(page,'jsm')
  await page.getByLabel('Export JSON').setInputFiles('tests/fixtures/synthetic-oncall-jsm.json')
  await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  await page.getByText(/Inactive API integration/).waitFor()
  assert.ok(await page.getByText(/Synthetic repeat rule/).count())
  assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()
  assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[])
  await page.screenshot({path:`${directory}/jsm-review-${width}.png`,fullPage:true})
  await confirmImport(page)
  await confirmUndo(page);await page.locator('[role="status"] p').filter({hasText:/undone/}).waitFor()
  await fileSource(page,'opsgenie')
  const bundle={users:[],schedules:[],overrides:[],escalations:[],timelines:[]}
  await page.getByLabel('Export JSON').setInputFiles('tests/fixtures/opsgenie.json');await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  assert.ok(await page.getByText(/Eight-hour shift/).count()>0)
  await page.screenshot({path:`${directory}/import-review-${width}.png`,fullPage:true})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'import viewport has no horizontal overflow')
  if(width===1440){await confirmImport(page);await confirmUndo(page);await page.locator('[role="status"] p').filter({hasText:/undone/}).waitFor()}
  // Follow the bundle instructions through paused import, explicit adoption, native coverage and erasure.
  const email=`erase-${width}@example.test`,rota=`Move-in rota ${width}`,personId='erase-'+width
  bundle.users.push({data:[{id:personId,username:email,fullName:'Erase '+width}]})
  bundle.schedules.push({data:{id:'move-in-'+width,name:rota,timezone:'UTC',rotations:[{name:'Weekly',startDate:'2026-10-12T09:00:00Z',type:'weekly',length:1,participants:[{type:'user',id:personId}]}]}})
  await page.getByLabel('Export JSON').setInputFiles({name:'opsgenie-export.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))})
  await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  await confirmImport(page)
  const imported=page.getByRole('listitem').filter({hasText:rota}).last()
  await imported.getByRole('button',{name:'Make schedule live',exact:true}).click()
  await imported.getByLabel('Service for '+rota,{exact:true}).selectOption({label:'Checkout'})
  await imported.getByLabel('Workspace member for Erase '+width,{exact:false}).selectOption(session.member.id)
  await imported.getByRole('button',{name:'Confirm live schedule · paging OFF',exact:true}).click()
  await page.getByRole('listitem').filter({hasText:rota}).getByRole('link',{name:'Schedules',exact:true}).click()
  const adoptedOption=page.getByLabel('Schedule',{exact:true}).locator('option').filter({hasText:rota});await adoptedOption.waitFor({state:'attached'})
  await page.getByLabel('Schedule',{exact:true}).selectOption(await adoptedOption.getAttribute('value'))
  assert.equal(await page.getByLabel('Schedule name',{exact:true}).inputValue(),rota,'adopted coverage opens as a native schedule')
  assert.equal(await page.getByLabel('Primary responder 1',{exact:true}).inputValue(),session.member.id,'explicit person mapping survives adoption')
  await openWorkspaceSection(page,'move-in')
  const person=page.getByRole('listitem').filter({hasText:`Erase ${width}`})
  await person.getByRole('button',{name:'Erase person',exact:true}).click()
  const typed=page.getByLabel(`Type "erase ${email}" to erase this person from imported data`);assert.equal(await person.getByRole('button',{name:'Erase permanently',exact:true}).isDisabled(),true,'erasing needs the typed confirmation')
  await typed.fill('erase '+email)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'erase control has no horizontal overflow')
  await page.screenshot({path:`${directory}/erase-person-${width}.png`,fullPage:true})
  await person.getByRole('button',{name:'Erase permanently',exact:true}).click()
  await page.getByText(/^Erased\. Receipt /).waitFor();assert.equal(await person.count(),0,'the erased person leaves the paused data list')
  await incumbentActivation(page,context,width)
}

async function incumbentActivation(page,context,width) {
 const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
 const foreign='synthetic-oncall-browser-key-'+width,objects=await (await context.request.get('/api/move-in/objects')).json()
 if(!objects.some(row=>row.targetId==='splunk:'+foreign)) {
  await fileSource(page,'splunk')
  const bundle={integrations:[1440,390].map(size=>({id:'synthetic-oncall-browser-key-'+size,type:'REST',name:'Synthetic browser integration '+size}))}
  await page.getByLabel('Export JSON').setInputFiles({name:'synthetic-oncall-keys.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))})
  await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  await confirmImport(page)
 }
 const panel=page.getByRole('region',{name:'Activate imported integration Synthetic browser integration '+width,exact:true}),key='synthetic-oncall-incumbent-browser-'+width
 await panel.waitFor();await panel.getByLabel('Incumbent integration key',{exact:true}).fill(key)
 await panel.getByRole('button',{name:'Supply incumbent key · leave inactive',exact:true}).click()
 await panel.getByText(/Incumbent key supplied; never shown again/).waitFor()
 assert.equal(await panel.getByLabel('Incumbent integration key',{exact:true}).inputValue(),'')
 assert.ok(!(await page.content()).includes(key),'incumbent key does not reappear in the document')
 await panel.screenshot({path:`${directory}/incumbent-inactive-${width}.png`})
 await panel.getByRole('button',{name:'Activate integration',exact:true}).click()
 await panel.getByRole('button',{name:'Confirm activation',exact:true}).click()
 await panel.getByRole('button',{name:'I saved the Oncall key',exact:true}).click()
 await panel.getByText(/Active compatible intake/).waitFor()
 assert.equal(await panel.locator('output').count(),0,'one-time Oncall key disappears after acknowledgement')
 assert.ok(!(await page.content()).includes(key));assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0)
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[])
 await panel.screenshot({path:`${directory}/incumbent-active-${width}.png`})
 await panel.getByRole('button',{name:'Revoke imported integration keys',exact:true}).click();await panel.getByRole('button',{name:'Confirm revoke',exact:true}).click();await panel.getByText(/Incumbent key: not supplied/).waitFor()
 console.log(`OC-055 browser ${width}: one-time password field, inactive supply, explicit activation, one-time native key dismissal, revoke, no incumbent echo, overflow, axe and hydration passed`)
}

// Focused execution reuses this registered product journey; no additional suite.
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]) {
 const {localWorker}=await import('./worker.mjs'),{chromium}=await import('@playwright/test'),{mkdir}=await import('node:fs/promises')
 const worker=await localWorker();let browser
 try {
  await mkdir('evidence/browser',{recursive:true});await mkdir('.rer/local',{recursive:true})
  const owner=await worker.request('/api/setup',{name:'synthetic-oncall-1',password:'synthetic-oncall-browser-password'});assert.equal(owner.status,200)
  assert.equal((await worker.request('/api/command',{type:'service',id:'synthetic-oncall-1',name:'Checkout',environment:'production',owner:owner.value.member.id,runbook:[],pager:''},owner.cookie)).status,200)
  browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  const context=await browser.newContext({baseURL:worker.origin}),page=await context.newPage(),errors=[]
  await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}}))
  page.on('pageerror',error=>errors.push(error.message));await page.goto(worker.origin);await page.locator('.oncall-frame').waitFor()
  for(const width of [1440]){await page.setViewportSize({width,height:1000});await productImport(page,context,width,owner.value);console.log(`OC-038 browser ${width}: source guidance, inactive integration review, named refusal, apply/undo, overflow, axe and hydration passed`)}
  assert.deepEqual(errors,[])
  const login={name:'synthetic-oncall-1',password:'synthetic-oncall-browser-password'},revoked=await worker.request('/api/login',login)
  assert.equal((await worker.request('/api/logout',{},revoked.cookie)).status,200)
  const expired=await worker.request('/api/login',login);worker.sql('UPDATE sessions SET expires=0')
  for(const cookie of [revoked.cookie,expired.cookie])for(const [path,input] of [['/api/intake/incumbent',{}],['/api/intake/sources/import-synthetic-oncall-browser-key-390/incumbent',undefined],['/api/intake/sources/import-synthetic-oncall-browser-key-390/activate-incumbent',{}]])assert.equal((await worker.request(path,input,cookie)).status,401)
  console.log('OC-055 new custody doors: revoked and expired sessions refused')
 }finally{await browser?.close();await worker.close()}
}
