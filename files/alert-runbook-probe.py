from pathlib import Path

journey = Path('tests/product-browser-journey.mjs')
s = journey.read_text()
before = 'export async function alertSeverity(page,context,width) {'
assert s.count(before) == 1
s = s.replace(before, '''export async function alertSeverity(page,context,width,runbookProbe) {''')
anchor = " }\n await openWorkspaceSection(page,'alerts')\n await focusWorkspace(page)\n for(const severity of ['critical','warning','info']) {"
assert s.count(anchor) == 1
s = s.replace(anchor, " }\n if(runbookProbe) return observePreDeclarationRunbook(page,context,service,source,width,runbookProbe)\n await openWorkspaceSection(page,'alerts')\n await focusWorkspace(page)\n for(const severity of ['critical','warning','info']) {")
anchor = '// One core flow: concurrent declarations, a retry and a reload all keep one incident per alert.'
assert s.count(anchor) == 1
s = s.replace(anchor, '''async function observePreDeclarationRunbook(page,context,service,source,width,{snapshot,outbound,steps}) {
 const origin=new URL(page.url()).origin;
 const read=async path=>{
  const response=await context.request.get(path);
  assert.equal(response.status(),200);
  return response.json();
 };
 const browserOutbound=[];
 const declarations=[];
 const track=request=>{
  const url=new URL(request.url());
  if(url.origin!==origin)browserOutbound.push({origin:url.origin,path:url.pathname});
  if(request.method()==='POST'&&url.pathname==='/api/command')declarations.push(url.pathname);
 };
 const durableBefore=snapshot();
 assert.deepEqual(await outbound(),[]);
 page.on('request',track);
 try {
  const before=await read('/api/state');
  const saved=before.services.find(row=>row.id===service.id);
  assert.equal(saved.team??null,null,'the saved service has no private-team scope');
  assert.deepEqual(saved.runbook,steps,'protected service has the seeded order');
  const event=before.events.find(row=>row.source===source&&row.eventId==='warning-trigger');
  assert.equal(event.intent,'trigger');
  assert.equal(event.severity,'warning');
  const alert=before.alerts.find(row=>row.events.includes(event.id));
  assert.equal(alert.service,saved.id);
  assert.equal(alert.environment,saved.environment);
  assert.equal(alert.state,'active');
  assert.ok(!alert.suppressed);
  assert.ok(!before.incidents.some(row=>row.alerts.includes(alert.id)),'alert starts unlinked');
  const pagingBefore=await read('/api/paging/state');
  const card=page.getByRole('article',{name:'Alert details',exact:true});
  const runbook=card.locator('.alert-runbook');
  const declare=card.getByRole('button',{name:'Declare incident from alert',exact:true});
  await openWorkspaceSection(page,'alerts');
  await focusWorkspace(page);
  await page.locator('.alert-row').filter({hasText:event.title}).click();
  await expect(card.getByRole('heading',{name:event.title,exact:true})).toBeVisible();
  assert.equal(new URL(page.url()).pathname,'/alerts/'+encodeURIComponent(alert.id));
  await expect(runbook.getByRole('heading',{name:'Runbook',exact:true})).toBeVisible();
  assert.deepEqual(await runbook.locator('ol > li').allTextContents(),saved.runbook,'signed-in alert renders the exact stored order');
  await expect(declare).toBeVisible();
  await expect(declare).toBeEnabled();
  await expect(card.getByRole('link',{name:/^In incident /})).toHaveCount(0);
  const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';
  await mkdir(directory,{recursive:true});
  await page.waitForLoadState('networkidle');
  await page.screenshot({path:directory+'/oc023-runbook-'+width+'.png',fullPage:true});
  await page.setViewportSize({width:390,height:1000});
  await page.reload();
  await runbook.getByRole('heading',{name:'Runbook',exact:true}).waitFor();
  await declare.waitFor();
  const phoneDeclareEnabled=await declare.isEnabled();
  await page.waitForLoadState('networkidle');
  await page.screenshot({path:directory+'/oc023-runbook-390.png',fullPage:true});
  const after=await read('/api/state');
  assert.deepEqual(after,before,'protected native records and revision are unchanged');
  assert.ok(!after.incidents.some(row=>row.alerts.includes(alert.id)),'alert remains unlinked');
  assert.deepEqual(await read('/api/paging/state'),pagingBefore,'protected paging state is unchanged');
  assert.deepEqual(snapshot(),durableBefore,'all retained rows, including revisions and permanent audit, are unchanged');
  assert.deepEqual(await outbound(),[],'Worker attempted no outbound requests');
  assert.deepEqual(browserOutbound,[],'browser attempted no outbound requests');
  assert.deepEqual(declarations,[],'the available action was not taken');
  console.log('PROBE OC-023 acceptance 1: '+JSON.stringify({door:'signed-in Alert details',alert:event.title,service:saved.name,serviceScope:'workspace public',state:alert.state,runbook:steps,widths:[width,390],declareVisible:true,declareEnabledAtAssertionWidth:true,phoneDeclareEnabled,declareRequests:declarations.length,linkedAfter:false,nativeStateUnchanged:true,revisionUnchanged:true,permanentAuditUnchanged:true,retainedTables:Object.keys(durableBefore).length,pagingUnchanged:true,workerOutbound:0,browserOutbound:browserOutbound.length}));
 } finally {
  page.off('request',track);
  await page.setViewportSize({width,height:1000});
 }
}

''' + anchor)
journey.write_text(s)

entry = Path('tests/product-browser.mjs')
s = entry.read_text()
s = s.replace('import {importedEmailBrowser,productBrowserJourney,','import {alertSeverity,importedEmailBrowser,productBrowserJourney,')
assert s.count("'workspace-links','alert-run'") == 4
s = s.replace("'workspace-links','alert-run'", "'workspace-links','alert-run','alert-runbook'")
anchor = " if(focused==='workspace-links'){"
assert s.count(anchor) == 1
s = s.replace(anchor, ''' if(focused==='alert-runbook'){
  const request=async(path,data)=>{
   const response=data===undefined?await context.request.get(path):await context.request.post(path,{headers:{origin:worker.origin},data});
   assert.equal(response.status(),200);
   return response.json();
  };
  const session=await request('/api/session');
  assert.equal(session.member.role,'admin');
  const steps=['Check checkout error rates and payment latency.','Confirm the current checkout deploy and rollback owner.','Record a healthy checkout before clearing the alert.'];
  await request('/api/command',{type:'service',id:'synthetic-oncall-288',name:'Checkout',environment:'production',owner:session.member.id,runbook:steps,pager:''});
  await alertSeverity(page,context,1440,{...triageProof,steps});
 }
''' + anchor)
s = s.replace("console.log(focused==='alert-run'?", "console.log(focused==='alert-runbook'?'Emitted Worker signed-in alert runbook observation passed':focused==='alert-run'?")
entry.write_text(s)
