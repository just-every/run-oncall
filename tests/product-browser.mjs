import {openWorkspaceSection} from './keyboard.mjs'
import assert from 'node:assert/strict'
import {randomBytes,createHmac} from 'node:crypto'
import {mkdir} from 'node:fs/promises'
import {chromium,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {localWorker,ownerDoor} from './worker.mjs'
import {productBrowserJourney} from './product-browser-journey.mjs'
import {redact} from './diagnostics.mjs'
import {keyboardUser,focusWorkspace} from './keyboard.mjs'

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
  const routedCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:title,exact:true,level:3})}),ownerCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:incompleteTitle,exact:true,level:3})})
  await routedCard.getByText('Payments · production · active',{exact:true}).waitFor()
  await ownerCard.getByText(/^Integration unrouted queue.*active$/).waitFor()
  await ownerCard.getByText(`Paging obligation: recorded · Integration owner: ${member.name} · high urgency · paging OFF; non-automatic.`,{exact:true}).waitFor()
  assert.ok(await routedCard.isVisible());assert.ok(await ownerCard.isVisible())
  const incidentService=ownerCard.getByLabel('Incident service',{exact:true}),declare=ownerCard.getByRole('button',{name:'Declare incident from alert',exact:true})
  assert.equal(await incidentService.inputValue(),'','owner queue declaration requires an explicit service choice')
  assert.equal(await declare.isEnabled(),false)
  assert.deepEqual(await incidentService.locator('option').evaluateAll(options=>options.map(option=>option.value)),['','payments'],'queue declaration offers only services in the integration scope')
  await incidentService.selectOption('payments');assert.equal(await declare.isEnabled(),true)
  await page.screenshot({path:`evidence/browser/oc056-queue-service-${width}.png`,fullPage:true})
  await checkScreen('alerts',width)
  await ownerCard.scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/browser/oc059-alerts-focus-${width}.png`})
  await openWorkspaceSection(page,'routing')
  await page.getByLabel('Routed integration',{exact:true}).selectOption(source)
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
 const ownerCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:incompleteTitle,exact:true,level:3})})
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
  const alertCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:warning.title,exact:true,level:3})})
  await alertCard.getByText('stopped by source recovery',{exact:true}).waitFor()
  await alertCard.getByText(/Recovered notice: Everyone already notified · recorded · no sender until OC-026/).waitFor()
  await alertCard.getByText(/Attempt cancellation:/).waitFor()
  const recoveredState=await request('/api/state'),stopped=recoveredState.alerts.find(alert=>alert.id===warningAlert.id)
  assert.equal(stopped.state,'recovered');assert.equal(stopped.obligation.state,'stopped')
  assert.ok(stopped.obligation.receipt);await alertCard.locator('p').filter({hasText:'Recovery receipt: '+stopped.obligation.receipt}).waitFor()
  await checkScreen('alert-recovery',width,alertCard)
  await alertCard.getByRole('button',{name:'Declare incident from alert',exact:true}).click()
  await page.locator('.detail').getByRole('heading',{name:warning.title,exact:true}).waitFor()
  assert.ok((await request('/api/state')).incidents.some(incident=>incident.alerts.includes(warningAlert.id)),'a human can declare from a recovered alert')
  await send(critical)
  const automaticState=await request('/api/state'),criticalAlert=automaticState.alerts.find(alert=>alert.source==='intake:'+source&&alert.key===critical.key),incident=automaticState.incidents.find(incident=>incident.alerts.includes(criticalAlert.id))
  assert.ok(incident?.automaticDeclaration,'critical rule automatically declares an incident')
  await focusWorkspace(page)
  await openWorkspaceSection(page,'alerts')
  const criticalCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:critical.title,exact:true,level:3})})
  await criticalCard.getByRole('link',{name:'Open incident: '+critical.title,exact:true}).click()
  const detail=page.locator('.detail')
  await detail.getByText('Automatic declaration · service response policy',{exact:true}).waitFor()
  await detail.getByLabel('Reason and observed outcome',{exact:true}).fill('Commander acknowledges the customer checkout outage.')
  await detail.getByRole('button',{name:'Record transition',exact:true}).click()
  await detail.locator('.status-mark').filter({hasText:/^acknowledged$/}).waitFor()
  // A different assignee must not hide the commander's recovery reminder.
  await detail.getByText('Change response ownership or priority',{exact:true}).click()
  await detail.getByLabel('Response change',{exact:true}).selectOption('reassign')
  await detail.getByLabel('Assigned responder',{exact:true}).selectOption('')
  await detail.getByLabel('Reason for response change',{exact:true}).fill('Commander retains coordination while reassignment is pending.')
  await detail.getByRole('button',{name:'Save response change',exact:true}).click()
  await page.getByRole('status').filter({hasText:'Saved'}).waitFor()
  await send({...critical,eventId:'checkout-recovery',intent:'recover',severity:'info'})
  await focusWorkspace(page)
  const recovery=detail.getByRole('region',{name:'Source recovery',exact:true})
  await recovery.getByText('all alerts recovered — awaiting resolution',{exact:true}).waitFor()
  await recovery.locator('p').filter({hasText:'Commander reminder: '+member.name+' · recorded · no timer until OC-027'}).waitFor()
  const reminderView=page.getByRole('region',{name:'My commander reminders',exact:true})
  await reminderView.getByRole('button',{name:critical.title,exact:true}).waitFor()
  const open=(await request('/api/state')).incidents.find(item=>item.id===incident.id)
  assert.equal(open.state,'acknowledged');assert.equal(open.commander,member.id);assert.equal(open.assignee,null)
  assert.equal(open.sourceRecovery.reminder.commander,member.id);assert.equal(open.sourceRecovery.reminder.state,'recorded')
  await page.locator('.saved-views > summary').click()
  const deleteView=page.getByRole('button',{name:'Delete view '+viewName,exact:true})
  await keyboardUser(page).reach(deleteView)
  assert.equal(await page.getByRole('tooltip',{name:'Delete view '+viewName,exact:true}).isVisible(),true,'saved-view delete tooltip is visible immediately on keyboard focus')
  await checkScreen('incident-recovery',width,recovery)
  await reminderView.getByRole('button',{name:critical.title,exact:true}).click()
  await detail.getByLabel('Next state',{exact:true}).selectOption('recovered')
  await detail.getByLabel('Reason and observed outcome',{exact:true}).fill('Successful checkout verified independently of source recovery.')
  await detail.getByLabel('Recovery evidence URL (required for recovered)',{exact:true}).fill('https://monitoring.example.test/checkout/recovery')
  await detail.getByRole('button',{name:'Record transition',exact:true}).click()
  await detail.locator('.status-mark').filter({hasText:/^recovered$/}).waitFor()
  await detail.getByLabel('Next state',{exact:true}).selectOption('resolved')
  const summary=detail.getByLabel('Reason and observed outcome',{exact:true})
  await summary.fill('')
  await detail.getByRole('button',{name:'Record transition',exact:true}).click()
  assert.equal(await summary.evaluate(input=>input.validity.valueMissing),true,'browser resolution requires a summary')
  // Submit the same real form without client validation to prove the server refusal is announced.
  await summary.evaluate(input=>input.required=false)
  const refused=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().method()==='POST')
  await detail.getByRole('button',{name:'Record transition',exact:true}).click()
  assert.equal((await refused).status(),400,'server refuses resolution without a summary')
  await page.locator('.failure-line[role="alert"]').waitFor()
  assert.match(await page.locator('.failure-line[role="alert"]').innerText(),/summary/i)
  assert.equal((await request('/api/state')).incidents.find(item=>item.id===incident.id).state,'recovered','refused resolution leaves the incident open')
  await checkScreen('resolution-refused',width,page.locator('.failure-line[role="alert"]'))
 }
}

async function incidentWorkflowBrowser(page,context) {
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
  await form.getByLabel('Incident title',{exact:true}).fill(targetTitle);await form.getByLabel('Service',{exact:true}).selectOption(serviceId);await form.getByLabel('Incident type (service template)',{exact:true}).selectOption('Database failure');await form.getByLabel('Severity',{exact:true}).selectOption('warning');await form.getByLabel('Customer impact and current evidence',{exact:true}).fill('Customers observe slower checkout; response team is investigating.');await submit(form.getByRole('button',{name:'Declare',exact:true}));
  await page.locator('.detail').getByRole('heading',{name:targetTitle,exact:true}).waitFor();let state=await req('/api/state'),target=state.incidents.find(i=>i.title===targetTitle);assert.equal(target.template.incidentType,'Database failure');
  await req('/api/command',{type:'transition',incident:target.id,revision:target.revision,state:'acknowledged',summary:'Commander coordinates checkout response'});
  const sourceId='synthetic-oncall-workflow-'+width,key=randomBytes(32).toString('hex');await req('/api/sources',{id:sourceId,key,mode:'bearer',scopes:[serviceId]});
  const alerts=[];for(const keyName of ['checkout-replica','unrelated-batch']){const r=await context.request.post('/api/ingress/'+sourceId,{headers:{origin,authorization:'Bearer '+key},data:{source:sourceId,eventId:keyName+'-'+width,service:serviceId,environment:'production',key:keyName,generation:'cycle-'+width,intent:'trigger',severity:'warning',title:keyName+' investigation',observedAt:new Date().toISOString(),evidence:''}});assert.equal(r.status(),201);const receipt=await r.json();alerts.push((await req('/api/state')).alerts.find(a=>a.events.includes(receipt.id)).id)}
  const sourceTitle='Replica and batch investigation '+width;let source=await req('/api/command',{type:'declare',service:serviceId,severity:'warning',title:sourceTitle,summary:'Investigate related source alerts before separating the batch group.',alerts});source=await req('/api/command',{type:'note',incident:source.id,revision:source.revision,text:'Replica lag was observed before customer impact.'});source=await req('/api/command',{type:'action',incident:source.id,revision:source.revision,title:'Replica capacity follow-up',owner:member.id,escalationRecipient:member.id,due:'2026-12-01',completionPolicy:'human-review',priority:'P2'});
  await focusWorkspace(page);const workflow=page.getByRole('region',{name:'Incident workflows',exact:true});
  const checklist=workflow.getByRole('checkbox',{name:'Confirm customer checkout recovery',exact:false});const [tick]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().method()==='POST'),checklist.check()]);assert.equal(tick.status(),200);await workflow.getByText(/Last changed by/).waitFor();await capture('checklist',width,workflow);
  await workflow.getByText('Merge related incidents into this incident',{exact:true}).click();await workflow.locator('label').filter({hasText:sourceTitle}).getByRole('checkbox').check();await workflow.getByLabel('Reason for merging',{exact:true}).fill('The replica investigation explains the same checkout impact.');await submit(workflow.getByRole('button',{name:'Merge selected incidents',exact:true}));
  await workflow.getByText('Retained source incidents',{exact:true}).waitFor();await workflow.locator('summary').filter({hasText:sourceTitle}).click();await workflow.getByText('Replica lag was observed before customer impact.',{exact:true}).waitFor();await workflow.getByLabel('Completion evidence for Replica capacity follow-up',{exact:true}).fill('https://example.test/replica-capacity');await submit(workflow.getByRole('button',{name:'Submit evidence for Replica capacity follow-up',exact:true}));await workflow.getByLabel('Acceptance reason for Replica capacity follow-up',{exact:true}).fill('The commander reviewed the retained dependency evidence.');await submit(workflow.getByRole('button',{name:'Accept completion of Replica capacity follow-up',exact:true}));assert.equal((await req('/api/state')).incidents.find(i=>i.id===source.id).actions[0].done,true);await capture('merge',width,workflow);
  await page.goto(origin+'/incidents/'+encodeURIComponent(source.id));await page.locator('.detail').getByRole('heading',{name:targetTitle,exact:true}).waitFor();await page.waitForURL(url=>url.pathname==='/incidents/'+encodeURIComponent(target.id));await capture('alias',width,page.locator('.detail'));
  await workflow.getByText('Split unrelated alerts into a new incident',{exact:true}).click();await workflow.locator('label').filter({hasText:'unrelated-batch'}).getByRole('checkbox').check();await workflow.getByLabel('New incident title',{exact:true}).fill('Independent batch delay '+width);await workflow.getByLabel('New incident impact summary',{exact:true}).fill('Batch processing is separate from checkout customer impact.');await workflow.getByLabel('Reason for splitting',{exact:true}).fill('The batch alert is unrelated to the replica incident.');await submit(workflow.getByRole('button',{name:'Split selected alerts',exact:true}));
  state=await req('/api/state');const child=state.incidents.find(i=>i.title==='Independent batch delay '+width);assert.equal(child.state,'acknowledged');assert.equal(state.incidents.find(i=>i.id===target.id).state,'acknowledged');assert.equal(child.splitFrom.incident,target.id);assert.equal(child.template.version,1);assert.equal((await req('/api/handoffs/context/'+child.id)).source.incident.declaration.kind,'split','a split origin remains usable by the existing reviewed handoff door');
  await page.goto(origin+'/incidents/'+encodeURIComponent(child.id));await page.locator('.detail').getByRole('heading',{name:child.title,exact:true}).waitFor();await capture('split',width,workflow);
 }
 console.log('PASS OC-050 incident workflows browser: service template publication and typed declaration, commander checklist, merge/source history, alias redirect and split without lifecycle change at 1440; overflow, axe and hydration checked');
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
  await page.goto(origin+'/services');await page.getByText(/of 1,000 retained changes/).scrollIntoViewIfNeeded();await check('oc065-retention',width);
  const erasureKey=token(),erasureSource='synthetic-oncall-40-'+width;
  await request('/api/changes/sources',{id:erasureSource,name:'Synthetic erasure '+width,provider:'native',service:'synthetic-oncall-1',repository:'',mode:'bearer',revision:0,key:erasureKey});
  const changeResponse=await context.request.post('/api/changes/ingress/'+erasureSource,{headers:{authorization:'Bearer '+erasureKey},data:{eventId:erasureSource,summary:'Synthetic erasable change '+width,author:'synthetic-oncall-40',timestamp:new Date().toISOString()}});assert.equal(changeResponse.status(),201);
  const erasureChange=await changeResponse.json();await page.reload();
  const settings=page.locator('.change-sources');await settings.getByText('Data erasure settings',{exact:true}).click();
  await settings.getByLabel('Retained change',{exact:true}).selectOption(erasureChange.id);
  assert.equal(await settings.getByRole('button',{name:'Erase retained change',exact:true}).isEnabled(),false);
  await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+erasureChange.id);
  await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-erasure-review',width);
  const erasureResponse=page.waitForResponse(r=>r.url().endsWith('/api/changes/'+erasureChange.id+'/erase'));
  await settings.getByRole('button',{name:'Erase retained change',exact:true}).click();assert.equal((await erasureResponse).status(),200);
  await settings.getByText('Local erasure complete. Standby not reconciled.',{exact:true}).waitFor();
  await settings.getByText('oc_changes: 1 deleted, 0 updated',{exact:true}).waitFor();
  assert.ok(!(await request('/api/state')).changes.some(row=>row.id===erasureChange.id));
  await settings.getByRole('status').scrollIntoViewIfNeeded();await check('oc040-erasure-receipt',width);
  const erasedIncident=await request('/api/command',{type:'declare',service:'synthetic-oncall-1',title:'Synthetic erasable incident '+width,summary:'Synthetic erasable impact',severity:'warning'});
  await focusWorkspace(page);
  await settings.getByLabel('Erasure category',{exact:true}).selectOption('incident');
  await settings.getByLabel('Erasure subject',{exact:true}).selectOption(erasedIncident.id);
  assert.equal(await settings.getByRole('button',{name:'Erase selected subject',exact:true}).isEnabled(),false);
  await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+erasedIncident.id);
  await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-incident-review',width);
  const incidentEraseResponse=page.waitForResponse(r=>r.url().endsWith('/api/erasure/incident/'+erasedIncident.id));
  await settings.getByRole('button',{name:'Erase selected subject',exact:true}).click();assert.equal((await incidentEraseResponse).status(),200);
  await settings.getByText('oc_incidents: 1 deleted, 0 updated',{exact:true}).waitFor();
  await settings.getByRole('status').scrollIntoViewIfNeeded();await check('oc040-incident-receipt',width);
  assert.ok(!(await request('/api/state')).incidents.some(i=>i.id===erasedIncident.id));
  const erasedIntegration='synthetic-oncall-40-integration-'+width;
  await request('/api/intake/sources',{id:erasedIntegration,name:'Synthetic erasable integration '+width,provider:'alertmanager',service:'synthetic-oncall-1',key:token(),revision:0});
  await focusWorkspace(page);
  await settings.getByLabel('Erasure category',{exact:true}).selectOption('intake');
  await settings.getByLabel('Erasure subject',{exact:true}).selectOption(erasedIntegration);
  await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+erasedIntegration);
  await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-integration-review',width);
  const integrationEraseResponse=page.waitForResponse(r=>r.url().endsWith('/api/erasure/intake/'+erasedIntegration));
  await settings.getByRole('button',{name:'Erase selected subject',exact:true}).click();assert.equal((await integrationEraseResponse).status(),200);
  await settings.getByText('oc_intake_credentials: 1 deleted, 0 updated',{exact:true}).waitFor();
  await settings.getByRole('status').scrollIntoViewIfNeeded();await check('oc040-integration-receipt',width);
  assert.ok(!(await request('/api/state')).intakeSources.some(i=>i.id===erasedIntegration));
  const erasedEmail='synthetic-oncall-440-'+width;
  await request('/api/email/addresses',{id:erasedEmail,name:'Synthetic erasable email '+width,service:'synthetic-oncall-1',owner:(await request('/api/session')).member.id,localPart:'synthetic-oncall-'+randomBytes(20).toString('hex'),mode:'subject',fallback:'subject',rules:[]},201);
  await focusWorkspace(page);
  await settings.getByLabel('Erasure category',{exact:true}).selectOption('email');
  await settings.getByLabel('Erasure subject',{exact:true}).selectOption(erasedEmail);
  await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+erasedEmail);
  await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-email-review',width);
  const emailEraseResponse=page.waitForResponse(r=>r.url().endsWith('/api/erasure/email/'+erasedEmail));
  await settings.getByRole('button',{name:'Erase selected subject',exact:true}).click();assert.equal((await emailEraseResponse).status(),200);
  await settings.getByText('oc_email_credentials: 1 deleted, 0 updated',{exact:true}).waitFor();
  await settings.getByRole('status').scrollIntoViewIfNeeded();await check('oc040-email-receipt',width);
  assert.ok(!((await request('/api/state')).emailAddresses??[]).some(row=>row.id===erasedEmail));
  const importedId='synthetic-oncall-410-'+width;
  const importedPlan=await importDoor.preview('pagerduty',JSON.stringify({integrations:[{id:importedId,type:'events_api_v2_inbound_integration'}]}));assert.equal(importedPlan.status,200);assert.equal((await importDoor.apply('pagerduty',importedPlan.value)).status,200);
  const importedRoot=(await request('/api/move-in/objects')).find(row=>row.targetKind==='integration'&&row.targetId==='pagerduty:'+importedId);
  await request('/api/intake/incumbent',{importedId:importedRoot.targetId,importedRevision:importedRoot.revision,id:importedId,service:'synthetic-oncall-1',name:'Synthetic imported erasure '+width,revision:0,key:randomBytes(16).toString('hex')});
  await focusWorkspace(page);
  await settings.getByLabel('Erasure category',{exact:true}).selectOption('intake');
  await settings.getByLabel('Erasure subject',{exact:true}).selectOption(importedId);await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+importedId);
  await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-imported-integration-review',width);
  const importedEraseResponse=page.waitForResponse(r=>r.url().endsWith('/api/erasure/intake/'+importedId));
  await settings.getByRole('button',{name:'Erase selected subject',exact:true}).click();const importedResult=await importedEraseResponse;assert.equal(importedResult.status(),200);assert.ok((await importedResult.json()).importCustody.stores.some(row=>row.rows>0));
  await settings.getByText('Imported custody complete.',{exact:true}).waitFor();await settings.getByRole('status').scrollIntoViewIfNeeded();await check('oc040-imported-integration-receipt',width);
  const memberName='synthetic-oncall-413-'+width+'@example.test';
  const erasedMember=await request('/api/members',{name:memberName,password:'synthetic-oncall-413-password',role:'admin'},201);
  const personalContext=await context.browser().newContext({baseURL:origin});
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
  await settings.getByLabel('Imported identity '+memberName,{exact:true}).check();await settings.getByLabel('Imported identities reviewed',{exact:true}).check();
  await settings.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+erasedMember.id);await settings.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await check('oc040-member-review',width);
  const memberResponse=page.waitForResponse(r=>r.url().endsWith('/api/erasure/member/'+erasedMember.id));await settings.getByRole('button',{name:'Erase selected subject',exact:true}).click();const memberReply=await memberResponse;assert.equal(memberReply.status(),200,await memberReply.text());
  await settings.getByText('Imported custody complete.',{exact:true}).waitFor();await settings.getByRole('status').scrollIntoViewIfNeeded();await settings.getByText(/Approved response recipient .*Provider deletion requires the owner’s consent/).waitFor();await check('oc040-member-receipt',width);
  assert.equal((await request('/api/state')).members.find(m=>m.id===erasedMember.id).name,'Erased member');
  const erasedBusiness=(await request('/api/state')).businessServices.find(row=>row.id===memberBusiness.id);
  assert.ok(!erasedBusiness.audience.includes(erasedMember.id));assert.ok(!erasedBusiness.subscriptions.some(row=>row.member===erasedMember.id));
  await settings.getByText(/oc_business_services:/).waitFor();

  await openWorkspaceSection(page,'schedules');await page.getByLabel('Schedule',{exact:true}).selectOption(memberScheduleId);
  await page.locator('.scheduling-now-next').getByText('Now: Coverage gap',{exact:true}).first().waitFor();await page.locator('.scheduling-now-next').scrollIntoViewIfNeeded();await check('oc040-member-schedule-gap',width);
  await openWorkspaceSection(page,'reviews');
  const responseReport=page.locator('.response-report');
  await responseReport.getByText(/Incident durations and source entries/).click();
  await responseReport.getByRole('heading',{name:'Erased incident erased',exact:true}).first().waitFor();
  await responseReport.getByText(/incident revision unknown/).first().waitFor();
  assert.equal(await responseReport.getByRole('link',{name:'Erased incident',exact:true}).count(),0,'erased cases have no personal incident drilldown');
  await responseReport.getByRole('heading',{name:'Erased incident erased',exact:true}).first().scrollIntoViewIfNeeded();await check('oc040-erased-response-report',width);
  await openWorkspaceSection(page,'services');if(!await settings.getByLabel('Erasure category',{exact:true}).isVisible())await settings.getByText('Data erasure settings',{exact:true}).click();
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
  await page.reload();await openWorkspaceSection(page,'alerts');const joinedCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Synthetic correlation joined '+width,exact:true})});await joinedCard.getByText(/Joined original event/).waitFor();await joinedCard.scrollIntoViewIfNeeded();await check('oc043-correlated-signal',width);
  await page.goto(origin+'/settings/services/synthetic-oncall-1');await groupSettings.locator(':scope > summary').click();await groupSettings.getByLabel('Flapping trigger generations',{exact:true}).fill('2');await groupSettings.getByRole('button',{name:/^Publish version/}).click();await groupSettings.getByLabel('Reason',{exact:true}).fill('Hold repeating generations for review');const flapPublished=page.waitForResponse(r=>r.url().endsWith('/api/command')&&r.request().postDataJSON()?.correlation?.flappingCount===2);await groupSettings.getByRole('button',{name:/^Publish version/}).click();assert.equal((await flapPublished).status(),200);
  const flapTitle='Synthetic flapping browser '+width,flapIdentity='synthetic-oncall-439-'+width;
  for(const [eventId,generation,intent,offset] of [['synthetic-oncall-439-a','synthetic-oncall-439-a','trigger',2000],['synthetic-oncall-439-r','synthetic-oncall-439-a','recover',3000],['synthetic-oncall-439-b','synthetic-oncall-439-b','trigger',4000]]){const response=await groupSignal(1,eventId,generation,intent,flapIdentity,offset,flapTitle);assert.equal(response.status(),201);}
  await page.reload();await openWorkspaceSection(page,'alerts');const heldCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Flapping signal: '+flapTitle,exact:true})});await heldCard.getByRole('heading',{name:'Flapping signal: '+flapTitle,exact:true}).waitFor();assert.equal(await heldCard.count(),1);await heldCard.getByText(/1 held active generation/).waitFor();await heldCard.getByText('Retained generations and evidence',{exact:true}).click();await heldCard.scrollIntoViewIfNeeded();await check('oc043-flapping-held',width);
  await openWorkspaceSection(page,'services');
  await openWorkspaceSection(page,'routing');await page.getByLabel('Routed integration',{exact:true}).selectOption(groupSources[1]);await page.getByRole('button',{name:'Preview routing changes',exact:true}).click();
  const groupedPreview=page.getByRole('region',{name:'Routing preview',exact:true});await groupedPreview.getByText('4 retained events compared. No records changed.',{exact:true}).waitFor();await groupedPreview.getByText(/Joined original event/).first().waitFor();await groupedPreview.getByText(/Historical urgency: high/).first().waitFor();await groupedPreview.getByText(/Proposed urgency: high/).first().waitFor();await groupedPreview.scrollIntoViewIfNeeded();await check('oc043-grouping-routing-preview',width);
  await page.getByLabel('Event JSON array',{exact:true}).fill(JSON.stringify([rootEvent,joinedEvent]));await page.getByRole('button',{name:'Compare decisions',exact:true}).click();const serviceReplay=page.getByRole('region',{name:'Replay comparison',exact:true});await serviceReplay.getByText(/Joined original event/).first().waitFor();await serviceReplay.getByText(/Historical urgency:/).first().waitFor();await serviceReplay.getByText(/Proposed urgency:/).first().waitFor();await serviceReplay.scrollIntoViewIfNeeded();await check('oc043-grouping-service-replay',width);
  await openWorkspaceSection(page,'services');
  // OC-043's existing routing screen exposes both stages before publication.
  const orchestrationId='synthetic-oncall-43-'+width,orchestrationKey=token(),policyBefore=(await request('/api/state')).policies.find(p=>p.service==='synthetic-oncall-1'&&p.severity==='warning');
  const window={start:new Date(Date.now()-60000).toISOString(),end:new Date(Date.now()+3600000).toISOString()};
  const policy=await request('/api/command',{type:'policy',service:'synthetic-oncall-1',severity:'warning',action:'suppress',owner:member.id,reason:'Synthetic planned maintenance',baseVersion:policyBefore?.version??0,suppressionWindow:window});
  await request('/api/routing/keys',{id:orchestrationId,name:'Synthetic maintenance '+width,provider:'native',scope:['synthetic-oncall-1'],owner:member.id,key:orchestrationKey,revision:0,rules:[],catchAll:'synthetic-oncall-1'});
  const observation={source:'intake:'+orchestrationId,eventId:orchestrationId,service:'synthetic-oncall-1',environment:'production',key:orchestrationId,generation:orchestrationId,intent:'trigger',severity:'warning',title:'Synthetic maintenance signal '+width,observedAt:new Date().toISOString(),evidence:''};
  const orchestrated=await context.request.post('/api/ingress/intake:'+orchestrationId,{headers:{authorization:'Bearer '+orchestrationKey},data:observation});assert.equal(orchestrated.status(),201);
  await page.reload();await openWorkspaceSection(page,'alerts');
  const suppressedCard=page.getByRole('article').filter({has:page.getByRole('heading',{name:observation.title,exact:true,level:3})});await suppressedCard.getByText('Suppressed · Owner: '+member.name,{exact:false}).waitFor();await suppressedCard.scrollIntoViewIfNeeded();await check('oc043-owned-suppressed-alert',width);
  await openWorkspaceSection(page,'routing');await page.getByLabel('Routed integration',{exact:true}).selectOption(orchestrationId);
  await page.getByRole('button',{name:'Preview routing changes',exact:true}).click();
  const comparison=page.getByRole('region',{name:'Routing preview',exact:true});await comparison.getByText('1 retained events compared. No records changed.',{exact:true}).waitFor();
  await comparison.getByRole('heading',{name:observation.title,exact:true,level:4}).waitFor();
  await comparison.getByText('Proposed: routing v1 · service rule v'+policy.version+' · suppress · owner '+member.name+'.',{exact:true}).waitFor();
  await comparison.getByText('Ordered routing decisions',{exact:true}).click();
  const compared=JSON.parse(await comparison.locator('pre').innerText());assert.equal(compared.historical.version,1);assert.equal(compared.proposed.version,1);assert.equal(compared.proposed.serviceDecision.version,policy.version);assert.equal(compared.proposed.serviceDecision.owner,member.id);assert.match(compared.proposed.serviceDecision.reason,/Maintenance active/);assert.ok(compared.proposed.serviceDecision.reason.includes(window.end));
  await comparison.scrollIntoViewIfNeeded();await check('oc043-maintenance-preview',width);
  const expired={start:'2020-01-01T00:00:00.000Z',end:'2020-01-02T00:00:00.000Z'};
  await request('/api/command',{type:'policy',service:'synthetic-oncall-1',severity:'warning',action:'suppress',owner:member.id,reason:'Synthetic completed maintenance',baseVersion:policy.version,suppressionWindow:expired});
  await page.reload();await page.getByLabel('Routed integration',{exact:true}).selectOption(orchestrationId);await page.getByRole('button',{name:'Preview routing changes',exact:true}).click();await comparison.getByText('Ordered routing decisions',{exact:true}).click();
  await comparison.getByText('Proposed: routing v1 · service rule v'+(policy.version+1)+' · route · owner '+member.name+'.',{exact:true}).waitFor();
  const expiry=JSON.parse(await comparison.locator('pre').innerText());assert.equal(expiry.historical.serviceDecision.action,'suppress');assert.equal(expiry.proposed.serviceDecision.action,'route');assert.match(expiry.proposed.serviceDecision.reason,/Maintenance expired/);
  await comparison.scrollIntoViewIfNeeded();await check('oc043-maintenance-expired-preview',width);
  await openWorkspaceSection(page,'integrations');const panel=page.getByRole('region',{name:'Grafana signature settings'});
  await panel.getByLabel('Grafana signing integration',{exact:true}).selectOption('synthetic-oncall-grafana');await panel.getByText('Signature required with bearer authentication',{exact:true}).waitFor();
  await panel.getByLabel('Grafana signing secret',{exact:true}).fill(signingSecret);await panel.getByRole('button',{name:'Save Grafana signing secret',exact:true}).click();await page.getByText('Grafana signature check saved',{exact:true}).waitFor();
  assert.equal(await panel.getByLabel('Grafana signing secret',{exact:true}).inputValue(),'');await panel.getByText('Signature required with bearer authentication',{exact:true}).waitFor();await panel.scrollIntoViewIfNeeded();await check('oc030-signing',width);
  for(const [slug,section] of [['changes','erase-a-retained-change'],['routed-intake','event-time-correlation-and-flapping'],['data','incident-member-and-integration-erasure'],['urgency','']]){await page.goto(new URL(page.url()).origin+'/docs/'+slug+(section?'#'+section:''));await page.locator('.docs-article').waitFor();if(section)await page.locator('#'+section).scrollIntoViewIfNeeded();await check('oc040-043-docs-'+slug,width);}
  for(const slug of docSlugs.filter(slug=>!['changes','routed-intake','data','urgency'].includes(slug))){await page.goto(new URL(page.url()).origin+'/docs/'+slug);await page.locator('.docs-article').waitFor();await check('oc040-043-docs-'+slug,width);}
  await page.goto(new URL(page.url()).origin);
 }
 console.log('PASS OC-065/030 templates, dependency, retention and protected signing settings at 1440; overflow, axe and hydration');
}

// Production Worker + real local D1, without starting a managed rer dev server.
const worker=await localWorker({INBOUND_EMAIL_DOMAIN:'inbound.example.test'})
const credentials={name:'Product browser owner',password:randomBytes(32).toString('hex')}
let browser,page
try {
 await mkdir('evidence/browser',{recursive:true})
 await mkdir('.rer/local',{recursive:true,mode:0o700})
 const owner=await worker.request('/api/setup',credentials)
 assert.equal(owner.status,200,'the public setup door creates the local browser owner')
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000}})
 await context.addCookies(owner.headers.getSetCookie().map(line=>{
  const pair=line.split(';')[0],at=pair.indexOf('=')
  return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}
 }))
 page=await context.newPage()
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto(worker.origin)
 await page.locator('.oncall-frame').waitFor({timeout:60000})
 const openSession=async(second,secondPage)=>{
  const login=await second.request.post('/api/login',{headers:{origin:worker.origin},data:credentials})
  assert.equal(login.status(),200,'the second browser context signs in through the real login door')
  await secondPage.goto(worker.origin)
 }
 await productBrowserJourney(page,context,{openSession})
 await incompleteIntakeBrowser(page,context)
 console.log('PASS OC-059 incomplete intake browser: high owner obligation in alerts and routing at 1440; overflow, axe and hydration checked')
 await responsePolicyBrowser(page,context)
 await incidentWorkflowBrowser(page,context)
 await changeAndSigningBrowser(page,context)
 console.log('PASS OC-056 source recovery browser: versioned policy, stopped alert, awaiting-resolution incident, commander reminder, required-summary refusal and focused tooltips at 1440; overflow, axe and hydration checked')
 assert.deepEqual(errors,[],'no browser application errors')
 console.log('Emitted Worker product browser journey passed at desktop and mobile widths')
} catch(error) {
 if(page){
  await page.screenshot({path:'evidence/browser/product-failure.png',fullPage:true,mask:[page.locator('[aria-label="New private calendar URL"]')]})
  console.error('Product browser failure at',new URL(page.url()).pathname)
  console.error(redact((await page.locator('body').innerText()).slice(0,1800)))
 }
 throw error
} finally {
 try {await browser?.close()} finally {await worker.close()}
}
