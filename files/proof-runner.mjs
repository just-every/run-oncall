import {localWorker} from '/workspace/run-oncall/tests/worker.mjs';
import {chromium} from '/workspace/run-oncall/node_modules/@playwright/test/index.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const packet='/home/agent/rer-consolidation/work/main-oncall-explain-refusals-1/packet';
const worker=await localWorker({}, {clock:true});let browser;
try {
 const owner=await worker.request('/api/setup',{name:'Oncall lead',password:'synthetic-oncall-reproduction-password'});assert.equal(owner.status,200);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},timezoneId:'UTC'});
 await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin};}));
 const page=await context.newPage();await page.goto(worker.origin+'/on-call');
 const api=async(path,data)=>{const response=await (data?context.request.post(path,{headers:{origin:worker.origin},data}):context.request.get(path));assert.ok(response.ok(),path);return response.json();};
 const {member}=await api('/api/session');
 const ana=await api('/api/members',{name:'Ana Ruiz',role:'responder',password:'synthetic-oncall-ana-password'});
 await api('/api/command',{type:'service',id:'checkout',name:'Checkout API',environment:'production',owner:member.id,runbook:[],pager:''});
 await page.goto(worker.origin+'/status');
 const panel=page.getByRole('region',{name:'Internal business status'});await panel.getByLabel('Business-service name',{exact:true}).fill('Checkout');await panel.getByLabel('Owning team',{exact:true}).fill('Payments');await panel.getByLabel('Communications owner',{exact:true}).selectOption(member.id);
 const before=await api('/api/status');await panel.getByRole('button',{name:'Create business service',exact:true}).click();
 const facts={head:process.env.CANDIDATE_HEAD,status:{unchanged:JSON.stringify(before)===JSON.stringify(await api('/api/status')),inlineAlerts:await panel.getByRole('alert').count(),supportingValidity:await panel.getByLabel('Supporting technical services',{exact:true}).evaluate(e=>e.validity.valid)}};
 assert.equal(facts.status.unchanged,true);assert.equal(facts.status.inlineAlerts,1);assert.equal(await panel.getByLabel('Supporting technical services',{exact:true}).evaluate(e=>e===document.activeElement),true);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${packet}/after-status-${width}.png`,fullPage:true});}
 await page.goto(worker.origin+'/on-call/new');
 const rotaName=page.getByLabel('Rota name',{exact:true});await rotaName.fill('');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await rotaName.locator('..').getByRole('alert').waitFor();assert.equal(await rotaName.evaluate(e=>e===document.activeElement),true);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await rotaName.scrollIntoViewIfNeeded();await page.screenshot({path:`${packet}/after-rota-name-${width}.png`});}await page.setViewportSize({width:1440,height:1000});
 await rotaName.fill('Checkout draft');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:'Who is on, in order',exact:true}).waitFor();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:'Hand-over',exact:true}).waitFor();await page.getByRole('button',{name:'Continue',exact:true}).click();
 const createRota=page.getByRole('button',{name:'Create rota',exact:true});await page.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]').disabled);
 let release,arrived;const gate=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{arrived=resolve;});const pending=[];
 const hold=route=>{const task=(async()=>{const response=await route.fetch();arrived();await gate;await route.fulfill({response});})();pending.push(task);return task;};
 await page.route('**/api/paging/preview',hold);
 try {
  await page.getByLabel('Ends (optional)',{exact:true}).fill('2026-12-12');await requested;assert.equal(await createRota.isDisabled(),true);const hint=await createRota.getAttribute('aria-describedby');assert.ok(hint);await page.locator(`[id="${hint}"]`).waitFor();
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.locator(`[id="${hint}"]`).scrollIntoViewIfNeeded();await page.screenshot({path:`${packet}/after-rota-preview-${width}.png`});}
 }finally {release();await Promise.all(pending);await page.unroute('**/api/paging/preview',hold);}
 await api('/api/paging/schedules',{id:'repro-rota',name:'Checkout rota',service:'checkout',revision:0,timezone:'UTC',validFrom:'2026-11-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-11-01T10:00',periodDays:7,members:[member.id,ana.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-11-01T10:00',periodDays:7,members:[ana.id,member.id],ambiguity:'earlier'},overrides:[]});
 await page.setViewportSize({width:1440,height:1000});await page.goto(worker.origin+'/on-call/repro-rota');await page.getByRole('button',{name:'Cover a shift',exact:true}).click();const cover=page.getByRole('dialog',{name:'Cover a shift',exact:true});
 await cover.getByLabel('Who',{exact:true}).selectOption(ana.id);await cover.getByLabel('Role',{exact:true}).selectOption('primary');await cover.getByLabel('From',{exact:true}).fill('2026-11-12T10:00');await cover.getByLabel('To',{exact:true}).fill('');await cover.getByRole('button',{name:'Review change',exact:true}).click();await cover.getByLabel('To',{exact:true}).locator('..').getByRole('alert').waitFor();assert.equal(await cover.getByLabel('To',{exact:true}).evaluate(e=>e===document.activeElement),true);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await cover.getByLabel('To',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`${packet}/after-cover-end-${width}.png`});}await page.setViewportSize({width:1440,height:1000});
 await cover.getByLabel('To',{exact:true}).fill('2026-11-12T16:00');await cover.getByRole('button',{name:'Review change',exact:true}).click();
 const apply=cover.getByRole('button',{name:'Apply reviewed change',exact:true});await apply.waitFor();facts.cover={disabled:await apply.isDisabled(),description:await apply.getAttribute('aria-describedby'),adjacentText:await apply.evaluate(e=>e.nextElementSibling?.textContent)};
 assert.equal(facts.cover.disabled,true);assert.ok(facts.cover.description);assert.ok(facts.cover.adjacentText.includes(await cover.getByRole('checkbox').locator('..').innerText()));
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await apply.scrollIntoViewIfNeeded();await page.screenshot({path:`${packet}/after-cover-${width}.png`});}
 await writeFile(`${packet}/candidate-proof.json`,JSON.stringify(facts,null,2)+'\n');console.log(JSON.stringify(facts));
} finally {await browser?.close();await worker.close();}
