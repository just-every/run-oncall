import {readinessHealth} from './readiness.mjs'
import {fileURLToPath} from 'node:url'
import http from 'node:http'
import {fixtureDatabase} from './fixture-database.mjs'
import assert from 'node:assert/strict'
import {heldWorkspace} from './worker.mjs'
import {spawn,spawnSync,execFileSync} from 'node:child_process'
import {mkdtemp,rm,mkdir,readdir,copyFile,writeFile,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {createHmac,pbkdf2Sync,createHash,randomBytes} from 'node:crypto'
import {createServer} from 'node:net'

const runtimePart=process.env.ONCALL_RUNTIME_PART??'all'
if(!['all','core','machines'].includes(runtimePart))throw Error(`Unknown runtime journey: ${runtimePart}`)
if(runtimePart!=='machines') {
 const started=performance.now();await coordinationJourney()
 console.log(`Runtime core completed (${((performance.now()-started)/1000).toFixed(1)}s)`)
}
if(runtimePart!=='core') {
 const started=performance.now()
await automationJourney();

// OC-043 extends the same oc_triage workflow custody with declaration and recorded notification steps.
{
 const {automationRuntime}=await import('./worker.mjs');const calls=[];
 const workflowRuntime=await automationRuntime(request=>{calls.push(request.url);return new Response('unexpected effect',{status:403});});
 try{
  const setup=await workflowRuntime.request('/api/setup',{name:'synthetic-oncall-443-owner',password:'synthetic-oncall-443-password'});assert.equal(setup.status,200);let currentCookie=setup.cookie;
  const call=(path,input,as=currentCookie)=>workflowRuntime.request(path,input,as),value=async(path,input,status=200)=>{const result=await call(path,input);assert.equal(result.status,status,JSON.stringify(result.value));return result.value;};
  const owner=setup.value.member,target=await value('/api/members',{name:'synthetic-oncall-443-responder',password:'synthetic-oncall-443-password',role:'responder'},201),viewer=await value('/api/members',{name:'synthetic-oncall-444-viewer',password:'synthetic-oncall-444-password',role:'viewer'},201);
  const targetLogin=await call('/api/login',{name:target.name,password:'synthetic-oncall-443-password'}),viewerLogin=await call('/api/login',{name:viewer.name,password:'synthetic-oncall-444-password'});
  const service=await value('/api/command',{type:'service',id:'synthetic-oncall-443',name:'Synthetic workflow service',environment:'test',owner:owner.id,runbook:['Synthetic copied runbook'],pager:''});
  const template={type:'service-template',service:service.id,baseVersion:0,severityWording:{critical:'Synthetic blocked',warning:'Synthetic delayed',info:'Synthetic investigation'},impactPrompt:'Synthetic impact',incidentTypes:[],checklist:[{id:'synthetic-oncall-443',text:'Synthetic frozen checklist'}],reason:'Synthetic reviewed template'};await value('/api/command',template);
  const key=randomBytes(32).toString('hex'),source='synthetic-oncall-443';await value('/api/sources',{id:source,key,scopes:[service.id]});
  for(let n=0;n<2;n++){const result=await workflowRuntime.request('/api/ingress/'+source,{source,eventId:'synthetic-oncall-443-'+n,service:service.id,environment:'test',key:'synthetic-oncall-443-'+n,generation:'synthetic-oncall-443-'+n,intent:'trigger',severity:'warning',title:'Synthetic orchestration '+n,observedAt:new Date().toISOString(),evidence:''},'',{authorization:'Bearer '+key});assert.equal(result.status,201);}
  const alerts=(await value('/api/state')).alerts.filter(row=>row.source===source),reason='Synthetic coordination for '+target.name;
  const input={operationId:target.name+'-workflow',action:'orchestrate',items:[{id:alerts[0].id,revision:alerts[0].revision??1,kind:'alert'}],confirmedCount:1,member:target.id,reason,durable:true};
  assert.equal((await call('/api/triage/workflows/preview',input,'')).status,401);assert.equal((await call('/api/triage/workflows/preview',input,viewerLogin.cookie)).status,403);assert.equal((await call('/api/triage/bulk',input,viewerLogin.cookie)).status,403);
  const before=await value('/api/state'),auditCount=async()=>Number((await workflowRuntime.db.prepare('SELECT COUNT(*) AS n FROM oc_admin_audit').first()).n),priorAudit=await auditCount();
  const preview=await value('/api/triage/workflows/preview',input);assert.equal(preview.effects,false);assert.deepEqual(preview.comparison.map(row=>row.step),['declare','notify']);assert.equal(preview.comparison[0].templateVersion,1);assert.equal(preview.comparison[0].checklist[0].text,'Synthetic frozen checklist');assert.equal(preview.comparison[1].label,'no sender');
  assert.deepEqual(await value('/api/triage/workflows/preview',input),preview);assert.deepEqual(await value('/api/state'),before);assert.equal(await auditCount(),priorAudit,'ordered replay creates zero durable or permanent-audit writes');
  await workflowRuntime.db.prepare("CREATE TRIGGER synthetic_oncall_443_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='triage.workflow-notify' AND NEW.workspace_after>NEW.workspace_before BEGIN SELECT RAISE(ABORT,'synthetic-oncall-443'); END").run();
  let interrupted;try{interrupted=await value('/api/triage/bulk',input);}finally{await workflowRuntime.db.prepare('DROP TRIGGER synthetic_oncall_443_audit').run();}
  assert.equal(interrupted.interrupted,true);assert.equal(interrupted.remaining,1);
  const held=await value('/api/state'),record=held.triage.find(row=>row.id===input.operationId);assert.equal(record.results.length,1);assert.equal(record.results[0].step,'declare');
  const declared=held.incidents.find(row=>row.id===record.results[0].incident);assert.equal(declared.template.version,1);assert.equal(declared.template.checklist[0].done,false);assert.equal(declared.responderRequests?.length??0,0,'notification and progress rolled back together');
  const interruptedAudit=(await value('/api/audit/export')).rows;assert.ok(interruptedAudit.some(row=>row.kind==='triage.workflow-declare'&&row.outcome==='accepted'&&row.workspaceAfter===row.workspaceBefore+1));assert.ok(interruptedAudit.some(row=>row.kind==='triage.workflow-notify'&&['uncertain','interrupted'].includes(row.outcome)));
  await workflowRuntime.restart();assert.deepEqual(await value('/api/state'),held,'restart retains the committed declaration and pending notification without running it');
  const resume='/api/triage/workflows/'+input.operationId+'/resume';assert.equal((await call(resume,{approve:true},'')).status,401);assert.equal((await call(resume,{approve:true},targetLogin.cookie)).status,403);assert.equal((await call(resume,{approve:false})).status,403);
  await value('/api/command',{...template,baseVersion:1,checklist:[{id:'synthetic-oncall-443',text:'Synthetic later checklist'}]});
  const completed=await value(resume,{approve:true});assert.equal(completed.remaining,0);assert.equal(completed.results.length,2);assert.ok(completed.results.every(row=>row.ok));
  const after=await value('/api/state'),incident=after.incidents.find(row=>row.id===declared.id);assert.equal(incident.template.version,1);assert.equal(incident.template.checklist[0].text,'Synthetic frozen checklist');assert.equal(incident.responderRequests.length,1);assert.equal(incident.responderRequests[0].obligation.label,'no sender');assert.equal(incident.responderRequests[0].obligation.paging,'off');assert.equal(incident.responderRequests[0].obligation.automatic,false);
  await value(resume,{approve:true});assert.deepEqual(await value('/api/state'),after,'completed declaration and notification are never repeated');
  const staleInput={...input,operationId:'synthetic-oncall-444-workflow',items:[{id:alerts[1].id,revision:alerts[1].revision??1,kind:'alert'}]};await value('/api/triage/bulk',{operationId:'synthetic-oncall-444-edit',action:'set-priority',priority:'P2',reason:'Synthetic concurrent edit',items:staleInput.items,confirmedCount:1});
  const refused=await value('/api/triage/bulk',staleInput);assert.equal(refused.remaining,0);assert.equal(refused.results.length,2);assert.ok(refused.results.every(row=>!row.ok));
  const archive=await value('/api/archive'),malformed=structuredClone(archive);malformed.triage.find(row=>row.id===input.operationId).workflow.version=2;await value('/api/restore',{mode:'replace',archive:malformed},400);
  const restored=await call('/api/restore',{mode:'replace',archive});assert.equal(restored.status,200,JSON.stringify(restored.value));currentCookie=restored.cookie;assert.deepEqual((await value('/api/state')).triage,archive.triage);
  const facts=(await value('/api/audit/export')).rows;const erased=await value('/api/erasure/member/'+target.id,{workspaceRevision:(await value('/api/state')).revision,confirmation:'erase '+target.id,identitiesReviewed:true,importedPeople:[]});assert.equal(erased.state,'complete');assert.ok(erased.stores.oc_triage.deleted>=2);
  const exported=await value('/api/archive');assert.ok(!exported.triage.some(row=>row.id===input.operationId));assert.ok(!JSON.stringify(exported).includes(target.name));await value(resume,{approve:true},404);
  const forged=structuredClone(exported);forged.triage.push({...archive.triage.find(row=>row.id===input.operationId),results:[]});await value('/api/restore',{mode:'replace',archive:forged},409);
  await value('/api/triage/bulk',{...input,member:owner.id,reason:'Synthetic explicit new request'},410);
  const auditAfter=new Map((await value('/api/audit/export')).rows.map(row=>[row.id,row]));for(const fact of facts)assert.deepEqual(auditAfter.get(fact.id),fact);assert.deepEqual(calls,[],'orchestration records obligations without a network effect');
  console.log('PASS OC-043 declaration and notification workflow: ordered zero-write replay, frozen template checklist, restart between steps, explicit author resume, atomic audit rollback/interrupted outcome, stale-step refusal, idempotency, strict archive and recipient-erasure-safe export; paging OFF');
 }finally{await workflowRuntime.close();}
}

// OC-043 approved rule launch shares admission and existing oc_triage step custody.
{
 const {automationRuntime}=await import('./worker.mjs'),effects=[];
 const runtime=await automationRuntime(request=>{effects.push(request.url);return new Response('refused',{status:403});});
 try{
  const setup=await runtime.request('/api/setup',{name:'synthetic-oncall-450',password:'synthetic-oncall-450-password'});assert.equal(setup.status,200);let session=setup.cookie;
  const call=(path,input,as=session)=>runtime.request(path,input,as),value=async(path,input,status=200)=>{const response=await call(path,input);assert.equal(response.status,status,JSON.stringify(response.value));return response.value;};
  const owner=setup.value.member,target=await value('/api/members',{name:'synthetic-oncall-451',password:'synthetic-oncall-451-password',role:'responder'},201),viewer=await value('/api/members',{name:'synthetic-oncall-452',password:'synthetic-oncall-452-password',role:'viewer'},201);
  const viewerSession=(await call('/api/login',{name:viewer.name,password:'synthetic-oncall-452-password'})).cookie;
  const service=await value('/api/command',{type:'service',id:'synthetic-oncall-450',name:'Synthetic approved workflow',environment:'test',owner:owner.id,runbook:['Synthetic retained runbook'],pager:''});
  const template={type:'service-template',service:service.id,baseVersion:0,severityWording:{critical:'Synthetic blocked',warning:'Synthetic delayed',info:'Synthetic investigation'},impactPrompt:'Synthetic impact',incidentTypes:[],checklist:[{id:'synthetic-oncall-450',text:'Synthetic launch-time checklist'}],reason:'Synthetic reviewed checklist'};
  await value('/api/command',template);
  const draft={type:'policy',service:service.id,severity:'*',action:'route',owner:owner.id,reason:'Synthetic approved service rule',baseVersion:0,workflow:{version:1,approved:true,member:target.id,reason:'Synthetic coordination for '+target.name}};
  const beforeApproval=await value('/api/state');await value('/api/command',{...draft,workflow:{...draft.workflow,approved:false}},409);await value('/api/command',{...draft,workflow:{...draft.workflow,version:0}},409);assert.equal((await call('/api/command',draft,viewerSession)).status,403);assert.deepEqual(await value('/api/state'),beforeApproval,'unapproved/stale workflow publication changes no accepted state');
  const policy=await value('/api/command',draft);assert.equal(policy.workflow.by,owner.id);assert.equal(policy.workflow.version,1);
  const key=randomBytes(32).toString('hex'),source='synthetic-oncall-450';await value('/api/sources',{id:source,key,scopes:[service.id]});
  const signal={source,eventId:'synthetic-oncall-450',service:service.id,environment:'test',key:'synthetic-oncall-450',generation:'synthetic-oncall-450',intent:'trigger',severity:'warning',title:'Synthetic approved alert',observedAt:new Date().toISOString(),evidence:''};
  const send=input=>runtime.request('/api/ingress/'+source,input,'',{authorization:'Bearer '+key});
  const counts=async()=>{const tables=(await runtime.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all()).results;return Promise.all(tables.map(async row=>[row.name,(await runtime.db.prepare('SELECT COUNT(*) AS n FROM "'+row.name+'"').first()).n]));};
  const beforeReplay=await value('/api/state'),beforeCounts=await counts(),preview=await value('/api/replay',{events:[signal]});assert.equal(preview.sideEffects,false);assert.deepEqual(preview.decisions[0].proposedWorkflow.steps,['reassign','declare','notify']);assert.equal(preview.decisions[0].proposedWorkflow.workflowVersion,1);assert.deepEqual((await value('/api/replay',{events:[signal,{...signal,eventId:'synthetic-oncall-454'}]})).decisions.map(r=>!!r.proposedWorkflow),[true,false],'ordered replay proposes one launch per generation');assert.deepEqual(await counts(),beforeCounts,'rule-launch dry-run writes zero durable or permanent-audit rows');assert.deepEqual(await value('/api/state'),beforeReplay);
  await runtime.db.prepare("CREATE TRIGGER synthetic_oncall_450_launch BEFORE INSERT ON oc_admin_audit WHEN NEW.feature='ingest' AND NEW.workspace_after>NEW.workspace_before BEGIN SELECT RAISE(ABORT,'synthetic-oncall-450'); END").run();
  try{assert.equal((await send(signal)).status,503);}finally{await runtime.db.prepare('DROP TRIGGER synthetic_oncall_450_launch').run();}assert.deepEqual(await value('/api/state'),beforeReplay,'admission, launch, first step and audit roll back together');
  assert.equal((await send(signal)).status,201);assert.equal((await send(signal)).status,200);assert.equal((await send({...signal,eventId:'synthetic-oncall-456'})).status,201);
  let state=await value('/api/state'),run=state.triage.find(row=>row.rule);assert.equal(state.triage.filter(row=>row.rule).length,1);assert.equal(run.results.length,1);assert.equal(run.results[0].step,'reassign');assert.equal(run.rule.generation,signal.generation);assert.equal(run.rule.workflowVersion,1);assert.equal(run.rule.policyVersion,policy.version);assert.equal(state.incidents.length,0);
  const resume='/api/triage/workflows/'+run.id+'/resume',clear='/api/triage/workflows/'+run.id+'/clear-expired';
  assert.equal((await call(resume,{approve:true,revision:run.rule.revision},'')).status,401);assert.equal((await call(resume,{approve:true,revision:run.rule.revision},viewerSession)).status,403);await value(resume,{approve:false,revision:run.rule.revision},403);await value('/api/triage/bulk',{operationId:run.id,action:'orchestrate',...run.workflow,confirmedCount:1,durable:true},409);
  await value('/api/command',{...template,baseVersion:1,checklist:[{id:'synthetic-oncall-450',text:'Synthetic later checklist'}]});
  await runtime.db.prepare("CREATE TRIGGER synthetic_oncall_450_step BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='triage.workflow-declare' AND NEW.workspace_after>NEW.workspace_before BEGIN SELECT RAISE(ABORT,'synthetic-oncall-450'); END").run();
  try{await value(resume,{approve:true,revision:run.rule.revision},503);}finally{await runtime.db.prepare('DROP TRIGGER synthetic_oncall_450_step').run();}
  state=await value('/api/state');run=state.triage.find(row=>row.rule);assert.equal(run.rule.state,'running');assert.equal(run.rule.outcome,'uncertain');assert.equal(run.results.length,1);assert.equal(state.incidents.length,0,'declaration and progress roll back with the step audit');assert.ok((await value('/api/audit/export')).rows.some(row=>row.kind==='triage.workflow-reserve'&&row.outcome==='accepted'));
  await runtime.restart();assert.deepEqual(await value('/api/state'),state,'restart never resumes a saved lease');await value(clear,{approve:true,revision:run.rule.revision},409);
  for(const [kind,id] of [['member',target.id],['native',source]]){await value('/api/erasure/'+kind+'/'+id,{workspaceRevision:state.revision,confirmation:'erase '+id,identitiesReviewed:true,importedPeople:[]},409);assert.deepEqual(await value('/api/state'),state,'an active or uncertain workflow lease prevents partial subject erasure');}
  const expire=async()=>{await runtime.db.prepare("UPDATE oc_triage SET data=json_set(data,'$.rule.leaseUntil',?) WHERE id=?").bind(new Date(Date.now()-1000).toISOString(),run.id).run();run=(await value('/api/state')).triage.find(row=>row.id===run.id);};
  await expire();const clears=await Promise.all([call(clear,{approve:true,revision:run.rule.revision}),call(clear,{approve:true,revision:run.rule.revision})]);assert.deepEqual(clears.map(r=>r.status).sort(),[200,409],'concurrent expired-lease clearance answers one conflict');run=clears.find(r=>r.status===200).value;assert.equal(run.rule.state,'interrupted');assert.ok((await value('/api/audit/export')).rows.some(row=>row.kind==='triage.workflow-clear-expired'&&row.outcome==='interrupted'));
  const concurrent=await Promise.all([call(resume,{approve:true,revision:run.rule.revision}),call(resume,{approve:true,revision:run.rule.revision})]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409],'concurrent same-run resume answers conflict, never drops');
  state=await value('/api/state');run=state.triage.find(row=>row.rule);assert.equal(run.results.length,2);assert.equal(run.results[1].ok,true,JSON.stringify(run.results[1]));const declared=state.incidents.find(row=>row.id===run.results[1].incident);assert.equal(declared.template.version,1);assert.equal(declared.template.checklist[0].text,'Synthetic launch-time checklist');assert.equal(declared.responderRequests?.length??0,0);
  await runtime.restart();assert.deepEqual(await value('/api/state'),state,'restart between steps retains declaration and pending notification');
  run=await value(resume,{approve:true,revision:run.rule.revision});assert.equal(run.rule.state,'complete');assert.equal(run.results.length,3);
  const completed=await value('/api/state'),incident=completed.incidents.find(row=>row.id===declared.id);assert.equal(incident.responderRequests.length,1);assert.equal(incident.responderRequests[0].obligation.label,'no sender');assert.equal(incident.responderRequests[0].obligation.paging,'off');assert.equal(incident.responderRequests[0].obligation.automatic,false);
  await value(resume,{approve:true,revision:run.rule.revision});assert.deepEqual(await value('/api/state'),completed,'completed rule steps are never repeated');const afterCounts=await counts();await value('/api/replay',{events:[signal]});assert.deepEqual(await counts(),afterCounts,'historical replay launches nothing and writes no audit');
  const facts=(await value('/api/audit/export')).rows;for(const step of ['declare','notify'])assert.ok(facts.some(row=>row.kind==='triage.workflow-'+step&&row.outcome==='accepted'&&row.workspaceAfter===row.workspaceBefore+1),'step and permanent audit commit atomically');
  const routedId='synthetic-oncall-453',routedKey=randomBytes(16).toString('hex');
  const routedDefinition=await value('/api/routing/keys',{id:routedId,name:'Synthetic approved route',provider:'pagerduty',scope:[service.id],owner:owner.id,key:routedKey,revision:0,rules:[],catchAll:service.id},201);
  await value('/v2/enqueue',{routing_key:routedKey,event_action:'trigger',dedup_key:routedId,payload:{summary:'Synthetic routed approved launch',source:routedId,severity:'warning'}},202);
  const routedState=await value('/api/state'),routedReceipt=routedState.intakeReceipts.find(r=>r.source===routedId);assert.equal(routedReceipt.routing.version,routedDefinition.routing.versions.at(-1).version);assert.equal(routedReceipt.routing.serviceDecision.version,policy.version);assert.ok(routedState.triage.some(r=>r.rule?.alert===routedReceipt.alert&&r.rule.policyVersion===policy.version&&r.rule.workflowVersion===1),'routed-key selection precedes the approved service workflow launch');
  const archive=await value('/api/archive'),malformed=structuredClone(archive);malformed.triage.find(row=>row.rule).rule.workflowVersion++;await value('/api/restore',{mode:'replace',archive:malformed},400);
  const restored=await call('/api/restore',{mode:'replace',archive});assert.equal(restored.status,200,JSON.stringify(restored.value));session=restored.cookie;assert.equal((await value('/api/state')).policies.find(row=>row.id===policy.id).workflow.held,true,'restore holds approval without inventing authority or effects');
  const afterRestore=await value('/api/state'),heldPolicy=afterRestore.policies.find(row=>row.id===policy.id);
  await value('/api/command',{...draft,baseVersion:heldPolicy.version,workflow:{version:heldPolicy.workflow.version+1,approved:true,member:owner.id,reason:'Synthetic explicit post-restore approval'}});
  const erasedSource='synthetic-oncall-454',erasedKey=randomBytes(32).toString('hex');await value('/api/sources',{id:erasedSource,key:erasedKey,scopes:[service.id]});
  const erasedAdmission=await runtime.request('/api/ingress/'+erasedSource,{...signal,source:erasedSource,eventId:erasedSource,key:erasedSource,generation:erasedSource},'',{authorization:'Bearer '+erasedKey});assert.equal(erasedAdmission.status,201);
  const beforeSourceErasure=await value('/api/state'),erasedRun=beforeSourceErasure.triage.find(row=>row.rule?.generation===erasedSource);assert.ok(erasedRun);
  await value('/api/triage/bulk',{operationId:'synthetic-oncall-455',action:'set-priority',priority:'P2',reason:'Synthetic intervening human coordination',items:[{id:erasedRun.rule.alert,revision:beforeSourceErasure.alerts.find(a=>a.id===erasedRun.rule.alert).revision,kind:'alert'}],confirmedCount:1});
  const changedRun=await value('/api/triage/workflows/'+erasedRun.id+'/resume',{approve:true,revision:erasedRun.rule.revision});assert.equal(changedRun.results[1].ok,false);assert.match(changedRun.results[1].error,/Alert coordination changed/);assert.ok(!(await value('/api/state')).incidents.some(i=>i.alerts.includes(erasedRun.rule.alert)),'a human coordination change cannot be silently adopted by the approved declaration');
  const sourceReceipt=await value('/api/erasure/native/'+erasedSource,{workspaceRevision:(await value('/api/state')).revision,confirmation:'erase '+erasedSource});assert.equal(sourceReceipt.state,'complete');assert.equal(sourceReceipt.stores.oc_triage.deleted,2,'source erasure removes the workflow and the intervening human bulk receipt');const sourceExport=await value('/api/archive');assert.ok(!sourceExport.triage.some(row=>row.id===erasedRun.id||row.id==='synthetic-oncall-455'));assert.ok(!sourceExport.alerts.some(row=>row.id===erasedRun.rule.alert),'erasing the source alert removes its pending workflow from exports');
  const erased=await value('/api/erasure/member/'+target.id,{workspaceRevision:(await value('/api/state')).revision,confirmation:'erase '+target.id,identitiesReviewed:true,importedPeople:[]});assert.equal(erased.state,'complete');assert.equal(erased.stores.oc_triage.deleted,2);const exported=await value('/api/archive');assert.equal((exported.triage??[]).length,0,'member erasure removes every remaining workflow');assert.ok(!JSON.stringify(exported).includes(target.name),'member erasure removes workflow definitions and their frozen named copies');await value(resume,{approve:true,revision:run.rule.revision},404);
  const auditAfter=new Map((await value('/api/audit/export')).rows.map(row=>[row.id,row]));for(const fact of facts)assert.deepEqual(auditAfter.get(fact.id),fact);assert.deepEqual(effects,[]);
  for(let n=0;n<20;n++){
   const current=(await value('/api/state')).policies.find(p=>p.id===policy.id),beforeIds=new Set((await value('/api/audit/export')).rows.map(r=>r.id));
   const update={...draft,baseVersion:current.version,workflow:{version:current.workflow.version+1,approved:true,member:owner.id,reason:'Synthetic reviewed rule race '+n}};
   const race=await Promise.all([call('/api/command',update),call('/api/command',update)]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
   const rows=(await value('/api/audit/export')).rows.filter(r=>!beforeIds.has(r.id)&&r.kind==='command.policy');assert.equal(rows.filter(r=>r.outcome==='accepted').length,1);assert.equal(rows.filter(r=>r.outcome==='refused').length,1,'one conflicting rule update retains one refusal');
  }
  console.log('PASS OC-043 approved rule workflows: atomic admission/first-step rollback, one run per generation, ordered zero-write replay, explicit version approval, frozen launch checklist, leased interruption and explicit clearance, concurrent resume 409, restart between steps, atomic step/audit, held restore and subject-erasure-safe export; recorded obligations only, paging OFF');
 }finally{await runtime.close();}
}


 console.log(`Runtime machines completed (${((performance.now()-started)/1000).toFixed(1)}s)`)
}
if(runtimePart!=='machines') {
// The same emitted build must serve every public linked page in hosted mode.
{
const {default:assert}=await import('node:assert/strict')
const {readdir,readFile}=await import('node:fs/promises')
const {join}=await import('node:path')
const {serveHosted}=await import('@runeditrun/rer/internal/cli/hosted-output.mjs')

// Every page or file the app links, and every built HTML file, must answer when the build is served
// the way rer deploy hosts it (the Worker runs before the static assets). A link that redirects and
// then falls through to the app's 404 fails here, whichever file it names.
const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]))).flat()
const links=new Set;for(const file of (await walk('src')).filter(f=>/\.tsx$/.test(f)))for(const m of (await readFile(file,'utf8')).matchAll(/href="(\/[^"#?]+)"/g))links.add(m[1])
for(const file of (await walk('dist/client')).filter(f=>f.endsWith('.html')))links.add(file.slice('dist/client'.length))
assert.ok(links.size>0,'the app links at least one built file')
const hosted=await serveHosted(process.cwd())
try{
 const health=await hosted.fetch('health');assert.equal(health.status,200)
 const body=await health.json();assert.equal(body.ok,true);assert.equal(body.storage,'available');assert.equal(body.target,'coordination');assert.equal(body.paging,'not-provided')
 assert.deepEqual(body.deployment,hosted.identity,'the built hosted Worker reports the exact supplied source, fingerprint and version identity')
 console.log('OC-010 hosted-mode production output: deployment identity matches; no provider deployment, delivery, drill or capacity result inferred')
 for(const link of links) {
  let path=link.slice(1),status
  for(let hop=0;hop<3;hop++){const r=await hosted.fetch(path);await r.arrayBuffer();status=r.status;const next=r.headers.get('location');if(status<300||status>=400||!next)break;path=next.replace(/^\//,'')}
  assert.equal(status,200,`${link} must answer 200 when hosted (ended at ${status})`)
 }
 const old=await hosted.fetch('move-in-guide');await old.arrayBuffer();assert.equal(old.headers.get('location'),'/docs/move-in','the old guide link leads to the docs page')
 const guide=await hosted.fetch('docs/move-in');assert.equal(guide.status,200);await guide.arrayBuffer()
 console.log(`Hosted links passed: ${links.size} linked page or file(s) answer 200 through the hosted Worker`)
}finally{await hosted.close()}

}


}

async function coordinationJourney() {
// coordination-health: part of this public journey.
// Read the public commands and recover from an actual storage outage without
// changing held records or claiming pager coverage.
async function coordinationHealth({request,sql,deployment,cookie}) {
 const ok=r=>{assert.equal(r.status,200,JSON.stringify(r.value));return r.value}
 const cli=fileURLToPath(import.meta.resolve('@runeditrun/rer/internal/bin/rer.mjs'))
 const command=args=>execFileSync(process.execPath,[cli,...args,'--json'],{encoding:'utf8',env:{...process.env,CI:'true'},stdio:['ignore','pipe','pipe']}).trim().split('\n').map(line=>JSON.parse(line)).at(-1)
 const commands=()=>{
  const described=command(['describe']),checked=command(['check','--profile','first-party'])
  assert.equal(checked.ok,true);assert.ok(checked.clauses.every(c=>c.ok))
  return described
 }
 const healthy=ok(await request('/health'))
 assert.deepEqual(healthy.deployment,deployment,'the emitted build identifies its actual source and artifact')
 assert.equal(healthy.ok,true);assert.equal(healthy.storage,'available');assert.equal(healthy.target,'coordination');assert.equal(healthy.paging,'not-provided')
 const before=ok(await request('/api/archive',undefined,cookie)),description=commands()
 assert.deepEqual(ok(await request('/api/archive',undefined,cookie)),before,'check and describe leave durable coordination unchanged')
 sql('ALTER TABLE workspace_control RENAME TO workspace_fault')
 try {
  const failed=await request('/health');assert.equal(failed.status,503)
  assert.equal(failed.value.ok,false);assert.equal(failed.value.storage,'unavailable')
  assert.equal(failed.value.target,'coordination');assert.equal(failed.value.paging,'not-provided')
  assert.deepEqual(failed.value.deployment,deployment,'failure still identifies the deployed build')
  assert.equal(typeof failed.value.error,'string')
  assert.equal((await request('/api/state',undefined,cookie)).status,503)
  assert.deepEqual(commands(),description,'read-only command effects remain available during storage failure')
 }finally{sql('ALTER TABLE workspace_fault RENAME TO workspace_control')}
 assert.deepEqual(ok(await request('/health')),healthy,'storage recovery restores the same healthy deployment')
 assert.deepEqual(ok(await request('/api/archive',undefined,cookie)),before,'failure and recovery lose no records')
 console.log('OC-010 coordination health, deployment identity and honest command effects survive storage failure: local 503/recovery and read-only check/describe; paging not provided; capacity unmeasured')
}


// runtime-authority: part of this public journey.
// Hold the last request byte on a real HTTP connection while another request
// removes authority. No Worker hooks or substitute storage are involved.
async function heldMutation(origin, path, input, cookie, whileHeld) {
  const bytes = Buffer.from(JSON.stringify(input));
  let sent;
  const response = new Promise((resolve, reject) => {
    sent = http.request(origin + path, { method: 'POST', agent: false, headers: {
      origin, cookie, 'content-type': 'application/json', 'content-length': bytes.length,
    } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => {
        let value;
        try { value = JSON.parse(Buffer.concat(chunks).toString()); }
        catch { return reject(new Error('Held mutation returned a non-JSON response')); }
        resolve({ status: res.statusCode, value });
      });
    });
    sent.setTimeout(30000, () => sent.destroy(new Error('Held mutation timed out')));
    sent.on('error', reject);
  });
  // Attach a rejection handler immediately, including when the intervening
  // request fails and the held socket is destroyed during cleanup.
  response.catch(() => {});
  try {
    await new Promise((resolve, reject) => sent.write(bytes.subarray(0, -1), error => error ? reject(error) : resolve()));
    await whileHeld();
    sent.end(bytes.subarray(-1));
    return await response;
  } finally {
    sent.destroy();
  }
}

async function awaitingCoordinationAuthority({ origin, request, cookie, incident }) {
  const ok = (r, status = 200) => { assert.equal(r.status, status, JSON.stringify(r.value)); return r.value; };
  const password = 'synthetic-held-request-fixture-password';
  const member = ok(await request('/api/members', { name: 'Held responder', role: 'responder', password }, cookie), 201);
  const login = async () => { const r = await request('/api/login', { name: member.name, password }); ok(r); return r.cookie; };
  const current = async () => ok(await request('/api/state', undefined, cookie));
  for (const change of ['downgrade', 'revoke']) {
    const actorCookie = await login();
    const before = await current();
    const item = before.incidents.find(row => row.id === incident);
    let afterAuthority;
    const result = await heldMutation(origin, '/api/command', {
      type: 'note', incident, revision: item.revision, text: `Must not publish after ${change}`,
    }, actorCookie, async () => {
      ok(await request('/api/state', undefined, actorCookie));
      if (change === 'downgrade') ok(await request('/api/command', { type: 'member', id: member.id, role: 'viewer', active: true }, cookie));
      else ok(await request('/api/logout', {}, actorCookie));
      afterAuthority = await current();
    });
    assert.ok([401, 403, 409].includes(result.status), `held ${change} mutation must be denied, got ${result.status}`);
    assert.deepEqual(await current(), afterAuthority, `held ${change} cannot publish any coordination state`);
    if (change === 'downgrade') ok(await request('/api/command', { type: 'member', id: member.id, role: 'responder', active: true }, cookie));
  }
}

// Each request closes its connection: a pooled one the local Worker closed while the test read D1 through wrangler would fail the next request before it is sent.
const fetch = (url, init = {}) => globalThis.fetch(url, { ...init, headers: { ...init.headers, connection: "close" } });
let persist = await mkdtemp(join(tmpdir(), "oncall-test-"));
const port = await new Promise((resolve) => { const s = createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const origin = `http://127.0.0.1:${port}`;
const buildConfig=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
const deployment={sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),fingerprint:createHash('sha256').update(await readFile(resolve('dist/server',buildConfig.main))).digest('hex'),versionId:null};
let worker;
let logs = "";
const originalPersist = persist;
let portablePersist;
const cli = ["node_modules/wrangler/bin/wrangler.js"];
const migration = () => {
  const r = spawnSync(
    process.execPath,
    [
      ...cli,
      "d1",
      "migrations",
      "apply",
      "DB",
      "--local",
      "--persist-to",
      persist,
    ],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr + r.stdout);
};
function sql(command) { fixtureDatabase(persist,command); }
const rows=command=>fixtureDatabase(persist,command)[0];
const sessionSecret = randomBytes(32).toString("hex");
async function start() {
  worker = spawn(
    process.execPath,
    [
      ...cli,
      "dev",
      "--local",
      "--config",
      "dist/server/wrangler.json",
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--inspector-port",
      "0",
      "--var",
      "SESSION_SECRET:"+sessionSecret,
      "--var",
      "AUTH_ORIGIN:"+origin,
      "--var",
      "RER_DEPLOY_SOURCE:"+deployment.sourceSha,
      "--var",
      "RER_DEPLOY_FINGERPRINT:"+deployment.fingerprint,
      "--persist-to",
      persist,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  worker.stdout.on("data", (v) => (logs += v));
  worker.stderr.on("data", (v) => (logs += v));
  for (let i = 0; i < 120; i++) {
    if (worker.exitCode !== null) throw Error(logs);
    try {
      if ((await fetch(origin + "/health")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw Error(logs);
}
async function stop() {
  worker.kill("SIGTERM");
  await new Promise((r) =>
    worker.exitCode !== null ? r() : worker.once("exit", r),
  );
}
async function request(path, data, cookie = "", headers = {}) {
  return rawRequest(path, data === undefined ? undefined : JSON.stringify(data), cookie, headers);
}
async function rawRequest(path, raw, cookie = "", headers = {}) {
  const response = await fetch(origin + path, {
    method: raw === undefined ? "GET" : "POST",
    headers: { origin, "content-type": "application/json", cookie, ...headers },
    body: raw,
  });
  let value;
  try {
    value = await response.json();
  } catch {
    value = null;
  }
  return {
    status: response.status,
    value,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
const ok = (r, status = 200) => {
  assert.equal(r.status, status, JSON.stringify(r.value));
  return r.value;
};
// OC-041 accepted state and its audit entry commit together, survive subject erasure and export without secrets.
async function auditExport(cookie) {
  const exported = ok(await request("/api/audit/export", undefined, cookie));
  assert.equal(exported.schemaVersion, 1);
  assert.ok(Array.isArray(exported.rows));
  return exported;
}
async function auditedMutation(cookie, perform) {
  const before = ok(await request("/api/state", undefined, cookie));
  const prior = await auditExport(cookie), ids = new Set(prior.rows.map(row => row.id));
  const response = await perform();
  const after = ok(await request("/api/state", undefined, cookie));
  const added = (await auditExport(cookie)).rows.filter(row => !ids.has(row.id));
  const committed = added.filter(row => row.outcome === "accepted" && row.kind !== "audit.export");
  assert.ok(committed.some(row => row.workspaceBefore === before.revision && row.workspaceAfter === after.revision),
    "accepted state and an audit entry expose the same committed workspace revisions");
  for (const row of committed) {
    assert.ok(row.afterRevision > row.beforeRevision, "an accepted mutation advances the audit clock");
    assert.ok(Number.isFinite(Date.parse(row.at)), "audit entries carry a valid time");
  }
  return { response, committed, before, after };
}
function auditSqlRefused(command) {
  assert.throws(()=>fixtureDatabase(persist,command),'audit history refuses SQL mutation');
}
// OC-042 held signed-source custody survives upgrade, rotation, revocation and archive exclusion without secret echoes.
async function heldSourceCustody(cookie, heldSignedKey, heldBearerKey, digest) {
  const signal = (source, eventId, extra = {}) => ({ source, eventId, service: "prior-service", environment: "production", key: "custody",
    generation: "upgrade", intent: "trigger", severity: "warning", title: "Held signed source after upgrade", observedAt: new Date().toISOString(), evidence: "", ...extra });
  const signed = (key, value, source = "held-signed") => {
    const raw = JSON.stringify(value), ts = String(Math.floor(Date.now() / 1000));
    return rawRequest("/api/ingress/" + source, raw, "", { "x-oncall-timestamp": ts, "x-oncall-signature": createHmac("sha256", key).update(ts + "." + raw).digest("hex") });
  };
  const bearer = (key, value) => rawRequest("/api/ingress/held-bearer", JSON.stringify(value), "", { authorization: "Bearer " + key });
  const held = rows("SELECT id,digest,signing_secret,signing_custody,scopes FROM sources ORDER BY id");
  assert.deepEqual(held.map(({ id, digest, signing_secret, scopes }) => ({ id, digest, signing_secret, scopes })),
    [{ id: "held-bearer", digest: digest(heldBearerKey), signing_secret: null, scopes: '["prior-service"]' }, { id: "held-signed", digest: digest(heldSignedKey), signing_secret: null, scopes: '["prior-service"]' }],
    "the first request after upgrade clears every held plaintext key and keeps identities, digests and scopes");
  assert.equal(held[0].signing_custody, null, "bearer sources keep only a digest");
  assert.match(held[1].signing_custody, /^v1\.[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*$/, "the held signing key is sealed under installation custody");
  assert.ok(!held[1].signing_custody.includes(heldSignedKey));
  const first = ok(await signed(heldSignedKey, signal("held-signed", "after-upgrade")), 201);
  ok(await signed(randomBytes(32).toString("hex"), signal("held-signed", "wrong-key")), 401);
  ok(await bearer(heldBearerKey, signal("held-bearer", "bearer-after-upgrade")), 201);
  ok(await bearer(heldBearerKey, signal("held-bearer", "unscoped", { service: "a-service", environment: "staging" })), 403);
  // Native admission keeps caller text, so an event carrying its own key is refused before anything is stored.
  const echoes = [
    await signed(heldSignedKey, signal("held-signed", "echo-title", { title: "Leaked " + heldSignedKey.toUpperCase() })),
    await signed(heldSignedKey, signal("held-signed", "echo-link", { evidence: "https://example.test/check?token=" + encodeURIComponent(heldSignedKey) })),
    await bearer(heldBearerKey, signal("held-bearer", "echo-" + heldBearerKey)),
  ];
  for (const echo of echoes) { assert.equal(echo.status, 400); assert.match(echo.value.error, /source key out of event content/); }
  // A sealed key that cannot be opened refuses ingress visibly; plaintext can never be written back.
  await stop();
  const sealed = held[1].signing_custody, [version, iv, ciphertext] = sealed.split(".");
  sql(`UPDATE sources SET signing_custody='${[version, iv, Buffer.from(ciphertext, "base64").map((b, n) => n === 0 ? b ^ 1 : b).toString("base64")].join(".")}' WHERE id='held-signed'`);
  for (const write of [`INSERT INTO sources(id,digest,signing_secret,scopes) VALUES('plain','x','${"p".repeat(32)}','[]')`, `UPDATE sources SET signing_secret='${"p".repeat(32)}' WHERE id='held-bearer'`]) {
    const refused = spawnSync(process.execPath, [...cli, "d1", "execute", "DB", "--local", "--persist-to", persist, "--command", write], { encoding: "utf8" });
    assert.notEqual(refused.status, 0, "plaintext signing keys cannot be written after the custody migration");
  }
  await start();
  const unreadable = await signed(heldSignedKey, signal("held-signed", "unreadable"));
  assert.equal(unreadable.status, 503); assert.match(unreadable.value.error, /cannot be opened/);
  // Rotation is one guarded statement: the earlier key stops admitting events when it commits.
  const rotated = randomBytes(32).toString("hex"), raced = randomBytes(32).toString("hex");
  const configure = (key) => request("/api/sources", { id: "held-signed", key, mode: "signed", scopes: ["prior-service"] }, cookie);
  const saved = ok(await configure(rotated));
  assert.deepEqual(saved, { id: "held-signed", authentication: "signed", credential: "encrypted in this installation; never returned", effect: "intake only; no read access" });
  ok(await signed(heldSignedKey, signal("held-signed", "rotated-out")), 401);
  ok(await signed(rotated, signal("held-signed", "rotated-in")), 201);
  ok(await request("/api/sources", { id: "echo-" + rotated, key: rotated, mode: "signed", scopes: ["prior-service"] }, cookie), 400);
  const [inFlight, rotation] = await Promise.all([signed(rotated, signal("held-signed", "in-flight")), configure(raced)]);
  // Admission advances the workspace revision, so a rotation that lost the race asks for a reload.
  if (rotation.status === 409) ok(await configure(raced)); else ok(rotation);
  assert.ok([201, 401, 409].includes(inFlight.status), "an event racing rotation is admitted under the old key or refused, never half-stored");
  ok(await signed(rotated, signal("held-signed", "after-race")), 401);
  ok(await signed(raced, signal("held-signed", "after-race")), 201);
  const listed = ok(await request("/api/sources", undefined, cookie));
  assert.deepEqual(listed.sources, [
    { id: "held-bearer", authentication: "bearer", custody: "digest only", scopes: ["prior-service"] },
    { id: "held-signed", authentication: "signed", custody: "encrypted in this installation", scopes: ["prior-service"] },
  ], "setup reads show secret-free definitions only");
  ok(await request("/api/sources", undefined, ""), 401);
  // Revocation removes the held key atomically; accepted history stays.
  const revoked = ok(await request("/api/sources/held-signed/revoke", {}, cookie));
  assert.equal(revoked.revoked, true);
  ok(await signed(raced, signal("held-signed", "after-revoke")), 401);
  ok(await request("/api/sources/held-signed/revoke", {}, cookie), 404);
  const custody = rows("SELECT signing_custody FROM sources WHERE signing_custody IS NOT NULL").map(row => row.signing_custody);
  const state = ok(await request("/api/state", undefined, cookie));
  assert.ok(state.events.some(event => event.id === first.id), "events accepted before revocation remain");
  assert.ok(!state.events.some(event => /^echo/.test(event.eventId)), "refused echoes leave no event");
  const retained = [JSON.stringify(state), JSON.stringify(ok(await request("/api/archive", undefined, cookie))),
    JSON.stringify(ok(await request("/api/recovery/checkpoint", undefined, cookie))), JSON.stringify(listed), JSON.stringify(saved)].join("\n").toLowerCase();
  for (const secret of [heldSignedKey, heldBearerKey, rotated, raced, sealed, ...custody])
    assert.ok(!retained.includes(secret.toLowerCase()), "no source key or custody value reaches workspace, audit, archive, checkpoint or setup reads");
  console.log("PASS OC-042 held signed-source custody survives upgrade, rotation, revocation and archive exclusion without secret echoes");
}
try {
  const legacyDirectory=join(persist,'legacy-migrations');await mkdir(legacyDirectory);
  for(const name of (await readdir('migrations/core')).filter(name=>/^\d{4}_/.test(name) && Number(name.slice(0,4)) < 106))await copyFile(join('migrations/core',name),join(legacyDirectory,name));
  const legacyConfig=join(persist,'legacy.json');await writeFile(legacyConfig,JSON.stringify({name:'oncall-legacy',compatibility_date:'2026-09-08',d1_databases:[{binding:'DB',database_name:'oncall-local',database_id:'00000000-0000-0000-0000-000000000001',migrations_dir:legacyDirectory}]}));
  const initial = spawnSync(process.execPath, [...cli, "d1", "migrations", "apply", "DB", "--config",legacyConfig,"--local", "--persist-to", persist], {encoding:"utf8",env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}});
  assert.equal(initial.status,0,initial.stderr);
  const preserved = JSON.stringify(heldWorkspace());
  sql("INSERT INTO workspace(id,revision,data) VALUES(1,3,'"+preserved.replaceAll("'","''")+"'); INSERT INTO credentials VALUES('prior-admin','prior-salt','"+pbkdf2Sync('synthetic-local-testing-password','prior-salt',100000,32,'sha256').toString('hex')+"')");
  const oldSchedule={id:'prior-schedule',name:'Prior rota',service:'prior-service',revision:1,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:['prior-admin'],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]};
  const legacyTimer={id:'prior-timer',incident:'retained-orphan',service:'prior-service',revision:1,status:'pending',nextDue:1791710000000,createdAt:1791710000000,lastEvaluatedAt:1791710000000,currentStep:0,policy:{service:'prior-service',scheduleId:'prior-schedule',revision:1,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3},schedule:oldSchedule,behaviors:{primary:'accepted',backup:'accepted'},steps:[],history:[{type:'created',at:1791710000000,actor:null,reason:null,attempt:null}]};
  sql("INSERT INTO paging_jobs VALUES('prior-timer','retained-orphan','prior-service',1,'pending',1791710000000,'prior','"+JSON.stringify(legacyTimer)+"')");
  // OC-042: an installation from before signing-key custody holds a signed source's key in plaintext.
  const heldSignedKey = randomBytes(32).toString("hex"), heldBearerKey = randomBytes(32).toString("hex");
  const digest = (value) => createHash("sha256").update(value).digest("hex");
  sql(`INSERT INTO sources(id,digest,signing_secret,scopes) VALUES('held-signed','${digest(heldSignedKey)}','${heldSignedKey}','["prior-service"]'),('held-bearer','${digest(heldBearerKey)}',NULL,'["prior-service"]')`);
  // Pause this same held-data journey on the released schema before applying the new audit migrations.
  for (const name of (await readdir('migrations/core')).filter(name => /^\d{4}_/.test(name) && Number(name.slice(0, 4)) >= 106 && Number(name.slice(0, 4)) <= 128))
    await copyFile(join('migrations/core', name), join(legacyDirectory, name));
  const released = spawnSync(process.execPath, [...cli, "d1", "migrations", "apply", "DB", "--config", legacyConfig, "--local", "--persist-to", persist], { encoding: "utf8", env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' } });
  assert.equal(released.status, 0, "released-schema migrations apply before the additive upgrade");
  const heldTables = rows("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name").map(row => row.name);
  const snapshotHeldTables = () => {
    const command = heldTables.map(name => 'SELECT * FROM "' + name.replaceAll('"', '""') + '"').join(';');
    const result = spawnSync(process.execPath, [...cli, "d1", "execute", "DB", "--local", "--persist-to", persist, "--command", command, "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    assert.equal(result.status, 0, "held application table snapshot succeeds");
    const snapshot = JSON.parse(result.stdout).map(result => result.results.map(row => JSON.stringify(row)).sort());
    assert.equal(snapshot.length, heldTables.length, "the snapshot covers every prior application table");
    return snapshot;
  };
  const releasedRows = snapshotHeldTables();
  migration();
  const upgradedRows = snapshotHeldTables();
  for (const [index, name] of heldTables.entries())
    assert.ok(JSON.stringify(upgradedRows[index]) === JSON.stringify(releasedRows[index]), "new audit migrations preserve every held row in " + name);
  console.log(`PASS additive audit migration upgrade: ${heldTables.length} prior application tables and ${releasedRows.reduce((sum, table) => sum + table.length, 0)} held rows unchanged before Worker writes.`);
  assert.deepEqual(rows("SELECT id,signing_secret IS NOT NULL AS held,signing_custody FROM sources ORDER BY id"),
    [{ id: "held-bearer", held: 0, signing_custody: null }, { id: "held-signed", held: 1, signing_custody: null }],
    "OC-042: the SQL migration is additive and keeps the held key until the Worker can seal it");
  await start();
  const priorLogin=await request('/api/login',{name:'Prior Operator',password:'synthetic-local-testing-password'});
  ok(priorLogin);
  const door=await fetch(origin+'/signin/local');assert.equal(door.status,200);assert.match(await door.text(),/name="password"/,'held password accounts keep their sign-in door');
  const priorState=ok(await request('/api/state',undefined,priorLogin.cookie));
  assert.deepEqual(priorState,JSON.parse(preserved),'held one-row fixture survives relational migration through HTTP');
  const upgradedTimer=ok(await request('/api/paging/state',undefined,priorLogin.cookie)).jobs.find(job=>job.id==='prior-timer');assert.equal(upgradedTimer.status,'paused');assert.equal(upgradedTimer.nextDue,null);assert.deepEqual(upgradedTimer.history.slice(0,-1),legacyTimer.history,'held timer history preserved while paused');
  await stop();
  migration();
  await start();
  const heldAgain = await request('/api/login', { name: 'Prior Operator', password: 'synthetic-local-testing-password' });
  ok(heldAgain);
  assert.deepEqual(ok(await request('/api/state', undefined, heldAgain.cookie)), JSON.parse(preserved), 'all held arrays and history survive repeated migration and restart');
  console.log('PASS held upgrade through pre-0106 SQL: full ordered members/services/policies/events/alerts/incidents/audit and nested history unchanged; held password works after upgrade and repeat migration/restart.');
  await heldSourceCustody(heldAgain.cookie, heldSignedKey, heldBearerKey, digest);
  await stop();
  sql('DELETE FROM sources; DELETE FROM paging_jobs; DELETE FROM operator_members; DELETE FROM sessions; DELETE FROM credentials; DELETE FROM workspace_control; '+['members','services','policies','events','alerts','incidents','audit'].map(k=>'DELETE FROM oc_'+k).join(';'));
  migration();
  await start();
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  const homeDocument = await home.text();
  assert.match(homeDocument, /href="\/setup"/, "an unclaimed guest can finish setup from the Lobby");
  assert.match(await (await fetch(origin, { headers: { cookie: `oncall_session_${new URL(origin).port}=forged` } })).text(), /href="\/setup"/, "forged sessions receive the guest Lobby");
  const docsIndex = await fetch(origin + "/docs");
  assert.equal(docsIndex.status, 200);
  const docPages = [...new Set([...(await docsIndex.text()).matchAll(/href="\/docs\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
  assert.ok(docPages.length > 0, "the docs home lists its pages");
  for (const slug of docPages) {
    const page = await fetch(origin + "/docs/" + slug);
    assert.equal(page.status, 200, slug);
    assert.match(await page.text(), /<h1[^>]*>[^<]+<\/h1>/, "docs page " + slug + " is server-rendered");
  }
  assert.equal((await fetch(origin + "/docs/missing")).status, 404);
  assert.equal((await fetch(origin + "/missing")).status, 404);
  ok(await request("/api/state"), 401);
  const setup = await request("/api/setup", {
    name: "Admin",
    password: "synthetic-local-testing-password",
  });
  const admin = ok(setup).member;
  let cookie = setup.cookie;
  assert.match(await (await fetch(origin, { headers: { cookie } })).text(), /class="access"/, "a validated password member opens the workspace");
  assert.match(cookie, new RegExp(`^oncall_session_${new URL(origin).port}=`), "the workspace cookie is named for this install's port");
  const neighbour = cookie.replace(/^oncall_session_\d+=/, `oncall_session_${Number(new URL(origin).port) + 1}=`);
  ok(await request("/api/state", undefined, neighbour), 401);
  const neighbourLogout = await fetch(origin + "/api/logout", { method: "POST", headers: { origin, cookie: neighbour } });
  assert.equal(neighbourLogout.headers.get("set-cookie")?.startsWith(cookie.split("=")[0] + "="), true, "sign-out only ever names this install's own cookie");
  ok(await request("/api/state", undefined, cookie), 200);
  sql('UPDATE sessions SET expires=0');
  assert.match(await (await fetch(origin, { headers: { cookie } })).text(), /href="\/setup"/, "an expired password session receives the guest Lobby");
  const freshLogin = await request('/api/login', { name: 'Admin', password: 'synthetic-local-testing-password' });
  ok(freshLogin); cookie = freshLogin.cookie;
  ok(
    await request("/api/setup", {
      name: "second",
      password: "synthetic-local-testing-password",
    }),
    409,
  );
  assert.equal(
    (
      await fetch(origin + "/api/command", {
        method: "POST",
        headers: {
          cookie,
          origin: "https://attacker.test",
          "content-type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  const viewer = ok(
    await request(
      "/api/members",
      { name: "Viewer", role: "viewer", password: "synthetic-viewer-testing-password" },
      cookie,
    ),
    201,
  );
  const vl = await request("/api/login", {
    name: "Viewer",
    password: "synthetic-viewer-testing-password",
  });
  ok(vl);
  const vc = vl.cookie;
  ok(await request("/api/state", undefined, vc));
  sql("UPDATE sessions SET expires=0 WHERE member='" + viewer.id + "'");
  ok(await request("/api/state", undefined, vc), 401);
  const vl2 = await request("/api/login", {
    name: "Viewer",
    password: "synthetic-viewer-testing-password",
  });
  ok(vl2);
  const currentViewerCookie = vl2.cookie;
  ok(await request("/api/state", undefined, currentViewerCookie));
  ok(
    await request("/api/command", { type: "service" }, currentViewerCookie),
    403,
  );
  ok(await request("/api/archive", undefined, currentViewerCookie), 403);
  ok(await request("/api/audit/export", undefined, currentViewerCookie), 403);
  ok(await request("/api/audit/export"), 401);
  const roleBefore = ok(await request("/api/state", undefined, cookie)), auditBefore = await auditExport(cookie);
  const auditSqlBefore = rows("SELECT * FROM oc_admin_audit ORDER BY id");
  sql("CREATE TRIGGER injected_audit_failure BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'INJECTED_AUDIT_FAILURE'); END");
  ok(await request("/api/command", { type: "member", id: viewer.id, role: "responder", active: true }, cookie), 503);
  assert.deepEqual(ok(await request("/api/state", undefined, cookie)), roleBefore,
    "an audit insert failure rolls back the member role and workspace revision together");
  assert.deepEqual(rows("SELECT * FROM oc_admin_audit ORDER BY id"), auditSqlBefore, "a failed audit insert publishes no partial history");
  sql("DROP TRIGGER injected_audit_failure");
  const afterAuditFault = new Map((await auditExport(cookie)).rows.map(row => [row.id, row]));
  for (const row of auditBefore.rows) assert.deepEqual(afterAuditFault.get(row.id), row, "audit-write failure preserves all prior history");
  const grant = await auditedMutation(cookie, () => request("/api/command", { type: "member", id: viewer.id, role: "responder", active: true }, cookie));
  ok(grant.response);
  assert.equal(grant.after.members.find(member => member.id === viewer.id).role, "responder");
  const withdrawGrant = await auditedMutation(cookie, () => request("/api/command", { type: "member", id: viewer.id, role: "viewer", active: true }, cookie));
  ok(withdrawGrant.response);
  assert.equal(withdrawGrant.after.members.find(member => member.id === viewer.id).role, "viewer");
  const grantEntry = grant.committed.find(row => row.subject), withdrawEntry = withdrawGrant.committed.find(row => row.subject);
  assert.ok(grantEntry && withdrawEntry, "role changes identify their subject without retaining the member identity");
  assert.equal(grantEntry.subject, withdrawEntry.subject, "the same subject keeps its random audit alias");
  assert.equal(grantEntry.actor, withdrawEntry.actor, "the same actor keeps its random audit alias");
  assert.notEqual(grantEntry.subject, viewer.id);assert.notEqual(grantEntry.actor, admin.id);
  const heldAudit = await auditExport(cookie), heldAuditId = heldAudit.rows.at(-1).id.replaceAll("'", "''");
  auditSqlRefused("UPDATE oc_admin_audit SET kind=kind WHERE id='" + heldAuditId + "'");
  auditSqlRefused("DELETE FROM oc_admin_audit WHERE id='" + heldAuditId + "'");
  const afterSqlRefusal = new Map((await auditExport(cookie)).rows.map(row => [row.id, row]));
  for (const row of heldAudit.rows) assert.deepEqual(afterSqlRefusal.get(row.id), row, "SQL update/delete cannot change append-only history");
  const service = ok(
    await request(
      "/api/command",
      {
        type: "service",
        id: "checkout",
        name: "Checkout",
        environment: "production",
        owner: admin.id,
        runbook: ["Check customer journey", "Record evidence"],
        pager: "https://example.test/pager",
      },
      cookie,
    ),
  );
  ok(
    await request(
      "/api/command",
      {
        type: "policy",
        service: service.id,
        severity: "*",
        action: "route",
        owner: admin.id,
        reason: "Service owner takes coordination",
      },
      cookie,
    ),
  );
  const key = "synthetic-intake-secret-not-a-provider-0001";
  const privateService = ok(await request("/api/command", {
    type: "service", id: "private-service", name: "Private service",
    environment: "production", owner: admin.id, runbook: [], pager: "",
  }, cookie));
  const privatePolicy = ok(await request("/api/command", {
    type: "policy", service: privateService.id, severity: "*", action: "route",
    owner: admin.id, reason: "Private routing instruction outside the intake scope",
  }, cookie));
  const stagingService = ok(await request("/api/command", {
    type: "service", id: "checkout-staging", name: "Checkout staging",
    environment: "staging", owner: admin.id, runbook: [], pager: "",
  }, cookie));
  ok(
    await request(
      "/api/sources",
      { id: "monitor", key, scopes: ["checkout", stagingService.id] },
      cookie,
    ),
  );
  const event = {
    source: "monitor",
    eventId: "one",
    service: "checkout",
    environment: "production",
    key: "upgrade",
    generation: "release-1",
    intent: "trigger",
    severity: "critical",
    title: "Old accounts cannot upgrade; contact +61400123987",
    observedAt: "2026-10-02T12:00:00Z",
    evidence: "https://example.test/check",
  };
  // OC-059: authenticated native bounds retain incomplete custody; refusals stay atomic.
  const beforeRefusedInput = ok(await request("/api/archive", undefined, cookie));
  const oversizedEvent = { ...event, eventId: "over-limit", discarded: "" };
  const paddingBytes = 65537 - Buffer.byteLength(JSON.stringify(oversizedEvent));
  oversizedEvent.discarded = "é".repeat(Math.floor(paddingBytes / 2)) + "x".repeat(paddingBytes % 2);
  const oversizedBody = JSON.stringify(oversizedEvent);
  assert.equal(Buffer.byteLength(oversizedBody), 65537);
  assert.ok(oversizedBody.length < 65536, "the native bound counts UTF-8 bytes, not characters");
  ok(await rawRequest("/api/ingress/monitor", oversizedBody), 401);
  assert.deepEqual(ok(await request("/api/archive", undefined, cookie)),beforeRefusedInput,"unauthenticated oversize has no custody");
  const assertIncomplete = async (response,raw,expectedService) => {
    const value=ok(response,202);assert.equal(value.truncation,true);
    const state=ok(await request("/api/archive",undefined,cookie)),held=state.intakeReceipts.find(r=>r.id===value.incomplete.receipt);
    assert.equal(held.service,expectedService);assert.equal(held.severity,"critical");assert.equal(held.truncated,true);
    assert.equal(held.incomplete.bytes,Buffer.byteLength(raw));assert.equal(held.incomplete.sha256,createHash("sha256").update(raw).digest("hex"));
    assert.deepEqual(held.incomplete.readableIds,[]);assert.equal(held.incomplete.dropped,null);
    assert.ok(Buffer.from(held.details.nativePrefix.value,'base64').length<=65536);
    assert.deepEqual(Buffer.from(held.details.nativePrefix.value,'base64'),Buffer.from(raw).subarray(0,65536));
    assert.deepEqual(held.details.ownerNotice,{owner:admin.id,paging:"off",state:"recorded"});
    assert.ok(state.audit.some(row=>row.kind==="intake-owner-notice"&&row.text.includes(held.id)));
    assert.equal(held.native,undefined,"an untrusted prefix has no structured native event identity");
    if(expectedService)assert.equal(state.alerts.find(a=>a.id===held.alert).urgency,"high");
    else {assert.equal(held.outcome,"unrouted");const queued=state.alerts.find(a=>a.id===held.alert);assert.equal(queued.service,null);assert.equal(queued.urgency,"high");assert.deepEqual(queued.obligation.target,{kind:"user",id:admin.id});assert.equal(queued.obligation.paging,"off");}
    return {value,state,held};
  };
  const oversizeCustody=await assertIncomplete(await rawRequest("/api/ingress/monitor",oversizedBody,"",{authorization:"Bearer "+key}),oversizedBody,null);
  assert.deepEqual(oversizeCustody.state.events,beforeRefusedInput.events,"a multi-service key never guesses a service from the prefix");
  assert.equal(ok(await rawRequest("/api/ingress/monitor",oversizedBody,"",{authorization:"Bearer "+key}),202).id,oversizeCustody.value.id);
  assert.deepEqual(ok(await request("/api/archive",undefined,cookie)),oversizeCustody.state,"an incomplete retry changes no state");
  await assertIncomplete(await rawRequest("/api/ingress/monitor",'{"source":',"",{authorization:"Bearer "+key}),'{"source":',null);
  await assertIncomplete(await request("/api/ingress/monitor",{source:"monitor"},"",{authorization:"Bearer "+key}),JSON.stringify({source:"monitor"}),null);
  const singleScopeKey="synthetic-native-bounds-one-service-0001";
  ok(await request("/api/sources",{id:"bounds-one",key:singleScopeKey,scopes:[stagingService.id]},cookie));
  ok(await request("/api/urgency/services/"+stagingService.id,{baseVersion:0,mode:"low",timezone:"UTC",weekly:[],holidays:[],inside:"low",outside:"low",reason:"Incomplete custody must override low urgency"},cookie),201);
  await assertIncomplete(await rawRequest("/api/ingress/bounds-one",oversizedBody,"",{authorization:"Bearer "+singleScopeKey}),oversizedBody,stagingService.id);
  const hugeNativeBody='x'.repeat(7*1024*1024);
  await assertIncomplete(await rawRequest("/api/ingress/bounds-one",hugeNativeBody,"",{authorization:"Bearer "+singleScopeKey}),hugeNativeBody,stagingService.id);
  const afterCustody=ok(await request("/api/archive",undefined,cookie));
  const refusedInput = async (perform,status,kind,actorKind,actorId) => {
    const ids=new Set((await auditExport(cookie)).rows.map(row=>row.id));
    ok(await perform(),status);
    const actor=rows(`SELECT label FROM oc_audit_identities WHERE kind='${actorKind}' AND entity_id='${actorId.replaceAll("'","''")}'`)[0].label;
    const attempts=(await auditExport(cookie)).rows.filter(row=>!ids.has(row.id)&&row.kind===kind&&row.outcome==='refused');
    assert.equal(attempts.length,1,'each retained refusal has its own attributed operation outcome');
    assert.equal(attempts[0].actor,actor);
    assert.deepEqual([attempts[0].workspaceBefore,attempts[0].beforeRevision],[attempts[0].workspaceAfter,attempts[0].afterRevision],'refused input changes no coordination state or mutation revision');
  };
  await refusedInput(() => rawRequest("/api/ingress/monitor",'{"secret":"'+key.toUpperCase()+'"',"",{authorization:"Bearer "+key}),400,"ingest.request","source","monitor");
  await refusedInput(() => rawRequest("/api/ingress/monitor",'{"secret":"'+[...key].map(char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0')).join('')+'"',"",{authorization:"Bearer "+key}),400,"ingest.request","source","monitor");
  await refusedInput(() => rawRequest("/api/command", oversizedBody, cookie),413,"command.request","member",admin.id);
  await refusedInput(() => rawRequest("/api/command", JSON.stringify({type:"note",padding:"x".repeat(7*1024*1024)}), cookie),413,"command.request","member",admin.id);
  assert.deepEqual(ok(await request("/api/archive", undefined, cookie)), afterCustody,
    "refused commands and credential echoes change no durable records");
  ok(await request("/api/ingress/monitor", event), 401);
  const admission = await auditedMutation(cookie, () => request("/api/ingress/monitor", event, "", {
    authorization: "Bearer " + key,
  }));
  const first = ok(admission.response, 201);
  assert.ok(admission.after.events.some(stored => stored.id === first.id), "the audited admission is visible in committed state");
  const admittedSource = admission.committed.find(row => row.source)?.source;
  assert.ok(admittedSource && admittedSource !== event.source, "intake identifies the source only by its random audit alias");
  const receipt = async (value, signal, duplicate) => {
    const state = ok(await request("/api/state", undefined, cookie));
    const stored = state.events.find(e => e.id === value.id);
    assert.ok(stored, "receipt identifies the durable event");
    assert.deepEqual(value, { duplicate, id: stored.id, eventId: signal.eventId,
      service: signal.service, observedAt: new Date(signal.observedAt).toISOString(), acceptedAt: stored.acceptedAt },
      "intake returns only a receipt, never workspace data");
    assert.ok(Number.isFinite(Date.parse(value.acceptedAt)));
    assert.equal(stored.decision.action, "route");
    assert.ok(stored.routingSnapshot.members.some(m => m.id === viewer.id));
    assert.ok(stored.routingSnapshot.policies.some(p => p.id === privatePolicy.id));
    const archived = ok(await request("/api/archive", undefined, cookie));
    assert.deepEqual(archived.events.find(e => e.id === stored.id), stored,
      "session-protected export retains the full event");
    return state.alerts.find(a => a.events.includes(stored.id)).id;
  };
  const admittedAlert = await receipt(first, event, false);
  const equivalent = Object.fromEntries(Object.entries(event).map(([key, value]) => [key, ["intent", "severity", "observedAt"].includes(key) ? value : ` ${value} `]));
  equivalent.observedAt = "2026-10-02T14:00:00+02:00";
  equivalent.discarded = { raw: "not retained" };
  const repeated = ok(await request("/api/ingress/monitor", equivalent, "", {
    authorization: "Bearer " + key,
  }));
  await receipt(repeated, event, true);
  assert.deepEqual(repeated, { ...first, duplicate: true }, "duplicate receipt is stable");
  for (const path of ["/api/state", "/api/archive", "/api/recovery/checkpoint"])
    ok(await request(path, undefined, "", { authorization: "Bearer " + key }), 401);
  ok(await request("/api/ingress/monitor", { ...event, eventId: "unscoped", service: privateService.id },
    "", { authorization: "Bearer " + key }), 403);
  ok(
    await request(
      "/api/ingress/monitor",
      { ...event, title: "different" },
      "",
      { authorization: "Bearer " + key },
    ),
    409,
  );
  ok(
    await request(
      "/api/ingress/monitor",
      { ...event, eventId: "wrong", environment: "staging" },
      "",
      { authorization: "Bearer " + key },
    ),
    400,
  );
  const signedKey = "signed-synthetic-local-secret-000000001";
  ok(
    await request(
      "/api/sources",
      { id: "signed", key: signedKey, mode: "signed", scopes: ["checkout", stagingService.id] },
      cookie,
    ),
  );
  const se = { ...event, source: "signed" };
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", signedKey)
    .update(ts + "." + JSON.stringify(se))
    .digest("hex");
  const signed = ok(
    await request("/api/ingress/signed", se, "", {
      "x-oncall-timestamp": ts,
      "x-oncall-signature": sig,
    }),
    201,
  );
  const signedAlert = await receipt(signed, se, false);
  assert.notEqual(signedAlert, admittedAlert, "OC-001: the same event ID, key and generation in another source never merge");
  const signedRepeated = ok(await request("/api/ingress/signed", se, "", {
    "x-oncall-timestamp": ts, "x-oncall-signature": sig,
  }));
  await receipt(signedRepeated, se, true);
  assert.deepEqual(signedRepeated, { ...signed, duplicate: true });
  for (const path of ["/api/state", "/api/archive", "/api/recovery/checkpoint"])
    ok(await request(path, undefined, "", {
      "x-oncall-timestamp": ts, "x-oncall-signature": sig,
    }), 401);
  ok(
    await request("/api/ingress/signed", { ...se, title: "tampered" }, "", {
      "x-oncall-timestamp": ts,
      "x-oncall-signature": sig,
    }),
    401,
  );
  // OC-001: distinct events join only their exact source/service/environment/generation tuple.
  const native = async signal => ok(await request("/api/ingress/monitor", signal, "", {
    authorization: "Bearer " + key,
  }), 201);
  const joined = await native({ ...event, eventId: "same-tuple-trigger" });
  const staged = { ...event, service: stagingService.id, environment: "staging" };
  const earlyRecovery = await native({ ...staged, eventId: "staging-recovery-first", intent: "recover" });
  const lateTrigger = await native({ ...staged, eventId: "staging-trigger-after-recovery" });
  const newer = await native({ ...event, eventId: "newer-generation", generation: "release-2" });
  const identityArchive = ok(await request("/api/archive", undefined, cookie));
  const alertFor = receipt => identityArchive.alerts.find(alert => alert.events.includes(receipt.id));
  const stagedAlert = alertFor(earlyRecovery), newerAlert = alertFor(newer);
  const expectedMembership = new Map([
    [admittedAlert, [first.id, joined.id]], [signedAlert, [signed.id]],
    [stagedAlert.id, [earlyRecovery.id, lateTrigger.id]], [newerAlert.id, [newer.id]],
  ]);
  assert.equal(expectedMembership.size, 4, "OC-001: source, environment/service and generation boundaries each retain a separate alert");
  assert.equal(identityArchive.alerts.filter(alert => alert.key === event.key).length, 4);
  for (const [id, eventIds] of expectedMembership) {
    const alert = identityArchive.alerts.find(item => item.id === id);
    assert.deepEqual(alert.events, eventIds, "OC-001: distinct observations of one tuple join the same alert in order");
    for (const eventId of eventIds) {
      const stored = identityArchive.events.find(item => item.id === eventId);
      assert.deepEqual([stored.source, stored.service, stored.environment, stored.key, stored.generation],
        [alert.source, alert.service, alert.environment, alert.key, alert.generation], "OC-001: archive contains no cross-tuple event links");
      assert.equal(identityArchive.alerts.filter(item => item.events.includes(eventId)).length, 1);
    }
    assert.equal(alert.state, id === stagedAlert.id ? "recovered" : "active",
      "OC-001: recovery-before-trigger stays recovered and leaves the other tuples active");
  }
  let incident = ok(
    await request(
      "/api/command",
      {
        type: "declare",
        service: "checkout",
        title: "Upgrade regression",
        severity: "critical",
        summary: "Old accounts affected after release",
        alerts: [admittedAlert],
      },
      cookie,
    ),
  );
  assert.deepEqual(incident.alerts, [admittedAlert], 'declaration links exactly the admitted alert identity');
  assert.deepEqual(ok(await request('/api/state', undefined, cookie)).incidents.find(i => i.id === incident.id).alerts,
    [admittedAlert], 'the declared alert link reads back through protected HTTP');
  const copiedSteps = [
    { text: 'Check customer journey', done: false },
    { text: 'Record evidence', done: false },
  ];
  assert.deepEqual(incident.runbook, copiedSteps, 'declaration copies the applicable service instructions');
  const editedService = ok(await request('/api/command', {
    ...service, type: 'service', runbook: ['Synthetic revised service instructions'],
  }, cookie));
  assert.deepEqual(editedService.runbook, ['Synthetic revised service instructions']);
  const afterRunbookEdit = ok(await request('/api/state', undefined, cookie));
  assert.deepEqual(afterRunbookEdit.services.find(s => s.id === service.id).runbook,
    ['Synthetic revised service instructions'], 'the service edit is durably accepted');
  assert.deepEqual(afterRunbookEdit.incidents.find(i => i.id === incident.id), incident,
    'an accepted service runbook edit preserves every copied incident field and revision');
  assert.deepEqual(afterRunbookEdit.incidents.find(i => i.id === incident.id).runbook, copiedSteps);
  console.log('PROBE OC-005 copied steps: protected service edit and state read -> revised service instructions, original incident copy unchanged');
  await awaitingCoordinationAuthority({ origin, request, cookie, incident: incident.id });
  const responder = ok(await request('/api/members', {
    name: 'synthetic-oncall-303', role: 'responder', password: 'synthetic-oncall-303-password',
  }, cookie), 201);
  const responderLogin = await request('/api/login', {
    name: responder.name, password: 'synthetic-oncall-303-password',
  });
  ok(responderLogin);
  const responderCookie = responderLogin.cookie;
  const responderState = ok(await request('/api/state', undefined, responderCookie));
  assert.deepEqual(responderState, ok(await request('/api/state', undefined, cookie)),
    'the active responder reads the populated workspace, including other members and services');
  assert.deepEqual(ok(await request('/api/workspace', undefined, responderCookie)).state, responderState);
  const responderArchive = ok(await request('/api/archive', undefined, cookie));
  assert.ok(responderArchive.events.length && responderArchive.incidents.length,
    'authority refusals use a valid populated archive');
  const credentialsBefore = () => ['sources', 'credentials', 'operator_members']
    .map(table => rows('SELECT * FROM ' + table + ' ORDER BY 1'));
  const beforeResponderRefusals = credentialsBefore();
  for (const [label, path, input] of [
    ['service update', '/api/command', { type: 'service', ...responderState.services.find(s => s.id === service.id), name: 'Synthetic forbidden service change' }],
    ['policy publication', '/api/command', { type: 'policy', service: service.id, severity: '*', action: 'suppress', owner: responder.id, reason: 'Synthetic forbidden policy change' }],
    ['member promotion', '/api/command', { type: 'member', id: viewer.id, role: 'admin', active: true }],
    ['member creation', '/api/members', { name: 'synthetic-oncall-304', role: 'admin', password: 'synthetic-oncall-304-password' }],
    ['source listing', '/api/sources', undefined],
    ['source creation', '/api/sources', { id: 'synthetic-oncall-303', key: 'synthetic-oncall-303-source-credential', scopes: [service.id] }],
    ['source rotation', '/api/sources', { id: 'monitor', key: 'synthetic-oncall-304-source-credential', scopes: [service.id] }],
    ['source revocation', '/api/sources/monitor/revoke', {}],
    ['archive export', '/api/archive', undefined],
    ['archive restore', '/api/restore', { mode: 'replace', archive: responderArchive }],
  ]) {
    const denied = await request(path, input, responderCookie);
    assert.equal(denied.status, 403, label + ': valid native request reaches the authority refusal');
    assert.deepEqual(Object.keys(denied.value), ['error'], label + ': the refusal discloses no protected records');
    assert.deepEqual(ok(await request('/api/state', undefined, cookie)), responderState,
      label + ': application records and workspace revision stay unchanged; refusal audit may append');
    assert.deepEqual(credentialsBefore(), beforeResponderRefusals,
      label + ': source custody, password credentials and member authority stay unchanged');
  }
  const mutate = async (data) => {
    incident = ok(
      await request(
        "/api/command",
        { incident: incident.id, revision: incident.revision, ...data },
        cookie,
      ),
    );
    return incident;
  };
  const acknowledgement = await auditedMutation(cookie, () => request("/api/command", {
    incident: incident.id, revision: incident.revision, type: "transition", state: "acknowledged", summary: "Taking responsibility",
  }, responderCookie));
  incident = ok(acknowledgement.response);
  assert.equal(acknowledgement.after.incidents.find(item => item.id === incident.id).state, "acknowledged");
  const responderNote = 'Synthetic responder observed customer impact';
  incident = ok(await request('/api/command', {
    type: 'note', incident: incident.id, revision: incident.revision, text: responderNote,
  }, responderCookie));
  const coordinated = ok(await request('/api/state', undefined, responderCookie)).incidents.find(i => i.id === incident.id);
  assert.equal(coordinated.commander, responder.id);
  assert.equal(coordinated.state, 'acknowledged');
  assert.equal(coordinated.timeline.find(e => e.lifecycle?.to === 'acknowledged').actor, responder.id);
  assert.equal(coordinated.timeline.find(e => e.text === responderNote).actor, responder.id);
  assert.deepEqual(coordinated, incident, 'permitted coordination reads back with the real responder attribution');
  console.log('PASS OC-003 responder authority: populated workspace reads, attributed acknowledgment and note, ten administrator refusals with unchanged application and credential records');
  ok(
    await request(
      "/api/command",
      { type: "note", incident: incident.id, revision: 1, text: "stale" },
      cookie,
    ),
    409,
  );
  const concurrently = await Promise.all([
    request(
      "/api/command",
      {
        type: "note",
        incident: incident.id,
        revision: incident.revision,
        text: "parallel one",
      },
      cookie,
    ),
    request(
      "/api/command",
      {
        type: "note",
        incident: incident.id,
        revision: incident.revision,
        text: "parallel two",
      },
      cookie,
    ),
  ]);
  assert.deepEqual(concurrently.map((v) => v.status).sort(), [200, 409]);
  incident = concurrently.find((v) => v.status === 200).value;
  await mutate({ type: "runbook", index: 0, done: true });
  await mutate({
    type: 'action', title: 'Synthetic retained unfinished work', owner: responder.id,
    due: '2026-12-01', completionPolicy: 'human-review',
  });
  const unfinishedAction = structuredClone(incident.actions.at(-1));
  const actionRead = ok(await request('/api/state', undefined, cookie)).incidents
    .find(i => i.id === incident.id).actions.find(a => a.id === unfinishedAction.id);
  assert.equal(actionRead.title, 'Synthetic retained unfinished work');
  assert.equal(actionRead.owner, responder.id);
  assert.equal(actionRead.due, '2026-12-01');
  assert.equal(actionRead.done, false);
  assert.equal(actionRead.evidence, '');
  assert.equal(actionRead.completionPolicy, 'human-review');
  assert.match(incident.timeline.at(-1).text, /due 2026-12-01 \(UTC calendar date\)/);
  console.log('PROBE OC-005 owned due date: protected action creation and state read -> responder owner, 2026-12-01 UTC calendar date, open state');
  const beforeUnevidencedCompletion = ok(await request('/api/state', undefined, cookie));
  const unevidencedCompletion = await request('/api/command', {
    type: 'complete', incident: incident.id, revision: incident.revision, action: unfinishedAction.id,
  }, cookie);
  ok(unevidencedCompletion, 400);
  assert.match(unevidencedCompletion.value.error, /Completion evidence URL required/);
  assert.deepEqual(ok(await request('/api/state', undefined, cookie)), beforeUnevidencedCompletion,
    'missing completion evidence preserves all incident fields, actions and workspace revision; refusal audit may append');
  console.log('PROBE OC-005 completion refusal: protected completion without evidence -> 400, incident, actions and workspace revision unchanged');
  await mutate({
    type: "transition",
    state: "mitigating",
    summary: "Mitigation is being reviewed",
  });
  const beforeSourceRecovery = ok(await request("/api/archive", undefined, cookie));
  ok(
    await request(
      "/api/ingress/monitor",
      { ...event, eventId: "recover", intent: "recover" },
      "",
      { authorization: "Bearer " + key },
    ),
    201,
  );
  assert.equal(
    ok(await request("/api/state", undefined, cookie)).incidents[0].state,
    "mitigating",
  );
  const afterSourceRecovery = ok(await request("/api/archive", undefined, cookie));
  const sourceRecoveredIncident=afterSourceRecovery.incidents.find(i=>i.id===incident.id),priorIncident=beforeSourceRecovery.incidents.find(i=>i.id===incident.id);
  assert.equal(sourceRecoveredIncident.state,priorIncident.state,"OC-001: source recovery never resolves a declared human incident");
  assert.deepEqual(sourceRecoveredIncident.timeline.slice(0,-1),priorIncident.timeline,"the complete human timeline is preserved before the attributed OC-056 marker");
  assert.equal(sourceRecoveredIncident.timeline.at(-1).kind,'source-recovery');
  assert.equal(sourceRecoveredIncident.sourceRecovery.reminder.commander,priorIncident.commander);assert.equal(sourceRecoveredIncident.sourceRecovery.reminder.automatic,false);
  assert.deepEqual({...sourceRecoveredIncident,revision:priorIncident.revision,timeline:priorIncident.timeline,sourceRecovery:undefined},{...priorIncident,sourceRecovery:undefined},"OC-056 adds only its attributed marker, reminder and revision; authored incident fields stay intact");
  assert.deepEqual(afterSourceRecovery.incidents.filter(i=>i.id!==incident.id),beforeSourceRecovery.incidents.filter(i=>i.id!==incident.id));
  incident=sourceRecoveredIncident;
  assert.equal(afterSourceRecovery.alerts.find(alert => alert.id === admittedAlert).state, "recovered");
  assert.deepEqual(afterSourceRecovery.alerts.filter(alert => alert.id !== admittedAlert),
    beforeSourceRecovery.alerts.filter(alert => alert.id !== admittedAlert),
    "OC-001: delayed recovery of the older generation leaves the newer generation, other source and staging alert unchanged");
  const beforeUnevidencedRecovery = ok(await request('/api/state', undefined, cookie));
  ok(await request('/api/command', {
    type: 'transition', incident: incident.id, revision: incident.revision,
    state: 'recovered', summary: 'Synthetic recovery without evidence',
  }, cookie), 400);
  assert.deepEqual(ok(await request('/api/state', undefined, cookie)), beforeUnevidencedRecovery,
    'recovery without evidence preserves incident state, revision and timeline');
  await mutate({
    type: "transition",
    state: "recovered",
    summary: "Affected journey verified",
    evidence: "https://example.test/recovery",
  });
  const beforeUnsummarizedResolution = ok(await request('/api/state', undefined, cookie));
  ok(await request('/api/command', {
    type: 'transition', incident: incident.id, revision: incident.revision, state: 'resolved',
  }, cookie), 400);
  assert.deepEqual(ok(await request('/api/state', undefined, cookie)), beforeUnsummarizedResolution,
    'resolution without a summary preserves incident state, revision and timeline');
  await mutate({
    type: "transition",
    state: "resolved",
    summary: "Sufficient exposure observed",
  });
  const resolvedIncident = ok(await request('/api/state', undefined, cookie)).incidents.find(i => i.id === incident.id);
  assert.equal(resolvedIncident.state, 'resolved');
  assert.deepEqual(resolvedIncident.actions.find(a => a.id === unfinishedAction.id), unfinishedAction,
    'evidenced incident resolution retains the previously created unfinished work, owner and due date');
  console.log('PROBE OC-005 retained work: protected evidenced recovery, resolution and state read -> resolved incident retains the original open action');
  assert.equal(resolvedIncident.recovery, 'https://example.test/recovery');
  assert.equal(resolvedIncident.timeline.find(e => e.kind === 'declared').actor, admin.id);
  for (const [state, actor, summary] of [
    ['acknowledged', responder.id, 'Taking responsibility'],
    ['mitigating', admin.id, 'Mitigation is being reviewed'],
    ['recovered', admin.id, 'Affected journey verified'],
    ['resolved', admin.id, 'Sufficient exposure observed'],
  ]) {
    const entry = resolvedIncident.timeline.find(e => e.lifecycle?.to === state);
    assert.equal(entry.actor, actor, state + ': the lifecycle entry retains its authorized human actor');
    assert.ok(entry.text.includes(summary), state + ': the saved transition summary reads back');
    assert.ok(Number.isFinite(Date.parse(entry.at)), state + ': the lifecycle entry retains its action time');
    if (state === 'recovered') assert.equal(entry.lifecycle.evidence, 'https://example.test/recovery');
  }
  assert.deepEqual(resolvedIncident, incident, 'the resolved state and complete timeline read back over HTTP');
  console.log('PASS OC-004 native lifecycle: exact admitted alerts, responder commander, atomic evidence and summary refusals, evidenced recovery and resolved human-attributed timeline');
  await mutate({
    type: "review",
    text: "Cause: missing migration. Repair verified against preserved customer behavior.",
  });
  await mutate({
    type: "action",
    title: "Guard prior-data upgrades",
    owner: admin.id,
    due: "2026-10-03",
  });
  await mutate({
    type: "complete",
    action: incident.actions.at(-1).id,
    evidence: "https://example.test/regression",
  });
  const submittedAction = ok(await request('/api/state', undefined, cookie)).incidents
    .find(i => i.id === incident.id).actions.at(-1);
  assert.equal(submittedAction.evidence, 'https://example.test/regression');
  assert.equal(submittedAction.submission.by, admin.id);
  assert.equal(submittedAction.done, false, 'evidence submission retains the human-review policy');
  assert.equal(submittedAction.accepted, undefined);
  await mutate({ type: 'accept-action', action: submittedAction.id, reason: 'Synthetic human verified the repair' });
  const completedAction = ok(await request('/api/state', undefined, cookie)).incidents
    .find(i => i.id === incident.id).actions.find(a => a.id === submittedAction.id);
  assert.equal(completedAction.done, true);
  assert.equal(completedAction.accepted.by, admin.id);
  assert.equal(completedAction.evidence, 'https://example.test/regression');
  await mutate({ type: 'review', text: 'Synthetic edited review after resolution; retained work remains open.' });
  const reviewedIncident = ok(await request('/api/state', undefined, cookie)).incidents.find(i => i.id === incident.id);
  assert.equal(reviewedIncident.review, 'Synthetic edited review after resolution; retained work remains open.');
  assert.deepEqual(reviewedIncident.actions.find(a => a.id === unfinishedAction.id), unfinishedAction);
  console.log('PASS OC-005 copied runbooks and follow-ups: immutable incident copy after service edit, owned UTC due date, atomic evidence refusal, open work across resolution, human-reviewed completion and editable review');
  const before = ok(await request("/api/state", undefined, cookie));
  const replay = ok(await request("/api/replay", { events: [event] }, cookie));
  assert.equal(replay.sideEffects, false);
  assert.deepEqual(ok(await request("/api/state", undefined, cookie)), before);
  const rotatedNativeKey = randomBytes(32).toString("hex");
  const rotation = await auditedMutation(cookie, () => request("/api/sources", {
    id: "monitor", key: rotatedNativeKey, scopes: [service.id, stagingService.id],
  }, cookie));ok(rotation.response);
  ok(await request("/api/ingress/monitor", { ...event, eventId: "retired-native-key" }, "", { authorization: "Bearer " + key }), 401);
  const revocation = await auditedMutation(cookie, () => request("/api/sources/monitor/revoke", {}, cookie));ok(revocation.response);
  ok(await request("/api/ingress/monitor", { ...event, eventId: "revoked-native-key" }, "", { authorization: "Bearer " + rotatedNativeKey }), 401);
  for (const mutation of [rotation, revocation])
    assert.ok(mutation.committed.some(row => row.source === admittedSource), "rotation and revocation retain the admitted source's random audit alias");
  const auditText = JSON.stringify(await auditExport(cookie)).toLowerCase();
  const privateValues = ["Admin", "Viewer", "synthetic-local-testing-password", "synthetic-viewer-testing-password", key, signedKey, rotatedNativeKey,
    event.title, "Sufficient exposure observed", "Taking responsibility", "+61400123987", cookie.split("=")[1], admin.id, viewer.id,
    ...rows("SELECT salt,digest FROM credentials").flatMap(row => [row.salt, row.digest]),
    ...rows("SELECT digest,signing_custody FROM sources").flatMap(row => [row.digest, row.signing_custody]).filter(Boolean)];
  for (const value of privateValues) assert.ok(!auditText.includes(value.length < 10 ? JSON.stringify(value.toLowerCase()) : value.toLowerCase()), "audit export contains no names, passwords, messages, phones, tokens or credential material");
  const archive = ok(await request("/api/archive", undefined, cookie));
  for (const alias of [grantEntry.actor, grantEntry.subject, admittedSource])
    assert.ok(!JSON.stringify(archive).includes(alias), "workspace archives exclude audit aliases and their identity mappings");
  const invalid = structuredClone(archive);
  invalid.services[0].owner = "unknown";
  ok(
    await request(
      "/api/restore",
      { mode: "replace", archive: invalid },
      cookie,
    ),
    400,
  );
  assert.deepEqual(
    ok(await request("/api/archive", undefined, cookie)),
    archive,
  );
  sql(
    "CREATE TRIGGER deny_session_revocation BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT,'injected failure'); END",
  );
  const changed = structuredClone(archive);
  changed.services[0].name = "should rollback";
  ok(
    await request(
      "/api/restore",
      { mode: "replace", archive: changed },
      cookie,
    ),
    503,
  );
  assert.deepEqual(
    ok(await request("/api/archive", undefined, cookie)),
    archive,
  );
  sql("DROP TRIGGER deny_session_revocation");
  const auditBeforeRestore = await auditExport(cookie);
  const importReceipt = await request(
    "/api/restore",
    { mode: "replace", archive },
    cookie,
  );
  ok(importReceipt);
  cookie = importReceipt.cookie;
  const auditAfterRestore = new Map((await auditExport(cookie)).rows.map(row => [row.id, row]));
  for (const row of auditBeforeRestore.rows) assert.deepEqual(auditAfterRestore.get(row.id), row, "restoring application state preserves permanent audit history");
  const restored = ok(await request("/api/archive", undefined, cookie));
  delete restored.revision;
  delete archive.revision;
  assert.deepEqual(restored, archive);
  assert.deepEqual(restored.incidents.find(item => item.id === incident.id), incident,
    "OC-008: export/restore preserves the complete authored incident, runbook, timeline, review and actions");
  ok(await request("/api/state", undefined, vc), 401);
  ok(
    await request(
      "/api/ingress/monitor",
      { ...event, eventId: "post-import" },
      "",
      { authorization: "Bearer " + key },
    ),
    401,
  );
  const currentArchive = ok(await request("/api/archive", undefined, cookie));
  const restores = await Promise.all([
    request(
      "/api/restore",
      { mode: "replace", archive: currentArchive },
      cookie,
    ),
    request(
      "/api/restore",
      { mode: "replace", archive: currentArchive },
      cookie,
    ),
  ]);
  const successes = restores.filter((r) => r.status === 200);
  assert.ok(successes.length >= 1, JSON.stringify(restores));
  assert.ok(restores.every((r) => [200, 409, 401].includes(r.status)),
    JSON.stringify(restores.map(({status,value}) => ({status,body:value}))));
  const valid = [];
  for (const receipt of successes) {
    if ((await request("/api/state", undefined, receipt.cookie)).status === 200)
      valid.push(receipt);
  }
  assert.ok(
    valid.length >= 1,
    "A losing same-archive restore must not revoke the winner session",
  );
  cookie = valid.at(-1).cookie;
  const handoff = ok(
    await request("/api/handoff/" + incident.id, undefined, cookie),
  );
  assert.equal(handoff.lamp.publication, "not-published");
  assert.deepEqual(handoff.providerActions, []);
  const maintenanceRuntimeKey=randomBytes(32).toString('hex'),maintenanceRuntimeId='synthetic-oncall-43-runtime';
  ok(await request('/api/command',{type:'service',id:maintenanceRuntimeId,name:maintenanceRuntimeId,environment:'test',owner:admin.id,runbook:[],pager:''},cookie));
  const maintenanceRuntimeWindow={start:new Date(Date.now()-60000).toISOString(),end:new Date(Date.now()+3600000).toISOString()};
  const maintenanceRuntimePolicy=ok(await request('/api/command',{type:'policy',service:maintenanceRuntimeId,severity:'*',action:'suppress',owner:admin.id,reason:'synthetic-oncall-43 restart custody',baseVersion:0,suppressionWindow:maintenanceRuntimeWindow},cookie));
  ok(await request('/api/sources',{id:maintenanceRuntimeId,key:maintenanceRuntimeKey,scopes:[maintenanceRuntimeId]},cookie));
  const maintenanceRuntimeSignal={source:maintenanceRuntimeId,eventId:maintenanceRuntimeId,service:maintenanceRuntimeId,environment:'test',key:maintenanceRuntimeId,generation:maintenanceRuntimeId,intent:'trigger',severity:'warning',title:maintenanceRuntimeId,observedAt:new Date().toISOString(),evidence:''};
  const maintenanceRuntimeSend=()=>request('/api/ingress/'+maintenanceRuntimeId,maintenanceRuntimeSignal,'',{authorization:'Bearer '+maintenanceRuntimeKey});
  const maintenanceRuntimeReceipt=ok(await maintenanceRuntimeSend(),201),maintenanceRuntimeState=ok(await request('/api/state',undefined,cookie));
  const maintenanceRuntimeEvent=maintenanceRuntimeState.events.find(row=>row.id===maintenanceRuntimeReceipt.id);assert.equal(maintenanceRuntimeEvent.decision.action,'suppress');assert.equal(maintenanceRuntimeEvent.decision.owner,admin.id);assert.equal(maintenanceRuntimeEvent.decision.version,maintenanceRuntimePolicy.version);
  await stop();
  migration();
  await start();
  assert.equal(
    ok(await request("/api/state", undefined, cookie)).incidents[0].review,
    incident.review,
  );
  assert.deepEqual(ok(await request("/api/state", undefined, cookie)).incidents.find(item => item.id === incident.id), incident,
    "OC-008: a Worker restart and repeated migrations preserve every authored incident field");
  const maintenanceRestarted=ok(await request('/api/state',undefined,cookie));assert.deepEqual(maintenanceRestarted.events.find(row=>row.id===maintenanceRuntimeReceipt.id),maintenanceRuntimeEvent);assert.deepEqual(maintenanceRestarted.policies.find(row=>row.id===maintenanceRuntimePolicy.id),maintenanceRuntimePolicy);
  assert.equal(ok(await maintenanceRuntimeSend()).duplicate,true);assert.deepEqual(ok(await request('/api/state',undefined,cookie)),maintenanceRestarted,'OC-043 restart never replays a maintenance admission or its recorded obligation');
  console.log('PASS OC-043 runtime: maintenance policy, immutable explanation and owned suppressed signal survive restart; duplicate admission adds no workflow or obligation');
  const maintenanceRemoved=ok(await request('/api/command',{type:'policy',service:maintenanceRuntimeId,severity:'*',action:'route',owner:admin.id,reason:'synthetic-oncall-43 maintenance removed',baseVersion:maintenanceRuntimePolicy.version},cookie));assert.equal(maintenanceRemoved.suppressionWindow,undefined);
  const afterRemoval=ok(await request('/api/ingress/'+maintenanceRuntimeId,{...maintenanceRuntimeSignal,eventId:maintenanceRuntimeId+'-after'},'',{authorization:'Bearer '+maintenanceRuntimeKey}),201),removedWindowState=ok(await request('/api/state',undefined,cookie));
  const afterRemovalAlert=removedWindowState.alerts.find(a=>a.events.includes(afterRemoval.id));assert.equal(afterRemovalAlert.suppressed,false);assert.equal(afterRemovalAlert.owner,admin.id);assert.deepEqual(removedWindowState.events.find(e=>e.id===maintenanceRuntimeReceipt.id),maintenanceRuntimeEvent,'removing maintenance releases the next observation without rewriting the original');
  console.log('PASS OC-043 removing maintenance routes the next observation of the retained alert group');
  const runtimeGrouping=ok(await request('/api/command',{type:'policy',service:maintenanceRuntimeId,severity:'*',action:'route',owner:admin.id,reason:'Synthetic restart-safe grouping',baseVersion:maintenanceRemoved.version,correlation:{field:'key',windowSeconds:300,includeDependencies:false,flappingCount:0}},cookie));
  const runtimeGroupA=ok(await request('/api/ingress/'+maintenanceRuntimeId,{...maintenanceRuntimeSignal,eventId:'synthetic-oncall-436-a',key:'synthetic-oncall-436',generation:'synthetic-oncall-436-a'},'',{authorization:'Bearer '+maintenanceRuntimeKey}),201),runtimeGroupBefore=ok(await request('/api/state',undefined,cookie)),runtimeOriginal=runtimeGroupBefore.events.find(e=>e.id===runtimeGroupA.id);
  await stop();migration();await start();assert.deepEqual(ok(await request('/api/state',undefined,cookie)).events.find(e=>e.id===runtimeGroupA.id),runtimeOriginal);
  const runtimeGroupInput={...maintenanceRuntimeSignal,eventId:'synthetic-oncall-436-b',key:'synthetic-oncall-436',generation:'synthetic-oncall-436-b'},runtimeGroupB=ok(await request('/api/ingress/'+maintenanceRuntimeId,runtimeGroupInput,'',{authorization:'Bearer '+maintenanceRuntimeKey}),201),runtimeGroupAfter=ok(await request('/api/state',undefined,cookie));
  assert.equal(runtimeGroupAfter.events.find(e=>e.id===runtimeGroupB.id).decision.correlation.originalEvent,runtimeOriginal.id);assert.equal(runtimeOriginal.decision.version,runtimeGrouping.version);ok(await request('/api/ingress/'+maintenanceRuntimeId,runtimeGroupInput,'',{authorization:'Bearer '+maintenanceRuntimeKey}));assert.deepEqual(ok(await request('/api/state',undefined,cookie)),runtimeGroupAfter,'restart and duplicate intake add no second grouping effect');
  console.log('PASS OC-043 correlation restart: frozen original and version survive migration/restart, next source generation joins once, duplicate admission adds no action');

  // OC-043 durable coordination reuses bounded triage commits; the saved plan survives a closed client and restart.
  const workflowMember=ok(await request('/api/members',{name:'synthetic-oncall-437',role:'responder',password:'synthetic-oncall-437-password'},cookie),201);
  const workflowThird=ok(await request('/api/ingress/'+maintenanceRuntimeId,{...maintenanceRuntimeSignal,eventId:'synthetic-oncall-437-c',key:'synthetic-oncall-437',generation:'synthetic-oncall-437-c'},'',{authorization:'Bearer '+maintenanceRuntimeKey}),201);
  const workflowBefore=ok(await request('/api/state',undefined,cookie));
  const workflowAlerts=[runtimeGroupA.id,runtimeGroupB.id,workflowThird.id].map(event=>workflowBefore.alerts.find(alert=>alert.events.includes(event)));
  const workflowInput={operationId:'synthetic-oncall-437-workflow',action:'reassign',items:workflowAlerts.map(alert=>({id:alert.id,revision:alert.revision??1,kind:'alert'})),member:workflowMember.id,reason:'Synthetic ordered coordination',confirmedCount:3,durable:true};
  const workflowViewer=ok(await request('/api/members',{name:'synthetic-oncall-438',role:'viewer',password:'synthetic-oncall-438-password'},cookie),201),workflowViewerLogin=await request('/api/login',{name:workflowViewer.name,password:'synthetic-oncall-438-password'});
  ok(await request('/api/triage/bulk',{...workflowInput,evidence:'Synthetic unsaved option'},cookie),409);
  const workflowFirst=ok(await request('/api/triage/bulk',workflowInput,cookie));
  assert.equal(workflowFirst.remaining,1);assert.equal(workflowFirst.results.length,2);assert.ok(workflowFirst.results.every(result=>result.ok));
  const workflowHeld=ok(await request('/api/state',undefined,cookie)),workflowRecord=workflowHeld.triage.find(row=>row.id===workflowInput.operationId);
  assert.deepEqual(workflowRecord.workflow.items,workflowInput.items);assert.equal(workflowHeld.alerts.find(alert=>alert.id===workflowAlerts[2].id).coordination,undefined);
  await stop();migration();await start();
  assert.deepEqual(ok(await request('/api/state',undefined,cookie)),workflowHeld,'restart neither loses the plan nor runs a pending step');
  const resumePath='/api/triage/workflows/'+workflowInput.operationId+'/resume';
  ok(await request(resumePath,{approve:true}),401);ok(await request(resumePath,{approve:true},workflowViewerLogin.cookie),403);
  ok(await request(resumePath,{approve:false},cookie),403);
  const workflowMemberLogin=await request('/api/login',{name:workflowMember.name,password:'synthetic-oncall-437-password'});ok(workflowMemberLogin);ok(await request(resumePath,{approve:true},workflowMemberLogin.cookie),403);
  sql("CREATE TRIGGER synthetic_oncall_437_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='triage.reassign' AND NEW.workspace_after>NEW.workspace_before BEGIN SELECT RAISE(ABORT,'synthetic-oncall-437'); END");
  try{const failed=ok(await request(resumePath,{approve:true},cookie));assert.equal(failed.interrupted,true);assert.equal(failed.remaining,1);}finally{sql('DROP TRIGGER synthetic_oncall_437_audit')}
  assert.deepEqual(ok(await request('/api/state',undefined,cookie)),workflowHeld,'audit failure rolls back both item effect and progress');
  const resumed=ok(await request(resumePath,{approve:true},cookie));assert.equal(resumed.remaining,0);assert.ok(resumed.results.every(result=>result.ok));
  const workflowAfter=ok(await request('/api/state',undefined,cookie));
  for(const alert of workflowAlerts){const current=workflowAfter.alerts.find(row=>row.id===alert.id);assert.equal(current.coordination.assignee,workflowMember.id);assert.equal(current.coordination.history.filter(entry=>entry.operationId===workflowInput.operationId).length,1);}
  ok(await request(resumePath,{approve:true},cookie));assert.deepEqual(ok(await request('/api/state',undefined,cookie)),workflowAfter,'completed workflow replay repeats no mutation');
  const workflowRefusedInput={...workflowInput,operationId:'synthetic-oncall-439-workflow',member:null,items:workflowInput.items.map(item=>({...item,revision:workflowAfter.alerts.find(alert=>alert.id===item.id).revision}))};
  assert.equal(ok(await request('/api/triage/bulk',workflowRefusedInput,cookie)).remaining,1);
  const staleStep=workflowAfter.alerts.find(alert=>alert.id===workflowAlerts[2].id);
  ok(await request('/api/triage/bulk',{operationId:'synthetic-oncall-439-stale',action:'set-priority',priority:'P2',reason:'Synthetic concurrent edit',items:[{id:staleStep.id,revision:staleStep.revision,kind:'alert'}],confirmedCount:1},cookie));
  const refusal=ok(await request('/api/triage/workflows/'+workflowRefusedInput.operationId+'/resume',{approve:true},cookie));assert.equal(refusal.remaining,0);assert.equal(refusal.results.filter(result=>!result.ok).length,1);assert.match(refusal.results.at(-1).error,/changed/i);
  const refusalHeld=ok(await request('/api/state',undefined,cookie));await stop();await start();assert.deepEqual(ok(await request('/api/state',undefined,cookie)),refusalHeld,'a refused step remains durably complete across restart');
  const workflowAudit=ok(await request('/api/audit/export',undefined,cookie)).rows;
  assert.ok(workflowAudit.some(row=>row.kind==='triage.reassign'&&row.outcome==='accepted'&&row.workspaceAfter===row.workspaceBefore+1),'each accepted workflow step has an atomic audit revision');
  assert.ok(workflowAudit.some(row=>row.kind==='triage.reassign'&&['failed','uncertain'].includes(row.outcome)),'interrupted execution has a permanent outcome');
  assert.ok(!JSON.stringify(workflowAudit).includes(workflowMember.name));
  const malformedWorkflow=ok(await request('/api/archive',undefined,cookie));malformedWorkflow.triage.find(row=>row.id===workflowInput.operationId).workflow.items[0].kind='incident';
  ok(await request('/api/restore',{mode:'replace',archive:malformedWorkflow},cookie),400);
  const workflowErase=ok(await request('/api/erasure/member/'+workflowMember.id,{workspaceRevision:refusalHeld.revision,confirmation:'erase '+workflowMember.id,identitiesReviewed:true,importedPeople:[]},cookie));assert.equal(workflowErase.state,'complete');
  assert.ok(!ok(await request('/api/archive',undefined,cookie)).triage.some(row=>row.id===workflowInput.operationId),'erasure removes the saved recipient plan and its copied reason');
  ok(await request(resumePath,{approve:true},cookie),404);
  console.log('PASS OC-043 durable coordination workflow: frozen ordered plan, two committed steps, restart mid-workflow, explicit authorized resume, atomic audit-failure rollback with interrupted outcome, exact-once completion/replay and member-erasure/export custody');


  ok(
    await request(
      "/api/command",
      { type: "member", id: viewer.id, role: "viewer", active: false },
      cookie,
    ),
  );
  ok(
    await request("/api/login", {
      name: "Viewer",
      password: "synthetic-viewer-testing-password",
    }),
    401,
  );
  await coordinationHealth({origin,request,sql,deployment,cookie});
  await readinessHealth(deployment);
  ok(await request("/api/logout", {}, cookie));
  assert.match(await (await fetch(origin, { headers: { cookie } })).text(), /href="\/setup"/, "a revoked password session receives the guest Lobby");
  ok(await request("/api/state", undefined, cookie), 401);
  ok(await request("/api/audit/export", undefined, cookie), 401);
  await stop();
  portablePersist = await mkdtemp(join(tmpdir(), "oncall-portable-"));
  persist = portablePersist;
  migration();
  await start();
  const fresh = await request("/api/setup", {
    name: "New local admin",
    password: "synthetic-fresh-target-password",
  });
  ok(fresh);
  const mapped = await request(
    "/api/restore",
    {
      mode: "replace",
      archive: { ...archive, revision: 0 },
      adminMapping: admin.id,
    },
    fresh.cookie,
  );
  ok(mapped);
  const exported = ok(await request("/api/archive", undefined, mapped.cookie));
  delete exported.revision;
  assert.deepEqual(exported, archive);
  ok(
    await request("/api/login", {
      name: "Admin",
      password: "synthetic-local-testing-password",
    }),
    401,
  );
  ok(
    await request("/api/login", {
      name: "Admin",
      password: "synthetic-fresh-target-password",
    }),
  );
  ok(
    await request("/api/login", {
      name: "Viewer",
      password: "synthetic-viewer-testing-password",
    }),
    401,
  );
  ok(
    await request(
      "/api/password",
      { member: viewer.id, password: "new-viewer-password" },
      mapped.cookie,
    ),
  );
  ok(
    await request("/api/login", {
      name: "Viewer",
      password: "new-viewer-password",
    }),
  );
  console.log(
    "PASS OC-041 accepted state and its audit entry commit together, survive subject erasure and export without secrets; emitted Worker + local D1: setup/session/roles/CSRF, scoped bearer and raw-body HMAC ingress, identities, concurrent CAS, incident/recovery/runbook/review/follow-up, replay purity, archive equality/rollback, session invalidation, restart and repeat migration, truthful handoffs.",
  );
} finally {
  if (worker && worker.exitCode === null) await stop();
  await rm(originalPersist, { recursive: true, force: true });
  if (portablePersist)
    await rm(portablePersist, { recursive: true, force: true });
}

// The scoped machine and outbound execution class extends the emitted-HTTP runtime journey.

}

// Scoped machine coordination is part of the same runtime lifecycle journey.
async function automationJourney() {
const {localWorker,automationRuntime,ownerDoor}=await import('./worker.mjs')
const {default:assert}=await import('node:assert/strict')
const {randomBytes,createHmac,createHash}=await import('node:crypto')
const {readFile}=await import('node:fs/promises')
const {autonomousCoordination}=await import('./agent-policy-fixture.mjs')
// Older sources must never restore an erased automation label through either HTTP door.
const erasureCalls=[];
const erasureRuntime=await automationRuntime(request=>{erasureCalls.push(request.url);return new Response('unexpected outbound request',{status:403});});
try {
 const setup=await erasureRuntime.request('/api/setup',{name:'synthetic-oncall-erasure-owner',password:'synthetic-oncall-erasure-password'});assert.equal(setup.status,200);
 let cookie=setup.cookie;
 const request=(p,d)=>erasureRuntime.request(p,d,cookie),value=async p=>{const r=await request(p);assert.equal(r.status,200);return r.value;};
 const service=await request('/api/command',{type:'service',id:'synthetic-oncall-erasure',name:'synthetic-oncall-erasure',environment:'test',owner:setup.value.member.id,runbook:[],pager:''});assert.equal(service.status,200);
 const door=ownerDoor(erasureRuntime,cookie),plan=await door.preview('opsgenie',await readFile('tests/fixtures/opsgenie.json','utf8'));assert.equal(plan.status,200);assert.equal((await door.apply('opsgenie',plan.value)).status,200);
 const label='alice@example.test automation';
 const client=await request('/api/automation/clients',{name:label,key:randomBytes(32).toString('hex'),services:[service.value.id],permissions:['incidents:read']});assert.equal(client.status,201);
 const checkpoint=await value('/api/recovery/checkpoint'),legacy=await value('/api/recovery/checkpoint?version=1'),archive=await value('/api/archive');
 assert.equal((await request('/api/move-in/erase',{email:'alice@example.test',confirmation:'erase alice@example.test'})).status,200);
 // Receiving an older installation archive can leave custody only in the original journal.
 // The current-checkpoint round trip below then materializes the same fence in the mirror.
 await erasureRuntime.db.prepare('DELETE FROM oc_erasure_fences').run();
 const before=await value('/api/state');
 for(const [path,input] of [['/api/recovery/restore',{mode:'replace',checkpoint}],['/api/recovery/restore',{mode:'replace',checkpoint:legacy}],['/api/restore',{mode:'replace',archive}]]) {
  const result=await request(path,input);
  console.log(JSON.stringify({witness:'automation-erasure-fence',path,status:result.status,labelReturned:JSON.stringify((await erasureRuntime.request('/api/state',undefined,result.cookie??cookie)).value).includes(label)}));
  assert.equal(result.status,409,'older source is refused whole by the erasure fence');assert.match(result.value.error,/erasure fence/i);assert.ok(!JSON.stringify(result.value).includes('alice@example.test'));
  assert.deepEqual(await value('/api/state'),before);
 }
 for(const path of ['/api/state','/api/archive','/api/recovery/checkpoint','/api/automation','/api/audit/export'])assert.ok(!JSON.stringify(await value(path)).includes(label));
 for(const version of [2,1]){const current=await value('/api/recovery/checkpoint?version='+version),restored=await request('/api/recovery/restore',{mode:'replace',checkpoint:current});assert.equal(restored.status,200);cookie=restored.cookie;}
 assert.ok(!JSON.stringify(await value('/api/state')).includes(label));
 const again=await request('/api/recovery/restore',{mode:'replace',checkpoint});assert.equal(again.status,409,'successful current restore retains the fence');
 console.log('PASS OC-053 erasure fence: legacy journal and native custody refuse stale archive/checkpoints atomically; current checkpoint restores and retains custody');
 // OC-040: per-person recipient erasure has no authority to delete at the provider.
 const person=await request('/api/members',{name:'synthetic-oncall-419',password:'synthetic-oncall-419-password',role:'admin'});assert.equal(person.status,201);
 const login=await erasureRuntime.request('/api/login',{name:person.value.name,password:'synthetic-oncall-419-password'});assert.equal(login.status,200);
 const personal=(p,d)=>erasureRuntime.request(p,d,login.cookie);
 const personalClient=await personal('/api/automation/clients',{name:'Synthetic personal client',key:randomBytes(32).toString('hex'),services:[service.value.id],permissions:['incidents:read']});assert.equal(personalClient.status,201);
 const personalRecipient=await personal('/api/automation/endpoints',{name:'Synthetic personal recipient',key:randomBytes(32).toString('hex'),client:personalClient.value.id,services:[service.value.id],url:'https://8.8.8.8/synthetic-oncall-419',approve:true});assert.equal(personalRecipient.status,201);
 assert.equal((await request('/api/command',{type:'declare',service:service.value.id,title:'Synthetic queued personal response',summary:'Synthetic retained coordination',severity:'warning'})).status,200);
 assert.ok((await value('/api/state')).apiOutbox.some(row=>row.endpoint===personalRecipient.value.id&&row.status==='queued'));
 const removed=await request('/api/erasure/member/'+person.value.id,{workspaceRevision:(await value('/api/state')).revision,confirmation:'erase '+person.value.id,identitiesReviewed:true,importedPeople:[]});assert.equal(removed.status,200);assert.equal(removed.value.outstanding.length,1);assert.equal(removed.value.outstanding[0].state,'not-requested');
 assert.equal((await erasureRuntime.request('/api/state',undefined,login.cookie)).status,401);
 assert.equal((await request('/api/automation/dispatch',{})).status,200);assert.deepEqual(erasureCalls,[],'neither erasure nor later dispatch calls any provider without per-destination deletion consent');
 console.log('PASS OC-040 member recipient custody: local access revoked, queued work removed, named deletion open item and zero outbound calls without consent');
 // OC-040 expired-lease clearance: fixture a crashed send in the real durable outbox; all transitions use HTTP.
 const leaseClient=await request('/api/automation/clients',{name:'Synthetic lease recipient',key:randomBytes(32).toString('hex'),services:[service.value.id],permissions:['incidents:read']});assert.equal(leaseClient.status,201);
 const leaseEndpoint=await request('/api/automation/endpoints',{name:'Synthetic lease destination',key:randomBytes(32).toString('hex'),client:leaseClient.value.id,services:[service.value.id],url:'https://8.8.8.8/synthetic-oncall-420',approve:true});assert.equal(leaseEndpoint.status,201);
 const leaseViewer=await request('/api/members',{name:'synthetic-oncall-420-viewer',password:'synthetic-oncall-420-password',role:'viewer'});assert.equal(leaseViewer.status,201);
 const viewerSession=await erasureRuntime.request('/api/login',{name:leaseViewer.value.name,password:'synthetic-oncall-420-password'});assert.equal(viewerSession.status,200);
 for(const race of ['clear-clear','clear-erase']){
  const incident=await request('/api/command',{type:'declare',service:service.value.id,title:'Synthetic expired lease '+race,summary:'Synthetic retained coordination',severity:'warning'});assert.equal(incident.status,200);
  let item=(await value('/api/state')).apiOutbox.find(row=>row.incident===incident.value.id&&row.endpoint===leaseEndpoint.value.id);
  const held={...item,status:'sending',lease:crypto.randomUUID(),leaseUntil:new Date(Date.now()+3600000).toISOString(),attempts:1,revision:item.revision+1,history:[...item.history,{at:new Date().toISOString(),status:'sending',reason:'dispatch'}]};
  await erasureRuntime.db.prepare('UPDATE oc_api_outbox SET data=? WHERE id=?').bind(JSON.stringify(held),item.id).run();
  const clear='/api/automation/outbox/'+item.id+'/clear-expired',erase='/api/erasure/incident/'+incident.value.id;
  const eraseInput=async()=>({workspaceRevision:(await value('/api/state')).revision,confirmation:'erase '+incident.value.id});
  assert.equal((await request(clear,{revision:held.revision,approve:true})).status,409,'live leases cannot be cleared');
  assert.equal((await request(erase,await eraseInput())).status,409,'sending work blocks erasure');
  held.leaseUntil='2000-01-01T00:00:00.000Z';
  await erasureRuntime.db.prepare('UPDATE oc_api_outbox SET data=? WHERE id=?').bind(JSON.stringify(held),item.id).run();
  assert.equal((await erasureRuntime.request(clear,{revision:held.revision,approve:true})).status,401);
  assert.equal((await erasureRuntime.request(clear,{revision:held.revision,approve:true},viewerSession.cookie)).status,403);
  assert.equal((await request(clear,{revision:held.revision,approve:false})).status,409);
  assert.equal((await request(clear,{revision:held.revision-1,approve:true})).status,409);
  if(race==='clear-clear'){
   // The scheduled dispatcher may already have classified the expired lease as uncertain.
   assert.equal((await request('/api/automation/dispatch',{})).status,200);
   item=(await value('/api/state')).apiOutbox.find(row=>row.id===item.id);assert.equal(item.status,'uncertain');assert.equal(item.history.at(-1).reason,'lease-expired');
  }else item=held;
  const before=(await value('/api/state')).apiOutbox,facts=(await value('/api/audit/export')).rows.filter(row=>row.kind==='automation.clear-expired'&&row.outcome==='interrupted');
  await erasureRuntime.db.prepare("CREATE TRIGGER synthetic_oncall_clear_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='automation.clear-expired' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-420'); END").run();
  try{assert.equal((await request(clear,{revision:item.revision,approve:true})).status,503);}finally{await erasureRuntime.db.prepare('DROP TRIGGER synthetic_oncall_clear_audit').run();}
  assert.deepEqual((await value('/api/state')).apiOutbox,before,'audit failure rolls back clearance');
  assert.deepEqual((await value('/api/audit/export')).rows.filter(row=>row.kind==='automation.clear-expired'&&row.outcome==='interrupted'),facts);
  const input=await eraseInput(),results=await Promise.all([request(clear,{revision:item.revision,approve:true}),race==='clear-clear'?request(clear,{revision:item.revision,approve:true}):request(erase,input)]);
  assert.deepEqual(results.map(row=>row.status).sort(),[200,409],'concurrent same-object requests answer conflict without dropping the connection');
  const cleared=(await value('/api/state')).apiOutbox.find(row=>row.id===item.id);assert.equal(cleared.status,'interrupted');assert.equal(cleared.authorized,false);assert.equal(cleared.lease,null);assert.equal(cleared.history.at(-1).reason,'expired-lease-cleared');
  const audit=(await value('/api/audit/export')).rows.filter(row=>row.kind==='automation.clear-expired'&&row.outcome==='interrupted');assert.equal(audit.length,facts.length+1);assert.ok(audit.at(-1).actor&&audit.at(-1).subject);assert.equal(audit.at(-1).workspaceAfter,(await value('/api/state')).revision);
  await erasureRuntime.restart();assert.equal((await value('/api/state')).apiOutbox.find(row=>row.id===item.id).status,'interrupted');
  assert.equal((await request('/api/automation/dispatch',{})).value.processed,0);
  const erased=await request(erase,await eraseInput());assert.equal(erased.status,200,JSON.stringify(erased.value));assert.equal(erased.value.state,'complete');assert.equal(erased.value.stores.oc_api_outbox.deleted,1);
  assert.deepEqual(erasureCalls,[],'clearance and erasure make no external call');
 }
 console.log('PASS OC-040 expired-lease clearance: live refusal, admin approval/revision, expired and uncertain leases, atomic audit rollback, clear/clear and clear/erase 200/409, restart before committed erasure and zero external calls');


} finally {await erasureRuntime.close();}

const sign=(key,text)=>createHmac('sha256',key).update(text).digest('hex');
const apiKey=randomBytes(32).toString('hex'),firstReceiverKey=randomBytes(32).toString('hex'),seen=[],applied=new Set();let receiverKey=firstReceiverKey,behavior='accepted',release,entered;
const runtime=await automationRuntime(async request=>{
 const raw=await request.text(),body=JSON.parse(raw),timestamp=request.headers.get('x-oncall-timestamp');
 assert.equal(request.headers.get('x-oncall-signature'),sign(receiverKey,timestamp+'.'+raw));
 assert.equal(request.headers.get('x-oncall-operation'),body.operationId);
 assert.deepEqual(Object.keys(body).sort(),['at','incident','operationId','revision','service','state','type']);
 assert.equal(new URL(request.url).hostname,'8.8.8.8');seen.push(body);
 if(behavior==='hold'){entered?.();await new Promise(r=>release=r);}
 if(behavior==='redirect')return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});
 if(behavior==='ambiguous'){applied.add(body.operationId);return new Response(null,{status:200});}
 if(behavior==='retry')return new Response(null,{status:503,headers:{'x-oncall-result':'retry','x-oncall-receipt':sign(receiverKey,body.operationId+'.'+timestamp+'.retry')}});
 applied.add(body.operationId);return new Response(null,{status:200,headers:{'x-oncall-result':'accepted','x-oncall-receipt':sign(receiverKey,body.operationId+'.'+timestamp+'.accepted')}});
});
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
let cookie;
const owner=(path,data)=>runtime.request(path,data,cookie);
const api=(path,data,key=apiKey,replay='synthetic-oncall-'+randomBytes(5).toString('hex'))=>runtime.request('/api/v1/'+path,data,'',{authorization:'Bearer '+key,'idempotency-key':replay});
const state=async()=>ok(await owner('/api/state'));
const sql=(query,...args)=>runtime.db.prepare(query).bind(...args).run();
try {
 const setup=await runtime.request('/api/setup',{name:'Synthetic Owner',password:'synthetic-oncall-owner-password'});cookie=setup.cookie;const admin=ok(setup).member;
 const service=ok(await owner('/api/command',{type:'service',id:'synthetic-oncall-service',name:'Synthetic service',environment:'test',owner:admin.id,runbook:['Inspect'],pager:''}));
 const foreign=ok(await owner('/api/command',{type:'service',id:'synthetic-oncall-foreign',name:'Hidden service',environment:'test',owner:admin.id,runbook:[],pager:''}));
 const allPermissions=['services:read','services:write','schedules:read','schedules:write','incidents:read','incidents:write','actions:read','actions:write','analytics:read','integrations:read'];
 const client=ok(await owner('/api/automation/clients',{name:'Synthetic client',key:apiKey,services:[service.id],permissions:allPermissions}),201);
 for(const url of ['http://8.8.8.8/a','https://127.0.0.1/a','https://10.0.0.1/a','https://169.254.169.254/a','https://localhost/a','https://8.8.8.8/a?token=bad','https://user@8.8.8.8/a'])ok(await owner('/api/automation/endpoints',{name:'Unsafe',key:receiverKey,client:client.id,services:[service.id],url,approve:true}),400);
 const receiverApiKey=randomBytes(32).toString('hex'),receiverClient=ok(await owner('/api/automation/clients',{name:'Receiving access',key:receiverApiKey,services:[service.id],permissions:['incidents:read']}),201);
 let endpoint=ok(await owner('/api/automation/endpoints',{name:'Synthetic receiver',key:receiverKey,client:receiverClient.id,services:[service.id],url:'https://8.8.8.8/events',approve:true}),201);
 const unset=await api('incidents');ok(unset,403);assert.equal(unset.value.error.code,'policy_unset');
 await autonomousCoordination(runtime,cookie);
 ok(await owner('/api/automation/clients/'+client.id+'/rotate',{revision:client.revision,key:apiKey}),409);ok(await owner('/api/automation/endpoints/'+endpoint.id+'/rotate',{revision:endpoint.revision,key:receiverKey,approve:true}),409);assert.equal((await state()).apiClients.find(c=>c.id===client.id).revision,1);assert.equal((await state()).apiEndpoints.find(e=>e.id===endpoint.id).revision,1);
 ok(await runtime.request('/api/v1/incidents'),401);ok(await runtime.request('/api/v1/incidents',undefined,cookie),401);
 const input={type:'declare',service:service.id,title:'Synthetic incident',summary:'Synthetic impact',severity:'warning'};
 const op=ok(await api('incidents',input,apiKey,'synthetic-oncall-repeat'),201);
 assert.deepEqual(ok(await api('incidents',input,apiKey,'synthetic-oncall-repeat')),op);
 ok(await api('incidents',{...input,title:'Changed'},apiKey,'synthetic-oncall-repeat'),409);
 ok(await api('incidents',{...input,service:foreign.id}),404);
 let incident=ok(await api('incidents/'+op.entity));
 assert.equal(incident.timeline[0].actor,client.id);assert.equal((await state()).incidents.length,1);
 // Management remains session-admin-only through every lifecycle/dispatch door.
 const deniedCallers=[{cookie:'',headers:{},status:401},{cookie:'',headers:{authorization:'Bearer '+apiKey},status:401}];
 for(const role of ['viewer','responder']){
  const name='synthetic-oncall-management-'+role,password='synthetic-oncall-management-password';
  ok(await owner('/api/members',{name,role,password}),201);
  const login=await runtime.request('/api/login',{name,password});ok(login);deniedCallers.push({cookie:login.cookie,headers:{},status:403});
 }
 const beforeManagementDenial=await state(),outcome=beforeManagementDenial.apiOutbox[0];
 const managementDoors=[['/api/automation',undefined],['/api/automation/clients',{name:'Denied',key:randomBytes(32).toString('hex'),services:[service.id],permissions:allPermissions}],['/api/automation/clients/'+client.id+'/rotate',{revision:client.revision,key:randomBytes(32).toString('hex')}],['/api/automation/clients/'+client.id+'/revoke',{revision:client.revision}],['/api/automation/endpoints',{name:'Denied',key:randomBytes(32).toString('hex'),client:receiverClient.id,services:[service.id],url:'https://8.8.8.8/events',approve:true}],['/api/automation/endpoints/'+endpoint.id+'/rotate',{revision:endpoint.revision,key:randomBytes(32).toString('hex'),approve:true}],['/api/automation/endpoints/'+endpoint.id+'/revoke',{revision:endpoint.revision}],['/api/automation/dispatch',{}],['/api/automation/outbox/'+outcome.id+'/replay',{revision:outcome.revision,approve:true}]];
 for(const caller of deniedCallers)for(const [path,data] of managementDoors)ok(await runtime.request(path,data,caller.cookie,caller.headers),caller.status);
 for(const path of ['/api/state','/api/export','/api/audit/export'])ok(await runtime.request(path,undefined,'',{authorization:'Bearer '+apiKey}),401);
 const afterManagementDenial=await state();for(const category of ['apiClients','apiEndpoints','apiOutbox','apiOperations','incidents'])assert.deepEqual(afterManagementDenial[category],beforeManagementDenial[category]);assert.equal(seen.length,0);
 console.log('PASS OC-053 management denial: anonymous/token-only 401, viewer/responder 403 across read, create, rotate, revoke, dispatch and replay; token has no session/export/audit door');
 const memberA=ok(await owner('/api/members',{name:'synthetic-oncall-responder-a@example.test',role:'responder',password:'synthetic-oncall-responder-password'}),201);
 const memberB=ok(await owner('/api/members',{name:'synthetic-oncall-responder-b',role:'responder',password:'synthetic-oncall-responder-password'}),201);
 const transition=async(type,extra)=>{const response=ok(await api('incidents',{type,incident:incident.id,revision:incident.revision,...extra}),201);incident=(await state()).incidents.find(row=>row.id===response.entity);return response;};
 ok(await api('incidents',{type:'transition',incident:incident.id,revision:incident.revision,state:'acknowledged',summary:'Machine acknowledgment'}),400);
 await transition('transition',{state:'acknowledged',member:memberA.id,summary:'Client assigns explicit responsibility; no human response claim'});
 assert.equal(incident.assignee,memberA.id);assert.equal(incident.commander,memberA.id);assert.equal(incident.timeline.at(-1).actor,client.id);
 const acknowledgment=structuredClone(incident.timeline.at(-1));assert.equal(acknowledgment.lifecycle.member,memberA.id);
 const machineFacts=ok(await owner('/api/audit/export')).rows.filter(r=>r.kind==='automation.incidents'&&r.outcome==='accepted');assert.equal(machineFacts.length,2);assert.equal(machineFacts[0].actor,machineFacts[1].actor);assert.notEqual(machineFacts[1].actor,ok(await owner('/api/audit/export')).rows.find(r=>r.kind==='command.service').actor);
 const memberLogin=await runtime.request('/api/login',{name:memberA.name,password:'synthetic-oncall-responder-password'});ok(memberLogin);
 incident=ok(await runtime.request('/api/command',{type:'note',incident:incident.id,revision:incident.revision,text:'synthetic-oncall-member-a-note'},memberLogin.cookie));
 const noteFact=ok(await owner('/api/audit/export')).rows.find(r=>r.kind==='command.note'&&r.outcome==='accepted');
 const acknowledgmentFact=machineFacts[1];assert.equal(acknowledgmentFact.namedMember,noteFact.actor);assert.notEqual(acknowledgmentFact.actor,noteFact.actor);assert.ok(!JSON.stringify(acknowledgmentFact).includes(memberA.id));
 ok(await api('incidents',{type:'reassign',incident:incident.id,revision:1,member:admin.id,reason:'Stale'}),409);
 await transition('reassign',{member:memberB.id,reason:'Explicit reassignment'});await transition('assign-role',{role:'commander',member:memberB.id,reason:'Role assignment'});
 assert.equal(incident.assignee,memberB.id);assert.equal(incident.commander,memberB.id);assert.deepEqual(incident.timeline.find(e=>e.id===acknowledgment.id),acknowledgment);assert.ok(!incident.timeline.some(e=>e.kind==='transition'&&e.lifecycle?.to==='acknowledged'&&e.actor===memberA.id));
 assert.deepEqual(ok(await owner('/api/audit/export')).rows.find(r=>r.id===acknowledgmentFact.id),acknowledgmentFact);
 ok(await api('actions',{type:'action',incident:incident.id,revision:incident.revision,title:'Follow up',owner:admin.id,due:'2026-12-01',completionPolicy:'human-review'}),201);incident=ok(await api('incidents/'+incident.id));
 ok(await api('actions',{type:'accept-action',incident:incident.id,revision:incident.revision,action:incident.actions[0].id,reason:'Not a human'}),403);
 ok(await api('actions',{type:'complete',incident:incident.id,revision:incident.revision,action:incident.actions[0].id,evidence:'https://example.test/machine-review'}),201);incident=ok(await api('incidents/'+incident.id));
 assert.equal(incident.actions[0].done,false);assert.equal(incident.actions[0].submission.by,client.id);assert.equal(incident.actions[0].accepted,undefined,'Machine evidence submission is not human acceptance');
 ok(await api('actions',{type:'action',incident:incident.id,revision:incident.revision,title:'Automation evidence claim',owner:admin.id,due:'2026-12-01',completionPolicy:'evidence'}),201);incident=ok(await api('incidents/'+incident.id));
 ok(await api('actions',{type:'complete',incident:incident.id,revision:incident.revision,action:incident.actions[1].id,evidence:'https://example.test/automation-claim'}),201);incident=ok(await api('incidents/'+incident.id));
 assert.equal(incident.actions[1].submission.by,client.id);assert.equal(incident.actions[1].accepted.by,client.id);assert.equal(incident.timeline.at(-1).actor,client.id);assert.equal(incident.actions[0].done,false);
 await transition('transition',{state:'recovered',summary:'Recovery evidence recorded',evidence:'https://example.test/evidence'});await transition('transition',{state:'resolved',summary:'Resolved with evidence'});
 assert.deepEqual(incident.timeline.find(e=>e.id===acknowledgment.id),acknowledgment);assert.deepEqual(ok(await owner('/api/audit/export')).rows.find(r=>r.id===acknowledgmentFact.id),acknowledgmentFact);
 console.log('PASS OC-053 permanent named responder: service-account acknowledgment names A; reassignment and new commander B and resolution preserve timeline and pseudonymous audit attribution');
 for(let n=0;n<3;n++)ok(await api('incidents',{...input,title:'Synthetic page '+n}),201);
 const page=ok(await api('incidents?limit=2'));assert.equal(page.data.length,2);assert.ok(page.nextCursor);const page2=ok(await api('incidents?limit=2&cursor='+encodeURIComponent(page.nextCursor)));assert.equal(new Set([...page.data,...page2.data].map(i=>i.id)).size,4);
 for(const family of ['services','schedules','actions','analytics','integrations'])assert.ok(Array.isArray(ok(await api(family)).data));
 ok(await api('services/'+foreign.id),404);ok(await api('incidents?service='+foreign.id),404);ok(await api('incidents?limit=101'),400);ok(await api('services?cursor='+encodeURIComponent(page.nextCursor)),409);
 const storedService=await api('services/'+service.id);ok(storedService);
 const etag=storedService.headers.get('etag').replaceAll('"','');
 ok(await api('services',{...service,type:'service',etag,dependencies:[foreign.id]}),404);
 ok(await api('services',{...service,type:'service',etag,name:'Updated service'}),201);ok(await api('services',{...service,type:'service',etag}),409);
 const schedule={id:'synthetic-oncall-schedule',name:'Synthetic rota',service:service.id,revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[admin.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]};
 const beforeScheduleNotices=await state();
 await sql("CREATE TRIGGER synthetic_schedule_notice BEFORE INSERT ON oc_schedule_records BEGIN SELECT RAISE(ABORT,'synthetic-oncall-notice'); END");
 try{ok(await api('schedules',schedule),503);assert.deepEqual((await state()).scheduleRecords,beforeScheduleNotices.scheduleRecords);ok(await api('schedules/'+schedule.id),404);}finally{await sql('DROP TRIGGER synthetic_schedule_notice');}
 const scheduleOperation=ok(await api('schedules',schedule,apiKey,'synthetic-oncall-schedule-notice'),201);assert.deepEqual(ok(await api('schedules',schedule,apiKey,'synthetic-oncall-schedule-notice')),scheduleOperation);
 const machineNotices=(await state()).scheduleRecords.filter(r=>r.kind==='notice'&&r.data.schedule===schedule.id);assert.ok(machineNotices.length>0);assert.ok(machineNotices.every(r=>r.data.obligation.creator===client.id&&r.data.obligation.reason==='schedule-change'&&r.data.obligation.automatic===false));
 ok(await api('schedules',schedule),409);assert.equal(ok(await api('schedules/'+schedule.id)).revision,1);
 const snapshot=await state();assert.ok(snapshot.apiOutbox.every(o=>o.owner===admin.id&&Number.isFinite(Date.parse(o.due))),'every durable delivery has its named owner and due time');assert.equal(snapshot.apiOutbox.length,12);assert.deepEqual(new Set(snapshot.apiOutbox.map(o=>o.event)),new Set(['trigger','acknowledgment','reassignment','role','follow-up','resolution']));
 await runtime.restart();const committedLogin=await runtime.request('/api/login',{name:'Synthetic Owner',password:'synthetic-oncall-owner-password'});ok(committedLogin);cookie=committedLogin.cookie;assert.deepEqual((await state()).apiOutbox,snapshot.apiOutbox,'restart after domain commit retains queued operations exactly');
 const scheduled=await fetch(runtime.origin+'/cdn-cgi/local/scheduled');assert.equal(scheduled.status,200);await scheduled.text();assert.equal((await state()).apiOutbox.filter(o=>o.status==='sent').length,10,'one scheduled step is bounded to ten deliveries');const nextScheduled=await fetch(runtime.origin+'/cdn-cgi/local/scheduled');assert.equal(nextScheduled.status,200);await nextScheduled.text();assert.ok((await state()).apiOutbox.every(o=>o.status==='sent'),'scheduled handler dispatches the durable batch without a browser');
 assert.equal(applied.size,12);assert.equal((await state()).incidents.length,4);
 receiverKey=randomBytes(32).toString('hex');endpoint=ok(await owner('/api/automation/endpoints/'+endpoint.id+'/rotate',{revision:endpoint.revision,key:receiverKey,approve:true}));
 // Real foreign records never appear through direct IDs, pagination or linked mutations.
 let hidden=ok(await owner('/api/command',{...input,service:foreign.id,title:'Hidden incident'}));hidden=ok(await owner('/api/command',{type:'action',incident:hidden.id,revision:hidden.revision,title:'Hidden action',owner:admin.id,due:'2026-12-01'}));
 ok(await owner('/api/paging/schedules',{...schedule,id:'synthetic-oncall-hidden-schedule',service:foreign.id}));
 ok(await owner('/api/sources',{id:'synthetic-oncall-hidden-source',key:randomBytes(32).toString('hex'),mode:'bearer',scopes:[foreign.id]}));
 await sql('INSERT INTO sources(id,digest,scopes) VALUES(?,?,?)','synthetic-oncall-unscoped-source',createHash('sha256').update(randomBytes(32)).digest('hex'),'[]');
 const probeKey=randomBytes(32).toString('hex');ok(await owner('/api/automation/clients',{name:'Scoped isolation probe',key:probeKey,services:[service.id],permissions:allPermissions}),201);
 for(const [family,id] of [['services',foreign.id],['incidents',hidden.id],['actions',hidden.actions[0].id],['schedules','synthetic-oncall-hidden-schedule'],['analytics',foreign.id],['integrations','native:synthetic-oncall-hidden-source'],['integrations','native:synthetic-oncall-unscoped-source']])ok(await api(family+'/'+id,undefined,probeKey),404);
 const visible=ok(await api('incidents?limit=100',undefined,probeKey));assert.equal(visible.data.length,4);assert.equal(visible.nextCursor,null);assert.equal(ok(await api('analytics',undefined,probeKey)).data[0].incidents,4);assert.equal(ok(await api('integrations',undefined,probeKey)).data.length,0);
 const beforeForeign=await state();ok(await api('incidents',{type:'transition',incident:hidden.id,revision:hidden.revision,state:'acknowledged',member:admin.id,summary:'Forbidden'},probeKey),404);ok(await api('actions',{type:'action',incident:hidden.id,revision:hidden.revision,title:'Forbidden',owner:admin.id,due:'2026-12-01'},probeKey),404);ok(await api('schedules',{...schedule,id:'synthetic-oncall-hidden-schedule',revision:1},probeKey),404);assert.deepEqual((await state()).incidents,beforeForeign.incidents);assert.deepEqual((await state()).apiOutbox,beforeForeign.apiOutbox);assert.deepEqual((await state()).apiOperations,beforeForeign.apiOperations);
 // Audit failure rolls back the incident, operation receipt and enqueue together.
 const before=await state(),factsBeforeFault=ok(await owner('/api/audit/export')).rows.filter(r=>r.kind==='automation.incidents'&&r.outcome==='accepted');await sql("CREATE TRIGGER synthetic_api_audit_fault BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='automation.incidents' BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END");
 ok(await api('incidents',{...input,title:'Must roll back'}),503);
 const unacknowledged=before.incidents.find(i=>i.state==='declared'&&i.service===service.id);
 ok(await api('incidents',{type:'transition',incident:unacknowledged.id,revision:unacknowledged.revision,state:'acknowledged',member:memberA.id,summary:'Must roll back named responsibility'}),503);await sql('DROP TRIGGER synthetic_api_audit_fault');
 assert.deepEqual(ok(await owner('/api/audit/export')).rows.filter(r=>r.kind==='automation.incidents'&&r.outcome==='accepted'),factsBeforeFault);
 const after=await state();assert.deepEqual(after.incidents,before.incidents);assert.deepEqual(after.apiOutbox,before.apiOutbox);assert.deepEqual(after.apiOperations,before.apiOperations);
 // Receiver commit without an authenticated receipt is uncertain; protected replay deduplicates.
 ok(await api('incidents',{...input,title:'Ambiguous send'}),201);behavior='ambiguous';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'uncertain');
 const uncertain=(await state()).apiOutbox.at(-1),count=applied.size,incidentCount=(await state()).incidents.length;
 await runtime.restart();const loggedIn=await runtime.request('/api/login',{name:'Synthetic Owner',password:'synthetic-oncall-owner-password'});ok(loggedIn);cookie=loggedIn.cookie;
 assert.equal(ok(await owner('/api/automation/dispatch',{})).processed,0);
 ok(await owner('/api/automation/outbox/'+uncertain.id+'/replay',{revision:uncertain.revision,approve:true}));behavior='accepted';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'sent');assert.equal(applied.size,count);assert.equal((await state()).incidents.length,incidentCount);
 // Signed retry is due-bounded; redirects never reach their target.
 ok(await api('incidents',{...input,title:'Retry later'}),201);behavior='retry';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'failed');assert.equal(ok(await owner('/api/automation/dispatch',{})).processed,0);
 const failed=(await state()).apiOutbox.at(-1);assert.ok(Date.parse(failed.due)>Date.now());ok(await owner('/api/automation/outbox/'+failed.id+'/replay',{revision:failed.revision,approve:true}));behavior='redirect';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');
 // A failed durable lease commit cannot leak a network effect.
 ok(await api('incidents',{...input,title:'Lease rollback'}),201);const beforeLease=seen.length;
 await sql("CREATE TRIGGER synthetic_dispatch_fault BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='automation.dispatch' BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END");
 ok(await owner('/api/automation/dispatch',{}),503);assert.equal(seen.length,beforeLease);assert.equal((await state()).apiOutbox.at(-1).status,'queued');await sql('DROP TRIGGER synthetic_dispatch_fault');
 behavior='retry';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'failed');
 for(let attempt=2;attempt<=5;attempt++){const item=(await state()).apiOutbox.at(-1);ok(await owner('/api/automation/outbox/'+item.id+'/replay',{revision:item.revision,approve:true}));assert.equal(ok(await owner('/api/automation/dispatch',{})).status,attempt===5?'terminal':'failed');}
 const exhausted=(await state()).apiOutbox.at(-1);assert.equal(exhausted.attempts,5);ok(await owner('/api/automation/outbox/'+exhausted.id+'/replay',{revision:exhausted.revision,approve:true}),409);
 // Unreadable local custody is durable and never causes a network request.
 ok(await api('incidents',{...input,title:'Unreadable signing custody'}),201);const savedCustody=await runtime.db.prepare('SELECT custody FROM oc_endpoint_credentials WHERE endpoint=?').bind(endpoint.id).first(),beforeCustody=seen.length;
 await sql('UPDATE oc_endpoint_credentials SET custody=? WHERE endpoint=?','invalid',endpoint.id);assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');assert.equal((await state()).apiOutbox.at(-1).history.at(-1).reason,'credential-unavailable');assert.equal(seen.length,beforeCustody);await sql('UPDATE oc_endpoint_credentials SET custody=? WHERE endpoint=?',savedCustody.custody,endpoint.id);
 // Interrupt the actual emitted runtime with a receiver request in flight.
 ok(await api('incidents',{...input,title:'Interrupted sender'}),201);behavior='hold';
 const atReceiver=new Promise(r=>entered=r),inFlight=owner('/api/automation/dispatch',{}).catch(()=>null);await atReceiver;
 const leased=(await state()).apiOutbox.at(-1);assert.equal(leased.status,'sending');assert.ok(leased.lease);
 const restarting=runtime.restart();release();await restarting;await inFlight;
 const restartLogin=await runtime.request('/api/login',{name:'Synthetic Owner',password:'synthetic-oncall-owner-password'});ok(restartLogin);cookie=restartLogin.cookie;
 const retained=(await state()).apiOutbox.find(o=>o.id===leased.id);
 if(retained.status==='sending') {await new Promise(r=>setTimeout(r,Math.max(0,Date.parse(retained.leaseUntil)-Date.now()+25)));assert.equal(ok(await owner('/api/automation/dispatch',{})).processed,0);assert.equal((await state()).apiOutbox.find(o=>o.id===leased.id).status,'uncertain');}
 else assert.equal(retained.status,'uncertain','a lost response cannot claim a completed send');
 const interrupted=(await state()).apiOutbox.find(o=>o.id===leased.id);const domainCount=(await state()).incidents.length;
 ok(await owner('/api/automation/outbox/'+interrupted.id+'/replay',{revision:interrupted.revision,approve:true}));behavior='accepted';assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'sent');assert.equal((await state()).incidents.length,domainCount);
 // Revoke queued endpoint authority before dispatch.
 ok(await api('incidents',{...input,title:'Revoked destination'}),201);ok(await owner('/api/automation/endpoints/'+endpoint.id+'/revoke',{revision:endpoint.revision}));const beforeRefusal=seen.length;assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');assert.equal(seen.length,beforeRefusal);
 // Renew the endpoint, enqueue, then revoke the originating and receiving client.
 ok(await owner('/api/automation/endpoints/'+endpoint.id+'/rotate',{revision:endpoint.revision+1,key:receiverKey,approve:true}));ok(await api('incidents',{...input,title:'Revoked queued receiver'}),201);
 ok(await owner('/api/automation/clients/'+receiverClient.id+'/revoke',{revision:receiverClient.revision}));assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');assert.equal(seen.length,beforeRefusal);
 ok(await owner('/api/automation/clients/'+receiverClient.id+'/rotate',{revision:receiverClient.revision+1,key:receiverApiKey}));ok(await api('incidents',{...input,title:'Revoked queued client'}),201);
 // Revocation applies to reads, writes and existing operation replay.
 ok(await owner('/api/automation/clients/'+client.id+'/revoke',{revision:client.revision}));ok(await api('incidents'),401);ok(await api('incidents',input,apiKey,'synthetic-oncall-repeat'),401);assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');assert.equal(seen.length,beforeRefusal);
 const readKey=randomBytes(32).toString('hex');const reader=ok(await owner('/api/automation/clients',{name:'Reader',key:readKey,services:[service.id],permissions:['incidents:read']}),201);ok(await api('incidents',input,readKey),403);ok(await api('services',undefined,readKey),403);
 let limited=false;const windows=new Map();for(let n=0;n<130;n++){const window=Math.floor(Date.now()/60000),result=await api('incidents',undefined,readKey);if(result.status===429){limited=true;assert.ok(Number(result.headers.get('retry-after'))>=1);break;}ok(result);if(window===Math.floor(Date.now()/60000)){windows.set(window,(windows.get(window)??0)+1);assert.ok(windows.get(window)<=60,'no client receives more than 60 reads in one minute window');}}assert.ok(limited,'rate refusal occurs even when the journey straddles a minute boundary');
 const rotatedKey=randomBytes(32).toString('hex');ok(await owner('/api/automation/clients/'+reader.id+'/rotate',{revision:reader.revision,key:rotatedKey}));ok(await api('incidents',undefined,readKey),401);ok(await api('incidents',undefined,rotatedKey));
 // Creator custody is independent for origin, endpoint and receiving-client owners.
 const custodyService=ok(await owner('/api/command',{type:'service',id:'synthetic-oncall-custody',name:'synthetic-oncall-custody',environment:'test',owner:admin.id,runbook:[],pager:''}));
 for(const removal of [false,true])for(const custody of ['origin','endpoint','receiver']) {
  const name='synthetic-oncall-'+custody+'-'+removal,password='synthetic-oncall-custody-password';
  const creator=ok(await owner('/api/members',{name,role:'admin',password}),201),login=await runtime.request('/api/login',{name,password});ok(login);
  const creatorRequest=(p,d)=>runtime.request(p,d,login.cookie),ownedKey=randomBytes(32).toString('hex'),independentKey=randomBytes(32).toString('hex');
  const owned=ok(await creatorRequest('/api/automation/clients',{name,key:ownedKey,services:[custodyService.id],permissions:['incidents:read','incidents:write']}),201);
  const independent=ok(await owner('/api/automation/clients',{name:'synthetic-oncall-independent',key:independentKey,services:[custodyService.id],permissions:['incidents:read','incidents:write']}),201);
  const destination=ok(await (custody==='endpoint'?creatorRequest:owner)('/api/automation/endpoints',{name,key:receiverKey,client:custody==='receiver'?owned.id:independent.id,services:[custodyService.id],url:'https://8.8.8.8/events',approve:true}),201);
  const command={...input,service:custodyService.id,title:name};
  ok(await api('incidents',command,custody==='origin'?ownedKey:independentKey),201);
  const queued=(await state()).apiOutbox.at(-1);assert.equal(queued.endpoint,destination.id);
  ok(await owner('/api/command',{type:'member',id:creator.id,role:removal?'admin':'responder',active:!removal}));
  const beforeDenied=await state();ok(await api('incidents',undefined,ownedKey),401);ok(await api('incidents',command,ownedKey),401);
  assert.deepEqual((await state()).incidents,beforeDenied.incidents);assert.deepEqual((await state()).apiOperations,beforeDenied.apiOperations);
  const sends=seen.length;assert.equal(ok(await owner('/api/automation/dispatch',{})).status,'terminal');assert.equal(seen.length,sends);
  const stopped=(await state()).apiOutbox.find(o=>o.id===queued.id);assert.equal(stopped.history.at(-1).reason,'authority-revoked');
  ok(await owner('/api/automation/outbox/'+stopped.id+'/replay',{revision:stopped.revision,approve:true}),403);
  assert.equal((await state()).apiClients.find(c=>c.id===owned.id).owner,creator.id);assert.equal((await state()).apiEndpoints.find(e=>e.id===destination.id).owner,custody==='endpoint'?creator.id:admin.id);
  await runtime.restart();const loginAgain=await runtime.request('/api/login',{name:'Synthetic Owner',password:'synthetic-oncall-owner-password'});ok(loginAgain);cookie=loginAgain.cookie;
  ok(await api('incidents',undefined,ownedKey),401);ok(await api('incidents',command,ownedKey),401);assert.equal(ok(await owner('/api/automation/dispatch',{})).processed,0);
  ok(await owner('/api/automation/endpoints/'+destination.id+'/revoke',{revision:destination.revision}));
  // A named responder losing membership never becomes a valid machine acknowledgment.
  if(custody==='origin') {
   const responsible=ok(await owner('/api/members',{name:'synthetic-oncall-responsible-'+removal,role:'responder',password}),201);
   const target=ok(await api('incidents',command,independentKey),201);
   ok(await owner('/api/command',{type:'member',id:responsible.id,role:removal?'responder':'viewer',active:!removal}));
   const prior=await state();ok(await api('incidents',{type:'transition',incident:target.entity,revision:1,state:'acknowledged',member:responsible.id,summary:'Inactive responsible member'},independentKey),400);assert.deepEqual((await state()).incidents,prior.incidents);
  }
 }
 console.log('PASS OC-053 creator demotion/removal: next read/write and origin/endpoint/receiver dispatch refused, no authority transfer, restart, inactive responder acknowledgment refused');
 // Imported-person erasure removes the timeline display reference and the
 // revocable member association, leaving the permanent named-member fact intact.
 const eraseDoor=ownerDoor(runtime,cookie),erasePlan=ok(await eraseDoor.preview('opsgenie',JSON.stringify({users:{data:[{id:'synthetic-oncall-responder-a',username:memberA.name,fullName:'synthetic-oncall-responder-a'}]}})));ok(await eraseDoor.apply('opsgenie',erasePlan));
 ok(await owner('/api/move-in/erase',{email:memberA.name,confirmation:'erase '+memberA.name}));
 assert.equal((await state()).incidents.find(i=>i.id===incident.id).timeline.find(e=>e.id===acknowledgment.id).lifecycle.member,null);
 const erasedAudit=ok(await owner('/api/audit/export')).rows;assert.deepEqual(erasedAudit.find(r=>r.id===acknowledgmentFact.id),acknowledgmentFact);assert.ok(!JSON.stringify(erasedAudit).includes(memberA.name));assert.ok(!JSON.stringify(erasedAudit).includes(memberA.id));
 assert.equal(await runtime.db.prepare('SELECT label FROM oc_audit_identities WHERE kind=? AND entity_id=?').bind('member',memberA.id).first(),null);
 const scrubbed=(await state()).incidents.find(i=>i.id===incident.id);
 ok(await runtime.request('/api/command',{type:'note',incident:incident.id,revision:scrubbed.revision,text:'synthetic-oncall-new-act-after-erasure'},memberLogin.cookie));
 const newMemberFact=ok(await owner('/api/audit/export')).rows.filter(r=>r.kind==='command.note'&&r.outcome==='accepted').at(-1);assert.notEqual(newMemberFact.actor,acknowledgmentFact.namedMember);assert.deepEqual(ok(await owner('/api/audit/export')).rows.find(r=>r.id===acknowledgmentFact.id),acknowledgmentFact);
 console.log('PASS OC-053 named-responder erasure: timeline association scrubbed, permanent pseudonymous audit fact unchanged, no reassigned label');
 // Populated native archive and checkpoint preserve exact history, omit credentials and restore inactive.
 ok(await owner('/api/command',{...input,title:'Queued at export'}));assert.equal((await state()).apiOutbox.at(-1).status,'queued');
 const archive=ok(await owner('/api/archive')),checkpoint=ok(await owner('/api/recovery/checkpoint'));
 for(const secret of [apiKey,firstReceiverKey,receiverKey,readKey,rotatedKey,probeKey,receiverApiKey,savedCustody.custody])assert.ok(!JSON.stringify([archive,checkpoint,ok(await owner('/api/audit/export'))]).includes(secret));
 assert.ok(archive.apiClients.find(c=>c.id===reader.id).lastUsed);
 const malformed=structuredClone(archive);malformed.apiOutbox[0].payload.secret='not-authorized';const retainedBefore=await state();ok(await owner('/api/restore',{mode:'replace',archive:malformed,adminMapping:admin.id}),400);assert.deepEqual((await state()).incidents,retainedBefore.incidents);assert.deepEqual((await state()).apiOutbox,retainedBefore.apiOutbox);
 const limitArchive=structuredClone(archive);while(limitArchive.apiOperations.length<1000){const n=limitArchive.apiOperations.length;limitArchive.apiOperations.push({...op,id:'synthetic-oncall-receipt-'+n,key:createHash('sha256').update('synthetic-oncall-receipt-'+n).digest('hex')});}
 const fresh=await automationRuntime();try{const setup2=await fresh.request('/api/setup',{name:'Fresh Owner',password:'synthetic-oncall-fresh-password'});const ck=setup2.cookie;ok(setup2);const restored=await fresh.request('/api/restore',{mode:'replace',archive:limitArchive,adminMapping:admin.id},ck);ok(restored);const held=ok(await fresh.request('/api/state',undefined,restored.cookie));assert.deepEqual(held.apiOperations,limitArchive.apiOperations);assert.deepEqual(held.erasureFences,limitArchive.erasureFences,'fresh native receiving preserves digest custody without an existing journal');assert.deepEqual(held.apiOutbox.map(o=>o.id),archive.apiOutbox.map(o=>o.id));assert.ok(held.apiClients.every(c=>!c.active));assert.ok(held.apiEndpoints.every(e=>!e.active));assert.ok(held.apiOutbox.every(o=>!o.authorized));for(const original of archive.apiOutbox){const received=held.apiOutbox.find(o=>o.id===original.id);assert.deepEqual(received.payload,original.payload);assert.deepEqual(received.history.slice(0,original.history.length),original.history);if(original.status==='queued'){assert.equal(received.status,'interrupted');assert.equal(received.history.at(-1).reason,'restore-requires-authorization');}else assert.equal(received.status,original.status);}assert.equal((await fresh.db.prepare('SELECT COUNT(*) AS n FROM oc_api_credentials').first()).n,0);assert.equal((await fresh.db.prepare('SELECT COUNT(*) AS n FROM oc_endpoint_credentials').first()).n,0);ok(await fresh.request('/api/v1/incidents',undefined,'',{authorization:'Bearer '+rotatedKey}),401);assert.equal(ok(await fresh.request('/api/automation/dispatch',{},restored.cookie)).processed,0);const limitKey=randomBytes(32).toString('hex');ok(await fresh.request('/api/automation/clients/'+client.id+'/rotate',{revision:held.apiClients.find(c=>c.id===client.id).revision,key:limitKey},restored.cookie));
 await autonomousCoordination(fresh,restored.cookie);
 const bounded=(p,d,key)=>fresh.request('/api/v1/'+p,d,'',{authorization:'Bearer '+limitKey,'idempotency-key':key});
 const atLimit=ok(await fresh.request('/api/state',undefined,restored.cookie));assert.deepEqual(ok(await bounded('incidents',input,'synthetic-oncall-repeat')),op);ok(await bounded('incidents',{...input,title:'synthetic-oncall-over-receipt-capacity'},'synthetic-oncall-new-receipt'),429);const afterLimit=ok(await fresh.request('/api/state',undefined,restored.cookie));assert.deepEqual(afterLimit.incidents,atLimit.incidents);assert.deepEqual(afterLimit.apiOperations,atLimit.apiOperations);assert.deepEqual(afterLimit.apiOutbox,atLimit.apiOutbox);
 ok(await fresh.request('/api/command',{...input,title:'synthetic-oncall-human-at-receipt-capacity'},restored.cookie));console.log('PASS OC-053 lifetime API receipts: full history refuses new machine mutation, identical authorized retry retains receipt, human coordination continues');}finally{await fresh.close();}
 console.log('PASS OC-053 scoped API, atomic signed outbox, receipt uncertainty, replay, revocation and inactive native restore');
} finally {release?.();await runtime.close();}

// The existing automation journey continues with a populated-history installation.
// Synthetic retained records enter only through the real, strict restore door;
// every new human mutation, replay and dispatch uses HTTP and actual D1 storage.
const capacity=await automationRuntime(async request=>{
 const raw=await request.text(),body=JSON.parse(raw),timestamp=request.headers.get('x-oncall-timestamp');
 assert.deepEqual(Object.keys(body).sort(),['at','incident','operationId','revision','service','state','type']);
 assert.equal(request.headers.get('x-oncall-signature'),sign(capacityKey,timestamp+'.'+raw));
 return new Response(null,{status:200,headers:{'x-oncall-result':'accepted','x-oncall-receipt':sign(capacityKey,body.operationId+'.'+timestamp+'.accepted')}});
});
const capacityKey=randomBytes(32).toString('hex');
try {
 const setup=await capacity.request('/api/setup',{name:'synthetic-oncall-capacity-owner',password:'synthetic-oncall-capacity-password'}),admin=ok(setup).member;
 let adminCookie=setup.cookie;
 const manage=(p,d)=>capacity.request(p,d,adminCookie),read=async()=>ok(await manage('/api/state'));
 const service=ok(await manage('/api/command',{type:'service',id:'synthetic-oncall-capacity',name:'synthetic-oncall-capacity',environment:'test',owner:admin.id,runbook:[],pager:''}));
 const responder=ok(await manage('/api/members',{name:'synthetic-oncall-capacity-responder',role:'responder',password:'synthetic-oncall-capacity-responder-password'}),201);
 const client=ok(await manage('/api/automation/clients',{name:'synthetic-oncall-capacity',key:randomBytes(32).toString('hex'),services:[service.id],permissions:['incidents:read']}),201);
 const endpoint=ok(await manage('/api/automation/endpoints',{name:'synthetic-oncall-capacity',key:capacityKey,client:client.id,services:[service.id],url:'https://8.8.8.8/events',approve:true}),201);
 let incident=ok(await manage('/api/command',{type:'declare',service:service.id,title:'synthetic-oncall-capacity',summary:'Synthetic retained history',severity:'warning'}));
 const fixture=ok(await manage('/api/archive')),template=fixture.apiOutbox[0],entry=incident.timeline[0];
 fixture.apiOutbox=[];fixture.incidents[0].timeline=[];
 for(let n=0;n<1001;n++) {
  const id='synthetic-oncall-history-'+n,entryId='synthetic-oncall-entry-'+n;
  fixture.incidents[0].timeline.push({...entry,id:entryId});
  fixture.apiOutbox.push({...template,id,entry:entryId,status:'terminal',attempts:1,revision:3,history:[...template.history,{at:template.at,status:'sending',reason:'dispatch'},{at:template.at,status:'terminal',reason:'receiver-refused'}],payload:{...template.payload,operationId:id}});
 }
 const restored=await manage('/api/restore',{mode:'replace',archive:fixture});ok(restored);adminCookie=restored.cookie;
 assert.deepEqual((await read()).apiOutbox.map(o=>o.history),fixture.apiOutbox.map(o=>o.history));
 ok(await manage('/api/automation/clients/'+client.id+'/rotate',{revision:client.revision,key:randomBytes(32).toString('hex')}));
 ok(await manage('/api/automation/endpoints/'+endpoint.id+'/rotate',{revision:endpoint.revision,key:capacityKey,approve:true}));
 ok(await manage('/api/password',{member:responder.id,password:'synthetic-oncall-capacity-responder-password'}));
 let login=await capacity.request('/api/login',{name:responder.name,password:'synthetic-oncall-capacity-responder-password'});ok(login);
 let responderCookie=login.cookie;
 const human=(p,d)=>capacity.request(p,d,responderCookie);
 const audit=async()=>ok(await manage('/api/audit/export')).rows;
 const act=async data=>{
  const before=await read(),old=before.incidents.find(i=>i.id===incident.id),facts=await audit();
  const input={...data,incident:incident.id,revision:old.revision},response=await human('/api/command',input);
  incident=ok(response);const after=await read(),newFacts=(await audit()).filter(row=>!facts.some(old=>old.id===row.id)&&row.kind==='command.'+data.type&&row.outcome==='accepted');
  assert.equal(incident.revision,old.revision+1);assert.equal(incident.timeline.length,old.timeline.length+1);assert.equal(newFacts.length,1,'one permanent accepted command fact');
  const outcomes=after.apiOutbox.slice(before.apiOutbox.length);assert.equal(outcomes.length,1,'exactly one durable event for the approved recipient');
  assert.deepEqual(after.apiOutbox.slice(0,before.apiOutbox.length),before.apiOutbox,'existing work is never evicted or duplicated');
  console.log(JSON.stringify({witness:'human-capacity',request:'/api/command',type:data.type,status:response.status,before:{incidentRevision:old.revision,events:before.apiOutbox.length},after:{incidentRevision:incident.revision,events:after.apiOutbox.length,acceptedAuditFacts:newFacts.length,outcome:outcomes[0].status,reason:outcomes[0].history.at(-1).reason}}));
  return outcomes[0];
 };
 assert.equal((await act({type:'assign-role',role:'scribe',member:responder.id,reason:'Completed history does not block coordination'})).status,'queued');
 assert.equal(ok(await manage('/api/automation/dispatch',{})).status,'sent');
 // Fill genuinely unfinished work through the authenticated human command door.
 for(let n=0;n<1000;n++)incident=ok(await human('/api/command',{type:'assign-role',incident:incident.id,revision:incident.revision,role:'scribe',member:n%2===0?admin.id:responder.id,reason:'Synthetic unfinished capacity '+n}));
 const full=await read();assert.equal(full.apiOutbox.filter(o=>['queued','sending','failed'].includes(o.status)).length,1000);
 const overflow=await act({type:'transition',state:'acknowledged',summary:'Human coordination continues with a full queue'});
 assert.equal(overflow.status,'terminal');assert.equal(overflow.history[0].reason,'capacity-not-scheduled');assert.equal(overflow.attempts,0);
 ok(await manage('/api/automation/outbox/'+overflow.id+'/replay',{revision:overflow.revision,approve:true}),429);
 assert.equal((await act({type:'reassign',member:admin.id,reason:'A subsequent command also survives capacity'})).status,'terminal');
 await act({type:'assign-role',role:'scribe',member:admin.id,reason:'Role custody at capacity'});
 await act({type:'action',title:'synthetic-oncall-follow-up',owner:responder.id,due:'2026-12-01',completionPolicy:'human-review'});
 await act({type:'complete',action:incident.actions[0].id,evidence:'https://example.test/capacity'});
 await act({type:'accept-action',action:incident.actions[0].id,reason:'Actual human acceptance'});
 incident=ok(await human('/api/command',{type:'transition',incident:incident.id,revision:incident.revision,state:'recovered',summary:'Observed recovery',evidence:'https://example.test/recovery'}));
 await act({type:'transition',state:'resolved',summary:'Human resolution with full delivery backlog'});
 const declared=ok(await human('/api/command',{type:'declare',service:service.id,title:'synthetic-oncall-bulk',summary:'Full queue declaration',severity:'warning'}));
 assert.equal((await read()).apiOutbox.at(-1).history[0].reason,'capacity-not-scheduled');
 for(const action of ['acknowledge','resolve']) {
  const beforeBulk=await read(),current=beforeBulk.incidents.find(i=>i.id===declared.id);
  const result=ok(await human('/api/triage/bulk',{operationId:'synthetic-oncall-capacity-'+action,action,items:[{id:current.id,revision:current.revision}],reason:'Synthetic bulk coordination',summary:'Synthetic bulk coordination',evidence:'https://example.test/recovery'}));
  assert.equal(result.results[0].ok,true,JSON.stringify(result));const afterBulk=await read();assert.equal(afterBulk.apiOutbox.length,beforeBulk.apiOutbox.length+1);assert.equal(afterBulk.apiOutbox.at(-1).history[0].reason,'capacity-not-scheduled');assert.equal(afterBulk.apiOutbox.at(-1).entry,afterBulk.incidents.find(i=>i.id===declared.id).timeline.at(-1).id);assert.deepEqual(afterBulk.apiOutbox.slice(0,-1),beforeBulk.apiOutbox);
 }
 // A second recipient at the boundary gets its own explicit outcome.
 const second=ok(await manage('/api/automation/endpoints',{name:'synthetic-oncall-second',key:capacityKey,client:client.id,services:[service.id],url:'https://8.8.8.8/events',approve:true}),201);
 assert.equal(ok(await manage('/api/automation/dispatch',{})).status,'sent');
 const beforeBoundary=await read();
 incident=ok(await human('/api/command',{type:'assign-role',incident:incident.id,revision:incident.revision,role:'scribe',member:responder.id,reason:'One free delivery slot, two recipients'}));
 const boundary=(await read()).apiOutbox.slice(beforeBoundary.apiOutbox.length);assert.deepEqual(boundary.map(o=>o.status),['queued','terminal']);assert.equal(boundary[1].endpoint,second.id);
 // Storage failure still rolls back incident, audit and the capacity outcome.
 const beforeFailure=await read(),auditBeforeFailure=await audit();
 await capacity.db.prepare("CREATE TRIGGER synthetic_capacity_fault BEFORE INSERT ON oc_api_outbox BEGIN SELECT RAISE(ABORT,'synthetic outbox storage failure'); END").run();
 ok(await human('/api/command',{type:'assign-role',incident:incident.id,revision:incident.revision,role:'scribe',member:admin.id,reason:'Must roll back'}),503);
 await capacity.db.prepare('DROP TRIGGER synthetic_capacity_fault').run();
 assert.deepEqual((await read()).incidents,beforeFailure.incidents);assert.deepEqual((await read()).apiOutbox,beforeFailure.apiOutbox);
 assert.equal((await audit()).filter(x=>!auditBeforeFailure.some(y=>x.id===y.id)&&x.kind==='command.assign-role'&&x.outcome==='accepted').length,0);
 // Restart preserves overflow and backlog. Replay keeps identity and never mutates the incident.
 const retained=await read();await capacity.restart();const adminLogin=await capacity.request('/api/login',{name:admin.name,password:'synthetic-oncall-capacity-password'});ok(adminLogin);adminCookie=adminLogin.cookie;
 assert.deepEqual((await read()).apiOutbox,retained.apiOutbox);
 assert.equal(ok(await manage('/api/automation/dispatch',{})).status,'sent');
 const domainBefore=(await read()).incidents;ok(await manage('/api/automation/outbox/'+overflow.id+'/replay',{revision:overflow.revision,approve:true}));assert.deepEqual((await read()).incidents,domainBefore);
 // Checkpoint is the bounded larger native envelope; portable transfer is also exercised below.
 const checkpoint=ok(await manage('/api/recovery/checkpoint'));
 const destination=await automationRuntime();try {
  const fresh=await destination.request('/api/setup',{name:'synthetic-oncall-destination',password:'synthetic-oncall-destination-password'});ok(fresh);
  const response=await destination.request('/api/recovery/restore',{mode:'replace',checkpoint,adminMapping:admin.id},fresh.cookie);ok(response);
  const held=ok(await destination.request('/api/state',undefined,response.cookie));
  for(const original of checkpoint.coordination.apiOutbox){const received=held.apiOutbox.find(o=>o.id===original.id);assert.deepEqual(received.payload,original.payload);assert.deepEqual(received.history.slice(0,original.history.length),original.history);assert.equal(received.authorized,false);if(original.status==='terminal')assert.equal(received.status,'terminal');}
  assert.ok(held.apiClients.every(c=>!c.active));assert.ok(held.apiEndpoints.every(e=>!e.active));assert.equal(ok(await destination.request('/api/automation/dispatch',{},response.cookie)).processed,0);
  const bad=structuredClone(checkpoint);bad.coordination.apiOutbox[0].entry='synthetic-oncall-foreign-entry';ok(await destination.request('/api/recovery/restore',{mode:'replace',checkpoint:bad},response.cookie),400);assert.deepEqual(ok(await destination.request('/api/state',undefined,response.cookie)),held);
  const duplicate=structuredClone(checkpoint),copy=structuredClone(duplicate.coordination.apiOutbox[0]);copy.id='synthetic-oncall-duplicate-outcome';copy.payload.operationId=copy.id;duplicate.coordination.apiOutbox.push(copy);ok(await destination.request('/api/recovery/restore',{mode:'replace',checkpoint:duplicate},response.cookie),400);assert.deepEqual(ok(await destination.request('/api/state',undefined,response.cookie)),held);
 }finally{await destination.close();}
 console.log('PASS OC-053 human capacity: retained history >1000, full unfinished backlog, all human event paths, multi-recipient boundary, storage rollback, restart, stable replay and inactive checkpoint restore');
}finally{await capacity.close();}

// OC-068 shares the scoped API receipt door, not a second paging transport.
const manualApi=await automationRuntime();
try {
 const setup=await manualApi.request('/api/setup',{name:'synthetic-oncall-68-owner',password:'synthetic-oncall-68-password'});assert.equal(setup.status,200);
 const cookie=setup.cookie,owner=(p,d)=>manualApi.request(p,d,cookie),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value},admin=setup.value.member;
 const service=ok(await owner('/api/command',{type:'service',id:'synthetic-oncall-68-api',name:'Payments API',environment:'test',owner:admin.id,runbook:[],pager:''}));
 const schedule=ok(await owner('/api/paging/schedules',{id:service.id,name:'Payments primary',service:service.id,revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[admin.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}));
 const policy=ok(await owner('/api/paging/policies',{service:service.id,scheduleId:schedule.id,revision:0,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3}));
 const key=randomBytes(32).toString('hex');ok(await owner('/api/automation/clients',{name:'Manual incident writer',key,services:[service.id],permissions:['incidents:write','incidents:read']}),201);
 await autonomousCoordination(manualApi,cookie);
 const submit=(input,credential=key,replay='synthetic-oncall-68-api-page')=>manualApi.request('/api/v1/incidents',input,'',{authorization:'Bearer '+credential,'idempotency-key':replay}),input={type:'manual-page',service:service.id,title:'Payments policy-targeted incident',severity:'warning',urgency:'high',policy:service.id};
 const first=ok(await submit(input),201),replayed=ok(await submit(input));assert.equal(replayed.id,first.id);ok(await submit({...input,title:'Conflicting policy-targeted page'}),409);
 const state=ok(await owner('/api/state'));assert.equal(state.incidents.length,1);const incident=state.incidents.find(i=>i.id===first.entity);assert.equal(incident.manualPage.creator,first.client);assert.deepEqual(incident.manualPage.obligations[0].target,{kind:'policy',id:service.id,policyRevision:policy.revision});assert.equal(incident.manualPage.obligations[0].automatic,false);assert.equal(incident.manualPage.obligations[0].paging,'off');
 const readKey=randomBytes(32).toString('hex');ok(await owner('/api/automation/clients',{name:'Manual incident reader',key:readKey,services:[service.id],permissions:['incidents:read']}),201);ok(await submit(input,readKey),403);
 ok(await submit({...input,service:'synthetic-oncall-68-foreign'},key,'synthetic-oncall-68-cross-scope'),404);assert.equal(ok(await owner('/api/state')).incidents.length,1);
 console.log('OC-068 API manual page: explicit incident-write scope, real policy override, repeated-key single incident, conflicting/cross-scope/read-only refusals and recorded-only obligation');
} finally {await manualApi.close();}

// OC-058 uses the existing ephemeral Date.now wrapper and the emitted scheduled door.
const deadlines58=await localWorker({}, {clock:true});
try {
 const w=deadlines58,ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
 const setup=await w.request('/api/setup',{name:'synthetic-oncall-58',password:'synthetic-oncall-58-password'});ok(setup);let cookie=setup.cookie;await autonomousCoordination(w,cookie);
 const req=(path,input)=>w.request(path,input,cookie),read=async()=>ok(await req('/api/state')),admin=setup.value.member;
 const reviewedSchedule58=async schedule=>{const from=Date.now(),input={schedule,from,to:from+86400000};const reviewed=ok(await req('/api/schedules/'+schedule.id+'/review',input));return ok(await req('/api/schedules/'+schedule.id+'/apply',{...input,digest:reviewed.digest,confirmed:true})).schedule;};
 const backup=ok(await req('/api/members',{name:'synthetic-oncall-58-backup',role:'responder',password:'synthetic-oncall-58-backup-password'}),201);
 ok(await req('/api/command',{type:'service',id:'synthetic-oncall-58',name:'Deadline service',environment:'test',owner:admin.id,runbook:[],pager:''}));
 const schedule=ok(await req('/api/paging/schedules',{id:'synthetic-oncall-58',service:'synthetic-oncall-58',name:'Deadline rota',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[admin.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[backup.id],ambiguity:'earlier'},overrides:[]}));
 ok(await req('/api/paging/policies',{service:'synthetic-oncall-58',scheduleId:schedule.id,revision:0,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3}));
 const at=Date.now(),tick=async()=>{const r=await w.send('/cdn-cgi/local/scheduled',undefined,{},'GET');assert.equal(r.status,200);},find=async id=>(await read()).incidents.find(i=>i.id===id);
 const make=async()=>ok(await req('/api/command',{type:'declare',service:'synthetic-oncall-58',title:'Deadline investigation',severity:'warning',summary:'Customer impact under investigation'}));
 const ack=async i=>ok(await req('/api/command',{type:'transition',incident:i.id,revision:i.revision,state:'acknowledged',summary:'Owner acknowledged'}));
 await w.time(at);let i=await ack(await make());assert.equal(i.deadlines,undefined,'upgrade default off changes no acknowledgment behavior');
 ok(await req('/api/command',{type:'acknowledgment-timeout',service:i.service,baseVersion:0,minutes:1}));i=await ack(await make());const timeout=i.deadlines.at(-1);assert.equal(Date.parse(timeout.dueAt),at+60000);
 for(const minutes of [0,1441])ok(await req('/api/command',{type:'snooze',incident:i.id,revision:i.revision,minutes}),400);
 i=ok(await req('/api/command',{type:'snooze',incident:i.id,revision:i.revision,minutes:2}));const snooze=i.deadlines.at(-1);assert.equal(i.deadlines[0].state,'cancelled');assert.equal(Date.parse(snooze.dueAt),at+120000);
 await w.time(at+119999);await tick();assert.equal((await find(i.id)).state,'acknowledged','never early');
 const audit58Before=w.sql("SELECT COUNT(*) AS n FROM oc_admin_audit WHERE feature='incident-deadlines' AND workspace_after>workspace_before")[0].n;
 await w.stop();await w.start();await w.time(at+120000);
 await Promise.all([tick(),tick()]);await tick();i=await find(i.id);assert.equal(i.state,'declared');assert.equal(i.commander,null);assert.equal(i.deadlines.filter(d=>d.state==='fired').length,1);assert.equal(i.timeline.filter(e=>e.kind==='deadline-fired').length,1);assert.equal(i.deadlines.at(-1).obligation.target.id,admin.id);assert.equal(i.deadlines.at(-1).obligation.paging,'off');assert.equal(i.deadlines.at(-1).obligation.automatic,false);assert.equal(w.sql("SELECT COUNT(*) AS n FROM oc_admin_audit WHERE feature='incident-deadlines' AND workspace_after>workspace_before")[0].n-audit58Before,1,'one permanent accepted audit fact commits with the concurrent expiry');
 console.log('OC-058 scheduled snooze: absolute replacement, never-early boundary, restart and concurrent/double sweep produce one deterministic re-trigger obligation with paging OFF');
 i=await ack(i);const due=Date.parse(i.deadlines.at(-1).dueAt);assert.equal(i.deadlines.at(-1).kind,'acknowledgment-timeout');assert.equal(i.deadlines.find(d=>d.id===snooze.id).obligation.state,'stopped');
 await reviewedSchedule58({...schedule,revision:schedule.revision,primary:{...schedule.primary,members:[backup.id]},backup:{...schedule.backup,members:[admin.id]}});
 await w.time(due);await tick();i=await find(i.id);assert.equal(i.deadlines.at(-1).obligation.target.id,backup.id,'timeout resolves current level-one coverage at firing');
 console.log('OC-058 timeout: each new acknowledgment starts a new versioned deadline and current level-one coverage is resolved only when it fires');
 const third=ok(await req('/api/members',{name:'synthetic-oncall-58-next',role:'responder',password:'synthetic-oncall-58-next-password'}),201);
 i=await ack(i);i=ok(await req('/api/command',{type:'snooze',incident:i.id,revision:i.revision,minutes:1}));const handoffDue=Date.parse(i.deadlines.at(-1).dueAt);
 const handed=ok(await req('/api/paging/state')).schedules.find(s=>s.id===schedule.id);await reviewedSchedule58({...handed,backup:{...handed.backup,members:[third.id]}});await w.time(handoffDue);await tick();i=await find(i.id);assert.equal(i.deadlines.at(-1).obligation.target.id,third.id,'snooze retains its original coverage level after assignee handoff');
 console.log('OC-058 snooze handoff: departed assignee is replaced by current on-call at the captured level, with no invented level or delivery');

 i=await ack(i);i=ok(await req('/api/command',{type:'snooze',incident:i.id,revision:i.revision,minutes:1}));const held=ok(await req('/api/recovery/checkpoint'));const restored=await req('/api/recovery/restore',{mode:'replace',checkpoint:held});ok(restored);cookie=restored.cookie;i=await find(i.id);assert.equal(i.deadlines.at(-1).state,'held');await w.time(Date.parse(i.deadlines.at(-1).dueAt)+1);await tick();assert.equal((await find(i.id)).state,'acknowledged');
 console.log('OC-058 checkpoint receiving duty: pending snooze restored held and scheduled work never resumes it');
 const scopedKey=randomBytes(32).toString('hex');ok(await req('/api/automation/clients',{name:'synthetic-oncall-58-api',key:scopedKey,services:['synthetic-oncall-58'],permissions:['incidents:write']}),201);let apiIncident=await ack(await make());const apiInput={type:'snooze',incident:apiIncident.id,revision:apiIncident.revision,minutes:1},apiHeaders={authorization:'Bearer '+scopedKey,'idempotency-key':'synthetic-oncall-58-snooze'};ok(await w.request('/api/v1/incidents',apiInput,'',apiHeaders),201);ok(await w.request('/api/v1/incidents',apiInput,'',apiHeaders));apiIncident=await find(apiIncident.id);assert.equal(apiIncident.deadlines.filter(d=>d.state==='pending').length,1);console.log('OC-058 OC-053 API incident door: scoped snooze and repeated idempotency key retain one pending absolute deadline');
 let cancelled=await ack(await make());cancelled=ok(await req('/api/command',{type:'cancel-deadline',incident:cancelled.id,revision:cancelled.revision}));assert.equal(cancelled.deadlines.at(-1).state,'cancelled');
 let resolved=await ack(await make());resolved=ok(await req('/api/command',{type:'bulk-resolve',incident:resolved.id,revision:resolved.revision,reason:'Verified recovery',evidence:'https://example.test/recovered'}));assert.equal(resolved.deadlines.at(-1).state,'cancelled');
 const gapSchedule=(ok(await req('/api/paging/state'))).schedules.find(s=>s.id===schedule.id);await reviewedSchedule58({...gapSchedule,primary:{...gapSchedule.primary,members:[]},backup:{...gapSchedule.backup,members:[admin.id]}});let gap=await ack(await make());await w.time(Date.parse(gap.deadlines.at(-1).dueAt));await tick();gap=await find(gap.id);assert.equal(gap.state,'declared');assert.equal(gap.deadlines.at(-1).obligation,null);assert.match(gap.deadlines.at(-1).outcome,/operator action required/);
 console.log('OC-058 cancellation and gaps: resolution and explicit cancellation stop deadlines; missing current on-call is a retained operator-visible failure, never silence');
 const recoveryKey58=randomBytes(32).toString('hex');ok(await req('/api/sources',{id:'synthetic-oncall-58-source',key:recoveryKey58,scopes:['synthetic-oncall-58']}));const sourceSignal58={source:'synthetic-oncall-58-source',eventId:'synthetic-oncall-58-trigger',service:'synthetic-oncall-58',environment:'test',key:'synthetic-oncall-58-key',generation:'synthetic-oncall-58-generation',intent:'trigger',severity:'warning',title:'Source recovery during snooze',observedAt:new Date().toISOString(),evidence:''};const sourceHeaders58={authorization:'Bearer '+recoveryKey58};const sourceReceipt58=ok(await w.request('/api/ingress/synthetic-oncall-58-source',sourceSignal58,'',sourceHeaders58),201),sourceAlert58=(await read()).alerts.find(a=>a.events.includes(sourceReceipt58.id));let recovering58=ok(await req('/api/command',{type:'declare',service:'synthetic-oncall-58',title:'Source-linked deadline',severity:'warning',summary:'Verify recovery',alerts:[sourceAlert58.id]}));recovering58=await ack(recovering58);recovering58=ok(await req('/api/command',{type:'snooze',incident:recovering58.id,revision:recovering58.revision,minutes:1}));const recoveringDue58=Date.parse(recovering58.deadlines.at(-1).dueAt);ok(await w.request('/api/ingress/synthetic-oncall-58-source',{...sourceSignal58,eventId:'synthetic-oncall-58-recovery',intent:'recover'},'',sourceHeaders58),201);await w.time(recoveringDue58);await tick();recovering58=await find(recovering58.id);assert.equal(recovering58.state,'acknowledged');assert.equal(recovering58.deadlines.at(-1).state,'cancelled');assert.equal(recovering58.deadlines.at(-1).obligation,null);console.log('OC-058 scheduled source recovery: a source recovered mid-snooze remains acknowledged after the deadline with no re-trigger obligation');
 let rollback=await ack(await make());const before=await read();w.sql("CREATE TRIGGER synthetic_oncall_58_audit BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");try{ok(await req('/api/command',{type:'snooze',incident:rollback.id,revision:rollback.revision,minutes:1}),503);}finally{w.sql('DROP TRIGGER synthetic_oncall_58_audit');}assert.deepEqual(await read(),before);
 await w.time(Date.parse(rollback.deadlines.at(-1).dueAt));const beforeSweep=await read();w.sql("CREATE TRIGGER synthetic_oncall_58_sweep_audit BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");try{const failed=await w.send('/cdn-cgi/local/scheduled',undefined,{},'GET');assert.equal(failed.status,500);}finally{w.sql('DROP TRIGGER synthetic_oncall_58_sweep_audit');}assert.deepEqual(await read(),beforeSweep);await tick();assert.equal((await find(rollback.id)).deadlines.at(-1).state,'fired');
 console.log('OC-058 atomic deadline custody: failed permanent audit rolls back snooze and scheduled expiry together; the durable pending item remains visible and a later sweep commits exactly once');
} finally {await deadlines58.close();}

// OC-040 integration erasure owns the same OC-053 lease boundary as dispatch.
{
 const sent=[],key=randomBytes(32).toString('hex');let hold,entered,waiting=false;
 const erased=await automationRuntime(async request=>{
  const body=JSON.parse(await request.text()),timestamp=request.headers.get('x-oncall-timestamp');sent.push(body);
  if(waiting){entered();await new Promise(resolve=>hold=resolve)}
  return new Response(null,{status:200,headers:{'x-oncall-result':'accepted','x-oncall-receipt':sign(key,body.operationId+'.'+timestamp+'.accepted')}})
 });
 try{
  const setup=await erased.request('/api/setup',{name:'synthetic-oncall-403',password:'synthetic-oncall-403-password'});ok(setup);let cookie=setup.cookie;await autonomousCoordination(erased,cookie);
  const req=(path,data)=>erased.request(path,data,cookie),read=async()=>ok(await req('/api/state'));
  const service=ok(await req('/api/command',{type:'service',id:'synthetic-oncall-403',name:'Synthetic erasure delivery',environment:'test',owner:setup.value.member.id,runbook:[],pager:''}));
  const clientKey=randomBytes(32).toString('hex');
  const client=ok(await req('/api/automation/clients',{name:'synthetic-oncall-403 private client',key:clientKey,services:[service.id],permissions:['incidents:read','incidents:write']}),201);
  const makeEndpoint=async()=>ok(await req('/api/automation/endpoints',{name:'synthetic-oncall-403 private endpoint',key,client:client.id,services:[service.id],url:'https://8.8.8.8/events',approve:true}),201);
  const makeIncident=async()=>ok(await req('/api/command',{type:'declare',service:service.id,title:'Synthetic erasure incident',summary:'Synthetic incident evidence',severity:'warning'}));
  const erase=async(kind,id,extra={})=>req('/api/erasure/'+kind+'/'+id,{workspaceRevision:(await read()).revision,confirmation:'erase '+id,...extra});
  let endpoint=await makeEndpoint();await makeIncident();const before=await read(),archive=ok(await req('/api/archive'));
  await erased.db.prepare("CREATE TRIGGER synthetic_oncall_403_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='endpoint.erase' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-403'); END").run();
  try{ok(await erase('endpoint',endpoint.id),503)}finally{await erased.db.prepare('DROP TRIGGER synthetic_oncall_403_audit').run()}
  assert.deepEqual(await read(),before,'failed endpoint erasure preserves queued work and credentials');
  const receipt=ok(await erase('endpoint',endpoint.id));assert.equal(receipt.state,'complete');assert.equal(receipt.stores.oc_endpoint_credentials.deleted,1);assert.equal(receipt.stores.oc_api_outbox.deleted,1);
  assert.equal(ok(await req('/api/automation/dispatch',{})).processed,0);assert.equal(sent.length,0,'erased queued work never reaches the network edge');
  ok(await req('/api/restore',{mode:'replace',archive:{...archive,erasureFences:(await read()).erasureFences}}),409);
  endpoint=await makeEndpoint();const incident=await makeIncident();waiting=true;
  const started=new Promise(resolve=>entered=resolve),dispatch=req('/api/automation/dispatch',{});await started;
  ok(await erase('endpoint',endpoint.id),409);ok(await erase('incident',incident.id),409);
  assert.equal((await read()).apiOutbox.find(o=>o.endpoint===endpoint.id).status,'sending','no erasure receipt while the network call owns a lease');
  waiting=false;hold();assert.equal(ok(await dispatch).status,'sent');
  const calls=sent.length;ok(await erase('endpoint',endpoint.id));await req('/api/automation/dispatch',{});assert.equal(sent.length,calls,'receipt precedes no subsequent erased send');
  // A losing same-object POST must return conflict, never drop its connection.
  endpoint=await makeEndpoint();await makeIncident();const snapshot=await read(),input={workspaceRevision:snapshot.revision,confirmation:'erase '+endpoint.id};
  const raced=await Promise.all([0,1].map(()=>req('/api/erasure/endpoint/'+endpoint.id,input)));assert.deepEqual(raced.map(r=>r.status).sort(),[200,409]);
  const machine=ok(await erased.request('/api/v1/incidents',{type:'declare',service:service.id,title:'Synthetic machine history',summary:'Synthetic machine evidence',severity:'warning'},'',{authorization:'Bearer '+clientKey,'idempotency-key':'synthetic-oncall-407'}),201);
  const clientArchive=ok(await req('/api/archive'));ok(await erase('client',client.id));const after=await read();assert.ok(!JSON.stringify(after).includes(client.name));assert.notEqual(after.incidents.find(i=>i.id===machine.entity).timeline[0].actor,client.id);assert.equal(after.members.find(m=>m.id===after.incidents.find(i=>i.id===machine.entity).timeline[0].actor).name,'Erased integration');
  ok(await req('/api/restore',{mode:'replace',archive:{...clientArchive,erasureFences:after.erasureFences}}),409);
  const secondClient=ok(await req('/api/automation/clients',{name:'synthetic-oncall-418',key:randomBytes(32).toString('hex'),services:[service.id],permissions:['incidents:read']}),201);ok(await erase('client',secondClient.id));const anonymousMembers=(await read()).members.filter(m=>m.id.startsWith('erased-'));assert.equal(anonymousMembers.length,2);assert.equal(new Set(anonymousMembers.map(m=>m.name)).size,2,'repeated erasure retains distinct anonymous machine histories without name collisions');
  const checkpoint=ok(await req('/api/recovery/checkpoint')),restored=await req('/api/recovery/restore',{mode:'replace',checkpoint});ok(restored);cookie=restored.cookie;
  console.log('PASS OC-040 integration erasure: queued send prevented, in-flight public erasure 409, completion only after outcome, audit rollback, per-table credentials/outbox counts, concurrent 200/409, client unlink and native restore fence');
 }finally{hold?.();await erased.close()}
}
await import('./oncall-agent-flow.mjs');

}
