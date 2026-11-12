import assert from 'node:assert/strict'
import {readFile,mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {localWorker,ownerDoor} from './worker.mjs'

// Called by the existing import-door journey. All mutations enter the emitted
// Worker through the reviewed import and compatible HTTP doors.
export async function routedImportedKeys() {
 const w=await localWorker({}, {outboundLedger:true})
 const ok=(response,status=200)=>{assert.equal(response.status,status,JSON.stringify(response.value));return response.value}
 let cookie
 const req=(path,data,as=cookie)=>w.request(path,data,as)
 try {
  const setup=await req('/api/setup',{name:'Synthetic routed import owner',password:'synthetic-oncall-password-501'});ok(setup);cookie=setup.cookie
  const actor=ok(await req('/api/session')).member
  for(const [id,name] of [['synthetic-oncall-531','Native payments'],['synthetic-oncall-532','Native search'],['synthetic-oncall-533','Outside scope']])ok(await req('/api/command',{type:'service',id,name,environment:'test',owner:actor.id,runbook:[],pager:''}))
  const member=ok(await req('/api/members',{name:'Synthetic router responder',role:'responder',password:'synthetic-oncall-password-502'}),201)
  const responder=(await w.request('/api/login',{name:member.name,password:'synthetic-oncall-password-502'})).cookie
  const door=ownerDoor(w,cookie),objects=()=>req('/api/move-in/objects').then(ok),state=()=>req('/api/state').then(ok)
  const pagingBefore=ok(await req('/api/paging/state'))
  for(const vendor of ['opsgenie','splunk']) {
   let raw=await readFile(`tests/fixtures/synthetic-oncall-${vendor}-routed.json`,'utf8')
   if(vendor==='splunk'){
    const directory=await mkdtemp(join(tmpdir(),'oncall-routed-labels-'));
    try{const destination=join(directory,'prepared.json');execFileSync(process.execPath,['scripts/prepare-routed-splunk.mjs','tests/fixtures/synthetic-oncall-splunk-routed.json',destination]);raw=await readFile(destination,'utf8')}finally{await rm(directory,{recursive:true,force:true})}
   }
   const original=JSON.parse(raw)
   const initial=await objects(),preview=ok(await door.preview(vendor,raw))
   assert.deepEqual(await objects(),initial,'preview changes no imported objects')
   const item=preview.items.find(item=>item.kind==='integrations'),mapped=item.effects[0].value
   assert.equal(mapped.active,false);assert.equal(mapped.incumbentKey,'not supplied');assert.equal(mapped.routed.routes.length,2,JSON.stringify(item));assert.equal(mapped.routed.catchAllTarget,null)
   const expected=vendor==='opsgenie'?original.integrations.data[0]:original.integrations[0]
   assert.deepEqual(item.original,expected)
   assert.ok(item.unmapped.some(row=>/escalation/.test(row.reason)));assert.ok(item.unmapped.some(row=>/Original retained/.test(row.reason)))
   if(vendor==='opsgenie') {assert.ok(item.unmapped.some(row=>row.field==='alertPolicies'));assert.ok(item.unmapped.some(row=>/schedule/.test(row.reason)));assert.ok(item.unmapped.some(row=>row.field.endsWith('conditions.0')))}
   else assert.ok(item.unmapped.some(row=>row.field.endsWith('timeRestriction')))
   const job=ok(await door.apply(vendor,preview)).job;assert.equal(job.state,'completed')
   await w.stop();await w.start()
   let row=(await objects()).find(row=>row.targetId===vendor+':'+expected.id)
   assert.deepEqual(row.value,mapped)
   assert.equal(ok(await door.call(vendor,'reconcile',{planId:preview.planId})).ok,true)
   const report=ok(await req('/api/move-in/jobs?vendor='+vendor)).find(row=>row.id===job.id).moveReports[0]
   assert.deepEqual(report.original,expected);assert.deepEqual(report.unconverted,item.unmapped)
   const id=row.value.intakeSource,key='synthetic-oncall-imported-key-'+vendor+'-501',targetA='synthetic-oncall-531',targetB='synthetic-oncall-532'
   const send=async(action,route=0,alias='synthetic-oncall-shared',credential=key,padding=false)=>{
    const body=vendor==='opsgenie'?{alias,message:'Synthetic routed alert',responders:[{type:'team',id:route===0?'synthetic-oncall-511':'synthetic-oncall-512'}],source:'Synthetic monitor'}:{message_type:action==='recover'?'RECOVERY':'CRITICAL',entity_id:alias,state_message:'Synthetic routed alert',monitoring_tool:'Synthetic monitor'}
    if(padding)body.padding='x'.repeat(3*1024*1024)
    const path=vendor==='opsgenie'?action==='recover'?`/v2/alerts/${alias}/close?identifierType=alias`:'/v2/alerts':`/integrations/generic/20131114/alert/${credential}/synthetic-oncall-${route===0?'521':'522'}`
    return w.send(path,JSON.stringify(body),{'content-type':'application/json',...(vendor==='opsgenie'?{authorization:'GenieKey '+credential}:{})})
   }
   const deniedBefore=await state();ok(await send('trigger'),401)
   assert.deepEqual((await state()).intakeReceipts,deniedBefore.intakeReceipts)
   assert.equal(((await state()).intakeSources??[]).some(source=>source.id===id),false)
   const input={importedId:row.targetId,importedRevision:row.revision,id,name:'Synthetic reviewed '+vendor,revision:0,key,routing:{scope:[targetA,targetB],targets:{'synthetic-oncall-511':targetA,'synthetic-oncall-512':targetB},owner:actor.id,confirmed:true}}
   ok(await req('/api/intake/incumbent',input,''),401);ok(await req('/api/intake/incumbent',input,responder),403)
   const beforeBad=await state()
   ok(await req('/api/intake/incumbent',{...input,routing:{...input.routing,targets:{...input.routing.targets,'synthetic-oncall-511':'synthetic-oncall-533'}}}),400)
   ok(await req('/api/intake/incumbent',{...input,routing:{...input.routing,team:'fabricated'}}),400)
   ok(await req('/api/intake/incumbent',{...input,routing:{...input.routing,targets:{}}}),400)
   assert.deepEqual((await state()).intakeSources,beforeBad.intakeSources)
   const supplied=ok(await req('/api/intake/incumbent',input),201)
   assert.equal(supplied.source.active,false);assert.equal(supplied.source.routing.team,undefined);assert.equal(supplied.source.routing.versions[0].version,1);assert.equal(supplied.source.routing.versions[0].catchAll,null)
   assert.deepEqual(supplied.source.routing.versions[0].rules.map(rule=>rule.target.service),[targetA,targetB],'source team names do not infer native targets')
   assert.ok(!JSON.stringify(supplied).includes(key));assert.deepEqual((await objects()).find(r=>r.targetId===row.targetId),row)
   ok(await send('trigger'),401)
   const activate='/api/intake/sources/'+id+'/activate-incumbent'
   ok(await req(activate,{revision:supplied.source.revision,confirmed:true},responder),403)
   ok(await req(activate,{revision:supplied.source.revision,confirmed:false}),409)
   const active=ok(await req(activate,{revision:supplied.source.revision,confirmed:true}));assert.equal(active.source.active,true)
   ok(await send('trigger'),vendor==='opsgenie'?202:200);ok(await send('trigger',1),vendor==='opsgenie'?202:200)
   let s=await state(),alerts=s.alerts.filter(alert=>alert.source==='intake:'+id&&alert.key==='synthetic-oncall-shared')
   assert.equal(alerts.length,2);assert.equal(new Set(alerts.map(a=>a.generation)).size,2);assert.deepEqual(alerts.map(a=>a.service),[targetA,targetB])
   for(const alert of alerts){assert.equal(alert.obligation.state,'recorded');assert.equal(alert.obligation.paging,'off');assert.deepEqual(alert.obligation.target,{kind:'service',id:alert.service})}
   ok(await send('recover'),vendor==='opsgenie'?202:200)
   s=await state();alerts=s.alerts.filter(alert=>alert.source==='intake:'+id&&alert.key==='synthetic-oncall-shared')
   assert.equal(alerts.find(a=>a.service===targetA).state,'recovered');assert.equal(alerts.find(a=>a.service===targetA).obligation.state,'stopped');assert.equal(alerts.find(a=>a.service===targetB).state,'active');assert.equal(alerts.find(a=>a.service===targetB).obligation.state,'recorded')
   ok(await send('recover'),vendor==='opsgenie'?202:200)
   const noEffect=(await state()).intakeReceipts.at(-1)
   assert.equal(noEffect.outcome,'no-effect');assert.equal(noEffect.service,targetA);assert.match(noEffect.routing.diagnostics.join(' '),new RegExp(targetB));assert.match(noEffect.routing.diagnostics.join(' '),/resolve matched no open generation/)
   // The compatible endpoint's provider bound is 512 KiB. Every readable
   // alert remains routed; the unread remainder has separate owner custody.
   for(const route of [0,1]) {
    const bodyResult=ok(await send('trigger',route,'synthetic-oncall-large-'+route,key,true),202);assert.equal(bodyResult.truncation,true)
    s=await state()
    const readable=s.intakeReceipts.find(r=>r.source===id&&r.key==='synthetic-oncall-large-'+route)
    assert.equal(readable.service,route===0?targetA:targetB)
    const incomplete=s.intakeReceipts.filter(r=>r.source===id&&r.incomplete).at(-1)
    assert.equal(incomplete.outcome,'unrouted');assert.equal(incomplete.service,null);assert.equal(incomplete.incomplete.bytes>3*1024*1024,true);assert.deepEqual(incomplete.incomplete.readableIds,['synthetic-oncall-large-'+route])
    const held=s.alerts.find(a=>a.id===incomplete.alert);assert.equal(held.urgency,'high');assert.equal(held.service,null);assert.equal(held.owner,actor.id);assert.deepEqual(held.obligation.target,{kind:'user',id:actor.id});assert.equal(held.obligation.state,'recorded');assert.equal(held.obligation.paging,'off')
    assert.deepEqual(incomplete.details.ownerNotice,{owner:actor.id,paging:'off',state:'recorded'})
    assert.ok(s.audit.some(a=>a.kind==='intake-owner-notice'&&a.text.includes(incomplete.id)))
   }
   assert.equal(ok(await door.call(vendor,'reconcile',{planId:preview.planId})).ok,true,'key review and activation preserve import reconciliation')
   await w.stop();await w.start()
   ok(await send('trigger',0,'synthetic-oncall-after-restart',active.nativeKey),vendor==='opsgenie'?202:200)
   const revoked=ok(await req('/api/intake/sources/'+id+'/revoke',{revision:active.source.revision}))
   const beforeRevoke=await state();ok(await send('trigger'),401);ok(await send('trigger',0,'synthetic-oncall-revoked',active.nativeKey),401);assert.deepEqual((await state()).intakeReceipts,beforeRevoke.intakeReceipts)
   const replacement=ok(await req('/api/intake/incumbent',{...input,revision:revoked.revision}))
   const reactivated=ok(await req(activate,{revision:replacement.source.revision,confirmed:true}))
   assert.equal(ok(await door.undo(vendor,preview.planId)).job.state,'undone')
   const beforeUndo=await state();ok(await send('trigger'),401);ok(await send('trigger',0,'synthetic-oncall-undone',reactivated.nativeKey),401)
   assert.deepEqual((await state()).intakeReceipts,beforeUndo.intakeReceipts);assert.deepEqual(await objects(),initial)
   ok(await req('/api/intake/incumbent',{...input,revision:reactivated.source.revision}),409)
   const replayed=ok(await door.preview(vendor,raw));ok(await door.apply(vendor,replayed))
   ok(await send('trigger'),401);ok(await send('trigger',0,'synthetic-oncall-replay',reactivated.nativeKey),401)
   assert.deepEqual((await state()).intakeReceipts,beforeUndo.intakeReceipts,'replaying the saved capture cannot resurrect either credential')
   ok(await door.undo(vendor,replayed.planId))
   console.log(`PROBE OC-083 4 ${vendor}: saved preview, apply, restart, report and reconcile; explicit targets, inactive supply, activation; per-service generations and recovery, no-effect diagnostic, two 3 MiB requests with owner custody; revoke, undo and replay fence both keys`)
  }
  const paging=ok(await req('/api/paging/state'));assert.equal(paging.paging,'OFF');assert.deepEqual(paging.jobs,pagingBefore.jobs);assert.deepEqual(paging.receipts,pagingBefore.receipts);assert.deepEqual(await w.outboundRequests(),[])
  console.log('PASS routedImportedKeys: imported Opsgenie and Splunk compatible lifecycle, complete move reports, workspace administrator authority, replay and undo fences, paging OFF and zero outbound requests')
 }finally{await w.close()}
}
