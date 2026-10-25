import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
export async function scheduleCoordinationBrowser(page,context,width,session,{ownerLink}={}){
 const origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true});
 const fixture=2500+width,name='synthetic-oncall-'+fixture,password='synthetic-oncall-'+fixture+'-password';
 const created=await context.request.post(origin+'/api/members',{headers:{origin},data:{name,role:'responder',password}});assert.equal(created.status(),201);const substitute=await created.json();
 await page.getByRole('button',{name:'Refresh scheduling',exact:true}).click();
 const coordination=page.getByRole('region',{name:'Shift coordination',exact:true});await coordination.getByRole('heading',{name:'Shift coordination',exact:true}).waitFor();
 await coordination.getByText('Request a swap',{exact:true}).click();await coordination.getByLabel('Swap substitute',{exact:true}).selectOption(substitute.id);
 const start=new Date(Date.now()+3600000).toISOString(),end=new Date(Date.now()+7200000).toISOString();
 await coordination.getByLabel('Swap start (UTC)',{exact:true}).fill(start.slice(0,16));await coordination.getByLabel('Swap end (UTC)',{exact:true}).fill(end.slice(0,16));
 await coordination.getByRole('button',{name:'Request substitute',exact:true}).click();await coordination.getByText(/admin approval required/).waitFor();
 await coordination.getByRole('button',{name:'Approve swap',exact:true}).click();await coordination.getByText(/approval recorded/).waitFor();
 const relief=await context.browser().newContext({baseURL:origin,viewport:{width,height:1000}});
 try{
  if(ownerLink){
   // A fresh managed clone loads Vite modules through gated /@fs paths. Admit
   // this context with the runtime key only; never enter the owner's persona.
   const local=new URL(ownerLink);assert.equal(local.origin,origin);
   const key=new URLSearchParams(local.hash.slice(1)).get('rer-dev');assert.ok(key,'managed runtime supplies its local gate key');
   const admitted=await relief.request.post(origin+'/__dev/key',{headers:{origin},data:{key}});assert.equal(admitted.status(),204);
   const anonymous=await relief.request.get(origin+'/api/session');assert.equal(anonymous.status(),200);assert.equal((await anonymous.json()).member,null,'local gate admission grants no member authority');
  }
  const login=await relief.request.post(origin+'/api/login',{headers:{origin},data:{name,password}});assert.equal(login.status(),200);
  const current=await relief.request.get(origin+'/api/session');assert.equal(current.status(),200);const member=(await current.json()).member;
  assert.equal(member.id,substitute.id,'the substitute uses its own password session');assert.equal(member.role,'responder');assert.notEqual(member.id,session.member.id);
  assert.equal((await relief.cookies()).some(cookie=>/^(?:__Host-operator_session|operator_session_local(?:_\d+)?)$/.test(cookie.name)),false,'no owner Auth session is copied or created');
  const reliefPage=await relief.newPage(),errors=[];reliefPage.on('pageerror',error=>errors.push(error.message));
  const document=await reliefPage.goto(origin+'/#schedules');assert.equal(document.status(),200);await reliefPage.getByLabel('Schedule',{exact:true}).selectOption('browser-'+width);
  const substituteView=reliefPage.getByRole('region',{name:'Shift coordination',exact:true});await substituteView.getByRole('button',{name:'Accept swap',exact:true}).click();await substituteView.getByText(/accepted/).waitFor();
  assert.ok(await reliefPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'substitute schedule fits the viewport');
  assert.equal(await reliefPage.evaluate(()=>window.__rerHydration?.count??0),0);assert.deepEqual(errors,[],'substitute schedule has no application errors');
  assert.deepEqual((await new AxeBuilder({page:reliefPage}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations,[]);
  await substituteView.screenshot({path:`${directory}/OC-025-substitute-${width}.png`});
  await reliefPage.screenshot({path:`${directory}/OC-025-substitute-schedule-${width}.png`,fullPage:true});
 }finally{await relief.close();}
 await page.getByRole('button',{name:'Refresh scheduling',exact:true}).click();await coordination.getByText(/accepted/).waitFor();
 await coordination.getByText('Settings',{exact:true}).click();await coordination.getByLabel('Swap approval',{exact:true}).selectOption('none');await coordination.getByRole('button',{name:'Save swap approval',exact:true}).click();
 await coordination.getByLabel('Reminder lead minutes',{exact:true}).fill('30');await coordination.getByRole('button',{name:'Save shift reminder',exact:true}).click();await coordination.getByText(/not sent \(no timer\)/).waitFor();
 await coordination.getByLabel('Calendar scope',{exact:true}).selectOption('schedule');await coordination.getByRole('button',{name:'Create calendar subscription',exact:true}).click();
 const field=coordination.getByRole('textbox',{name:'New private calendar URL',exact:true});await field.waitFor();const url=await field.inputValue();assert.equal((await context.request.get(url)).status(),200);
 await coordination.getByRole('button',{name:'Hide calendar URL',exact:true}).click();assert.equal(await field.count(),0,'the bearer is dismissed before screenshot proof');
 await coordination.getByText('Recorded schedule changes',{exact:true}).click();await coordination.getByText(/Recorded obligation/).first().waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'shift coordination fits the viewport');
 const axe=await new AxeBuilder({page}).include('[aria-label="Shift coordination"]').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
 assert.equal(await coordination.getByLabel('Swap approval',{exact:true}).inputValue(),'none','saved approval policy stays selected after the form reset');
 await coordination.screenshot({path:`${directory}/OC-025-settings-${width}.png`});
 await coordination.getByRole('button',{name:'Revoke subscription',exact:true}).click();await coordination.getByText(/revoked or restored inactive/).waitFor();assert.equal((await context.request.get(url)).status(),404);
 const coverage=await context.request.get(origin+'/api/schedules/browser-'+width+'/now-next?at='+encodeURIComponent(start));assert.equal(coverage.status(),200);assert.equal((await coverage.json()).now.primary,substitute.id);
 console.log(`OC-025 browser ${width}: explicit substitute acceptance after admin approval, effective override, Settings approval/reminder, labelled no-timer due, one-time feed dismissal, immediate revoke, recorded obligations, axe and overflow passed`);
}
