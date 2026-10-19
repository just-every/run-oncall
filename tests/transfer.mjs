import {isolatedEntrypoint} from './isolated.mjs'
const isolated=await isolatedEntrypoint(import.meta.url);if(isolated!==null)process.exit(isolated)
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {lstat,mkdir,readFile,writeFile,rm} from 'node:fs/promises'
import {managedSeed} from './managed.mjs'
import {ownerDoor} from './worker.mjs'
import {checkpointCli} from './checkpoint-cli.mjs'
import {transferDoor} from './transfer-door.mjs'

const fetch=(url,input={})=>globalThis.fetch(url,{...input,headers:{...input.headers,connection:'close'}})

const m=await managedSeed(),ok=r=>{assert.equal(r.status,200,JSON.stringify(r.value));return r.value}
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
 const incident=ok(await req('/api/command',{type:'declare',service:'transfer',title:'Preserve authored history',severity:'warning',summary:'Archive proof',alerts:[]}))
 const schedule=ok(await req('/api/paging/schedules',{id:'transfer',name:'Transfer rota',service:'transfer',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[member.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}))
 const context=ok(await req('/api/handoffs/context/'+incident.id)),prepared=await req('/api/handoffs/prepare',{id:'archive-copy',incident:incident.id,incidentRevision:incident.revision,serviceHash:context.serviceHash,payload:{audience:'internal',title:'Exact copy',summary:'Authored transfer evidence',evidenceLinks:[],impactLinks:[]}})
 assert.equal(prepared.status,201);const record=prepared.value.record
 assert.deepEqual(record.source.incident.declaration.lifecycle,{from:null,to:'declared'});assert.deepEqual(record.source.service.dependencies,['upstream'])
 ok(await req('/api/handoffs/archive-copy/review',{actionId:'archive-review',revision:record.revision,payloadHash:record.payloadHash,sourceHash:record.sourceHash,reason:'Reviewed exact copy'}))
 let responseIncident=ok(await req('/api/state')).incidents.find(i=>i.id===incident.id)
 responseIncident=ok(await req('/api/command',{type:'assign-role',incident:incident.id,revision:responseIncident.revision,role:'scribe',member:member.id,reason:'Retain review attribution across installations'}))
 const bulk=ok(await req('/api/triage/bulk',{operationId:'portable-priority',action:'set-priority',items:[{id:incident.id,revision:responseIncident.revision}],priority:'P1',reason:'Preserve incident priority'}));assert.equal(bulk.results[0].ok,true)
 ok(await req('/api/triage/views',{name:'Open transfer work',query:{q:'authored',status:'open'}}))
 const changeKey=randomBytes(32).toString('hex')
 assert.equal((await req('/api/changes/sources',{id:'portable-ci',name:'Portable CI context',provider:'native',service:'transfer',repository:'',mode:'bearer',revision:0,key:changeKey})).status,201)
 assert.equal((await fetch(m.origin+'/api/changes/ingress/portable-ci',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+changeKey},body:JSON.stringify({eventId:'portable-deploy',summary:'Retain deployment context',author:'transfer-ci',timestamp:new Date().toISOString()})})).status,201)
 const intakeKey=randomBytes(32).toString('hex')
 assert.equal((await req('/api/routing/keys',{id:'portable-monitor',name:'Portable monitor',provider:'pagerduty',scope:['transfer','upstream'],owner:member.id,revision:0,key:intakeKey,rules:[],catchAll:'transfer'})).status,201)
 assert.equal((await fetch(m.origin+'/v2/enqueue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({routing_key:intakeKey,event_action:'trigger',dedup_key:'portable-alert',payload:{summary:'Retain compatible lifecycle',source:'transfer-monitor',severity:'warning'}})})).status,202)
 const monitoringKey=randomBytes(32).toString('hex')
 assert.equal((await req('/api/intake/sources',{id:'portable-alertmanager',name:'Portable Alertmanager',provider:'alertmanager',service:'transfer',revision:0,key:monitoringKey})).status,201)
 const monitoringBody={version:'4',receiver:'portable',status:'firing',alerts:[{status:'firing',labels:{alertname:'Portable monitor',severity:'warning'},annotations:{summary:'Retain native monitoring lifecycle'},startsAt:'2026-10-17T10:00:00.123456Z',endsAt:'0001-01-01T00:00:00Z',fingerprint:'portable-monitoring'},{status:'resolved'}]}
 const monitoring=await fetch(m.origin+'/api/monitoring/portable-alertmanager',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+monitoringKey},body:JSON.stringify(monitoringBody)})
 assert.equal(monitoring.status,202);assert.ok((await monitoring.json()).incomplete,'a malformed sibling leaves durable incomplete evidence alongside the valid alert')
 let reviewedIncident=ok(await req('/api/state')).incidents.find(i=>i.id===incident.id)
 const reviewCommand=async data=>reviewedIncident=ok(await req('/api/command',{...data,incident:incident.id,revision:reviewedIncident.revision}))
 await reviewCommand({type:'transition',state:'acknowledged',summary:'Transfer response underway'})
 await reviewCommand({type:'transition',state:'recovered',summary:'Operator observed recovery',evidence:'https://example.test/portable-recovery'})
 await reviewCommand({type:'transition',state:'resolved',summary:'Recovery evidence accepted'})
 await reviewCommand({type:'action',title:'Retain evidence policy',owner:member.id,escalationRecipient:member.id,due:'2026-10-20',priority:'P1',completionPolicy:'human-review'})
 await reviewCommand({type:'complete',action:reviewedIncident.actions[0].id,evidence:'https://example.test/portable-action'})
 await reviewCommand({type:'accept-action',action:reviewedIncident.actions[0].id,reason:'Human reviewed completion evidence'})
 await reviewCommand({type:'review',accept:true,materialRevision:reviewedIncident.revision,materialWorkspaceRevision:ok(await req('/api/state')).revision,rootCause:'Human assessed migration gap',impact:'Delayed preserved-history workflows',text:'Accepted review and next verification retained across installation transfer'})
 cookie=await checkpointCli(m,cookie)
 console.log('OC-052 populated checkpoint: authority, bounds, storage rollback, concurrent restore and inactive receiving state passed')
 // Reauthorize locally after checkpoint recovery, so portable restore must
 // independently turn active integration definitions back into inactive history.
 const reauthorized=ok(await req('/api/state'))
 assert.equal((await req('/api/changes/sources',{id:'portable-ci',name:'Portable CI context',provider:'native',service:'transfer',repository:'',mode:'bearer',revision:reauthorized.changeSources.find(s=>s.id==='portable-ci').revision,key:changeKey})).status,200)
 assert.equal((await req('/api/routing/keys',{id:'portable-monitor',name:'Portable monitor',provider:'pagerduty',scope:['transfer','upstream'],owner:member.id,revision:reauthorized.intakeSources.find(s=>s.id==='portable-monitor').revision,key:intakeKey,rules:[],catchAll:'transfer'})).status,200)
 assert.equal((await req('/api/intake/sources',{id:'portable-alertmanager',name:'Portable Alertmanager',provider:'alertmanager',service:'transfer',revision:reauthorized.intakeSources.find(s=>s.id==='portable-alertmanager').revision,key:monitoringKey})).status,200)
 await business.prepare(cookie)
 const oldCookie=cookie
 const source=await readFile('tests/fixtures/opsgenie.json','utf8'),door=ownerDoor(m,cookie),preview=ok(await door.preview('opsgenie',source)),job=ok(await door.apply('opsgenie',preview)).job;assert.equal(job.state,'completed')
 const at=Date.parse('2026-10-11T09:00:00Z'),pending={id:'held-pending',incident:incident.id,service:'transfer',revision:1,status:'pending',nextDue:at,createdAt:at,lastEvaluatedAt:at,currentStep:0,policy:{service:'transfer',scheduleId:'transfer',revision:1,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3},schedule,behaviors:{primary:'accepted',backup:'accepted'},steps:[],history:[{type:'created',at,actor:null,reason:null,attempt:null}]}
 sql("INSERT INTO paging_jobs VALUES('held-pending','"+incident.id+"','transfer',1,'pending',"+at+",'fixture','"+JSON.stringify(pending).replaceAll("'","''")+"')")
 const prior=ok(await req('/api/state')),objects=ok(await req('/api/move-in/objects'))
 const importTables=sql("SELECT name FROM sqlite_master WHERE type='table' AND (name GLOB 'ik_*' OR name GLOB 'move_in_*') ORDER BY name").map(r=>r.name)
 const importRows=()=>Object.fromEntries(statements(importTables.map(table=>'SELECT * FROM '+table).join(';')).map((rows,index)=>[importTables[index],rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]))
 const importHistory=importRows()
 await m.close();await m.command(['export','--output',archive,'--non-interactive'])
 const exportedArchive=await readFile(archive)
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
 assert.equal(sql('SELECT COUNT(*) AS n FROM credentials UNION ALL SELECT COUNT(*) FROM sessions UNION ALL SELECT COUNT(*) FROM operator_members').every(r=>r.n===0),true,'credentials and authority do not travel')
 const restoredJob=JSON.parse(sql("SELECT data FROM paging_jobs WHERE id='held-pending'")[0].data);assert.equal(restoredJob.status,'paused');assert.equal(restoredJob.nextDue,null);assert.deepEqual(restoredJob.history.slice(0,-1),pending.history)
 await mkdir('.rer/local',{recursive:true,mode:0o700});await writeFile(answers,JSON.stringify({OWNER_EMAIL:'new-owner@example.test'}),{mode:0o600});await m.command(['setup','--answers',answers,'--port',String(m.port),'--non-interactive']);await business.configure();await m.start();cookie=await m.owner()
 assert.equal(ok(await req('/api/session')).member,null,'new Base owner cannot silently claim restored identities')
 assert.equal((await req('/api/identity-link',{confirm:true,adminMapping:'missing-admin'})).status,409)
 sql("INSERT INTO credentials VALUES('"+member.id+"','fixture-salt','fixture-password-digest')")
 assert.equal((await req('/api/identity-link',{confirm:true,adminMapping:member.id})).status,409,'held password data cannot be claimed by a new native owner')
 sql('DELETE FROM credentials')
 ok(await req('/api/identity-link',{confirm:true,adminMapping:member.id}));assert.deepEqual(ok(await req('/api/state')),{...prior,changeSources:prior.changeSources.map(source=>({...source,active:false})),intakeSources:prior.intakeSources.map(source=>({...source,active:false}))},'all relational coordination and attribution restored with source definitions explicitly inactive')
 assert.equal(sql('SELECT COUNT(*) AS n FROM oc_intake_credentials')[0].n,0,'compatible verification hashes are excluded from portable transfers')
 assert.deepEqual(ok(await req('/api/state')).intakeReceipts,prior.intakeReceipts,'compatible lifecycle and routing explanations survive portable transfer')
 assert.equal(ok(await req('/api/state')).intakeSources.find(source=>source.id==='portable-monitor').routing.versions[0].catchAll,'transfer','published routing definitions survive portable transfer')
 assert.equal(sql('SELECT COUNT(*) AS n FROM oc_change_credentials')[0].n,0,'change verification material is excluded from portable transfers')
 assert.equal(ok(await req('/api/state')).changes[0].eventId,'portable-deploy','retained change identity survives portable transfer')
 assert.equal(ok(await req('/api/state')).triage.length,2,'saved views and replay-safe bulk receipts survive the portable archive')
 assert.deepEqual(ok(await req('/api/move-in/objects')),objects,'paused import data restored with revisions')
 assert.equal(ok(await req('/api/move-in/jobs?vendor=opsgenie')).some(j=>j.id===job.id),true,'durable journal restored')
 const handoff=ok(await req('/api/handoffs/archive-copy'));assert.equal(handoff.record.held,true);assert.deepEqual(handoff.record.payload,record.payload);assert.equal((await req('/api/handoffs/archive-copy/export')).status,409,'restored approval cannot export until reviewed again')
 const restoredImports=importRows()
 for(const table of importTables)assert.deepEqual(restoredImports[table],table==='ik_door_settings'?importHistory[table].map(row=>({...row,enabled:0})):importHistory[table],table+' retains every import/provenance/plan/approval field')
 await business.assertInactive(cookie,oldCookie,sql)
 console.log('OC-052 portable restore: complete import history preserved and restored pending Business execution refused')
 await business.screens(cookie)
 assert.equal((await req('/api/delivery',{})).status,409)
 // Erasing an imported person: a signed-out request and an unknown email are refused, the person leaves every table, and the archive made before the erasure is refused whole under the later journal.
 const erase=email=>req('/api/move-in/erase',{email,confirmation:'erase '+email})
 assert.equal((await m.request('/api/move-in/erase',{email:'alice@example.test',confirmation:'erase alice@example.test'})).status,401)
 assert.equal((await erase('nobody@example.test')).status,404)
 const erased=ok(await erase('alice@example.test'));assert.ok(erased.receiptId)
 assert.equal((await erase('alice@example.test')).status,404,'repeating an erasure changes nothing')
 await m.close();await m.command(['export','--output',later,'--non-interactive']);await m.command(['reset','--yes','--non-interactive'])
 await m.command(['import','--input',archive,'--journal',later,'--yes','--non-interactive'],4)
 assert.equal(sql('SELECT COUNT(*) AS n FROM move_in_objects UNION ALL SELECT COUNT(*) FROM ik_jobs')[0].n,0,'the refused older archive restored nothing')
 await m.command(['import','--input',later,'--yes','--non-interactive'])
 assert.equal(sql("SELECT COUNT(*) AS n FROM move_in_objects WHERE id='alice@example.test'")[0].n,0)
 assert.equal(sql("SELECT COUNT(*) AS n FROM ik_jobs WHERE plan_json LIKE '%alice@example.test%'")[0].n,0)
 await m.command(['reset','--yes','--non-interactive'])
 console.log('OC-052 all current durable categories restore inactive without authority or replay: nonempty refusal, invalid-input rollback, full relational/history/journal restore, credential exclusion, paused timer, explicit new-owner mapping and held approval')
}finally{await m.close();await rm(answers,{force:true});await rm(archive,{force:true});await rm(corrupt,{force:true});await rm(invalidRecords,{force:true});await rm(later,{force:true})}
