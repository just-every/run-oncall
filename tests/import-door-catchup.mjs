import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

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
