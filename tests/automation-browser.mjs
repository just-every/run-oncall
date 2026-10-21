import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {chromium} from '@playwright/test';
import {automationRuntime} from './automation-runtime.mjs';
const runtime=await automationRuntime(),proof=process.env.ONCALL_BROWSER_EVIDENCE??resolve('../evidence/browser');
let browser;
try {
 await mkdir(proof,{recursive:true});
 const setup=await runtime.request('/api/setup',{name:'Synthetic Browser Owner',password:'synthetic-oncall-browser-password'});assert.equal(setup.status,200);
 const cookie=setup.cookie,owner=setup.value.member,req=(p,d)=>runtime.request(p,d,cookie);
 assert.equal((await req('/api/command',{type:'service',id:'synthetic-oncall-browser',name:'Synthetic browser service',environment:'test',owner:owner.id,runbook:[],pager:''})).status,200);
 const viewer=await req('/api/members',{name:'Synthetic Viewer',role:'viewer',password:'synthetic-oncall-viewer-password'});assert.equal(viewer.status,201);
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});
 console.log('Browser driver PID',process.pid,'runtime proof uses a fresh test-only context');
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const at=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,at),value:cookie.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'}]);
  await page.goto(runtime.origin+'/#alerts');const panel=page.locator('#response-api');await panel.getByRole('heading',{name:'Response API and outbound events',exact:true}).waitFor();
  if(width===1440){await panel.getByText('No API clients configured.',{exact:true}).waitFor();for(const emptyWidth of [1440,390]){await page.setViewportSize({width:emptyWidth,height:1000});await panel.screenshot({path:join(proof,'automation-empty-'+emptyWidth+'.png')});}await page.setViewportSize({width,height:1000});}
  await panel.getByRole('button',{name:'Generate private key',exact:true}).focus();await page.keyboard.press('Enter');
  await panel.getByLabel('Client name',{exact:true}).fill('Synthetic browser client '+width);
  await panel.getByRole('button',{name:'Create scoped client',exact:true}).click();await panel.getByText('Synthetic browser client '+width,{exact:true}).first().waitFor();
  assert.equal(await panel.getByLabel('Private client or endpoint key',{exact:true}).inputValue(),'');
  // A stale lifecycle write is a real server conflict and must be announced.
  const clients=(await req('/api/automation')).value.clients,client=clients.find(c=>c.name==='Synthetic browser client '+width);
  await req('/api/automation/clients/'+client.id+'/revoke',{revision:client.revision});
  await panel.getByRole('button',{name:'Revoke '+client.name,exact:true}).click();await page.getByRole('alert').filter({hasText:'Revision conflict'}).waitFor();
  await page.screenshot({path:join(proof,'automation-conflict-'+width+'.png'),fullPage:true});
  await page.reload();await panel.getByRole('heading',{name:'Durable outbox',exact:true}).waitFor();
  // Approved recipient and actual refusal produce a durable terminal outcome on screen.
  const key=randomBytes(32).toString('hex'),created=await req('/api/automation/clients',{name:'Synthetic sending client '+width,key,services:['synthetic-oncall-browser'],permissions:['incidents:read']});assert.equal(created.status,201);
  const endpoint=await req('/api/automation/endpoints',{name:'Synthetic receiver '+width,client:created.value.id,key:randomBytes(32).toString('hex'),url:'https://8.8.8.8/events',services:['synthetic-oncall-browser'],approve:true});assert.equal(endpoint.status,201);
  await req('/api/command',{type:'declare',service:'synthetic-oncall-browser',title:'Synthetic browser incident '+width,summary:'Visible outbox failure',severity:'warning'});
  while((await req('/api/automation/dispatch',{})).value.processed){}
  await page.reload();await panel.getByText('trigger · terminal',{exact:true}).first().waitFor();
  await panel.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');
  assert.equal(await panel.getByLabel('Private client or endpoint key',{exact:true}).getAttribute('type'),'password');
  await panel.screenshot({path:join(proof,'automation-populated-'+width+'.png')});
  assert.deepEqual(errors,[]);
  await context.close();
  const denied=await browser.newContext({viewport:{width,height:1000}}),deniedPage=await denied.newPage();const login=await denied.request.post(runtime.origin+'/api/login',{headers:{origin:runtime.origin},data:{name:'Synthetic Viewer',password:'synthetic-oncall-viewer-password'}});assert.equal(login.status(),200);
  await deniedPage.goto(runtime.origin+'/#alerts');await deniedPage.locator('#response-api').getByText('An administrator manages clients, recipients and delivery failures.',{exact:true}).waitFor();assert.equal(await deniedPage.locator('#response-api').getByRole('button').count(),0);
  assert.equal((await denied.request.get(runtime.origin+'/api/automation')).status(),403);
  await deniedPage.screenshot({path:join(proof,'automation-denied-'+width+'.png'),fullPage:true});await denied.close();
 }
 console.log('PASS OC-053 integration settings keyboard, empty, populated, denied and real stale-write/terminal failures at 1440 and 390');
}finally{await browser?.close();await runtime.close();}
