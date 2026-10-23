import AxeBuilder from '@axe-core/playwright'
import assert from 'node:assert/strict'
import {providerExport} from './provider-export-browser.mjs'

export async function productImport(page,context,width,session) {
  await page.getByRole('link',{name:'Move-in kit',exact:true}).click()
  await providerExport(page,context,width)
  // OC-038 source-specific file guidance and a new-source review at both viewports.
  for(const vendor of ['splunk','jsm','betterstack']) {
   await page.getByLabel('Source',{exact:true}).selectOption(vendor)
   const help=page.locator('.move-in-export-help');await help.locator('summary').click()
   await help.getByText(/Format assumptions are unverified/).waitFor()
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   await page.screenshot({path:`evidence/browser/saved-${vendor}-${width}.png`,fullPage:true})
  }
  await page.getByLabel('Source',{exact:true}).selectOption('jsm')
  await page.getByLabel('Export JSON').setInputFiles('tests/fixtures/synthetic-oncall-jsm.json')
  await page.getByRole('button',{name:'Preview import',exact:true}).click();await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  await page.getByText(/Inactive API integration/).waitFor()
  assert.ok(await page.getByText(/Synthetic repeat rule/).count())
  assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()
  assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[])
  await page.screenshot({path:`evidence/browser/jsm-review-${width}.png`,fullPage:true})
  await page.getByRole('button',{name:'Confirm paused import',exact:true}).click();await page.getByRole('heading',{name:'Import journal'}).waitFor()
  await page.getByRole('button',{name:'Undo this import',exact:true}).click();await page.locator('[role="status"] p').filter({hasText:/undone/}).waitFor()
  await page.getByLabel('Source',{exact:true}).selectOption('opsgenie')
  const bundle={users:[],schedules:[],overrides:[],escalations:[],timelines:[]}
  await page.getByLabel('Export JSON').setInputFiles('tests/fixtures/opsgenie.json');await page.getByRole('button',{name:'Preview import',exact:true}).click();await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  assert.ok(await page.getByText(/Eight-hour shift/).count()>0)
  await page.screenshot({path:`evidence/browser/import-review-${width}.png`,fullPage:true})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'import viewport has no horizontal overflow')
  if(width===1440){await page.getByRole('button',{name:'Confirm paused import',exact:true}).click();await page.getByRole('heading',{name:'Import journal'}).waitFor();await page.getByRole('button',{name:'Undo this import',exact:true}).click();await page.locator('[role="status"] p').filter({hasText:/undone/}).waitFor()}
  // Follow the bundle instructions through paused import, explicit adoption, native coverage and erasure.
  const email=`erase-${width}@example.test`,rota=`Move-in rota ${width}`,personId='erase-'+width
  bundle.users.push({data:[{id:personId,username:email,fullName:'Erase '+width}]})
  bundle.schedules.push({data:{id:'move-in-'+width,name:rota,timezone:'UTC',rotations:[{name:'Weekly',startDate:'2026-10-12T09:00:00Z',type:'weekly',length:1,participants:[{type:'user',id:personId}]}]}})
  await page.getByLabel('Export JSON').setInputFiles({name:'opsgenie-export.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))})
  await page.getByRole('button',{name:'Preview import',exact:true}).click();await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  await page.getByRole('button',{name:'Confirm paused import',exact:true}).click();await page.getByRole('heading',{name:'Import journal'}).waitFor()
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
  await page.getByRole('link',{name:'Move-in kit',exact:true}).click()
  const person=page.getByRole('listitem').filter({hasText:`user: Erase ${width}`})
  await person.getByRole('button',{name:'Erase person',exact:true}).click()
  const typed=page.getByLabel(`Type "erase ${email}" to erase this person from imported data`);assert.equal(await person.getByRole('button',{name:'Erase permanently',exact:true}).isDisabled(),true,'erasing needs the typed confirmation')
  await typed.fill('erase '+email)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'erase control has no horizontal overflow')
  await page.screenshot({path:`evidence/browser/erase-person-${width}.png`,fullPage:true})
  await person.getByRole('button',{name:'Erase permanently',exact:true}).click()
  await page.getByText(/^Erased\. Receipt /).waitFor();assert.equal(await person.count(),0,'the erased person leaves the paused data list')
}

// Focused execution reuses this registered product journey; no additional suite.
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]) {
 const {localWorker}=await import('./worker.mjs'),{chromium}=await import('@playwright/test'),{mkdir}=await import('node:fs/promises')
 const worker=await localWorker();let browser
 try {
  await mkdir('evidence/browser',{recursive:true});await mkdir('.rer/local',{recursive:true})
  const owner=await worker.request('/api/setup',{name:'synthetic-oncall-1',password:'synthetic-oncall-browser-password'});assert.equal(owner.status,200)
  assert.equal((await worker.request('/api/command',{type:'service',id:'synthetic-oncall-1',name:'Checkout',environment:'production',owner:owner.value.member.id,runbook:[],pager:''},owner.cookie)).status,200)
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const context=await browser.newContext({baseURL:worker.origin}),page=await context.newPage(),errors=[]
  await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}}))
  page.on('pageerror',error=>errors.push(error.message));await page.goto(worker.origin);await page.getByRole('link',{name:'Move-in kit',exact:true}).waitFor()
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await productImport(page,context,width,owner.value);console.log(`OC-038 browser ${width}: source guidance, inactive integration review, named refusal, apply/undo, overflow, axe and hydration passed`)}
  assert.deepEqual(errors,[])
 }finally{await browser?.close();await worker.close()}
}
