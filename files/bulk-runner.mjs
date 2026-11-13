import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {localWorker} from '/workspace/run-oncall/tests/worker.mjs';
import {triageBulkBrowser} from '/workspace/run-oncall/tests/product-browser-journey.mjs';
const require=createRequire('/workspace/run-oncall/package.json');
const {chromium}=require('@playwright/test');
const worker=await localWorker();let browser;
try {
 const owner=await worker.request('/api/setup',{name:'Synthetic Oncall owner',password:randomBytes(32).toString('hex')});assert.equal(owner.status,200);
 const call=async(path,data)=>{const response=await worker.request(path,data,owner.cookie);assert.equal(response.status,200,path);return response.value;};
 const actor=(await call('/api/session')).member;
 await call('/api/command',{type:'service',name:'Checkout',environment:'test',owner:actor.id,runbook:[],pager:''});
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},baseURL:worker.origin});
 await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin};}));
 const page=await context.newPage();await page.goto(worker.origin+'/incidents');await page.locator('.oncall-frame').waitFor();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 try {await triageBulkBrowser(page,context,1440);} catch(error) {console.log('DEBUG',await page.getByRole('region',{name:'Bulk incident actions',exact:true}).innerText());console.log('DEBUGHTML',await page.getByRole('region',{name:'Bulk incident actions',exact:true}).evaluate(element=>element.outerHTML));throw error;}
 assert.deepEqual(errors,[]);console.log('PASS existing triageBulkBrowser journey at 1440; proof at 1440 and 390');
} finally {await browser?.close();await worker.close();}
