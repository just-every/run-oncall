import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const require=createRequire(resolve('package.json'));
const {chromium}=require('@playwright/test');
const {localWorker}=await import(pathToFileURL(resolve('tests/worker.mjs')));
const {rotaTimelineScreens}=await import(pathToFileURL(resolve('tests/product-browser-journey.mjs')));
const directory=process.env.ONCALL_BROWSER_EVIDENCE;
await mkdir(directory,{recursive:true});
const worker=await localWorker({}, {clock:true,outboundLedger:true});
let browser;
const receipt={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree:execFileSync('git',['write-tree'],{encoding:'utf8'}).trim(),runnerUTC:new Date().toISOString(),browserTime:'2026-10-30T12:00:00.000Z',timezone:'UTC',locale:'en-US',overrideHours:9,snapshots:[],originalAssertions:[],errors:[]};
try {
 const owner=await worker.request('/api/setup',{name:'Product browser owner',password:randomBytes(32).toString('hex')});assert.equal(owner.status,200);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});receipt.chromium=browser.version();
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},locale:'en-US',timezoneId:'UTC',extraHTTPHeaders:{connection:'close'}});
 await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'};}));
 const page=await context.newPage();page.on('pageerror',error=>receipt.errors.push(error.message));
 await page.clock.setFixedTime(new Date(receipt.browserTime));await worker.time(Date.parse(receipt.browserTime));
 const call=async(path,data,status=200)=>{const response=data===undefined?await context.request.get(path):await context.request.post(path,{headers:{origin:worker.origin},data});assert.equal(response.status(),status,path);return response.json();};
 const {member}=await call('/api/session');
 await call('/api/command',{type:'service',id:'synthetic-oncall-1',name:'Checkout',environment:'test',owner:member.id,runbook:[],pager:''});
 const second=await call('/api/members',{name:'Schedule colleague 1440',role:'responder',password:'synthetic-schedule-colleague-password'},201);
 const relief=await call('/api/members',{name:'Rosalind Campbell 1440',role:'responder',password:'synthetic-oncall-7301-password'},201);
 const now=Date.parse(receipt.browserTime),anchor=new Date(now-86400000).toISOString().slice(0,10)+'T12:00',ids=[];
 // Same real schedule door and rotation as productSchedule; nine-hour cover
 // exercises a normal work shift whose minimum axis nearly fills the card.
 for(const index of [0,1]){
  const id='rota-'+randomBytes(4).toString('hex');ids.push(id);
  await call('/api/paging/schedules',{id,name:['Primary service rota','Secondary service rota'][index],service:'synthetic-oncall-1',revision:0,timezone:'UTC',validFrom:new Date(now-2*86400000).toISOString(),validUntil:null,primary:{anchorLocal:anchor,periodDays:7,members:[member.id,second.id],ambiguity:'earlier'},backup:{anchorLocal:anchor,periodDays:7,members:[second.id,member.id],ambiguity:'earlier'},overrides:[{id:'synthetic-oncall-7302',role:'primary',start:new Date(now+2*86400000).toISOString(),end:new Date(now+2*86400000+9*3600000).toISOString(),member:relief.id}]});
 }
 receipt.publicCoverage=await call('/api/on-call');
 receipt.savedSchedules=(await call('/api/paging/state')).schedules;
 const snapshot=async(name)=>{
  await page.locator('.oc-bands').waitFor();await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelector('.oc-bands-list')||document.querySelector('.oc-band-name > span:last-child')?.textContent);
  // Give the existing ResizeObservers their rendering turn, without pausing Date.
  await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
  const value=await page.locator('.oc-bands').evaluate(root=>{
   const scroll=root.querySelector('.oc-bands-scroll'),axis=root.querySelector('.oc-bands-axis'),style=getComputedStyle(root),hint=root.querySelector('.oc-band-scroll-hint');
   return {viewport:{width:innerWidth,height:innerHeight},now:new Date().toISOString(),zone:Intl.DateTimeFormat().resolvedOptions().timeZone,root:{clientWidth:root.clientWidth,rectWidth:root.getBoundingClientRect().width,paddingLeft:style.paddingLeft,paddingRight:style.paddingRight,contentWidth:root.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)},scroll:scroll&&{clientWidth:scroll.clientWidth,scrollWidth:scroll.scrollWidth,rectWidth:scroll.getBoundingClientRect().width,paddingLeft:getComputedStyle(scroll).paddingLeft,paddingRight:getComputedStyle(scroll).paddingRight},axis:axis&&{width:axis.getBoundingClientRect().width,minWidth:getComputedStyle(axis).minWidth},hintVisible:!!hint&&hint.getBoundingClientRect().height>0,list:!!root.querySelector('.oc-bands-list'),dates:[...root.querySelectorAll('time')].map(x=>({text:x.textContent,datetime:x.dateTime})),people:[...root.querySelectorAll('.oc-band [aria-label],li > strong,li > button')].map(x=>({text:x.textContent,label:x.getAttribute('aria-label')})),pageOverflow:document.documentElement.scrollWidth>innerWidth};
  });
  receipt.snapshots.push({name,...value});await page.screenshot({path:directory+'/'+name+'.png',fullPage:true});return value;
 };
 for(const [name,path] of [['overview','/on-call'],['rota','/on-call/'+ids[0]]]){
  await page.goto(worker.origin+path);await snapshot(name+'-1440');
 }
 // Execute the preserved product assertion against the real, saved coverage.
 await page.goto(worker.origin+'/on-call');
 try {await rotaTimelineScreens(page,1440,ids[0],relief.name);receipt.originalAssertions.push({width:1440,pass:true});}
 catch(error){receipt.originalAssertions.push({width:1440,pass:false,message:error.message});}
 await page.setViewportSize({width:390,height:1000});
 for(const [name,path] of [['overview','/on-call'],['rota','/on-call/'+ids[0]]]){await page.goto(worker.origin+path);await snapshot(name+'-390');}
 try {await rotaTimelineScreens(page,390,ids[0],relief.name);receipt.originalAssertions.push({width:390,pass:true});}
 catch(error){receipt.originalAssertions.push({width:390,pass:false,message:error.message});}
 receipt.outboundCount=(await worker.outboundRequests()).length;
 receipt.pass=receipt.originalAssertions.every(row=>row.pass)&&receipt.errors.length===0;
 await context.close();
} finally {
 await browser?.close();await worker.close();await writeFile(directory+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
}
console.log(JSON.stringify({pass:receipt.pass,originalAssertions:receipt.originalAssertions,geometry:receipt.snapshots.map(({name,scroll,axis,hintVisible,list})=>({name,scroll,axis,hintVisible,list}))},null,2));
if(!receipt.pass)process.exitCode=1;
