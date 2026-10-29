import {autonomousCoordination} from './agent-policy-fixture.mjs';
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {localWorker,ownerDoor} from './worker.mjs'
import {localPart,mail,recoveryRules} from './email-fixtures.mjs'
// triage-bulk: part of this public journey.
export async function triageBulkCompletion(){
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};

 const w=await localWorker({}, {clock:true});
 try{
  const setup=await w.request('/api/setup',{name:'synthetic-oncall-600',password:'synthetic-oncall-600-password'});ok(setup);let cookie=setup.cookie;
  const req=(path,input)=>w.request(path,input,cookie),state=async()=>ok(await req('/api/state'));
  const service=ok(await req('/api/command',{type:'service',id:'synthetic-oncall-600',name:'Synthetic bulk service',environment:'test',owner:setup.value.member.id,runbook:[],pager:''}));
  const declare=async n=>ok(await req('/api/command',{type:'declare',service:service.id,title:'Synthetic bulk incident '+n,severity:'warning',summary:'Human response evidence'}));
  const bulk=async input=>{let result;do{result=await req('/api/triage/bulk',input);}while(result.status===200&&result.value.remaining>0&&!result.value.interrupted);return result;};
  const item=i=>({id:i.id,revision:i.revision,...(i.kind?{kind:i.kind}:{})});
  let a=await declare(1),b=await declare(2),target=await declare(3),c=await declare(4);
  const acknowledgedIncidents=ok(await bulk({operationId:'synthetic-oncall-600-ack',action:'acknowledge',reason:'Take responsibility for the selected incidents',items:[a,b].map(item)}));assert.ok(acknowledgedIncidents.results.every(r=>r.ok),JSON.stringify(acknowledgedIncidents));
  [a,b]=(await state()).incidents.filter(i=>[a.id,b.id].includes(i.id));
  const snooze={operationId:'synthetic-oncall-600-snooze',action:'snooze',minutes:15,reason:'Hold investigation while the dependency recovers',items:[a,b].map(item),confirmedCount:2};
  const snoozed=ok(await bulk(snooze));assert.ok(snoozed.results.every(r=>r.ok),JSON.stringify(snoozed));assert.deepEqual(ok(await bulk(snooze)),snoozed);
  for(const i of (await state()).incidents.filter(i=>[a.id,b.id].includes(i.id))){assert.equal(i.deadlines.filter(d=>d.state==='pending'&&d.kind==='snooze').length,1);assert.equal(i.timeline.filter(e=>e.operationId===snooze.operationId).length,1);}
  [a,b]=(await state()).incidents.filter(i=>[a.id,b.id].includes(i.id));
  const merge={operationId:'synthetic-oncall-600-merge',action:'merge',target:target.id,targetRevision:target.revision,reason:'One response owns the common dependency failure',items:[a,c,b].map(item),confirmedCount:3};
  ok(await req('/api/command',{type:'note',incident:c.id,revision:c.revision,text:'Make just this selected source stale'}));
  const merged=ok(await bulk(merge));assert.equal(merged.results.filter(r=>r.ok).length,2);assert.equal(merged.results.filter(r=>!r.ok).length,1);assert.match(merged.results.find(r=>r.id===c.id).error,/changed/i);
  assert.deepEqual(ok(await bulk(merge)),merged,'merge replay preserves original per-item outcomes and target history');
  const afterMerge=await state();for(const id of [a.id,b.id]){assert.equal(afterMerge.incidents.find(i=>i.id===id).mergedInto.target,target.id);assert.ok(afterMerge.incidents.find(i=>i.id===id).timeline.some(e=>e.operationId===merge.operationId));}
  assert.equal(afterMerge.incidents.find(i=>i.id===target.id).timeline.filter(e=>e.operationId===merge.operationId).length,2);ok(await req('/api/archive'));
  const viewer=ok(await req('/api/members',{name:'synthetic-oncall-601',role:'viewer',password:'synthetic-oncall-601-password'}),201),viewerLogin=await w.request('/api/login',{name:viewer.name,password:'synthetic-oncall-601-password'});ok(viewerLogin);
  const key=randomBytes(32).toString('hex');ok(await req('/api/sources',{id:'synthetic-oncall-600',key,scopes:[service.id]}));
  const signal=n=>({source:'synthetic-oncall-600',eventId:'synthetic-oncall-'+(1000+n),service:service.id,environment:'test',key:'synthetic-oncall-'+(1000+n),generation:'synthetic-oncall-'+(1000+n),intent:'trigger',severity:'warning',title:'Synthetic bulk scale',observedAt:new Date().toISOString(),evidence:''});
  const ingest=async input=>ok(await w.request('/api/ingress/synthetic-oncall-600',input,undefined,{authorization:'Bearer '+key}),201);
  const admitted=Array.from({length:6},(_,n)=>signal(n));
  for(const event of admitted)await ingest(event);
  // Restore real admitted records without materializing an optional revision.
  const revisionless=ok(await req('/api/archive'));
  assert.ok(revisionless.alerts.every(alert=>!Object.hasOwn(alert,'revision')));
  const heldCheckpoint=ok(await req('/api/recovery/checkpoint'));
  const heldRestore=await req('/api/recovery/restore',{mode:'replace',checkpoint:heldCheckpoint});ok(heldRestore);cookie=heldRestore.cookie;
  assert.deepEqual((await state()).alerts,revisionless.alerts,'strict restore preserves revision-less alerts byte for byte');
  const firstHeld=revisionless.alerts[0],editPath='/api/urgency/alerts/'+firstHeld.id;
  const firstEdit={revision:firstHeld.urgencyRevision,urgency:'high',reason:'Synthetic bulk responder confirms impact'};
  const changed=ok(await req(editPath,firstEdit));assert.equal(changed.revision,2,'first change advances the implicit initial revision 1');
  assert.equal(changed.urgencyRevision,firstEdit.revision+1);
  const beforeStale=ok(await req('/api/archive'));ok(await req(editPath,{...firstEdit,urgency:'low'}),409);
  assert.deepEqual(ok(await req('/api/archive')),beforeStale,'stale second write preserves every record');
  ok(await req('/api/sources',{id:'synthetic-oncall-600',key,scopes:[service.id]}));
  ok(await w.request('/api/login',{name:viewer.name,password:'synthetic-oncall-601-password'}),401);
  ok(await req('/api/password',{member:viewer.id,password:'synthetic-oncall-601-password'}));
  const restoredViewer=await w.request('/api/login',{name:viewer.name,password:'synthetic-oncall-601-password'});ok(restoredViewer);viewerLogin.cookie=restoredViewer.cookie;
  console.log('PASS held alert revisions: absent through strict restore, first human change advances implicit revision 1 to 2, stale second write refuses 409 without mutation');
  const list=async query=>{let page=ok(await req('/api/triage?'+new URLSearchParams({...query,limit:'100'}))),items=[...page.items],revision=page.workspaceRevision;while(page.nextCursor){page=ok(await req('/api/triage?'+new URLSearchParams({...query,limit:'100',cursor:page.nextCursor})));items.push(...page.items);}return {items,revision};};
  let matching=await list({kind:'alerts',q:'Synthetic bulk scale',status:'open'});assert.equal(matching.items.length,admitted.length);
  const incidentCount=(await state()).incidents.length;
  const selectedItems=matching.items.slice(0,2).map(item);
  const selected={operationId:'synthetic-oncall-600-selected',action:'resolve',items:selectedItems,confirmedCount:selectedItems.length};
  ok(await req('/api/triage/bulk',{...selected,confirmedCount:selected.confirmedCount-1}),409);
  const denied=ok(await w.request('/api/triage/bulk',{...selected,operationId:'synthetic-oncall-600-denied'},viewerLogin.cookie));assert.ok(denied.results.every(r=>!r.ok));
  const selectedResult=ok(await bulk(selected));assert.equal(selectedResult.results.length,selected.items.length);assert.ok(selectedResult.results.every(r=>r.ok&&r.kind==='alert'&&r.revision===selected.items.find(i=>i.id===r.id).revision+1));assert.deepEqual(ok(await bulk(selected)),selectedResult);
  matching=await list({kind:'alerts',q:'Synthetic bulk scale',status:'open'});assert.equal(matching.items.length,admitted.length-selected.items.length);
  const all={operationId:'synthetic-oncall-600-all',action:'resolve',items:matching.items.map(item),allMatching:true,query:{kind:'alerts',q:'Synthetic bulk scale',status:'open'},confirmedCount:matching.items.length,workspaceRevision:matching.revision};
  ok(await req('/api/triage/bulk',{...all,confirmedCount:all.confirmedCount-1}),409);
  const matchingResult=ok(await bulk(all));assert.equal(matchingResult.results.length,all.items.length);assert.ok(matchingResult.results.every(r=>r.ok&&r.revision===all.items.find(i=>i.id===r.id).revision+1));assert.deepEqual(ok(await bulk(all)),matchingResult);
  assert.equal((await list({kind:'alerts',q:'Synthetic bulk scale',status:'open'})).items.length,0);assert.equal((await state()).incidents.length,incidentCount,'closing alert-only items creates no human incident or recovery summary');
  for(const alert of (await state()).alerts){assert.equal(alert.state,'active','human resolution never fabricates source recovery');assert.equal(alert.coordination.state,'closed');assert.equal(alert.obligation.outcome,'stopped by human resolution');assert.equal(alert.coordination.history.length,1);}
  // A changed source receipt invalidates just its alert's selection revision.
  await ingest(signal(1500));await ingest(signal(1501));let fresh=await list({kind:'alerts',status:'open'}),stale=fresh.items[0];
  const original=(await state()).alerts.find(a=>a.id===stale.id),latest=signal(2000);latest.key=original.key;latest.generation=original.generation;await ingest(latest);
  const mixed=ok(await bulk({operationId:'synthetic-oncall-600-mixed',action:'acknowledge',items:fresh.items.map(item),confirmedCount:2,reason:'Take responsibility for current alerts'}));assert.equal(mixed.results.filter(r=>r.ok).length,1);assert.equal(mixed.results.filter(r=>!r.ok).length,1);
  const acknowledged=(await list({kind:'alerts',status:'acknowledged'})).items[0];
  ok(await bulk({operationId:'synthetic-oncall-600-alert-snooze',action:'snooze',items:[item(acknowledged)],confirmedCount:1,minutes:15,reason:'Wait for the dependency owner'}));
  const snoozedAlert=(await state()).alerts.find(a=>a.id===acknowledged.id);assert.ok(Number.isFinite(Date.parse(snoozedAlert.coordination.snoozeDue)));assert.match(snoozedAlert.coordination.history.at(-1).text,/not sent \(no timer\)/);
  const unresolved=(await list({kind:'alerts',status:'declared'})).items[0],heldAlert=(await state()).alerts.find(a=>a.id===unresolved.id),rollback={operationId:'synthetic-oncall-600-rollback',action:'resolve',items:[item(unresolved)],confirmedCount:1};
  w.sql("CREATE TRIGGER synthetic_bulk_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='triage.resolve' AND EXISTS(SELECT 1 FROM oc_alerts WHERE id='"+unresolved.id+"' AND json_extract(data,'$.coordination.state')='closed') BEGIN SELECT RAISE(ABORT,'synthetic-oncall-600-audit'); END");
  try{const failed=ok(await bulk(rollback));assert.equal(failed.interrupted,true);assert.deepEqual((await state()).alerts.find(a=>a.id===unresolved.id),heldAlert);assert.deepEqual((await state()).triage.find(r=>r.id===rollback.operationId).results,[]);}finally{w.sql('DROP TRIGGER synthetic_bulk_audit');}
  assert.equal(ok(await bulk(rollback)).results[0].ok,true);
  const archive=ok(await req('/api/archive'));assert.ok(archive.triage.some(r=>r.id===merge.operationId));
  const checkpoint=ok(await req('/api/recovery/checkpoint'));
  const restored=await req('/api/recovery/restore',{mode:'replace',checkpoint});ok(restored);cookie=restored.cookie;assert.deepEqual((await state()).alerts,archive.alerts,'native restore retains every closed state, assignee, snooze record, revision and shared operation history');
  await w.stop();await w.start();const login=await w.request('/api/login',{name:'synthetic-oncall-600',password:'synthetic-oncall-600-password'});ok(login);cookie=login.cookie;assert.deepEqual((await state()).alerts,archive.alerts);
  console.log('PASS OC-079 public bulk completion: revisioned incident snooze and multi-source merge, independent stale refusal and exact replay, attributed atomic merge history, selected and confirmed matching alert-only closes, unchanged source recovery/incident semantics, viewer denial, source-revision fencing, no-timer alert snooze, per-item audit rollback/retry and full archive/restart custody. Paging OFF.');
 }finally{await w.close();}
}



await triageBulkCompletion();

// One storm journey through emitted Worker/D1 HTTP: query, coordinate and restore.
const w = await localWorker({INBOUND_EMAIL_DOMAIN: 'inbound.example.test'});
const passwords = {owner: randomBytes(24).toString('hex'), scribe: randomBytes(24).toString('hex'), viewer: randomBytes(24).toString('hex')};
const ok = (r, status = 200) => {assert.equal(r.status, status, JSON.stringify(r.value)); return r.value;};
try {
  const setup = await w.request('/api/setup', {name: 'Storm commander', password: passwords.owner});
  const cookie = setup.cookie; ok(setup);
  let continuations = 0;
  const req = async (path, data) => {
    let response;
    do {response = await w.request(path, data, cookie); if (response.value.remaining > 0) continuations++;}
    while (response.status === 200 && response.value.remaining > 0 && !response.value.interrupted);
    return response;
  };
  const actor = ok(await req('/api/session')).member;
  const service = ok(await req('/api/command', {type: 'service', name: 'Payments', environment: 'production', owner: actor.id, runbook: ['Inspect queue pressure'], pager: ''}));
  const backup = ok(await req('/api/members', {name: 'Response scribe', role: 'responder', password: passwords.scribe}), 201);
  const incidents = [];
  for (let n = 0; n < 50; n++) incidents.push(ok(await req('/api/command', {type: 'declare', service: service.id, severity: n < 40 ? 'critical' : 'warning', title: `Payment processing ${n}`, summary: 'Queue backlog with customer checkout delays'})));
  let page = ok(await req('/api/triage?q=backlog&service=' + service.id + '&limit=25'));
  assert.equal(page.total, 50); assert.equal(page.items.length, 25);
  const next = ok(await req('/api/triage?q=backlog&service=' + service.id + '&limit=25&cursor=' + encodeURIComponent(page.nextCursor)));
  assert.equal(new Set([...page.items, ...next.items].map(i => i.id)).size, 50);
  const view = ok(await req('/api/triage/views', {name: 'Payments storm', query: {q: 'backlog', service: service.id}})).views[0];
  assert.equal(ok(await req('/api/triage/views')).views[0].id, view.id);
  // One selected revision becomes stale while the remaining 49 stay valid.
  ok(await req('/api/command', {type: 'note', incident: incidents[0].id, revision: 1, text: 'Confirmed elevated database latency'}));
  const auditBefore=ok(await req('/api/audit/export')).rows,priorAuditIds=new Set(auditBefore.map(row=>row.id));
  const bulk = {operationId: 'storm-ack', action: 'acknowledge', reason: 'Payments response started', items: incidents.map(i => ({id: i.id, revision: i.revision}))};
  const result = ok(await req('/api/triage/bulk', bulk));
  assert.equal(result.results.filter(r => r.ok).length, 49);
  assert.ok(continuations > 0, 'one logical storm operation continues across bounded invocations');
  assert.match(result.results.find(r => r.id === incidents[0].id).error, /changed/i);
  const bulkAudit=ok(await req('/api/audit/export')).rows.filter(row=>!priorAuditIds.has(row.id)&&row.kind==='triage.acknowledge');
  assert.equal(bulkAudit.filter(row=>row.outcome==='accepted'&&row.workspaceAfter>row.workspaceBefore).length,50,'the reservation and 49 successful items commit their audit with state');
  assert.equal(bulkAudit.filter(row=>row.outcome==='refused').length,1,'the stale item retains its own attributed refusal');
  assert.deepEqual(ok(await req('/api/triage/bulk', bulk)), result, 'same operation replays its original per-item outcomes');
  ok(await req('/api/triage/bulk', {...bulk, reason: 'different content'}), 409);
  const state = ok(await req('/api/state'));
  for (const i of state.incidents.filter(i => i.id !== incidents[0].id)) {
    assert.equal(i.state, 'acknowledged');
    assert.equal(i.timeline.filter(e => e.operationId === 'storm-ack').length, 1);
    assert.equal(i.assignee, actor.id);
  }
  assert.equal(ok(await req('/api/triage?mine=true')).total, 49);
  assert.equal(ok(await req('/api/triage?q=database')).total, 1, 'search includes notes');
  assert.equal(ok(await req('/api/triage?severity=critical&urgency=high')).total, 40);
  assert.equal(ok(await req('/api/triage?createdAfter=2090-01-01T00%3A00%3A00Z')).total, 0);
  let target = state.incidents.find(i => i.id === incidents[1].id);
  target = ok(await req('/api/command', {type: 'assign-role', incident: target.id, revision: target.revision, role: 'scribe', member: backup.id, reason: 'Record investigation decisions'}));
  assert.equal(target.scribe, backup.id); assert.equal(target.commander, actor.id);
  target = ok(await req('/api/command', {type: 'reassign', incident: target.id, revision: target.revision, member: backup.id, reason: 'Transfer operational responsibility'}));
  assert.equal(target.assignee, backup.id); assert.equal(target.commander, actor.id, 'response attribution is separate from assignment and authorization');
  target = ok(await req('/api/command', {type: 'set-priority', incident: target.id, revision: target.revision, priority: 'P1', reason: 'Checkout impact'}));
  assert.equal(ok(await req('/api/triage?priority=P1&assignee=' + backup.id)).items[0].id, target.id);
  const resolve = {operationId: 'storm-resolve-refused', action: 'resolve', items: [{id: target.id, revision: target.revision}]};
  assert.equal(ok(await req('/api/triage/bulk', resolve)).results[0].ok, false, 'declared incidents require summary and evidence');
  assert.equal(ok(await req('/api/state')).incidents.find(i => i.id === target.id).state, 'acknowledged');
  const resolved = ok(await req('/api/triage/bulk', {...resolve, operationId: 'storm-resolve', reason: 'Database pool repaired; checkout verified by operator', evidence: 'https://example.test/checks/checkout'}));
  assert.equal(resolved.results[0].ok, true);
  assert.equal(ok(await req('/api/state')).incidents.find(i => i.id === target.id).state, 'resolved');
  const viewer = ok(await req('/api/members', {name: 'Storm observer', role: 'viewer', password: passwords.viewer}), 201);
  const viewerCookie = (await w.request('/api/login', {name: viewer.name, password: passwords.viewer})).cookie;
  const beforeViewerAudit=new Set(ok(await req('/api/audit/export')).rows.map(row=>row.id));
  const denied = ok(await w.request('/api/triage/bulk', {...bulk, operationId: 'viewer-ack'}, viewerCookie));
  assert.equal(denied.results.length, 50); assert.ok(denied.results.every(r => !r.ok));
  assert.ok(ok(await req('/api/audit/export')).rows.some(row=>!beforeViewerAudit.has(row.id)&&row.kind==='triage.acknowledge'&&row.outcome==='refused'&&row.beforeRevision===row.afterRevision),'a viewer bulk refusal is audited despite its HTTP 200 per-item receipt');
  assert.equal(ok(await w.request('/api/triage/views', undefined, viewerCookie)).views.length, 0);
  assert.ok(!(ok(await w.request('/api/workspace', undefined, viewerCookie)).state.triage ?? []).some(r => r.kind === 'view'), 'private bootstrap does not expose another person’s saved views');
  page = ok(await req('/api/triage?status=declared'));
  const all = {operationId: 'all-matching', action: 'acknowledge', reason: 'Remaining storm item', items: page.items.map(i => ({id: i.id, revision: i.revision})), allMatching: true, query: {status: 'declared'}, confirmedCount: page.total, workspaceRevision: page.workspaceRevision};
  ok(await req('/api/triage/bulk', {...all, confirmedCount: 99}), 409);
  assert.ok(ok(await req('/api/triage/bulk', all)).results.every(r => r.ok));
  const backupCookie = (await w.request('/api/login', {name: backup.name, password: passwords.scribe})).cookie;
  const beforeDowngrade = ok(await req('/api/state'));
  const continuing = {operationId: 'authority-continuation', action: 'set-priority', priority: 'P2', reason: 'Rebalance response priority', items: beforeDowngrade.incidents.map(i => ({id: i.id, revision: i.revision}))};
  const started = ok(await w.request('/api/triage/bulk', continuing, backupCookie));
  assert.ok(started.remaining > 0 && started.results.some(r => r.ok));
  ok(await req('/api/command', {type: 'member', id: backup.id, role: 'viewer', active: true}));
  const beforeDenied = ok(await req('/api/state'));
  const stopped = ok(await w.request('/api/triage/bulk', continuing, backupCookie));
  assert.equal(stopped.results.filter(r => r.ok).length, started.results.filter(r => r.ok).length, 'downgrade preserves already committed outcomes');
  assert.ok(stopped.interrupted && stopped.remaining > 0);
  assert.ok(stopped.results.filter(r => !started.results.some(old => old.id === r.id)).every(r => !r.ok));
  assert.deepEqual(ok(await req('/api/state')), beforeDenied, 'a downgraded continuation commits no further changes');

  // OC-050: service workflow definitions freeze at declaration; merge/split retain human custody.
  const workflowState = async () => ok(await req('/api/state'));
  const workflowIncident = async id => (await workflowState()).incidents.find(i => i.id === id);
  const workflowService = ok(await req('/api/command', {type: 'service', name: 'Workflow response', environment: 'production', owner: actor.id, runbook: [], pager: ''}));
  const templateDraft = {type: 'service-template', service: workflowService.id, baseVersion: 0, severityWording: {critical: 'Customer transactions blocked', warning: 'Customer transactions delayed', info: 'Investigation only'}, impactPrompt: 'Which customer transactions are affected?', incidentTypes: ['Database', 'Dependency'], checklist: [{id: 'customer-check', text: 'Verify a customer transaction'}, {id: 'owner-check', text: 'Identify the dependency owner'}], reason: 'Publish the response workflow'};
  const workflowRollback = async input => {
    const before = ok(await req('/api/archive'));
    const beforeAudit = w.sql("SELECT COUNT(*) AS n FROM oc_admin_audit WHERE feature='command' AND workspace_after>workspace_before")[0].n;
    w.sql("CREATE TRIGGER reject_workflow_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.feature='command' AND NEW.workspace_after>NEW.workspace_before BEGIN SELECT RAISE(ABORT,'synthetic-oncall-workflow-audit'); END");
    try {ok(await req('/api/command', input), 503);} finally {w.sql('DROP TRIGGER reject_workflow_audit');}
    assert.equal(w.sql("SELECT COUNT(*) AS n FROM oc_admin_audit WHERE feature='command' AND workspace_after>workspace_before")[0].n, beforeAudit);
    assert.deepEqual(ok(await req('/api/archive')), before, input.type + ' audit failure publishes no definition, incident, relation, alert movement or timeline');
  };
  await workflowRollback(templateDraft);
  const publishedTemplate = ok(await req('/api/command', templateDraft));
  assert.equal(publishedTemplate.by, actor.id); assert.ok(Number.isFinite(Date.parse(publishedTemplate.at)));
  assert.deepEqual((await workflowState()).services.find(s => s.id === workflowService.id).incidentTemplates, [publishedTemplate]);
  ok(await req('/api/command', templateDraft), 409);
  const declaration = {type: 'declare', service: workflowService.id, severity: 'critical', title: 'Database workflow response', summary: 'Customer checkouts cannot complete', incidentType: 'Database'};
  ok(await req('/api/command', {...declaration, incidentType: 'Unpublished type'}), 400);
  ok(await req('/api/command', {...declaration, service: service.id}), 400);
  let workflowTarget = ok(await req('/api/command', declaration));
  assert.deepEqual(workflowTarget.template, {service: workflowService.id, ...publishedTemplate, incidentType: declaration.incidentType, checklist: templateDraft.checklist.map(item => ({...item, done: false, history: []}))});
  const checklist = i => ({type: 'template-check', incident: i.id, revision: i.revision, item: 'customer-check', done: true});
  ok(await req('/api/command', checklist(workflowTarget)), 403, 'an unassigned declaration has no commander');
  workflowTarget = ok(await req('/api/command', {type: 'transition', incident: workflowTarget.id, revision: workflowTarget.revision, state: 'acknowledged', summary: 'Commander takes response ownership'}));
  await workflowRollback(checklist(workflowTarget));
  workflowTarget = ok(await req('/api/command', checklist(workflowTarget)));
  assert.equal(workflowTarget.template.checklist[0].done, true);
  assert.deepEqual(workflowTarget.template.checklist[0].history.map(h => ({by: h.by, done: h.done})), [{by: actor.id, done: true}]);
  ok(await req('/api/command', {...checklist(workflowTarget), revision: workflowTarget.revision - 1}), 409);
  for (const fields of [{item: 'missing-item'}, {done: 'yes'}]) ok(await req('/api/command', {...checklist(workflowTarget), ...fields}), 400);
  ok(await req('/api/command', {type: 'member', id: backup.id, role: 'responder', active: true}));
  const workflowResponder = (await w.request('/api/login', {name: backup.name, password: passwords.scribe})).cookie;
  ok(await w.request('/api/command', checklist(workflowTarget), workflowResponder), 403);
  ok(await w.request('/api/command', {...templateDraft, baseVersion: publishedTemplate.version}, workflowResponder), 403);
  workflowTarget = ok(await req('/api/command', {type: 'assign-role', incident: workflowTarget.id, revision: workflowTarget.revision, role: 'commander', member: backup.id, reason: 'Transfer customer validation responsibility'}));
  ok(await req('/api/command', checklist(workflowTarget)), 403, 'administrator cannot tick another commander’s checklist');
  workflowTarget = ok(await w.request('/api/command', {...checklist(workflowTarget), done: false}, workflowResponder));
  workflowTarget = ok(await w.request('/api/command', checklist(workflowTarget), workflowResponder));
  assert.deepEqual(workflowTarget.template.checklist[0].history.map(h => ({by: h.by, done: h.done})), [{by: actor.id, done: true}, {by: backup.id, done: false}, {by: backup.id, done: true}]);
  workflowTarget = ok(await w.request('/api/command', {type: 'note', incident: workflowTarget.id, revision: workflowTarget.revision, text: 'Decision: validate checkout before declaring customer recovery'}, workflowResponder));
  assert.equal(workflowTarget.timeline.at(-1).actor, backup.id);
  const frozenTemplate = structuredClone(workflowTarget.template);
  const newerTemplate = ok(await req('/api/command', {...templateDraft, baseVersion: publishedTemplate.version, impactPrompt: 'Which regions have customer impact?', checklist: [{id: 'regional-check', text: 'Check every impacted region'}], reason: 'Refine future response workflows'}));
  assert.equal(newerTemplate.version, publishedTemplate.version + 1);
  assert.deepEqual((await workflowIncident(workflowTarget.id)).template, frozenTemplate, 'republishing cannot rewrite an active incident’s wording, selected type or completed checklist');
  let workflowSource = ok(await req('/api/command', {...declaration, title: 'Dependency investigation', incidentType: 'Dependency'}));
  assert.equal(workflowSource.template.version, newerTemplate.version); assert.equal(workflowSource.template.impactPrompt, newerTemplate.impactPrompt);
  workflowSource = ok(await req('/api/command', {type: 'assign-role', incident: workflowSource.id, revision: workflowSource.revision, role: 'scribe', member: backup.id, reason: 'Keep the dependency decision record'}));
  workflowSource = ok(await req('/api/command', {type: 'note', incident: workflowSource.id, revision: workflowSource.revision, text: 'Dependency investigation decision: retain separate follow-up custody'}));
  workflowSource = ok(await req('/api/command', {type: 'action', incident: workflowSource.id, revision: workflowSource.revision, title: 'Review dependency saturation', owner: backup.id, escalationRecipient: actor.id, due: '2026-12-01', priority: 'P2', completionPolicy: 'human-review'}));
  const workflowKey = randomBytes(32).toString('hex'), workflowSourceId = 'workflow-' + randomBytes(8).toString('hex');
  ok(await req('/api/sources', {id: workflowSourceId, key: workflowKey, scopes: [workflowService.id]}));
  const workflowAlerts = [];
  for (let n = 0; n < 2; n++) {
    const receipt = ok(await w.request('/api/ingress/' + workflowSourceId, {source: workflowSourceId, eventId: 'workflow-' + n, service: workflowService.id, environment: 'production', key: 'workflow-' + n, generation: 'workflow-' + n, intent: 'trigger', severity: 'warning', title: 'Dependency signal ' + n, observedAt: '2026-10-17T09:00:00Z', evidence: ''}, undefined, {authorization: 'Bearer ' + workflowKey}), 201);
    workflowAlerts.push((await workflowState()).alerts.find(a => a.events.includes(receipt.id)).id);
  }
  // A third source carries actual alert membership into the canonical target.
  const signalIncident = ok(await req('/api/command', {...declaration, title: 'Linked dependency signals', alerts: workflowAlerts}));
  const sourceBeforeMerge = structuredClone(workflowSource), targetBeforeMerge = structuredClone(workflowTarget);
  const merge = {type: 'merge-incidents', incident: workflowTarget.id, revision: workflowTarget.revision, sources: [{id: workflowSource.id, revision: workflowSource.revision}, {id: signalIncident.id, revision: signalIncident.revision}], reason: 'One customer failure shares the dependency cause'};
  const split = i => ({type: 'split-incident', incident: i.id, revision: i.revision, alerts: [workflowAlerts[0]], title: 'Independent dependency failure', summary: 'Investigate one signal independently', reason: 'One generation has a separate cause'});
  const beforeWorkflowAuthority = ok(await req('/api/archive'));
  for (const input of [templateDraft, checklist(workflowTarget), merge, split(workflowTarget)]) {
    ok(await w.request('/api/command', input), 401);
    ok(await w.request('/api/command', input, viewerCookie), 403);
  }
  assert.deepEqual(ok(await req('/api/archive')), beforeWorkflowAuthority, 'anonymous and viewer workflow commands change no held records');
  const workflowApiKey = randomBytes(32).toString('hex');
  const workflowClient = ok(await req('/api/automation/clients', {name: 'Workflow history reader', key: workflowApiKey, services: [workflowService.id], permissions: ['incidents:read', 'incidents:write', 'actions:read']}), 201);
  for (const input of [checklist(workflowTarget), merge, split(workflowTarget)]) ok(await w.request('/api/v1/incidents', input, undefined, {authorization: 'Bearer ' + workflowApiKey, 'idempotency-key': 'workflow-refusal-' + input.type}), 403);
  const beforeRelationRefusals = ok(await req('/api/archive'));
  ok(await req('/api/command', {...merge, revision: merge.revision - 1}), 409);
  ok(await req('/api/command', {...merge, sources: [merge.sources[1], {...merge.sources[0], revision: workflowSource.revision - 1}]}), 409);
  assert.deepEqual(ok(await req('/api/archive')), beforeRelationRefusals, 'a stale later merge source cannot partially alias an earlier source');
  await workflowRollback(merge);
  const competingMerges = await Promise.all([w.request('/api/command', merge, workflowResponder), w.request('/api/command', merge, workflowResponder)]);
  assert.deepEqual(competingMerges.map(r => r.status).sort(), [200, 409], 'concurrent merge attempts create one canonical relation');
  workflowTarget = ok(competingMerges.find(r => r.status === 200));
  assert.equal(workflowTarget.state, targetBeforeMerge.state); assert.equal(workflowTarget.commander, backup.id);
  assert.deepEqual(workflowTarget.template, frozenTemplate); assert.deepEqual(new Set(workflowTarget.alerts), new Set(workflowAlerts));
  assert.deepEqual(new Set(workflowTarget.mergedSources), new Set([workflowSource.id, signalIncident.id]));
  workflowSource = await workflowIncident(workflowSource.id);
  assert.deepEqual(workflowSource.mergedInto, {target: workflowTarget.id, by: backup.id, at: workflowSource.mergedInto.at, reason: merge.reason});
  assert.equal(workflowSource.state, sourceBeforeMerge.state); assert.equal(workflowSource.scribe, sourceBeforeMerge.scribe);
  assert.deepEqual(workflowSource.actions, sourceBeforeMerge.actions); assert.deepEqual(workflowSource.timeline.slice(0, sourceBeforeMerge.timeline.length), sourceBeforeMerge.timeline);
  assert.ok(workflowTarget.timeline.some(e => e.kind === 'merge')); assert.ok(workflowSource.timeline.some(e => e.kind === 'merge'));
  assert.equal(ok(await req('/api/triage?service=' + workflowService.id)).total, 1, 'merged sources remain readable records but leave the active triage queue');
  const unsetAlias = await w.request('/api/v1/incidents/' + workflowSource.id, undefined, undefined, {authorization: 'Bearer ' + workflowApiKey});
  assert.equal(unsetAlias.status,403);assert.equal(unsetAlias.value.error.code,'policy_unset');
  await autonomousCoordination(w,cookie);
  const canonicalAlias = await w.request('/api/v1/incidents/' + workflowSource.id, undefined, undefined, {authorization: 'Bearer ' + workflowApiKey});
  assert.equal(ok(canonicalAlias).id, workflowTarget.id); assert.equal(canonicalAlias.headers.get('content-location'), '/api/v1/incidents/' + workflowTarget.id);
  assert.deepEqual(ok(canonicalAlias).mergedSources, workflowTarget.mergedSources);
  assert.deepEqual(workflowTarget.actions, targetBeforeMerge.actions,'merge does not duplicate an open remediation obligation');
  workflowSource=ok(await w.request('/api/command',{type:'complete',incident:workflowSource.id,revision:workflowSource.revision,action:workflowSource.actions[0].id,evidence:'https://example.test/merged-dependency-evidence'},workflowResponder));
  workflowSource=ok(await req('/api/command',{type:'accept-action',incident:workflowSource.id,revision:workflowSource.revision,action:workflowSource.actions[0].id,reason:'Reviewed the retained dependency follow-up'}));
  assert.equal(workflowSource.actions[0].done,true,'retained source remediation stays editable without changing alias lifecycle or roles');
  assert.equal(ok(await w.request('/api/v1/actions/'+workflowSource.actions[0].id,undefined,undefined,{authorization:'Bearer '+workflowApiKey})).incident,workflowSource.id,'scoped actions keep their original custody after merging');
  for(const member of [actor.id,backup.id])workflowTarget=ok(await w.request('/api/command',{type:'assign-role',incident:workflowTarget.id,revision:workflowTarget.revision,role:'communications',member,reason:'Transfer merged customer communication responsibility'},workflowResponder));
  workflowTarget=ok(await w.request('/api/command',{type:'note',incident:workflowTarget.id,revision:workflowTarget.revision,text:'Merged response decision remains attributed to the current responder'},workflowResponder));
  assert.equal(workflowTarget.communications,backup.id);assert.equal(workflowTarget.timeline.at(-1).actor,backup.id);


  ok(await req('/api/command', checklist(workflowSource)), 409);
  ok(await req('/api/command', {...split(workflowSource), alerts: [workflowAlerts[0]]}), 409);
  ok(await req('/api/command', {...merge, revision: workflowTarget.revision, sources: [{id: workflowSource.id, revision: workflowSource.revision}]}), 409);
  const beforeSplitRefusals = ok(await req('/api/archive'));
  ok(await req('/api/command', {...split(workflowTarget), revision: workflowTarget.revision - 1}), 409);
  ok(await req('/api/command', {...split(workflowTarget), alerts: ['unknown-alert']}), 400);
  assert.deepEqual(ok(await req('/api/archive')), beforeSplitRefusals);
  await workflowRollback(split(workflowTarget));
  const competingSplits = await Promise.all([w.request('/api/command', split(workflowTarget), workflowResponder), w.request('/api/command', split(workflowTarget), workflowResponder)]);
  assert.deepEqual(competingSplits.map(r => r.status).sort(), [200, 409], 'concurrent splits move a generation exactly once');
  const workflowChild = ok(competingSplits.find(r => r.status === 200));
  workflowTarget = await workflowIncident(workflowTarget.id);
  assert.equal(workflowChild.state, workflowTarget.state, 'split preserves lifecycle without declaring or resolving response work');
  assert.deepEqual(workflowChild.alerts, [workflowAlerts[0]]); assert.deepEqual(workflowTarget.alerts, [workflowAlerts[1]]);
  assert.deepEqual(workflowChild.splitFrom, {incident: workflowTarget.id, by: backup.id, at: workflowChild.splitFrom.at, reason: split(workflowTarget).reason, alerts: [workflowAlerts[0]]});
  assert.deepEqual(workflowTarget.template, frozenTemplate); assert.deepEqual((await workflowIncident(signalIncident.id)).alerts, workflowAlerts, 'the merged alias retains its original signal provenance');
  const resolvedWorkflow = ok(await req('/api/command', {type: 'bulk-resolve', incident: workflowChild.id, revision: workflowChild.revision, reason: 'Independent customer recovery verified', evidence: 'https://example.test/workflow-recovery'}));
  ok(await w.request('/api/command', checklist(resolvedWorkflow), workflowResponder), 409);
  for (const input of [split(resolvedWorkflow), {...merge, incident: workflowTarget.id, revision: workflowTarget.revision, sources: [{id: resolvedWorkflow.id, revision: resolvedWorkflow.revision}]}]) ok(await req('/api/command', input), 409);
  // Expanding and splitting an all-recovered group retains each earlier reminder as history.
  const workflowSignal=(n,intent)=>({source:workflowSourceId,eventId:'workflow-'+n+'-'+intent,service:workflowService.id,environment:'production',key:'workflow-'+n,generation:'workflow-'+n,intent,severity:'warning',title:'Dependency signal '+n,observedAt:'2026-10-17T09:00:00Z',evidence:''});
  const workflowSend=async(n,intent)=>ok(await w.request('/api/ingress/'+workflowSourceId,workflowSignal(n,intent),undefined,{authorization:'Bearer '+workflowKey}),201);
  await workflowSend(1,'recover');workflowTarget=await workflowIncident(workflowTarget.id);const earlierMarker=structuredClone(workflowTarget.sourceRecovery);assert.ok(earlierMarker);
  const additionalEvent=await workflowSend(2,'trigger'),additionalAlert=(await workflowState()).alerts.find(a=>a.events.includes(additionalEvent.id));
  const additionalIncident=ok(await req('/api/command',{...declaration,title:'Separate source investigation',alerts:[additionalAlert.id]}));
  workflowTarget=ok(await req('/api/command',{type:'merge-incidents',incident:workflowTarget.id,revision:workflowTarget.revision,sources:[{id:additionalIncident.id,revision:additionalIncident.revision}],reason:'Join a newly related active source to recovered context'}));
  assert.equal(workflowTarget.sourceRecovery,undefined);assert.equal(workflowTarget.sourceRecoveryHistory.at(-1).reminder.id,earlierMarker.reminder.id);
  assert.ok(workflowTarget.timeline.some(e=>e.id===earlierMarker.reminder.id),'a changed group never discards its former recovery timeline');
  await workflowSend(2,'recover');workflowTarget=await workflowIncident(workflowTarget.id);assert.notEqual(workflowTarget.sourceRecovery.reminder.id,earlierMarker.reminder.id);
  const recoveredSplit=ok(await req('/api/command',{type:'split-incident',incident:workflowTarget.id,revision:workflowTarget.revision,alerts:[additionalAlert.id],title:'Recovered separate source',summary:'Keep the recovered source as separate human response work',reason:'Preserve independent response ownership'}));
  workflowTarget=await workflowIncident(workflowTarget.id);assert.equal(recoveredSplit.state,workflowTarget.state);assert.ok(recoveredSplit.sourceRecovery);assert.equal(workflowTarget.sourceRecoveryHistory.length,2);
  ok(await req('/api/archive'));
  const otherWorkflowService=ok(await req('/api/command',{type:'service',name:'Independent dependency service',environment:'production',owner:actor.id,runbook:[],pager:''}));
  const foreignSource=ok(await req('/api/command',{type:'declare',service:otherWorkflowService.id,severity:'warning',title:'Cross-service dependency investigation',summary:'Retain its separate service grant while merging',alerts:[]}));
  workflowTarget=ok(await req('/api/command',{type:'merge-incidents',incident:workflowTarget.id,revision:workflowTarget.revision,sources:[{id:foreignSource.id,revision:foreignSource.revision}],reason:'Coordinate the related dependency while preserving API service boundaries'}));
  for(const id of [workflowTarget.id,foreignSource.id])ok(await w.request('/api/v1/incidents/'+id,undefined,undefined,{authorization:'Bearer '+workflowApiKey}),404);
  const allWorkflowKey=randomBytes(32).toString('hex');ok(await req('/api/automation/clients',{name:'Full workflow lineage reader',key:allWorkflowKey,services:[workflowService.id,otherWorkflowService.id],permissions:['incidents:read']}),201);
  assert.equal(ok(await w.request('/api/v1/incidents/'+foreignSource.id,undefined,undefined,{authorization:'Bearer '+allWorkflowKey})).id,workflowTarget.id,'aliases resolve only when every original service remains granted');
  w.sql("UPDATE sessions SET expires=0 WHERE member='" + backup.id + "'");
  ok(await w.request('/api/command', checklist(workflowTarget), workflowResponder), 401);
  const revokedWorkflowResponder = (await w.request('/api/login', {name: backup.name, password: passwords.scribe})).cookie;
  ok(await req('/api/command', {type: 'member', id: backup.id, role: 'responder', active: false}));
  ok(await w.request('/api/command', checklist(workflowTarget), revokedWorkflowResponder), 401);
  ok(await req('/api/command', {type: 'member', id: backup.id, role: 'viewer', active: true}));
  // Business status uses an explicit audience; stakeholder sessions carry no response data.
  const statusMember = ok(await req('/api/members', {name:'synthetic-oncall-61',role:'stakeholder',password:'synthetic-oncall-61-password'}),201);
  const outsider = ok(await req('/api/members', {name:'synthetic-oncall-62',role:'stakeholder',password:'synthetic-oncall-62-password'}),201);
  const statusLogin=await w.request('/api/login',{name:statusMember.name,password:'synthetic-oncall-61-password'});ok(statusLogin);const statusCookie=statusLogin.cookie;
  const outsiderCookie = (await w.request('/api/login',{name:outsider.name,password:'synthetic-oncall-62-password'})).cookie;
  const statusService = ok(await req('/api/command',{type:'service',id:'synthetic-oncall-63',name:'Checkout gateway',environment:'production',owner:actor.id,runbook:['Private recovery steps'],pager:''}));
  const business = () => okStatus().then(services => services.find(row => row.name==='Checkout'));
  const okStatus = async () => ok(await req('/api/status')).services;
  ok(await req('/api/status',{action:'create',name:'Checkout',owningTeam:'Payments',supporting:[statusService.id],communicationsOwner:actor.id,audience:[statusMember.id],highUrgencyImpact:true}));
  let status = await business(); assert.equal(status.derived,'operational');
  assert.deepEqual(ok(await w.request('/api/status',undefined,outsiderCookie)).services,[],'ungranted stakeholder sees no business service');
  ok(await w.request('/api/status',{action:'subscribe',id:status.id,revision:status.revision,channel:'email',active:true},statusCookie));
  status=await business();
  ok(await w.request('/api/status',{action:'override',id:status.id,revision:status.revision,value:'operational',reason:'Not my status'},viewerCookie),403);
  ok(await w.request('/api/status',{action:'subscribe',id:status.id,revision:status.revision,member:actor.id,channel:'email',active:true},statusCookie),403);
  const beforeDeadlineRefusal58=ok(await req('/api/state'));for(const deniedCookie of [viewerCookie,statusCookie])for(const type of ['snooze','cancel-deadline','acknowledgment-timeout'])ok(await w.request('/api/command',{type,incident:incidents[0].id,revision:incidents[0].revision,service:service.id,baseVersion:0,minutes:1},deniedCookie),403);assert.deepEqual(ok(await req('/api/state')),beforeDeadlineRefusal58);
  console.log('OC-058 triage permissions: viewer and stakeholder snooze, cancellation and timeout-policy changes refused without state mutation');
  for(const deniedCookie of [viewerCookie,statusCookie]){const before=ok(await req('/api/state'));for(const type of ['manual-page','request-responders'])assert.equal((await w.request('/api/command',{type,service:'synthetic-oncall-61',operationId:'synthetic-oncall-68-denied',title:'Forbidden page',severity:'critical',users:[]},deniedCookie)).status,403);assert.deepEqual(ok(await req('/api/state')),before);}console.log('OC-068 triage permissions: viewers and stakeholders refuse manual page and responder requests without creating state');
  console.log('OC-061 business services and subscriptions: explicit audience, self subscription, recorded channel, unauthorized subscription and override refusals');
  const privateText='synthetic-oncall-64-private-alert';
  const impacted=ok(await req('/api/command',{type:'declare',service:statusService.id,severity:'warning',title:privateText,summary:'Private incident impact',alerts:[]}));
  status=await business();assert.equal(status.derived,'degraded');
  const subscriber=ok(await w.request('/api/status',undefined,statusCookie)).services[0];
  assert.equal(subscriber.notices.length,1);assert.deepEqual([subscriber.notices[0].paging,subscriber.notices[0].automatic,subscriber.notices[0].label],['off',false,'no sender']);
  assert.equal(subscriber.notices[0].channel,'email');assert.equal(subscriber.notices[0].approvedUpdate,null);
  assert.ok(!JSON.stringify(subscriber).includes(privateText));assert.ok(!JSON.stringify(subscriber).includes('Private recovery steps'));
  assert.equal(ok(await w.request('/api/status',undefined,outsiderCookie)).services.length,0,'unsubscribed ungranted stakeholder receives no obligation');
  console.log('OC-061 derived incident impact and notice custody: degraded, one record per subscriber, no raw alert text, no sender or approved-update fabrication');
  const statusAuditIds=new Set(ok(await req('/api/audit/export')).rows.map(row=>row.id));
  ok(await req('/api/status',{action:'override',id:status.id,revision:status.revision,value:'operational',reason:'Payments are processing through the alternate gateway'}));
  status=await business();assert.equal(status.derived,'degraded');assert.equal(status.override.by,actor.id);
  assert.ok(ok(await req('/api/audit/export')).rows.some(row=>!statusAuditIds.has(row.id)&&row.outcome==='accepted'&&row.workspaceAfter>row.workspaceBefore),'override commits with its permanent pseudonymous audit entry');
  const priorStatus=ok(await req('/api/state'));
  w.sql("CREATE TRIGGER injected_status_audit_failure BEFORE INSERT ON oc_admin_audit WHEN NEW.outcome='accepted' BEGIN SELECT RAISE(ABORT,'INJECTED_STATUS_AUDIT_FAILURE'); END");
  ok(await req('/api/status',{action:'override',id:status.id,revision:status.revision,value:'major outage',reason:'This must roll back'}),503);
  w.sql('DROP TRIGGER injected_status_audit_failure');
  assert.deepEqual(ok(await req('/api/state')),priorStatus,'failed audit rolls back the complete override transaction');
  ok(await req('/api/status',{action:'override',id:status.id,revision:status.revision,value:null}));
  status=await business();assert.equal(status.override,null);
  console.log('OC-061 attributed override: derived value retained, explicit clear, permanent audit and audit-failure rollback');
  ok(await w.request('/api/status'),401);
  const publicStatus=await fetch(w.origin+'/status');assert.equal(publicStatus.status,200);assert.ok(!(await publicStatus.text()).includes('Checkout gateway'),'the status route shell exposes no internal status without a session');
  const bootstrap=ok(await w.request('/api/workspace',undefined,statusCookie));assert.equal(bootstrap.state,null);
  for(const path of ['/api/state','/api/schedule-coordination','/api/triage','/api/triage/views','/api/archive','/api/recovery/checkpoint','/api/audit/export','/api/handoffs','/api/handoffs/context/'+impacted.id,'/api/paging/state','/api/schedules/missing/now-next','/api/schedules/missing/calendar.ics','/api/changes','/api/reports/response','/api/reports/response.csv','/api/reviews/'+impacted.id+'/material','/api/automation/clients','/api/email','/api/routing/keys','/api/sources']) ok(await w.request(path,undefined,statusCookie),403);
  ok(await w.request('/api/v1/incidents',undefined,statusCookie),401);
  const deniedState=ok(await req('/api/state'));
  for(const [path,data] of [['/api/schedule-coordination',{action:'subscribe',scope:'own'}],['/api/command',{type:'declare',service:statusService.id,title:'Refused stakeholder page',severity:'warning',summary:'No authority'}],['/api/command',{type:'request-response',incident:impacted.id,revision:impacted.revision,member:actor.id}],['/api/triage/bulk',{operationId:'synthetic-oncall-65',action:'acknowledge',items:[{id:impacted.id,revision:impacted.revision}]}],['/api/members',{name:'No member',role:'admin',password:'synthetic-oncall-65-password'}],['/api/restore',{}],['/api/recovery/restore',{}]]) ok(await w.request(path,data,statusCookie),403);
  assert.deepEqual(ok(await req('/api/state')),deniedState,'every stakeholder refusal creates no workspace object');
  const html=await fetch(w.origin+'/incidents/'+encodeURIComponent(impacted.id),{headers:{cookie:statusCookie}});assert.equal(html.status,200);
  const document=await html.text();assert.ok(!document.includes(privateText)&&!document.includes('Private recovery steps'),'HTML injected workspace contains no incident or runbook text');
  const embedded=JSON.parse(/<script[^>]*id="oncall-workspace"[^>]*>([\s\S]*?)<\/script>/.exec(document)[1]);assert.equal(embedded.state,null);
  console.log('OC-061 stakeholder boundary: workspace and HTML contain no response state; triage, timelines, runbooks, contacts, audit/archive/checkpoint, ICS, reports, source lists and OC-053 API refused; manual page and responder request create nothing');
  status=await business();ok(await w.request('/api/status',{action:'subscribe',id:status.id,revision:status.revision,channel:'email',active:false},statusCookie));
  assert.equal(ok(await w.request('/api/status',undefined,statusCookie)).services[0].notices[0].state,'stopped');
  const resolvedStatus=ok(await req('/api/triage/bulk',{operationId:'synthetic-oncall-66',action:'resolve',items:[{id:impacted.id,revision:impacted.revision}],reason:'Alternate gateway verified',evidence:'https://example.test/checkout-recovery'}));assert.ok(resolvedStatus.results[0].ok);
  assert.equal((await business()).derived,'operational','bulk resolution recomputes status in the same commit');
  const noticeCount=ok(await req('/api/state')).businessServices.find(row=>row.id===status.id).notices.length;
  const statusKey=randomBytes(32).toString('hex'),statusSource='synthetic-oncall-68';
  ok(await req('/api/sources',{id:statusSource,key:statusKey,mode:'bearer',scopes:[statusService.id]}));
  const statusSignal={source:statusSource,eventId:'synthetic-oncall-69',service:statusService.id,environment:'production',key:'synthetic-oncall-69',generation:'synthetic-oncall-69',intent:'trigger',severity:'critical',title:privateText,observedAt:new Date().toISOString(),evidence:''};
  ok(await w.request('/api/ingress/'+statusSource,statusSignal,'',{authorization:'Bearer '+statusKey}),201);
  assert.equal((await business()).derived,'degraded','configured high-urgency alert independently impacts status');
  assert.equal(ok(await req('/api/state')).businessServices.find(row=>row.id===status.id).notices.length,noticeCount,'unsubscribed stakeholder receives no further notice');
  ok(await w.request('/api/ingress/'+statusSource,{...statusSignal,eventId:'synthetic-oncall-70',intent:'recover'},'',{authorization:'Bearer '+statusKey}),201);
  assert.equal((await business()).derived,'operational','source recovery recomputes status server-side');
  console.log('OC-061 configured high-urgency impact: alert admission and source recovery recompute internal status without a browser or subscriber delivery');
  console.log('OC-061 bulk impact recomputation and unsubscribe: resolution restores operational status and no new subscriber notice is recorded');

  // OC-056: one generation owns one truthful, non-automatic obligation at every intake door.
  let fixture = 0; const synthetic = () => 'synthetic-oncall-' + ++fixture;
  const recoveryService = ok(await req('/api/command', {type: 'service', id: synthetic(), name: synthetic(), environment: 'production', owner: actor.id, runbook: [], pager: ''}));
  const nativeSource = synthetic(), pdSource = synthetic(), amSource = synthetic(), emailAddress = synthetic();
  const keys = {native: randomBytes(32).toString('hex'), pd: randomBytes(32).toString('hex'), am: randomBytes(32).toString('hex')};
  const snapshot = async () => ok(await req('/api/state'));
  const alertAt = (workspace, id) => {const alert = workspace.alerts.find(a => a.id === id); assert.ok(alert); return alert;};
  const incidentAt = (workspace, id) => {const incident = workspace.incidents.find(i => i.id === id); assert.ok(incident); return incident;};
  const signal = (eventId, extra = {}) => ({source: nativeSource, eventId, service: recoveryService.id, environment: 'production', key: synthetic(), generation: synthetic(), intent: 'trigger', severity: 'warning', title: synthetic(), observedAt: '2026-10-17T09:00:00Z', evidence: '', ...extra});
  const native = input => w.request('/api/ingress/' + nativeSource, input, undefined, {authorization: 'Bearer ' + keys.native});
  const pd = (event_action, dedup_key) => w.request('/v2/enqueue', {routing_key: keys.pd, event_action, dedup_key, ...(event_action === 'trigger' ? {payload: {summary: synthetic(), source: pdSource, severity: 'warning'}} : {})});
  const monitoringAlert = {fingerprint: synthetic(), status: 'firing', labels: {alertname: synthetic(), severity: 'warning'}, annotations: {summary: synthetic()}, startsAt: '2026-10-17T09:00:00Z', endsAt: '0001-01-01T00:00:00Z', generatorURL: 'https://example.test/monitor'};
  const monitoring = status => w.request('/api/monitoring/' + amSource, {version: '4', receiver: amSource, status, groupKey: synthetic(), groupLabels: {}, commonLabels: {}, commonAnnotations: {}, alerts: [{...monitoringAlert, status, endsAt: status === 'resolved' ? '2026-10-17T10:00:00Z' : monitoringAlert.endsAt}]}, undefined, {authorization: 'Bearer ' + keys.am});
  const defaultPolicy = {version: 0, mode: 'alert-only', recoveredNotice: 'silent', rule: null};
  const assertStopped = (workspace, id, receipt, policy, obligationId) => {
    const alert = alertAt(workspace, id), obligation = alert.obligation;
    assert.equal(alert.state, 'recovered'); assert.equal(obligation.id, obligationId);
    assert.deepEqual({state: obligation.state, paging: obligation.paging, automatic: obligation.automatic, outcome: obligation.outcome, receipt: obligation.receipt, target: obligation.target, urgency: obligation.urgency, policy: obligation.policy}, {state: 'stopped', paging: 'off', automatic: false, outcome: 'stopped by source recovery', receipt, target: {kind: 'service', id: recoveryService.id}, urgency: alert.urgency, policy});
    assert.ok(Number.isFinite(Date.parse(obligation.stoppedAt)));
    assert.match(obligation.cancellation, /no attempt handed to a provider/i); assert.match(obligation.cancellation, /nothing to cancel/i);
    assert.deepEqual(obligation.recoveryNotice, {mode: policy.recoveredNotice, recipients: [], automatic: false, label: 'no sender until OC-026', state: policy.recoveredNotice === 'notified' ? 'recorded' : 'silent'});
    assert.equal(workspace.alerts.filter(a => a.source === alert.source && a.service === alert.service && a.key === alert.key && a.generation === alert.generation).length, 1);
    return obligation;
  };
  ok(await req('/api/sources', {id: nativeSource, key: keys.native, scopes: [recoveryService.id]}));
  for (const [id, provider, key] of [[pdSource, 'pagerduty', keys.pd], [amSource, 'alertmanager', keys.am]]) ok(await req('/api/intake/sources', {id, name: id, provider, service: recoveryService.id, key, revision: 0}), 201);
  const beforeAlertOnly = await snapshot(), ordinary = signal(synthetic());
  const opened = ok(await native(ordinary), 201);
  let responseState = await snapshot(), ordinaryAlert = responseState.alerts.find(a => a.events.includes(opened.id)); assert.ok(ordinaryAlert);
  const ordinaryObligation = ordinaryAlert.obligation.id;
  assert.deepEqual(ordinaryAlert.obligation.policy, defaultPolicy); assert.equal(ordinaryAlert.obligation.state, 'recorded');
  assert.equal(responseState.incidents.length, beforeAlertOnly.incidents.length, 'default alert-only admission declares no incident');
  const recoveryInput = {...ordinary, eventId: synthetic(), intent: 'recover'}, ordinaryRecovery = ok(await native(recoveryInput), 201);
  responseState = await snapshot(); const firstStop = structuredClone(assertStopped(responseState, ordinaryAlert.id, ordinaryRecovery.id, defaultPolicy, ordinaryObligation));
  assert.equal(responseState.incidents.length, beforeAlertOnly.incidents.length, 'source recovery requires no human resolution summary');
  assert.equal(ok(await native(recoveryInput)).duplicate, true);
  ok(await native({...ordinary, eventId: synthetic()}), 201); ok(await native({...recoveryInput, eventId: synthetic()}), 201);
  assert.deepEqual(alertAt(await snapshot(), ordinaryAlert.id).obligation, firstStop, 'replay, late trigger and later recovery cannot replace the first exact stop receipt');
  const pdBeforeAck = synthetic(); ok(await pd('trigger', pdBeforeAck), 202);
  let pdReceipt = (await snapshot()).intakeReceipts.at(-1), pdObligation = alertAt(await snapshot(), pdReceipt.alert).obligation.id;
  ok(await pd('resolve', pdBeforeAck), 202); responseState = await snapshot();
  assertStopped(responseState, pdReceipt.alert, responseState.intakeReceipts.at(-1).id, defaultPolicy, pdObligation);
  const pdStopped = structuredClone(alertAt(responseState, pdReceipt.alert).obligation);
  ok(await pd('resolve', pdBeforeAck), 202); ok(await pd('trigger', pdBeforeAck), 202); responseState = await snapshot();
  const flappedReceipt = responseState.intakeReceipts.at(-1); assert.notEqual(flappedReceipt.generation, pdReceipt.generation);
  assert.notEqual(alertAt(responseState, flappedReceipt.alert).obligation.id, pdObligation); assert.deepEqual(alertAt(responseState, pdReceipt.alert).obligation, pdStopped);
  assert.equal(responseState.incidents.length, beforeAlertOnly.incidents.length, 'compatible alert-only recovery and flapping leave no automatic incident');

  const policyPath = '/api/response/services/' + recoveryService.id;
  const policyDraft = {baseVersion: 0, defaultMode: 'alert-only', recoveredNotice: 'notified', rules: [], reason: 'Record recovered notices without a sender'};
  const notifiedPolicy = ok(await req(policyPath, policyDraft), 201);
  assert.equal(notifiedPolicy.version, 1); assert.equal(notifiedPolicy.by, actor.id);
  assert.deepEqual((await snapshot()).services.find(s => s.id === recoveryService.id).responsePolicies, [notifiedPolicy]);
  const frozenPolicy = {version: notifiedPolicy.version, mode: 'alert-only', recoveredNotice: 'notified', rule: null};
  const linkedInput = signal(synthetic()), linkedNativeReceipt = ok(await native(linkedInput), 201);
  responseState = await snapshot(); const linkedNative = responseState.alerts.find(a => a.events.includes(linkedNativeReceipt.id)); assert.ok(linkedNative);
  const linkedPdKey = synthetic(); ok(await pd('trigger', linkedPdKey), 202); const linkedPd = (await snapshot()).intakeReceipts.at(-1);
  const amOpened = ok(await monitoring('firing'), 202), linkedAm = (await snapshot()).intakeReceipts.find(r => r.id === amOpened.receipts[0].id); assert.ok(linkedAm);
  const local = localPart(); ok(await req('/api/email/addresses', {id: emailAddress, name: emailAddress, service: recoveryService.id, owner: actor.id, localPart: local, mode: 'custom', fallback: 'quarantine', rules: recoveryRules()}), 201);
  const mailKey = synthetic(); assert.equal((await mail(w, local, 'FAILED: ' + mailKey)).status, 200);
  const linkedEmail = ok(await req('/api/email')).receipts.at(-1);
  assert.equal(linkedEmail.obligation, 'email-obligation:' + linkedEmail.generation);
  assert.equal(alertAt(await snapshot(), linkedEmail.alert).obligation.id, linkedEmail.obligation, 'email receipts reference the shared canonical obligation');
  const linkedIds = [linkedNative.id, linkedPd.alert, linkedAm.alert, linkedEmail.alert];
  const obligationIds = new Map((await snapshot()).alerts.filter(a => linkedIds.includes(a.id)).map(a => [a.id, a.obligation.id]));
  assert.equal(new Set(obligationIds.values()).size, 4);
  let awaiting = ok(await req('/api/command', {type: 'declare', service: recoveryService.id, severity: 'critical', title: synthetic(), summary: 'Customer impact needs human confirmation after source recovery', alerts: linkedIds}));
  awaiting = ok(await req('/api/command', {type: 'transition', incident: awaiting.id, revision: awaiting.revision, state: 'acknowledged', summary: 'Commander accepts response responsibility'}));
  awaiting=ok(await req('/api/command',{type:'snooze',incident:awaiting.id,revision:awaiting.revision,minutes:1}));const recoveringDeadline58=awaiting.deadlines.at(-1).id;
  assert.equal(awaiting.commander, actor.id);
  const silentPolicy = ok(await req(policyPath, {...policyDraft, baseVersion: notifiedPolicy.version, recoveredNotice: 'silent', reason: 'Future generations stop silently'}), 201);
  assert.equal(silentPolicy.version, notifiedPolicy.version + 1);
  ok(await pd('acknowledge', linkedPdKey), 202); responseState = await snapshot();
  assert.equal(responseState.intakeReceipts.at(-1).outcome, 'acknowledged');
  assert.equal(alertAt(responseState, linkedPd.alert).obligation.state, 'recorded', 'a source acknowledgment is no human delivery or stop claim');
  ok(await pd('resolve', linkedPdKey), 202); responseState = await snapshot();
  assertStopped(responseState, linkedPd.alert, responseState.intakeReceipts.at(-1).id, frozenPolicy, obligationIds.get(linkedPd.alert));
  const amRecovered = ok(await monitoring('resolved'), 202); responseState = await snapshot();
  assertStopped(responseState, linkedAm.alert, amRecovered.receipts[0].id, frozenPolicy, obligationIds.get(linkedAm.alert));
  const beforeAmReplay = structuredClone(alertAt(responseState, linkedAm.alert).obligation);
  assert.equal(ok(await monitoring('resolved'), 202).receipts[0].duplicate, true); ok(await monitoring('firing'), 202);
  assert.deepEqual(alertAt(await snapshot(), linkedAm.alert).obligation, beforeAmReplay, 'monitoring duplicate recovery and late firing preserve the stopped generation');
  const mailRecoveryId = synthetic(); assert.equal((await mail(w, local, 'OK: ' + mailKey, {id: mailRecoveryId})).status, 200);
  const recoveredEmail = ok(await req('/api/email')).receipts.at(-1); responseState = await snapshot();
  assert.equal(recoveredEmail.obligation, linkedEmail.obligation); assert.equal(recoveredEmail.stop, 'stopped by source recovery');
  const emailStop = structuredClone(assertStopped(responseState, linkedEmail.alert, recoveredEmail.id, frozenPolicy, linkedEmail.obligation));
  await mail(w, local, 'OK: ' + mailKey, {id: mailRecoveryId});
  assert.equal(ok(await req('/api/email')).receipts.at(-1).id, recoveredEmail.id);
  assert.deepEqual(alertAt(await snapshot(), linkedEmail.alert).obligation, emailStop);
  responseState = await snapshot(); assert.equal(incidentAt(responseState, awaiting.id).state, 'acknowledged');
  assert.ok(!incidentAt(responseState, awaiting.id).sourceRecovery, 'the all-recovered marker waits for every linked generation');
  const beforeRecoveryFailure = ok(await req('/api/archive')), auditCount = w.sql("SELECT COUNT(*) AS n FROM oc_admin_audit WHERE feature='ingest' AND workspace_after>workspace_before")[0].n;
  const finalRecovery = {...linkedInput, eventId: synthetic(), intent: 'recover'};
  w.sql("CREATE TRIGGER reject_response_recovery_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.feature='ingest' AND NEW.workspace_after>NEW.workspace_before BEGIN SELECT RAISE(ABORT,'synthetic-oncall-recovery-audit'); END");
  try {ok(await native(finalRecovery), 503); assert.equal(w.sql("SELECT COUNT(*) AS n FROM oc_admin_audit WHERE feature='ingest' AND workspace_after>workspace_before")[0].n, auditCount);} finally {w.sql('DROP TRIGGER reject_response_recovery_audit');}
  assert.deepEqual(ok(await req('/api/archive')), beforeRecoveryFailure, 'audit failure rolls back the source event, obligation stop, notice, incident marker and commander reminder together');
  const auditIds = new Set(ok(await req('/api/audit/export')).rows.map(r => r.id));
  const finalReceipt = ok(await native(finalRecovery), 201); responseState = await snapshot();
  assertStopped(responseState, linkedNative.id, finalReceipt.id, frozenPolicy, obligationIds.get(linkedNative.id));
  awaiting = incidentAt(responseState, awaiting.id); assert.equal(awaiting.state, 'acknowledged');
  assert.equal(awaiting.recovery, ''); assert.equal(awaiting.sourceRecovery.receipt, finalReceipt.id);
  assert.equal(awaiting.deadlines.find(d=>d.id===recoveringDeadline58).state,'cancelled');assert.equal(awaiting.deadlines.find(d=>d.id===recoveringDeadline58).obligation,null);console.log('OC-058 source recovery mid-snooze: atomic source recovery cancels the persisted deadline and records no re-trigger obligation');
  assert.ok(Number.isFinite(Date.parse(awaiting.sourceRecovery.at)));
  assert.deepEqual(awaiting.sourceRecovery.reminder, {id: awaiting.sourceRecovery.reminder.id, commander: actor.id, automatic: false, label: 'no timer until OC-027', state: 'recorded'});
  assert.ok(awaiting.sourceRecovery.reminder.id.length);
  const recoveryAudit = ok(await req('/api/audit/export')).rows.filter(r => !auditIds.has(r.id) && r.feature === 'ingest' && r.outcome === 'accepted' && r.workspaceAfter > r.workspaceBefore);
  assert.equal(recoveryAudit.length, 1, 'one permanent accepted audit fact commits with recovery');
  const marker = structuredClone(awaiting.sourceRecovery);
  ok(await native(finalRecovery)); ok(await native({...linkedInput, eventId: synthetic()}), 201);
  assert.deepEqual(incidentAt(await snapshot(), awaiting.id).sourceRecovery, marker, 'late source traffic does not repeat the reminder');
  ok(await req('/api/command', {type: 'member', id: backup.id, role: 'responder', active: true}));
  awaiting = ok(await req('/api/command', {type: 'assign-role', incident: awaiting.id, revision: awaiting.revision, role: 'commander', member: backup.id, reason: 'Transfer the pending resolution review'}));
  assert.equal(awaiting.sourceRecovery.reminder.commander, backup.id); assert.equal(awaiting.sourceRecovery.reminder.id, marker.reminder.id);
  for (const fields of [{reason: '', evidence: 'https://example.test/recovery'}, {reason: 'Source green; customer recovery needs verification', evidence: ''}]) ok(await req('/api/command', {type: 'bulk-resolve', incident: awaiting.id, revision: awaiting.revision, ...fields}), 400);
  assert.deepEqual(incidentAt(await snapshot(), awaiting.id), awaiting, 'a recovered declared incident still requires both human summary and evidence');

  const responderCookie = (await w.request('/api/login', {name: backup.name, password: passwords.scribe})).cookie;
  const beforePolicyRefusals = (await snapshot()).services.find(s => s.id === recoveryService.id).responsePolicies;
  const policyAttempts = await Promise.all([w.request(policyPath, {...policyDraft, baseVersion: silentPolicy.version}), w.request(policyPath, {...policyDraft, baseVersion: silentPolicy.version}, viewerCookie), w.request(policyPath, {...policyDraft, baseVersion: silentPolicy.version}, responderCookie)]);
  policyAttempts.forEach((response, n) => ok(response, n === 0 ? 401 : 403));
  w.sql("UPDATE sessions SET expires=0 WHERE member='" + viewer.id + "'"); ok(await w.request(policyPath, {...policyDraft, baseVersion: silentPolicy.version}, viewerCookie), 401);
  const revokedViewer = (await w.request('/api/login', {name: viewer.name, password: passwords.viewer})).cookie;
  ok(await req('/api/command', {type: 'member', id: viewer.id, role: 'viewer', active: false}));
  ok(await w.request(policyPath, {...policyDraft, baseVersion: silentPolicy.version}, revokedViewer), 401);
  ok(await req(policyPath, {...policyDraft, baseVersion: notifiedPolicy.version}), 409);
  ok(await req(policyPath, {...policyDraft, baseVersion: silentPolicy.version, rules: [{id: synthetic(), urgency: '*', severity: '*', policy: synthetic(), mode: 'incident'}]}), 400);
  assert.deepEqual((await snapshot()).services.find(s => s.id === recoveryService.id).responsePolicies, beforePolicyRefusals, 'stale and unauthorized policy edits retain exact version history');
  const orchestration = ok(await req('/api/command', {type: 'policy', service: recoveryService.id, severity: 'info', action: 'route', owner: actor.id, reason: 'Explicit source orchestration for response policy'}));
  const responseRules = [{id: synthetic(), urgency: '*', severity: 'critical', policy: '*', mode: 'incident'}, {id: synthetic(), urgency: 'high', severity: '*', policy: '*', mode: 'incident'}, {id: synthetic(), urgency: '*', severity: '*', policy: orchestration.id, mode: 'incident'}];
  const explicitPolicy = ok(await req(policyPath, {...policyDraft, baseVersion: silentPolicy.version, recoveredNotice: 'silent', rules: responseRules}), 201);
  const highUrgency = ok(await req('/api/urgency/services/' + recoveryService.id, {baseVersion: 0, mode: 'high', timezone: 'UTC', weekly: [], holidays: [], inside: 'high', outside: 'low', reason: 'Exercise explicit high-urgency declaration'}), 201);
  const autoDeclare = async (severity, rule) => {
    const input = signal(synthetic(), {severity}), receipt = ok(await native(input), 201), workspace = await snapshot();
    const alert = workspace.alerts.find(a => a.events.includes(receipt.id)); assert.ok(alert);
    const incident = workspace.incidents.find(i => i.alerts.includes(alert.id)); assert.ok(incident, 'an explicit response rule declares a real incident');
    assert.equal(incident.state, 'declared'); assert.equal(incident.automaticDeclaration.event, receipt.id);
    assert.equal(incident.automaticDeclaration.policyVersion, explicitPolicy.version); assert.equal(incident.automaticDeclaration.rule, rule);
    assert.deepEqual(alert.obligation.policy, {version: explicitPolicy.version, mode: 'incident', recoveredNotice: 'silent', rule});
  };
  await autoDeclare('warning', responseRules[1].id);
  ok(await req('/api/urgency/services/' + recoveryService.id, {baseVersion: highUrgency.version, mode: 'severity', timezone: 'UTC', weekly: [], holidays: [], inside: 'high', outside: 'low', reason: 'Separate low warnings from high critical alerts'}), 201);
  await autoDeclare('critical', responseRules[0].id); await autoDeclare('info', responseRules[2].id);
  const beforeLowWarning = (await snapshot()).incidents.length, unmatched = ok(await native(signal(synthetic(), {severity: 'warning'})), 201);
  responseState = await snapshot(); assert.equal(responseState.incidents.length, beforeLowWarning);
  assert.equal(responseState.alerts.find(a => a.events.includes(unmatched.id)).obligation.policy.mode, 'alert-only', 'a nonmatching rule preserves the explicit default');

  const archive = ok(await req('/api/archive'));
  for (const credential of [keys.native, keys.pd, keys.am, local, workflowKey, workflowApiKey, ...Object.values(passwords)]) assert.ok(!JSON.stringify(archive).includes(credential), 'archive excludes intake, email and login authority');
  const bad = structuredClone(archive); bad.incidents[0].scribe = 'unknown-responder';
  ok(await req('/api/restore', {mode: 'replace', archive: bad}), 400);
  assert.deepEqual(ok(await req('/api/archive')), archive, 'invalid role references preserve all prior data');
  const orphan = structuredClone(archive); orphan.triage.find(r => r.kind === 'bulk').results.find(r => r.ok).id = 'missing-incident';
  ok(await req('/api/restore', {mode: 'replace', archive: orphan}), 400);
  assert.deepEqual(ok(await req('/api/archive')), archive, 'orphan bulk outcomes cannot replace valid state');
  for (const mutate of [
    value => {value.incidents.find(i => i.id === workflowSource.id).mergedInto.target = 'missing-incident';},
    value => {value.incidents.find(i => i.id === workflowChild.id).splitFrom.alerts = ['missing-alert'];},
    value => {value.incidents.find(i => i.id === workflowTarget.id).template.checklist[0].history[0].by = 'missing-member';},
  ]) {
    const malformedWorkflow = structuredClone(archive); mutate(malformedWorkflow);
    ok(await req('/api/restore', {mode: 'replace', archive: malformedWorkflow}), 400);
    assert.deepEqual(ok(await req('/api/archive')), archive, 'invalid workflow provenance cannot replace held data');
  }
  const restored = await req('/api/restore', {mode: 'replace', archive}); ok(restored);
  const restoredState = ok(await w.request('/api/state', undefined, restored.cookie));
  assert.ok(restoredState.businessServices.every(row=>!row.active&&row.subscriptions.every(subscription=>!subscription.active)&&row.notices.every(notice=>notice.state==='stopped')),'native archive restore holds every new status record inactive');
  assert.equal(restoredState.members.find(row=>row.id===statusMember.id).active,false,'stakeholder authority never resumes on restore');
  assert.deepEqual(restoredState.triage, archive.triage, 'restore retains saved views and durable bulk outcomes');
  assert.deepEqual(restoredState.incidents, archive.incidents, 'restore retains roles, assignment, priority and operation attribution');
  assert.deepEqual(restoredState.alerts, archive.alerts, 'OC-056 restore retains exact canonical obligations, frozen policies, stop receipts and notices');
  assert.deepEqual(restoredState.services.find(s => s.id === recoveryService.id).responsePolicies, archive.services.find(s => s.id === recoveryService.id).responsePolicies);
  assert.deepEqual(restoredState.emailReceipts, archive.emailReceipts);
  assert.ok(restoredState.intakeSources.filter(s => [pdSource, amSource].includes(s.id)).every(s => !s.active));
  assert.equal(restoredState.emailAddresses.find(a => a.id === emailAddress).active, false);
  assert.equal(restoredState.apiClients.find(c => c.id === workflowClient.id).active, false);
  ok(await w.request('/api/v1/incidents/' + workflowSource.id, undefined, undefined, {authorization: 'Bearer ' + workflowApiKey}), 401, 'restored workflow history conveys no machine authority');
  ok(await native({...linkedInput, eventId: synthetic()}), 401); ok(await pd('trigger', synthetic()), 400);
  assert.equal((await mail(w, local, 'FAILED: ' + synthetic())).status, 400, 'restored email has no authorized receiving address');
  const inactiveState = ok(await w.request('/api/state', undefined, restored.cookie));
  assert.deepEqual(inactiveState.alerts, archive.alerts); assert.deepEqual(inactiveState.incidents, archive.incidents, 'restored inputs cannot restart stops, reminders or automatic declarations');
  await w.stop(); await w.start();
  const login = await w.request('/api/login', {name: 'Storm commander', password: passwords.owner}); ok(login);
  assert.deepEqual(ok(await w.request('/api/state', undefined, login.cookie)).triage, archive.triage, 'durable receipts survive restart');
  assert.deepEqual(ok(await w.request('/api/state', undefined, login.cookie)).alerts, archive.alerts, 'OC-056 stopped obligations and no-sender notice history survive restart');
  assert.deepEqual(ok(await w.request('/api/state', undefined, login.cookie)).incidents, archive.incidents, 'OC-050 template snapshots, checklist attribution, aliases and split custody survive inactive restore and restart');
  console.log('PASS OC-050: versioned service templates freeze complete declaration snapshots; commander-only checklist history survives role transfer, decisions retain authors, merges preserve source timelines/roles/actions and aliases, splits move selected alerts without lifecycle changes, concurrent merge/split commit once, stale/viewer/anonymous/machine/expired/revoked/state refusals and audit-failure rollback preserve exact state, malformed provenance refuses restore, and archive/restore/restart retain workflow custody. Paging remains OFF.');
  console.log('PASS OC-056: native, PagerDuty-compatible before/after source acknowledgment, Alertmanager and email recover exact canonical obligations without human summaries; retry/late traffic preserve stop receipts, policy versions freeze silent/nonautomatic no-sender notices, declared incidents retain current-commander no-timer reminders and require summary plus evidence, urgency/severity/orchestration rules explicitly declare incidents, stale/anonymous/expired/revoked/nonadmin edits fail, audit failure rolls back recovery atomically, and archive/restore/restart retain history without credentials or sends. Paging remains OFF.');
  console.log('OC-041 triage accepted and refused items retain their own atomic audit outcomes; triage storm: 50 incidents, 49 independent commits plus stale failure, replay, roles, queries, viewer denial, confirmed matching and archive/restart passed');
} finally {await w.close();}

// OC-061 email-list records exercise the same public status and shared erasure doors.
{
 const {automationRuntime}=await import('./worker.mjs'),external=[];
 const runtime=await automationRuntime(request=>{external.push(request.url);return new Response('unexpected provider call',{status:403});});
 try{
  const setup=await runtime.request('/api/setup',{name:'synthetic-oncall-610-owner',password:'synthetic-oncall-610-password'});assert.equal(setup.status,200);let cookie=setup.cookie;
  const request=(path,input,as=cookie)=>runtime.request(path,input,as),value=async(path,input,status=200)=>{const result=await request(path,input);assert.equal(result.status,status,JSON.stringify(result.value));return result.value;};
  const owner=setup.value.member,communications=await value('/api/members',{name:'synthetic-oncall-611',role:'responder',password:'synthetic-oncall-611-password'},201),outside=await value('/api/members',{name:'synthetic-oncall-612',role:'responder',password:'synthetic-oncall-612-password'},201),viewer=await value('/api/members',{name:'synthetic-oncall-613',role:'viewer',password:'synthetic-oncall-613-password'},201);
  const session=async person=>(await request('/api/login',{name:person.name,password:person.name+'-password'})).cookie,communicationsCookie=await session(communications),outsideCookie=await session(outside),viewerCookie=await session(viewer);
  const service=await value('/api/command',{type:'service',id:'synthetic-oncall-610',name:'Synthetic list service',environment:'test',owner:owner.id,runbook:[],pager:''});
  await value('/api/status',{action:'create',name:'Synthetic list business',owningTeam:'Synthetic team label',supporting:[service.id],communicationsOwner:communications.id,audience:[],highUrgencyImpact:false});
  const business=async()=> (await value('/api/state')).businessServices.find(row=>row.name==='Synthetic list business'),listAddress='synthetic-oncall-614-list@example.test';
  const add=async(address,as=cookie,extra={})=>request('/api/status',{action:'email-list-add',id:(await business()).id,revision:(await business()).revision,category:'email-list',channel:'email',address,...extra},as);
  assert.equal((await add(listAddress,'')).status,401);assert.equal((await add(listAddress,viewerCookie)).status,403);assert.equal((await add(listAddress,outsideCookie)).status,403);
  for(const [address,extra]of [['not-an-address',{}],['bad..list@example.test',{}],['list@example.test\nBcc:other@example.test',{}],[listAddress,{category:'team'}],[listAddress,{channel:'chat'}]])assert.equal((await add(address,cookie,extra)).status,400);
  assert.equal((await add(listAddress,communicationsCookie)).status,200);assert.equal((await add(listAddress.toUpperCase())).status,409);
  let status=await business();const list=status.emailLists[0];assert.equal(list.category,'email-list');assert.equal(list.channel,'email');assert.equal(list.by,communications.id);
  for(const as of [viewerCookie,outsideCookie]){const limited=await request('/api/status',undefined,as);assert.equal(limited.status,200);assert.ok(!JSON.stringify(limited.value).includes(listAddress));for(const path of ['/api/state','/api/workspace']){const workspace=await request(path,undefined,as);assert.ok(!JSON.stringify(workspace.value).includes(listAddress));}}
  let incident=await value('/api/command',{type:'declare',service:service.id,title:'Synthetic private alert text must not be copied',summary:'Synthetic private response context',severity:'warning'});
  status=await business();assert.deepEqual(status.notices.filter(row=>row.target.kind==='email-list'&&row.target.id===list.id).map(row=>row.phase),['started']);assert.ok(!JSON.stringify(status.notices).includes(incident.title));assert.ok(status.notices.every(row=>row.label==='no sender'&&row.automatic===false&&row.paging==='off'&&row.channel==='email'));
  const before=await value('/api/state');await runtime.db.prepare("CREATE TRIGGER synthetic_oncall_list_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='business.email-list-add' AND NEW.workspace_after>NEW.workspace_before BEGIN SELECT RAISE(ABORT,'synthetic-oncall-614'); END").run();
  try{assert.equal((await add('synthetic-oncall-614-rollback@example.test')).status,503);}finally{await runtime.db.prepare('DROP TRIGGER synthetic_oncall_list_audit').run();}assert.deepEqual(await value('/api/state'),before,'list and immediate impact obligation roll back with their permanent audit');
  assert.equal((await add('synthetic-oncall-615@example.test')).status,200);assert.equal((await add('synthetic-oncall-616@example.test')).status,200);
  const invalid=await value('/api/archive');invalid.businessServices.find(row=>row.id===status.id).emailLists[0].category='channel';await value('/api/restore',{mode:'replace',archive:invalid},400);
  for(const state of ['acknowledged','recovered','resolved'])incident=await value('/api/command',{type:'transition',incident:incident.id,revision:incident.revision,state,summary:'Synthetic verified recovery',evidence:'https://example.test/synthetic-oncall-614'});
  status=await business();assert.deepEqual(status.notices.filter(row=>row.target.kind==='email-list'&&row.target.id===list.id).map(row=>row.phase),['started','ended']);
  await value('/api/status',{action:'email-list-subscription',id:status.id,revision:status.revision,list:list.id,category:'email-list',channel:'email',active:false});
  await value('/api/command',{type:'declare',service:service.id,title:'Synthetic next impact',summary:'Synthetic response only',severity:'warning'});status=await business();assert.equal(status.notices.filter(row=>row.target.id===list.id).length,2,'unsubscribe stops future obligations');assert.ok(status.notices.filter(row=>row.target.id===list.id).every(row=>row.state==='stopped'));
  const old=await value('/api/archive'),erase='/api/erasure/email-list/'+list.id,eraseInput={workspaceRevision:old.revision,confirmation:'erase '+list.id};await value(erase,{...eraseInput,workspaceRevision:old.revision-1},409);
  await runtime.db.prepare("CREATE TRIGGER synthetic_oncall_list_erase BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='email-list.erase' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-614'); END").run();try{await value(erase,eraseInput,503);}finally{await runtime.db.prepare('DROP TRIGGER synthetic_oncall_list_erase').run();}assert.deepEqual(await value('/api/archive'),old);
  const receipt=await value(erase,eraseInput);assert.equal(receipt.state,'complete');assert.equal(receipt.stores.oc_business_services.updated,1);assert.ok(!JSON.stringify(await value('/api/state')).includes(listAddress));await value('/api/restore',{mode:'replace',archive:old},409);
  const current=await value('/api/archive'),forged=structuredClone(old);forged.erasureFences=current.erasureFences;await value('/api/restore',{mode:'replace',archive:forged},409);
  const person=await value('/api/members',{name:'synthetic-oncall-615@example.test',password:'synthetic-oncall-615-password',role:'responder'},201);await value('/api/erasure/member/'+person.id,{workspaceRevision:(await value('/api/state')).revision,confirmation:'erase '+person.id,identitiesReviewed:true,importedPeople:[]});assert.ok(!JSON.stringify(await value('/api/state')).includes(person.name));
  const door=ownerDoor(runtime,cookie),imported='synthetic-oncall-616@example.test',plan=await door.preview('opsgenie',JSON.stringify({users:{data:[{id:'synthetic-oncall-616',username:imported,fullName:'Synthetic list contact'}]}}));assert.equal(plan.status,200);assert.equal((await door.apply('opsgenie',plan.value)).status,200);await value('/api/move-in/erase',{email:imported,confirmation:'erase '+imported});assert.ok(!JSON.stringify(await value('/api/state')).includes(imported));
  const racedBase=await business(),racedInput={action:'email-list-add',id:racedBase.id,revision:racedBase.revision,category:'email-list',channel:'email',address:'synthetic-oncall-618-race@example.test'};
  const raced=await Promise.all([request('/api/status',racedInput),request('/api/status',racedInput)]);assert.deepEqual(raced.map(result=>result.status).sort(),[200,409]);
  const racedList=(await business()).emailLists.find(row=>row.address===racedInput.address);await value('/api/erasure/email-list/'+racedList.id,{workspaceRevision:(await value('/api/state')).revision,confirmation:'erase '+racedList.id});
  await value('/api/status',{action:'create',name:'Synthetic bounded subscribers',owningTeam:'Synthetic team',supporting:[service.id],communicationsOwner:owner.id,audience:[],highUrgencyImpact:false});
  const bounded=async()=> (await value('/api/state')).businessServices.find(row=>row.name==='Synthetic bounded subscribers');
  for(let n=0;n<50;n++){const row=await bounded();await value('/api/status',{action:'email-list-add',id:row.id,revision:row.revision,category:'email-list',channel:'email',address:'synthetic-oncall-620-'+n+'@example.test'});}
  const full=await bounded();await value('/api/status',{action:'email-list-add',id:full.id,revision:full.revision,category:'email-list',channel:'email',address:'synthetic-oncall-620-50@example.test'},429);assert.equal((await bounded()).emailLists.length,50);
  const legacy=await value('/api/archive');delete legacy.businessServices.find(row=>row.id===status.id).emailLists;
  const restored=await request('/api/restore',{mode:'replace',archive:legacy});assert.equal(restored.status,200,JSON.stringify(restored.value));cookie=restored.cookie;await runtime.restart();const held=await value('/api/state');assert.ok(held.businessServices.every(row=>!row.active&&(row.emailLists??[]).every(list=>!list.active)&&row.notices.every(notice=>notice.state==='stopped')));assert.equal(held.businessServices.find(row=>row.id===full.id).emailLists.length,50);
  assert.deepEqual(external,[],'email-list records never call any provider');console.log('PASS OC-061 email-list records: bounded validated category/address/channel, admin/communications-owner authority and restricted reads, atomic list/obligation audit rollback, start/end recorded obligations without raw alerts, unsubscribe, shared list/native/imported erasure and restore fences, legacy archive compatibility and inactive restart; no sender');
 }finally{await runtime.close();}
}

// Coordinated incidents feed fair response reports, matching CSV and erasure-safe denominators.
{
const {default:assert}=await import('node:assert/strict')
const {randomBytes}=await import('node:crypto')
const {localWorker}=await import('./worker.mjs')
const w=await localWorker(),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value};
try{
 let cookie=(await w.request('/api/setup',{name:'Response lead',password:'synthetic-review-testing-password'})).cookie;
 const req=(path,data)=>w.request(path,data,cookie),actor=ok(await req('/api/session')).member;
 const reviewer=ok(await req('/api/members',{name:'Service reviewer',role:'responder',password:'synthetic-reviewer-testing-password'}),201);
 const reviewerCookie=(await w.request('/api/login',{name:reviewer.name,password:'synthetic-reviewer-testing-password'})).cookie;
 ok(await req('/api/command',{type:'service',id:'payments',name:'Payments',environment:'production',owner:actor.id,runbook:['Inspect pool saturation'],pager:''}));
 const key=randomBytes(32).toString('hex');ok(await req('/api/sources',{id:'monitor',key,scopes:['payments']}));
 const event={source:'monitor',eventId:'checkout-pressure',service:'payments',environment:'production',key:'pool',generation:'deploy-2048',intent:'trigger',severity:'critical',title:'Checkout pool pressure',observedAt:new Date().toISOString(),evidence:'https://monitor.example.test/checkout'};
 ok(await w.request('/api/ingress/monitor',event,undefined,{authorization:'Bearer '+key}),201);
 const ciKey=randomBytes(32).toString('hex');ok(await req('/api/changes/sources',{id:'checkout-ci',name:'Checkout CI changes',provider:'native',service:'payments',repository:'',mode:'bearer',revision:0,key:ciKey}),201);
 ok(await w.request('/api/changes/ingress/checkout-ci',{eventId:'checkout-release',summary:'Checkout connection pool expanded',author:'checkout-ci',timestamp:new Date().toISOString(),links:[{href:'https://ci.example.test/checkout/2048'}]},undefined,{authorization:'Bearer '+ciKey}),201);
 const alert=ok(await req('/api/state')).alerts[0];
 let incident=ok(await req('/api/command',{type:'declare',service:'payments',severity:'critical',title:'=Checkout response report',summary:'Checkout latency requires human impact assessment',alerts:[alert.id]}));
 const mutate=async data=>incident=ok(await req('/api/command',{...data,incident:incident.id,revision:incident.revision}));
 await mutate({type:'transition',state:'acknowledged',summary:'Response lead investigating'});
 await mutate({type:'transition',state:'mitigating',summary:'Adjust connection limit'});
 await mutate({type:'transition',state:'recovered',summary:'Initial checkout checks recovered',evidence:'https://monitor.example.test/first-recovery'});
 const firstRecovery=incident.timeline.at(-1).id;
 await mutate({type:'transition',state:'mitigating',summary:'Pressure returned; first recovery did not hold'});
 await mutate({type:'transition',state:'recovered',summary:'Sustained checkout checks observed by responder',evidence:'https://monitor.example.test/final-recovery'});
 const finalRecovery=incident.timeline.at(-1);
 await mutate({type:'transition',state:'resolved',summary:'Human accepts sustained recovery evidence'});
 let other=ok(await req('/api/command',{type:'declare',service:'payments',severity:'warning',title:'Cache pressure',summary:'Human attestation without an acknowledgement'}));
 ok(await req('/api/triage/bulk',{operationId:'report-direct-resolution',action:'resolve',items:[{id:other.id,revision:other.revision}],reason:'Responder verified cache repair',evidence:'https://monitor.example.test/cache'}));
 const open=ok(await req('/api/command',{type:'declare',service:'payments',severity:'warning',title:'Queue investigation remains open',summary:'No acknowledgement yet'}));
 const query=new URLSearchParams({from:new Date(Date.now()-86400000).toISOString(),to:new Date(Date.now()+3600000).toISOString(),service:'payments'});
 const report=ok(await req('/api/reports/response?'+query));assert.equal(report.cohort.count,3);
 assert.deepEqual([report.aggregates.mtta.measured,report.aggregates.mtta.censored,report.aggregates.mtta.unknown],[1,1,1]);
 assert.deepEqual([report.aggregates.mttr.measured,report.aggregates.mttr.censored,report.aggregates.mttr.unknown],[2,1,0]);
 const row=report.incidents.find(i=>i.id===incident.id),openRow=report.incidents.find(i=>i.id===open.id);
 assert.equal(row.recovery.sourceEntryId,finalRecovery.id);assert.notEqual(row.recovery.sourceEntryId,firstRecovery);assert.equal(row.recovery.evidence,finalRecovery.lifecycle.evidence);
 assert.equal(row.recovery.seconds,(Date.parse(finalRecovery.at)-Date.parse(incident.createdAt))/1000);
 assert.equal(openRow.mtta.status,'censored');assert.ok(openRow.mtta.seconds>=0);assert.equal(report.incidents.find(i=>i.id===other.id).mtta.status,'unknown');
 assert.equal(report.aggregates.mtta.mean,row.mtta.seconds);assert.equal(row.mtta.sourceKind,'structured');
 const frozen=new URLSearchParams(query);frozen.set('at',report.generatedAt);frozen.set('revision',String(report.revision));
 const csv=ok(await req('/api/reports/response.csv?'+frozen));assert.equal(typeof csv,'string');assert.ok(csv.includes('"\'=Checkout response report"'));assert.ok(csv.includes(row.recovery.sourceEntryId));assert.ok(csv.includes(report.generatedAt));assert.ok(csv.includes('"censored"'));assert.ok(csv.includes('"unknown"'));
 ok(await req('/api/reports/response?from=2026-02-30T00:00:00Z&to=2026-03-02T00:00:00Z'),400);ok(await req('/api/reports/response?service=missing'),400);ok(await req('/api/reports/response?secret=anything'),400);
 ok(await w.request('/api/reports/response.csv?'+frozen),401);
 await mutate({type:'action',title:'Bound checkout pool per region',owner:actor.id,escalationRecipient:reviewer.id,due:new Date().toISOString().slice(0,10),priority:'P1',completionPolicy:'human-review'});
 const action=incident.actions[0];
 await mutate({type:'complete',action:action.id,evidence:'https://code.example.test/pool-guard'});assert.equal(incident.actions[0].done,false,'evidence submission cannot silently complete a required mitigation');
 const submittedRevision=incident.revision;
 const accepted=ok(await w.request('/api/command',{type:'accept-action',incident:incident.id,revision:incident.revision,action:action.id,reason:'Reviewed regional guard and sustained monitor evidence'},reviewerCookie));incident=accepted;assert.equal(incident.actions[0].done,true);assert.equal(incident.actions[0].accepted.by,reviewer.id);
 ok(await req('/api/command',{type:'accept-action',incident:incident.id,revision:submittedRevision,action:action.id,reason:'stale'}),409);
 let material=ok(await req('/api/reviews/'+incident.id+'/material'));assert.equal(material.incidentRevision,incident.revision);assert.ok(material.observations.some(o=>o.eventId===event.eventId));assert.ok(material.assertions.some(a=>a.id===finalRecovery.id));assert.ok(material.changes.some(c=>c.eventId==='checkout-release'),'generated material includes the same retained changes responders see');assert.equal(material.accepted,null);assert.ok(material.missing.length>0);
 ok(await req('/api/command',{type:'review',incident:incident.id,revision:incident.revision,materialRevision:incident.revision-1,materialWorkspaceRevision:material.workspaceRevision,accept:true,rootCause:'Pool limits exceeded',impact:'Checkout requests delayed',text:'Human review'}),409);
 ok(await w.request('/api/ingress/monitor',{...event,eventId:'later-observation',observedAt:new Date().toISOString()},undefined,{authorization:'Bearer '+key}),201);
 ok(await req('/api/command',{type:'review',incident:incident.id,revision:incident.revision,materialRevision:incident.revision,materialWorkspaceRevision:material.workspaceRevision,accept:true,rootCause:'stale context',impact:'stale context',text:'stale context'}),409);
 material=ok(await req('/api/reviews/'+incident.id+'/material'));
 await mutate({type:'review',materialRevision:incident.revision,materialWorkspaceRevision:material.workspaceRevision,accept:true,rootCause:'Region pool admission exceeded the upstream connection budget',impact:'Checkout requests delayed while pools saturated',text:'Reviewed observations and recovery evidence. Keep upstream admission within the measured budget.'});
 assert.equal(incident.reviewAcceptance.by,actor.id);assert.ok(incident.reviewAcceptance.materialRevision<incident.revision);
 const viewer=ok(await req('/api/members',{name:'Report viewer',role:'viewer',password:'synthetic-report-viewer-password'}),201),viewerCookie=(await w.request('/api/login',{name:viewer.name,password:'synthetic-report-viewer-password'})).cookie;
 ok(await w.request('/api/command',{type:'review',incident:incident.id,revision:incident.revision,text:'viewer cannot accept'},viewerCookie),403);
 ok(await req('/api/reports/response.csv?'+frozen),409);frozen.delete('revision');const currentReport=ok(await req('/api/reports/response?'+frozen));frozen.set('revision',String(currentReport.revision));
 assert.equal(ok(await w.request('/api/reports/response.csv?'+frozen,undefined,viewerCookie)),ok(await req('/api/reports/response.csv?'+frozen)),'same permissions and frozen snapshot produce the same CSV');
 ok(await req('/api/command',{type:'member',id:viewer.id,role:'viewer',active:false}));ok(await w.request('/api/reports/response.csv?'+frozen,undefined,viewerCookie),401);
 const archive=ok(await req('/api/archive')),bad=structuredClone(archive);bad.incidents.find(i=>i.id===incident.id).actions[0].accepted.by='unknown-person';ok(await req('/api/restore',{mode:'replace',archive:bad}),400);assert.deepEqual(ok(await req('/api/archive')),archive);
 const legacy=structuredClone(archive);for(const i of legacy.incidents)for(const e of i.timeline)delete e.lifecycle;
 let restored=await req('/api/restore',{mode:'replace',archive:legacy});ok(restored);cookie=restored.cookie;
 const legacyReport=ok(await req('/api/reports/response?'+query)),legacyRow=legacyReport.incidents.find(i=>i.id===incident.id);assert.equal(legacyRow.mtta.sourceKind,'legacy-derived');assert.equal(legacyRow.mtta.status,'measured');assert.equal(legacyRow.recovery.status,'unknown','a current URL does not invent immutable legacy recovery evidence');
 restored=await req('/api/restore',{mode:'replace',archive});ok(restored);cookie=restored.cookie;
 assert.deepEqual(ok(await req('/api/state')).incidents,archive.incidents,'structured lifecycle, human review and follow-up attribution survive archive replacement');
 await w.stop();await w.start();assert.equal(ok(await req('/api/reviews/'+incident.id+'/material')).accepted.rootCause,incident.reviewAcceptance.rootCause);
 // OC-037 response report keeps unknown cases visible and normalises load by scheduled coverage.
 const responder=async name=>({...ok(await req('/api/members',{name,role:'responder',password:'synthetic-load-testing-password'}),201),cookie:(await w.request('/api/login',{name,password:'synthetic-load-testing-password'})).cookie});
 const shift=await responder('Shift responder'),floater=await responder('On-call floater');
 const hour=3600000,start=Math.floor(Date.now()/hour)*hour-6*hour,iso=at=>new Date(at).toISOString();
 const rota={id:'payments-rota',name:'Payments rota',service:'payments',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,
  primary:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[shift.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[actor.id],ambiguity:'earlier'},
  overrides:[{id:'lead-covers',role:'primary',start:iso(start),end:iso(start+2*hour),member:actor.id}]};
 ok(await req('/api/paging/schedules',rota));
 const queueKey=randomBytes(32).toString('hex');ok(await req('/api/sources',{id:'queue-monitor',key:queueKey,scopes:['payments']}));
 const observe=(eventId,generation,intent='trigger')=>w.request('/api/ingress/queue-monitor',{source:'queue-monitor',eventId,service:'payments',environment:'production',key:'queue',generation,intent,severity:'warning',title:'Queue backlog',observedAt:new Date().toISOString(),evidence:'https://monitor.example.test/queue'},undefined,{authorization:'Bearer '+queueKey});
 ok(await observe('queue-1','backlog-1'),201);ok(await observe('queue-2','backlog-1'),201);
 const queueAlert=ok(await req('/api/state')).alerts.find(a=>a.source==='queue-monitor');
 const declaredIds=[];
 for(const [person,title,alerts] of [[shift,'Shift responder acknowledges during their primary shift',[queueAlert.id]],[floater,'Floater acknowledges without a schedule slot',[]]]){
  const declared=ok(await req('/api/command',{type:'declare',service:'payments',severity:'warning',title,summary:'Load attribution',alerts}));declaredIds.push(declared.id);
  ok(await w.request('/api/command',{type:'transition',incident:declared.id,revision:declared.revision,state:'acknowledged',summary:'Taking it'},person.cookie));
 }
 const recovered=ok(await observe('queue-3','backlog-1','recover'),201);ok(await observe('queue-4','backlog-2'),201);
 const observed=new Date().toISOString(),window=new URLSearchParams({from:iso(start),to:iso(Date.now()+hour),service:'payments',at:observed});
 const fair=ok(await req('/api/reports/response?'+window)),rangeMs=Date.parse(observed)-start,range=rangeMs/1000,rest=(rangeMs-2*hour)/1000,byId=id=>fair.load.responders.find(r=>r.member===id);
 assert.equal(fair.cohort.count,5);assert.deepEqual([fair.load.acknowledged,fair.load.unacknowledged],[3,2],'unacknowledged incidents stay unattributed');
 assert.equal(fair.load.through,observed);assert.deepEqual(fair.load.schedules.map(s=>[s.id,s.revision]),[['payments-rota',1]]);
 assert.deepEqual([byId(actor.id).primarySeconds,byId(actor.id).backupSeconds],[7200,rest],'an override moves primary hours and the same member is never their own backup');
 assert.deepEqual([byId(shift.id).primarySeconds,byId(shift.id).backupSeconds],[rest,0]);
 assert.equal(byId(actor.id).per24PrimaryHours,12);assert.equal(byId(actor.id).loadToCoverage,(1/3)/(7200/(7200+rest)),'shares use the same summed scheduled seconds');assert.equal(byId(shift.id).acknowledgements,1);
 assert.deepEqual([byId(floater.id).acknowledgements,byId(floater.id).outsideCoverage,byId(floater.id).per24PrimaryHours,byId(floater.id).loadToCoverage],[1,1,null,null],'load without scheduled hours is visible, never a rate');
 assert.ok([actor.id,shift.id].every(id=>byId(id).outsideCoverage===0));
 assert.deepEqual(fair.load.services.map(s=>[s.service,s.primarySeconds,s.uncoveredPrimarySeconds,s.incidents]),[['payments',range,0,5]]);
 const sourceRow=fair.incidents.find(i=>i.id===declaredIds[0]);assert.equal(sourceRow.sourceRecovery.status,'measured');assert.equal(sourceRow.sourceRecovery.sourceEntryId,recovered.id);assert.equal(sourceRow.sourceRecovery.sourceKind,'source-event');
 assert.equal(fair.incidents.find(i=>i.id===incident.id).sourceRecovery.status,'censored','an active linked alert is a lower bound, never a recovery');
 assert.equal(fair.incidents.find(i=>i.id===declaredIds[1]).sourceRecovery.status,'unknown','no linked alert means no source observation');
 assert.deepEqual([fair.aggregates.sourceRecovery.measured,fair.aggregates.sourceRecovery.censored,fair.aggregates.sourceRecovery.unknown],[1,1,3]);
 assert.deepEqual([fair.noise.alerts,fair.noise.triggers,fair.noise.repeatedAlerts,fair.noise.noisyKeys],[3,5,2,2]);
 assert.deepEqual(fair.noise.noisy.map(k=>[k.key,k.alerts,k.triggers,k.active]),[['queue',2,3,1],['pool',1,2,1]],'repeat triggers and recurring generations rank the noisiest key first');
 const csvQuery=new URLSearchParams(window);csvQuery.set('revision',String(fair.revision));csvQuery.set('schedulingRevision',String(fair.load.schedulingRevision));
 const loadCsv=ok(await req('/api/reports/response.csv?'+csvQuery)),table=loadCsv.trim().split('\r\n').map(line=>[...line.matchAll(/"((?:[^"]|"")*)"/g)].map(m=>m[1].replaceAll('""','"')));
 const column=name=>table[0].indexOf(name),loadRow=id=>table.find(r=>r[0]==='responder-load'&&r[column('loadSubjectId')]===id);
 for(const r of fair.load.responders)assert.deepEqual(['scheduledPrimarySeconds','scheduledBackupSeconds','loadAcknowledgements','acknowledgementsOutsideCoverage','loadToCoverage'].map(c=>loadRow(r.member)[column(c)]),
  [r.primarySeconds,r.backupSeconds,r.acknowledgements,r.outsideCoverage,r.loadToCoverage].map(v=>v===null?'':String(v)),'CSV load rows match the screen');
 assert.equal(table.find(r=>r[column('incidentId')]===declaredIds[0])[column('sourceRecovery.sourceEntryId')],recovered.id);
 assert.deepEqual(table.filter(r=>r[0]==='noisy-key').map(r=>[r[column('noiseKey')],r[column('noiseTriggers')]]),[['queue','3'],['pool','2']]);
 ok(await req('/api/schedules/payments-rota/overrides',{revision:1,override:{id:'floater-covers',role:'primary',start:iso(start+2*hour),end:iso(start+3*hour),member:floater.id}}));
 ok(await req('/api/reports/response.csv?'+csvQuery),409);
 const changed=ok(await req('/api/reports/response?'+window));assert.equal(changed.load.schedules[0].revision,2);assert.equal(changed.load.responders.find(r=>r.member===floater.id).primarySeconds,3600,'a schedule change is visible as a new revision, never a silent rewrite');
 ok(await req('/api/command',{type:'service',id:'search',name:'Search',environment:'production',owner:actor.id,runbook:[],pager:''}));
 ok(await req('/api/paging/schedules',{...rota,id:'search-rota',name:'Search New York rota',service:'search',timezone:'America/New_York',primary:{anchorLocal:'2026-03-07T09:00',periodDays:1,members:[shift.id,floater.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-03-07T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}));
 const dst=ok(await req('/api/reports/response?from=2026-03-07T14:00:00.000Z&to=2026-03-09T13:00:00.000Z&service=search'));
 assert.deepEqual(dst.load.responders.map(r=>[r.member,r.primarySeconds]),[[floater.id,24*3600],[shift.id,23*3600]],'the spring-forward shift holds 23 scheduled hours');
 console.log('PASS OC-037 response report keeps unknown cases visible and normalises load by scheduled coverage');
 // OC-040 receiving OC-037: member and incident erasure cannot silently shrink cohort denominators.
 const cohortBefore=ok(await req('/api/reports/response?'+window)),oldCsv=new URLSearchParams(window);oldCsv.set('revision',String(cohortBefore.revision));oldCsv.set('schedulingRevision',String(cohortBefore.load.schedulingRevision));
 ok(await req('/api/erasure/member/'+floater.id,{workspaceRevision:ok(await req('/api/state')).revision,confirmation:'erase '+floater.id,identitiesReviewed:true,importedPeople:[]}));
 const memberErased=ok(await req('/api/reports/response?'+window));assert.equal(memberErased.cohort.count,cohortBefore.cohort.count);assert.equal(memberErased.load.acknowledged,cohortBefore.load.acknowledged);
 const anonymousResponder=memberErased.load.responders.find(row=>row.member===floater.id);assert.equal(anonymousResponder.name,'Erased member');assert.equal(anonymousResponder.current,false);assert.equal(anonymousResponder.acknowledgements,1);assert.ok(!JSON.stringify(memberErased).includes(floater.name));
 const selected=declaredIds[0],erasePath='/api/erasure/incident/'+selected,input={workspaceRevision:ok(await req('/api/state')).revision,confirmation:'erase '+selected};
 const archiveBefore=ok(await req('/api/archive'));
 w.sql("CREATE TRIGGER synthetic_oncall_report_erasure BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='incident.erase' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-421'); END");
 try{ok(await req(erasePath,input),503);}finally{w.sql('DROP TRIGGER synthetic_oncall_report_erasure');}
 assert.deepEqual(ok(await req('/api/archive')),archiveBefore,'failed erasure cannot create a denominator case or remove the original');
 const receipt=ok(await req(erasePath,input));assert.equal(receipt.state,'complete');assert.equal(receipt.stores.oc_erased_report_cases.inserted,1);
 const erased=ok(await req('/api/reports/response?'+window)),caseRow=erased.incidents.find(row=>row.state==='erased');
 assert.equal(erased.cohort.count,cohortBefore.cohort.count);assert.equal(erased.cohort.erased,1);assert.equal(erased.load.unknownAcknowledgements,1);assert.equal(erased.load.unacknowledged,cohortBefore.load.unacknowledged);assert.ok(caseRow);assert.equal(caseRow.title,'Erased incident');assert.equal(caseRow.incidentRevision,null);assert.equal(caseRow.href,'');assert.ok(!JSON.stringify(erased).includes(selected));
 for(const metric of ['mtta','mttr','recovery','sourceRecovery']){assert.equal(caseRow[metric].status,'unknown');assert.equal(caseRow[metric].seconds,null);assert.equal(caseRow[metric].sourceEntryId,null);assert.equal(erased.aggregates[metric].total,cohortBefore.aggregates[metric].total);}
 const exact=new URLSearchParams(window);exact.set('revision',String(erased.revision));exact.set('schedulingRevision',String(erased.load.schedulingRevision));
 const erasedCsv=ok(await req('/api/reports/response.csv?'+exact)),rows=erasedCsv.trim().split('\r\n').map(line=>[...line.matchAll(/"((?:[^"]|"")*)"/g)].map(m=>m[1].replaceAll('""','"'))),col=name=>rows[0].indexOf(name);
 const erasedCsvRow=rows.find(row=>row[col('incidentId')]===caseRow.id);assert.ok(erasedCsvRow);assert.equal(erasedCsvRow[col('cohortCount')],String(erased.cohort.count));assert.equal(erasedCsvRow[col('erasedDeclarations')],'1');assert.equal(erasedCsvRow[col('title')],'Erased incident');assert.equal(erasedCsvRow[col('drilldown')],'');assert.equal(erasedCsvRow[col('incidentRevision')],'');
 for(const metric of ['mtta','mttr','recovery','sourceRecovery'])assert.equal(erasedCsvRow[col(metric+'.status')],'unknown');
 assert.ok(!erasedCsv.includes(floater.name));assert.ok(!erasedCsv.includes(selected));ok(await req('/api/reports/response.csv?'+oldCsv),409);
 const current=ok(await req('/api/archive')),withoutCases={...current,erasedReportCases:[]};ok(await req('/api/restore',{mode:'replace',archive:withoutCases}),409);assert.deepEqual(ok(await req('/api/archive')),current);
 const restoredCase=await req('/api/restore',{mode:'replace',archive:current});ok(restoredCase);cookie=restoredCase.cookie;
 await w.stop();await w.start();const durable=ok(await req('/api/reports/response?'+window));assert.equal(durable.cohort.count,erased.cohort.count);assert.equal(durable.incidents.find(row=>row.id===caseRow.id).mtta.status,'unknown');
 console.log('PASS OC-040 erasure-proof response denominators: erased member load remains explicit; incident becomes anonymous unknown case; audit rollback, matching CSV, changed-workspace refusal, current restore and restart preserve the cohort');

 console.log('Response learning: measured/censored/unknown reports and CSV, relapse drilldown, generated material, human review, prioritized evidence acceptance, authority and archive/restart passed');
}finally{await w.close();}

}
