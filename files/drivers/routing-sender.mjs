import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {chromium} from '@playwright/test';
import {localWorker} from '../tests/worker.mjs';
import {routingBrowser} from '../tests/keyboard.mjs';
const w=await localWorker(),browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const owner=await w.request('/api/setup',{name:'Synthetic oncall owner',password:randomBytes(32).toString('hex')});assert.equal(owner.status,200);
 const ctx=await browser.newContext({baseURL:w.origin,viewport:{width:1440,height:1000}});
 await ctx.addCookies(owner.headers.getSetCookie().map(line=>{const [name,value]=line.split(';')[0].split('=');return {name,value,url:w.origin};}));
 const created=await w.request('/api/command',{type:'service',id:'synthetic-oncall-515',name:'Harbour checkout',environment:'production',owner:owner.value.member.id,runbook:[],pager:''},owner.cookie);assert.equal(created.status,200);
 const page=await ctx.newPage();await page.goto(w.origin+'/settings/routing');
 await routingBrowser(page,ctx,1440);console.log('PASS routingBrowser: keyboard-created signed routed sample, copied command, allowance autosave, stale routing publish refusal, rotate and revoke.');
}finally{await browser.close();await w.close();}
