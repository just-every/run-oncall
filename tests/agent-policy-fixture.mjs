import assert from 'node:assert/strict'
/** Explicit owner choice for the existing standalone coordination client journeys. */
export async function allowAgentCoordination(worker,cookie) {
 const response=await fetch(worker.origin+'/agents/api/policy',{method:'PUT',headers:{origin:worker.origin,cookie,'content-type':'application/json'},
  body:JSON.stringify({document:{schema:'rer-agent-policy/1',catalogue:'rer-agent-classes/1',rules:[{id:'owner-coordination-choice',class:'*',do:'autonomous'}],spend:{none:true}}})})
 assert.equal(response.status,200,'the native owner explicitly chooses autonomous coordination for this journey')
 const resumed=await fetch(worker.origin+'/agents/api/pause',{method:'POST',headers:{origin:worker.origin,cookie,'content-type':'application/json'},body:JSON.stringify({paused:false})})
 assert.equal(resumed.status,200,'the native owner explicitly resumes their chosen coordination policy')
}
