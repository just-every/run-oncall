import {openWorkspaceSection} from './keyboard.mjs'
import assert from 'node:assert/strict'
import {keyboardUser,focusWorkspace} from './keyboard.mjs'

export async function keyboardCoordination(page,context,width,ownerLink,openSession) {
 const key=keyboardUser(page)
 const hostile=`<img data-hostile="oncall-probe" src="https://hostile.invalid/probe" onerror="window.__oncallHostile=true"><script data-hostile="oncall-probe">window.__oncallHostile=true</script>`
 const external=[];const observe=request=>{if(request.url().startsWith('https://hostile.invalid/'))external.push(request.url())};page.on('request',observe)
 // OC-008: author a runbook containing a link and HTML, then use its copied incident step.
 const runbookText=`https://hostile.invalid/runbook ${hostile}`
 await openWorkspaceSection(page,'services',{keyboard:true})
 await key.text(page.getByLabel('Service name',{exact:true}),`Literal runbook ${width}`)
 await key.text(page.locator('form').filter({has:page.getByRole('button',{name:'Create service',exact:true})}).getByLabel('Runbook steps (one per line)'),runbookText)
 await key.activate(page.getByRole('button',{name:'Create service',exact:true}))
 await page.getByRole('heading',{name:`Literal runbook ${width}`,exact:true}).waitFor()
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
 await key.focusScreenshot(page.getByRole('button',{name:'Declare',exact:true}),`evidence/browser/keyboard-coordination-${width}.png`)
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
  await key.activate(page.getByRole('button',{name:'Incident actions',exact:true}))
  await key.activate(page.getByRole('menuitem',{name:'People and priority',exact:true}))
  await key.activate(page.getByRole('button',{name:'Close',exact:true}),'Escape')
 }
 const step=page.getByRole('checkbox',{name:runbookText,exact:true})
 await key.activate(step,'Space')
 await page.waitForFunction(({title,text})=>fetch('/api/state').then(r=>r.json()).then(s=>s.incidents.some(i=>i.title===title&&i.runbook.some(r=>r.text===text&&r.done))),{title:`Keyboard incident ${width}`,text:runbookText})
 assert.equal(await page.getByRole('link',{name:runbookText,exact:true}).count(),0,'OC-008: runbook URLs remain literal text')
 await key.text(page.getByLabel('Observation, decision or evidence',{exact:true}),hostile)
 await key.activate(page.getByRole('button',{name:'Add note',exact:true}))
 // The runbook step's own entry also contains the hostile text: wait for the note itself.
 await page.locator('.timeline').getByText(hostile,{exact:true}).waitFor()
 assert.equal(await page.locator('[data-hostile="oncall-probe"]').count(),0,'hostile content creates no HTML elements')
 assert.equal(await page.evaluate(()=>window.__oncallHostile),undefined,'hostile script/handler did not execute')
 assert.deepEqual(external,[],'hostile text triggers no external fetch');page.off('request',observe)
 await step.scrollIntoViewIfNeeded()
 await page.screenshot({path:`evidence/browser/OC-008-literal-runbook-${width}.png`,fullPage:true})
 const archive=await (await context.request.get('/api/archive')).json()
 const authored=archive.incidents.find(item=>item.title===`Keyboard incident ${width}`)
 assert.deepEqual(authored.runbook,[{text:runbookText,done:true}],'OC-008: export retains the authored runbook verbatim')
 assert.ok(authored.timeline.some(item=>item.text===hostile),'OC-008: export retains the hostile note as authored text')
 await key.activate(page.getByRole('button',{name:'Acknowledge',exact:true}))
 await page.locator('.incident-state').filter({hasText:'acknowledged'}).waitFor()
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
  await key.focusScreenshot(page.getByRole('button',{name:'Add note',exact:true}),`evidence/browser/keyboard-rejected-write-${width}.png`)
 } finally { await releaseReads();await second.close() }
}
