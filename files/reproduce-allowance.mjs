import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {localWorker} from '/home/agent/rer-consolidation/work/main-oncall-test-event-results-1/run-oncall/tests/worker.mjs';
import {chromium} from '/home/agent/rer-consolidation/work/main-oncall-test-event-results-1/run-oncall/node_modules/.pnpm/@playwright+test@1.64.1/node_modules/@playwright/test/index.mjs';
const worker=await localWorker();let browser;
try {
 const setup=await worker.request('/api/setup',{name:'Synthetic receiver owner',password:randomBytes(32).toString('hex')});assert.equal(setup.status,200);console.log('SETUP');
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},extraHTTPHeaders:{connection:'close'}});
 await context.addCookies(setup.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin};}));
 const page=await context.newPage();page.setDefaultTimeout(15000);const request=async(path,data)=>{console.log('REQUEST',path);const r=data?await context.request.post(path,{headers:{origin:worker.origin},data}):await context.request.get(path);assert.ok(r.ok(),path);return r.json();};
 const member=(await request('/api/session')).member,key=randomBytes(32).toString('hex');
 await request('/api/command',{type:'service',id:'synthetic-oncall-1',name:'Harbour Checkout',environment:'production',owner:member.id,runbook:[],pager:''});
 const open=async(path)=>{console.log('OPEN',path);await page.goto(worker.origin+path);await page.getByText('Send a test event',{exact:true}).click();};
 const send=async(path)=>{console.log('SEND',path);await page.getByLabel('Title',{exact:true}).fill('Synthetic checkout allowance');console.log('SENDING',await page.getByLabel('Private key',{exact:true}).inputValue().then(v=>v.length));const pending=page.waitForResponse(r=>new URL(r.url()).pathname===path&&r.request().method()==='POST',{timeout:15000});await page.getByRole('button',{name:'Send test event',exact:true}).click({noWaitAfter:true});const r=await pending;console.log('HTTP_STATUS',r.status());if(!r.ok()){await page.locator('.failure-line').waitFor();console.log('IMMEDIATE',await page.locator('.failure-line').innerText());}const result={status:r.status(),body:await r.json()};console.log('RESPONSE',JSON.stringify(result));return result;};
 let state;await page.goto(worker.origin);await page.locator('.oncall-frame').waitFor();
 await request('/api/sources',{id:'synthetic-oncall-3',key,mode:'bearer',scopes:['synthetic-oncall-1']});
 state=await request('/api/state');await request('/api/intake/allowances',{id:'source:synthetic-oncall-3',requests:600,events:1,revision:state.revision});
 await open('/settings/integrations/native:synthetic-oncall-3');await page.getByLabel('Private key',{exact:true}).fill(key);await send('/api/ingress/synthetic-oncall-3');await page.waitForFunction(()=>document.querySelector('input[type=password]')?.value==='');
 await page.getByLabel('Private key',{exact:true}).fill(key);await page.getByLabel('Intent',{exact:true}).selectOption('recover');const refused=await send('/api/ingress/synthetic-oncall-3');await page.locator('.failure-line').waitFor();
 const result={baseline:'809d67a8fbf255ee13e8531e4246a1ffbddf2fa4',allowance:{...refused,immediate:await page.locator('.failure-line').innerText(),rejectedRequests:await page.getByRole('list',{name:'Allowance refusals'}).innerText()}};
 await writeFile(new URL('reproduction-allowance.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
} finally {await browser?.close();await worker.close();}
