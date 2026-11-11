import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const {agentRuntime}=await import(pathToFileURL(resolve('tests/agent-door-runtime.mjs')));
const {autonomousPolicy,heldPolicy}=await import(pathToFileURL(resolve('src/modules/agent-door/conformance/crypto.mjs')));
const runtime=await agentRuntime(),observations=[];
try{
 for(const [mode,document] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await runtime.adopt(document)).status,200);
  const reply=await runtime.tool('oncall.events.list',{limit:200});
  assert.equal(reply.status,200);assert.equal(reply.result.isError,false);
  const event=reply.result.structuredContent.events.findLast(row=>row.type==='policy.adopted');
  assert.ok(event);assert.equal(event.revision,runtime.context.revision);
  observations.push({mode,event,hasClasses:Array.isArray(event.classes)&&event.classes.length>0,hasDecision:typeof event.decision_id==='string'||typeof event.decision==='string'});
 }
 const outbound=await runtime.outboundRequests();assert.deepEqual(outbound,[]);
 console.log(JSON.stringify({head,probe:'BASE-AGENT-010.6 policy.adopted class and decision',observations,outboundRequests:outbound},null,2));
 assert.ok(observations.every(row=>row.hasClasses&&row.hasDecision),'policy.adopted must carry its class and decision; emitted Base events contain neither under either company policy');
}finally{await runtime.close()}
