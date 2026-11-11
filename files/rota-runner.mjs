import {localWorker} from '/workspace/run-oncall/tests/worker.mjs';
import {productSchedule} from '/workspace/run-oncall/tests/product-browser-journey.mjs';
import {chromium} from '/workspace/run-oncall/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
const worker=await localWorker({}, {clock:true});let browser;
try {
 const owner=await worker.request('/api/setup',{name:'Oncall lead',password:'synthetic-oncall-rota-password'});assert.equal(owner.status,200);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},timezoneId:'UTC',extraHTTPHeaders:{connection:'close'}});
 await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin};}));
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(worker.origin+'/on-call');
 const session=await (await context.request.get('/api/session')).json();
 const created=await context.request.post('/api/command',{headers:{origin:worker.origin},data:{type:'service',id:'checkout',name:'Checkout API',environment:'production',owner:session.member.id,runbook:[],pager:''}});assert.equal(created.status(),200);
 const setTime=async at=>{await worker.time(at);if(at===null)await page.clock.setSystemTime(new Date());else await page.clock.setFixedTime(new Date(at));};
 await productSchedule(page,context,1440,session,{setTime});assert.deepEqual(errors,[]);console.log('PASS touched productSchedule, coverageRulesBrowser and scheduleCoordinationBrowser at 1440; changed-state proof at 1440 and 390');
} finally {await browser?.close();await worker.close();}
