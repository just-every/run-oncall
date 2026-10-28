import {focusWorkspace} from './keyboard.mjs';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
export async function scheduleCoordinationBrowser(page,context,width,session,{ownerLink}={}){
 const origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true});
 const api=async(path,input)=>{const response=await(input===undefined?context.request.get(origin+path):context.request.post(origin+path,{headers:{origin},data:input}));assert.equal(response.status(),200);return response.json();};
 const fixture=2500+width,name='synthetic-oncall-'+fixture,password='synthetic-oncall-'+fixture+'-password';
 const created=await context.request.post(origin+'/api/members',{headers:{origin},data:{name,role:'responder',password}});assert.equal(created.status(),201);const substitute=await created.json();
 const state=await api('/api/state'),tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10)+'T09:00';
 const schedule=await api('/api/paging/schedules',{id:'rota-'+crypto.randomUUID().replaceAll('-','').slice(0,8),name:'Coordination rota '+width,service:state.services[0].id,revision:0,timezone:'UTC',validFrom:new Date(Date.now()-86400000).toISOString(),validUntil:null,primary:{anchorLocal:tomorrow,periodDays:7,members:[session.member.id],ambiguity:'earlier'},backup:{anchorLocal:tomorrow,periodDays:7,members:[],ambiguity:'earlier'},overrides:[]});
 assert.ok(Number.isSafeInteger(schedule.revision)&&schedule.revision>0);
 await page.goto(origin+'/on-call/'+schedule.id);await focusWorkspace(page);
 const coordination=page.getByRole('region',{name:'Shift coordination',exact:true});await coordination.getByRole('heading',{name:'Shift coordination',exact:true}).waitFor();
 await page.getByRole('button',{name:'Request a swap',exact:true}).click();const swapSheet=page.getByRole('dialog',{name:'Request a swap',exact:true});await swapSheet.getByLabel('Shift to swap',{exact:true}).waitFor();
 await swapSheet.getByLabel('Substitute',{exact:true}).selectOption(substitute.id);await swapSheet.getByRole('button',{name:'Request',exact:true}).click();await swapSheet.waitFor({state:'detached'});await coordination.getByText(/admin approval required/).waitFor();
 const swap=(await api('/api/schedule-coordination')).records.find(row=>row.kind==='swap'&&row.data.schedule===schedule.id&&row.data.status==='pending');assert.ok(swap);
 await coordination.getByRole('button',{name:'Approve swap',exact:true}).click();await coordination.getByText(/approval recorded/).waitFor();
 const relief=await context.browser().newContext({baseURL:origin,viewport:{width,height:900}});
 try{
  if(ownerLink){
   const local=new URL(ownerLink);assert.equal(local.origin,origin);const key=new URLSearchParams(local.hash.slice(1)).get('rer-dev');assert.ok(key);
   const admitted=await relief.request.post(origin+'/__dev/key',{headers:{origin},data:{key}});assert.equal(admitted.status(),204);const anonymous=await relief.request.get(origin+'/api/session');assert.equal(anonymous.status(),200);assert.equal((await anonymous.json()).member,null,'dev admission grants no member authority');
  }
  const login=await relief.request.post(origin+'/api/login',{headers:{origin},data:{name,password}});assert.equal(login.status(),200);const current=await relief.request.get(origin+'/api/session');assert.equal(current.status(),200);const member=(await current.json()).member;
  assert.equal(member.id,substitute.id,'the substitute uses its own password session');assert.equal(member.role,'responder');assert.notEqual(member.id,session.member.id);assert.equal((await relief.cookies()).some(cookie=>/^(?:__Host-operator_session|operator_session_local(?:_\d+)?)$/.test(cookie.name)),false,'no owner session is copied');
  const reliefPage=await relief.newPage(),errors=[];reliefPage.on('pageerror',error=>errors.push(error.message));const document=await reliefPage.goto(origin+'/on-call/'+schedule.id);assert.equal(document.status(),200);
  const substituteView=reliefPage.getByRole('region',{name:'Shift coordination',exact:true});await substituteView.getByRole('button',{name:'Accept swap',exact:true}).click();await substituteView.getByText(/accepted/).waitFor();
  assert.ok(await reliefPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await reliefPage.evaluate(()=>window.__rerHydration?.count??0),0);assert.deepEqual(errors,[]);
  assert.deepEqual((await new AxeBuilder({page:reliefPage}).include('.oc-rota-page').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations,[]);
  await substituteView.screenshot({path:`${directory}/OC-025-substitute-${width}.png`});await reliefPage.screenshot({path:`${directory}/OC-025-substitute-rota-${width}.png`,fullPage:true});
 }finally{await relief.close();}
 await focusWorkspace(page);await coordination.getByText(/accepted/).waitFor();await coordination.getByText('Reminders and swaps',{exact:true}).click();
 await coordination.getByLabel('Swap approval',{exact:true}).selectOption('none');
 await page.waitForFunction(async id=>{const data=await(await fetch('/api/schedule-coordination')).json();return data.records.some(row=>row.kind==='policy'&&row.data.schedule===id&&row.data.swapApproval==='none');},schedule.id);
 await coordination.getByLabel('Reminder lead minutes',{exact:true}).fill('30');await coordination.getByLabel('Reminder lead minutes',{exact:true}).blur();await coordination.getByText(/not sent \(no timer\)/).waitFor();
 await page.waitForFunction(async()=>{const data=await(await fetch('/api/schedule-coordination')).json();return data.records.some(row=>row.kind==='reminder'&&row.data.leadMinutes===30);});
 await coordination.getByText('Calendar feed',{exact:true}).click();await coordination.getByLabel('Calendar scope',{exact:true}).selectOption('schedule');await coordination.getByRole('button',{name:'Create link',exact:true}).click();
 const field=coordination.getByRole('textbox',{name:'New private calendar URL',exact:true});await field.waitFor();const url=await field.inputValue();assert.equal((await context.request.get(url)).status(),200);await coordination.getByRole('button',{name:'Hide calendar URL',exact:true}).click();assert.equal(await field.count(),0,'the bearer is dismissed before proof');
 await coordination.getByText('History',{exact:true}).click();assert.ok((await api('/api/state')).scheduleRecords.some(row=>row.kind==='notice'&&row.data.schedule===schedule.id),'schedule changes retain their recorded obligations');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const axe=await new AxeBuilder({page}).include('[aria-label="Shift coordination"]').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations,[]);
 assert.equal(await coordination.getByLabel('Swap approval',{exact:true}).inputValue(),'none','saved policy stays selected');await coordination.screenshot({path:`${directory}/OC-025-settings-${width}.png`});
 await coordination.getByRole('button',{name:'Revoke subscription',exact:true}).click();await coordination.getByText(/revoked or restored inactive/).waitFor();assert.equal((await context.request.get(url)).status(),404);
 const coverage=await api('/api/schedules/'+schedule.id+'/now-next?at='+encodeURIComponent(swap.data.start));assert.equal(coverage.now.primary,substitute.id);
 await page.reload();await page.getByText('Reminders and swaps',{exact:true}).click();assert.equal(await page.getByLabel('Swap approval',{exact:true}).inputValue(),'none');assert.equal(await page.getByLabel('Reminder lead minutes',{exact:true}).inputValue(),'30','a number left in the field remains saved after reload');
 console.log(`PASS OC-025 browser ${width}: band-selected swap, independent substitute acceptance after approval, effective override, autosaved approval/reminder, no-timer label, one-time feed dismissal, immediate revoke, recorded obligations, axe and overflow`);
}
