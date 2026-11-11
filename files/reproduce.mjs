import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {localWorker} from './run-oncall/tests/worker.mjs';
import {chromium} from './run-oncall/node_modules/@playwright/test/index.mjs';
const w=await localWorker();let browser;
try{
 const owner=await w.request('/api/setup',{name:'Dana Whitfield',password:randomBytes(24).toString('hex')});assert.equal(owner.status,200);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({baseURL:w.origin,viewport:{width:1440,height:1000},extraHTTPHeaders:{connection:'close'}});
 await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:w.origin,httpOnly:true,sameSite:'Lax'}}));
 const req=async(path,data)=>{const r=data===undefined?await context.request.get(path):await context.request.post(path,{headers:{origin:w.origin},data});assert.ok(r.ok(),path);return r.json()};
 const actor=(await req('/api/session')).member;
 const priya=await req('/api/members',{name:'Priya Shah',role:'responder',password:randomBytes(24).toString('hex')});
 const service=await req('/api/command',{type:'service',name:'Checkout',environment:'test',owner:actor.id,runbook:[],pager:''});
 const incident=await req('/api/command',{type:'declare',service:service.id,title:'Checkout response',severity:'warning',summary:'Investigate checkout errors'});
 const page=await context.newPage();await page.goto(w.origin+'/incidents/'+incident.id);
 await page.getByRole('button',{name:'Lead: Unassigned',exact:true}).click();
 await page.getByRole('listbox',{name:'Lead',exact:true}).getByRole('option',{name:priya.name,exact:true}).click();
 await page.getByRole('button',{name:'Lead: '+priya.name,exact:true}).waitFor();
 const before=(await req('/api/state')).incidents.find(i=>i.id===incident.id);
 await page.getByRole('button',{name:'Acknowledge',exact:true}).click();
 await page.locator('.incident-state.state-acknowledged').waitFor();
 const after=(await req('/api/state')).incidents.find(i=>i.id===incident.id);
 await page.reload();await page.locator('.detail').getByRole('heading',{name:incident.title,exact:true}).waitFor();
 const afterReload=(await req('/api/state')).incidents.find(i=>i.id===incident.id);
 const names=i=>({state:i.state,lead:i.commander===priya.id?'Priya Shah':i.commander===actor.id?'Dana Whitfield':null,assignee:i.assignee===priya.id?'Priya Shah':i.assignee===actor.id?'Dana Whitfield':null,timeline:i.timeline.map(e=>({kind:e.kind,text:e.text}))});
 const receipt={before:names(before),after:names(after),afterReload:names(afterReload)};
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`../packet/before-${width}.png`,fullPage:true});}
 await writeFile('../packet/reproduction.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
 assert.equal(after.commander,actor.id,'reproduced: acknowledgment replaces explicitly selected Priya with Dana');
 assert.equal(afterReload.commander,actor.id,'reproduced: overwritten lead persists after reload');
}finally{await browser?.close();await w.close()}
