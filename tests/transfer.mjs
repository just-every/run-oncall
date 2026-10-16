import {isolatedEntrypoint} from './isolated.mjs'
const isolated=await isolatedEntrypoint(import.meta.url);if(isolated!==null)process.exit(isolated)
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {lstat,mkdir,readFile,writeFile,rm} from 'node:fs/promises'
import {managedSeed} from './managed.mjs'
import {checkpointCli} from './checkpoint-cli.mjs'

const m=await managedSeed(),ok=r=>{assert.equal(r.status,200,JSON.stringify(r.value));return r.value}
const sql=command=>JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--persist-to','.wrangler/state','--command',command,'--json'],{encoding:'utf8',env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']}))[0].results
await mkdir('.rer/local',{recursive:true,mode:0o700});await mkdir('exports',{recursive:true,mode:0o700})
const answers='.rer/local/transfer-answers.json',archive='exports/transfer-proof.rer',corrupt='exports/transfer-corrupt.rer',invalidRecords='exports/transfer-invalid-records.rer',later='exports/transfer-later.rer'
await writeFile(answers,JSON.stringify({OWNER_EMAIL:'transfer-owner@example.test'}),{mode:0o600})
try{
 await m.command(['setup','--answers',answers,'--port',String(m.port),'--non-interactive']);await m.start()
 let cookie=await m.owner(),req=(path,input)=>m.request(path,input,cookie),member=ok(await req('/api/session')).member
 ok(await req('/api/command',{type:'service',id:'transfer',name:'Transfer service',environment:'production',owner:member.id,runbook:['Retain this instruction'],pager:''}))
 const incident=ok(await req('/api/command',{type:'declare',service:'transfer',title:'Preserve authored history',severity:'warning',summary:'Archive proof',alerts:[]}))
 const schedule=ok(await req('/api/paging/schedules',{id:'transfer',name:'Transfer rota',service:'transfer',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[member.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}))
 const context=ok(await req('/api/handoffs/context/'+incident.id)),prepared=await req('/api/handoffs/prepare',{id:'archive-copy',incident:incident.id,incidentRevision:incident.revision,serviceHash:context.serviceHash,payload:{audience:'internal',title:'Exact copy',summary:'Authored transfer evidence',evidenceLinks:[],impactLinks:[]}})
 assert.equal(prepared.status,201);const record=prepared.value.record
 ok(await req('/api/handoffs/archive-copy/review',{actionId:'archive-review',revision:record.revision,payloadHash:record.payloadHash,sourceHash:record.sourceHash,reason:'Reviewed exact copy'}))
 cookie=await checkpointCli(m,cookie)
 const source=await readFile('tests/fixtures/opsgenie.json','utf8'),preview=ok(await req('/api/move-in/preview',{vendor:'opsgenie',source}));let job=ok(await req('/api/move-in/apply',{vendor:'opsgenie',source,fingerprint:preview.fingerprint,confirm:true}));while(job.state!=='completed')job=ok(await req(`/api/move-in/${job.id}/resume`,{vendor:'opsgenie'}))
 const at=Date.parse('2026-10-11T09:00:00Z'),pending={id:'held-pending',incident:incident.id,service:'transfer',revision:1,status:'pending',nextDue:at,createdAt:at,lastEvaluatedAt:at,currentStep:0,policy:{service:'transfer',scheduleId:'transfer',revision:1,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3},schedule,behaviors:{primary:'accepted',backup:'accepted'},steps:[],history:[{type:'created',at,actor:null,reason:null,attempt:null}]}
 sql("INSERT INTO paging_jobs VALUES('held-pending','"+incident.id+"','transfer',1,'pending',"+at+",'fixture','"+JSON.stringify(pending).replaceAll("'","''")+"')")
 const prior=ok(await req('/api/state')),objects=ok(await req('/api/move-in/objects'))
 await m.command(['dev','--stop']);await m.command(['export','--output',archive,'--non-interactive'])
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
 await mkdir('.rer/local',{recursive:true,mode:0o700});await writeFile(answers,JSON.stringify({OWNER_EMAIL:'new-owner@example.test'}),{mode:0o600});await m.command(['setup','--answers',answers,'--port',String(m.port),'--non-interactive']);await m.start();cookie=await m.owner()
 assert.equal(ok(await req('/api/session')).member,null,'new Base owner cannot silently claim restored identities')
 assert.equal((await req('/api/identity-link',{confirm:true,adminMapping:'missing-admin'})).status,409)
 sql("INSERT INTO credentials VALUES('"+member.id+"','fixture-salt','fixture-password-digest')")
 assert.equal((await req('/api/identity-link',{confirm:true,adminMapping:member.id})).status,409,'held password data cannot be claimed by a new native owner')
 sql('DELETE FROM credentials')
 ok(await req('/api/identity-link',{confirm:true,adminMapping:member.id}));assert.deepEqual(ok(await req('/api/state')),prior,'all relational coordination and attribution restored')
 assert.deepEqual(ok(await req('/api/move-in/objects')),objects,'paused import data restored with revisions')
 assert.equal(ok(await req('/api/move-in/jobs?vendor=opsgenie')).some(j=>j.id===job.id),true,'durable journal restored')
 const handoff=ok(await req('/api/handoffs/archive-copy'));assert.equal(handoff.record.held,true);assert.deepEqual(handoff.record.payload,record.payload);assert.equal((await req('/api/handoffs/archive-copy/export')).status,409,'restored approval cannot export until reviewed again')
 assert.equal((await req('/api/delivery',{})).status,409)
 // Erasing an imported person: a signed-out request and an unknown email are refused, the person leaves every table, and the archive made before the erasure is refused whole under the later journal.
 const erase=email=>req('/api/move-in/erase',{email,confirmation:'erase '+email})
 assert.equal((await m.request('/api/move-in/erase',{email:'alice@example.test',confirmation:'erase alice@example.test'})).status,401)
 assert.equal((await erase('nobody@example.test')).status,404)
 const erased=ok(await erase('alice@example.test'));assert.ok(erased.receiptId)
 assert.equal((await erase('alice@example.test')).status,404,'repeating an erasure changes nothing')
 await m.command(['dev','--stop']);await m.command(['export','--output',later,'--non-interactive']);await m.command(['reset','--yes','--non-interactive'])
 await m.command(['import','--input',archive,'--journal',later,'--yes','--non-interactive'],4)
 assert.equal(sql('SELECT COUNT(*) AS n FROM move_in_objects UNION ALL SELECT COUNT(*) FROM ik_jobs')[0].n,0,'the refused older archive restored nothing')
 await m.command(['import','--input',later,'--yes','--non-interactive'])
 assert.equal(sql("SELECT COUNT(*) AS n FROM move_in_objects WHERE id='alice@example.test'")[0].n,0)
 assert.equal(sql("SELECT COUNT(*) AS n FROM ik_jobs WHERE plan_json LIKE '%alice@example.test%'")[0].n,0)
 await m.command(['reset','--yes','--non-interactive'])
 console.log('Portable transfer passed: nonempty refusal, invalid-input rollback, full relational/history/journal restore, credential exclusion, paused timer, explicit new-owner mapping and held approval')
}finally{await m.close();await rm(answers,{force:true});await rm(archive,{force:true});await rm(corrupt,{force:true});await rm(invalidRecords,{force:true});await rm(later,{force:true})}
