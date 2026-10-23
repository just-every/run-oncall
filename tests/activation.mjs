import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {localWorker,ownerDoor} from './worker.mjs'
import {checkpointCli} from './checkpoint-cli.mjs'
import {pagingHistory} from './paging-history.mjs'

await (await import('./migration-upgrade.mjs')).migrationUpgrade()
const w=await localWorker(),checks=[]
const ok=(r,status=200)=>{assert.equal(r.status,status,typeof r.value==='string'?r.value:JSON.stringify(r.value));return r.value}
try {
 const initial=await w.request('/api/setup',{name:'Admin',password:'synthetic-local-testing-password'}),admin=ok(initial).member,cookie=initial.cookie
 const req=(path,input)=>w.request(path,input,cookie),record=s=>{checks.push(s);console.log(s)}
 // OC-041 accepted state and its audit entry commit together, survive subject erasure and export without secrets.
 const auditExport=async()=>{const exported=ok(await req('/api/audit/export'));assert.equal(exported.schemaVersion,1);assert.ok(Array.isArray(exported.rows));return exported.rows}
 const auditedSchedule=async perform=>{
  const workspaceBefore=ok(await req('/api/state')),pagingBefore=ok(await req('/api/paging/state')),prior=await auditExport(),ids=new Set(prior.map(row=>row.id))
  const response=await perform(),workspaceAfter=ok(await req('/api/state')),pagingAfter=ok(await req('/api/paging/state'))
  const added=(await auditExport()).filter(row=>!ids.has(row.id))
  assert.ok(added.some(row=>row.outcome==='accepted'&&row.kind!=='audit.export'&&row.workspaceBefore===workspaceBefore.revision&&row.workspaceAfter===workspaceAfter.revision&&row.pagingBefore===pagingBefore.revision&&row.pagingAfter===pagingAfter.revision),
   'the accepted schedule mutation and its audit entry commit the same workspace and paging revisions')
  return response
 }
 // The move-in screen's transport: the owner-session import door.
 const door=ownerDoor(w,cookie)
 const a=ok(await req('/api/members',{name:'Alice',password:'synthetic-local-testing-password',role:'responder'}),201),b=ok(await req('/api/members',{name:'Bob',password:'synthetic-local-testing-password',role:'responder'}),201),viewer=ok(await req('/api/members',{name:'Viewer',password:'synthetic-local-testing-password',role:'viewer'}),201)
 ok(await req('/api/command',{type:'service',id:'checkout',name:'Checkout',environment:'production',owner:admin.id,runbook:['Verify recovery'],pager:'https://pager.example.test'}))
 const schedule={id:'daily',name:'Daily hand-off',service:'checkout',revision:0,timezone:'America/New_York',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-03-07T09:00',periodDays:1,members:[a.id,b.id],ambiguity:'earlier'},backup:{anchorLocal:'2026-03-07T09:00',periodDays:1,members:[b.id,a.id],ambiguity:'earlier'},overrides:[]}
 const saved=ok(await auditedSchedule(()=>req('/api/paging/schedules',schedule)))
 const before=ok(await req('/api/schedules/daily/now-next?at=2026-03-08T12:59:59Z'))
 assert.equal(before.now.primary,a.id);assert.equal(before.next.primary.primary,b.id)
 assert.equal(before.now.windows[0].end,'2026-03-08T13:00:00.000Z')
 assert.equal(ok(await req('/api/schedules/daily/now-next?at=2026-03-08T13:00:00Z')).now.primary,b.id)
 const override={id:'cover',role:'primary',start:'2026-03-08T13:00:00.000Z',end:'2026-03-08T15:00:00.000Z',member:a.id}
 const changed=ok(await auditedSchedule(()=>req('/api/schedules/daily/overrides',{revision:saved.revision,override})))
 assert.equal(ok(await req('/api/schedules/daily/now-next?at=2026-03-08T13:00:00Z')).now.primary,a.id)
 assert.equal(ok(await req('/api/schedules/daily/now-next?at=2026-03-08T15:00:00Z')).now.primary,b.id)
 ok(await req('/api/schedules/daily/overrides',{revision:changed.revision,override:{...override,id:'overlap'}}),400)
 const ics=await req('/api/schedules/daily/calendar.ics?from=2026-03-07T14:00:00Z&to=2026-03-09T13:00:00Z');ok(ics);assert.match(ics.headers.get('content-type'),/text\/calendar/);assert.match(ics.value,/DTEND:20260308T130000Z/);assert.match(ics.value,/DTSTART:20260308T150000Z/)
 ok(await w.request('/api/schedules/daily/calendar.ics'),401)
 ok(await req('/api/command',{type:'member',id:b.id,active:false,role:'responder'}))
 assert.equal(ok(await req('/api/schedules/daily/now-next?at=2026-03-08T15:00:00Z')).now.primary,null,'inactive member keeps its slot as a gap')
 ok(await req('/api/command',{type:'member',id:b.id,active:true,role:'responder'}))
 ok(await req('/api/paging/policies',{service:'checkout',scheduleId:'daily',revision:0,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3}))
 // OC-024 reviewed schedule changes bind the full proposal and coverage to the revision.
 const reviewFrom=Date.parse('2026-10-24T00:00:00Z'),reviewTo=Date.parse('2026-11-09T00:00:00Z')
 const reviewBase=ok(await req('/api/paging/schedules',{...schedule,id:'synthetic-oncall-1',name:'Reviewed multi-zone rota',primary:{...schedule.primary,members:[a.id]},backup:{...schedule.backup,members:[b.id]}}))
 const reviewDraft={...reviewBase,timezone:'Europe/London',overrides:[{id:'synthetic-oncall-2',role:'primary',start:'2026-10-26T09:00:00.000Z',end:'2026-10-26T12:00:00.000Z',member:null}]}
 const reviewInput={schedule:reviewDraft,from:reviewFrom,to:reviewTo}
 const reviewed=ok(await req('/api/schedules/synthetic-oncall-1/review',reviewInput))
 assert.equal(reviewed.members.find(m=>m.id===a.id).name,'Alice','review labels come from the server membership snapshot')
 assert.ok(reviewed.intervals.some(r=>r.newGap&&r.after===null&&r.before===a.id))
 assert.ok(reviewed.clocks.some(c=>c.zone==='Europe/London'&&c.at===Date.parse('2026-10-25T01:00:00Z')))
 assert.ok(reviewed.clocks.some(c=>c.zone==='America/New_York'&&c.at===Date.parse('2026-11-01T06:00:00Z')),'US fall back is November 1 in 2026, not November 8')
 const losAngeles=ok(await req('/api/schedules/synthetic-oncall-1/review',{...reviewInput,schedule:{...reviewDraft,timezone:'America/Los_Angeles'}}))
 assert.ok(losAngeles.clocks.some(c=>c.zone==='America/Los_Angeles'&&c.at===Date.parse('2026-11-01T09:00:00Z')))
 ok(await req('/api/paging/schedules',reviewDraft),409)
 ok(await req('/api/schedules/synthetic-oncall-1/apply',{...reviewInput,digest:reviewed.digest,confirmed:false}),409)
 ok(await req('/api/schedules/synthetic-oncall-1/apply',{...reviewInput,schedule:{...reviewDraft,name:'Unreviewed change'},digest:reviewed.digest,confirmed:true}),409)
 // Login returns the session cookie on the response, never authority in the request body.
 const reviewViewerSession=await w.request('/api/login',{name:'Viewer',password:'synthetic-local-testing-password'})
 ok(await w.request('/api/schedules/synthetic-oncall-1/review',reviewInput,reviewViewerSession.cookie),403)
 ok(await w.request('/api/schedules/synthetic-oncall-1/review',reviewInput),401)
 const reviewBeforeFailure=ok(await req('/api/paging/state'))
 w.sql("CREATE TRIGGER synthetic_oncall_review_audit BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'SYNTHETIC_REVIEW_AUDIT_FAILURE'); END")
 ok(await req('/api/schedules/synthetic-oncall-1/apply',{...reviewInput,digest:reviewed.digest,confirmed:true}),503)
 assert.deepEqual(ok(await req('/api/paging/state')),reviewBeforeFailure,'failed audit rolls back the reviewed schedule')
 w.sql('DROP TRIGGER synthetic_oncall_review_audit')
 const racedReviews=await Promise.all([0,1].map(()=>req('/api/schedules/synthetic-oncall-1/apply',{...reviewInput,digest:reviewed.digest,confirmed:true})))
 assert.deepEqual(racedReviews.map(r=>r.status).sort(),[200,409])
 assert.deepEqual(ok(await req('/api/paging/preview',{scheduleId:reviewBase.id,from:reviewFrom,to:reviewTo})),reviewed.coverage,'applied coverage exactly equals reviewed coverage')
 ok(await req('/api/schedules/synthetic-oncall-1/apply',{...reviewInput,digest:reviewed.digest,confirmed:true}),409)
 const retained=ok(await req('/api/paging/state')).schedules.find(s=>s.id===reviewBase.id)
 assert.deepEqual(retained.primary.members,reviewBase.primary.members);assert.deepEqual(retained.backup.members,reviewBase.backup.members)
 record('OC-024 reviewed schedule changes: New York/London/Los Angeles DST, new gap, retained slots, denied viewer/anonymous, confirmation and stale-digest refusal, audit rollback, race and exact apply/preview equality passed')
 record('OC-011/014/020: calendar-day DST hand-off, overrides, now/next, protected ICS and escalation data passed')
 // OC-068: public manual page and independent responder-request lifecycle, with no sender.
 const pageInput={type:'manual-page',operationId:'synthetic-oncall-68-page',service:'checkout',title:'Manual checkout impact',severity:'warning',description:'Investigate payment failures',users:[a.id,b.id],priority:'P2'}
 let manual=ok(await req('/api/command',pageInput));assert.equal(manual.urgency,'high');assert.equal(manual.manualPage.creator,admin.id);assert.equal(manual.manualPage.assignment.minutes,10);assert.equal(manual.manualPage.assignment.policy,'checkout');assert.equal(manual.manualPage.obligations.length,2)
 assert.ok(manual.manualPage.obligations.every(o=>o.paging==='off'&&o.automatic===false&&o.label==='no sender'))
 assert.equal(ok(await req('/api/command',pageInput)).id,manual.id);ok(await req('/api/command',{...pageInput,title:'Conflicting reuse'}),409)
 assert.equal(ok(await req('/api/state')).incidents.filter(i=>i.manualPage?.operation===pageInput.operationId).length,1)
 ok(await req('/api/command',{type:'user-assignment',service:'checkout',baseVersion:0,mode:'repeat',minutes:7,policy:'checkout'}));ok(await req('/api/command',{type:'user-assignment',service:'checkout',baseVersion:0,mode:'repeat',minutes:7,policy:'checkout'}),409)
 const policyPage=ok(await req('/api/command',{...pageInput,operationId:'synthetic-oncall-68-policy',users:[],policy:'checkout',urgency:'low'}));assert.equal(policyPage.urgency,'low');assert.equal(policyPage.manualPage.obligations[0].target.policyRevision,1);assert.equal(policyPage.manualPage.assignment.version,1)
 record('OC-068 manual pages: creator, urgency default/override, optional priority/description, real policy snapshot, per-user obligations, versioned assignment setting and repeated/conflicting operation keys')
 const beforePageFailure=ok(await req('/api/state'))
 w.sql("CREATE TRIGGER injected_manual_audit_failure BEFORE INSERT ON oc_admin_audit WHEN NEW.workspace_after>NEW.workspace_before BEGIN SELECT RAISE(ABORT,'INJECTED_MANUAL_AUDIT_FAILURE'); END")
 try{ok(await req('/api/command',{...pageInput,operationId:'synthetic-oncall-68-atomic'}),503)}finally{w.sql('DROP TRIGGER injected_manual_audit_failure')}
 assert.deepEqual(ok(await req('/api/state')),beforePageFailure,'manual page and obligations roll back when permanent audit fails')
 record('OC-068 atomic custody: failed permanent audit rolls back incident, obligations and creator state')
 manual=ok(await req('/api/command',{type:'request-responders',incident:manual.id,revision:manual.revision,users:[a.id,b.id],message:'Please inspect payments'}))
 const [requestA,requestB]=manual.responderRequests,sessionA=(await w.request('/api/login',{name:'Alice',password:'synthetic-local-testing-password'})).cookie,sessionB=(await w.request('/api/login',{name:'Bob',password:'synthetic-local-testing-password'})).cookie
 manual=ok(await w.request('/api/command',{type:'respond-request',incident:manual.id,revision:manual.revision,request:requestA.id,decision:'accept'},sessionA));assert.deepEqual(manual.responders,[a.id]);assert.equal(manual.manualPage.acknowledgment,null);assert.equal(manual.state,'declared')
 manual=ok(await req('/api/command',{type:'transition',incident:manual.id,revision:manual.revision,state:'acknowledged',summary:'Primary owner acknowledges'}));assert.equal(manual.responderRequests.find(r=>r.id===requestB.id).status,'pending');assert.ok(manual.manualPage.obligations.every(o=>o.state==='stopped'))
 manual=ok(await w.request('/api/command',{type:'respond-request',incident:manual.id,revision:manual.revision,request:requestB.id,decision:'decline'},sessionB));assert.equal(manual.manualPage.acknowledgment.by,admin.id);assert.equal(manual.responderRequests[1].notice.target.id,admin.id);assert.equal(manual.responderRequests[1].notice.automatic,false)
 manual=ok(await req('/api/command',{type:'request-responders',incident:manual.id,revision:manual.revision,users:[a.id,b.id],message:'Follow-up request'}));const cancel=manual.responderRequests.at(-2)
 ok(await w.request('/api/command',{type:'cancel-request',incident:manual.id,revision:manual.revision,request:cancel.id},sessionA),403)
 manual=ok(await req('/api/command',{type:'cancel-request',incident:manual.id,revision:manual.revision,request:cancel.id}));assert.equal(manual.responderRequests.find(r=>r.id===cancel.id).status,'cancelled')
 manual=ok(await req('/api/command',{type:'bulk-resolve',incident:manual.id,revision:manual.revision,reason:'Human verification completed',evidence:'https://example.test/manual-recovery'}));assert.ok(manual.responderRequests.every(r=>r.status!=='pending'&&r.obligation.state==='stopped'));assert.ok(manual.manualPage.obligations.every(o=>o.state==='stopped'))
 assert.ok(manual.timeline.some(e=>e.kind==='respond-request'&&e.actor===a.id));assert.ok(manual.timeline.some(e=>e.kind==='respond-request'&&e.actor===b.id))
 record('OC-068 responder requests: independent accept/decline and timeline acknowledgment; accepted responder never acknowledges primary; primary acknowledgment preserves pending requests; requester notice, cancellation and resolution stop only their own work')
 const stakeholder68=ok(await req('/api/members',{name:'synthetic-oncall-68-stakeholder',password:'synthetic-local-testing-password',role:'stakeholder'}),201)
 for(const name of ['Viewer',stakeholder68.name]){const deniedSession=(await w.request('/api/login',{name,password:'synthetic-local-testing-password'})).cookie,before=ok(await req('/api/state'));ok(await w.request('/api/command',{...pageInput,operationId:'synthetic-oncall-68-refused'},deniedSession),403);ok(await w.request('/api/command',{type:'request-responders',incident:policyPage.id,revision:policyPage.revision,users:[a.id],message:'Refused'},deniedSession),403);assert.deepEqual(ok(await req('/api/state')),before)}
 record('OC-068 permissions: viewer and stakeholder create/request attempts explain refusal and create nothing; paging remains OFF')

 const refusedPagingBefore=ok(await req('/api/paging/state')),refusedWorkspaceBefore=ok(await req('/api/state')),beforeRefusedPaging=await auditExport(),priorPagingAuditIds=new Set(beforeRefusedPaging.map(row=>row.id))
 const pagingDoors=['/api/delivery','/api/paging/jobs','/api/paging/tick','/api/paging/callbacks','/api/paging/jobs/old/resume']
 for(const path of pagingDoors)ok(await req(path,{}),409)
 assert.deepEqual(ok(await req('/api/paging/state')),refusedPagingBefore,'delivery refusals leave complete paging state unchanged')
 assert.deepEqual(ok(await req('/api/state')),refusedWorkspaceBefore,'delivery refusals leave complete workspace state unchanged')
 const pagingRefusals=(await auditExport()).filter(row=>!priorPagingAuditIds.has(row.id)&&row.outcome==='refused')
 assert.ok(pagingRefusals.length>=pagingDoors.length,'every refused paging door leaves an attributable refusal entry')
 for(const row of pagingRefusals)assert.deepEqual([row.beforeRevision,row.workspaceBefore,row.pagingBefore,row.handoffBefore],[row.afterRevision,row.workspaceAfter,row.pagingAfter,row.handoffAfter],'a paging refusal advances no state or mutation revision')
 assert.equal(w.sql('SELECT COUNT(*) AS n FROM paging_receipts')[0].n,0)
 record('OC-012/013/041: every delivery/timer door refused, its audit retained unchanged revisions and no receipt was created')
 const reader=await w.request('/api/login',{name:'Viewer',password:'synthetic-local-testing-password'});ok(reader)
 ok(await w.request('/api/audit/export',undefined,reader.cookie),403)
 const sources={}
 const atomicSource=await readFile('tests/fixtures/opsgenie.json','utf8'),atomicPreview=ok(await door.preview('opsgenie',atomicSource))
 w.sql("CREATE TRIGGER injected_import_failure BEFORE INSERT ON move_in_objects WHEN NEW.kind='schedule' BEGIN SELECT RAISE(ABORT,'INJECTED_NATIVE_FAILURE'); END")
 assert.equal(ok(await door.call('opsgenie','apply',{planId:atomicPreview.planId,reviewedFingerprint:atomicPreview.fingerprint}),409).error,'import_door_apply_constraint')
 assert.equal(w.sql('SELECT COUNT(*) AS n FROM move_in_objects')[0].n,0,'failed batch published no users or schedules')
 assert.equal(w.sql('SELECT COUNT(*) AS n FROM ik_batches')[0].n,0,'failed batch published no journal progress')
 const interrupted=ok(await req('/api/move-in/jobs?vendor=opsgenie'))[0];assert.equal(interrupted.checkpoint,0);assert.equal(interrupted.state,'failed')
 w.sql('DROP TRIGGER injected_import_failure')
 // A failed door apply is terminal: no session resumes it, through the door or the old journal route.
 ok(await door.call('opsgenie','apply',{planId:atomicPreview.planId,reviewedFingerprint:atomicPreview.fingerprint},reader.cookie),403)
 assert.equal(ok(await door.call('opsgenie','apply',{planId:atomicPreview.planId,reviewedFingerprint:atomicPreview.fingerprint}),409).error,'import_door_plan_failed')
 assert.equal(ok(await req(`/api/move-in/${interrupted.id}/resume`,{vendor:'opsgenie'}),409).code,'IMPORT_DOOR_JOB')
 const replanned=ok(await door.preview('opsgenie',atomicSource));assert.notEqual(replanned.planId,atomicPreview.planId)
 assert.equal(ok(await door.apply('opsgenie',replanned)).job.state,'completed')
 assert.equal(ok(await door.undo('opsgenie',replanned.planId)).job.state,'undone')
 record('OC-022: injected native SQL failure rolled back the complete batch and journal; the failed apply stayed refused and an authorized new preview of the same file applied and undid it')
 // A lost response after one accepted bounded batch is not permission to retry the remaining records.
 const interruptedSource=JSON.stringify({users:{data:Array.from({length:25},(_,index)=>({id:'interrupted-'+index,username:`interrupted-${index}@example.test`,fullName:'Interrupted import person '+index}))}})
 const interruptedPreview=ok(await door.preview('opsgenie',interruptedSource)),interruptionAuditBefore=await auditExport(),priorInterruptionIds=new Set(interruptionAuditBefore.map(row=>row.id))
 w.sql("CREATE TRIGGER injected_import_exit BEFORE UPDATE OF state ON oc_import_lifecycle WHEN NEW.state='idle' AND OLD.state='active' BEGIN SELECT RAISE(ABORT,'INJECTED_WORKER_EXIT_AFTER_COMMIT'); END")
 ok(await door.call('opsgenie','apply',{planId:interruptedPreview.planId,reviewedFingerprint:interruptedPreview.fingerprint}),503)
 w.sql('DROP TRIGGER injected_import_exit')
 const partialImport=ok(await req('/api/move-in/objects'))
 assert.ok(partialImport.length>0&&partialImport.length<25,'one bounded batch committed before the response was lost; the remaining people were not applied')
 w.sql(`UPDATE oc_import_lifecycle SET lease_expires=0 WHERE plan_id='${interruptedPreview.planId}'`)
 const expired=ok(await door.call('opsgenie','status',{planId:interruptedPreview.planId}))
 assert.equal(expired.job.state,'failed');assert.equal(expired.failureCode,'import_interrupted_lease')
 assert.deepEqual(ok(await req('/api/move-in/objects')),partialImport,'publishing interruption keeps the accepted partial state and imports nobody else')
 const interruptionAudit=(await auditExport()).filter(row=>!priorInterruptionIds.has(row.id)&&row.outcome==='interrupted')
 assert.ok(interruptionAudit.length>0,'the expired accepted attempt publishes a durable interrupted audit outcome')
 await w.stop();await w.start()
 const durableInterruption=ok(await door.call('opsgenie','status',{planId:interruptedPreview.planId}))
 assert.equal(durableInterruption.job.state,'failed');assert.equal(durableInterruption.failureCode,'import_interrupted_lease')
 const auditAfterInterruptedRestart=new Map((await auditExport()).map(row=>[row.id,row]))
 for(const row of interruptionAudit)assert.deepEqual(auditAfterInterruptedRestart.get(row.id),row,'Worker restart retains the interrupted audit outcome')
 assert.equal(ok(await door.call('opsgenie','apply',{planId:interruptedPreview.planId,reviewedFingerprint:interruptedPreview.fingerprint}),409).error,'import_door_plan_failed')
 assert.deepEqual(ok(await req('/api/move-in/objects')),partialImport,'a refused retry publishes no more imported effects')
 assert.equal(ok(await door.undo('opsgenie',interruptedPreview.planId)).job.state,'rolled_back')
 assert.deepEqual(ok(await req('/api/move-in/objects')),[],'explicit rollback removes the accepted partial effects')
 record('OC-022/041: a lost response after an accepted import batch became durably interrupted with its audit, refused retry after restart, and retained its partial effects until explicit rollback')
 // Each documented response shape runs the whole guarantee: bare fixtures, saved responses (lists and single details) and PagerDuty layer history.
 const shapes=[
  {file:'opsgenie',vendor:'opsgenie',id:'opsgenie:ops-daily',at:'2026-03-08T13:00:00Z',primary:'alice@example.test'},
  {file:'opsgenie-saved',vendor:'opsgenie',id:'opsgenie:ops-daily',at:'2026-03-08T13:00:00Z',primary:'alice@example.test',like:'opsgenie'},
  {file:'opsgenie-override-detail',vendor:'opsgenie',id:'opsgenie:ops-daily',at:'2026-03-08T13:00:00Z',primary:'alice@example.test',rejected:false},
  {file:'pagerduty',vendor:'pagerduty',id:'pagerduty:pd-daily',at:'2026-03-08T13:00:00Z',primary:'bob@example.test'},
  {file:'pagerduty-saved',vendor:'pagerduty',id:'pagerduty:pd-daily',at:'2026-03-08T10:00:00Z',primary:'alice@example.test',like:'pagerduty'},
  {file:'pagerduty-lists',vendor:'pagerduty',id:'pagerduty:pd-daily',at:'2026-03-08T13:00:00Z',primary:'bob@example.test',like:'pagerduty'},
  {file:'pagerduty-user-details',vendor:'pagerduty',id:'pagerduty:pd-daily',at:'2026-03-08T13:00:00Z',primary:'bob@example.test',rejected:false},
  {file:'pagerduty-layers',vendor:'pagerduty',id:'pagerduty:pd-history',at:'2026-03-03T10:00:00Z',primary:'bob@example.test',rejected:true,also:[{id:'pagerduty:pd-ny-match',at:'2026-03-08T13:30:00Z',primary:'bob@example.test'}]},
 ],mapped={}
 for(const {file,vendor,id,at,primary,like,rejected=true,also=[]} of shapes) {
  const source=await readFile(`tests/fixtures/${file}.json`,'utf8');if(file===vendor)sources[vendor]=source
  const before=w.sql('SELECT COUNT(*) AS n FROM ik_jobs UNION ALL SELECT COUNT(*) FROM ik_batches UNION ALL SELECT COUNT(*) FROM ik_d1_assertions UNION ALL SELECT COUNT(*) FROM move_in_objects')
  const preview=ok(await door.preview(vendor,source))
  for(const item of preview.items){let record=JSON.parse(source);for(const key of item.location.pointer.slice(1).split('/').map(s=>s.replaceAll('~1','/').replaceAll('~0','~')))record=record?.[key];assert.ok(record!==undefined,'review points into the actual supplied response envelope')}
  assert.ok(preview.counts.mapped>0);mapped[file]=preview.counts.mapped;if(like)assert.equal(preview.counts.mapped,mapped[like],'a saved response maps exactly what the bare fixture maps');assert.equal(preview.items.find(i=>i.effects.some(e=>e.targetKind==='schedule')).effects[0].value.equivalence.status,'equivalent-in-window');assert.equal(preview.counts.rejected>0,rejected);assert.ok(preview.items.filter(i=>i.rejection).every(i=>i.name&&i.rejection))
  assert.deepEqual(w.sql('SELECT COUNT(*) AS n FROM ik_jobs UNION ALL SELECT COUNT(*) FROM ik_batches UNION ALL SELECT COUNT(*) FROM ik_d1_assertions UNION ALL SELECT COUNT(*) FROM move_in_objects'),before)
  ok(await door.preview(vendor,source,reader.cookie),403)
  ok(await w.request('/api/move-in/erase',{email:'alice@example.test',confirmation:'erase alice@example.test'},reader.cookie),403)
  ok(await w.request('/api/move-in/erase',{email:'alice@example.test',confirmation:'erase alice@example.test'}),401)
  ok(await door.call(vendor,'apply',{planId:preview.planId,reviewedFingerprint:'changed-review'}),400)
  ok(await door.call(vendor,'apply',{planId:preview.planId,reviewedFingerprint:(preview.fingerprint[0]==='0'?'1':'0')+preview.fingerprint.slice(1)}),403)
  const reviewed={planId:preview.planId,reviewedFingerprint:preview.fingerprint}
  let job=ok(await door.call(vendor,'apply',reviewed)).job
  await w.stop();await w.start()
  while(job.state!=='completed')job=ok(await door.call(vendor,'apply',reviewed)).job
  const objects=ok(await req('/api/move-in/objects'));assert.ok(objects.every(r=>r.value.paused&&r.value.paging===false&&r.value.login===false))
  assert.ok(w.sql("SELECT COUNT(*) AS n FROM ik_batches WHERE job_id='"+job.id+"'")[0].n>0)
  assert.ok(w.sql("SELECT sha256,size FROM ik_originals WHERE job_id='"+job.id+"' AND kind='artifact'").some(o=>o.sha256===createHash('sha256').update(source).digest('hex')&&o.size===Buffer.byteLength(source)),'the journal keeps the saved file\'s exact bytes')
  const repeat=ok(await door.call(vendor,'apply',reviewed)).job;assert.equal(repeat.id,job.id)
  for(const point of [{id,at,primary},...also]){const covered=ok(await req('/api/move-in/coverage',{vendor,id:point.id,at:point.at}));assert.equal(covered.coverage.primary,point.primary,`${file} ${point.id}`)}
  assert.equal(ok(await door.undo(vendor,preview.planId)).job.state,'undone')
  assert.equal(w.sql('SELECT COUNT(*) AS n FROM move_in_objects')[0].n,0)
  record(`OC-021/022 ${file}: zero-write review, named rejections, paused apply, restart/resume, journal, idempotence, equivalence point and undo passed`)
 }
 // Everything Oncall's model cannot hold exactly stays rejected by name, never approximated.
 const refused=async(vendor,file)=>{const r=ok(await door.preview(vendor,await readFile(`tests/fixtures/${file}.json`,'utf8')));assert.ok(r.items.filter(i=>i.rejection&&i.kind==='schedules').every(i=>i.effects.length===0),'a rejected schedule produces no effect');return r}
 const reasons=r=>r.items.filter(i=>i.rejection).map(i=>i.rejection).join('\n')
 const named=(text,patterns)=>{for(const pattern of patterns)assert.match(text,pattern)}
 named(reasons(await refused('opsgenie','opsgenie-unsupported')),[/hourly rotation cannot map to calendar days/,/time restrictions are unsupported/,/Concurrent\/layered rotations cannot be mapped: Primary, Second/,/participant team cannot map/,/participant none cannot map/,/participant escalation cannot map/,/multiple override participants/,/repeats are unsupported/,/notification condition if-not-closed/,/notifyType all/,/direct user/,/more than two steps/])
 named(reasons(await refused('pagerduty','pagerduty-unsupported')),[/sub-day or invalid rotation length/,/time restrictions are unsupported/,/Concurrent\/layered rotations cannot be mapped: Layer one, Layer two/,/need incumbent DST equivalence evidence/,/repeats are unsupported/,/simultaneous or missing recipients/,/direct user/,/more than two steps/])
 const layers=await refused('pagerduty','pagerduty-layers')
 named(reasons(layers),[/Concurrent\/layered rotations cannot be mapped: Ended later, Current/,/timeline differs: 2026-03-08T13:00:00\.000Z: incumbent alice@example\.test, Oncall bob@example\.test/,/has no UTC-offset change in America\/New_York/,/no final timeline supplied/])
 assert.equal(layers.items.find(i=>i.name==='History rota').unmapped.filter(u=>u.field==='schedule_layers.history').length,2,'ended layers are named history, not coverage')
 // A refused preview retains safe audit metadata; its upload goes with the refusal, so no chunk keeps a refused key.
 const rowCounts=()=>{const names=w.sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'").map(r=>r.name);return Object.fromEntries(w.statements(names.map(name=>`SELECT COUNT(*) AS n FROM "${name}"`).join(';')).map((rows,i)=>[names[i],rows[0].n]))}
 // (A preview first gives way to the screen's own earlier unconfirmed preview, as a preview always did, so rows may go; none may be added.)
 const wroteNothing=(before,message)=>{const after=rowCounts();assert.deepEqual(Object.keys(after).filter(t=>!['oc_admin_audit','oc_audit_identities'].includes(t)&&after[t]>before[t]),[],message);assert.equal(after.ik_door_uploads,before.ik_door_uploads,message);assert.equal(after.ik_door_chunks,before.ik_door_chunks,message)
  const added=after.oc_admin_audit-before.oc_admin_audit;assert.ok(added>0,'the refused preview retains its permanent audit')
  assert.ok(w.sql(`SELECT outcome FROM oc_admin_audit ORDER BY ordinal DESC LIMIT ${added}`).some(row=>row.outcome==='refused'),'the new audit explicitly retains the refusal outcome')
 }
 const chunksHolding=secret=>w.sql('SELECT base64 FROM ik_door_chunks').filter(c=>Buffer.from(c.base64,'base64').toString().includes(secret)).length
 for(const [vendor,file,field] of [['opsgenie','credential-opsgenie','apiKey'],['pagerduty','credential-pagerduty','integration_key']]){const rows=rowCounts(),refused=ok(await door.preview(vendor,await readFile(`tests/fixtures/${file}.json`,'utf8')),400);assert.match(refused.error,new RegExp(`^Credential-bearing field "${field}"`));assert.ok(refused.code,'the refusal carries a code, so the screen shows its sentence as written')
  assert.equal(chunksHolding('synthetic-fixture-credential'),0,`no ik_door_chunks row decodes to the refused ${field}`);wroteNothing(rows,'the refused preview retained audit without import rows or bytes')}
 record('OC-021: every shape Oncall cannot hold exactly was rejected by name with no effect; ended layers kept as history; credential-bearing keys refused and not kept')
 // Variants of the bare fixtures run preview, apply, coverage at a sample instant and undo: a refused schedule keeps every reason and is never imported, so it names no one.
 const variant=(vendor,change)=>{const value=JSON.parse(sources[vendor]);change(value);return JSON.stringify(value)}
 const layer=(id,name,start,end,user)=>({id,name,start,end,rotation_virtual_start:start,rotation_turn_length_seconds:86400,users:[{user:{id:user,type:'user_reference'}}],restrictions:[]})
 const unscoped={overrides:[{id:'POVR1',start:'2026-03-08T10:00:00Z',end:'2026-03-08T12:00:00Z',user:{id:'pd-alice',type:'user_reference'}}],limit:25,offset:0,more:false,total:null}
 const variants=[
  {name:'active layer replaced later',vendor:'pagerduty',change:s=>{s.schedules=[{id:'pd-replaced',name:'Replaced later',time_zone:'UTC',schedule_layers:[layer('L1','Current rota','2026-01-05T09:00:00Z','2099-01-05T09:00:00Z','pd-alice'),layer('L2','Future rota','2099-01-05T09:00:00Z',null,'pd-bob')]}];s.escalation_policies=[]},refused:{'Replaced later':/layer Current rota is still active until 2099-01-05T09:00:00\.000Z/},samples:[{id:'pagerduty:pd-replaced',at:'2026-10-14T12:00:00Z'}]},
  {name:'restricted schedule with an override',vendor:'opsgenie',change:s=>{s.schedules.data[0].rotations[0].timeRestriction={type:'time-of-day',restriction:{startHour:9,startMin:0,endHour:17,endMin:0}};delete s.timelines},refused:{'Operations daily':/: Daily handoff: time restrictions are unsupported$/,'cover-alice':/Operations daily is refused: Daily handoff: time restrictions are unsupported/},samples:[{id:'opsgenie:ops-daily',at:'2026-03-08T13:30:00Z'}]},
  {name:'override list without schedule_id, one schedule',vendor:'pagerduty',change:s=>{s.schedules=[s.schedules[0]];s.overrides=unscoped;s.escalation_policies=[]},refused:{},samples:[{id:'pagerduty:pd-daily',at:'2026-03-08T11:00:00Z',primary:'alice@example.test'},{id:'pagerduty:pd-daily',at:'2026-03-08T13:00:00Z',primary:'bob@example.test'}]},
  {name:'override list without schedule_id, two schedules',vendor:'pagerduty',change:s=>{s.schedules=[s.schedules[0],{...s.schedules[0],id:'pd-daily-2',name:'PagerDuty daily two'}];s.overrides=unscoped;s.escalation_policies=[]},refused:{POVR1:/names no schedule and the export holds 2 schedules/,'PagerDuty daily':/Override POVR1 names no schedule/,'PagerDuty daily two':/Override POVR1 names no schedule/},samples:[{id:'pagerduty:pd-daily',at:'2026-03-08T11:00:00Z'}]},
  {name:'disabled schedule',vendor:'opsgenie',change:s=>{s.schedules.data[0].enabled=false;delete s.timelines},refused:{'Operations daily':/disabled in Opsgenie/},samples:[{id:'opsgenie:ops-daily',at:'2026-03-09T15:00:00Z'}]},
  {name:'override for a user not in the export',vendor:'opsgenie',change:s=>{s.overrides.data[0].user={type:'user',username:'ghost@example.test'};delete s.timelines},refused:{'cover-alice':/override user ghost@example\.test is not among the exported users/,'Operations daily':/Override cover-alice: override user ghost@example\.test/},samples:[{id:'opsgenie:ops-daily',at:'2026-03-08T13:30:00Z'}]},
 ]
 for(const {name,vendor,change,refused:expected,samples} of variants) {
  const source=variant(vendor,change),preview=ok(await door.preview(vendor,source))
  for(const [item,reason] of Object.entries(expected)){const found=preview.items.find(i=>i.name===item);assert.match(found?.rejection??'',reason,`${name}: ${item}`);assert.equal(found.effects.length,0)}
  assert.equal(ok(await door.apply(vendor,preview)).job.state,'completed')
  for(const point of samples){const covered=await req('/api/move-in/coverage',{vendor,id:point.id,at:point.at});if(point.primary)assert.equal(ok(covered).coverage.primary,point.primary,`${name} ${point.at}`);else assert.equal(covered.status,404,`${name}: the refused schedule was not imported`)}
  assert.equal(ok(await door.undo(vendor,preview.planId)).job.state,'undone')
  assert.equal(w.sql('SELECT COUNT(*) AS n FROM move_in_objects')[0].n,0)
 }
 const twinRows=rowCounts(),twins=ok(await door.preview('opsgenie',variant('opsgenie',s=>s.users.data.push({id:'alice-again',username:'Alice@Example.test',fullName:'Alice Again'}))),400)
 assert.equal(twins.code,'DUPLICATE_TARGET');wroteNothing(twinRows,'a named file refusal retained audit without import rows or bytes');for(const who of ['alice@example.test','Alice Again (Alice@Example.test)'])assert.ok(twins.error.includes(who),'the refusal names both people')
 record('OC-021: active layers, override lists without a schedule id, disabled schedules and unexported override users are matched or refused by name through apply, coverage and undo; case-only duplicate emails are named')
 // Erasure matches the person by exact identity: erasing al@example.test leaves sal@example.test's slot, coverage and the import's undo intact.
 const people=[['u-al-0','al@example.test','Al Erased'],['u-sal-0','sal@example.test','Sal Kept'],['u-kai-0','kai@example.test','Kai Kept']].map(([id,username,fullName])=>({id,username,fullName}))
 const rotas=[['al-rota',['u-al-0','u-kai-0']],['sal-rota',['u-sal-0','u-kai-0']]].map(([id,members])=>({id,name:id,timezone:'UTC',rotations:[{name:id+' turn',startDate:'2026-03-07T10:00:00Z',type:'daily',length:1,participants:members.map(id=>({type:'user',id}))}]}))
 const crew=JSON.stringify({users:{data:people},schedules:{data:rotas}}),crewPreview=ok(await door.preview('opsgenie',crew))
 assert.equal(ok(await door.apply('opsgenie',crewPreview)).job.state,'completed')
 const primary=async(id,at)=>ok(await req('/api/move-in/coverage',{vendor:'opsgenie',id:'opsgenie:'+id,at})).coverage.primary
 const salRow=()=>w.sql("SELECT revision,data FROM move_in_objects WHERE id='opsgenie:sal-rota'"),salBefore=salRow()
 const everything=()=>{const columns=Map.groupBy(w.sql("SELECT m.name AS t,p.name AS c FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%' AND m.name NOT LIKE '_cf_%' AND m.name NOT LIKE 'd1_%'"),r=>r.t);return JSON.stringify(w.statements([...columns].map(([t,cs])=>`SELECT ${cs.map(({c})=>`CAST("${c}" AS TEXT)`).join(',')} FROM "${t}"`).join(';')))}
 const erasedValues=/(?<![\w.+-])al@example\.test|u-al-0|Al Erased/i
 assert.match(everything(),erasedValues,'the scan sees the person before erasure');assert.equal(await primary('al-rota','2026-03-07T12:00:00Z'),'al@example.test')
 const auditBeforeErasure=await auditExport()
 const receipt=ok(await req('/api/move-in/erase',{email:'al@example.test',confirmation:'erase al@example.test'}));assert.equal(receipt.schedulesRewritten,1)
 const auditAfterErasure=await auditExport(),afterErasureById=new Map(auditAfterErasure.map(row=>[row.id,row])),beforeErasureIds=new Set(auditBeforeErasure.map(row=>row.id))
 for(const row of auditBeforeErasure)assert.deepEqual(afterErasureById.get(row.id),row,'erasure retains every existing audit entry unchanged')
 const erasureAudit=auditAfterErasure.filter(row=>!beforeErasureIds.has(row.id)&&row.outcome==='accepted'&&row.kind!=='audit.export')
 assert.ok(erasureAudit.some(row=>row.subject&&row.subject!=='al@example.test'),'erasure retains an attributable entry with a random subject alias')
 assert.doesNotMatch(JSON.stringify(auditAfterErasure),erasedValues,'audit export retains no erased subject email, vendor identity or name')

 assert.deepEqual(salRow(),salBefore,'the other person\'s schedule is untouched')
 assert.equal(await primary('sal-rota','2026-03-07T12:00:00Z'),'sal@example.test');assert.equal(await primary('al-rota','2026-03-07T12:00:00Z'),null,'the erased slot is an explicit gap');assert.equal(await primary('al-rota','2026-03-08T12:00:00Z'),'kai@example.test')
 assert.doesNotMatch(everything(),erasedValues,'no table keeps a value of the erased person')
 assert.equal(ok(await door.undo('opsgenie',crewPreview.planId)).job.state,'undone')
 assert.deepEqual(w.sql('SELECT kind,id FROM move_in_objects'),[{kind:'schedule',id:'opsgenie:al-rota'}],'undo removed everyone else; only the schedule the erasure rewrote stays applied')
 w.sql("DELETE FROM move_in_objects WHERE id='opsgenie:al-rota'")
 record('OC-041 accepted state and its audit entry commit together, survive subject erasure and export without secrets; OC-022 erasing a person by exact email retained audit history, left a person whose email contains theirs scheduled, covered and undoable, and left no value of theirs behind')
 // A person named in a schedule only through an override record, and in their own notification rules and a direct-user policy, leaves no value in any table or plan; the rest of the import still undoes.
 const delay={condition:'if-not-acked',delay:{timeAmount:5,timeUnit:'minutes'}},mentioned=[
  {vendor:'pagerduty',email:'ed@example.test',erased:/(?<![\w.+-])ed@example\.test|\bPED\b|Ed Erasable/i,ed:'PS-ED',ted:'PS-TED',kai:'kai2@example.test',source:{
   users:[{id:'PED',name:'Ed Erasable',email:'ed@example.test',contact_methods:[{id:'PCM-ED',type:'email_contact_method',address:'ed@example.test'}],notification_rules:[{id:'PNR-ED',type:'assignment_notification_rule',start_delay_in_minutes:0,urgency:'high',contact_method:{id:'PCM-ED',type:'email_contact_method_reference'}}]},{id:'PTED',name:'Ted Kept',email:'ted@example.test'},{id:'PKAI',name:'Kai',email:'kai2@example.test'}],
   schedules:[['PS-ED','Ed rota','LE','PED'],['PS-TED','Ted rota','LT','PTED']].map(([id,name,layer,first])=>({id,name,time_zone:'UTC',schedule_layers:[{id:layer,name:layer,start:'2026-06-01T09:00:00Z',end:null,rotation_virtual_start:'2026-06-01T09:00:00Z',rotation_turn_length_seconds:86400,users:[first,'PKAI'].map(id=>({user:{id,type:'user_reference'}})),restrictions:[]}],final_schedule:{rendered_schedule_entries:[{start:'2026-06-01T09:00:00Z',end:'2026-06-02T09:00:00Z',user:{id:first,type:'user_reference'}}]}})),
   overrides:{overrides:[{id:'PO-ED',start:'2026-06-03T10:00:00Z',end:'2026-06-03T12:00:00Z',user:{id:'PED',type:'user_reference'}}],schedule_id:'PS-TED'},
   escalation_policies:[{id:'PP-TED',name:'Ted escalation',num_loops:0,escalation_rules:[{escalation_delay_in_minutes:5,targets:[{id:'PS-TED',type:'schedule_reference'}]}]},{id:'PP-ED',name:'Direct page',num_loops:0,escalation_rules:[{escalation_delay_in_minutes:5,targets:[{id:'PED',type:'user_reference'}]}]}]}},
  {vendor:'opsgenie',email:'ed@ops.example.test',erased:/(?<![\w.+-])ed@ops\.example\.test|u-ed-ops|Ed Erasable/i,ed:'og-ed',ted:'og-ted',kai:'kai@ops.example.test',source:{
   users:{data:[{id:'u-ed-ops',username:'ed@ops.example.test',fullName:'Ed Erasable',notificationRules:[{name:'Ed urgent SMS',condition:'critical',channel:'sms'}]},{id:'u-ted-ops',username:'ted@ops.example.test',fullName:'Ted Kept'},{id:'u-kai-ops',username:'kai@ops.example.test',fullName:'Kai'}]},
   schedules:{data:[['og-ed','u-ed-ops'],['og-ted','u-ted-ops']].map(([id,first])=>({id,name:id,timezone:'UTC',rotations:[{name:id+' turn',startDate:'2026-06-01T09:00:00Z',type:'daily',length:1,participants:[first,'u-kai-ops'].map(id=>({type:'user',id}))}]}))},
   overrides:{data:[{alias:'cover-ed',startDate:'2026-06-03T10:00:00Z',endDate:'2026-06-03T12:00:00Z',user:{type:'user',id:'u-ed-ops'}}],scheduleId:'og-ted'},
   escalations:{data:[{id:'og-ted-policy',name:'Ted escalation',rules:[{...delay,recipient:{type:'schedule',id:'og-ted'}}]},{id:'og-ed-policy',name:'Direct page',rules:[{...delay,recipient:{type:'user',username:'ed@ops.example.test'}}]}]}}},
 ]
 // The same person named only in free text and in other records' own fields (a schedule description beside a superset address, a contact method saved as its own record), with no override or policy to reach them: the record is tombstoned by what its own source says.
 // Each form of the address beside punctuation sits alone in its own schedule record, so one form the erasure reads cannot tombstone a record whose other form it misses.
 const forms=ed=>[`ask ${ed}!`,`${ed}?`,`**${ed}**`,`key=${ed}`,`a|${ed}|b`,`${ed}/backup`,`https://wiki.example.test/who?email=${ed}&x=1`,`mailto:${ed}?subject=hi`,encodeURIComponent(ed),`https://wiki.example.test/who?email=${encodeURIComponent(ed)}&x=1`,ed.toUpperCase(),`(${ed}).`]
 const text=(vendor,domain,bundle,tight=false,m='')=>{const sed=`sed@${domain}`,ed=`ed@${domain}`,asked=`After hours ask ${ed}, or ${sed}`,kept=tight?`Kept note: ${sed} ${ed}.invalid ${ed}-x x${ed}`:`Kept note: ${sed}`,own=tight?forms(ed):[];return vendor==='pagerduty'
  ?{...bundle,schedules:[bundle.schedules[0],{...bundle.schedules[1],description:asked},{...bundle.schedules[1],id:'PS-SED'+m,name:'Sed rota'+m,description:kept,schedule_layers:bundle.schedules[1].schedule_layers.map(l=>({...l,id:'LS'+m}))},...own.map((description,n)=>({...bundle.schedules[1],id:`PS-V${n}${m}`,name:`Form ${n}${m}`,description,schedule_layers:bundle.schedules[1].schedule_layers.map(l=>({...l,id:`LV${n}${m}`}))}))],contact_methods:[{id:'PCM-ED2'+m,type:'email_contact_method',summary:'Work',label:'Work',address:ed},{id:'PCM-SED'+m,type:'email_contact_method',summary:'Work',label:'Work',address:sed}]}
  :{...bundle,schedules:{data:[bundle.schedules.data[0],{...bundle.schedules.data[1],description:asked},{...bundle.schedules.data[1],id:'og-sed'+m,name:'og-sed'+m,description:kept},...own.map((description,n)=>({...bundle.schedules.data[1],id:`og-v${n}${m}`,name:`og-v${n}${m}`,description}))]},contacts:{data:[{id:'oc-ed'+m,method:'email',to:ed},{id:'oc-sed'+m,method:'email',to:sed}]}}}
 // An erased person's source identity cannot be imported again, so each text-only case is its own set of people and ids.
 const apart=(entry,tag='desc',mark='x')=>{const dom=entry.email.split('@')[1],swap=t=>t.replaceAll('@'+dom,`@${tag}.`+dom).replaceAll('@'+dom.replaceAll('.','\\.'),`@${tag}\\.`+dom.replaceAll('.','\\.')).replace(/PS-TED|PS-ED|PTED|PKAI|PED|PNR-ED|PCM-ED|u-ted-ops|u-ed-ops|u-kai-ops|og-ted|og-ed/g,m=>m+mark)
  return {...entry,email:swap(entry.email),ed:swap(entry.ed),ted:swap(entry.ted),kai:swap(entry.kai),erased:new RegExp(swap(entry.erased.source),'i'),source:JSON.parse(swap(JSON.stringify(entry.source)))}}
 const [pdCase,ogCase]=mentioned.map(entry=>apart(entry)),{overrides:_pdOverrides,escalation_policies:_pdPolicies,...pdBase}=pdCase.source,{overrides:_ogOverrides,escalations:_ogPolicies,...ogBase}=ogCase.source
 const textual=[{...pdCase,source:text('pagerduty','desc.example.test',pdBase),overridden:false,rewritten:1},{...ogCase,source:text('opsgenie','desc.ops.example.test',ogBase),overridden:false,rewritten:1}]
 // The same address beside punctuation and inside URLs and mailto: links, percent-encoded and in other letter case: erased everywhere; a longer address (extra local part or longer domain) stays.
 const lone=(dom,id)=>new RegExp(`(?<![\\w.+-])ed(?:@|%40)${dom.replaceAll('.','\\.')}(?![\\w%+-]|\\.\\w)|${id}|Ed Erasable`,'i')
 const [pdTight,ogTight]=mentioned.map(entry=>apart(entry,'punct','y')),{overrides:_pdO,escalation_policies:_pdE,...pdTightBase}=pdTight.source,{overrides:_ogO,escalations:_ogE,...ogTightBase}=ogTight.source
 const punctuated=[{...pdTight,source:text('pagerduty','punct.example.test',pdTightBase,true,'y'),erased:lone('punct.example.test','\\bPEDy\\b'),overridden:false,rewritten:1,formIds:forms('').map((_,n)=>`PS-V${n}y`),longer:'ed@punct.example.test.invalid'},{...ogTight,source:text('opsgenie','punct.ops.example.test',ogTightBase,true,'y'),erased:lone('punct.ops.example.test','u-ed-opsy'),overridden:false,rewritten:1,formIds:forms('').map((_,n)=>`og-v${n}y`),longer:'ed@punct.ops.example.test.invalid'}]
 for(const {vendor,email,erased,ed,ted,kai,source:bundle,overridden=true,rewritten=2,formIds=[],longer} of [...mentioned,...textual,...punctuated]) {
  const source=JSON.stringify(bundle),review=ok(await door.preview(vendor,source))
  if(overridden)assert.match(review.items.find(i=>i.name==='Direct page').rejection,/direct user/,'a policy paging the person directly stays rejected')
  assert.equal(ok(await door.apply(vendor,review)).job.state,'completed')
  const cover=async(id,at)=>ok(await req('/api/move-in/coverage',{vendor,id:`${vendor}:${id}`,at})).coverage.primary
  const tedMail=`ted@${email.split('@')[1]}`,samples=[[ed,'2026-06-01T12:00:00Z',email,null],[ed,'2026-06-02T12:00:00Z',kai],[ted,'2026-06-01T12:00:00Z',tedMail],[ted,'2026-06-02T12:00:00Z',kai],...overridden?[[ted,'2026-06-03T11:00:00Z',email,null],[ted,'2026-06-03T13:00:00Z',tedMail]]:[]]
  for(const [id,at,want] of samples)assert.equal(await cover(id,at),want,`${vendor} ${id} ${at} before erasure`)
  assert.match(everything(),erased,'the scan sees the person before erasure')
  assert.equal(ok(await req('/api/move-in/erase',{email,confirmation:'erase '+email})).schedulesRewritten,rewritten)
  for(const [id,at,want,after=want] of samples)assert.equal(await cover(id,at),after,`${vendor} ${id} ${at}: the erased override and slot are gaps; everyone else's coverage is unchanged`)
  assert.doesNotMatch(everything(),erased,`${vendor}: no table or retained plan keeps a value of the person named through an override, a notification rule, a policy, a description or another record's own field`)
  if(!overridden)assert.ok(everything().includes('sed@'+email.split('@')[1]),`${vendor}: an address that merely contains theirs stays in the records that name only it`)
  if(longer)for(const kept of [longer,'x'+email,email+'-x'])assert.ok(everything().includes(kept),`${vendor}: ${kept} is a different address and stays`)
  assert.equal(ok(await door.undo(vendor,review.planId)).job.state,'undone')
  assert.deepEqual(w.sql('SELECT kind,id FROM move_in_objects ORDER BY id').map(r=>r.id),[`${vendor}:${ed}`,`${vendor}:${ted}`,...formIds.map(id=>`${vendor}:${id}`)].sort(),'undo removed the other people and policies; only the schedules the erasure rewrote or tombstoned stay applied')
  assert.doesNotMatch(everything(),erased,'undo restores no value of the erased person')
  w.sql('DELETE FROM move_in_objects')
 }
 record('OC-022: a person named only through an override, notification rules, a direct-user policy, a schedule description (beside punctuation, in URLs and mailto: links, percent-encoded or in other letter case) or a contact record (PagerDuty and Opsgenie) left no value in any table or plan; an address containing theirs stayed; coverage for others was unchanged and the rest of the import undid')
 for(const source of ['{bad json}',JSON.stringify({users:[{id:'unsafe',email:'a@example.test',apiKey:'fixture-secret'}]})])ok(await door.preview('opsgenie',source),400)
 const preview=ok(await door.preview('opsgenie',sources.opsgenie))
 assert.equal(ok(await door.apply('opsgenie',preview)).job.state,'completed')
 w.sql("UPDATE move_in_objects SET data=json_set(data,'$.name','Native edit'),revision='native-edit' WHERE kind='user' AND id='alice@example.test'")
 const kept=ok(await door.call('opsgenie','undo',{planId:preview.planId}),409);assert.equal(kept.code,'NATIVE_EDIT_CONFLICT');assert.ok(kept.error.includes('alice@example.test'),'the refusal names the edited person')
 assert.equal(w.sql(`SELECT state FROM ik_jobs WHERE operation_key='door:${preview.planId}'`)[0].state,'completed','a refused undo leaves the import completed')
 assert.equal(w.sql("SELECT json_extract(data,'$.name') AS name FROM move_in_objects WHERE id='alice@example.test'")[0].name,'Native edit')
 const changedSource=JSON.parse(sources.opsgenie);changedSource.users.data[0].fullName='Changed source identity';const changedText=JSON.stringify(changedSource),nativeBefore=w.sql('SELECT * FROM move_in_objects ORDER BY kind,id')
 // A changed file over a live import is its catch-up: the natively edited person is refused by name and nothing replaces them.
 const changedPlan=ok(await door.preview('opsgenie',changedText))
 assert.match(changedPlan.items.find(i=>i.kind==='users'&&i.id===changedSource.users.data[0].id).rejection,/Native edit conflict/)
 assert.equal(ok(await door.apply('opsgenie',changedPlan)).job.state,'completed')
 const pdPlan=ok(await door.preview('pagerduty',sources.pagerduty)),held=ok(await door.call('pagerduty','apply',{planId:pdPlan.planId,reviewedFingerprint:pdPlan.fingerprint}),409)
 assert.equal(held.code,'TARGET_REVISION_CONFLICT');for(const email of ['alice@example.test','bob@example.test'])assert.ok(held.error.includes(email),'the refusal names the people already imported')
 assert.match(held.error,/ already in Oncall from the Opsgenie import [0-9a-f]{8}-[0-9a-f-]{27}\b/,'the refusal names the holding import by its vendor');assert.doesNotMatch(held.error,/door:/,'no internal namespace reaches the owner')
 assert.deepEqual(w.sql('SELECT * FROM move_in_objects ORDER BY kind,id'),nativeBefore,'changed source cannot replace committed native data')
 const revoked=await w.request('/api/login',{name:'Admin',password:'synthetic-local-testing-password'});ok(revoked);ok(await w.request('/api/logout',{},revoked.cookie));ok(await door.call('opsgenie','apply',{planId:preview.planId,reviewedFingerprint:preview.fingerprint},revoked.cookie),401);ok(await w.request('/api/audit/export',undefined,revoked.cookie),401)
 assert.deepEqual(w.sql('SELECT * FROM move_in_objects ORDER BY kind,id'),nativeBefore,'revoked session cannot resume or mutate imported data')
 // A later catch-up that replaced records of the first import: Undo of the first names that import and undoes nothing; newest first undoes.
 const laterSource=JSON.parse(changedText);laterSource.users.data[1].fullName='Renamed later at source'
 const laterPlan=ok(await door.preview('opsgenie',JSON.stringify(laterSource)));assert.equal(ok(await door.apply('opsgenie',laterPlan)).job.state,'completed')
 const laterJob=w.sql(`SELECT id FROM ik_jobs WHERE operation_key='door:${laterPlan.planId}'`)[0].id,layered=w.sql('SELECT * FROM move_in_objects ORDER BY kind,id')
 const superseded=ok(await door.call('opsgenie','undo',{planId:preview.planId}),409);assert.equal(superseded.code,'IMPORT_SUPERSEDED')
 assert.ok(superseded.error.includes(`later Opsgenie import ${laterJob} `),'the refusal names the later import by vendor and journal id');assert.match(superseded.error,/undo that import first in Saved import journal.*nothing was undone/)
 assert.equal(w.sql(`SELECT state FROM ik_jobs WHERE operation_key='door:${preview.planId}'`)[0].state,'completed','the refused undo leaves the first import completed');assert.deepEqual(w.sql('SELECT * FROM move_in_objects ORDER BY kind,id'),layered,'nothing was undone')
 assert.equal(ok(await door.undo('opsgenie',laterPlan.planId)).job.state,'undone','the later import undoes first')
 record('OC-022: malformed/credential-bearing source refused; undo preserved a native edit; undo under a later import named it and undid nothing')
 const checkpoint=ok(await req('/api/recovery/checkpoint')),prior=ok(await req('/api/state'))
 ok(await req('/api/recovery/restore',{mode:'replace',checkpoint:{...checkpoint,coordination:{...checkpoint.coordination,services:[{id:'invalid'}]}}}),400)
 assert.deepEqual(ok(await req('/api/state')),prior)
 const checkpointEdit={schedule:{...changed,name:'Edited after checkpoint'},from:Date.parse('2026-03-08T00:00:00Z'),to:Date.parse('2026-03-09T00:00:00Z')}
 const checkpointReview=ok(await req('/api/schedules/daily/review',checkpointEdit))
 ok(await req('/api/schedules/daily/apply',{...checkpointEdit,digest:checkpointReview.digest,confirmed:true}))
 const replacement=await req('/api/recovery/restore',{mode:'replace',checkpoint});ok(replacement)
 const stateAfter=ok(await w.request('/api/state',undefined,replacement.cookie)),receiving=structuredClone(prior)
 receiving.members=receiving.members.map(m=>m.role==='stakeholder'?{...m,active:false}:m)
 for(const i of receiving.incidents){if(i.manualPage)i.manualPage.obligations=i.manualPage.obligations.map(o=>o.state==='recorded'?{...o,state:'stopped',outcome:'Restored inactive; no sender'}:o);if(i.responderRequests)i.responderRequests=i.responderRequests.map(r=>({...r,status:r.status==='pending'?'held':r.status,obligation:r.obligation.state==='recorded'?{...r.obligation,state:'stopped',outcome:'Restored inactive; no sender'}:r.obligation,notice:r.notice?{...r.notice,state:'stopped'}:null}));}
 assert.deepEqual({...stateAfter,revision:prior.revision},receiving,'checkpoint retains complete history while new status identities and active manual records restore inactive')
 const pagingAfter=ok(await w.request('/api/paging/state',undefined,replacement.cookie));assert.deepEqual(pagingAfter.schedules,checkpoint.paging.schedules);assert.deepEqual(pagingAfter.policies,checkpoint.paging.policies)
 ok(await w.request('/api/state',undefined,cookie),401)
 record('OC-016: paired checkpoint invalid rollback and complete replacement preserved both datasets and revoked the old session')
 {
 // OC-016/017 through the emitted Worker and the private handoff CLI. Each assertion names its contract requirement.
 const owner=replacement.cookie,O=(p,i)=>w.request(p,i,owner)
 ok(await O('/api/members',{name:'Rhea',password:'synthetic-local-testing-password',role:'responder'}),201);ok(await O('/api/members',{name:'Vic',password:'synthetic-local-testing-password',role:'viewer'}),201)
 const alice=await w.request('/api/login',{name:'Rhea',password:'synthetic-local-testing-password'}),view=await w.request('/api/login',{name:'Vic',password:'synthetic-local-testing-password'});ok(alice);ok(view)
 const A=(p,i)=>w.request(p,i,alice.cookie),V=(p,i)=>w.request(p,i,view.cookie)
 let incident=ok(await A('/api/command',{type:'declare',service:'checkout',title:'Checkout errors',severity:'critical',summary:'Elevated errors',alerts:[]}))
 let source=ok(await A('/api/handoffs/context/'+incident.id))
 const copy={audience:'internal',title:'Checkout update',summary:'Errors are being mitigated',evidenceLinks:[],impactLinks:[]}
 const prepare=(id,payload,extra={})=>({id,incident:incident.id,incidentRevision:incident.revision,serviceHash:source.serviceHash,payload,...extra})
 const act=(record,actionId,reason='Exact copy checked')=>({actionId,revision:record.revision,payloadHash:record.payloadHash,sourceHash:record.sourceHash,reason})
 const {audience,...unaddressed}=copy
 ok(await A('/api/handoffs/prepare',prepare('no-audience',unaddressed)),400) // explicit intended audience
 ok(await V('/api/handoffs/prepare',prepare('viewer-copy',copy)),403) // only responders/admins prepare
 const h1=ok(await A('/api/handoffs/prepare',prepare('h1',copy)),201).record
 assert.equal(ok(await A('/api/handoffs/prepare',prepare('h1',copy))).record.revision,h1.revision,'repeated identical preparation returns the original record')
 ok(await A('/api/handoffs/prepare',prepare('h1',{...copy,title:'Changed copy'})),409) // preparation identity conflicts on changed content
 assert.equal(ok(await V('/api/handoffs/h1')).record.payloadHash,h1.payloadHash,'viewers inspect internal records')
 ok(await A('/api/handoffs/h1/review',{...act(h1,'r1'),payloadHash:'0'.repeat(64)}),409) // a review binds the exact copy
 ok(await V('/api/handoffs/h1/review',act(h1,'r1')),403) // viewers never review
 ok(await V('/api/handoffs/h1/withdraw',act(h1,'viewer-withdraw','Viewer attempt')),403) // or withdraw
 const reviewed=ok(await A('/api/handoffs/h1/review',act(h1,'r1'))).record
 ok(await A('/api/handoffs/h1/review',act(h1,'r1','Changed reason')),409) // review identity conflicts on changed content
 assert.equal(reviewed.history.at(-1).selfReview,true,'an author review is recorded as self-review, never independent review')
 const packet=ok(await A('/api/handoffs/h1/export'));assert.ok(packet.transport==='unsent'&&packet.providerActions.length===0,'an eligible review exports unsent copy with no provider action')
 incident=ok(await A('/api/command',{type:'note',incident:incident.id,revision:incident.revision,text:'Source drift'}))
 ok(await A('/api/handoffs/h1/export'),409) // source drift makes the review ineligible
 const withdrawn=ok(await A('/api/handoffs/h1/withdraw',act(reviewed,'w1','Superseded by current copy'))).record
 ok(await A('/api/handoffs/h1/review',act(withdrawn,'r1-again')),409) // withdrawal is terminal
 assert.deepEqual(withdrawn.history.slice(0,reviewed.history.length),reviewed.history,'withdrawal appends to attributed history')
 source=ok(await A('/api/handoffs/context/'+incident.id))
 const h2=ok(await A('/api/handoffs/prepare',prepare('h2',copy,{supersedes:'h1'})),201).record;ok(await A('/api/handoffs/h2/review',act(h2,'r2')))
 const cp=ok(await O('/api/recovery/checkpoint')),stateNow=ok(await O('/api/state')),pagingNow=ok(await O('/api/paging/state')),handoffsNow=ok(await O('/api/handoffs'))
 assert.deepEqual([cp.workspaceRevision,cp.pagingRevision,cp.handoffRevision,cp.coordination],[stateNow.revision,pagingNow.revision,handoffsNow.revision,stateNow],'one consistent snapshot carries all three revisions')
 const text=JSON.stringify(cp);assert.ok(![owner,alice.cookie].some(c=>text.includes(c.split('=')[1]))&&w.sql('SELECT salt,digest FROM credentials').every(r=>!text.includes(r.salt)&&!text.includes(r.digest)),'checkpoints exclude authentication')
 const complete=async()=>[ok(await O('/api/state')),ok(await O('/api/paging/state')),ok(await O('/api/handoffs'))]
 const prior=await complete(),at=Date.parse('2026-10-11T09:00:00Z')
 const job={id:'held-pending',incident:incident.id,service:'checkout',revision:1,status:'pending',nextDue:at,createdAt:at,lastEvaluatedAt:at,currentStep:0,policy:cp.paging.policies[0],schedule:cp.paging.schedules[0],behaviors:{primary:'accepted',backup:'accepted'},steps:[],history:[{type:'created',at,actor:null,reason:null,attempt:null}]}
 const withJobs=(jobs,paging={})=>({...cp,paging:{...cp.paging,...paging,jobs}})
 ok(await A('/api/recovery/restore',{mode:'replace',checkpoint:withJobs([job])}),403) // only a current admin restores
 ok(await O('/api/recovery/restore',{mode:'replace',checkpoint:withJobs([{...job,incident:'missing-incident'}])}),400) // a pending job with a missing reference is invalid
 assert.deepEqual(await complete(),prior,'refused pending reference preserves the complete state')
 const hour=3600000,base=Date.parse(cp.paging.schedules[0].validFrom),overrides=Array.from({length:1000},(_,i)=>({id:'capacity-'+i,role:'primary',start:new Date(base+2*i*hour).toISOString(),end:new Date(base+(2*i+1)*hour).toISOString(),member:null}))
 ok(await O('/api/recovery/restore',{mode:'replace',checkpoint:withJobs([],{schedules:[...cp.paging.schedules,...Array.from({length:40},(_,i)=>({...cp.paging.schedules[0],id:'capacity-'+i,overrides}))]})}),429) // a valid checkpoint over the storage profile refuses
 assert.deepEqual(await complete(),prior,'capacity refusal preserves the complete state')
 ok(await O('/api/recovery/restore',{mode:'replace',checkpoint:{...cp,coordination:{...cp.coordination,members:cp.coordination.members.map(m=>m.role==='admin'?{...m,active:false}:m)}}}),400) // the current-password mapping rule refuses a populated target
 assert.deepEqual(await complete(),prior,'mapping refusal preserves the complete state')
 w.sql("CREATE TRIGGER injected_restore_failure BEFORE INSERT ON paging_jobs BEGIN SELECT RAISE(ABORT,'INJECTED_STORAGE_FAILURE'); END")
 ok(await O('/api/recovery/restore',{mode:'replace',checkpoint:withJobs([job])}),503) // storage failure
 assert.deepEqual(await complete(),prior,'storage failure preserves the complete state and the current session')
 w.sql('DROP TRIGGER injected_restore_failure')
 const race=await Promise.all([0,1].map(()=>O('/api/recovery/restore',{mode:'replace',checkpoint:withJobs([job])})))
 const winner=race.find(r=>r.status===200),loser=race.find(r=>r!==winner)
 assert.ok(winner&&[401,409].includes(loser.status),JSON.stringify(race.map(r=>r.status))) // exactly one concurrent restore wins
 const W=(p,i)=>w.request(p,i,winner.cookie),[restored,restoredPaging]=[ok(await W('/api/state')),ok(await W('/api/paging/state'))]
 assert.deepEqual({...restored,revision:cp.coordination.revision},cp.coordination,'the losing restore cannot revoke the winner or leave a partial state')
 ok(await A('/api/state'),401) // prior sessions are revoked
 assert.equal(restoredPaging.jobs.find(j=>j.id==='held-pending').status,'paused','restore pauses imported pending jobs')
 const held=ok(await W('/api/handoffs/h2'));assert.ok(held.record.held&&!held.eligibility.eligible,'restore holds active approvals')
 ok(await W('/api/handoffs/h2/export'),409) // a recovery hold makes the review ineligible
 assert.deepEqual(ok(await W('/api/handoffs/h1')).record,cp.handoffs.records.find(r=>r.id==='h1'),'restore retains historical identities and attributed history')
 const orphan=ok(await W('/api/recovery/checkpoint'));orphan.paging.jobs=orphan.paging.jobs.map(j=>({...j,incident:'missing-incident'}))
 const kept=await W('/api/recovery/restore',{mode:'replace',checkpoint:orphan});ok(kept)
 const K=(p,i)=>w.request(p,i,kept.cookie)
 assert.equal(ok(await K('/api/paging/state')).jobs.find(j=>j.id==='held-pending').incident,'missing-incident','paused history with a missing reference is retained as evidence')
 ok(await K('/api/paging/jobs/held-pending/resume',{}),409) // and never grants dispatch
 const v1=ok(await K('/api/recovery/checkpoint?version=1'));assert.equal(v1.handoffs,undefined)
 const fromV1=await K('/api/recovery/restore',{mode:'replace',checkpoint:v1});ok(fromV1) // version 1 remains supported
 const L=(p,i)=>w.request(p,i,fromV1.cookie);assert.equal(ok(await L('/api/handoffs/h2')).record.id,'h2','version 1 restore retains handoff history')
 const archive=ok(await L('/api/handoffs/archive'))
 ok(await L('/api/members',{name:'Rex',password:'synthetic-local-testing-password',role:'responder'}),201);ok(await w.request('/api/handoffs/restore',{mode:'replace',archive},(await w.request('/api/login',{name:'Rex',password:'synthetic-local-testing-password'})).cookie),403) // only admins restore handoff archives
 ok(await L('/api/handoffs/restore',{mode:'replace',archive:{...archive,records:Array.from({length:65},(_,i)=>({...archive.records[0],id:'cap-'+i}))}}),400) // handoff capacity refuses
 assert.deepEqual(ok(await L('/api/handoffs/archive')),archive,'handoff refusal preserves the prior archive')
 let h3=ok(await L('/api/handoffs/prepare',{id:'h3',incident:incident.id,incidentRevision:incident.revision,serviceHash:ok(await L('/api/handoffs/context/'+incident.id)).serviceHash,payload:copy}),201).record
 while(h3.history.length<127)h3=ok(await L('/api/handoffs/h3/review',act(h3,'bulk-'+h3.history.length))).record
 const full=ok(await L('/api/handoffs/archive'));ok(await L('/api/handoffs/h3/review',act(h3,'bulk-over')),429) // 128 history entries per record, one kept for a recovery hold
 assert.deepEqual(ok(await L('/api/handoffs/archive')),full,'history capacity refusal preserves the archive')
 let h4=ok(await L('/api/handoffs/prepare',{id:'h4',incident:incident.id,incidentRevision:incident.revision,serviceHash:ok(await L('/api/handoffs/context/'+incident.id)).serviceHash,payload:copy}),201).record,sized
 while(!sized){const r=await L('/api/handoffs/h4/review',act(h4,'size-'+h4.history.length,'r'.repeat(1000)));if(r.status===429)sized=r;else h4=ok(r).record}
 assert.ok(h4.history.length<127,'the 128 KiB record bound refuses before the history bound') // 128 KiB per record
 const big=ok(await L('/api/recovery/checkpoint')),r4=big.handoffs.records.find(r=>r.id==='h4'),size=JSON.stringify(r4).length
 const clones=Array.from({length:Math.floor(1024*1024/size)+1},(_,i)=>({...r4,id:'agg-'+i,history:r4.history.map((h,n)=>({...h,actionId:n?'agg-'+i+'-'+h.actionId:'prepare:agg-'+i}))}))
 assert.ok(clones.length<=64&&size<=128*1024,'every record is inside its own count and size bounds')
 const bigPrior=await (async()=>[ok(await L('/api/state')),ok(await L('/api/paging/state')),ok(await L('/api/handoffs'))])()
 ok(await L('/api/recovery/restore',{mode:'replace',checkpoint:{...big,handoffs:{...big.handoffs,records:clones}}}),429) // 1 MiB aggregate
 assert.deepEqual([ok(await L('/api/state')),ok(await L('/api/paging/state')),ok(await L('/api/handoffs'))],bigPrior,'aggregate refusal preserves the complete state')
 const own=await L('/api/recovery/restore',{mode:'replace',checkpoint:ok(await L('/api/recovery/checkpoint'))});ok(own) // reviewed records at either bound still restore and gain their holds
 own.cookie=await checkpointCli(w,own.cookie)
 const sessionFile='.rer/local/handoff-session',cli=args=>spawnSync(process.execPath,['scripts/handoffs.mjs','--origin',w.origin,'--session-file',sessionFile,...args],{encoding:'utf8'})
 await mkdir('.rer/local',{recursive:true,mode:0o700});await writeFile(sessionFile,own.cookie,{mode:0o600})
 assert.equal(cli(['archive','.rer/local/handoffs.json']).status,0);{const r=cli(['restore','.rer/local/handoffs.json','--replace']);assert.equal(r.status,0,r.stderr)} // the private CLI exports and restores the archive
 assert.ok(JSON.parse(cli(['inspect','h1']).stdout).result.record.status==='withdrawn','the CLI inspects retained history')
 const fresh=await localWorker()
 try { // the current password maps to an archived administrator only in an empty target
  const setup=await fresh.request('/api/setup',{name:'Fresh',password:'synthetic-fresh-testing-password'});ok(setup)
  const moved=ok(await w.request('/api/recovery/checkpoint',undefined,own.cookie)),archived=moved.coordination.members.find(m=>m.active&&m.role==='admin')
  ok(await fresh.request('/api/recovery/restore',{mode:'replace',checkpoint:moved},setup.cookie),400) // mapping is explicit
  const mapped=await fresh.request('/api/recovery/restore',{mode:'replace',checkpoint:moved,adminMapping:archived.id},setup.cookie);ok(mapped)
  assert.deepEqual({...ok(await fresh.request('/api/state',undefined,mapped.cookie)),revision:moved.coordination.revision},moved.coordination,'the mapped restore replaces the empty target')
  ok(await fresh.request('/api/state',undefined,setup.cookie),401)
  assert.equal(ok(await fresh.request('/api/login',{name:archived.name,password:'synthetic-fresh-testing-password'})).member.id,archived.id,'the current password signs in as the mapped administrator')
 } finally { await fresh.close() }
 record('OC-016/017: checkpoint consistency, auth exclusion, atomic refusal under invalid/capacity/storage/concurrent writes, winner session, paused jobs and orphans, version 1, empty-target mapping, the 1 MiB aggregate, review identity/eligibility/hold/withdrawal and the private CLI passed')
 }
 const last=await w.request('/api/login',{name:'Admin',password:'synthetic-local-testing-password'});ok(last)
 await pagingHistory(w,last.cookie)
 record('OC-013/015: restored historical acknowledgement/cancellation append attribution without recovery; strict module references, retained callbacks and SQL rollback passed')
 console.log(`Activation passed: ${checks.length} requirement flow groups`)
}finally{await w.close();await rm('.rer/local/handoff-session',{force:true});await rm('.rer/local/handoffs.json',{force:true})}
