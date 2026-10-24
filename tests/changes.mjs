import assert from 'node:assert/strict';
import {createHmac, randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {localWorker} from './worker.mjs';

// One public-door journey. Recorded provider bodies are signed at the network edge.
const w=await localWorker(),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
const hmac=(key,body,encoding='hex')=>createHmac('sha256',key).update(body).digest(encoding);
try {
  let cookie=(await w.request('/api/setup',{name:'Change operator',password:'synthetic-change-testing-password'})).cookie;
  const req=(path,data)=>w.request(path,data,cookie),actor=ok(await req('/api/session')).member;
  for(const [id,name] of [['payments','Payments'],['gateway','Gateway'],['decoy','Unrelated reporting']])ok(await req('/api/command',{type:'service',id,name,environment:'production',owner:actor.id,runbook:['Inspect current deploy before rollback'],pager:''}));
  // OC-023 ownerless services stay visible without turning the current admin into an owner.
  const unassigned={type:'service',id:'synthetic-oncall-23',name:'synthetic-oncall-23',environment:'production',owner:null,runbook:['synthetic-oncall-23 inspect retained evidence'],pager:''};
  assert.equal(ok(await req('/api/command',unassigned)).owner,'');
  const unassignedBefore=ok(await req('/api/archive'));
  assert.equal(unassignedBefore.services.find(s=>s.id===unassigned.id).owner,'');
  w.sql("CREATE TRIGGER synthetic_oncall_owner_audit BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic-oncall-23'); END");
  try {ok(await req('/api/command',{...unassigned,owner:actor.id}),503);} finally {w.sql('DROP TRIGGER synthetic_oncall_owner_audit');}
  assert.deepEqual(ok(await req('/api/archive')),unassignedBefore,'failed ownership audit leaves the ownerless service unchanged');
  ok(await req('/api/command',{...unassigned,owner:'synthetic-oncall-missing'}),400);
  const unassignedEvent={source:'synthetic-oncall-23',eventId:'synthetic-oncall-23',service:unassigned.id,environment:'production',key:'synthetic-oncall-23',generation:'synthetic-oncall-23',intent:'trigger',severity:'warning',title:'synthetic-oncall-23',observedAt:new Date().toISOString(),evidence:''};
  const unassignedKey=randomBytes(32).toString('hex');
  ok(await req('/api/sources',{id:'synthetic-oncall-23',key:unassignedKey,scopes:[unassigned.id]}));
  ok(await w.request('/api/ingress/synthetic-oncall-23',unassignedEvent,undefined,{authorization:'Bearer '+unassignedKey}),201);
  const unassignedState=ok(await req('/api/state'));
  assert.equal(unassignedState.services.find(s=>s.id===unassigned.id).owner,'');
  assert.deepEqual(unassignedState.services.find(s=>s.id===unassigned.id).runbook,unassigned.runbook);
  assert.equal(unassignedState.events.find(e=>e.eventId===unassignedEvent.eventId).decision.owner,null);
  assert.equal(unassignedState.alerts.find(a=>a.service===unassigned.id).owner,null,'unmatched intake never falls back to the current admin');
  const ownerlessIncident=ok(await req('/api/command',{type:'declare',service:unassigned.id,severity:'warning',title:'synthetic-oncall-23',summary:'synthetic-oncall-23',alerts:[]}));
  const ownerlessContext=ok(await req('/api/handoffs/context/'+ownerlessIncident.id));
  const ownerlessHandoff=ok(await req('/api/handoffs/prepare',{id:'synthetic-oncall-23',incident:ownerlessIncident.id,incidentRevision:ownerlessIncident.revision,serviceHash:ownerlessContext.serviceHash,payload:{audience:'internal',title:'synthetic-oncall-23',summary:'synthetic-oncall-23',evidenceLinks:[],impactLinks:[]}}),201).record;
  assert.equal(ownerlessHandoff.source.service.owner,'');
  assert.deepEqual(ownerlessHandoff.source.service.runbook,unassigned.runbook);
  const ownerlessHandoffArchive=ok(await req('/api/handoffs/archive'));
  ok(await req('/api/handoffs/restore',{mode:'replace',archive:ownerlessHandoffArchive}));
  assert.equal(ok(await req('/api/handoffs/synthetic-oncall-23')).record.source.service.owner,'','reviewed handoff restore retains an ownership gap');
  let state=ok(await req('/api/state'));
  ok(await req('/api/command',{type:'service-dependencies',service:'payments',dependencies:['gateway'],workspaceRevision:state.revision}));
  ok(await req('/api/command',{type:'service-dependencies',service:'payments',dependencies:[],workspaceRevision:state.revision}),409);
  state=ok(await req('/api/state'));
  ok(await req('/api/command',{type:'service-dependencies',service:'payments',dependencies:['missing'],workspaceRevision:state.revision}),400);
  const keys={argocd:randomBytes(32).toString('hex'),terraform:randomBytes(32).toString('hex'),native:randomBytes(32).toString('hex'),signed:randomBytes(32).toString('hex'),pagerduty:randomBytes(16).toString('hex'),github:randomBytes(32).toString('hex'),gitlab:'whsec_'+randomBytes(32).toString('base64'),decoy:randomBytes(32).toString('hex')};
  const fixture=async name=>JSON.parse(await readFile(new URL('./fixtures/'+name,import.meta.url),'utf8'));
  const deployment=await fixture('github-deployment.json'),release=await fixture('github-release.json'),unmerged=await fixture('github-unmerged-pr.json'),gitlab=await fixture('gitlab-deployment.json');
  const configure=(id,provider,service,repository='',revision=0,key=keys[id])=>req('/api/changes/sources',{id,name:id+' changes',provider,service,repository,mode:id==='signed'?'signed':'bearer',revision,key});
  ok(await configure('argocd','argocd','gateway'),201);ok(await configure('terraform','terraform','payments'),201);
  ok(await configure('native','native','payments'),201);ok(await configure('signed','native','gateway'),201);ok(await configure('decoy','native','decoy'),201);
  ok(await configure('pagerduty','pagerduty','payments'),201);ok(await configure('github','github','payments',String(deployment.repository.id)),201);ok(await configure('gitlab','gitlab','gateway',String(gitlab.project.id)),201);
  const send=(id,payload,extra={})=>{
    const raw=JSON.stringify(payload),timestamp=String(Math.floor(Date.now()/1000));let headers={};
    if(id==='native'||id==='decoy')headers={authorization:'Bearer '+keys[id]};
    if(id==='terraform')headers={'x-tfe-notification-signature':createHmac('sha512',keys[id]).update(raw).digest('hex')};
    if(id==='signed'||id==='argocd')headers={'x-oncall-timestamp':timestamp,'x-oncall-signature':hmac(keys[id],timestamp+'.'+raw)};
    if(id==='github')headers={'x-github-event':'deployment','x-github-delivery':'recorded-deployment','x-hub-signature-256':'sha256='+hmac(keys[id],raw)};
    if(id==='gitlab')headers={'x-gitlab-event':'Deployment Hook','webhook-id':'recorded-gitlab','webhook-timestamp':timestamp,'webhook-signature':'v1,'+hmac(Buffer.from(keys[id].slice(6),'base64'),'recorded-gitlab.'+timestamp+'.'+raw,'base64')};
    return w.request(id==='pagerduty'?'/v2/change/enqueue':'/api/changes/ingress/'+id,payload,undefined,{...headers,...extra});
  };
  const at=new Date().toISOString(),change={eventId:'checkout-2048',summary:'Checkout pool deployment',timestamp:at,author:'checkout-ci',links:[{href:'https://example.test/deploy/2048'},{href:'https://example.test/deploy?token=private-query'}],custom_details:{commit:'abc123',token:'must-not-survive',nested:{password:'must-not-survive'},keyEcho:keys.native,large:'x'.repeat(2000)}};
  // OC-065 named source templates: signatures, replay and fixed service scope.
  const argo={eventId:'synthetic-oncall-1',application:'gateway',revision:'synthetic-oncall-2',status:'Synced',summary:'Argo CD gateway sync',timestamp:at,author:'synthetic-oncall-1',links:['https://argo.example.test/applications/gateway']};
  const terraform={run_id:'run-synthetic-oncall-1',run_url:'https://app.terraform.io/app/example/workspaces/payments/runs/run-synthetic-oncall-1',run_created_at:at,run_created_by:'synthetic-oncall-2',workspace_name:'payments',organization_name:'example',notifications:[{trigger:'run:completed',run_status:'applied',run_updated_at:at}]};
  const templateBefore=ok(await req('/api/state'));
  const argoReceipt=ok(await send('argocd',argo),201),terraformReceipt=ok(await send('terraform',terraform),201);
  assert.equal(ok(await send('argocd',argo)).id,argoReceipt.id);assert.equal(ok(await send('terraform',terraform)).id,terraformReceipt.id);
  ok(await send('argocd',argo,{'x-oncall-signature':'forged'}),401);ok(await send('argocd',argo,{'x-oncall-timestamp':'1'}),401);
  ok(await send('terraform',terraform,{'x-tfe-notification-signature':'forged'}),401);
  ok(await send('argocd',{...argo,eventId:'synthetic-oncall-3',service:'decoy'}),403);ok(await send('terraform',{...terraform,service:'decoy'}),403);
  const templateAfter=ok(await req('/api/state'));
  for(const key of ['alerts','incidents','events'])assert.deepEqual(templateAfter[key],templateBefore[key],'change templates never create an alert or obligation');
  assert.equal(templateAfter.changes.filter(c=>c.source==='argocd').length,1);assert.equal(templateAfter.changes.filter(c=>c.source==='terraform').length,1);
  assert.equal(templateAfter.changes.find(c=>c.id===terraformReceipt.id).author,terraform.run_created_by);
  assert.equal(templateAfter.changes.find(c=>c.id===argoReceipt.id).details.status,'Synced');
  w.sql("CREATE TRIGGER change_template_audit_fail BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic-oncall-4'); END");
  try{ok(await send('argocd',{...argo,eventId:'synthetic-oncall-4'}),503);}finally{w.sql('DROP TRIGGER change_template_audit_fail');}
  assert.deepEqual(ok(await req('/api/archive')).changes,templateAfter.changes,'audit failure rolls back template admission');
  const before=ok(await req('/api/state')),receipt=ok(await send('native',change),201);
  assert.equal(ok(await send('native',change)).id,receipt.id);
  ok(await send('native',{...change,summary:'conflicting'}),409);
  ok(await send('native',{...change,eventId:'foreign',service:'gateway'}),403);
  ok(await send('native',change,{authorization:'Bearer forged'}),401);
  ok(await send('signed',{eventId:'gateway-51',summary:'Gateway configuration deployed',timestamp:at,author:'gateway-ci'}),201);
  ok(await send('signed',{eventId:'bad-signature',summary:'refuse'}, {'x-oncall-signature':'forged'}),401);
  ok(await send('signed',{eventId:'stale-signature',summary:'refuse'}, {'x-oncall-timestamp':'1'}),401);
  ok(await send('decoy',{eventId:'report-9',summary:'Unrelated report deployment',timestamp:at,author:'reporting-ci'}),201);
  const pd={routing_key:keys.pagerduty,payload:{summary:'Checkout release published',source:'checkout-ci',custom_details:{author:'release-bot'}},links:[{href:'https://example.test/release/9'}]};
  const pdReceipt=ok(await send('pagerduty',pd),202);assert.equal(ok(await send('pagerduty',pd),202).dedup_key,pdReceipt.dedup_key);
  ok(await send('pagerduty',{routing_key:'invalid',payload:{summary:'refuse'}}),400);
  ok(await send('pagerduty',null),400);ok(await send('native',{eventId:'bad-summary',summary:true}),400);
  ok(await send('github',deployment),201);ok(await send('github',deployment));
  // The signed body, not the unsigned delivery header, identifies a GitHub event: a resent body stays one change.
  assert.equal(ok(await send('github',deployment,{'x-github-delivery':'synthetic-oncall-5'})).duplicate,true);
  assert.equal(ok(await req('/api/state')).changes.filter(c=>c.source==='github').length,1);
  ok(await send('github',{...deployment,repository:{...deployment.repository,id:99,full_name:'other/repo'}},{'x-hub-signature-256':'sha256='+hmac(keys.github,JSON.stringify({...deployment,repository:{...deployment.repository,id:99,full_name:'other/repo'}}))}),403);
  ok(await send('github',deployment,{'x-hub-signature-256':'sha256=forged'}),401);
  // Historical recorded repositories differ: each exact fixture gets its own binding.
  const releaseKey=randomBytes(32).toString('hex');ok(await configure('release','github','payments',String(release.repository.id),0,releaseKey),201);
  const rawRelease=JSON.stringify(release);ok(await w.request('/api/changes/ingress/release',release,undefined,{'x-github-event':'release','x-github-delivery':'recorded-release','x-hub-signature-256':'sha256='+hmac(releaseKey,rawRelease)}),201);
  const prKey=randomBytes(32).toString('hex');ok(await configure('pull-request','github','payments',String(unmerged.repository.id),0,prKey),201);
  const prSend=p=>w.request('/api/changes/ingress/pull-request',p,undefined,{'x-github-event':'pull_request','x-github-delivery':'derived-merged-pr','x-hub-signature-256':'sha256='+hmac(prKey,JSON.stringify(p))});
  assert.equal(ok(await prSend(unmerged)).ignored,true);
  // Derived test case, not a captured merged delivery. It exercises the real merged-only branch.
  const merged=structuredClone(unmerged);merged.pull_request.merged=true;merged.pull_request.merged_at=at;merged.pull_request.merged_by={login:'merge-operator'};
  ok(await prSend(merged),201);ok(await send('gitlab',gitlab),201);
  ok(await send('gitlab',gitlab,{'webhook-signature':'v1,forged'}),401);
  state=ok(await req('/api/state'));
  assert.deepEqual(state.alerts,before.alerts);assert.deepEqual(state.incidents,before.incidents);assert.deepEqual(state.events,before.events,'changes never admit alert events or create incident work');
  const retained=state.changes.find(c=>c.id===receipt.id);assert.ok(retained.truncated);assert.equal(retained.details.token,'[redacted]');
  assert.ok(!JSON.stringify(state).includes('must-not-survive'));assert.ok(!JSON.stringify(state).includes(keys.native));assert.deepEqual(retained.links,['https://example.test/deploy/2048'],'credential-bearing links are omitted without fetching');
  assert.equal(state.changes.find(c=>c.id===pdReceipt.dedup_key).timeBasis,'received','missing source timestamps are explicit');
  assert.equal(state.changes.find(c=>c.eventId==='recorded-gitlab').occurredAt,'2021-04-28T19:50:00.000Z','recorded GitLab timestamp includes a real timezone');
  const recent=ok(await req('/api/changes/recent?service=payments&at='+encodeURIComponent(new Date(Date.now()+1000).toISOString())));
  assert.ok(recent.items.some(c=>c.service==='gateway'&&c.dependency));assert.ok(recent.items.some(c=>c.id===receipt.id));assert.ok(!recent.items.some(c=>c.service==='decoy'));
  ok(await req('/api/changes/recent?service=payments&hours=0'),400);
  ok(await req('/api/sources',{id:'monitor',key:randomBytes(32).toString('hex'),scopes:['payments']}));
  const incident=ok(await req('/api/command',{type:'declare',service:'payments',severity:'critical',title:'Checkout connection pressure',summary:'Confirm recent service and gateway changes before mitigation'}));
  assert.ok(ok(await req('/api/changes/recent?service=payments&at='+encodeURIComponent(incident.createdAt))).items.some(c=>c.id===receipt.id));
  const viewer=ok(await req('/api/members',{name:'Change reader',role:'viewer',password:'synthetic-viewer-testing-password'}),201),viewerCookie=(await w.request('/api/login',{name:viewer.name,password:'synthetic-viewer-testing-password'})).cookie;
  assert.equal(ok(await w.request('/api/state',undefined,viewerCookie)).services.find(s=>s.id===unassigned.id).owner,'','unassigned service stays workspace-visible');
  ok(await w.request('/api/changes/sources',undefined,viewerCookie),403);ok(await w.request('/api/changes/recent?service=payments',undefined,viewerCookie));
  keys.native=randomBytes(32).toString('hex');ok(await configure('native','native','payments','',1));
  ok(await send('native',{eventId:'rotated',summary:'New credential accepted'}),201);ok(await w.request('/api/changes/ingress/native',change,undefined,{authorization:'Bearer '+change.custom_details.keyEcho}),401);
  ok(await req('/api/changes/sources/native/revoke',{revision:2}));ok(await send('native',{eventId:'revoked',summary:'must refuse'}),401);
  assert.equal(w.sql("SELECT COUNT(*) AS n FROM oc_change_credentials WHERE source='native'")[0].n,0,'revoke removes installation-local verification material');
  for(const row of w.sql('SELECT ciphertext FROM oc_change_credentials'))assert.ok(!Object.values(keys).some(key=>row.ciphertext.includes(key)),'verification material is encrypted at rest');
  const archive=ok(await req('/api/archive'));
  for(const key of [...Object.values(keys),releaseKey,prKey,change.custom_details.keyEcho])assert.ok(!JSON.stringify(archive).includes(key),'keys never enter a native archive');
  const bad=structuredClone(archive);bad.changes[0].service='decoy';ok(await req('/api/restore',{mode:'replace',archive:bad}),400);assert.deepEqual(ok(await req('/api/archive')),archive);
  const restored=await req('/api/restore',{mode:'replace',archive});ok(restored);cookie=restored.cookie;
  assert.equal(ok(await req('/api/state')).services.find(s=>s.id===unassigned.id).owner,'','restore preserves the explicit ownership gap');
  state=ok(await req('/api/state'));assert.deepEqual(state.changes,archive.changes);assert.ok(state.changeSources.every(s=>!s.active));assert.deepEqual(state.services,archive.services);
  assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_change_credentials')[0].n,0);ok(await send('signed',{eventId:'after-restore',summary:'must refuse'}),401);
  await w.stop();await w.start();assert.deepEqual(ok(await req('/api/state')).changes,archive.changes,'retained changes survive restart without replaying effects');
  // OC-065 bounded oldest-first retention keeps incident context and rolls back with audit.
  const escape=value=>JSON.stringify(value).replaceAll("'","''"),seed={...archive.changes.find(c=>c.id===receipt.id),source:'decoy',service:'decoy',summary:'synthetic-oncall',details:{},links:[],author:'synthetic-oncall',acceptedAt:'2020-01-01T00:00:00.000Z',occurredAt:'2020-01-01T00:00:00.000Z'};
  // Upgrade populated held storage at the actual cap; preserve the real prior records.
  const retainedCount=w.sql('SELECT COUNT(*) AS n FROM oc_changes')[0].n;
  w.sql(`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<${1000-retainedCount}) INSERT INTO oc_changes(id,ordinal,data) SELECT 'synthetic-oncall-'||i,${retainedCount}+i,json_set('${escape(seed)}','$.id','synthetic-oncall-'||i,'$.eventId','synthetic-oncall-'||i) FROM n`);
  // Restore definitions are inactive; explicitly reauthorize a local sender.
  const decoyDefinition=ok(await req('/api/state')).changeSources.find(s=>s.id==='decoy');ok(await configure('decoy','native','decoy','',decoyDefinition.revision));
  const capacityBefore=ok(await req('/api/archive'));
  w.sql("CREATE TRIGGER change_retention_audit_fail BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'synthetic-oncall-retention'); END");
  try{ok(await send('decoy',{eventId:'synthetic-oncall-retention',summary:'Retention rollback'}),503);}finally{w.sql('DROP TRIGGER change_retention_audit_fail');}
  assert.deepEqual(ok(await req('/api/archive')),capacityBefore,'failed audit rolls eviction and new admission back together');
  ok(await send('decoy',{eventId:'synthetic-oncall-retention',summary:'Retention after capacity'}),201);
  const atCapacity=ok(await req('/api/state'));assert.equal(atCapacity.changes.length,1000);assert.ok(!atCapacity.changes.some(c=>c.id==='synthetic-oncall-1'));assert.ok(atCapacity.changes.some(c=>c.id===receipt.id),'attached incident context is retained');assert.equal(atCapacity.audit.at(-1).text,'Oldest-first retention removed 1 unattached change records; incident context retained');
  // With every record inside the retained incident window, capacity refuses safely.
  w.sql(`UPDATE oc_changes SET data=json_set(data,'$.source','native','$.service','payments','$.occurredAt','${at}')`);
  const protectedCount=w.sql('SELECT COUNT(*) AS n FROM oc_changes')[0].n;ok(await send('decoy',{eventId:'synthetic-oncall-protected',summary:'Refuse protected capacity'}),429);assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_changes')[0].n,protectedCount);
  console.log('PASS OC-023 ownerless services: visibility, unmatched ownership, copied runbook, audit rollback and archive/handoff restore');
  console.log('PASS OC-065 retention: populated 1,000-record cap, deterministic oldest-first eviction, incident protection, refusal and audit rollback');
  console.log('PASS OC-065 Argo CD/Terraform signatures, scope, replay, no obligations, audit rollback');
  console.log('Change context: authenticated native/PD/GitHub/GitLab intake, replay, scope, dependencies, privacy, rotation/revoke, archive pause and restart passed');
} finally {await w.close();}
