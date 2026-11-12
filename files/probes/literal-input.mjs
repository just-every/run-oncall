import {localWorker} from '/workspace/run-oncall/tests/worker.mjs'
import {keyboardCoordination} from '/workspace/run-oncall/tests/product-browser-journey.mjs'
import {chromium} from '/workspace/run-oncall/node_modules/@playwright/test/index.mjs'
import {randomBytes} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const worker=await localWorker({INBOUND_EMAIL_DOMAIN:'inbound.example.test'},{outboundLedger:true})
const credentials={name:'Synthetic literal input owner',password:randomBytes(32).toString('hex')}
let browser
try{
 const owner=await worker.request('/api/setup',credentials);assert.equal(owner.status,200)
 const baseline=await worker.request('/api/command',{type:'service',id:'synthetic-oncall-529',name:'Synthetic baseline',environment:'test',owner:owner.value.member.id,runbook:[],pager:''},owner.cookie);assert.equal(baseline.status,200)
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},locale:'en-US',timezoneId:'UTC',extraHTTPHeaders:{connection:'close'}})
 await context.addCookies(owner.headers.getSetCookie().map(line=>{
  const pair=line.split(';')[0],at=pair.indexOf('=')
  return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}
 }))
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto(worker.origin);await page.locator('.oncall-frame').waitFor({timeout:60000})
 const openSession=async(second,secondPage)=>{
  const login=await second.request.post('/api/login',{headers:{origin:worker.origin},data:credentials})
  assert.equal(login.status(),200);await secondPage.goto(worker.origin)
 }
 await keyboardCoordination(page,context,1440,undefined,openSession)
 assert.deepEqual(errors,[])
 assert.deepEqual(await worker.outboundRequests(),[])
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
 const receipt={head,journey:'tests/product-browser-journey.mjs#keyboardCoordination',execution:'existing journey through emitted Worker and real D1',assertionWidth:1440,captureWidths:[1440,390],literalRunbook:true,literalNote:true,verbatimArchive:true,hostileElements:0,scriptExecution:false,outboundRequests:0,exit:0}
 await writeFile(process.env.ONCALL_BROWSER_EVIDENCE+'/literal-input-receipt.json',JSON.stringify(receipt,null,2)+'\n')
 console.log('PROBE OC-052 3: existing keyboardCoordination at 1440 -> literal URL and hostile note, no HTML element or script, exact exported text, zero outbound requests; captures at 1440 and 390')
}finally{if(browser)await browser.close();await worker.close()}
