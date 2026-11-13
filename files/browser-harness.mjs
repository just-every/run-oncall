import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {chromium} from '/workspace/run-oncall/node_modules/@playwright/test/index.mjs';
import {localWorker} from '/workspace/run-oncall/tests/worker.mjs';
import {triageBulkBrowser} from '/workspace/run-oncall/tests/product-browser-journey.mjs';
const worker=await localWorker();let browser;
try {
 const owner=await worker.request('/api/setup',{name:'Synthetic bulk carry owner',password:randomBytes(32).toString('hex')});assert.equal(owner.status,200);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},locale:'en-US',timezoneId:'UTC',extraHTTPHeaders:{connection:'close'}});
 await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'};}));
 const session=await (await context.request.get('/api/session')).json();
 const service=await context.request.post('/api/command',{headers:{origin:worker.origin},data:{type:'service',name:'Checkout',environment:'test',owner:session.member.id,runbook:[],pager:''}});assert.equal(service.status(),200);
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(worker.origin);await page.locator('.oncall-frame').waitFor({timeout:60000});
 await triageBulkBrowser(page,context,1440);
 assert.deepEqual(errors,[]);await context.close();
 console.log('PASS existing triageBulkBrowser at 1440, changed-screen screenshots at 1440 and 390, no browser application errors');
} finally {try{await browser?.close();}finally{await worker.close();}}
