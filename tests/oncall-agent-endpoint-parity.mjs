import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentReadSnapshot,assertAgentReadUnchanged} from './agent-door-runtime.mjs';
import {accessToken,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

const json=async(http,path,input,status=200)=>{
 const response=await http(path,input);assert.equal(response.status,status,path);return response.json();
};
const custody=async(runtime,table)=>(await runtime.db.prepare('SELECT * FROM '+table+' ORDER BY id').all()).results;

/** Endpoint authority is compared with the same sponsor's protected native HTTP. */
export async function endpointParity({runtime,people,browser,receipt,scopes,at}){
 await runtime.time(at);
 const admin=people.find(person=>person.member.role==='admin');
 const existing=await json(admin.http,'/api/automation');
 const endpoint=existing.endpoints.find(row=>row.active);
 assert.ok(endpoint,'Reuse the populated active native endpoint');
 const requested=[...scopes,'integrations:read'];
 receipt.endpoints={existing:endpoint.id,cases:[]};
 for(const phase of ['active','inactive']){
  if(phase==='inactive'){
   // Finish the active observations before revoking this disposable fixture.
   // The signed-in native administrator prepares inactivity before any new
   // observation baseline; no registration, renewal or dispatch is needed.
   const before=await json(admin.http,'/api/automation');
   const revoked=await json(admin.http,'/api/automation/endpoints/'+endpoint.id+'/revoke',{revision:endpoint.revision});
   assert.deepEqual(revoked,{...endpoint,active:false,revision:endpoint.revision+1});
   const prepared=await json(admin.http,'/api/automation');
   assert.deepEqual(prepared.endpoints,before.endpoints.map(row=>row.id===endpoint.id?revoked:row),
    'Preparation revokes only the existing endpoint without registering another');
   assert.deepEqual(prepared.clients,before.clients);assert.deepEqual(prepared.outbox,before.outbox);
   assert.equal(prepared.paging,'OFF');
   receipt.endpoints.preparation={nativeDoor:'/api/automation/endpoints/'+endpoint.id+'/revoke',
    administrator:admin.member.id,at:new Date(at).toISOString(),before:endpoint,after:revoked};
  }
 for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await runtime.adopt(policy)).status,200);
  for(const person of people){
   const agent=randomUUID(),bearer=await accessToken(runtime.context,{
    sub:person.businessId,email:person.email,act:{sub:agent,name:'Synthetic endpoint parity reader'},
    scope:requested.join(' '),consent:'synthetic-oncall-endpoint-parity-'+agent,
   });
   const native=await json(person.http,'/api/state'),paging=await json(person.http,'/api/paging/state');
   const member=native.members.find(row=>row.id===person.member.id);
   assert.equal(member.role,person.member.role);assert.equal(member.active,true);
   assert.equal(paging.workspaceRevision,native.revision);
   // Admission with the requested scope precedes refusal observations, so an
   // unadmitted agent or missing grant cannot stand in for native authority.
   const templates=await runtime.mcp('resources/templates/list',{}, {},bearer);
   assert.equal(templates.status,200);assert.equal(templates.body.error,undefined);
   assert.ok(templates.result.resourceTemplates.some(row=>row.uriTemplate==='oncall://automation/endpoints/{id}'));
   const admission=await runtime.db.prepare('SELECT sponsor FROM agent_door_agents WHERE id=?').bind(agent).first();
   assert.equal(admission.sponsor,person.member.id);
   const baseline=await agentReadSnapshot(runtime);
   const automation=await json(admin.http,'/api/automation');
   assert.equal(automation.paging,'OFF');
   const expected=automation.endpoints.find(row=>row.id===endpoint.id);
   assert.ok(expected);assert.equal(expected.active,phase==='active');
   assert.deepEqual(expected,{...endpoint,active:phase==='active',revision:endpoint.revision+(phase==='inactive'?1:0)});
   const uri='oncall://automation/endpoints/'+expected.id;
   const reviews=await custody(runtime,'agent_door_reviews'),approvals=await custody(runtime,'agent_door_approvals');
   if(person.member.role==='admin'){
    assert.deepEqual(native.apiEndpoints,automation.endpoints,'Native state and the same administrator management response agree');
    for(const field of ['id','name','owner','client','services','url','active','revision','createdAt'])assert.ok(Object.hasOwn(expected,field),'Native endpoint includes '+field);
    assert.ok(expected.name&&expected.owner&&expected.client&&expected.services.length&&expected.url);
    assert.ok(Number.isFinite(Date.parse(expected.createdAt)));assert.ok(expected.revision>0);
    const read=await runtime.completeResource(uri,{bearer,personHttp:person.http});
    assert.equal(read.content.uri,uri);assert.equal(read.content.mimeType,'application/json');
    assert.equal(read.content._meta['com.runeditrun/untrusted'],true);
    assert.deepEqual(read.value,expected,'Every administrator endpoint field equals its protected native HTTP record');
    assert.deepEqual(read.initial.decision.classes.map(({class:kind,facts})=>({class:kind,facts})),[{class:'standard',facts:{measure:1}}]);
    assert.equal(read.initial.decision.revision,runtime.context.revision);
    assert.equal(read.initial.decision.disposition,mode==='held'?'review':'autonomous');
    assert.deepEqual(read.initial.decision.classes.map(row=>row.do),[mode==='held'?'review':'autonomous']);
    const afterReviews=await custody(runtime,'agent_door_reviews');
    for(const prior of reviews)assert.deepEqual(afterReviews.find(row=>row.id===prior.id),prior);
    let reviewId=null;
    if(mode==='held'){
     reviewId=read.answer.result._meta['com.runeditrun/review'].id;
     const review=(await json(person.http,'/agents/api/reviews')).reviews.find(row=>row.id===reviewId);
     assert.ok(review);assert.equal(review.state,'open');assert.equal(review.decision_id,read.initial.decision.id);
     assert.equal(review.prepared_by.for,person.member.name);
     assert.deepEqual(afterReviews.filter(row=>!reviews.some(prior=>prior.id===row.id)).map(row=>row.id),[reviewId]);
    }else assert.deepEqual(afterReviews,reviews);
    receipt.endpoints.cases.push({phase,mode,role:person.member.role,agent,sponsor:person.member.id,scopes:requested,uri,
     at:new Date(at).toISOString(),workspaceRevision:native.revision,schedulingRevision:paging.revision,
     decision:read.initial.decision.id,disposition:read.initial.decision.disposition,review:reviewId,
     nativeDoor:'/api/automation',nativeRecord:expected,resourceRecord:read.value,equal:true});
    console.log(`PROBE BASE-AGENT-003 2 endpoints ${phase} ${mode} admin: every field equals protected native HTTP and native state; standard class, untrusted marker and read custody retained`);
   }else{
    assert.equal(Object.hasOwn(native,'apiEndpoints'),false,'Viewer state omits endpoint records entirely');
    const denied=await json(person.http,'/api/automation',undefined,403);
    for(const row of automation.endpoints)for(const value of [row.id,row.name,row.url])assert.ok(!JSON.stringify(denied).includes(value));
    assertObservedUnchanged(baseline,await agentReadSnapshot(runtime),'refusal');
    const before=await agentReadSnapshot(runtime);
    let unavailable;
    const refusedIds=[expected.id,'synthetic-oncall-missing-endpoint'];
    for(const id of refusedIds){
     const refused=await runtime.mcp('resources/read',{uri:'oncall://automation/endpoints/'+id},{},bearer);
     assert.equal(refused.status,200);assert.equal(refused.result,undefined);
     assert.deepEqual(refused.body.error,{code:-32602,message:'Resource unavailable',data:{code:'resource_unavailable'}});
     if(unavailable)assert.deepEqual(refused.body.error,unavailable,'The '+phase+' endpoint and missing endpoint have identical refusal without content');
     for(const value of [expected.id,expected.name,expected.url])assert.ok(!JSON.stringify(refused.body).includes(value));
     unavailable=refused.body.error;
    }
    assert.deepEqual(await custody(runtime,'agent_door_reviews'),reviews);
    assertAgentReadUnchanged(before,await agentReadSnapshot(runtime));
    receipt.endpoints.cases.push({phase,mode,role:person.member.role,agent,sponsor:person.member.id,scopes:requested,
     at:new Date(at).toISOString(),workspaceRevision:native.revision,schedulingRevision:paging.revision,
     nativeDoor:'/api/automation',nativeStatus:403,stateEndpointsOmitted:true,refusedIds,error:unavailable});
    console.log(`PROBE BASE-AGENT-003 2 endpoints ${phase} ${mode} viewer: native 403, state omits endpoints, populated and missing resource_unavailable are identical without content`);
   }
   assert.deepEqual(await custody(runtime,'agent_door_approvals'),approvals,'Endpoint reads never create or alter approval custody');
   assert.deepEqual(await json(person.http,'/api/state'),native);
   assert.deepEqual(await json(person.http,'/api/paging/state'),paging);
   assert.deepEqual(await json(admin.http,'/api/automation'),automation,'Endpoint reads preserve every native automation record and revision');
   if(person.member.role==='admin')assertAgentReadUnchanged(baseline,await agentReadSnapshot(runtime));
   else assertObservedUnchanged(baseline,await agentReadSnapshot(runtime),'refusal');
   assert.deepEqual(await runtime.outboundRequests(),[]);
   if(browser)await captureEndpoints({browser,runtime,person,phase,mode,at,native,automation,receipt});
  }
 }
 }
 assert.equal(receipt.endpoints.cases.length,8);
 for(const phase of ['active','inactive'])assert.equal(receipt.endpoints.cases.filter(row=>row.phase===phase).length,4);
}

function assertObservedUnchanged(before,after,kind){
 const prior=new Set(before.records.oc_admin_audit.map(row=>row.id));
 for(const row of after.records.oc_admin_audit.filter(row=>!prior.has(row.id)&&row.kind!=='agent-door.persistence')){
  assert.equal(row.kind,kind==='refusal'?'workspace.request':'urgency.request');
  if(kind==='refusal')assert.equal(row.outcome,'refused');
  assert.equal(row.detail,null);
  for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after']);
 }
 assertAgentReadUnchanged(before,{...after,records:{...after.records,oc_admin_audit:after.records.oc_admin_audit.filter(row=>prior.has(row.id)||row.kind==='agent-door.persistence')}});
}

async function captureEndpoints({browser,runtime,person,phase,mode,at,native,automation,receipt}){
 const before=await agentReadSnapshot(runtime);
 const reviews=await custody(runtime,'agent_door_reviews'),approvals=await custody(runtime,'agent_door_approvals');
 const context=await browser.newContext({baseURL:runtime.origin,viewport:{width:1440,height:1000}});
 try{
  await context.addCookies(person.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'}}));
  const page=await context.newPage();page.setDefaultTimeout(20000);await page.clock.setFixedTime(at);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   const path='/settings/integrations',document=await page.goto(path);
   const bootstrap=/<script id="oncall-workspace" type="application\/json">([^<]*)<\/script>/.exec(await document.text());
   assert.ok(bootstrap,'The protected native page carries its workspace bootstrap');
   const panel=page.locator('#response-api'),recipients=panel.locator(':scope > details').nth(1);
   await panel.waitFor();await recipients.locator(':scope > summary').click();
   for(const actions of await recipients.locator('.integration-entry-actions').all()){
    const summary=actions.locator('summary');await summary.focus();await summary.press('Enter');
   }
   // Actions use the native focus disclosure. Leave focus on the observed
   // endpoint so its permitted controls remain visible in both captures.
   if(person.member.role==='admin'){
    const index=automation.endpoints.findIndex(row=>row.id===receipt.endpoints.existing);
    await recipients.locator(':scope > ul > li').nth(index).locator('.integration-entry-actions > summary').focus();
   }
   if(person.member.role==='admin')for(const endpoint of automation.endpoints){
    await recipients.getByText(endpoint.name,{exact:true}).waitFor();
    await recipients.getByText(endpoint.url+(endpoint.active?'':' · Inactive'),{exact:true}).waitFor();
   }else await panel.getByText('An administrator manages clients, recipients and delivery failures.',{exact:true}).waitFor();
   if(width===1440){
    assert.deepEqual(JSON.parse(bootstrap[1]).state,native,'Recipients consumes the same role-filtered native state');
    const current=await page.evaluate(async()=>(await (await fetch('/api/workspace')).json()).member);
    assert.equal(current.id,person.member.id);assert.equal(current.role,person.member.role);assert.equal(current.active,true);
    assert.equal(new URL(page.url()).pathname,path);assert.equal(await page.evaluate(()=>Date.now()),at);
    const rows=recipients.locator(':scope > ul > li');
    if(person.member.role==='admin'){
     assert.deepEqual(await rows.locator(':scope > strong').allTextContents(),automation.endpoints.map(row=>row.name));
     // The UI shows name, address and availability. API-only fields were
     // compared with protected native HTTP, never invented as screen fields.
     for(const [index,endpoint] of automation.endpoints.entries()){
      const row=rows.nth(index);
      assert.equal(await row.locator(':scope > p').innerText(),endpoint.url+(endpoint.active?'':' · Inactive'));
      assert.equal(await row.getByRole('button',{name:'Renew '+endpoint.name,exact:true}).isEnabled(),true);
      assert.equal(await row.getByRole('button',{name:'Revoke '+endpoint.name,exact:true}).isDisabled(),!endpoint.active);
     }
     await recipients.getByRole('button',{name:'Add recipient',exact:true}).waitFor();
    }else{
     assert.equal(Object.hasOwn(JSON.parse(bootstrap[1]).state,'apiEndpoints'),false);
     assert.equal(await rows.count(),0);
     for(const endpoint of automation.endpoints)for(const value of [endpoint.id,endpoint.name,endpoint.url])assert.ok(!(await panel.innerText()).includes(value));
     assert.equal(await panel.getByRole('button').count(),0);
     assert.equal(await panel.locator('input,select,textarea,.integration-entry-actions,form').count(),0);
    }
    assert.ok(await recipients.evaluate(node=>[...node.querySelectorAll('p,li,summary,strong')].every(el=>parseFloat(getComputedStyle(el).fontSize)>=13)));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }
   await recipients.scrollIntoViewIfNeeded();
   const file=`parity-${mode}-${person.member.role}-endpoints${phase==='inactive'?'-inactive':''}-${width}.png`;
   await page.screenshot({path:(process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser')+'/'+file,fullPage:true});
   receipt.screens.push({role:person.member.role,phase,mode,path,kind:'endpoints',at:new Date(at).toISOString(),width,file});
   console.log(`Browser proof endpoints ${phase} ${mode} ${person.member.role} ${width}: existing Recipients disclosure captured`);
  }
 }finally{await context.close()}
 assertObservedUnchanged(before,await agentReadSnapshot(runtime),'screen');
 assert.deepEqual(await custody(runtime,'agent_door_reviews'),reviews);
 assert.deepEqual(await custody(runtime,'agent_door_approvals'),approvals);
 assert.deepEqual(await json(person.http,'/api/state'),native);
 assert.deepEqual(await json(runtime.http,'/api/automation'),automation);
 assert.deepEqual(await runtime.outboundRequests(),[]);
}
