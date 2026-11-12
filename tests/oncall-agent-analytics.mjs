import assert from 'node:assert/strict';
import {agentRuntime,agentReadSnapshot,assertAgentReadUnchanged} from './agent-door-runtime.mjs';
import {analyticsFixture} from './oncall-agent-fixtures.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;

/** Native report parity and scoped non-disclosure through emitted Worker MCP. */
export async function analyticsReads(){
 const runtime=await agentRuntime({clock:Date.UTC(2026,10,12,12)});
 try{
  const fixture=await analyticsFixture(runtime),{http,tool,mcp}=runtime;
  const json=async(path,input,status=200)=>{
   const response=await http(path,input);assert.equal(response.status,status,await response.clone().text());return response.json();
  };
  const allServices=(await json('/api/state')).services.map(row=>row.id);
  async function client(label,services,permissions=['analytics:read','incidents:read']){
   const token='synthetic-oncall-analytics-client-credential-'+label;
   const record=await json('/api/automation/clients',{name:'Synthetic analytics '+label,key:token,services,permissions},201);
   return {token,record};
  }
  const scoped=await client('scoped',[fixture.local]),full=await client('full',allServices);
  const noRead=await client('no-read',allServices,['services:read']);
  async function complete(name,args={},token=full.token){
   let answer=await tool(name,args,{},token);
   const initialDecision=answer.decision;
   if(answer.result?.resultType==='input_required'){
    assert.equal(answer.result.structuredContent,undefined,'Held sensitive reads disclose nothing before approval');
    const {approval}=await json('/agents/api/approvals/'+answer.result._meta['com.runeditrun/approval'].id);
    const approved=await json('/agents/api/approvals/'+approval.id+'/approve',{revision:approval.revision,summary_sha256:approval.summary_sha256});
    assert.equal(approved.approval.state,'executed');
    answer=await mcp('tools/call',{name,arguments:args,requestState:answer.result.requestState},{},token);
   }
   assert.equal(answer.status,200);assert.equal(answer.result?.isError,false,JSON.stringify(answer.body));
   assert.ok(answer.result.structuredContent);
   return {data:answer.result.structuredContent.data,initialDecision,answer};
  }
  const read=(args={},token=full.token)=>complete('oncall.analytics.read',args,token);
  const filters={from:fixture.from,to:fixture.to,at:fixture.at};
  const nativeReport=service=>json('/api/reports/response?'+new URLSearchParams({...filters,...(service?{service}:{})}));
  for(const [label,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
   assert.equal((await runtime.adopt(policy)).status,200);
   // The legacy REST door records credential last-use in native state. Keep
   // that existing bookkeeping outside the MCP zero-effect observation.
   const rest=await runtime.request(runtime.origin+'/api/v1/analytics',{headers:{Origin:runtime.origin,Authorization:'Bearer '+scoped.token}});
   assert.equal(rest.status,200);const restCounts=(await rest.json()).data;
   const before=await agentReadSnapshot(runtime),edge=await runtime.outboundRequests();
   const listing=await runtime.mcpWithToken(full.token,'tools/list'),row=listing.result.tools.find(row=>row.name==='oncall.analytics.read');
   assert.ok(row);assert.equal(row.annotations.readOnlyHint,true);
   assert.equal(row._meta['com.runeditrun/scope'],'analytics:read');
   assert.deepEqual(row._meta['com.runeditrun/clauses'],['OC-037','OC-044','OC-054']);
   assert.deepEqual(row._meta['com.runeditrun/classes'],['standard','sensitive']);
   const guide=await http('/docs/agents');assert.equal(guide.status,200);
   assert.match(await guide.text(),/<code>oncall.analytics.read<\/code>/);
   const baseline=await read(),scopedCounts=await read({},scoped.token);
   assert.deepEqual(scopedCounts.data,[{service:fixture.local,incidents:2,open:2,followups:0}],'No-argument analytics retains its per-service count array');
   assert.deepEqual(baseline.initialDecision.classes.map(row=>row.class),['standard']);
   assert.equal(baseline.initialDecision.disposition,label==='held'?'review':'autonomous');
   assert.deepEqual(restCounts,scopedCounts.data.map(row=>({id:row.service,...row})),'Existing REST analytics retains its pagination identity and counts');

   const fullResponse=await read({view:'response',...filters}),native=await nativeReport();
   // No native service-less alert has a trigger event in this fixture. Its
   // retained raw prefix and identifiers must still remain outside the view.
   assert.deepEqual(fullResponse.data,native,'Full-scope response, coverage and noise equal the native report item by item');
   const localNative=await nativeReport(fixture.local);
   assert.deepEqual((await read({view:'response',...filters,service:fixture.local})).data,localNative);
   const local=await read({view:'response',...filters},scoped.token);
   assert.deepEqual(local.data,{...localNative,cohort:{...localNative.cohort,service:null}},'Scope before all report, schedule and noise totals are computed');
   assert.deepEqual(local.data.incidents.map(row=>row.id),[fixture.incidents[0].id,fixture.pending.id]);
   assert.equal(local.data.cohort.count,2);
   assert.equal(local.data.aggregates.mtta.measured,1);assert.equal(local.data.aggregates.mtta.mean,60);
   assert.equal(local.data.aggregates.mtta.censored,1);
   assert.equal(local.data.noise.triggers,3);assert.equal(local.data.noise.alerts,1);
   assert.equal(local.data.noise.repeatedAlerts,1);assert.equal(local.data.noise.noisyKeys,1);
   assert.deepEqual(local.data.load.schedules.map(row=>row.id),[fixture.local]);
   assert.deepEqual(local.data.load.services.map(row=>row.service),[fixture.local]);
   assert.equal(local.data.load.services[0].primarySeconds,3600);
   assert.equal(local.data.load.acknowledged,1);assert.equal(local.data.load.unacknowledged,1);
   const primary=local.data.load.responders.find(row=>row.member===fixture.owner.id);
   const backup=local.data.load.responders.find(row=>row.member===fixture.backup.id);
   assert.ok(primary&&backup);assert.equal(primary.primarySeconds,3600);assert.equal(backup.backupSeconds,3600);
   assert.equal(primary.per24PrimaryHours,24);assert.equal(primary.acknowledgementShare,1);
   for(const forbidden of [fixture.foreign,fixture.foreignMember.id,fixture.foreignMember.name,fixture.foreignBackup.id,fixture.foreignBackup.name,
    fixture.incidents[1].id,fixture.alerts[1].id,fixture.unrouted.id,...fixture.secrets,full.token,scoped.token])
    assert.ok(!JSON.stringify(local.data).includes(forbidden),'Scoped figures disclose no foreign record, hours, custody or credential');
   assert.deepEqual(local.initialDecision.classes.map(row=>row.class),['standard','sensitive']);
   const incidents=await complete('oncall.incidents.list',{},scoped.token);
   assert.equal(local.initialDecision.disposition,incidents.initialDecision.disposition);
   assert.equal(local.initialDecision.disposition,label==='held'?'approval':'autonomous');
   assert.equal(local.answer.result._meta['com.runeditrun/untrusted'],true);

   const readiness=await read({view:'readiness'}),nativeReadiness=await json('/api/readiness');
   assert.deepEqual(readiness.data,nativeReadiness,'Full-scope readiness equals release, deployment, matrix, signals, US checklist and pager statement item by item');
   assert.equal(readiness.data.complete,true);assert.equal(readiness.data.pagerCoverage.paging,'off');
   assert.deepEqual(readiness.initialDecision.classes.map(row=>row.class),['standard']);
   assert.equal(readiness.initialDecision.disposition,baseline.initialDecision.disposition);
   for(const args of [{view:'readiness'},{view:'response',...filters,service:fixture.foreign},{view:'response',...filters,service:'synthetic-oncall-analytics-absent'}]){
    const denied=await tool('oncall.analytics.read',args,{},scoped.token);
    assert.equal(code(denied),'not_found');assert.equal(denied.result.structuredContent,undefined);
    for(const key of ['cohort','signals','matrix','installation','release',fixture.foreign])
     assert.ok(!JSON.stringify(denied.body).includes(key),'Refusals reveal no count or observation existence');
   }
   for(const args of [{view:'response',at:new Date(runtime.context.now()+1000).toISOString()},{view:'response',from:fixture.to,to:fixture.from},{view:'response',at:'invalid'},{view:'readiness',service:fixture.local},{service:fixture.local}])
    assert.ok(['invalid_arguments','native_request_invalid'].includes(code(await tool('oncall.analytics.read',args,{},scoped.token))));
   for(const args of [{},{view:'response',...filters},{view:'readiness'}]){
    const denied=await tool('oncall.analytics.read',args,{},noRead.token);
    assert.equal(denied.status,403);assert.equal(code(denied),'insufficient_scope');assert.equal(denied.result?.structuredContent,undefined);
   }
   assertAgentReadUnchanged(before,await agentReadSnapshot(runtime));
   assert.deepEqual(await runtime.outboundRequests(),edge);assert.deepEqual(edge,[]);
   const audit=(await runtime.db.prepare("SELECT row FROM agent_door_audit WHERE json_extract(row,'$.tool')='oncall.analytics.read' ORDER BY sequence").all()).results.map(row=>JSON.parse(row.row));
   assert.ok(audit.some(row=>row.outcome==='done'&&row.revision===runtime.context.revision));
   console.log('PROBE SURFACE-001 1 '+label+': analytics MCP response equals native report; one-service cohort 2, measured MTTA 60s, 3600 primary and backup seconds, 3 triggers; full readiness equals native item by item; scoped readiness and foreign service refuse without disclosure; REST counts unchanged, computed policy parity, documented read audit only and zero outbound requests');
  }
  await json('/api/automation/clients/'+full.record.id+'/revoke',{revision:full.record.revision});
  await json('/api/automation/clients/'+scoped.record.id+'/revoke',{revision:scoped.record.revision});
  const revokedBefore=await agentReadSnapshot(runtime);
  for(const token of [full.token,scoped.token])for(const args of [{},{view:'response',...filters},{view:'readiness'}]){
   const denied=await tool('oncall.analytics.read',args,{},token);
   assert.equal(denied.status,401);assert.equal(denied.result,undefined);
  }
  assertAgentReadUnchanged(revokedBefore,await agentReadSnapshot(runtime));assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PASS scoped response analytics and readiness: both policies, native reports and fixed nonempty figures, service isolation before totals, permission and revocation refusal, unchanged native state, zero outbound requests');
 }finally{await runtime.close()}
}
