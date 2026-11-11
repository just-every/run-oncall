import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentRuntime,agentEffectSnapshot} from './agent-door-runtime.mjs';
import {prepareResourceRecords} from './oncall-agent-fixtures.mjs';
import {autonomousPolicy,heldPolicy,accessToken} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Native MCP resource discovery, readback, policy and non-disclosure journey. */
export async function resourceJourney() {
 const runtime=await agentRuntime({clock:Date.now()});
 try {
  const {mcp,http,tool,adopt,completeResource}=runtime;
  const f=await prepareResourceRecords(runtime);
  const state=()=>http('/api/state').then(r=>r.json());
  const native=async()=>{const snapshot=await agentEffectSnapshot(runtime);for(const table of Object.keys(snapshot.records))if(table.startsWith('agent_door_'))delete snapshot.records[table];return snapshot};
  const uri=(template,id)=>template.replace(/\{(?:id|period)\}/,encodeURIComponent(id));
  const records=f.records;
  const ownChange=records.changes.find(row=>row.service==='agent-service'),foreignChange=records.changes.find(row=>row.service==='agent-foreign-service');
  const ownAlert=records.alerts.find(row=>row.service==='agent-service'),foreignAlert=records.alerts.find(row=>row.service==='agent-foreign-service');
  const outbox=records.apiOutbox.find(row=>row.incident===f.own.id),endpoint=records.apiEndpoints[0],client=records.apiClients.find(row=>row.id===endpoint.client);
  assert.ok(ownChange&&foreignChange&&ownAlert&&foreignAlert&&outbox&&endpoint&&client,'Resource probes need populated native records');
  const cases=[
   ['alerts/{id}',ownAlert.id,foreignAlert.id,true],
   ['services/{id}','agent-service','agent-foreign-service',true],
   ['incidents/{id}',f.own.id,f.foreign.id,true],
   ['incidents/{id}/review-material',f.own.id,f.foreign.id,true],
   ['actions/{id}',f.own.actions[0].id,f.foreign.actions[0].id,true],
   ['changes/{id}',ownChange.id,foreignChange.id,true],
   ['services/{id}/changes','agent-service','agent-foreign-service',true],
   ['schedules/{id}',f.importedSchedule.id,f.foreignSchedule.id,true],
   ['schedules/{id}/coverage',f.importedSchedule.id,f.foreignSchedule.id,true],
   ['handoffs/{id}',f.ownHandoff.id,f.foreignHandoff.id,true],
   ['reports/{period}',f.ownPeriod,f.foreignPeriod,true],
   ['members/{id}',f.owner.id,f.owner.id,true,'admin'],
   ['teams/{id}',f.team.id,f.team.id,true,'admin'],
   ['automation/clients/{id}',client.id,client.id,true,'admin'],
   ['automation/endpoints/{id}',endpoint.id,endpoint.id,true,'admin'],
   ['erasures/{id}',f.fence,f.fence,false,'admin'],
   ['automation/outbox/{id}',outbox.id,outbox.id,false],
  ].map(([path,id,foreign,untrusted,authority])=>({template:'oncall://'+path,id,foreign,untrusted,authority}));
  let lastWrite;
  for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]) {
   assert.equal((await adopt(policy)).status,200);
   const before=await native();
   const listed=await mcp('resources/templates/list');
   assert.equal(listed.status,200);assert.equal(listed.body.error,undefined);
   assert.equal(listed.result.nextCursor,undefined);
   assert.deepEqual(listed.result.resourceTemplates.map(row=>row.uriTemplate),cases.map(row=>row.template).sort());
   const scoped=await mcp('resources/templates/list',{}, {},f.readKey);
   assert.ok(scoped.result.resourceTemplates.some(row=>row.uriTemplate==='oncall://alerts/{id}'));
   for(const c of cases) {
    const read=await completeResource(uri(c.template,c.id));
    assert.equal(read.content.uri,uri(c.template,c.id));
    if(!c.authority&&!c.template.includes('automation/outbox')) {
     const scopedRead=await completeResource(uri(c.template,c.id),{bearer:f.readKey});
     assert.deepEqual(scopedRead.value,read.value,'Scoped reader sees the same permitted native record');
    }
    if(c.template==='oncall://alerts/{id}')assert.deepEqual(read.value.events,ownAlert.events);
    if(c.template==='oncall://schedules/{id}')assert.deepEqual(read.value,f.importedSchedule);
    if(c.template==='oncall://handoffs/{id}')assert.deepEqual(read.value,f.ownHandoff);
    if(c.template==='oncall://changes/{id}')assert.deepEqual(read.value,ownChange);
    if(c.template==='oncall://reports/{period}')assert.deepEqual(read.value.incidents.map(row=>row.id),[f.own.id]);
    assert.equal(read.content._meta?.['com.runeditrun/untrusted'],c.untrusted?true:undefined,c.template);
    const classes=read.initial.decision.classes,sensitive=classes.some(row=>row.class==='sensitive');
    assert.equal(read.initial.decision.revision,runtime.context.revision);
    assert.equal(read.initial.decision.disposition,mode==='held'?sensitive?'approval':'review':'autonomous',c.template);
    assert.ok(classes.every(row=>row.do===(mode==='held'?row.class==='standard'?'review':'approval':'autonomous')));
    if(mode==='held'&&!sensitive)assert.ok(read.answer.result._meta['com.runeditrun/review']?.id,'A standard resource read records review work');
    const bearer=c.authority==='admin'?await accessToken(runtime.context,f.viewer):f.readKey;
    const missing=c.template.includes('{period}')?'2000-01':'synthetic-oncall-resource-not-present';
    const hidden=await mcp('resources/read',{uri:uri(c.template,c.foreign)},{},bearer);
    const absent=await mcp('resources/read',{uri:uri(c.template,missing)},{},bearer);
    assert.equal(hidden.status,200,c.template);assert.equal(absent.status,200,c.template);
    assert.equal(hidden.body.error?.data?.code,'resource_unavailable',c.template);
    const withoutId=({id,...body})=>body;
    assert.deepEqual(withoutId(hidden.body),withoutId(absent.body),c.template+' hides record existence');
    assert.equal(hidden.result,undefined);assert.equal(absent.result,undefined);
    console.log(`PROBE BASE-AGENT-003 3 ${mode} ${c.template}: populated unauthorized and missing record -> identical Resource unavailable without content`);
   }
   assert.deepEqual(await native(),before,'Resource discovery, reads and approvals preserve native records, revisions, paging, handoff custody and outbound work');
   assert.deepEqual(await runtime.outboundRequests(),[]);
   const customer=await completeResource('oncall://handoffs/'+f.ownHandoff.id);
   assert.equal(customer.value.payload.summary,f.ownHandoff.payload.summary);
   const imported=await completeResource('oncall://schedules/'+f.importedSchedule.id);
   assert.equal(imported.value.name,'Synthetic imported schedule text');
   const emailed=await completeResource('oncall://alerts/'+f.emailAlert.id);
   assert.equal(emailed.content._meta['com.runeditrun/untrusted'],true);
   assert.ok(emailed.value.events.length>0,'Email resource retains its admitted event identity');
   assert.ok(emailed.value.observations.some(row=>row.title.includes(f.emailText)),'The marked resource contains the actual email text');
   const nativeOnly=await completeResource('oncall://erasures/'+f.fence);
   assert.deepEqual(nativeOnly.value,{state:'complete',fence:f.fence,externalDeletion:'not-requested'});
   // A completed write's actual link reads the newly committed native state.
   const args={incident:f.own.id,revision:(await state()).incidents.find(row=>row.id===f.own.id).revision,text:'Synthetic customer note '+mode,idempotency_key:randomUUID()};
   const call=await tool('oncall.notes.add',args);
   lastWrite=args;
   assert.equal(call.decision.disposition,mode==='held'?'review':'autonomous','A standard note follows the company policy');
   assert.equal(call.result.isError,false);
   const link=call.result.content.find(row=>row.type==='resource_link');assert.ok(link);
   const snapshot=await native(),read=await completeResource(link.uri);
   assert.deepEqual(read.value,call.result.structuredContent);
   assert.equal(read.value.timeline.at(-1).text,'Synthetic customer note '+mode);
   assert.deepEqual(await native(),snapshot);
   console.log(`PROBE BASE-AGENT-003 1,4,6 ${mode}: 17 scoped templates, policy-appropriate reads, customer and imported text marked, native-only fence unmarked; native records and paging unchanged; zero outbound requests`);
  }
  assert.equal((await adopt()).status,200);
  await completeResource('oncall://services/agent-service',{bearer:f.readKey});
  const revoked=await http('/api/automation/clients/'+f.client.id+'/revoke',{revision:f.client.revision});
  assert.equal(revoked.status,200);await revoked.json();
  const afterRevoke=await native();
  const refused=await mcp('resources/read',{uri:'oncall://services/agent-service'},{},f.readKey);
  assert.equal(refused.status,401);assert.equal(refused.result,undefined);
  assert.deepEqual(await native(),afterRevoke,'A revoked resource credential cannot expose or change native data');
  const current=await state();
  const erased=await http('/api/erasure/incident/'+f.own.id,{workspaceRevision:current.revision,confirmation:'erase '+f.own.id});
  assert.equal(erased.status,200);assert.equal((await erased.json()).state,'complete');
  const afterErase=await native();
  for(const uri of ['oncall://incidents/'+f.own.id,'oncall://handoffs/'+f.ownHandoff.id]) {
   const answer=await mcp('resources/read',{uri});
   assert.equal(answer.body.error?.data?.code,'resource_unavailable');assert.equal(answer.result,undefined);
  }
  const replay=await tool('oncall.notes.add',lastWrite);
  assert.equal(replay.result?._meta?.['com.runeditrun/error']?.code,'not_found');
  assert.equal(replay.result.structuredContent,undefined);
  assert.deepEqual(await native(),afterErase,'Erased resource links and a captured write cannot resurrect or expose erased custody');
  assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PROBE BASE-AGENT-003 authority: revoked scoped bearer -> 401; erased incident and handoff links -> Resource unavailable; captured note -> not_found; native and paging unchanged; zero outbound requests');
 } finally {await runtime.close()}
}
