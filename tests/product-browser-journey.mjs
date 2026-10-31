import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {isDeepStrictEqual} from 'node:util'
import {readFile,mkdir} from 'node:fs/promises'
import {selectRoutedSource,openIncidentAction,focusWorkspace,openWorkspaceSection,routingBrowser,openHistoryComparison,keyboardUser} from './keyboard.mjs'
import {randomBytes,randomUUID} from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'
import assert from 'node:assert/strict'
// product-import-browser: part of this public journey.
export async function productImport(page,context,width,session) {
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
  await confirmImport(page);await confirmUndo(page);await page.locator('[role="status"] p').filter({hasText:/undone/}).waitFor()
  // Follow the bundle instructions through paused import, explicit adoption, native coverage and erasure.
  const email=`erase-${width}@example.test`,rota=`Move-in rota ${width}`,personId='erase-'+width
  bundle.users.push({data:[{id:personId,username:email,fullName:'Erase '+width}]})
  bundle.schedules.push({data:{id:'move-in-'+width,name:rota,timezone:'UTC',rotations:[{name:'Weekly',startDate:'2026-10-12T09:00:00Z',type:'weekly',length:1,participants:[{type:'user',id:personId}]}]}})
  await page.getByLabel('Export JSON').setInputFiles({name:'opsgenie-export.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))})
  await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  await confirmImport(page)
  const imported=page.getByRole('listitem').filter({hasText:rota}).last()
  await imported.getByRole('button',{name:'Make schedule live',exact:true}).click()
  if(await imported.getByLabel('Service for '+rota,{exact:true}).count())await imported.getByLabel('Service for '+rota,{exact:true}).selectOption({label:'Checkout'})
  if(await imported.getByLabel('Workspace member for Erase '+width,{exact:false}).count())await imported.getByLabel('Workspace member for Erase '+width,{exact:false}).selectOption(session.member.id)
  await imported.getByRole('button',{name:'Confirm live schedule · paging OFF',exact:true}).click()
  await page.getByRole('listitem').filter({hasText:rota}).getByRole('link',{name:'On call',exact:true}).click()
  await page.waitForURL('**/on-call')
  const nativeResponse=await context.request.get('/api/paging/state');assert.equal(nativeResponse.status(),200)
  const nativeSchedule=(await nativeResponse.json()).schedules.find(schedule=>schedule.name===rota)
  assert.ok(nativeSchedule,'adopted coverage is retained as a native schedule')
  assert.equal(nativeSchedule.primary.members[0],session.member.id,'explicit person mapping survives adoption')
  assert.ok(nativeSchedule,'the reviewed import produces a native rota');assert.equal(nativeSchedule.primary.members[0],session.member.id,'explicit person mapping survives adoption')
  await page.goto(new URL('/on-call/'+encodeURIComponent(nativeSchedule.id)+'/edit',page.url()).href)
  assert.equal(await page.getByLabel('Rota name',{exact:true}).inputValue(),rota,'adopted coverage opens in the native editor')
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:'Who is on, in order',exact:true}).waitFor()
  const primary=page.getByRole('group',{name:'Primary person 1',exact:true}),choice=primary.locator('select')
  if(await choice.count())assert.equal(await choice.inputValue(),session.member.id);else assert.ok((await primary.innerText()).includes(session.member.name),'the one mapped responder is shown without an unnecessary picker')
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
  await reconciliationJourney(page,context,session)
}

async function incumbentActivation(page,context,width) {
 const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
 const foreign='synthetic-oncall-browser-key-'+width,objects=await (await context.request.get('/api/move-in/objects')).json()
 if(!objects.some(row=>row.targetId==='splunk:'+foreign)) {
  await fileSource(page,'splunk')
  const bundle={integrations:[1440].map(size=>({id:'synthetic-oncall-browser-key-'+size,type:'REST',name:'Synthetic browser integration '+size}))}
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


// provider-export-browser: part of this public journey.
// The browser's real download produces importable bundles; only the external provider HTTP edge is faked.
export async function providerExport(page,context,width) {
 const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
 await context.grantPermissions(['clipboard-read','clipboard-write'])
 // Follow the maintainer guide's real fragment to the served owner guide, then download its tool.
 const maintainer=await readFile('MOVE-IN.md','utf8')
 const reference=maintainer.match(/\]\((docs\/move-in\.md#[^)]+)\)/)
 assert.ok(reference,'the maintainer guide links to the export instructions')
 const guide=await context.newPage()
 await guide.goto(new URL('/'+reference[1].replace('.md#','#'),page.url()).href)
 const target=guide.locator(`[id="${new URL(guide.url()).hash.slice(1)}"]`)
 await target.waitFor({state:'visible'})
 const [documentedDownload]=await Promise.all([guide.waitForEvent('download'),guide.getByRole('link',{name:'Download oncall-export.mjs',exact:true}).click()])
 assert.equal(await documentedDownload.failure(),null,'the linked guide provides a working exporter download')
 await guide.screenshot({path:`${directory}/export-docs-${width}.png`,fullPage:true})
 await guide.close()
 for(const vendor of ['pagerduty','opsgenie']) {
  await fileSource(page,vendor)
  await page.locator('.move-in-fallback > summary').click()
  const help=page.locator('.move-in-export-help')
  await help.locator('summary').click()
  await help.getByRole('button',{name:/Copy .* export command/}).click()
  const copied=await page.evaluate(()=>navigator.clipboard.readText())
  assert.equal(copied,await help.locator('pre code').innerText(),'copy control supplies the displayed runnable command')
  const [download]=await Promise.all([page.waitForEvent('download'),help.getByRole('link',{name:'Download oncall-export.mjs',exact:true}).click()])
  const file=resolve('.rer/local',vendor+'-export.mjs')
  await download.saveAs(file)
  const {collectExport,exportWindow}=await import(pathToFileURL(file).href)
  const fixture=JSON.parse(await readFile(`tests/fixtures/${vendor}.json`,'utf8'))
  const ops=vendor==='opsgenie',users=ops?fixture.users.data:fixture.users
  const schedules=ops?fixture.schedules.data:fixture.schedules
  const calls=[],key='test-export-key-private'
  const request=async(url,options)=>{
   calls.push(url.href)
   assert.equal(options.method,'GET','export never writes to the provider')
   assert.equal(url.origin,ops?'https://api.opsgenie.com':'https://api.pagerduty.com','key only goes to the selected provider')
   assert.ok(options.headers.Authorization.endsWith(key))
   const path=url.pathname,offset=Number(url.searchParams.get('offset')??0)
   const list=(kind,items)=>ops?{data:items,...(kind==='users'&&offset===0?{paging:{next:`${url.origin}${path}?limit=1&offset=1`}}:{})}:{[kind]:items,limit:1,offset,more:kind==='users'&&offset===0}
   let body
   if(path.endsWith('/users')) body=list('users',[{...users[offset],...(offset===0?{apiKey:key}:{})}])
   else if(path.endsWith('/schedules')) body=list('schedules',schedules.map(({id})=>({id})))
   else if(path.endsWith('/overrides')) body=list('overrides',ops?fixture.overrides.data.filter(value=>path.includes(value.scheduleId)):[])
   else if(path.endsWith('/timeline')) {
    const id=decodeURIComponent(path.split('/').at(-2)),original=fixture.timelines.data
    body={data:{...original,_parent:{id},...(id===original._parent.id?{}:{finalTimeline:{rotations:[]}})}}
   } else if(path.includes('/schedules/')) {
    const schedule=schedules.find(value=>value.id===decodeURIComponent(path.split('/').at(-1)))
    body=ops?{data:schedule}:{schedule}
   } else if(path.endsWith('/escalations')) body=list('escalations',fixture.escalations.data)
   else if(path.endsWith('/escalation_policies')) body=list('escalation_policies',fixture.escalation_policies)
   else assert.fail('unexpected provider request')
   return new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}})
  }
  const result=await collectExport({vendor,region:'us',key,window:exportWindow('2026-03-07','2026-03-10'),request})
  assert.ok(calls.some(url=>url.includes('offset=1')),'exporter follows the second people page')
  assert.ok(!result.json.includes(key),'downloaded bundle excludes credentials')
  assert.equal(JSON.parse(result.json).users.length,users.length,'all pages survive assembly')
  const [preview]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/operator/import/plan'),page.getByLabel('Export JSON').setInputFiles({name:vendor+'-export.json',mimeType:'application/json',buffer:Buffer.from(result.json)})])
  assert.equal(preview.status(),200,'downloaded exporter output is accepted by the actual importer')
  assert.ok((await preview.json()).items.some(item=>item.kind==='schedules'&&!item.rejection&&item.effects.some(effect=>effect.targetKind==='schedule')),'a schedule survives provider export and real compatibility review')
  await page.getByRole('heading',{name:'Compatibility review'}).waitFor()
  await page.screenshot({path:`${directory}/export-help-${vendor}-${width}.png`,fullPage:true})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'export and review fit viewport')
 }
 console.log(`OC-038 provider exporter browser ${width}: guide download, copied command, provider pages, compatibility review and responsive layout passed`)
}


// import-door-browser: part of this public journey.
const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
async function screenshot(page,name) {
 await mkdir(directory,{recursive:true})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow')
 await page.screenshot({path:`${directory}/business-${name}.png`,fullPage:true})
}
export async function settings(page,origin,state) {
 for(const width of [1440]) {
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
  for(const size of [1440]){await page.setViewportSize({width:size,height:1000});await screenshot(page,`reconcile-matched-${size}`)}
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
 for(const width of [1440]){await page.setViewportSize({width,height:1000});await screenshot(page,`reconcile-interrupted-${width}`)}
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
 for(const width of [1440]){await page.setViewportSize({width,height:1000});await screenshot(page,`reconcile-differences-${width}`)}
 await page.setViewportSize({width:1440,height:1000})
 // A failed comparison clears the previous result and leaves a recoverable check.
 await page.route(reconcile,route=>route.abort('connectionreset'),{times:1})
 await page.getByRole('button',{name:'Check imported data',exact:true}).click()
 await page.getByRole('heading',{name:'Import needs checking',exact:true}).waitFor();await page.getByRole('alert').waitFor()
 assert.equal(await page.getByRole('heading',{name:'Import complete',exact:true}).count(),0)
 for(const width of [1440]){await page.setViewportSize({width,height:1000});await screenshot(page,`reconcile-unavailable-${width}`)}
 await page.setViewportSize({width:1440,height:1000})
 await page.getByRole('button',{name:'Check imported data',exact:true}).click();await page.getByRole('heading',{name:'Import differences',exact:true}).waitFor()
 assert.ok((await panel.innerText()).includes(difference.conflicts[0]),'retry still reports the real native difference')
 await page.setViewportSize(viewport)
 console.log(`O1 Move-in: clean apply matched; bounded apply interrupted and resumed; adopted native ${scheduleId} remains a named difference; comparison failure/retry never claims completion; paging OFF`)
}


// product-schedule-browser: part of this public journey.
// Extend this journey: pending valid answers retain coverage, but cannot be saved.
async function retainPreview(page, change, submit) {
 await page.waitForLoadState('networkidle');
 await page.waitForFunction(()=>document.querySelectorAll('.oc-preview li').length>0);
 const preview=page.locator('.oc-preview'),before=await preview.innerText();
 await preview.evaluate(element=>{
  const probe={minWeeks:element.querySelectorAll('li').length,minHeight:element.getBoundingClientRect().height};
  probe.weeks=probe.minWeeks;probe.height=probe.minHeight;
  let active=true;
  const sample=()=>{probe.minWeeks=Math.min(probe.minWeeks,element.querySelectorAll('li').length);probe.minHeight=Math.min(probe.minHeight,element.getBoundingClientRect().height);};
  const observer=new MutationObserver(sample);observer.observe(element,{childList:true,subtree:true});
  const frame=()=>{if(active){sample();requestAnimationFrame(frame);}};requestAnimationFrame(frame);
  window.stopRotaPreviewProbe=()=>{sample();active=false;observer.disconnect();return probe;};
 });
 let release,latest;const gate=new Promise(resolve=>{release=resolve;}),pending=[];
 const hold=route=>{latest=route.request();const task=(async()=>{const response=await route.fetch();await gate;await route.fulfill({response});})();pending.push(task);return task;};
 await page.route('**/api/paging/preview',hold);
 try{
  await change();await page.waitForTimeout(2000);
  assert.ok(latest,'the valid change requests a new preview');
  assert.equal(await preview.innerText(),before,'the last coverage stays visible for the entire delayed answer');
  const probe=await page.evaluate(()=>window.stopRotaPreviewProbe());
  assert.equal(probe.minWeeks,probe.weeks,'typing and valid changes never blank the weeks');
  assert.equal(probe.minHeight,probe.height,'the pending preview never collapses');
  if(submit)assert.equal(await submit.isDisabled(),true,'visible old weeks never authorize saving a new draft');
  const answered=page.waitForResponse(response=>response.request()===latest);release();const response=await answered;await response.finished();
  const windows=await response.json();
  await page.waitForFunction(times=>JSON.stringify([...document.querySelectorAll('.oc-preview time')].map(time=>time.dateTime))===JSON.stringify(times),windows.map(window=>new Date(window.at).toISOString()));
 }finally{release();await Promise.all(pending);await page.unroute('**/api/paging/preview',hold);await page.evaluate(()=>window.stopRotaPreviewProbe());}
}

async function invalidWindow(page) {
 const ends=page.getByLabel('Ends (optional)',{exact:true}),submit=page.locator('.oc-step-actions button[type=submit]'),starts=await ends.getAttribute('min');
 await ends.fill(new Date(Date.parse(starts+'T00:00:00Z')-86400000).toISOString().slice(0,10));
 await page.getByRole('alert').filter({hasText:'Choose an end after the rota starts.'}).waitFor();
 assert.equal(await ends.getAttribute('aria-invalid'),'true');
 assert.equal(await page.locator('.oc-preview li').count(),0,'an invalid window clears stale coverage');
 assert.equal(await submit.isDisabled(),true,'an invalid window clears readiness');
 await ends.fill('');await page.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]').disabled);
 assert.ok(await page.locator('.oc-preview li').count()>0,'fixing the window restores coverage');
}

async function accessibleState(page,name,width,focus) {
 const directory=process.env.ONCALL_BROWSER_EVIDENCE??'./evidence/browser';await mkdir(directory,{recursive:true})
 if(focus)await keyboardUser(page).focusScreenshot(focus,`${directory}/oc009-${name}-${width}.png`)
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} has no horizontal overflow`)
 const axe=await new AxeBuilder({page}).analyze()
 assert.deepEqual(axe.violations.filter(violation=>['serious','critical'].includes(violation.impact)),[],`${name} has no serious or critical axe findings`)
}

const keyboardInstant=Date.parse('2026-10-30T12:00:00.000Z')
export async function productSchedule(page,context,width,session,{ownerLink,selectedOnly=false,setTime=async()=>{}}={}) {
 await setTime(keyboardInstant);
 const now=keyboardInstant;
 const key=keyboardUser(page),origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true});
 const api=async(path,input)=>{const response=await (input===undefined?context.request.get(origin+path):context.request.post(origin+path,{headers:{origin},data:input}));assert.equal(response.status(),200);return response.json();};
 let state=await api('/api/state');
 let second=state.members.find(member=>member.active&&member.id!==session.member.id&&['admin','responder'].includes(member.role));
 if(!second){const response=await context.request.post(origin+'/api/members',{headers:{origin},data:{name:'Schedule colleague '+width,role:'responder',password:'synthetic-schedule-colleague-password'}});assert.equal(response.status(),201);second=await response.json();}
 const anchor=new Date(now-86400000).toISOString().slice(0,10)+'T09:00';
 // OC-020 / OC-011: both rota rows are visible together; a four-step weekly create agrees with its zero-write preview.
 const fixtures=[];
 for(const index of [0,1])fixtures.push(await api('/api/paging/schedules',{id:'rota-'+crypto.randomUUID().replaceAll('-','').slice(0,8),name:['Primary service rota','Secondary service rota'][index],service:state.services[index%state.services.length].id,revision:0,timezone:'UTC',validFrom:new Date(now-2*86400000).toISOString(),validUntil:null,primary:{anchorLocal:anchor,periodDays:7,members:[session.member.id,second.id],ambiguity:'earlier'},backup:{anchorLocal:anchor,periodDays:7,members:[second.id,session.member.id],ambiguity:'earlier'},overrides:[]}));
 await page.goto(origin+'/on-call');
 const onCall=await api('/api/on-call');
 for(const fixture of fixtures){const row=page.locator('[data-rota="'+fixture.id+'"]');await row.waitFor();const coverage=onCall.rotas.find(rota=>rota.id===fixture.id);assert.ok((await row.innerText()).includes(coverage.now.primary.name));assert.ok((await row.innerText()).includes(coverage.next.primary.name));assert.ok((await row.innerText()).includes(coverage.now.backup.name));}
 const auditBefore=await api('/api/audit/export'),previewBefore=await api('/api/paging/state'),workspaceBefore=await api('/api/state'),previews=[];
 const observe=async response=>{if(new URL(response.url()).pathname!=='/api/paging/preview'||response.request().method()!=='POST')return;const input=response.request().postDataJSON();if(input?.schedule&&response.ok())previews.push({input,windows:await response.json()});};
 page.on('response',observe);
 await key.activate(page.locator('.oc-page-head').getByRole('link',{name:'New rota',exact:true}));
 if(width===1440)await retainPreview(page,()=>page.getByLabel('Rota name',{exact:true}).pressSequentially('Gate flicker',{delay:120}));
 await key.text(page.getByLabel('Rota name',{exact:true}),'Checkout rota '+width);
 await accessibleState(page,'rota-name',width,page.getByLabel('Rota name',{exact:true}));
 await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Who is on, in order',exact:true}).waitFor();
 await key.option(page.getByRole('combobox',{name:'Primary person 1',exact:true}),second.id);await key.option(page.getByRole('combobox',{name:'Primary person 2',exact:true}),session.member.id);
 const remove=page.getByRole('button',{name:'Remove person',exact:true}).first();await key.reach(remove);await page.getByRole('tooltip',{name:'Remove person',exact:true}).first().waitFor();
 await accessibleState(page,'rota-people',width,remove);
 await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Hand-over',exact:true}).waitFor();
 const own=await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone);assert.equal(await page.getByLabel('Time zone',{exact:true}).inputValue(),own);assert.equal(await page.getByLabel('Time zone',{exact:true}).locator('option').first().getAttribute('value'),own);
 const starts=new Date(now+86400000).toISOString().slice(0,10);
 const startsChange=async()=>{await key.calendar(page.getByLabel('Starts',{exact:true}),starts);await key.calendar(page.getByLabel('At',{exact:true}),'10:30');};
 if(width===1440)await retainPreview(page,async()=>{await page.getByLabel('Starts',{exact:true}).fill(starts);await page.getByLabel('At',{exact:true}).fill('10:30');});
 await startsChange();
 await accessibleState(page,'rota-handover',width,page.getByRole('button',{name:'Continue',exact:true}));
 await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Check',exact:true}).waitFor();
 if(width===1440){
  const ends=new Date(now+60*86400000).toISOString().slice(0,10);
  await retainPreview(page,()=>page.getByLabel('Ends (optional)',{exact:true}).fill(ends),page.getByRole('button',{name:'Create rota',exact:true}));
  await key.calendar(page.getByLabel('Ends (optional)',{exact:true}),ends);
  await invalidWindow(page);
 }
 if(width<761){
  const disclosure=page.locator('.oc-preview > summary');await key.activate(disclosure);
  await page.getByRole('list',{name:'Resolved coverage spans',exact:true}).waitFor();
  await accessibleState(page,'narrow-preview-open',width,disclosure);
  await key.activate(disclosure,'Space');assert.equal(await page.getByRole('list',{name:'Resolved coverage spans',exact:true}).isVisible(),false,'the narrow preview closes with Space');
  await key.activate(disclosure);await page.getByRole('list',{name:'Resolved coverage spans',exact:true}).waitFor();
 }
 await key.focusScreenshot(page.getByRole('button',{name:'Create rota',exact:true}),`${directory}/keyboard-rota-create-${width}.png`);
 await accessibleState(page,'rota-preview',width,page.getByRole('button',{name:'Create rota',exact:true}));
 assert.deepEqual(await api('/api/paging/state'),previewBefore,'live draft previews write no schedule, job or scheduling revision');assert.deepEqual(await api('/api/state'),workspaceBefore,'live draft previews preserve workspace records and revision');const auditAfter=await api('/api/audit/export');assert.deepEqual(auditAfter.rows.filter(row=>row.kind!=='audit.export'),auditBefore.rows.filter(row=>row.kind!=='audit.export'),'draft previews append no permanent audit record; the observing exports keep their own audits');
 const visiblePreview=await page.getByRole('list',{name:'Resolved coverage spans',exact:true}).locator(':scope > li').evaluateAll(items=>items.map(item=>({at:item.querySelector('time').dateTime,primary:item.querySelector('strong').textContent,backup:[...item.querySelectorAll('p')].find(p=>p.textContent.startsWith('Backup · ')).textContent.replace(/^Backup · /,'')})));
 await page.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]')?.disabled);
 const creating=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/paging/schedules'&&response.request().method()==='POST');
 await key.activate(page.getByRole('button',{name:'Create rota',exact:true}));await page.waitForURL(/\/on-call\/rota-[a-f0-9]{8}$/);
 const createdReply=await creating;assert.equal(createdReply.status(),200);const submitted=createdReply.request().postDataJSON();
 // Native segmented edits send intermediate valid drafts. Their HTTP responses
 // can finish after the final draft; compare the preview of the submitted draft.
 const id=decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1)),created=(await api('/api/paging/state')).schedules.find(schedule=>schedule.id===id),last=previews.filter(value=>isDeepStrictEqual(value.input.schedule,submitted)).at(-1);page.off('response',observe);
 assert.ok(last?.windows.length>1);assert.equal(created.timezone,own);
 assert.deepEqual(created.primary.members,[second.id,session.member.id],'protected HTTP readback keeps the keyboard-selected person order');
 const saved=await api('/api/paging/preview',{scheduleId:id,from:last.input.from,to:last.input.to});const assignments=windows=>windows.map(({scheduleRevision,...coverage})=>coverage);assert.deepEqual(assignments(saved),assignments(last.windows),'create preserves every previewed hand-over and assignment');
 const personName=id=>workspaceBefore.members.find(member=>member.id===id)?.name??'Nobody on call';
 assert.deepEqual(visiblePreview,saved.slice(0,80).map(window=>({at:new Date(window.at).toISOString(),primary:personName(window.primary),backup:personName(window.backup)})),'the rendered preview names and times match protected saved coverage');
 const first=await api('/api/schedules/'+encodeURIComponent(id)+'/now-next?at='+encodeURIComponent(new Date(last.input.from).toISOString()));assert.equal(Date.parse(first.now.windows.find(window=>window.role==='primary').end),last.windows[1].at,'the first weekly hand-over equals the live preview');
 const future=scheduleReviewWindow(now);
 // Keep the prior reviewed-editor checks through Cover and Edit: a new gap, explicit confirmation and both named-zone clock changes.
 const coverOpener=page.getByRole('button',{name:'Cover a shift',exact:true}),cover=page.getByRole('dialog',{name:'Cover a shift',exact:true});
 const beforeDismiss=await api('/api/paging/state');
 await key.activate(coverOpener);await key.dialog(cover);await key.reach(cover.getByRole('button',{name:'Close sheet',exact:true}));await page.getByRole('tooltip',{name:'Close sheet',exact:true}).waitFor();await key.dismiss(cover,coverOpener);
 assert.deepEqual(await api('/api/paging/state'),beforeDismiss,'Escape dismisses cover preparation without saving');
 await key.activate(coverOpener);
 await key.option(cover.getByLabel('Who',{exact:true}),'');await key.option(cover.getByLabel('Role',{exact:true}),'primary');await key.calendar(cover.getByLabel('From',{exact:true}),future.overrideStart);await key.calendar(cover.getByLabel('To',{exact:true}),future.overrideEnd);
 await accessibleState(page,'cover-preparation',width,cover.getByRole('button',{name:'Review change',exact:true}));
 const coverBefore=await api('/api/paging/state'),coverReviewResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/schedules/'+id+'/review'&&r.request().method()==='POST');
 await key.activate(cover.getByRole('button',{name:'Review change',exact:true}));await cover.getByText('New coverage gap',{exact:true}).first().waitFor();
 const coverReviewReply=await coverReviewResponse;assert.equal(coverReviewReply.status(),200);const coverReview=await coverReviewReply.json();
 const reviewedNames=await cover.getByRole('region',{name:'Coverage change intervals',exact:true}).locator('.scheduling-window > p > strong').allTextContents(),reviewName=id=>id===null?'Coverage gap':coverReview.members.find(member=>member.id===id)?.name??'Unavailable member';
 assert.deepEqual(reviewedNames,[...coverReview.intervals].sort((a,b)=>Number(b.after===null)-Number(a.after===null)||a.start-b.start||a.role.localeCompare(b.role)).slice(0,80).map(interval=>interval.role+': '+reviewName(interval.before)+' → '+reviewName(interval.after)),'the cover review renders every protected before and after assignment');
 assert.deepEqual(await api('/api/paging/state'),coverBefore,'cover review writes nothing');assert.equal(await cover.getByRole('button',{name:'Apply reviewed change',exact:true}).isDisabled(),true);
 await key.dialog(cover);await accessibleState(page,'cover-review',width,cover.getByRole('checkbox',{name:'I reviewed these assignments and gaps'}));
 await key.dismiss(cover,coverOpener);assert.deepEqual(await api('/api/paging/state'),coverBefore,'Escape from the review writes nothing');
 await key.activate(coverOpener);await key.activate(cover.getByRole('button',{name:'Review change',exact:true}));await cover.getByText('New coverage gap',{exact:true}).first().waitFor();
 await key.activate(cover.getByRole('checkbox',{name:'I reviewed these assignments and gaps'}),'Space');await key.activate(cover.getByRole('button',{name:'Apply reviewed change',exact:true}));await cover.waitFor({state:'detached'});
 await key.visibleFocus(coverOpener);
 const covered=(await api('/api/paging/state')).schedules.find(schedule=>schedule.id===id),override=covered.overrides.at(-1);
 assert.deepEqual({member:override.member,role:override.role,start:override.start,end:override.end},{member:null,role:'primary',start:future.overrideStart+':00.000Z',end:future.overrideEnd+':00.000Z'},'protected readback retains the exact keyboard cover interval and assignment');
 assert.equal(covered.revision,created.revision+1,'only confirmation saves the cover');
 const reviewedCoverage=await api('/api/paging/preview',{scheduleId:id,from:coverReview.from,to:coverReview.to});
 for(const interval of coverReview.intervals){const actual=reviewedCoverage.findLast(window=>window.at<=interval.start);assert.ok(actual);assert.equal(actual[interval.role],interval.after,'saved coverage matches each reviewed role assignment');}
 await accessibleState(page,'cover-saved',width,coverOpener);
 // Give the old rota its named New York clock through the same reviewed door, then use the four-step editor for London.
 let current=(await api('/api/paging/state')).schedules.find(schedule=>schedule.id===id),from=Date.parse(future.previewFrom+'Z'),to=Date.parse(future.previewTo+'Z');
 const named={...current,timezone:'America/New_York'},namedReview=await api('/api/schedules/'+id+'/review',{schedule:named,from,to});await api('/api/schedules/'+id+'/apply',{schedule:named,from,to,digest:namedReview.digest,confirmed:true});
 await page.reload();await key.activate(page.getByRole('link',{name:'Edit rota',exact:true}));await page.getByLabel('Rota name',{exact:true}).waitFor();
 if(width===1440)await retainPreview(page,()=>page.getByLabel('Rota name',{exact:true}).pressSequentially('Gate flicker',{delay:120}));
 await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Who is on, in order',exact:true}).waitFor();await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Hand-over',exact:true}).waitFor();
 const handover=async()=>{await key.option(page.getByLabel('Time zone',{exact:true}),'Europe/London');await key.calendar(page.getByLabel('Starts',{exact:true}),future.previewFrom.slice(0,10));await key.calendar(page.getByLabel('At',{exact:true}),'09:00');};
 if(width===1440)await retainPreview(page,async()=>{await page.getByLabel('Time zone',{exact:true}).selectOption('Europe/London');await page.getByLabel('Starts',{exact:true}).fill(future.previewFrom.slice(0,10));await page.getByLabel('At',{exact:true}).fill('09:00');});
 await handover();
 await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Check',exact:true}).waitFor();
 if(width===1440){
  const ends=new Date(Date.parse(future.previewFrom+'Z')+60*86400000).toISOString().slice(0,10);
  await retainPreview(page,()=>page.getByLabel('Ends (optional)',{exact:true}).fill(ends),page.getByRole('button',{name:'Review change',exact:true}));
  await key.calendar(page.getByLabel('Ends (optional)',{exact:true}),ends);
  await invalidWindow(page);
 }
 await page.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]')?.disabled);await key.activate(page.getByRole('button',{name:'Review change',exact:true}));
 const review=page.getByRole('region',{name:'Review schedule changes',exact:true});await review.waitFor();assert.ok(await review.getByText(/DST \/ clock change: Europe\/London/).count());assert.ok(await review.getByText(/DST \/ clock change: America\/New_York/).count());assert.equal(await review.getByRole('button',{name:'Apply reviewed change',exact:true}).isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'review fits the viewport');
 const axe=await new AxeBuilder({page}).include('.oc-rota-steps').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations,[]);
 await review.screenshot({path:`${directory}/schedule-review-panel-${width}.png`});await key.activate(review.getByRole('checkbox',{name:'I reviewed these assignments and gaps'}),'Space');await key.activate(review.getByRole('button',{name:'Apply reviewed change',exact:true}));await page.waitForURL(url=>url.pathname==='/on-call/'+id);
 assert.equal((await api('/api/paging/state')).schedules.find(schedule=>schedule.id===id).timezone,'Europe/London');
 await key.activate(page.getByText('Calendar feed',{exact:true}));const feed=page.getByRole('link',{name:'Open private ICS feed',exact:true});const calendar=await context.request.get(await feed.getAttribute('href'));assert.equal(calendar.status(),200);
 const times=(await calendar.text()).split('\r\n').filter(line=>/^DT(STAMP|START|END):/.test(line));assert.ok(times.length>0);assert.ok(times.every(line=>/^DT(STAMP|START|END):[0-9]{8}T[0-9]{6}Z$/.test(line)),'calendar uses whole-second UTC times');
 await page.screenshot({path:`${directory}/rota-page-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await setTime(null);
 if(!selectedOnly){await coverageRulesBrowser(page,context,width,session,{ownerLink});await scheduleCoordinationBrowser(page,context,width,session,{ownerLink});}
 console.log(`PROBE OC-009 schedules, overrides and preview ${width}: native keyboard create, narrow disclosure, cover preparation, review, Escape and confirmation -> protected saved assignments and preview agree; focus, dialog containment, labels, overflow and axe passed`);
}
// Pair the next nearby offset changes from the zones themselves, beyond tomorrow.
export function scheduleReviewWindow(now) {
 const hour=3600000,day=24*hour,zones=['Europe/London','America/New_York']
 const formatters=zones.map(timeZone=>new Intl.DateTimeFormat('en-US',{timeZone,timeZoneName:'longOffset'}))
 const offset=(zone,at)=>formatters[zone].formatToParts(at).find(part=>part.type==='timeZoneName').value
 const start=now+day,previous=zones.map((_,zone)=>offset(zone,start)),changes=[]
 for(let left=start;left<start+370*day;left+=6*hour) {
  const right=left+6*hour
  for(let zone=0;zone<zones.length;zone++) {
   const next=offset(zone,right)
   if(next===previous[zone])continue
   let low=left,high=right
   while(high-low>60000){const middle=Math.floor((low+high)/2);if(offset(zone,middle)===previous[zone])low=middle;else high=middle}
   changes.push({zone,at:Math.ceil(high/60000)*60000});previous[zone]=next
  }
  changes.sort((a,b)=>a.at-b.at)
  const last=changes.at(-1),first=changes.at(-2)
  if(!first||first.zone===last.zone)continue
  const from=Math.floor(first.at/day)*day-day,to=Math.floor(last.at/day)*day+2*day
  if(to-from>31*day)continue
  const gap=from+day+9*hour,utc=at=>new Date(at).toISOString().slice(0,16)
  return {overrideStart:utc(gap),overrideEnd:utc(gap+3*hour),previewFrom:utc(from),previewTo:utc(to)}
 }
 throw Error('No nearby clock changes found for schedule review')
}

export async function coverageRulesBrowser(page,context,width,session,{ownerLink}={}){
 const origin=new URL(page.url()).origin,api=async(path,input)=>{const r=await(input===undefined?context.request.get(origin+path):context.request.post(origin+path,{headers:{origin},data:input}));assert.equal(r.status(),200);return r.json();};
 const state=await api('/api/state'),now=Date.now(),date=new Date(now-86400000).toISOString().slice(0,10),id='synthetic-oncall-'+(3000+width);
 const rotation={anchorLocal:date+'T00:00',periodDays:1,members:[session.member.id],ambiguity:'earlier'},layer={id:id+'-layer',name:'synthetic-oncall-'+(4000+width),role:'primary',timezone:'UTC',kind:'daily',rotation,start:date+'T00:00:00.000Z',end:null,weekdays:[1,2,3,4,5],startHour:9,endHour:17,holidayCalendars:[],holidayAction:'next',ptoAction:'next'};
 await api('/api/paging/schedules',{id,name:'synthetic-oncall-'+(5000+width),service:state.services[0].id,revision:0,timezone:'UTC',validFrom:date+'T00:00:00.000Z',validUntil:null,primary:rotation,backup:{...rotation,members:[]},overrides:[],layers:[layer]});
 await page.goto(origin+'/on-call/'+id);const current=await api('/api/schedules/'+id+'/now-next');assert.ok((await page.locator('.scheduling-now-role').first().innerText()).includes(current.now.windows[0].explanation));
 const inView=async locator=>{await locator.waitFor();await page.waitForFunction(el=>el===document.activeElement,await locator.elementHandle());assert.equal(await locator.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}),true);assert.equal(await locator.evaluate(el=>el===document.activeElement),true);};
 const edit=async()=>{await page.getByRole('link',{name:'Edit rota',exact:true}).click();for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Coverage review elapsed days',{exact:true}).fill('366');await page.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]').disabled);};
 const directory=process.env.ONCALL_BROWSER_EVIDENCE;await edit();
 const proposal=page.getByRole('region',{name:'Layers, holidays and PTO',exact:true});
 await proposal.getByLabel('PTO start, UTC',{exact:true}).fill(new Date(now+7200000).toISOString().slice(0,16));await proposal.getByLabel('PTO end, UTC',{exact:true}).fill(new Date(now+10800000).toISOString().slice(0,16));
 await proposal.getByRole('button',{name:'Add PTO to proposal',exact:true}).click();await inView(proposal.getByRole('status'));
 await page.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]').disabled);await page.getByRole('button',{name:'Review change',exact:true}).click();
 const review=page.getByRole('region',{name:'Review schedule changes',exact:true});await inView(review.locator('h2'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(directory)await page.screenshot({path:directory+'/coverage-rules-'+width+'.png',fullPage:true});
 for(const internal of [id,layer.id,session.member.id])assert.equal((await page.locator('body').innerText()).includes(internal),false);
 await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Apply reviewed change',exact:true}).click();await page.waitForURL(url=>url.pathname==='/on-call/'+id);await inView(page.getByRole('status').filter({hasText:/./}).first());
 let saved=(await api('/api/paging/state')).schedules.find(s=>s.id===id);assert.equal(saved.pto.length,1);
 await edit();await proposal.getByLabel('PTO start, UTC',{exact:true}).fill(new Date(now+14400000).toISOString().slice(0,16));await proposal.getByLabel('PTO end, UTC',{exact:true}).fill(new Date(now+18000000).toISOString().slice(0,16));await proposal.getByRole('button',{name:'Add PTO to proposal',exact:true}).click();await inView(proposal.getByRole('status'));await page.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]').disabled);await page.getByRole('button',{name:'Review change',exact:true}).click();await review.waitFor();await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Apply reviewed change',exact:true}).click();await page.waitForURL(url=>url.pathname==='/on-call/'+id);saved=(await api('/api/paging/state')).schedules.find(s=>s.id===id);assert.equal(saved.pto.length,2);
 await edit();
 const refused=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/pto-review'));
 await proposal.getByLabel('Review ICS PTO upload',{exact:true}).setInputFiles({name:'synthetic-oncall.ics',mimeType:'text/calendar',buffer:Buffer.from('BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:bad\nEND:VEVENT\nEND:VCALENDAR')});assert.equal((await refused).status(),400);await inView(proposal.getByRole('status'));
 const imported=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/pto-review'));
 await proposal.getByLabel('Review ICS PTO upload',{exact:true}).setInputFiles('tests/fixtures/pto-calendar.ics');const result=await imported;assert.equal(result.status(),200);const uploadReview=await result.json();assert.ok(uploadReview.import.entries.length>0);assert.ok(uploadReview.import.refused.length>0);await inView(proposal.getByRole('status'));await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Apply reviewed change',exact:true}).click();await page.waitForURL(url=>url.pathname==='/on-call/'+id);saved=(await api('/api/paging/state')).schedules.find(s=>s.id===id);assert.equal(saved.pto.length,2+uploadReview.import.entries.length);
 await edit();await page.getByLabel('Layer name',{exact:true}).fill(layer.name+' changed');await page.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]').disabled);await page.getByRole('button',{name:'Review change',exact:true}).click();await review.waitFor();
 await api('/api/schedules/'+id+'/overrides',{revision:saved.revision,override:{id:id+'-cover',role:'primary',member:null,start:new Date(now+21600000).toISOString(),end:new Date(now+25200000).toISOString()}});
 await review.getByRole('checkbox').check();const stale=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/apply'));await review.getByRole('button',{name:'Apply reviewed change',exact:true}).click();assert.equal((await stale).status(),409);await inView(page.locator('.oc-rota-steps .failure-line'));assert.equal((await api('/api/paging/state')).schedules.find(s=>s.id===id).layers[0].name,layer.name);
 // The same PTO page works under an ordinary member's own password session.
 const memberName='Synthetic PTO member '+width,password='synthetic-pto-member-password';
 const created=await context.request.post(origin+'/api/members',{headers:{origin},data:{name:memberName,role:'responder',password}});assert.equal(created.status(),201);const member=await created.json();
 const team=await api('/api/teams',{id:id+'-team',name:'Synthetic PTO team '+width,visibility:'public',active:true,revision:0,members:[member.id],managers:[]});
 const service=await api('/api/command',{type:'service',id:id+'-service',name:'Synthetic PTO service '+width,environment:'test',owner:session.member.id,team:team.id,runbook:[],pager:''});
 await api('/api/teams/ownership',{service:service.id,team:team.id,workspaceRevision:(await api('/api/state')).revision});
 const selfRota=await api('/api/paging/schedules',{id:id+'-self',name:'Synthetic self PTO '+width,service:service.id,revision:0,timezone:'UTC',validFrom:date+'T00:00:00.000Z',validUntil:null,primary:{...rotation,members:[member.id]},backup:{...rotation,members:[]},overrides:[]});
 const memberContext=await context.browser().newContext({baseURL:origin,viewport:{width:1440,height:1000}});
 try{
  if(ownerLink){const key=new URLSearchParams(new URL(ownerLink).hash.slice(1)).get('rer-dev');assert.ok(key);assert.equal((await memberContext.request.post(origin+'/__dev/key',{headers:{origin},data:{key}})).status(),204);}
  const memberPage=await memberContext.newPage();await memberPage.goto(origin+'/signin/local');await memberPage.getByLabel('Name',{exact:true}).fill(memberName);await memberPage.getByLabel('Password',{exact:true}).fill(password);await memberPage.getByRole('button',{name:'Sign in',exact:true}).click();await memberPage.waitForURL(url=>url.pathname==='/on-call');
  const current=await memberContext.request.get(origin+'/api/session');assert.equal((await current.json()).member.id,member.id);
  const open=async()=>{await memberPage.goto(origin+'/on-call/'+selfRota.id);await memberPage.getByRole('link',{name:'Your PTO',exact:true}).click();await memberPage.getByRole('heading',{name:'Your PTO',exact:true}).waitFor();};
  await open();
  const ownProposal=memberPage.getByRole('region',{name:'Layers, holidays and PTO',exact:true}),ownReview=memberPage.getByRole('region',{name:'Review schedule changes',exact:true});
  assert.deepEqual(await ownProposal.getByLabel('PTO member',{exact:true}).locator('option').evaluateAll(options=>options.map(o=>o.value)),[member.id]);
  assert.equal(await memberPage.getByRole('button',{name:'Add layer',exact:true}).count(),0);
  await ownProposal.getByLabel('PTO start, UTC',{exact:true}).fill(new Date(now+7200000).toISOString().slice(0,16));await ownProposal.getByLabel('PTO end, UTC',{exact:true}).fill(new Date(now+10800000).toISOString().slice(0,16));
  await ownProposal.getByRole('button',{name:'Add PTO to proposal',exact:true}).click();
  await memberPage.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]').disabled);
  const reviewed=memberPage.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/pto-review'));await memberPage.getByRole('button',{name:'Review change',exact:true}).click();assert.equal((await reviewed).status(),200);
  await ownReview.getByRole('checkbox').check();const applied=memberPage.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/pto-apply'));await ownReview.getByRole('button',{name:'Apply reviewed change',exact:true}).click();assert.equal((await applied).status(),200);await memberPage.waitForURL(url=>url.pathname==='/on-call/'+selfRota.id);
  let stored=(await api('/api/paging/state')).schedules.find(s=>s.id===selfRota.id);assert.equal(stored.revision,selfRota.revision+1);assert.equal(stored.pto.length,1);assert.equal(stored.pto[0].member,member.id);
  const affected=await api('/api/schedules/'+selfRota.id+'/now-next?at='+encodeURIComponent(stored.pto[0].start));assert.equal(affected.now.primary,null);assert.deepEqual(stored.primary.members,[member.id]);
  await open();const ownImport=memberPage.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/pto-review'));await ownProposal.getByLabel('Review ICS PTO upload',{exact:true}).setInputFiles('tests/fixtures/pto-calendar.ics');const importResponse=await ownImport;assert.equal(importResponse.status(),200);const imported=await importResponse.json();
  await ownReview.getByRole('checkbox').check();
  const Axe=(await import('@axe-core/playwright')).default;assert.deepEqual((await new Axe({page:memberPage}).include('.oc-rota-steps').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations,[]);
  if(directory)for(const size of [1440]){await memberPage.setViewportSize({width:size,height:1000});await memberPage.screenshot({path:directory+'/member-pto-review-'+size+'.png',fullPage:true});}
  await memberPage.setViewportSize({width:1440,height:1000});
  await ownReview.getByRole('button',{name:'Apply reviewed change',exact:true}).click();await memberPage.waitForURL(url=>url.pathname==='/on-call/'+selfRota.id);
  stored=(await api('/api/paging/state')).schedules.find(s=>s.id===selfRota.id);assert.equal(stored.revision,selfRota.revision+2);assert.equal(stored.pto.length,1+imported.import.entries.length);
  await open();await ownProposal.getByLabel('PTO start, UTC',{exact:true}).fill(new Date(now+14400000).toISOString().slice(0,16));await ownProposal.getByLabel('PTO end, UTC',{exact:true}).fill(new Date(now+18000000).toISOString().slice(0,16));await ownProposal.getByRole('button',{name:'Add PTO to proposal',exact:true}).click();await memberPage.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]').disabled);await memberPage.getByRole('button',{name:'Review change',exact:true}).click();await ownReview.waitFor();
  await api('/api/schedules/'+selfRota.id+'/overrides',{revision:stored.revision,override:{id:id+'-self-cover',role:'primary',member:null,start:new Date(now+21600000).toISOString(),end:new Date(now+25200000).toISOString()}});
  await ownReview.getByRole('checkbox').check();const staleSelf=memberPage.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/pto-apply'));await ownReview.getByRole('button',{name:'Apply reviewed change',exact:true}).click();assert.equal((await staleSelf).status(),409);await memberPage.locator('.failure-line').waitFor();assert.equal((await api('/api/paging/state')).schedules.find(s=>s.id===selfRota.id).pto.length,stored.pto.length);
  console.log('PASS OC-024 ordinary-member browser 1440: password sign-in, own-only picker, self-PTO and self-ICS review/apply, current consecutive revisions, effective gap, retained slots, visible stale refusal, axe; PTO screen captured at 1440');
 }finally{await memberContext.close();}
 console.log('PASS OC-024 browser coverage rules '+width+': long review, focused PTO and ICS outcomes, consecutive reviewed writes, visible stale refusal and no visible internal identifiers');
}


// schedule-coordination-browser: part of this public journey.
export async function scheduleCoordinationBrowser(page,context,width,session,{ownerLink}={}){
 const origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true});
 const api=async(path,input)=>{const response=await(input===undefined?context.request.get(origin+path):context.request.post(origin+path,{headers:{origin},data:input}));assert.equal(response.status(),200);return response.json();};
 const fixture=2500+width,name='synthetic-oncall-'+fixture,password='synthetic-oncall-'+fixture+'-password';
 const created=await context.request.post(origin+'/api/members',{headers:{origin},data:{name,role:'responder',password}});assert.equal(created.status(),201);const substitute=await created.json();
 const state=await api('/api/state'),tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10)+'T09:00';
 const schedule=await api('/api/paging/schedules',{id:'rota-'+crypto.randomUUID().replaceAll('-','').slice(0,8),name:'Coordination rota '+width,service:state.services[0].id,revision:0,timezone:'UTC',validFrom:new Date(Date.now()-86400000).toISOString(),validUntil:null,primary:{anchorLocal:tomorrow,periodDays:7,members:[session.member.id],ambiguity:'earlier'},backup:{anchorLocal:tomorrow,periodDays:7,members:[],ambiguity:'earlier'},overrides:[]});
 assert.ok(Number.isSafeInteger(schedule.revision)&&schedule.revision>0);
 await page.goto(origin+'/on-call/'+schedule.id);await focusWorkspace(page);
 const coordination=page.getByRole('region',{name:'Shift coordination',exact:true});await coordination.getByRole('heading',{name:'Shift coordination',exact:true}).waitFor();
 await page.getByRole('button',{name:'Request a swap',exact:true}).click();const swapSheet=page.getByRole('dialog',{name:'Request a swap',exact:true});await swapSheet.getByLabel('Shift to swap',{exact:true}).waitFor();
 await swapSheet.getByLabel('Substitute',{exact:true}).selectOption(substitute.id);await swapSheet.getByRole('button',{name:'Request',exact:true}).click();await swapSheet.waitFor({state:'detached'});await coordination.getByText(/admin approval required/).waitFor();
 const swap=(await api('/api/schedule-coordination')).records.find(row=>row.kind==='swap'&&row.data.schedule===schedule.id&&row.data.status==='pending');assert.ok(swap);
 await coordination.getByRole('button',{name:'Approve swap',exact:true}).click();await coordination.getByText(/approval recorded/).waitFor();
 const relief=await context.browser().newContext({baseURL:origin,viewport:{width,height:900}});
 try{
  if(ownerLink){
   const local=new URL(ownerLink);assert.equal(local.origin,origin);const key=new URLSearchParams(local.hash.slice(1)).get('rer-dev');assert.ok(key);
   const admitted=await relief.request.post(origin+'/__dev/key',{headers:{origin},data:{key}});assert.equal(admitted.status(),204);const anonymous=await relief.request.get(origin+'/api/session');assert.equal(anonymous.status(),200);assert.equal((await anonymous.json()).member,null,'dev admission grants no member authority');
  }
  const login=await relief.request.post(origin+'/api/login',{headers:{origin},data:{name,password}});assert.equal(login.status(),200);const current=await relief.request.get(origin+'/api/session');assert.equal(current.status(),200);const member=(await current.json()).member;
  assert.equal(member.id,substitute.id,'the substitute uses its own password session');assert.equal(member.role,'responder');assert.notEqual(member.id,session.member.id);assert.equal((await relief.cookies()).some(cookie=>/^(?:__Host-operator_session|operator_session_local(?:_\d+)?)$/.test(cookie.name)),false,'no owner session is copied');
  const reliefPage=await relief.newPage(),errors=[];reliefPage.on('pageerror',error=>errors.push(error.message));const document=await reliefPage.goto(origin+'/on-call/'+schedule.id);assert.equal(document.status(),200);
  const substituteView=reliefPage.getByRole('region',{name:'Shift coordination',exact:true});await substituteView.getByRole('button',{name:'Accept swap',exact:true}).click();await substituteView.getByText(/accepted/).waitFor();
  assert.ok(await reliefPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await reliefPage.evaluate(()=>window.__rerHydration?.count??0),0);assert.deepEqual(errors,[]);
  assert.deepEqual((await new AxeBuilder({page:reliefPage}).include('.oc-rota-page').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations,[]);
  await substituteView.screenshot({path:`${directory}/OC-025-substitute-${width}.png`});await reliefPage.screenshot({path:`${directory}/OC-025-substitute-rota-${width}.png`,fullPage:true});
 }finally{await relief.close();}
 await focusWorkspace(page);await coordination.getByText(/accepted/).waitFor();await coordination.getByText('Reminders and swaps',{exact:true}).click();
 await coordination.getByLabel('Swap approval',{exact:true}).selectOption('none');
 await page.waitForFunction(async id=>{const data=await(await fetch('/api/schedule-coordination')).json();return data.records.some(row=>row.kind==='policy'&&row.data.schedule===id&&row.data.swapApproval==='none');},schedule.id);
 await coordination.getByLabel('Reminder lead minutes',{exact:true}).fill('30');await coordination.getByLabel('Reminder lead minutes',{exact:true}).blur();await coordination.getByText(/not sent \(no timer\)/).waitFor();
 await page.waitForFunction(async()=>{const data=await(await fetch('/api/schedule-coordination')).json();return data.records.some(row=>row.kind==='reminder'&&row.data.leadMinutes===30);});
 await coordination.getByText('Calendar feed',{exact:true}).click();await coordination.getByLabel('Calendar scope',{exact:true}).selectOption('schedule');await coordination.getByRole('button',{name:'Create link',exact:true}).click();
 const field=coordination.getByRole('textbox',{name:'New private calendar URL',exact:true});await field.waitFor();const url=await field.inputValue();assert.equal((await context.request.get(url)).status(),200);await coordination.getByRole('button',{name:'Hide calendar URL',exact:true}).click();assert.equal(await field.count(),0,'the bearer is dismissed before proof');
 await coordination.getByText('History',{exact:true}).click();assert.ok((await api('/api/state')).scheduleRecords.some(row=>row.kind==='notice'&&row.data.schedule===schedule.id),'schedule changes retain their recorded obligations');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const axe=await new AxeBuilder({page}).include('[aria-label="Shift coordination"]').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations,[]);
 assert.equal(await coordination.getByLabel('Swap approval',{exact:true}).inputValue(),'none','saved policy stays selected');await coordination.screenshot({path:`${directory}/OC-025-settings-${width}.png`});
 await coordination.getByRole('button',{name:'Revoke subscription',exact:true}).click();await coordination.getByText(/revoked or restored inactive/).waitFor();assert.equal((await context.request.get(url)).status(),404);
 const coverage=await api('/api/schedules/'+schedule.id+'/now-next?at='+encodeURIComponent(swap.data.start));assert.equal(coverage.now.primary,substitute.id);
 await page.reload();await page.getByText('Reminders and swaps',{exact:true}).click();assert.equal(await page.getByLabel('Swap approval',{exact:true}).inputValue(),'none');assert.equal(await page.getByLabel('Reminder lead minutes',{exact:true}).inputValue(),'30','a number left in the field remains saved after reload');
 console.log(`PASS OC-025 browser ${width}: band-selected swap, independent substitute acceptance after approval, effective override, autosaved approval/reminder, no-timer label, one-time feed dismissal, immediate revoke, recorded obligations, axe and overflow`);
}


// OC-060 extends the product journey with one populated storm and two low alerts.
export async function triageFiltersBrowser(page,context,{setTime=async()=>{},proof}={}) {
 const origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true});
 const call=async(path,data,status=200)=>{const response=data===undefined?await context.request.get(origin+path):await context.request.post(origin+path,{headers:{origin},data});assert.equal(response.status(),status,path);return response.json();};
 const actor=(await call('/api/session')).member,prefix='Synthetic triage storm';
 const pagingRecords=({workspaceRevision,...records})=>records;
 const services=[];
 for(const [n,name] of ['Triage payments','Triage queue'].entries())services.push(await call('/api/command',{type:'service',id:'synthetic-oncall-6060-'+n,name,environment:'test',owner:actor.id,runbook:[],pager:''}));
 const other=await call('/api/members',{name:'synthetic-oncall-6060-responder',role:'responder',password:randomBytes(24).toString('hex')},201),storm=[];
 for(let n=0;n<50;n++) {
  let incident=await call('/api/command',{type:'declare',service:services[n<30?0:1].id,severity:n<20?'critical':'warning',title:prefix+' '+n,summary:'Customer requests need a human response'});
  if(n>=10)incident=await call('/api/command',{type:'transition',incident:incident.id,revision:incident.revision,state:'acknowledged',summary:'Take responsibility'});
  if(n>=40)incident=await call('/api/command',{type:'reassign',incident:incident.id,revision:incident.revision,member:other.id,reason:'Transfer responsibility to the other responder'});
  if(n>=30&&n<35)incident=await call('/api/command',{type:'snooze',incident:incident.id,revision:incident.revision,minutes:15});
  storm.push(incident);
 }
 const closing={operationId:'synthetic-oncall-6060-resolved',action:'resolve',items:storm.slice(45).map(i=>({id:i.id,revision:i.revision})),reason:'Operator verified repair',evidence:'https://example.test/triage-repair'};
 let closed;do{closed=await call('/api/triage/bulk',closing);}while(closed.remaining&&!closed.interrupted);
 assert.equal(closed.results.filter(row=>row.ok).length,5);
 // Even past its due time, a read must keep a recorded snooze pending.
 await setTime(Date.parse(storm[30].deadlines.at(-1).dueAt)+60000);
 const snapshot=()=>proof?.snapshot(),outbound=async()=>proof?await proof.outbound():[];
 const before=snapshot(),beforeOutbound=await outbound(),paging=await call('/api/paging/state');
 await page.setViewportSize({width:1440,height:1000});
 const triage=page.getByRole('region',{name:'Incident triage',exact:true});
 const ids=rows=>rows.map(row=>row.id).sort();
 const compare=async(query,expected,{navigate=true}={})=>{
  const api=await call('/api/triage?'+new URLSearchParams({...query,limit:'100'}));
  assert.equal(api.total,expected.length);assert.deepEqual(ids(api.items),ids(expected));
  if(navigate)await page.goto(origin+'/incidents?'+new URLSearchParams(Object.entries(query).map(([key,value])=>['triage_'+key,value])));
  await triage.locator('.triage-count').getByText(`${expected.length} matching ${query.kind==='alerts'?'alert-only items':'incidents'}`,{exact:true}).waitFor();
  for(let loaded=25;loaded<expected.length;loaded+=25){
   await triage.getByRole('button',{name:'Load more incidents',exact:true}).click();
   await page.waitForFunction(count=>document.querySelectorAll('[data-triage-id]').length>=count,Math.min(expected.length,loaded+25));
  }
  await page.waitForFunction(expected=>{
   const actual=[...document.querySelectorAll('[data-triage-id]')].map(row=>row.dataset.triageId).sort();
   return JSON.stringify(actual)===JSON.stringify(expected);
  },ids(expected));
  assert.deepEqual(await triage.locator('[data-triage-id]').evaluateAll(rows=>rows.map(row=>row.dataset.triageId).sort()),ids(api.items));
  return api;
 };
 const capture=async name=>{
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'triage fits the desktop viewport');
  const axe=await new AxeBuilder({page}).include('[aria-label="Incident triage"]').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();
  assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await triage.screenshot({path:`${directory}/OC-060-${name}-${width}.png`});}
  await page.setViewportSize({width:1440,height:1000});
 };
 await compare({q:prefix},storm);
 await compare({q:prefix,service:services[0].id},storm.slice(0,30));
 await compare({q:prefix,service:services[1].id,urgency:'low'},storm.slice(30));
 await compare({q:prefix,urgency:'high'},storm.slice(0,20));
 await compare({q:prefix,status:'triggered'},storm.slice(0,10));
 await triage.getByText('Triggered',{exact:true}).first().waitFor();await capture('triggered');
 await compare({q:prefix,status:'declared'},storm.slice(0,10));
 await compare({q:prefix,status:'acknowledged'},[...storm.slice(10,30),...storm.slice(35,45)]);
 await compare({q:prefix,status:'resolved'},storm.slice(45));
 await compare({q:prefix,status:'snoozed'},storm.slice(30,35));
 await triage.getByText('Snoozed',{exact:true}).first().waitFor();await capture('snoozed');
 await page.reload();await compare({q:prefix,status:'snoozed'},storm.slice(30,35),{navigate:false});
 await compare({q:prefix,mine:'true'},storm.slice(10,40));
 await compare({q:prefix,mine:'true',service:services[1].id,urgency:'low',status:'snoozed'},storm.slice(30,35));
 // Exercise the same combination through actual controls, including URL state.
 await page.goto(origin+'/incidents');
 await triage.getByLabel('Search incidents',{exact:true}).fill(prefix);
 await triage.getByText('Filter and sort incidents',{exact:true}).click();
 await triage.getByLabel('Filter service',{exact:true}).selectOption(services[1].id);
 await triage.getByLabel('Filter urgency',{exact:true}).selectOption('low');
 await triage.getByLabel('Incident status',{exact:true}).selectOption('snoozed');
 await triage.getByLabel('Assigned to me',{exact:true}).check();
 await compare({q:prefix,mine:'true',service:services[1].id,urgency:'low',status:'snoozed'},storm.slice(30,35),{navigate:false});
 assert.equal(new URL(page.url()).searchParams.get('triage_status'),'snoozed');
 assert.deepEqual(snapshot(),before,'filtering, pagination and reloads preserve all durable rows and permanent audit');
 assert.deepEqual(await call('/api/paging/state'),paging);assert.deepEqual((await outbound()).slice(beforeOutbound.length),[]);
 console.log('PROBE OC-060 acceptance 1 web: 50 incidents -> rendered IDs and counts equal protected HTTP for service, urgency, triggered, declared, acknowledged, snoozed, resolved and mine; controls and URL agree; all durable rows, audit and paging unchanged, zero outbound requests');
 await setTime(null);
 const source='synthetic-oncall-6060',key=randomBytes(32).toString('hex');await call('/api/sources',{id:source,key,scopes:[services[0].id]});
 const lowTitle='Synthetic retained low alert';
 for(let n=0;n<2;n++){
  const identity='synthetic-oncall-6060-low-'+n;
  const response=await context.request.post(origin+'/api/ingress/'+source,{headers:{authorization:'Bearer '+key},data:{source,eventId:identity,service:services[0].id,environment:'test',key:identity,generation:identity,intent:'trigger',severity:'warning',title:lowTitle+' '+n,observedAt:new Date().toISOString(),evidence:''}});assert.equal(response.status(),201);
 }
 const low=(await call('/api/state')).alerts.filter(a=>a.source===source);assert.equal(new Set(low.map(a=>a.id)).size,2);assert.ok(low.every(a=>a.urgency==='low'&&a.state==='active'));
 const query={kind:'alerts',q:lowTitle,urgency:'low',status:'triggered'};
 const lowBefore=snapshot(),lowOutbound=await outbound(),lowPaging=await call('/api/paging/state');
 await compare(query,low);await page.reload();await compare(query,low,{navigate:false});await compare(query,low);
 assert.equal(await triage.getByText('Low urgency',{exact:true}).count(),2);await capture('low-open');
 assert.deepEqual(snapshot(),lowBefore);assert.deepEqual(await call('/api/paging/state'),lowPaging);assert.deepEqual((await outbound()).slice(lowOutbound.length),[]);
 const act=async(alert,action)=>{
  const title=lowTitle+' '+(alert.key.endsWith('-0')?0:1);
  await triage.getByLabel('Select '+title,{exact:true}).check();
  const bulk=page.getByRole('region',{name:'Bulk incident actions',exact:true});await bulk.getByLabel('Bulk action',{exact:true}).selectOption(action);
  await bulk.getByLabel(action==='resolve'?'Resolution summary for declared incidents':'Bulk action reason',{exact:true}).fill('Authorized human '+action+' of this low alert');
  await bulk.getByRole('button',{name:'Apply to 1 alert-only items',exact:true}).click();await page.getByText('1 changed; 0 refused',{exact:true}).waitFor();
  await bulk.getByRole('button',{name:'Clear selection',exact:true}).click();
 };
 await act(low[0],'acknowledge');await compare(query,[low[1]]);
 await compare({...query,status:'acknowledged'},[low[0]]);await triage.getByText('Acknowledged',{exact:true}).waitFor();await capture('low-acknowledged');
 await compare(query,[low[1]]);await act(low[1],'resolve');await compare(query,[]);
 await compare({...query,status:'resolved'},[low[1]]);await triage.getByText('Resolved',{exact:true}).waitFor();await capture('low-resolved');
 const after=(await call('/api/state')).alerts.filter(a=>a.source===source);
 for(const alert of after){const original=low.find(a=>a.id===alert.id);assert.equal(alert.state,'active');assert.equal(alert.urgency,'low');assert.deepEqual(alert.events,original.events);assert.equal(alert.coordination.history.length,1);assert.equal(alert.coordination.history[0].actor,actor.id);assert.ok(Number.isFinite(Date.parse(alert.coordination.history[0].at)));}
 assert.equal(after.find(a=>a.id===low[0].id).coordination.state,'acknowledged');assert.equal(after.find(a=>a.id===low[1].id).coordination.state,'closed');
 assert.deepEqual(pagingRecords(await call('/api/paging/state')),pagingRecords(lowPaging));assert.deepEqual((await outbound()).slice(lowOutbound.length),[]);
 const afterActions=snapshot();await page.reload();await compare({...query,status:'resolved'},[low[1]],{navigate:false});await compare({...query,status:'acknowledged'},[low[0]]);assert.deepEqual(snapshot(),afterActions);
 console.log('PROBE OC-060 acceptance 3 web: two native low alerts -> retained explicit low urgency across reloads, separate attributed acknowledgment and close, retained acknowledged and resolved history, active sources, unchanged paging and zero outbound requests; changed screens captured once at 1440 and 390');
 await page.goto(origin+'/incidents');
}

// triage-bulk-browser: part of this public journey.
export async function triageBulkBrowser(page,context,width){
 const origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true});
 const call=async(path,data,status=200)=>{const response=data===undefined?await context.request.get(origin+path):await context.request.post(origin+path,{headers:{origin},data});assert.equal(response.status(),status,path);return response.json();};
 const state=await call('/api/state'),service=state.services.find(s=>s.name==='Checkout'),prefix='Synthetic bulk '+(width===1440?'desktop':'phone');
 const make=async title=>call('/api/command',{type:'declare',service:service.id,severity:'warning',title,summary:'Human response evidence'});
 let a=await make(prefix+' first'),b=await make(prefix+' second'),target=await make(prefix+' target');
 for(const i of [a,b])await call('/api/command',{type:'transition',incident:i.id,revision:i.revision,state:'acknowledged',summary:'Take responsibility'});
 await page.goto(origin+'/incidents');await page.getByLabel('Search incidents',{exact:true}).fill(prefix);await page.getByText('3 matching incidents',{exact:true}).waitFor();
 const selectSources=async()=>{await page.getByLabel('Select '+a.title,{exact:true}).check();await page.getByLabel('Select '+b.title,{exact:true}).check();};
 await selectSources();let bulk=page.getByRole('region',{name:'Bulk incident actions',exact:true});await bulk.getByLabel('Bulk action',{exact:true}).selectOption('snooze');await bulk.getByLabel('Snooze minutes',{exact:true}).fill('15');await bulk.getByLabel('Bulk action reason',{exact:true}).fill('Wait for the dependency owner');
 // Hold the real post-save list read: the workspace confirmation must not make
 // pre-snooze row revisions selectable while their replacements are in flight.
 let releaseRefresh;const refreshGate=new Promise(resolve=>{releaseRefresh=resolve;});
 const heldRefreshes=[];
 const holdRefresh=route=>{const pending=(async()=>{const response=await route.fetch();await refreshGate;await route.fulfill({response});})();heldRefreshes.push(pending);return pending;};
 if(width===1440)await page.route('**/api/triage?*',holdRefresh);
 try{
  const refreshing=width===1440?page.waitForRequest(request=>new URL(request.url()).pathname==='/api/triage'):null;
  await bulk.getByRole('button',{name:'Apply to 2 incidents',exact:true}).click();await page.getByText('2 changed; 0 refused',{exact:true}).waitFor();
  if(refreshing){await refreshing;assert.equal(await page.getByLabel('Select '+a.title,{exact:true}).isDisabled(),true,'post-save triage refresh keeps stale row revisions unselectable');}
 }finally{releaseRefresh();await Promise.all(heldRefreshes);if(width===1440)await page.unroute('**/api/triage?*',holdRefresh);}
 await bulk.getByRole('button',{name:'Clear selection',exact:true}).click();await selectSources();bulk=page.getByRole('region',{name:'Bulk incident actions',exact:true});await bulk.getByLabel('Bulk action',{exact:true}).selectOption('merge');await bulk.getByLabel('Merge target',{exact:true}).selectOption(target.id);await bulk.getByLabel('Bulk action reason',{exact:true}).fill('One response owns the common failure');await bulk.getByRole('button',{name:'Apply to 2 incidents',exact:true}).click();await page.getByText('2 changed; 0 refused',{exact:true}).waitFor();await bulk.getByText(/saved · revision/).first().waitFor();
 await bulk.screenshot({path:`${directory}/OC-079-merge-${width}.png`});await bulk.getByRole('button',{name:'Clear selection',exact:true}).click();
 const source='synthetic-oncall-'+(6600+width),key=randomBytes(32).toString('hex');await call('/api/sources',{id:source,key,scopes:[service.id]});
 for(let n=0;n<2;n++){
  const signal={source,eventId:'synthetic-oncall-'+(width*10+n),service:service.id,environment:service.environment,key:'synthetic-oncall-'+(width*10+n),generation:'synthetic-oncall-'+(width*10+n),intent:'trigger',severity:'warning',title:prefix+' alert '+n,observedAt:new Date().toISOString(),evidence:''};
  const response=await context.request.post(origin+'/api/ingress/'+source,{headers:{origin,authorization:'Bearer '+key},data:signal});assert.equal(response.status(),201);
 }
 await page.getByLabel('Triage items',{exact:true}).selectOption('alerts');await page.getByLabel('Search incidents',{exact:true}).fill(prefix+' alert');await page.getByText('2 matching alert-only items',{exact:true}).waitFor();
 await page.getByRole('checkbox',{name:/^Select /}).first().check();await page.getByRole('button',{name:'Select all 2 matching',exact:true}).click();bulk=page.getByRole('region',{name:'Bulk incident actions',exact:true});await bulk.getByLabel('Bulk action',{exact:true}).selectOption('resolve');await bulk.getByRole('button',{name:'Apply to 2 alert-only items',exact:true}).click();await page.getByText('2 changed; 0 refused',{exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const axe=await new AxeBuilder({page}).include('[aria-label="Bulk incident actions"]').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
 await page.getByRole('region',{name:'Incident triage',exact:true}).screenshot({path:`${directory}/OC-079-alert-close-${width}.png`});
 await page.getByRole('region',{name:'Incident triage',exact:true}).getByRole('button').filter({has:page.getByRole('heading',{name:'Alert-only: '+prefix+' alert 0',exact:true})}).click();const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:prefix+' alert 0',exact:true})});await card.getByText('Event context',{exact:true}).click();await card.getByText(/Coordination: closed/).waitFor();await card.getByText('Coordination history',{exact:true}).click();await card.getByText(/stopped by human resolution/).waitFor();await card.screenshot({path:`${directory}/OC-079-alert-history-${width}.png`});
 const after=await call('/api/state');assert.equal(after.incidents.length,state.incidents.length+3,'alert-only close creates no incident');assert.ok(after.incidents.filter(i=>[a.id,b.id].includes(i.id)).every(i=>i.mergedInto.target===target.id));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.goto(origin+'/incidents');
 // OC-043: author a durable selected-alert workflow, close its client state, then resume from saved custody.
 const workflowTitle='Synthetic workflow '+width;
 for(let n=0;n<3;n++){
  const identity='synthetic-oncall-437-'+width+'-'+n;
  const response=await context.request.post(origin+'/api/ingress/'+source,{headers:{origin,authorization:'Bearer '+key},data:{source,eventId:identity,service:service.id,environment:service.environment,key:identity,generation:identity,intent:'trigger',severity:'warning',title:workflowTitle+' '+n,observedAt:new Date().toISOString(),evidence:''}});assert.equal(response.status(),201);
 }
 await page.goto(origin+'/incidents?triage_kind=alerts&triage_q='+encodeURIComponent(workflowTitle));await page.getByText('3 matching alert-only items',{exact:true}).waitFor();
 for(let n=0;n<3;n++)await page.getByLabel('Select '+workflowTitle+' '+n,{exact:true}).check();
 bulk=page.getByRole('region',{name:'Bulk incident actions',exact:true});await bulk.getByLabel('Bulk action',{exact:true}).selectOption('reassign');
 await bulk.getByLabel('Bulk assignee',{exact:true}).selectOption((await call('/api/session')).member.id);
 await bulk.getByLabel('Bulk action reason',{exact:true}).fill('Synthetic ordered handoff');await bulk.getByLabel('Save reassignment as a resumable workflow',{exact:true}).check();
 const workflowCheck=async label=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0);assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations,[]);await page.screenshot({path:`${directory}/oc043-workflow-${label}-${width}.png`,fullPage:true});await page.screenshot({path:`${directory}/oc043-workflow-${label}-focus-${width}.png`});};
 await workflowCheck('review');await bulk.getByRole('button',{name:'Apply to 3 alert-only items',exact:true}).click();
 await page.getByText('2 changed; 0 refused; 1 pending — submit the same action to resume',{exact:true}).waitFor();await page.reload();
 await page.getByText('Recorded coordination workflows',{exact:true}).click();const workflow=page.locator('details.triage-bulk > ul > li').last();await workflow.getByText('2 of 3 processed · 0 refused',{exact:true}).waitFor();
 await workflow.scrollIntoViewIfNeeded();await workflowCheck('pending');await workflow.getByRole('button',{name:'Resume recorded reassignment',exact:true}).click();
 await workflow.getByText('3 of 3 processed · 0 refused',{exact:true}).waitFor();await workflow.getByText('Complete · recorded reassignment',{exact:true}).waitFor();assert.equal(await workflow.getByRole('button',{name:'Resume recorded reassignment',exact:true}).count(),0);await workflowCheck('complete');
 console.log(`OC-043 browser ${width}: selected durable reassignment, saved pending plan after reload, explicit resume and completion, axe, overflow and hydration passed`);
 // Versioned declaration/notification steps reuse the same saved workflow and progress area.
 const coordinator=(await call('/api/session')).member,newServiceId='synthetic-oncall-443-'+width;
 await call('/api/command',{type:'service',id:newServiceId,name:'Synthetic coordination '+width,environment:'test',owner:coordinator.id,runbook:['Synthetic frozen runbook'],pager:''});
 await call('/api/command',{type:'service-template',service:newServiceId,baseVersion:0,severityWording:{critical:'Synthetic blocked',warning:'Synthetic delayed',info:'Synthetic investigation'},impactPrompt:'Synthetic impact',incidentTypes:[],checklist:[{id:'synthetic-oncall-443',text:'Synthetic frozen checklist'}],reason:'Synthetic reviewed template'});
 const newSource='synthetic-oncall-444-'+width,newKey=randomBytes(32).toString('hex'),newTitle='Synthetic declaration workflow '+width;await call('/api/sources',{id:newSource,key:newKey,scopes:[newServiceId]});
 for(let n=0;n<2;n++){const identity='synthetic-oncall-444-'+width+'-'+n;const response=await context.request.post(origin+'/api/ingress/'+newSource,{headers:{origin,authorization:'Bearer '+newKey},data:{source:newSource,eventId:identity,service:newServiceId,environment:'test',key:identity,generation:identity,intent:'trigger',severity:'warning',title:newTitle+' '+n,observedAt:new Date().toISOString(),evidence:''}});assert.equal(response.status(),201);}
 await page.goto(origin+'/incidents?triage_kind=alerts&triage_q='+encodeURIComponent(newTitle));await page.getByText('2 matching alert-only items',{exact:true}).waitFor();
 for(let n=0;n<2;n++)await page.getByLabel('Select '+newTitle+' '+n,{exact:true}).check();
 bulk=page.getByRole('region',{name:'Bulk incident actions',exact:true});await bulk.getByLabel('Bulk action',{exact:true}).selectOption('orchestrate');await bulk.getByLabel('Recorded notification responder',{exact:true}).selectOption(coordinator.id);await bulk.getByLabel('Bulk action reason',{exact:true}).fill('Synthetic approved coordination');
 const previewBefore=await call('/api/state');await bulk.getByRole('button',{name:'Compare workflow steps',exact:true}).click();await bulk.getByText('Ordered comparison · no effects',{exact:true}).waitFor();assert.deepEqual(await call('/api/state'),previewBefore);await workflowCheck('declare-review');
 await bulk.getByRole('button',{name:'Apply to 2 alert-only items',exact:true}).click();await page.getByText('2 steps recorded; 0 refused; 2 pending — submit the same action to resume',{exact:true}).waitFor();await page.reload();await page.getByText('Recorded coordination workflows',{exact:true}).click();
 const declarationWorkflow=page.locator('details.triage-bulk > ul > li').last();await declarationWorkflow.getByText('2 of 4 processed · 0 refused',{exact:true}).waitFor();await declarationWorkflow.scrollIntoViewIfNeeded();await workflowCheck('declare-pending');await declarationWorkflow.getByRole('button',{name:'Resume recorded workflow',exact:true}).click();await declarationWorkflow.getByText('4 of 4 processed · 0 refused',{exact:true}).waitFor();await declarationWorkflow.getByText('Complete · recorded declaration and notification',{exact:true}).waitFor();await workflowCheck('declare-complete');
 const declared=(await call('/api/state')).incidents.filter(row=>row.service===newServiceId);assert.equal(declared.length,2);for(const incident of declared){assert.equal(incident.template.version,1);assert.equal(incident.template.checklist[0].text,'Synthetic frozen checklist');assert.equal(incident.responderRequests.length,1);assert.equal(incident.responderRequests[0].obligation.label,'no sender');assert.equal(incident.responderRequests[0].obligation.automatic,false);}
 // Generalized transformation is visible beside the retained original on Alerts and in triage.
 const transformIdentity='synthetic-oncall-438-'+width,transformTitle='Synthetic transformed alert '+width;
 const transformationPolicy=await call('/api/command',{type:'policy',service:newServiceId,severity:'*',action:'route',owner:coordinator.id,reason:'Synthetic reviewed classification',baseVersion:0,transformation:{field:'severity',values:{critical:{severity:'warning',priority:'P3'}},allowLowering:true,reason:'Synthetic reviewed customer-impact lowering'}});
 const transformResponse=await context.request.post(origin+'/api/ingress/'+newSource,{headers:{origin,authorization:'Bearer '+newKey},data:{source:newSource,eventId:transformIdentity,service:newServiceId,environment:'test',key:transformIdentity,generation:transformIdentity,intent:'trigger',severity:'critical',priority:'P1',title:transformTitle,observedAt:new Date().toISOString(),evidence:''}});assert.equal(transformResponse.status(),201);
 await page.goto(origin+'/alerts');await openWorkspaceSection(page,'alerts');await focusWorkspace(page);await page.locator('.alert-row').filter({hasText:transformTitle}).click();
 const transformCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:transformTitle,exact:true})});await transformCard.getByText('warning',{exact:true}).waitFor();await transformCard.getByText('Event context',{exact:true}).click();await transformCard.getByText(/Priority: P3/).waitFor();await transformCard.getByText(/Original severity: critical \/ P1 → warning \/ P3/).waitFor();await transformCard.getByText(/Synthetic reviewed customer-impact lowering/).waitFor();await workflowCheck('transformation-alert');
 await page.goto(origin+'/incidents?triage_kind=alerts&triage_q='+encodeURIComponent(transformTitle));await page.getByText('1 matching alert-only items',{exact:true}).waitFor();await page.getByRole('region',{name:'Incident triage',exact:true}).getByRole('button').filter({has:page.getByRole('heading',{name:'Alert-only: '+transformTitle,exact:true})}).getByText(/^warning$/i).waitFor();await workflowCheck('transformation-triage');
 const replayEvent=(await call('/api/state')).events.find(event=>event.title===transformTitle),routedId='synthetic-oncall-445-'+width,routedKey=randomBytes(32).toString('hex');
 const routedDefinition=await call('/api/routing/keys',{id:routedId,name:'Synthetic transformed routing '+width,provider:'pagerduty',scope:[newServiceId],owner:coordinator.id,key:routedKey,revision:0,rules:[],catchAll:newServiceId},201);
 const routedResponse=await context.request.post(origin+'/v2/enqueue',{data:{routing_key:routedKey,event_action:'trigger',dedup_key:routedId,payload:{summary:'Synthetic routed transformation '+width,source:routedId,severity:'critical'}}});assert.equal(routedResponse.status(),202);
 await page.reload();await openWorkspaceSection(page,'routing');await selectRoutedSource(page,routedId);
 let routedAttempts=0;const routedPath='**/api/routing/keys/'+routedId+'/preview';
 const loseRoutingResponse=async route=>{routedAttempts++;if(routedAttempts===1){const actual=await route.fetch();assert.equal(actual.status(),200);await actual.dispose();await route.abort('connectionfailed');}else await route.continue();};
 await page.route(routedPath,loseRoutingResponse);
 const beforeRoutingPreview=await call('/api/state');await page.getByRole('button',{name:'Preview routing changes',exact:true}).click();const routingPreview=page.getByRole('region',{name:'Routing preview',exact:true});await routingPreview.getByText('1 retained events compared. No records changed.',{exact:true}).waitFor();
 await routingPreview.getByText('Proposed: routing v'+routedDefinition.routing.versions.at(-1).version+' · service rule v'+transformationPolicy.version+' · route · owner '+coordinator.name+'.',{exact:true}).waitFor();assert.equal(await routingPreview.getByText(/Original event .*critical \/ unset → warning \/ P3/).count(),2);assert.deepEqual(await call('/api/state'),beforeRoutingPreview);assert.equal(routedAttempts,2);await page.unroute(routedPath,loseRoutingResponse);await routingPreview.scrollIntoViewIfNeeded();await workflowCheck('transformation-routing-replay');
 await openHistoryComparison(page);
 let serviceAttempts=0;const servicePath='**/api/replay';
 const loseServiceResponse=async route=>{serviceAttempts++;if(serviceAttempts===1){const actual=await route.fetch();assert.equal(actual.status(),200);await actual.dispose();await route.abort('connectionfailed');}else await route.continue();};
 await page.route(servicePath,loseServiceResponse);
 const beforeServiceReplay=await call('/api/state');await page.getByLabel('Event JSON',{exact:true}).fill(JSON.stringify([replayEvent]));await page.getByRole('button',{name:'Compare pasted events',exact:true}).click();const serviceReplay=page.getByRole('region',{name:'Replay comparison',exact:true});await serviceReplay.getByText('Historical decision',{exact:true}).waitFor();assert.equal(await serviceReplay.getByText(/critical \/ P1 → warning \/ P3/).count(),2);assert.deepEqual(await call('/api/state'),beforeServiceReplay);assert.equal(serviceAttempts,2);await page.unroute(servicePath,loseServiceResponse);await serviceReplay.scrollIntoViewIfNeeded();await workflowCheck('transformation-service-replay');await page.getByRole('button',{name:'Close comparison',exact:true}).click();
 let mutationAttempts=0;const publishPath='**/api/routing/keys/'+routedId+'/publish';
 const losePublishedResponse=async route=>{mutationAttempts++;const actual=await route.fetch();assert.equal(actual.status(),201);await actual.dispose();await route.abort('connectionfailed');};
 await page.route(publishPath,losePublishedResponse);await page.getByLabel('Catch-all for unmatched events',{exact:true}).selectOption('');await page.getByRole('button',{name:/^Publish version /}).click();await page.getByRole('button',{name:/^Publish version /}).last().click();await page.locator('.failure-line[role="alert"]').waitFor();assert.equal(mutationAttempts,1,'a mutating POST is never automatically repeated after an uncertain response');
 assert.equal((await call('/api/state')).intakeSources.find(source=>source.id===routedId).routing.versions.length,routedDefinition.routing.versions.length+1);await page.unroute(publishPath,losePublishedResponse);await workflowCheck('mutation-response-interrupted');await page.reload();
 console.log(`OC-043 transformation browser ${width}: Alerts, triage, routed replay and service replay show original/effective classifications and versions; lost comparison responses recover through one real retry without state effects; mutations remain one attempt; axe, overflow and hydration passed`);
 console.log(`OC-043 declaration browser ${width}: zero-write ordered comparison, saved pending declaration/notification progress after reload, explicit completion, frozen checklist and recorded no-sender obligations; axe, overflow and hydration passed`);
 console.log(`OC-079 browser ${width}: selected snooze, merge target and per-item receipts, confirmed alert-only close, retained human-resolution history, no fabricated incident, axe and overflow passed`);
 // Rule approval uses the service's existing Settings controls and saved progress.
 await page.goto(origin+'/settings/services/'+encodeURIComponent(newServiceId));
 const ruleCard=page.locator('.service-page'),ruleForm=ruleCard.locator('.service-workflow');
 await ruleForm.locator(':scope > summary').click();
 await ruleForm.getByLabel('Workflow responder',{exact:true}).selectOption(coordinator.id);await ruleForm.getByLabel('Workflow purpose',{exact:true}).fill('Synthetic approved coordination '+width);
 await ruleForm.getByRole('button',{name:/^Approve version/}).click();await ruleForm.getByLabel('Reason',{exact:true}).fill('Synthetic approved coordination '+width);
 const approved=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().postDataJSON()?.workflow?.approved===true);
 await ruleForm.getByRole('button',{name:/^Approve version/}).click();assert.equal((await approved).status(),200);await workflowCheck('rule-authoring');
 const approvedState=await call('/api/state'),approvedPolicy=approvedState.policies.find(p=>p.service===newServiceId&&p.severity==='*'),ruleIdentity='synthetic-oncall-446-'+width;
 const ruleSignal={source:newSource,eventId:ruleIdentity,service:newServiceId,environment:'test',key:ruleIdentity,generation:ruleIdentity,intent:'trigger',severity:'warning',title:'Synthetic approved launch '+width,observedAt:new Date().toISOString(),evidence:''};
 await openWorkspaceSection(page,'routing');await openHistoryComparison(page);await page.getByLabel('Event JSON',{exact:true}).fill(JSON.stringify([ruleSignal]));await page.getByRole('button',{name:'Compare pasted events',exact:true}).click();const ruleReplay=page.getByRole('region',{name:'Replay comparison',exact:true});await ruleReplay.getByText(/^Proposed workflow: reassign → declare → notify\. Recorded obligation only; no effects\.$/).waitFor();await ruleReplay.scrollIntoViewIfNeeded();await workflowCheck('rule-replay');await page.getByRole('button',{name:'Close comparison',exact:true}).click();
 const admitted=await context.request.post(origin+'/api/ingress/'+newSource,{headers:{origin,authorization:'Bearer '+newKey},data:ruleSignal});assert.equal(admitted.status(),201);
 const launched=(await call('/api/state')).triage.find(r=>r.kind==='bulk'&&r.rule?.policy===approvedPolicy.id);assert.equal(launched.results.length,1);assert.equal(launched.results[0].step,'reassign');
 await page.goto(origin+'/incidents');await page.getByText('Recorded coordination workflows',{exact:true}).click();
 const launchedProgress=page.locator('details.triage-bulk > ul > li').filter({hasText:'Operation '+launched.id});await launchedProgress.getByText('1 of 3 processed · 0 refused',{exact:true}).waitFor();await launchedProgress.scrollIntoViewIfNeeded();await workflowCheck('rule-launched');
 await page.reload();await page.getByText('Recorded coordination workflows',{exact:true}).click();await launchedProgress.getByRole('button',{name:'Resume recorded workflow',exact:true}).click();await launchedProgress.getByText('2 of 3 processed · 0 refused',{exact:true}).waitFor();await workflowCheck('rule-declared');
 await launchedProgress.getByRole('button',{name:'Resume recorded workflow',exact:true}).click();await launchedProgress.getByText('3 of 3 processed · 0 refused',{exact:true}).waitFor();await workflowCheck('rule-complete');
 assert.equal((await call('/api/state')).triage.find(r=>r.id===launched.id).rule.state,'complete');
 console.log(`OC-043 approved rule browser ${width}: Settings approval, launch versions, saved progress across reload, explicit declaration/notification, axe, overflow and hydration passed`);

}


// alert-severity-browser: part of this public journey.
// One core flow: admitted monitoring events -> visible severity -> declared incident -> stored severity.
export async function alertSeverity(page,context,width) {
 const origin=new URL(page.url()).origin
 const state=await (await context.request.get('/api/state')).json()
 const service=state.services.find(service=>service.name==='Checkout')
 const source='severity-'+width,key='test-source-'+randomUUID()
 const created=await context.request.post('/api/sources',{headers:{origin},data:{id:source,key,scopes:[service.id],mode:'bearer'}})
 assert.equal(created.status(),200)
 for(const severity of ['critical','warning','info']) {
  const event={source,eventId:severity+'-trigger',service:service.id,environment:service.environment,key:severity,generation:'g1',intent:'trigger',severity,title:`Checkout ${severity} ${width}`,observedAt:new Date().toISOString(),evidence:''}
  assert.equal((await context.request.post('/api/ingress/'+source,{headers:{authorization:'Bearer '+key},data:event})).status(),201)
  // A lower-severity recovery receipt must not erase the urgent trigger's severity.
  if(severity==='critical') assert.equal((await context.request.post('/api/ingress/'+source,{headers:{authorization:'Bearer '+key},data:{...event,eventId:'critical-recovery',intent:'recover',severity:'info'}})).status(),201)
 }
 await openWorkspaceSection(page,'alerts')
 await focusWorkspace(page)
 for(const severity of ['critical','warning','info']) {
  const title=`Checkout ${severity} ${width}`
  await page.locator('.alert-row').filter({hasText:title}).click()
  const card=page.getByRole('article',{name:'Alert details',exact:true})
  await card.locator('.priority').filter({hasText:severity}).waitFor()
  await page.goto(origin+'/alerts')
 }
 await page.screenshot({path:`evidence/browser/alert-severity-${width}.png`,fullPage:true})
 for(const severity of ['critical','warning','info']) {
  const title=`Checkout ${severity} ${width}`
  await page.locator('.alert-row').filter({hasText:title}).click()
  const card=page.getByRole('article',{name:'Alert details',exact:true})
  await card.getByRole('button',{name:'Declare incident from alert',exact:true}).click()
  await page.locator('.detail').getByRole('heading',{name:title,exact:true}).waitFor()
  const stored=await (await context.request.get('/api/state')).json()
  const incident=stored.incidents.find(incident=>incident.title===title)
  assert.equal(incident.severity,severity,'declaring from alert preserves its severity')
  assert.equal(incident.alerts.length,1,'declaration keeps the source alert linked')
  const people=await openIncidentAction(page,'People and priority')
  assert.equal(await people.getByLabel('Severity',{exact:true}).inputValue(),severity,'the incident severity is preserved in its per-value control')
  await people.getByRole('button',{name:'Close',exact:true}).click()
  if(severity==='critical') await page.screenshot({path:`evidence/browser/declared-critical-${width}.png`,fullPage:true})
  await openWorkspaceSection(page,'alerts')
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'alert list fits viewport')
 await singleIncidentPerAlert(page,context,width,service,source,key)
}

// One core flow: concurrent declarations, a retry and a reload all keep one incident per alert.
async function singleIncidentPerAlert(page,context,width,service,source,key) {
 const origin=new URL(page.url()).origin,title=`Checkout elevated error rate ${width}`
 const event={source,eventId:'concurrent-trigger',service:service.id,environment:service.environment,key:'concurrent',generation:'g1',intent:'trigger',severity:'critical',title,observedAt:new Date().toISOString()}
 assert.equal((await context.request.post('/api/ingress/'+source,{headers:{authorization:'Bearer '+key},data:event})).status(),201)
 const state=await (await context.request.get('/api/state')).json()
 const alert=state.alerts.find(alert=>alert.events.some(id=>state.events.some(event=>event.id===id&&event.eventId==='concurrent-trigger'&&event.source===source)))
 const data={type:'declare',service:service.id,title,severity:'critical',summary:'Customers see failed checkout requests',alerts:[alert.id]}
 const results=await Promise.all([0,1].map(()=>context.request.post('/api/command',{headers:{origin},data})))
 assert.deepEqual(results.map(result=>result.status()).sort(),[200,409],'only one simultaneous declaration is saved')
 assert.equal((await context.request.post('/api/command',{headers:{origin},data})).status(),409,'a repeated declaration is refused')
 await page.reload()
 await page.locator('.alert-row').filter({hasText:title}).click()
 const card=page.getByRole('article',{name:'Alert details',exact:true})
 const link=card.getByRole('link',{name:'In incident '+title,exact:true})
 await link.waitFor()
 assert.equal(await card.getByRole('button',{name:'Declare incident from alert',exact:true}).count(),0)
 const saved=await (await context.request.get('/api/state')).json()
 assert.equal(saved.incidents.filter(incident=>incident.alerts.includes(alert.id)).length,1)
 await page.screenshot({path:`evidence/browser/alert-linked-incident-${width}.png`,fullPage:true})
 await link.click()
 await page.locator('.detail').getByRole('heading',{name:title,exact:true}).waitFor()
 await page.screenshot({path:`evidence/browser/alert-linked-incident-open-${width}.png`,fullPage:true})
 await openWorkspaceSection(page,'alerts')
}


// keyboard-coordination: part of this public journey.
export async function keyboardCoordination(page,context,width,ownerLink,openSession) {
 const key=keyboardUser(page),directory=process.env.ONCALL_BROWSER_EVIDENCE??'./evidence/browser'
 await mkdir(directory,{recursive:true})
 const hostile=`<img data-hostile="oncall-probe" src="https://hostile.invalid/probe" onerror="window.__oncallHostile=true"><script data-hostile="oncall-probe">window.__oncallHostile=true</script>`
 const external=[];const observe=request=>{if(request.url().startsWith('https://hostile.invalid/'))external.push(request.url())};page.on('request',observe)
 // OC-008: author a runbook containing a link and HTML, then use its copied incident step.
 const runbookText=`https://hostile.invalid/runbook ${hostile}`
 await openWorkspaceSection(page,'services',{keyboard:true})
 await key.activate(page.getByRole('button',{name:'Add service',exact:true}))
 await key.text(page.getByLabel('Service name',{exact:true}),`Literal runbook ${width}`)
 await key.activate(page.getByRole('button',{name:'Create service',exact:true}))
 await page.getByRole('heading',{name:`Literal runbook ${width}`,exact:true}).waitFor()
 await key.text(page.getByLabel('Runbook steps (one per line)',{exact:true}),runbookText)
 const stored=await (await context.request.get('/api/state')).json()
 const service=stored.services.find(item=>item.name===`Literal runbook ${width}`)
 await openWorkspaceSection(page,'incidents',{keyboard:true})
 await key.activate(page.getByRole('button',{name:'Declare incident',exact:true}),'Space')
 await key.text(page.getByLabel('Incident title',{exact:true}),`Keyboard incident ${width}`)
 await key.option(page.getByLabel('Service',{exact:true}),service.id)
 await key.activate(page.locator('form').filter({has:page.getByRole('button',{name:'Declare',exact:true})}).getByText('More options',{exact:true}))
 await key.option(page.getByLabel('Page urgency',{exact:true}),'low')
 await key.option(page.getByLabel('Page priority',{exact:true}),'P2')
 await key.text(page.getByLabel('Customer impact and current evidence',{exact:true}),'Customer impact reviewed using the keyboard')
 await accessibleState(page,'declaration',width,page.getByRole('button',{name:'Declare',exact:true}))
 await page.keyboard.press('Enter')
 await page.getByRole('heading',{name:`Keyboard incident ${width}`,exact:true}).last().waitFor()
 const manualState=await (await context.request.get('/api/state')).json(),manual=manualState.incidents.find(i=>i.title===`Keyboard incident ${width}`);assert.equal(manual.urgency,'low');assert.equal(manual.priority,'P2');assert.ok(manual.manualPage.operation);assert.ok(manual.manualPage.obligations.every(o=>o.automatic===false&&o.paging==='off'));console.log('OC-068 keyboard manual page: urgency, priority, replay-safe operation and recorded target obligation persisted')
 // O8: a keyboard Lead choice commits one attributed timeline line.
 if(width===1440) {
  assert.equal(new URL(page.url()).pathname,'/incidents/'+manual.id,'Declare opens the new incident path')
  const beforeLead=await (await context.request.get('/api/state')).json()
  const beforeIncident=beforeLead.incidents.find(i=>i.id===manual.id)
  const {member:me}=await (await context.request.get('/api/session')).json()
  await key.activate(page.getByRole('button',{name:/^Lead:/}))
  const list=page.getByRole('listbox',{name:'Lead',exact:true})
  await list.waitFor();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter')
  await page.waitForFunction(({id,member})=>fetch('/api/state').then(r=>r.json()).then(s=>s.incidents.find(i=>i.id===id)?.commander===member),{id:manual.id,member:me.id})
  const afterLead=await (await context.request.get('/api/state')).json(),afterIncident=afterLead.incidents.find(i=>i.id===manual.id)
  assert.equal(afterIncident.timeline.length,beforeIncident.timeline.length+1,'one Lead choice creates one timeline line')
  assert.equal(afterIncident.timeline.at(-1).actor,me.id,'Lead change is attributed to the signed-in member')
 }
 const actions=page.getByRole('button',{name:'Incident actions',exact:true})
 await key.activate(actions)
 const menu=page.getByRole('dialog',{name:'Incident actions',exact:true});await key.dialog(menu)
 await key.activate(page.getByRole('menuitem',{name:'People and priority',exact:true}))
 const people=page.getByRole('dialog',{name:'People and priority',exact:true});await key.dialog(people)
 await accessibleState(page,'incident-dialog',width,people.getByRole('button',{name:'Close',exact:true}))
 await page.getByRole('tooltip',{name:'Close dialog',exact:true}).waitFor();await key.dismiss(people,actions)
 const step=page.getByRole('checkbox',{name:runbookText,exact:true})
 await key.activate(step,'Space')
 await page.waitForFunction(({title,text})=>fetch('/api/state').then(r=>r.json()).then(s=>s.incidents.some(i=>i.title===title&&i.runbook.some(r=>r.text===text&&r.done))),{title:`Keyboard incident ${width}`,text:runbookText})
 assert.equal(await page.getByRole('link',{name:runbookText,exact:true}).count(),0,'OC-008: runbook URLs remain literal text')
 await key.text(page.getByLabel('Observation, decision or evidence',{exact:true}),hostile)
 await key.activate(page.getByRole('button',{name:'Add note',exact:true}))
 // The runbook step's own entry also contains the hostile text: wait for the note itself.
 await page.locator('.timeline').getByText(hostile,{exact:true}).waitFor()
 await accessibleState(page,'notes',width,page.getByRole('button',{name:'Add note',exact:true}))
 assert.equal(await page.locator('[data-hostile="oncall-probe"]').count(),0,'hostile content creates no HTML elements')
 assert.equal(await page.evaluate(()=>window.__oncallHostile),undefined,'hostile script/handler did not execute')
 assert.deepEqual(external,[],'hostile text triggers no external fetch');page.off('request',observe)
 await step.scrollIntoViewIfNeeded()
 await page.screenshot({path:`${directory}/OC-008-literal-runbook-${width}.png`,fullPage:true})
 // Reuse the desktop assertions; record the same authored incident on the phone.
 await page.setViewportSize({width:390,height:1000})
 await page.screenshot({path:`${directory}/OC-052-literal-runbook-390.png`,fullPage:true})
 await page.setViewportSize({width,height:1000})
 const archive=await (await context.request.get('/api/archive')).json()
 const authored=archive.incidents.find(item=>item.title===`Keyboard incident ${width}`)
 assert.deepEqual(authored.runbook,[{text:runbookText,done:true}],'OC-008: export retains the authored runbook verbatim')
 assert.ok(authored.timeline.some(item=>item.text===hostile),'OC-008: export retains the hostile note as authored text')
 await key.activate(page.getByRole('button',{name:'Acknowledge',exact:true}))
 await page.locator('.incident-state').filter({hasText:'acknowledged'}).waitFor()
 const acknowledged=(await (await context.request.get('/api/state')).json()).incidents.find(incident=>incident.id===manual.id),actor=(await (await context.request.get('/api/session')).json()).member.id
 assert.equal(acknowledged.state,'acknowledged','protected readback confirms keyboard acknowledgment')
 assert.equal(acknowledged.commander,actor,'the acknowledging human becomes commander')
 assert.ok(acknowledged.timeline.some(entry=>entry.text===hostile&&entry.actor===actor),'protected readback retains the literal keyboard note and its actor')
 await accessibleState(page,'acknowledged',width,page.getByRole('button',{name:'Add note',exact:true}))
 console.log(`PROBE OC-009 declaration, acknowledgment and notes ${width}: native keyboard incident and action dialog -> protected incident, commander and literal attributed note retained; focus, Tab containment, Escape return, labels, overflow and axe passed`)
 // The existing desktop conflict is the acceptance-2 proof. The phone leg
 // adds the selected coordination screens, without duplicating the transport race.
 if(width!==1440)return
 // A separately authenticated HTTP context advances the real stored revision.
 // Delay this browser's real workspace reads while the second session wins,
 // so a live-update clock cannot make this stale-write transport case disappear.
 await focusWorkspace(page)
 let releaseWorkspace
 const workspaceGate=new Promise(resolve=>{releaseWorkspace=resolve})
 const heldReads=new Set()
 const holdWorkspace=route=>{
  const read=workspaceGate.then(()=>route.continue())
  heldReads.add(read)
  return read.finally(()=>heldReads.delete(read))
 }
 const releaseReads=async()=>{releaseWorkspace();await Promise.all([...heldReads]);await page.unroute('**/api/workspace',holdWorkspace)}
 await page.route('**/api/workspace',holdWorkspace)
 const second=await context.browser().newContext({baseURL:new URL(page.url()).origin})
 try {
  const secondPage=await second.newPage()
  if(openSession) await openSession(second,secondPage)
  else await secondPage.goto(ownerLink)
  await secondPage.waitForURL(url=>url.pathname==='/on-call'&&!url.hash,{timeout:60000})
  await secondPage.locator('.oncall-frame').waitFor({timeout:60000})
  const secondSession=await second.request.get('/api/session');assert.equal(secondSession.status(),200)
  assert.equal((await secondSession.json()).member.role,'admin','second session authenticates independently')
  assert.notDeepEqual(await second.cookies(),await context.cookies(),'second owner-open establishes independent session cookies')
  const current=await (await second.request.get('/api/state')).json(),incident=current.incidents.find(item=>item.title===`Keyboard incident ${width}`)
  const winner=await second.request.post('/api/command',{data:{type:'note',incident:incident.id,revision:incident.revision,text:'Second HTTP session wins'},headers:{origin:new URL(page.url()).origin}})
  assert.equal(winner.status(),200,'second session publishes the winning note')
  const before=await (await second.request.get('/api/state')).json()
  await key.text(page.getByLabel('Observation, decision or evidence',{exact:true}),'Losing browser note must not save')
  const rejected=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().method()==='POST')
  await key.activate(page.getByRole('button',{name:'Add note',exact:true}))
  assert.equal((await rejected).status(),409,'real stale browser write rejected by server')
  await releaseReads()
  await page.locator('.failure-line[role="alert"]').waitFor()
  assert.ok((await page.locator('.failure-line[role="alert"]').innerText()).length>0,'failed write is announced by an alert live region')
  await page.waitForFunction(()=>document.querySelector('.notice[role="status"]')?.textContent==='')
  assert.equal(await page.locator('.notice[role="status"]').innerText(),'','failed write never claims saved')
  assert.equal(await page.getByLabel('Observation, decision or evidence',{exact:true}).inputValue(),'Losing browser note must not save','failed draft remains editable')
  assert.deepEqual(await (await second.request.get('/api/state')).json(),before,'rejected write leaves the winning server data unchanged')
  await accessibleState(page,'rejected-write',width,page.getByRole('button',{name:'Add note',exact:true}))
  console.log('PROBE OC-009 stale write 1440: second authenticated HTTP session wins -> real 409, alert announcement, editable losing draft and no saved claim; winning data unchanged')
 } finally { await releaseReads();await second.close() }
}


// One desktop journey through the emitted production Worker and its browser UI.
export async function productBrowserJourney(page,context,{ownerLink,openSession,accessibilityOnly=false,setTime=async()=>{},triageProof}={}) {
 const key=keyboardUser(page)
 const session=await page.evaluate(async()=>await (await fetch('/api/session')).json())
 assert.equal(session.member.role,'admin');assert.ok(!page.url().includes('rer-dev'))
 await openWorkspaceSection(page,'services',{keyboard:true});await key.text(page.getByLabel('Service name',{exact:true}),'Checkout');await key.activate(page.getByRole('button',{name:'Create service',exact:true}));await page.getByRole('heading',{name:'Checkout',exact:true}).waitFor();await key.text(page.getByLabel('Runbook steps (one per line)',{exact:true}),'Verify recovery')
 if(accessibilityOnly){
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await setTime(keyboardInstant);
   await keyboardCoordination(page,context,width,ownerLink,openSession);
   await productSchedule(page,context,width,session,{ownerLink,selectedOnly:true,setTime});
  }
  return;
 }
 for(const width of [1440]) {
  await page.setViewportSize({width,height:1000})
  await setTime(keyboardInstant)
  await keyboardCoordination(page,context,width,ownerLink,openSession)
  await setTime(null)
  if(width===1440)await sharedIncidentLinks(page,context)
  await alertSeverity(page,context,width)
  if(width===1440)await productSchedule(page,context,width,session,{ownerLink,setTime})
  await triageFiltersBrowser(page,context,{setTime,proof:triageProof})
  await triageBulkBrowser(page,context,width)
  await productImport(page,context,width,session)
  await routingBrowser(page,context,width)
  await openWorkspaceSection(page,'routing');await openHistoryComparison(page);await page.getByLabel('Event JSON',{exact:true}).fill(JSON.stringify([{source:'browser',eventId:'replay-'+width,service:'checkout',environment:'production',key:'browser',generation:'g1',intent:'trigger',severity:'critical',title:'Replay '+width,observedAt:'2026-10-12T00:00:00.000Z'}]))
  // An ordinary pointer click where the button sits at the viewport's lower edge;
  // anything covering it there (such as a fixed dev identity badge) takes the click.
  const compare=page.getByRole('button',{name:'Compare pasted events',exact:true});await compare.evaluate(button=>button.scrollIntoView({block:'end'}));const box=await compare.boundingBox()
  const [replay]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/replay',{timeout:15000}),page.mouse.click(box.x+box.width/2,box.y+box.height/2)]);assert.equal(replay.status(),200)
  await page.getByLabel('Replay comparison',{exact:true}).waitFor();await page.getByRole('button',{name:'Close comparison',exact:true}).click()
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'routing viewport has no horizontal overflow')
  console.log(`Product browser journey ${width}: keyboard incident coordination, stale-write alert, hostile text, schedules, overrides, coverage/ICS, provider export, reviewed import/adoption/erasure, pointer replay and responsive layout passed`)
 }
 // OC-009's bounded phone leg reuses the selected flow; unrelated desktop
 // imports, routing, bulk actions and provider journeys keep their single width.
 await page.setViewportSize({width:390,height:1000})
 await setTime(keyboardInstant)
 await keyboardCoordination(page,context,390,ownerLink,openSession)
 await productSchedule(page,context,390,session,{ownerLink,selectedOnly:true,setTime})
 await page.setViewportSize({width:1440,height:1000})
}

async function sharedIncidentLinks(page,context) {
 const origin=new URL(page.url()).origin
 const state=await (await context.request.get('/api/state')).json(),incident=state.incidents.find(incident=>!incident.mergedInto)
 assert.ok(incident,'the existing coordination journey provides an incident to share')
 await page.addInitScript(()=>{
  window.__routeReplacements=[]
  const replace=history.replaceState.bind(history)
  history.replaceState=(data,unused,url)=>{
   if(url!=null){const next=new URL(url,location.href);if(next.href!==location.href)window.__routeReplacements.push(next.pathname)}
   return replace(data,unused,url)
  }
 })
 const destinations={incidents:'/incidents',alerts:'/alerts',services:'/settings/services',status:'/status',routing:'/settings/routing',schedules:'/on-call','move-in':'/settings/move-in',reviews:'/reviews',team:'/settings/team',archive:'/settings/archive'}
 const sections=Object.keys(destinations)
 // O4: the existing shared-entry step now exercises every moved server and hash address.
 const entries=[['/','/on-call'],...sections.map(section=>['/#'+section,destinations[section]]),...['services','routing','schedules','team','move-in','archive'].map(section=>['/'+section,destinations[section]]),['/settings','/settings/services'],['/?incident='+encodeURIComponent(incident.id)+'#incidents','/incidents/'+encodeURIComponent(incident.id)]]
 for(const [entry,path] of entries){
  const response=await page.goto(origin+entry)
  await page.waitForURL(url=>url.pathname===path)
  await page.locator('.shell-rail .navigation').waitFor()
  let redirects=0,request=response.request()
  while(request.redirectedFrom()){redirects++;request=request.redirectedFrom()}
  const replacements=await page.evaluate(()=>window.__routeReplacements)
  assert.equal(redirects+replacements.length,1,'a shared entry lands at its final section in one hop')
  console.log('Workspace path',entry,response.status(),new URL(page.url()).pathname,'hops',redirects+replacements.length)
 }
 const visitor=await context.browser().newContext()
 try{
  const entry=await visitor.newPage()
  for(const [old,path] of [['/#alerts','/alerts'],['/#schedules','/on-call'],['/?incident='+encodeURIComponent(incident.id)+'#incidents','/incidents/'+encodeURIComponent(incident.id)]]){
   await entry.goto(origin+old)
   await entry.waitForURL(url=>url.pathname===path)
   assert.equal(await entry.locator('.detail').count(),0,'shared guest entries retain the sign-in lobby without incident data')
  }
 }finally{await visitor.close()}
 await page.locator('.detail').getByRole('heading',{name:incident.title,exact:true}).waitFor()
 const shell=await page.locator('.app').elementHandle()
 try{
  for(const section of sections){
   await openWorkspaceSection(page,section)
   assert.ok(await shell.evaluate(element=>element.isConnected),'workspace navigation retains the shell')
  }
 }finally{await shell.dispose()}
 await page.goto(origin+'/incidents/'+encodeURIComponent('missing-'+incident.id))
 const back=page.locator('.workspace-not-found a[href="/on-call"]')
 await back.waitFor()
 assert.equal(await page.locator('.detail').count(),0,'a missing shared incident never opens a different incident')
 await back.click()
 await page.waitForURL(url=>url.pathname==='/on-call')
}
