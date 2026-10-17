import assert from 'node:assert/strict'
import {keyboardUser} from './keyboard.mjs'

export async function productSchedule(page,context,width,session) {
 const key=keyboardUser(page)
  await key.activate(page.getByRole('link',{name:'Schedules',exact:true}));await key.activate(page.getByRole('button',{name:'New schedule',exact:true}),'Space')
  await key.text(page.getByLabel('Schedule ID',{exact:true}),'browser-'+width);await key.text(page.getByLabel('Schedule name',{exact:true}),'Checkout rota '+width)
  await key.activate(page.getByRole('button',{name:'Add primary responder',exact:false}));await key.option(page.getByLabel('Primary responder 1',{exact:true}),session.member.id)
  await key.focusScreenshot(page.getByRole('button',{name:'Save schedule',exact:true}),`evidence/browser/keyboard-schedule-${width}.png`)
  await page.keyboard.press('Enter');await page.getByText('Schedule saved',{exact:true}).waitFor()
  await key.activate(page.getByRole('button',{name:'Add interval',exact:false}),'Space');await key.option(page.getByLabel('Override 1 responder',{exact:true}),session.member.id)
  await key.focusScreenshot(page.getByRole('button',{name:'Save schedule',exact:true}),`evidence/browser/keyboard-override-${width}.png`)
  await page.keyboard.press('Enter');await page.getByText('Schedule saved',{exact:true}).waitFor()
  await key.focusScreenshot(page.getByRole('button',{name:'Preview coverage',exact:true}),`evidence/browser/keyboard-preview-${width}.png`)
  await page.keyboard.press('Enter');await page.getByText('Saved schedule preview evaluated; no delivery or timer was created',{exact:true}).waitFor()
  const feed=page.getByRole('link',{name:/private ICS feed/});await feed.waitFor()
  const calendar=await context.request.get(await feed.getAttribute('href'));assert.equal(calendar.status(),200)
  const times=(await calendar.text()).split('\r\n').filter(line=>/^DT(STAMP|START|END):/.test(line))
  assert.ok(times.length>0);assert.ok(times.every(line=>/^DT(STAMP|START|END):[0-9]{8}T[0-9]{6}Z$/.test(line)),'default ICS feed uses whole-second UTC times')
  await page.screenshot({path:`evidence/browser/schedules-${width}.png`,fullPage:true})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'schedule viewport has no horizontal overflow')
}
