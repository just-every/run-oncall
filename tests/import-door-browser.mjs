import {openWorkspaceSection} from './keyboard.mjs'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'

const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
async function screenshot(page,name) {
 await mkdir(directory,{recursive:true})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow')
 await page.screenshot({path:`${directory}/business-${name}.png`,fullPage:true})
}
export async function settings(page,origin,state) {
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await page.goto(origin+'/auth/settings/identity')
  await page.getByRole('heading',{name:'Sign-in settings',exact:true}).waitFor()
  assert.equal(await page.getByRole('checkbox',{name:'Allow Business imports',exact:true}).isChecked(),state!=='off')
  if(state==='revoked')await page.getByText(/Revoked keys:/).waitFor()
  await screenshot(page,`settings-${state}-${width}`)
 }
}
export async function journal(page,origin,vendor,jobId,state) {
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await page.goto(origin)
  await openWorkspaceSection(page,'move-in')
  await page.getByLabel('Source',{exact:true}).selectOption(vendor)
  await page.getByLabel('Saved import journal',{exact:true}).selectOption(jobId)
  await page.getByText(/^approved via Business by /).waitFor()
  await page.getByRole('status').filter({hasText:'Import journal'}).getByText(new RegExp(state)).first().waitFor()
  await screenshot(page,`journal-${vendor}-${state}-${width}`)
 }
}
