import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import {resolve,join} from 'node:path'
import {writeFile,mkdir} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'

const root=resolve(process.argv[2]),packet=resolve(process.argv[3])
process.chdir(root)
const require=createRequire(join(root,'package.json'))
const {chromium}=require('@playwright/test')
const {localWorker}=await import(pathToFileURL(join(root,'tests/worker.mjs')))
await mkdir(join(packet,'browser'),{recursive:true})
const worker=await localWorker({
 PAGERDUTY_OAUTH_CLIENT_ID:'synthetic-oncall-20',
 PAGERDUTY_OAUTH_CLIENT_SECRET:'synthetic-oncall-20'
},{outboundLedger:true})
const receipt={author:'Run Edit Run fleet',date:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),assertionWidth:1440,cases:[],screenshots:[],status:'running'}
let browser,context
try {
 const owner=await worker.request('/api/setup',{name:'Synthetic oncall 20',password:randomBytes(24).toString('hex')})
 assert.equal(owner.status,200)
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},extraHTTPHeaders:{connection:'close'}})
 await context.addCookies(owner.headers.getSetCookie().map(line=>{
  const pair=line.split(';')[0],at=pair.indexOf('=')
  return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}
 }))
 const page=await context.newPage(),errors=[],external=[]
 page.on('pageerror',error=>errors.push(error.message))
 await context.route('**/*',async route=>{
  if(new URL(route.request().url()).origin!==worker.origin){external.push(new URL(route.request().url()).origin);await route.abort()}
  else await route.continue()
 })
 await page.goto(worker.origin+'/settings/move-in')
 const link=page.getByRole('link',{name:'Connect PagerDuty',exact:true})
 await link.waitFor({timeout:60000})
 const regions=[
  ['us','us'],['eu','eu'],
  ['javascript URL','javascript:globalThis.__oncall20=1'],
  ['external URL','https://attacker.example.test/'],
  ['protocol-relative URL','//attacker.example.test/'],
  ['attribute / image injection','"><img src=x onerror="globalThis.__oncall20=1">'],
  ['attribute / SVG injection',"' onmouseover='globalThis.__oncall20=1'><svg onload='globalThis.__oncall20=1'>"],
  ['encoded tag','%22%3E%3Csvg%20onload%3DglobalThis.__oncall20%3D1%3E'],
  ['query separator','us&region=eu&redirect=https://attacker.example.test/'],
  ['fragment','eu#javascript:globalThis.__oncall20=1'],
  ['newline','\njavascript:globalThis.__oncall20=1'],
  ['backslash','\\attacker.example.test/']
 ]
 for(const [name,value] of regions){
  await page.getByLabel('Region',{exact:true}).evaluate((select,value)=>{
   globalThis.__oncall20=0
   let option=Array.from(select.options).find(option=>option.value===value)
   if(!option){option=document.createElement('option');option.value=value;option.textContent='Synthetic region';select.append(option)}
   select.value=value
   select.dispatchEvent(new Event('change',{bubbles:true}))
  },value)
  await page.waitForFunction(value=>document.querySelector('a.move-in-primary')?.getAttribute('href')==='/api/move-in/pagerduty/start?region='+value,value)
  const attribute=await link.getAttribute('href')
  const href=await link.evaluate(link=>link.href)
  const address=new URL(href)
  assert.equal(address.origin,worker.origin,name+' retains same origin')
  assert.equal(address.pathname,'/api/move-in/pagerduty/start',name+' retains fixed OAuth start path')
  assert.equal(await link.locator('img,svg,script').count(),0,name+' creates no HTML children')
  assert.equal(await link.evaluate(link=>Array.from(link.attributes).some(attribute=>attribute.name.startsWith('on'))),false,name+' creates no event attribute')
  assert.equal(await page.evaluate(()=>globalThis.__oncall20),0,name+' executes no injected script')
  const response=await context.request.get(href,{maxRedirects:0})
  assert.equal(response.status(),302,name+' reaches native OAuth start')
  const location=new URL(response.headers()['location'])
  const region=address.searchParams.get('region')==='eu'?'eu':'us'
  assert.equal(location.origin,region==='eu'?'https://identity.eu.pagerduty.com':'https://identity.pagerduty.com',name+' retains fixed identity host')
  assert.equal(location.pathname,'/oauth/authorize')
  assert.equal(location.searchParams.get('code_challenge_method'),'S256')
  assert.ok(location.searchParams.get('scope').split(' ').every(scope=>scope.endsWith('.read')))
  receipt.cases.push({name,source:value,hrefSuffix:attribute,originPreserved:true,pathPreserved:true,htmlChildren:0,eventAttributes:false,injectedScriptExecutions:0,status:response.status(),providerOrigin:location.origin})
 }
 // The two ordinary choices remain navigable through the current browser UI.
 await page.getByLabel('Region',{exact:true}).selectOption('us')
 assert.equal(await link.getAttribute('href'),'/api/move-in/pagerduty/start?region=us')
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  const path='browser/connect-'+width+'.png'
  await page.screenshot({path:join(packet,path),fullPage:true})
  receipt.screenshots.push(path)
 }
 await page.setViewportSize({width:1440,height:1000})
 await page.getByRole('button',{name:'Use a read-only key instead',exact:true}).click()
 const input=page.getByLabel('Read-only key',{exact:true})
 await input.waitFor()
 assert.equal(await page.getByRole('button',{name:'Read schedules',exact:true}).isDisabled(),true)
 await input.fill('synthetic-oncall-20')
 assert.equal(await page.getByRole('button',{name:'Read schedules',exact:true}).isEnabled(),true)
 await page.getByRole('button',{name:'Use PagerDuty sign-in',exact:true}).click()
 await link.waitFor()
 await page.getByRole('button',{name:'Use a read-only key instead',exact:true}).click()
 assert.equal(await input.inputValue(),'','returning to key mode clears its previous value')
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  const path='browser/key-fallback-'+width+'.png'
  await page.screenshot({path:join(packet,path),fullPage:true})
  receipt.screenshots.push(path)
 }
 await page.setViewportSize({width:1440,height:1000})
 await page.getByLabel('Source',{exact:true}).selectOption('opsgenie')
 assert.equal(await input.inputValue(),'')
 assert.equal(await page.getByRole('link',{name:'Connect PagerDuty',exact:true}).count(),0)
 await page.getByLabel('Source',{exact:true}).selectOption('file')
 await page.getByLabel('Export JSON',{exact:true}).waitFor()
 assert.deepEqual(errors,[],'no browser application errors')
 assert.deepEqual(external,[],'no external browser request')
 assert.deepEqual(await worker.outboundRequests(),[],'no outbound Worker request')
 receipt.compatibility={us:true,eu:true,keyFallback:true,keyClearedOnSwitch:true,opsgenie:true,fileUploadControl:true}
 receipt.externalBrowserRequests=0
 receipt.outboundWorkerRequests=0
 receipt.pageErrors=[]
 receipt.status='passed'
 console.log('PASS: 12 DOM-region cases retain same-origin OAuth start and fixed provider host; no HTML interpretation or script execution. US/EU, read-key fallback, cleared key, Opsgenie and file source controls preserved; proof captured at 1440/390; zero outbound requests.')
} catch(error){
 receipt.status='failed'
 receipt.error=String(error)
 throw error
} finally {
 if(context)await context.close()
 if(browser)await browser.close()
 await worker.close()
 await writeFile(join(packet,'connect-step-receipt.json'),JSON.stringify(receipt,null,2)+'\n')
}
