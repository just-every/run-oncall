import {scheduleCoordinationBrowser} from './schedule-coordination-browser.mjs';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {keyboardUser} from './keyboard.mjs';

// Extend this journey: pending valid answers retain coverage, but cannot be saved.
async function retainPreview(page, change, submit) {
 await page.waitForLoadState('networkidle');
 await page.waitForFunction(()=>document.querySelectorAll('.oc-preview li').length>0);
 const preview=page.locator('.oc-preview'),before=await preview.innerText();
 await preview.evaluate(element=>{
  const probe={minWeeks:element.querySelectorAll('li').length,minHeight:element.getBoundingClientRect().height};
  probe.weeks=probe.minWeeks;probe.height=probe.minHeight;
  let active=true;
  const sample=()=>{probe.minWeeks=Math.min(probe.minWeeks,element.querySelectorAll('li').length);probe.minHeight=Math.min(probe.minHeight,element.getBoundingClientRect().height);};
  const observer=new MutationObserver(sample);observer.observe(element,{childList:true,subtree:true});
  const frame=()=>{if(active){sample();requestAnimationFrame(frame);}};requestAnimationFrame(frame);
  window.stopRotaPreviewProbe=()=>{sample();active=false;observer.disconnect();return probe;};
 });
 let release,latest;const gate=new Promise(resolve=>{release=resolve;}),pending=[];
 const hold=route=>{latest=route.request();const task=(async()=>{const response=await route.fetch();await gate;await route.fulfill({response});})();pending.push(task);return task;};
 await page.route('**/api/paging/preview',hold);
 try{
  await change();await page.waitForTimeout(2000);
  assert.ok(latest,'the valid change requests a new preview');
  assert.equal(await preview.innerText(),before,'the last coverage stays visible for the entire delayed answer');
  const probe=await page.evaluate(()=>window.stopRotaPreviewProbe());
  assert.equal(probe.minWeeks,probe.weeks,'typing and valid changes never blank the weeks');
  assert.equal(probe.minHeight,probe.height,'the pending preview never collapses');
  if(submit)assert.equal(await submit.isDisabled(),true,'visible old weeks never authorize saving a new draft');
  const answered=page.waitForResponse(response=>response.request()===latest);release();await(await answered).finished();
 }finally{release();await Promise.all(pending);await page.unroute('**/api/paging/preview',hold);await page.evaluate(()=>window.stopRotaPreviewProbe());}
}

async function invalidWindow(page) {
 const ends=page.getByLabel('Ends (optional)',{exact:true}),submit=page.locator('.oc-step-actions button[type=submit]'),starts=await ends.getAttribute('min');
 await ends.fill(new Date(Date.parse(starts+'T00:00:00Z')-86400000).toISOString().slice(0,10));
 await page.getByRole('alert').filter({hasText:'Choose an end after the rota starts.'}).waitFor();
 assert.equal(await ends.getAttribute('aria-invalid'),'true');
 assert.equal(await page.locator('.oc-preview li').count(),0,'an invalid window clears stale coverage');
 assert.equal(await submit.isDisabled(),true,'an invalid window clears readiness');
 await ends.fill('');await page.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]').disabled);
 assert.ok(await page.locator('.oc-preview li').count()>0,'fixing the window restores coverage');
}

export async function productSchedule(page,context,width,session,{ownerLink}={}) {
 const key=keyboardUser(page),origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true});
 const api=async(path,input)=>{const response=await (input===undefined?context.request.get(origin+path):context.request.post(origin+path,{headers:{origin},data:input}));assert.equal(response.status(),200);return response.json();};
 let state=await api('/api/state');
 let second=state.members.find(member=>member.active&&member.id!==session.member.id&&['admin','responder'].includes(member.role));
 if(!second){const response=await context.request.post(origin+'/api/members',{headers:{origin},data:{name:'Schedule colleague '+width,role:'responder',password:'synthetic-schedule-colleague-password'}});assert.equal(response.status(),201);second=await response.json();}
 const anchor=new Date(Date.now()-86400000).toISOString().slice(0,10)+'T09:00';
 // OC-020 / OC-011: both rota rows are visible together; a four-step weekly create agrees with its zero-write preview.
 const fixtures=[];
 for(const index of [0,1])fixtures.push(await api('/api/paging/schedules',{id:'rota-'+crypto.randomUUID().replaceAll('-','').slice(0,8),name:['Primary service rota','Secondary service rota'][index],service:state.services[index%state.services.length].id,revision:0,timezone:'UTC',validFrom:new Date(Date.now()-2*86400000).toISOString(),validUntil:null,primary:{anchorLocal:anchor,periodDays:7,members:[session.member.id,second.id],ambiguity:'earlier'},backup:{anchorLocal:anchor,periodDays:7,members:[second.id,session.member.id],ambiguity:'earlier'},overrides:[]}));
 await page.goto(origin+'/on-call');
 const onCall=await api('/api/on-call');
 for(const fixture of fixtures){const row=page.locator('[data-rota="'+fixture.id+'"]');await row.waitFor();const coverage=onCall.rotas.find(rota=>rota.id===fixture.id);assert.ok((await row.innerText()).includes(coverage.now.primary.name));assert.ok((await row.innerText()).includes(coverage.next.primary.name));assert.ok((await row.innerText()).includes(coverage.now.backup.name));}
 const auditBefore=await api('/api/audit/export'),previewBefore=await api('/api/paging/state'),workspaceBefore=await api('/api/state'),previews=[];
 const observe=async response=>{if(new URL(response.url()).pathname!=='/api/paging/preview'||response.request().method()!=='POST')return;const input=response.request().postDataJSON();if(input?.schedule&&response.ok())previews.push({input,windows:await response.json()});};
 page.on('response',observe);
 await key.activate(page.locator('.oc-page-head').getByRole('link',{name:'New rota',exact:true}));
 if(width===1440)await retainPreview(page,()=>page.getByLabel('Rota name',{exact:true}).pressSequentially('Gate flicker',{delay:120}));
 await key.text(page.getByLabel('Rota name',{exact:true}),'Checkout rota '+width);
 await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Who is on, in order',exact:true}).waitFor();
 const remove=page.getByRole('button',{name:'Remove person',exact:true}).first();await remove.focus();await page.getByRole('tooltip',{name:'Remove person',exact:true}).first().waitFor();
 await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Hand-over',exact:true}).waitFor();
 const own=await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone);assert.equal(await page.getByLabel('Time zone',{exact:true}).inputValue(),own);assert.equal(await page.getByLabel('Time zone',{exact:true}).locator('option').first().getAttribute('value'),own);
 await page.getByLabel('Starts',{exact:true}).fill(new Date(Date.now()+86400000).toISOString().slice(0,10));
 if(width===1440)await retainPreview(page,()=>page.getByLabel('At',{exact:true}).fill('10:30'));
 await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Check',exact:true}).waitFor();
 if(width===1440){
  await retainPreview(page,()=>page.getByLabel('Ends (optional)',{exact:true}).fill(new Date(Date.now()+60*86400000).toISOString().slice(0,10)),page.getByRole('button',{name:'Create rota',exact:true}));
  await invalidWindow(page);
 }
 if(width<761)await key.activate(page.locator('.oc-preview > summary'));
 await key.focusScreenshot(page.getByRole('button',{name:'Create rota',exact:true}),`${directory}/keyboard-rota-create-${width}.png`);
 assert.deepEqual(await api('/api/paging/state'),previewBefore,'live draft previews write no schedule, job or scheduling revision');assert.deepEqual(await api('/api/state'),workspaceBefore,'live draft previews preserve workspace records and revision');const auditAfter=await api('/api/audit/export');assert.deepEqual(auditAfter.rows.filter(row=>row.kind!=='audit.export'),auditBefore.rows.filter(row=>row.kind!=='audit.export'),'draft previews append no permanent audit record; the observing exports keep their own audits');
 await page.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]')?.disabled);await page.getByRole('button',{name:'Create rota',exact:true}).click();await page.waitForURL(/\/on-call\/rota-[a-f0-9]{8}$/);
 const id=decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1)),created=(await api('/api/paging/state')).schedules.find(schedule=>schedule.id===id),last=previews.filter(value=>value.input.schedule.id===id).at(-1);page.off('response',observe);
 assert.ok(last?.windows.length>1);assert.equal(created.timezone,own);
 const saved=await api('/api/paging/preview',{scheduleId:id,from:last.input.from,to:last.input.to});const assignments=windows=>windows.map(({scheduleRevision,...coverage})=>coverage);assert.deepEqual(assignments(saved),assignments(last.windows),'create preserves every previewed hand-over and assignment');
 const first=await api('/api/schedules/'+encodeURIComponent(id)+'/now-next?at='+encodeURIComponent(new Date(last.input.from).toISOString()));assert.equal(Date.parse(first.now.windows.find(window=>window.role==='primary').end),last.windows[1].at,'the first weekly hand-over equals the live preview');
 const future=scheduleReviewWindow(Date.now());
 // Keep the prior reviewed-editor checks through Cover and Edit: a new gap, explicit confirmation and both named-zone clock changes.
 await page.getByRole('button',{name:'Cover a shift',exact:true}).click();const cover=page.getByRole('dialog',{name:'Cover a shift',exact:true});
 await cover.getByLabel('Who',{exact:true}).selectOption('');await cover.getByLabel('From',{exact:true}).fill(future.overrideStart);await cover.getByLabel('To',{exact:true}).fill(future.overrideEnd);
 const coverBefore=await api('/api/paging/state');await cover.getByRole('button',{name:'Review change',exact:true}).click();await cover.getByText('New coverage gap',{exact:true}).first().waitFor();
 assert.deepEqual(await api('/api/paging/state'),coverBefore,'cover review writes nothing');assert.equal(await cover.getByRole('button',{name:'Apply reviewed change',exact:true}).isDisabled(),true);
 await key.activate(cover.getByRole('checkbox',{name:'I reviewed these assignments and gaps'}),'Space');await key.activate(cover.getByRole('button',{name:'Apply reviewed change',exact:true}));await cover.waitFor({state:'detached'});
 // Give the old rota its named New York clock through the same reviewed door, then use the four-step editor for London.
 let current=(await api('/api/paging/state')).schedules.find(schedule=>schedule.id===id),from=Date.parse(future.previewFrom+'Z'),to=Date.parse(future.previewTo+'Z');
 const named={...current,timezone:'America/New_York'},namedReview=await api('/api/schedules/'+id+'/review',{schedule:named,from,to});await api('/api/schedules/'+id+'/apply',{schedule:named,from,to,digest:namedReview.digest,confirmed:true});
 await page.reload();await key.activate(page.getByRole('link',{name:'Edit rota',exact:true}));await page.getByLabel('Rota name',{exact:true}).waitFor();
 if(width===1440)await retainPreview(page,()=>page.getByLabel('Rota name',{exact:true}).pressSequentially('Gate flicker',{delay:120}));
 await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Who is on, in order',exact:true}).waitFor();await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Hand-over',exact:true}).waitFor();
 await page.getByLabel('Time zone',{exact:true}).selectOption('Europe/London');await page.getByLabel('Starts',{exact:true}).fill(future.previewFrom.slice(0,10));
 if(width===1440)await retainPreview(page,()=>page.getByLabel('At',{exact:true}).fill('09:00'));
 await key.activate(page.getByRole('button',{name:'Continue',exact:true}));await page.getByRole('heading',{name:'Check',exact:true}).waitFor();
 if(width===1440){
  await retainPreview(page,()=>page.getByLabel('Ends (optional)',{exact:true}).fill(new Date(Date.parse(future.previewFrom+'Z')+60*86400000).toISOString().slice(0,10)),page.getByRole('button',{name:'Review change',exact:true}));
  await invalidWindow(page);
 }
 await page.waitForFunction(()=>!document.querySelector('.oc-step-actions button[type=submit]')?.disabled);await key.activate(page.getByRole('button',{name:'Review change',exact:true}));
 const review=page.getByRole('region',{name:'Review schedule changes',exact:true});await review.waitFor();assert.ok(await review.getByText(/DST \/ clock change: Europe\/London/).count());assert.ok(await review.getByText(/DST \/ clock change: America\/New_York/).count());assert.equal(await review.getByRole('button',{name:'Apply reviewed change',exact:true}).isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'review fits the viewport');
 const axe=await new AxeBuilder({page}).include('.oc-rota-steps').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations,[]);
 await review.screenshot({path:`${directory}/schedule-review-panel-${width}.png`});await key.activate(review.getByRole('checkbox',{name:'I reviewed these assignments and gaps'}),'Space');await key.activate(review.getByRole('button',{name:'Apply reviewed change',exact:true}));await page.waitForURL(url=>url.pathname==='/on-call/'+id);
 assert.equal((await api('/api/paging/state')).schedules.find(schedule=>schedule.id===id).timezone,'Europe/London');
 await page.getByText('Calendar feed',{exact:true}).click();const feed=page.getByRole('link',{name:'Open private ICS feed',exact:true});const calendar=await context.request.get(await feed.getAttribute('href'));assert.equal(calendar.status(),200);
 const times=(await calendar.text()).split('\r\n').filter(line=>/^DT(STAMP|START|END):/.test(line));assert.ok(times.length>0);assert.ok(times.every(line=>/^DT(STAMP|START|END):[0-9]{8}T[0-9]{6}Z$/.test(line)),'calendar uses whole-second UTC times');
 await page.screenshot({path:`${directory}/rota-page-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await scheduleCoordinationBrowser(page,context,width,session,{ownerLink});
}

if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const {localWorker}=await import('./worker.mjs'),{chromium}=await import('@playwright/test');const worker=await localWorker();let browser;
 try{
  const owner=await worker.request('/api/setup',{name:'synthetic-oncall-1',password:'synthetic-oncall-browser-password'});assert.equal(owner.status,200);
  const service=await worker.request('/api/command',{type:'service',id:'synthetic-oncall-1',name:'Schedule review service',environment:'production',owner:owner.value.member.id,runbook:['Inspect coverage'],pager:''},owner.cookie);assert.equal(service.status,200);
  browser=await chromium.launch({headless:true,...(process.env.ONCALL_CHROMIUM_EXECUTABLE?{executablePath:process.env.ONCALL_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
  await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'};}));page.on('pageerror',error=>errors.push(error.message));await page.goto(worker.origin);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});const started=performance.now();
   await productSchedule(page,context,width,owner.value);assert.deepEqual(errors,[]);
   console.log(`PASS OC-020 / OC-011 / OC-024 browser ${width}: all rota rows, four-step weekly create, zero-write live preview, matching first hand-over, cover review, named-zone clocks, confirmation, saved edit, ICS, tooltips, overflow and axe (${((performance.now()-started)/1000).toFixed(2)}s)`);
  }
  const ended=await worker.request('/api/login',{name:'synthetic-oncall-1',password:'synthetic-oncall-browser-password'});assert.equal(ended.status,200);assert.equal((await worker.request('/api/logout',{},ended.cookie)).status,200);
  const expired=await worker.request('/api/login',{name:'synthetic-oncall-1',password:'synthetic-oncall-browser-password'});assert.equal(expired.status,200);worker.sql('UPDATE sessions SET expires=0');
  for(const action of ['review','apply'])for(const cookie of [ended.cookie,expired.cookie])assert.equal((await worker.request('/api/schedules/unavailable/'+action,{},cookie)).status,401);
  console.log('PASS OC-024 revoked/expired review and apply doors');
 }finally{await browser?.close();await worker.close();}
}
// Pair the next nearby offset changes from the zones themselves, beyond tomorrow.
export function scheduleReviewWindow(now) {
 const hour=3600000,day=24*hour,zones=['Europe/London','America/New_York']
 const formatters=zones.map(timeZone=>new Intl.DateTimeFormat('en-US',{timeZone,timeZoneName:'longOffset'}))
 const offset=(zone,at)=>formatters[zone].formatToParts(at).find(part=>part.type==='timeZoneName').value
 const start=now+day,previous=zones.map((_,zone)=>offset(zone,start)),changes=[]
 for(let left=start;left<start+370*day;left+=6*hour) {
  const right=left+6*hour
  for(let zone=0;zone<zones.length;zone++) {
   const next=offset(zone,right)
   if(next===previous[zone])continue
   let low=left,high=right
   while(high-low>60000){const middle=Math.floor((low+high)/2);if(offset(zone,middle)===previous[zone])low=middle;else high=middle}
   changes.push({zone,at:Math.ceil(high/60000)*60000});previous[zone]=next
  }
  changes.sort((a,b)=>a.at-b.at)
  const last=changes.at(-1),first=changes.at(-2)
  if(!first||first.zone===last.zone)continue
  const from=Math.floor(first.at/day)*day-day,to=Math.floor(last.at/day)*day+2*day
  if(to-from>31*day)continue
  const gap=from+day+9*hour,utc=at=>new Date(at).toISOString().slice(0,16)
  return {overrideStart:utc(gap),overrideEnd:utc(gap+3*hour),previewFrom:utc(from),previewTo:utc(to)}
 }
 throw Error('No nearby clock changes found for schedule review')
}
