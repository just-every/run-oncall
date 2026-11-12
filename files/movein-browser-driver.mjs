import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {localWorker,durableSnapshot} from '/workspace/run-oncall/tests/worker.mjs';
import {productImport} from '/workspace/run-oncall/tests/product-browser-journey.mjs';
const require=createRequire('/workspace/run-oncall/package.json');
const {chromium}=require('@playwright/test');
const worker=await localWorker({INBOUND_EMAIL_DOMAIN:'inbound.example.test'},{outboundLedger:true});
let browser;
try {
 const owner=await worker.request('/api/setup',{name:'Move-in review owner',password:randomBytes(32).toString('hex')});
 assert.equal(owner.status,200);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},locale:'en-US',timezoneId:'UTC',extraHTTPHeaders:{connection:'close'}});
 await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'};}));
 const session=await (await context.request.get('/api/session')).json();
 const service=await context.request.post('/api/command',{headers:{origin:worker.origin},data:{type:'service',name:'Checkout',environment:'test',owner:session.member.id,runbook:[],pager:''}});
 assert.equal(service.status(),200);
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await mkdir(process.env.ONCALL_BROWSER_EVIDENCE,{recursive:true});
 await page.goto(worker.origin);
 await page.locator('.oncall-frame').waitFor({timeout:60000});
 await productImport(page,context,1440,session,{snapshot:()=>durableSnapshot(worker),outbound:()=>worker.outboundRequests()});
 assert.deepEqual(errors,[],'no browser application errors during the existing move-in flows');
 console.log('PASS existing productImport and plainMoveInReview on committed candidate; current file/importer/account reconciliation/adoption/erasure assertions preserved');
} finally {
 try {await browser?.close();} finally {await worker.close();}
}
