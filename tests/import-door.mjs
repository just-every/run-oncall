import assert from 'node:assert/strict'
import {generateKeyPairSync,sign,createHash,randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {localWorker} from './worker.mjs'

// One public-door journey, with real D1 and only synthetic saved vendor exports.
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'})
const kid='synthetic-business-key',issuer='https://business.example.test',installationId=randomUUID()
const w=await localWorker({RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify({[kid]:publicKey.export({format:'jwk'})}),RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installationId})
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
function grant(action,namespace,extra={}) {
 const now=Math.floor(Date.now()/1000),payload={v:1,iss:issuer,aud:w.origin,installationId,email:w.vars.OWNER_EMAIL,jti:randomUUID(),iat:now,exp:now+300,action,namespace,maxBytes:512*1024,maxChunks:8,maxRecords:500,...extra}
 const signed=encode({alg:'ES256',typ:'rer-import-grant+jwt',kid})+'.'+encode(payload)
 return signed+'.'+sign('sha256',Buffer.from(signed),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url')
}
const call=(action,vendor,input,extra={},token=grant(action,vendor,extra))=>w.request('/api/rer/import/'+action,input,undefined,{Authorization:'Bearer '+token})
async function upload(vendor,bytes,name=vendor+'-saved.json') {
 let uploadId
 const totalChunks=Math.ceil(bytes.length/65536)
 for(let index=0;index<totalChunks;index++) {
  const chunk=bytes.subarray(index*65536,(index+1)*65536)
  const result=ok(await call('uploads',vendor,{uploadId,name,bundleSha256:digest(bytes),totalBytes:bytes.length,totalChunks,index,chunkSha256:digest(chunk),base64:chunk.toString('base64')}))
  uploadId=result.uploadId
 }
 return uploadId
}
// Base import-kit door/ADOPTING.md "Copyable public HTTP conformance", unchanged.
async function checkDoor({request, bytes, name, nativeSnapshot,
  assertApplied, assertUndone}) {
  const hash = b => createHash('sha256').update(b).digest('hex');
  const json = async (action, body, review, expected = 200) => {
    const response = await request(action, body, review);
    assert.equal(response.status, expected, `${action}: ${response.status}`);
    return response.json();
  };
  const until = async (action, body, review, state) => {
    for (let batch = 0; batch < 100; batch++) {
      const result = await json(action, body, review);
      if (result.job?.state === state) return result.job;
      assert.ok(['queued','applying','undoing'].includes(result.job?.state));
    }
    assert.fail(`${action} did not finish`);
  };
  assert.ok(bytes.length > 0);
  const before = await nativeSnapshot(), bundleSha256 = hash(bytes);
  const totalChunks = Math.ceil(bytes.length / 65536);
  let uploadId;
  for (let index = 0; index < totalChunks; index++) {
    const chunk = bytes.subarray(index * 65536, (index + 1) * 65536);
    const uploaded = await json('uploads', {uploadId, name, bundleSha256,
      totalBytes:bytes.length, totalChunks, index,
      chunkSha256:hash(chunk), base64:chunk.toString('base64')});
    uploadId = uploaded.uploadId;
  }
  const inventory = await json('uploads', {uploadId});
  assert.equal(inventory.complete, true);
  assert.equal(inventory.bundleSha256, bundleSha256);
  assert.equal(inventory.received.reduce((n,c) => n + c.size, 0), bytes.length);
  const plan = await json('plan', {uploadId});
  assert.equal(plan.bundleSha256, bundleSha256);
  assert.ok(plan.summary.sourceRecords > 0);
  assert.deepEqual(await nativeSnapshot(), before);
  const review = {fingerprint:plan.fingerprint,
    approvalRecordId:randomUUID(), approvedAt:new Date().toISOString()};
  const wrong = (plan.fingerprint[0] === '0' ? '1' : '0') + plan.fingerprint.slice(1);
  await json('apply', {planId:plan.planId, reviewedFingerprint:wrong}, review, 403);
  assert.deepEqual(await nativeSnapshot(), before);
  const job = await until('apply', {planId:plan.planId,
    reviewedFingerprint:plan.fingerprint}, review, 'completed');
  const status = await json('status', {planId:plan.planId});
  assert.equal(status.job.id, job.id);
  assert.equal(status.job.state, 'completed');
  const report = await json('reconcile', {planId:plan.planId});
  assert.equal(report.ok, true);
  assert.equal(report.fingerprint, plan.fingerprint);
  assert.equal(report.bundleSha256, bundleSha256);
  assert.equal(report.counts.sourceRecords, plan.summary.sourceRecords);
  assert.equal(report.counts.present + report.counts.explained, report.counts.sourceRecords);
  assert.equal(report.sourceIds.length, report.counts.sourceRecords);
  await assertApplied(before, await nativeSnapshot(), report);
  await until('undo', {planId:plan.planId}, undefined, 'undone');
  await assertUndone(before, await nativeSnapshot());
}
let browser
try {
 ok(await w.request('/api/rer/import/uploads',{}),404)
 const owner=await w.request('/auth/bootstrap',{token:w.vars.SETUP_TOKEN,displayName:'Oncall lead'},undefined,{'CF-Connecting-IP':'127.0.0.1'});ok(owner,303)
 const req=(path,input)=>w.request(path,input,owner.cookie)
 const session=ok(await req('/api/workspace'))
 assert.equal(session.member.role,'admin')
 ok(await w.request('/auth/settings/imports',{enabled:true}),401)
 assert.equal(ok(await req('/auth/settings/imports')).enabled,false)
 if(process.env.ONCALL_IMPORT_DOOR_BROWSER) {
  const {chromium}=await import('@playwright/test')
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 }
 const capture=browser?await import('./import-door-browser.mjs'):null
 const context=browser?await browser.newContext({baseURL:w.origin,viewport:{width:1440,height:1000}}):null
 if(context)await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:w.origin,httpOnly:true,sameSite:'Lax'}}))
 const page=context?await context.newPage():null
 if(page)await capture.settings(page,w.origin,'off')
 // Enable through the same owner setting used by its HTML form.
 if(page) {
  await page.getByRole('checkbox',{name:'Allow Business imports',exact:true}).check()
  await page.getByRole('button',{name:'Save import settings',exact:true}).click()
  await page.waitForURL(w.origin+'/auth/settings/identity')
 }else ok(await req('/auth/settings/imports',{enabled:true}))
 assert.equal(ok(await req('/auth/settings/imports')).enabled,true)
 if(page)await capture.settings(page,w.origin,'on')
 const member=ok(await req('/api/members',{name:'Workspace admin',password:'synthetic-import-door-password',role:'admin'}),201)
 const teammate=await w.request('/api/login',{name:member.name,password:'synthetic-import-door-password'});ok(teammate)
 ok(await w.request('/auth/settings/imports',{enabled:false},teammate.cookie),401)
 const planned={}
 for(const vendor of ['opsgenie','pagerduty']) {
  const bytes=await readFile(`tests/fixtures/${vendor}-saved.json`)
  const uploadId=await upload(vendor,bytes)
  const before=ok(await req('/api/move-in/objects'))
  const token=grant('plan',vendor),plan=ok(await call('plan',vendor,{uploadId},{},token))
  planned[vendor]=plan
  console.log(vendor+': uploaded and planned saved response')
  ok(await call('plan',vendor,{uploadId},{},token),403)
  assert.deepEqual(ok(await req('/api/move-in/objects')),before,'upload and planning write zero native targets')
  assert.ok(plan.counts.effects>0)
  const approval={fingerprint:plan.fingerprint,approvalRecordId:'synthetic-owner-approval-'+vendor,approvedAt:new Date().toISOString()}
  ok(await call('apply',vendor,{planId:plan.planId,reviewedFingerprint:'0'.repeat(64)},approval),403)
  let applied=ok(await call('apply',vendor,{planId:plan.planId,reviewedFingerprint:plan.fingerprint},approval))
  for(let batch=0;applied.job.state!=='completed'&&batch<30;batch++)applied=ok(await call('apply',vendor,{planId:plan.planId,reviewedFingerprint:plan.fingerprint},approval))
  assert.equal(applied.job.state,'completed')
  const status=ok(await call('status',vendor,{planId:plan.planId}))
  assert.equal(status.approval.approval_id,approval.approvalRecordId)
  const report=ok(await call('reconcile',vendor,{planId:plan.planId}))
  assert.equal(report.ok,true)
  console.log(vendor+': applied and reconciled paused objects')
  assert.equal(report.counts.sourceRecords,plan.counts.unique)
  const objects=ok(await req('/api/move-in/objects'))
  assert.ok(objects.some(row=>row.targetKind==='schedule'))
  assert.ok(objects.every(row=>row.value.paused===true&&row.value.paging===false&&row.value.login===false))
  const jobs=ok(await req('/api/move-in/jobs?vendor='+vendor)),job=jobs.find(j=>j.id===applied.job.id)
  assert.equal(job.principalId,session.member.id)
  assert.ok(job.businessApproval.includes(approval.fingerprint))
  assert.ok(job.businessApproval.includes(w.vars.OWNER_EMAIL))
  if(page)await capture.journal(page,w.origin,vendor,job.id,'completed')
  await w.stop();await w.start()
  let undone
  // Both the bearer route and the existing owner journal can undo a door job.
  if(vendor==='opsgenie') {
   undone=ok(await call('undo',vendor,{planId:plan.planId})).job
   for(let batch=0;undone.state!=='undone'&&batch<30;batch++)undone=ok(await call('undo',vendor,{planId:plan.planId})).job
  }else if(page) {
   await page.getByRole('button',{name:'Undo this import',exact:true}).click()
   await page.getByRole('status').filter({hasText:'Import journal'}).getByText(/undone/).first().waitFor()
   undone=ok(await call('status',vendor,{planId:plan.planId})).job
  }else {
   undone=ok(await req(`/api/move-in/${job.id}/undo`,{vendor,confirm:true}))
   for(let batch=0;undone.state!=='undone'&&batch<30;batch++)undone=ok(await req(`/api/move-in/${job.id}/undo`,{vendor,confirm:true}))
  }
  assert.equal(undone.state,'undone')
  console.log(vendor+': undo completed')
  assert.deepEqual(ok(await req('/api/move-in/objects')),before)
  if(page)await capture.journal(page,w.origin,vendor,job.id,'undone')
 }
 // A credential field reaches the same refusal as the ordinary saved-file door.
 const bad=await upload('pagerduty',Buffer.from(JSON.stringify({users:{users:[{id:'refused',email:'refused@example.test',api_key:'synthetic-example-refused'}]}})))
 ok(await call('plan','pagerduty',{uploadId:bad}),409)
 const retained=w.sql('SELECT COUNT(*) AS count FROM ik_door_uploads')[0].count
 assert.ok(retained>0,'original upload custody stays in this installation')
 // One server-owned allow-list resolves every grant's namespace: an unlisted one
 // is refused before any grant or upload row exists.
 const rows=()=>w.sql('SELECT (SELECT COUNT(*) FROM ik_door_grants) AS grants,(SELECT COUNT(*) FROM ik_door_uploads) AS uploads,(SELECT COUNT(*) FROM ik_door_plans) AS plans')[0]
 const held=rows()
 for(const namespace of ['servicenow','PagerDuty','__proto__','constructor','opsgenie,pagerduty'])
  assert.equal(ok(await call('uploads',namespace,{}),403).error,'unknown_import_source',namespace)
 assert.deepEqual(rows(),held,'refused namespaces write nothing')
 // A listed namespace is parsed by its own vendor's parser, as the owner's preview of the same bytes is.
 const opsgenieBytes=await readFile('tests/fixtures/opsgenie-saved.json')
 const crossed=ok(await call('plan','pagerduty',{uploadId:await upload('pagerduty',opsgenieBytes,'opsgenie-bytes.json')}))
 for(const [vendor,plan] of [['pagerduty',crossed],['opsgenie',planned.opsgenie]])
  assert.equal(plan.summary.sourceRecords,ok(await req('/api/move-in/preview',{vendor,source:opsgenieBytes.toString('utf8')})).items.length,vendor)
 assert.notEqual(crossed.summary.sourceRecords,planned.opsgenie.summary.sourceRecords,'each namespace has its own parser')
 console.log('Business import door: unlisted namespaces refused with no writes; each listed vendor parsed by its own parser')
 const response=r=>({status:r.status,json:async()=>r.value})
 await checkDoor({request:async(action,body,review)=>response(await call(action,'opsgenie',body,review)),bytes:await readFile('tests/fixtures/opsgenie.json'),name:'opsgenie.json',
  nativeSnapshot:async()=>ok(await req('/api/move-in/objects')),
  assertApplied:async(before,after,report)=>{
   assert.ok(after.length>before.length&&after.some(row=>row.targetKind==='schedule'),'applied paused schedules')
   assert.ok(after.every(row=>row.value.paused===true&&row.value.paging===false&&row.value.login===false))
   assert.ok(report.counts.present>0)
  },
  assertUndone:async(before,after)=>assert.deepEqual(after,before)})
 console.log('Business import door: ADOPTING.md public HTTP conformance passed')
 // Erasure with door custody present: an applied door import, its retained
 // uploads, plans and approvals, and an unapplied upload; Business is off.
 const people=[['u-al-0','al@example.test','Al Erased'],['u-sal-0','sal@example.test','Sal Kept'],['u-kai-0','kai@example.test','Kai Kept']]
 const crew=Buffer.from(JSON.stringify({users:{data:people.map(([id,username,fullName])=>({id,username,fullName}))},
  schedules:{data:[['al-rota',['u-al-0','u-kai-0']],['sal-rota',['u-sal-0','u-kai-0']]].map(([id,users])=>({id,name:id,timezone:'UTC',
   rotations:[{name:id+' turn',startDate:'2026-03-07T10:00:00Z',type:'daily',length:1,participants:users.map(id=>({type:'user',id}))}]}))}}))
 const crewPlan=ok(await call('plan','opsgenie',{uploadId:await upload('opsgenie',crew,'crew-export.json')}))
 const crewReview={fingerprint:crewPlan.fingerprint,approvalRecordId:'synthetic-owner-approval-crew',approvedAt:new Date().toISOString()}
 let crewJob=ok(await call('apply','opsgenie',{planId:crewPlan.planId,reviewedFingerprint:crewPlan.fingerprint},crewReview)).job
 for(let batch=0;crewJob.state!=='completed'&&batch<30;batch++)crewJob=ok(await call('apply','opsgenie',{planId:crewPlan.planId,reviewedFingerprint:crewPlan.fingerprint},crewReview)).job
 assert.equal(crewJob.state,'completed')
 await upload('pagerduty',Buffer.from(JSON.stringify({users:{users:[{id:'pd-al-0',email:'al@example.test',name:'Al Erased'}]}})),'pending-al.json')
 assert.ok(w.sql("SELECT COUNT(*) AS n FROM ik_door_chunks WHERE base64<>''")[0].n>0&&w.sql('SELECT COUNT(*) AS n FROM ik_door_approvals')[0].n>0)
 ok(await req('/auth/settings/imports',{enabled:false}))
 const everything=()=>{const columns=Map.groupBy(w.sql("SELECT m.name AS t,p.name AS c FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%' AND m.name NOT LIKE '_cf_%' AND m.name NOT LIKE 'd1_%'"),r=>r.t);return JSON.stringify(w.statements([...columns].map(([t,cs])=>`SELECT ${cs.map(({c})=>`CAST("${c}" AS TEXT)`).join(',')} FROM "${t}"`).join(';')))}
 const erasedValues=/(?<![\w.+-])al@example\.test|u-al-0|pd-al-0|Al Erased/i
 assert.match(everything(),erasedValues,'the scan sees the person in door custody before erasure')
 const receipt=ok(await req('/api/move-in/erase',{email:'al@example.test',confirmation:'erase al@example.test'}))
 assert.equal(receipt.importedUser,'removed');assert.equal(receipt.schedulesRewritten,1)
 assert.doesNotMatch(everything(),erasedValues,'no table, door upload or plan snapshot keeps a value of the erased person')
 assert.deepEqual(w.sql('SELECT (SELECT COUNT(*) FROM ik_door_uploads) AS uploads,(SELECT COUNT(*) FROM ik_door_chunks) AS chunks,(SELECT COUNT(*) FROM ik_door_plan_chunks) AS snapshots')[0],{uploads:0,chunks:0,snapshots:0},'door bundles and snapshots are withdrawn whole')
 const crewEntry=ok(await req('/api/move-in/jobs?vendor=opsgenie')).find(j=>j.id===crewJob.id)
 assert.ok(crewEntry.businessApproval.includes(crewPlan.fingerprint),'the surviving import is still listed via Business')
 ok(await req('/auth/settings/imports',{enabled:true}))
 assert.equal(ok(await call('reconcile','opsgenie',{planId:crewPlan.planId}),410).error,'snapshot_withdrawn')
 console.log('Business import door: person erasure with door custody present answered 200 and withdrew every door copy')
 if(page) {
  await page.goto(w.origin+'/auth/settings/identity')
  await page.getByLabel('Revoke grant key',{exact:true}).selectOption(kid)
  await page.getByRole('button',{name:'Save import settings',exact:true}).click()
  await page.getByText(/Revoked keys:/).waitFor()
 }else ok(await req('/auth/settings/imports',{enabled:true,revokeKid:kid}))
 assert.equal(ok(await req('/auth/settings/imports')).keys[0].revoked,true)
 if(page)await capture.settings(page,w.origin,'revoked')
 ok(await call('uploads','opsgenie',{uploadId:randomUUID()}),403)
 // Toggle off/on cannot resurrect a revoked signing key.
 ok(await req('/auth/settings/imports',{enabled:false}))
 ok(await call('uploads','opsgenie',{}),404)
 ok(await req('/auth/settings/imports',{enabled:true}))
 ok(await call('uploads','opsgenie',{}),403)
 ok(await req('/auth/signout',{}),204)
 ok(await req('/auth/settings/imports',{enabled:false}),401)
 console.log('Business import door: off 404, owner opt-in, both saved-response formats, zero native writes in plan, reviewed grants, replay refusal, reconcile, restart, door/owner undo and durable key revocation passed')
}finally{try{await browser?.close()}finally{await w.close()}}
