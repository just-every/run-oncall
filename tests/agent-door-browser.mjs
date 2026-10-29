import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {agentRuntime} from './agent-door-runtime.mjs';
import specialist from './oncall-agent-native.mjs';
import {autonomousPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';
import {openIncidentAction} from './keyboard.mjs';

const runtime=await agentRuntime(),directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';
let browser,page;
try{
 await mkdir(directory,{recursive:true});
 const {http,tool}=runtime;
 assert.equal((await runtime.adopt()).status,200);
 await specialist({request:runtime.request,origin:runtime.origin,cookie:runtime.cookie,fixtures:runtime.fixtures,tool});
 const native=async()=> (await (await http('/api/state')).json());
 let state=await native();
 const incident=state.incidents.find(row=>row.title==='Payment authorization failures after deployment');
 const responder=state.members.find(row=>row.role==='responder'),admin=state.members.find(row=>row.name==='Jordan Davis');
 const team=[{id:randomUUID(),email:'mira@example.invalid',name:'Mira Patel',role:'member',invite:1},{id:randomUUID(),email:'jordan@example.invalid',name:'Jordan Davis',role:'admin',invite:1}];
 await runtime.settings(team,2);
 assert.equal((await http('/api/rer/people-link',{businessId:team[0].id,memberId:responder.id,revision:2})).status,303);
 browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-gpu','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({baseURL:runtime.origin,viewport:{width:1440,height:1000}});
 await context.addCookies(runtime.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'}}));
 page=await context.newPage();
 async function capture(label,path,prepare=async()=>{}){
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   await page.goto(runtime.origin+path);await prepare();
   const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
   const findings=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations.filter(row=>['serious','critical'].includes(row.impact));
   const controls=await page.locator('button,input:not([type=hidden]),select,textarea').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).map(node=>({label:node.getAttribute('aria-label')??node.textContent?.trim().slice(0,60)??node.name,height:(node.matches('input[type=checkbox],input[type=radio]')?node.labels?.[0]??node:node).getBoundingClientRect().height})).filter(row=>row.height<44));
   if(width===1440){
    assert.ok(fits,`${label} fits ${width}px`);
    assert.deepEqual(findings,[],`${label} has no serious/critical accessibility findings`);
    assert.deepEqual(controls,[],`${label} controls have 44px targets`);
   }
   console.log(`Browser proof ${label} ${width}: fits=${fits} serious/critical=${findings.length} undersized-controls=${controls.length}`);
   await page.screenshot({path:`${directory}/agent-door-${label}-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
 }
 await capture('people-linked-pending','/agents/people',async()=>{await page.getByRole('heading',{name:'Business people',exact:true}).waitFor();await page.getByText('Mira Patel',{exact:true}).waitFor()});
 // A stale real form must report the conflict without moving either identity.
 await page.goto(runtime.origin+'/agents/people');
 const form=page.locator('form').filter({has:page.locator(`input[value="${team[1].id}"]`)});
 await form.locator('select').selectOption(admin.id);await runtime.settings(team,3);
 await Promise.all([page.waitForURL('**/agents/people'),form.getByRole('button',{name:'Link this teammate',exact:true}).click()]);
 await page.getByRole('heading',{name:'Link not saved',exact:true}).waitFor();
  assert.equal(await page.getByRole('alert').getAttribute('data-refusal-code'),'revision_conflict');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  const visible=await page.getByRole('alert').isVisible(),fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  const findings=(await new AxeBuilder({page}).analyze()).violations.filter(row=>['serious','critical'].includes(row.impact));
  if(width===1440){assert.ok(visible);assert.ok(fits);assert.deepEqual(findings,[]);}
  console.log(`Browser proof people-error ${width}: alert=${visible} fits=${fits} serious/critical=${findings.length}`);
  await page.screenshot({path:`${directory}/agent-door-people-error-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(runtime.origin+'/agents/people');
 const currentForm=page.locator('form').filter({has:page.locator(`input[value="${team[1].id}"]`)});
 await currentForm.locator('select').selectOption(admin.id);await currentForm.getByRole('button',{name:'Link this teammate',exact:true}).click();
 await page.getByText('Jordan Davis',{exact:true}).waitFor();
 await capture('incident','/incidents/'+incident.id,async()=>{
  await page.getByRole('region',{name:'Timeline',exact:true}).waitFor();
  await page.getByRole('button',{name:/Earlier entries/}).click();
  await page.getByText('Responder assistant for Alex Chen',{exact:true}).first().waitFor();
 });
 await capture('review','/reviews/'+incident.id,async()=>{
  await page.getByRole('dialog',{name:incident.title,exact:true}).waitFor();
  for(const label of [/^Timings$/,/^Evidence \(/,/^From the timeline \(/,/^Follow-ups \(/])await page.locator('.review-material-body summary').filter({hasText:label}).click();
  await page.getByText('Awaiting acceptance',{exact:false}).first().waitFor();
 });
 // The retained manual coordination path displays the actual machine creator.
 const manual=await tool('oncall.incidents.update',{change:'manual-page',service:'agent-service',title:'Database latency coordination',severity:'warning',description:'Coordinate through the existing pager',users:[responder.id],operationId:randomUUID(),idempotency_key:randomUUID()});
 assert.equal(manual.result?.isError,false,JSON.stringify(manual.body));
 await capture('responders','/incidents/'+manual.result.structuredContent.id,async()=>{
  await page.locator('.incident-page').waitFor();await openIncidentAction(page,'Request responders');
  await page.getByText(/Created by Responder assistant for Alex Chen/).waitFor();
 });
 const receiver=await (await http('/api/automation/clients',{name:'Operations receiver',key:randomBytes(32).toString('hex'),services:['agent-service'],permissions:['incidents:read']})).json();
 const key=randomBytes(32).toString('hex');runtime.fixtures.set('https://8.8.8.8',{key});
 const endpoint=await (await http('/api/automation/endpoints',{name:'Operations receiver',client:receiver.id,services:['agent-service'],url:'https://8.8.8.8/oncall-agent',key,approve:true})).json();
 async function pending(title){
  const created=await tool('oncall.incidents.declare',{service:'agent-service',title,severity:'warning',summary:'Internal coordination only',idempotency_key:randomUUID()});
  assert.equal(created.result?.isError,false);
  const item=(await native()).apiOutbox.find(row=>row.incident===created.result.structuredContent.id&&row.endpoint===endpoint.id);
  assert.ok(item);
  const result=await tool('oncall.automation.dispatch',{id:item.id,revision:item.revision,idempotency_key:randomUUID()});
  const approval=result.result?._meta?.['com.runeditrun/approval'];assert.ok(approval,JSON.stringify(result.body));
  return {item,approval,path:new URL(approval.url).pathname};
 }
 const document=autonomousPolicy();document.rules.unshift({id:'send',class:'external',do:'approval',approver:['sponsor'],wait:'PT1H'});
 assert.equal((await runtime.adopt(document)).status,200);
 const approved=await pending('Payment gateway retry latency');
 await capture('approval-pending',approved.path,async()=>{await page.locator('[data-approval-state="pending"]').waitFor()});
 await page.getByRole('button',{name:'Approve',exact:true}).click();
 await page.locator('[data-approval-state="executed"]').waitFor();
 assert.equal((await native()).apiOutbox.find(row=>row.id===approved.item.id).status,'sent');
 await capture('approval-executed',approved.path,async()=>{await page.getByText('Alex Chen',{exact:false}).first().waitFor()});
 const paused=await pending('Inventory synchronization delay');
 assert.equal((await http('/agents/api/pause',{paused:true})).status,200);
 await page.goto(runtime.origin+paused.path);await page.getByRole('button',{name:'Approve',exact:true}).click();
 await page.locator('[data-approval-state="refused"]').waitFor();
 assert.equal((await native()).apiOutbox.find(row=>row.id===paused.item.id).status,'queued');
 await capture('approval-paused',paused.path);
 await capture('agents-paused','/agents',async()=>{await page.getByText('Agents are paused.',{exact:true}).waitFor()});
 assert.equal((await http('/agents/api/pause',{paused:false})).status,200);
 const blocked=autonomousPolicy();blocked.rules.unshift({id:'stop-send',class:'external',do:'blocked'});assert.equal((await runtime.adopt(blocked)).status,200);
 state=await native();const queued=state.apiOutbox.find(row=>row.id===paused.item.id);
 const denied=await tool('oncall.automation.dispatch',{id:queued.id,revision:queued.revision,idempotency_key:randomUUID()});
 assert.equal(denied.result?._meta?.['com.runeditrun/error']?.code,'policy_blocked');
 await capture('agents-blocked','/agents',async()=>{await page.getByText(/the policy blocks it/).first().waitFor()});
 await capture('approval-unavailable','/agents/approvals/unavailable');
 assert.equal((await runtime.adopt()).status,200);
 const erased=await tool('oncall.incidents.declare',{service:'agent-service',title:'Retired payment gateway investigation',severity:'warning',summary:'Local investigation content approved for erasure',idempotency_key:randomUUID()});
 assert.equal(erased.result?.isError,false);
 const erasePolicy=autonomousPolicy();erasePolicy.rules.unshift({id:'erase',class:'destructive',do:'approval',approver:['sponsor'],wait:'PT1H'});
 assert.equal((await runtime.adopt(erasePolicy)).status,200);
 const target=erased.result.structuredContent.id,eraseArgs={kind:'incident',id:target,workspaceRevision:(await native()).revision,confirmation:'erase '+target,idempotency_key:randomUUID()};
 const erasePending=await tool('oncall.privacy.erase',eraseArgs),eraseApproval=erasePending.result?._meta?.['com.runeditrun/approval'];
 assert.ok(eraseApproval);
 const erasePath=new URL(eraseApproval.url).pathname;
 await capture('erase-pending',erasePath);
 await page.getByRole('button',{name:'Approve',exact:true}).click();
 await page.locator('[data-approval-state="executed"]').waitFor();
 const replay=await tool('oncall.privacy.erase',eraseArgs);
 assert.equal(replay.result?.isError,false,JSON.stringify(replay.body));
 assert.equal(replay.result.structuredContent.state,'complete');
 assert.ok(!(await native()).incidents.some(row=>row.id===target));
 await capture('erase-executed',erasePath);
 await capture('guide','/docs/agents',async()=>{await page.locator('.docs-article').waitFor()});
 await capture('erasure-data','/docs/data',async()=>{await page.locator('.docs-article').waitFor()});
 console.log('PASS agent door browser: native incident/review/responders, linked/pending/error people, pending/executed/paused approval, Agents and guide; assertions at 1440, browser proof at 1440/390 with overflow, 44px controls and axe measurements');
}catch(error){
 if(page){await page.screenshot({path:`${directory}/agent-door-failure.png`,fullPage:true});console.error('Agent browser failed at',new URL(page.url()).pathname)}
 throw error;
}finally{try{await browser?.close()}finally{await runtime.close()}}
