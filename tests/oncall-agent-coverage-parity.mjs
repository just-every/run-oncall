import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {agentEffectSnapshot,agentReadSnapshot,assertAgentReadUnchanged} from './agent-door-runtime.mjs';
import {accessToken,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

const start=Date.parse('2026-11-04T12:01:00.000Z'),end=start+60000;
const scopes=['incidents:read','services:read','schedules:read','analytics:read'];
const json=async(http,path,input,status=200)=>{
 const response=await http(path,input);assert.equal(response.status,status,path);return response.json();
};

// Use only protected native HTTP to project the participant fields. Preserve
// native member order and include only holders in the current coverage.
async function protectedCoverage(http,id,at){
 const native=await json(http,'/api/state'),paging=await json(http,'/api/paging/state');
 assert.equal(paging.workspaceRevision,native.revision);
 const saved=paging.schedules.find(row=>row.id===id);assert.ok(saved);
 const path='/api/schedules/'+id+'/now-next';
 const nowNext=await json(http,path+'?'+new URLSearchParams({at:new Date(at).toISOString()}));
 assert.equal(nowNext.now.at,at);
 const references=new Set([nowNext.now.primary,nowNext.now.backup,...nowNext.now.windows.map(row=>row.member)]);
 const people=native.members.filter(row=>references.has(row.id)).map(({id,name,active,role})=>({id,name,active,role}));
 const expected={paging:paging.paging,service:saved.service,schedule:saved,now:nowNext.now,people};
 return {native,paging,saved,path,nowNext,expected};
}

/** Follow the first completed creation response under each company policy. */
export async function createdRotaReadback(runtime,{observe=async()=>{}}={}){
 const {http,db,tool,adopt,context,completeResource}=runtime;
 // Pin both policy cases to the same UTC noon, within the fixture's
 // session and replay lifetimes when the caller restores its real clock.
 const day=new Date(context.now()).toISOString().slice(0,10);
 const at=Date.parse(day+'T12:00:00.000Z'),anchor=day+'T00:00';
 const name='oncall.schedules.create',approvalKey='com.runeditrun/approval';
 const code=answer=>answer.result?._meta?.['com.runeditrun/error']?.code??answer.body?.error?.data?.code;
 const audit=async()=>(await db.prepare('SELECT * FROM agent_door_audit ORDER BY sequence').all()).results;
 await runtime.time(at);
 try{
  assert.equal((await adopt()).status,200);
  const rota=(await tool('oncall.schedules.read',{id:'agent-schedule'})).result.structuredContent.schedules[0];
  const [rotationPrimary,primary]=rota.primary.members,[backup]=rota.backup.members;
  assert.equal(new Set([rotationPrimary,primary,backup]).size,3,'The current projection omits a real off-duty participant');
  const owner=(await json(http,'/api/workspace')).member;
  assert.deepEqual(await runtime.outboundRequests(),[]);
  for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
   assert.equal((await adopt(policy)).status,200);
   const bearer=await accessToken(context,{act:{sub:context.agentId,name:'Responder assistant',specialist:'oncall-responder'}});
   const createRota={schedule:{...rota,id:randomUUID(),name:'Payments coordination backup '+mode,revision:0,
    validFrom:anchor+':00.000Z',primary:{...rota.primary,anchorLocal:anchor},backup:{...rota.backup,anchorLocal:anchor},
    overrides:[{id:randomUUID(),role:'primary',member:primary,start:new Date(at-3600000).toISOString(),end:new Date(at+3600000).toISOString()}]},
   idempotency_key:randomUUID()};
   const call=(args=createRota)=>tool(name,args,{},bearer);
   const beforeWrite=await json(http,'/api/paging/state');
   const initial=await call();
   assert.equal(initial.status,200);
   assert.equal(initial.decision.disposition,mode==='held'?'approval':'autonomous');
   let first=initial,writeApproval;
   if(mode==='held'){
    assert.equal(initial.result.resultType,'input_required');
    assert.equal(initial.result.structuredContent,undefined);
    assert.equal(initial.result.content,undefined);
    assert.deepEqual(await json(http,'/api/paging/state'),beforeWrite,'Pending creation does not save a rota');
    const handle=initial.result._meta[approvalKey];assert.ok(handle);
    const approvalPath='/agents/api/approvals/'+handle.id;
    const {approval:saved}=await json(http,approvalPath);
    assert.equal(saved.state,'pending');assert.equal(saved.decision_id,initial.decision.id);
    assert.equal(saved.revision,context.revision);assert.match(saved.summary_sha256,/^[a-f0-9]{64}$/);
    assert.equal(saved.prepared_by.for.id,owner.id);assert.equal(saved.prepared_by.agent.id,context.agentId);
    ({approval:writeApproval}=await json(http,approvalPath+'/approve',{revision:saved.revision,summary_sha256:saved.summary_sha256}));
    assert.equal(writeApproval.state,'executed');
    assert.deepEqual(writeApproval.approvals.map(row=>row.person),[owner.id]);
    first=await call();
   }
   assert.equal(first.status,200);assert.equal(first.result.isError,false);
   const links=first.result.content.filter(item=>item.type==='resource_link');
   assert.equal(links.length,1,'The first completed creation returns one coverage link');
   const [link]=links;
   const written=first.result.structuredContent;
   const {paging,saved,path,nowNext,expected}=await protectedCoverage(http,createRota.schedule.id,at);
   assert.deepEqual(saved,{...createRota.schedule,revision:1});
   assert.equal(paging.schedules.length,beforeWrite.schedules.length+1);
   assert.deepEqual(saved.services??[saved.service],['agent-service']);
   assert.equal(paging.paging,'OFF');assert.equal(nowNext.paging,paging.paging);
   assert.equal(nowNext.now.scheduleRevision,1);assert.equal(nowNext.now.scheduleId,saved.id);
   assert.equal(nowNext.now.primary,primary);assert.equal(nowNext.now.backup,backup);
   assert.equal(nowNext.now.windows.find(window=>window.role==='primary').origin,'override');
   assert.deepEqual(new Set(expected.people.map(row=>row.id)),new Set([primary,backup]));
   assert.deepEqual(written.schedule,saved);assert.deepEqual(written.coverage,nowNext.now);

   const before=await agentEffectSnapshot(runtime),auditBefore=await audit();
   const write=before.records.agent_door_calls.find(row=>row.key===createRota.idempotency_key&&row.agent===context.agentId);
   assert.equal(write?.state,'done');assert.equal(write.decision_id,initial.decision.id);
   const writeOutcome=JSON.parse(write.outcome);
   assert.deepEqual(writeOutcome.result,written);
   assert.ok(auditBefore.some(row=>row.id===initial.decision.id));
   if(writeApproval){
    assert.equal(writeOutcome.receipt.approval_id,writeApproval.id);
    assert.equal(writeOutcome.receipt.decision_id,write.decision_id);
   }

   // Use the wire URI and the original bearer without reconstructing either
   // from the native schedule or using the protected session for the MCP read.
   const read=await completeResource(link.uri,{bearer});
   assert.equal(read.content.uri,link.uri);
   assert.deepEqual(read.value,expected,'Returned coverage includes the complete protected rota, current windows and independently projected participants');
   assert.notEqual(read.initial.decision.id,write.decision_id);
   assert.deepEqual(read.initial.decision.classes.map(row=>[row.class,row.do]),
    mode==='held'?[['standard','review'],['sensitive','approval']]:[['standard','autonomous'],['sensitive','autonomous']]);
   assert.equal(read.initial.decision.disposition,mode==='held'?'approval':'autonomous');

   const after=await agentEffectSnapshot(runtime);
   const {agent_door_approvals:approvals,agent_door_usage:usage,agent_door_events:events,...records}=after.records;
   const {agent_door_approvals:priorApprovals,agent_door_usage:priorUsage,agent_door_events:priorEvents,...priorRecords}=before.records;
   assert.deepEqual(after.application,before.application);
   for(const [table,rows] of Object.entries(priorRecords))
    assert.ok(isDeepStrictEqual(records[table],rows),'Reading preserves all records in '+table);
   const readDecision=read.initial.decision.id;
   let readUsageId=readDecision;
   const auditAfter=await audit();
   assert.deepEqual(auditAfter.slice(0,auditBefore.length),auditBefore,'All original write receipts remain unchanged');
   if(writeApproval){
    assert.equal(read.initial.result,undefined);
    const handle=read.initial.body.error.data.approval,readApprovalId=handle.id;
    assert.notEqual(readApprovalId,writeApproval.id);
    const readEvents=events.filter(row=>row.uri===handle.url).sort((a,b)=>a.sequence-b.sequence);
    assert.deepEqual(readEvents.map(row=>JSON.parse(row.event).type),['approval.pending','approval.decided']);
    assert.deepEqual(events.filter(row=>row.uri!==handle.url),priorEvents,'The resource read emits only its own approval events');
    const {approval}=await json(http,'/agents/api/approvals/'+readApprovalId);
    assert.equal(approval.state,'executed');assert.equal(approval.decision_id,readDecision);
    assert.equal(approval.prepared_by.for.id,owner.id);assert.equal(approval.prepared_by.agent.id,context.agentId);
    assert.deepEqual(approval.approvals.map(row=>row.person),[owner.id]);
    assert.deepEqual(approvals.filter(row=>row.id!==readApprovalId),priorApprovals,'The separate read approval preserves the executed write approval and receipt');
    readUsageId=JSON.parse(approvals.find(row=>row.id===readApprovalId).result).execution_id;
   }else{
    assert.equal(read.initial,read.answer);
    assert.deepEqual(approvals,priorApprovals);
    assert.deepEqual(events,priorEvents);
   }
   assert.deepEqual(usage.filter(row=>row.decision_id!==readUsageId),priorUsage);
   assert.ok(usage.some(row=>row.decision_id===readUsageId&&row.agent===context.agentId));
   assert.deepEqual(await json(http,'/api/paging/state'),paging);
   assert.deepEqual(await runtime.outboundRequests(),[]);
   console.log(`PROBE BASE-AGENT-003 4 ${mode} rota creation: first completed link matched the full protected rota at revision ${saved.revision}, current coverage and two participants at ${new Date(at).toISOString()}; ${writeApproval?'separate sponsor approval for the sensitive read':'autonomous read'}; native records, revisions, mutation audit, original write custody and paging unchanged; zero outbound requests`);
   await observe({mode,at,schedule:saved,path,nowNext,people:expected.people});

   const repeated=await call();assert.deepEqual(repeated.result.structuredContent,written);
   assert.equal(code(await call({...createRota,idempotency_key:randomUUID()})),'revision_conflict','A new key cannot create an existing native schedule');
   assert.equal(code(await call({...createRota,schedule:{...createRota.schedule,name:'Changed key content'}})),'idempotency_conflict');
   // Retain the existing schedule-tool read alongside resource readback.
   assert.equal((await adopt()).status,200);
   const rotaRead=await tool('oncall.schedules.read',{id:saved.id},{},bearer);
   assert.deepEqual(rotaRead.result.structuredContent.schedules,[saved]);
  }
 }finally{
  await runtime.time(null);
 }
}

/** Extend the existing matrix with native current coverage at override boundaries. */
export async function coverageParity({runtime,people,browser,receipt}){
 const admin=people.find(p=>p.member.role==='admin');
 const participants={};
 for(const [kind,name] of [['primary','Z primary'],['backup','A backup'],['override','M override'],['unrelated','B unrelated']]){
  participants[kind]=await json(admin.http,'/api/members',{name:'Synthetic coverage '+name,role:'responder',password:randomBytes(32).toString('hex')},201);
 }
 const schedule=await json(admin.http,'/api/paging/schedules',{
  id:'synthetic-oncall-coverage-parity',name:'Synthetic native coverage rota',service:'agent-service',revision:0,
  timezone:'UTC',validFrom:'2026-11-01T00:00:00.000Z',validUntil:null,
  primary:{anchorLocal:'2026-11-01T00:00',periodDays:1,members:[participants.primary.id],ambiguity:'earlier'},
  backup:{anchorLocal:'2026-11-01T00:00',periodDays:1,members:[participants.backup.id],ambiguity:'earlier'},
  overrides:[{id:'synthetic-oncall-coverage-override',role:'primary',member:participants.override.id,start:new Date(start).toISOString(),end:new Date(end).toISOString()}],
 });
 const uri='oncall://schedules/'+schedule.id+'/coverage';
 const sponsors=people.map(p=>({...p,agent:randomUUID()}));
 const cases=[];
 receipt.coverage={uri,participants:Object.fromEntries(Object.entries(participants).map(([key,p])=>[key,p.id])),cases};
 for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  await runtime.time(start-1);
  assert.equal((await runtime.adopt(policy)).status,200);
  // Both agents receive the same scopes, and each maps to its real native
  // session sponsor. No local service-account scope stands in for a viewer.
  const clients=await Promise.all(sponsors.map(async p=>({...p,bearer:await accessToken(runtime.context,{
   sub:p.businessId,email:p.email,act:{sub:p.agent,name:'Synthetic coverage assistant'},scope:scopes.join(' '),consent:'synthetic-oncall-coverage-'+p.agent,
  })})));
  for(const [boundary,at,primary] of [['before',start-1,participants.primary.id],['start',start,participants.override.id],['end',end,participants.primary.id]]){
   await runtime.time(at);
   for(const p of clients){
    const {native,paging,saved,path,nowNext,expected}=await protectedCoverage(p.http,schedule.id,at);
    const member=native.members.find(row=>row.id===p.member.id);
    assert.equal(member.active,true);assert.equal(member.role,p.member.role);
    const permitted=native.services.map(row=>row.id).sort();
    assert.deepEqual(permitted,(await json(admin.http,'/api/state')).services.map(row=>row.id).sort());
    assert.deepEqual(saved.services??[saved.service],['agent-service'],'This proof is an ordinary single-service schedule');
    assert.equal(nowNext.now.primary,primary);assert.equal(nowNext.now.backup,participants.backup.id);
    assert.deepEqual(nowNext.now.windows.map(row=>row.role),['primary','backup']);
    assert.equal(nowNext.now.windows[0].origin,boundary==='start'?'override':'rotation','The exact end excludes the override');
    assert.equal(nowNext.now.windows[0].member,primary);
    assert.equal(nowNext.now.windows[1].member,participants.backup.id);
    assert.equal(nowNext.now.windows[1].origin,'rotation');
    if(boundary==='before')assert.equal(nowNext.now.windows[0].end,new Date(start).toISOString());
    else{
     assert.equal(nowNext.now.windows[0].start,new Date(boundary==='start'?start:end).toISOString());
     if(boundary==='start')assert.equal(nowNext.now.windows[0].end,new Date(end).toISOString());
    }
    const expectedPeople=expected.people;
    assert.equal(expectedPeople.length,2);
    assert.ok(!expectedPeople.some(row=>row.id===participants.unrelated.id));
    assert.deepEqual(new Set(expectedPeople.map(row=>row.id)),new Set([primary,participants.backup.id]));
    const before=await agentReadSnapshot(runtime);
    const reviews=(await runtime.db.prepare('SELECT * FROM agent_door_reviews ORDER BY id').all()).results;
    const approvals=(await runtime.db.prepare('SELECT * FROM agent_door_approvals ORDER BY id').all()).results;
    const read=await runtime.completeResource(uri,{bearer:p.bearer,personHttp:p.http});
    assert.equal(read.content.uri,uri);assert.equal(read.content.mimeType,'application/json');
    assert.equal(read.content._meta['com.runeditrun/untrusted'],true);
    assert.deepEqual(read.value,expected,p.member.role+' '+mode+' '+boundary+' every coverage field');
    assert.deepEqual(read.initial.decision.classes.map(({class:kind,facts})=>({class:kind,facts})),[
     {class:'standard',facts:{measure:1}},
     {class:'sensitive',facts:{measure:expectedPeople.length,kind:'personal_or_incident_evidence'}},
    ]);
    assert.equal(read.initial.decision.revision,runtime.context.revision);
    assert.equal(read.initial.decision.disposition,mode==='held'?'approval':'autonomous');
    assert.ok(read.initial.decision.classes.every(row=>row.do===(mode==='held'?(row.class==='standard'?'review':'approval'):'autonomous')));
    const afterApprovals=(await runtime.db.prepare('SELECT * FROM agent_door_approvals ORDER BY id').all()).results;
    for(const prior of approvals)assert.deepEqual(afterApprovals.find(row=>row.id===prior.id),prior,'Existing approval custody stays exact');
    assert.deepEqual((await runtime.db.prepare('SELECT * FROM agent_door_reviews ORDER BY id').all()).results,reviews,'Sensitive coverage creates no separate standard review or changes another review');
    let approvalId=null;
    if(mode==='held'){
     assert.equal(read.initial.result,undefined,'Held coverage returns no content before approval');
     approvalId=read.initial.body.error.data.approval.id;
     const {approval}=await json(p.http,'/agents/api/approvals/'+approvalId);
     assert.equal(approval.state,'executed');assert.equal(approval.decision_id,read.initial.decision.id);
     assert.equal(approval.prepared_by.for.id,p.member.id);assert.equal(approval.prepared_by.agent.id,p.agent);
     assert.deepEqual(approval.approvals.map(row=>row.person),[p.member.id],'Only the actual signed-in sponsor approves its own read');
     assert.deepEqual(afterApprovals.filter(row=>!approvals.some(prior=>prior.id===row.id)).map(row=>row.id),[approvalId]);
    }else assert.deepEqual(afterApprovals,approvals);
    const admission=await runtime.db.prepare('SELECT sponsor FROM agent_door_agents WHERE id=?').bind(p.agent).first();
    assert.equal(admission.sponsor,p.member.id);
    assertAgentReadUnchanged(before,await agentReadSnapshot(runtime));
    assert.deepEqual(await json(p.http,'/api/paging/state'),paging,'Resource reads preserve the complete paging response and both revisions');
    assert.deepEqual(await runtime.outboundRequests(),[]);
    const result={mode,role:p.member.role,boundary,at:new Date(at).toISOString(),agent:p.agent,sponsor:p.member.id,scopes,permittedServices:permitted,
     workspaceRevision:native.revision,schedulingRevision:paging.revision,decision:read.initial.decision.id,disposition:read.initial.decision.disposition,approval:approvalId,
     nativeDoors:['/api/state','/api/paging/state',path+'?'+new URLSearchParams({at:new Date(at).toISOString()})],nativeRecord:expected,resourceRecord:read.value,equal:true};
    cases.push(result);
    console.log(`PROBE BASE-AGENT-003 2 coverage ${mode} ${p.member.role} ${boundary}: all fields equal protected native HTTP at ${result.at}; exact participants and order; native records, revisions, permanent state-changing audit and paging unchanged; zero outbound requests`);
    if(browser)await captureCoverage(browser,runtime,p,mode,boundary,at,path,nowNext,native,saved,participants.unrelated,receipt);
   }
  }
 }
 assert.equal(cases.length,12);
 assert.deepEqual(await runtime.outboundRequests(),[]);
}

async function captureCoverage(browser,runtime,person,mode,boundary,at,nativeDoor,expected,native,schedule,unrelated,receipt){
 const before=await agentReadSnapshot(runtime);
 const context=await browser.newContext({baseURL:runtime.origin,viewport:{width:1440,height:1000}});
 try{
  await context.addCookies(person.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'}}));
  const page=await context.newPage();page.setDefaultTimeout(20000);await page.clock.setFixedTime(at);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   const loaded=page.waitForResponse(r=>new URL(r.url()).pathname===nativeDoor&&r.status()===200);
   const path='/on-call/'+schedule.id;
   await page.goto(path);
   await page.getByRole('heading',{name:schedule.name,exact:true,level:1}).waitFor();
   const panel=page.locator('.scheduling-now-next');
   await panel.locator('.now').first().waitFor();
   const response=await loaded;
   if(width===1440){
    assert.deepEqual(await response.json(),expected,'The current coverage panel consumes the same complete native now-next response at the frozen Worker time');
    assert.equal(await page.evaluate(()=>Date.now()),at,'Browser time agrees with the Worker boundary');
    const current=await page.evaluate(async()=>(await (await fetch('/api/workspace')).json()).member);
    assert.equal(current.id,person.member.id);assert.equal(current.role,person.member.role);assert.equal(current.active,true);
    assert.deepEqual(await panel.locator('.scheduling-now-role h3').allTextContents(),['primary','backup']);
    const name=id=>native.members.find(row=>row.id===id)?.name??'Nobody on call';
    assert.deepEqual(await panel.locator('.now').allTextContents(),['Now: '+name(expected.now.primary),'Now: '+name(expected.now.backup)]);
    assert.equal(await panel.getByText(unrelated.name,{exact:true}).count(),0);
    const rows=panel.locator('.scheduling-now-role');
    for(const [index,role] of ['primary','backup'].entries()){
     assert.equal(await rows.nth(index).locator('.scheduling-rule').first().innerText(),expected.now.windows.find(row=>row.role===role)?.explanation??expected.now.warnings.filter(row=>row.startsWith(role+':')).join('; '));
    }
    const viewer=person.member.role==='viewer';
    assert.equal(await page.getByRole('link',{name:'Edit rota',exact:true}).count(),viewer?0:1);
    for(const control of ['Cover a shift','Request a swap','Remove cover'])assert.equal(await page.getByRole('button',{name:control,exact:true}).count(),viewer?0:(control==='Remove cover'&&boundary==='end'?0:1));
    if(!viewer&&boundary!=='end'){
     await page.getByRole('button',{name:'Remove cover',exact:true}).focus();
     await page.getByRole('tooltip',{name:'Remove cover',exact:true}).waitFor();
    }
    assert.ok(await panel.evaluate(node=>[...node.querySelectorAll('h2,h3,p')].every(el=>parseFloat(getComputedStyle(el).fontSize)>=13)),'Current coverage text is at least 13px');
   }
   await panel.scrollIntoViewIfNeeded();
   const file=`parity-${mode}-${person.member.role}-coverage-${boundary}-${width}.png`;
   await page.screenshot({path:(process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser')+'/'+file,fullPage:true});
   receipt.screens.push({role:person.member.role,mode,path,kind:'coverage',boundary,at:new Date(at).toISOString(),width,file});
   console.log(`Browser proof coverage ${mode} ${person.member.role} ${boundary} ${width}: current native panel captured`);
  }
 }finally{await context.close()}
 const after=await agentReadSnapshot(runtime),priorIds=new Set(before.records.oc_admin_audit.map(row=>row.id));
 for(const row of after.records.oc_admin_audit.filter(row=>!priorIds.has(row.id))){
  assert.equal(row.kind,'urgency.request','Only the established value-free native screen read observation is allowed');
  assert.equal(row.detail,null);
  for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after']);
 }
 assertAgentReadUnchanged(before,{...after,records:{...after.records,oc_admin_audit:after.records.oc_admin_audit.filter(row=>priorIds.has(row.id))}});
 assert.deepEqual(await runtime.outboundRequests(),[]);
}
