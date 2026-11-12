import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const {agentRuntime}=await import(pathToFileURL(resolve('tests/agent-door-runtime.mjs')));
const {heldPolicy}=await import(pathToFileURL(resolve('src/modules/agent-door/conformance/crypto.mjs')));
const runtime=await agentRuntime();
try {
 assert.equal((await runtime.adopt(heldPolicy())).status,200);
 const state=async()=>({native:await (await runtime.http('/api/state')).json(),paging:await (await runtime.http('/api/paging/state')).json()});
 const before=await state();
 const standard=await runtime.mcp('resources/read',{uri:'oncall://services/agent-service'});
 assert.deepEqual(standard.decision.classes.map(row=>row.class),['standard']);
 assert.equal(standard.decision.disposition,'review');
 assert.equal(standard.body.error,undefined);
 assert.equal(JSON.parse(standard.result.contents[0].text).id,'agent-service');
 assert.ok(standard.result._meta['com.runeditrun/review'].id);
 const sensitive=await runtime.completeResource('oncall://schedules/agent-schedule/coverage');
 assert.deepEqual(sensitive.initial.decision.classes.map(row=>row.class),['standard','sensitive']);
 assert.equal(sensitive.initial.decision.disposition,'approval');
 assert.equal(sensitive.initial.body.error.data.code,'approval_required');
 assert.equal(sensitive.initial.result,undefined);
 assert.ok(sensitive.value.people.length>0,'The approved resource contains actual named native profiles');
 assert.ok(sensitive.value.people.every(person=>typeof person.name==='string'&&person.name.length));
 assert.deepEqual(await state(),before);
 assert.deepEqual(await runtime.outboundRequests(),[]);
 console.log(JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),result:'passed',clock:'real',standard:'review with content and review handle',sensitive:'approval_required without content, exact native approval then named coverage profiles',nativeUnchanged:true,pagingUnchanged:true,outboundRequests:0}));
} finally {await runtime.close()}
