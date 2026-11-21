import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {lexer} from 'marked';
import {chromium} from '@playwright/test';
import {agentRuntime, agentReadSnapshot, assertAgentReadUnchanged} from '../tests/agent-door-runtime.mjs';
import {autonomousPolicy, heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

const toolName = 'oncall.schedules.update';
const contract = lexer(await readFile('CONTRACT.md', 'utf8'));
const rows = contract.filter(token => token.type === 'table' &&
  token.header.map(cell => cell.text).join('|') === 'Tool|Does|Core clauses|Risk class|Today')
  .flatMap(token => token.rows).filter(([tool]) => tool.text === String.fromCharCode(96) + toolName + String.fromCharCode(96));
assert.equal(rows.length, 1);
const clauses = rows[0][2].text.split(', ');
const classes = rows[0][3].text.match(/[a-z]+/g);
const scope = 'schedules:write';
const receipt = [];
const directory = process.env.ONCALL_POINT_PACKET;
const runtime = await agentRuntime({clock:null});
let browser;
try {
  const manifest = runtime.context.surface.tools.find(tool => tool.name === toolName);
  assert.deepEqual({classes, clauses, scope, readOnly:false}, {
    classes: manifest.classes, clauses: manifest.clauses, scope: manifest.scope, readOnly: manifest.readOnly
  });
  browser = await chromium.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
  const context = await browser.newContext({baseURL:runtime.origin, viewport:{width:1440, height:1000}});
  const page = await context.newPage();
  const browserOutbound = [];
  context.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== runtime.origin) browserOutbound.push(url.origin);
  });
  const readPaging = async () => {
    const response = await runtime.http('/api/paging/state');
    assert.equal(response.status, 200);
    return response.json();
  };
  for (const [policy, document] of [['autonomous', autonomousPolicy()], ['held', heldPolicy()]]) {
    await page.setViewportSize({width:1440, height:1000});
    const adopted = await runtime.adopt(document);
    assert.equal(adopted.status, 200);
    await adopted.body?.cancel();
    const before = await agentReadSnapshot(runtime);
    const paging = await readPaging();
    assert.ok(paging.schedules.some(schedule => schedule.id === 'agent-schedule'), 'Populated native schedule fixture');
    const listing = await runtime.mcp('tools/list');
    assert.equal(listing.status, 200);
    assert.equal(listing.result.nextCursor, undefined);
    const [listed, ...duplicates] = listing.result.tools.filter(tool => tool.name === toolName);
    assert.ok(listed);
    assert.deepEqual(duplicates, []);
    assert.deepEqual(listed._meta['com.runeditrun/classes'], classes);
    assert.deepEqual(listed._meta['com.runeditrun/clauses'], clauses);
    assert.equal(listed._meta['com.runeditrun/scope'], scope);
    assert.equal(listed.annotations.readOnlyHint, false);
    assert.match(listed.description, /exact digest returned by oncall\.schedules\.review/);
    assert.ok(listed.inputSchema.required.includes('digest'));
    const guide = await page.goto('/docs/agents');
    assert.equal(guide.status(), 200);
    const row = page.locator('.docs-article tr').filter({has:page.getByText(toolName, {exact:true})});
    await row.waitFor();
    const [shownTool, shownScope, shownClasses, shownChecks] = await row.locator('td').evaluateAll(cells =>
      cells.map(cell => [...cell.querySelectorAll('code')].map(code => code.textContent)));
    assert.deepEqual(shownTool, [toolName]);
    assert.deepEqual(shownScope, [scope]);
    assert.deepEqual(shownClasses, classes);
    assert.deepEqual(shownChecks, classes.flatMap(cls => [cls, 'tests/agent-door.mjs', 'schedule-update']));
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height:1000});
      await row.scrollIntoViewIfNeeded();
      await row.evaluate((element, width) => {
        const table = element.closest('.docs-table');
        element.scrollIntoView({block:'center', inline:'nearest'});
        const classesCell = element.cells[2];
        const needed = classesCell.getBoundingClientRect().right - table.getBoundingClientRect().right;
        table.scrollLeft = width === 390 ? Math.max(0, table.scrollLeft + needed + 12) : 0;
      }, width);
      await page.screenshot({path:directory+'/schedule-update-'+policy+'-'+width+'.png'});
    }
    const after = await agentReadSnapshot(runtime);
    assertAgentReadUnchanged(before, after);
    const mutationAudit = snap => snap.records.oc_admin_audit.filter(audit =>
      ['workspace', 'paging', 'handoff'].some(family => audit[family+'_before'] !== audit[family+'_after']));
    assert.deepEqual(mutationAudit(after), mutationAudit(before));
    assert.deepEqual(await readPaging(), paging);
    assert.equal(paging.paging, 'OFF');
    assert.deepEqual(await runtime.outboundRequests(), []);
    assert.deepEqual(browserOutbound, []);
    const observed = {policy, tool:listed.name, count:listing.result.tools.length, classes, clauses, scope,
      reviewDigestRequired:true, nativeState:'unchanged', mutationAudit:'unchanged', paging:'OFF and unchanged',
      workerOutbound:0, browserOutbound:0, guideWidths:[1440,390]};
    receipt.push(observed);
    console.log('PASS SURFACE-001 schedule update '+JSON.stringify(observed));
  }
  await writeFile(directory+'/schedule-update-observations.json', JSON.stringify(receipt, null, 2)+'\n');
} finally {
  try { await browser?.close(); } finally { await runtime.close(); }
}
