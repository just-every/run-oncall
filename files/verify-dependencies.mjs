import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const {parse}=await import(pathToFileURL(resolve('scripts/edition-authoring/vendor/yaml/index.mjs')));
const manifestBytes=readFileSync('package.json');
const lockBytes=readFileSync('pnpm-lock.yaml');
const manifest=JSON.parse(manifestBytes);
const lock=parse(lockBytes.toString());
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const version=value=>{
 const match=String(value).match(/^(\d+)\.(\d+)\.(\d+)(?:\(|$)/);
 assert.ok(match, 'resolved version must be a stable semantic version');
 return match.slice(1).map(Number);
};
const compare=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]-b[i];}return 0;};
const checks=[];
for(const [name,lower,patched] of [
 ['@tanstack/react-start','1.143.12','1.168.60'],
 ['@tanstack/start-server-core','1.143.12','1.169.39'],
]){
 const rows={name,vulnerableRange: '>='+lower+' <'+patched,patched,packages:[],snapshots:[],references:[]};
 for(const section of ['packages','snapshots']){
  const entries=Object.keys(lock[section]).filter(key=>key.startsWith(name+'@'));
  assert.ok(entries.length, name+' must have '+section);
  for(const key of entries){
   const resolved=key.slice(name.length+1);
   const parsed=version(resolved);
   assert.ok(compare(parsed,version(patched))>=0,key+' must be patched');
   assert.ok(!(compare(parsed,version(lower))>=0&&compare(parsed,version(patched))<0),key+' must not be vulnerable');
   rows[section].push(key);
  }
 }
 for(const [parent,snapshot] of Object.entries(lock.snapshots)){
  for(const field of ['dependencies','optionalDependencies']){
   const resolved=snapshot[field]?.[name];
   if(resolved!==undefined){
    assert.ok(compare(version(resolved),version(patched))>=0,parent+' must resolve patched '+name);
    assert.ok(lock.snapshots[name+'@'+resolved], 'dependency reference must have a snapshot');
    rows.references.push({parent,field,version:resolved});
   }
  }
 }
 checks.push(rows);
}
const direct=manifest.dependencies['@tanstack/react-start'];
const importer=lock.importers['.'].dependencies['@tanstack/react-start'];
assert.equal(importer.specifier,direct,'manifest and lock importer must agree');
assert.equal(version(importer.version).join('.'),direct,'direct importer must resolve exact manifest pin');
assert.ok(compare(version(direct),version('1.168.60'))>=0,'manifest direct dependency must be patched');
const head=git('rev-parse','HEAD');
assert.equal(head,git('rev-parse','origin/main'),'no-change result must describe current fetched main');
const fix='d009af8859f38727c619df281f93920ca9afd5ed';
git('merge-base','--is-ancestor',fix,'origin/main');
assert.equal(git('status','--porcelain'),'','product checkout must remain clean');
const receipt={
 tag:'gr-mt-oncall-dep-1',repository:'just-every/run-oncall',status:'no-change',
 advisory:'GHSA-qx66-fv34-fjm8',head,branch:git('branch','--show-current'),
 fixAlreadyOnMain:fix,manifestDirect:direct,importer,packageManager:manifest.packageManager,
 sha256:{'package.json':createHash('sha256').update(manifestBytes).digest('hex'),'pnpm-lock.yaml':createHash('sha256').update(lockBytes).digest('hex')},
 checks,vulnerableResolvedPackagesBefore:0,vulnerableResolvedPackagesAfter:0,
 productFilesChanged:0,newProductCommits:0,
 assertions:'PASS: manifest/importer agreement; all affected package and snapshot versions patched; all affected transitive references patched and backed by snapshots; existing fix is an ancestor of fetched main; HEAD equals fetched main; clean checkout',
 localInstallBuildTypecheck:'NOT RUN: no-change investigation; no application code or dependency files changed; exact-SHA successful Verify and Nightly journeys observed separately in ci-runs.json',
};
writeFileSync(resolve(process.env.PACKET,'dependency-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
