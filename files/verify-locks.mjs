// Run Edit Run fleet, 2026-11-15. One-off report evidence; never a product test.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {encoding:'utf8'}).trim();
const { parse } = await import(pathToFileURL(`${root}/scripts/edition-authoring/vendor/yaml/index.mjs`));
const head = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const fixedBy = 'c682f802d4ae3e34caa65c5c99e9c2b45f715844';
execFileSync('git', ['merge-base', '--is-ancestor', fixedBy, head]);
const rows = [];
for (const directory of ['.', 'src/modules/mail']) {
  const manifest = JSON.parse(readFileSync(`${directory}/package.json`, 'utf8'));
  const lock = parse(readFileSync(`${directory}/pnpm-lock.yaml`, 'utf8'));
  assert.deepEqual(lock.overrides, manifest.pnpm.overrides);
  const packageEntries = Object.keys(lock.packages).filter(key => key.startsWith('undici@'));
  const snapshots = Object.keys(lock.snapshots).filter(key => key.startsWith('undici@'));
  assert.ok(packageEntries.length > 0);
  assert.deepEqual(packageEntries, snapshots);
  for (const key of packageEntries) {
    const version = key.slice('undici@'.length).split('(')[0];
    const parts = version.split('.').map(Number);
    assert.ok(parts.length === 3 && parts.every(Number.isInteger));
    assert.ok(parts[0] > 7 || parts[0] === 7 && (parts[1] > 30 || parts[1] === 30 && parts[2] >= 1));
    assert.ok(lock.packages[key].resolution.integrity);
  }
  const edges = [];
  for (const [parent, entry] of Object.entries(lock.snapshots)) {
    for (const kind of ['dependencies','optionalDependencies']) {
      for (const [name, version] of Object.entries(entry[kind] || {})) {
        if (name === 'undici' || String(version).startsWith('undici@') || String(version).startsWith('npm:undici@')) {
          assert.equal(name, 'undici', `unreviewed alias ${parent}: ${name}`);
          assert.ok(packageEntries.includes(`undici@${version}`));
          edges.push({parent,kind,version});
        }
      }
    }
  }
  assert.ok(edges.length > 0);
  for (const kind of ['dependencies','devDependencies','optionalDependencies']) {
    for (const [name,specifier] of Object.entries(manifest[kind] || {})) {
      assert.equal(lock.importers['.'][kind][name].specifier,specifier);
    }
  }
  const before = parse(execFileSync('git', ['show', `${fixedBy}^:${directory === '.' ? '' : directory + '/'}pnpm-lock.yaml`], {encoding:'utf8'}));
  const vulnerableBefore = Object.keys(before.packages).filter(key => key.startsWith('undici@') && key !== 'undici@7.30.1');
  rows.push({directory,override:manifest.pnpm.overrides.undici,packages:packageEntries,snapshots,edges,engine:lock.packages[packageEntries[0]].engines.node,historicalBefore:vulnerableBefore,vulnerableInstancesNow:0});
}
const receipt = {author:'Run Edit Run fleet',date:'2026-11-15',status:'pass',head,fixedBy,rows,scope:'Dependency resolution only; no exploit execution or runtime compatibility claim.'};
const packet = process.env.HOME + '/rer-consolidation/work/gr-mt-oncall-dep-7/packet';
writeFileSync(`${packet}/dependency-receipt.json`, JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
