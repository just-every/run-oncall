import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentReadSnapshot,assertAgentReadUnchanged} from './agent-door-runtime.mjs';
import {accessToken,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

const json=async(http,path,input,status=200)=>{
 const response=await http(path,input);assert.equal(response.status,status,path);return response.json();
};
const custody=async(runtime,table)=>(await runtime.db.prepare('SELECT * FROM '+table+' ORDER BY id').all()).results;

/** Client authority is compared with protected native HTTP, never storage projections. */
export async function clientParity({runtime,people,browser,receipt,client,scopes,at}){
 const admin=people.find(person=>person.member.role==='admin');
 await runtime.time(at);
 const existing=await json(admin.http,'/api/automation');
 assert.ok(existing.clients.some(row=>row.id===client.id&&row.active),'Reuse the populated native client');
 // Preparation ends before the observation baseline. Neither credential is
 // used for parity reads: a Business agent cannot advance client lastUsed.
 const inactive=await json(admin.http,'/api/automation/clients',{
  name:'Synthetic inactive parity client',key:'synthetic-oncall-client-parity-credential',
  services:['agent-foreign-service','agent-service'],permissions:['incidents:read','actions:read','actions:write','integrations:read'],
 },201);
 await json(admin.http,'/api/automation/clients/'+inactive.id+'/revoke',{revision:inactive.revision});
 const requested=[...scopes,'integrations:read'];
 receipt.clients={cases:[],inactive:inactive.id,existing:client.id};
 for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
  assert.equal((await runtime.adopt(policy)).status,200);
  for(const person of people){
   const agent=randomUUID(),bearer=await accessToken(runtime.context,{
    sub:person.businessId,email:person.email,act:{sub:agent,name:'Synthetic client parity reader'},
    scope:requested.join(' '),consent:'synthetic-oncall-client-parity-'+agent,
   });
   const native=await json(person.http,'/api/state'),paging=await json(person.http,'/api/paging/state');
   const member=native.members.find(row=>row.id===person.member.id);
   assert.equal(member.role,person.member.role);assert.equal(member.active,true);
   assert.equal(paging.workspaceRevision,native.revision);
   // A successful admission with the same requested scope distinguishes the
   // viewer's native authority refusal from an unadmitted or scope-less agent.
   const templates=await runtime.mcp('resources/templates/list',{}, {},bearer);
   assert.equal(templates.status,200);assert.equal(templates.body.error,undefined);
   assert.ok(templates.result.resourceTemplates.some(row=>row.uriTemplate==='oncall://automation/clients/{id}'));
   const admission=await runtime.db.prepare('SELECT sponsor FROM agent_door_agents WHERE id=?').bind(agent).first();
   assert.equal(admission.sponsor,person.member.id);
   const baseline=await agentReadSnapshot(runtime);
   const automation=await json(admin.http,'/api/automation');
   assert.equal(automation.paging,'OFF');
   const targets=[client.id,inactive.id].map(id=>automation.clients.find(row=>row.id===id));
   assert.ok(targets.every(Boolean));assert.equal(targets[0].active,true);assert.equal(targets[1].active,false);
   assert.equal(targets[1].revision,inactive.revision+1);assert.equal(targets[1].owner,admin.member.id);
   if(person.member.role==='admin'){
    assert.deepEqual(native.apiClients,automation.clients,'Native state and protected client management agree');
    for(const expected of targets){
     const uri='oncall://automation/clients/'+expected.id;
     for(const field of ['id','name','owner','services','permissions','active','revision','createdAt','lastUsed'])assert.ok(Object.hasOwn(expected,field),'Native client includes '+field);
     assert.ok(expected.services.length&&expected.permissions.length);assert.ok(Number.isFinite(Date.parse(expected.createdAt)));
     const reviews=await custody(runtime,'agent_door_reviews'),approvals=await custody(runtime,'agent_door_approvals');
     const read=await runtime.completeResource(uri,{bearer,personHttp:person.http});
     assert.equal(read.content.uri,uri);assert.equal(read.content.mimeType,'application/json');
     assert.equal(read.content._meta['com.runeditrun/untrusted'],true);
     assert.deepEqual(read.value,expected,'Every administrator client field equals the same session protected HTTP response');
     assert.deepEqual(read.initial.decision.classes.map(({class:kind,facts})=>({class:kind,facts})),[{class:'standard',facts:{measure:1}}]);
     assert.equal(read.initial.decision.revision,runtime.context.revision);
     assert.equal(read.initial.decision.disposition,mode==='held'?'review':'autonomous');
     assert.deepEqual(read.initial.decision.classes.map(row=>row.do),[mode==='held'?'review':'autonomous']);
     const afterReviews=await custody(runtime,'agent_door_reviews');
     assert.deepEqual(await custody(runtime,'agent_door_approvals'),approvals,'Client reads never create or alter approval custody');
     for(const prior of reviews)assert.deepEqual(afterReviews.find(row=>row.id===prior.id),prior);
     let reviewId=null;
     if(mode==='held'){
      reviewId=read.answer.result._meta['com.runeditrun/review'].id;
      const review=(await json(person.http,'/agents/api/reviews')).reviews.find(row=>row.id===reviewId);
      assert.ok(review);assert.equal(review.state,'open');assert.equal(review.decision_id,read.initial.decision.id);
      assert.equal(review.prepared_by.for,person.member.name);
      assert.deepEqual(afterReviews.filter(row=>!reviews.some(prior=>prior.id===row.id)).map(row=>row.id),[reviewId]);
     }else assert.deepEqual(afterReviews,reviews);
     assert.deepEqual((await json(person.http,'/api/automation')).clients,automation.clients,'Client reads preserve lastUsed and every client revision');
     assert.deepEqual(await json(person.http,'/api/state'),native);
     assert.deepEqual(await json(person.http,'/api/paging/state'),paging);
     assertAgentReadUnchanged(baseline,await agentReadSnapshot(runtime));
     assert.deepEqual(await runtime.outboundRequests(),[]);
     receipt.clients.cases.push({mode,role:person.member.role,agent,sponsor:person.member.id,scopes:requested,uri,
      at:new Date(at).toISOString(),workspaceRevision:native.revision,schedulingRevision:paging.revision,
      decision:read.initial.decision.id,disposition:read.initial.decision.disposition,review:reviewId,
      nativeDoor:'/api/automation',nativeRecord:expected,resourceRecord:read.value,equal:true});
     console.log(`PROBE BASE-AGENT-003 2 clients ${mode} admin ${expected.active?'active':'inactive'}: every field equals protected native HTTP; lastUsed, revisions, paging and permanent state-changing audit unchanged; zero outbound requests`);
    }
   }else{
    assert.equal(Object.hasOwn(native,'apiClients'),false,'Viewer state omits client records entirely');
    const denied=await json(person.http,'/api/automation',undefined,403);
    for(const expected of targets)for(const value of [expected.id,expected.name])assert.ok(!JSON.stringify(denied).includes(value));
    assertObservedUnchanged(baseline,await agentReadSnapshot(runtime),'refusal');
    const before=await agentReadSnapshot(runtime),reviews=await custody(runtime,'agent_door_reviews'),approvals=await custody(runtime,'agent_door_approvals');
    let unavailable;
    for(const id of [...targets.map(row=>row.id),'synthetic-oncall-missing-client']){
     const refused=await runtime.mcp('resources/read',{uri:'oncall://automation/clients/'+id},{},bearer);
     assert.equal(refused.status,200);assert.equal(refused.result,undefined);
     assert.deepEqual(refused.body.error,{code:-32602,message:'Resource unavailable',data:{code:'resource_unavailable'}});
     if(unavailable)assert.deepEqual(refused.body.error,unavailable,'Populated active, inactive and missing clients have identical refusal');
     unavailable=refused.body.error;
    }
    assert.deepEqual(await custody(runtime,'agent_door_reviews'),reviews);
    assert.deepEqual(await custody(runtime,'agent_door_approvals'),approvals,'Denied reads never create approval custody');
    assertAgentReadUnchanged(before,await agentReadSnapshot(runtime));
    assert.deepEqual(await json(person.http,'/api/state'),native);
    assert.deepEqual(await json(person.http,'/api/paging/state'),paging);
    assert.deepEqual((await json(admin.http,'/api/automation')).clients,automation.clients);
    assert.deepEqual(await runtime.outboundRequests(),[]);
    receipt.clients.cases.push({mode,role:person.member.role,agent,sponsor:person.member.id,scopes:requested,
     at:new Date(at).toISOString(),workspaceRevision:native.revision,schedulingRevision:paging.revision,
     nativeDoor:'/api/automation',nativeStatus:403,stateClientsOmitted:true,refusedIds:[...targets.map(row=>row.id),'synthetic-oncall-missing-client'],error:unavailable});
    console.log(`PROBE BASE-AGENT-003 2 clients ${mode} viewer: native 403, state omits clients, active and inactive populated IDs equal missing resource_unavailable without content; native effects and custody unchanged; zero outbound requests`);
   }
   if(browser)await captureClients({browser,runtime,person,mode,at,native,automation,receipt});
  }
 }
 assert.equal(receipt.clients.cases.length,6);
}

function assertObservedUnchanged(before,after,kind){
 const prior=new Set(before.records.oc_admin_audit.map(row=>row.id));
 for(const row of after.records.oc_admin_audit.filter(row=>!prior.has(row.id))){
  assert.equal(row.kind,kind==='refusal'?'workspace.request':'urgency.request');
  if(kind==='refusal')assert.equal(row.outcome,'refused');
  assert.equal(row.detail,null);
  for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after']);
 }
 assertAgentReadUnchanged(before,{...after,records:{...after.records,oc_admin_audit:after.records.oc_admin_audit.filter(row=>prior.has(row.id))}});
}

async function captureClients({browser,runtime,person,mode,at,native,automation,receipt}){
 const before=await agentReadSnapshot(runtime);
 const context=await browser.newContext({baseURL:runtime.origin,viewport:{width:1440,height:1000}});
 try{
  await context.addCookies(person.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'}}));
  const page=await context.newPage();page.setDefaultTimeout(20000);await page.clock.setFixedTime(at);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   const path='/settings/integrations';
   const document=await page.goto(path);
   const bootstrap=/<script id="oncall-workspace" type="application\/json">([^<]*)<\/script>/.exec(await document.text());
   assert.ok(bootstrap,'The protected native page carries its workspace bootstrap');
   const panel=page.locator('#response-api'),clients=panel.locator(':scope > details').first();
   await panel.waitFor();await clients.locator(':scope > summary').click();
   for(const details of await clients.locator('.integration-rows > li > details').all())await details.locator('summary').click();
   if(width===1440){
    assert.deepEqual(JSON.parse(bootstrap[1]).state,native,'Native integrations consumes the same role-filtered state');
    const current=await page.evaluate(async()=>(await (await fetch('/api/workspace')).json()).member);
    assert.equal(current.id,person.member.id);assert.equal(current.role,person.member.role);assert.equal(current.active,true);
    assert.equal(new URL(page.url()).pathname,path);assert.equal(await page.evaluate(()=>Date.now()),at);
    const rows=clients.locator('.integration-rows > li');
    if(person.member.role==='admin'){
     assert.deepEqual(await rows.locator(':scope > strong').allTextContents(),automation.clients.map(row=>row.name));
     // API-only owner, revision and timestamps were compared over HTTP above.
     const labels={incidents:'Incidents',services:'Services',schedules:'Rotas',actions:'Follow-ups',analytics:'Response numbers',integrations:'Integrations',responders:'Responders'};
     for(const [index,client] of automation.clients.entries()){
      const row=rows.nth(index);
      assert.equal(await row.locator(':scope > p').innerText(),client.services.map(id=>native.services.find(service=>service.id===id).name).join(', ')+(client.active?'':' · Inactive'));
      assert.deepEqual(await row.locator('details').first().locator('li').allTextContents(),Object.entries(labels).filter(([area])=>client.permissions.includes(area+':read')).map(([area,label])=>label+' · '+(client.permissions.includes(area+':write')?'Read and change':'Read')));
      await row.getByRole('button',{name:'Rotate '+client.name,exact:true}).waitFor();
      assert.equal(await row.getByRole('button',{name:'Revoke '+client.name,exact:true}).isDisabled(),!client.active);
     }
     await clients.getByRole('button',{name:'Add client',exact:true}).waitFor();
    }else{
     await panel.getByText('An administrator manages clients, recipients and delivery failures.',{exact:true}).waitFor();
     assert.equal(await rows.count(),0);
     for(const client of automation.clients)for(const value of [client.name,client.id])assert.ok(!(await panel.innerText()).includes(value));
     assert.equal(await panel.getByRole('button').count(),0);
     assert.equal(await panel.locator('input,select,textarea,.integration-entry-actions,form').count(),0);
     assert.equal(await clients.getByText('Permissions',{exact:true}).count(),0);
    }
    assert.ok(await panel.evaluate(node=>[...node.querySelectorAll('p,li,summary,strong')].every(el=>parseFloat(getComputedStyle(el).fontSize)>=13)));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }
   await clients.scrollIntoViewIfNeeded();
   const file=`parity-${mode}-${person.member.role}-clients-${width}.png`;
   await page.screenshot({path:(process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser')+'/'+file,fullPage:true});
   receipt.screens.push({role:person.member.role,mode,path,kind:'clients',at:new Date(at).toISOString(),width,file});
   console.log(`Browser proof clients ${mode} ${person.member.role} ${width}: native disclosure captured`);
  }
 }finally{await context.close()}
 assertObservedUnchanged(before,await agentReadSnapshot(runtime),'screen');
 assert.deepEqual((await json(runtime.http,'/api/automation')).clients,automation.clients);
 assert.deepEqual(await runtime.outboundRequests(),[]);
}
