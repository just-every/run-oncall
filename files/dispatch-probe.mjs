import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {spawnSync,execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {verificationPlan,lightReaders}=await import(pathToFileURL(resolve('scripts/verify-oncall-plan.mjs')));
const plan=verificationPlan(),receipt='dist/.oncall-verification.json',sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
let previous;try{previous=await readFile(receipt)}catch(e){if(e.code!=='ENOENT')throw e;}
await writeFile(receipt,JSON.stringify({sha})+'\n');
const executions={};
try{
 for(const shard of plan.push){
  const env={...process.env};for(const key of ['ONCALL_VERIFY_LANE','ONCALL_RUNTIME_PART','ONCALL_TRIAGE_PART','ONCALL_VERIFY_PREBUILT','PROBE_BEFORE'])delete env[key];
  const result=spawnSync(process.execPath,['--import','/tmp/oncall-discovery-preload.mjs','scripts/verify-oncall.mjs',shard.name],{env,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const rows=result.stdout.split('\n').filter(x=>x.startsWith('SELECTION ')).map(x=>JSON.parse(x.slice(10)));
  assert.deepEqual(rows.map(x=>x.lane),shard.lanes);
  for(const row of rows){assert.equal(row.prebuilt,'true');assert.equal(row.command,'pnpm');assert.deepEqual(row.args,row.lane==='hosted'?['exec','rer','verify','--non-interactive']:['run','verify:app']);}
  executions[shard.name]=rows;
 }
 for(const lane of Object.keys((await import(pathToFileURL(resolve('scripts/verify-oncall-plan.mjs')))).lanes)){
  const result=spawnSync(process.execPath,['--import','/tmp/oncall-discovery-preload.mjs','tests/verify.mjs'],{env:{...process.env,ONCALL_VERIFY_LANE:lane,ONCALL_VERIFY_PREBUILT:'true'},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const rows=result.stdout.split('\n').filter(x=>x.startsWith('SELECTION ')).map(x=>JSON.parse(x.slice(10)));
  assert.ok(rows.every(x=>x.command==='node'&&x.args[0].startsWith('tests/')),'prebuilt lane must not rebuild or typecheck');
 }
 const bad=spawnSync(process.execPath,['tests/verify.mjs'],{env:{...process.env,ONCALL_VERIFY_LANE:'unknown'},encoding:'utf8'});assert.notEqual(bad.status,0);assert.match(bad.stderr,/Unknown verification lane/);
 await writeFile(receipt,JSON.stringify({sha:'0'.repeat(40)}));
 const stale=spawnSync(process.execPath,['tests/verify.mjs'],{env:{...process.env,ONCALL_VERIFY_PREBUILT:'true'},encoding:'utf8'});assert.notEqual(stale.status,0);assert.match(stale.stderr,/Shared verification build must match/);
}finally{if(previous)await writeFile(receipt,previous);else await unlink(receipt);}
assert.deepEqual(await lightReaders(['CONTRACT.md'],{plan}),['node src/base/contract-docs.mjs check','pnpm run build']);
for(const path of ['scripts/verify-shards.json','tests/triage.mjs','tests/verify.mjs'])assert.equal(await lightReaders([path],{plan}),undefined);
assert.ok(plan.push.length<=8);assert.deepEqual(plan.nightly,[]);assert.deepEqual(plan.push.filter(x=>x.browser).map(x=>x.name),['browser','hosted','transfer']);
console.log(JSON.stringify({executions,exact_sha_build_refusal:true,prebuilt_lanes_do_not_prepare:true,changed_harness_requires_full_coverage:true,worker_counts_and_timeouts_unchanged:true},null,2));
