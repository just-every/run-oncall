import {openWorkspaceSection} from './keyboard.mjs'
import assert from 'node:assert/strict'
import {mkdir,readFile} from 'node:fs/promises'

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
 for(const width of [1440]) {
  await page.setViewportSize({width,height:1000})
  await page.goto(origin)
  await openWorkspaceSection(page,'move-in')
  await page.getByLabel('Source',{exact:true}).selectOption(vendor)
  await page.getByLabel('Saved import journal',{exact:true}).or(page.getByRole('button',{name:'Open saved import',exact:true})).waitFor();if(await page.getByLabel('Saved import journal',{exact:true}).count())await page.getByLabel('Saved import journal',{exact:true}).selectOption(jobId);else await page.getByRole('button',{name:'Open saved import',exact:true}).click()
  await page.getByText(/^approved via Business by /).waitFor()
  await page.getByRole('status').filter({hasText:'Import journal'}).getByText(new RegExp(state)).first().waitFor()
  await screenshot(page,`journal-${vendor}-${state}-${width}`)
 }
}

// The file choice itself starts preview; there is no separate preview action.
export async function fileSource(page,vendor) {
 await page.goto(new URL('/move-in',page.url()).href)
 await page.getByLabel('Source',{exact:true}).selectOption('file')
 await page.getByLabel('File source',{exact:true}).selectOption(vendor)
}
export async function confirmImport(page) {
 await page.getByRole('button',{name:'Import paused',exact:true}).click()
 await page.getByRole('button',{name:'Confirm paused import',exact:true}).click()
 await page.getByRole('heading',{name:'Import journal',exact:true}).waitFor()
}
export async function confirmUndo(page) {
 await page.getByRole('button',{name:'Undo this import',exact:true}).click()
 await page.getByRole('button',{name:'Confirm undo',exact:true}).click()
}

// O11: one file choice, one review, one paused-import confirmation, one undo confirmation.
export async function fileJourney(page,context,origin) {
 await page.setViewportSize({width:1440,height:900})
 const objects=async()=>{const response=await context.request.get(origin+'/api/move-in/objects');assert.equal(response.status(),200);return response.json()}
 const before=await objects()
 await page.goto(origin+'/move-in')
 await fileSource(page,'opsgenie')
 await page.getByLabel('Export JSON',{exact:true}).setInputFiles({name:'opsgenie-file-journey.json',mimeType:'application/json',buffer:await readFile('tests/fixtures/opsgenie.json')})
 await page.getByRole('heading',{name:'2 · Review',exact:true}).waitFor()
 assert.deepEqual(await objects(),before,'file choice reaches the plan before any imported object exists')
 await page.getByRole('button',{name:'Import paused',exact:true}).click()
 await page.getByRole('heading',{name:'3 · Import paused',exact:true}).waitFor()
 assert.deepEqual(await objects(),before,'the confirmation still writes no imported object')
 await page.getByRole('button',{name:'Confirm paused import',exact:true}).click()
 await page.getByRole('heading',{name:'Import complete',exact:true}).waitFor()
 const applied=await objects();assert.ok(applied.length>before.length);assert.ok(applied.every(row=>row.value.paused===true))
 await confirmUndo(page)
 await page.getByRole('status').filter({hasText:'Import journal'}).getByText(/undone/).first().waitFor()
 assert.deepEqual(await objects(),before,'undo removes the unchanged paused import')
 console.log(`O11 file journey 1440: imported objects before=${before.length}, review=${before.length}, confirmation=${before.length}, applied=${applied.length}, undo=${before.length}`)
}
