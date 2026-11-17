import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentRuntime} from './agent-door-runtime.mjs';
import {roleClearReplay} from './oncall-agent-role-clear-replay.mjs';

/** Explicit Assignee Unassigned retains the Commander without restoring its fallback. */
export async function focusedAssigneeClearReplay(){
 const runtime=await agentRuntime({clock:null});
 try{
  assert.equal((await runtime.adopt()).status,200);
  const workspace=await runtime.http('/api/workspace');assert.equal(workspace.status,200);
  const owner=(await workspace.json()).member;
  const service=await runtime.http('/api/command',{type:'service',id:'agent-foreign-service',
   name:'Synthetic separate clear scope',environment:'production',owner:owner.id,runbook:[],pager:''});
  assert.equal(service.status,200);await service.json();
  // Preserve completed calls from other tools in every clear and replay baseline.
  const declared=await runtime.tool('oncall.incidents.declare',{service:'agent-service',title:'Synthetic unrelated retained incident',
   summary:'Synthetic independent coordination',severity:'warning',idempotency_key:randomUUID()});
  assert.equal(declared.status,200);assert.equal(declared.result.isError,false);
  const incident=declared.result.structuredContent;
  const noted=await runtime.tool('oncall.notes.add',{incident:incident.id,revision:incident.revision,
   text:'Synthetic unrelated retained note',idempotency_key:randomUUID()});
  assert.equal(noted.status,200);assert.equal(noted.result.isError,false);
  assert.deepEqual(await runtime.outboundRequests(),[]);
  const originals=(await runtime.db.prepare('SELECT * FROM agent_door_calls ORDER BY agent,key').all()).results;
  assert.equal(originals.length,2,'Both unrelated native mutations retain their original calls');
  await roleClearReplay(runtime,'assignee','Assignee');
  const retained=(await runtime.db.prepare('SELECT * FROM agent_door_calls ORDER BY agent,key').all()).results;
  for(const call of originals)assert.deepEqual(retained.find(row=>row.agent===call.agent&&row.key===call.key),call,
   'The complete matrix and its final policy restoration retain unrelated outcomes and their original expiry');
 }finally{await runtime.close()}
}
