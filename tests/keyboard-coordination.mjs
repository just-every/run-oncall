import assert from 'node:assert/strict'
import {keyboardUser} from './keyboard.mjs'

export async function keyboardCoordination(page,context,width,ownerLink,openSession) {
 const key=keyboardUser(page)
 await key.activate(page.getByRole('link',{name:'Incidents',exact:true}))
 await key.activate(page.getByRole('button',{name:'Declare incident',exact:true}),'Space')
 await key.text(page.getByLabel('Incident title',{exact:true}),`Keyboard incident ${width}`)
 await key.text(page.getByLabel('Customer impact and current evidence',{exact:true}),'Customer impact reviewed using the keyboard')
 await key.focusScreenshot(page.getByRole('button',{name:'Declare',exact:true}),`evidence/browser/keyboard-coordination-${width}.png`)
 await page.keyboard.press('Enter')
 await page.getByRole('heading',{name:`Keyboard incident ${width}`,exact:true}).last().waitFor()
 const hostile=`<img data-hostile="oncall-probe" src="https://hostile.invalid/probe" onerror="window.__oncallHostile=true"><script data-hostile="oncall-probe">window.__oncallHostile=true</script>`
 const external=[];const observe=request=>{if(request.url().startsWith('https://hostile.invalid/'))external.push(request.url())};page.on('request',observe)
 await key.text(page.getByLabel('Observation, decision or evidence',{exact:true}),hostile)
 await key.activate(page.getByRole('button',{name:'Add timeline note',exact:true}))
 await page.locator('.event p').filter({hasText:hostile}).waitFor()
 assert.equal(await page.locator('[data-hostile="oncall-probe"]').count(),0,'hostile content creates no HTML elements')
 assert.equal(await page.evaluate(()=>window.__oncallHostile),undefined,'hostile script/handler did not execute')
 assert.deepEqual(external,[],'hostile text triggers no external fetch');page.off('request',observe)
 await key.text(page.getByLabel('Reason and observed outcome',{exact:true}),'Owner acknowledges responsibility')
 await key.activate(page.getByRole('button',{name:'Record transition',exact:true}))
 await page.locator('.status-mark').filter({hasText:'acknowledged'}).waitFor()
 // A separately authenticated HTTP context advances the real stored revision.
 // The browser keeps its earlier version, so its next ordinary UI write loses.
 const second=await context.browser().newContext({baseURL:new URL(page.url()).origin})
 try {
  const secondPage=await second.newPage()
  if(openSession) await openSession(second,secondPage)
  else await secondPage.goto(ownerLink)
  await secondPage.waitForURL(url=>url.pathname==='/'&&!url.hash,{timeout:60000})
  await secondPage.getByRole('link',{name:'Services',exact:true}).waitFor({timeout:60000})
  const secondSession=await second.request.get('/api/session');assert.equal(secondSession.status(),200)
  assert.equal((await secondSession.json()).member.role,'admin','second session authenticates independently')
  assert.notDeepEqual(await second.cookies(),await context.cookies(),'second owner-open establishes independent session cookies')
  const current=await (await second.request.get('/api/state')).json(),incident=current.incidents.find(item=>item.title===`Keyboard incident ${width}`)
  const winner=await second.request.post('/api/command',{data:{type:'note',incident:incident.id,revision:incident.revision,text:'Second HTTP session wins'},headers:{origin:new URL(page.url()).origin}})
  assert.equal(winner.status(),200,'second session publishes the winning note')
  const before=await (await second.request.get('/api/state')).json()
  await key.text(page.getByLabel('Observation, decision or evidence',{exact:true}),'Losing browser note must not save')
  const rejected=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().method()==='POST')
  await key.activate(page.getByRole('button',{name:'Add timeline note',exact:true}))
  assert.equal((await rejected).status(),409,'real stale browser write rejected by server')
  await page.locator('.error[role="alert"]').waitFor()
  assert.ok((await page.locator('.error[role="alert"]').innerText()).length>0,'failed write is announced by an alert live region')
  await page.waitForFunction(()=>document.querySelector('.notice[role="status"]')?.textContent==='')
  assert.equal(await page.locator('.notice[role="status"]').innerText(),'','failed write never claims saved')
  assert.equal(await page.getByLabel('Observation, decision or evidence',{exact:true}).inputValue(),'Losing browser note must not save','failed draft remains editable')
  assert.deepEqual(await (await second.request.get('/api/state')).json(),before,'rejected write leaves the winning server data unchanged')
  await key.focusScreenshot(page.getByRole('button',{name:'Add timeline note',exact:true}),`evidence/browser/keyboard-rejected-write-${width}.png`)
 } finally { await second.close() }
}
