// Author: Run Edit Run fleet (Codex), 2026-11-15.
// Bounded one-off validation, kept outside the product test suite.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
const root=createRequire(process.cwd()+'/package.json');
const router=createRequire(root.resolve('@tanstack/react-router'));
const core=createRequire(router.resolve('@tanstack/router-core'));
const s=await import(pathToFileURL(core.resolve('seroval')).href);
const checks=[];
function check(name,fn){fn();checks.push(name);console.log('PASS '+name)}
const json=node=>({t:node,f:127,m:[]});
const from=node=>s.fromJSON(json(node));
const cross=node=>s.fromCrossJSON(node,{refs:new Map()});
check('legitimate JSON and cross-JSON round trips preserve structured values',()=>{
 const value={text:'synthetic-oncall-probe',values:[1,null,true],date:new Date('2026-01-01T00:00:00Z'),bytes:new Uint8Array([1,2,3]),regexp:/synthetic/gi};
 assert.deepEqual(s.fromJSON(s.toJSON(value)),value);
 assert.deepEqual(cross(s.toCrossJSON(value)),value);
});
check('typed array serialization ignores attacker-selected constructor names',()=>{
 const value=new Uint8Array([7,8]);
 Object.defineProperty(value,'constructor',{value:{name:'Uint8Array);globalThis.syntheticCanary=1;//'}});
 const code=s.serialize(value),sandbox={atob,btoa};
 const restored=vm.runInNewContext('('+code+')',sandbox,{timeout:1000});
 assert.deepEqual(Array.from(restored),[7,8]);assert.equal(sandbox.syntheticCanary,undefined);
 assert.ok(!code.includes('syntheticCanary'));
});
check('unknown typed-array constructors are rejected during JSON deserialization',()=>{
 const data=s.toJSON(new Uint8Array([1]));data.t.c='Uint8Array);globalThis.syntheticCanary=1;//';
 assert.throws(()=>s.fromJSON(data));
});
check('RegExp source cannot terminate an embedding script and still round trips',()=>{
 const value=new RegExp('</script><script>globalThis.syntheticCanary=1</script>','gi');
 const code=s.serialize(value),sandbox={atob,btoa};
 assert.ok(!code.toLowerCase().includes('</script'));
 const restored=vm.runInNewContext('('+code+')',sandbox,{timeout:1000});
 assert.equal(restored.source,value.source);assert.equal(restored.flags,value.flags);assert.equal(sandbox.syntheticCanary,undefined);
});
check('array-like records with hostile length are rejected in both JSON modes',()=>{
 for(const length of [-1,1.5,Number.MAX_SAFE_INTEGER]){
  const node={t:9,i:0,a:{length},o:0};
  assert.throws(()=>from(node));assert.throws(()=>cross(node));
 }
});
check('invalid Sequence doneAt values are rejected in both JSON modes',()=>{
 for(const doneAt of [-2,1.5,Number.MAX_SAFE_INTEGER]){
  const node={t:35,i:0,s:-1,l:doneAt,a:[{t:0,s:1}]};
  assert.throws(()=>from(node));assert.throws(()=>cross(node));
 }
});
check('forged async-iterator source cannot invoke an attacker-chosen on callable',()=>{
 let calls=0;
 const on=s.createReference('synthetic-oncall-probe-on',()=>{calls++});
 const source=s.toCrossJSON({on});
 const node={t:30,i:20,a:[s.toCrossJSON(undefined),source]};
 assert.throws(()=>from(node));assert.throws(()=>cross(node));assert.equal(calls,0);
});
console.log(JSON.stringify({status:'passed',checks:checks.length,names:checks}));
