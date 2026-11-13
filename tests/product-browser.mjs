import {readableNamesBrowser} from './readable-names-browser.mjs'
import {assertInstallationChecklist} from './readiness.mjs'
import {nightResponseScenario,assertNightResponse,responseCsvRows} from './response-report-fixture.mjs'
import {openWorkspaceSection,openHistoryComparison,selectRoutedSource,keyboardUser,focusWorkspace,openIncidentAction} from './keyboard.mjs'
import assert from 'node:assert/strict'
import {randomBytes,createHmac} from 'node:crypto'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {chromium,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {localWorker,ownerDoor,durableSnapshot} from './worker.mjs'
import {importedEmailBrowser,productBrowserJourney,triageFiltersBrowser,incidentRolesBrowser,providerExport,supportStartBrowser,scheduleCoordinationBrowser,keyboardCoordination,coverageRulesBrowser} from './product-browser-journey.mjs'
import {redact} from './diagnostics.mjs'
// OC-059: one oversized real intake produces readable service custody and an owner queue alert.
async function incompleteIntakeBrowser(page,context) {
 const origin=new URL(page.url()).origin
 const request=async(path,data,status=200)=>{
  const response=data===undefined?await context.request.get(path):await context.request.post(path,{headers:{origin},data})
  assert.equal(response.status(),status,`OC-059 ${path} response`)
  return response.json()
 }
 const {member}=await request('/api/session'),source='synthetic-oncall-1',name='Payments Alertmanager',key=randomBytes(32).toString('hex')
 await request('/api/command',{type:'service',id:'payments',name:'Payments',environment:'production',owner:member.id,runbook:['Check payment authorization errors against the gateway dashboard.'],pager:''})
 await request('/api/routing/keys',{id:source,name,provider:'alertmanager',scope:['payments'],owner:member.id,key,revision:0,rules:[{id:'payments-team',match:'all',conditions:[{field:'labels.team',op:'equals',value:'payments'}],target:{service:'payments'}}],catchAll:null},201)
 const title='Payment gateway authorization errors',incompleteTitle='Incomplete intake: '+name
 const payload={version:'4',receiver:'oncall',status:'firing',groupKey:'payments-production',groupLabels:{team:'payments'},commonLabels:{},commonAnnotations:{},alerts:[{status:'firing',labels:{alertname:'PaymentGatewayErrors',team:'payments',severity:'critical'},annotations:{summary:title,description:'Authorization failures exceed the service objective.'},startsAt:new Date().toISOString(),endsAt:'0001-01-01T00:00:00Z',fingerprint:'synthetic-oncall-2',generatorURL:'https://monitoring.example.test/payments'}],padding:'x'.repeat(3*1024*1024)}
 const admitted=await context.request.post('/api/monitoring/'+source,{headers:{'content-type':'application/json',authorization:'Bearer '+key},data:JSON.stringify(payload)})
 assert.equal(admitted.status(),202,'oversized Alertmanager intake retains readable and incomplete records')
 const reply=await admitted.json()
 assert.equal(reply.truncation,true);assert.equal(reply.receipts.length,1);assert.ok(reply.incomplete?.receipt)
 const state=await request('/api/state'),readable=state.intakeReceipts.find(r=>r.id===reply.receipts[0].id),incomplete=state.intakeReceipts.find(r=>r.id===reply.incomplete.receipt)
 assert.equal(readable.service,'payments');assert.equal(readable.routing.rule,'payments-team')
 assert.ok(state.events.some(event=>event.id===readable.event&&event.title===title))
 assert.equal(incomplete.service,null);assert.equal(incomplete.event,null);assert.equal(incomplete.outcome,'unrouted')
 const queued=state.alerts.find(alert=>alert.id===incomplete.alert)
 assert.ok(queued,'incomplete unrouted custody is a native alert');assert.equal(queued.service,null);assert.equal(queued.owner,member.id);assert.deepEqual(queued.events,[])
 assert.equal(queued.urgency,'high');assert.equal(queued.obligation.urgency,'high');assert.deepEqual(queued.obligation.target,{kind:'user',id:member.id})
 assert.equal(queued.obligation.state,'recorded');assert.equal(queued.obligation.paging,'off');assert.equal(queued.obligation.automatic,false)
 const checkScreen=async(screen,width)=>{
  assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0,'no hydration mismatch on the current screen')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${screen} fits ${width}px`)
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()
  assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[],`${screen} has no serious or critical accessibility violations at ${width}px`)
  await page.screenshot({path:`evidence/browser/oc059-${screen}-${width}.png`,fullPage:true})
 }
 for(const width of [1440]) {
  await page.setViewportSize({width,height:1000})
  await openWorkspaceSection(page,'alerts')
  await focusWorkspace(page)
  await page.locator('.alert-row').filter({hasText:title}).click();
  const routedCard=page.getByRole('article',{name:'Alert details',exact:true});
  await routedCard.getByText(/Payments · production · active/).waitFor();
  await page.goto(origin+'/alerts');await page.locator('.alert-row').filter({hasText:incompleteTitle}).click();
  const ownerCard=page.getByRole('article',{name:'Alert details',exact:true});
  await ownerCard.getByText(/Integration unrouted queue.*active$/).waitFor();await ownerCard.getByText('Event context',{exact:true}).click()
  await ownerCard.getByText(`Paging obligation: recorded · Integration owner: ${member.name} · high urgency · paging OFF; non-automatic.`,{exact:true}).waitFor()
  assert.ok(await ownerCard.isVisible())
  const incidentService=ownerCard.getByLabel('Incident service',{exact:true}),declare=ownerCard.getByRole('button',{name:'Declare incident from alert',exact:true})
  assert.equal(await incidentService.inputValue(),'','owner queue declaration requires an explicit service choice')
  assert.equal(await declare.isEnabled(),false)
  assert.deepEqual(await incidentService.locator('option').evaluateAll(options=>options.map(option=>option.value)),['','payments'],'queue declaration offers only services in the integration scope')
  await incidentService.selectOption('payments');assert.equal(await declare.isEnabled(),true)
  await page.screenshot({path:`evidence/browser/oc056-queue-service-${width}.png`,fullPage:true})
  await checkScreen('alerts',width)
  await ownerCard.scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/browser/oc059-alerts-focus-${width}.png`})
  await openWorkspaceSection(page,'routing')
  await selectRoutedSource(page,source)
  const diagnostics=page.getByRole('region',{name:'Routing diagnostics',exact:true})
  await diagnostics.getByRole('heading',{name:incompleteTitle,exact:true}).waitFor()
  await diagnostics.getByText('High-urgency incomplete-intake alert · integration-owner page obligation recorded · paging OFF; non-automatic.',{exact:true}).waitFor()
  await diagnostics.getByLabel('Routing receipt filter',{exact:true}).selectOption('all')
  await diagnostics.getByRole('heading',{name:title,exact:true}).waitFor()
  assert.ok(await diagnostics.getByRole('heading',{name:title,exact:true}).isVisible())
  assert.ok(await diagnostics.getByRole('heading',{name:incompleteTitle,exact:true}).isVisible())
  await checkScreen('routing',width)
  await diagnostics.getByRole('heading',{name:incompleteTitle,exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/browser/oc059-routing-focus-${width}.png`})
 }
 await openWorkspaceSection(page,'alerts')
 await page.locator('.alert-row').filter({hasText:incompleteTitle}).click();
 const ownerCard=page.getByRole('article',{name:'Alert details',exact:true})
 await ownerCard.getByLabel('Incident service',{exact:true}).selectOption('payments')
 await ownerCard.getByRole('button',{name:'Declare incident from alert',exact:true}).click()
 await page.locator('.detail').getByRole('heading',{name:incompleteTitle,exact:true}).waitFor()
 const declaredState=await request('/api/state'),original=declaredState.alerts.find(alert=>alert.id===queued.id)
 assert.equal(original.service,null);assert.deepEqual(original.events,[]);assert.deepEqual(original.obligation.target,{kind:'user',id:member.id})
 assert.equal(declaredState.intakeReceipts.find(receipt=>receipt.id===incomplete.id).service,null,'declaring leaves the unrouted receipt untouched')
 assert.ok(declaredState.incidents.some(incident=>incident.service==='payments'&&incident.alerts.includes(queued.id)),'explicit scoped choice declares from the owner queue')
}

// OC-056: publish response rules, recover a native alert, and keep human incidents open.
async function responsePolicyBrowser(page,context) {
 const origin=new URL(page.url()).origin
 const request=async(path,data,status=200)=>{
  const response=data===undefined?await context.request.get(path):await context.request.post(path,{headers:{origin},data})
  assert.equal(response.status(),status,`OC-056 ${path} response`)
  return response.json()
 }
 const {member}=await request('/api/session')
 const checkScreen=async(screen,width,focus)=>{
  assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0,'response flow has no hydration mismatch')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${screen} fits ${width}px`)
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()
  assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[],`${screen} has no serious or critical accessibility violations at ${width}px`)
  await page.screenshot({path:`evidence/browser/oc056-${screen}-${width}.png`,fullPage:true})
  await focus.scrollIntoViewIfNeeded()
  await page.screenshot({path:`evidence/browser/oc056-${screen}-focus-${width}.png`})
 }
 for(const width of [1440]) {
  await page.setViewportSize({width,height:1000})
  const serviceId='response-'+width,serviceName='Checkout response '+width,source='synthetic-oncall-response-'+width,key=randomBytes(32).toString('hex')
  await request('/api/command',{type:'service',id:serviceId,name:serviceName,environment:'production',owner:member.id,runbook:['Confirm successful checkout requests before resolving.'],pager:''})
  const orchestration=await request('/api/command',{type:'policy',service:serviceId,severity:'*',action:'route',owner:member.id,reason:'Checkout owner coordinates this service'})
  await request('/api/routing/keys',{id:source,name:'Checkout native monitor '+width,provider:'native',authentication:'bearer',scope:[serviceId],owner:member.id,key,revision:0,rules:[],catchAll:serviceId},201)
  const viewName='Checkout commander review '+width
  await request('/api/triage/views',{name:viewName,query:{}})
  await openWorkspaceSection(page,'services')
  await focusWorkspace(page)
  await page.goto(origin+'/settings/services/'+encodeURIComponent(serviceId));
  const service=page.locator('.service-page')
  const responsePolicy=service.locator('details.urgency-policy').filter({has:page.locator('summary').filter({hasText:/^Response ·/})})
  await responsePolicy.locator(':scope > summary').click()
  await responsePolicy.getByLabel('Default response',{exact:true}).selectOption('alert-only')
  await responsePolicy.getByLabel('On source recovery',{exact:true}).selectOption('notified')
  await responsePolicy.getByRole('button',{name:'Add response rule',exact:true}).click()
  await responsePolicy.getByLabel('Rule urgency',{exact:true}).selectOption('high')
  await responsePolicy.getByLabel('Rule severity',{exact:true}).selectOption('critical')
  await responsePolicy.getByLabel('Rule orchestration policy',{exact:true}).selectOption(orchestration.id)
  await responsePolicy.getByLabel('Rule response',{exact:true}).selectOption('incident')
  await responsePolicy.getByRole('button',{name:/^Publish version/}).click();await responsePolicy.getByLabel('Reason',{exact:true}).fill('Coordinate critical checkout failures; keep warnings alert-only.')
  const published=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/response/services/'+serviceId&&response.request().method()==='POST')
  await responsePolicy.getByRole('button',{name:/^Publish version/}).click()
  assert.equal((await published).status(),201,'response policy is published through the service form')
  await expect.poll(async()=>(await request('/api/state')).services.find(item=>item.id===serviceId).responsePolicies?.length??0).toBe(1)
  const storedPolicy=(await request('/api/state')).services.find(item=>item.id===serviceId).responsePolicies.at(-1)
  assert.equal(storedPolicy.defaultMode,'alert-only');assert.equal(storedPolicy.recoveredNotice,'notified')
  assert.deepEqual(storedPolicy.rules.map(rule=>[rule.urgency,rule.severity,rule.policy,rule.mode]),[['high','critical',orchestration.id,'incident']])
  await responsePolicy.getByText('Response history (1)',{exact:true}).click()
  await responsePolicy.getByRole('heading',{name:'Version 1 · Alert-only',exact:true}).waitFor()
  await checkScreen('policy',width,responsePolicy.locator(':scope > summary'))
  const event=(id,intent='trigger',severity='warning')=>({source:'intake:'+source,eventId:id+'-'+intent,service:serviceId,environment:'production',key:id,generation:'checkout-cycle',intent,severity,title:`Checkout ${id} ${width}`,observedAt:new Date().toISOString(),evidence:'https://monitoring.example.test/checkout'})
  const send=async(input)=>{
   const response=await context.request.post('/api/ingress/intake:'+source,{headers:{authorization:'Bearer '+key},data:input})
   assert.equal(response.status(),201,'native monitoring admission succeeds')
   return response.json()
  }
  const warning=event('slow-payments'),critical=event('checkout-unavailable','trigger','critical')
  await send(warning)
  const admitted=await request('/api/state'),warningAlert=admitted.alerts.find(alert=>alert.source==='intake:'+source&&alert.key===warning.key)
  assert.equal(warningAlert.obligation.policy.mode,'alert-only')
  assert.equal(admitted.incidents.some(incident=>incident.alerts.includes(warningAlert.id)),false,'warning remains alert-only')
  await send({...warning,eventId:'slow-payments-recovery',intent:'recover',severity:'info'})
  await openWorkspaceSection(page,'alerts')
  await focusWorkspace(page)
  await page.locator('.alert-row').filter({hasText:warning.title}).click();
  const alertCard=page.getByRole('article',{name:'Alert details',exact:true});await alertCard.getByText('Event context',{exact:true}).click();
  await alertCard.getByText('stopped by source recovery',{exact:true}).waitFor()
  await alertCard.getByText(/Recovered notice: Everyone already notified · recorded/).waitFor()
  await alertCard.getByText(/Attempt cancellation:/).waitFor()
  const recoveredState=await request('/api/state'),stopped=recoveredState.alerts.find(alert=>alert.id===warningAlert.id)
  assert.equal(stopped.state,'recovered');assert.equal(stopped.obligation.state,'stopped')
  assert.ok(stopped.obligation.receipt);await alertCard.getByText(/Recovery recorded/).waitFor()
  await checkScreen('alert-recovery',width,alertCard)
  await alertCard.getByRole('button',{name:'Declare incident from alert',exact:true}).click()
  await page.locator('.detail').getByRole('heading',{name:warning.title,exact:true}).waitFor()
  assert.ok((await request('/api/state')).incidents.some(incident=>incident.alerts.includes(warningAlert.id)),'a human can declare from a recovered alert')
  await send(critical)
  const automaticState=await request('/api/state'),criticalAlert=automaticState.alerts.find(alert=>alert.source==='intake:'+source&&alert.key===critical.key),incident=automaticState.incidents.find(incident=>incident.alerts.includes(criticalAlert.id))
  assert.ok(incident?.automaticDeclaration,'critical rule automatically declares an incident')
  await focusWorkspace(page)
  await openWorkspaceSection(page,'alerts')
  await page.locator('.alert-row').filter({hasText:critical.title}).click();
  const criticalCard=page.getByRole('article',{name:'Alert details',exact:true});
  await criticalCard.getByRole('link',{name:'In incident '+critical.title,exact:true}).click()
  const detail=page.locator('.detail')
  let incidentContext=await openIncidentAction(page,'Service context')
  await incidentContext.getByText('Automatic declaration · service response policy',{exact:true}).waitFor()
  await incidentContext.getByRole('button',{name:'Close',exact:true}).click()
  await detail.getByRole('button',{name:'Acknowledge',exact:true}).click()
  // The state class carries the enum; the visible label can change independently.
  await detail.locator('.incident-state.state-acknowledged').waitFor()
  // A different assignee must not hide the commander's recovery reminder.
  await detail.getByRole('button',{name:/^Assignee:/}).click()
  await page.getByRole('listbox',{name:'Assignee',exact:true}).getByRole('option',{name:'Unassigned',exact:true}).click()
  await detail.getByRole('status').filter({hasText:'Saved'}).waitFor()
  await send({...critical,eventId:'checkout-recovery',intent:'recover',severity:'info'})
  await focusWorkspace(page)
  incidentContext=await openIncidentAction(page,'Service context')
  const recovery=incidentContext.getByRole('region',{name:'Source recovery',exact:true})
  await recovery.getByText('all alerts recovered — awaiting resolution',{exact:true}).waitFor()
  await recovery.locator('p').filter({hasText:'Commander reminder: '+member.name}).waitFor()
  await incidentContext.getByRole('button',{name:'Close',exact:true}).click()
  const retainedTimeline=detail.getByRole('region',{name:'Timeline',exact:true});
  const earlier=retainedTimeline.getByRole('button',{name:/^Earlier entries/});if(await earlier.count())await earlier.click();
  const generatedCopy=await retainedTimeline.innerText();
  assert.doesNotMatch(generatedCopy,/\b[A-Z]{2,}-\d{3}\b/,'automatic declaration and recovery explain themselves without clause codes');
  assert.ok(!generatedCopy.includes(criticalAlert.obligation.policy.rule),'automatic declaration does not expose an internal response-rule identity');
  assert.ok((await retainedTimeline.locator('.event small').allTextContents()).includes('Source: Checkout native monitor '+width),'routed source history uses its configured name');
  // The phone incident is its own page; list controls are reached through Back.
  if(width===390)await page.locator('.incident-back').click()
  const reminderView=page.getByRole('region',{name:'My commander reminders',exact:true})
  await reminderView.getByRole('button',{name:critical.title,exact:true}).waitFor()
  const open=(await request('/api/state')).incidents.find(item=>item.id===incident.id)
  assert.equal(open.state,'acknowledged');assert.equal(open.commander,member.id);assert.equal(open.assignee,null)
  assert.equal(open.sourceRecovery.reminder.commander,member.id);assert.equal(open.sourceRecovery.reminder.state,'recorded')
  await page.locator('.saved-views > summary').click()
  const deleteView=page.getByRole('button',{name:'Delete view '+viewName,exact:true})
  await keyboardUser(page).reach(deleteView)
  assert.equal(await page.getByRole('tooltip',{name:'Delete view '+viewName,exact:true}).isVisible(),true,'saved-view delete tooltip is visible immediately on keyboard focus')
  if(width===390)await reminderView.getByRole('button',{name:critical.title,exact:true}).click()
  incidentContext=await openIncidentAction(page,'Service context')
  await checkScreen('incident-recovery',width,incidentContext.getByRole('region',{name:'Source recovery',exact:true}))
  await incidentContext.getByRole('button',{name:'Close',exact:true}).click()
  if(width===390)await page.locator('.incident-back').click()
  await reminderView.getByRole('button',{name:critical.title,exact:true}).click()
  await detail.getByRole('button',{name:'Other steps ▾',exact:true}).click()
  await detail.getByRole('button',{name:'Mark recovered',exact:true}).click()
  await detail.getByLabel('Recovery evidence URL',{exact:true}).fill('https://monitoring.example.test/checkout/recovery')
  await detail.getByRole('button',{name:'Mark recovered',exact:true}).last().click()
  await detail.locator('.incident-state.state-recovered').waitFor()
  await detail.getByRole('button',{name:'Resolve',exact:true}).last().click()
  const summary=detail.getByLabel('Resolution summary',{exact:true})
  await summary.fill('')
  await detail.getByRole('button',{name:'Resolve',exact:true}).last().click()
  assert.equal(await summary.evaluate(input=>input.validity.valueMissing),true,'browser resolution requires a summary')
  // Submit the same real form without client validation to prove the server refusal is announced.
  await summary.evaluate(input=>input.required=false)
  const refused=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().method()==='POST')
  await detail.getByRole('button',{name:'Resolve',exact:true}).last().click()
  assert.equal((await refused).status(),400,'server refuses resolution without a summary')
  await page.locator('.failure-line[role="alert"]').waitFor()
  assert.match(await page.locator('.failure-line[role="alert"]').innerText(),/summary/i)
  assert.equal((await request('/api/state')).incidents.find(item=>item.id===incident.id).state,'recovered','refused resolution leaves the incident open')
  await checkScreen('resolution-refused',width,page.locator('.failure-line[role="alert"]'))
 }
}

async function incidentWorkflowBrowser(page,context,proof) {
 const origin=new URL(page.url()).origin;
 const req=async(path,data,status=200)=>{const r=data===undefined?await context.request.get(path):await context.request.post(path,{headers:{origin},data});assert.equal(r.status(),status,`OC-050 ${path}`);return r.json()};
 const {member}=await req('/api/session');
 const capture=async(name,width,focus)=>{
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`OC-050 ${name} fits ${width}`);
  assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0);
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
  await page.screenshot({path:`evidence/browser/oc050-${name}-${width}.png`,fullPage:true});await focus.scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/browser/oc050-${name}-focus-${width}.png`});
 };
 const submit=async(button)=>{const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().method()==='POST');await button.click();assert.equal((await response).status(),200)};
 for(const width of [1440]){
  await page.setViewportSize({width,height:1000});const serviceId='workflow-'+width,serviceName='Checkout incident workflow '+width;
  await req('/api/command',{type:'service',id:serviceId,name:serviceName,environment:'production',owner:member.id,runbook:['Check replica health before changing customer traffic.'],pager:''});
  await openWorkspaceSection(page,'services');await focusWorkspace(page);
  await page.goto(origin+'/settings/services/'+encodeURIComponent(serviceId));
  const service=page.locator('.service-page'),settings=service.getByRole('region',{name:'Incident template for '+serviceName});
  await service.getByText('Incident template',{exact:true}).click();
  await settings.getByLabel('Critical severity wording',{exact:true}).fill('Checkout unavailable');await settings.getByLabel('Warning severity wording',{exact:true}).fill('Checkout degraded');await settings.getByLabel('Info severity wording',{exact:true}).fill('Customer impact under investigation');
  await settings.getByLabel('Impact prompt',{exact:true}).fill('Which checkout paths and customers are affected?');await settings.getByLabel('Incident types (one per line)',{exact:true}).fill('Database failure\nTraffic saturation');
  await settings.getByRole('button',{name:'Add checklist item',exact:true}).click();await settings.getByLabel('Checklist item 1',{exact:true}).fill('Confirm customer checkout recovery');await settings.getByRole('button',{name:/^Publish version/}).click();await settings.getByLabel('Reason',{exact:true}).fill('Keep checkout response consistent across shifts.');
  await submit(settings.getByRole('button',{name:/^Publish version/}));await expect.poll(async()=>(await req('/api/state')).services.find(item=>item.id===serviceId).incidentTemplates?.length??0).toBe(1);await capture('template',width,settings);
  await openWorkspaceSection(page,'incidents');await page.getByRole('button',{name:'Declare incident',exact:true}).click();
  const form=page.locator('form').filter({has:page.getByRole('button',{name:'Declare',exact:true})});const targetTitle='Checkout customer impact '+width;
  await form.getByLabel('Incident title',{exact:true}).fill(targetTitle);await form.getByLabel('Service',{exact:true}).selectOption(serviceId);await form.getByText('More options',{exact:true}).click();await form.getByLabel('Incident type (service template)',{exact:true}).selectOption('Database failure');await form.getByLabel('Severity',{exact:true}).selectOption('warning');await form.getByLabel('Customer impact and current evidence',{exact:true}).fill('Customers observe slower checkout; response team is investigating.');await submit(form.getByRole('button',{name:'Declare',exact:true}));
  await page.locator('.detail').getByRole('heading',{name:targetTitle,exact:true}).waitFor();let state=await req('/api/state'),target=state.incidents.find(i=>i.title===targetTitle);assert.equal(target.template.incidentType,'Database failure');
  await incidentRolesBrowser(page,context,target,{proof});
  const sourceId='synthetic-oncall-workflow-'+width,key=randomBytes(32).toString('hex');await req('/api/sources',{id:sourceId,key,mode:'bearer',scopes:[serviceId]});
  const alerts=[];for(const keyName of ['checkout-replica','unrelated-batch']){const r=await context.request.post('/api/ingress/'+sourceId,{headers:{origin,authorization:'Bearer '+key},data:{source:sourceId,eventId:keyName+'-'+width,service:serviceId,environment:'production',key:keyName,generation:'cycle-'+width,intent:'trigger',severity:'warning',title:keyName+' investigation',observedAt:new Date().toISOString(),evidence:''}});assert.equal(r.status(),201);const receipt=await r.json();alerts.push((await req('/api/state')).alerts.find(a=>a.events.includes(receipt.id)).id)}
  const sourceTitle='Replica and batch investigation '+width;let source=await req('/api/command',{type:'declare',service:serviceId,severity:'warning',title:sourceTitle,summary:'Investigate related source alerts before separating the batch group.',alerts});source=await req('/api/command',{type:'note',incident:source.id,revision:source.revision,text:'Replica lag was observed before customer impact.'});source=await req('/api/command',{type:'action',incident:source.id,revision:source.revision,title:'Replica capacity follow-up',owner:member.id,escalationRecipient:member.id,due:'2026-12-01',completionPolicy:'human-review',priority:'P2'});
  await focusWorkspace(page);const workflow=page.getByRole('region',{name:'Incident workflows',exact:true});
  const checklist=page.getByRole('region',{name:'Runbook',exact:true}).getByRole('checkbox',{name:'Confirm customer checkout recovery',exact:false});const [tick]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().method()==='POST'),checklist.check()]);assert.equal(tick.status(),200);await page.getByRole('region',{name:'Runbook',exact:true}).getByText(/Last changed by/).waitFor();await capture('checklist',width,page.getByRole('region',{name:'Runbook',exact:true}));
  await openIncidentAction(page,'Merge related incidents');await workflow.locator('label').filter({hasText:sourceTitle}).getByRole('checkbox').check();await workflow.getByLabel('Reason for merging',{exact:true}).fill('The replica investigation explains the same checkout impact.');await workflow.getByRole('button',{name:'Review merge',exact:true}).click();await submit(workflow.getByRole('button',{name:'Merge selected incidents',exact:true}));await page.getByRole('button',{name:'Close',exact:true}).click();await openIncidentAction(page,'Service context');
  await workflow.getByText('Retained source incidents',{exact:true}).waitFor();await workflow.locator('summary').filter({hasText:sourceTitle}).click();await workflow.getByText('Replica lag was observed before customer impact.',{exact:true}).waitFor();await workflow.getByLabel('Completion evidence for Replica capacity follow-up',{exact:true}).fill('https://example.test/replica-capacity');await submit(workflow.getByRole('button',{name:'Submit evidence for Replica capacity follow-up',exact:true}));await workflow.getByLabel('Acceptance reason for Replica capacity follow-up',{exact:true}).fill('The commander reviewed the retained dependency evidence.');await submit(workflow.getByRole('button',{name:'Accept completion of Replica capacity follow-up',exact:true}));assert.equal((await req('/api/state')).incidents.find(i=>i.id===source.id).actions[0].done,true);await capture('merge',width,workflow);
  await page.goto(origin+'/incidents/'+encodeURIComponent(source.id));await page.locator('.detail').getByRole('heading',{name:targetTitle,exact:true}).waitFor();await page.waitForURL(url=>url.pathname==='/incidents/'+encodeURIComponent(target.id));await capture('alias',width,page.locator('.detail'));
  await openIncidentAction(page,'Split alerts into a new incident');await workflow.locator('label').filter({hasText:'unrelated-batch'}).getByRole('checkbox').check();await workflow.getByLabel('New incident title',{exact:true}).fill('Independent batch delay '+width);await workflow.getByLabel('New incident impact summary',{exact:true}).fill('Batch processing is separate from checkout customer impact.');await workflow.getByLabel('Reason for splitting',{exact:true}).fill('The batch alert is unrelated to the replica incident.');await workflow.getByRole('button',{name:'Review split',exact:true}).click();await submit(workflow.getByRole('button',{name:'Split selected alerts',exact:true}));await page.getByRole('button',{name:'Close',exact:true}).click();
  state=await req('/api/state');const child=state.incidents.find(i=>i.title==='Independent batch delay '+width);assert.equal(child.state,'acknowledged');assert.equal(state.incidents.find(i=>i.id===target.id).state,'acknowledged');assert.equal(child.splitFrom.incident,target.id);assert.equal(child.template.version,1);assert.equal((await req('/api/handoffs/context/'+child.id)).source.incident.declaration.kind,'split','a split origin remains usable by the existing reviewed handoff door');
  await page.goto(origin+'/incidents/'+encodeURIComponent(child.id));await page.locator('.detail').getByRole('heading',{name:child.title,exact:true}).waitFor();await openIncidentAction(page,'Service context');await capture('split',width,workflow);await page.getByRole('button',{name:'Close',exact:true}).click();
 }
 console.log('PASS OC-050 incident workflows browser: service template publication and typed declaration, commander checklist, merge/source history, alias redirect and split without lifecycle change at 1440; overflow, axe and hydration checked');
}

// Read the emitted public guidance against the installed release observations.
async function limitationsBrowser(page,context){
 const origin=new URL(page.url()).origin;
 const response=await page.goto(origin+'/docs/limits');assert.equal(response.status(),200);
 await page.setViewportSize({width:1440,height:1000});
 const article=page.locator('.docs-article[data-doc="limits"]');await article.waitFor();
 const text=await article.innerText();
 const emergency=article.getByRole('heading',{name:/US emergency, call 911 directly/i});
 assert.equal(await emergency.isVisible(),true,'US emergency guidance is visible without opening a disclosure');
 assert.match(text,/not a 911 dispatch service/i);assert.match(text,/Do not .*wait for an Oncall/i);
 const reportResponse=await context.request.get('/api/readiness');assert.equal(reportResponse.status(),200);
 const report=await reportResponse.json(),row=id=>report.matrix.find(item=>item.id===id);
 assert.equal(report.pagerCoverage.paging,'off');assert.equal(row('paging').state,'off');
 assert.equal(row('standby').state,'not-built');assert.equal(row('reference-load').state,'unproven-live');assert.equal(row('reference-load').evidence.kind,'none');
 assert.match(text,/Paging is OFF/i);assert.match(text,/standby is not built/i);assert.match(text,/OC-064[^.]*unmeasured/i);
 assert.match(text,/no measured availability commitment/i);assert.match(text,/healthy[^.]*does not prove/i);
 assert.match(text,/no HIPAA compliance or regulated-data suitability claim/i);assert.match(text,/agreements and validated controls have not been established/i);
 assert.match(text,/Do not put protected health information/i);assert.match(text,/Use redacted incident descriptions/i);
 const contract=await readFile('CONTRACT.md','utf8');
 for(const id of ['R-1','R-2','R-5','R-6','R-8']){
  const cells=contract.split('\n').find(line=>line.startsWith('| '+id+' |')).split('|').map(cell=>cell.trim());
  const mention=text.slice(text.indexOf(id),text.indexOf(id)+240);
  if(cells[4]==='passed')assert.ok(mention.includes(cells[5]),id+' guidance preserves the dated prior field observation');
  else {assert.equal(cells[4],'not run');assert.match(text.slice(text.indexOf('R-5')),/not run/i);}
 }
 assert.match(text,/dated prior observations, not a current deployment/i);assert.match(text,/not[^.]*outbound paging proof/i);
 const checklist=article.getByRole('link',{name:'US installation and dependency checklist',exact:true});await checklist.click();
 await page.locator('.docs-article[data-doc="readiness"]').getByRole('heading',{name:'US installation and dependency checklist',exact:true}).waitFor();
 await page.goto(origin+'/docs/install');await page.locator('.docs-article[data-doc="install"]').getByRole('link',{name:'US installation and dependency checklist',exact:true}).click();
 await page.locator('.docs-article[data-doc="readiness"]').getByRole('heading',{name:'US installation and dependency checklist',exact:true}).waitFor();
 await page.goto(origin+'/docs/limits');await article.waitFor();
 const readiness=article.getByRole('link',{name:'Readiness',exact:true});await readiness.click();
 await page.locator('.docs-article[data-doc="readiness"]').waitFor();
 await page.goto(origin+'/docs/limits');await article.waitFor();
 assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'limitations fit the desktop viewport');
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();
 assert.deepEqual(axe.violations,[],'limitations have no WCAG axe violations');
 const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true});
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${directory}/oc044-limits-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:1440,height:1000});
 console.log('PROBE OC-044 acceptance 2: GET /docs/limits -> direct US emergency guidance; paging OFF, standby not built, unmeasured load, no availability or regulated-data claim; dated field evidence distinct from not-run rows; Readiness link works; desktop assertions and 1440/390 visual proof passed');
}

async function changeAndSigningBrowser(page,context){
 const origin=new URL(page.url()).origin;
 const request=async(path,data)=>{const response=await context.request.fetch(path,{method:data===undefined?'GET':'POST',headers:{origin:new URL(page.url()).origin},...(data===undefined?{}:{data})});const value=await response.json();assert.ok(response.ok(),JSON.stringify(value));return value;};
 const importDoor=ownerDoor({request:async(path,input,_cookie,extraHeaders={})=>{const response=await context.request.fetch(path,{method:input===undefined?'GET':'POST',headers:{origin:new URL(page.url()).origin,...extraHeaders},...(input===undefined?{}:{data:input})});return {status:response.status(),value:await response.json()}}});
 const docsResponse=await context.request.get('/docs'),docSlugs=[...new Set([...(await docsResponse.text()).matchAll(/href="\/docs\/([a-z0-9-]+)"/g)].map(match=>match[1]))];
 assert.ok(docSlugs.length>0,'the documentation catalog exposes its pages');
 const {member}=await request('/api/session'),token=()=>randomBytes(32).toString('hex'),signingSecret=token(),keys={argocd:token(),terraform:token()},now=new Date().toISOString();
 for(const [id,name] of [['synthetic-oncall-1','Template payments'],['synthetic-oncall-2','Template gateway']])await request('/api/command',{type:'service',id,name,environment:'production',owner:member.id,runbook:[],pager:''});
 await request('/api/command',{type:'service-dependencies',service:'synthetic-oncall-1',dependencies:['synthetic-oncall-2'],workspaceRevision:(await request('/api/state')).revision});
 for(const provider of ['argocd','terraform'])await request('/api/changes/sources',{id:'synthetic-oncall-'+provider,name:provider+' template',provider,service:provider==='argocd'?'synthetic-oncall-2':'synthetic-oncall-1',repository:'',mode:'provider',revision:0,key:keys[provider]});
 const argo={eventId:'synthetic-oncall-1',application:'gateway',revision:'synthetic-oncall-2',status:'Synced',summary:'Argo CD gateway sync',timestamp:now,author:'synthetic-oncall-1',links:['https://argo.example.test/applications/gateway']},terraform={run_id:'run-synthetic-oncall-1',run_url:'https://app.terraform.io/app/example/workspaces/payments/runs/run-synthetic-oncall-1',run_created_at:now,run_created_by:'synthetic-oncall-2',workspace_name:'payments',organization_name:'example',notifications:[{trigger:'run:completed',run_status:'applied',run_updated_at:now}]};
 for(const [provider,body] of [['argocd',argo],['terraform',terraform]]){
  const raw=JSON.stringify(body),timestamp=String(Math.floor(Date.now()/1000));
  const headers=provider==='argocd'?{'x-oncall-timestamp':timestamp,'x-oncall-signature':createHmac('sha256',keys[provider]).update(timestamp+'.'+raw).digest('hex')}:{'x-tfe-notification-signature':createHmac('sha512',keys[provider]).update(raw).digest('hex')};
  assert.equal((await context.request.post('/api/changes/ingress/synthetic-oncall-'+provider,{headers:{...headers,'content-type':'application/json'},data:raw})).status(),201);
 }
 await request('/api/intake/sources',{id:'synthetic-oncall-grafana',name:'Synthetic Grafana',provider:'grafana',service:'synthetic-oncall-1',key:token(),revision:0});
 await request('/api/monitoring/synthetic-oncall-grafana/signing',{revision:1,secret:signingSecret});
 const check=async(label,width)=>{
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' fits viewport');assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0);
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations,[],label+' has no WCAG axe violations');
  await page.screenshot({path:`evidence/browser/${label}-${width}.png`,fullPage:true});await page.screenshot({path:`evidence/browser/${label}-focus-${width}.png`});
 };
 for(const width of [1440]){
  await page.setViewportSize({width,height:1000});await page.reload();await openWorkspaceSection(page,'services');
  await page.goto(origin+'/settings/services/synthetic-oncall-1');const service=page.locator('.service-page');await service.locator('.recent-changes > summary').click();
  await service.getByText('Argo CD gateway sync',{exact:true}).waitFor();await service.getByText('payments: applied',{exact:true}).waitFor();await service.getByText('Terraform Cloud',{exact:true}).waitFor();
  assert.ok(await service.getByText('Dependency · Template gateway',{exact:true}).count());await service.scrollIntoViewIfNeeded();await check('oc065-changes',width);
  await page.goto(origin+'/settings/integrations');
  await page.getByText(/of 1,000 retained changes/).scrollIntoViewIfNeeded();await check('oc065-retention',width);
  const erasureKey=token(),erasureSource='synthetic-oncall-40-'+width;
  await request('/api/changes/sources',{id:erasureSource,name:'Synthetic erasure '+width,provider:'native',service:'synthetic-oncall-1',repository:'',mode:'bearer',revision:0,key:erasureKey});
  const changeResponse=await context.request.post('/api/changes/ingress/'+erasureSource,{headers:{authorization:'Bearer '+erasureKey},data:{eventId:erasureSource,summary:'Synthetic erasable change '+width,author:'synthetic-oncall-40',timestamp:new Date().toISOString()}});assert.equal(changeResponse.status(),201);
  const erasureChange=await changeResponse.json();await page.reload();
  await page.goto(origin+'/settings/archive');const settings=page.locator('.erase-data');await settings.locator(':scope > summary').click();
  await settings.getByLabel('Retained change',{exact:true}).selectOption(erasureChange.id);
  assert.equal(await settings.getByRole('button',{name:'Erase retained change',exact:true}).isEnabled(),false);
  const erasedName=await settings.locator('select').nth(1).evaluate(select=>select.selectedOptions[0].label);
  await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+erasedName);
  await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-erasure-review',width);
  const erasureResponse=page.waitForResponse(r=>r.url().endsWith('/api/changes/'+erasureChange.id+'/erase'));
  await settings.getByRole('button',{name:'Erase retained change',exact:true}).click();assert.equal((await erasureResponse).status(),200);
  await settings.getByText(erasedName+' erased: 1 change. Standby not reconciled.',{exact:true}).waitFor();
  assert.equal((await (await erasureResponse).json()).stores.oc_changes.deleted,1);assert.equal((await (await erasureResponse).json()).stores.oc_changes.updated,0);
  assert.ok(!(await request('/api/state')).changes.some(row=>row.id===erasureChange.id));
  await settings.getByRole('status').scrollIntoViewIfNeeded();await check('oc040-erasure-receipt',width);
  const erasedIncident=await request('/api/command',{type:'declare',service:'synthetic-oncall-1',title:'Synthetic erasable incident '+width,summary:'Synthetic erasable impact',severity:'warning'});
  await focusWorkspace(page);
  await settings.getByLabel('Erasure category',{exact:true}).selectOption('incident');
  await settings.getByLabel('Erasure subject',{exact:true}).selectOption(erasedIncident.id);
  assert.equal(await settings.getByRole('button',{name:'Erase selected subject',exact:true}).isEnabled(),false);
  await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+await settings.locator('select').nth(1).evaluate(select=>select.selectedOptions[0].label));
  await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-incident-review',width);
  const incidentEraseResponse=page.waitForResponse(r=>r.url().endsWith('/api/erasure/incident/'+erasedIncident.id));
  await settings.getByRole('button',{name:'Erase selected subject',exact:true}).click();assert.equal((await incidentEraseResponse).status(),200);
  assert.equal((await (await incidentEraseResponse).json()).stores.oc_incidents.deleted,1);assert.equal((await (await incidentEraseResponse).json()).stores.oc_incidents.updated,0);
  await settings.getByRole('status').scrollIntoViewIfNeeded();await check('oc040-incident-receipt',width);
  assert.ok(!(await request('/api/state')).incidents.some(i=>i.id===erasedIncident.id));
  const erasedIntegration='synthetic-oncall-40-integration-'+width;
  await request('/api/intake/sources',{id:erasedIntegration,name:'Synthetic erasable integration '+width,provider:'alertmanager',service:'synthetic-oncall-1',key:token(),revision:0});
  await focusWorkspace(page);
  await settings.getByLabel('Erasure category',{exact:true}).selectOption('intake');
  await settings.getByLabel('Erasure subject',{exact:true}).selectOption(erasedIntegration);
  await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+await settings.locator('select').nth(1).evaluate(select=>select.selectedOptions[0].label));
  await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-integration-review',width);
  const integrationEraseResponse=page.waitForResponse(r=>r.url().endsWith('/api/erasure/intake/'+erasedIntegration));
  await settings.getByRole('button',{name:'Erase selected subject',exact:true}).click();assert.equal((await integrationEraseResponse).status(),200);
  assert.equal((await (await integrationEraseResponse).json()).stores.oc_intake_credentials.deleted,1);assert.equal((await (await integrationEraseResponse).json()).stores.oc_intake_credentials.updated,0);
  await settings.getByRole('status').scrollIntoViewIfNeeded();await check('oc040-integration-receipt',width);
  assert.ok(!(await request('/api/state')).intakeSources.some(i=>i.id===erasedIntegration));
  const erasedEmail='synthetic-oncall-440-'+width;
  await request('/api/email/addresses',{id:erasedEmail,name:'Synthetic erasable email '+width,service:'synthetic-oncall-1',owner:(await request('/api/session')).member.id,localPart:'synthetic-oncall-'+randomBytes(20).toString('hex'),mode:'subject',fallback:'subject',rules:[]},201);
  await focusWorkspace(page);
  await settings.getByLabel('Erasure category',{exact:true}).selectOption('email');
  await settings.getByLabel('Erasure subject',{exact:true}).selectOption(erasedEmail);
  await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+await settings.locator('select').nth(1).evaluate(select=>select.selectedOptions[0].label));
  await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-email-review',width);
  const emailEraseResponse=page.waitForResponse(r=>r.url().endsWith('/api/erasure/email/'+erasedEmail));
  await settings.getByRole('button',{name:'Erase selected subject',exact:true}).click();assert.equal((await emailEraseResponse).status(),200);
  assert.equal((await (await emailEraseResponse).json()).stores.oc_email_credentials.deleted,1);assert.equal((await (await emailEraseResponse).json()).stores.oc_email_credentials.updated,0);
  await settings.getByRole('status').scrollIntoViewIfNeeded();await check('oc040-email-receipt',width);
  assert.ok(!((await request('/api/state')).emailAddresses??[]).some(row=>row.id===erasedEmail));
  const importedId='synthetic-oncall-410-'+width;
  const importedPlan=await importDoor.preview('pagerduty',JSON.stringify({integrations:[{id:importedId,type:'events_api_v2_inbound_integration'}]}));assert.equal(importedPlan.status,200);assert.equal((await importDoor.apply('pagerduty',importedPlan.value)).status,200);
  const importedRoot=(await request('/api/move-in/objects')).find(row=>row.targetKind==='integration'&&row.targetId==='pagerduty:'+importedId);
  await request('/api/intake/incumbent',{importedId:importedRoot.targetId,importedRevision:importedRoot.revision,id:importedId,service:'synthetic-oncall-1',name:'Synthetic imported erasure '+width,revision:0,key:randomBytes(16).toString('hex')});
  await focusWorkspace(page);
  await settings.getByLabel('Erasure category',{exact:true}).selectOption('intake');
  await settings.getByLabel('Erasure subject',{exact:true}).selectOption(importedId);await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+await settings.locator('select').nth(1).evaluate(select=>select.selectedOptions[0].label));
  await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-imported-integration-review',width);
  const importedEraseResponse=page.waitForResponse(r=>r.url().endsWith('/api/erasure/intake/'+importedId));
  await settings.getByRole('button',{name:'Erase selected subject',exact:true}).click();const importedResult=await importedEraseResponse;assert.equal(importedResult.status(),200);assert.ok((await importedResult.json()).importCustody.stores.some(row=>row.rows>0));
  await settings.getByText('Imported records cleared locally.',{exact:true}).waitFor();await settings.getByRole('status').scrollIntoViewIfNeeded();await check('oc040-imported-integration-receipt',width);
  const memberName='synthetic-oncall-413-'+width+'@example.test';
  const erasedMember=await request('/api/members',{name:memberName,password:'synthetic-oncall-413-password',role:'admin'},201);
  const personalContext=await context.browser().newContext({baseURL:origin,extraHTTPHeaders:{connection:'close'}});
  try {
   const login=await personalContext.request.post('/api/login',{headers:{origin},data:{name:memberName,password:'synthetic-oncall-413-password'}});assert.equal(login.status(),200);
   const clientResponse=await personalContext.request.post('/api/automation/clients',{headers:{origin},data:{name:'Synthetic personal response access',key:token(),services:['synthetic-oncall-1'],permissions:['incidents:read']}});assert.equal(clientResponse.status(),201);const client=await clientResponse.json();
   const endpointResponse=await personalContext.request.post('/api/automation/endpoints',{headers:{origin},data:{name:'Synthetic personal recipient',client:client.id,services:['synthetic-oncall-1'],url:'https://8.8.8.8/synthetic-oncall-413',key:token(),approve:true}});assert.equal(endpointResponse.status(),201);
  } finally {await personalContext.close();}
  const memberBusinessResponse=await request('/api/status',{action:'create',name:'Synthetic erased membership '+width,owningTeam:'Synthetic team',supporting:['synthetic-oncall-1'],audience:[erasedMember.id],communicationsOwner:member.id,highUrgencyImpact:false});
  const memberBusiness=memberBusinessResponse.services.find(row=>row.name==='Synthetic erased membership '+width);
  await request('/api/status',{action:'subscribe',id:memberBusiness.id,revision:memberBusiness.revision,member:erasedMember.id,channel:'email',active:true});
  const memberScheduleId='synthetic-oncall-413-'+width;await request('/api/paging/schedules',{id:memberScheduleId,name:'Synthetic erased contact slots',service:'synthetic-oncall-1',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[erasedMember.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]});
  const memberPlan=await importDoor.preview('pagerduty',JSON.stringify({users:[{id:'synthetic-oncall-413-'+width,name:'Synthetic erasable contact',email:memberName}]}));assert.equal(memberPlan.status,200);assert.equal((await importDoor.apply('pagerduty',memberPlan.value)).status,200);
  await focusWorkspace(page);
  await settings.getByLabel('Erasure category',{exact:true}).selectOption('member');await settings.getByLabel('Erasure subject',{exact:true}).selectOption(erasedMember.id);
  await settings.getByLabel('Imported identity Synthetic erasable contact',{exact:true}).check();await settings.getByLabel('Imported identities reviewed',{exact:true}).check();
  await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+await settings.locator('select').nth(1).evaluate(select=>select.selectedOptions[0].label));await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-member-review',width);
  const memberResponse=page.waitForResponse(r=>r.url().endsWith('/api/erasure/member/'+erasedMember.id));await settings.getByRole('button',{name:'Erase selected subject',exact:true}).click();const memberReply=await memberResponse;assert.equal(memberReply.status(),200,await memberReply.text());
  await settings.getByText('Imported records cleared locally.',{exact:true}).waitFor();await settings.getByRole('status').scrollIntoViewIfNeeded();await settings.getByText(/Approved response recipient .*Provider deletion requires the owner’s consent/).waitFor();await check('oc040-member-receipt',width);
  assert.equal((await request('/api/state')).members.find(m=>m.id===erasedMember.id).name,'Erased member');
  const erasedBusiness=(await request('/api/state')).businessServices.find(row=>row.id===memberBusiness.id);
  assert.ok(!erasedBusiness.audience.includes(erasedMember.id));assert.ok(!erasedBusiness.subscriptions.some(row=>row.member===erasedMember.id));
  assert.ok((await memberReply.json()).stores.oc_business_services.updated>0);

  await page.goto(new URL('/on-call/'+encodeURIComponent(memberScheduleId),page.url()).href);
  await page.locator('.scheduling-now-next').getByText('Now: Nobody on call',{exact:true}).first().waitFor();await page.locator('.scheduling-now-next').scrollIntoViewIfNeeded();await check('oc040-member-schedule-gap',width);
  await openWorkspaceSection(page,'reviews');
  const reportResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/reports/response'&&r.request().method()==='GET');
  await page.getByText('Response numbers',{exact:true}).click();
  const reportReply=await reportResponse;assert.equal(reportReply.status(),200);
  const erasedCases=(await reportReply.json()).incidents.filter(row=>row.state==='erased');
  assert.ok(erasedCases.length>0,'the response report retains erased cases');
  for(const row of erasedCases){assert.equal(row.incidentRevision,null);assert.equal(row.href,'');}
  const responseReport=page.locator('.response-report');
  await responseReport.getByText(/Incidents in this period/).click();
  const erasedRecords=responseReport.locator('article.review-record').filter({has:page.locator('.review-meta').filter({hasText:'Retained erased case; durations unknown'})});
  await expect(erasedRecords).toHaveCount(erasedCases.length);
  await erasedRecords.first().getByRole('heading',{level:3}).waitFor();
  await responseReport.getByText(/Retained erased case; durations unknown/).first().waitFor();
  assert.equal(await erasedRecords.getByRole('link').count(),0,'erased cases have no personal incident drilldown');
  await erasedRecords.first().getByRole('heading',{level:3}).scrollIntoViewIfNeeded();await check('oc040-erased-response-report',width);
  await page.goto(origin+'/settings/archive');await settings.locator(':scope > summary').click();await settings.getByLabel('Erasure category',{exact:true}).waitFor();
  await settings.getByLabel('Erasure category',{exact:true}).selectOption('change-event');
  // Publish grouping through the existing service settings, then inspect its public admissions.
  await page.reload();await openWorkspaceSection(page,'services');
  await page.goto(origin+'/settings/services/synthetic-oncall-1');const groupSettings=page.locator('.service-grouping');
  await groupSettings.locator(':scope > summary').click();await groupSettings.getByLabel('Enable grouping',{exact:true}).check();await groupSettings.getByLabel('Match field',{exact:true}).fill('key');await groupSettings.getByLabel('Grouping window in seconds',{exact:true}).fill('60');await groupSettings.getByLabel('Flapping trigger generations',{exact:true}).fill('0');await groupSettings.getByLabel('Grouping coordination owner',{exact:true}).selectOption(member.id);await groupSettings.getByRole('button',{name:/^Publish version/}).click();await groupSettings.getByLabel('Reason',{exact:true}).fill('Synthetic shared failure grouping');
  const groupPublished=page.waitForResponse(r=>r.url().endsWith('/api/command')&&r.request().postDataJSON()?.correlation?.field==='key');await groupSettings.getByRole('button',{name:/^Publish version/}).click();const groupingReply=await groupPublished;assert.equal(groupingReply.status(),200);const publishedGrouping=await groupingReply.json();await expect.poll(async()=>(await request('/api/state')).policies.find(p=>p.id===publishedGrouping.id).version).toBe(publishedGrouping.version);await groupSettings.scrollIntoViewIfNeeded();await check('oc043-grouping-settings',width);
  const groupSources=['synthetic-oncall-438-a-'+width,'synthetic-oncall-438-b-'+width],groupKeys=[token(),token()],groupStart=Date.now();
  for(let n=0;n<2;n++)await request('/api/routing/keys',{id:groupSources[n],name:'Synthetic correlation '+n+' '+width,provider:'native',scope:['synthetic-oncall-1'],owner:member.id,key:groupKeys[n],revision:0,rules:[],catchAll:'synthetic-oncall-1'});
  const groupSignal=(n,eventId,generation,intent,key,offset,title)=>context.request.post('/api/ingress/intake:'+groupSources[n],{headers:{authorization:'Bearer '+groupKeys[n]},data:{source:'intake:'+groupSources[n],eventId,service:'synthetic-oncall-1',environment:'production',key,generation,intent,severity:'critical',title,observedAt:new Date(groupStart+offset).toISOString(),evidence:''}});
  const rootResponse=await groupSignal(0,'synthetic-oncall-438-a','synthetic-oncall-438-a','trigger','synthetic-oncall-438-'+width,0,'Synthetic correlation original '+width);assert.equal(rootResponse.status(),201);const rootReply=await rootResponse.json();
  const joinedResponse=await groupSignal(1,'synthetic-oncall-438-b','synthetic-oncall-438-b','trigger','synthetic-oncall-438-'+width,1000,'Synthetic correlation joined '+width);assert.equal(joinedResponse.status(),201);const joinedReply=await joinedResponse.json();
  const groupingState=await request('/api/state'),rootEvent=groupingState.events.find(e=>e.id===rootReply.id),joinedEvent=groupingState.events.find(e=>e.id===joinedReply.id);assert.equal(joinedEvent.decision.correlation.originalEvent,rootEvent.id);
  await page.reload();await openWorkspaceSection(page,'alerts');await page.locator('.alert-row').filter({hasText:'Synthetic correlation joined '+width}).click();const joinedCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Synthetic correlation joined '+width,exact:true})});await joinedCard.getByText('Event context',{exact:true}).click();await joinedCard.getByText(/Joined original event/).waitFor();await joinedCard.scrollIntoViewIfNeeded();await check('oc043-correlated-signal',width);
  await page.goto(origin+'/settings/services/synthetic-oncall-1');await groupSettings.locator(':scope > summary').click();await groupSettings.getByLabel('Flapping trigger generations',{exact:true}).fill('2');await groupSettings.getByRole('button',{name:/^Publish version/}).click();await groupSettings.getByLabel('Reason',{exact:true}).fill('Hold repeating generations for review');const flapPublished=page.waitForResponse(r=>r.url().endsWith('/api/command')&&r.request().postDataJSON()?.correlation?.flappingCount===2);await groupSettings.getByRole('button',{name:/^Publish version/}).click();assert.equal((await flapPublished).status(),200);
  const flapTitle='Synthetic flapping browser '+width,flapIdentity='synthetic-oncall-439-'+width;
  for(const [eventId,generation,intent,offset] of [['synthetic-oncall-439-a','synthetic-oncall-439-a','trigger',2000],['synthetic-oncall-439-r','synthetic-oncall-439-a','recover',3000],['synthetic-oncall-439-b','synthetic-oncall-439-b','trigger',4000]]){const response=await groupSignal(1,eventId,generation,intent,flapIdentity,offset,flapTitle);assert.equal(response.status(),201);}
  await page.reload();await openWorkspaceSection(page,'alerts');const activeFlap=(await request('/api/state')).alerts.find(a=>a.state==='active'&&a.key===flapIdentity);await page.locator('.alert-row[href="/alerts/'+activeFlap.id+'"]').click();const heldCard=page.getByRole('article',{name:'Alert details',exact:true});await heldCard.getByRole('heading',{name:flapTitle,exact:true}).waitFor();await heldCard.getByText('Event context',{exact:true}).click();assert.equal(await heldCard.count(),1);await heldCard.getByText(/1 held active generation/).waitFor();await heldCard.getByText('Retained generations and evidence',{exact:true}).click();await heldCard.scrollIntoViewIfNeeded();await check('oc043-flapping-held',width);
  await openWorkspaceSection(page,'services');
  await openWorkspaceSection(page,'routing');await selectRoutedSource(page,groupSources[1]);await page.getByRole('button',{name:'Preview routing changes',exact:true}).click();
  const groupedPreview=page.getByRole('region',{name:'Routing preview',exact:true});await groupedPreview.getByText('4 retained events compared. No records changed.',{exact:true}).waitFor();await groupedPreview.getByText(/Joined original event/).first().waitFor();await groupedPreview.getByText(/Historical urgency: high/).first().waitFor();await groupedPreview.getByText(/Proposed urgency: high/).first().waitFor();await groupedPreview.scrollIntoViewIfNeeded();await check('oc043-grouping-routing-preview',width);
  await openHistoryComparison(page);await page.getByLabel('Event JSON',{exact:true}).fill(JSON.stringify([rootEvent,joinedEvent]));await page.getByRole('button',{name:'Compare pasted events',exact:true}).click();const serviceReplay=page.getByRole('region',{name:'Replay comparison',exact:true});await serviceReplay.getByText(/Joined original event/).first().waitFor();await serviceReplay.getByText(/Historical urgency:/).first().waitFor();await serviceReplay.getByText(/Proposed urgency:/).first().waitFor();await serviceReplay.scrollIntoViewIfNeeded();await check('oc043-grouping-service-replay',width);await page.getByRole('button',{name:'Close comparison',exact:true}).click();
  await openWorkspaceSection(page,'services');
  // OC-043's existing routing screen exposes both stages before publication.
  const orchestrationId='synthetic-oncall-43-'+width,orchestrationKey=token(),policyBefore=(await request('/api/state')).policies.find(p=>p.service==='synthetic-oncall-1'&&p.severity==='warning');
  const window={start:new Date(Date.now()-60000).toISOString(),end:new Date(Date.now()+3600000).toISOString()};
  const policy=await request('/api/command',{type:'policy',service:'synthetic-oncall-1',severity:'warning',action:'suppress',owner:member.id,reason:'Synthetic planned maintenance',baseVersion:policyBefore?.version??0,suppressionWindow:window});
  await request('/api/routing/keys',{id:orchestrationId,name:'Synthetic maintenance '+width,provider:'native',scope:['synthetic-oncall-1'],owner:member.id,key:orchestrationKey,revision:0,rules:[],catchAll:'synthetic-oncall-1'});
  const observation={source:'intake:'+orchestrationId,eventId:orchestrationId,service:'synthetic-oncall-1',environment:'production',key:orchestrationId,generation:orchestrationId,intent:'trigger',severity:'warning',title:'Synthetic maintenance signal '+width,observedAt:new Date().toISOString(),evidence:''};
  const orchestrated=await context.request.post('/api/ingress/intake:'+orchestrationId,{headers:{authorization:'Bearer '+orchestrationKey},data:observation});assert.equal(orchestrated.status(),201);
  await page.reload();await openWorkspaceSection(page,'alerts');
  await page.locator('.alert-row').filter({hasText:observation.title}).click();
  const suppressedCard=page.getByRole('article',{name:'Alert details',exact:true});await suppressedCard.getByText('Event context',{exact:true}).click();await suppressedCard.getByText('Suppressed · Owner: '+member.name,{exact:false}).waitFor();await suppressedCard.scrollIntoViewIfNeeded();await check('oc043-owned-suppressed-alert',width);
  await openWorkspaceSection(page,'routing');await selectRoutedSource(page,orchestrationId);
  const maintenancePreview=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/preview')&&r.request().method()==='POST');await page.getByRole('button',{name:'Preview routing changes',exact:true}).click();
  const comparison=page.getByRole('region',{name:'Routing preview',exact:true});await comparison.getByText('1 retained events compared. No records changed.',{exact:true}).waitFor();
  await comparison.getByRole('heading',{name:observation.title,exact:true,level:4}).waitFor();
  await comparison.getByText('Proposed: routing v1 · service rule v'+policy.version+' · suppress · owner '+member.name+'.',{exact:true}).waitFor();
  const compared=(await (await maintenancePreview).json()).decisions[0];assert.equal(compared.historical.version,1);assert.equal(compared.proposed.version,1);assert.equal(compared.proposed.serviceDecision.version,policy.version);assert.equal(compared.proposed.serviceDecision.owner,member.id);assert.match(compared.proposed.serviceDecision.reason,/Maintenance active/);assert.ok(compared.proposed.serviceDecision.reason.includes(window.end));
  await comparison.scrollIntoViewIfNeeded();await check('oc043-maintenance-preview',width);
  const expired={start:'2020-01-01T00:00:00.000Z',end:'2020-01-02T00:00:00.000Z'};
  await request('/api/command',{type:'policy',service:'synthetic-oncall-1',severity:'warning',action:'suppress',owner:member.id,reason:'Synthetic completed maintenance',baseVersion:policy.version,suppressionWindow:expired});
  await page.reload();await selectRoutedSource(page,orchestrationId);const expiredPreview=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/preview')&&r.request().method()==='POST');await page.getByRole('button',{name:'Preview routing changes',exact:true}).click();
  await comparison.getByText('Proposed: routing v1 · service rule v'+(policy.version+1)+' · route · owner '+member.name+'.',{exact:true}).waitFor();
  const expiry=(await (await expiredPreview).json()).decisions[0];assert.equal(expiry.historical.serviceDecision.action,'suppress');assert.equal(expiry.proposed.serviceDecision.action,'route');assert.match(expiry.proposed.serviceDecision.reason,/Maintenance expired/);
  await comparison.scrollIntoViewIfNeeded();await check('oc043-maintenance-expired-preview',width);
  await page.goto(origin+'/settings/integrations/'+encodeURIComponent('intake:synthetic-oncall-grafana'));const panel=page.getByLabel('Grafana signature settings',{exact:true});await panel.locator('summary').click();await panel.getByText('Signature required with bearer authentication',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'Disable signature check',exact:true}).click();await panel.getByRole('button',{name:'Disable check',exact:true}).click();await panel.getByText('Bearer authentication only',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'Enable signature check',exact:true}).click();await panel.getByRole('button',{name:'Create signing key',exact:true}).click();assert.ok(await panel.getByLabel('Signing key',{exact:true}).inputValue());await panel.getByRole('button',{name:'Done',exact:true}).click();await panel.getByText('Signature required with bearer authentication',{exact:true}).waitFor();await page.reload();await panel.locator('summary').click();assert.equal(await panel.getByLabel('Signing key',{exact:true}).count(),0);await panel.scrollIntoViewIfNeeded();await check('oc030-signing',width);
  for(const [slug,section] of [['changes','erase-a-retained-change'],['routed-intake','event-time-correlation-and-flapping'],['data','incident-member-and-integration-erasure'],['urgency','']]){await page.goto(new URL(page.url()).origin+'/docs/'+slug+(section?'#'+section:''));await page.locator('.docs-article').waitFor();if(section)await page.locator('#'+section).scrollIntoViewIfNeeded();await check('oc040-043-docs-'+slug,width);}
  for(const slug of docSlugs.filter(slug=>!['changes','routed-intake','data','urgency'].includes(slug))){await page.goto(new URL(page.url()).origin+'/docs/'+slug);await page.locator('.docs-article').waitFor();if(slug==='limits')await limitationsBrowser(page,context);else await check('oc040-043-docs-'+slug,width);}
  await page.goto(new URL(page.url()).origin);
 }
 await senderSetupBrowser(page,context,origin,request,token);
 console.log('PASS OC-065/030 templates, dependency, retention and protected signing settings at 1440; overflow, axe and hydration');
}

// Execute the displayed recipe in a sender shell with only its documented tools.
// The bin contains no node, npx or package manager, even on hosts with system Node.
async function runSenderRecipe(sample,key,commands='sh send.sh') {
 const {tmpdir}=await import('node:os'),{spawn,execFileSync}=await import('node:child_process');
 const {mkdtemp,writeFile,symlink,rm}=await import('node:fs/promises'),{join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'oncall-send-'));
 try {
  for(const name of ['sh','curl','openssl','date','od','tr','awk'])await symlink(execFileSync('/usr/bin/which',[name],{encoding:'utf8'}).trim(),join(dir,name));
  await writeFile(join(dir,'send.sh'),sample);
  // Substitute only the private environment setting, as the sender does. Run the copied invocation unchanged.
  commands=commands.replace(/^export ONCALL_SOURCE_KEY=.*\n/,'');
  return await new Promise((resolve,reject)=>{
   const child=spawn('/bin/sh',['-eu','-c',commands],{cwd:dir,env:{...process.env,PATH:dir,ONCALL_SOURCE_KEY:key}});let out='';
   child.stdout.on('data',d=>out+=d);child.stderr.resume();child.on('error',reject);
   child.on('close',code=>code===0?resolve(out):reject(Error('Copied sender recipe failed with no Node on PATH: '+code)));
  });
 } finally {await rm(dir,{recursive:true,force:true});}
}

// A newcomer finishes sender setup from the page alone: the change-event recipe runs as written, and a refused
// Alertmanager batch is explained, counted and fixable on the integration page without leaving it.
async function senderSetupBrowser(page,context,origin,request,token){
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 const proof=async(label)=>{
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' fits '+width);
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations,[],label+' has no WCAG axe violations at '+width);
   await page.screenshot({path:`evidence/browser/${label}-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
 };
 // Change events: the sample is a recipe, and the saved file runs with only the documented steps.
 const changeKey=token(),changeId='synthetic-oncall-recipe';
 await request('/api/changes/sources',{id:changeId,name:'Synthetic recipe source',provider:'native',service:'synthetic-oncall-1',repository:'',mode:'signed',revision:0,key:changeKey});
 await page.goto(origin+'/settings/integrations/'+encodeURIComponent('change:'+changeId));
 await page.getByText('Sample request',{exact:true}).click();
 const sample=await page.getByLabel('Sample request',{exact:true}).inputValue();assert.ok(!sample.includes(changeKey),'sample never embeds the secret');
 await page.getByRole('button',{name:'Copy sample request',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),sample);
 await page.getByRole('button',{name:'Copy run commands',exact:true}).click();const commands=await page.evaluate(()=>navigator.clipboard.readText());
 const receipt=JSON.parse(await runSenderRecipe(sample,changeKey,commands));assert.ok(receipt.id,'the copied recipe sends one change with no Node on PATH');assert.equal(receipt.duplicate,false);assert.equal(receipt.service,'synthetic-oncall-1');
 assert.ok((await request('/api/state')).changes.some(change=>change.id===receipt.id),'the accepted change is retained');
 await page.reload();await page.getByText('Sample request',{exact:true}).click();await proof('sender-change-recipe');
 // Alertmanager: a 200-alert group exceeds the default event allowance, is counted, and is fixed from its own page.
 const key=token(),id='synthetic-oncall-batch',now=new Date().toISOString();
 await request('/api/intake/sources',{id,name:'Synthetic batch Alertmanager',provider:'alertmanager',service:'synthetic-oncall-1',key,revision:0});
 const batch={version:'4',receiver:'oncall',status:'firing',groupKey:'branches',groupLabels:{},commonLabels:{},commonAnnotations:{},alerts:Array.from({length:200},(_,i)=>({status:'firing',labels:{alertname:'BranchDown',branch:'branch-'+i,severity:'warning'},annotations:{summary:'Branch '+i+' unreachable'},startsAt:now,endsAt:'0001-01-01T00:00:00Z',fingerprint:'branch-'+i,generatorURL:''}))};
 const send=()=>context.request.post('/api/monitoring/'+id,{headers:{'content-type':'application/json',authorization:'Bearer '+key},data:JSON.stringify(batch)});
 const refused=await send();assert.equal(refused.status(),429);assert.equal((await refused.json()).rateLimit.code,'batch_exceeds_allowance');
 await page.goto(origin+'/settings/integrations/'+encodeURIComponent('intake:'+id));
 await page.getByText('Rejected requests (1)',{exact:true}).waitFor();
 const allowance=page.locator('#key-allowance');assert.equal(await allowance.getAttribute('open'),'','the allowance editor is open beside a refused request');
 await page.getByText('Rejected requests (1)',{exact:true}).click();
 const refusals=page.getByRole('list',{name:'Allowance refusals',exact:true});await refusals.getByRole('link',{name:'Raise this key’s allowance'}).waitFor();assert.match(await refusals.innerText(),/200 new events requested/);
 await proof('sender-alertmanager-refused');
 const saved=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/intake/allowances'&&r.request().method()==='POST');
 const events=allowance.getByLabel('New events per minute',{exact:true});await events.fill('300');await events.blur();assert.equal((await saved).status(),200);
 assert.ok((await request('/api/state')).audit.some(a=>a.kind==='key-allowance'&&a.text.includes('intake:'+id)&&a.text.includes('300 new events')),'the edit is audited like the routed-key editor');
 const admitted=await send();assert.ok(admitted.ok(),'the same 200-alert group is admitted after the allowance is raised: '+admitted.status());
 await page.reload();await page.getByText('Rejected requests (1)',{exact:true}).waitFor();await proof('sender-alertmanager-raised');
}

// The screen, API and downloaded CSV observe one frozen, populated night cohort.
async function responseReportBrowser(browser) {
 const w=await localWorker({}, {clock:true});let context
 try {
  const scenario=await nightResponseScenario(w),origin=w.origin
  context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:1000},timezoneId:'America/New_York',extraHTTPHeaders:{connection:'close'}})
  await context.addCookies(scenario.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:origin,httpOnly:true,sameSite:'Lax'}}))
  const page=await context.newPage();await page.clock.setFixedTime(new Date(scenario.observed))
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto(origin+'/reviews');await page.getByText('Response numbers',{exact:true}).click()
  const panel=page.locator('.response-report');await panel.getByLabel('Period',{exact:true}).selectOption('custom')
  await panel.getByLabel('From date',{exact:true}).fill('2030-10-28')
  await panel.getByLabel('Until date (excluded)',{exact:true}).fill('2030-10-30')
  const response=page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname==='/api/reports/response'&&u.searchParams.get('service')===scenario.service&&u.searchParams.get('from')==='2030-10-28T04:00:00.000Z'&&u.searchParams.get('to')==='2030-10-30T04:00:00.000Z'})
  await panel.getByLabel('Service',{exact:true}).selectOption(scenario.service)
  const reply=await response;assert.equal(reply.status(),200);const snapshot=await reply.json()
  assertNightResponse(snapshot,scenario,{from:'2030-10-28T04:00:00.000Z',to:'2030-10-30T04:00:00.000Z',uncovered:23*3600})
  await expect(panel).toHaveAttribute('aria-busy','false')
  await expect(panel.locator('.review-snapshot strong')).toHaveText('5 incidents')
  const metric=label=>panel.locator('article.response-metric').filter({has:page.getByRole('heading',{name:label,exact:true,level:3})})
  const stat=async(card,label,value)=>expect(card.locator('dl > div').filter({has:page.locator('dt').filter({hasText:new RegExp('^'+label+'$')})}).locator('dd')).toHaveText(value)
  const elapsed=value=>value===null?'No samples':value<3600?new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(value / 60)+' min':new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(value / 3600)+' h'
  for(const [key,label] of [['mtta','Acknowledgement'],['mttr','Resolution'],['recovery','Human recovery attestation'],['sourceRecovery','Source-reported recovery']]) {
   const card=metric(label),aggregate=snapshot.aggregates[key]
   for(const [name,caption] of [['mean','Average'],['p50','p50'],['p90','p90'],['p95','p95']])await stat(card,caption,elapsed(aggregate[name]))
   await expect(card.locator(':scope > .review-meta')).toHaveText(`Total ${aggregate.total} · measured ${aggregate.measured} · censored ${aggregate.censored} · unknown ${aggregate.unknown}`)
  }
  await stat(metric('Acknowledgement'),'Average','38.3 min');await stat(metric('Acknowledgement'),'p50','15 min');await stat(metric('Acknowledgement'),'p95','1.6 h')
  await metric('Acknowledgement').getByText('Distribution',{exact:true}).click()
  assert.deepEqual(await metric('Acknowledgement').locator('.response-distribution strong').allTextContents(),['0','0','1','1','1','0','0'])
  const load=panel.locator('.coverage-load').filter({has:page.getByRole('heading',{name:'Load by scheduled coverage',exact:true})})
  await expect(load).toContainText('Synthetic New York night (America/New_York)')
  const person=name=>load.locator('article').filter({has:page.getByRole('heading',{name,exact:true,level:5})})
  await stat(person(scenario.night.name),'Primary','6 h');await stat(person(scenario.night.name),'Acknowledged','2');await stat(person(scenario.night.name),'Per 24 primary hours','8')
  await expect(person(scenario.night.name)).toContainText('Acknowledgement share 66.7% · primary-hour share 75% · load to coverage 0.89')
  await expect(person(scenario.night.name)).toContainText('Outside scheduled coverage 1')
  await stat(person(scenario.relief.name),'Primary','2 h');await stat(person(scenario.relief.name),'Acknowledged','1');await stat(person(scenario.relief.name),'Per 24 primary hours','12')
  await expect(person(scenario.relief.name)).toContainText('Acknowledgement share 33.3% · primary-hour share 25% · load to coverage 1.33')
  await stat(person(scenario.owner.name),'Backup','8 h')
  await stat(person('Synthetic night response'),'Primary covered','8 h');await stat(person('Synthetic night response'),'Primary uncovered','23 h')
  const noise=panel.locator('.alert-noise-stats')
  for(const [label,value] of [['Alerts triggered','1'],['Trigger events','2'],['Repeated alerts','1'],['Noisy keys','1']])await stat(noise.locator('..'),label,value)
  await panel.getByText('How these are counted',{exact:true}).click()
  await expect(panel).toContainText('Exact UTC bounds: Mon, 28 Oct 2030 04:00:00 GMT inclusive to Wed, 30 Oct 2030 04:00:00 GMT exclusive.')
  await expect(panel).toContainText('They are scheduled hours, not worked hours.')
  await panel.getByText('Incidents in this period (5)',{exact:true}).click()
  const late=panel.locator('.review-record').filter({has:page.getByRole('link',{name:scenario.late.title,exact:true})})
  await expect(late.locator('section').filter({has:page.getByRole('heading',{name:'Acknowledgement',exact:true,level:4})})).toContainText('1.6 h · measured')
  const frozen=new URLSearchParams({from:snapshot.cohort.from,to:snapshot.cohort.to,service:scenario.service,at:snapshot.generatedAt,revision:String(snapshot.revision),schedulingRevision:String(snapshot.load.schedulingRevision)})
  assert.deepEqual(await scenario.req('/api/reports/response?'+frozen),snapshot)
  const csv=await scenario.req('/api/reports/response.csv?'+frozen),table=responseCsvRows(csv),column=name=>table[0].indexOf(name)
  for(const row of snapshot.incidents) {
   const exported=table.find(r=>r[column('incidentId')]===row.id);assert.ok(exported)
   for(const key of ['mtta','mttr','recovery','sourceRecovery'])for(const field of ['status','seconds','sourceAt','sourceEntryId'])assert.equal(exported[column(key+'.'+field)],row[key][field]===null?'':String(row[key][field]))
   assert.equal(exported[column('cohortCount')],'5');assert.equal(exported[column('generatedAt')],snapshot.generatedAt)
  }
  for(const row of snapshot.load.responders) {
   const exported=table.find(r=>r[0]==='responder-load'&&r[column('loadSubjectId')]===row.member)
   for(const [csvField,field] of [['scheduledPrimarySeconds','primarySeconds'],['scheduledBackupSeconds','backupSeconds'],['loadAcknowledgements','acknowledgements'],['acknowledgementsOutsideCoverage','outsideCoverage'],['acknowledgementShare','acknowledgementShare'],['primaryHourShare','primaryShare'],['loadToCoverage','loadToCoverage']])assert.equal(exported[column(csvField)],row[field]===null?'':String(row[field]))
  }
  const download=page.waitForEvent('download'),exportResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/reports/response.csv')
  await panel.getByRole('button',{name:'Export CSV',exact:true}).click();const downloaded=await download
  const exported=await exportResponse;assert.equal(exported.status(),200);assert.equal(await readFile(await downloaded.path(),'utf8'),csv)
  const exportQuery=new URL(exported.url()).searchParams;for(const [key,value] of frozen)assert.equal(exportQuery.get(key),value)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations.filter(row=>['serious','critical'].includes(row.impact)),[])
  assert.deepEqual(errors,[])
  const directory=process.env.ONCALL_BROWSER_EVIDENCE??'./evidence/browser';await mkdir(directory,{recursive:true})
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${directory}/oc037-response-report-${width}.png`,fullPage:true})}
  console.log('PROBE OC-037 dashboard: emitted Reviews at 1440 -> measured mean 38.3 minutes, p50 15 minutes, p95 1.6 hours, 5-case cohort and load for 6 and 2 scheduled hours match frozen API and downloaded CSV; visual proof once at 1440 and 390')
 } finally {try{await context?.close()}finally{await w.close()}}
}

// OC-054 uses the real read door. Assertions run at 1440; 390 is visual proof only.
async function readinessBrowser(page,context) {
 const origin=new URL(page.url()).origin;
 const request=async(path,data)=>{
  const response=data===undefined?await context.request.get(path):await context.request.post(path,{headers:{origin},data});
  assert.ok(response.ok(),`readiness fixture ${path}: ${response.status()}`);return response.json();
 };
 const {member}=await request('/api/session'),source='synthetic-oncall-540-browser',key=randomBytes(32).toString('hex');
 await request('/api/command',{type:'service',id:source,name:'Checkout readiness',environment:'production',owner:member.id,runbook:['Confirm the existing pager remains authoritative.'],pager:''});
 await request('/api/sources',{id:source,key,scopes:[source]});
 const intake=await context.request.post('/api/ingress/'+source,{headers:{authorization:'Bearer '+key},data:{source,eventId:source,service:source,environment:'production',key:source,generation:source,intent:'trigger',severity:'warning',title:'Checkout response latency',observedAt:new Date().toISOString(),evidence:''}});assert.equal(intake.status(),201);
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(origin);await page.locator('.oncall-frame').waitFor();
 await openWorkspaceSection(page,'services');
 await page.getByRole('navigation',{name:'Settings',exact:true}).getByRole('link',{name:'Readiness',exact:true}).click();
 await page.locator('.readiness [data-readiness-row]').first().waitFor();
 const before=durableSnapshot(worker),outbound=await worker.outboundRequests();
 const report=await request('/api/readiness');await assertInstallationChecklist(report);
 const checklist=page.getByRole('region',{name:'US installation and dependency checklist',exact:true});
 const assertChecklistPage=async report=>{
 assert.equal(await checklist.locator('[data-installation-item]').count(),report.installation.items.length);
 assert.ok((await checklist.innerText()).includes(report.installation.reviewedOn));
 assert.equal(await checklist.locator('input,button,select,textarea').count(),0,'checklist has no self-attestation or provider action control');
 for(const item of report.installation.items){
  const row=checklist.locator('[data-installation-item="'+item.id+'"]'),text=await row.innerText();
  assert.equal(await row.locator('[data-state]').getAttribute('data-state'),item.state);
  assert.ok(text.includes(item.name));assert.ok(text.includes(item.requirement));
  for(const clause of item.clauses)assert.ok(text.includes(clause),'owning clause is visible');
  for(const matrix of item.matrix){
   const capability=report.matrix.find(row=>row.id===matrix.id),state={'working-here':'Working here',off:'Off','not-built':'Not built','unproven-live':'Unproven live'}[matrix.state];
   assert.ok(text.includes(capability.area+': '+state),'each constituent release state is readable beside its dependency');
  }
  if(!item.fieldProof.length)assert.ok(text.includes('No field-proof row recorded'),'absent external evidence is explicit');
  assert.ok(text.includes(item.completion==='not-done'?'Not done for this installation':'Guidance only'));
  for(const proof of item.fieldProof)assert.ok((await row.locator('[data-field-proof="'+proof.id+'"]').innerText()).includes(proof.state==='passed'?'Passed on '+proof.date:'Not run'));
 }
 };
 await assertChecklistPage(report);
 const visible=await page.locator('.readiness').innerText();
 assert.doesNotMatch(visible,/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}|tests\//,'readiness presents readable dates without repository paths');
 assert.doesNotMatch(await page.locator('[data-readiness-row]').allTextContents().then(rows=>rows.join(' ')),/\b[A-Z]{2,}-\d{3}\b/,'release readiness matrix presents plain limitations without clause codes');
 const zone=await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone);
 for(const time of await page.locator('.readiness time').allTextContents())assert.ok(time.includes(zone),'readiness observation times identify the local clock');
 assert.ok(report.matrix.some(row=>row.evidence.reference?.includes('tests/')),'internal journey references remain available through the protected API');
 assert.equal(new URL(page.url()).pathname,'/settings/readiness');
 assert.equal(await page.locator('.readiness [data-coverage]').getAttribute('data-coverage'),report.pagerCoverage.state);
 assert.equal(await page.locator('[data-readiness-row]').count(),report.matrix.length);
 for(const row of report.matrix)assert.equal(await page.locator(`[data-readiness-row="${row.id}"] [data-state]`).getAttribute('data-state'),row.state);
 for(const signal of report.signals)assert.equal(await page.locator(`[data-readiness-signal="${signal.id}"] [data-state]`).getAttribute('data-state'),signal.state);
 const refreshed=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/readiness'&&response.request().method()==='GET');
 await page.getByRole('button',{name:'Refresh readiness',exact:true}).click();
 const refreshResponse=await refreshed;assert.equal(refreshResponse.status(),200);
 const refreshReport=await refreshResponse.json();await assertInstallationChecklist(refreshReport);
 await page.locator('.readiness [data-readiness-row]').first().waitFor();
 await assertChecklistPage(refreshReport);
 assert.deepEqual(durableSnapshot(worker),before,'reading and refreshing the populated checklist writes no durable rows, paging records, revisions or audit');
 assert.deepEqual(await worker.outboundRequests(),outbound,'reading and refreshing sends no outbound request');
 assert.deepEqual(outbound,[],'the native checklist journey makes zero outbound requests');
 assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0,'readiness has no hydration mismatch');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'readiness fits the desktop viewport');
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();
 assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[],'readiness has no serious or critical accessibility violation');
 const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.screenshot({path:`${directory}/oc054-readiness-${width}.png`,fullPage:true});
  console.log('CHECKLIST_LAYOUT '+JSON.stringify({width,...await checklist.evaluate(node=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,minimumTextSize:Math.min(...[...node.querySelectorAll('h3,p,strong,span')].map(element=>parseFloat(getComputedStyle(element).fontSize)))}))}));
  await checklist.scrollIntoViewIfNeeded();await page.screenshot({path:`${directory}/oc044-checklist-${width}.png`,fullPage:false});
 }
 console.log('PROBE OC-044 acceptance 1 checklist: emitted Settings Readiness -> protected API and all rendered dependency states, owners, field-proof dates and not-done labels agree; refresh preserves durable and paging records with zero outbound requests; desktop axe and overflow pass; screenshots at 1440 and 390');
 console.log('INSTALLATION_RECEIPT '+JSON.stringify({observedAt:report.observedAt,release:report.release,installation:report.installation}));
 console.log('PASS OC-054 Readiness Settings navigation, real matrix/signal rendering, pager refusal, refresh, axe/overflow/hydration at 1440; Readiness visual proof once at 1440/390');
}

// OC-001: a sender can leave for Alerts and return to recover the same generation.
async function eventsSourceBrowser(page,context) {
 const origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';
 const sourceContext=await context.browser().newContext({baseURL:origin,storageState:await context.storageState(),viewport:{width:1440,height:1000},locale:'en-US',timezoneId:'Australia/Brisbane',extraHTTPHeaders:{connection:'close'}});
 try {
 context=sourceContext;page=await context.newPage();const sourceErrors=[];page.on('pageerror',error=>sourceErrors.push(error.message));await page.goto(origin);
 await page.setViewportSize({width:1440,height:1000});
 await mkdir(directory,{recursive:true});await context.grantPermissions(['clipboard-read','clipboard-write']);
 const request=async(path,data,status=200)=>{
  const response=data===undefined?await context.request.get(path):await context.request.post(path,{headers:{origin},data});
  assert.equal(response.status(),status,`Events source ${path}`);return response.json();
 };
 const member=(await request('/api/session')).member,service='synthetic-oncall-238',serviceName='Checkout events';
 await request('/api/command',{type:'service',id:service,name:serviceName,environment:'production',owner:member.id,runbook:[],pager:''});
 const proof=async(name)=>{
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' fits desktop');
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${directory}/events-${name}-${width}.png`,fullPage:true,mask:[page.locator('.one-time-secret input'),page.locator('input[type="password"]')]});}
  await page.setViewportSize({width:1440,height:1000});
 };
 const create=async(mode)=>{
  await page.goto(origin+'/settings/integrations/new/events');
  await page.getByLabel('Name',{exact:true}).fill('Synthetic events '+mode);
  const select=page.getByLabel('Service',{exact:true});if(await select.count())await select.selectOption(service);
  await page.getByLabel('Authentication',{exact:true}).selectOption(mode);
  await page.getByRole('button',{name:'Create source',exact:true}).click();
  const key=await page.getByLabel('Private key',{exact:true}).inputValue();assert.ok(key);
  await expect(page.getByRole('button',{name:'Copy ingress URL',exact:true})).toBeEnabled();
  const url=await page.getByLabel('Ingress URL',{exact:true}).inputValue();
  assert.equal(new URL(url).origin,origin);assert.ok(new URL(url).pathname.startsWith('/api/ingress/'));
  await page.getByRole('button',{name:'Copy ingress URL',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),url);
  const example=await page.getByLabel('Sample request',{exact:true}).inputValue();assert.ok(!example.includes(key),'sample never embeds the secret');
  await page.getByRole('button',{name:'Copy sample request',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),example);
  if(mode==='bearer')await proof('created');
  const path=new URL(await page.getByRole('link',{name:'Open source',exact:true}).getAttribute('href'),origin).pathname;
  return {key,url,example,path,name:await page.getByRole('heading',{level:2}).innerText(),source:decodeURIComponent(new URL(url).pathname.split('/').at(-1))};
 };
 // Extend this existing source lifecycle journey through the compatible form.
 await page.goto(origin+'/settings/integrations/new/pagerduty');
 await page.getByLabel('Name',{exact:true}).fill('Harbour Checkout compatible');
 const compatibleService=page.getByLabel('Service',{exact:true});if(await compatibleService.count())await compatibleService.selectOption(service);
 await page.getByRole('button',{name:'Create source',exact:true}).click();
 const compatibleKey=await page.getByLabel('Private key',{exact:true}).inputValue();
 const compatiblePath=await page.getByRole('link',{name:'Open source',exact:true}).getAttribute('href');
 const compatibleId=decodeURIComponent(compatiblePath.split('/').at(-1));
 await page.getByRole('link',{name:'Open source',exact:true}).click();await page.getByText('Send a test event',{exact:true}).click();
 await page.getByLabel('Private key',{exact:true}).fill(compatibleKey);await page.getByLabel('Title',{exact:true}).fill('Checkout gateway connection saturation');
 const sendCompatible=async(status=202)=>{
  const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/v2/enqueue'&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Send test event',exact:true}).click();const response=await pending;
  assert.equal(response.status(),status);if(response.ok())await expect.poll(()=>page.locator('.notice').innerText()).toBe('Test event accepted');else await page.locator('.failure-line').waitFor();await expect(page.getByRole('button',{name:'Send test event',exact:true})).toBeEnabled();return response.json();
 };
 const compatibleTrigger=await sendCompatible();
 assert.equal(await page.getByLabel('Private key',{exact:true}).inputValue(),compatibleKey,'test sends retain the private key in the mounted form');
 assert.equal(await page.getByLabel('Alert key (dedup key)',{exact:true}).inputValue(),compatibleTrigger.dedup_key,'the form exposes the actual compatible outage key');
 await page.getByLabel('Intent',{exact:true}).selectOption('recover');await sendCompatible();
 let compatibleState=await request('/api/state'),compatibleAlerts=compatibleState.alerts.filter(a=>a.source===compatibleId);
 assert.equal(compatibleAlerts.length,1);assert.equal(compatibleAlerts[0].state,'recovered');
 assert.equal(compatibleState.intakeReceipts.at(-1).outcome,'recovered','the test recovery has an effect on its trigger');
 // Reopen the same explicit outage key, visit Alerts, then return to recover it.
 await page.getByLabel('Intent',{exact:true}).selectOption('trigger');const reopened=await sendCompatible();assert.equal(reopened.dedup_key,compatibleTrigger.dedup_key);
 await page.goto(origin+'/alerts');await page.locator('.alert-row').filter({hasText:'Checkout gateway connection saturation'}).first().waitFor();
 await page.goto(origin+compatiblePath);await page.getByText('Send a test event',{exact:true}).click();
 assert.equal(await page.getByLabel('Alert key (dedup key)',{exact:true}).inputValue(),reopened.dedup_key,'returning to the compatible source restores the trigger key');
 assert.equal(await page.getByLabel('Private key',{exact:true}).inputValue(),'','navigation does not persist the private key');
 await page.getByLabel('Private key',{exact:true}).fill(compatibleKey);await page.getByLabel('Intent',{exact:true}).selectOption('recover');
 await proof('compatible-recover-form');await sendCompatible();compatibleState=await request('/api/state');
 compatibleAlerts=compatibleState.alerts.filter(a=>a.source===compatibleId);assert.equal(compatibleAlerts.length,2);
 assert.ok(compatibleAlerts.every(a=>a.state==='recovered'),'no compatible test alert remains active');
 await page.goto(origin+'/alerts');const recoveredRows=page.locator('.alert-row').filter({hasText:'Checkout gateway connection saturation'});assert.equal(await recoveredRows.count(),2);
 for(const row of await recoveredRows.all())assert.equal(await row.locator('xpath=..').getByRole('heading',{name:'Recovered',exact:true}).count(),1);
 await proof('compatible-recovered-list');
 // A wrong compatible credential uses its provider error envelope (HTTP 400).
 await page.goto(origin+compatiblePath);await page.getByText('Send a test event',{exact:true}).click();
 await page.getByLabel('Private key',{exact:true}).fill(randomBytes(32).toString('hex'));await sendCompatible(400);
 await page.locator('.failure-line').waitFor();const keyFailure=await page.locator('.failure-line').innerText();
 assert.match(keyFailure,/key|credential/i);assert.doesNotMatch(keyFailure,/allowance/i);await proof('compatible-key-refused');
 const source=await create('bearer');await page.getByRole('link',{name:'Open source',exact:true}).click();
 await page.getByLabel('Ingress URL',{exact:true}).waitFor();assert.equal(await page.locator('.ingress-example').getAttribute('open'),'','empty source opens its sample');
 await proof('empty-source');await page.getByText('Send a test event',{exact:true}).click();
 await page.getByLabel('Private key',{exact:true}).fill(source.key);await page.getByLabel('Title',{exact:true}).fill('Checkout API latency above 2 seconds');
 await page.getByLabel('Severity',{exact:true}).selectOption('critical');
 const key=await page.getByLabel('Alert key (dedup key)',{exact:true}).inputValue(),generation=await page.getByLabel('Lifecycle generation',{exact:true}).inputValue();
 const send=async()=>{const pending=page.waitForResponse(r=>r.url()===source.url&&r.request().method()==='POST');await page.getByRole('button',{name:'Send test event',exact:true}).click();assert.equal((await pending).status(),201);await page.getByRole('button',{name:'Send test event',exact:true}).waitFor();};
 await send();await page.goto(origin+'/alerts');
 let state=await request('/api/state'),alerts=state.alerts.filter(a=>a.source===source.source);assert.equal(alerts.length,1);assert.equal(alerts[0].state,'active');
 const alert=alerts[0],nav=()=>page.locator('a[href="/alerts"] .nav-count').first();assert.equal(await nav().innerText(),String(state.alerts.filter(a=>a.state==='active').length));
 const row=page.locator('.alert-row').filter({hasText:'Checkout API latency above 2 seconds'});assert.equal(await row.count(),1);assert.match(await row.innerText(),/critical/);
 await row.click();await page.getByRole('button',{name:'Declare incident from alert',exact:true}).click();
 await page.locator('.incident-page h1').waitFor();
 const incident=(await request('/api/state')).incidents.find(item=>item.alerts.includes(alert.id));assert.ok(incident);
 await page.locator('.incident-page').getByRole('button',{name:'Acknowledge',exact:true}).click();
 await page.locator('.incident-state.state-acknowledged').waitFor();
 await page.goto(origin+source.path);await page.getByText('Send a test event',{exact:true}).click();
 assert.equal(await page.getByLabel('Alert key (dedup key)',{exact:true}).inputValue(),key);assert.equal(await page.getByLabel('Lifecycle generation',{exact:true}).inputValue(),generation);
 assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Checkout API latency above 2 seconds');
 await page.getByLabel('Intent',{exact:true}).selectOption('recover');assert.equal(await page.getByLabel('Severity',{exact:true}).inputValue(),'warning');
 await proof('recover-form');await page.getByLabel('Private key',{exact:true}).fill(source.key);await send();
 state=await request('/api/state');alerts=state.alerts.filter(a=>a.source===source.source);assert.equal(alerts.length,1);assert.equal(alerts[0].id,alert.id);assert.equal(alerts[0].state,'recovered');assert.equal(alerts[0].events.length,2);
 assert.equal(state.incidents.find(i=>i.id===incident.id).state,'acknowledged','source recovery keeps the acknowledged incident open');
 const events=state.events.filter(e=>e.source===source.source);assert.deepEqual(events.map(e=>[e.intent,e.key,e.generation,e.severity]),[['trigger',key,generation,'critical'],['recover',key,generation,'warning']]);
 await page.goto(origin+'/alerts');assert.equal(await row.count(),1);assert.equal(await row.locator('xpath=..').getByRole('heading',{name:'Recovered',exact:true}).count(),1);
 assert.equal(await nav().innerText(),String(state.alerts.filter(a=>a.state==='active').length));await proof('recovered-list');
 await row.click();await page.getByRole('article',{name:'Alert details',exact:true}).waitFor();assert.match(await page.locator('.alert-meta').innerText(),/critical.*recovered/);await proof('recovered-alert');
 // Extend this source-recovery journey: readable history at desktop width and
 // the long-zone timestamp boundary at phone width, without rewriting records.
 await page.goto(origin+'/incidents/'+incident.id);
 const timeline=page.getByRole('region',{name:'Timeline',exact:true});await timeline.locator('.event').last().waitFor();
 const earlier=timeline.getByRole('button',{name:/^Earlier entries/});if(await earlier.count())await earlier.click();
 const stored=state.incidents.find(i=>i.id===incident.id).timeline;
 const text=await timeline.innerText();
 assert.doesNotMatch(text,/\b[A-Z]{2,}-\d{3}\b/,'generated timeline copy contains no internal clause code');
 assert.ok(!text.includes(source.source),'the generated source identifier is not a display name');
 assert.ok((await timeline.locator('.event small').allTextContents()).includes('Source: '+source.name),'recovery names the source its owner created');
 assert.equal(state.incidents.find(i=>i.id===incident.id).sourceRecovery.reminder.automatic,false,'the recorded reminder is not automatic delivery');
 assert.ok((await timeline.locator('time').allTextContents()).every(text=>text.includes('Australia/Brisbane')),'timeline timestamps retain the browser zone');
 await timeline.scrollIntoViewIfNeeded();await timeline.screenshot({path:`${directory}/timeline-recovery-1440.png`});
 await page.setViewportSize({width:390,height:1000});
 const bounds=await timeline.evaluate(card=>{
  const bounds=card.getBoundingClientRect();
  return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,times:[...card.querySelectorAll('time')].map(time=>{
   const range=document.createRange();range.selectNodeContents(time);
   return {text:time.textContent,inside:[...range.getClientRects()].every(rect=>rect.left>=bounds.left&&rect.right<=bounds.right),fits:time.scrollWidth<=time.clientWidth};
  })};
 });
 assert.ok(bounds.times.length>=3,'declared, acknowledged and source recovery times are visible');
 assert.ok(bounds.times.every(time=>time.inside&&time.fits),'every timestamp line stays inside the phone timeline card without clipping');
 assert.ok(bounds.scrollWidth<=bounds.viewport,'phone timeline has no sideways scroll');
 await timeline.screenshot({path:`${directory}/timeline-recovery-390.png`});
 await page.setViewportSize({width:1440,height:1000});
 assert.deepEqual((await request('/api/state')).incidents.find(i=>i.id===incident.id).timeline,stored,'reading and formatting retained history never changes it');
 await writeFile(`${directory}/timeline-receipt.json`,JSON.stringify({journey:'eventsSourceBrowser',desktop:{width:1440,sourceName:source.name,internalCodes:0,storedHistoryUnchanged:true},phone:bounds},null,2)+'\n');
 console.log('PASS source recovery timeline: owner-given source name, no internal codes and unchanged stored history at 1440; all Australia/Brisbane timestamp lines inside the card without clipping or sideways scroll at 390');
 // Read each detail page, copy its command unchanged and send it through the
 // public HTTP door. Human names must retain the same stored identity as IDs.
 for(const sample of [source,await create('signed')]){
  await page.goto(origin+sample.path);
  assert.equal(await page.getByRole('region',{name:'Integration source',exact:true}).getByRole('heading',{level:2}).innerText(),sample.name,'the existing source link names its source plainly');
  const details=page.locator('.ingress-example');if(await details.getAttribute('open')===null)await details.locator('summary').click();
  assert.equal(await page.getByLabel('Ingress URL',{exact:true}).inputValue(),sample.url,'existing ingress address is unchanged');
  const example=await page.getByLabel('Sample request',{exact:true}).inputValue();
  const body=JSON.parse(example.match(/'({\n[\s\S]*\n})'/)[1].replaceAll("'\\''","'"));
  assert.equal(body.source,sample.name,'sample uses the source name shown on its page');
  assert.equal(body.service,service,'sample keeps the service identity required by the API');
  assert.ok(body.key.includes(serviceName)&&!body.key.includes(service),'dedup key describes the named service');
  assert.ok(body.generation.includes(body.observedAt)&&body.eventId.includes(body.generation),'sample observation and lifecycle IDs use a readable timestamp');
  assert.ok(!body.eventId.includes(service)&&!/[a-f0-9]{8}-[a-f0-9]{4}-/i.test(body.eventId),'event identity contains no internal UUID');
  assert.ok((await details.locator('p').allTextContents()).some(text=>text.includes(serviceName)&&text.includes('internal ID')),'required service ID is explained beside the sample');
  assert.equal(await details.getByRole('link',{name:'Services',exact:true,includeHidden:true}).getAttribute('href'),'/settings/services');
  const setupText=await details.innerText();
  assert.ok(setupText.includes(serviceName),'the ready-to-copy sample names its service');
  assert.ok(!setupText.includes(service)&&!setupText.includes(sample.source),'default explanation omits internal identities');
  assert.ok(!setupText.includes('internal ID'),'setup does not ask the person to look up an internal ID');
  await page.getByRole('button',{name:'Copy sample request',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),example);
  await proof(sample===source?'readable-bearer-source':'readable-signed-source');
  const output=await runSenderRecipe(example,sample.key);
  const receipt=JSON.parse(output);assert.equal(receipt.service,service);assert.ok(receipt.id);
  const sendBody=async(value)=>{
   const raw=JSON.stringify(value),headers={'content-type':'application/json'};
   if(sample===source)headers.authorization='Bearer '+sample.key;
   else {const timestamp=String(Math.floor(Date.now()/1000));headers['x-oncall-timestamp']=timestamp;headers['x-oncall-signature']=createHmac('sha256',sample.key).update(timestamp+'.'+raw).digest('hex');}
   const response=await context.request.post(sample.url,{headers,data:raw});return {status:response.status(),value:await response.json()};
  };
  const legacy=await sendBody({...body,source:sample.source});assert.equal(legacy.status,200);assert.equal(legacy.value.id,receipt.id);assert.equal(legacy.value.duplicate,true,'legacy ID retries share the named sample receipt');
  const accepted=await request('/api/state'),event=accepted.events.find(event=>event.id===receipt.id),alert=accepted.alerts.find(alert=>alert.events.includes(receipt.id));
  assert.equal(event.source,sample.source,'stored event keeps the established source identity');assert.equal(event.key,body.key);assert.equal(alert.state,'active');assert.equal(alert.service,service);
  assert.equal((await sendBody({...body,source:'Another source',eventId:body.eventId+'-wrong-source'})).status,403,'a display name cannot select another source');
  assert.equal((await sendBody({...body,service:serviceName,eventId:body.eventId+'-wrong-service'})).status,403,'service names cannot bypass the explicit ID scope');
  const unchanged=await request('/api/state');assert.deepEqual(unchanged.events,accepted.events);assert.deepEqual(unchanged.alerts,accepted.alerts,'refused identities create no accepted event or alert');
  await page.goto(origin+'/alerts');const opened=page.locator('.alert-row').filter({hasText:body.title});assert.ok(await opened.count()>0,'the sent sample opens an alert visible in Alerts');
  await page.locator('.alert-row[href="/alerts/'+encodeURIComponent(alert.id)+'"]').click();
  await page.getByRole('article',{name:'Alert details',exact:true}).waitFor();
  await page.goto(origin+sample.path);assert.equal(await page.getByRole('region',{name:'Integration source',exact:true}).getByRole('heading',{level:2}).innerText(),sample.name,'the original page URL still works after sending');
 }

 // The same form diagnoses a valid key's event allowance, including rotation.
 await page.goto(origin+source.path);await page.getByText('Send a test event',{exact:true}).click();
 let limited=await request('/api/state');await request('/api/intake/allowances',{id:'source:'+source.source,requests:600,events:1,revision:limited.revision});
 const refusalBefore=await request('/api/state');
 await page.getByLabel('Private key',{exact:true}).fill(source.key);await page.getByLabel('Intent',{exact:true}).selectOption('recover');
 const refuse=async()=>{const pending=page.waitForResponse(r=>r.url()===source.url&&r.request().method()==='POST');await page.getByRole('button',{name:'Send test event',exact:true}).click();const response=await pending;assert.equal(response.status(),429);assert.ok(Number(response.headers()['retry-after'])>0);await page.locator('.failure-line').waitFor();await page.getByRole('button',{name:'Send test event',exact:true}).waitFor();return page.locator('.failure-line').innerText();};
 const allowanceFailure=await refuse();
 assert.match(allowanceFailure,/event.*allowance/i);assert.match(allowanceFailure,/retry|wait/i);assert.match(allowanceFailure,/New events per minute/);
 assert.doesNotMatch(allowanceFailure,/private key|credential|sender settings/i,'an allowance refusal must not blame a valid key');
 await page.locator('summary').filter({hasText:/^Rejected requests /}).click();
 const retainedNotice=await page.getByRole('list',{name:'Allowance refusals',exact:true}).innerText();
 assert.ok(retainedNotice.includes(allowanceFailure.split(' Retry')[0]),'the immediate result uses the retained refusal explanation');
 assert.equal(await page.getByLabel('Private key',{exact:true}).inputValue(),source.key);await proof('allowance-refused');
 const rotatedKey=randomBytes(32).toString('hex');await request('/api/sources',{id:source.source,key:rotatedKey,mode:'bearer',scopes:[service]});
 await page.getByLabel('Private key',{exact:true}).fill(rotatedKey);const rotatedFailure=await refuse();
 assert.match(rotatedFailure,/event.*allowance/i);assert.doesNotMatch(rotatedFailure,/private key|credential/i);
 const refusalAfter=await request('/api/state');assert.deepEqual(refusalAfter.events,refusalBefore.events);assert.deepEqual(refusalAfter.alerts,refusalBefore.alerts,'allowance refusals preserve the alert lifecycle');
 await page.getByLabel('Private key',{exact:true}).fill(source.key);
 const badKey=page.waitForResponse(r=>r.url()===source.url&&r.request().method()==='POST');await page.getByRole('button',{name:'Send test event',exact:true}).click();assert.equal((await badKey).status(),401);
 await expect.poll(()=>page.locator('.failure-line').innerText()).toMatch(/private key/i);
 assert.doesNotMatch(await page.locator('.failure-line').innerText(),/allowance/i);
 await writeFile(`${directory}/test-event-receipt.json`,JSON.stringify({journey:'eventsSourceBrowser',width:1440,compatible:{sameMountedFormRecovered:true,returnedFormRecovered:true,activeAlerts:compatibleAlerts.filter(a=>a.state==='active').length,generations:compatibleAlerts.length,keyVisible:true,keyRetainedBetweenSends:true,keyNotPersistedAcrossNavigation:true},allowance:{status:429,reason:allowanceFailure,rotatedReason:rotatedFailure,unchangedAlertsAndEvents:true},authentication:{compatibleStatus:400,nativeStatus:401,reason:keyFailure},screenshots:[1440,390]},null,2)+'\n');
 console.log('PASS test-event results: compatible same-form and returned-form recoveries leave zero active alerts, explicit outage key and in-memory private key retained; native allowance and rotated key refusals explain retry or allowance settings, wrong keys explain authentication, refused requests preserve events and alerts; changed screens captured at 1440/390.');
 await readableNamesBrowser(page,context,{source:{...source,key:rotatedKey},service,serviceName});
 console.log('PASS OC-001 Events source recovery: Critical Trigger -> navigate Alerts -> Warning Recover with retained key/generation; one recovered alert, active 1 to 0, nav/list/detail agree, declared incident stays open. Detail-page readable source samples copied and executed for bearer and signed, alerts visible, legacy ID retries deduplicated and mismatched identities refused; changed screens captured once at 1440/390.');
 assert.deepEqual(sourceErrors,[],'source recovery has no browser application errors');
 } finally {await sourceContext.close();}
}

// Production Worker + real local D1, without starting a managed rer dev server.
const worker=await localWorker({INBOUND_EMAIL_DOMAIN:'inbound.example.test'},{clock:true,outboundLedger:true})
const credentials={name:'Product browser owner',password:randomBytes(32).toString('hex')}
let browser,page
try {
 await mkdir('evidence/browser',{recursive:true})
 await mkdir('.rer/local',{recursive:true,mode:0o700})
 const owner=await worker.request('/api/setup',credentials)
 assert.equal(owner.status,200,'the public setup door creates the local browser owner')
 browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 // The journey pauses for D1 reads and held responses. Match localWorker's
 // one-request connections so Playwright cannot reuse a Worker-idle socket.
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},locale:'en-US',timezoneId:process.env.ONCALL_PRODUCT_JOURNEY==='readable-times'?'Australia/Brisbane':'UTC',extraHTTPHeaders:{connection:'close'}})
 await context.addCookies(owner.headers.getSetCookie().map(line=>{
  const pair=line.split(';')[0],at=pair.indexOf('=')
  return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}
 }))
 page=await context.newPage()
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto(worker.origin)
 await page.locator('.oncall-frame').waitFor({timeout:60000})
 let selectedTime=null
 const openSession=async(second,secondPage)=>{
  // oc_current_sessions also checks SQLite's wall clock. Issue the independent
  // session at real time, then resume the journey clock; a historical login
  // would already be expired in that view once its twelve-hour window passes.
  await worker.time(null)
  try {
  const login=await second.request.post('/api/login',{headers:{origin:worker.origin},data:credentials})
  assert.equal(login.status(),200,'the second browser context signs in through the real login door')
  await secondPage.goto(worker.origin)
  } finally { await worker.time(selectedTime) }
 }
 const focused=process.env.ONCALL_PRODUCT_JOURNEY;
 if(focused&&!['sender-setup','response-policy','imported-email','events-source','readiness','accessibility','triage','limitations','roles','move-in-guide','support-start','readable-times','rota-timeline'].includes(focused))throw Error('Unknown focused product journey');
 const triageProof={snapshot:()=>durableSnapshot(worker),outbound:()=>worker.outboundRequests()};
 const setTime=async at=>{selectedTime=at;await worker.time(at);if(at===null)await page.clock.setSystemTime(new Date());else await page.clock.setFixedTime(new Date(at));};
 if(focused==='rota-timeline'){
  const session=await (await context.request.get('/api/session')).json();
  await context.request.post('/api/command',{headers:{origin:worker.origin},data:{type:'service',id:'synthetic-oncall-1',name:'Checkout',environment:'test',owner:session.member.id,runbook:[],pager:''}});
  const {productSchedule}=await import('./product-browser-journey.mjs');
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await productSchedule(page,context,width,session,{selectedOnly:true,setTime});}
 }
 if(focused==='readable-times'){
  const session=await (await context.request.get('/api/session')).json();
  await context.request.post('/api/command',{headers:{origin:worker.origin},data:{type:'service',id:'synthetic-oncall-1',name:'Checkout',environment:'test',owner:session.member.id,runbook:[],pager:''}});
  await keyboardCoordination(page,context,1440,undefined,openSession);
  await scheduleCoordinationBrowser(page,context,1440,session);
  await coverageRulesBrowser(page,context,1440,session);
  await readinessBrowser(page,context);
 }
 if(focused==='imported-email')await importedEmailBrowser(page,context);
 if(focused==='events-source')await eventsSourceBrowser(page,context);
 if(focused==='sender-setup'){
  const request=async(path,data)=>{const r=await worker.request(path,data,owner.cookie);assert.ok(r.status>=200&&r.status<300,JSON.stringify(r.value));return r.value;};
  const actor=(await request('/api/session')).member;
  await request('/api/command',{type:'service',id:'synthetic-oncall-1',name:'Synthetic checkout',environment:'test',owner:actor.id,runbook:[],pager:''});
  await senderSetupBrowser(page,context,worker.origin,request,()=>randomBytes(32).toString('hex'));
 }
 if(focused==='response-policy')await responsePolicyBrowser(page,context);
 if(focused==='support-start')await supportStartBrowser(page,context,{setTime,proof:triageProof});
 if(focused==='roles'){
  const member=(await (await context.request.get('/api/session')).json()).member;
  const baseline=await context.request.post('/api/command',{headers:{origin:worker.origin},data:{type:'service',name:'Synthetic existing service',environment:'test',owner:member.id,runbook:[],pager:''}});assert.equal(baseline.status(),200);
  await incidentWorkflowBrowser(page,context,triageProof);
 }
 if(focused==='move-in-guide')await providerExport(page,context,1440,triageProof);
 if(['limitations','readiness'].includes(focused))await limitationsBrowser(page,context);
 if(focused==='triage')await triageFiltersBrowser(page,context,{setTime,proof:triageProof});
 if(!['sender-setup','response-policy','imported-email','events-source','readiness','triage','limitations','roles','move-in-guide','support-start','readable-times','rota-timeline'].includes(focused)){
 await productBrowserJourney(page,context,{openSession,accessibilityOnly:focused==='accessibility',setTime,triageProof})
 if(focused!=='accessibility'){
 await incompleteIntakeBrowser(page,context)
 console.log('PASS OC-059 incomplete intake browser: high owner obligation in alerts and routing at 1440; overflow, axe and hydration checked')
 await responsePolicyBrowser(page,context)
 await setTime(null);await incidentWorkflowBrowser(page,context,triageProof)
 await changeAndSigningBrowser(page,context)
 console.log('PASS OC-056 source recovery browser: versioned policy, stopped alert, awaiting-resolution incident, commander reminder, required-summary refusal and focused tooltips at 1440; overflow, axe and hydration checked')
 }
 }
 if(!['sender-setup','response-policy','imported-email','events-source','accessibility','triage','limitations','roles','move-in-guide','support-start','readable-times','rota-timeline'].includes(focused))await readinessBrowser(page,context)
 if(!focused)await importedEmailBrowser(page,context)
 if(!focused)await responseReportBrowser(browser)
 if(!focused)await eventsSourceBrowser(page,context)
 assert.deepEqual(errors,[],'no browser application errors')
 console.log(focused==='sender-setup'?'Emitted Worker sender setup journey passed at 1440; screens captured at 1440 and 390':focused==='response-policy'?'Emitted Worker response-policy journey passed at 1440':focused==='imported-email'?'Emitted Worker saved email import journey passed at 1440; changed states captured at 1440 and 390':focused==='rota-timeline'?'Emitted Worker rota timeline passed: readable phone lists and compact accessible desktop slices on overview and rota pages':focused==='readable-times'?'Emitted Worker readable-times journey passed at 1440 in Australia/Brisbane with an America/New_York rota; changed rota and readiness screens captured at 1440 and 390':focused==='events-source'?'Emitted Worker Events source journey passed at 1440; screens captured at 1440 and 390':focused==='support-start'?'Emitted Worker support-start browser journey passed at 1440; screens captured at 1440 and 390':focused==='move-in-guide'?'Emitted Worker move-in guide and exporter journey passed; changed screens captured at 1440 and 390':focused==='roles'?'Emitted Worker role and workflow browser journey passed at 1440; role screens captured at 1440 and 390':focused==='readiness'?'Emitted Worker readiness browser journey passed at 1440':focused==='triage'?'Emitted Worker triage browser journey passed at 1440; changed screens captured at 1440 and 390':'Emitted Worker product browser journey passed at 1440 with the selected OC-009 keyboard leg at 390')
} catch(error) {
 if(page){
  await page.screenshot({path:'evidence/browser/product-failure.png',fullPage:true,mask:[page.locator('[aria-label="New private calendar URL"]'),page.locator('.one-time-secret input')]})
  console.error('Product browser failure at',new URL(page.url()).pathname)
  console.error(redact((await page.locator('body').innerText()).slice(0,1800)))
 }
 throw error
} finally {
 try {await browser?.close()} finally {await worker.close()}
}
if(!['sender-setup','response-policy','imported-email','events-source','readiness','accessibility','triage','limitations','roles','move-in-guide','support-start','readable-times','rota-timeline'].includes(process.env.ONCALL_PRODUCT_JOURNEY))await import('./agent-door-browser.mjs');
