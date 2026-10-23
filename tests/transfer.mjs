import {isolatedEntrypoint} from './isolated.mjs'
const isolated=await isolatedEntrypoint(import.meta.url);if(isolated!==null)process.exit(isolated)
import assert from 'node:assert/strict'
import {randomBytes,createHmac} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {lstat,mkdir,readFile,writeFile,rm} from 'node:fs/promises'
import {managedSeed} from './managed.mjs'
import {ownerDoor,localWorker} from './worker.mjs'
import {localPart,mail,recoveryRules} from './email-fixtures.mjs'
import {checkpointCli,checkpointErasureCli} from './checkpoint-cli.mjs'
import {transferDoor} from './transfer-door.mjs'

const fetch=(url,input={})=>globalThis.fetch(url,{...input,headers:{...input.headers,connection:'close'}})

const m=await managedSeed({INBOUND_EMAIL_DOMAIN:'inbound.example.test'}),ok=r=>{assert.equal(r.status,200,JSON.stringify(r.value));return r.value}
const business=transferDoor(m)
const statements=command=>JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--persist-to','.wrangler/state','--command',command,'--json'],{encoding:'utf8',env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']})).map(r=>r.results)
const sql=command=>statements(command)[0]
await mkdir('.rer/local',{recursive:true,mode:0o700});await mkdir('exports',{recursive:true,mode:0o700})
const answers='.rer/local/transfer-answers.json',archive='exports/transfer-proof.rer',corrupt='exports/transfer-corrupt.rer',invalidRecords='exports/transfer-invalid-records.rer',later='exports/transfer-later.rer'
await writeFile(answers,JSON.stringify({OWNER_EMAIL:'transfer-owner@example.test'}),{mode:0o600})
try{
 await m.command(['setup','--answers',answers,'--port',String(m.port),'--non-interactive']);await business.configure();await m.start()
 let cookie=await m.owner(),req=(path,input)=>m.request(path,input,cookie),member=ok(await req('/api/session')).member
 ok(await req('/api/command',{type:'service',id:'transfer',name:'Transfer service',environment:'production',owner:member.id,runbook:['Retain this instruction'],pager:''}))
 ok(await req('/api/command',{type:'service',id:'upstream',name:'Upstream service',environment:'production',owner:member.id,runbook:[],pager:''}))
 ok(await req('/api/command',{type:'service-dependencies',service:'transfer',dependencies:['upstream'],workspaceRevision:ok(await req('/api/state')).revision}))
 assert.equal((await req('/api/urgency/services/transfer',{baseVersion:0,mode:'support-hours',timezone:'America/New_York',weekly:[{day:1,start:'09:00',end:'17:00'}],holidays:['2026-12-25'],inside:'high',outside:'low',reason:'Retain versioned urgency and service snapshot across installations'})).status,201)
 assert.equal((await req('/api/response/services/transfer',{baseVersion:0,defaultMode:'alert-only',recoveredNotice:'notified',rules:[{id:'synthetic-oncall-80',urgency:'*',severity:'critical',policy:'*',mode:'incident'}],reason:'Retain policy, source recovery and non-automatic notices through installation recovery'})).status,201)
 const portableTemplate=ok(await req('/api/command',{type:'service-template',service:'transfer',baseVersion:0,severityWording:{critical:'Customer transactions blocked',warning:'Customer transactions delayed',info:'Investigation only'},impactPrompt:'Which customer transactions are affected?',incidentTypes:['Dependency','Database'],checklist:[{id:'customer-check',text:'Verify customer recovery'}],reason:'Retain the full incident workflow through installation recovery'}))
 const incident=ok(await req('/api/command',{type:'declare',service:'transfer',title:'Preserve authored history',severity:'warning',summary:'Archive proof',alerts:[],incidentType:'Dependency'}))
 assert.deepEqual(incident.template,{service:'transfer',...portableTemplate,incidentType:'Dependency',checklist:portableTemplate.checklist.map(item=>({...item,done:false,history:[]}))})
 let portableManual=ok(await req('/api/command',{type:'manual-page',operationId:'synthetic-oncall-68-transfer',service:'transfer',title:'Retain manual page',severity:'warning',description:'Retained request custody',users:[member.id]}))
 portableManual=ok(await req('/api/command',{type:'request-responders',incident:portableManual.id,revision:portableManual.revision,users:[member.id],message:'Retain this pending request inactive'}))
 // OC-061's full durable status category travels with this existing installation journey.
 const stakeholderCreated=await req('/api/members',{name:'synthetic-oncall-61',role:'stakeholder',password:'synthetic-oncall-61-password'});assert.equal(stakeholderCreated.status,201);const stakeholder=stakeholderCreated.value
 ok(await req('/api/status',{action:'create',name:'Checkout',owningTeam:'Payments',supporting:['transfer'],communicationsOwner:member.id,audience:[stakeholder.id],highUrgencyImpact:false}))
 let statusBusiness=ok(await req('/api/status')).services.find(row=>row.name==='Checkout')
 ok(await req('/api/status',{action:'subscribe',id:statusBusiness.id,revision:statusBusiness.revision,member:stakeholder.id,channel:'email',active:true}))
 statusBusiness=ok(await req('/api/status')).services.find(row=>row.name==='Checkout')
 ok(await req('/api/status',{action:'override',id:statusBusiness.id,revision:statusBusiness.revision,value:'operational',reason:'Verified alternate processing path'}))
 assert.ok(ok(await req('/api/state')).businessServices[0].notices.length)
 const schedule=ok(await req('/api/paging/schedules',{id:'transfer',name:'Transfer rota',service:'transfer',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[member.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}))
 const context=ok(await req('/api/handoffs/context/'+incident.id)),prepared=await req('/api/handoffs/prepare',{id:'archive-copy',incident:incident.id,incidentRevision:incident.revision,serviceHash:context.serviceHash,payload:{audience:'internal',title:'Exact copy',summary:'Authored transfer evidence',evidenceLinks:[],impactLinks:[]}})
 assert.equal(prepared.status,201);const record=prepared.value.record
 assert.deepEqual(record.source.incident.declaration.lifecycle,{from:null,to:'declared'});assert.deepEqual(record.source.service.dependencies,['upstream'])
 ok(await req('/api/handoffs/archive-copy/review',{actionId:'archive-review',revision:record.revision,payloadHash:record.payloadHash,sourceHash:record.sourceHash,reason:'Reviewed exact copy'}))
 let responseIncident=ok(await req('/api/state')).incidents.find(i=>i.id===incident.id)
 responseIncident=ok(await req('/api/command',{type:'assign-role',incident:incident.id,revision:responseIncident.revision,role:'scribe',member:member.id,reason:'Retain review attribution across installations'}))
 const bulk=ok(await req('/api/triage/bulk',{operationId:'portable-priority',action:'set-priority',items:[{id:incident.id,revision:responseIncident.revision}],priority:'P1',reason:'Preserve incident priority'}));assert.equal(bulk.results[0].ok,true)
 ok(await req('/api/triage/views',{name:'Open transfer work',query:{q:'authored',status:'open'}}))
 const emailPart=localPart();assert.equal((await req('/api/email/addresses',{id:'portable-email',name:'Nightly archive monitor',localPart:emailPart,service:'transfer',owner:member.id,mode:'custom',fallback:'quarantine',rules:recoveryRules()})).status,201)
 await m.close();execFileSync('pnpm',['exec','vite','build'],{stdio:'pipe',maxBuffer:32*1024*1024})
 const emailWorker=await localWorker({INBOUND_EMAIL_DOMAIN:'inbound.example.test'},{persistTo:'.wrangler/state'});try{await mail(emailWorker,emailPart,'FAILED: archive-db');await mail(emailWorker,emailPart,'Unknown archive mail');await mail(emailWorker,emailPart,'OK: archive-db')}finally{await emailWorker.close()}
 await m.start()
 assert.equal(ok(await req('/api/email')).samples.length,3)
 const changeKey=randomBytes(32).toString('hex')
 assert.equal((await req('/api/changes/sources',{id:'portable-ci',name:'Portable CI context',provider:'native',service:'transfer',repository:'',mode:'bearer',revision:0,key:changeKey})).status,201)
 assert.equal((await fetch(m.origin+'/api/changes/ingress/portable-ci',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+changeKey},body:JSON.stringify({eventId:'portable-deploy',summary:'Retain deployment context',author:'transfer-ci',timestamp:new Date().toISOString()})})).status,201)
 // sd-oncall-c14 OC-065/030: existing categories carry new kinds; signing custody never travels.
 const fleetChangeKeys={argocd:randomBytes(32).toString('hex'),terraform:randomBytes(32).toString('hex')},fleetGrafanaKey=randomBytes(32).toString('hex'),fleetSigningKey=randomBytes(32).toString('hex');
 for(const provider of ['argocd','terraform'])assert.equal((await req('/api/changes/sources',{id:'synthetic-oncall-'+provider,name:'Synthetic '+provider,provider,service:'transfer',repository:'',mode:'provider',revision:0,key:fleetChangeKeys[provider]})).status,201);
 assert.equal((await req('/api/intake/sources',{id:'synthetic-oncall-grafana',name:'Synthetic Grafana',provider:'grafana',service:'transfer',key:fleetGrafanaKey,revision:0})).status,201);
 ok(await req('/api/monitoring/synthetic-oncall-grafana/signing',{revision:1,secret:fleetSigningKey}));
 const fleetSigningCustody=sql("SELECT signing_custody FROM oc_intake_credentials WHERE source='synthetic-oncall-grafana'")[0].signing_custody;
 // OC-042: a held signed-source key and its installation-sealed form never travel in an archive.
 const sourceKey=randomBytes(32).toString('hex')
 ok(await req('/api/sources',{id:'portable-signed',key:sourceKey,mode:'signed',scopes:['transfer']}))
 const sourceCustody=sql("SELECT signing_custody FROM sources WHERE id='portable-signed'")[0].signing_custody
 assert.match(sourceCustody,/^v1\./,'the signed source key is held only as installation-sealed ciphertext')
 const intakeKey=randomBytes(32).toString('hex')
 assert.equal((await req('/api/routing/keys',{id:'portable-monitor',name:'Portable monitor',provider:'pagerduty',scope:['transfer','upstream'],owner:member.id,revision:0,key:intakeKey,rules:[],catchAll:'transfer'})).status,201)
 assert.equal((await fetch(m.origin+'/v2/enqueue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({routing_key:intakeKey,event_action:'trigger',dedup_key:'portable-alert',payload:{summary:'Retain compatible lifecycle',source:'transfer-monitor',severity:'warning'}})})).status,202)
 const nativeRoutedKey=randomBytes(32).toString('hex')
 assert.equal((await req('/api/routing/keys',{id:'portable-native',name:'Portable native monitor',provider:'native',authentication:'signed',scope:['transfer','upstream'],owner:member.id,revision:0,key:nativeRoutedKey,rules:[],catchAll:'transfer'})).status,201)
 ok(await req('/api/intake/allowances',{id:'intake:portable-native',requests:500,events:100,revision:ok(await req('/api/state')).revision}))
 const nativeBody=JSON.stringify({source:'intake:portable-native',eventId:'portable-native-event',service:'transfer',environment:'production',key:'portable-native-outage',generation:'portable-native-cycle',intent:'trigger',severity:'warning',title:'Native routed archive custody',observedAt:new Date().toISOString()})
 const nativeTimestamp=String(Math.floor(Date.now()/1000))
 assert.equal((await fetch(m.origin+'/api/ingress/intake:portable-native',{method:'POST',headers:{'content-type':'application/json','x-oncall-timestamp':nativeTimestamp,'x-oncall-signature':createHmac('sha256',nativeRoutedKey).update(nativeTimestamp+'.'+nativeBody).digest('hex')},body:nativeBody})).status,201)
 // The same portable fixture carries a policy-created incident, stopped obligation and commander reminder.
 const responseSignal={...JSON.parse(nativeBody),eventId:'synthetic-oncall-81',key:'synthetic-oncall-81',generation:'synthetic-oncall-81',severity:'critical',title:'Archive replica unavailable'}
 const responseSend=async input=>{const body=JSON.stringify(input),at=String(Math.floor(Date.now()/1000));return fetch(m.origin+'/api/ingress/intake:portable-native',{method:'POST',headers:{'content-type':'application/json','x-oncall-timestamp':at,'x-oncall-signature':createHmac('sha256',nativeRoutedKey).update(at+'.'+body).digest('hex')},body})}
 assert.equal((await responseSend(responseSignal)).status,201)
 let recoveredIncident=ok(await req('/api/state')).incidents.find(i=>i.automaticDeclaration&&i.title===responseSignal.title);assert.ok(recoveredIncident)
 recoveredIncident=ok(await req('/api/command',{type:'transition',incident:recoveredIncident.id,revision:recoveredIncident.revision,state:'acknowledged',summary:'Archive operator investigating'}))
 assert.equal((await responseSend({...responseSignal,eventId:'synthetic-oncall-82',intent:'recover'})).status,201)
 const responseState=ok(await req('/api/state')),responseAlert=responseState.alerts.find(a=>a.id===recoveredIncident.alerts[0]);recoveredIncident=responseState.incidents.find(i=>i.id===recoveredIncident.id)
 assert.equal(responseAlert.obligation.outcome,'stopped by source recovery');assert.equal(responseAlert.obligation.recoveryNotice.label,'no sender until OC-026');assert.equal(recoveredIncident.sourceRecovery.reminder.commander,member.id);assert.equal(recoveredIncident.sourceRecovery.reminder.automatic,false)
 const automaticContext=ok(await req('/api/handoffs/context/'+recoveredIncident.id));assert.deepEqual(automaticContext.source.incident.declaration.metadata,recoveredIncident.timeline[0].metadata);assert.deepEqual(automaticContext.source.service.responsePolicies,responseState.services.find(s=>s.id==='transfer').responsePolicies)
 const nativePrefixes=['synthetic-oncall-1'+'x'.repeat(70000),'synthetic-oncall-2{'];
 for(const body of nativePrefixes){const at=String(Math.floor(Date.now()/1000));const r=await fetch(m.origin+'/api/ingress/intake:portable-native',{method:'POST',headers:{'content-type':'application/json','x-oncall-timestamp':at,'x-oncall-signature':createHmac('sha256',nativeRoutedKey).update(at+'.'+body).digest('hex')},body});assert.equal(r.status,202);}
 ok(await req('/api/intake/allowances',{id:'intake:portable-native',requests:500,events:1,revision:ok(await req('/api/state')).revision}));
 {const body='synthetic-oncall-3{',at=String(Math.floor(Date.now()/1000));const r=await fetch(m.origin+'/api/ingress/intake:portable-native',{method:'POST',headers:{'content-type':'application/json','x-oncall-timestamp':at,'x-oncall-signature':createHmac('sha256',nativeRoutedKey).update(at+'.'+body).digest('hex')},body});assert.equal(r.status,429);}
 assert.ok(ok(await req('/api/state')).audit.some(row=>row.kind==='intake-throttled'));
 const prefixesBefore=sql('SELECT id,bytes,request_sha256,prefix FROM oc_native_prefixes ORDER BY id');
 assert.deepEqual(prefixesBefore.map(row=>row.prefix).sort(),nativePrefixes.map(raw=>Buffer.from(raw).subarray(0,65536).toString('base64')).sort());
 const monitoringKey=randomBytes(32).toString('hex')
 assert.equal((await req('/api/routing/keys',{id:'portable-alertmanager',name:'Portable Alertmanager',provider:'alertmanager',scope:['transfer'],owner:member.id,revision:0,key:monitoringKey,rules:[{id:'portable-readable',match:'all',conditions:[{field:'labels.alertname',op:'equals',value:'Portable monitor'}],target:{service:'transfer'}}],catchAll:null})).status,201)
 const monitoringBody={version:'4',receiver:'portable',status:'firing',alerts:[{status:'firing',labels:{alertname:'Portable monitor',severity:'warning'},annotations:{summary:'Retain native monitoring lifecycle'},startsAt:'2026-10-17T10:00:00.123456Z',endsAt:'0001-01-01T00:00:00Z',fingerprint:'portable-monitoring'},{status:'resolved'}]}
 const monitoring=await fetch(m.origin+'/api/monitoring/portable-alertmanager',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+monitoringKey},body:JSON.stringify(monitoringBody)})
 assert.equal(monitoring.status,202);const monitoringReceipt=(await monitoring.json()).incomplete;assert.ok(monitoringReceipt,'a malformed sibling leaves durable incomplete evidence alongside the valid alert');const queueState=ok(await req('/api/state')),queuedReceipt=queueState.intakeReceipts.find(r=>r.id===monitoringReceipt.receipt),queuedAlert=queueState.alerts.find(a=>a.id===queuedReceipt.alert);assert.equal(queuedAlert.service,null);assert.equal(queuedAlert.urgency,'high');assert.deepEqual(queuedAlert.obligation.target,{kind:'user',id:member.id});assert.equal(queuedAlert.obligation.automatic,false)
 // OC-050 travels in the same full checkpoint/export/erasure comparison as every held category.
 const portableAlertIds=responseState.alerts.filter(a=>a.service==='transfer'&&['intake:portable-monitor','intake:portable-native'].includes(a.source)&&a.id!==responseAlert.id).map(a=>a.id)
 assert.equal(portableAlertIds.length,2)
 let portableMergeTarget=ok(await req('/api/command',{type:'declare',service:'transfer',title:'Portable workflow relation',severity:'warning',summary:'Retain canonical incident custody',incidentType:'Dependency'}))
 const portableMergeSource=ok(await req('/api/command',{type:'declare',service:'transfer',title:'Portable source provenance',severity:'warning',summary:'Keep the original signal record',incidentType:'Database',alerts:portableAlertIds}))
 portableMergeTarget=ok(await req('/api/command',{type:'merge-incidents',incident:portableMergeTarget.id,revision:portableMergeTarget.revision,sources:[{id:portableMergeSource.id,revision:portableMergeSource.revision}],reason:'Retain the shared cause explanation'}))
 const portableSplit=ok(await req('/api/command',{type:'split-incident',incident:portableMergeTarget.id,revision:portableMergeTarget.revision,alerts:[portableAlertIds[0]],title:'Portable separate signal',summary:'Independent investigation remains in the same lifecycle',reason:'Retain the separate cause explanation'}))
 assert.equal(portableSplit.state,portableMergeTarget.state);assert.equal(portableSplit.splitFrom.incident,portableMergeTarget.id);assert.deepEqual(portableSplit.splitFrom.alerts,[portableAlertIds[0]])
 const portableAlias=ok(await req('/api/state')).incidents.find(i=>i.id===portableMergeSource.id)
 assert.equal(portableAlias.mergedInto.target,portableMergeTarget.id);assert.deepEqual(portableAlias.alerts,portableAlertIds)
 let reviewedIncident=ok(await req('/api/state')).incidents.find(i=>i.id===incident.id)
 const reviewCommand=async data=>reviewedIncident=ok(await req('/api/command',{...data,incident:incident.id,revision:reviewedIncident.revision}))
 await reviewCommand({type:'transition',state:'acknowledged',summary:'Transfer response underway'})
 await reviewCommand({type:'template-check',item:'customer-check',done:true})
 assert.equal(reviewedIncident.template.checklist[0].done,true);assert.equal(reviewedIncident.template.checklist[0].history[0].by,member.id)
 await reviewCommand({type:'transition',state:'recovered',summary:'Operator observed recovery',evidence:'https://example.test/portable-recovery'})
 await reviewCommand({type:'transition',state:'resolved',summary:'Recovery evidence accepted'})
 await reviewCommand({type:'action',title:'Retain evidence policy',owner:member.id,escalationRecipient:member.id,due:'2026-10-20',priority:'P1',completionPolicy:'human-review'})
 await reviewCommand({type:'complete',action:reviewedIncident.actions[0].id,evidence:'https://example.test/portable-action'})
 await reviewCommand({type:'accept-action',action:reviewedIncident.actions[0].id,reason:'Human reviewed completion evidence'})
 await reviewCommand({type:'review',accept:true,materialRevision:reviewedIncident.revision,materialWorkspaceRevision:ok(await req('/api/state')).revision,rootCause:'Human assessed migration gap',impact:'Delayed preserved-history workflows',text:'Accepted review and next verification retained across installation transfer'})
 // Hold external cron injection during exact-state checkpoint assertions. The
 // real HTTP/Worker/storage carrier stays active; no application flag is changed.
 await m.close();await m.startHttp()
 // OC-053 extends this populated transfer journey with machine history and pending egress.
 const apiKey=randomBytes(32).toString('hex'),endpointKey=randomBytes(32).toString('hex')
 const createdClient=await req('/api/automation/clients',{name:'alice@example.test automation',key:apiKey,services:['transfer'],permissions:['incidents:read','incidents:write']});assert.equal(createdClient.status,201);const apiClient=createdClient.value
 const createdEndpoint=await req('/api/automation/endpoints',{name:'Portable receiver',client:apiClient.id,services:['transfer'],url:'https://8.8.8.8/events',key:endpointKey,approve:true});assert.equal(createdEndpoint.status,201)
 const machine=await fetch(m.origin+'/api/v1/incidents',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+apiKey,'idempotency-key':'synthetic-oncall-portable'},body:JSON.stringify({type:'declare',service:'transfer',title:'Portable machine incident',summary:'Retain operation and outbox identities',severity:'warning'})});assert.equal(machine.status,201)
 const machineOperation=await machine.json();
 const machineAck=await fetch(m.origin+'/api/v1/incidents',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+apiKey,'idempotency-key':'synthetic-oncall-portable-ack'},body:JSON.stringify({type:'transition',incident:machineOperation.entity,revision:1,state:'acknowledged',member:member.id,summary:'Retain permanent named responsibility'})});assert.equal(machineAck.status,201);const namedAudit=ok(await req('/api/audit/export')).rows.find(r=>r.kind==='automation.incidents'&&r.namedMember);assert.ok(namedAudit);assert.notEqual(namedAudit.actor,namedAudit.namedMember);
assert.ok(ok(await req('/api/state')).apiOutbox.some(o=>o.incident===machineOperation.entity&&o.status==='queued'))
 // The same portable/erasure journey carries a full queue and capacity outcomes.
 for(let n=1;n<50;n++)assert.equal((await req('/api/automation/endpoints',{name:'synthetic-oncall-portable-'+n,client:apiClient.id,services:['transfer'],url:'https://8.8.8.8/events',key:endpointKey,approve:true})).status,201)
 let capacityIncident=ok(await req('/api/state')).incidents.find(i=>i.id===machineOperation.entity)
 for(let n=0;n<21;n++)capacityIncident=ok(await req('/api/command',{type:'assign-role',incident:capacityIncident.id,revision:capacityIncident.revision,role:'scribe',member:member.id,reason:'Synthetic portable capacity '+n}))
 const capacityHistory=ok(await req('/api/state')).apiOutbox
 assert.equal(capacityHistory.filter(o=>['queued','sending','failed'].includes(o.status)).length,1000)
 assert.ok(capacityHistory.some(o=>o.status==='terminal'&&o.history[0].reason==='capacity-not-scheduled'&&o.attempts===0))
 cookie=await checkpointCli(m,cookie)
 const heldBeforeTick=ok(await req('/api/state')),heldTick=await fetch(m.origin+'/cdn-cgi/local/scheduled');assert.equal(heldTick.status,200);await heldTick.text();assert.deepEqual(ok(await req('/api/state')),heldBeforeTick,'an actual scheduled handler cannot resume restored outbox work')
 await m.close();await m.start()
 assert.deepEqual(sql('SELECT id,bytes,request_sha256,prefix FROM oc_native_prefixes ORDER BY id'),prefixesBefore,'checkpoint restore preserves exact native custody');
 console.log('OC-052 populated checkpoint: authority, bounds, storage rollback, concurrent restore and inactive receiving state passed')
 // Reauthorize locally after checkpoint recovery, so portable restore must
 // independently turn active integration definitions back into inactive history.
 const reauthorized=ok(await req('/api/state'))
 ok(await req('/api/automation/clients/'+apiClient.id+'/rotate',{revision:reauthorized.apiClients.find(c=>c.id===apiClient.id).revision,key:apiKey}))
 ok(await req('/api/automation/endpoints/'+createdEndpoint.value.id+'/rotate',{revision:reauthorized.apiEndpoints.find(e=>e.id===createdEndpoint.value.id).revision,key:endpointKey,approve:true}))
 assert.equal((await req('/api/changes/sources',{id:'portable-ci',name:'Portable CI context',provider:'native',service:'transfer',repository:'',mode:'bearer',revision:reauthorized.changeSources.find(s=>s.id==='portable-ci').revision,key:changeKey})).status,200)
 assert.equal((await req('/api/routing/keys',{id:'portable-monitor',name:'Portable monitor',provider:'pagerduty',scope:['transfer','upstream'],owner:member.id,revision:reauthorized.intakeSources.find(s=>s.id==='portable-monitor').revision,key:intakeKey,rules:[],catchAll:'transfer'})).status,200)
 assert.equal((await req('/api/routing/keys',{id:'portable-alertmanager',name:'Portable Alertmanager',provider:'alertmanager',scope:['transfer'],owner:member.id,revision:reauthorized.intakeSources.find(s=>s.id==='portable-alertmanager').revision,key:monitoringKey})).status,200)
 assert.equal((await req('/api/routing/keys',{id:'portable-native',name:'Portable native monitor',provider:'native',authentication:'signed',scope:['transfer','upstream'],owner:member.id,revision:reauthorized.intakeSources.find(s=>s.id==='portable-native').revision,key:nativeRoutedKey})).status,200)
 await business.prepare(cookie)
 statusBusiness=ok(await req('/api/status')).services.find(row=>row.name==='Checkout');ok(await req('/api/status',{action:'activate',id:statusBusiness.id,revision:statusBusiness.revision}))
 const oldCookie=cookie
 const source=await readFile('tests/fixtures/opsgenie.json','utf8'),door=ownerDoor(m,cookie),preview=ok(await door.preview('opsgenie',source)),job=ok(await door.apply('opsgenie',preview)).job;assert.equal(job.state,'completed')
 // OC-038 new adapters remain in the existing imported-data and journal archive category.
 for(const vendor of ['splunk','jsm','betterstack']) {
  const reviewed=ok(await door.preview(vendor,await readFile(`tests/fixtures/synthetic-oncall-${vendor}.json`,'utf8')))
  assert.equal(ok(await door.apply(vendor,reviewed)).job.state,'completed')
 }
 assert.equal(ok(await req('/api/move-in/objects')).filter(row=>row.targetKind==='integration'&&row.value.active===false&&row.value.incumbentKey==='not supplied').length,3)
 // OC-055 portable custody: held incumbent and native hashes never travel.
 const incumbentObject=ok(await req('/api/move-in/objects')).find(row=>row.targetKind==='integration'&&row.value.provider==='splunk')
 const incumbentKey=randomBytes(32).toString('hex')
 const supplyResult=await req('/api/intake/incumbent',{importedId:incumbentObject.targetId,importedRevision:incumbentObject.revision,id:'synthetic-oncall-portable-incumbent',service:'transfer',name:'Synthetic portable incumbent',revision:0,key:incumbentKey});assert.equal(supplyResult.status,201);const supplied=supplyResult.value
 const activated=ok(await req('/api/intake/sources/synthetic-oncall-portable-incumbent/activate-incumbent',{revision:supplied.source.revision,confirmed:true}))
 const incumbentHash=sql("SELECT key_digest FROM oc_incumbent_credentials WHERE source='synthetic-oncall-portable-incumbent'")[0].key_digest
 assert.equal(activated.source.active,true)
 const at=Date.parse('2026-10-11T09:00:00Z'),pending={id:'held-pending',incident:incident.id,service:'transfer',revision:1,status:'pending',nextDue:at,createdAt:at,lastEvaluatedAt:at,currentStep:0,policy:{service:'transfer',scheduleId:'transfer',revision:1,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3},schedule,behaviors:{primary:'accepted',backup:'accepted'},steps:[],history:[{type:'created',at,actor:null,reason:null,attempt:null}]}
 sql("INSERT INTO paging_jobs VALUES('held-pending','"+incident.id+"','transfer',1,'pending',"+at+",'fixture','"+JSON.stringify(pending).replaceAll("'","''")+"')")
 const permanentAudit=ok(await req('/api/audit/export')).rows
 const prior=ok(await req('/api/state')),objects=ok(await req('/api/move-in/objects'))
 const importTables=sql("SELECT name FROM sqlite_master WHERE type='table' AND (name GLOB 'ik_*' OR name GLOB 'move_in_*') ORDER BY name").map(r=>r.name)
 const importRows=()=>Object.fromEntries(statements(importTables.map(table=>'SELECT * FROM '+table).join(';')).map((rows,index)=>[importTables[index],rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]))
 const importHistory=importRows(),interruptedPlans=sql("SELECT plan_id FROM oc_import_lifecycle WHERE job_id IN (SELECT id FROM ik_jobs WHERE state IN ('queued','applying'))").map(row=>row.plan_id).filter(Boolean)
 await m.close();await m.command(['export','--output',archive,'--non-interactive'])
 const exportedArchive=await readFile(archive)
 assert.ok(exportedArchive.includes('Preserve authored history'),'the archive holds readable authored records')
 const manifest=JSON.parse(exportedArchive.toString('utf8').split('\n')[0])
 assert.ok(!manifest.tables.some(table=>table.name==='oc_audit_identities'),'revocable identity associations never travel in archives')
 for(const secret of [incumbentKey,incumbentHash,activated.nativeKey,...Object.values(fleetChangeKeys),fleetGrafanaKey,fleetSigningKey,fleetSigningCustody,nativeRoutedKey,sourceKey,sourceCustody,changeKey,intakeKey,monitoringKey,emailPart,apiKey,endpointKey])assert.ok(!exportedArchive.includes(secret),'neither the signed source key nor its sealed form enters the archive')
 await m.command(['import','--input',archive,'--yes','--non-interactive'],4)
 const serviceRow=sql("SELECT data FROM oc_services WHERE id='transfer'")[0].data
 sql("UPDATE oc_services SET data='{\"id\":\"transfer\"}' WHERE id='transfer'");await m.command(['export','--output',invalidRecords,'--non-interactive']);sql("UPDATE oc_services SET data='"+serviceRow.replaceAll("'","''")+"' WHERE id='transfer'")
 await m.command(['reset','--yes'])
 assert.ok((await readFile(archive)).equals(exportedArchive),'the documented reset preserves the exported archive for in-place restore')
 for(const path of ['.dev.vars','.dev.vars.previous','.rer/local'])await assert.rejects(lstat(path),{code:'ENOENT'},'reset removes the previous owner and private settings')
 const targetSchema=()=>sql("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY type,name"),emptyTarget=targetSchema()
 assert.deepEqual(emptyTarget,[],'reset leaves an uninitialized target')
 await writeFile(corrupt,'{bad archive}',{mode:0o600});await m.command(['import','--input',corrupt,'--yes','--non-interactive'],2)
 assert.deepEqual(targetSchema(),emptyTarget,'invalid transfer preserves the uninitialized target before migrations')
 await m.command(['import','--input',invalidRecords,'--yes','--non-interactive'],1)
 assert.equal(sql('SELECT COUNT(*) AS n FROM oc_members UNION ALL SELECT COUNT(*) FROM move_in_objects')[0].n,0,'valid-checksum invalid product records never publish')
 await m.command(['import','--input',archive,'--yes','--non-interactive'])
 assert.deepEqual(sql('SELECT id,bytes,request_sha256,prefix FROM oc_native_prefixes ORDER BY id'),prefixesBefore,'portable reset/import preserves exact native custody')
 assert.equal(sql('SELECT COUNT(*) AS n FROM credentials UNION ALL SELECT COUNT(*) FROM sessions UNION ALL SELECT COUNT(*) FROM operator_members UNION ALL SELECT COUNT(*) FROM oc_audit_identities').every(r=>r.n===0),true,'credentials, authority and audit identity associations do not travel')
 assert.equal(sql('SELECT COUNT(*) AS n FROM oc_api_credentials UNION ALL SELECT COUNT(*) FROM oc_endpoint_credentials').every(r=>r.n===0),true,'machine and egress credentials never transfer')
 const restoredJob=JSON.parse(sql("SELECT data FROM paging_jobs WHERE id='held-pending'")[0].data);assert.equal(restoredJob.status,'paused');assert.equal(restoredJob.nextDue,null);assert.deepEqual(restoredJob.history.slice(0,-1),pending.history)
 await mkdir('.rer/local',{recursive:true,mode:0o700});await writeFile(answers,JSON.stringify({OWNER_EMAIL:'new-owner@example.test'}),{mode:0o600});await m.command(['setup','--answers',answers,'--port',String(m.port),'--non-interactive']);await business.configure();await m.start();cookie=await m.owner()
 assert.equal(ok(await req('/api/session')).member,null,'new Base owner cannot silently claim restored identities')
 assert.equal((await req('/api/identity-link',{confirm:true,adminMapping:'missing-admin'})).status,409)
 sql("INSERT INTO credentials VALUES('"+member.id+"','fixture-salt','fixture-password-digest')")
 assert.equal((await req('/api/identity-link',{confirm:true,adminMapping:member.id})).status,409,'held password data cannot be claimed by a new native owner')
 sql('DELETE FROM credentials')
 ok(await req('/api/identity-link',{confirm:true,adminMapping:member.id}));assert.deepEqual(ok(await req('/api/state')),{...prior,incidents:prior.incidents.map(i=>({...i,...(i.manualPage?{manualPage:{...i.manualPage,obligations:i.manualPage.obligations.map(o=>({...o,state:'stopped',outcome:'Restored inactive; no sender'}))}}:{}),...(i.responderRequests?{responderRequests:i.responderRequests.map(r=>({...r,status:r.status==='pending'?'held':r.status,obligation:{...r.obligation,state:'stopped',outcome:'Restored inactive; no sender'},notice:r.notice?{...r.notice,state:'stopped'}:null}))}:{})})),members:prior.members.map(member=>member.role==='stakeholder'?{...member,active:false}:member),businessServices:prior.businessServices.map(service=>({...service,active:false,subscriptions:service.subscriptions.map(row=>({...row,active:false})),notices:service.notices.map(row=>({...row,state:'stopped'}))})),changeSources:prior.changeSources.map(source=>({...source,active:false})),intakeSources:prior.intakeSources.map(source=>({...source,active:false})),emailAddresses:prior.emailAddresses.map(address=>({...address,active:false})),apiClients:prior.apiClients.map(c=>({...c,active:false})),apiEndpoints:prior.apiEndpoints.map(e=>({...e,active:false})),apiOutbox:prior.apiOutbox.map(o=>({...o,authorized:false}))},'all relational coordination and attribution restored with source definitions explicitly inactive')
 assert.equal(ok(await req('/api/state')).businessServices[0].active,false);assert.ok(ok(await req('/api/state')).businessServices[0].subscriptions.every(row=>!row.active));assert.ok(ok(await req('/api/state')).businessServices[0].notices.every(row=>row.state==='stopped'));assert.equal(ok(await req('/api/state')).members.find(row=>row.id===stakeholder.id).active,false)
 const restoredManual=ok(await req('/api/state')).incidents.find(i=>i.id===portableManual.id);assert.equal(restoredManual.manualPage.obligations[0].state,'stopped');assert.equal(restoredManual.responderRequests[0].status,'held');console.log('OC-068 archive/checkpoint/portable custody: manual obligations and pending responder requests retained inactive without sender authority')
 console.log('OC-061 portable status custody: business services, overrides, subscriptions, obligations and stakeholder role restored inactive without authority')
 assert.equal(sql('SELECT COUNT(*) AS n FROM oc_email_credentials')[0].n,0,'email address keys never transfer')
 assert.deepEqual(ok(await req('/api/email')).samples,prior.emailSamples,'saved mail, versioned rules, activity and quarantine survive inactive restore')
 assert.equal(sql('SELECT COUNT(*) AS n FROM oc_intake_credentials')[0].n,0,'compatible verification hashes are excluded from portable transfers')
 assert.equal(sql('SELECT COUNT(*) AS n FROM oc_incumbent_credentials')[0].n,0,'OC-055 restored integration has no incumbent hash or binding digest')
 assert.equal(ok(await req('/api/intake/sources/synthetic-oncall-portable-incumbent/incumbent')).keySupplied,false)
 assert.deepEqual(ok(await req('/api/state')).intakeReceipts,prior.intakeReceipts,'compatible lifecycle and routing explanations survive portable transfer')
 assert.equal(ok(await req('/api/state')).intakeSources.find(source=>source.id==='portable-monitor').routing.versions[0].catchAll,'transfer','published routing definitions survive portable transfer')
 assert.equal(sql('SELECT COUNT(*) AS n FROM oc_api_credentials')[0].n,0,'service-account digests do not transfer');assert.equal(sql('SELECT COUNT(*) AS n FROM oc_endpoint_credentials')[0].n,0,'outbound signing custody does not transfer')
 for(const provider of ['argocd','terraform'])assert.ok(ok(await req('/api/state')).changeSources.some(s=>s.provider===provider&&!s.active),'sd-oncall-c14 source kind restores inactive');
 assert.equal(sql('SELECT COUNT(*) AS n FROM oc_change_credentials')[0].n,0,'change verification material is excluded from portable transfers')
 assert.equal(sql('SELECT COUNT(*) AS n FROM sources')[0].n,0,'native source keys are excluded from portable transfers')
 assert.equal((await fetch(m.origin+'/api/ingress/portable-signed',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,401,'a restored installation holds no transferable source authority')
 assert.equal(ok(await req('/api/state')).changes[0].eventId,'portable-deploy','retained change identity survives portable transfer')
 assert.equal(ok(await req('/api/state')).triage.length,2,'saved views and replay-safe bulk receipts survive the portable archive')
 assert.deepEqual(ok(await req('/api/move-in/objects')),objects,'paused import data restored with revisions')
 assert.equal(ok(await req('/api/move-in/objects')).filter(row=>row.targetKind==='integration'&&row.value.active===false&&row.value.incumbentKey==='not supplied').length,3,'OC-038 integration inventory restores inactive, without keys or authority')
 assert.equal(ok(await req('/api/move-in/jobs?vendor=opsgenie')).some(j=>j.id===job.id),true,'durable journal restored')
 const handoff=ok(await req('/api/handoffs/archive-copy'));assert.equal(handoff.record.held,true);assert.deepEqual(handoff.record.payload,record.payload);assert.equal((await req('/api/handoffs/archive-copy/export')).status,409,'restored approval cannot export until reviewed again')
 const restoredAudit=new Map(ok(await req('/api/audit/export')).rows.map(row=>[row.id,row]))
 for(const row of permanentAudit)assert.deepEqual(restoredAudit.get(row.id),row,'OC-041 portable restore retains every permanent audit row unchanged')
 const restoreFact=[...restoredAudit.values()].find(row=>row.kind==='restore.installation'&&row.outcome==='accepted')
 assert.ok(restoreFact,'the restored state publishes its own accepted audit fact')
 assert.equal(restoreFact.workspaceAfter,prior.revision);assert.equal(restoreFact.handoffAfter,sql('SELECT revision FROM handoff_state')[0].revision,'restore audit records the final held handoff revision')
 assert.ok([...restoredAudit.values()].some(row=>row.kind==='import.restore'&&row.outcome==='interrupted'),'restored pending import work publishes a permanent interrupted audit fact')
 const restoredImports=importRows()
 for(const table of importTables) {
  let expected=importHistory[table]
  if(table==='ik_door_settings')expected=expected.map(row=>({...row,enabled:0}))
  if(table==='ik_jobs')expected=expected.map(row=>['queued','applying'].includes(row.state)?{...row,state:'failed',error:'import_interrupted_restore',fence:row.fence+1,lease_token:null,lease_expires:null}:row)
  if(table==='ik_door_apply_failures')expected=[...expected,...interruptedPlans.filter(id=>!expected.some(row=>row.plan_id===id)).map(plan_id=>({plan_id,reason_code:'import_interrupted_restore'}))].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
  assert.deepEqual(restoredImports[table],expected,table+' retains every import/provenance/plan/approval field, with restored in-flight work explicitly interrupted')
 }
 await business.assertInactive(cookie,oldCookie,sql)
 console.log('OC-052 portable restore: complete import history preserved and restored pending Business execution refused')
 await business.screens(cookie)
 assert.equal((await req('/api/delivery',{})).status,409)
 // Erasing an imported person: a signed-out request and an unknown email are refused, the person leaves every table, and the archive made before the erasure is refused whole under the later journal.
 const emailAddress=ok(await req('/api/email')).addresses[0];ok(await req('/api/email/addresses/portable-email/erase',{revision:emailAddress.revision}));assert.equal(ok(await req('/api/email')).samples.length,0)
 const erase=email=>req('/api/move-in/erase',{email,confirmation:'erase '+email})
 assert.equal((await m.request('/api/move-in/erase',{email:'alice@example.test',confirmation:'erase alice@example.test'})).status,401)
 assert.equal((await erase('nobody@example.test')).status,404)
 const erasedSubscriberCreated=await req('/api/members',{name:'alice@example.test status',role:'stakeholder',password:'synthetic-oncall-67-password'});assert.equal(erasedSubscriberCreated.status,201);const erasedSubscriber=erasedSubscriberCreated.value
 statusBusiness=ok(await req('/api/status')).services.find(row=>row.name==='Checkout')
 // Grant the member explicitly on a second service so no out-of-scope subscription is manufactured.
 ok(await req('/api/status',{action:'create',name:'Customer checkout',owningTeam:'Payments',supporting:['transfer'],communicationsOwner:member.id,audience:[erasedSubscriber.id],highUrgencyImpact:false}))
 const erasedBusiness=ok(await req('/api/status')).services.find(row=>row.name==='Customer checkout')
 ok(await req('/api/status',{action:'subscribe',id:erasedBusiness.id,revision:erasedBusiness.revision,member:erasedSubscriber.id,channel:'chat',active:true}))
 const erasedResponderCreated=await req('/api/members',{name:'alice@example.test responder',role:'responder',password:'synthetic-oncall-68-password'});assert.equal(erasedResponderCreated.status,201);const erasedResponder=erasedResponderCreated.value;let erasedPage=ok(await req('/api/command',{type:'manual-page',operationId:'synthetic-oncall-68-erasure',service:'transfer',title:'Erase responder destination',severity:'warning',users:[erasedResponder.id]}));erasedPage=ok(await req('/api/command',{type:'request-responders',incident:erasedPage.id,revision:erasedPage.revision,users:[erasedResponder.id],message:'alice@example.test response request'}));
 const auditBeforeErasure=ok(await req('/api/audit/export')).rows
 let erased;cookie=await checkpointErasureCli(m,cookie,async()=>{erased=ok(await erase('alice@example.test'));assert.ok(erased.receiptId)});
 const erasedManualState=ok(await req('/api/state')).incidents.find(i=>i.id===erasedPage.id);assert.equal(erasedManualState.manualPage.obligations.length,0);assert.equal(erasedManualState.responderRequests.length,0);assert.ok(!JSON.stringify(erasedManualState.manualPage).includes(erasedResponder.id));console.log('OC-068 person erasure: manual targets, pending requests and local request text are severed atomically');
 const erasedRole=ok(await req('/api/state')).members.find(row=>row.id===erasedSubscriber.id);assert.equal(erasedRole.active,false);assert.equal(erasedRole.name,'Erased member');assert.equal(sql("SELECT COUNT(*) AS n FROM credentials WHERE member='"+erasedSubscriber.id+"'")[0].n,0);assert.equal((await req('/api/login',{name:'alice@example.test status',password:'synthetic-oncall-67-password'})).status,401,'erased stakeholder role has no sign-in authority')
 const erasedBusinessState=ok(await req('/api/state')).businessServices.find(row=>row.id===erasedBusiness.id);assert.ok(!JSON.stringify(erasedBusinessState).includes(erasedSubscriber.id),'subject erasure severs status audience, subscription and obligation destinations atomically')
 assert.ok(!JSON.stringify(ok(await req('/api/state')).apiClients).includes('alice@example.test'),'erasure severs automation labels and authority')
 assert.ok(ok(await req('/api/state')).apiOutbox.some(o=>o.history[0].reason==='capacity-not-scheduled'),'capacity history survives safe erasure')
 assert.equal((await req('/api/automation/dispatch',{})).value.processed,0,'restored unfinished and capacity events remain held after erasure')
 const safeAudit=ok(await req('/api/audit/export')).rows,auditById=new Map(safeAudit.map(row=>[row.id,row]))
 for(const row of auditBeforeErasure)assert.deepEqual(auditById.get(row.id),row,'subject erasure never rewrites permanent audit chronology')
 for(const secret of [apiKey,endpointKey,'alice@example.test','portable-signed','portable-ci','Portable CI context','portable-monitor','portable-alertmanager',sourceKey,sourceCustody,changeKey,intakeKey,monitoringKey])assert.ok(!JSON.stringify(safeAudit).includes(secret),'protected audit export holds no erased identity or secret')
 assert.equal((await erase('alice@example.test')).status,404,'repeating an erasure changes nothing')
 const retainedErasureFences=sql('SELECT id,epoch FROM oc_erasure_fences ORDER BY id')
 await m.close();await m.command(['export','--output',later,'--non-interactive']);await m.command(['reset','--yes','--non-interactive'])
 await m.command(['import','--input',archive,'--journal',later,'--yes','--non-interactive'],4)
 assert.ok(Object.values(sql('SELECT (SELECT COUNT(*) FROM move_in_objects) AS imported,(SELECT COUNT(*) FROM ik_jobs) AS jobs,(SELECT COUNT(*) FROM oc_api_clients) AS clients,(SELECT COUNT(*) FROM oc_api_endpoints) AS endpoints,(SELECT COUNT(*) FROM oc_api_operations) AS operations,(SELECT COUNT(*) FROM oc_api_outbox) AS outbox')[0]).every(count=>count===0),'the refused older archive restores no import or automation record')
 await m.command(['import','--input',later,'--yes','--non-interactive'])
 assert.ok(retainedErasureFences.length);assert.deepEqual(sql('SELECT id,epoch FROM oc_erasure_fences ORDER BY id'),retainedErasureFences,'current installation archive preserves every durable subject erasure fence exactly')
 assert.ok(!sql('SELECT data FROM oc_api_clients UNION ALL SELECT data FROM oc_api_endpoints').some(row=>row.data.includes('alice@example.test')),'erased automation labels stay absent after current portable restore')
 assert.equal(sql("SELECT COUNT(*) AS n FROM move_in_objects WHERE id='alice@example.test'")[0].n,0)
 assert.equal(sql("SELECT COUNT(*) AS n FROM ik_jobs WHERE plan_json LIKE '%alice@example.test%'")[0].n,0)
 const retainedWorkflows=sql('SELECT data FROM oc_incidents').map(row=>JSON.parse(row.data))
 for(const id of [incident.id,portableMergeTarget.id,portableMergeSource.id,portableSplit.id])assert.deepEqual(retainedWorkflows.find(i=>i.id===id),prior.incidents.find(i=>i.id===id),'OC-050 templates, completed checklists, merge aliases and split provenance survive portable restore and erasure')
 console.log('PASS OC-050 transfer: full template snapshots with completed checklist attribution and merged/split provenance survive checkpoint, portable inactive restore, erasure and current archive import without replay or authority. Paging remains OFF.')
 await m.command(['reset','--yes','--non-interactive'])
 console.log('OC-041 accepted state and its audit entry commit together, survive subject erasure and export without secrets; OC-052 all current durable categories restore inactive without authority or replay: nonempty refusal, invalid-input rollback, full relational/history/journal restore, credential exclusion, paused timer, explicit new-owner mapping and held approval')
}finally{await m.close();await rm(answers,{force:true});await rm(archive,{force:true});await rm(corrupt,{force:true});await rm(invalidRecords,{force:true});await rm(later,{force:true})}
