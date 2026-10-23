import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdir} from 'node:fs/promises'
import {chromium} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {localWorker} from './worker.mjs'
import {productBrowserJourney} from './product-browser-journey.mjs'
import {redact} from './diagnostics.mjs'
import {keyboardUser} from './keyboard.mjs'

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
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await page.getByRole('link',{name:'Alerts & events',exact:true}).click()
  await page.getByRole('button',{name:'Refresh',exact:true}).click()
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
  await page.getByRole('link',{name:'Routing & replay',exact:true}).click()
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
 await page.getByRole('link',{name:'Alerts & events',exact:true}).click()
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
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  const serviceId='response-'+width,serviceName='Checkout response '+width,source='synthetic-oncall-response-'+width,key=randomBytes(32).toString('hex')
  await request('/api/command',{type:'service',id:serviceId,name:serviceName,environment:'production',owner:member.id,runbook:['Confirm successful checkout requests before resolving.'],pager:''})
  const orchestration=await request('/api/command',{type:'policy',service:serviceId,severity:'*',action:'route',owner:member.id,reason:'Checkout owner coordinates this service'})
  await request('/api/routing/keys',{id:source,name:'Checkout native monitor '+width,provider:'native',authentication:'bearer',scope:[serviceId],owner:member.id,key,revision:0,rules:[],catchAll:serviceId},201)
  const viewName='Checkout commander review '+width
  await request('/api/triage/views',{name:viewName,query:{}})
  await page.getByRole('link',{name:'Services',exact:true}).click()
  await page.getByRole('button',{name:'Refresh',exact:true}).click()
  const service=page.getByRole('article').filter({has:page.getByRole('heading',{name:serviceName,exact:true,level:3})})
  const responsePolicy=service.locator('details.urgency-policy').filter({has:page.locator('summary').filter({hasText:/^Response policy ·/})})
  await responsePolicy.locator(':scope > summary').click()
  await responsePolicy.getByLabel('Default response',{exact:true}).selectOption('alert-only')
  await responsePolicy.getByLabel('On source recovery',{exact:true}).selectOption('notified')
  await responsePolicy.getByRole('button',{name:'Add response rule',exact:true}).click()
  await responsePolicy.getByLabel('Rule ID',{exact:true}).fill('checkout-critical')
  await responsePolicy.getByLabel('Rule urgency',{exact:true}).selectOption('high')
  await responsePolicy.getByLabel('Rule severity',{exact:true}).selectOption('critical')
  await responsePolicy.getByLabel('Rule orchestration policy',{exact:true}).selectOption(orchestration.id)
  await responsePolicy.getByLabel('Rule response',{exact:true}).selectOption('incident')
  await responsePolicy.getByLabel('Response policy reason',{exact:true}).fill('Coordinate critical checkout failures; keep warnings alert-only.')
  const published=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/response/services/'+serviceId&&response.request().method()==='POST')
  await responsePolicy.getByRole('button',{name:'Publish response policy',exact:true}).click()
  assert.equal((await published).status(),201,'response policy is published through the service form')
  await service.getByText('Published reason: Coordinate critical checkout failures; keep warnings alert-only.',{exact:true}).waitFor()
  const storedPolicy=(await request('/api/state')).services.find(item=>item.id===serviceId).responsePolicies.at(-1)
  assert.equal(storedPolicy.defaultMode,'alert-only');assert.equal(storedPolicy.recoveredNotice,'notified')
  assert.deepEqual(storedPolicy.rules.map(rule=>[rule.urgency,rule.severity,rule.policy,rule.mode]),[['high','critical',orchestration.id,'incident']])
  await responsePolicy.getByText('Response policy history (1)',{exact:true}).click()
  await responsePolicy.getByRole('heading',{name:'v1 · Alert-only',exact:true}).waitFor()
  await checkScreen('policy',width,responsePolicy.getByRole('button',{name:'Publish response policy',exact:true}))
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
  await page.getByRole('link',{name:'Alerts & events',exact:true}).click()
  await page.getByRole('button',{name:'Refresh',exact:true}).click()
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
  await page.getByRole('button',{name:'Refresh',exact:true}).click()
  await page.getByRole('link',{name:'Alerts & events',exact:true}).click()
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
  await page.getByRole('button',{name:'Refresh',exact:true}).click()
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
  await page.locator('.error[role="alert"]').waitFor()
  assert.match(await page.locator('.error[role="alert"]').innerText(),/summary/i)
  assert.equal((await request('/api/state')).incidents.find(item=>item.id===incident.id).state,'recovered','refused resolution leaves the incident open')
  await checkScreen('resolution-refused',width,page.locator('.error[role="alert"]'))
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
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});const serviceId='workflow-'+width,serviceName='Checkout incident workflow '+width;
  await req('/api/command',{type:'service',id:serviceId,name:serviceName,environment:'production',owner:member.id,runbook:['Check replica health before changing customer traffic.'],pager:''});
  await page.getByRole('link',{name:'Services',exact:true}).click();await page.getByRole('button',{name:'Refresh',exact:true}).click();
  const service=page.getByRole('article').filter({has:page.getByRole('heading',{name:serviceName,exact:true,level:3})}),settings=service.getByRole('region',{name:'Response template for '+serviceName});
  await settings.getByRole('button',{name:'Create response template',exact:true}).click();
  await settings.getByLabel('Critical severity wording',{exact:true}).fill('Checkout unavailable');await settings.getByLabel('Warning severity wording',{exact:true}).fill('Checkout degraded');await settings.getByLabel('Info severity wording',{exact:true}).fill('Customer impact under investigation');
  await settings.getByLabel('Impact prompt',{exact:true}).fill('Which checkout paths and customers are affected?');await settings.getByLabel('Incident types (one per line)',{exact:true}).fill('Database failure\nTraffic saturation');
  await settings.getByRole('button',{name:'Add checklist item',exact:true}).click();await settings.getByLabel('Checklist item 1',{exact:true}).fill('Confirm customer checkout recovery');await settings.getByLabel('Reason for template change',{exact:true}).fill('Keep checkout response consistent across shifts.');
  await submit(settings.getByRole('button',{name:'Publish response template',exact:true}));await settings.getByText(/^Version 1 · published by/).waitFor();await capture('template',width,settings);
  await page.getByRole('link',{name:'Incidents',exact:true}).click();await page.getByRole('button',{name:'Declare incident',exact:true}).click();
  const form=page.locator('form').filter({has:page.getByRole('button',{name:'Declare',exact:true})});const targetTitle='Checkout customer impact '+width;
  await form.getByLabel('Incident title',{exact:true}).fill(targetTitle);await form.getByLabel('Service',{exact:true}).selectOption(serviceId);await form.getByLabel('Incident type (service template)',{exact:true}).selectOption('Database failure');await form.getByLabel('Severity',{exact:true}).selectOption('warning');await form.getByLabel('Customer impact and current evidence',{exact:true}).fill('Customers observe slower checkout; response team is investigating.');await submit(form.getByRole('button',{name:'Declare',exact:true}));
  await page.locator('.detail').getByRole('heading',{name:targetTitle,exact:true}).waitFor();let state=await req('/api/state'),target=state.incidents.find(i=>i.title===targetTitle);assert.equal(target.template.incidentType,'Database failure');
  await req('/api/command',{type:'transition',incident:target.id,revision:target.revision,state:'acknowledged',summary:'Commander coordinates checkout response'});
  const sourceId='synthetic-oncall-workflow-'+width,key=randomBytes(32).toString('hex');await req('/api/sources',{id:sourceId,key,mode:'bearer',scopes:[serviceId]});
  const alerts=[];for(const keyName of ['checkout-replica','unrelated-batch']){const r=await context.request.post('/api/ingress/'+sourceId,{headers:{origin,authorization:'Bearer '+key},data:{source:sourceId,eventId:keyName+'-'+width,service:serviceId,environment:'production',key:keyName,generation:'cycle-'+width,intent:'trigger',severity:'warning',title:keyName+' investigation',observedAt:new Date().toISOString(),evidence:''}});assert.equal(r.status(),201);const receipt=await r.json();alerts.push((await req('/api/state')).alerts.find(a=>a.events.includes(receipt.id)).id)}
  const sourceTitle='Replica and batch investigation '+width;let source=await req('/api/command',{type:'declare',service:serviceId,severity:'warning',title:sourceTitle,summary:'Investigate related source alerts before separating the batch group.',alerts});source=await req('/api/command',{type:'note',incident:source.id,revision:source.revision,text:'Replica lag was observed before customer impact.'});
  await page.getByRole('button',{name:'Refresh',exact:true}).click();const workflow=page.getByRole('region',{name:'Incident workflows',exact:true});
  const checklist=workflow.getByRole('checkbox',{name:'Confirm customer checkout recovery',exact:false});const tick=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().method()==='POST');await checklist.check();assert.equal((await tick).status(),200);await workflow.getByText(/Last changed by/).waitFor();await capture('checklist',width,workflow);
  await workflow.getByText('Merge related incidents into this incident',{exact:true}).click();await workflow.locator('label').filter({hasText:sourceTitle}).getByRole('checkbox').check();await workflow.getByLabel('Reason for merging',{exact:true}).fill('The replica investigation explains the same checkout impact.');await submit(workflow.getByRole('button',{name:'Merge selected incidents',exact:true}));
  await workflow.getByText('Retained source incidents',{exact:true}).waitFor();await workflow.locator('summary').filter({hasText:sourceTitle}).click();await workflow.getByText('Replica lag was observed before customer impact.',{exact:true}).waitFor();await capture('merge',width,workflow);
  await page.goto(origin+'/?incident='+encodeURIComponent(source.id)+'#incidents');await page.locator('.detail').getByRole('heading',{name:targetTitle,exact:true}).waitFor();await page.waitForURL(url=>url.searchParams.get('incident')===target.id);await capture('alias',width,page.locator('.detail'));
  await workflow.getByText('Split unrelated alerts into a new incident',{exact:true}).click();await workflow.locator('label').filter({hasText:'unrelated-batch'}).getByRole('checkbox').check();await workflow.getByLabel('New incident title',{exact:true}).fill('Independent batch delay '+width);await workflow.getByLabel('New incident impact summary',{exact:true}).fill('Batch processing is separate from checkout customer impact.');await workflow.getByLabel('Reason for splitting',{exact:true}).fill('The batch alert is unrelated to the replica incident.');await submit(workflow.getByRole('button',{name:'Split selected alerts',exact:true}));
  state=await req('/api/state');const child=state.incidents.find(i=>i.title==='Independent batch delay '+width);assert.equal(child.state,'acknowledged');assert.equal(state.incidents.find(i=>i.id===target.id).state,'acknowledged');assert.equal(child.splitFrom.incident,target.id);assert.equal(child.template.version,1);
  await page.goto(origin+'/?incident='+child.id+'#incidents');await page.locator('.detail').getByRole('heading',{name:child.title,exact:true}).waitFor();await capture('split',width,workflow);
 }
 console.log('PASS OC-050 incident workflows browser: service template publication and typed declaration, commander checklist, merge/source history, alias redirect and split without lifecycle change at 1440/390; overflow, axe and hydration checked');
}

// Production Worker + real local D1, without starting a managed rer dev server.
const worker=await localWorker()
const credentials={name:'Product browser owner',password:randomBytes(32).toString('hex')}
let browser,page
try {
 await mkdir('evidence/browser',{recursive:true})
 await mkdir('.rer/local',{recursive:true,mode:0o700})
 const owner=await worker.request('/api/setup',credentials)
 assert.equal(owner.status,200,'the public setup door creates the local browser owner')
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000}})
 await context.addCookies(owner.headers.getSetCookie().map(line=>{
  const pair=line.split(';')[0],at=pair.indexOf('=')
  return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}
 }))
 page=await context.newPage()
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto(worker.origin)
 await page.getByRole('link',{name:'Services',exact:true}).waitFor({timeout:60000})
 const openSession=async(second,secondPage)=>{
  const login=await second.request.post('/api/login',{headers:{origin:worker.origin},data:credentials})
  assert.equal(login.status(),200,'the second browser context signs in through the real login door')
  await secondPage.goto(worker.origin)
 }
 await productBrowserJourney(page,context,{openSession})
 await incompleteIntakeBrowser(page,context)
 console.log('PASS OC-059 incomplete intake browser: high owner obligation in alerts and routing at 1440/390; overflow, axe and hydration checked')
 await responsePolicyBrowser(page,context)
 await incidentWorkflowBrowser(page,context)
 console.log('PASS OC-056 source recovery browser: versioned policy, stopped alert, awaiting-resolution incident, commander reminder, required-summary refusal and focused tooltips at 1440/390; overflow, axe and hydration checked')
 assert.deepEqual(errors,[],'no browser application errors')
 console.log('Emitted Worker product browser journey passed at desktop and mobile widths')
} catch(error) {
 if(page){
  await page.screenshot({path:'evidence/browser/product-failure.png',fullPage:true})
  console.error('Product browser failure at',new URL(page.url()).pathname)
  console.error(redact((await page.locator('body').innerText()).slice(0,1800)))
 }
 throw error
} finally {
 try {await browser?.close()} finally {await worker.close()}
}
