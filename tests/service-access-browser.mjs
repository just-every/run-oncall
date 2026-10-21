import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdir} from 'node:fs/promises'
import {chromium} from '@playwright/test'
import {localWorker} from './worker.mjs'
import {receiver} from './service-api-edge.mjs'
import {redact} from './diagnostics.mjs'

// Token, endpoint and outbox management in the Services panels, at desktop and mobile widths, against the emitted Worker.
const worker=await localWorker(),edge=await receiver()
const credentials={name:'Access browser owner',password:randomBytes(32).toString('hex')}
let browser,page
try {
 await mkdir('evidence/browser',{recursive:true})
 const owner=await worker.request('/api/setup',credentials),admin=owner.value.member
 assert.equal((await worker.request('/api/command',{type:'service',id:'checkout',name:'Checkout',environment:'production',owner:admin.id,runbook:[],pager:''},owner.cookie)).status,200)
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 for(const [width,height] of [[1440,1000],[390,844]]) {
  const context=await browser.newContext({baseURL:worker.origin,viewport:{width,height}})
  await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}}))
  page=await context.newPage()
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto(worker.origin)
  await page.getByRole('link',{name:'Services',exact:true}).click()
  const accounts=page.locator('section.service-access').filter({has:page.getByRole('heading',{name:'Service accounts'})})
  const endpoints=page.locator('section.service-access').filter({has:page.getByRole('heading',{name:'Event endpoints'})})
  const delivery=page.locator('section.service-access').filter({has:page.getByRole('heading',{name:'Event delivery'})})
  await accounts.getByText('No service accounts yet').waitFor()
  await delivery.getByText('No events have been queued.').waitFor()
  await endpoints.getByText('No endpoints yet.').waitFor()
  const name=`Deploy bot ${width}`
  await accounts.getByLabel('Service account name').fill(name)
  await accounts.getByLabel('Checkout · production').check()
  await accounts.getByLabel(/Declare, acknowledge, reassign/).check()
  await accounts.getByRole('button',{name:'Create service account'}).click()
  const token=await page.getByTestId('revealed-secret').innerText()
  assert.match(token,/^ocsa_/)
  assert.equal((await worker.request('/api/v1/me',undefined,undefined,{authorization:'Bearer '+token})).status,200,'the revealed token works')
  await page.getByRole('status').filter({hasText:'Copy it now'}).waitFor()
  await page.screenshot({path:`evidence/browser/service-access-token-${width}.png`,fullPage:true})
  await page.getByRole('button',{name:'I have stored it — hide'}).click()
  assert.ok(!(await page.locator('body').innerText()).includes(token),'the token is hidden once stored')
  await accounts.locator('strong').getByText(name,{exact:true}).waitFor()
  // A real refusal is shown and nothing is claimed saved.
  await endpoints.getByLabel('Endpoint name').fill('Hostile')
  await endpoints.getByLabel('Endpoint URL').fill('http://example.com/hook')
  await endpoints.getByLabel('Checkout · production').check()
  await endpoints.getByRole('button',{name:'Create event endpoint'}).click()
  await page.getByText(/Endpoints must use HTTPS/).first().waitFor()
  await endpoints.getByText('No endpoints yet.').waitFor()
  edge.mode('fail500')
  await endpoints.getByLabel('Endpoint name').fill('Local receiver')
  await endpoints.getByLabel('Endpoint URL').fill(edge.url('/ui'))
  await endpoints.getByRole('button',{name:'Create event endpoint'}).click()
  edge.secret('/ui',await page.getByTestId('revealed-secret').innerText())
  await page.getByRole('button',{name:'I have stored it — hide'}).click()
  await endpoints.locator('strong').getByText('Local receiver',{exact:true}).waitFor()
  // An event from the token is queued; the failing receiver shows as a truthful retry, not as sent.
  const declared=await fetch(worker.origin+'/api/v1/incidents',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,'idempotency-key':'ui-'+width+'-declare'},body:JSON.stringify({service:'checkout',severity:'warning',title:'Browser incident '+width,summary:'Raised by the token'})})
  assert.equal(declared.status,201)
  await page.reload();await page.getByRole('link',{name:'Services',exact:true}).click()
  await delivery.getByText('Queued',{exact:false}).first().waitFor()
  await delivery.getByText('Attempt 1 of 5').waitFor()
  await page.screenshot({path:`evidence/browser/service-access-queued-${width}.png`,fullPage:true})
  // Revoking the token makes its queued event refuse at dispatch and shows why.
  await accounts.getByRole('button',{name:`Revoke ${name}`}).click()
  await accounts.getByText(/· revoked/).waitFor()
  assert.equal((await worker.request('/api/v1/me',undefined,undefined,{authorization:'Bearer '+token})).status,401)
  edge.mode('ok')
  worker.sql("UPDATE oc_outbox SET due_at=1 WHERE state='queued'")
  await delivery.getByRole('button',{name:'Deliver due events now'}).click()
  await delivery.getByText('the token that caused it was revoked').waitFor()
  await delivery.getByRole('button',{name:/Replay incident.triggered/}).first().click()
  await delivery.getByText('replayed 1×').waitFor()
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'the panels fit the viewport')
  await page.screenshot({path:`evidence/browser/service-access-refused-${width}.png`,fullPage:true})
  await accounts.getByRole('button',{name:`Erase ${name}`}).click()
  await accounts.getByRole('button',{name:new RegExp(`Confirm: erase ${name}`)}).click()
  await accounts.getByText('No service accounts yet').waitFor()
  assert.deepEqual(errors,[],'no browser application errors')
  await context.close()
  worker.sql("DELETE FROM oc_outbox; DELETE FROM oc_webhook_endpoints; DELETE FROM oc_webhook_credentials")
 }
 console.log('Service access browser journey passed at desktop and mobile widths')
} catch(error) {
 if(page){await page.screenshot({path:'evidence/browser/service-access-failure.png',fullPage:true});console.error(redact((await page.locator('body').innerText()).slice(0,1800)))}
 throw error
} finally { try{await browser?.close()}finally{await edge.close();await worker.close()} }
