import {localWorker} from './worker.mjs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import {expect} from '@playwright/test';

// Extend the existing source journey through the six owner-facing alert actions.
export async function ownerAlertsBrowser(page, context) {
  const worker = await localWorker({}, {outboundLedger:true});
  let ownContext;
  try {
    const setup = await worker.request('/api/setup', {name:'Synthetic alert owner',password:randomBytes(24).toString('hex')});
    assert.equal(setup.status,200);
    ownContext = await context.browser().newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},extraHTTPHeaders:{connection:'close'}});
    await ownContext.addCookies(setup.headers.getSetCookie().map(line => {const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:worker.origin};}));
    const ownPage = await ownContext.newPage(), errors=[];ownPage.on('pageerror',error=>errors.push(error.message));
    await walkOwnerAlerts(ownPage,ownContext,worker);
    assert.deepEqual(errors,[],'owner alert journey has no application errors');
  } finally {await ownContext?.close();await worker.close();}
}
async function walkOwnerAlerts(page, context, worker) {
  const origin = worker.origin, directory = process.env.ONCALL_BROWSER_EVIDENCE ?? 'evidence/browser';
  await mkdir(directory, {recursive: true});
  const call = async (path, data, status = 200) => {
    const response = data === undefined ? await context.request.get(path) : await context.request.post(path, {headers: {origin}, data});
    assert.equal(response.status(), status, `${path}: ${response.status()}`);return response.json();
  };
  const screenshots = [], proof = async label => {
    // Assertions use desktop width; the phone is presentation proof only.
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ' fits desktop');
    const violations = (await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations.filter(row => ['serious','critical'].includes(row.impact));
    assert.deepEqual(violations, [], label + ' has no serious or critical accessibility findings');
    for (const width of [1440,390]) {await page.setViewportSize({width,height:1000});const name = `owner-${label}-${width}.png`;await page.screenshot({path: `${directory}/${name}`, fullPage:true, mask:[page.locator('.one-time-secret input')]});screenshots.push(name);}
    await page.setViewportSize({width:1440,height:1000});
  };
  await page.goto(origin+'/alerts');await page.locator('.alert-list').waitFor();assert.equal((await call('/api/state')).alerts.length,0);await proof('empty-alerts');
  await page.goto(origin+'/settings/integrations/new');await page.locator('[aria-disabled=true]').filter({hasText:'Email'}).waitFor();assert.equal(await page.getByRole('link',{name:'Email',exact:true}).count(),0);await proof('integration-choices');
  const owner = (await call('/api/session')).member;
  const primary = await call('/api/members', {name:'Synthetic primary', role:'responder', password:randomBytes(24).toString('hex')}, 201);
  const backup = await call('/api/members', {name:'Synthetic backup', role:'responder', password:randomBytes(24).toString('hex')}, 201);
  const service = await call('/api/command', {type:'service', id:'synthetic-owner-support', name:'Brightwell Support', environment:'test', owner:owner.id, runbook:['Check the service'], pager:''});
  const rotation = member => ({anchorLocal:'2026-01-01T09:00',periodDays:7,members:[member.id],ambiguity:'earlier'});
  const schedule = {id:'synthetic-owner-rota', name:'Synthetic support rota', service:service.id, revision:0, timezone:'Etc/UTC', validFrom:'2026-01-01T00:00:00.000Z', validUntil:null, primary:rotation(primary), backup:rotation(backup), overrides:[]};
  await call('/api/paging/schedules', schedule);
  const before = await call('/api/state');
  await page.goto(origin+'/alerts');if(await page.getByLabel('Test alert service',{exact:true}).count())await page.getByLabel('Test alert service',{exact:true}).selectOption(service.id);
  const send = async root => {const pending=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/test-alert'&&response.request().method()==='POST');await root.getByRole('button',{name:'Send a test alert',exact:true}).click();const response=await pending;assert.equal(response.status(),200);await expect(root.getByRole('button',{name:'Send a test alert',exact:true})).toBeEnabled();return response.json();};
  const raised = await send(page.locator('.test-alert'));assert.ok(raised.alert);assert.equal(raised.service,service.name);
  await page.locator('.test-alert [role=status] a').click();
  const alertPage = page.getByRole('article',{name:'Alert details',exact:true});
  await expect(alertPage.getByRole('region',{name:'On call now'})).toContainText(primary.name);await expect(alertPage.getByRole('region',{name:'On call now'})).toContainText(backup.name);
  await alertPage.getByRole('button',{name:'Take it',exact:true}).click();await alertPage.getByRole('button',{name:'Taken by you',exact:true}).waitFor();
  assert.equal((await call('/api/state')).alerts.find(alert=>alert.id===raised.alert).owner,owner.id);
  await proof('alert');
  await alertPage.getByRole('button',{name:'Declare incident from alert',exact:true}).click();await page.locator('.incident-page').waitFor();
  const incidentId=(await call('/api/state')).incidents.find(incident=>incident.alerts.includes(raised.alert)).id;
  const incidentPage=page.locator('.incident-page');
  await expect(incidentPage.getByRole('region',{name:'On call now'})).toContainText(primary.name);
  await incidentPage.getByRole('button',{name:'Take it',exact:true}).click();await incidentPage.getByRole('button',{name:'Taken by you',exact:true}).waitFor();
  assert.equal((await call('/api/state')).incidents.find(incident=>incident.id===incidentId).assignee,owner.id);
  await incidentPage.getByRole('button',{name:'Acknowledge',exact:true}).click();await page.locator('.incident-state.state-acknowledged').waitFor();
  await incidentPage.getByRole('button',{name:'Resolve',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Resolve',exact:true}).click();
  await expect(dialog.getByLabel('What fixed it?',{exact:true})).toHaveAttribute('aria-invalid','true');assert.equal((await call('/api/state')).incidents.find(incident=>incident.id===incidentId).state,'acknowledged');
  await dialog.getByLabel('What fixed it?',{exact:true}).fill('Restored the worker connection');await expect(dialog.getByLabel('Close the alert too',{exact:true})).toBeChecked();await proof('resolve');
  await dialog.getByRole('button',{name:'Resolve',exact:true}).click();await page.locator('.incident-state.state-resolved').waitFor();
  let state=await call('/api/state'), incident=state.incidents.find(row=>row.id===incidentId), alert=state.alerts.find(row=>row.id===raised.alert);
  assert.equal(incident.recovery,'');assert.equal(alert.coordination.state,'closed');assert.ok(incident.timeline.some(entry=>entry.kind==='recovery-at-resolution'&&entry.lifecycle.to==='recovered'));
  const active=state.alerts.filter(alert=>alert.state==='active'&&alert.coordination?.state!=='closed').length;
  await page.goto(origin+'/alerts');await expect(page.locator('a[href="/alerts"] .nav-count').first()).toHaveText(String(active));
  const closed=page.locator('.alert-row[href="/alerts/'+raised.alert+'"]');assert.equal(await closed.locator('xpath=..').getByRole('heading',{name:'Closed',exact:true}).count(),1);
  await page.goto(origin+'/incidents/'+incidentId);await page.getByRole('button',{name:'Incident actions',exact:true}).click();await page.getByRole('menuitem',{name:'Reopen',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Why?',{exact:true}).fill('The same error came back');await proof('reopen');await page.getByRole('dialog').getByRole('button',{name:'Reopen',exact:true}).click();await page.locator('.incident-state.state-acknowledged').waitFor();await expect(page.getByRole('dialog')).toHaveCount(0);
  incident=(await call('/api/state')).incidents.find(row=>row.id===incidentId);assert.equal(incident.timeline.at(-1).kind,'reopen');assert.equal(incident.timeline.at(-1).actor,owner.id);assert.ok(incident.timeline.at(-1).text.includes(owner.name)&&incident.timeline.at(-1).text.includes('The same error came back'));
  await proof('reopened');
  // Declining linked-alert closure leaves it active; its own Close alert still works.
  await page.goto(origin+'/alerts');if(await page.getByLabel('Test alert service',{exact:true}).count())await page.getByLabel('Test alert service',{exact:true}).selectOption(service.id);const standalone=await send(page.locator('.test-alert'));
  await page.goto(origin+'/alerts/'+standalone.alert);await page.getByRole('button',{name:'Declare incident from alert',exact:true}).click();await page.locator('.incident-page').waitFor();
  const secondIncident=(await call('/api/state')).incidents.find(incident=>incident.alerts.includes(standalone.alert));
  await page.getByRole('button',{name:'Resolve',exact:true}).click();await dialog.getByLabel('What fixed it?',{exact:true}).fill('Restarted the sample service');await dialog.getByLabel('Close the alert too',{exact:true}).uncheck();await dialog.getByRole('button',{name:'Resolve',exact:true}).click();await page.locator('.incident-state.state-resolved').waitFor();
  state=await call('/api/state');assert.equal(state.alerts.find(alert=>alert.id===standalone.alert).coordination?.state,undefined);
  await page.goto(origin+'/alerts/'+standalone.alert);await page.getByRole('button',{name:'Close alert',exact:true}).click();await expect(page.locator('.alert-meta')).toContainText('Closed');assert.equal((await call('/api/state')).alerts.find(alert=>alert.id===standalone.alert).coordination.state,'closed');
  await page.goto(origin+'/incidents/'+secondIncident.id);await page.getByRole('button',{name:'Reopen',exact:true}).click();await dialog.getByRole('button',{name:'Reopen',exact:true}).click();await page.locator('.incident-state.state-declared').waitFor();
  // Newly created integrations expose the same session-only test without opening source settings.
  await page.goto(origin+'/settings/integrations/new/events');await page.getByLabel('Name',{exact:true}).fill('Synthetic owner integration');await page.getByRole('button',{name:'Create source',exact:true}).click();
  await page.getByRole('region',{name:'Created credential'}).waitFor();await proof('created-integration');const createdTest=await send(page.locator('.test-alert'));assert.ok(createdTest.alert);assert.equal(createdTest.service,service.name);
  // Optional recovery evidence remains optional through archive validation, not just the form.
  await call('/api/archive');
  const anonymous=await worker.request('/api/test-alert',{service:service.id});assert.equal(anonymous.status,401);
  const viewerPassword=randomBytes(24).toString('hex'), viewer=await call('/api/members',{name:'Synthetic alert viewer',role:'viewer',password:viewerPassword},201),viewerLogin=await worker.request('/api/login',{name:viewer.name,password:viewerPassword});assert.equal((await worker.request('/api/test-alert',{service:service.id},viewerLogin.cookie)).status,403);
  const revoked=await worker.request('/api/login',{name:viewer.name,password:viewerPassword});await worker.request('/api/logout',{},revoked.cookie);assert.equal((await worker.request('/api/test-alert',{service:service.id},revoked.cookie)).status,401);
  const after=await call('/api/state');assert.equal((await worker.outboundRequests()).length,0,'test, closure and reopen never page or send outbound requests');assert.equal(after.alerts.length-before.alerts.length,3);assert.equal((await call('/api/paging/state')).paging,'OFF');
  await writeFile(`${directory}/owner-alerts-receipt.json`,JSON.stringify({assertionWidth:1440,screenshotWidths:[1440,390],screenshots,items:{D4:'session test on chosen service',D5:'source journey proves fresh identities and explicit same-alert options',D6:'live primary and backup; one-click alert and incident ownership',D7:'required inline note; no link; recovery recorded',D8:'default linked closure, explicit opt-out, direct alert closure; list/nav refresh',D9:'menu and button; optional reason; attributed prior-state restoration'},newAlerts:3,anonymousRefused:true,viewerRefused:true,revokedRefused:true,archiveAccepted:true,reopenDialogDismissed:true,paging:'OFF'},null,2)+'\n');
}
