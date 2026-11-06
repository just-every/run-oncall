import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {spawnSync,execFileSync} from 'node:child_process';
import {verificationPlan,lightReaders} from './scripts/verify-oncall-plan.mjs';
const before=JSON.parse(await readFile('../packet/before-discovery.json'));
const after=JSON.parse(await readFile('../packet/after-discovery.json'));
const registrations=rows=>rows.filter(x=>x.command==='node'&&x.args[0]?.startsWith('tests/')).map(({args,runtimePart})=>JSON.stringify({args,runtimePart})).sort();
assert.deepEqual(before.test_sources,after.test_sources);
for(const category of ['default','--flows','--browser'])assert.deepEqual(registrations(before.selections['all:'+category]),registrations(after.selections['all:'+category]));
for(const capture of [before,after]) {
 const selection=capture.plan.push.flatMap(shard=>shard.lanes.flatMap(lane=>registrations(capture.selections[lane+':default'])));
 assert.deepEqual([...selection].sort(),registrations(capture.selections['all:default']));
 assert.equal(new Set(selection).size,selection.length);
 assert.equal(capture.plan.push.filter(x=>x.hosted).length,1);
 assert.equal(capture.plan.nightly.length,0);
}
const {push,nightly}=verificationPlan();
assert.equal(push.length,8);assert.deepEqual(nightly,[]);
assert.deepEqual(push.filter(x=>x.browser).map(x=>x.name),['browser','hosted','transfer']);
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const receipt='dist/.oncall-verification.json';
let prior;try {prior=await readFile(receipt)}catch(error){if(error.code!=='ENOENT')throw error}
await writeFile(receipt,JSON.stringify({sha}));
const executions={};
try {
 for(const shard of push) {
  const env={...process.env};delete env.ONCALL_VERIFY_LANE;delete env.ONCALL_RUNTIME_PART;
  const result=spawnSync(process.execPath,['--import','/tmp/oncall-discovery-preload.mjs','scripts/verify-oncall.mjs',shard.name],{env,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  executions[shard.name]=result.stdout.split('\n').filter(x=>x.startsWith('SELECTION ')).map(x=>JSON.parse(x.slice(10)));
  assert.deepEqual(executions[shard.name].map(x=>x.lane),shard.lanes);
  for(const x of executions[shard.name]) {
   assert.equal(x.command,'pnpm');assert.equal(x.prebuilt,'true');
   assert.deepEqual(x.args,x.lane==='hosted'?['exec','rer','verify','--non-interactive']:['run','verify:app']);
  }
 }
 const unknown=spawnSync(process.execPath,['tests/verify.mjs'],{env:{...process.env,ONCALL_VERIFY_LANE:'not-a-lane'},encoding:'utf8'});
 assert.notEqual(unknown.status,0);assert.match(unknown.stderr,/Unknown verification lane/);
} finally {if(prior)await writeFile(receipt,prior);else await unlink(receipt)}
assert.deepEqual(await lightReaders(['CONTRACT.md'],{plan:{push,nightly}}),['node src/base/contract-docs.mjs check','pnpm run build']);
assert.equal(await lightReaders(['scripts/verify-shards.json'],{plan:{push,nightly}}),undefined);
const coverage={beforeShards:before.plan.push.length,afterShards:push.length,registrationsBefore:registrations(before.selections['all:default']).length,registrationsAfter:registrations(after.selections['all:default']).length,duplicateRegistrations:0,testFilesByteIdentical:Object.keys(after.test_sources).length,executions,runtimeParts:['core','machines'],hostedLinkedPages:'unchanged runtime core guard executes exactly once; machines excludes the hosted-page block',otherChecks:['default, --flows and --browser multisets unchanged','every push lane invoked once with shared exact-SHA production build','hosted rer verify remains exactly once','browser flags unchanged','nightly empty tier unchanged; all tier retains all push lanes','unknown lane fails closed; shard JSON remains code change/full coverage']};
await writeFile('../packet/coverage-proof.json',JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify(coverage,null,2));
