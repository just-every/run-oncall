import assert from 'node:assert/strict';
import {localWorker} from '/workspace/run-oncall/tests/worker.mjs';
import {missedAcknowledgmentFlow} from '/workspace/run-oncall/tests/missed-ack-flow.mjs';
const w=await localWorker({}, {clock:true,outboundLedger:true});
try {
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
 const setup=await w.request('/api/setup',{name:'Example Operator',password:'synthetic-oncall-ack-password'});const admin=ok(setup).member;
 const req=(p,d)=>w.request(p,d,setup.cookie);
 await missedAcknowledgmentFlow({w,req,ok,admin});
 assert.deepEqual(await w.outboundRequests(),[]);
 console.log('PASS zero outbound requests');
} finally {await w.close();}
