import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {agentRuntime,agentEffectSnapshot,pauseMatrix} from './agent-door-runtime.mjs';
import {declareFromAlertParity,acknowledgeParity,recoveredResolutionTarget,manualPageFixture,manualPageClasses,manualPageSnapshot,manualPagePolicy,deadlineTarget} from './oncall-agent-fixtures.mjs';
import specialist from './oncall-agent-native.mjs';
import {staleActionSubmitExpectedRevision} from './oncall-agent-action-submit-revisions.mjs';
import {actionSubmitNativeRevision} from './oncall-agent-action-submit-native-revision.mjs';
import {focusedActionEvidenceReplay} from './oncall-agent-action-evidence-replay.mjs';
import {agedActionEvidenceRetention} from './oncall-agent-action-evidence-retention.mjs';
import {agedActionSubmitRetention} from './oncall-agent-action-submit-retention.mjs';
import {actionSubmitResponseLoss} from './oncall-agent-action-submit-response-loss.mjs';
import {changedReassignmentReasonConflict} from './oncall-agent-incident-replay.mjs';
import {scribeClearReadback} from './oncall-agent-role-clear-replay.mjs';
import {readClearedAssignee} from './oncall-agent-assignee-clear-replay.mjs';
import {accessToken,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';
import {openIncidentAction} from './keyboard.mjs';
import {standardServiceRunbookUpdate} from './oncall-agent-service-replay.mjs';
import {declareIncidentFromAlert,savedServiceRunbookBrowser} from './product-browser-journey.mjs';
import {staleOverrideRevision} from './oncall-agent-schedule-replay.mjs';

const weekStart=Date.parse('2026-11-02T00:00:00.000Z'),weekNow=Date.parse('2026-11-04T12:00:00.000Z');
const runtime=await agentRuntime({clock:null}),directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';
let browser,page;
try{
 await mkdir(directory,{recursive:true});
 const {http,tool}=runtime;
 browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-gpu','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({baseURL:runtime.origin,viewport:{width:1440,height:1000}});
 await context.addCookies(runtime.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'}}));
 page=await context.newPage();
 async function capture(label,path,prepare=async()=>{},proofRuntime=runtime,proofPage=page){
  for(const width of [1440,390]){
   await proofPage.setViewportSize({width,height:1000});
   await proofPage.goto(proofRuntime.origin+path);await prepare();
   const fits=await proofPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
   const findings=(await new AxeBuilder({page:proofPage}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations.filter(row=>['serious','critical'].includes(row.impact));
   const controls=await proofPage.locator('button,input:not([type=hidden]),select,textarea').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).map(node=>({label:node.getAttribute('aria-label')??node.textContent?.trim().slice(0,60)??node.name,height:(node.matches('input[type=checkbox],input[type=radio]')?node.labels?.[0]??node:node).getBoundingClientRect().height})).filter(row=>row.height<44));
   if(width===1440){
    assert.ok(fits,`${label} fits ${width}px`);
    assert.deepEqual(findings,[],`${label} has no serious/critical accessibility findings`);
    assert.deepEqual(controls,[],`${label} controls have 44px targets`);
   }
   console.log(`Browser proof ${label} ${width}: fits=${fits} serious/critical=${findings.length} undersized-controls=${controls.length}`);
   await proofPage.screenshot({path:`${directory}/agent-door-${label}-${width}.png`,fullPage:true});
  }
  await proofPage.setViewportSize({width:1440,height:1000});
 }
 // A known native week spans multiple audit cursor pages. Expected cohorts
 // are fixed by the calls below, independently of the page's SQL aggregation.
 // Issue native sessions at real time: SQLite also checks their expiry against
 // its own clock. Freeze only the measured calls, retaining every week boundary.
 await runtime.time(weekStart-1);
 const calls=[];
 async function counted(name,args,classes,decision,outcome){
  const response=await tool(name,args);
  assert.equal(response.decision?.disposition,decision,JSON.stringify(response.body));
  assert.deepEqual(response.decision.classes.map(row=>row.class).sort(),[...classes].sort());
  if(outcome==='done')assert.equal(response.result?.isError,false,JSON.stringify(response.body));
  calls.push({id:response.decision.id,at:new Date(runtime.context.now()).toISOString(),classes,decision,outcome});
 }
 const serviceRead=()=>counted('oncall.services.read',{id:'agent-service'},['standard'],'autonomous','done');
 const scheduleRead=(decision,outcome)=>counted('oncall.schedules.read',{id:'agent-schedule'},['standard','sensitive'],decision,outcome);
 assert.equal((await runtime.adopt()).status,200);
 await serviceRead(); // Sunday is outside the UTC week.
 await runtime.time(weekNow+1);assert.equal((await runtime.adopt()).status,200);
 await scheduleRead('autonomous','done'); // Even one millisecond after now is outside.
 await runtime.time(weekStart+7*86400000);assert.equal((await runtime.adopt()).status,200);
 await serviceRead(); // The next Monday is also retained, but outside this period.
 await runtime.time(weekStart);assert.equal((await runtime.adopt()).status,200);
 await serviceRead(); // The exact UTC Monday boundary is included.
 await runtime.time(weekNow-60000);assert.equal((await runtime.adopt()).status,200);
 for(let index=0;index<201;index++)await serviceRead();
 await scheduleRead('autonomous','done');
 for(const [decision,outcome] of [['review','done'],['approval','pending'],['blocked','refused']]){
  const policy=autonomousPolicy();
  policy.rules.unshift({id:'fixture-sensitive',class:'sensitive',do:decision,...(decision==='approval'?{approver:['sponsor'],wait:'PT1H'}:{})});
  if(decision==='review')policy.reviewers=['sponsor'];
  assert.equal((await runtime.adopt(policy)).status,200);
  await scheduleRead(decision,outcome);
 }
 await runtime.time(weekNow);assert.equal((await runtime.adopt()).status,200);
 await serviceRead(); // The exact current instant is included.
 const expected=[
  {class:'sensitive',decision:'approval',count:1},
  {class:'sensitive',decision:'autonomous',count:1},
  {class:'sensitive',decision:'blocked',count:1},
  {class:'sensitive',decision:'review',count:1},
  {class:'standard',decision:'approval',count:1},
  {class:'standard',decision:'autonomous',count:204},
  {class:'standard',decision:'blocked',count:1},
  {class:'standard',decision:'review',count:1},
 ];
 async function completeAudit(){
  const rows=[];let cursor=null,pages=0;
  for(;;){
   const response=await http('/agents/api/audit'+(cursor?'?after='+encodeURIComponent(cursor):''));
   assert.equal(response.status,200);
   const page=await response.json();
   assert.equal(page.differs_from_policy,0);
   if(!page.rows.length){assert.equal(page.cursor,cursor);break;}
   assert.ok(Number(page.cursor)>Number(cursor),'Audit cursor advances');
   rows.push(...page.rows);cursor=page.cursor;pages++;
  }
  assert.ok(pages>1,'Fixture exercises the complete audit beyond its first cursor page');
  assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
  return rows;
 }
 async function retained(){
  const tables=(await runtime.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name").all()).results;
  return Object.fromEntries(await Promise.all(tables.map(async({name})=>[name,(await runtime.db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all()).results.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))])));
 }
 const beforeCounts=await retained();
 assert.deepEqual(await runtime.outboundRequests(),[],'Native count fixture has zero outbound requests');
 const audit=await completeAudit();
 assert.equal(audit.length,210,'Every counted call, including excluded boundary calls, is retained');
 assert.deepEqual(audit.map(row=>({id:row.id,at:row.at,classes:row.classes.map(item=>item.class),decision:row.decision,outcome:row.outcome})),calls);
 const inWeek=audit.filter(row=>row.at>='2026-11-02T00:00:00.000Z'&&row.at<='2026-11-04T12:00:00.000Z');
 assert.equal(inWeek.length,207);
 const aggregation=new Map();
 for(const row of inWeek)for(const {class:kind} of row.classes){
  const key=kind+':'+row.decision;aggregation.set(key,(aggregation.get(key)??0)+1);
 }
 const sort=rows=>rows.sort((a,b)=>(a.class+':'+a.decision).localeCompare(b.class+':'+b.decision));
 assert.deepEqual(sort([...aggregation].map(([key,count])=>{const [kind,decision]=key.split(':');return {class:kind,decision,count}})),expected,'Retained audit matches the independently frozen native cohorts');
 async function assertCounts(){
  await page.getByRole('heading',{name:'This week',exact:true}).waitFor();
  const rows=await page.locator('table[aria-labelledby="week-title"] tbody tr').evaluateAll(rows=>rows.map(row=>{
   const cell=row.querySelector('[data-agents-count]');
   return {class:cell?.dataset.class,decision:cell?.dataset.decision,count:Number(cell?.textContent)};
  }));
  assert.deepEqual(sort(rows),expected,'Every rendered cohort equals retained audit, with no missing or extra cohorts');
  assert.equal(await page.locator('section[aria-labelledby="week-title"] time').getAttribute('datetime'),'2026-11-02T00:00:00.000Z');
 }
 await capture('weekly-counts','/agents',assertCounts);
 // Reload both presentations against the same frozen audit and durable state.
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.reload();await assertCounts();
 }
 assert.deepEqual(await completeAudit(),audit,'Page reloads retain every audit field');
 assert.deepEqual(await retained(),beforeCounts,'Audit and Agents reads leave all durable records unchanged');
 assert.deepEqual(await runtime.outboundRequests(),[],'Audit and Agents reads attempt zero outbound requests');
 console.log('PROBE BASE-AGENT-009 acceptance 3: native MCP at UTC week boundaries, complete paginated audit and Agents at 1440 and 390 -> 210 retained calls, 207 in period, exactly 8 cohorts, multi-class contributions once each, stable records and zero outbound requests');
 await runtime.time(null);
 // The empty outbound ledger above isolates this edit from the later provider fixtures.
 const declarations=await declareFromAlertParity(runtime,async ({title,alerts:[id]})=>{
  await page.goto(runtime.origin+'/alerts/'+id);
  const [response]=await Promise.all([
   page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().method()==='POST'),
   declareIncidentFromAlert(page,title),
  ]);
  assert.equal(response.status(),200);
  return response.json();
 });
 const savedDeclarations=await agentEffectSnapshot(runtime);
 for(const {mode,human,agent,humanLabel,agentLabel} of declarations){
  for(const [door,incident,label] of [['person',human,humanLabel],['agent',agent,agentLabel]]){
   await capture('alert-declaration-'+mode+'-'+door,'/incidents/'+incident.id,async()=>{
    await page.locator('.detail').getByRole('heading',{name:incident.title,exact:true}).waitFor();
    const entry=page.getByRole('region',{name:'Timeline',exact:true}).getByRole('listitem').filter({hasText:'Incident declared'});
    await entry.getByText(incident.timeline[0].text,{exact:true}).waitFor();
    await entry.getByText(label,{exact:true}).waitFor();
    const runbook=page.getByRole('region',{name:'Runbook',exact:true});
    await runbook.getByText(incident.runbook[0].text,{exact:true}).waitFor();
    if(page.viewportSize().width===1440){
     const steps=await runbook.getByRole('checkbox').evaluateAll(nodes=>nodes.map(node=>({
      text:node.getAttribute('aria-label'),done:node.checked,
     })));
     assert.deepEqual(steps,incident.runbook,'The displayed checklist matches the saved incident');
    }
    if(mode==='autonomous'&&door==='person'){
     await page.getByRole('button',{name:'Incident actions',exact:true}).focus();
     await page.getByRole('tooltip',{name:'Incident actions',exact:true}).waitFor();
    }
   });
  }
 }
 assert.deepEqual(await agentEffectSnapshot(runtime),savedDeclarations,'Viewing saved incidents preserves native and paging custody');
 assert.deepEqual(await runtime.outboundRequests(),[]);
 console.log('PROBE BASE-AGENT-002 5 browser: Alert details button and MCP in both policies; saved incidents, runbooks and separate attribution read at 1440 and 390; zero outbound requests');
 console.log('PROBE BASE-AGENT-003 4 declaration browser: returned incidents under both policies -> saved declaration, copied runbook and agent attribution shown at 1440 and 390; zero outbound requests');
 await acknowledgmentBrowser(runtime,browser,capture);
 await savedServiceRunbookBrowser(page,runtime.origin,await standardServiceRunbookUpdate(runtime));
 await page.setViewportSize({width:1440,height:1000});
 await changedReassignmentReasonConflict(runtime,{async observe({mode,saved,assignee,responder,reason,agentLabel}){
  const before=await agentEffectSnapshot(runtime);
  await capture('reassignment-readback-'+mode,'/incidents/'+saved.id,async()=>{
   await page.getByRole('button',{name:'Assignee: '+responder.name,exact:true}).waitFor();
   const readable=responder.name+' is now assignee. Previously '+assignee.name+'. Reason: '+reason;
   const entry=page.getByRole('region',{name:'Timeline',exact:true}).getByRole('listitem').filter({hasText:readable});
   await entry.getByText(readable,{exact:true}).waitFor();
   await entry.getByText(agentLabel,{exact:true}).waitFor();
  });
  assert.deepEqual(await agentEffectSnapshot(runtime),before,'Viewing the saved reassignment changes no durable records');
  assert.deepEqual(await runtime.outboundRequests(),[]);
 }});
 const retainedRotas=await staleOverrideRevision(runtime,{optionalExpectedRevision:true});
 const beforeRotaReads=await agentEffectSnapshot(runtime),rotaOutbound=[];
 const recordRotaOutbound=request=>{if(new URL(request.url()).origin!==runtime.origin)rotaOutbound.push(request.url())};
 page.on('request',recordRotaOutbound);
 for(const {mode,schedule,holder} of retainedRotas){
  await capture('override-revision-retained-'+mode,'/on-call/'+schedule.id,async()=>{
   await page.getByRole('heading',{name:schedule.name,exact:true}).waitFor();
   const cover=page.locator('.oc-cover-list').getByRole('listitem');
   await cover.getByText(holder,{exact:true}).waitFor();
   if(page.viewportSize().width===1440){
    assert.equal(await cover.count(),1);
    assert.equal(await cover.getByText(/^primary · /).count(),1);
   }
   await cover.scrollIntoViewIfNeeded();
  });
 }
 page.off('request',recordRotaOutbound);
 assert.deepEqual(await agentEffectSnapshot(runtime),beforeRotaReads,'Viewing saved rota cover changes no durable records');
 assert.deepEqual(rotaOutbound,[]);
 assert.deepEqual(await runtime.outboundRequests(),[]);
 assert.equal((await runtime.adopt(heldPolicy())).status,200);
 const followUpFixture=runtime.context.surface.journey.find(row=>row.id==='follow-up');
 const parentResponse=await http('/api/command',{type:'declare',service:'agent-service',
  title:'Synthetic incident with an open follow-up',summary:'Review the saved coordination work',severity:'warning',alerts:[]});
 assert.equal(parentResponse.status,200);
 const parent=await parentResponse.json();
 const rosterResponse=await http('/api/state');assert.equal(rosterResponse.status,200);
 const followUpOwner=(await rosterResponse.json()).members.find(row=>row.active&&row.role==='responder');
 assert.ok(followUpOwner);
 const creation=await tool(followUpFixture.tool,{...followUpFixture.args,title:'Review the deployment handoff',
  incident:parent.id,revision:parent.revision,owner:followUpOwner.id,idempotency_key:randomUUID()});
 assert.equal(creation.status,200);assert.equal(creation.result.isError,false);
 assert.equal(creation.decision.disposition,'review');
 const createdIncident=creation.result.structuredContent;
 const [openAction]=createdIncident.actions,createdEntry=createdIncident.timeline.at(-1);
 const due=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(new Date(followUpFixture.args.due+'T12:00:00Z'));
 const creationText='Follow-up P1: '+openAction.title+' due '+due+', end of day UTC; human review';
 const savedFollowUp=await agentEffectSnapshot(runtime);
 await capture('follow-up-created','/reviews/'+parent.id,async()=>{
  const dialog=page.getByRole('dialog',{name:parent.title,exact:true});
  const material=dialog.locator('.review-material-body');
  const followUps=material.locator('summary').filter({hasText:/^Follow-ups \(/});
  const history=material.locator('summary').filter({hasText:/^From the timeline \(/});
  await history.click();await followUps.click();
  const followUp=followUps.locator('..').getByRole('listitem').filter({hasText:openAction.title});
  const entry=history.locator('..').getByRole('listitem').filter({has:page.getByText(creationText,{exact:true})});
  await followUp.waitFor();
  await entry.getByText(createdEntry.metadata.agent.label,{exact:false}).waitFor();
  await followUp.scrollIntoViewIfNeeded();
  if(page.viewportSize().width===1440){
   assert.equal((await followUp.innerText()).trim(),
    [openAction.title,followUpOwner.name,'P1','due '+due+', end of day UTC','Open','Human review'].join(' · '));
   assert.match(await entry.innerText(),/Responder assistant for Alex Chen · agent coordination record/);
  }
 });
 assert.deepEqual(await agentEffectSnapshot(runtime),savedFollowUp,'Viewing the open follow-up and its history changes no durable records');
 assert.deepEqual(await runtime.outboundRequests(),[]);
 assert.equal((await runtime.adopt()).status,200);
 const submitEvidenceRequests=[];
 const stopEvidence=route=>{submitEvidenceRequests.push(route.request().url());return route.abort()};
 await context.route('https://evidence.example.invalid/**',stopEvidence);
 await staleActionSubmitExpectedRevision(runtime,{
  async approve({handle,saved,owner}){
   await capture('follow-up-submit-revision-pending',new URL(handle.url).pathname,async()=>{await page.locator('[data-approval-state="pending"]').waitFor()});
   await page.goto(handle.url);
   await page.getByText(owner.name,{exact:false}).first().waitFor();
   const submitted=page.waitForRequest(request=>request.method()==='POST'&&new URL(request.url()).pathname.endsWith('/approve'));
   await page.getByRole('button',{name:'Approve',exact:true}).click();
   const posted=(await submitted).postDataJSON();
   assert.equal(posted.revision,saved.revision);assert.equal(posted.summary_sha256,saved.summary_sha256);
   await page.locator('[data-approval-state="executed"]').waitFor();
   await capture('follow-up-submit-revision-executed',new URL(handle.url).pathname,async()=>{await page.locator('[data-approval-state="executed"]').waitFor()});
  },
  async observe({mode,incident,action}){
   await capture('follow-up-submit-revision-'+mode,'/reviews/'+incident.id,async()=>{
    await page.getByRole('dialog',{name:incident.title,exact:true}).waitFor();
    await page.locator('.review-material-body summary').filter({hasText:/^Follow-ups \(/}).click();
    await page.getByText('Awaiting acceptance',{exact:false}).first().waitFor();
    const evidence=page.locator('.review-material-body').getByRole('link',{name:/^Evidence/});await evidence.waitFor();
    if(page.viewportSize().width===1440)assert.equal(await evidence.getAttribute('href'),action.evidence);
    await evidence.scrollIntoViewIfNeeded();
   });
  },
 });
 const submitApprovalPosts=[];
 const recordSubmitApproval=request=>{if(request.method()==='POST'&&new URL(request.url()).pathname.endsWith('/approve'))submitApprovalPosts.push(request.url())};
 page.on('request',recordSubmitApproval);
 await actionSubmitNativeRevision(runtime,{
  async approve({handle,saved,owner}){
   await capture('follow-up-submit-pending',new URL(handle.url).pathname,async()=>{await page.locator('[data-approval-state="pending"]').waitFor()});
   await page.goto(handle.url);
   await page.getByText(owner.name,{exact:false}).first().waitFor();
   const submitted=page.waitForRequest(request=>request.method()==='POST'&&new URL(request.url()).pathname.endsWith('/approve'));
   await page.getByRole('button',{name:'Approve',exact:true}).click();
   const posted=(await submitted).postDataJSON();
   assert.equal(posted.revision,saved.revision);assert.equal(posted.summary_sha256,saved.summary_sha256);
   await page.locator('[data-approval-state="executed"]').waitFor();
   await capture('follow-up-submit-executed',new URL(handle.url).pathname,async()=>{await page.locator('[data-approval-state="executed"]').waitFor()});
  },
  async observe({mode,incident,action}){
   await capture('follow-up-submit-'+mode,'/reviews/'+incident.id,async()=>{
    await page.getByRole('dialog',{name:incident.title,exact:true}).waitFor();
    await page.locator('.review-material-body summary').filter({hasText:/^Follow-ups \(/}).click();
    await page.getByText('Awaiting acceptance',{exact:false}).first().waitFor();
    const evidence=page.locator('.review-material-body').getByRole('link',{name:/^Evidence/});await evidence.waitFor();
    if(page.viewportSize().width===1440)assert.equal(await evidence.getAttribute('href'),action.evidence);
    await evidence.scrollIntoViewIfNeeded();
   });
  },
 });
 assert.equal(submitApprovalPosts.length,1,'One sponsor approval POST; completed-result retries never repeat the approval action');
 page.off('request',recordSubmitApproval);
 const lostResultApprovalPosts=[];
 const recordLostResultApproval=request=>{
  const path=new URL(request.url()).pathname;
  if(request.method()==='POST'&&path.startsWith('/agents/api/approvals/')&&path.endsWith('/approve'))lostResultApprovalPosts.push(path);
 };
 page.on('request',recordLostResultApproval);
 await actionSubmitResponseLoss(runtime,{
  async approve({handle,saved,owner,completionPolicy}){
   const label=completionPolicy==='evidence'?'follow-up-complete-loss':'follow-up-submit-loss';
   await capture(label+'-pending',new URL(handle.url).pathname,async()=>{await page.locator('[data-approval-state="pending"]').waitFor()});
   await page.goto(handle.url);
   await page.getByText(owner.name,{exact:false}).first().waitFor();
   const submitted=page.waitForRequest(request=>request.method()==='POST'&&new URL(request.url()).pathname==='/agents/api/approvals/'+handle.id+'/approve');
   await page.getByRole('button',{name:'Approve',exact:true}).click();
   const posted=(await submitted).postDataJSON();
   assert.equal(posted.revision,saved.revision);assert.equal(posted.summary_sha256,saved.summary_sha256);
   await page.locator('[data-approval-state="executed"]').waitFor();
   assert.equal(lostResultApprovalPosts.filter(path=>path==='/agents/api/approvals/'+handle.id+'/approve').length,1,'The sponsor approves the saved submission exactly once');
   await capture(label+'-executed',new URL(handle.url).pathname,async()=>{await page.locator('[data-approval-state="executed"]').waitFor()});
  },
  async observe({mode,incident,action}){
   if(action.completionPolicy==='evidence'){
    await capture('follow-up-complete-loss-'+mode,'/reviews/'+incident.id,async()=>{
     await page.getByRole('dialog',{name:incident.title,exact:true}).waitFor();
     const material=page.locator('.review-material-body');
     await material.locator('summary').filter({hasText:/^Follow-ups \(/}).click();
     const completed=material.getByRole('listitem').filter({hasText:action.title}).filter({hasText:/· P2 · due .+ · Complete · Completes with evidence/});
     const evidence=completed.getByRole('link',{name:/^Evidence\b/});
     await evidence.waitFor();
     if(page.viewportSize().width===1440)assert.equal(await evidence.getAttribute('href'),action.evidence);
     await evidence.scrollIntoViewIfNeeded();
    });
    return;
   }
   await capture('follow-up-submit-loss-'+mode,'/reviews/'+incident.id,async()=>{
    await page.getByRole('dialog',{name:incident.title,exact:true}).waitFor();
    await page.locator('.review-material-body summary').filter({hasText:/^Follow-ups \(/}).click();
    await page.getByText('Awaiting acceptance',{exact:false}).first().waitFor();
    const evidence=page.locator('.review-material-body').getByRole('link',{name:/^Evidence/});await evidence.waitFor();
    if(page.viewportSize().width===1440)assert.equal(await evidence.getAttribute('href'),action.evidence);
    await evidence.scrollIntoViewIfNeeded();
   });
  },
 });
 assert.equal(lostResultApprovalPosts.length,2,'Each held submission receives one approval across both losses and recoveries');
 page.off('request',recordLostResultApproval);
 assert.deepEqual(submitEvidenceRequests,[],'The browser never fetches submitted evidence');
 await context.unroute('https://evidence.example.invalid/**',stopEvidence);
 // Observe the original P2 write and linked read beside the held revision
 // corrections in the signed-in sponsor and review pages.
 async function connectEvidenceBrowser(evidenceRuntime,{retained=false}={}){
  const evidenceContext=await browser.newContext({baseURL:evidenceRuntime.origin,viewport:{width:1440,height:1000}});
  await evidenceContext.addCookies(evidenceRuntime.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:evidenceRuntime.origin,httpOnly:true,sameSite:'Lax'}}));
  const evidencePage=await evidenceContext.newPage(),evidenceRequests=[],approvalPosts=[];
  await evidenceContext.route('https://evidence.example.invalid/**',route=>{evidenceRequests.push(route.request().url());return route.abort()});
  evidencePage.on('request',request=>{
   const path=new URL(request.url()).pathname;
   if(request.method()==='POST'&&path.endsWith('/approve'))approvalPosts.push({path,body:request.postDataJSON()});
  });
  const proofLabel=revisionCase=>retained?'follow-up-evidence-retained':
   revisionCase?'follow-up-evidence-'+revisionCase+'-revision':'follow-up-evidence';
  let observedApprovalCount=0;
  return {
   async approve({handle,saved,owner,kind='write',revisionCase}){
    const before=approvalPosts.length;
    const approvalPath=new URL(handle.url).pathname;
    if(!retained)await capture(kind==='read'?'follow-up-evidence-read-pending':proofLabel(revisionCase)+'-pending',approvalPath,async()=>{
     await evidencePage.locator('[data-approval-state="pending"]').waitFor();
     await evidencePage.getByText(owner.name,{exact:false}).first().waitFor();
    },evidenceRuntime,evidencePage);
    await evidencePage.goto(handle.url);
    await evidencePage.locator('[data-approval-state="pending"]').waitFor();
    await evidencePage.getByText(owner.name,{exact:false}).first().waitFor();
    await evidencePage.getByRole('button',{name:'Approve',exact:true}).click();
    await evidencePage.locator('[data-approval-state="executed"]').waitFor();
    assert.deepEqual(approvalPosts.slice(before),[{path:'/agents/api/approvals/'+handle.id+'/approve',
     body:{revision:saved.revision,summary_sha256:saved.summary_sha256}}],
     'The named sponsor approves this exact saved decision once');
   },
   async observe({mode,revisionCase,incident,action,handle,approved,linkedIncident}){
    if(revisionCase&&mode==='autonomous')return;
    const response=await evidenceRuntime.http('/api/reviews/'+incident.id+'/material');assert.equal(response.status,200);
    const material=await response.json();
    assert.deepEqual(material.followups,incident.actions,'Protected review material agrees with the stored MCP result');
    assert.equal(material.followups.find(row=>row.id===action.id).done,true);
    assert.equal(material.incidentRevision,incident.revision);
    const completion=material.assertions.find(row=>row.kind==='complete');
    assert.equal(completion.classification,'agent coordination record');
    assert.equal(completion.actor,evidenceRuntime.context.agentId);
    if(linkedIncident){
     assert.deepEqual(material.followups,linkedIncident.actions);
     assert.equal(material.incidentRevision,linkedIncident.revision);
    }
    const state=await (await evidenceRuntime.http('/api/state')).json();
    const actionOwner=state.members.find(row=>row.id===action.owner);assert.ok(actionOwner);
    const label=proofLabel(revisionCase);
    await capture(label+'-'+mode,'/reviews/'+incident.id,async()=>{
     await evidencePage.getByRole('dialog',{name:incident.title,exact:true}).waitFor();
     const followups=evidencePage.locator('.review-material-body details').filter({has:evidencePage.locator('summary').filter({hasText:/^Follow-ups \(/})});
     await followups.locator('summary').click();
     const item=followups.locator('li').filter({hasText:action.title});await item.waitFor();
     const evidence=item.getByRole('link',{name:/^Evidence/});await evidence.waitFor();
     if(evidencePage.viewportSize().width===1440){
      const text=await item.innerText();
      assert.ok(text.includes(actionOwner.name));assert.match(text,/due Apr 12, end of day UTC/);
      assert.match(text,/P2/);assert.match(text,/Complete · Completes with evidence/);
      assert.ok(!text.includes('Awaiting acceptance'));
      assert.equal(await evidence.getAttribute('href'),action.evidence);
      if(linkedIncident){
       const companion=linkedIncident.actions.find(row=>row.id!==action.id);
       const companionItem=followups.getByRole('listitem').filter({hasText:companion.title});
       assert.match(await companionItem.innerText(),/P3.*Open.*Human review/);
       assert.equal(await companionItem.getByRole('link',{name:/^Evidence/}).count(),0);
      }
     }
     await evidence.scrollIntoViewIfNeeded();
    },evidenceRuntime,evidencePage);
    if(handle)await capture(label+'-executed',new URL(handle.url).pathname,async()=>{
     await evidencePage.locator('[data-approval-state="executed"]').waitFor();
     if(evidencePage.viewportSize().width===1440){
      assert.equal(await evidencePage.getByRole('button',{name:'Approve',exact:true}).count(),0);
      if(approved){
       const response=await evidenceRuntime.http('/agents/api/approvals/'+handle.id);assert.equal(response.status,200);
       assert.deepEqual((await response.json()).approval,approved);
      }
     }
    },evidenceRuntime,evidencePage);
    if(mode==='held')observedApprovalCount+=linkedIncident?2:1;
    assert.equal(approvalPosts.length,observedApprovalCount,
     'The held write and linked read each use their own approval without repeats');
    assert.deepEqual(evidenceRequests,[],'Saved material and approval never fetch the evidence URL');
    console.log('PROBE BASE-AGENT-012 '+(retained?'aged ':'')+'evidence completion browser '+mode+(revisionCase?' '+revisionCase+' revision correction':'')+': protected review material equals MCP result; saved P2 Complete and Completes with evidence plus retained evidence link at 1440 and 390; original sponsor approval '+(handle?'executed once':'not needed')+'; zero evidence requests');
   },
   close:()=>evidenceContext.close(),
  };
 }
 await focusedActionEvidenceReplay({connect:connectEvidenceBrowser});
 await agedActionEvidenceRetention({connect:runtime=>connectEvidenceBrowser(runtime,{retained:true})});
 // Each retained submission has isolated native custody. The browser takes
 // the held sponsor step once at T, then only reads the retained result.
 await agedActionSubmitRetention({async connect(retainedRuntime,mode){
  const retainedContext=await browser.newContext({baseURL:retainedRuntime.origin,viewport:{width:1440,height:1000}});
  await retainedContext.addCookies(retainedRuntime.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:retainedRuntime.origin,httpOnly:true,sameSite:'Lax'}}));
  const retainedPage=await retainedContext.newPage(),evidenceRequests=[],approvalPosts=[];
  await retainedContext.route('https://evidence.example.invalid/**',route=>{evidenceRequests.push(route.request().url());return route.abort()});
  retainedPage.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname.endsWith('/approve'))approvalPosts.push(request.postDataJSON())});
  return {
   async approve({handle,saved,owner}){
    await retainedPage.goto(handle.url);
    await retainedPage.locator('[data-approval-state="pending"]').waitFor();
    await retainedPage.getByText(owner.name,{exact:false}).first().waitFor();
    await retainedPage.getByRole('button',{name:'Approve',exact:true}).click();
    await retainedPage.locator('[data-approval-state="executed"]').waitFor();
    assert.deepEqual(approvalPosts,[{revision:saved.revision,summary_sha256:saved.summary_sha256}],'The sponsor posts the exact saved approval once at T');
   },
   async observe({elapsed,incident,action,handle,approved}){
    // The helper compares custody at both boundaries. Capture each changed
    // screen once per width after the last boundary on realistic native data.
    if(elapsed!==86401000)return;
    await capture('follow-up-submit-retained-'+mode,'/reviews/'+incident.id,async()=>{
     await retainedPage.getByRole('dialog',{name:incident.title,exact:true}).waitFor();
     await retainedPage.locator('.review-material-body summary').filter({hasText:/^Follow-ups \(/}).click();
     await retainedPage.getByText('Awaiting acceptance',{exact:false}).first().waitFor();
     const evidence=retainedPage.locator('.review-material-body').getByRole('link',{name:/^Evidence/});await evidence.waitFor();
     if(retainedPage.viewportSize().width===1440)assert.equal(await evidence.getAttribute('href'),action.evidence);
     await evidence.scrollIntoViewIfNeeded();
    },retainedRuntime,retainedPage);
    if(handle)await capture('follow-up-submit-retained-approval',new URL(handle.url).pathname,async()=>{
     await retainedPage.locator('[data-approval-state="executed"]').waitFor();
     if(retainedPage.viewportSize().width===1440){
      assert.equal(await retainedPage.getByRole('button',{name:'Approve',exact:true}).count(),0);
      const response=await retainedRuntime.http('/agents/api/approvals/'+handle.id);assert.equal(response.status,200);
      assert.deepEqual((await response.json()).approval,approved,'The original executed approval is unchanged after retained-result retrieval');
     }
    },retainedRuntime,retainedPage);
    assert.equal(approvalPosts.length,mode==='held'?1:0,'Aged retrieval never posts another approval');
    assert.deepEqual(evidenceRequests,[],'Neither retained follow-up nor original approval fetches evidence');
   },
   close:()=>retainedContext.close(),
  };
 }});
 await specialist({request:runtime.request,origin:runtime.origin,cookie:runtime.cookie,fixtures:runtime.fixtures,tool});
 const native=async()=> (await (await http('/api/state')).json());
 let state=await native();
 const incident=state.incidents.find(row=>row.title==='Payment authorization failures after deployment');
 const responder=state.members.find(row=>row.role==='responder'),admin=state.members.find(row=>row.name==='Jordan Davis');
 const team=[{id:randomUUID(),email:'mira@example.invalid',name:'Mira Patel',role:'member',invite:1},{id:randomUUID(),email:'jordan@example.invalid',name:'Jordan Davis',role:'admin',invite:1}];
 await runtime.settings(team,2);
 assert.equal((await http('/api/rer/people-link',{businessId:team[0].id,memberId:responder.id,revision:2})).status,303);
 // Show each saved null response role through the ordinary incident page.
 for(const [role,label,timelineLabel] of [['scribe','Scribe','Scribe'],['communications','Communications','Communications lead'],['commander','Lead','Lead'],['assignee','Assignee','Assignee']]){
  for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
   assert.equal((await runtime.adopt(policy)).status,200);
   const command=async input=>{const response=await http('/api/command',input);assert.equal(response.status,200);return response.json()};
   const owner=(await (await http('/api/workspace')).json()).member,assignee=role==='commander'?owner:responder;
   let target=await command({type:'declare',service:'agent-service',title:'Synthetic saved '+label+' clear '+mode,
    summary:'Ordinary coordination without protected evidence',severity:'warning',alerts:[]});
   target=await command({type:'transition',incident:target.id,revision:target.revision,state:'acknowledged',summary:'Synthetic human acknowledgment'});
   target=await command({type:'reassign',incident:target.id,revision:target.revision,member:responder.id,reason:'Synthetic explicit assignee'});
   if(role==='commander')target=await command({type:'reassign',incident:target.id,revision:target.revision,member:owner.id,reason:'Synthetic distinct explicit assignee'});
   for(const [field,member] of [['scribe',role==='scribe'?responder.id:owner.id],['communications',role==='communications'?responder.id:owner.id],...(role==='commander'?[['commander',responder.id]]:[])])
    target=await command({type:'assign-role',incident:target.id,revision:target.revision,role:field,member,reason:'Synthetic companion responsibility'});
   assert.equal(target[role],responder.id);assert.equal(target.assignee,assignee.id);
   if(['commander','assignee'].includes(role))assert.notEqual(target.assignee,target.commander);
   const reason='Synthetic saved '+label+' clear '+mode,edge=await runtime.outboundRequests();
   const change=role==='assignee'?'reassign':'assign-role';
   const {context:agent}=runtime;
   const bearer=role==='scribe'?await accessToken(agent,{act:{sub:agent.agentId,name:'Responder assistant',specialist:'oncall-responder'}}):undefined;
   const answer=await tool('oncall.incidents.update',{change,...(role==='assignee'?{}:{role}),member:null,
    incident:target.id,revision:target.revision,reason,idempotency_key:randomUUID()},{},bearer);
   assert.equal(answer.result.isError,false);assert.deepEqual(answer.decision.classes.map(row=>row.class),['standard']);
   const saved=role==='assignee'?await readClearedAssignee(runtime,{mode,first:answer}):answer.result.structuredContent;
   assert.deepEqual(saved,{...target,[role]:null,revision:target.revision+1,timeline:saved.timeline});
   if(role==='scribe')await scribeClearReadback(runtime,answer,bearer,mode);
   const readingBefore=await agentEffectSnapshot(runtime);
   const lead='Lead: '+(role==='commander'?'Unassigned':owner.name),assigned='Assignee: '+(role==='assignee'?'Unassigned':assignee.name);
   await page.goto(runtime.origin+'/incidents/'+saved.id);
   await page.getByRole('button',{name:lead,exact:true}).waitFor();
   await page.getByRole('button',{name:assigned,exact:true}).waitFor();
   if(role==='assignee'){
    await page.getByRole('button',{name:assigned,exact:true}).click();
    const picker=page.getByRole('dialog',{name:'Choose assignee',exact:true});
    assert.equal(await picker.getByRole('option',{name:'Unassigned',exact:true}).getAttribute('aria-selected'),'true');
    await picker.getByRole('button',{name:'Close picker',exact:true}).click();
   }
   const people=await openIncidentAction(page,'People and priority');
   assert.equal(await people.getByRole('combobox',{name:'Scribe',exact:true}).inputValue(),role==='scribe'?'':owner.id);
   assert.equal(await people.getByRole('combobox',{name:'Communications',exact:true}).inputValue(),role==='communications'?'':owner.id);
   await people.getByRole('button',{name:'Close',exact:true}).click();
   const readable=timelineLabel+' is now unassigned. Previously '+responder.name+'. Reason: '+reason;
   const timeline=page.getByRole('region',{name:'Timeline',exact:true});await timeline.waitFor();
   const entry=timeline.getByRole('listitem').filter({hasText:readable});
   await entry.getByText(readable,{exact:true}).waitFor();
   await entry.getByText('Responder assistant for Alex Chen',{exact:true}).waitFor();
   if(mode==='held'||role==='scribe'||role==='assignee'){
    const proof=role+(mode==='autonomous'?'-autonomous':'')+'-cleared';
    await capture(proof+'-timeline','/incidents/'+saved.id,async()=>{
     await page.getByRole('button',{name:lead,exact:true}).waitFor();
     await page.getByRole('button',{name:assigned,exact:true}).waitFor();
     const entry=page.getByRole('region',{name:'Timeline',exact:true}).getByRole('listitem').filter({hasText:readable});
     await entry.getByText(readable,{exact:true}).waitFor();
     await entry.getByText('Responder assistant for Alex Chen',{exact:true}).waitFor();
    });
    await capture(proof+'-people','/incidents/'+saved.id,async()=>{
     const people=await openIncidentAction(page,'People and priority');
     await people.getByRole('combobox',{name:'Scribe',exact:true}).waitFor();
     await people.getByRole('button',{name:'Close',exact:true}).focus();
     await page.getByRole('tooltip',{name:'Close dialog',exact:true}).waitFor();
    });
   }
   assert.deepEqual((await native()).incidents.find(row=>row.id===saved.id),saved,'Reading the saved incident creates no native effect');
   assert.deepEqual(await agentEffectSnapshot(runtime),readingBefore,'Saved-role page reads preserve all native records, revisions, timeline, state-changing audit, calls, outcomes, expiry, approvals, reviews and paging');
   assert.deepEqual(await runtime.outboundRequests(),edge);
  }
  console.log('PROBE BASE-AGENT-012 '+label+' clear browser: autonomous and held MCP -> saved Unassigned '+label+', preserved companion responsibilities, attributed native timeline; changed incident shown at 1440 and 390; zero outbound requests');
 }
 assert.equal((await runtime.adopt()).status,200);
 async function setLocal(paused){
  await page.goto(runtime.origin+'/agents');
  const response=page.waitForResponse(answer=>new URL(answer.url()).pathname==='/agents/api/pause'&&answer.request().method()==='POST');
  await page.getByRole('button',{name:paused?'Pause agents':'Resume agents',exact:true}).click();
  assert.equal((await response).status(),200);
  await page.getByRole('button',{name:paused?'Resume agents':'Pause agents',exact:true}).waitFor();
  assert.equal((await (await http('/agents/api/state')).json()).paused.local,paused);
 }
 // Both policies use the existing manual update door. Only held live work
 // reaches the returned person URL; its form sends the exact saved decision.
 await manualPagePolicy(runtime);
 const manualEdge=await runtime.outboundRequests();
 for(const mode of ['autonomous','held']){
  assert.equal((await runtime.adopt(mode==='held'?heldPolicy():autonomousPolicy())).status,200);
  const args=manualPageFixture(mode==='autonomous'?responder.id:undefined,'Synthetic '+mode+' manual coordination');
  const before=await manualPageSnapshot(runtime),answer=await tool('oncall.incidents.update',args);
  assert.deepEqual(answer.decision.classes.map(({class:risk,facts})=>({class:risk,facts})),manualPageClasses);
  let saved;
  if(mode==='held'){
   assert.equal(answer.result?.resultType,'input_required');
   assert.deepEqual(await manualPageSnapshot(runtime),before,'Pending browser approval creates no manual operation');
   const handle=answer.result._meta['com.runeditrun/approval'],url=new URL(handle.url);
   assert.equal(url.origin,runtime.origin);
   saved=(await (await http('/agents/api/approvals/'+handle.id)).json()).approval;
   assert.deepEqual(saved.classes,manualPageClasses);
   assert.deepEqual(saved.summary.nativeTarget,{kind:'service',id:'agent-service'});
   await capture('manual-page-pending',url.pathname,async()=>{await page.locator('[data-approval-state="pending"]').waitFor()});
   await page.goto(handle.url);
   const submitted=page.waitForRequest(request=>request.method()==='POST'&&new URL(request.url()).pathname.endsWith('/approve'));
   await page.getByRole('button',{name:'Approve',exact:true}).click();
   const decision=(await submitted).postDataJSON();
   assert.equal(decision.revision,saved.revision);
   assert.equal(decision.summary_sha256,saved.summary_sha256);
   await page.locator('[data-approval-state="executed"]').waitFor();
   const executed=(await (await http('/agents/api/approvals/'+handle.id)).json()).approval;
   assert.equal(executed.revision,saved.revision);assert.equal(executed.summary_sha256,saved.summary_sha256);
   await capture('manual-page-executed',url.pathname,async()=>{await page.locator('[data-approval-state="executed"]').waitFor()});
  }else assert.equal(answer.result?.isError,false,JSON.stringify(answer.body));
  const once=await manualPageSnapshot(runtime),incident=once.application.incidents.find(row=>row.manualPage?.operation===args.operationId);
  assert.ok(incident);assert.equal(once.application.revision,before.application.revision+1);assert.equal(once.commits.length,before.commits.length+1);
  assert.equal(incident.manualPage.obligations.length,1);
  assert.equal(incident.manualPage.obligations[0].state,'recorded');assert.equal(incident.manualPage.obligations[0].paging,'off');assert.equal(incident.manualPage.obligations[0].automatic,false);
  const entries=incident.timeline.filter(row=>row.kind==='manual-page');assert.equal(entries.length,1);
  assert.equal(entries[0].metadata.agent.agent.id,runtime.context.agentId);
  if(saved)assert.ok(entries[0].metadata.agent.approvers.some(row=>row.id===before.application.members.find(row=>row.name==='Alex Chen').id));
  const retry=await tool('oncall.incidents.update',args);
  assert.equal(retry.result?.isError,false,JSON.stringify(retry.body));assert.deepEqual(retry.result.structuredContent,incident);
  assert.deepEqual(await manualPageSnapshot(runtime),once,'Browser-approved manual retry has no second application effect');
  assert.deepEqual(await runtime.outboundRequests(),manualEdge,'Manual pages issue zero outbound requests');
  if(mode==='held')await capture('manual-page-timeline','/incidents/'+incident.id,async()=>{
   await page.getByRole('region',{name:'Timeline',exact:true}).waitFor();
   await page.getByText('Responder assistant for Alex Chen',{exact:true}).first().waitFor();
  });
 }
 assert.equal((await runtime.adopt()).status,200);
 console.log('PROBE SURFACE-002 8 browser: autonomous manual update and held policy target -> pending without effect, returned signed-in URL submits exact saved revision and summary, one attributed operation, identical retry unchanged, zero outbound requests; screens at 1440 and 390');

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
 // Default cards are decisions, while deliberately opened details retain
 // the exact native identity and revision used by the approval fence.
 await page.setViewportSize({width:1440,height:1000});
 for (const path of ['/agents',approvalPath]) {
  await page.goto(runtime.origin+path);
  const summary=page.locator('[data-approval-summary]').filter({hasText:resolutionTarget.title});
  await summary.waitFor();
  const visible=await summary.innerText();
  for(const raw of [resolutionTarget.id,'Revision '+resolutionTarget.revision,'state: resolved','summary:']) assert.ok(!visible.includes(raw),'default approval omits internal identity and field dumps');
  assert.ok(visible.includes(resolveArgs.summary),'the proposed authored change stays visible');
  assert.ok(visible.includes(resolutionBefore.services.find(row=>row.id===resolutionTarget.service).name),'the target service is named');
  assert.ok((await page.locator('body').innerText()).includes('Responder assistant for Alex Chen'),'the requesting agent and sponsor are named');
 }
 const details=page.locator('[data-approval-summary] details');await details.locator(':scope > summary').click();
 assert.ok((await details.innerText()).includes(resolutionTarget.id),'deliberate details retain the native identity');
 assert.ok((await details.innerText()).includes('Revision '+resolutionTarget.revision),'deliberate details retain the saved revision');
 await details.locator(':scope > summary').click();
 const filterPath='/incidents?triage_status=recovered&triage_service='+encodeURIComponent(resolutionTarget.service)+'&triage_priority=unset&triage_urgency=low';
 await page.goto(runtime.origin+filterPath);await page.locator('.triage-filters summary').click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'readable filters fit desktop');
 assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations.filter(row=>['serious','critical'].includes(row.impact)),[],'readable filters have no serious/critical accessibility findings');
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${directory}/agent-door-readable-filters-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:1440,height:1000});
 const filters=page.locator('.triage-filters');
 for(const name of ['Incident status','Filter urgency','Filter priority','Filter severity']){
  const options=await filters.getByLabel(name,{exact:true}).locator('option').evaluateAll(rows=>rows.map(row=>({value:row.value,text:row.textContent})));
  for(const option of options.filter(row=>row.value&&!/^P[1-5]$/.test(row.value)))assert.notEqual(option.text,option.value,'filter options present words instead of wire enums');
 }
 const chips=await page.getByRole('list',{name:'Applied filters',exact:true}).innerText();
 assert.ok(!chips.includes('unset')&&!chips.includes('recovered')&&!chips.includes('low'),'applied filters use the same readable values');
 const matching=await (await http('/api/triage?status=recovered&service='+encodeURIComponent(resolutionTarget.service)+'&priority=unset&urgency=low')).json();
 assert.ok(matching.items.some(row=>row.id===resolutionTarget.id),'readable filters still select the native incident');
 await page.locator('.incident').filter({hasText:resolutionTarget.title}).waitFor();
 assert.deepEqual(await native(),resolutionBefore,'reading cards and filters preserves native values');
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
 const resolutionEffects=await agentEffectSnapshot(runtime);
 const lostResolution=await runtime.discardToolResponse('oncall.incidents.resolve',resolveArgs);
 assert.equal(lostResolution.status,200);
 assert.equal(lostResolution.discarded,true);
 assert.equal(lostResolution.aborted,true);
 assert.equal(lostResolution.bodyRead,false);
 assert.notEqual(lostResolution.id,heldResolution.body.id);
 assert.deepEqual(await agentEffectSnapshot(runtime),resolutionEffects,'Losing the completed browser-approved result preserves native and approval custody');
 const changedSummary='A different summary for the completed browser resolution';
 const resolveConflict=await tool('oncall.incidents.resolve',{...resolveArgs,summary:changedSummary});
 assert.equal(resolveConflict.result?.isError,true);
 assert.equal(resolveConflict.result._meta['com.runeditrun/error'].code,'idempotency_conflict');
 assert.equal(resolveConflict.result.structuredContent,undefined);
 const resolveRetry=await tool('oncall.incidents.resolve',resolveArgs);
 assert.equal(resolveRetry.result?.isError,false,JSON.stringify(resolveRetry.body));
 assert.notEqual(resolveRetry.body.id,lostResolution.id);
 assert.equal(resolveRetry.result.structuredContent.state,'resolved');
 assert.deepEqual(resolveRetry.result.structuredContent,resolvedIncident,'The recovered result is the incident the sponsor resolved');
 const resolutionCall=resolutionEffects.records.agent_door_calls.find(row=>row.agent===runtime.context.agentId&&row.key===resolveArgs.idempotency_key);
 assert.equal(resolutionCall.state,'done');
 const {receipt,decision}=JSON.parse(resolutionCall.outcome);
 assert.equal(receipt.approval_id,approvalHandle.id);
 assert.deepEqual(resolveRetry.result._meta['com.runeditrun/receipt'],{...receipt,decision});
 assert.deepEqual(await native(),resolutionAfter,'Approved resolution retry creates no second effect');
 assert.deepEqual(await agentEffectSnapshot(runtime),resolutionEffects,'Recovering the browser-approved result preserves native and approval custody');
 assert.deepEqual(await runtime.outboundRequests(),resolutionEdge);
 const resolutionRows=(await completeAudit()).filter(row=>row.agent.id===runtime.context.agentId);
 const executionRow=resolutionRows.find(row=>row.decision_id===heldResolution.decision.id);
 assert.equal(executionRow.outcome,'done');assert.ok(executionRow.approval.by.includes(resolutionOwner.id));
 assert.deepEqual(executionRow.classes,savedApproval.classes);
 await capture('resolution-executed',approvalPath,async()=>{await page.locator('[data-approval-state="executed"]').waitFor()});
 await capture('resolution-timeline','/incidents/'+resolutionTarget.id,async()=>{
  await page.getByRole('region',{name:'Timeline',exact:true}).waitFor();
  if(await page.getByRole('button',{name:/^Earlier entries/}).count())await page.getByRole('button',{name:/^Earlier entries/}).click();
  if((await page.viewportSize()).width===1440){
   const headings=await page.locator('.event-line strong').allTextContents();
   for(const raw of ['transition','complete','incident deadline'])assert.ok(!headings.includes(raw),'timeline headings describe activity');
   const timeline=await page.getByRole('region',{name:'Timeline',exact:true}).innerText();
   assert.ok(timeline.includes(resolveArgs.summary),'The original summary remains visible after the conflict and retry');
   assert.ok(!timeline.includes(changedSummary),'The refused summary never enters the timeline');
  }
  await page.getByText('Responder assistant for Alex Chen',{exact:true}).first().waitFor();
 });
 assert.equal((await runtime.adopt()).status,200);
 console.log('PASS incident resolution browser: commitment-only approval, exact saved revision, one attributed resolution visible after the completed response was lost and recovered');
 // The real signed-in URL holds each recorded deadline effect for its sponsor.
 for(const change of ['snooze','cancel-deadline','expire-deadline']){
  await runtime.time(Date.parse('2026-11-04T12:00:00.000Z'));
  assert.equal((await runtime.adopt()).status,200);
  const {incident:target,deadline,args}=await deadlineTarget(runtime,change,'browser '+change);
  if(change==='expire-deadline')await runtime.time(Date.parse(deadline.dueAt)+1);
  const document=autonomousPolicy();document.rules.unshift({id:'deadline-live-approval',class:'live',do:'approval',approver:['sponsor'],wait:'PT1H'});
  assert.equal((await runtime.adopt(document)).status,200);
  const before=await native(),paging=await (await http('/api/paging/state')).json(),edge=await runtime.outboundRequests();
  const answer=await tool('oncall.incidents.update',args);
  assert.equal(answer.result?.resultType,'input_required');assert.equal(answer.decision.disposition,'approval');
  assert.deepEqual(answer.decision.classes.map(({class:cls,do:action,facts})=>({class:cls,do:action,facts})),[
   {class:'standard',do:'autonomous',facts:{measure:1}},
   {class:'sensitive',do:'autonomous',facts:{measure:2,kind:'personal_or_incident_evidence'}},
   {class:'live',do:'approval',facts:{measure:1,service:'agent-service'}},
  ]);
  assert.deepEqual(await native(),before);assert.deepEqual(await (await http('/api/paging/state')).json(),paging);
  const handle=answer.result._meta['com.runeditrun/approval'],path=new URL(handle.url).pathname;
  const saved=(await (await http('/agents/api/approvals/'+handle.id)).json()).approval;
  assert.deepEqual(saved.summary.nativeTarget,{kind:'incident',id:target.id});
  assert.ok(saved.summary.items.includes('Revision '+target.revision));
   assert.ok(saved.summary.items.includes({snooze:'Record a snooze; paging OFF','cancel-deadline':'Cancel pending re-trigger deadlines; paging OFF','expire-deadline':'Record due re-trigger expiry; paging OFF'}[change]));
  await capture('deadline-'+change+'-pending',path,async()=>{
   await page.locator('[data-approval-state="pending"]').waitFor();
   await page.locator('details').getByText('Details',{exact:true}).click();
   await page.getByText(/running services/).first().waitFor();
  });
  await page.goto(runtime.origin+path);
  const submission=page.waitForRequest(request=>request.method()==='POST'&&new URL(request.url()).pathname.endsWith('/approve'));
  await page.getByRole('button',{name:'Approve',exact:true}).click();
  const posted=(await submission).postDataJSON();
  assert.equal(posted.revision,saved.revision);assert.equal(posted.summary_sha256,saved.summary_sha256);
  await page.locator('[data-approval-state="executed"]').waitFor();
  const after=await native(),current=after.incidents.find(row=>row.id===target.id);
  assert.equal(after.revision,before.revision+1);
  const added=current.timeline.filter(row=>!target.timeline.some(old=>old.id===row.id));
  assert.ok(added.length>0);
  const owner=(await (await http('/api/workspace')).json()).member;
  for(const entry of added){
   assert.equal(entry.metadata.agent.agent.id,runtime.context.agentId);
   assert.ok(entry.metadata.agent.approvers.some(row=>row.id===owner.id));
  }
  if(change==='snooze')assert.equal(current.deadlines.filter(row=>row.state==='pending').length,1);
  if(change==='cancel-deadline')assert.equal(current.deadlines.find(row=>row.id===deadline.id).state,'cancelled');
  if(change==='expire-deadline'){
   const fired=current.deadlines.find(row=>row.id===deadline.id);
   assert.equal(fired.state,'fired');assert.equal(fired.obligation.state,'recorded');
   assert.equal(fired.obligation.paging,'off');assert.equal(fired.obligation.automatic,false);
   assert.equal(current.timeline.filter(row=>row.id==='deadline-fired:'+deadline.id).length,1);
  }
  const executed=(await (await http('/agents/api/approvals/'+handle.id)).json()).approval;
  assert.equal(executed.revision,saved.revision);assert.equal(executed.summary_sha256,saved.summary_sha256);
  const retry=await tool('oncall.incidents.update',args);assert.equal(retry.result?.isError,false,JSON.stringify(retry.body));
  assert.deepEqual(retry.result.structuredContent,current);assert.deepEqual(await native(),after);
  assert.deepEqual(await (await http('/api/paging/state')).json(),{...paging,workspaceRevision:before.revision+1});
  assert.deepEqual(await runtime.outboundRequests(),edge);
  await capture('deadline-'+change+'-executed',path,async()=>{await page.locator('[data-approval-state="executed"]').waitFor()});
  console.log('PROBE SURFACE-002 acceptance 8 browser '+change+': signed-in approval URL at 1440 and 390 -> held live class, exact saved revision approved, one attributed recorded effect, identical retry, paging unchanged and zero outbound requests');
 }
 await runtime.time(null);
 assert.equal((await runtime.adopt()).status,200);

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
  assert.deepEqual(templates.result.resourceTemplates.map(row=>row.uriTemplate),[...runtime.context.surface.resources].sort());
  assert.deepEqual(discovery.result.capabilities.resources,{subscribe:false,listChanged:false});
  assert.ok(!rows.some(([names])=>names[0]==='oncall.events.list'));
  await page.getByRole('heading',{name:'Current resource templates',exact:true}).waitFor();
  const renderedResources=await page.locator('.docs-article li code').allTextContents();
  for(const {uriTemplate} of templates.result.resourceTemplates)assert.ok(renderedResources.includes(uriTemplate),'The guide lists '+uriTemplate);
  await page.getByRole('heading',{name:'Target capabilities',exact:true}).waitFor();
  const inventoryRegion=page.locator('.docs-table').filter({has:page.getByRole('columnheader',{name:'Computed class checks',exact:true})}).first();
  await inventoryRegion.focus();
  await inventoryRegion.press('ArrowRight');
  await page.waitForFunction(region=>region.scrollLeft>0,await inventoryRegion.elementHandle());
  assert.ok(await inventoryRegion.evaluate(region=>region.contains(document.activeElement)||region===document.activeElement),'The complete inventory remains keyboard scrollable');
  assert.deepEqual(await native(),before);assert.deepEqual(await (await http('/api/paging/state')).json(),paging);
  assert.deepEqual(await runtime.outboundRequests(),edge);
  console.log(`PROBE BASE-AGENT-013 rendered ${label}: /docs/agents -> complete ${rows.length}-tool class, scope and fixture inventory agrees with MCP; ${templates.result.resourceTemplates.length} resource templates; native and paging unchanged; zero outbound requests`);
 }
 assert.equal((await runtime.adopt()).status,200);
 await capture('guide','/docs/agents',async()=>{await page.locator('.docs-article').waitFor()});
 await capture('erasure-data','/docs/data',async()=>{await page.locator('.docs-article').waitFor()});
 console.log('PASS agent door browser: native incident/review/responders, linked/pending/error people, pending/executed/paused approval, Agents and guide; assertions at 1440, browser proof at 1440/390 with overflow, 44px controls and axe measurements');
}catch(error){
 if(page){await page.screenshot({path:`${directory}/agent-door-failure.png`,fullPage:true});console.error('Agent browser failed at',new URL(page.url()).pathname)}
 throw error;
}finally{try{await browser?.close()}finally{await runtime.close()}}

// Reuse the same two-role parity journey in push Verify's browser invocation.
await (await import('./oncall-agent-resource-parity.mjs')).resourceParity({browserProof:true});

async function acknowledgmentBrowser(runtime,browser,capture) {
 const {member,cookie}=await runtime.memberSession('Synthetic acknowledgment responder','responder');
 const context=await browser.newContext({baseURL:runtime.origin,viewport:{width:1440,height:1000}});
 await context.addCookies(cookie.split('; ').map(pair=>{
  const at=pair.indexOf('=');
  return {name:pair.slice(0,at),value:pair.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'};
 }));
 const outbound=[];
 context.on('request',request=>{
  const url=new URL(request.url());
  if(['http:','https:'].includes(url.protocol)&&url.origin!==runtime.origin)outbound.push(url.origin);
 });
 const page=await context.newPage();
 try{
  const pairs=await acknowledgeParity(runtime,member,async (incident,summary)=>{
   await page.goto('/incidents/'+incident.id);
   const [response]=await Promise.all([
    page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().method()==='POST'),
    page.getByRole('region',{name:'Next step',exact:true}).getByRole('button',{name:'Acknowledge',exact:true}).click(),
   ]);
   assert.equal(response.status(),200);
   assert.deepEqual(response.request().postDataJSON(),{
    type:'transition',state:'acknowledged',incident:incident.id,revision:incident.revision,summary,
   });
   return response.json();
  });
  const saved=await agentEffectSnapshot(runtime);
  for(const {mode,human,agent,humanLabel,agentLabel} of pairs){
   for(const [door,incident,label] of [['person',human,humanLabel],['agent',agent,agentLabel]]){
    await capture('acknowledgment-'+mode+'-'+door,'/incidents/'+incident.id,async()=>{
     const detail=page.locator('.detail');
     await detail.getByRole('heading',{name:incident.title,exact:true}).waitFor();
     const state=await detail.locator('.incident-state').textContent();
     const lead=await detail.getByRole('button',{name:/^Lead:/}).getAttribute('aria-label');
     const assignee=await detail.getByRole('button',{name:/^Assignee:/}).getAttribute('aria-label');
     const entry=detail.getByRole('region',{name:'Timeline',exact:true}).getByRole('listitem')
      .filter({hasText:incident.timeline.at(-1).text});
     const named=entry.locator('.named-responder');
     const attribution=await entry.locator('small').textContent();
     if(page.viewportSize().width===1440){
      assert.equal(state.trim(),'Acknowledged');
      assert.equal(lead,'Lead: '+member.name);
      assert.equal(assignee,'Assignee: '+member.name);
      assert.equal(attribution,label);
      if(door==='agent')assert.equal(await named.textContent(),'Named responder: '+member.name);
      else assert.equal(await named.count(),0);
     }
     console.log('Acknowledgment readback '+mode+' '+door+' '+page.viewportSize().width+': '+[state.trim(),lead,assignee,attribution].join(' | '));
    },runtime,page);
   }
  }
  assert.deepEqual(await agentEffectSnapshot(runtime),saved,'Reading the saved acknowledgments preserves native and paging custody');
  assert.deepEqual(await runtime.outboundRequests(),[]);
  assert.deepEqual(outbound,[]);
  console.log('PROBE BASE-AGENT-002 5 acknowledgment browser: real Acknowledge button and MCP in both policies; saved state, responsibility and attribution read at 1440 and 390; zero outbound requests');
 }finally{
  await context.close();
 }
}
