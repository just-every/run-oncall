import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {mkdir,readFile} from 'node:fs/promises'

// Command readback and a real storage outage through the emitted Worker.
export async function coordinationHealth({origin,request,sql,deployment,cookie}) {
 const ok=r=>{assert.equal(r.status,200,JSON.stringify(r.value));return r.value}
 const cli=fileURLToPath(import.meta.resolve('@runeditrun/rer/internal/bin/rer.mjs'))
 const command=args=>execFileSync(process.execPath,[cli,...args,'--json'],{encoding:'utf8',env:{...process.env,CI:'true'},stdio:['ignore','pipe','pipe']}).trim().split('\n').map(line=>JSON.parse(line)).at(-1)
 const pkg=JSON.parse(await readFile('node_modules/@runeditrun/rer/package.json','utf8'))
 const commands=()=>{
  const described=command(['describe']);assert.equal(described.cliVersion,pkg.version,'describe identifies the executable that actually answered')
  assert.ok(described.verbs.deploy.flags.includes('--dry-run'));assert.ok(described.verbs.deploy.flags.includes('--remove'))
  assert.ok(described.verbs.import.flags.includes('--yes'));assert.ok(described.verbs.export.flags.includes('--output'))
  const checked=command(['check','--profile','first-party']);assert.equal(checked.ok,true);assert.ok(checked.clauses.every(c=>c.ok))
  return described
 }
 const healthy=ok(await request('/health'))
 assert.deepEqual(healthy.deployment,deployment,'local emitted build advertises its actual source SHA and artifact fingerprint')
 assert.equal(healthy.ok,true);assert.equal(healthy.storage,'available');assert.equal(healthy.target,'coordination');assert.equal(healthy.paging,'not-provided')
 const before=ok(await request('/api/archive',undefined,cookie)),description=commands()
 assert.deepEqual(ok(await request('/api/archive',undefined,cookie)),before,'check and describe leave durable coordination unchanged')
 let browser,page
 if(process.env.ONCALL_HEALTH_BROWSER) {
  const {chromium}=await import('@playwright/test')
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  page=await (await browser.newContext()).newPage()
 }
 const capture=async state=>{
  if(!page)return
  const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true})
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.goto(origin+'/health')
   const body=JSON.parse(await page.locator('pre').innerText());assert.deepEqual(body.deployment,deployment)
   assert.equal(body.storage,state==='unavailable'?'unavailable':'available')
   await page.screenshot({path:`${directory}/OC-010-health-${state}-${width}.png`,fullPage:true})
  }
 }
 try {
  await capture('available')
  sql('ALTER TABLE workspace_control RENAME TO workspace_fault')
  try {
   const failed=await request('/health');assert.equal(failed.status,503)
   assert.equal(failed.value.ok,false);assert.equal(failed.value.storage,'unavailable')
   assert.equal(failed.value.target,'coordination');assert.equal(failed.value.paging,'not-provided')
   assert.deepEqual(failed.value.deployment,deployment,'failure still identifies the deployed build')
   assert.equal(typeof failed.value.error,'string')
   assert.equal((await request('/api/state',undefined,cookie)).status,503)
   assert.deepEqual(commands(),description,'read-only command capabilities and local effects remain available during storage failure')
   await capture('unavailable')
  }finally{sql('ALTER TABLE workspace_fault RENAME TO workspace_control')}
  assert.deepEqual(ok(await request('/health')),healthy,'503 recovers to the same healthy deployment')
  assert.deepEqual(ok(await request('/api/archive',undefined,cookie)),before,'failure/recovery loses no records and creates no claimed effect')
  await capture('recovered')
  if(page)for(const width of [1440,390]) {
   await page.setViewportSize({width,height:1000});await page.goto(origin+'/docs/install#host-for-your-team')
   await page.getByText('Dry run:',{exact:true}).scrollIntoViewIfNeeded()
   await page.screenshot({path:`${process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser'}/OC-010-command-effects-${width}.png`})
  }
  console.log('OC-010 coordination health, deployment identity and honest command effects survive storage failure: local 503/recovery and read-only check/describe; paging not provided; capacity unmeasured')
 }finally{await browser?.close()}
 await readinessHealth(deployment);
}

// OC-054: real durable doors plus isolated source loss; no database fixture writes.
async function readinessHealth(deployment) {
 const {localWorker}=await import('./worker.mjs');
 const {randomBytes,createHash}=await import('node:crypto');
 const runtime=await localWorker({RER_DEPLOY_SOURCE:deployment.sourceSha,RER_DEPLOY_FINGERPRINT:deployment.fingerprint},{clock:true,fetchSource:`let providerMode='normal',providerCalls=[],pkceChallenge='',pkceValid=true,revoked=false;
 globalThis.fetch=async(input)=>{providerCalls.push(String(input instanceof Request?input.url:input));throw Error('Unexpected readiness outbound call');};`});
 try {
  const at=Date.now();await runtime.time(at);
  const setup=await runtime.request('/api/setup',{name:'synthetic-oncall-540',password:'synthetic-oncall-540-password'});assert.equal(setup.status,200);
  let cookie=setup.cookie;
  const call=(path,input,as=cookie,headers={})=>runtime.request(path,input,as,headers);
  const value=async(path,input,status=200)=>{const result=await call(path,input);assert.equal(result.status,status,`${path}: ${JSON.stringify(result.value)}`);return result.value;};
  const signal=(report,id)=>{const row=report.signals.find(row=>row.id===id);assert.ok(row,`signal ${id} remains present`);return row;};
  const tables=runtime.sql("SELECT m.name,json_group_array(p.name) AS columns FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%' AND m.name NOT LIKE '_cf_%' GROUP BY m.name ORDER BY m.name");
  const quote=name=>'"'+name.replaceAll('"','""')+'"';
  const snapshots=tables.map(table=>`SELECT rowid AS position,json_array(${JSON.parse(table.columns).map(name=>`json_array(typeof(${quote(name)}),CASE WHEN typeof(${quote(name)})='blob' THEN hex(${quote(name)}) ELSE ${quote(name)} END)`).join(',')}) AS data FROM ${quote(table.name)} ORDER BY rowid`);
  const digest=()=>createHash('sha256').update(JSON.stringify(runtime.statements(snapshots.join(';')))).digest('hex');
  assert.equal((await call('/api/readiness',undefined,'')).status,401);
  const roles={};
  for(const role of ['responder','viewer','stakeholder']){
   const member=await value('/api/members',{name:'synthetic-oncall-540-'+role,password:'synthetic-oncall-540-'+role+'-password',role},201);
   const login=await call('/api/login',{name:member.name,password:'synthetic-oncall-540-'+role+'-password'});assert.equal(login.status,200);
   roles[role]={member,cookie:login.cookie};
   assert.equal((await call('/api/readiness',undefined,login.cookie)).status,role==='stakeholder'?403:200);
  }
  const baseline=await value('/api/readiness');assert.equal(baseline.complete,true);assert.deepEqual(baseline.release.deployment,deployment);
  const pkg=JSON.parse(await readFile('package.json','utf8'));assert.equal(baseline.release.version,pkg.version);assert.equal(baseline.release.package,pkg.name);
  assert.equal(new Set(baseline.matrix.map(row=>row.id)).size,baseline.matrix.length);
  for(const row of baseline.matrix){assert.ok(['working-here','off','not-built','unproven-live'].includes(row.state));assert.ok(['maintained-journey','dated-owner-evidence','none'].includes(row.evidence.kind));if(row.id!=='coordination')assert.notEqual(row.state,'working-here');if(row.observation){assert.equal(row.observation.configured,0);assert.equal(row.observation.active,0);assert.equal(row.observation.lastAcceptedAt,null);}}
  for(const row of baseline.signals){assert.ok(['ok','degraded','failing','unavailable'].includes(row.state));assert.equal(row.observedAt,new Date(at).toISOString());assert.ok(row.ageSeconds===null||row.ageSeconds>=0);}
  assert.equal(baseline.pagerCoverage.state,'unproven');assert.equal(baseline.pagerCoverage.paging,'off');assert.equal((await value('/health')).storage,'available');
  const before=digest();await value('/api/readiness');await value('/api/readiness');assert.equal(digest(),before,'healthy readiness reads change zero rows, revisions, sessions, keys or permanent-audit entries');
  const owner=setup.value.member,service=await value('/api/command',{type:'service',id:'synthetic-oncall-540',name:'Synthetic readiness service',environment:'test',owner:owner.id,runbook:['Synthetic local recovery'],pager:''});
  await value('/api/command',{type:'policy',service:service.id,severity:'*',action:'route',owner:owner.id,reason:'Synthetic readiness ownership'});
  await value('/api/paging/schedules',{id:'synthetic-oncall-540',name:'Synthetic readiness schedule',service:service.id,revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[owner.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]});
  const key=randomBytes(32).toString('hex'),source='synthetic-oncall-540';
  await value('/api/sources',{id:source,key,scopes:[service.id]});
  assert.equal((await call('/api/readiness',undefined,'',{authorization:'Bearer '+key})).status,401,'source credentials grant no report access');
  const event={source,eventId:'synthetic-oncall-540',service:service.id,environment:'test',key:'synthetic-oncall-540',generation:'synthetic-oncall-540',intent:'trigger',severity:'critical',title:'Synthetic readiness intake',observedAt:new Date(at).toISOString(),evidence:''};
  assert.equal((await call('/api/ingress/'+source,event,'',{authorization:'Bearer '+key})).status,201);
  const adapterKey=randomBytes(32).toString('hex'),adapterId='synthetic-oncall-542';
  const adapter=await value('/api/intake/sources',{id:adapterId,name:'Synthetic compatible readiness',provider:'pagerduty',service:service.id,key:adapterKey,revision:0},201);
  const compatible=await call('/v2/enqueue',{routing_key:adapterKey,event_action:'trigger',dedup_key:adapterId,payload:{summary:'Synthetic compatible readiness admission',source:adapterId,severity:'warning'}},'');assert.equal(compatible.status,202);
  await value('/api/intake/allowances',{id:'source:'+source,requests:1,events:1,revision:(await value('/api/state')).revision});
  assert.equal((await call('/api/ingress/'+source,{...event,eventId:'synthetic-oncall-541'},'',{authorization:'Bearer '+key})).status,429);
  const client=await value('/api/automation/clients',{name:'Synthetic readiness receiver',key:randomBytes(32).toString('hex'),services:[service.id],permissions:['incidents:read']},201);
  await value('/api/automation/endpoints',{name:'Synthetic queued delivery',key:randomBytes(32).toString('hex'),client:client.id,services:[service.id],url:'https://8.8.8.8/synthetic-oncall-540',approve:true},201);
  let incident=await value('/api/command',{type:'declare',service:service.id,title:'Synthetic readiness deadline',summary:'Synthetic observable deadline',severity:'critical'});
  incident=await value('/api/command',{type:'transition',incident:incident.id,revision:incident.revision,state:'acknowledged',summary:'Synthetic responder accepts coordination'});
  incident=await value('/api/command',{type:'snooze',incident:incident.id,revision:incident.revision,minutes:1});
  const busy=await value('/api/readiness'),state=await value('/api/state');
  const intake=signal(busy,'intake');assert.equal(intake.state,'degraded');assert.equal(intake.values.lastAdmittedAt,new Date(at).toISOString());assert.ok(intake.values.recentRefusals>signal(baseline,'intake').values.recentRefusals);assert.ok(intake.values.keysAtAllowance>0);assert.ok(intake.values.keysThrottledLastMinute>0);
  const events=busy.matrix.find(row=>row.id==='events');assert.equal(events.observation.configured,1);assert.equal(events.observation.active,1);assert.equal(events.observation.lastAcceptedAt,new Date(at).toISOString());assert.equal(events.state,'unproven-live');
  const compatibleRow=busy.matrix.find(row=>row.id==='pagerduty');assert.equal(compatibleRow.state,'unproven-live');assert.equal(compatibleRow.observation.configured,1);assert.equal(compatibleRow.observation.active,1);assert.equal(compatibleRow.observation.lastAcceptedAt,new Date(at).toISOString());
  const delivery=signal(busy,'delivery');assert.equal(delivery.values.unfinished,state.apiOutbox.filter(row=>['queued','sending','failed'].includes(row.status)).length);assert.ok(delivery.values.queued>0);assert.equal(delivery.values.availableSlots+delivery.values.unfinished,delivery.values.capacity);
  const configuration=signal(busy,'configuration');for(const key of ['scheduleChangedAt','policyChangedAt','serviceChangedAt'])assert.equal(configuration.values[key],new Date(at).toISOString());
  assert.ok(signal(busy,'obligations').values.unanswered>0);
  await runtime.time(at+120000);
  const overdue=await value('/api/readiness');assert.equal(signal(overdue,'timers').state,'failing');assert.equal(signal(overdue,'timers').values.pastDueUnfired,1);assert.equal(signal(overdue,'timers').values.oldestPastDueAgeSeconds,60);assert.equal(signal(overdue,'timers').values.oldestQueuedAgeSeconds,120);assert.equal(signal(overdue,'obligations').values.overdue,1);
  const queued=await value('/api/state'),readOnly=digest();await value('/api/readiness');assert.equal(digest(),readOnly,'readiness observes overdue work without firing a deadline or dispatching a queue');assert.deepEqual((await value('/api/state')).apiOutbox,queued.apiOutbox);
  runtime.sql('ALTER TABLE oc_key_rate_usage RENAME TO synthetic_oncall_540_fault');
  try {
   const partial=await value('/api/readiness',undefined,503);assert.equal(partial.complete,false);assert.equal(signal(partial,'intake').state,'unavailable');assert.deepEqual(signal(partial,'intake').values,{});assert.equal(signal(partial,'intake').ageSeconds,null);
   for(const row of overdue.signals.filter(row=>row.id!=='intake'))assert.deepEqual(signal(partial,row.id),row,'one unreadable source never hides another signal');
   assert.equal(partial.pagerCoverage.state,'unproven');assert.equal((await value('/health')).storage,'available','web storage can remain healthy during a signal outage');
  } finally {runtime.sql('ALTER TABLE synthetic_oncall_540_fault RENAME TO oc_key_rate_usage');}
  const recovered=await value('/api/readiness');assert.equal(recovered.complete,true);assert.deepEqual(signal(recovered,'intake'),signal(overdue,'intake'),'restoring the source restores its real measurement');
  const beforeControlFault=digest();runtime.sql('ALTER TABLE workspace_control RENAME TO synthetic_oncall_540_control');
  try {
   const partial=await value('/api/readiness',undefined,503);assert.equal(partial.complete,false);assert.equal(signal(partial,'authority').state,'unavailable');
   for(const row of overdue.signals.filter(row=>row.id!=='authority'))assert.deepEqual(signal(partial,row.id),row,'control-table outage retains independent observations');
   assert.equal((await call('/health')).status,503);assert.equal(partial.pagerCoverage.state,'unproven');
  } finally {runtime.sql('ALTER TABLE synthetic_oncall_540_control RENAME TO workspace_control');}
  assert.equal(digest(),beforeControlFault,'partial readiness reads perform zero writes even when the ordinary audit control source is unavailable');assert.equal(signal(await value('/api/readiness'),'authority').state,signal(overdue,'authority').state);
  await value('/api/sources/'+source+'/revoke',{});const revoked=await value('/api/readiness');assert.equal(revoked.matrix.find(row=>row.id==='events').observation.active,0);assert.equal(revoked.matrix.find(row=>row.id==='events').observation.lastAcceptedAt,new Date(at).toISOString());
  await value('/api/intake/sources/'+adapterId+'/revoke',{revision:adapter.revision});const inactive=(await value('/api/readiness')).matrix.find(row=>row.id==='pagerduty');assert.equal(inactive.observation.configured,1);assert.equal(inactive.observation.active,0);assert.equal(inactive.observation.lastAcceptedAt,new Date(at).toISOString());
  await runtime.time(at+180000);await value('/api/command',{type:'acknowledgment-timeout',service:service.id,baseVersion:0,minutes:0});
  const editedConfiguration=signal(await value('/api/readiness'),'configuration');assert.equal(editedConfiguration.values.policyChangedAt,new Date(at+180000).toISOString());assert.equal(editedConfiguration.values.serviceChangedAt,new Date(at+180000).toISOString());assert.equal(editedConfiguration.values.scheduleChangedAt,new Date(at).toISOString(),'service policy edits never invent a schedule change');
  await value('/api/command',{type:'member',id:roles.viewer.member.id,role:'viewer',active:false});assert.equal((await call('/api/readiness',undefined,roles.viewer.cookie)).status,401);
  await runtime.time(at+13*3600000);assert.equal((await call('/api/readiness',undefined,roles.responder.cookie)).status,401,'expired sessions cannot inspect readiness');
  const network=await runtime.request('/__provider_calls');assert.equal(network.status,200);assert.deepEqual(network.value.calls,[],'readiness and setup/state changes make zero outbound calls');
  console.log('PASS OC-054 readiness: release identity, closed matrix states, dynamic source/revocation observations; independent durable signals, zero-write reads, public-door queued delivery/refused intake/overdue deadline; isolated 503 and restored signal; admin/responder/viewer access and signed-out/stakeholder/expired/revoked refusal; storage never proves pager coverage; zero outbound calls');
 } finally {await runtime.close();}
}
