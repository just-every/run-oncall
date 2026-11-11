import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {randomUUID} from 'node:crypto';
import {accessToken,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';
import {discoverDoor,listedDoor} from '../src/modules/agent-door/conformance/discovery.mjs';
import {refusalPhase,scopedSurface} from '../src/modules/agent-door/conformance/subset.mjs';
import {recoveredResolutionTarget} from './oncall-agent-fixtures.mjs';

// Read retained rows without an export's own audit writes. Empty tables remain
// present, so a refused call cannot create custody in a previously empty store.
async function records(db) {
 const {results:names}=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name").all();
 const result={};
 for(const {name} of names){
  const {results}=await db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all();
  result[name]=results.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 }
 return result;
}
function withoutRefusalBookkeeping(snapshot) {
 const {agent_door_audit,agent_door_relay,oc_admin_audit,oc_audit_clock,...retained}=snapshot;
 // Capacity counters record accepted transport traffic, including refusals.
 retained.agent_door_agents=retained.agent_door_agents.map(({window,requests,...identity})=>identity);
 return retained;
}
function refusalAudit(before,after) {
 const old=new Map(before.agent_door_audit.map(row=>[row.id,row]));
 for(const row of after.agent_door_audit.filter(row=>old.has(row.id)))assert.deepEqual(row,old.get(row.id),'Prior agent audit is immutable');
 assert.equal(after.agent_door_audit.filter(row=>old.has(row.id)).length,old.size);
 const added=after.agent_door_audit.filter(row=>!old.has(row.id));
 assert.deepEqual(added.map(row=>JSON.parse(row.row).tool),['resources/read'],'Only the undeclared resource read enters the tool refusal audit pipeline');
 for(const record of added){
  const row=JSON.parse(record.row);
  assert.equal(row.code,'capability_not_declared');assert.equal(row.outcome,'refused');
  assert.equal(row.decision_id,null);assert.equal(row.approval,null);assert.equal(row.review,null);
  assert.deepEqual(row.classes,[]);assert.equal(record.evidence,null);
 }
 const previous=new Set(before.agent_door_relay.map(row=>JSON.stringify(row)));
 assert.equal(after.agent_door_relay.filter(row=>previous.has(JSON.stringify(row))).length,previous.size);
 const relayed=after.agent_door_relay.filter(row=>!previous.has(JSON.stringify(row)));
 assert.deepEqual(relayed.map(row=>row.decision_id).sort(),added.map(row=>row.id).sort(),'Only the required refusal audit is relayed');
 const permanent=new Map(before.oc_admin_audit.map(row=>[row.id,row]));
 const retained=after.oc_admin_audit.filter(row=>permanent.has(row.id));
 assert.equal(retained.length,permanent.size);
 for(const row of retained)assert.deepEqual(row,permanent.get(row.id),'Prior permanent audit is immutable');
 const persistence=after.oc_admin_audit.filter(row=>!permanent.has(row.id));
 assert.ok(persistence.length,'Transport admission and refusal custody retain their required atomic audit');
 for(const row of persistence){
  assert.equal(row.kind,'agent-door.persistence','No native action may be audited as executed');
  for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_after'],row[family+'_before'],'Refusal bookkeeping changes no native revision');
 }
 const [clock]=after.oc_audit_clock;
 assert.equal(clock.agent_event_context,0);
 for(const family of ['workspace','paging','handoff'])assert.equal(clock[family+'_before'],before.oc_audit_clock[0][family+'_before']);
}

/** All seven native transport outcomes under each company policy, over HTTP. */
export async function nativeTransport(runtime) {
 const {http,db,adopt,tool}=runtime;
 assert.equal((await adopt(heldPolicy())).status,200);
 assert.ok((await tool('oncall.services.read',{id:'agent-service'})).result._meta['com.runeditrun/review']);
 const c={...runtime.context,surface:scopedSurface(runtime.context.surface),
  request:(path,init)=>runtime.request(new URL(path,runtime.origin).href,init),
  mcp:(method,params,options)=>runtime.mcp(method,params,{},undefined,options),tool,
  add:(id,ok,detail)=>assert.ok(ok,`${id}: ${detail??'Transport assertion failed'}`),
  witness:async()=>withoutRefusalBookkeeping(await records(db)),
 };
 for(const [phase,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await adopt(policy)).status,200);
  // This modern request precedes initialize in the autonomous round.
  const discovered=await c.mcp('server/discover');assert.equal(discovered.status,200);
  await discoverDoor(c);await listedDoor(c);
  const max=discovered.result._meta['com.runeditrun/limits'].maxBodyBytes;
  console.log(`PROBE BASE-AGENT-001 ${phase} points 1-5: emitted Worker discovery, modern stateless request, legacy tool parity, unsupported-version refusal, deterministic private lists, foreign Origin and HeaderMismatch -> pass`);

  // Native human recovery produces a real, revisioned mutation target. The
  // review custody is already populated before the refusal snapshot.
  const target=await recoveredResolutionTarget(runtime,'Synthetic transport '+phase);
  const args={incident:target.id,revision:target.revision,summary:'Synthetic transport recovery accepted',idempotency_key:randomUUID()};
  const envelope={jsonrpc:'2.0',id:randomUUID(),method:'tools/call',params:{name:'oncall.incidents.resolve',arguments:args,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientCapabilities':{elicitation:{url:{}}}}}};
  const body=JSON.stringify(envelope),padded=body+' '.repeat(max+1-Buffer.byteLength(body));
  assert.deepEqual(JSON.parse(padded),envelope,'Only legal JSON whitespace exceeds the advertised byte bound');
  const headers={Origin:runtime.origin,Authorization:'Bearer '+await accessToken(runtime.context,{act:{sub:runtime.context.agentId,name:'Responder assistant',specialist:'oncall-responder'}}),Accept:'application/json, text/event-stream','Content-Type':'application/json','MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/call','Mcp-Name':'oncall.incidents.resolve'};
  const send=body=>runtime.request(runtime.origin+'/mcp',{method:'POST',headers,body});
  const before=await records(db),edge=await runtime.outboundRequests();
  assert.ok(before.agent_door_calls.length&&before.agent_door_approvals.length,'Replay and approval custody must already be populated');
  assert.ok(before.agent_door_reviews.length,'Review custody must already be populated');
  const oversized=await send(padded);assert.equal(oversized.status,413);await oversized.body?.cancel();
  assert.ok(isDeepStrictEqual(await records(db),before),'Oversized mutation changes no application record, revision, timeline, permanent audit, replay, approval, review or paging record');
  assert.deepEqual(await runtime.outboundRequests(),edge);assert.deepEqual(edge,[],'Native transport attempts no outbound request');
  console.log(`PROBE BASE-AGENT-001 ${phase} point 6: authenticated native resolution with ${Buffer.byteLength(padded)} bytes of valid JSON -> 413, every retained table unchanged, zero outbound requests`);

  // The exact same envelope without padding must reach its ordinary policy
  // disposition and finish once; an invalid mutation cannot stand in as proof.
  const accepted=await send(body);assert.equal(accepted.status,200);const answer=await accepted.json();
  if(phase==='held'){
   assert.equal(answer.result.resultType,'input_required');
   const handle=answer.result._meta['com.runeditrun/approval'];assert.ok(handle);
   const pending=(await (await http('/agents/api/approvals/'+handle.id)).json()).approval;
   assert.equal(pending.summary.nativeTarget.id,target.id);
   const approved=await http('/agents/api/approvals/'+handle.id+'/approve',{revision:pending.revision,summary_sha256:pending.summary_sha256});
   assert.equal(approved.status,200);assert.equal((await approved.json()).approval.state,'executed');
  }else assert.equal(answer.result.isError,false);
  const state=await (await http('/api/state')).json(),saved=state.incidents.find(row=>row.id===target.id);
  assert.equal(saved.state,'resolved');assert.equal(saved.revision,target.revision+1);
  assert.equal(saved.timeline.filter(row=>row.lifecycle?.to==='resolved').length,1);

  const prior=await records(db);await refusalPhase(c);const after=await records(db);
  assert.deepEqual(withoutRefusalBookkeeping(after),withoutRefusalBookkeeping(prior),'Undeclared capabilities create no application or decision custody');
  refusalAudit(prior,after);
  assert.deepEqual(await runtime.outboundRequests(),edge);
  console.log(`PROBE BASE-AGENT-001 ${phase} point 7: undeclared resources, prompts and subscriptions -> capability_not_declared, unchanged retained records, only required refusal audit, zero outbound requests`);
 }
 assert.equal((await adopt()).status,200);
}
