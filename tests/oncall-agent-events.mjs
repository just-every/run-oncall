import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentRuntime,eventReadSnapshot} from './agent-door-runtime.mjs';
import {eventReader,recoveredResolutionTarget} from './oncall-agent-fixtures.mjs';
import {accessToken,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

/** Retained changes through real MCP and the signed-in approval and review feed. */
export async function retainedEvents(){
 const runtime=await agentRuntime();
 try{
  const {http,tool,adopt,db}=runtime;
  const read=async(path,input,status=200)=>{const response=await http(path,input);assert.equal(response.status,status);return response.json()};
  const roster=[];
  for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
   assert.equal((await adopt(policy)).status,200);
   const reader=await eventReader(runtime,mode,roster);
   const bearer=await accessToken(runtime.context,reader.claims);
   const call=(name,args)=>tool(name,args,{},bearer);
   const list=async(args={},as=bearer)=>{
    const before=await eventReadSnapshot(runtime),outbound=await runtime.outboundRequests();
    const answer=await tool('oncall.events.list',{limit:200,...args},{},as);
    assert.equal(answer.status,200);assert.equal(answer.result?.isError,false);
    assert.equal(answer.decision.disposition,mode==='held'?'review':'autonomous');
    assert.deepEqual(await eventReadSnapshot(runtime),before,'Event reads preserve native records, revisions, permanent effect audit and paging');
    assert.deepEqual(await runtime.outboundRequests(),outbound);
    const row=await db.prepare('SELECT row FROM agent_door_audit WHERE id=?').bind(answer.decision.id).first();
    assert.ok(row,'Every events.list call has a retained audit row');
    const audit=JSON.parse(row.row);assert.equal(audit.tool,'oncall.events.list');assert.equal(audit.sponsor.id,reader.person.id);
    return {answer,...answer.result.structuredContent};
   };
   const start=await list();
   // Two retained, populated record changes are made by this reader's agent.
   const created=[];
   for(const service of ['agent-service','agent-foreign-service']){
    const result=await call('oncall.incidents.declare',{service,title:'Synthetic retained event '+mode+' '+service,summary:'Literal coordination evidence',severity:'warning',idempotency_key:randomUUID()});
    assert.equal(result.result.isError,false);created.push(result);
   }
   const retained=await list();
   const changes=created.map(result=>retained.events.find(event=>event.uri==='oncall://incidents/'+result.result.structuredContent.id));
   assert.ok(changes.every(Boolean),'Real native declarations produce visible retained changes');
   for(const event of retained.events){
    assert.equal(typeof event.id,'string');assert.equal(typeof event.type,'string');assert.equal(typeof event.uri,'string');
    assert.ok(event.actor);assert.ok(Number.isFinite(Date.parse(event.at)));
   }
   assert.equal(new Set(retained.events.map(event=>event.id)).size,retained.events.length);
   for(const event of changes){assert.equal(event.actor.kind,'agent');assert.equal(event.actor.for.id,reader.person.id);}
   const after=start.cursor??retained.events[0].id;
   const first=await list({after}),second=await list({after});
   assert.ok(first.events.length>1);
   assert.deepEqual(first.events.map(event=>event.id),second.events.map(event=>event.id));
   assert.deepEqual(first.events.map(event=>event.id),retained.events.slice(retained.events.findIndex(event=>event.id===after)+1).map(event=>event.id));
   assert.equal(first.cursor,second.cursor);
   // Prepare a genuine held action, then decide it as the sponsoring person.
   assert.equal((await adopt(heldPolicy())).status,200);
   const target=await recoveredResolutionTarget(runtime,'Synthetic event approval '+mode);
   const pending=await call('oncall.incidents.resolve',{incident:target.id,revision:target.revision,summary:'Synthetic reviewed resolution',idempotency_key:randomUUID()});
   assert.equal(pending.decision.disposition,'approval');
   const approval=pending.result._meta['com.runeditrun/approval'];assert.ok(approval?.id);
   const person=async(path,input)=>{
    const response=await runtime.request(runtime.origin+path,{method:input===undefined?'GET':'POST',headers:{Origin:runtime.origin,Cookie:reader.cookie,'Content-Type':'application/json'},...(input===undefined?{}:{body:JSON.stringify(input)})});
    assert.equal(response.status,200);return response.json();
   };
   const saved=(await person('/agents/api/approvals/'+approval.id)).approval;
   const decided=await person('/agents/api/approvals/'+approval.id+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256});
   assert.equal(decided.approval.state,'executed');
   const reviewed=await call('oncall.incidents.declare',{service:'agent-service',title:'Synthetic flagged coordination '+mode,summary:'No outbound authority',severity:'warning',idempotency_key:randomUUID()});
   assert.equal(reviewed.decision.disposition,'review');
   const reviewId=reviewed.result._meta['com.runeditrun/review'].id;
   assert.ok((await person('/agents/api/reviews')).reviews.some(row=>row.id===reviewId&&row.state==='open'));
   assert.equal((await person('/agents/api/reviews/'+reviewId+'/flag',{})).review.state,'flagged');
   assert.equal((await adopt(policy)).status,200);
   const decisions=await list();
   const adopted=decisions.events.findLast(event=>event.type==='policy.adopted');
   assert.ok(adopted,'An authorized policy editor can read the retained adoption event');
   assert.equal(adopted.seq,runtime.context.seq);assert.equal(adopted.revision,runtime.context.revision);
   assert.deepEqual(adopted.actor,{kind:'business'});

   const expected=[['approval.pending',approval.url,pending.decision.id,pending.decision.classes],['approval.decided',approval.url,pending.decision.id,pending.decision.classes],['review.flagged',runtime.origin+'/agents/reviews/'+reviewId,reviewed.decision.id,reviewed.decision.classes]];
   for(const [type,uri,decisionId,classes] of expected){
    const event=decisions.events.find(row=>row.type===type&&row.uri===uri);assert.ok(event,type);
    assert.equal(event.decision_id,decisionId);
    assert.deepEqual(event.classes,classes.map(({class:cls,facts})=>({class:cls,facts})));
    assert.deepEqual(Object.keys(event).sort(),['id','type','uri','actor','at','classes','decision_id',...(type==='approval.decided'?['decision','state']:[])].sort(),'Decision events carry no saved arguments, summaries, credentials or private native content');
    if(type==='approval.decided'){assert.equal(event.decision,'approval');assert.equal(event.state,'executed');}
   }
   // Missing record-read scope discloses no native event.
   const strangerToken=await accessToken(runtime.context,{...reader.claims,scope:'events:read'});
   const scopeOnly=await list({},strangerToken);
   for(const change of changes)assert.ok(!JSON.stringify(scopeOnly.answer.result).includes(change.uri),'Missing native read scope discloses no record event');
   const observer=await eventReader(runtime,'observer-'+mode,roster,'responder');
   const observerToken=await accessToken(runtime.context,observer.claims);
   const unrelated=await tool('oncall.events.list',{limit:200},{},observerToken);
   assert.equal(unrelated.result.isError,false);
   for(const [,uri] of expected)assert.ok(!JSON.stringify(unrelated.result).includes(uri),'Unrelated people cannot read another sponsor’s approval or review events');
   // Removing current native read authority keeps the same live credential.
   await read('/api/command',{type:'member',id:reader.person.id,role:'stakeholder',active:true});
   const hidden=await list({after});
   for(const change of changes){
    for(const secret of [change.id,change.uri,change.incident])if(secret)assert.ok(!JSON.stringify(hidden.answer.result).includes(secret),'Revoked native read reveals no record identity or content');
   }
   assert.ok(hidden.events.some(event=>event.type==='approval.decided'&&event.uri===approval.url),'Still-readable own approval events remain after native record access is removed');
   const denied=await call('oncall.incidents.read',{id:created[0].result.structuredContent.id});
   assert.equal(denied.result.isError,true);assert.equal(denied.result.structuredContent,undefined);
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log('PROBE BASE-AGENT-010 3 '+mode+': populated MCP cursor replay twice -> same retained ids in order; every call audited; native and paging records unchanged; zero outbound requests');
   console.log('PROBE BASE-AGENT-010 4 '+mode+': same live bearer after sponsor loses native read authority -> no incident event id, URI or content; own readable approval events remain');
   console.log('PROBE BASE-AGENT-010 6 '+mode+': signed-in approval and review feed -> pending, executed decision and flagged review with original classes and decision ids and no saved private payload');
  }
 }finally{await runtime.close()}
}
