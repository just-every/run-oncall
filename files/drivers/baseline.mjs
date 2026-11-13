import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {localWorker} from '../tests/worker.mjs';
const w=await localWorker(),browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const owner=await w.request('/api/setup',{name:'Synthetic oncall owner',password:randomBytes(32).toString('hex')});assert.equal(owner.status,200);
 const ctx=await browser.newContext({baseURL:w.origin,viewport:{width:1440,height:1000}});
 await ctx.addCookies(owner.headers.getSetCookie().map(line=>{const [name,value]=line.split(';')[0].split('=');return {name,value,url:w.origin};}));
 const cookie=owner.cookie,call=async(path,input,status=200)=>{const r=await w.request(path,input,cookie);assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
 const service='synthetic-oncall-501',native='Checkout signed monitor-3476b0f5ac82',routed='routed-b4714a6e14aa',key=randomBytes(32).toString('hex');
 await call('/api/command',{type:'service',id:service,name:'Harbour checkout',environment:'production',owner:owner.value.member.id,runbook:[],pager:''});
 await call('/api/sources',{id:native,key,mode:'bearer',scopes:[service]});
 await call('/api/routing/keys',{id:routed,name:'Harbour monitoring router',provider:'native',authentication:'bearer',scope:[service],owner:owner.value.member.id,key:randomBytes(32).toString('hex'),revision:0,rules:[],catchAll:service},201);
 const page=await ctx.newPage(),report={};
 await page.goto(w.origin+'/settings/integrations/'+encodeURIComponent('native:'+native));await page.getByLabel('Sample request',{exact:true}).waitFor();
 report.native={prose:await page.locator('.ingress-example p').allTextContents(),sampleService:JSON.parse((await page.getByLabel('Sample request',{exact:true}).inputValue()).match(/'({\n[\s\S]*\n})'/)[1]).service};
 await page.goto(w.origin+'/settings/routing');await page.getByRole('region',{name:'Sender setup for this key',exact:true}).waitFor();
 const setup=page.getByRole('region',{name:'Sender setup for this key',exact:true});if(!await setup.getByLabel('Sample request',{exact:true}).isVisible())await setup.getByText('Sample request',{exact:true}).first().click();
 report.routed={prose:await setup.locator('p').allTextContents(),keyId:await setup.getByLabel('Key ID',{exact:true}).inputValue()};
 let state=await call('/api/state');await call('/api/intake/allowances',{id:'source:'+native,requests:1,events:1,revision:state.revision});
 const event={source:native,eventId:'synthetic-oncall-502',service,environment:'production',key:'synthetic-oncall-503',generation:'synthetic-oncall-504',intent:'trigger',severity:'warning',title:'Checkout latency',observedAt:new Date().toISOString(),evidence:''};
 assert.equal((await w.send('/api/ingress/'+encodeURIComponent(native),JSON.stringify(event),{authorization:'Bearer '+key,'content-type':'application/json'})).status,201);
 assert.equal((await w.send('/api/ingress/'+encodeURIComponent(native),JSON.stringify({...event,eventId:'synthetic-oncall-505'}),{authorization:'Bearer '+key,'content-type':'application/json'})).status,429);
 await page.goto(w.origin+'/settings/archive');await page.getByRole('heading',{name:'Configuration audit',exact:true}).waitFor();report.audit=await page.locator('.archive-audit').innerText();
 await page.goto(w.origin+'/settings/readiness');await page.locator('.readiness-release dd').first().waitFor();report.release=await page.locator('.readiness-release dd').first().innerText();
 await writeFile('../packet/BASELINE.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();await w.close();}
