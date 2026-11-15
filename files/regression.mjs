import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const old = await import(pathToFileURL('/tmp/gr-mt-oncall-dep-6-re2js-2.8.6.mjs'));
const patched = await import(pathToFileURL(resolve('node_modules/re2js/build/index.js')));
function probe(RE2JS, label) {
  const rows=[];
  for (const [pattern,unit] of [['(?<=a)b','ab'],['(?<!a)b','cb']]) {
    assert.throws(()=>RE2JS.compile(pattern), /./, 'application default compilation continues to refuse lookbehind');
    for (const size of [1000,2000,4000]) {
      const input=unit.repeat(size/2), re=RE2JS.compile(pattern,RE2JS.LOOKBEHINDS);
      const start=performance.now(), matcher=re.matcher(input);let count=0;
      while(matcher.find()) {assert.equal(matcher.group(),'b');count++;}
      const elapsed=performance.now()-start;
      assert.equal(count,size/2);
      rows.push({pattern,size,matches:count,ms:Number(elapsed.toFixed(3))});
    }
  }
  const normal=RE2JS.compile('service=([a-z]+)');
  const match=normal.matcher('service=payments');
  assert.equal(normal.test('service=payments'),true);
  assert.equal(normal.test('missing'),false);
  assert.equal(normal.groupCount(),1);assert.equal(match.find(),true);assert.equal(match.group(1),'payments');assert.equal(match.find(),false);
  return {label,rows,defaultLookbehindRejected:true,ordinaryMatchAndCapturePassed:true};
}
console.log(JSON.stringify({advisory:'GHSA-gg6h-894w-4m9c',node:process.versions.node,probes:[probe(old.RE2JS,'2.8.6'),probe(patched.RE2JS,'2.8.7')],note:'Bounded one-pass timing observations, not a capacity benchmark or a formal complexity proof.'},null,2));
