import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {expect} from '@playwright/test';
import {openIncidentAction} from './keyboard.mjs';

// Part of the production Worker product journey, also selectable while building.
export async function copiedRunbooksBrowser(page, context) {
  const origin = new URL(page.url()).origin;
  const directory = process.env.ONCALL_BROWSER_EVIDENCE ?? 'evidence/browser';
  await mkdir(directory, {recursive:true});
  const api = async (path, data, status = 200) => {
    const response = data === undefined ? await context.request.get(path)
      : await context.request.post(path, {headers:{origin}, data});
    assert.equal(response.status(), status, path);
    return response.json();
  };
  const capture = async name => {
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height:1000});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' fits the viewport');
      await page.screenshot({path:`${directory}/oc005-${name}-${width}.png`, fullPage:true});
    }
    await page.setViewportSize({width:1440, height:1000});
  };
  const {member} = await api('/api/session');
  const responder = await api('/api/members', {
    name:'Payment responder', role:'responder', password:'synthetic-oncall-506',
  }, 201);
  const original = 'Check payment authorization against the gateway dashboard.';
  const revised = 'Check the replacement payment gateway.';
  const service = await api('/api/command', {
    type:'service', id:'synthetic-oncall-505', name:'Payment recovery', environment:'production',
    owner:member.id, runbook:[original], pager:'',
  });
  const declared = await api('/api/command', {
    type:'declare', service:service.id, title:'Payment authorization regression', severity:'critical',
    summary:'Customers cannot authorize payments after the gateway change.',
  });
  const retained = async () => (await api('/api/state')).incidents.find(item => item.id === declared.id);
  await page.goto(origin + '/settings/services/' + service.id);
  const edited = page.waitForResponse(response => new URL(response.url()).pathname === '/api/command'
    && response.request().postDataJSON()?.field === 'runbook');
  await page.getByLabel('Runbook steps (one per line)', {exact:true}).fill(revised);
  await page.getByLabel('Runbook steps (one per line)', {exact:true}).press('Tab');
  assert.equal((await edited).status(), 200);
  await page.reload();
  await expect(page.getByLabel('Runbook steps (one per line)', {exact:true})).toHaveValue(revised);
  await capture('service-edit');

  await page.goto(origin + '/incidents/' + declared.id);
  const runbook = page.getByRole('region', {name:'Runbook', exact:true});
  await expect(runbook.getByRole('checkbox', {name:original, exact:true})).not.toBeChecked();
  assert.equal(await runbook.getByText(revised, {exact:true}).count(), 0);
  await runbook.getByRole('checkbox', {name:original, exact:true}).check();
  await expect.poll(async () => (await retained()).runbook).toEqual([{text:original, done:true}]);
  await page.reload();
  await expect(runbook.getByRole('checkbox', {name:original, exact:true})).toBeChecked();
  await capture('copied-steps');

  await openIncidentAction(page, 'Follow-ups');
  const followups = page.getByRole('dialog', {name:'Follow-ups', exact:true});
  const title = 'Verify authorization recovery for existing customer accounts';
  await followups.getByLabel('Improvement action', {exact:true}).fill(title);
  await followups.getByLabel('Owner', {exact:true}).selectOption(responder.id);
  await followups.getByLabel('Due date (UTC)', {exact:true}).fill('2026-12-04');
  await followups.getByRole('button', {name:'Add follow-up', exact:true}).click();
  const item = followups.locator('.followup-item').filter({hasText:title});
  await expect(item.getByText('Open', {exact:true})).toBeVisible();
  const unfinished = (await retained()).actions.find(action => action.title === title);
  assert.equal(unfinished.owner, responder.id);
  assert.equal(unfinished.due, '2026-12-04');
  assert.equal(unfinished.done, false);
  assert.equal(unfinished.evidence, '');
  await expect(item).toContainText(responder.name);
  await capture('open-work');
  await followups.getByRole('button', {name:'Close', exact:true}).click();

  const next = page.getByRole('region', {name:'Next step', exact:true});
  await next.getByRole('button', {name:'Acknowledge', exact:true}).click();
  await next.getByRole('button', {name:'Mark mitigating', exact:true}).click();
  await next.getByRole('button', {name:'Mark recovered', exact:true}).click();
  await next.getByLabel('Recovery evidence URL', {exact:true}).fill('https://example.test/payment-recovery');
  await next.getByRole('button', {name:'Mark recovered', exact:true}).click();
  await next.getByRole('button', {name:'Resolve', exact:true}).click();
  await next.getByLabel('Resolution summary', {exact:true}).fill('Existing accounts authorize payments successfully after the rollback.');
  await next.getByRole('button', {name:'Resolve', exact:true}).click();
  await expect.poll(async () => (await retained()).state).toBe('resolved');
  await page.reload();
  await expect(runbook.getByRole('checkbox', {name:original, exact:true})).toBeChecked();
  await openIncidentAction(page, 'Follow-ups');
  await expect(item.getByText('Open', {exact:true})).toBeVisible();
  assert.deepEqual((await retained()).actions.find(action => action.id === unfinished.id), unfinished);
  await capture('resolved-open-work');

  // Finish a different action; the unresolved customer-account check stays open.
  await followups.getByText('Add a follow-up', {exact:true}).click();
  await followups.getByLabel('Improvement action', {exact:true}).fill('Record the verified rollback');
  await followups.getByLabel('Owner', {exact:true}).selectOption(member.id);
  await followups.getByLabel('Due date (UTC)', {exact:true}).fill('2026-12-05');
  await followups.getByRole('button', {name:'Add follow-up', exact:true}).click();
  const completed = followups.locator('.followup-item').filter({hasText:'Record the verified rollback'});
  await completed.getByLabel('Completion evidence', {exact:true}).fill('https://example.test/verified-rollback');
  await completed.getByRole('button', {name:'Add evidence', exact:true}).click();
  await expect(completed.getByText('Awaiting acceptance', {exact:true})).toBeVisible();
  await completed.getByLabel('Reason for accepting completion', {exact:true}).fill('Reviewed the rollback and its successful payment evidence.');
  await completed.getByRole('button', {name:'Accept follow-up completion', exact:true}).click();
  await expect(completed.getByText('Complete', {exact:true})).toBeVisible();
  assert.deepEqual((await retained()).actions.find(action => action.id === unfinished.id), unfinished);
  await capture('evidenced-completion');

  await page.goto(origin + '/reviews/' + declared.id);
  const review = page.getByRole('dialog', {name:declared.title, exact:true});
  const firstReview = 'The gateway change broke authorization for existing accounts; rollback restored payments.';
  const writeReview = async text => {
    const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/command'
      && response.request().postDataJSON()?.type === 'review');
    await review.getByLabel('Review', {exact:true}).fill(text);
    await review.getByLabel('Review', {exact:true}).press('Tab');
    assert.equal((await saved).status(), 200);
    await page.reload();
    await expect(review.getByLabel('Review', {exact:true})).toHaveValue(text);
    assert.equal((await retained()).review, text);
  };
  await writeReview(firstReview);
  await writeReview(firstReview + ' The existing-account follow-up remains assigned and open.');
  assert.deepEqual((await retained()).actions.find(action => action.id === unfinished.id), unfinished);
  await capture('editable-review');
  console.log('PROBE OC-005 1: service form edit -> original copied checklist; owned dated open work survives resolution; evidenced completion and edited resolved review survive reload');
}
