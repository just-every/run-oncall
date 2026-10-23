import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdir} from 'node:fs/promises'
import {chromium} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {localWorker} from './worker.mjs'
import {productBrowserJourney} from './product-browser-journey.mjs'
import {redact} from './diagnostics.mjs'

// OC-059: one oversized real intake produces readable service custody and an owner queue alert.
async function incompleteIntakeBrowser(page,context) {
 const origin=new URL(page.url()).origin
 const request=async(path,data,status=200)=>{
  const response=data===undefined?await context.request.get(path):await context.request.post(path,{headers:{origin},data})
  assert.equal(response.status(),status,`OC-059 ${path} response`)
  return response.json()
 }
 const {member}=await request('/api/session'),source='synthetic-oncall-1',name='Payments Alertmanager',key=randomBytes(32).toString('hex')
 await request('/api/command',{type:'service',id:'payments',name:'Payments',environment:'production',owner:member.id,runbook:['Check payment authorization errors against the gateway dashboard.'],pager:''})
 await request('/api/routing/keys',{id:source,name,provider:'alertmanager',scope:['payments'],owner:member.id,key,revision:0,rules:[{id:'payments-team',match:'all',conditions:[{field:'labels.team',op:'equals',value:'payments'}],target:{service:'payments'}}],catchAll:null},201)
 const title='Payment gateway authorization errors',incompleteTitle='Incomplete intake: '+name
 const payload={version:'4',receiver:'oncall',status:'firing',groupKey:'payments-production',groupLabels:{team:'payments'},commonLabels:{},commonAnnotations:{},alerts:[{status:'firing',labels:{alertname:'PaymentGatewayErrors',team:'payments',severity:'critical'},annotations:{summary:title,description:'Authorization failures exceed the service objective.'},startsAt:new Date().toISOString(),endsAt:'0001-01-01T00:00:00Z',fingerprint:'synthetic-oncall-2',generatorURL:'https://monitoring.example.test/payments'}],padding:'x'.repeat(3*1024*1024)}
 const admitted=await context.request.post('/api/monitoring/'+source,{headers:{'content-type':'application/json',authorization:'Bearer '+key},data:JSON.stringify(payload)})
 assert.equal(admitted.status(),202,'oversized Alertmanager intake retains readable and incomplete records')
 const reply=await admitted.json()
 assert.equal(reply.truncation,true);assert.equal(reply.receipts.length,1);assert.ok(reply.incomplete?.receipt)
 const state=await request('/api/state'),readable=state.intakeReceipts.find(r=>r.id===reply.receipts[0].id),incomplete=state.intakeReceipts.find(r=>r.id===reply.incomplete.receipt)
 assert.equal(readable.service,'payments');assert.equal(readable.routing.rule,'payments-team')
 assert.ok(state.events.some(event=>event.id===readable.event&&event.title===title))
 assert.equal(incomplete.service,null);assert.equal(incomplete.event,null);assert.equal(incomplete.outcome,'unrouted')
 const queued=state.alerts.find(alert=>alert.id===incomplete.alert)
 assert.ok(queued,'incomplete unrouted custody is a native alert');assert.equal(queued.service,null);assert.equal(queued.owner,member.id);assert.deepEqual(queued.events,[])
 assert.equal(queued.urgency,'high');assert.equal(queued.obligation.urgency,'high');assert.deepEqual(queued.obligation.target,{kind:'user',id:member.id})
 assert.equal(queued.obligation.state,'recorded');assert.equal(queued.obligation.paging,'off');assert.equal(queued.obligation.automatic,false)
 const checkScreen=async(screen,width)=>{
  assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0,'no hydration mismatch on the current screen')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${screen} fits ${width}px`)
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()
  assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[],`${screen} has no serious or critical accessibility violations at ${width}px`)
  await page.screenshot({path:`evidence/browser/oc059-${screen}-${width}.png`,fullPage:true})
 }
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await page.getByRole('link',{name:'Alerts & events',exact:true}).click()
  await page.getByRole('button',{name:'Refresh',exact:true}).click()
  const routedCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:title,exact:true,level:3})}),ownerCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:incompleteTitle,exact:true,level:3})})
  await routedCard.getByText('Payments · production · active',{exact:true}).waitFor()
  await ownerCard.getByText(/^Integration unrouted queue.*active$/).waitFor()
  await ownerCard.getByText(`Paging obligation: recorded · Integration owner: ${member.name} · high urgency · paging OFF; non-automatic.`,{exact:true}).waitFor()
  assert.ok(await routedCard.isVisible());assert.ok(await ownerCard.isVisible())
  await checkScreen('alerts',width)
  await ownerCard.scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/browser/oc059-alerts-focus-${width}.png`})
  await page.getByRole('link',{name:'Routing & replay',exact:true}).click()
  await page.getByLabel('Routed integration',{exact:true}).selectOption(source)
  const diagnostics=page.getByRole('region',{name:'Routing diagnostics',exact:true})
  await diagnostics.getByRole('heading',{name:incompleteTitle,exact:true}).waitFor()
  await diagnostics.getByText('High-urgency incomplete-intake alert · integration-owner page obligation recorded · paging OFF; non-automatic.',{exact:true}).waitFor()
  await diagnostics.getByLabel('Routing receipt filter',{exact:true}).selectOption('all')
  await diagnostics.getByRole('heading',{name:title,exact:true}).waitFor()
  assert.ok(await diagnostics.getByRole('heading',{name:title,exact:true}).isVisible())
  assert.ok(await diagnostics.getByRole('heading',{name:incompleteTitle,exact:true}).isVisible())
  await checkScreen('routing',width)
  await diagnostics.getByRole('heading',{name:incompleteTitle,exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/browser/oc059-routing-focus-${width}.png`})
 }
}

// Production Worker + real local D1, without starting a managed rer dev server.
const worker=await localWorker()
const credentials={name:'Product browser owner',password:randomBytes(32).toString('hex')}
let browser,page
try {
 await mkdir('evidence/browser',{recursive:true})
 await mkdir('.rer/local',{recursive:true,mode:0o700})
 const owner=await worker.request('/api/setup',credentials)
 assert.equal(owner.status,200,'the public setup door creates the local browser owner')
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000}})
 await context.addCookies(owner.headers.getSetCookie().map(line=>{
  const pair=line.split(';')[0],at=pair.indexOf('=')
  return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}
 }))
 page=await context.newPage()
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto(worker.origin)
 await page.getByRole('link',{name:'Services',exact:true}).waitFor({timeout:60000})
 const openSession=async(second,secondPage)=>{
  const login=await second.request.post('/api/login',{headers:{origin:worker.origin},data:credentials})
  assert.equal(login.status(),200,'the second browser context signs in through the real login door')
  await secondPage.goto(worker.origin)
 }
 await productBrowserJourney(page,context,{openSession})
 await incompleteIntakeBrowser(page,context)
 assert.deepEqual(errors,[],'no browser application errors')
 console.log('Emitted Worker product browser journey passed at desktop and mobile widths')
} catch(error) {
 if(page){
  await page.screenshot({path:'evidence/browser/product-failure.png',fullPage:true})
  console.error('Product browser failure at',new URL(page.url()).pathname)
  console.error(redact((await page.locator('body').innerText()).slice(0,1800)))
 }
 throw error
} finally {
 try {await browser?.close()} finally {await worker.close()}
}
