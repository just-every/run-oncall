import assert from 'node:assert/strict';
import {agentRuntime,agentReadSnapshot,assertAgentReadUnchanged} from './agent-door-runtime.mjs';
import {triageFixture} from './oncall-agent-fixtures.mjs';
import {autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;

/** Search, scope, policy and read isolation through emitted Worker MCP and D1. */
export async function triageReads(){
 // SQLite checks session expiry against real time, so freeze a current hour.
 const runtime=await agentRuntime({clock:Math.floor(Date.now()/3600000)*3600000});
 try{
  const fixture=await triageFixture(runtime),{http,tool,mcp}=runtime;
  const json=async(path,input,status=200)=>{const response=await http(path,input);assert.equal(response.status,status,await response.clone().text());return response.json()};
  async function client(label,permissions,services=['agent-service']){
   const token='synthetic-oncall-triage-client-credential-'+label;
   const record=await json('/api/automation/clients',{name:'Synthetic triage '+label,key:token,services,permissions},201);
   return {token,record};
  }
  const reader=await client('reader',['incidents:read']),other=await client('other',['incidents:read'],['agent-service','agent-foreign-service']);
  const noRead=await client('no-read',['services:read']);
  const call=(args={},token=reader.token)=>tool('oncall.triage.list',args,{},token);
  async function complete(name,args={},token=reader.token){
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
  const read=(args={},token=reader.token)=>complete('oncall.triage.list',args,token);
  const ids=data=>data.items.map(row=>row.id);
  const expectedIncidents=[fixture.unassigned.id,fixture.snoozed.id,fixture.declared.id];
  // The native owner fixture contributes one evidence-bearing monitor alert.
  const monitor=fixture.state.alerts.find(row=>row.source==='agent-monitor');assert.ok(monitor);
  const expectedAlerts=[fixture.routedOnly.id,fixture.nativeOnly.id,monitor.id];
  const forbidden=[...fixture.secrets,reader.token,other.token,noRead.token,
   fixture.foreignOnly.id,fixture.foreignIncident.id,fixture.foreignTarget.id,fixture.source.id,fixture.merged.id,fixture.reverseSource.id,fixture.unrouted.id,'foreignneedle',
   ...fixture.state.events.filter(row=>row.service==='agent-foreign-service').map(row=>row.id),
   ...fixture.state.intakeReceipts.filter(row=>row.service!=='agent-service').map(row=>row.id)];
  function clean(value){for(const text of forbidden)assert.ok(!JSON.stringify(value).includes(text),'No foreign identifier, custody bytes or search hit is disclosed');}
  async function expect(args,expected){
   const result=await read(args);assert.deepEqual(ids(result.data),expected,JSON.stringify(args));assert.equal(result.data.total,expected.length);clean(result.data);return result;
  }
  let cursor;
  for(const [label,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
   assert.equal((await runtime.adopt(policy)).status,200);
   const before=await agentReadSnapshot(runtime),edge=await runtime.outboundRequests();
   const listing=await runtime.mcpWithToken(reader.token,'tools/list');
   const row=listing.result.tools.find(row=>row.name==='oncall.triage.list');assert.ok(row);
   assert.equal(row.annotations.readOnlyHint,true);assert.equal(row._meta['com.runeditrun/scope'],'incidents:read');
   assert.deepEqual(row._meta['com.runeditrun/classes'],['standard','sensitive']);assert.deepEqual(row._meta['com.runeditrun/clauses'],['OC-060']);
   const guide=await http('/docs/agents');assert.equal(guide.status,200);assert.match(await guide.text(),/<code>oncall.triage.list<\/code>/);
   const all=await expect({},expectedIncidents),native=await complete('oncall.incidents.list');
   assert.equal(all.data.workspaceRevision,before.application.revision,'The result names the current workspace revision');
   assert.equal(all.initialDecision.disposition,native.initialDecision.disposition);
   assert.deepEqual(all.initialDecision.classes.map(row=>row.class),['standard','sensitive']);
   assert.equal(all.initialDecision.disposition,label==='held'?'approval':'autonomous');
   assert.equal(all.answer.result._meta['com.runeditrun/untrusted'],true);
   for(const item of all.data.items){
    const {kind,triageStatus,...record}=item;
    assert.equal(kind,'incident');assert.deepEqual(record,native.data.find(row=>row.id===item.id),'Incident records match the shipped incident list projection');
    assert.equal(triageStatus,item.id===fixture.snoozed.id?'snoozed':'triggered');
   }
   const standard=await expect({q:'unassignedneedle'},[fixture.unassigned.id]);
   assert.deepEqual(standard.initialDecision.classes.map(row=>row.class),['standard']);
   assert.equal(standard.initialDecision.disposition,label==='held'?'review':'autonomous');
   const first=await read({limit:1}),repeat=await read({limit:1});cursor=first.data.nextCursor;
   assert.deepEqual(first.data,repeat.data,'Repeated reads retain stable ordering and cursor');
   let page=first.data,pages=1,seen=[...ids(page)];
   while(page.nextCursor){page=(await read({limit:1,cursor:page.nextCursor})).data;assert.equal(page.total,3);seen.push(...ids(page));assert.ok(++pages<=3);}
   assert.equal(page.nextCursor,null);assert.equal(pages,3);assert.deepEqual(seen,expectedIncidents);
   const normalized=await read({q:'  SYNTHETIC   triage ',limit:1});
   assert.deepEqual(ids((await read({q:'synthetic triage',kind:'incidents',sort:'created',limit:1,cursor:normalized.data.nextCursor})).data),[fixture.snoozed.id]);
   await expect({status:'snoozed'},[fixture.snoozed.id]);
   await expect({status:'acknowledged'},[]);
   await expect({status:'declared'},[fixture.unassigned.id,fixture.declared.id]);
   await expect({status:'open'},expectedIncidents);
   await expect({severity:'critical',urgency:'high',priority:'P1',service:'agent-service',assignee:fixture.owner.id,mine:'true'},[fixture.declared.id]);
   await expect({mine:'true'},[fixture.snoozed.id,fixture.declared.id]);
   await expect({assignee:'unassigned',priority:'unset'},[fixture.unassigned.id]);
   await expect({q:'fOrEiGnNeEdLe'},[]);
   await expect({createdAfter:fixture.start,createdBefore:fixture.end,updatedAfter:fixture.start,updatedBefore:fixture.end},expectedIncidents);
   await expect({createdBefore:fixture.start},[]);await expect({updatedAfter:fixture.end},[]);
   await expect({sort:'priority'},[fixture.declared.id,fixture.snoozed.id,fixture.unassigned.id]);
   await expect({sort:'urgency'},[fixture.declared.id,fixture.unassigned.id,fixture.snoozed.id]);
   await expect({sort:'updated'},expectedIncidents);
   const sponsor=await complete('oncall.triage.list',{service:'agent-service',mine:'true'},null);
   assert.deepEqual(ids(sponsor.data),[fixture.snoozed.id,fixture.declared.id],'Business agent mine also resolves to its sponsoring member');
   const alerts=await expect({kind:'alerts'},expectedAlerts),alertList=await complete('oncall.alerts.list');
   for(const item of alerts.data.items){const {kind,triageStatus,...record}=item;assert.equal(kind,'alert');assert.equal(triageStatus,'triggered');assert.deepEqual(record,alertList.data.alerts.find(row=>row.id===item.id),'Alert records use the shipped allowlist');}
   let alertPage=(await read({kind:'alerts',limit:1})).data,alertIds=[...ids(alertPage)];
   while(alertPage.nextCursor){alertPage=(await read({kind:'alerts',limit:1,cursor:alertPage.nextCursor})).data;assert.equal(alertPage.total,3);alertIds.push(...ids(alertPage));assert.ok(alertIds.length<=3);}
   assert.deepEqual(alertIds,expectedAlerts);
   await expect({kind:'alerts',q:'native alert',severity:'warning',urgency:'high',priority:'P3',mine:'true'},[fixture.nativeOnly.id]);
   await expect({kind:'alerts',assignee:fixture.responder.id,priority:'unset',urgency:'low'},[fixture.routedOnly.id]);
   await expect({kind:'alerts',mine:'true'},[fixture.nativeOnly.id]);
   await expect({kind:'alerts',q:'foreignneedle'},[]);
   await expect({kind:'alerts',createdAfter:fixture.start,createdBefore:fixture.end,updatedAfter:fixture.start,updatedBefore:fixture.end},[fixture.routedOnly.id,fixture.nativeOnly.id]);
   await expect({kind:'alerts',status:'snoozed'},[]);
   for(const sort of ['priority','urgency'])await expect({kind:'alerts',q:'synthetic triage',sort},[fixture.nativeOnly.id,fixture.routedOnly.id]);
   await expect({kind:'alerts',q:'synthetic triage',sort:'updated'},[fixture.routedOnly.id,fixture.nativeOnly.id]);
   for(const args of [{cursor:'broken'},{cursor,q:'different'},{cursor,kind:'alerts'}]){
    const refused=await call(args);assert.equal(code(refused),'invalid_cursor');assert.equal(refused.result.structuredContent,undefined);clean(refused.body);
   }
   const otherPrincipal=await call({cursor},other.token);assert.equal(code(otherPrincipal),'invalid_cursor');assert.equal(otherPrincipal.result.structuredContent,undefined);
   for(const args of [{limit:0},{limit:101},{kind:'teams'},{mine:'false'}]){const refused=await call(args);assert.equal(code(refused),'invalid_arguments',JSON.stringify({args,body:refused.body}));}
   for(const args of [{createdAfter:fixture.end,createdBefore:fixture.start},{updatedBefore:'not-a-date'}]){const refused=await call(args);assert.ok(code(refused));assert.equal(refused.result?.structuredContent,undefined);}
   const denied=await call({service:'agent-foreign-service'});assert.equal(code(denied),'not_found');assert.equal(denied.result.structuredContent,undefined);
   const insufficient=await call({},noRead.token);assert.equal(insufficient.status,403);assert.equal(code(insufficient),'insufficient_scope');assert.equal(insufficient.result?.structuredContent,undefined);
   assertAgentReadUnchanged(before,await agentReadSnapshot(runtime));assert.deepEqual(await runtime.outboundRequests(),edge);assert.deepEqual(edge,[]);
   console.log('PROBE SURFACE-001 1 '+label+': MCP triage search and filters -> exactly three scoped incidents and three alert-only items with sponsor mine, snoozed status past due, stable cursor pages and scoped totals; foreign merged text and unrouted records absent; policy parity, current guide, no native effects and zero outbound requests');
  }
  // Every cursor is bound to the current native workspace, even when the edit
  // changes a record that the service-scoped reader cannot see.
  await json('/api/command',{type:'note',incident:fixture.foreignIncident.id,revision:fixture.foreignIncident.revision,text:'Synthetic workspace change'});
  const changedBefore=await agentReadSnapshot(runtime),changed=await call({cursor});
  assert.equal(code(changed),'invalid_cursor');assert.equal(changed.result.structuredContent,undefined);
  assertAgentReadUnchanged(changedBefore,await agentReadSnapshot(runtime));
  await json('/api/automation/clients/'+reader.record.id+'/revoke',{revision:reader.record.revision});
  const revokedBefore=await agentReadSnapshot(runtime),revoked=await call({cursor});assert.equal(revoked.status,401);assert.equal(revoked.result,undefined);
  assertAgentReadUnchanged(revokedBefore,await agentReadSnapshot(runtime));assert.deepEqual(await runtime.outboundRequests(),[]);
  console.log('PASS scoped triage reads: populated native D1 and emitted MCP, both policies, all native query fields, sponsor attribution, allowlisted records, cursor revision and principal and grant refusals, revoked and insufficient credentials, unchanged deadlines and paging and permanent audit; zero outbound requests');
 }finally{await runtime.close()}
}
