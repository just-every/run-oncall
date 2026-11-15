// Author: Run Edit Run fleet (Codex), 2026-11-15.
// Bounded ordinary hydration/edit/reload compatibility proof at one asserted width.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
const root=createRequire(process.cwd()+'/package.json');
const {chromium,expect}=root('@playwright/test');
const {localWorker}=await import(pathToFileURL(process.cwd()+'/tests/worker.mjs').href);
const worker=await localWorker();let browser;
const screenshots=new URL('./browser/',import.meta.url);
await mkdir(screenshots,{recursive:true});
try {
 const claim=await worker.request('/auth/bootstrap',{token:worker.vars.SETUP_TOKEN,displayName:'Synthetic Oncall Owner'},undefined,{'CF-Connecting-IP':'127.0.0.1'});
 assert.equal(claim.status,303);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.addCookies(claim.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}}));
 await page.goto(worker.origin+'/setup');
 const confirmation=page.getByRole('checkbox');
 if(await confirmation.count()){await confirmation.check();await page.getByRole('button',{name:'Finish setup'}).click()}
 await page.locator('.oncall-frame').waitFor({timeout:60000});
 const session=await worker.request('/api/session',undefined,claim.cookie);assert.equal(session.status,200);
 const created=await worker.request('/api/command',{type:'service',id:'synthetic-oncall-probe',name:'Synthetic compatibility service',environment:'test',owner:session.value.member.id,runbook:['Synthetic original instruction'],pager:''},claim.cookie);assert.equal(created.status,200);
 await page.goto(worker.origin+'/settings/services/synthetic-oncall-probe');
 const runbook=page.getByLabel('Runbook steps (one per line)',{exact:true});
 await expect(runbook).toHaveValue('Synthetic original instruction');
 const saved=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().method()==='POST');
 await runbook.fill('Synthetic changed instruction');await runbook.blur();assert.equal((await saved).status(),200);
 await expect(page.locator('.service-runbook').getByRole('status')).toHaveText('Saved');
 await page.reload();await expect(runbook).toHaveValue('Synthetic changed instruction');
 const state=await worker.request('/api/state',undefined,claim.cookie);assert.equal(state.value.services.find(s=>s.id==='synthetic-oncall-probe').runbook[0],'Synthetic changed instruction');
 assert.deepEqual(errors,[]);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:new URL('service-'+width+'.png',screenshots).pathname,fullPage:true})}
 await context.close();
 console.log('PASS emitted Worker browser: owner bootstrap, hydrated workspace, protected service creation, interactive autosave and reload preserve changed runbook; no browser errors. Assertions at 1440; synthetic screenshots at 1440 and 390.');
} finally {await browser?.close();await worker.close()}
