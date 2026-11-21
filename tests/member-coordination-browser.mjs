import {focusWorkspace,openIncidentAction,openWorkspaceSection} from './keyboard.mjs'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdir,readFile} from 'node:fs/promises'
import {isDeepStrictEqual} from 'node:util'
import {chromium,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {durableSnapshot,localWorker} from './worker.mjs'
import {mailOffJourney} from './mail-off.mjs'
if (!process.env.ONCALL_MEMBER_JOURNEY || process.env.ONCALL_MEMBER_JOURNEY === 'mail-off') await mailOffJourney()
if (process.env.ONCALL_MEMBER_JOURNEY === 'mail-off') process.exit(0)

// OC-018 real hosted member coordination persists after reload: the hosted
// member journey, maintained on the emitted production Worker. The owner claims
// through the setup token; admin-created members sign in by password at
// /signin/local, coordinate, reload and read attributed history; signed-out and
// revoked sessions get no workspace; paging refuses.
const worker=await localWorker({}, {clock:true,outboundLedger:true})
const focusedTeam=process.env.ONCALL_MEMBER_JOURNEY==='team-settings';
const focusedClients=process.env.ONCALL_MEMBER_JOURNEY==='api-clients';
const focusedSaves=process.env.ONCALL_MEMBER_JOURNEY==='incident-saves';
if(process.env.ONCALL_MEMBER_JOURNEY&&!focusedSaves&&!focusedClients&&!focusedTeam)throw Error('Unknown member coordination journey');
const captureDirectory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
await mkdir(captureDirectory,{recursive:true})
const responder={name:'Rosa Responder',password:'synthetic-responder-testing-password'},viewer={name:'Vic Viewer',password:'synthetic-viewer-testing-password'}
const noteText='Rosa note: provider status shows degraded card auth.'
const errors=[]
let browser
const call=(page,path,body)=>page.evaluate(async([p,b])=>{const r=await fetch(p,b===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});let value;try{value=await r.json()}catch{value=null}return {status:r.status,value}},[path,body])
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value}
async function open(width){const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return {context,page}}
async function passwordSignIn(page,who){
 await page.goto(worker.origin+'/signin/local')
 await page.getByLabel('Name',{exact:true}).fill(who.name)
 await page.getByLabel('Password',{exact:true}).fill(who.password)
 await page.getByRole('button',{name:'Sign in',exact:true}).click()
 await page.waitForURL(url=>url.pathname==='/on-call'||url.pathname==='/status')
 return (await call(page,'/api/session')).value.member
}
async function openIncident(page,id){await page.goto(`${worker.origin}/incidents/${encodeURIComponent(id)}`);await page.reload();await page.locator('.detail h1').waitFor()}
const entry=(page,text)=>page.locator('.timeline .event').filter({hasText:text})
async function denied(page,label,id){
 const state=await page.context().request.get(worker.origin+'/api/state'),workspace=await (await page.context().request.get(worker.origin+'/api/workspace')).json()
 assert.equal(state.status(),401,`${label}: protected state refused`)
 assert.equal(workspace.state,null,`${label}: no workspace returned`)
 await page.goto(`${worker.origin}/incidents/${encodeURIComponent(id)}`);await page.reload();await page.waitForLoadState('networkidle')
 assert.equal(await page.locator('.timeline').count(),0,`${label}: no incident history rendered`)
 assert.ok(!(await page.locator('body').innerText()).includes(noteText),`${label}: no coordination text in the page`)
}
// Extend the existing autosave journey through the service and review screens.
// Settings > Team owner journeys: assert once on desktop, capture both layouts.
async function teamSettings(page, owner) {
 const request=async(path,data)=>ok(await call(page,path,data));
 const capture=async name=>{
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   await page.screenshot({path:`${captureDirectory}/team-${name}-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
 };
 await page.goto(worker.origin+'/settings/team');
 let own=page.getByRole('article',{name:owner.name,exact:true});
 await own.getByRole('button',{name:'Member actions',exact:true}).click();
 const actions=own.getByRole('region',{name:'Actions for '+owner.name,exact:true});
 await expect(actions.getByRole('button',{name:'Revoke access',exact:true})).toHaveCount(0);
 await expect(actions.getByText(/only active admin/)).toBeVisible();
 await capture('only-admin');
 await actions.getByRole('button',{name:'Done',exact:true}).click();
 for(const contactsOpen of [false,true]){
  if(contactsOpen){await own.getByText('Contact methods and notification rules',{exact:true}).click();await own.getByRole('button',{name:'Add contact method',exact:true}).waitFor();}
  await page.getByRole('button',{name:'Add member',exact:true}).click();
  const form=page.getByRole('region',{name:'Add member',exact:true}),name=form.getByLabel('Name',{exact:true});
  await expect(name).toBeFocused();
  const box=await name.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=1000,'Name opens in view even with contacts expanded');
  assert.ok(await form.evaluate(element=>Boolean(element.compareDocumentPosition(document.querySelector('.team-members'))&Node.DOCUMENT_POSITION_FOLLOWING)),'the form precedes member cards');
  await capture('add-'+(contactsOpen?'contacts-open':'contacts-closed'));
  if(contactsOpen){
   await name.fill('Example Teammate');await form.getByLabel('Password',{exact:true}).fill('synthetic-oncall-teammate-password');
   const created=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/members'&&r.request().method()==='POST');
   await form.getByRole('button',{name:'Create member',exact:true}).click();assert.equal((await created).status(),201);
   await expect(page.getByRole('article',{name:'Example Teammate',exact:true})).toBeVisible();
  }
  await page.getByRole('button',{name:'Add member',exact:true}).click();
 }
 console.log('PASS Team Add member: visible focused Name with contacts closed/open, then member created through the form');
 await own.getByRole('button',{name:'Edit name',exact:true}).click();
 await expect(own.getByLabel('Your name',{exact:true})).toBeFocused();
 const corrected='Example Owner';await own.getByLabel('Your name',{exact:true}).fill(corrected);
 await capture('edit-name');
 await own.getByRole('button',{name:'Save name',exact:true}).click();
 own=page.getByRole('article',{name:corrected,exact:true});await expect(own.getByRole('heading',{name:corrected,exact:true})).toBeVisible();
 await page.reload();await expect(own.getByRole('button',{name:'Edit name',exact:true})).toBeVisible();
 assert.equal((await request('/api/session')).member.name,corrected);
 assert.equal((await request('/auth/session')).operator.displayName,corrected,'member and native owner names agree after reload');
 await capture('name-saved');
 console.log('PASS Team owner name: editable after setup, native identity and member name persist after reload');
 // Start a normal action, then let another admin cease to be an admin before
 // confirmation. The real server refuses: the UI must clear the rejected edit.
 const other=ok(await call(page,'/api/members',{name:'Example Deputy',role:'admin',password:'synthetic-oncall-deputy-password'}),201);
 await page.reload();
 await own.getByRole('button',{name:'Member actions',exact:true}).click();await own.getByRole('button',{name:'Revoke access',exact:true}).click();
 await request('/api/command',{type:'member',id:other.id,field:'role',from:'admin',to:'viewer'});
 const refused=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().postDataJSON()?.id===owner.id);
 await own.locator('.autosave-confirm').getByRole('button',{name:'Revoke access',exact:true}).click();assert.equal((await refused).status(),400);
 await expect(own.getByRole('alert')).toBeVisible();await expect(own.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 await expect.poll(()=>page.evaluate(id=>localStorage.getItem('oncall:pending:member:'+id),owner.id)).toBe(null);
 assert.equal((await request('/api/state')).members.find(m=>m.id===owner.id).active,true);
 await capture('refused');
 await page.reload();await expect(own.getByRole('button',{name:'Edit name',exact:true})).toBeVisible();
 await expect(own.getByRole('alert')).toHaveCount(0);await expect(own.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 await capture('refused-reload');
 // Upgrade recovery: an older browser may still hold this rejected draft.
 const state=await request('/api/state');
 await page.evaluate(({id,revision})=>localStorage.setItem('oncall:pending:member:'+id,JSON.stringify({version:1,edits:[{field:'active',from:true,to:false,revision,ready:true}]})),{id:owner.id,revision:state.revision});
 let commands=0;const count=r=>{if(new URL(r.url()).pathname==='/api/command'&&r.method()==='POST')commands++;};page.on('request',count);
 await page.reload();await expect(own.getByRole('button',{name:'Edit name',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(id=>localStorage.getItem('oncall:pending:member:'+id),owner.id)).toBe(null);
 assert.equal(commands,0,'the old refused draft is cleared without another write');page.off('request',count);
 await expect(own.getByRole('alert')).toHaveCount(0);
 // Connection uncertainty still retains its edit and supports a real retry.
 const deputy=page.getByRole('article',{name:other.name,exact:true});
 const interrupt=route=>route.request().postDataJSON()?.type==='member'?route.abort():route.continue();
 await page.route('**/api/command',interrupt);
 await deputy.getByRole('button',{name:'Member actions',exact:true}).click();await deputy.getByRole('button',{name:'Revoke access',exact:true}).click();
 await deputy.locator('.autosave-confirm').getByRole('button',{name:'Revoke access',exact:true}).click();
 await expect(deputy.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
 await page.unroute('**/api/command',interrupt);await deputy.getByRole('button',{name:'Retry',exact:true}).click();
 await expect.poll(async()=>(await request('/api/state')).members.find(m=>m.id===other.id).active).toBe(false);
 await expect(deputy.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 await own.getByRole('button',{name:'Edit name',exact:true}).click();await own.getByLabel('Your name',{exact:true}).fill(owner.name);await own.getByRole('button',{name:'Save name',exact:true}).click();
 await expect(page.getByRole('article',{name:owner.name,exact:true}).getByRole('button',{name:'Edit name',exact:true})).toBeVisible();
 console.log('PASS Team refused access: last-admin action unavailable with a next step; real refusal clears its draft and Retry across reload; older refused draft cleared; uncertain write still retries');
}

async function incidentSaves(page) {
 const request=async(path,data)=>ok(await call(page,path,data));
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(worker.origin+'/settings/services/checkout');
 const runbook=page.getByLabel('Runbook steps (one per line)',{exact:true});
 const runbookField=page.locator('.service-runbook');
 const steps='Check payment provider status\nConfirm checkout recovery';
 await runbook.fill(steps);await runbook.blur();
 await expect(runbookField.getByRole('status')).toHaveText('Saved');
 // The user can finish reading the field before checking its save result.
 await page.waitForTimeout(2500);
 await expect(runbookField.getByRole('status')).toHaveText('Saved');
 assert.deepEqual((await request('/api/state')).services.find(row=>row.id==='checkout').runbook,steps.split('\n'));
 const capture=async name=>{
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   await page.screenshot({path:`${captureDirectory}/incident-saves-${name}-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
 };
 await capture('runbook-saved');
 const blockRunbook=route=>route.request().postDataJSON()?.field==='runbook'?route.abort():route.continue();
 await page.route('**/api/command',blockRunbook);
 await runbook.fill(steps+'\nKeep the recovery evidence');await runbook.blur();
 await expect(runbookField.getByRole('alert')).toBeVisible();
 await expect(runbookField.getByRole('status')).toHaveCount(0);
 await expect(runbook).toHaveValue(steps+'\nKeep the recovery evidence');
 await capture('runbook-error');
 await page.unroute('**/api/command',blockRunbook);await runbookField.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(runbookField.getByRole('status')).toHaveText('Saved');
 await page.reload();await expect(runbook).toHaveValue(steps+'\nKeep the recovery evidence');
 let incident=await request('/api/command',{type:'declare',service:'checkout',title:'Synthetic checkout review',severity:'critical',summary:'Checkout delays were observed'});
 const mutate=async data=>incident=await request('/api/command',{incident:incident.id,revision:incident.revision,...data});
 for(const state of ['acknowledged','recovered','resolved'])await mutate({type:'transition',state,summary:'Recovery verified against retained evidence',evidence:'https://example.test/checkout-recovery'});
 await page.goto(worker.origin+'/incidents/'+incident.id);await page.locator('.incident-head h1').waitFor();
 const metadata=page.locator('.incident-head .incident-meta');
 assert.doesNotMatch(await metadata.innerText(),/·\s*·/,'incident metadata has no empty field');
 await capture('header');
 await page.setViewportSize({width:390,height:1000});
 const starts=await metadata.evaluate(element=>{
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),lines=new Map();let node;
  while(node=walker.nextNode())for(let offset=0;offset<node.textContent.length;offset++){
   const char=node.textContent[offset];if(!char.trim())continue;
   const range=document.createRange();range.setStart(node,offset);range.setEnd(node,offset+1);const box=range.getBoundingClientRect(),line=Math.round(box.top);
   const first=lines.get(line);if(!first||box.left<first.left)lines.set(line,{left:box.left,char});
  }
  return [...lines.values()].map(row=>row.char);
 });
 assert.ok(starts.every(char=>char!=='·'),'the phone incident header never begins a line with a separator');
 await page.setViewportSize({width:1440,height:1000});
 const owner=(await request('/api/session')).member;
 await mutate({type:'action',title:'Confirm checkout connection limits',owner:owner.id,escalationRecipient:owner.id,due:'2026-11-20',priority:'P2',completionPolicy:'human-review'});
 const before=structuredClone(incident.timeline);
 await page.goto(worker.origin+'/reviews/'+incident.id);
 const review=page.getByRole('dialog',{name:incident.title,exact:true});await review.waitFor();
 const blockReview=route=>route.request().postDataJSON()?.type==='review'?route.abort():route.continue();
 await page.route('**/api/command',blockReview);
 const first=review.getByLabel('Review',{exact:true});await first.fill('First assessment of the retained recovery evidence.');await first.blur();
 const firstField=review.locator('.review-edit').filter({has:page.getByLabel('Review',{exact:true})});
 await expect(firstField.getByRole('alert')).toBeVisible();await expect(firstField.getByRole('status')).toHaveCount(0);
 await expect(first).toHaveValue('First assessment of the retained recovery evidence.');await capture('review-error');
 await page.unroute('**/api/command',blockReview);await firstField.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(firstField.getByRole('status')).toHaveText('Saved');
 for(const [label,value] of [['Review','Corrected assessment after comparing checkout observations.'],['Root cause','Connection pool admission exceeded capacity.'],['Impact','Checkout requests were delayed.']]){
  const field=review.getByLabel(label,{exact:true});await field.fill(value);await field.blur();
  await expect(review.locator('.review-edit').filter({has:page.getByLabel(label,{exact:true})}).getByRole('status')).toHaveText('Saved');
 }
 await page.waitForTimeout(2500);
 await expect(review.locator('.review-edit').getByRole('status')).toHaveCount(3);
 incident=(await request('/api/state')).incidents.find(row=>row.id===incident.id);
 assert.deepEqual(incident.timeline,before,'successful review edits retain drafts without timeline noise');
 await capture('review-saved');
 await review.getByRole('button',{name:'Accept review',exact:true}).click();
 await review.getByRole('button',{name:'Accept this review',exact:true}).click();
 await expect(review.locator('.review-meta').filter({hasText:'Accepted by'})).toBeVisible();
 const accepted=(await request('/api/state')).incidents.find(row=>row.id===incident.id);
 assert.equal(accepted.timeline.length,before.length+1);
 assert.equal(accepted.timeline.filter(row=>row.kind==='review').length,1,'only explicit acceptance records the review in the timeline');
 assert.equal(accepted.timeline.at(-1).actor,accepted.reviewAcceptance.by);
 assert.equal(accepted.timeline.at(-1).review.review,accepted.review);
 await page.goto(worker.origin+'/incidents/'+incident.id);await page.locator('.incident-timeline').waitFor();
 await expect(page.locator('.incident-timeline .event').filter({hasText:'Human accepted root cause'})).toHaveCount(1);
 await capture('accepted-timeline');
 await page.goto(worker.origin+'/reviews');
 const followup=page.getByRole('article',{name:'Confirm checkout connection limits',exact:true});
 const evidence=followup.locator('summary').filter({hasText:/^Add evidence$/});
 await expect(evidence).toBeVisible();await capture('followup-ready');
 await evidence.click();await expect(followup.getByLabel('Completion evidence',{exact:true})).toBeVisible();
 await capture('followup-evidence');
 await followup.getByLabel('Completion evidence',{exact:true}).fill('https://example.test/checkout-connection-limits');
 await followup.getByRole('button',{name:'Add evidence',exact:true}).click();
 await expect(followup.getByRole('button',{name:'Accept completion',exact:true})).toBeVisible();
 await followup.getByRole('button',{name:'Accept completion',exact:true}).click();
 await followup.getByLabel('Reason',{exact:true}).fill('Connection limits verified against gateway metrics');
 await capture('followup-accept');
 await followup.getByRole('button',{name:'Accept this completion',exact:true}).click();
 await expect(followup).toHaveCount(0);
 const completed=(await request('/api/state')).incidents.find(row=>row.id===incident.id).actions.find(row=>row.title==='Confirm checkout connection limits');
 assert.equal(completed.done,true);assert.equal(completed.accepted.by,owner.id);assert.equal(completed.evidence,'https://example.test/checkout-connection-limits');
 await capture('followup-completed');
 console.log('PASS review follow-up evidence: ordinary desktop pointer click, submission and human acceptance');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations.filter(row=>['serious','critical'].includes(row.impact)),[]);
 console.log('PASS incident saves: persistent runbook and review Saved states, failed-save alerts and Retry, phone header without leading separators, draft edits without timeline entries, exactly one attributed accepted review; changed screens captured at 1440 and 390');
}
// Extend the member incident journey through retained handoff actions, rather
// than introducing another browser registration or repeating it at phone width.
async function incidentHandoff(ownerPage) {
 const req=async(path,data)=>ok(await call(ownerPage,path,data));
 const created=await req('/api/command',{type:'declare',service:'checkout',title:'Synthetic handoff incident',summary:'Checkout confirmations are delayed',severity:'warning'});
 let incident=await req('/api/command',{type:'transition',incident:created.id,revision:created.revision,state:'acknowledged',summary:'Investigating checkout confirmations'});
 const member=await open(1440);const responderRecord=await passwordSignIn(member.page,responder);
 const page=member.page;
 await openIncident(page,incident.id);await openIncidentAction(page,'Handoff draft');
 const panel=page.getByRole('dialog',{name:'Handoff draft',exact:true});
 const capture=async(name,target=page)=>{
  for(const width of [1440,390]){
   await target.setViewportSize({width,height:1000});
   await target.evaluate(()=>window.scrollTo(0,0));
   await target.getByRole('dialog',{name:'Handoff draft',exact:true}).evaluate(element=>{element.scrollTop=0;});
   await target.screenshot({path:`${captureDirectory}/handoff-${name}-${width}.png`,fullPage:false});
  }
  await target.setViewportSize({width:1440,height:1000});
 };
 await panel.getByLabel('Intended audience',{exact:true}).selectOption('customer');
 const title='Checkout update for customers',summary='Checkout confirmations are delayed. Responders are investigating.\nNext update after the database check.';
 await panel.getByLabel('Title',{exact:true}).fill(title);await panel.getByLabel('Summary',{exact:true}).fill(summary);
 await capture('prepare');
 // A response lost after commit retries the same prepare identity exactly once.
 let lose=true;
 const lost=async route=>{const response=await route.fetch();if(lose){lose=false;await route.abort();}else await route.fulfill({response});};
 await page.route('**/api/handoffs/prepare',lost);
 await panel.getByRole('button',{name:'Prepare copy',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Retry action',exact:true})).toBeVisible();
 await expect(panel.getByLabel('Summary',{exact:true})).toHaveValue(summary);
 await panel.getByRole('button',{name:'Retry action',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Review exact copy',exact:true})).toBeVisible();
 await page.unroute('**/api/handoffs/prepare',lost);
 let records=(await req('/api/handoffs')).records.filter(record=>record.source.incident.id===incident.id);
 assert.equal(records.length,1);assert.equal(records[0].history.length,1);assert.equal(records[0].history[0].actor.id,responderRecord.id);
 const saved=panel.getByRole('article',{name:'Saved handoff copy'});
 await expect(saved.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(saved.locator('.handoff-summary')).toHaveText(summary);
 assert.deepEqual(records[0].payload,{audience:'customer',title,summary,evidenceLinks:[],impactLinks:[]});
 await capture('prepared');
 lose=true;await page.route('**/api/handoffs/*/review',lost);
 await panel.getByRole('button',{name:'Review exact copy',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Retry action',exact:true})).toBeVisible();
 await expect(panel.getByRole('button',{name:'Review exact copy',exact:true})).toBeDisabled();
 await panel.getByRole('button',{name:'Retry action',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Export reviewed copy',exact:true})).toBeVisible();
 await page.unroute('**/api/handoffs/*/review',lost);
 let record=(await req('/api/handoffs/'+records[0].id)).record;
 const approval=record.history.at(-1);assert.equal(record.history.length,2,'lost review response retry appends one review');assert.equal(approval.type,'reviewed');assert.equal(approval.actor.id,responderRecord.id);
 await expect(saved.getByText(/Reviewed by/)).toContainText(responderRecord.name);
 assert.equal(await saved.locator('time').last().getAttribute('datetime'),new Date(approval.at).toISOString());
 await capture('reviewed');
 const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Export reviewed copy',exact:true}).click();
 const file=await download,packet=JSON.parse(await readFile(await file.path(),'utf8'));
 assert.deepEqual(packet,(await call(page,'/api/handoffs/'+record.id+'/export')).value);
 assert.deepEqual(packet.record,record);assert.equal(packet.transport,'unsent');assert.equal(packet.publication,'not-published');assert.deepEqual(packet.providerActions,[]);
 // The existing viewer can inspect exact saved copy, with no action controls.
 const readOnly=await open(1440);await passwordSignIn(readOnly.page,viewer);await openIncident(readOnly.page,incident.id);await openIncidentAction(readOnly.page,'Handoff draft');
 const viewerPanel=readOnly.page.getByRole('dialog',{name:'Handoff draft',exact:true});
 await expect(viewerPanel.locator('.handoff-summary')).toHaveText(summary);
 assert.equal(await viewerPanel.getByRole('button').count(),1,'viewer has only the existing Close control');
 assert.equal(await viewerPanel.locator('form').count(),0);
 await capture('viewer',readOnly.page);await readOnly.context.close();
 // Current role is rechecked by the public door even while an old panel is open.
 await req('/api/command',{type:'member',id:responderRecord.id,role:'viewer',active:true});
 await panel.getByRole('button',{name:'Prepare again',exact:true}).click();
 await panel.getByRole('button',{name:'Prepare copy',exact:true}).click();
 await expect(panel.getByRole('alert')).toBeVisible();
 assert.equal((await req('/api/handoffs')).records.filter(row=>row.source.incident.id===incident.id).length,1);
 await req('/api/command',{type:'member',id:responderRecord.id,role:'responder',active:true});
 await panel.getByRole('button',{name:'Cancel',exact:true}).click();
 // Mutate the source after review, then exercise the actual HTTP export conflict.
 incident=await req('/api/command',{type:'note',incident:incident.id,revision:incident.revision,text:'Database checks changed the current incident context.'});
 const conflict=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/handoffs/'+record.id+'/export');
 await panel.getByRole('button',{name:'Export reviewed copy',exact:true}).click();assert.equal((await conflict).status(),409);
 await expect(panel.getByRole('button',{name:'Export reviewed copy',exact:true})).toHaveCount(0);
 await expect(panel.getByRole('button',{name:'Prepare again',exact:true})).toBeVisible();
 assert.equal((await req('/api/handoffs/'+record.id)).eligibility.eligible,false);
 await capture('stale');
 await panel.getByRole('button',{name:'Prepare again',exact:true}).click();
 await panel.getByLabel('Summary',{exact:true}).fill('Current database checks show checkout confirmations recovering.');
 await panel.getByRole('button',{name:'Prepare copy',exact:true}).click();await expect(panel.getByRole('button',{name:'Review exact copy',exact:true})).toBeVisible();
 records=(await req('/api/handoffs')).records.filter(row=>row.source.incident.id===incident.id);
 assert.equal(records.length,2);assert.equal(records[1].supersedes,record.id);assert.equal(records[1].source.incident.revision,incident.revision);
 assert.deepEqual(records[0],record,'the old reviewed record is unchanged');
 // Administrator review uses the same panel and existing actions.
 await openIncident(ownerPage,incident.id);await openIncidentAction(ownerPage,'Handoff draft');
 const adminPanel=ownerPage.getByRole('dialog',{name:'Handoff draft',exact:true});
 await adminPanel.getByRole('button',{name:'Review exact copy',exact:true}).click();await expect(adminPanel.getByRole('button',{name:'Export reviewed copy',exact:true})).toBeVisible();
 assert.equal((await req('/api/handoffs/'+records[1].id)).record.history.at(-1).actor.role,'admin');
 await adminPanel.getByRole('button',{name:'Close',exact:true}).click();
 assert.deepEqual((await new AxeBuilder({page}).include('.incident-sheet').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations.filter(row=>['serious','critical'].includes(row.impact)),[]);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await member.context.close();
 console.log('PASS incident handoff: responder prepares, reviews and downloads exact unsent JSON; lost-response retry commits once; viewer inspects without actions; current-role refusal, source-drift export conflict and replacement; admin reviews; screens captured at 1440 and 390');
}
try {
 if(!focusedClients){
 const claimed=await worker.request('/auth/bootstrap',{token:worker.vars.SETUP_TOKEN,displayName:'Oncall lead'},undefined,{'CF-Connecting-IP':'127.0.0.1'})
 assert.equal(claimed.status,303,JSON.stringify(claimed.value))
 browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 const owner=await open(1440)
 await owner.context.addCookies(claimed.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}}))
 await owner.page.goto(worker.origin+'/setup')
 const confirmation=owner.page.getByRole('checkbox')
 if(await confirmation.count()){await confirmation.check();await owner.page.getByRole('button',{name:'Finish setup'}).click()}
 await owner.page.locator('.oncall-frame').waitFor({timeout:60000})
 const ownerMember=ok(await call(owner.page,'/api/session')).member
 if(!focusedSaves)await teamSettings(owner.page,ownerMember);
 if(!focusedTeam){
 const rosaRecord=ok(await call(owner.page,'/api/members',{...responder,role:'responder'}),201)
 ok(await call(owner.page,'/api/members',{...viewer,role:'viewer'}),201)
 ok(await call(owner.page,'/api/command',{type:'service',id:'checkout',name:'Checkout',environment:'production',owner:rosaRecord.id,runbook:['Check payment provider status'],pager:''}))
 // OC4: per-value save survives immediate menu departure; offline Retry commits once.
 await owner.page.goto(worker.origin+'/settings/services/checkout');
 const autosaveCard=owner.page.locator('.service-page'),ownerField=autosaveCard.getByLabel('Owner',{exact:true});
 await ownerField.selectOption(ownerMember.id);await openWorkspaceSection(owner.page,'team');
 await openWorkspaceSection(owner.page,'services');await owner.page.locator('a[href="/settings/services/checkout"]').click();await owner.page.reload();
 await expect(ownerField).toHaveValue(ownerMember.id);
 const beforeRetry=ok(await call(owner.page,'/api/state')).audit.length;
 const blockWrite=route=>route.request().postDataJSON()?.type==='service'&&route.request().postDataJSON()?.field==='owner'?route.abort():route.continue();
 await owner.page.route('**/api/command',blockWrite);await ownerField.selectOption(rosaRecord.id);
 await expect(autosaveCard.getByRole('button',{name:'Retry',exact:true})).toBeVisible();await expect(ownerField).toHaveValue(rosaRecord.id);
 assert.equal(await autosaveCard.getByText('Saved',{exact:true}).count(),0,'failed save never announces success');
 await owner.page.unroute('**/api/command',blockWrite);
 const retryWrite=owner.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().postDataJSON()?.type==='service'&&r.request().postDataJSON()?.field==='owner');
 await autosaveCard.getByRole('button',{name:'Retry',exact:true}).click();assert.equal((await retryWrite).status(),200);
 await expect(autosaveCard.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 const afterRetry=ok(await call(owner.page,'/api/state'));assert.equal(afterRetry.audit.length,beforeRetry+1,'Retry adds exactly one audit row');assert.equal(afterRetry.services.find(s=>s.id==='checkout').owner,rosaRecord.id);
 console.log('OC4 autosave: menu departure retains owner after reload; offline retains input; Retry audit +1');
 await incidentSaves(owner.page);
 await incidentHandoff(owner.page);
 if(!focusedSaves){
 // OC-023 public-team forms use the existing Team section at both widths.
 for(const width of [1440]){
  await owner.page.setViewportSize({width,height:1000});await owner.page.goto(worker.origin+'/settings/team');await owner.page.reload();
  const panel=owner.page.getByRole('region',{name:'Teams',exact:true});await panel.getByRole('heading',{name:'Teams',exact:true}).waitFor();
  const teamWrite=()=>owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/teams'&&response.request().method()==='POST');
  await panel.locator('summary').filter({hasText:/^Create team$/}).click();
  const create=panel.locator('details').filter({has:owner.page.locator('summary').filter({hasText:/^Create team$/})});
  await create.getByLabel('Team name',{exact:true}).fill('synthetic-oncall-145-'+width+' pending');
  await create.getByRole('checkbox',{name:'Member '+responder.name,exact:true}).check();
  await create.getByRole('checkbox',{name:'Manager '+responder.name,exact:true}).check();
  await owner.context.setOffline(true);await create.getByRole('button',{name:'Create team',exact:true}).click();
  await expect(create.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
  assert.equal(await create.getByLabel('Team name',{exact:true}).inputValue(),'synthetic-oncall-145-'+width+' pending');
  await owner.context.setOffline(false);await create.getByLabel('Team name',{exact:true}).fill('synthetic-oncall-145-'+width);
  await create.getByRole('checkbox',{name:'Member '+viewer.name,exact:true}).click();
  await expect(create.getByRole('checkbox',{name:'Member '+responder.name,exact:true})).toBeChecked();
  await expect(create.getByRole('checkbox',{name:'Member '+viewer.name,exact:true})).toBeChecked();
  const created=teamWrite();await create.getByRole('button',{name:'Retry',exact:true}).click();assert.equal((await created).status(),200);
  const card=panel.getByRole('article').filter({has:owner.page.getByRole('heading',{name:'synthetic-oncall-145-'+width,exact:true})});
  await card.getByRole('heading').waitFor();await expect(create.getByLabel('Team name',{exact:true})).toHaveValue('');await card.getByText('Edit team',{exact:true}).click();
  const name=card.getByLabel('Team name',{exact:true}),edited='synthetic-oncall-145-'+width+' edited';
  await name.fill(edited);
  await owner.context.setOffline(true);await name.press('Enter');
  await expect(card.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
  assert.equal(await name.inputValue(),edited);
  await owner.context.setOffline(false);
  const retried=teamWrite();await card.getByRole('button',{name:'Retry',exact:true}).click();assert.equal((await retried).status(),200);
  const saved=panel.getByRole('article').filter({has:owner.page.getByRole('heading',{name:edited,exact:true})});await saved.getByRole('heading').waitFor();
  await saved.getByLabel('Team name',{exact:true}).fill(edited+' pending');
  await expect(saved.getByLabel('Team name',{exact:true}).locator('..').getByRole('status')).toBeEmpty();
  assert.equal(ok(await call(owner.page,'/api/state')).teams.some(t=>t.name===edited+' pending'),false);
  await saved.getByLabel('Team name',{exact:true}).fill(edited);
  const teamState=ok(await call(owner.page,'/api/state')),owning=teamState.teams.find(t=>t.name===edited);
  assert.ok(owning.members.includes(rosaRecord.id));assert.equal(owning.members.length,2);assert.deepEqual(owning.managers,[rosaRecord.id]);
  // A stale edit keeps a different member change saved by another administrator.
  const other=await owner.context.newPage();await other.goto(worker.origin+'/settings/team');
  const otherCard=other.getByRole('region',{name:'Teams',exact:true}).getByRole('article').filter({has:other.getByRole('heading',{name:edited,exact:true})});
  await otherCard.getByText('Edit team',{exact:true}).click();
  const otherWrite=other.waitForResponse(response=>new URL(response.url()).pathname==='/api/teams'&&response.request().method()==='POST'&&response.status()===200);
  await otherCard.getByRole('checkbox',{name:'Member '+ownerMember.name,exact:true}).check();assert.equal((await otherWrite).status(),200);
  const firstEdit=teamWrite();await saved.getByRole('checkbox',{name:'Member '+viewer.name,exact:true}).uncheck();
  const firstAnswer=await firstEdit;
  if(firstAnswer.status()===409){
   const kept=owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/teams'&&response.request().method()==='POST'&&response.status()===200);
   await saved.getByRole('button',{name:'Retry',exact:true}).click();assert.equal((await kept).status(),200);
  }else assert.equal(firstAnswer.status(),200);
  const combined=ok(await call(owner.page,'/api/state')).teams.find(t=>t.id===owning.id);
  const viewerRecord=ok(await call(owner.page,'/api/state')).members.find(m=>m.name===viewer.name);
  assert.ok(combined.members.includes(ownerMember.id));assert.ok(!combined.members.includes(viewerRecord.id));
  await expect(saved.getByRole('checkbox',{name:'Member '+ownerMember.name,exact:true})).toBeChecked();
  await other.close();
  let reset=teamWrite();await saved.getByRole('checkbox',{name:'Member '+ownerMember.name,exact:true}).uncheck();assert.equal((await reset).status(),200);
  reset=teamWrite();await saved.getByRole('checkbox',{name:'Member '+viewer.name,exact:true}).check();assert.equal((await reset).status(),200);
  const archived=teamWrite();await saved.getByLabel('Team state',{exact:true}).selectOption('false');assert.equal((await archived).status(),200);
  assert.equal(ok(await call(owner.page,'/api/state')).teams.find(t=>t.id===owning.id).active,false);
  const restored=teamWrite();await saved.getByLabel('Team state',{exact:true}).selectOption('true');assert.equal((await restored).status(),200);
  assert.equal(ok(await call(owner.page,'/api/state')).teams.find(t=>t.id===owning.id).active,true);
  const ownershipSaved=owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().postDataJSON()?.field==='team'&&response.request().method()==='POST');
  await owner.page.goto(worker.origin+'/settings/services/checkout');await owner.page.getByLabel('Team',{exact:true}).selectOption(owning.id);await owner.page.getByRole('button',{name:'Change team',exact:true}).click();assert.equal((await ownershipSaved).status(),200);
  await owner.page.reload();assert.equal(await owner.page.getByLabel('Team',{exact:true}).inputValue(),owning.id);await owner.page.goto(worker.origin+'/settings/team');await panel.getByRole('heading',{name:'Teams',exact:true}).waitFor();
  assert.ok(await owner.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`teams fit ${width}`);
  assert.equal(await owner.page.evaluate(()=>window.__rerHydration?.count??0),0);
  assert.deepEqual((await new AxeBuilder({page:owner.page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations,[]);
  await panel.scrollIntoViewIfNeeded();await owner.page.screenshot({path:`${captureDirectory}/oc023-public-teams-${width}.png`,fullPage:true});
 }
 // The existing Teams review applies dependency conflicts, then reloads the retained provenance.
 const catalogTeam=ok(await call(owner.page,'/api/teams',{id:'synthetic-catalog-team',name:'Catalog response team',visibility:'public',active:true,revision:0,members:[rosaRecord.id],managers:[rosaRecord.id]}));
 for(const [id,name] of [['synthetic-oncall-current','Current dependency'],['synthetic-oncall-next','Next dependency']])ok(await call(owner.page,'/api/command',{type:'service',id,name,environment:'production',owner:'',runbook:[],pager:''}));
 const importCatalog=[{kind:'Component',metadata:{name:'checkout'},spec:{owner:catalogTeam.name,dependsOn:['component:default/synthetic-oncall-next']}}];
 for(const width of [1440,390]){
  const current=ok(await call(owner.page,'/api/state'));
  ok(await call(owner.page,'/api/command',{type:'service-dependencies',service:'checkout',dependencies:['synthetic-oncall-current'],workspaceRevision:current.revision}));
  await owner.page.setViewportSize({width,height:1000});await owner.page.goto(worker.origin+'/settings/team');
  const importPanel=owner.page.locator('.teams-import');
  await importPanel.getByText('Import from Backstage',{exact:true}).click();
  if(width===1440){
   const guide=importPanel.getByRole('link',{name:'Backstage import guide',exact:true});
   await guide.click();await owner.page.waitForURL(url=>url.pathname==='/docs/team'&&url.hash==='#import-from-backstage');
   const article=owner.page.locator('.docs-article');await article.getByRole('heading',{name:'Import from Backstage',exact:true}).waitFor();
   const example=JSON.parse(await article.locator('pre code').filter({hasText:'receipt-processing'}).innerText());
   const services=ok(await call(owner.page,'/api/state')).services;
   const match=services.find(row=>row.id==='checkout');example.items[0].metadata.name=match.id;example.items[0].spec.owner=catalogTeam.name;
   const preview=ok(await call(owner.page,'/api/teams/backstage/preview',{catalog:example}));assert.equal(preview.rows[0].service.id,match.id);assert.equal(preview.rows[0].team.id,catalogTeam.id,'the linked guide example previews against existing native records');
   for(const proofWidth of [1440,390]){await owner.page.setViewportSize({width:proofWidth,height:1000});await owner.page.screenshot({path:`${captureDirectory}/oc023-backstage-guide-${proofWidth}.png`,fullPage:true});}
   await owner.page.setViewportSize({width:1440,height:1000});await owner.page.goto(worker.origin+'/settings/team');await importPanel.getByText('Import from Backstage',{exact:true}).click();
  }
  await importPanel.getByLabel('Backstage catalog',{exact:true}).fill(JSON.stringify(importCatalog));
  const previewAnswer=owner.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/teams/backstage/preview');
  await importPanel.getByRole('button',{name:'Preview import',exact:true}).click();
  const reviewed=await (await previewAnswer).json();
  if(width===1440){
   assert.equal(reviewed.rows[0].dependencies.action,'conflict');
   await expect(importPanel.getByText('Dependencies: Current dependency → Next dependency',{exact:true})).toBeVisible();
   await expect(importPanel.getByLabel('Dependency import choice for Checkout',{exact:true})).toHaveValue('current');
   await importPanel.getByLabel('Import choice for Checkout',{exact:true}).selectOption('backstage');
  }
  await importPanel.getByLabel('Dependency import choice for Checkout',{exact:true}).selectOption('backstage');
  await importPanel.scrollIntoViewIfNeeded();await owner.page.screenshot({path:`${captureDirectory}/oc023-backstage-review-${width}.png`,fullPage:true});
  if(width===1440){
   const before=ok(await call(owner.page,'/api/state')),applyRequests=[];
   const count=request=>{if(new URL(request.url()).pathname==='/api/teams/backstage/apply')applyRequests.push(request)};
   owner.page.on('request',count);
   const lose=async route=>{const response=await route.fetch();assert.equal(response.status(),200);await route.abort('failed')};
   await owner.page.route('**/api/teams/backstage/apply',lose);
   await importPanel.getByRole('button',{name:'Apply import',exact:true}).click();
   await expect(importPanel.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
   assert.equal(ok(await call(owner.page,'/api/state')).revision,before.revision+1,'the lost response committed once');
   await owner.page.unroute('**/api/teams/backstage/apply',lose);
   await importPanel.getByRole('button',{name:'Retry',exact:true}).click();
   await expect(importPanel.getByRole('status')).toHaveText('Saved');
   assert.equal(applyRequests.length,1,'Retry confirms dependency and ownership state without a second Apply');
   assert.equal(ok(await call(owner.page,'/api/state')).revision,before.revision+1);
   owner.page.off('request',count);
  }else{
   await importPanel.getByRole('button',{name:'Apply import',exact:true}).click();await expect(importPanel.getByRole('status')).toHaveText('Saved');
  }
  await owner.page.reload();await importPanel.getByText('Import from Backstage',{exact:true}).click();
  await importPanel.getByLabel('Backstage catalog',{exact:true}).fill(JSON.stringify(importCatalog));
  await importPanel.getByRole('button',{name:'Preview import',exact:true}).click();
  await expect(importPanel.getByText('Dependencies: Next dependency → Next dependency · No change',{exact:true})).toBeVisible();
  if(width===1440){const imported=ok(await call(owner.page,'/api/state')).services.find(s=>s.id==='checkout');assert.deepEqual(imported.dependencies,['synthetic-oncall-next']);assert.equal(imported.dependencyImport.references[0].ref,importCatalog[0].spec.dependsOn[0]);assert.equal(imported.ownership.source,'backstage');}
  assert.ok(await owner.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Backstage review fits ${width}`);
  assert.deepEqual((await new AxeBuilder({page:owner.page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
  await owner.page.screenshot({path:`${captureDirectory}/oc023-backstage-reloaded-${width}.png`,fullPage:true});
 }
 console.log('PROBE OC-023 browser: Backstage dependency review, conflict choice, apply, lost-response Retry and reload -> rendered and HTTP state agree; screens captured at 1440 and 390');
 // OC-023: both service forms preserve explicit unassigned ownership.
 for(const width of [1440]) {
  await owner.page.setViewportSize({width,height:1000});await owner.page.goto(worker.origin+'/settings/services');await owner.page.reload();
  await owner.page.getByRole('button',{name:'Add service',exact:true}).click();
  const add=owner.page.locator('.service-create');
  await add.getByLabel('Service name',{exact:true}).fill('synthetic-oncall-23-'+width);
  await add.getByLabel('Service owner',{exact:true}).selectOption('');
  await add.getByRole('button',{name:'Create service',exact:true}).click();
  const card=owner.page.locator('.service-page');
  await card.getByRole('heading',{name:'synthetic-oncall-23-'+width,exact:true}).waitFor();
  assert.equal(await card.getByLabel('Owner',{exact:true}).inputValue(),'');
  const renamed=owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().postDataJSON()?.field==='name');
  await card.getByLabel('Name',{exact:true}).fill('synthetic-oncall-23-'+width+' edited');await card.getByLabel('Name',{exact:true}).press('Tab');
  assert.equal((await renamed).status(),200);
  await owner.page.reload();const edited=owner.page.locator('.service-page');
  await edited.getByRole('heading',{name:'synthetic-oncall-23-'+width+' edited',exact:true}).waitFor();
  assert.equal(await edited.getByLabel('Owner',{exact:true}).inputValue(),'');
  assert.ok(await owner.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`ownerless services fit ${width}`);
  assert.equal(await owner.page.evaluate(()=>window.__rerHydration?.count??0),0);
  const axe=await new AxeBuilder({page:owner.page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();
  assert.deepEqual(axe.violations,[],'ownerless services have no accessibility violations');
  await edited.scrollIntoViewIfNeeded();await owner.page.screenshot({path:`${captureDirectory}/oc023-ownerless-services-${width}.png`,fullPage:true});
 }
 const declared=ok(await call(owner.page,'/api/command',{type:'declare',title:'Checkout payments failing',service:'checkout',severity:'critical',summary:'Card payments fail at checkout.',alerts:[]}))

 // The responder coordinates through the incident page, then reloads at both widths.
 const rosa=await open(1440)
 const rosaMember=await passwordSignIn(rosa.page,responder)
 assert.equal(rosaMember.id,rosaRecord.id);assert.equal(rosaMember.role,'responder')
 assert.notEqual(rosaMember.id,ownerMember.id,'member and owner identities stay separate')
 await openIncident(rosa.page,declared.id)
 await rosa.page.getByRole('button',{name:'Acknowledge',exact:true}).click()
 await rosa.page.locator('.incident-state.state-acknowledged').waitFor()
 const ackText=ok(await call(rosa.page,'/api/state')).incidents.find(i=>i.id===declared.id).timeline.find(e=>e.lifecycle?.to==='acknowledged').text
 await rosa.page.getByLabel('Observation, decision or evidence').fill(noteText)
 await rosa.page.getByRole('button',{name:'Add note'}).click()
 await entry(rosa.page,noteText).waitFor()
 assert.equal(await rosa.page.getByRole('button',{name:/Send test page/}).count(),0,'no paging control is offered')
 for(const page of [rosa.page,owner.page])assert.equal((await call(page,'/api/paging/jobs',{incident:declared.id})).status,409,'paging stays OFF and refuses')
 for(const width of [1440]) {
  await rosa.page.setViewportSize({width,height:1000});await rosa.page.reload();await rosa.page.locator('.detail h1').waitFor()
  for(const text of [ackText,noteText])assert.match(await entry(rosa.page,text).innerText(),new RegExp(responder.name),`"${text}" stays attributed to the member after reload`)
  assert.equal(await rosa.page.locator('.incident-state.state-acknowledged').count(),1,'acknowledgement persists after reload')
  assert.ok(await rosa.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`no horizontal scroll at ${width}`)
  await rosa.page.locator('.timeline').scrollIntoViewIfNeeded();await rosa.page.screenshot({path:`${captureDirectory}/member-coordination-reloaded-${width}.png`,fullPage:true})
 }
 const kept=ok(await call(rosa.page,'/api/workspace')).state.incidents.find(i=>i.id===declared.id)
 assert.equal(kept.state,'acknowledged')
 for(const text of [ackText,noteText])assert.equal(kept.timeline.find(e=>e.text.includes(text)).actor,rosaMember.id,'the stored entry names the member')
 assert.ok(kept.timeline.some(e=>e.kind==='declared'&&e.actor===ownerMember.id),'the declaration stays the owner’s')

 // The independently signed-in responder sees a second session's note on return.
 const draft='Rosa draft: checking the next provider update.'
 await rosa.page.getByLabel('Observation, decision or evidence',{exact:true}).fill(draft)
 const responseSettings=await openIncidentAction(rosa.page,'People and priority')
 await openIncident(owner.page,declared.id)
 const secondNote='Owner update: provider recovery is being verified.'
 await owner.page.getByLabel('Observation, decision or evidence',{exact:true}).fill(secondNote)
 const written=owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'&&response.request().method()==='POST')
 await owner.page.getByRole('button',{name:'Add note',exact:true}).click()
 assert.equal((await written).status(),200)
 await entry(owner.page,secondNote).waitFor()
 await focusWorkspace(rosa.page)
 await entry(rosa.page,secondNote).waitFor()
 assert.match(await entry(rosa.page,secondNote).innerText(),new RegExp(ownerMember.name),'the second session note stays attributed to its author')
 assert.equal(await rosa.page.getByLabel('Observation, decision or evidence',{exact:true}).inputValue(),draft,'background refresh preserves the typed note')
 assert.equal(await responseSettings.evaluate(element=>element.open),true,'background refresh preserves the open response sheet')
 await responseSettings.getByRole('button',{name:'Close',exact:true}).click()

 // A public-team manager can edit own coverage without workspace configuration authority.
 const managedRotation={anchorLocal:'2026-01-01T00:00',periodDays:1,members:[rosaRecord.id],ambiguity:'earlier'};
 ok(await call(owner.page,'/api/paging/schedules',{id:'synthetic-oncall-145',name:'synthetic-oncall-145',service:'checkout',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:managedRotation,backup:{...managedRotation,members:[]},overrides:[]}));
 for(const width of [1440]){
  await rosa.page.setViewportSize({width,height:1000});await rosa.page.goto(worker.origin+'/on-call/synthetic-oncall-145/edit');
  await expect(rosa.page.getByLabel('Rota name',{exact:true})).toBeEnabled();
  const draft=rosa.page.waitForRequest(request=>new URL(request.url()).pathname==='/api/paging/preview'&&!!request.postDataJSON()?.schedule);
  await rosa.page.goto(worker.origin+'/on-call/new');
  assert.equal((await draft).postDataJSON().schedule.service,'checkout','the manager’s new rota uses its one authorized service');
  assert.ok(await rosa.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`manager coverage fits ${width}`);
  assert.equal(await rosa.page.evaluate(()=>window.__rerHydration?.count??0),0);
  assert.deepEqual((await new AxeBuilder({page:rosa.page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations,[]);
  await rosa.page.screenshot({path:`${captureDirectory}/oc023-manager-coverage-${width}.png`,fullPage:true});
 }

 // A second permitted session, the viewer, reads the same history and cannot write.
 const vic=await open(1440)
 assert.equal((await passwordSignIn(vic.page,viewer)).role,'viewer')
 await openIncident(vic.page,declared.id)
 for(const text of [ackText,noteText])assert.match(await entry(vic.page,text).innerText(),new RegExp(responder.name))
 assert.equal(await vic.page.getByLabel('Observation, decision or evidence').count(),0,'viewers get no coordination controls')
 ok(await call(vic.page,'/api/command',{type:'note',incident:declared.id,revision:kept.revision,text:'viewer write'}),403)
 await vic.page.locator('.timeline').scrollIntoViewIfNeeded();await vic.page.screenshot({path:`${captureDirectory}/member-coordination-viewer-1440.png`,fullPage:true})

 // OC-061: the existing shell carries internal status, with a status-only stakeholder session.
 const stakeholder={name:'Sam Stakeholder',password:'synthetic-oncall-61-password'}
 const sam=ok(await call(owner.page,'/api/members',{...stakeholder,role:'stakeholder'}),201)
 const communicator={name:'Casey Communications',password:'synthetic-oncall-611-password'}
 const communications=ok(await call(owner.page,'/api/members',{...communicator,role:'responder'}),201)
 const gateway={id:'synthetic-oncall-61',name:'Payment gateway',environment:'production'}
 const incidentTitle='Private gateway timeouts'
 const alertTitle='Private gateway queue stalled'
 const timelineNote='Private gateway timeline records a blocked retry'
 const runbookStep='Private gateway recovery instructions'
 ok(await call(owner.page,'/api/command',{type:'service',...gateway,owner:rosaRecord.id,runbook:[runbookStep],pager:''}))
 await owner.page.goto(worker.origin+'/status');await owner.page.reload()
 const statusPanel=owner.page.getByRole('region',{name:'Internal business status'})
 await statusPanel.getByRole('heading',{name:'Business services',exact:true}).waitFor()
 // With no business services, creation opens automatically after the status read.
 await statusPanel.getByLabel('Business-service name',{exact:true}).fill('Checkout')
 const teamField=statusPanel.getByLabel('Owning team',{exact:true})
 if(await teamField.count()){
  if(await teamField.evaluate(e=>e.tagName==='SELECT'))await teamField.selectOption({index:0});else await teamField.fill('Payments')
 }else{
  const teams=ok(await call(owner.page,'/api/state')).teams
  assert.equal(teams.length,1,'a form without an Owning team control has one team')
  await expect(statusPanel.locator('input[type="hidden"][name="owningTeam"]')).toHaveValue(teams[0].name)
  await expect(statusPanel.getByText('Owning team: '+teams[0].name,{exact:true})).toBeVisible()
  console.log('OC-061 one-team branch: the form names its sole created team',teams[0].name)
 }
 // Refused creates retain their draft and name the invalid field beside it.
 const supporting=statusPanel.getByLabel('Supporting technical services',{exact:true}),createBusiness=statusPanel.getByRole('button',{name:'Create business service',exact:true});
 await statusPanel.getByLabel('Communications owner',{exact:true}).selectOption(communications.id);
 const statusBefore=ok(await call(owner.page,'/api/status')),createRequests=[];
 const observeCreate=request=>{if(new URL(request.url()).pathname==='/api/status'&&request.method()==='POST')createRequests.push(request);};
 owner.page.on('request',observeCreate);
 await supporting.selectOption([]);await createBusiness.click();
 const fieldError=supporting.locator('..').getByRole('alert');
 await expect(fieldError).toBeVisible();await expect(supporting).toBeFocused();await expect(supporting).toHaveAttribute('aria-invalid','true');
 assert.equal(await supporting.getAttribute('aria-describedby'),await fieldError.getAttribute('id'),'the adjacent error describes the supporting-services field');
 assert.ok((await fieldError.innerText()).includes(await supporting.evaluate(e=>document.getElementById(e.getAttribute('aria-labelledby')).textContent)),'the error names its field');
 assert.equal(createRequests.length,0,'invalid create never reaches the write door');assert.deepEqual(ok(await call(owner.page,'/api/status')),statusBefore,'invalid create saves no business service');
 // The create disclosure closes after a successful create. Each refusal must
 // capture its own initiating action, including the disabled manual-status action.
 const captureRefusal=async (name,target)=>{
  for(const width of [1440,390]){
   await owner.page.setViewportSize({width,height:1000});
   await target.scrollIntoViewIfNeeded();
   await owner.page.screenshot({path:`${captureDirectory}/refusal-${name}-${width}.png`});
  }
  await owner.page.setViewportSize({width:1440,height:1000});
 };
 await captureRefusal('supporting-service',createBusiness);
 await supporting.selectOption('synthetic-oncall-61');await expect(fieldError).toHaveCount(0);
 // A real server-side length refusal is also visible beside the initiating action.
 await statusPanel.getByLabel('Business-service name',{exact:true}).fill('Checkout '.repeat(15));
 const refused=owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/status'&&response.request().method()==='POST');
 await createBusiness.click();const refusedReply=await refused;assert.equal(refusedReply.status(),400);
 const reason=(await refusedReply.json()).error;assert.ok(reason,'the server returns its reason');
 const createForm=createBusiness.locator('xpath=ancestor::form');await expect(createForm.getByRole('alert')).toBeVisible();
 assert.ok((await createForm.getByRole('alert').innerText()).includes(reason),'the page shows the server refusal reason');
 assert.equal(await statusPanel.getByText('Saved',{exact:true}).count(),0);assert.deepEqual(ok(await call(owner.page,'/api/status')),statusBefore);
 await expect(statusPanel.getByLabel('Business-service name',{exact:true})).toHaveValue('Checkout '.repeat(15));
 await captureRefusal('server-create',createBusiness);owner.page.off('request',observeCreate);
 await statusPanel.getByLabel('Business-service name',{exact:true}).fill('Checkout')
 await statusPanel.getByLabel('Communications owner',{exact:true}).selectOption(communications.id)
 await statusPanel.getByRole('button',{name:'Create business service',exact:true}).click()
 const checkout=statusPanel.getByRole('article',{name:'Checkout',exact:true})
 await checkout.getByText('Derived status: operational',{exact:true}).waitFor()
 // Grant an existing service's audience after creation, then subscribe that stakeholder.
 await checkout.getByText('Manage internal status',{exact:true}).click();
 const audience=checkout.getByRole('group',{name:'Stakeholder audience',exact:true});
 assert.ok(!(await checkout.getByLabel('Subscriber',{exact:true}).locator('option').evaluateAll(rows=>rows.map(row=>row.value))).includes(sam.id));
 await audience.getByRole('checkbox',{name:sam.name,exact:true}).check();
 await expect(audience.getByRole('status')).toHaveText('Saved');
 await checkout.getByLabel('Subscriber',{exact:true}).selectOption(sam.id);
 await checkout.getByRole('button',{name:'Subscribe member',exact:true}).click();
 assert.equal(ok(await call(owner.page,'/api/status')).services.find(row=>row.name==='Checkout').subscriptions.find(row=>row.member===sam.id).active,true);
 await owner.page.reload();
 await checkout.getByText('Manage internal status',{exact:true}).click();
 await expect(audience.getByRole('checkbox',{name:sam.name,exact:true})).toBeChecked();
 for(const width of [1440,390]){await owner.page.setViewportSize({width,height:1000});await audience.scrollIntoViewIfNeeded();await owner.page.screenshot({path:`${captureDirectory}/audience-saved-${width}.png`,fullPage:true});}
 await owner.page.setViewportSize({width:1440,height:1000});
 await audience.getByRole('checkbox',{name:sam.name,exact:true}).uncheck();await expect(audience.getByRole('status')).toHaveText('Saved');
 assert.ok(!(await checkout.getByLabel('Subscriber',{exact:true}).locator('option').evaluateAll(rows=>rows.map(row=>row.value))).includes(sam.id));
 assert.equal(ok(await call(owner.page,'/api/status')).services.find(row=>row.name==='Checkout').subscriptions.find(row=>row.member===sam.id).active,false);
 await audience.getByRole('checkbox',{name:sam.name,exact:true}).check();await expect(audience.getByRole('status')).toHaveText('Saved');
 await checkout.getByText('Manage internal status',{exact:true}).click();
 console.log('PASS existing service audience: grant, subscribe, reload, revoke and regrant through the browser');
 const source='synthetic-oncall-611',key=randomBytes(32).toString('hex')
 ok(await call(owner.page,'/api/sources',{id:source,key,scopes:[gateway.id],mode:'bearer'}))
 const event=ok(await worker.request('/api/ingress/'+source,{
  source,eventId:source,service:gateway.id,environment:gateway.environment,key:source,generation:source,
  intent:'trigger',severity:'warning',title:alertTitle,observedAt:new Date().toISOString(),
 },'',{authorization:'Bearer '+key}),201)
 const alert=ok(await call(owner.page,'/api/state')).alerts.find(row=>row.events.includes(event.id))
 assert.ok(alert,'the received event must populate an alert before testing the details')
 const statusIncident=ok(await call(owner.page,'/api/command',{type:'declare',service:gateway.id,severity:'warning',title:incidentTitle,summary:'Customer payment attempts delayed',alerts:[alert.id]}))
 ok(await call(owner.page,'/api/command',{type:'note',incident:statusIncident.id,revision:statusIncident.revision,text:timelineNote}))
 await focusWorkspace(owner.page)
 await checkout.getByText('Derived status: degraded',{exact:true}).waitFor()
 const statusCapture=async(page,screen,width)=>{
  await page.setViewportSize({width,height:1000})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),screen+' fits '+width)
  assert.equal(await page.evaluate(()=>window.__rerHydration?.count??0),0,'no hydration mismatch')
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()
  assert.deepEqual(axe.violations.filter(row=>['serious','critical'].includes(row.impact)),[],screen+' has no serious accessibility finding')
  console.log(`Member coordination ${screen} at ${width}: overflow, hydration and accessibility passed`);
  await page.screenshot({path:`${captureDirectory}/${(/^(oc068|oc058)-/.test(screen))?screen:'oc061-'+screen}-${width}.png`,fullPage:true})
 }
 for(const width of [1440])await statusCapture(owner.page,'derived-status',width)
 const beforeOverride=ok(await call(owner.page,'/api/status'));
 await checkout.getByText('Manage internal status',{exact:true}).click()
 await checkout.getByLabel('Status set by hand',{exact:true}).selectOption('operational')
 const setStatus=checkout.getByRole('button',{name:'Set status',exact:true});await expect(setStatus).toBeDisabled();
 const reasonHint=await setStatus.getAttribute('aria-describedby');assert.ok(reasonHint);await expect(checkout.locator(`[id="${reasonHint}"]`)).toBeVisible();
 await captureRefusal('status-reason',setStatus);
 assert.deepEqual(ok(await call(owner.page,'/api/status')),beforeOverride,'a missing reason saves no manual status');
 await checkout.getByLabel('Reason',{exact:true}).fill('Alternate gateway is processing payments')
 await checkout.getByRole('button',{name:'Set status',exact:true}).click()
 await checkout.getByText(/Manual override: operational/).waitFor()
 for(const width of [1440])await statusCapture(owner.page,'override-reason',width)
 const samView=await open(1440);await passwordSignIn(samView.page,stakeholder)
 await samView.page.getByRole('heading',{name:'Status',exact:true}).waitFor()
 const samCheckout=samView.page.getByRole('article',{name:'Checkout',exact:true})
 await samCheckout.getByText('Your subscription',{exact:true}).click()
 const subscribed=samView.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/status'&&r.request().method()==='POST');
 await samCheckout.getByLabel('Subscription',{exact:true}).selectOption('true')
 assert.equal((await subscribed).status(),200)
 await samCheckout.getByRole('heading',{name:'Recorded impact obligations',exact:true}).waitFor()
 for(const width of [1440]){
  await samView.page.setViewportSize({width,height:1000});await samView.page.reload()
  await samView.page.getByRole('heading',{name:'Recorded impact obligations',exact:true}).waitFor()
  assert.equal(await samView.page.locator('.timeline').count(),0)
  assert.equal(await samView.page.locator('nav a[href="/incidents"]').count(),0)
  for(const path of ['/api/state','/api/triage','/api/archive','/api/recovery/checkpoint','/api/audit/export','/api/handoffs/context/'+statusIncident.id,'/api/paging/state','/api/email','/api/automation/clients'])ok(await call(samView.page,path),403)
  ok(await call(samView.page,'/api/v1/incidents'),401)
  ok(await call(samView.page,'/api/command',{type:'declare',service:'synthetic-oncall-61',title:'Refused page',severity:'warning',summary:'No authority'}),403)
  const workspace=ok(await call(samView.page,'/api/workspace'));assert.equal(workspace.state,null)
  const html=await (await samView.context.request.get(worker.origin+'/')).text()
  assert.ok(!html.includes(incidentTitle)&&!html.includes(runbookStep),'stakeholder HTML bootstrap contains no response data')
  await statusCapture(samView.page,'stakeholder-status-and-refusals',width)
 }
 console.log('OC-061 browser: existing internal-status panel, derived degraded, attributed override and reason, stakeholder subscription and private-door refusals at 1440')

 // The same populated addresses must serve the owner and isolate the signed-in subscriber.
 const details=[
  ['incident','/incidents/'+encodeURIComponent(statusIncident.id),async page=>{
   const incident=page.getByRole('region',{name:'Incident',exact:true})
   await expect(incident.getByRole('heading',{name:incidentTitle,exact:true})).toBeVisible()
   await expect(entry(page,timelineNote)).toBeVisible()
  }],
  ['alert','/alerts/'+encodeURIComponent(alert.id),async page=>{
   const card=page.getByRole('article',{name:'Alert details',exact:true})
   await expect(card.getByRole('heading',{name:alertTitle,exact:true})).toBeVisible()
   await expect(card.getByText(runbookStep,{exact:true})).toBeVisible()
  }],
  ['service','/settings/services/'+encodeURIComponent(gateway.id),async page=>{
   await expect(page.getByRole('heading',{name:gateway.name,exact:true})).toBeVisible()
   await expect(page.getByLabel('Runbook steps (one per line)',{exact:true})).toHaveValue(runbookStep)
  }],
 ]
 const noPrivateData=(body,label)=>{
  for(const value of [incidentTitle,timelineNote,alertTitle,gateway.name,runbookStep])
   assert.ok(!body.includes(value),label+' disclosed '+value)
 }
 const statusOnly=snapshot=>{
  assert.equal(snapshot?.member?.id,sam.id)
  assert.equal(snapshot.member.role,'stakeholder')
  assert.equal(snapshot.state,null)
 }
 const custody=async()=>({
  native:durableSnapshot(worker),
  paging:ok(await call(owner.page,'/api/paging/state')),
  status:ok(await call(owner.page,'/api/status')),
 })
 const outbound=[]
 const observeRequest=request=>{if(!request.url().startsWith(worker.origin+'/'))outbound.push(new URL(request.url()).origin)}
 for(const context of [owner.context,samView.context])context.on('request',observeRequest)
 for(const width of [1440,390]){
  await owner.page.setViewportSize({width,height:1000})
  for(const [name,path,ownerSees] of details){
   await owner.page.goto(worker.origin+path)
   await ownerSees(owner.page)
   await owner.page.screenshot({path:`${captureDirectory}/oc061-owner-${name}-${width}.png`,fullPage:true})
  }
 }

 await owner.page.waitForLoadState('networkidle')
 const beforeDetails=await custody()
 assert.equal(beforeDetails.paging.paging,'OFF')
 const subscription=beforeDetails.status.services.find(row=>row.name==='Checkout').subscriptions.find(row=>row.member===sam.id)
 assert.equal(subscription?.active,true,'Checkout has an active subscription before the reads')
 for(const width of [1440,390]){
  await samView.page.setViewportSize({width,height:1000})
  for(const [name,path] of details){
   const replies=[]
   const observeResponse=response=>{
    const {pathname}=new URL(response.url())
    if(/^\/(?:api|auth)(?:\/|$)/.test(pathname)||['fetch','xhr'].includes(response.request().resourceType()))replies.push(response)
   }
   samView.page.on('response',observeResponse)
   try{
    const shell=await samView.page.goto(worker.origin+path)
    assert.ok(shell?.ok(),name+' returned a web document')
    const html=await shell.text()
    noPrivateData(html,name+' initial HTML and bootstrap')
    const embedded=/<script[^>]*id="oncall-workspace"[^>]*>([\s\S]*?)<\/script>/.exec(html)
    assert.ok(embedded,name+' includes the signed-in workspace bootstrap')
    statusOnly(JSON.parse(embedded[1]))
    await samView.page.waitForURL(worker.origin+'/status')
    await expect(samCheckout.getByText('Derived status: degraded',{exact:true})).toBeVisible()
    await expect(samCheckout.getByRole('heading',{name:'Recorded impact obligations',exact:true})).toBeVisible()
    await samView.page.waitForLoadState('networkidle')
    let checkoutStatus
    for(const reply of replies){
     const body=await reply.text(),path=new URL(reply.url()).pathname
     noPrivateData(body,name+' response from '+path)
     for(const id of [statusIncident.id,alert.id,gateway.id])
      assert.ok(!body.includes(id),name+' response from '+path+' disclosed a private record ID')
     if(path==='/api/workspace')statusOnly(ok({status:reply.status(),value:JSON.parse(body)}))
     if(path==='/api/status')checkoutStatus=ok({status:reply.status(),value:JSON.parse(body)}).services.find(row=>row.name==='Checkout')
    }
    assert.equal(checkoutStatus?.derived,'degraded','the browser received the permitted Checkout status')
    assert.deepEqual(checkoutStatus.subscription,subscription)
    await expect(samView.page.locator('.timeline, .alert-page, .service-page-head')).toHaveCount(0)
    noPrivateData(await samView.page.locator('html').evaluate(node=>node.outerHTML),name+' hydrated document')
    await samView.page.screenshot({path:`${captureDirectory}/oc061-stakeholder-${name}-${width}.png`,fullPage:true})
   }finally{
    samView.page.off('response',observeResponse)
   }
  }
 }
 const afterDetails=await custody()
 for(const context of [owner.context,samView.context])context.off('request',observeRequest)
 const tables=new Set([...Object.keys(beforeDetails.native),...Object.keys(afterDetails.native)])
 assert.deepEqual([...tables].filter(table=>!isDeepStrictEqual(afterDetails.native[table],beforeDetails.native[table])),[],
  'stakeholder detail reads preserve native records')
 assert.deepEqual(afterDetails.paging,beforeDetails.paging,'stakeholder detail reads preserve paging custody')
 assert.deepEqual(afterDetails.status,beforeDetails.status,'stakeholder detail reads preserve subscription custody')
 assert.deepEqual(outbound,[],'the detail browsers attempted no outbound request')
 assert.deepEqual(await worker.outboundRequests(),[],'the emitted Worker attempted no outbound request')
 console.log('PASS OC-061 direct stakeholder details: owner reads populated incident, alert and service; stakeholder lands on Checkout status with no private document, response or hydrated content at 1440 and 390; custody intact and zero outbound requests')
 await samView.context.close()

 // The current role controls management even when the service still names this member.
 const {context:communicationsContext,page:communicationsPage}=await open(1440)
 for(const context of [owner.context,communicationsContext])context.on('request',observeRequest)
 const signedIn=await passwordSignIn(communicationsPage,communicator)
 assert.deepEqual([signedIn.id,signedIn.role,signedIn.active],[communications.id,'responder',true])
 await communicationsPage.goto(worker.origin+'/status')
 const communicationsCard=communicationsPage.getByRole('article',{name:'Checkout',exact:true})
 const manage=communicationsCard.getByText('Manage internal status',{exact:true})
 const manual=communicationsCard.getByLabel('Status set by hand',{exact:true})
 const readCheckout=async()=>ok(await call(communicationsPage,'/api/status')).services.find(service=>service.name==='Checkout')
 const beforeSave=await readCheckout()
 assert.equal(beforeSave.communicationsOwner,communications.id)
 await manage.click()
 const reasonForOverride='The alternate gateway is now unavailable'
 await manual.selectOption('major outage')
 await communicationsCard.getByLabel('Reason',{exact:true}).fill(reasonForOverride)
 const overrideReply=communicationsPage.waitForResponse(response=>new URL(response.url()).pathname==='/api/status'&&response.request().postDataJSON()?.action==='override')
 await communicationsCard.getByRole('button',{name:'Set status',exact:true}).click()
 assert.equal((await overrideReply).status(),200)
 await communicationsPage.reload()
 const saved=await readCheckout()
 assert.deepEqual(
  [saved.revision,saved.derived,saved.override.value,saved.override.reason,saved.override.by],
  [beforeSave.revision+1,'degraded','major outage',reasonForOverride,communications.id],
 )
 const renderedOverride=communicationsCard.getByText(/^Manual override:/)
 await expect(renderedOverride.getByText('major outage',{exact:true})).toBeVisible()
 await expect(renderedOverride).toContainText(reasonForOverride)
 await expect(renderedOverride).toContainText(communications.name)
 await expect(communicationsCard.getByText('Derived status: degraded',{exact:true})).toBeVisible()
 await manage.click()
 await expect(manual).toHaveValue('major outage')
 const captureRole=async role=>{
  for(const width of [1440,390]){
   await communicationsPage.setViewportSize({width,height:1000})
   await communicationsCard.scrollIntoViewIfNeeded()
   await communicationsPage.screenshot({path:`${captureDirectory}/oc061-status-${role}-${width}.png`,fullPage:true})
  }
  await communicationsPage.setViewportSize({width:1440,height:1000})
 }
 await captureRole('communications-owner')

 const demoted=ok(await call(owner.page,'/api/command',{type:'member',id:communications.id,field:'role',from:'responder',to:'viewer'}))
 assert.deepEqual([demoted.id,demoted.role,demoted.active],[communications.id,'viewer',true])
 await communicationsPage.reload()
 const currentMember=ok(await call(communicationsPage,'/api/session')).member
 assert.deepEqual([currentMember.id,currentMember.role,currentMember.active],[communications.id,'viewer',true])
 await expect(renderedOverride).toContainText(reasonForOverride)
 await expect(renderedOverride).toContainText(communications.name)
 await expect(communicationsCard.getByText('Derived status: degraded',{exact:true})).toBeVisible()
 await expect(communicationsCard.getByText('Your subscription',{exact:true})).toBeVisible()
 await expect(manage).toHaveCount(0)
 await expect(manual).toHaveCount(0)
 const current=await readCheckout()
 assert.deepEqual([current.communicationsOwner,current.revision,current.derived,current.override],
  [communications.id,saved.revision,saved.derived,saved.override])
 const beforeDenial=await custody()
 const denial=await call(communicationsPage,'/api/status',{
  action:'override',id:current.id,revision:current.revision,value:'operational',reason:'Try to replace the saved override',
 })
 assert.equal(denial.status,403)
 assert.deepEqual(await readCheckout(),current,'the viewer still reads the same saved status')
 const afterDenial=await custody()
 assert.deepEqual(afterDenial.status,beforeDenial.status)
 assert.deepEqual(afterDenial.paging,beforeDenial.paging)
 assert.equal(afterDenial.paging.paging,'OFF')
 const {oc_admin_audit:priorAudit,oc_audit_clock:priorClock,...priorNative}=beforeDenial.native
 const {oc_admin_audit:currentAudit,oc_audit_clock:currentClock,...currentNative}=afterDenial.native
 assert.deepEqual(currentNative,priorNative,'the refusal preserves every non-audit record and revision')
 assert.equal(currentClock[0].revision,priorClock[0].revision,'the refusal commits no workspace write')
 const priorAuditIds=new Set(priorAudit.map(row=>row.id))
 assert.deepEqual(currentAudit.filter(row=>priorAuditIds.has(row.id)),priorAudit)
 const refusalRows=currentAudit.filter(row=>!priorAuditIds.has(row.id))
 assert.equal(refusalRows.length,1)
 assert.equal(refusalRows[0].outcome,'refused')
 assert.equal(refusalRows[0].detail,null)
 await captureRole('demoted-viewer')
 for(const context of [owner.context,communicationsContext])context.off('request',observeRequest)
 assert.deepEqual(outbound,[],'the status browsers attempted no outbound request')
 assert.deepEqual(await worker.outboundRequests(),[],'the status Worker attempted no outbound request')
 await communicationsContext.close()
 console.log(`PROBE OC-061 6: signed-in communications owner saved major outage with reason and attribution at revision ${beforeSave.revision} -> ${saved.revision}; derived degraded. Same session as active viewer read the override and no management controls; current-revision POST returned ${denial.status}, with one refusal audit and unchanged native and paging custody. Both roles captured at 1440 and 390 with zero outbound requests.`)

 // OC-061 email lists: configure in Settings, inspect start/end records, unsubscribe and use shared erasure.
 for(const width of [1440]){
  await owner.page.setViewportSize({width,height:1000});const serviceId='synthetic-oncall-614-'+width,name='Synthetic list status '+width,address='synthetic-oncall-614-'+width+'@example.test';
  ok(await call(owner.page,'/api/command',{type:'service',id:serviceId,name:'Synthetic list service '+width,environment:'test',owner:ownerMember.id,runbook:[],pager:''}));
  ok(await call(owner.page,'/api/status',{action:'create',name,owningTeam:'Synthetic team label',supporting:[serviceId],communicationsOwner:ownerMember.id,audience:[],highUrgencyImpact:false}));
  await owner.page.goto(worker.origin+'/status');await owner.page.reload();const panel=owner.page.getByRole('region',{name:'Internal business status'}),card=panel.getByRole('article',{name,exact:true});
  await card.getByText('Manage internal status',{exact:true}).click();await card.getByText('Email-list subscription settings',{exact:true}).click();await card.getByLabel('Email-list address',{exact:true}).fill(address);await card.getByRole('button',{name:'Add email-list subscriber',exact:true}).click();await card.getByText(address+' · email · subscribed',{exact:true}).waitFor();
  let impact=ok(await call(owner.page,'/api/command',{type:'declare',service:serviceId,title:'Synthetic private list impact '+width,summary:'Synthetic local response context',severity:'warning'}));await focusWorkspace(owner.page);await card.getByText(/impact started/).first().waitFor();await card.scrollIntoViewIfNeeded();await statusCapture(owner.page,'email-list-started',width);await owner.page.screenshot({path:`${captureDirectory}/oc061-email-list-started-focus-${width}.png`});
  for(const state of ['acknowledged','recovered','resolved'])impact=ok(await call(owner.page,'/api/command',{type:'transition',incident:impact.id,revision:impact.revision,state,summary:'Synthetic recovery verified',evidence:'https://example.test/synthetic-oncall-614'}));await focusWorkspace(owner.page);await card.getByText(/impact ended/).first().waitFor();await statusCapture(owner.page,'email-list-ended',width);
  const listRow=card.locator('.saved-view').filter({hasText:address});await listRow.getByRole('button',{name:'Unsubscribe email list',exact:true}).click();await card.getByText(address+' · email · unsubscribed',{exact:true}).waitFor();
  ok(await call(owner.page,'/api/command',{type:'declare',service:serviceId,title:'Synthetic subsequent impact '+width,summary:'Synthetic local response only',severity:'warning'}));await focusWorkspace(owner.page);
  const saved=ok(await call(owner.page,'/api/state')).businessServices.find(row=>row.name===name),list=saved.emailLists.find(row=>row.address===address);assert.equal(saved.notices.filter(row=>row.target.kind==='email-list'&&row.target.id===list.id).length,2);assert.ok(saved.notices.every(row=>row.label==='no sender'&&row.automatic===false));assert.ok(!JSON.stringify(saved.notices).includes('Synthetic private list impact'));await statusCapture(owner.page,'email-list-unsubscribed',width);
  await owner.page.goto(worker.origin+'/settings/archive');await focusWorkspace(owner.page);const erasure=owner.page.locator('.erase-data');await erasure.locator(':scope > summary').click();await erasure.getByLabel('Erasure category',{exact:true}).waitFor();
  await erasure.getByLabel('Erasure category',{exact:true}).selectOption('email-list');await erasure.getByLabel('Erasure subject',{exact:true}).selectOption(list.id);await erasure.getByLabel('Erasure confirmation',{exact:true}).fill('erase '+await erasure.locator('select').nth(1).evaluate(select=>select.selectedOptions[0].label));await erasure.getByLabel('Erasure confirmation',{exact:true}).scrollIntoViewIfNeeded();await statusCapture(owner.page,'email-list-erasure-review',width);
  const erased=owner.page.waitForResponse(response=>response.url().endsWith('/api/erasure/email-list/'+list.id));await erasure.getByRole('button',{name:'Erase selected subject',exact:true}).click();assert.equal((await erased).status(),200);assert.equal((await (await erased).json()).stores.oc_business_services.deleted,0);assert.equal((await (await erased).json()).stores.oc_business_services.updated,1);await erasure.getByRole('status').scrollIntoViewIfNeeded();await statusCapture(owner.page,'email-list-erasure-receipt',width);await owner.page.screenshot({path:`${captureDirectory}/oc061-email-list-erasure-receipt-focus-${width}.png`});assert.ok(!JSON.stringify(ok(await call(owner.page,'/api/state'))).includes(address));
 }
 console.log('OC-061 email-list browser: Settings authoring, started/ended recorded no-sender obligations, unsubscribe prevents future records and shared erasure receipt at 1440; overflow, axe and hydration passed')

 // The new role is excluded from every responder selector on the existing screens.
 ok(await call(owner.page,'/api/paging/schedules',{id:'synthetic-oncall-62',name:'Payments primary',service:'synthetic-oncall-61',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[rosaRecord.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[ownerMember.id],ambiguity:'earlier'},overrides:[]}))
 const roleSession=await owner.context.newCDPSession(owner.page);await roleSession.send('Emulation.setCPUThrottlingRate',{rate:4})
 const excludesStakeholder=async locator=>assert.ok(!(await locator.locator('option').evaluateAll(options=>options.map(option=>option.value))).includes(sam.id),'stakeholders are never offered as responders')
 for(const screen of ['team','services','routing','schedules','incidents']){
  await owner.page.goto(worker.origin+({team:'/settings/team',services:'/settings/services',routing:'/settings/routing',schedules:'/on-call'}[screen]??'/'+screen));await owner.page.reload()
  if(screen==='team')await owner.page.getByRole('heading',{name:'Team',exact:true,level:1}).waitFor()
  if(screen==='services'){await owner.page.getByRole('button',{name:'Add service',exact:true}).click();await excludesStakeholder(owner.page.getByLabel('Service owner',{exact:true}))}
  if(screen==='routing'){if(!await owner.page.getByLabel('Owner',{exact:true}).isVisible())await owner.page.getByText('Add routed key',{exact:true}).click();await excludesStakeholder(owner.page.getByLabel('Owner',{exact:true}))}
  if(screen==='schedules'){
   await owner.page.goto(worker.origin+'/on-call/synthetic-oncall-62/edit')
   await owner.page.getByLabel('Rota name',{exact:true}).waitFor()
   await owner.page.getByRole('button',{name:'Continue',exact:true}).click()
   await owner.page.getByRole('heading',{name:'Who is on, in order',exact:true}).waitFor()
   await excludesStakeholder(owner.page.getByLabel('Primary person 1',{exact:true}))
   await owner.page.getByRole('button',{name:'Remove person',exact:true}).first().focus()
   await owner.page.getByRole('tooltip',{name:'Remove person',exact:true}).first().waitFor({state:'visible'})
  }
  if(screen==='incidents'){
   await owner.page.getByRole('checkbox',{name:/^Select /}).first().check()
   await owner.page.getByRole('button',{name:'Select this page',exact:true}).click()
   await owner.page.getByLabel('Bulk action',{exact:true}).selectOption('reassign')
   await excludesStakeholder(owner.page.getByLabel('Bulk assignee',{exact:true}))
   await owner.page.locator('.incident').filter({hasText:'Checkout payments failing'}).click()
   const people=await openIncidentAction(owner.page,'People and priority')
   await excludesStakeholder(people.getByLabel('Scribe',{exact:true}))
   await people.getByRole('button',{name:'Close',exact:true}).click()
  }
  for(const width of [1440])await statusCapture(owner.page,'role-'+screen,width)
 }
 await roleSession.send('Emulation.setCPUThrottlingRate',{rate:1});await roleSession.detach()
 console.log('OC-061 role selectors and tooltips: team, service, routing, schedule and incident/bulk screens at 1440 with own browser CPU rate 4; stakeholder excluded from response owners and keyboard tooltip immediate')

 // OC-068 uses the real manual-page form and independent target response controls.
 await owner.page.goto(worker.origin+'/incidents');await owner.page.reload()
 await owner.page.getByRole('button',{name:'Declare incident',exact:true}).click()
 await owner.page.getByLabel('Incident title',{exact:true}).fill('Manual checkout responder request')
 await owner.page.getByLabel('Service',{exact:true}).selectOption('checkout')
 await owner.page.locator('form').filter({has:owner.page.getByRole('button',{name:'Declare',exact:true})}).getByText('More options',{exact:true}).click()
 await owner.page.getByLabel('Page urgency',{exact:true}).selectOption('high')
 await owner.page.getByLabel('Page priority',{exact:true}).selectOption('P2')
 await owner.page.getByLabel('Customer impact and current evidence',{exact:true}).fill('Customer payments need investigation')
 const manualForm68=owner.page.locator('form').filter({has:owner.page.getByRole('button',{name:'Declare',exact:true})})
 await manualForm68.getByLabel('Named responders',{exact:true}).selectOption(rosaRecord.id)
 await owner.page.getByRole('button',{name:'Declare',exact:true}).waitFor()
 for(const width of [1440])await statusCapture(owner.page,'oc068-manual-page-form',width)
 await owner.page.getByRole('button',{name:'Declare',exact:true}).click()
 await owner.page.locator('.detail h1').filter({hasText:'Manual checkout responder request'}).waitFor()
 const manual68=ok(await call(owner.page,'/api/state')).incidents.find(i=>i.title==='Manual checkout responder request')
 assert.equal(manual68.manualPage.creator,ownerMember.id);assert.equal(manual68.manualPage.obligations[0].target.id,rosaRecord.id)
 await openIncidentAction(owner.page,'Request responders')
 const requests68=owner.page.getByRole('region',{name:'Manual obligations and responder requests'})
 const recordRequest=async message=>{
  await requests68.getByLabel('Named responders',{exact:true}).selectOption(rosaRecord.id)
  await requests68.getByLabel('Responder request message',{exact:true}).fill(message)
  await requests68.getByRole('button',{name:'Record responder requests',exact:true}).click()
  await requests68.getByText(message,{exact:true}).waitFor()
 }
 for(const message of ['Inspect payment provider','Inspect payment network'])await recordRequest(message)
 assert.equal(await requests68.getByRole('button',{name:'Accept request',exact:true}).count(),0,'the requester is not offered Accept for another responder')
 await openIncident(rosa.page,manual68.id);await rosa.page.reload()
 await openIncidentAction(rosa.page,'Request responders')
 const responseRegion=rosa.page.getByRole('region',{name:'Manual obligations and responder requests'})
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment provider'}).getByRole('button',{name:'Accept request',exact:true}).click()
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment provider'}).getByText(/^accepted · requested/).waitFor()
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment network'}).getByRole('button',{name:'Decline request',exact:true}).click()
 await responseRegion.getByRole('article').filter({hasText:'Inspect payment network'}).getByText(/^declined · requested/).waitFor()
 await responseRegion.getByText('Primary acknowledgment: Unacknowledged',{exact:true}).waitFor()
 for(const width of [1440])await statusCapture(rosa.page,'oc068-requests-and-obligations',width)

 // OC-068 local responder-request cancellation through the signed-in web door.
 const readWorkspace=async page=>ok(await call(page,'/api/state'))
 const readManual=state=>state.incidents.find(incident=>incident.id===manual68.id)
 const requestCard=(page,region,message)=>region.getByRole('article').filter({has:page.getByText(message,{exact:true})})
 const cancelMessage='Review provider follow-up',siblingMessage='Review network follow-up'
 const cancelButton={name:'Cancel request',exact:true}
 const openRequests=async page=>{
  await openIncident(page,manual68.id)
  return openIncidentAction(page,'Request responders')
 }
 const captureRequests=async(page,region,screen)=>{
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000})
   await openRequests(page)
   await requestCard(page,region,siblingMessage).scrollIntoViewIfNeeded()
   await page.screenshot({path:`${captureDirectory}/oc068-cancel-${screen}-${width}.png`})
  }
  await page.setViewportSize({width:1440,height:1000})
 }
 const outboundBefore=await worker.outboundRequests()
 for(const context of [owner.context,rosa.context])context.on('request',observeRequest)
 try{
  await openRequests(owner.page)
  await recordRequest(cancelMessage)
  await recordRequest(siblingMessage)
  await openIncident(rosa.page,manual68.id)
  await rosa.page.getByRole('button',{name:'Acknowledge',exact:true}).click()
  await rosa.page.locator('.incident-state.state-acknowledged').waitFor()

  const before=await readWorkspace(owner.page),incident=readManual(before)
  const service=before.services.find(row=>row.id===incident.service)
  assert.equal(before.teams.find(team=>team.id===service.team)?.visibility,'public')
  assert.equal(incident.manualPage.acknowledgment.by,rosaRecord.id)
  assert.deepEqual(incident.manualPage.obligations.map(row=>[row.target.id,row.state,row.outcome]),
   [[rosaRecord.id,'stopped','Primary incident acknowledged']])
  const pending=incident.responderRequests.filter(row=>row.status==='pending')
  assert.deepEqual(pending.map(row=>row.message),[cancelMessage,siblingMessage])
  const [target,sibling]=pending
  for(const row of [target,sibling]){
   assert.equal(row.requester,ownerMember.id)
   assert.deepEqual(row.obligation.target,{kind:'user',id:rosaRecord.id})
   assert.deepEqual([row.obligation.state,row.obligation.paging,row.obligation.automatic],['recorded','off',false])
  }
  assert.notEqual(target.obligation.id,sibling.obligation.id)

  const beforePaging=ok(await call(owner.page,'/api/paging/state'))
  const readEffects=()=>Object.fromEntries(Object.entries(durableSnapshot(worker))
   .filter(([table])=>table.startsWith('paging_')||table.includes('outbox')||table.endsWith('_deadlines')))
  const beforeEffects=readEffects()
  const beforeAudit=worker.sql('SELECT * FROM oc_admin_audit ORDER BY ordinal')
  const auditOrdinal=beforeAudit.at(-1).ordinal
  const responderDialog=await openRequests(rosa.page)
  await responderDialog.getByRole('button',{name:'Close',exact:true}).focus()
  await expect(responderDialog.getByRole('tooltip',{name:'Close dialog',exact:true})).toBeVisible()
  for(const message of [cancelMessage,siblingMessage]){
   const card=requestCard(rosa.page,responseRegion,message)
   await expect(card.getByText(/^pending · requested/)).toBeVisible()
   await expect(card.getByRole('button',{name:'Accept request',exact:true})).toBeVisible()
   await expect(card.getByRole('button',cancelButton)).toHaveCount(0)
  }
  assert.deepEqual(await readWorkspace(owner.page),before,'opening as the named responder preserves protected state')
  await captureRequests(rosa.page,responseRegion,'non-requester')

  await owner.page.setViewportSize({width:1440,height:1000})
  await openRequests(owner.page)
  const cancelled=owner.page.waitForResponse(response=>new URL(response.url()).pathname==='/api/command'
   &&response.request().method()==='POST'&&response.request().postDataJSON()?.type==='cancel-request')
  await requestCard(owner.page,requests68,cancelMessage).getByRole('button',cancelButton).click()
  const response=await cancelled
  assert.equal(response.status(),200)
  assert.deepEqual(response.request().postDataJSON(),{type:'cancel-request',incident:incident.id,revision:incident.revision,request:target.id})
  await openIncident(owner.page,manual68.id)
  const cancellationEntry=entry(owner.page,'Responder request cancelled')
  await expect(cancellationEntry).toHaveCount(1)
  await expect(cancellationEntry.locator('small')).toHaveText(ownerMember.name)
  await openIncidentAction(owner.page,'Request responders')
  const targetCard=requestCard(owner.page,requests68,cancelMessage),siblingCard=requestCard(owner.page,requests68,siblingMessage)
  await expect(targetCard.getByText(/^cancelled · requested/)).toContainText('response by '+ownerMember.name)
  await expect(targetCard.getByRole('button',cancelButton)).toHaveCount(0)
  await expect(siblingCard.getByText(/^pending · requested/)).toBeVisible()
  await expect(siblingCard.getByRole('button',cancelButton)).toBeEnabled()
  await expect(requests68.getByText('Primary acknowledgment: '+responder.name,{exact:true})).toBeVisible()
  await captureRequests(owner.page,requests68,'reopened')

  const after=await readWorkspace(owner.page),saved=readManual(after)
  const cancellation=saved.timeline.at(-1)
  assert.deepEqual([cancellation.kind,cancellation.actor],['cancel-request',ownerMember.id])
  assert.ok(cancellation.text.includes(target.id),'the attributed timeline entry identifies the cancelled request')
  assert.ok(Number.isFinite(Date.parse(cancellation.at)))
  const stopped={...target,status:'cancelled',response:{by:ownerMember.id,at:cancellation.at},
   obligation:{...target.obligation,state:'stopped',outcome:'cancelled'}}
  const expected={...incident,revision:incident.revision+1,timeline:[...incident.timeline,cancellation],
   responderRequests:incident.responderRequests.map(row=>row.id===target.id?stopped:row)}
  assert.deepEqual(saved,expected,'only the target request, its obligation, incident revision and one timeline entry change')
  assert.deepEqual(after,{...before,revision:before.revision+1,incidents:before.incidents.map(row=>row.id===saved.id?expected:row)})

  // Read the permanent audit directly because exporting it creates an audit row.
  assert.deepEqual(worker.sql(`SELECT * FROM oc_admin_audit WHERE ordinal<=${auditOrdinal} ORDER BY ordinal`),
   beforeAudit,'existing permanent audit history is unchanged')
  const audit=worker.sql(`SELECT a.kind,a.outcome,actor.entity_id AS actor,subject.entity_id AS subject,
   a.workspace_before,a.workspace_after,a.paging_before,a.paging_after,a.handoff_before=a.handoff_after AS handoff_unchanged
   FROM oc_admin_audit a LEFT JOIN oc_audit_identities actor ON actor.label=a.actor AND actor.kind='member'
   LEFT JOIN oc_audit_identities subject ON subject.label=a.subject AND subject.kind='entity'
   WHERE a.ordinal>${auditOrdinal} ORDER BY a.ordinal`)
  assert.deepEqual(audit,[{kind:'command.cancel-request',outcome:'accepted',actor:ownerMember.id,subject:incident.id,
   workspace_before:before.revision,workspace_after:after.revision,paging_before:beforePaging.revision,
   paging_after:beforePaging.revision,handoff_unchanged:1}])
  assert.equal(beforePaging.paging,'OFF')
  assert.deepEqual(ok(await call(owner.page,'/api/paging/state')),{...beforePaging,workspaceRevision:after.revision})
  assert.deepEqual(readEffects(),beforeEffects,'cancellation creates no paging work, receipt, deadline or outbox record')
  assert.deepEqual(await worker.outboundRequests(),outboundBefore,'cancellation and reopen create no Worker outbound requests')
  assert.deepEqual(outbound,[],'the requester and named responder browsers attempt no outbound requests')
 }finally{
  for(const context of [owner.context,rosa.context])context.off('request',observeRequest)
 }
 console.log('PROBE OC-068 5: on a signed-in manual incident for a public-team service, the named responder saw two pending requests and no Cancel control. The requester cancelled one and reopened at 1440 and 390. One attributed timeline entry and one permanent audit row persisted. Only the target obligation stopped. The sibling and primary acknowledgment and obligation stayed unchanged. Zero outbound or paging effects.')

 await openIncident(vic.page,manual68.id);await vic.page.reload()
 await openIncidentAction(vic.page,'Request responders')
 await vic.page.getByText('Only responders and admins may create manual pages or request responders.',{exact:true}).waitFor()
 ok(await call(vic.page,'/api/command',{type:'manual-page',operationId:'synthetic-oncall-68-viewer',service:'checkout',title:'Refused',severity:'critical'}),403)
 for(const width of [1440])await statusCapture(vic.page,'oc068-viewer-refusal',width)
 await owner.page.goto(worker.origin+'/settings/services/checkout');await owner.page.reload()
 const assignment68=owner.page.locator('.service-page')
 await assignment68.getByText('Assign new incidents',{exact:true}).click()
 const assignmentChoice=owner.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().postDataJSON()?.type==='user-assignment');
 await assignment68.getByLabel('User-assignment outcome',{exact:true}).selectOption('repeat');assert.equal((await assignmentChoice).status(),200)
 await assignment68.getByLabel('Assignment delay (minutes)',{exact:true}).fill('7')
 const assignmentText=owner.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().postDataJSON()?.type==='user-assignment');
 await assignment68.getByLabel('Assignment delay (minutes)',{exact:true}).blur();assert.equal((await assignmentText).status(),200);
 assert.equal(ok(await call(owner.page,'/api/state')).services.find(s=>s.id==='checkout').userAssignments.at(-1).minutes,7)
 assert.equal(await assignment68.getByLabel('User-assignment outcome',{exact:true}).inputValue(),'repeat')
 for(const width of [1440])await statusCapture(owner.page,'oc068-service-assignment-rule',width)
 console.log('OC-068 browser: manual page urgency/target, recorded obligations, independent accepted and declined responder requests, viewer refusal and versioned assignment setting at 1440')
 await assignment68.getByText('Acknowledgment timeout',{exact:true}).click()
 await assignment68.getByLabel('Acknowledgment timeout (minutes, 0 is off)',{exact:true}).fill('1')
 const timeoutSave=owner.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/command'&&r.request().postDataJSON()?.type==='acknowledgment-timeout');
 await assignment68.getByLabel('Acknowledgment timeout (minutes, 0 is off)',{exact:true}).blur();assert.equal((await timeoutSave).status(),200);
 assert.equal(ok(await call(owner.page,'/api/state')).services.find(s=>s.id==='checkout').ackTimeouts.at(-1).minutes,1)
 for(const width of [1440])await statusCapture(owner.page,'oc058-service-timeout',width)
 let incident58=ok(await call(owner.page,'/api/command',{type:'manual-page',operationId:'synthetic-oncall-58-browser',service:'checkout',title:'Snoozed checkout investigation',severity:'warning',summary:'Investigating a customer checkout delay'}))
 incident58=ok(await call(owner.page,'/api/command',{type:'transition',incident:incident58.id,revision:incident58.revision,state:'acknowledged',summary:'Owner investigating'}))
 await openIncident(owner.page,incident58.id)
 await openIncidentAction(owner.page,'Snooze')
 await owner.page.getByLabel('Snooze duration (minutes)',{exact:true}).fill('1')
 for(const width of [1440])await statusCapture(owner.page,'oc058-snooze-form',width)
 await owner.page.getByRole('button',{name:'Snooze incident',exact:true}).click()
 await owner.page.getByRole('status').filter({hasText:'Snoozed / acknowledgment held until'}).waitFor()
 for(const width of [1440])await statusCapture(owner.page,'oc058-snoozed',width)
 incident58=ok(await call(owner.page,'/api/state')).incidents.find(i=>i.id===incident58.id)
 await worker.time(Date.parse(incident58.deadlines.at(-1).dueAt))
 const expired58=await worker.send('/cdn-cgi/local/scheduled',undefined,{},'GET');assert.equal(expired58.status,200)
 await openIncident(owner.page,incident58.id)
 await openIncidentAction(owner.page,'Snooze')
 await owner.page.getByRole('region',{name:'Incident deadlines'}).getByText(/Snooze · Expired/).waitFor()
 await owner.page.getByRole('button',{name:'Close',exact:true}).click()
 await openIncidentAction(owner.page,'Request responders')
 assert.equal(ok(await call(owner.page,'/api/state')).incidents.find(i=>i.id===incident58.id).state,'declared')
 await owner.page.getByRole('region',{name:'Manual obligations and responder requests'}).getByText('Primary acknowledgment: Unacknowledged',{exact:true}).waitFor()
 await owner.page.getByText(/^Earlier manual-page acknowledgment:/).waitFor()
 await owner.page.getByRole('button',{name:'Close',exact:true}).click()
 await owner.page.getByText('Deadline scheduler',{exact:true}).waitFor()
 for(const width of [1440])await statusCapture(owner.page,'oc058-expired-triggered',width)
 console.log('OC-058 browser: timeout setting, snooze duration, persisted snoozed state and scheduled expiry back to triggered at 1440; paging OFF')


 // Signed out, anonymous and revoked sessions see no workspace.
 await rosa.page.setViewportSize({width:1440,height:1000});await rosa.page.goto(worker.origin+'/incidents')
 await rosa.page.locator('.shell-rail .owner-button').click();await rosa.page.getByRole('menuitem',{name:'Sign out',exact:true}).click();await rosa.page.waitForURL(u=>u.pathname.startsWith('/signin'))
 await denied(rosa.page,'signed-out member',declared.id)
 const anonymous=await open(1440);await denied(anonymous.page,'anonymous visitor',declared.id)
 const again=await open(1440);await passwordSignIn(again.page,responder);await openIncident(again.page,declared.id)
 await owner.page.goto(worker.origin+'/settings/team');await owner.page.reload()
 const card=owner.page.getByRole('article',{name:responder.name,exact:true});
 await card.getByRole('button',{name:'Member actions',exact:true}).click();await card.getByRole('button',{name:'Revoke access',exact:true}).click();
 await card.locator('.autosave-confirm').getByRole('button',{name:'Revoke access',exact:true}).click();
 await expect.poll(async()=>ok(await call(owner.page,'/api/state')).members.find(m=>m.id===rosaRecord.id).active).toBe(false);
 await denied(again.page,'revoked member session',declared.id)
 assert.equal((await again.context.request.post(worker.origin+'/api/login',{data:responder,headers:{origin:worker.origin}})).status(),401,'a revoked member cannot sign in again')
 await again.page.screenshot({path:`${captureDirectory}/member-coordination-revoked-1440.png`,fullPage:true})
 const after=ok(await call(owner.page,'/api/workspace')).state.incidents.find(i=>i.id===declared.id)
 assert.ok(after.timeline.some(e=>e.text===noteText&&e.actor===rosaMember.id),'revocation keeps the attributed history')
 assert.deepEqual(errors,[])
 console.log('OC-018 real hosted member coordination persists after reload: on the emitted production Worker a password member acknowledged and noted an incident, reloaded at 1440 and kept attribution; a viewer read it; signed-out, anonymous and revoked sessions got no workspace; paging refused (409)')
 }
}
}
} finally {
 await browser?.close()
 await worker.close()
}

// Finish identity management with owner correction, sign-out and honest mail availability.
if(!focusedSaves&&!focusedClients&&!focusedTeam){
const {default:assert}=await import('node:assert/strict')
const {mkdir,readFile}=await import('node:fs/promises')
const {chromium}=await import('@playwright/test')
const {localWorker}=await import('./worker.mjs')

// The emitted Worker owns production email sign-in. Base's local dev wrapper
// deliberately replaces /signin with one-click owner entry in v2.
let worker=await localWorker()
const owner=worker.vars.OWNER_EMAIL
const {surfaces:{app:{signIn}}}=JSON.parse(await readFile('management/integration/deployment-spec.json','utf8'))
const openApp=email=>{
 const url=new URL(signIn.path,worker.origin)
 if(signIn.loginHint)url.searchParams.set('login_hint',email)
 return url.href
}
let browser
const captureDirectory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'
await mkdir(captureDirectory,{recursive:true})
try {
 const claimed=await worker.request('/auth/bootstrap',{token:worker.vars.SETUP_TOKEN,displayName:'Oncall lead'},undefined,{'CF-Connecting-IP':'127.0.0.1'})
 assert.equal(claimed.status,303,JSON.stringify(claimed.value))
 browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 const context=await browser.newContext({viewport:{width:1440,height:1000},extraHTTPHeaders:{'CF-Connecting-IP':'127.0.0.1'}}),page=await context.newPage()
 await context.addCookies(claimed.headers.getSetCookie().map(line=>{
  const pair=line.split(';')[0],at=pair.indexOf('=')
  return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin,httpOnly:true,sameSite:'Lax'}
 }))
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 const initialState=await context.request.get(worker.origin+'/api/state')
 assert.equal(initialState.status(),200)
 const initialMember=(await initialState.json()).members.find(member=>member.role==='admin')
 assert.equal(initialMember.name,'Oncall lead','claim name becomes the owner member name')
 for(const width of [1440]) {
  await page.setViewportSize({width,height:1000})
  for(const [suffix,location] of [['','/app'],['?returnTo=%2Fapp%2Fincidents','/app/incidents'],['?returnTo=https%3A%2F%2Fexample.test','/app'],['?returnTo=%2F%252Fexample.test','/app']]) {
   const forward=await context.request.get(worker.origin+'/signin'+suffix,{maxRedirects:0})
   assert.equal(forward.status(),303,'signed-in owner forwards from /signin')
   assert.equal(forward.headers().location,location)
  }
  const auditBefore=new Set((await (await context.request.get(worker.origin+'/api/audit/export')).json()).rows.map(row=>row.id))
  const oldName=worker.sql("SELECT data FROM oc_members WHERE id='"+initialMember.id+"'")[0].data
  const corrected='synthetic-oncall-'+width
  const changed=await context.request.post(worker.origin+'/setup',{form:{displayName:corrected,confirm:'yes'},headers:{origin:worker.origin},maxRedirects:0})
  assert.equal(changed.status(),303)
  worker.sql("CREATE TRIGGER synthetic_owner_name_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='member.owner-name' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-owner-name-audit'); END")
  try {assert.equal((await context.request.get(worker.origin+'/api/state')).status(),503);assert.equal(worker.sql("SELECT data FROM oc_members WHERE id='"+initialMember.id+"'")[0].data,oldName,'audit failure rolls back the name and workspace mutation')} finally {worker.sql('DROP TRIGGER synthetic_owner_name_audit')}
  const state=await context.request.get(worker.origin+'/api/state')
  assert.equal((await state.json()).members.find(member=>member.id===initialMember.id).name,corrected,'later setup correction follows into the mapped member')
  const auditAfter=(await (await context.request.get(worker.origin+'/api/audit/export')).json()).rows.filter(row=>!auditBefore.has(row.id)&&row.kind==='member.owner-name'&&row.outcome==='accepted')
  assert.equal(auditAfter.length,1,'one attributed owner-name synchronization commits with its audit')
  assert.equal(auditAfter[0].workspaceAfter,auditAfter[0].workspaceBefore+1)
  await page.goto(worker.origin+'/app')
  await page.locator('.oncall-frame').waitFor()
  const phone=await page.getByRole('button',{name:'Menu',exact:true}).isVisible()
  if(phone)await page.getByRole('button',{name:'Menu',exact:true}).click()
  await page.locator(phone?'.shell-sheet .profile':'.shell-rail .profile').getByText(corrected,{exact:true}).waitFor()
  await page.screenshot({path:`${captureDirectory}/signin-owner-name-${width}.png`,fullPage:true})
 }
 await page.goto(worker.origin+'/setup')
 await page.waitForURL(worker.origin+'/on-call')
 await page.locator('.oncall-frame').waitFor({timeout:60000})
 await page.locator('.shell-rail .owner-button').press('Enter');await page.getByRole('menuitem',{name:'Sign out',exact:true}).click()
 await page.waitForURL(worker.origin+signIn.path)
 assert.equal((await context.request.get(worker.origin+'/api/state')).status(),401)
 for(const width of [1440]) {
  await page.setViewportSize({width,height:1000})
  await page.goto(openApp(owner))
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByLabel('Email',{exact:true}).count(),0,'unconfigured mail offers no unusable email form')
  await page.screenshot({path:`${captureDirectory}/signin-mail-unavailable-${width}.png`,fullPage:true})
 }
 const refused=await worker.request('/auth/magic-link',{email:owner},undefined,{'CF-Connecting-IP':'127.0.0.1'})
 assert.equal(refused.status,503)
 assert.equal(refused.value.error,'mail_unavailable')
 assert.equal((await context.request.get(worker.origin+'/api/state')).status(),401,'unavailable mail never authenticates anyone')
 await context.close()
 await worker.close()
 // Only public page reads: synthetic provider configuration makes the email
 // form available; no delivery request is submitted or sent to the network.
 worker=await localWorker({MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-example-mail-credential',MAIL_FROM:'auth@example.test'})
 const configured=await browser.newContext({viewport:{width:1440,height:1000}}),hintPage=await configured.newPage()
 hintPage.on('pageerror',error=>errors.push(error.message))
 let submitted=0
 hintPage.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/auth/magic-link')submitted++})
 for(const width of [1440]) {
  await hintPage.setViewportSize({width,height:1000})
  await hintPage.goto(openApp(owner))
  const email=hintPage.getByLabel('Email',{exact:true})
  assert.equal(await email.inputValue(),owner)
  await email.fill('relief.lead@example.test')
  assert.equal(await email.inputValue(),'relief.lead@example.test','a hint stays editable')
  await hintPage.goto(openApp(owner))
  assert.equal(await email.inputValue(),owner)
  assert.equal(submitted,0,'a hint never submits the form')
  await hintPage.screenshot({path:`${captureDirectory}/signin-login-hint-${width}.png`,fullPage:true})
 }
 for(const hint of ['','invalid<address>']) {
  await hintPage.goto(openApp(hint))
  assert.equal(await hintPage.getByLabel('Email',{exact:true}).inputValue(),'')
 }
 await configured.close()
 assert.deepEqual(errors,[])
 console.log('Production sign-in browser flow passed at 1440: configured editable hints without a send, unconfigured mail refusal, sign-out and denied access without a session')
} finally {
 await browser?.close()
 await worker.close()
}

}

// Configure scoped automation, inspect delivery failure and retain machine attribution in the workspace.
if(!focusedSaves&&!focusedTeam){
const {default:assert}=await import('node:assert/strict')
const {mkdir}=await import('node:fs/promises')
const {join,resolve}=await import('node:path')
const {randomBytes}=await import('node:crypto')
const {default:AxeBuilder}=await import('@axe-core/playwright')
const {ownerDoor}=await import('./worker.mjs')
const {chromium}=await import('@playwright/test')
const {automationRuntime,recordOwnedProcesses}=await import('./worker.mjs')
let receiverStatus=403;
const runtime=await automationRuntime(()=>new Response(null,{status:receiverStatus})),proof=process.env.ONCALL_BROWSER_EVIDENCE??resolve('../evidence/browser');
let browser;
try {
 await mkdir(proof,{recursive:true});
 const setup=await runtime.request('/api/setup',{name:'Synthetic Browser Owner',password:'synthetic-oncall-browser-password'});assert.equal(setup.status,200);
 const cookie=setup.cookie,owner=setup.value.member,req=(p,d)=>runtime.request(p,d,cookie);
 assert.equal((await req('/api/command',{type:'service',id:'synthetic-oncall-browser',name:'Synthetic browser service',environment:'test',owner:owner.id,runbook:[],pager:''})).status,200);
 const viewer=await req('/api/members',{name:'Synthetic Viewer',role:'viewer',password:'synthetic-oncall-viewer-password'});assert.equal(viewer.status,201);
 browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 recordOwnedProcesses();
 console.log('Browser driver PID',process.pid,'runtime proof uses a fresh test-only context');
 for(const width of [1440]) {
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const at=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,at),value:cookie.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'}]);
  await page.goto(runtime.origin+'/settings/integrations');const panel=page.locator('#response-api');await panel.locator(':scope > details > summary').nth(0).click();await panel.getByRole('heading',{name:'API clients',exact:true}).waitFor();
  const notice=panel.getByLabel('API client policy',{exact:true});
  const captureClients=async name=>{
   for(const proofWidth of [1440,390]){
    await page.setViewportSize({width:proofWidth,height:1000});
    await panel.screenshot({path:join(proof,'automation-'+name+'-'+proofWidth+'.png')});
   }
   await page.setViewportSize({width,height:1000});
  };
  const prerequisite=await req('/api/automation');assert.equal(prerequisite.value.policy.state,'unset');
  await expect(notice.getByRole('link')).toHaveAttribute('href',prerequisite.value.policy.setupUrl);
  await captureClients('policy-unset');
  const granted=await req('/api/command',{type:'declare',service:'synthetic-oncall-browser',title:'Synthetic granted incident',severity:'warning',summary:'Granted service record'});
  assert.equal(granted.status,200);
  assert.equal((await req('/api/command',{type:'service',id:'synthetic-oncall-private',name:'Synthetic other service',environment:'test',owner:owner.id,runbook:[],pager:''})).status,200);
  const foreign=await req('/api/command',{type:'declare',service:'synthetic-oncall-private',title:'Synthetic foreign incident',severity:'warning',summary:'Outside the client grant'});
  assert.equal(foreign.status,200);
  if(await panel.getByRole('button',{name:'Add client',exact:true}).isVisible())await panel.getByRole('button',{name:'Add client',exact:true}).click();
  await panel.getByLabel('Name',{exact:true}).fill('Synthetic browser client '+width);
  await panel.getByLabel('Incidents',{exact:true}).selectOption('write');await panel.getByLabel('Responders',{exact:true}).selectOption('read');await panel.getByRole('button',{name:'Create client',exact:true}).click();await panel.getByText('Synthetic browser client '+width,{exact:true}).first().waitFor();
  const createdKey=await panel.getByLabel('Private key',{exact:true}).inputValue();assert.ok(createdKey);await panel.getByRole('button',{name:'Done',exact:true}).click();
  const read=key=>runtime.request('/api/v1/incidents',undefined,'',{authorization:'Bearer '+key});
  const unset=await read(createdKey);assert.equal(unset.status,403);assert.equal(unset.value.error.code,'policy_unset');
  await expect(notice.getByRole('status')).toHaveText(unset.value.error.message);
  assert.equal(new URL(await notice.getByRole('link').getAttribute('href'),runtime.origin).href,unset.value.fields.setup_url);
  assert.equal((await runtime.request('/api/v1/analytics',undefined,'',{authorization:'Bearer '+createdKey})).status,403);
  await captureClients('client-pending');
  // Follow the page's prerequisite and make explicit choices in its existing form.
  await notice.getByRole('link').click();await page.waitForURL(runtime.origin+'/agents');
  const choices=page.locator('[data-policy-class]');
  await choices.first().waitFor();
  assert.ok(await choices.count()>0);
  for(const choice of await choices.all())await choice.selectOption('autonomous');
  await page.getByRole('radio',{name:'No',exact:true}).check();
  const savedPolicy=page.waitForResponse(r=>new URL(r.url()).pathname==='/agents/api/policy'&&r.request().method()==='PUT');
  // The policy document reloads after saving; finish that navigation before leaving it.
  await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.getByRole('button',{name:'Save policy',exact:true}).click()]);assert.equal((await savedPolicy).status(),200);
  // Reopen the saved choices and change just Sensitive information.
  const policy=async()=> (await runtime.request('/agents/api/policy',undefined,cookie)).value.document;
  const originalPolicy=await policy();
  await page.reload();await page.locator('[data-guided-policy] > summary').click();
  for(const rule of originalPolicy.rules)await expect(page.locator('[data-policy-class="'+rule.class+'"]')).toHaveValue(rule.do);
  await expect(page.getByRole('radio',{name:'No',exact:true})).toBeChecked();
  const saveGuided=async()=>Promise.all([page.waitForNavigation({waitUntil:'load'}),page.getByRole('button',{name:'Save policy',exact:true}).click()]);
  await page.getByLabel('Sensitive information',{exact:true}).selectOption('approval');await saveGuided();
  const changedPolicy=await policy();
  assert.deepEqual(changedPolicy,{...originalPolicy,rules:originalPolicy.rules.map(rule=>rule.class==='sensitive'?{...rule,do:'approval',approver:['role:owner'],wait:'P1D'}:rule)},'changing one answer preserves every other saved policy setting');
  await page.locator('[data-guided-policy] > summary').click();
  await expect(page.getByLabel('Sensitive information',{exact:true})).toHaveValue('approval');
  for(const proofWidth of [1440,390]){
   await page.setViewportSize({width:proofWidth,height:1000});
   if(proofWidth===1440){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact)),[]);}
   await page.screenshot({path:join(proof,'automation-guided-policy-'+proofWidth+'.png'),fullPage:true});
  }
  await page.setViewportSize({width,height:1000});
  await page.getByLabel('Sensitive information',{exact:true}).selectOption('autonomous');await saveGuided();assert.deepEqual(await policy(),originalPolicy,'removing approval preserves the original choices and removes only its approval settings');
  // A document with a scoped exception cannot be flattened into these choices.
  await page.locator('[data-policy-editor] > summary').click();
  const customPolicy={...originalPolicy,rules:[...originalPolicy.rules,{id:'scoped-sensitive',class:'sensitive',do:'blocked',agent:'synthetic-oncall-1'}]};
  await page.getByLabel('Policy document',{exact:true}).fill(JSON.stringify(customPolicy));
  await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'Save policy document',exact:true}).click()]);
  assert.equal(await page.locator('[data-policy-class]').count(),0);assert.equal(await page.locator('[data-policy-editor]').evaluate(el=>el.open),true);
  assert.deepEqual(JSON.parse(await page.getByLabel('Policy document',{exact:true}).inputValue()),customPolicy);
  await page.getByLabel('Policy document',{exact:true}).fill(JSON.stringify(originalPolicy));await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'Save policy document',exact:true}).click()]);
  const grantedRead=await read(createdKey);assert.equal(grantedRead.status,200);
  assert.deepEqual(grantedRead.value.data.map(row=>row.id),[granted.value.id]);
  assert.ok(!JSON.stringify(grantedRead.value).includes(foreign.value.id),'the same key reads only its granted service');
  assert.equal((await runtime.request('/api/v1/analytics',undefined,'',{authorization:'Bearer '+createdKey})).status,403);
  await page.goto(runtime.origin+'/settings/integrations');await panel.locator(':scope > details > summary').first().click();
  // Finish the documented acknowledgment using only public API reads for IDs.
  await panel.getByRole('link',{name:'API reference',exact:true}).click();await page.waitForURL(runtime.origin+'/docs/response-api');
  const reference=page.locator('.docs-article');await reference.waitFor();
  const publicRead=path=>runtime.request('/api/v1/'+path,undefined,'',{authorization:'Bearer '+createdKey});
  const responders=await publicRead('responders');assert.equal(responders.status,200);
  const responsible=responders.value.data.find(row=>row.name==='Synthetic Browser Owner');assert.ok(responsible);
  const currentIncident=await publicRead('incidents/'+grantedRead.value.data[0].id);assert.equal(currentIncident.status,200);
  const acknowledged=await runtime.request('/api/v1/incidents',{type:'transition',incident:currentIncident.value.id,revision:currentIncident.value.revision,state:'acknowledged',member:responsible.id,summary:'Public API responsibility'},'',{authorization:'Bearer '+createdKey,'idempotency-key':'synthetic-oncall-public-ack'});assert.equal(acknowledged.status,201);
  const result=await publicRead('incidents/'+acknowledged.value.entity);assert.equal(result.value.assignee,responsible.id);assert.equal(result.value.commander,responsible.id);assert.equal(result.value.timeline.at(-1).actor,acknowledged.value.client);
  for(const proofWidth of [1440,390]){await page.setViewportSize({width:proofWidth,height:1000});await page.locator('#version-1-http-reference').scrollIntoViewIfNeeded();await page.screenshot({path:join(proof,'automation-reference-'+proofWidth+'.png'),fullPage:true});}
  await page.setViewportSize({width,height:1000});await page.goto(runtime.origin+'/settings/integrations');await panel.locator(':scope > details > summary').first().click();
  assert.equal((await req('/api/automation')).value.policy.state,'set');
  const client=(await req('/api/automation')).value.clients.find(c=>c.name==='Synthetic browser client '+width);
  const clientRow=panel.locator('.integration-rows > li').filter({hasText:client.name}),actions=clientRow.locator('.integration-client-actions');
  // Real pointer clicks, without a preliminary row hover or forced action.
  await actions.locator('summary').click();await expect(actions.getByRole('button',{name:'Rotate '+client.name,exact:true})).toBeVisible();
  await captureClients('client-actions');
  const rotate=async()=>{
   if(!await actions.evaluate(el=>el.open))await actions.locator('summary').click();
   await actions.getByRole('button',{name:'Rotate '+client.name,exact:true}).click();
   await panel.getByRole('button',{name:'Rotate key',exact:true}).click();
   await panel.getByLabel('Private key',{exact:true}).waitFor();
   const key=await panel.getByLabel('Private key',{exact:true}).inputValue();
   await panel.getByRole('button',{name:'Done',exact:true}).click();return key;
  };
  const rotatedKey=await rotate();assert.notEqual(rotatedKey,createdKey);
  assert.equal((await read(createdKey)).status,401);assert.equal((await read(rotatedKey)).status,200);
  // A stale lifecycle write is a real server conflict and must be announced.
  const current=(await req('/api/automation')).value.clients.find(c=>c.id===client.id);
  await req('/api/automation/clients/'+client.id+'/revoke',{revision:current.revision});
  await actions.getByRole('button',{name:'Revoke '+client.name,exact:true}).click();await panel.getByRole('button',{name:'Revoke key',exact:true}).click();await page.getByRole('alert').filter({hasText:'Revision conflict'}).waitFor();
  await page.screenshot({path:join(proof,'automation-conflict-'+width+'.png'),fullPage:true});
  await page.reload();await panel.locator(':scope > details > summary').first().click();
  const renewedKey=await rotate();assert.equal((await read(renewedKey)).status,200);
  await actions.getByRole('button',{name:'Revoke '+client.name,exact:true}).click();
  const revoked=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/automation/clients/'+client.id+'/revoke'&&r.request().method()==='POST');
  await panel.getByRole('button',{name:'Revoke key',exact:true}).click();assert.equal((await revoked).status(),200);
  assert.equal((await read(renewedKey)).status,401);
  await page.reload();await panel.locator(':scope > details > summary').nth(2).click();await panel.getByRole('heading',{name:'Outbox',exact:true}).waitFor();assert.equal(await panel.locator('input').evaluateAll((inputs,key)=>inputs.some(input=>input.value===key),createdKey),false);
  // Approved recipient and actual refusal produce a durable terminal outcome on screen.
  const key=randomBytes(32).toString('hex'),created=await req('/api/automation/clients',{name:'Synthetic sending client '+width,key,services:['synthetic-oncall-browser'],permissions:['incidents:read','incidents:write']});assert.equal(created.status,201);
  await page.reload();await panel.locator(':scope > details > summary').nth(1).click();if(await panel.getByRole('button',{name:'Add recipient',exact:true}).isVisible())await panel.getByRole('button',{name:'Add recipient',exact:true}).click();await panel.getByLabel('Name',{exact:true}).fill('Synthetic receiver '+width);await panel.getByLabel('Address',{exact:true}).fill('https://8.8.8.8/events');if(await panel.getByLabel('Client',{exact:true}).count())await panel.getByLabel('Client',{exact:true}).selectOption(created.value.id);
  let approvals=0;const countApproval=request=>{if(new URL(request.url()).pathname==='/api/automation/endpoints'&&request.method()==='POST')approvals++};page.on('request',countApproval);await panel.getByRole('button',{name:'Approve',exact:true}).click();assert.equal(approvals,0);const approved=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/automation/endpoints'&&r.request().method()==='POST');await panel.getByRole('button',{name:'Approve recipient',exact:true}).click();assert.equal((await approved).status(),201);assert.equal(approvals,1);page.off('request',countApproval);
  await panel.getByLabel('Private key',{exact:true}).waitFor();await panel.getByRole('button',{name:'Done',exact:true}).click();
  const incident=await runtime.request('/api/v1/incidents',{type:'declare',service:'synthetic-oncall-browser',title:'Synthetic browser incident '+width,summary:'Visible outbox failure',severity:'warning'},'',{authorization:'Bearer '+key,'idempotency-key':'synthetic-oncall-browser-'+width});assert.equal(incident.status,201);
  if(!await panel.getByRole('button',{name:'Send next now',exact:true}).isVisible())await panel.locator(':scope > details > summary').nth(2).click();
  let processed;do{const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/automation/dispatch'&&r.request().method()==='POST');await panel.getByRole('button',{name:'Send next now',exact:true}).click();const reply=await response;assert.equal(reply.status(),200);processed=(await reply.json()).processed;}while(processed);
  await page.reload();await panel.locator(':scope > details > summary').nth(2).click();await panel.getByText(/Triggered · Stopped/).first().waitFor();
  await panel.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');
  assert.equal(await panel.getByLabel('Private key',{exact:true}).count(),0);
  await panel.screenshot({path:join(proof,'automation-populated-'+width+'.png')});
  receiverStatus=200;
  const uncertain=await req('/api/command',{type:'assign-role',incident:incident.value.entity,revision:1,role:'scribe',member:owner.id,reason:'Unsigned receiver success is uncertain'});assert.equal(uncertain.status,200);
  do{const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/automation/dispatch'&&r.request().method()==='POST');await panel.getByRole('button',{name:'Send next now',exact:true}).click();const reply=await response;assert.equal(reply.status(),200);processed=(await reply.json()).processed;}while(processed);
  await page.reload();await panel.locator(':scope > details > summary').nth(2).click();await panel.getByText(/People changed · Unconfirmed/).first().waitFor();await panel.screenshot({path:join(proof,'automation-uncertain-'+width+'.png')});receiverStatus=403;

  const memberA=(await req('/api/members',{name:'synthetic-oncall-'+width+'@example.test',role:'responder',password:'synthetic-oncall-responder-password'})).value;
  const memberB=(await req('/api/members',{name:'synthetic-oncall-reassigned-'+width,role:'responder',password:'synthetic-oncall-responder-password'})).value;
  const machine=async(input,n)=>runtime.request('/api/v1/incidents',input,'',{authorization:'Bearer '+key,'idempotency-key':'synthetic-oncall-attribution-'+width+'-'+n});
  assert.equal((await machine({type:'transition',incident:incident.value.entity,revision:uncertain.value.revision,state:'acknowledged',member:memberA.id,summary:'Explicit machine responsibility'},1)).status,201);
  assert.equal((await machine({type:'reassign',incident:incident.value.entity,revision:uncertain.value.revision+1,member:memberB.id,reason:'Subsequent assignment'},2)).status,201);
  assert.equal((await req('/api/state')).value.incidents.find(i=>i.id===incident.value.entity).assignee,memberB.id);
  await page.goto(runtime.origin+'/incidents/'+encodeURIComponent(incident.value.entity));await page.locator('.timeline').getByText('Synthetic sending client '+width+' for Synthetic Browser Owner',{exact:true}).first().waitFor();const named=page.locator('.timeline .event').filter({has:page.locator('.named-responder').filter({hasText:memberA.name})});assert.equal(await named.count(),1);await named.getByText('Synthetic sending client '+width+' for Synthetic Browser Owner',{exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.timeline').screenshot({path:join(proof,'automation-machine-attribution-'+width+'.png')});
  const timelineAxe=await new AxeBuilder({page}).include('.timeline').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(timelineAxe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
  // The existing Archive screen refuses a source captured before label erasure.
  const email='synthetic-oncall-'+width+'@example.test',label=email+' automation',door=ownerDoor(runtime,cookie);
  const plan=await door.preview('opsgenie',JSON.stringify({users:{data:[{id:'synthetic-oncall-'+width,username:email,fullName:'synthetic-oncall-'+width}]}}));assert.equal(plan.status,200);assert.equal((await door.apply('opsgenie',plan.value)).status,200);
  assert.equal((await req('/api/automation/clients',{name:label,key:randomBytes(32).toString('hex'),services:['synthetic-oncall-browser'],permissions:['incidents:read']})).status,201);
  const oldArchive=(await req('/api/archive')).value;assert.equal((await req('/api/move-in/erase',{email,confirmation:'erase '+email})).status,200);
  const afterErasure=(await req('/api/state')).value;
  await page.goto(runtime.origin+'/settings/archive');await page.locator('.archive-restore > summary').click();await page.getByLabel('Choose archive JSON').setInputFiles({name:'synthetic-oncall-old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(oldArchive))});
  await page.getByLabel('Type REPLACE to confirm').fill('REPLACE');
  const refusal=page.waitForResponse(r=>r.url().endsWith('/api/restore')&&r.request().method()==='POST');await page.getByRole('button',{name:'Replace workspace with this archive',exact:true}).click();assert.equal((await refusal).status(),409);
  await page.getByRole('alert').waitFor();assert.deepEqual((await req('/api/state')).value,afterErasure);assert.ok(!JSON.stringify(afterErasure).includes(label));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(proof,'automation-erasure-refusal-'+width+'.png'),fullPage:true});
  const archiveAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(archiveAxe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);

  await page.goto(runtime.origin+'/incidents/'+encodeURIComponent(incident.value.entity));await page.locator('.timeline').getByText('Synthetic sending client '+width+' for Synthetic Browser Owner',{exact:true}).first().waitFor();assert.equal(await page.locator('.timeline .named-responder strong').innerText(),'Erased member','OC-053 post-erasure timeline reads Erased member');await page.locator('.timeline').screenshot({path:join(proof,'automation-erased-member-'+width+'.png')});
  await page.goto(runtime.origin+'/settings/integrations');await panel.locator(':scope > details > summary').nth(2).click();await panel.getByRole('heading',{name:'Outbox',exact:true}).waitFor();const panelAxe=await new AxeBuilder({page}).include('#response-api').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(panelAxe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
  assert.deepEqual(errors,[]);
  for(const [slug,anchor] of [['data','subject-erasure-fences'],['response-api','version-1-http-reference'],['audit','identity-and-content']]){const response=await page.goto(runtime.origin+'/docs/'+slug+'#'+anchor);assert.equal(response.status(),200);await page.locator('.docs-article').waitFor();await page.locator('#'+anchor).scrollIntoViewIfNeeded();if(slug==='response-api')await page.locator('.docs-body > p').filter({hasText:'The timeline attributes'}).scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(proof,'automation-docs-'+slug+'-'+width+'.png')});}
  await context.close();
  const denied=await browser.newContext({viewport:{width,height:1000}}),deniedPage=await denied.newPage();const login=await denied.request.post(runtime.origin+'/api/login',{headers:{origin:runtime.origin},data:{name:'Synthetic Viewer',password:'synthetic-oncall-viewer-password'}});assert.equal(login.status(),200);
  await deniedPage.goto(runtime.origin+'/settings/integrations');await deniedPage.locator('#response-api').getByText('An administrator manages clients, recipients and delivery failures.',{exact:true}).waitFor();assert.equal(await deniedPage.locator('#response-api').getByRole('button').count(),0);
  assert.equal((await denied.request.get(runtime.origin+'/api/automation')).status(),403);
  await deniedPage.screenshot({path:join(proof,'automation-denied-'+width+'.png'),fullPage:true});await denied.close();
 }
 console.log('PASS OC-053 API client saved guided policy editing and public responder acknowledgment, granted service read, pointer rotation/revocation, stale management refusal, outbox and permanent machine attribution at 1440; client screens at 1440 and 390');
}finally{await browser?.close();await runtime.close();}

}
