import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {agentReadSnapshot,assertAgentReadUnchanged} from './agent-door-runtime.mjs';
import {accessToken,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

const start=Date.parse('2026-11-04T12:01:00.000Z'),end=start+60000;
const scopes=['incidents:read','services:read','schedules:read','analytics:read'];
const json=async(http,path,input,status=200)=>{
 const response=await http(path,input);assert.equal(response.status,status,path);return response.json();
};

/** Match the resource to the current native windows and their visible holders. */
export function nativeCoverageRecord(paging,saved,nowNext,native){
 const references=new Set([nowNext.now.primary,nowNext.now.backup,...nowNext.now.windows.map(row=>row.member)]);
 const people=native.members.filter(row=>references.has(row.id)).map(({id,name,active,role})=>({id,name,active,role}));
 return {paging:paging.paging,service:saved.service,schedule:saved,now:nowNext.now,people};
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
    const native=await json(p.http,'/api/state'),paging=await json(p.http,'/api/paging/state');
    const member=native.members.find(row=>row.id===p.member.id);
    assert.equal(member.active,true);assert.equal(member.role,p.member.role);
    const permitted=native.services.map(row=>row.id).sort();
    assert.deepEqual(permitted,(await json(admin.http,'/api/state')).services.map(row=>row.id).sort());
    assert.equal(paging.workspaceRevision,native.revision);
    const saved=paging.schedules.find(row=>row.id===schedule.id);assert.ok(saved);
    assert.deepEqual(saved.services??[saved.service],['agent-service'],'This proof is an ordinary single-service schedule');
    const path='/api/schedules/'+schedule.id+'/now-next';
    const nowNext=await json(p.http,path+'?'+new URLSearchParams({at:new Date(at).toISOString()}));
    assert.equal(nowNext.now.at,at);assert.equal(nowNext.now.primary,primary);assert.equal(nowNext.now.backup,participants.backup.id);
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
    // The oracle is protected HTTP, never the coverage evaluator, resource
    // projector or reconstructed D1 records. Native list order is retained.
    const expected=nativeCoverageRecord(paging,saved,nowNext,native);
    const {people:expectedPeople}=expected;
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
