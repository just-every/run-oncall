import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import {ownerDoor} from './worker.mjs';
import {chromium} from '@playwright/test';
import {automationRuntime,recordOwnedProcesses} from './automation-runtime.mjs';
let receiverStatus=403;
const runtime=await automationRuntime(()=>new Response(null,{status:receiverStatus})),proof=process.env.ONCALL_BROWSER_EVIDENCE??resolve('../evidence/browser');
let browser;
try {
 await mkdir(proof,{recursive:true});
 const setup=await runtime.request('/api/setup',{name:'Synthetic Browser Owner',password:'synthetic-oncall-browser-password'});assert.equal(setup.status,200);
 const cookie=setup.cookie,owner=setup.value.member,req=(p,d)=>runtime.request(p,d,cookie);
 assert.equal((await req('/api/command',{type:'service',id:'synthetic-oncall-browser',name:'Synthetic browser service',environment:'test',owner:owner.id,runbook:[],pager:''})).status,200);
 const viewer=await req('/api/members',{name:'Synthetic Viewer',role:'viewer',password:'synthetic-oncall-viewer-password'});assert.equal(viewer.status,201);
 browser=await chromium.launch({headless:true,...(process.env.ONCALL_CHROMIUM?{executablePath:process.env.ONCALL_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 recordOwnedProcesses();
 console.log('Browser driver PID',process.pid,'runtime proof uses a fresh test-only context');
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const at=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,at),value:cookie.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'}]);
  await page.goto(runtime.origin+'/settings/integrations');const panel=page.locator('#response-api');await panel.getByRole('heading',{name:'Response API and outbound events',exact:true}).waitFor();
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
  const key=randomBytes(32).toString('hex'),created=await req('/api/automation/clients',{name:'Synthetic sending client '+width,key,services:['synthetic-oncall-browser'],permissions:['incidents:read','incidents:write']});assert.equal(created.status,201);
  const endpoint=await req('/api/automation/endpoints',{name:'Synthetic receiver '+width,client:created.value.id,key:randomBytes(32).toString('hex'),url:'https://8.8.8.8/events',services:['synthetic-oncall-browser'],approve:true});assert.equal(endpoint.status,201);
  const incident=await runtime.request('/api/v1/incidents',{type:'declare',service:'synthetic-oncall-browser',title:'Synthetic browser incident '+width,summary:'Visible outbox failure',severity:'warning'},'',{authorization:'Bearer '+key,'idempotency-key':'synthetic-oncall-browser-'+width});assert.equal(incident.status,201);
  while((await req('/api/automation/dispatch',{})).value.processed){}
  await page.reload();await panel.getByText('trigger · terminal',{exact:true}).first().waitFor();
  await panel.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');
  assert.equal(await panel.getByLabel('Private client or endpoint key',{exact:true}).getAttribute('type'),'password');
  await panel.screenshot({path:join(proof,'automation-populated-'+width+'.png')});
  receiverStatus=200;
  const uncertain=await req('/api/command',{type:'assign-role',incident:incident.value.entity,revision:1,role:'scribe',member:owner.id,reason:'Unsigned receiver success is uncertain'});assert.equal(uncertain.status,200);
  while((await req('/api/automation/dispatch',{})).value.processed){}
  await page.reload();await panel.getByText('role · uncertain',{exact:true}).first().waitFor();await panel.screenshot({path:join(proof,'automation-uncertain-'+width+'.png')});receiverStatus=403;

  const memberA=(await req('/api/members',{name:'synthetic-oncall-'+width+'@example.test',role:'responder',password:'synthetic-oncall-responder-password'})).value;
  const memberB=(await req('/api/members',{name:'synthetic-oncall-reassigned-'+width,role:'responder',password:'synthetic-oncall-responder-password'})).value;
  const machine=async(input,n)=>runtime.request('/api/v1/incidents',input,'',{authorization:'Bearer '+key,'idempotency-key':'synthetic-oncall-attribution-'+width+'-'+n});
  assert.equal((await machine({type:'transition',incident:incident.value.entity,revision:uncertain.value.revision,state:'acknowledged',member:memberA.id,summary:'Explicit machine responsibility'},1)).status,201);
  assert.equal((await machine({type:'reassign',incident:incident.value.entity,revision:uncertain.value.revision+1,member:memberB.id,reason:'Subsequent assignment'},2)).status,201);
  assert.equal((await req('/api/state')).value.incidents.find(i=>i.id===incident.value.entity).assignee,memberB.id);
  await page.goto(runtime.origin+'/incidents/'+encodeURIComponent(incident.value.entity));await page.locator('.timeline').getByText('Service account',{exact:true}).first().waitFor();const named=page.locator('.timeline .event').filter({has:page.locator('.named-responder').filter({hasText:memberA.name})});assert.equal(await named.count(),1);await named.getByText('Service account',{exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.timeline').screenshot({path:join(proof,'automation-machine-attribution-'+width+'.png')});
  const timelineAxe=await new AxeBuilder({page}).include('.timeline').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(timelineAxe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
  // The existing Archive screen refuses a source captured before label erasure.
  const email='synthetic-oncall-'+width+'@example.test',label=email+' automation',door=ownerDoor(runtime,cookie);
  const plan=await door.preview('opsgenie',JSON.stringify({users:{data:[{id:'synthetic-oncall-'+width,username:email,fullName:'synthetic-oncall-'+width}]}}));assert.equal(plan.status,200);assert.equal((await door.apply('opsgenie',plan.value)).status,200);
  assert.equal((await req('/api/automation/clients',{name:label,key:randomBytes(32).toString('hex'),services:['synthetic-oncall-browser'],permissions:['incidents:read']})).status,201);
  const oldArchive=(await req('/api/archive')).value;assert.equal((await req('/api/move-in/erase',{email,confirmation:'erase '+email})).status,200);
  const afterErasure=(await req('/api/state')).value;
  await page.goto(runtime.origin+'/settings/archive');await page.getByLabel('Choose archive JSON').setInputFiles({name:'synthetic-oncall-old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(oldArchive))});
  await page.getByLabel('Type REPLACE to confirm').fill('REPLACE');
  const refusal=page.waitForResponse(r=>r.url().endsWith('/api/restore')&&r.request().method()==='POST');await page.getByRole('button',{name:'Replace workspace with this archive',exact:true}).click();assert.equal((await refusal).status(),409);
  await page.getByRole('alert').waitFor();assert.deepEqual((await req('/api/state')).value,afterErasure);assert.ok(!JSON.stringify(afterErasure).includes(label));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(proof,'automation-erasure-refusal-'+width+'.png'),fullPage:true});
  const archiveAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(archiveAxe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);

  await page.goto(runtime.origin+'/incidents/'+encodeURIComponent(incident.value.entity));await page.locator('.timeline').getByText('Service account',{exact:true}).first().waitFor();assert.equal(await page.locator('.timeline .named-responder strong').innerText(),'Erased member','OC-053 post-erasure timeline reads Erased member');await page.locator('.timeline').screenshot({path:join(proof,'automation-erased-member-'+width+'.png')});
  await page.goto(runtime.origin+'/settings/integrations');await panel.getByRole('heading',{name:'Durable outbox',exact:true}).waitFor();const panelAxe=await new AxeBuilder({page}).include('#response-api').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(panelAxe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
  assert.deepEqual(errors,[]);
  for(const [slug,anchor] of [['data','subject-erasure-fences'],['response-api','version-1-http-reference'],['audit','identity-and-content']]){const response=await page.goto(runtime.origin+'/docs/'+slug+'#'+anchor);assert.equal(response.status(),200);await page.locator('.docs-article').waitFor();await page.locator('#'+anchor).scrollIntoViewIfNeeded();if(slug==='response-api')await page.locator('.docs-body > p').filter({hasText:'The timeline attributes'}).scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(proof,'automation-docs-'+slug+'-'+width+'.png')});}
  await context.close();
  const denied=await browser.newContext({viewport:{width,height:1000}}),deniedPage=await denied.newPage();const login=await denied.request.post(runtime.origin+'/api/login',{headers:{origin:runtime.origin},data:{name:'Synthetic Viewer',password:'synthetic-oncall-viewer-password'}});assert.equal(login.status(),200);
  await deniedPage.goto(runtime.origin+'/settings/integrations');await deniedPage.locator('#response-api').getByText('An administrator manages clients, recipients and delivery failures.',{exact:true}).waitFor();assert.equal(await deniedPage.locator('#response-api').getByRole('button').count(),0);
  assert.equal((await denied.request.get(runtime.origin+'/api/automation')).status(),403);
  await deniedPage.screenshot({path:join(proof,'automation-denied-'+width+'.png'),fullPage:true});await denied.close();
 }
 console.log('PASS OC-053 settings management, restore refusal and permanent machine attribution after reassignment at 1440 and 390');
}finally{await browser?.close();await runtime.close();}
