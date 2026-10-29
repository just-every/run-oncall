import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {autonomousPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Same production MCP and native approval doors as the specialist journey. */
export async function scheduleReplay(runtime) {
 const {tool,http,adopt}=runtime;
 const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
 const snapshot=async()=>({workspace:await (await http('/api/state')).json(),paging:await (await http('/api/paging/archive')).json()});
 const held=autonomousPolicy();
 held.rules.unshift(...['sensitive','live'].map(risk=>({id:'schedule-'+risk,class:risk,do:'approval',approver:['sponsor'],wait:'PT1H'})));
 const source=(await tool('oncall.schedules.read',{id:'agent-schedule'})).result.structuredContent.schedules[0];
 const scheduleId=randomUUID();
 assert.equal((await http('/api/paging/schedules',{...source,id:scheduleId,name:'Receipt coordination rota',revision:0})).status,200);
 let last;
 for(const operation of ['update','override']) {
  assert.equal((await adopt()).status,200);
  const schedule=(await tool('oncall.schedules.read',{id:scheduleId})).result.structuredContent.schedules[0];
  const from=Date.now(),to=from+3600000;
  const proposal={...schedule,name:'Payments reviewed receipt rota'};
  const review=operation==='update'?(await tool('oncall.schedules.review',{id:schedule.id,revision:schedule.revision,schedule:proposal,from,to})).result.structuredContent:null;
  const args={id:schedule.id,revision:schedule.revision,expected_revision:schedule.revision,idempotency_key:randomUUID(),
   ...(review?{schedule:proposal,from,to,digest:review.digest}:{override:{id:randomUUID(),role:'primary',start:new Date(from+60000).toISOString(),end:new Date(to).toISOString(),member:null}})};
  const name='oncall.schedules.'+operation;
  assert.equal((await adopt(held)).status,200);
  const pending=await tool(name,args),approval=pending.result?._meta?.['com.runeditrun/approval'];
  assert.ok(approval,JSON.stringify(pending.body));
  const saved=(await (await http('/agents/api/approvals/'+approval.id)).json()).approval;
  const approved=await http('/agents/api/approvals/'+approval.id+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256});
  assert.equal((await approved.json()).approval.state,'executed');
  const once=await snapshot(),first=await tool(name,args),again=await tool(name,args);
  assert.equal(first.result?.isError,false,JSON.stringify(first.body));
  assert.ok(first.result._meta['com.runeditrun/receipt']);
  assert.equal(first.result.structuredContent.schedule.revision,schedule.revision+1);
  assert.deepEqual(again.result.structuredContent,first.result.structuredContent);
  assert.deepEqual(await snapshot(),once,'Exact receipt replay has no second native effect');
  assert.equal(code(await tool(name,{...args,idempotency_key:randomUUID()})),'revision_conflict','A new key cannot reuse consumed review/revision evidence');
  assert.equal(code(await tool(name,{...args,revision:schedule.revision+1})),'idempotency_conflict');
  assert.equal(code(await tool(name,args,{scope:'incidents:read'})),'insufficient_scope');
  assert.equal((await http('/agents/api/pause',{paused:true})).status,200);
  const paused=await tool(name,args);assert.equal(code(paused),'agents_paused');assert.equal(paused.result.structuredContent,undefined);
  assert.equal((await http('/agents/api/pause',{paused:false})).status,200);
  assert.deepEqual(await snapshot(),once,'Refused retries preserve the committed native effect');
  last={name,args};
 }
 // A cached approval never supplies native role authority after demotion.
 const owner=(await (await http('/api/workspace')).json()).member,password=randomBytes(32).toString('hex');
 const other=await (await http('/api/members',{name:'Receipt authority administrator',role:'admin',password})).json();
 const login=await http('/api/login',{name:other.name,password});
 assert.equal(login.status,200);
 const cookie=login.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');await login.body?.cancel();
 assert.equal((await http('/api/command',{type:'member',id:owner.id,role:'viewer',active:true})).status,200);
 const demoted=await tool(last.name,last.args);assert.equal(demoted.status,401);assert.equal(demoted.result?.structuredContent,undefined);
 const restore=await runtime.request(runtime.origin+'/api/command',{method:'POST',headers:{Origin:runtime.origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({type:'member',id:owner.id,role:'admin',active:true})});
 assert.equal(restore.status,200);await restore.body?.cancel();
 assert.equal((await adopt()).status,200);
 console.log('PASS held schedule receipts: update/override replay once; exact review/revision, changed key/arguments, scopes, Pause and current native role remain fenced');
}
