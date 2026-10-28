import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {localWorker,ownerDoor} from './worker.mjs'

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
