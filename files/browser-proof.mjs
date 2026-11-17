import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {automationRuntime} from '/workspace/run-oncall/tests/worker.mjs';
import {chromium} from '/workspace/run-oncall/node_modules/@playwright/test/index.mjs';
const mode=process.argv[2]??'before',packet=process.env.HOME+'/rer-consolidation/work/sd-oncall-missed-ack-1/packet';
await mkdir(packet,{recursive:true});
const w=await automationRuntime(undefined,{clock:null});let browser;
const results=[];
try {
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
 const setup=await w.request('/api/setup',{name:'Example Operator',password:'synthetic-oncall-ack-password'});const owner=ok(setup).member,cookie=setup.cookie;
 const req=(p,d)=>w.request(p,d,cookie),read=async()=>ok(await req('/api/state'));
 const start=Date.parse('2026-11-17T12:14:00Z');await w.time(start);
 const service='example-operations';ok(await req('/api/command',{type:'service',id:service,name:'Example Operations',environment:'test',owner:owner.id,runbook:[],pager:''}));
 const schedule=ok(await req('/api/paging/schedules',{id:service,service,name:'Example rota',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[owner.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}));
 ok(await req('/api/paging/policies',{service,scheduleId:schedule.id,revision:0,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:1}));
 const key=randomBytes(32).toString('hex');ok(await req('/api/intake/sources',{id:service,name:'Example monitoring',provider:'pagerduty',service,key,revision:0}),201);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of [1440,390]){
  await w.time(start);
  const context=await browser.newContext({viewport:{width,height:1000}});
  await context.addCookies([{name:cookie.split('=')[0],value:cookie.slice(cookie.indexOf('=')+1),url:w.origin}]);
  const page=await context.newPage();
  await page.goto(w.origin+'/settings/services/'+service);await page.getByRole('heading',{name:'Example Operations',exact:true}).waitFor();
  await page.getByText('Acknowledgment timeout',{exact:true}).click();
  const timeout=page.getByRole('spinbutton',{name:'Acknowledgment timeout (minutes, 0 is off)',exact:true});await timeout.fill('1');await timeout.blur();
  await page.waitForFunction(async()=>{const s=await fetch('/api/state').then(r=>r.json());return s.services[0].ackTimeouts?.at(-1)?.minutes===1;});
  if(width===1440){
   await page.locator('summary').filter({hasText:'Response ·'}).click();
   await page.getByLabel('Default response',{exact:true}).selectOption('incident');
   await page.getByRole('button',{name:'Publish version 1',exact:true}).click();await page.getByLabel('Reason',{exact:true}).fill('Record new incidents for the response team');
   await page.getByRole('button',{name:'Publish version 1',exact:true}).click();
   await page.waitForFunction(async()=>{const s=await fetch('/api/state').then(r=>r.json());return s.services[0].responsePolicies?.at(-1)?.defaultMode==='incident';});
  }
  await page.screenshot({path:packet+`/${mode}-${width}-settings.png`,fullPage:true});
  await page.goto(w.origin+'/settings/integrations/'+encodeURIComponent('intake:'+service));
  await page.getByText('Send a test event',{exact:true}).click();
  await page.getByLabel('Private key',{exact:true}).fill(key);await page.getByLabel('Title',{exact:true}).fill('Example response delay '+width);
  await page.getByLabel('Alert key (dedup key)',{exact:true}).fill('synthetic-oncall-ack-'+width);
  await page.getByRole('button',{name:'Send test event',exact:true}).click();
  await page.waitForFunction(async title=>{const s=await fetch('/api/state').then(r=>r.json());return s.incidents.some(i=>i.title===title);},'Example response delay '+width);
  const incident=(await read()).incidents.find(i=>i.title==='Example response delay '+width);
  const initial=incident.deadlines??[];
  await w.time(start+60000);
  const tick=await fetch(w.origin+'/cdn-cgi/local/scheduled');assert.equal(tick.status,200);
  const observed=(await read()).incidents.find(i=>i.id===incident.id);
  if(mode==='after')assert.equal(observed.deadlines.filter(d=>d.kind==='initial-acknowledgment'&&d.state==='fired').length,1);
  else assert.equal(observed.deadlines?.length??0,0);
  for(const [name,path] of [['incident','/incidents/'+incident.id],['alert','/alerts/'+incident.alerts[0]],['on-call','/on-call'],['reviews','/reviews']]){
   await page.goto(w.origin+path);await page.locator('main').waitFor();
   if(mode==='after'&&width===1440)await page.getByText(/Not acknowledged in time/).first().waitFor();
   await page.screenshot({path:packet+`/${mode}-${width}-${name}.png`,fullPage:true});
   results.push({mode,width,screen:name,missedVisible:(await page.getByText(/Not acknowledged in time/).count())>0,horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  }
  results.push({mode,width,initialDeadlineCount:initial.length,firedDeadlineCount:(observed.deadlines??[]).filter(d=>d.state==='fired').length});
  await context.close();
 }
 await writeFile(packet+`/browser-${mode}.json`,JSON.stringify({at:new Date().toISOString(),mode,results},null,2)+'\n');
 console.log(JSON.stringify(results));
} finally {if(browser)await browser.close();await w.close();}
