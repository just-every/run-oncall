import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {agentRuntime,pauseMatrix} from './agent-door-runtime.mjs';
import {recoveredResolutionTarget} from './oncall-agent-fixtures.mjs';
import specialist from './oncall-agent-native.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';
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
 async function setLocal(paused){
  await page.goto(runtime.origin+'/agents');
  const response=page.waitForResponse(answer=>new URL(answer.url()).pathname==='/agents/api/pause'&&answer.request().method()==='POST');
  await page.getByRole('button',{name:paused?'Pause agents':'Resume agents',exact:true}).click();
  assert.equal((await response).status(),200);
  await page.getByRole('button',{name:paused?'Resume agents':'Pause agents',exact:true}).waitFor();
  assert.equal((await (await http('/agents/api/state')).json()).paused.local,paused);
 }
 await pauseMatrix(runtime,{
  setLocal,
  async observe(label,phase,flags){
   // Assertions run once at desktop width. The same changed states are shown
   // at desktop and phone widths without repeating the policy matrix.
   await page.goto(runtime.origin+'/agents');
   await page.getByText(flags.business||flags.local?'Agents are paused.':'Agents are on.',{exact:true}).waitFor();
   assert.equal(await page.getByText('Paused in Business.',{exact:true}).count(),Number(flags.business));
   assert.ok(await page.getByRole('button',{name:flags.local?'Resume agents':'Pause agents',exact:true}).isVisible());
   if(label==='autonomous'&&['local-only','Business-only after local resume','resumed'].includes(phase)){
    await capture('pause-matrix-'+(flags.local?'local':flags.business?'business':'resumed'),'/agents');
   }
  },
 });
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
 // The actual signed-in browser approves the exact saved native resolution.
 const resolutionTarget=await recoveredResolutionTarget(runtime,'Resolution held for the sponsoring human');
 const resolvePolicy=autonomousPolicy();resolvePolicy.rules.unshift({id:'resolve-commitment',class:'commitment',do:'approval',approver:['sponsor'],wait:'PT1H'});
 assert.equal((await runtime.adopt(resolvePolicy)).status,200);
 const resolveArgs={incident:resolutionTarget.id,revision:resolutionTarget.revision,summary:'Human approves the retained incident resolution',idempotency_key:randomUUID()};
 const resolutionBefore=await native(),resolutionEdge=await runtime.outboundRequests();
 const heldResolution=await tool('oncall.incidents.resolve',resolveArgs);
 assert.equal(heldResolution.result?.resultType,'input_required');
 assert.equal(heldResolution.decision.disposition,'approval');
 assert.equal(heldResolution.decision.classes.find(row=>row.class==='commitment').do,'approval');
 assert.equal(heldResolution.decision.classes.find(row=>row.class==='sensitive').do,'autonomous');
 assert.deepEqual(await native(),resolutionBefore,'Pending browser resolution preserves native state');
 const approvalHandle=heldResolution.result._meta['com.runeditrun/approval'];
 const approvalPath=new URL(approvalHandle.url).pathname;
 const savedApproval=(await (await http('/agents/api/approvals/'+approvalHandle.id)).json()).approval;
 assert.deepEqual(savedApproval.summary.nativeTarget,{kind:'incident',id:resolutionTarget.id});
 assert.ok(savedApproval.summary.items.includes('Revision '+resolutionTarget.revision));
 assert.deepEqual(savedApproval.classes.map(({class:cls,facts})=>({class:cls,facts})),[
  {class:'commitment',facts:{measure:0,currency:'XXX',counterparty:'internal'}},
  {class:'sensitive',facts:{measure:2,kind:'personal_or_incident_evidence'}},
 ]);
 await capture('resolution-pending',approvalPath,async()=>{await page.locator('[data-approval-state="pending"]').waitFor()});
 await page.goto(runtime.origin+approvalPath);
 await page.getByRole('button',{name:'Approve',exact:true}).click();
 await page.locator('[data-approval-state="executed"]').waitFor();
 const resolutionAfter=await native(),resolvedIncident=resolutionAfter.incidents.find(row=>row.id===resolutionTarget.id);
 assert.equal(resolvedIncident.state,'resolved');assert.equal(resolvedIncident.revision,resolutionTarget.revision+1);
 const resolutionEntries=resolvedIncident.timeline.filter(row=>row.lifecycle?.to==='resolved');
 assert.equal(resolutionEntries.length,1);
 assert.equal(resolutionEntries[0].metadata.agent.agent.id,runtime.context.agentId);
 const resolutionOwner=(await (await http('/api/workspace')).json()).member;
 assert.equal(resolutionEntries[0].metadata.agent.for.id,resolutionOwner.id);
 assert.ok(resolutionEntries[0].metadata.agent.approvers.some(row=>row.id===resolutionOwner.id));
 const executedApproval=(await (await http('/agents/api/approvals/'+approvalHandle.id)).json()).approval;
 assert.equal(executedApproval.revision,savedApproval.revision);
 assert.equal(executedApproval.summary_sha256,savedApproval.summary_sha256);
 const resolveRetry=await tool('oncall.incidents.resolve',resolveArgs);
 assert.equal(resolveRetry.result?.isError,false,JSON.stringify(resolveRetry.body));
 assert.equal(resolveRetry.result.structuredContent.state,'resolved');
 assert.deepEqual(await native(),resolutionAfter,'Approved resolution retry creates no second effect');
 assert.deepEqual(await runtime.outboundRequests(),resolutionEdge);
 const resolutionRows=(await (await http('/agents/api/audit?agent='+encodeURIComponent(runtime.context.agentId))).json()).rows;
 const executionRow=resolutionRows.find(row=>row.decision_id===heldResolution.decision.id);
 assert.equal(executionRow.outcome,'done');assert.ok(executionRow.approval.by.includes(resolutionOwner.id));
 assert.deepEqual(executionRow.classes,savedApproval.classes);
 await capture('resolution-executed',approvalPath,async()=>{await page.locator('[data-approval-state="executed"]').waitFor()});
 await capture('resolution-timeline','/incidents/'+resolutionTarget.id,async()=>{
  await page.getByRole('region',{name:'Timeline',exact:true}).waitFor();
  await page.getByText('Responder assistant for Alex Chen',{exact:true}).first().waitFor();
 });
 assert.equal((await runtime.adopt()).status,200);
 console.log('PASS incident resolution browser: commitment-only approval, exact saved revision, native human approver and agent preparer, one attributed resolution and effect-free retry');
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
 await setLocal(true);
 await page.goto(runtime.origin+paused.path);await page.getByRole('button',{name:'Approve',exact:true}).click();
 await page.locator('[data-approval-state="refused"]').waitFor();
 assert.equal((await native()).apiOutbox.find(row=>row.id===paused.item.id).status,'queued');
 await capture('approval-paused',paused.path);
 await capture('agents-paused','/agents',async()=>{await page.getByText('Agents are paused.',{exact:true}).waitFor()});
 await setLocal(false);
 await page.getByText('Agents are on.',{exact:true}).waitFor();
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
 assert.deepEqual(erasePending.decision.classes.map(({class:risk})=>risk),['destructive','live']);
 const erasePath=new URL(eraseApproval.url).pathname;
 await capture('erase-pending',erasePath);
 await page.getByRole('button',{name:'Approve',exact:true}).click();
 await page.locator('[data-approval-state="executed"]').waitFor();
 const replay=await tool('oncall.privacy.erase',eraseArgs);
 assert.equal(replay.result?.isError,false,JSON.stringify(replay.body));
 assert.equal(replay.result.structuredContent.state,'complete');
 assert.ok(!(await native()).incidents.some(row=>row.id===target));
 await capture('erase-executed',erasePath);
 // Removing a receiver also removes its authority, signing keys and queued work.
 const clientArgs={kind:'client',id:receiver.id,workspaceRevision:(await native()).revision,confirmation:'erase '+receiver.id,idempotency_key:randomUUID()};
 const clientPending=await tool('oncall.privacy.erase',clientArgs),clientApproval=clientPending.result?._meta?.['com.runeditrun/approval'];
 assert.ok(clientApproval,JSON.stringify(clientPending.body));
 assert.deepEqual(clientPending.decision.classes.map(({class:risk,facts})=>({class:risk,facts})),[
  {class:'destructive',facts:{measure:1}},{class:'access',facts:{measure:1,direction:'narrows'}},
  {class:'security',facts:{measure:1,setting:'erasure-credentials'}},{class:'live',facts:{measure:1,service:'agent-service'}}
 ]);
 const clientPath=new URL(clientApproval.url).pathname;
 await capture('erase-client-pending',clientPath,async()=>{
  await page.locator('details').getByText('Details',{exact:true}).click();
  for(const words of [/deleting information/,/access changes/,/security settings/,/running services/]) await page.getByText(words).first().waitFor();
 });
 await page.getByRole('button',{name:'Approve',exact:true}).click();
 await page.locator('[data-approval-state="executed"]').waitFor();
 const clientReplay=await tool('oncall.privacy.erase',clientArgs),afterClient=await native();
 assert.equal(clientReplay.result?.isError,false,JSON.stringify(clientReplay.body));
 assert.ok(!afterClient.apiClients.some(row=>row.id===receiver.id));
 assert.ok(!afterClient.apiOutbox.some(row=>row.client===receiver.id||row.endpoint===endpoint.id));
 assert.deepEqual(clientReplay.decision.classes.map(({class:risk,facts})=>({class:risk,facts})),clientPending.decision.classes.map(({class:risk,facts})=>({class:risk,facts})));
 await capture('erase-client-executed',clientPath);
 // The rendered inventory, including every class fixture reference, agrees
 // with live discovery under either policy. Assertions run at desktop width.
 await page.setViewportSize({width:1440,height:1000});
 for(const [label,document] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await runtime.adopt(document)).status,200);
  const before=await native(),paging=await (await http('/api/paging/state')).json(),edge=await runtime.outboundRequests();
  await page.goto(runtime.origin+'/docs/agents');await page.locator('.docs-article').waitFor();
  const rows=await page.locator('.docs-article table').evaluateAll(tables=>tables.filter(table=>[...table.querySelectorAll('th')].some(th=>th.textContent==='Computed class checks')).flatMap(table=>[...table.querySelectorAll('tbody tr')].map(row=>[...row.querySelectorAll('td')].map(cell=>[...cell.querySelectorAll('code')].map(code=>code.textContent)))));
  const listing=await runtime.mcp('tools/list'),discovery=await runtime.mcp('server/discover'),templates=await runtime.mcp('resources/templates/list');
  assert.equal(listing.status,200);assert.equal(discovery.status,200);assert.equal(templates.status,200);
  assert.equal(listing.result.nextCursor,undefined);
  assert.deepEqual(rows.map(([name,scope,classes])=>({name:name[0],scope:scope[0],classes})),listing.result.tools.map(tool=>({name:tool.name,scope:tool._meta['com.runeditrun/scope'],classes:tool._meta['com.runeditrun/classes']})));
  for(const [name,,classes,checks] of rows){
   const expected=classes.flatMap(cls=>[cls,'tests/agent-door.mjs',...runtime.context.surface.journey.filter(step=>step.tool===name[0]&&step.expect.some(item=>item.class===cls)).map(step=>step.id)]);
   assert.deepEqual(checks,expected,`${name[0]} rendered class references match maintained coverage`);
  }
  assert.deepEqual(templates.result.resourceTemplates,[]);
  assert.equal(discovery.result.capabilities.resources,undefined);
  assert.ok(!rows.some(([names])=>names[0]==='oncall.events.list'));
  await page.getByRole('heading',{name:'Current resource templates',exact:true}).waitFor();
  await page.getByText('No resource templates are exposed.',{exact:false}).waitFor();
  await page.getByRole('heading',{name:'Target capabilities',exact:true}).waitFor();
  assert.deepEqual(await native(),before);assert.deepEqual(await (await http('/api/paging/state')).json(),paging);
  assert.deepEqual(await runtime.outboundRequests(),edge);
  console.log(`PROBE BASE-AGENT-013 rendered ${label}: /docs/agents -> complete ${rows.length}-tool class, scope and fixture inventory agrees with MCP; resources empty; native and paging unchanged; zero outbound requests`);
 }
 assert.equal((await runtime.adopt()).status,200);
 await capture('guide','/docs/agents',async()=>{await page.locator('.docs-article').waitFor()});
 await capture('erasure-data','/docs/data',async()=>{await page.locator('.docs-article').waitFor()});
 console.log('PASS agent door browser: native incident/review/responders, linked/pending/error people, pending/executed/paused approval, Agents and guide; assertions at 1440, browser proof at 1440/390 with overflow, 44px controls and axe measurements');
}catch(error){
 if(page){await page.screenshot({path:`${directory}/agent-door-failure.png`,fullPage:true});console.error('Agent browser failed at',new URL(page.url()).pathname)}
 throw error;
}finally{try{await browser?.close()}finally{await runtime.close()}}
