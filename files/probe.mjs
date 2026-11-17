import assert from 'node:assert/strict';
import {readFile, writeFile, rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = resolve(process.argv[2]);
process.chdir(root);
const packet = resolve(process.argv[3]);
const builtPath = 'dist/server/wrangler.json';
const builtBytes = await readFile(builtPath);
const build = JSON.parse(builtBytes);
const policyPath = 'scripts/delivery/base/packaging.json';
const policy = JSON.parse(await readFile(policyPath));
const native = JSON.parse(await readFile('management/integration/deployment-spec.json'));
const outputs = ['delivery-artifact', 'delivery-artifact'];
await rm(outputs[0],{recursive:true,force:true});
const cli = output => spawnSync(process.execPath, ['scripts/build-delivery-artifact.mjs'], {encoding:'utf8', timeout:180000});
const receipt = {schema:1, author:'Run Edit Run fleet', date:'2026-11-17', productHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), node:process.version, negativeControl:{kind:'remove only MAIL_FROM from emitted Wrangler vars; not a failure on current main'}};
try {
 assert.equal(policy.artifact.specInputs.publicVariableNames.filter(name=>name==='MAIL_FROM').length,1);
 assert.ok(![...policy.artifact.specInputs.secretNames,...policy.artifact.specInputs.optionalSecretNames].includes('MAIL_FROM'));
 assert.equal(build.vars.MAIL_FROM,'');
 const missing = structuredClone(build);
 delete missing.vars.MAIL_FROM;
 await writeFile(builtPath,JSON.stringify(missing));
 const before = cli(outputs[0]);
 assert.equal(before.status,1);
 assert.match(before.stderr,/Managed mail requires one public MAIL_FROM sender, not a secret MAIL_FROM/);
 receipt.negativeControl.exit=before.status;
 receipt.negativeControl.error='Managed mail requires one public MAIL_FROM sender, not a secret MAIL_FROM';
 console.log('NEGATIVE CONTROL: omitted emitted MAIL_FROM reproduces the reported error (exit 1).');
} finally {
 await writeFile(builtPath,builtBytes);
 await rm(outputs[0],{recursive:true,force:true});
}
try {
 const after = cli(outputs[1]);
 assert.equal(after.status,0,after.stderr);
 const bytes = await readFile(`${outputs[1]}/rer-worker-artifact.json`);
 const artifact = JSON.parse(bytes);
 assert.equal(artifact.schema,2);
 assert.equal(artifact.deploymentSpec.publicVariables.MAIL_FROM,'');
 assert.deepEqual(artifact.deploymentSpec,native);
 assert.deepEqual(await readFile(builtPath),builtBytes);
 receipt.currentMain = {exit:after.status,schema:artifact.schema,mailFromPublic:true,mailFromValue:'',matchesNativeDeploymentSpec:true,builtWranglerRestored:true,manifestSha256:createHash('sha256').update(bytes).digest('hex'),moduleCount:artifact.modules?.length,assetCount:artifact.assets?.length};
 console.log('CURRENT MAIN: direct packaging passes (exit 0); public empty MAIL_FROM retained; complete artifact specification equals native deployment plan.');
 receipt.worktreeStatus = execFileSync('git',['status','--porcelain'],{encoding:'utf8'});
 assert.equal(receipt.worktreeStatus,'');
 await writeFile(resolve(packet,'packaging-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
} finally {
 await rm(outputs[1],{recursive:true,force:true});
}
