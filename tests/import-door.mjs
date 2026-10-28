import assert from 'node:assert/strict'
import {generateKeyPairSync,sign,createHash,randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {localWorker,ownerDoor} from './worker.mjs'
// import-door-catchup: part of this public journey.
// Part of the existing import-door registration. Only the signed HTTP client and
// owner-session public APIs cross this boundary; native observations never use SQL.
export async function standingCatchup({w,req,call,upload,ok,ownerId}) {
 const vendor='pagerduty',saved=JSON.parse(await readFile('tests/fixtures/pagerduty-saved.json','utf8'))
 const first=saved.schedules[0].schedule
 const users=Array.from({length:40},(_,i)=>({id:`synthetic-catchup-user-${i}`,name:`Synthetic responder ${i+1}`,email:`catchup-${i+1}@example.test`}))
 const schedules=Array.from({length:4},(_,i)=>{
  const schedule=structuredClone(first),pair=users.slice(i*2,i*2+2)
  schedule.id=`synthetic-catchup-rota-${i}`;schedule.name=`Synthetic rota ${i+1}`
  schedule.users=pair.map(user=>({id:user.id,type:'user_reference'}))
  schedule.schedule_layers[0].id=`synthetic-catchup-layer-${i}`
  schedule.schedule_layers[0].users=pair.map(user=>({user:{id:user.id,type:'user_reference'}}))
  // This saved rota has no overrides; its final response covers both daily turns.
  delete schedule.overrides_subschedule
  schedule.final_schedule.rendered_schedule_entries=[
   {start:'2026-03-07T09:00:00Z',end:'2026-03-08T09:00:00Z',user:{id:pair[0].id}},
   {start:'2026-03-08T09:00:00Z',end:'2026-03-09T09:00:00Z',user:{id:pair[1].id}},
  ]
  return {schedule}
 })
 const policies=Array.from({length:2},(_,i)=>({escalation_policy:{id:`synthetic-catchup-policy-${i}`,name:`Synthetic escalation ${i+1}`,num_loops:0,
  escalation_rules:[{id:`synthetic-catchup-step-${i}`,escalation_delay_in_minutes:5,targets:[{id:schedules[i].schedule.id,type:'schedule_reference'}]}]}}))
 const bundle={users:{users,more:false},schedules,escalation_policies:policies}
 const bytes=value=>Buffer.from(JSON.stringify(value))
 const objects=async()=>ok(await req('/api/move-in/objects'))
 const paging=async()=>ok(await req('/api/paging/state'))
 const nativeBefore=await objects(),pagingBefore=await paging()
 const silent=async()=>{
  const current=await paging()
  assert.equal(current.paging,'OFF');assert.deepEqual(current.jobs,pagingBefore.jobs);assert.deepEqual(current.receipts,pagingBefore.receipts)
  assert.deepEqual(current.callbacks,pagingBefore.callbacks)
  assert.ok((await objects()).every(row=>row.value.paused&&row.value.paging===false&&row.value.login===false))
 }
 const apply=async(plan,approval)=>{
  let job
  for(let batch=0;batch<100;batch++) {
   job=ok(await call('apply',vendor,{planId:plan.planId,reviewedFingerprint:plan.fingerprint},{...approval,fingerprint:plan.fingerprint})).job
   await silent()
   if(job.state==='completed')return job
   assert.ok(['queued','applying'].includes(job.state))
  }
  assert.fail('standing catch-up apply did not complete')
 }
 const undo=async plan=>{
  for(let batch=0;batch<100;batch++) {
   const job=ok(await call('undo',vendor,{planId:plan.planId})).job
   await silent()
   if(job.state==='undone')return
   assert.equal(job.state,'undoing')
  }
  assert.fail('standing catch-up undo did not complete')
 }
 const plan=async(value,extra={})=>call('plan',vendor,{uploadId:await upload(vendor,bytes(value),'synthetic-catchup-rota.json'),catchup:true},extra)
 const reconcile=async(plan,expected)=>{
  const report=ok(await call('reconcile',vendor,{planId:plan.planId}))
  assert.equal(report.ok,true);assert.equal(report.counts.sourceRecords,expected)
  assert.equal(report.sourceIds.length,expected)
  assert.equal(report.counts.present+report.counts.explained,expected)
  assert.equal(report.fingerprint,plan.fingerprint);assert.equal(report.bundleSha256,plan.bundleSha256)
 }
 const approval={approvalRecordId:'synthetic-catchup-first-1',approvedAt:new Date().toISOString()}
 const baseline=ok(await call('plan',vendor,{uploadId:await upload(vendor,bytes(bundle),'synthetic-catchup-rota.json')}))
 assert.equal(baseline.rejected.length,0);assert.deepEqual(await objects(),nativeBefore)
 await apply(baseline,approval)
 const baselineObjects=await objects(),count=users.length+schedules.length+policies.length
 assert.equal(baselineObjects.length-nativeBefore.length,count)
 await reconcile(baseline,count)
 // A human creates and then edits coverage through the ordinary native schedule
 // review/apply door between imports. Source catch-up must not overwrite it.
 const service='synthetic-catchup-service-1'
 ok(await req('/api/command',{type:'service',id:service,name:'Synthetic catch-up service',environment:'test',owner:ownerId,runbook:[],pager:'https://pager.example.test'}))
 const schedule=ok(await req('/api/paging/schedules',{id:'synthetic-catchup-native-1',name:'Human rota',service,revision:0,timezone:'UTC',validFrom:'2026-03-07T09:00:00Z',validUntil:null,
  primary:{anchorLocal:'2026-03-07T09:00',periodDays:1,members:[ownerId],ambiguity:'earlier'},backup:{anchorLocal:'2026-03-07T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}))
 const edit=async(schedule,name)=>{
  const input={schedule:{...schedule,name},from:Date.parse('2026-03-07T09:00:00Z'),to:Date.parse('2026-03-09T09:00:00Z')}
  const review=ok(await req(`/api/schedules/${encodeURIComponent(schedule.id)}/review`,input))
  return ok(await req(`/api/schedules/${encodeURIComponent(schedule.id)}/apply`,{...input,digest:review.digest,confirmed:true})).schedule
 }
 const edited=await edit(schedule,'Human-reviewed rota')
 const nativeSchedules=(await paging()).schedules
 assert.ok(nativeSchedules.some(row=>row.id===edited.id&&row.name===edited.name))
 const standing={catchup:'bounded',approvalRecordId:'synthetic-catchup-standing-1',approvedAt:new Date().toISOString()}
 const second=structuredClone(bundle)
 second.schedules[0].schedule.name='Synthetic replacement rota'
 second.users.users.push({id:'synthetic-catchup-added-1',name:'Synthetic new responder',email:'catchup-new@example.test'})
 const beforeSecond=await objects(),catchup=ok(await plan(second,standing))
 assert.deepEqual(await objects(),beforeSecond,'standing plan changes no native records')
 assert.equal(catchup.differences.replacements.length,1);assert.equal(catchup.differences.additions.length,1)
 assert.equal(catchup.rejected.length,0)
 // Approval identity and timestamp cannot be replaced between standing plan and apply.
 assert.equal(ok(await call('apply',vendor,{planId:catchup.planId,reviewedFingerprint:catchup.fingerprint},{...standing,fingerprint:catchup.fingerprint,approvalRecordId:'synthetic-catchup-other-1'}),403).error,'standing_approval_mismatch')
 assert.deepEqual(await objects(),beforeSecond)
 await apply(catchup,standing)
 await w.stop();await w.start()
 await reconcile(catchup,count+1)
 const secondObjects=await objects()
 assert.equal(secondObjects.length,baselineObjects.length+1)
 assert.equal(secondObjects.find(row=>row.targetId===`pagerduty:${schedules[0].schedule.id}`).value.schedule.name,second.schedules[0].schedule.name)
 assert.ok(secondObjects.some(row=>row.targetId==='catchup-new@example.test'&&row.value.name==='Synthetic new responder'))
 assert.deepEqual((await paging()).schedules,nativeSchedules)
 const third=structuredClone(second);third.schedules[0].schedule.name='Synthetic newest rota'
 const newest=ok(await plan(third,standing));await apply(newest,standing);await reconcile(newest,count+1)
 assert.equal(ok(await call('undo',vendor,{planId:catchup.planId}),409).error,'import_superseded')
 await undo(newest);assert.deepEqual(await objects(),secondObjects)
 await reconcile(catchup,count+1)
 await undo(catchup);assert.deepEqual(await objects(),baselineObjects)
 await reconcile(baseline,count)
 assert.deepEqual((await paging()).schedules,nativeSchedules)
 // Large changes and missing source records need an individually reviewed proposal.
 for(const [change,reason] of [
  [value=>value.schedules.forEach(({schedule})=>{schedule.name+=' changed'}),'change_must_be_under_five_percent'],
  [value=>value.users.users.pop(),'source_records_gone'],
 ]) {
  const value=structuredClone(bundle);change(value)
  assert.equal(ok(await plan(value,standing),409).error,'catchup_requires_proposal:'+reason)
  assert.deepEqual(await objects(),baselineObjects);await silent()
 }
 await undo(baseline);assert.deepEqual(await objects(),nativeBefore)
 assert.deepEqual((await paging()).schedules,nativeSchedules,'full layered undo retains the human schedule edit')
 console.log(`O2 standing lifecycle: baseline=${count}, replacement=1, addition=1, reconciled=${count+1}; newest-first undo restored ${nativeBefore.length} prior imported objects; native human edit kept`)
 // Adoption marks an imported object as hand-edited. A subsequent source change
 // cannot use standing approval to replace it, or undo the person's live coverage.
 const again=ok(await call('plan',vendor,{uploadId:await upload(vendor,bytes(bundle),'synthetic-catchup-rota.json')}))
 await apply(again,approval)
 const target=(await objects()).find(row=>row.targetId===`pagerduty:${schedules[0].schedule.id}`)
 const other=ok(await req('/api/members',{name:'Synthetic catch-up colleague',role:'responder',password:'synthetic-catchup-password-1'}),201)
 const adopted=ok(await req('/api/move-in/adopt',{id:target.targetId,revision:target.revision,service,members:{[users[0].email]:ownerId,[users[1].email]:other.id},confirm:true}),201).schedule
 const handEdited=await edit(adopted,'Human-edited adopted rota'),beforeConflict=await objects()
 const conflict=structuredClone(bundle);conflict.schedules[0].schedule.name='Source must not replace human edit'
 assert.equal(ok(await plan(conflict,standing),409).error,'catchup_requires_proposal:native_or_mapping_conflict')
 const report=ok(await call('reconcile',vendor,{planId:again.planId}))
 assert.equal(report.ok,false)
 assert.ok(report.sourceIds.some(row=>row.sourceId===schedules[0].schedule.id&&row.status==='mismatched'))
 assert.equal(ok(await call('undo',vendor,{planId:again.planId}),409).error,'native_edit_conflict')
 assert.deepEqual(await objects(),beforeConflict)
 assert.ok((await paging()).schedules.some(row=>row.id===handEdited.id&&row.name===handEdited.name))
 for(const path of ['/api/delivery','/api/paging/jobs','/api/paging/tick','/api/paging/callbacks'])ok(await req(path,{}),409)
 await silent()
 const erased=users.at(-1).email
 ok(await req('/api/move-in/erase',{email:erased,confirmation:'erase '+erased}))
 assert.ok(!(await objects()).some(row=>row.targetKind==='user'&&row.targetId===erased))
 const afterErasure=structuredClone(bundle);afterErasure.users.users.pop()
 const withdrawn=await objects()
 assert.equal(ok(await plan(afterErasure,standing),410).error,'snapshot_withdrawn')
 assert.deepEqual(await objects(),withdrawn,'standing approval cannot resurrect a gone native record or withdrawn baseline')
 await silent()
 console.log('O2 standing refusals: approval mismatch, outside allowance, source gone, native edit preserved and erased native record not resurrected; reconcile exposed the edit; paging OFF, no new jobs, receipts or callbacks')
}


// One public-door journey, with real D1 and only synthetic saved vendor exports.
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'})
const kid='synthetic-business-key',issuer='https://business.example.test',installationId=randomUUID()
const providerFixtures=Object.fromEntries(await Promise.all(['pagerduty','opsgenie'].map(async vendor=>[vendor,JSON.parse(await readFile(`tests/fixtures/${vendor}.json`,'utf8'))])))
const providerFetch=`const providerFixtures = __FIXTURES__;
let providerMode='normal',providerCalls=[],pkceChallenge='',pkceValid=false,revoked=0;
const actualFetch=globalThis.fetch;
globalThis.fetch=async(input,options={})=>{
 const url=new URL(String(input)),host=url.hostname;
 const allowed=['api.pagerduty.com','api.eu.pagerduty.com','api.opsgenie.com','api.eu.opsgenie.com','identity.pagerduty.com','identity.eu.pagerduty.com'];
 if(!allowed.includes(host))throw Error('Test provider saw an undeclared recipient');
 providerCalls.push({host,path:url.pathname,method:options.method,redirect:options.redirect,signal:!!options.signal});
 if(host.startsWith('identity.')){
  const fields=new URLSearchParams(options.body);
  if(url.pathname==='/oauth/token'){
   const verifier=fields.get('code_verifier'),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
   const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
   pkceValid=challenge===pkceChallenge;
   if(!pkceValid)return Response.json({error:'invalid_grant'},{status:400});
   return Response.json({access_token:'synthetic-provider-consent-private',token_type:'bearer',scope:'users.read schedules.read escalation_policies.read',expires_in:86400});
  }
  if(url.pathname==='/oauth/revoke'){if(providerMode==='revoke-failure')return Response.json({error:'refused '+fields.get('token')},{status:503});if(fields.get('token')!=='synthetic-provider-consent-private'||!options.headers.Authorization?.startsWith('Basic '))throw Error('Revocation did not authenticate');revoked++;return new Response(null,{status:200})}
  throw Error('Unexpected identity path');
 }
 const key=options.headers.Authorization?.split(' ').at(-1)??'';
 if(providerMode==='wrong-key')return Response.json({error:'refused '+key},{status:401});
 if(providerMode==='timeout')return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('Provider network failure '+key))));
 if(providerMode==='redirect')return new Response(null,{status:302,headers:{Location:'https://refused.example.test/steal'}});
 const vendor=host.includes('opsgenie')?'opsgenie':'pagerduty',ops=vendor==='opsgenie',fixture=providerFixtures[vendor];
 const users=ops?fixture.users.data:fixture.users,schedules=ops?fixture.schedules.data:fixture.schedules;
 const path=url.pathname,offset=Number(url.searchParams.get('offset')??0);
 const list=(kind,items)=>ops?{data:items,...(kind==='users'&&offset===0?{paging:{next:\`\${url.origin}\${path}?limit=1&offset=1\`}}:{})}:{[kind]:items,limit:1,offset,more:kind==='users'&&offset===0};
 let body;
 if(path.endsWith('/users')){
  if(providerMode==='many-pages')body=ops?{data:[{id:'many-'+offset,email:'many-'+offset+'@example.test'}],...(offset<44?{paging:{next:\`\${url.origin}\${path}?limit=1&offset=\${offset+1}\`}}:{})}:{users:[{id:'many-'+offset,email:'many-'+offset+'@example.test'}],limit:1,offset,more:offset<44};
  else if(providerMode==='too-many')body=ops?{data:Array.from({length:501},(_,i)=>({id:'large-'+i}))}:{users:Array.from({length:501},(_,i)=>({id:'large-'+i})),more:false};
  else if(providerMode==='too-big')body=ops?{data:[{id:'large',name:'x'.repeat(530000)}]}:{users:[{id:'large',name:'x'.repeat(530000)}],more:false};
  else if(providerMode==='echo'||providerMode==='encoded-echo')body=list('users',[{...users[0],name:providerMode==='echo'?key:encodeURIComponent(key)}]);
  else {body=list('users',[{...users[offset],apiKey:key}]);if(providerMode==='unsafe-page')body=ops?{...body,paging:{next:'https://refused.example.test/users'}}:{...body,more:true,limit:1,offset:0};}
 }else if(path.endsWith('/schedules'))body=list('schedules',schedules.map(({id})=>({id})));
 else if(path.endsWith('/overrides'))body=list('overrides',ops?fixture.overrides.data.filter(value=>path.includes(value.scheduleId)):[]);
 else if(path.endsWith('/timeline')){const id=decodeURIComponent(path.split('/').at(-2)),original=fixture.timelines.data;body={data:{...original,_parent:{id},...(id===original._parent.id?{}:{finalTimeline:{rotations:[]}})}};}
 else if(path.includes('/schedules/')){const schedule=schedules.find(value=>value.id===decodeURIComponent(path.split('/').at(-1)));body=ops?{data:schedule}:{schedule};}
 else if(path.endsWith('/escalations'))body=list('escalations',fixture.escalations.data);
 else if(path.endsWith('/escalation_policies'))body=list('escalation_policies',fixture.escalation_policies);
 else throw Error('Unexpected provider API path');
 if(providerMode==='header-key'){delete body.paging;return Response.json(body,{headers:{'x-paging-next':url.origin+url.pathname+'?offset=1&apiKey='+encodeURIComponent(key)}})}
 return Response.json(body);
};
`.replace('__FIXTURES__',JSON.stringify(providerFixtures))
const w=await localWorker({RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify({[kid]:publicKey.export({format:'jwk'})}),RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installationId,PAGERDUTY_OAUTH_CLIENT_ID:'synthetic-pagerduty-client',PAGERDUTY_OAUTH_CLIENT_SECRET:'synthetic-pagerduty-client-secret'},{fetchSource:providerFetch})
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
try {
 ok(await w.request('/api/rer/import/uploads',{}),404)
 const owner=await w.request('/auth/bootstrap',{token:w.vars.SETUP_TOKEN,displayName:'Oncall lead'},undefined,{'CF-Connecting-IP':'127.0.0.1'});ok(owner,303)
 const req=(path,input)=>w.request(path,input,owner.cookie),door=ownerDoor(w,owner.cookie)
 const session=ok(await req('/api/workspace'))
 assert.equal(session.member.role,'admin')
 // O2: the emitted read door and standalone exporter share the same provider fetch edge.
 {
  const responses=[],key='synthetic-provider+read-private',hosts=new Set(),counts=[];
  const control=async(mode='normal',extra={})=>ok(await w.request('/__provider_control',{mode,...extra}));
  const observed=async()=>ok(await w.request('/__provider_calls'));
  const heldState=ok(await req('/api/state'));
  w.sql('DROP TABLE oc_move_in_consent');
  w.statements(await readFile('migrations/core/0146_move_in_consent.sql','utf8'));
  assert.deepEqual(ok(await req('/api/state')),heldState,'the additive custody migration preserves held workspace records');
  const nativeBefore=ok(await req('/api/move-in/objects'));
  const viewer=ok(await req('/api/members',{name:'Read-only pull viewer',password:'synthetic-provider-viewer-password',role:'viewer'}),201);
  const viewing=await w.request('/api/login',{name:viewer.name,password:'synthetic-provider-viewer-password'});ok(viewing);
  ok(await w.request('/api/move-in/read',{source:'pagerduty',region:'us',key}),401);
  ok(await w.request('/api/move-in/read',{source:'pagerduty',region:'us',key},viewing.cookie),403);
  ok(await w.request('/api/move-in/read',{source:'pagerduty',region:'us',key},owner.cookie,{origin:'https://other.example.test'}),403);
  ok(await w.request('/api/logout',{},viewing.cookie));
  ok(await w.request('/api/move-in/read',{source:'pagerduty',region:'us',key},viewing.cookie),401);
  const expired=await w.request('/api/login',{name:viewer.name,password:'synthetic-provider-viewer-password'});ok(expired);
  w.sql(`UPDATE sessions SET expires=0 WHERE member='${viewer.id}'`);
  ok(await w.request('/api/move-in/read',{source:'pagerduty',region:'us',key},expired.cookie),401);
  for(const sessionCookie of [undefined,viewing.cookie,expired.cookie])ok(await w.request('/api/move-in/pagerduty/start',undefined,sessionCookie),401);
  assert.equal(ok(await req('/api/workspace')).moveIn.pagerdutyConnect,true);console.log('O2 workspace moveIn.pagerdutyConnect=true');
  for(const vendor of ['pagerduty','opsgenie'])for(const region of ['us','eu']) {
   await control('many-pages');let cursor,bundle;
   const auditBefore=w.sql("SELECT COUNT(*) AS n FROM oc_admin_audit WHERE kind LIKE 'move-in.read.%'")[0].n;
   do {
    const before=(await observed()).calls.length;
    const response=await req('/api/move-in/read',{source:vendor,region,key,...(cursor?{cursor}:{})});responses.push(JSON.stringify(response.value));
    const result=ok(response);cursor=result.next;
    bundle??=Object.fromEntries(Object.keys(result.part).map(kind=>[kind,[]]));
    for(const kind of Object.keys(bundle))bundle[kind].push(...result.part[kind]);
    const calls=(await observed()).calls,step=calls.length-before;counts.push(step);
    assert.ok(step>0&&step<=40,'each public read continuation is bounded');
    for(const call of calls){hosts.add(call.host);assert.equal(call.method,'GET');assert.equal(call.redirect,'manual');assert.equal(call.signal,true)}
    if(cursor){const altered=cursor.slice(0,-1)+(cursor.endsWith('0')?'1':'0');ok(await req('/api/move-in/read',{source:vendor,region,key,cursor:altered}),400)}
   }while(cursor);
   assert.ok(bundle.users.length>40,'the complete read survived its continuation');
   const finished=w.sql("SELECT kind FROM oc_admin_audit WHERE kind LIKE 'move-in.read.%'");
   assert.equal(finished.length,auditBefore+1,'one permanent audit fact per finished read');
   const fact=JSON.parse(finished.at(-1).kind.slice('move-in.read.'.length));assert.equal(fact.provider,vendor);assert.equal(fact.region,region);assert.equal(fact.counts.users,bundle.users.length);
  }
  for(const mode of ['wrong-key','redirect','too-many','too-big','echo','encoded-echo','unsafe-page','header-key','timeout']) {
   await control(mode);
   const started=performance.now();const result=await req('/api/move-in/read',{source:'opsgenie',region:'us',key});responses.push(JSON.stringify(result.value));if(mode==='timeout')console.log('O2 aborted provider request after '+Math.round(performance.now()-started)+' ms');
   ok(result,400);assert.equal(typeof result.value.error,'string');assert.ok(!result.value.error.includes(key));
   const calls=(await observed()).calls;assert.equal(calls.length,1,'refusal stops at the provider edge without following another host');
  }
  assert.deepEqual(ok(await req('/api/move-in/objects')),nativeBefore,'reading and refusing never import objects');
  console.log('O2 read door: steps='+counts.join(',')+'; non-admin 403, anonymous 401, cross-origin 403, wrong key, redirect, 501 objects, 512 KiB and echo refusals passed; hosts='+[...hosts].sort().join(','));
  // A local admin's cross-site top-level callback carries only the Lax transaction,
  // while the app session remains Strict. Do not attach that session by hand.
  const consentAdmin=ok(await req('/api/members',{name:'Consent local admin',password:'synthetic-consent-admin-password',role:'admin'}),201);
  const consentSession=await w.request('/api/login',{name:consentAdmin.name,password:'synthetic-consent-admin-password'});ok(consentSession);
  const consentReq=(path,input)=>w.request(path,input,consentSession.cookie);
  // PKCE, region binding, installation custody and both successful and abandoned-read revocation.
  for(const region of ['us','eu']) {
   await control();
   const start=await consentReq('/api/move-in/pagerduty/start?region='+region);ok(start,302);
   const address=new URL(start.headers.get('location'));assert.equal(address.hostname,region==='eu'?'identity.eu.pagerduty.com':'identity.pagerduty.com');assert.equal(address.searchParams.get('code_challenge_method'),'S256');assert.ok(address.searchParams.get('scope').split(' ').every(scope=>scope.endsWith('.read')));
   await control('normal',{challenge:address.searchParams.get('code_challenge')});
   const transaction=start.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
   const callback=await w.request('/api/move-in/pagerduty/callback?code=synthetic-consent-code&state='+address.searchParams.get('state'),undefined,transaction);ok(callback,302);
   assert.equal(callback.headers.get('location'),'/settings/move-in?connected=pagerduty');ok(await req(callback.headers.get('location')));
   const tokenCookie=callback.headers.getSetCookie().find(line=>line.startsWith('oncall_move_in_token='));
   assert.ok(/HttpOnly/i.test(tokenCookie)&&/SameSite=Lax/i.test(tokenCookie)&&/Path=\/api\/move-in\//i.test(tokenCookie));assert.ok(Number(tokenCookie.match(/Max-Age=(\d+)/)[1])<=600);assert.ok(!tokenCookie.includes('synthetic-provider-consent-private'));
   assert.equal((await observed()).pkceValid,true);
   const read=await w.request('/api/move-in/read',{source:'pagerduty',region},consentSession.cookie+'; '+tokenCookie.split(';')[0]);ok(read);responses.push(JSON.stringify(read.value));
   assert.equal(read.value.next,null);assert.ok(read.headers.getSetCookie().some(line=>line.startsWith('oncall_move_in_token=')&&/Max-Age=0/.test(line)));assert.ok((await observed()).revoked>0);
   assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_move_in_consent')[0].n,0);
  }
  // Demotion between start and the session-free callback is refused before any exchange.
  await control();const demotedStart=await consentReq('/api/move-in/pagerduty/start');ok(demotedStart,302);
  const demotedAddress=new URL(demotedStart.headers.get('location'));
  ok(await req('/api/command',{type:'member',id:consentAdmin.id,field:'role',from:'admin',to:'responder'}));
  const demotedReturn=await w.request('/api/move-in/pagerduty/callback?code=synthetic-demoted-code&state='+demotedAddress.searchParams.get('state'),undefined,demotedStart.cookie);ok(demotedReturn,302);
  assert.equal(demotedReturn.headers.get('location'),'/settings/move-in?connection=failed');
  assert.ok(!demotedReturn.headers.getSetCookie().some(line=>line.startsWith('oncall_move_in_token=')&&!/Max-Age=0/.test(line)));
  assert.equal((await observed()).calls.length,0,'a member no longer admin cannot exchange a code');
  assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_move_in_consent')[0].n,0);
  console.log('O2 local-admin consent: transaction-only cross-site callback succeeds; demotion redirects to connection=failed with zero exchanges and tokens');
  // Failed revocation is a durable failure, clears the browser cookie, and keeps only sealed custody for retry.
  await control();const failedStart=await req('/api/move-in/pagerduty/start');const failedAddress=new URL(failedStart.headers.get('location'));await control('normal',{challenge:failedAddress.searchParams.get('code_challenge')});
  const failedCallback=await w.request('/api/move-in/pagerduty/callback?code=synthetic-revocation-code&state='+failedAddress.searchParams.get('state'),undefined,failedStart.headers.getSetCookie().map(value=>value.split(';')[0]).join('; '));ok(failedCallback,302);
  const failedCookie=failedCallback.headers.getSetCookie().find(line=>line.startsWith('oncall_move_in_token='));await control('revoke-failure');
  const refusedClose=await w.request('/api/move-in/read',{source:'pagerduty',region:'us'},owner.cookie+'; '+failedCookie.split(';')[0]);ok(refusedClose,400);responses.push(JSON.stringify(refusedClose.value));
  assert.ok(refusedClose.headers.getSetCookie().some(line=>/Max-Age=0/.test(line)));assert.equal(w.sql("SELECT outcome FROM oc_admin_audit WHERE kind LIKE 'move-in.read.%' ORDER BY ordinal DESC LIMIT 1")[0].outcome,'failed');
  const retryLease=w.sql('SELECT revoke_at FROM oc_move_in_consent')[0];assert.ok(retryLease);await control();w.sql('UPDATE oc_move_in_consent SET revoke_at=0');ok(await w.request('/__provider_cron'));assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_move_in_consent')[0].n,0);
  console.log('O2 failed revocation: plain refusal, cleared cookie, permanent failed audit, sealed retry and scheduled cleanup passed');
  // A return that fails after the exchange (the lease cap is full) while PagerDuty refuses the revocation
  // sets no token, and keeps one sealed revocation duty that no cookie can read and the sweep retries.
  await control();const cappedStart=await req('/api/move-in/pagerduty/start');const cappedAddress=new URL(cappedStart.headers.get('location'));await control('revoke-failure',{challenge:cappedAddress.searchParams.get('code_challenge')});
  w.sql(`INSERT INTO oc_move_in_consent(id,custody,revoke_at,expires) VALUES ${Array.from({length:10},(_,n)=>`('synthetic-lease-${n}','synthetic-lease',${Date.now()+600000},${Date.now()+600000})`).join(',')}`);
  const cappedReturn=await w.request('/api/move-in/pagerduty/callback?code=synthetic-capped-code&state='+cappedAddress.searchParams.get('state'),undefined,cappedStart.headers.getSetCookie().map(value=>value.split(';')[0]).join('; '));ok(cappedReturn,302);
  assert.equal(cappedReturn.headers.get('location'),'/settings/move-in?connection=revoke-failed');
  assert.ok(!cappedReturn.headers.getSetCookie().some(line=>/^oncall_move_in_token=[^;]/.test(line)));
  w.sql("DELETE FROM oc_move_in_consent WHERE id LIKE 'synthetic-lease-%'");
  const duty=w.sql('SELECT custody FROM oc_move_in_consent');assert.equal(duty.length,1);assert.ok(!duty[0].custody.includes('synthetic-provider-consent-private'));
  const dutyRead=await w.request('/api/move-in/read',{source:'pagerduty',region:'us'},owner.cookie+'; oncall_move_in_token='+encodeURIComponent(duty[0].custody));ok(dutyRead,401);responses.push(JSON.stringify(dutyRead.value));
  const revokedBefore=(await observed()).revoked;await control();w.sql('UPDATE oc_move_in_consent SET revoke_at=0');ok(await w.request('/__provider_cron'));
  assert.equal((await observed()).revoked,revokedBefore+1);assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_move_in_consent')[0].n,0);
  console.log('O2 failed return, refused revocation: revoke-failed landing, no token cookie, one sealed duty no cookie can read, revoked by the sweep');
  // An abandoned consent is revoked by the existing scheduled handler, without a browser request.
  await control();const start=await req('/api/move-in/pagerduty/start');const address=new URL(start.headers.get('location'));await control('normal',{challenge:address.searchParams.get('code_challenge')});
  const callback=await w.request('/api/move-in/pagerduty/callback?code=synthetic-abandoned-code&state='+address.searchParams.get('state'),undefined,start.headers.getSetCookie().map(value=>value.split(';')[0]).join('; '));ok(callback,302);
  const pending=w.sql('SELECT custody,revoke_at,expires FROM oc_move_in_consent');assert.equal(pending.length,1);assert.ok(!pending[0].custody.includes('synthetic-provider-consent-private'));assert.ok(pending[0].expires-pending[0].revoke_at>0);
  const activeArchive=JSON.stringify(ok(await req('/api/archive')));assert.ok(!activeArchive.includes(pending[0].custody)&&!activeArchive.includes('synthetic-provider-consent-private'),'an active sealed connection is absent from the archive');
  w.sql('UPDATE oc_move_in_consent SET revoke_at=0');ok(await w.request('/__provider_cron'));assert.equal(w.sql('SELECT COUNT(*) AS n FROM oc_move_in_consent')[0].n,0);
  const audit=JSON.stringify(ok(await req('/api/audit/export'))),archive=JSON.stringify(ok(await req('/api/archive'))),logs=w.logs(),responseText=responses.join('\n');
  const secrets=[key,'synthetic-provider-consent-private',w.vars.PAGERDUTY_OAUTH_CLIENT_SECRET];const hits=text=>secrets.reduce((n,secret)=>n+text.split(secret).length-1,0);
  const exclusion={responses:hits(responseText),audit:hits(audit),archive:hits(archive),logs:hits(logs)};assert.deepEqual(exclusion,{responses:0,audit:0,archive:0,logs:0});
  console.log('O2 OC-042: PKCE US/EU, read-only scopes, sealed HttpOnly Lax /api/move-in cookie <=600s, clear and revoke, abandoned lease cleanup passed; secret hits='+JSON.stringify(exclusion));
 }

 ok(await w.request('/auth/settings/imports',{enabled:true}),401)
 assert.equal(ok(await req('/auth/settings/imports')).enabled,false)


 // Enable through the same owner setting used by its HTML form.
 ok(await req('/auth/settings/imports',{enabled:true}))
 assert.equal(ok(await req('/auth/settings/imports')).enabled,true)

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
  assert.ok(job.approval.startsWith('approved via Business by '+w.vars.OWNER_EMAIL))
  assert.ok(job.approval.includes(approval.fingerprint))
  assert.equal(job.door.business,true)

  await w.stop();await w.start()
  let undone
  // Both the bearer route and the existing owner journal can undo a door job.
  if(vendor==='opsgenie') {
   undone=ok(await call('undo',vendor,{planId:plan.planId})).job
   for(let batch=0;undone.state!=='undone'&&batch<30;batch++)undone=ok(await call('undo',vendor,{planId:plan.planId})).job
  }else {
   // The journal's Undo goes through the owner's own door; the old journal route refuses a door import.
   assert.equal(ok(await req(`/api/move-in/${job.id}/undo`,{vendor,confirm:true}),409).code,'IMPORT_DOOR_JOB')
   undone=ok(await door.undo(vendor,plan.planId)).job
  }
  assert.equal(undone.state,'undone')
  console.log(vendor+': undo completed')
  assert.deepEqual(ok(await req('/api/move-in/objects')),before)

 }
 // A credential field reaches the same refusal as the ordinary saved-file door.
 const bad=await upload('pagerduty',Buffer.from(JSON.stringify({users:{users:[{id:'refused',email:'refused@example.test',api_key:'synthetic-example-refused'}]}})))
 const credentialRefusal=ok(await call('plan','pagerduty',{uploadId:bad}),400)
 assert.match(credentialRefusal.error,/Credential-bearing field \"api_key\".*\/users\/users\/0\/api_key.*remove/)
 assert.equal(w.sql("SELECT COUNT(*) AS n FROM ik_door_uploads WHERE id='"+bad+"'")[0].n,0,'the refused signed upload and its raw credential bytes are withdrawn')
 const retained=w.sql('SELECT COUNT(*) AS count FROM ik_door_uploads')[0].count
 assert.ok(retained>0,'original upload custody stays in this installation')
 // One server-owned allow-list resolves every grant's namespace: an unlisted one
 // is refused before any grant or upload row exists.
 const rows=()=>w.sql('SELECT (SELECT COUNT(*) FROM ik_door_grants) AS grants,(SELECT COUNT(*) FROM ik_door_uploads) AS uploads,(SELECT COUNT(*) FROM ik_door_plans) AS plans')[0]
 const held=rows()
 for(const namespace of ['servicenow','PagerDuty','__proto__','constructor','opsgenie,pagerduty'])
  assert.equal(ok(await call('uploads',namespace,{}),403).error,'unknown_import_source',namespace)
 assert.deepEqual(rows(),held,'refused namespaces write nothing')
 // OC-038 a file saved with Opsgenie's data envelopes must not masquerade as PagerDuty.
 const opsgenieBytes=await readFile('tests/fixtures/opsgenie-saved.json')
 const beforeCross=w.sql('SELECT * FROM move_in_objects ORDER BY kind,id')
 const crossed=await call('plan','pagerduty',{uploadId:await upload('pagerduty',opsgenieBytes,'opsgenie-bytes.json')})
 ok(crossed,400)
 assert.match(crossed.value.error,/Opsgenie-shaped.*choose Opsgenie/)
 const wrongOwner=ok(await door.preview('pagerduty',opsgenieBytes),400)
 assert.match(wrongOwner.error,/Opsgenie-shaped.*choose Opsgenie/)
 assert.deepEqual(w.sql('SELECT * FROM move_in_objects ORDER BY kind,id'),beforeCross)
 const sameVendor=ok(await door.preview('opsgenie',opsgenieBytes))
 assert.equal(planned.opsgenie.summary.sourceRecords,sameVendor.items.length)
 assert.equal(ok(await door.call('opsgenie','undo',{planId:sameVendor.planId})).state,'cancelled')
 console.log('Business import door: unlisted namespaces and cross-vendor envelopes refused with no product writes; Opsgenie retains its own parser')
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
 // OC-038 the three additional namespaces obey the same signed-grant public door contract.
 for(const vendor of ['pagerduty','splunk','jsm','betterstack'])await checkDoor({request:async(action,body,review)=>response(await call(action,vendor,body,review)),bytes:await readFile(vendor==='pagerduty'?'tests/fixtures/pagerduty-account.json':`tests/fixtures/synthetic-oncall-${vendor}.json`),name:`synthetic-oncall-${vendor}.json`,
  nativeSnapshot:async()=>ok(await req('/api/move-in/objects')),
  assertApplied:async(before,after,report)=>{
   assert.ok(after.length>before.length);assert.ok(report.counts.explained>0)
   assert.ok(after.filter(row=>row.targetKind==='integration').every(row=>row.value.active===false&&row.value.incumbentKey==='not supplied'))
   assert.ok(after.every(row=>row.value.paused&&row.value.paging===false&&row.value.login===false))
  },assertUndone:async(before,after)=>assert.deepEqual(after,before)})
 console.log('OC-038 signed import door: PagerDuty account/Splunk/JSM/Better Stack reviewed grants, source reconciliation, inactive integration inventory and undo passed')

 // OC-038 whole-account catch-up uses the real signed door and the owner's existing journal.
 {
  const raw=await readFile('tests/fixtures/pagerduty-account.json'),saved=JSON.parse(raw),objects=()=>okSnapshot('/api/move-in/objects')
  async function okSnapshot(path){return ok(await req(path))}
  const baseline=await objects(),native=await okSnapshot('/api/state'),paging=await okSnapshot('/api/paging/state')
  const keyBearing=structuredClone(saved);keyBearing.services[0].services[0].integrations[0].integration_key='synthetic-oncall-grant-refused-key'
  const keyUpload=await upload('pagerduty',Buffer.from(JSON.stringify(keyBearing)),'pagerduty-key-refused.json')
  const keyRefused=ok(await call('plan','pagerduty',{uploadId:keyUpload}),400)
  assert.match(keyRefused.error,/integration_key.*\/services\/0\/services\/0\/integrations\/0\/integration_key.*remove/)
  assert.equal(w.sql("SELECT COUNT(*) AS n FROM ik_door_chunks WHERE upload_id='"+keyUpload+"'")[0].n,0,'the signed door also withdraws refused credential bytes')
  assert.equal(w.sql("SELECT COUNT(*) AS n FROM ik_door_uploads WHERE id='"+keyUpload+"'")[0].n,0)
  assert.deepEqual(await objects(),baseline)
  const savedUpload=await upload('pagerduty',raw,'pagerduty-account.json'),plan=ok(await call('plan','pagerduty',{uploadId:savedUpload}))
  const approval={fingerprint:plan.fingerprint,approvalRecordId:'synthetic-oncall-account-approval',approvedAt:new Date().toISOString()}
  // An authority change at SQL publication is rechecked inside the committing batch.
  w.sql('CREATE TRIGGER synthetic_pd_revocation AFTER INSERT ON ik_jobs BEGIN UPDATE ik_door_settings SET enabled=0; END')
  const denied=await call('apply','pagerduty',{planId:plan.planId,reviewedFingerprint:plan.fingerprint},approval)
  assert.equal(denied.status,409)
  assert.deepEqual(await objects(),baseline,'publication-time authority revocation rolls back every imported row')
  assert.equal(ok(await req('/auth/settings/imports')).enabled,true,'the injected authority revocation itself rolls back with the rejected transaction')
  w.sql('DROP TRIGGER synthetic_pd_revocation')
  // A failed publication cannot alter a prior committed baseline.
  const afterDenied=ok(await call('plan','pagerduty',{uploadId:savedUpload}))
  const afterApproval=afterDenied.planId===plan.planId?approval:{fingerprint:afterDenied.fingerprint,approvalRecordId:'synthetic-oncall-account-replanned',approvedAt:new Date().toISOString()}
  w.sql("CREATE TRIGGER synthetic_pd_failure BEFORE INSERT ON move_in_objects BEGIN SELECT RAISE(ABORT,'SYNTHETIC_PD_PUBLICATION_FAILURE'); END")
  assert.equal(ok(await call('apply','pagerduty',{planId:afterDenied.planId,reviewedFingerprint:afterDenied.fingerprint},afterApproval),409).error,'import_door_apply_constraint','the injected native publication failure, rather than a changed approval, refuses the batch')
  w.sql('DROP TRIGGER synthetic_pd_failure')
  assert.deepEqual(await objects(),baseline);assert.deepEqual(await okSnapshot('/api/state'),native);assert.deepEqual(await okSnapshot('/api/paging/state'),paging)
  const reviewed=ok(await call('plan','pagerduty',{uploadId:savedUpload}));assert.notEqual(reviewed.planId,afterDenied.planId,'a failed publication needs a new reviewed plan')
  const accepted={fingerprint:reviewed.fingerprint,approvalRecordId:'synthetic-oncall-account-final',approvedAt:new Date().toISOString()}
  const input={planId:reviewed.planId,reviewedFingerprint:reviewed.fingerprint}
  let job=ok(await call('apply','pagerduty',input,accepted)).job
  assert.ok(['queued','applying'].includes(job.state),'the account pauses between bounded HTTP apply steps')
  const partial=await objects();assert.ok(partial.length>baseline.length)
  await w.stop();await w.start();assert.deepEqual(await objects(),partial)
  for(let batch=0;job.state!=='completed'&&batch<30;batch++)job=ok(await call('apply','pagerduty',input,accepted)).job
  assert.equal(job.state,'completed')
  const initial=await objects()
  assert.deepEqual(await okSnapshot('/api/state'),native);assert.deepEqual(await okSnapshot('/api/paging/state'),paging)
  const report=ok(await call('reconcile','pagerduty',{planId:reviewed.planId}))
  assert.equal(report.ok,true);assert.equal(report.counts.present+report.counts.explained,report.counts.sourceRecords)
  // The exact same bytes through the owner are a zero-change catch-up.
  const reused=ok(await door.preview('pagerduty',raw));assert.equal(reused.planId,reviewed.planId)
  ok(await door.apply('pagerduty',reused));assert.deepEqual(await objects(),initial)
  const repeated=ok(await door.call('pagerduty','plan',{uploadId:savedUpload,catchup:true}))
  assert.deepEqual([repeated.summary.created,repeated.summary.updated,repeated.summary.gone],[0,0,0])
  assert.equal(repeated.summary.unchanged,reviewed.summary.sourceRecords)
  ok(await door.apply('pagerduty',repeated));assert.deepEqual(await objects(),initial)
  ok(await door.undo('pagerduty',repeated.planId))
  // One new person, one changed person, a changed locally edited person and one absent person.
  const changed=structuredClone(saved),first=changed.users[0].users[0],edited=changed.users[0].users[1],gone=changed.users.at(-1).user
  first.name='Ari updated in PagerDuty';edited.name='Bea updated in PagerDuty'
  changed.users.pop()
  changed.users.push({user:{id:'synthetic-oncall-catchup-user',type:'user',email:'pd.catchup@example.test',name:'New PagerDuty person',contact_methods:[],notification_rules:[]}})
  // Remove the missing person's source references so this remains a self-contained saved account.
  const replaceRefs=value=>{
   if(Array.isArray(value))return value.map(replaceRefs)
   if(value&&typeof value==='object')return value.id===gone.id?{...value,id:first.id}:Object.fromEntries(Object.entries(value).map(([key,child])=>[key,replaceRefs(child)]))
   return value
  }
  const changedRaw=JSON.stringify(replaceRefs(changed)),editedRow=initial.find(row=>row.targetKind==='user'&&row.targetId===edited.email)
  w.sql(`UPDATE move_in_objects SET data=json_set(data,'$.name','Bea edited in Oncall'),revision='synthetic-oncall-native-edit' WHERE kind='user' AND id='${edited.email}'`)
  const catchup=ok(await door.preview('pagerduty',changedRaw))
  assert.ok(catchup.summary.created>0);assert.ok(catchup.summary.updated>0);assert.equal(catchup.summary.gone,1)
  assert.ok(catchup.differences.gone.some(row=>row.sourceId===gone.id||JSON.stringify(row).includes(gone.id)))
  const conflict=catchup.items.find(item=>item.kind==='users'&&item.id===edited.id)
  assert.match(conflict.rejection,/Native edit conflict/);assert.equal(conflict.name,edited.name);assert.equal(conflict.effects.length,0)
  ok(await door.apply('pagerduty',catchup))
  const after=await objects()
  assert.equal(after.find(row=>row.targetId===first.email).value.name,first.name)
  assert.equal(after.find(row=>row.targetId===edited.email).value.name,'Bea edited in Oncall')
  assert.ok(after.some(row=>row.targetId==='pd.catchup@example.test'))
  assert.ok(after.some(row=>row.targetId===gone.email),'absent source objects are listed and never deleted')
  // Undo reverses only unchanged imported effects; a native edit is a named strict conflict and is preserved.
  const added=after.find(row=>row.targetId==='pd.catchup@example.test')
  w.sql("UPDATE move_in_objects SET data=json_set(data,'$.name','Native catch-up edit'),revision='synthetic-oncall-undo-edit' WHERE kind='user' AND id='pd.catchup@example.test'")
  const beforeUndo=await objects(),blocked=ok(await door.call('pagerduty','undo',{planId:catchup.planId}),409)
  assert.equal(blocked.code,'NATIVE_EDIT_CONFLICT');assert.ok(blocked.error.includes('pd.catchup@example.test'))
  assert.deepEqual(await objects(),beforeUndo,'undo never overwrites a native edit or partially reverses a strict import')
  w.sql(`UPDATE move_in_objects SET data='${JSON.stringify(added.value).replaceAll("'","''")}',revision='${added.revision}' WHERE kind='user' AND id='pd.catchup@example.test'`)
  assert.equal(ok(await door.undo('pagerduty',catchup.planId)).job.state,'undone')
  assert.ok(!(await objects()).some(row=>row.targetId==='pd.catchup@example.test'))
  assert.equal((await objects()).find(row=>row.targetId===first.email).value.name,initial.find(row=>row.targetId===first.email).value.name)
  assert.equal((await objects()).find(row=>row.targetId===edited.email).value.name,'Bea edited in Oncall','the conflicted person was never owned by the catch-up')
  // Restore the deliberate native edit before undoing the original baseline.
  w.sql(`UPDATE move_in_objects SET data='${JSON.stringify(editedRow.value).replaceAll("'","''")}',revision='${editedRow.revision}' WHERE kind='user' AND id='${edited.email}'`)
  ok(await door.undo('pagerduty',reviewed.planId));assert.deepEqual(await objects(),baseline)
  console.log('OC-038 PagerDuty account HTTP: upload/plan, publication revocation and failure rollback, bounded apply/restart/reconcile, identical-byte idempotence, catch-up addition/replacement/gone/native conflict and guarded undo passed')
 }
 // The move-in screen's own path: the same door through the owner's session, the same allow-list and one history.
 const viewer=ok(await req('/api/members',{name:'Door viewer',password:'synthetic-import-door-password',role:'viewer'}),201)
 const viewing=await w.request('/api/login',{name:viewer.name,password:'synthetic-import-door-password'});ok(viewing)
 const custody=()=>w.sql('SELECT (SELECT COUNT(*) FROM ik_door_uploads) AS uploads,(SELECT COUNT(*) FROM ik_door_plans) AS plans,(SELECT COUNT(*) FROM ik_jobs) AS jobs')[0],untouched=custody()
 const fixture=await readFile('tests/fixtures/opsgenie.json')
 ok(await door.preview('opsgenie',fixture,null),401)
 ok(await door.preview('opsgenie',fixture,viewing.cookie),403)
 ok(await w.request('/api/operator/import/uploads',{},owner.cookie,{'X-Import-Source':'opsgenie',origin:'https://elsewhere.example.test'}),403)
 for(const namespace of ['servicenow','PagerDuty','__proto__','opsgenie,pagerduty',''])assert.equal(ok(await door.call(namespace,'uploads',{}),400).error,'unknown_import_source',namespace)
 assert.deepEqual(custody(),untouched,'refused owner requests write nothing')
 await checkDoor({request:async(action,body)=>response(await door.call('opsgenie',action,body)),bytes:fixture,name:'opsgenie.json',
  nativeSnapshot:async()=>ok(await req('/api/move-in/objects')),
  assertApplied:async(before,after,report)=>{
   assert.ok(after.length>before.length&&after.every(row=>row.value.paused===true&&row.value.paging===false&&row.value.login===false))
   const owned=ok(await req('/api/move-in/jobs?vendor=opsgenie')).find(j=>j.door?.planId===report.planId)
   assert.ok(owned.approval.startsWith('approved by '+w.vars.OWNER_EMAIL+' at '),'the owner\'s import is approved by the owner, not via Business')
   assert.equal(owned.door.business,false)
  },
  assertUndone:async(before,after)=>assert.deepEqual(after,before)})
 const history=ok(await req('/api/move-in/jobs?vendor=opsgenie')).map(j=>j.approval)
 assert.ok(history.some(caption=>caption?.startsWith('approved by '))&&history.some(caption=>caption?.startsWith('approved via Business by ')),'one journal lists owner and Business imports together')
 console.log('Owner import door: ADOPTING.md public HTTP conformance passed; signed-out 401, non-admin 403, cross-origin 403 and unlisted sources 400 wrote nothing; one history for owner and Business imports')
 // A Business apply the door declares failed stays failed: the journal offers no resume, the old route refuses it,
 // and Business plans the same upload again on an intact lineage.
 const failing=Buffer.from(JSON.stringify({users:{users:[{id:'pd-fail-0',email:'fail@example.test',name:'Fail Once'}]}}))
 const failingUpload=await upload('pagerduty',failing,'failing.json'),failed=ok(await call('plan','pagerduty',{uploadId:failingUpload}))
 const failedReview={fingerprint:failed.fingerprint,approvalRecordId:'synthetic-owner-approval-failing',approvedAt:new Date().toISOString()}
 w.sql("CREATE TRIGGER injected_door_failure BEFORE INSERT ON move_in_objects BEGIN SELECT RAISE(ABORT,'INJECTED_DOOR_FAILURE'); END")
 assert.equal(ok(await call('apply','pagerduty',{planId:failed.planId,reviewedFingerprint:failed.fingerprint},failedReview),409).error,'import_door_apply_constraint')
 w.sql('DROP TRIGGER injected_door_failure')
 assert.equal(ok(await call('apply','pagerduty',{planId:failed.planId,reviewedFingerprint:failed.fingerprint},failedReview),409).error,'import_door_plan_failed')
 const failedJob=ok(await req('/api/move-in/jobs?vendor=pagerduty')).find(j=>j.door?.planId===failed.planId)
 assert.equal(failedJob.state,'failed');assert.equal(failedJob.door.business,true);assert.match(failedJob.approval,/^approved, then failed \(import_door_apply_constraint\) via Business by /)
 assert.equal(ok(await req(`/api/move-in/${failedJob.id}/resume`,{vendor:'pagerduty'}),409).code,'IMPORT_DOOR_JOB')
 assert.equal(ok(await call('status','pagerduty',{planId:failed.planId})).job.state,'failed','the old journal route cannot complete a failed door job')

 const retried=ok(await call('plan','pagerduty',{uploadId:failingUpload}))
 assert.notEqual(retried.planId,failed.planId)
 const retriedReview={fingerprint:retried.fingerprint,approvalRecordId:'synthetic-owner-approval-retry',approvedAt:new Date().toISOString()}
 let retriedJob=ok(await call('apply','pagerduty',{planId:retried.planId,reviewedFingerprint:retried.fingerprint},retriedReview)).job
 for(let batch=0;retriedJob.state!=='completed'&&batch<30;batch++)retriedJob=ok(await call('apply','pagerduty',{planId:retried.planId,reviewedFingerprint:retried.fingerprint},retriedReview)).job
 assert.equal(ok(await call('reconcile','pagerduty',{planId:retried.planId})).ok,true)
 assert.equal(ok(await door.undo('pagerduty',retried.planId)).job.state,'undone')
 console.log('Business import door: a failed apply stayed failed (no journal resume, old route 409) and a new plan of the same upload applied, reconciled and undid')
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
 const everything=()=>{const columns=Map.groupBy(w.sql("SELECT m.name AS t,p.name AS c FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%' AND m.name NOT LIKE '_cf_%' AND m.name NOT LIKE 'd1_%'"),r=>r.t);return JSON.stringify(w.statements([...columns].map(([t,cs])=>`SELECT ${cs.map(({c})=>`CAST("${c}" AS TEXT)`).join(',')} FROM "${t}"`).join(';')))
  // Uploaded bundles are stored base64-encoded: read them decoded too.
  +w.sql('SELECT base64 FROM ik_door_chunks ORDER BY upload_id,ordinal').map(row=>Buffer.from(row.base64,'base64').toString('utf8')).join('\n')}
 const erasedValues=/(?<![\w.+-])al@example\.test|u-al-0|pd-al-0|Al Erased/i
 assert.match(everything(),erasedValues,'the scan sees the person in door custody before erasure')
 // People held only in door custody: Business's unapproved catch-up adding zed, then an upload holding yan that was never
 // planned. Each erasure withdraws every door bundle whole, so each person is planted before their own erasure.
 const withZed=JSON.parse(crew);withZed.users.data.push({id:'u-zed-0',username:'zed@example.test',fullName:'Zed Pending'})
 const plant={'zed@example.test':async()=>assert.equal(ok(await call('plan','opsgenie',{uploadId:await upload('opsgenie',Buffer.from(JSON.stringify(withZed)),'zed-export.json'),catchup:true})).differences.additions.length,1),
  'yan@example.test':()=>upload('pagerduty',Buffer.from(JSON.stringify({users:{users:[{id:'pd-yan-0',email:'yan@example.test',name:'Yan Pending'}]}})),'pending-yan.json')}
 for(const [email,values] of [['zed@example.test',/zed@example\.test|u-zed-0|Zed Pending/i],['yan@example.test',/yan@example\.test|pd-yan-0|Yan Pending/i]]) {
  ok(await req('/auth/settings/imports',{enabled:true}));await plant[email]();ok(await req('/auth/settings/imports',{enabled:false}))
  assert.match(everything(),values,'the scan sees '+email+' in door custody before erasure')
  const held=ok(await req('/api/move-in/erase',{email,confirmation:'erase '+email}))
  assert.equal(held.importedUser,'not applied')
  assert.doesNotMatch(everything(),values,'no door upload or plan snapshot keeps a value of '+email)
  ok(await req('/api/move-in/erase',{email,confirmation:'erase '+email}),404)
 }
 const receipt=ok(await req('/api/move-in/erase',{email:'al@example.test',confirmation:'erase al@example.test'}))
 assert.equal(receipt.importedUser,'removed');assert.equal(receipt.schedulesRewritten,1)
 assert.doesNotMatch(everything(),erasedValues,'no table, door upload or plan snapshot keeps a value of the erased person')
 assert.deepEqual(w.sql('SELECT (SELECT COUNT(*) FROM ik_door_uploads) AS uploads,(SELECT COUNT(*) FROM ik_door_chunks) AS chunks,(SELECT COUNT(*) FROM ik_door_plan_chunks) AS snapshots')[0],{uploads:0,chunks:0,snapshots:0},'door bundles and snapshots are withdrawn whole')
 const crewEntry=ok(await req('/api/move-in/jobs?vendor=opsgenie')).find(j=>j.id===crewJob.id)
 assert.ok(crewEntry.approval.startsWith('approved via Business by ')&&crewEntry.approval.includes(crewPlan.fingerprint),'the surviving import is still listed via Business')
 ok(await req('/auth/settings/imports',{enabled:true}))
 assert.equal(ok(await call('reconcile','opsgenie',{planId:crewPlan.planId}),410).error,'snapshot_withdrawn')
 // The source's live import can no longer be compared with a new file, so the owner's next file starts a new baseline beside it.
 const after=ok(await door.preview('opsgenie',JSON.stringify({users:{data:[{id:'u-new-0',username:'new@example.test',fullName:'New After Erasure'}]}})))
 assert.deepEqual([after.summary.created,after.summary.updated,after.summary.gone],[1,0,0])
 assert.equal(ok(await door.apply('opsgenie',after)).job.state,'completed')
 assert.ok(ok(await req('/api/move-in/objects')).some(row=>row.targetId==='new@example.test'))
 assert.equal(ok(await door.undo('opsgenie',after.planId)).job.state,'undone')
 console.log('Business import door: person erasure with door custody present answered 200 and withdrew every door copy')
 await standingCatchup({w,req,call,upload,ok,ownerId:session.member.id})
 ok(await req('/auth/settings/imports',{enabled:true,revokeKid:kid}))
 assert.equal(ok(await req('/auth/settings/imports')).keys[0].revoked,true)

 ok(await call('uploads','opsgenie',{uploadId:randomUUID()}),403)
 // Toggle off/on cannot resurrect a revoked signing key.
 ok(await req('/auth/settings/imports',{enabled:false}))
 ok(await call('uploads','opsgenie',{}),404)
 ok(await req('/auth/settings/imports',{enabled:true}))
 ok(await call('uploads','opsgenie',{}),403)
 ok(await req('/auth/signout',{}),204)
 ok(await req('/auth/settings/imports',{enabled:false}),401)
 console.log('Business import door: off 404, owner opt-in, both saved-response formats, zero native writes in plan, reviewed grants, replay refusal, reconcile, restart, door/owner undo and durable key revocation passed')
}finally{try{}finally{await w.close()}}

// Adopt reviewed imports into live schedules; retain unconvertible evidence and guarded undo.
{
const {default:assert}=await import('node:assert/strict')
const {readFile}=await import('node:fs/promises')
const {localWorker,ownerDoor}=await import('./worker.mjs')

const w=await localWorker()
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value}
try {
 const owner=await w.request('/api/setup',{name:'Admin',password:'synthetic-local-testing-password'})
 const admin=ok(owner).member,req=(path,input)=>w.request(path,input,owner.cookie),door=ownerDoor(w,owner.cookie)
 const alice=ok(await req('/api/members',{name:'Alice',password:'synthetic-local-testing-password',role:'responder'}),201)
 const bob=ok(await req('/api/members',{name:'Bob',password:'synthetic-local-testing-password',role:'responder'}),201)
 const viewer=ok(await req('/api/members',{name:'Viewer',password:'synthetic-local-testing-password',role:'viewer'}),201)
 ok(await req('/api/command',{type:'service',id:'checkout',name:'Checkout',environment:'production',owner:admin.id,runbook:['Verify recovery'],pager:'https://pager.example.test'}))
 const bundle=JSON.parse(await readFile('tests/fixtures/opsgenie.json','utf8'))
 bundle.schedules.data=bundle.schedules.data.slice(0,1)
 bundle.schedules.data[0].enabled=true
 bundle.escalations.data=bundle.escalations.data.slice(0,1)
 bundle.escalations.data[0].rules[0].delay.timeAmount=0
 const source=JSON.stringify(bundle),review=ok(await door.preview('opsgenie',source))
 assert.equal(review.items.find(i=>i.kind==='users').name,bundle.users.data[0].fullName,'preview identifies the person by name')
 const policy=review.items.find(i=>i.kind==='escalations')
 assert.equal(policy.rejection,undefined)
 assert.equal(policy.effects[0].value.steps[0].delayMinutes,1,'immediate source step has the documented paused mapping')
 assert.ok(policy.unmapped.some(d=>d.field==='rules.0.delay'&&/not equivalent/.test(d.reason)),'review makes the timing change explicit')
 assert.ok(review.items.find(i=>i.kind==='schedules').unmapped.every(d=>!d.reason.includes('Overrides must be supplied')))
 assert.equal(ok(await door.apply('opsgenie',review)).job.state,'completed')
 const imported=()=>req('/api/move-in/objects').then(ok)
 const row=(await imported()).find(o=>o.targetKind==='schedule')
 const input={id:row.targetId,revision:row.revision,service:'checkout',members:{'alice@example.test':alice.id,'bob@example.test':bob.id},confirm:true}
 const reader=await w.request('/api/login',{name:'Viewer',password:'synthetic-local-testing-password'});ok(reader)
 ok(await w.request('/api/move-in/adopt',input),401)
 ok(await w.request('/api/move-in/adopt',input,reader.cookie),403)
 ok(await w.request('/api/move-in/adoption',undefined,reader.cookie),403)
 const revoked=await w.request('/api/login',{name:'Admin',password:'synthetic-local-testing-password'});ok(revoked)
 ok(await w.request('/api/logout',{},revoked.cookie))
 ok(await w.request('/api/move-in/adopt',input,revoked.cookie),401)
 ok(await req('/api/move-in/adopt',{...input,confirm:false}),409)
 ok(await req('/api/move-in/adopt',{...input,members:{'alice@example.test':alice.id}}),400)
 ok(await req('/api/move-in/adopt',{...input,members:{...input.members,'bob@example.test':viewer.id}}),400)
 ok(await req('/api/move-in/adopt',{...input,members:{...input.members,'bob@example.test':alice.id}}),400)
 ok(await req('/api/move-in/adopt',{...input,service:'missing-service'}),400)
 ok(await req('/api/move-in/adopt',{...input,revision:'stale'}),409)
 assert.equal(ok(await req('/api/paging/state')).schedules.length,0,'refused mappings never publish coverage')
 const options=ok(await req('/api/move-in/adoption'))
 assert.ok(options.services.some(s=>s.id===input.service));assert.ok(!options.members.some(m=>m.id===viewer.id))
 // A failure after the schedule insert must roll back the schedule, source edit marker and control revision.
 const before=ok(await req('/api/paging/state')),beforeCoordination=ok(await req('/api/state'))
 w.sql("CREATE TRIGGER injected_adoption_failure BEFORE UPDATE ON move_in_objects WHEN NEW.kind='schedule' BEGIN SELECT RAISE(ABORT,'INJECTED_ADOPTION_FAILURE'); END")
 ok(await req('/api/move-in/adopt',input),503)
 assert.deepEqual(ok(await req('/api/paging/state')),before)
 assert.deepEqual(ok(await req('/api/state')),beforeCoordination,'failed adoption records no change notices')
 assert.deepEqual((await imported()).find(o=>o.targetKind==='schedule'),row)
 w.sql('DROP TRIGGER injected_adoption_failure')
 const race=await Promise.all([req('/api/move-in/adopt',input),req('/api/move-in/adopt',input)])
 assert.deepEqual(race.map(r=>r.status).sort(),[201,409],'one concurrent adoption wins and the other cannot overwrite it')
 const live=ok(await req('/api/paging/state'))
 assert.equal(live.schedules.length,1);assert.equal(live.policies.length,0);assert.equal(live.paging,'OFF')
 const schedule=live.schedules[0]
 const adoptionNotices=ok(await req('/api/state')).scheduleRecords.filter(r=>r.kind==='notice'&&r.data.schedule===schedule.id)
 assert.deepEqual(adoptionNotices.map(r=>r.member).sort(),[admin.id,alice.id,bob.id].sort(),'adoption records one obligation per affected responder and service owner')
 assert.ok(adoptionNotices.every(r=>r.data.obligation.reason==='schedule-change'&&r.data.obligation.creator===admin.id&&r.data.obligation.automatic===false))
 assert.equal(schedule.timezone,row.value.schedule.timezone)
 assert.deepEqual(schedule.primary.members,[alice.id,bob.id])
 const now=ok(await req(`/api/schedules/${encodeURIComponent(schedule.id)}/now-next?at=2026-03-08T13:00:00Z`))
 assert.equal(now.now.primary,alice.id,'imported override is live through the ordinary coverage API')
 assert.equal(ok(await req(`/api/schedules/${encodeURIComponent(schedule.id)}/now-next?at=2026-03-08T15:00:00Z`)).now.primary,bob.id)
 assert.match(ok(await req(`/api/schedules/${encodeURIComponent(schedule.id)}/calendar.ics?from=2026-03-08T13:00:00Z&to=2026-03-09T13:00:00Z`)),/BEGIN:VEVENT/)
 await w.stop();await w.start()
 const undo=ok(await door.call('opsgenie','undo',{planId:review.planId}),409)
 assert.equal(undo.code,'NATIVE_EDIT_CONFLICT');assert.match(undo.error,/made live, so this import can no longer be undone/);assert.doesNotMatch(undo.error,/Put it back/)
 assert.deepEqual(ok(await req('/api/paging/state')).schedules,[schedule],'restart and import undo preserve adopted coverage')
 // OC-038 three saved-response adapters use the same reviewed, restartable journal.
 for(const vendor of ['splunk','jsm','betterstack']) {
  const bytes=await readFile(`tests/fixtures/synthetic-oncall-${vendor}.json`,'utf8'),saved=JSON.parse(bytes)
  const beforeObjects=await imported(),beforeNative=ok(await req('/api/state'))
  const denied=await door.preview(vendor,JSON.stringify({...saved,integrations:[{id:'synthetic-oncall-secret',apiKey:'synthetic-oncall-credential-must-not-persist'}]}))
  assert.equal(denied.status,400);assert.match(denied.value.error,/Credential-bearing/)
  const preview=ok(await door.preview(vendor,bytes))
  assert.ok(preview.items.some(item=>item.rejection&&/original retained/.test(item.rejection)),'unsupported objects are individually named')
  assert.ok(preview.items.some(item=>item.effects.some(effect=>effect.targetKind==='user')))
  const integration=preview.items.flatMap(item=>item.effects).find(effect=>effect.targetKind==='integration')
  assert.equal(integration.value.active,false);assert.equal(integration.value.incumbentKey,'not supplied')
  if(vendor==='jsm')assert.ok(preview.items.some(item=>item.kind==='schedules'&&item.effects.some(e=>e.targetKind==='schedule')),'documented JSM rotation maps through the existing exact converter')
  if(vendor==='betterstack')assert.ok(preview.items.some(item=>item.unmapped.some(field=>/unlisted for paging/.test(field.reason))),'an unverified foreign contact is visible')
  assert.deepEqual(await imported(),beforeObjects,'preview publishes no native objects')
  assert.equal(ok(await door.apply(vendor,preview)).job.state,'completed')
  const applied=await imported(),native=ok(await req('/api/state'))
  assert.deepEqual(native.members,beforeNative.members,'import creates no login grant')
  assert.deepEqual(native.intakeSources,beforeNative.intakeSources,'inactive inventory creates no endpoint or send authority')
  assert.ok(applied.filter(row=>!beforeObjects.some(old=>old.targetId===row.targetId&&old.targetKind===row.targetKind)).every(row=>row.value.paused&&row.value.paging===false&&row.value.login===false))
  await w.stop();await w.start()
  const reconciled=ok(await door.call(vendor,'reconcile',{planId:preview.planId}))
  assert.equal(reconciled.ok,true);assert.equal(reconciled.counts.sourceRecords,preview.items.length)
  assert.equal(reconciled.sourceIds.length,preview.items.length)
  assert.equal(ok(await door.undo(vendor,preview.planId)).job.state,'undone')
  assert.deepEqual(await imported(),beforeObjects,'undo after restart removes only this import')
  // Existing person erasure must also retire unsupported records linked by opaque vendor IDs.
  const again=ok(await door.preview(vendor,bytes));ok(await door.apply(vendor,again))
  const user=(await imported()).find(row=>row.targetKind==='user'&&!beforeObjects.some(old=>old.targetId===row.targetId))
  ok(await req('/api/move-in/erase',{email:user.targetId,confirmation:'erase '+user.targetId}))
  assert.ok(!(await imported()).some(row=>row.targetId===user.targetId))
  const tables=w.sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").map(row=>row.name)
  const held=JSON.stringify(w.statements(tables.map(table=>'SELECT * FROM "'+table.replaceAll('"','""')+'"').join(';')))
  assert.ok(!held.includes(user.targetId),'erasure removes contact and source custody')
  assert.ok(!held.includes(user.value.sourceId),'erasure retires opaque foreign user references as well as email')
  assert.ok(!held.includes('synthetic-oncall-credential-must-not-persist'),'credential-bearing file never persists')
  console.log(`OC-038 ${vendor}: credential refusal, named unsupported objects, inactive integrations, no login/send authority, preview/apply/restart/reconcile/undo and related-person erasure passed`)
 }
 // OC-038 PagerDuty whole-account saved responses: one classification per source object.
 {
  const raw=await readFile('tests/fixtures/pagerduty-account.json','utf8'),bundle=JSON.parse(raw)
  const records=Object.fromEntries(Object.entries(bundle).map(([kind,pages])=>{
   const detail={users:'user',schedules:'schedule',escalation_policies:'escalation_policy',services:'service',teams:'team',incidents:'incident',maintenance_windows:'maintenance_window',business_services:'business_service',event_orchestrations:'orchestration_path',overrides:'override'}[kind]
   return [kind,[pages].flat().flatMap(page=>page[kind]??[page[detail]??page])]
  }))
  const expected={...Object.fromEntries(Object.entries(records).map(([kind,rows])=>[kind,rows.length])),integrations:records.services.reduce((sum,service)=>sum+service.integrations.length,0)}
  // The unchanged four-category exporter can retain user team references without collecting teams.
  const scheduleOnly=Object.fromEntries(['users','schedules','overrides','escalation_policies'].map(kind=>[kind,bundle[kind]]))
  const beforeScheduleOnly=await imported(),scheduleReview=ok(await door.preview('pagerduty',JSON.stringify(scheduleOnly)))
  assert.equal(scheduleReview.items.filter(item=>item.kind==='users'&&item.effects.some(effect=>effect.targetKind==='user')).length,records.users.length)
  assert.ok(scheduleReview.items.filter(item=>item.kind==='users').every(item=>item.unmapped.some(note=>note.field==='teams.0')),'team metadata remains named evidence in a schedule-only file')
  assert.deepEqual(await imported(),beforeScheduleOnly)
  assert.equal(ok(await door.call('pagerduty','undo',{planId:scheduleReview.planId})).state,'cancelled')
  // List orchestration envelopes and ordinary single-detail envelopes are also public saved-file inputs.
  const detailVariant=structuredClone(bundle)
  detailVariant.incidents=records.incidents.map(incident=>({incident}))
  const orchestrationMetadata={id:records.event_orchestrations[0].parent.id,name:'Account event routing',team:{id:records.teams[0].id,type:'team_reference'}}
  detailVariant.event_orchestrations={orchestrations:[orchestrationMetadata],limit:25,offset:0,more:false,total:null}
  const lists=ok(await door.preview('pagerduty',JSON.stringify(detailVariant)))
  assert.deepEqual(lists.counts.byKind,expected)
  detailVariant.event_orchestrations={orchestration:orchestrationMetadata}
  const details=ok(await door.preview('pagerduty',JSON.stringify(detailVariant)))
  assert.deepEqual(details.counts.byKind,expected)
  assert.equal(ok(await door.call('pagerduty','undo',{planId:details.planId})).state,'cancelled')
  const beforeObjects=await imported(),beforeNative=ok(await req('/api/state')),beforePaging=ok(await req('/api/paging/state'))
  const durable=()=>w.sql('SELECT COUNT(*) AS n FROM ik_jobs UNION ALL SELECT COUNT(*) FROM ik_batches UNION ALL SELECT COUNT(*) FROM ik_d1_assertions UNION ALL SELECT COUNT(*) FROM move_in_objects')
  const beforeDurable=durable(),preview=ok(await door.preview('pagerduty',raw))
  assert.deepEqual(durable(),beforeDurable,'account preview changes no durable product or apply-journal rows')
  assert.deepEqual(await imported(),beforeObjects);assert.deepEqual(ok(await req('/api/state')),beforeNative);assert.deepEqual(ok(await req('/api/paging/state')),beforePaging)
  assert.equal(preview.summary.sourceRecords,Object.values(expected).reduce((sum,count)=>sum+count,0))
  assert.deepEqual(preview.counts.byKind,expected)
  assert.equal(preview.items.length,preview.summary.sourceRecords)
  assert.equal(new Set(preview.items.map(item=>JSON.stringify([item.kind,item.id]))).size,preview.items.length)
  assert.equal(Object.values(preview.classification).reduce((sum,count)=>sum+count,0),preview.items.length,'exclusive classifications reconcile every object')
  for(const item of preview.items) {
   assert.equal(item.disposition,item.rejection?'rejected':item.unmapped.length?'mapped-with-differences':'mapped')
   let original=bundle;for(const key of item.location.pointer.slice(1).split('/').map(key=>key.replaceAll('~1','/').replaceAll('~0','~')))original=original?.[key]
   assert.ok(original,'every review entry points into the original account bytes')
   assert.ok(item.effects.length||item.rejection||item.unmapped.length,'nothing silently disappears')
   if(item.rejection)assert.equal(item.effects.length,0)
  }
  assert.deepEqual([...new Set(preview.items.flatMap(item=>item.effects).map(effect=>effect.targetKind))].sort(),['integration','policy','schedule','user'],'account import adds no active integration, routed key or other native target kind')
  const find=(kind,id)=>preview.items.find(item=>item.kind===kind&&item.id===id)
  for(const user of records.users) {
   const item=find('users',user.id),value=item.effects[0].value
   assert.equal(value.contacts.length,1,'phone and SMS sharing a number become one unverified contact')
   assert.deepEqual(value.contacts[0],{number:'+'+user.contact_methods[1].country_code+user.contact_methods[1].address,verified:false,paging:false,country:'unverified'})
   for(const [index,method] of user.contact_methods.entries())assert.ok(item.unmapped.some(note=>note.field==='contact_methods.'+index),'every contact method has its own decision')
   assert.ok(item.unmapped.some(note=>/two-route/.test(note.reason)))
   assert.ok(item.unmapped.some(note=>note.field.startsWith('notification_rules.')))
  }
  for(const id of ['synthetic-oncall-u2','synthetic-oncall-u3'])assert.ok(find('users',id).unmapped.some(note=>/ambiguous or malformed/.test(note.reason)))
  const supported=['events_api_v1_inbound_integration','events_api_v2_inbound_integration','generic_events_api_inbound_integration']
  for(const service of records.services) {
   const evidence=find('services',service.id);assert.equal(evidence.effects.length,0)
   for(const field of ['alert_grouping_parameters','incident_urgency_rule','support_hours','auto_resolve_timeout','acknowledgement_timeout','escalation_policy','teams'])assert.ok(evidence.unmapped.some(note=>note.field===field))
   for(const integration of service.integrations) {
    const item=find('integrations',integration.id)
    if(supported.includes(integration.type)) {
     assert.equal(item.effects[0].targetKind,'integration')
     assert.deepEqual(item.effects[0].value.serviceSource,{namespace:'pagerduty',kind:'services',sourceId:service.id})
     assert.equal(item.effects[0].value.provider,'pagerduty');assert.equal(item.effects[0].value.active,false);assert.equal(item.effects[0].value.incumbentKey,'not supplied')
    }else{assert.equal(item.effects.length,0);assert.match(item.rejection,integration.type==='email_inbound_integration'?/OC-070/:/matching Oncall source.*generic webhook/);assert.ok(item.rejection.includes(integration.name))}
   }
  }
  for(const [kind,clause] of [['teams','OC-023'],['business_services','OC-061'],['maintenance_windows','OC-043'],['event_orchestrations','OC-072']])for(const item of preview.items.filter(item=>item.kind===kind))assert.ok(item.rejection.includes(clause)&&item.effects.length===0)
  const orchestration=preview.items.find(item=>item.kind==='event_orchestrations'),router=records.event_orchestrations[0]
  assert.equal(orchestration.unmapped.filter(note=>/^sets\.\d+\.rules\.\d+$/.test(note.field)).length,router.sets.reduce((sum,set)=>sum+set.rules.length,0))
  assert.ok(orchestration.unmapped.some(note=>note.field==='catch_all'));assert.ok(orchestration.unmapped.some(note=>/dynamic routing/.test(note.reason)))
  for(const incident of records.incidents) {
   const item=find('incidents',incident.id);assert.equal(item.effects.length,0)
   if(incident.status==='resolved')assert.ok(item.unmapped.some(note=>note.field==='history'))
   else {assert.ok(item.rejection.includes(incident.id));assert.match(item.rejection,/not imported as a live incident/)}
  }
  for(const [id,cause] of [['s7',/Concurrent\/layered rotations/],['s8',/time restrictions/],['p4',/repeats are unsupported/],['p5',/more than two steps/],['p6',/direct user/],['p7',/nested/],['p8',/unmapped schedule/]])
   assert.match(find(id[0]==='s'?'schedules':'escalation_policies','synthetic-oncall-'+id).rejection,cause)
  const wrong=(preview.fingerprint[0]==='0'?'1':'0')+preview.fingerprint.slice(1)
  ok(await door.call('pagerduty','apply',{planId:preview.planId,reviewedFingerprint:wrong}),403)
  assert.deepEqual(await imported(),beforeObjects,'only the reviewed fingerprint can publish')
  let first=ok(await door.call('pagerduty','apply',{planId:preview.planId,reviewedFingerprint:preview.fingerprint}))
  assert.ok(['queued','applying'].includes(first.job.state),'the account requires multiple bounded steps')
  const partial=await imported();assert.ok(partial.length>beforeObjects.length)
  await w.stop();await w.start()
  assert.deepEqual(await imported(),partial,'restart retains the committed prefix')
  assert.equal(ok(await door.apply('pagerduty',preview)).job.state,'completed')
  const applied=await imported()
  assert.deepEqual(ok(await req('/api/state')),beforeNative,'account import creates no member, service, incident, delivery, active integration or routed key')
  assert.deepEqual(ok(await req('/api/paging/state')),beforePaging,'paging and native schedule authority stay unchanged')
  assert.ok(applied.filter(row=>!beforeObjects.some(old=>old.targetId===row.targetId&&old.targetKind===row.targetKind)).every(row=>row.value.paused&&row.value.paging===false&&row.value.login===false))
  const reconciled=ok(await door.call('pagerduty','reconcile',{planId:preview.planId}))
  assert.equal(reconciled.ok,true);assert.equal(reconciled.counts.sourceRecords,preview.items.length);assert.equal(reconciled.counts.present+reconciled.counts.explained,preview.items.length)
  assert.equal(new Set(reconciled.sourceIds.map(row=>JSON.stringify(row))).size,preview.items.length)
  const repeated=ok(await door.preview('pagerduty',raw))
  assert.equal(repeated.planId,preview.planId,'identical bytes reuse the reviewed applied plan')
  const repeatedJob=ok(await door.apply('pagerduty',repeated)).job
  assert.equal(repeatedJob.id,first.job.id);assert.deepEqual(await imported(),applied,'identical bytes add and change no imported objects')
  ok(await door.undo('pagerduty',preview.planId));assert.deepEqual(await imported(),beforeObjects)
  // A fresh account import participates in the existing person's erasure custody.
  const again=ok(await door.preview('pagerduty',raw));ok(await door.apply('pagerduty',again))
  const person=records.users[0],number='+'+person.contact_methods[1].country_code+person.contact_methods[1].address
  for(const kind of ['services','teams','incidents','escalation_policies'])assert.ok(again.items.some(item=>item.kind===kind&&(JSON.stringify(item).includes(person.email)||JSON.stringify(item).includes(person.id))))
  ok(await req('/api/move-in/erase',{email:person.email,confirmation:'erase '+person.email}))
  const tables=w.sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").map(row=>row.name)
  const held=JSON.stringify(w.statements(tables.map(table=>'SELECT * FROM "'+table.replaceAll('"','""')+'"').join(';')))
  assert.doesNotMatch(held,new RegExp('(^|[^a-zA-Z0-9_-])'+person.id+'($|[^a-zA-Z0-9_-])'),'the erased foreign ID is absent while distinct IDs with the same prefix remain')
  for(const token of [person.email,person.name,number,person.contact_methods[1].address])assert.ok(!held.includes(token),'erasure retires source references, notes and contact numbers: '+token)
  const remainingPeople=(await imported()).filter(row=>row.targetKind==='user'&&records.users.some(user=>user.email===row.targetId))
  assert.equal(remainingPeople.length,records.users.length-1,'erasure preserves every other imported person')
  assert.ok(remainingPeople.some(row=>row.value.sourceId===records.users.at(-1).id),'a distinct foreign ID sharing the erased ID prefix stays intact')
  assert.ok(!(await imported()).some(row=>row.targetId===person.email))
  console.log('OC-038 PagerDuty account: '+JSON.stringify({records:preview.items.length,kinds:expected,classification:preview.classification})+'; contacts, source-bound keyless inventory, named evidence/refusals, zero-write preview, paused apply/restart/reconcile/idempotence/undo and related-person erasure passed')
 }
 // OC-055 activation is a separate administrator action after reviewed file import.
 const heldIntegration=(await imported()).find(row=>row.targetKind==='integration'&&row.value.provider==='opsgenie')
 assert.ok(heldIntegration)
 const key='synthetic-oncall-adoption-incumbent-key-1',service=ok(await req('/api/state')).services[0].id
 const supplied=ok(await req('/api/intake/incumbent',{importedId:heldIntegration.targetId,importedRevision:heldIntegration.revision,id:'synthetic-oncall-adoption',service,name:'Synthetic adoption incumbent',revision:0,key}),201)
 assert.equal(supplied.source.active,false);assert.equal(JSON.stringify(supplied).includes(key),false)
 const active=ok(await req('/api/intake/sources/synthetic-oncall-adoption/activate-incumbent',{revision:supplied.source.revision,confirmed:true}))
 assert.equal(active.source.active,true);assert.notEqual(active.nativeKey,key)
 ok(await req('/api/intake/sources/synthetic-oncall-adoption/revoke',{revision:active.source.revision}))
 assert.equal(ok(await req('/api/intake/sources/synthetic-oncall-adoption/incumbent')).keySupplied,false)
 console.log('OC-055 import activation: separate key supply, inactive receiving, explicit activation, no supplied-key echo and revoke passed')
 console.log('Move-in: explicit timing difference, named people, validated adoption, authority, concurrent publication, atomic rollback, now/next, ICS and protected undo passed')
} finally {await w.close()}

}
