import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {localWorker} from './worker.mjs';
const phase=process.env.DESIGN_PHASE??'before';
const w=await localWorker();let browser;
try {
 const owner=await w.request('/api/setup',{name:'Alex Morgan',password:'synthetic-owner-password'});assert.equal(owner.status,200);
 const cookie=owner.cookie,req=async(path,data)=>{const r=await w.request(path,data,cookie);assert.ok(r.status<300,`${path}: ${r.status} ${JSON.stringify(r.value)}`);return r.value;};
 const actor=(await req('/api/session')).member;
 const sam=await req('/api/members',{name:'Sam Rivera',role:'responder',password:'synthetic-responder-password'});
 await req('/api/command',{type:'service',id:'support',name:'Brightwell Support',environment:'production',owner:actor.id,runbook:[],pager:''});
 await req('/api/sources',{id:'synthetic-monitor',key:'synthetic-design-monitor-private-key',mode:'bearer',scopes:['support']});
 const payload={source:'synthetic-monitor',eventId:'synthetic-design-event',service:'support',environment:'production',key:'support-latency',generation:'one',intent:'trigger',severity:'warning',title:'Support response time is rising',observedAt:new Date().toISOString(),evidence:''};
 const sent=await w.send('/api/ingress/synthetic-monitor',JSON.stringify(payload),{'content-type':'application/json',authorization:'Bearer synthetic-design-monitor-private-key'});assert.equal(sent.status,201);
 const at=new Date();at.setHours(9,0,0,0);const starts=at.toISOString();
 await req('/api/paging/schedules',{id:'support-weekly',revision:0,name:'Support weekly',service:'support',timezone:'Europe/London',validFrom:starts,validUntil:null,primary:{anchorLocal:starts.slice(0,16),periodDays:7,ambiguity:'earlier',members:[actor.id,sam.id]},backup:{anchorLocal:starts.slice(0,16),periodDays:7,ambiguity:'earlier',members:[sam.id,actor.id]},overrides:[]});
 const state=await req('/api/state'),alert=state.alerts[0];
 await req('/api/command',{type:'declare',service:'support',title:'Support response time is rising',severity:'warning',summary:'The support team is investigating slow responses.',alerts:[alert.id]});
 browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Europe/London',extraHTTPHeaders:{connection:'close'}});
 await context.addCookies(owner.headers.getSetCookie().map(line=>{const p=line.split(';')[0],i=p.indexOf('=');return {name:p.slice(0,i),value:p.slice(i+1),url:w.origin};}));
 const page=await context.newPage();page.setDefaultTimeout(20000);await mkdir(`evidence/design-${phase}`,{recursive:true});
 const snap=async(name,width)=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' fits');await page.screenshot({path:`evidence/design-${phase}/${name}-${width}.png`,fullPage:true});console.log('SCREEN',name,width,(await page.locator('main').innerText().catch(()=>page.locator('body').innerText())).slice(0,1000));};
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000});
  await page.goto(w.origin+'/settings/archive');await page.getByRole('button',{name:phase==='before'?'Export original archive':'Download full backup',exact:true}).waitFor();await snap('archive',width);
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:phase==='before'?'Export original archive':'Download full backup',exact:true}).click();const download=await downloaded;const value=JSON.parse(await readFile(await download.path(),'utf8'));
  console.log('BACKUP',download.suggestedFilename(),Boolean(value.paging?.schedules.length));
  if(phase==='after'){assert.equal(value.paging.schedules[0].id,'support-weekly');assert.ok(value.coordination.members.length===2);}
  await page.goto(w.origin+'/settings/team');const person=page.getByRole('article',{name:actor.name,exact:true});await person.locator('summary').filter({hasText:'Contact methods and notification rules'}).click();await person.getByRole('button',{name:'Add contact method',exact:true}).click();await person.getByLabel('Method',{exact:true}).last().selectOption('sms');
  await person.getByLabel('Phone number',{exact:true}).last().fill('+44 7700 900123').catch(async()=>person.getByLabel('National number',{exact:true}).fill('+44 7700 900123'));
  await snap('phone',width);await person.getByRole('button',{name:'Save notification rules',exact:true}).click();
  if(phase==='after'){await person.getByRole('status').filter({hasText:'saved'}).waitFor();const contact=(await req('/api/members/'+actor.id+'/notification-rules')).contacts.at(-1);assert.equal(contact.countryCode,44);assert.equal(contact.address,'7700900123');}
  await page.goto(w.origin+'/on-call/new');await page.getByLabel('Rota name',{exact:true}).fill('Support handover');for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.oc-step-actions button[type=submit]')&&!document.querySelector('.oc-step-actions button[type=submit]').disabled);await snap('rota-check',width);
  await page.goto(w.origin+'/on-call');await page.getByText('Support weekly',{exact:true}).first().waitFor();await snap('week',width);
  await page.goto(w.origin+'/alerts/'+encodeURIComponent(alert.id));await page.getByRole('article',{name:'Alert details',exact:true}).waitFor();await page.getByText('History',{exact:true}).click();await snap('alert-history',width);await page.getByText('Event context',{exact:true}).click();await snap('event-context',width);
  await page.goto(w.origin+'/settings/integrations');await page.getByRole('heading',{name:'Integrations',exact:true}).waitFor();await snap('integrations',width);
  await page.goto(w.origin+'/settings/integrations/native%3Asynthetic-monitor');await page.getByText('Send a test event',{exact:true}).click();await snap('test-event',width);
  await page.goto(w.origin+'/reviews');await page.getByText('Response numbers',{exact:true}).click();await page.locator('.response-report .response-metrics').first().waitFor();await snap('reviews',width);
  await page.goto(w.origin+'/settings/readiness');await page.getByRole('heading',{name:/Readiness/}).first().waitFor();await snap('readiness',width);
 }
} finally {await browser?.close();await w.close();}
