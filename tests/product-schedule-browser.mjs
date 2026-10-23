import AxeBuilder from '@axe-core/playwright'
import assert from 'node:assert/strict'
import {keyboardUser} from './keyboard.mjs'

export async function productSchedule(page,context,width,session) {
 const key=keyboardUser(page)
  await key.activate(page.getByRole('link',{name:'Schedules',exact:true}));await key.activate(page.getByRole('button',{name:'New schedule',exact:true}),'Space')
  await key.text(page.getByLabel('Schedule ID',{exact:true}),'browser-'+width);await key.text(page.getByLabel('Schedule name',{exact:true}),'Checkout rota '+width)
  await key.text(page.getByLabel('Timezone (IANA)',{exact:true}),'America/New_York')
  await key.activate(page.getByRole('button',{name:'Add primary responder',exact:false}));await key.option(page.getByLabel('Primary responder 1',{exact:true}),session.member.id)
  await key.focusScreenshot(page.getByRole('button',{name:'Save schedule',exact:true}),`evidence/browser/keyboard-schedule-${width}.png`)
  await page.keyboard.press('Enter');await page.getByText('Schedule saved',{exact:true}).waitFor()
  await key.activate(page.getByRole('button',{name:'Add interval',exact:false}),'Space');await key.option(page.getByLabel('Override 1 responder',{exact:true}),'')
  await page.getByLabel('Override 1 start (UTC)',{exact:true}).fill('2026-10-26T09:00')
  await page.getByLabel('Override 1 end (UTC)',{exact:true}).fill('2026-10-26T12:00')
  await key.text(page.getByLabel('Timezone (IANA)',{exact:true}),'Europe/London')
  await page.getByLabel('Preview from (UTC)',{exact:true}).fill('2026-10-24T00:00')
  await page.getByLabel('Preview to (UTC)',{exact:true}).fill('2026-11-09T00:00')
  await key.focusScreenshot(page.getByRole('button',{name:'Save schedule',exact:true}),`evidence/browser/keyboard-override-${width}.png`)
  await page.keyboard.press('Enter');await page.getByText('Schedule change ready for review; nothing saved',{exact:true}).waitFor()
  await page.getByRole('region',{name:'Review schedule changes',exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'Apply reviewed change',exact:true}).isDisabled(),true)
  await page.getByText('New coverage gap',{exact:true}).waitFor()
  assert.ok(await page.getByText(/DST \/ clock change: Europe\/London/).count())
  assert.ok(await page.getByText(/DST \/ clock change: America\/New_York/).count())
  assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'review has no horizontal overflow')
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()
  assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[])
  const remove=page.getByRole('button',{name:'Remove primary responder 1',exact:true})
  await remove.focus();await page.getByRole('tooltip',{name:'Remove primary responder 1',exact:true}).waitFor()
  await key.activate(page.getByRole('checkbox',{name:'I reviewed these assignments and gaps'}),'Space')
  await page.getByText('New coverage gap',{exact:true}).scrollIntoViewIfNeeded()
  await page.getByRole('region',{name:'Review schedule changes',exact:true}).screenshot({path:`evidence/browser/schedule-review-panel-${width}.png`})
  await page.screenshot({path:`evidence/browser/schedule-review-${width}.png`,fullPage:true})
  await key.activate(page.getByRole('button',{name:'Apply reviewed change',exact:true}))
  await page.getByText('Schedule saved',{exact:true}).waitFor()
  await key.focusScreenshot(page.getByRole('button',{name:'Preview coverage',exact:true}),`evidence/browser/keyboard-preview-${width}.png`)
  await page.keyboard.press('Enter');await page.getByText('Saved schedule preview evaluated; no delivery or timer was created',{exact:true}).waitFor()
  const feed=page.getByRole('link',{name:/private ICS feed/});await feed.waitFor()
  const calendar=await context.request.get(await feed.getAttribute('href'));assert.equal(calendar.status(),200)
  const times=(await calendar.text()).split('\r\n').filter(line=>/^DT(STAMP|START|END):/.test(line))
  assert.ok(times.length>0);assert.ok(times.every(line=>/^DT(STAMP|START|END):[0-9]{8}T[0-9]{6}Z$/.test(line)),'default ICS feed uses whole-second UTC times')
  await page.screenshot({path:`evidence/browser/schedules-${width}.png`,fullPage:true})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'schedule viewport has no horizontal overflow')
}

// Focused execution of the existing journey; no additional suite registration.
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
 const {localWorker}=await import('./worker.mjs'),{chromium}=await import('@playwright/test'),{mkdir}=await import('node:fs/promises')
 const worker=await localWorker();let browser
 try {
  await mkdir('evidence/browser',{recursive:true})
  const owner=await worker.request('/api/setup',{name:'synthetic-oncall-1',password:'synthetic-oncall-browser-password'})
  assert.equal(owner.status,200)
  const service=await worker.request('/api/command',{type:'service',id:'synthetic-oncall-1',name:'Schedule review service',environment:'production',owner:owner.value.member.id,runbook:['Inspect coverage'],pager:''},owner.cookie)
  assert.equal(service.status,200)
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const context=await browser.newContext({baseURL:worker.origin}),page=await context.newPage(),errors=[]
  await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}}))
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(worker.origin);await page.getByRole('link',{name:'Schedules',exact:true}).waitFor()
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await productSchedule(page,context,width,owner.value);console.log(`OC-024 schedule review browser ${width}: new gap, DST, confirmation, saved coverage, ICS, tooltips, overflow, axe and hydration passed`)}
  assert.deepEqual(errors,[])
  // The focused browser run also checks the shared session middleware on both new doors.
  const credentials={name:'synthetic-oncall-1',password:'synthetic-oncall-browser-password'}
  const revoked=await worker.request('/api/login',credentials)
  assert.equal(revoked.status,200);assert.equal((await worker.request('/api/logout',{},revoked.cookie)).status,200)
  const expired=await worker.request('/api/login',credentials)
  assert.equal(expired.status,200)
  worker.sql('UPDATE sessions SET expires=0')
  for(const action of ['review','apply'])for(const cookie of [revoked.cookie,expired.cookie])assert.equal((await worker.request('/api/schedules/browser-390/'+action,{},cookie)).status,401)
  console.log('OC-024 reviewed schedule doors: revoked and expired sessions refused')
 }finally{await browser?.close();await worker.close()}
}
