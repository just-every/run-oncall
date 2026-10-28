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
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await page.goto(origin)
  await openWorkspaceSection(page,'move-in')
  await page.getByLabel('Source',{exact:true}).selectOption(vendor)
  await page.getByLabel('Saved import journal',{exact:true}).or(page.getByRole('button',{name:'Open saved import',exact:true})).waitFor();if(await page.getByLabel('Saved import journal',{exact:true}).count())await page.getByLabel('Saved import journal',{exact:true}).selectOption(jobId);else await page.getByRole('button',{name:'Open saved import',exact:true}).click()
  await page.getByText('Approval details',{exact:true}).click()
  await page.getByText(/^approved via Business by /).waitFor()
  await page.getByRole('status').filter({hasText:'Import journal'}).getByText(new RegExp(state)).first().waitFor()
  await screenshot(page,`journal-${vendor}-${state}-${width}`)
  console.log(`O11 import journal ${vendor} ${width}: Business approval, ${state} state and responsive journal passed`)
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
export async function fileJourney(page,context,origin,{readProvider=false}={}) {
 // Keep the caller's viewport: this journey runs in both product layouts.
 const width=page.viewportSize().width
 const objects=async()=>{const response=await context.request.get(origin+'/api/move-in/objects');assert.equal(response.status(),200);return response.json()}
 const before=await objects()
 await page.goto(origin+'/move-in')
 if(readProvider){const key='synthetic-provider-read-private';await page.getByRole('button',{name:'Use a read-only key instead',exact:true}).click();await page.getByLabel('Read-only key',{exact:true}).fill(key);const [read,plan]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/move-in/read'),page.waitForResponse(response=>new URL(response.url()).pathname==='/api/operator/import/plan'),page.getByRole('button',{name:'Read schedules',exact:true}).click()]);assert.equal(read.status(),200);assert.ok(!(await read.text()).includes(key));await page.getByRole('heading',{name:'2 · Review',exact:true}).waitFor();assert.deepEqual(await objects(),before);assert.ok(!(await page.content()).includes(key));for(const endpoint of ['/api/archive','/api/audit/export'])assert.ok(!(await (await context.request.get(origin+endpoint)).text()).includes(key));const planned=await plan.json();const cancelled=await context.request.post(origin+'/api/operator/import/undo',{headers:{origin,'X-Import-Source':'pagerduty'},data:{planId:planned.planId}});assert.equal(cancelled.status(),200);console.log(`O11 key read ${width}: read schedules reached Review, imported objects unchanged, key absent from document, read response, archive and audit`)}
 await fileSource(page,'opsgenie')
 await page.getByLabel('Export JSON',{exact:true}).setInputFiles({name:'opsgenie-file-journey.json',mimeType:'application/json',buffer:await readFile('tests/fixtures/opsgenie.json')})
 await page.getByRole('heading',{name:'2 · Review',exact:true}).waitFor()
 assert.deepEqual(await objects(),before,'file choice reaches the plan before any imported object exists')
 await page.getByRole('button',{name:'Import paused',exact:true}).click()
 await page.getByRole('heading',{name:'3 · Import paused',exact:true}).waitFor()
 assert.deepEqual(await objects(),before,'the confirmation still writes no imported object')
 const [reconciled]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/operator/import/reconcile'),page.getByRole('button',{name:'Confirm paused import',exact:true}).click()])
 await page.getByRole('heading',{name:'Import complete',exact:true}).waitFor()
 if(width===1440) {
  const report=await reconciled.json();assert.equal(reconciled.status(),200);assert.equal(report.ok,true)
  await page.getByText(/^Matched\./).waitFor()
  assert.equal(report.counts.nativeTargets,(await objects()).length-before.length)
  for(const size of [1440,390]){await page.setViewportSize({width:size,height:1000});await screenshot(page,`reconcile-matched-${size}`)}
  await page.setViewportSize({width,height:1000})
 }
 const applied=await objects();assert.ok(applied.length>before.length);assert.ok(applied.every(row=>row.value.paused===true))
 await confirmUndo(page)
 await page.getByRole('status').filter({hasText:'Import journal'}).getByText(/undone/).first().waitFor()
 assert.deepEqual(await objects(),before,'undo removes the unchanged paused import')
 console.log(`O11 file journey ${width}: imported objects before=${before.length}, review=${before.length}, confirmation=${before.length}, applied=${applied.length}, undo=${before.length}`)
}

// O1 extends the registered Move-in journey. Only the browser transport is
// interrupted; every import, native edit and comparison runs on the built Worker.
export async function reconciliationJourney(page,context,session) {
 const viewport=page.viewportSize(),origin=new URL(page.url()).origin
 await page.setViewportSize({width:1440,height:1000})
 const request=async(path,data)=>{
  const response=data===undefined?await context.request.get(path):await context.request.post(path,{headers:{origin},data})
  assert.ok(response.ok(),`${path}: ${response.status()}`);return response.json()
 }
 const people=Array.from({length:24},(_,index)=>({id:`synthetic-reconcile-person-${index}`,username:`reconcile-${index}@example.test`,fullName:`Support responder ${index+1}`}))
 const scheduleId='synthetic-reconcile-rota-1',bundle={users:{data:people},schedules:{data:[{id:scheduleId,name:'Support weekly handoff',timezone:'UTC',rotations:[{name:'Weekly',startDate:'2026-10-12T09:00:00Z',type:'weekly',length:1,participants:[{type:'user',id:people[0].id}]}]}]},overrides:[],escalations:[],timelines:[]}
 await fileSource(page,'opsgenie')
 await page.getByLabel('Export JSON',{exact:true}).setInputFiles({name:'synthetic-reconcile-export.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))})
 await page.getByRole('heading',{name:'Compatibility review',exact:true}).waitFor()
 let interrupted
 const apply='**/api/operator/import/apply',drop=async route=>{
  const response=await route.fetch();assert.equal(response.status(),200)
  interrupted=(await response.json()).job
  assert.ok(['queued','applying'].includes(interrupted.state),'the real bounded apply still has work to resume')
  await route.abort('connectionreset')
 }
 await page.route(apply,drop,{times:1})
 await page.getByRole('button',{name:'Import paused',exact:true}).click()
 await page.getByRole('button',{name:'Confirm paused import',exact:true}).click()
 await page.getByRole('alert').waitFor()
 assert.ok(interrupted);assert.equal(await page.getByRole('heading',{name:'Import complete',exact:true}).count(),0)
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await screenshot(page,`reconcile-interrupted-${width}`)}
 await page.setViewportSize({width:1440,height:1000})
 await fileSource(page,'opsgenie')
 const saved=page.getByLabel('Saved import journal',{exact:true})
 await saved.selectOption(interrupted.id)
 await page.getByRole('button',{name:'Resume import',exact:true}).waitFor()
 const reconcile='**/api/operator/import/reconcile'
 let edited
 await page.route(reconcile,async route=>{
  // Adoption is an ordinary native edit after the final apply, before reconcile.
  const rows=await request('/api/move-in/objects'),row=rows.find(row=>row.targetKind==='schedule'&&row.value.sourceId===scheduleId)
  assert.ok(row,'the applied schedule exists in native storage')
  const choices=await request('/api/move-in/adoption')
  edited=await request('/api/move-in/adopt',{id:row.targetId,revision:row.revision,service:choices.services[0].id,members:{[people[0].username]:session.member.id},confirm:true})
  await route.continue()
 },{times:1})
 const [compared]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/operator/import/reconcile'),page.getByRole('button',{name:'Resume import',exact:true}).click()])
 const report=await compared.json();assert.equal(compared.status(),200);assert.equal(report.ok,false)
 const difference=report.sourceIds.find(row=>row.kind==='schedules'&&row.sourceId===scheduleId)
 assert.equal(difference.status,'mismatched');assert.ok(difference.conflicts.length)
 const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Import differences',exact:true})}).last()
 await panel.waitFor();assert.ok((await panel.innerText()).includes(scheduleId));assert.ok((await panel.innerText()).includes(difference.conflicts[0]))
 assert.equal(edited.paging,'OFF');assert.equal(await page.getByRole('heading',{name:'Import complete',exact:true}).count(),0)
 const native=await request('/api/paging/state');assert.ok(native.schedules.some(row=>row.id===edited.schedule.id))
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await screenshot(page,`reconcile-differences-${width}`)}
 await page.setViewportSize({width:1440,height:1000})
 // A failed comparison clears the previous result and leaves a recoverable check.
 await page.route(reconcile,route=>route.abort('connectionreset'),{times:1})
 await page.getByRole('button',{name:'Check imported data',exact:true}).click()
 await page.getByRole('heading',{name:'Import needs checking',exact:true}).waitFor();await page.getByRole('alert').waitFor()
 assert.equal(await page.getByRole('heading',{name:'Import complete',exact:true}).count(),0)
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await screenshot(page,`reconcile-unavailable-${width}`)}
 await page.setViewportSize({width:1440,height:1000})
 await page.getByRole('button',{name:'Check imported data',exact:true}).click();await page.getByRole('heading',{name:'Import differences',exact:true}).waitFor()
 assert.ok((await panel.innerText()).includes(difference.conflicts[0]),'retry still reports the real native difference')
 await page.setViewportSize(viewport)
 console.log(`O1 Move-in: clean apply matched; bounded apply interrupted and resumed; adopted native ${scheduleId} remains a named difference; comparison failure/retry never claims completion; paging OFF`)
}
