import assert from 'node:assert/strict';

/** An explicit person's fixture choice, exercised through the real policy door. */
export async function autonomousCoordination(runtime,cookie){
  const response=await fetch(runtime.origin+'/agents/api/policy',{method:'PUT',headers:{Origin:runtime.origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({document:{schema:'rer-agent-policy/1',catalogue:'rer-agent-classes/1',rules:[{id:'fixture-choice',class:'*',do:'autonomous'}],spend:{none:true}}})});
  assert.equal(response.status,200,'Native fixture administrator explicitly chooses the standalone policy');
  assert.equal((await response.json()).complete,true);
}
