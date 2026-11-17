import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentReadSnapshot,assertAgentReadUnchanged} from './agent-door-runtime.mjs';
import {openIncidentAction} from './keyboard.mjs';
import {accessToken} from '../src/modules/agent-door/conformance/crypto.mjs';

const json=async(http,path)=>{
 const response=await http(path);assert.equal(response.status,200,path);return response.json();
};

/** Human follow-ups extend the established protected HTTP parity matrix. */
export async function actionParity({runtime,people,browser,receipt,review,mode,scopes,at}){
 receipt.actions??={cases:[]};
 for(const person of people){
  const agent=randomUUID(),native=await json(person.http,'/api/state');
  const current=native.members.find(row=>row.id===person.member.id);
  assert.equal(current.role,person.member.role);assert.equal(current.active,true);
  const permitted=native.services.map(row=>row.id).sort();
  assert.deepEqual(permitted,(await json(runtime.http,'/api/state')).services.map(row=>row.id).sort());
  const incident=native.incidents.find(row=>row.id===review.incident.id);assert.ok(incident);
  const bearer=await accessToken(runtime.context,{sub:person.businessId,email:person.email,
   act:{sub:agent,name:'Synthetic follow-up reader'},scope:scopes.join(' '),consent:'synthetic-oncall-action-'+agent});
  for(const [stage,id] of [['open',review.actions[3].id],['submitted',review.actions[2].id],['accepted',review.actions[0].id]]){
   // Native HTTP is the independent oracle. D1 is read only to compare durable
   // effects and admission custody, never to reconstruct the expected action.
   const containing=native.incidents.filter(row=>row.actions.some(action=>action.id===id));
   assert.equal(containing.length,1);assert.equal(containing[0].id,incident.id);
   const action=containing[0].actions.find(row=>row.id===id);
   assert.equal(action.owner,review.admin.id);assert.equal(action.completionPolicy,'human-review');
   assert.ok(action.due);assert.ok(action.escalationRecipient);assert.notEqual(action.escalationRecipient,action.owner);
   assert.equal(action.done,stage==='accepted');
   if(stage==='open'){
    assert.equal(action.evidence,'');
    for(const key of ['submission','accepted'])assert.equal(Object.hasOwn(action,key),false,'Open action preserves absent '+key);
   }else{
    assert.equal(action.priority,'P1');assert.equal(action.submission.by,review.admin.id);
    assert.equal(action.submission.at,new Date(at-30*60000+360000).toISOString());
    assert.equal(action.evidence,action.submission.evidence);assert.ok(action.evidence);
    if(stage==='submitted')assert.equal(Object.hasOwn(action,'accepted'),false,'Submission is still open without acceptance');
    else assert.deepEqual(action.accepted,{by:review.admin.id,at:new Date(at-30*60000+420000).toISOString()});
   }
   const expected={...action,incident:containing[0].id,service:containing[0].service,revision:containing[0].revision};
   const uri='oncall://actions/'+encodeURIComponent(id),before=await agentReadSnapshot(runtime);
   const custody=async table=>(await runtime.db.prepare('SELECT * FROM '+table+' ORDER BY id').all()).results;
   const priorReviews=await custody('agent_door_reviews'),priorApprovals=await custody('agent_door_approvals');
   const read=await runtime.completeResource(uri,{bearer,personHttp:person.http});
   assert.equal(read.content.uri,uri);assert.equal(read.content.mimeType,'application/json');
   assert.equal(read.content._meta['com.runeditrun/untrusted'],true);
   assert.deepEqual(read.value,expected,person.member.role+' '+mode+' '+stage+' every native follow-up field and parent binding');
   // Submission retains evidence both on the action and in its submission.
   const sensitive=stage!=='open';
   assert.deepEqual(read.initial.decision.classes.map(({class:kind,facts})=>({class:kind,facts})),[
    {class:'standard',facts:{measure:1}},
    ...(sensitive?[{class:'sensitive',facts:{measure:2,kind:'personal_or_incident_evidence'}}]:[]),
   ]);
   const disposition=mode==='held'?(sensitive?'approval':'review'):'autonomous';
   assert.equal(read.initial.decision.disposition,disposition);assert.equal(read.initial.decision.revision,runtime.context.revision);
   assert.ok(read.initial.decision.classes.every(row=>row.do===(mode==='held'?(row.class==='standard'?'review':'approval'):'autonomous')));
   const approvals=await custody('agent_door_approvals'),reviews=await custody('agent_door_reviews');
   for(const prior of priorApprovals)assert.deepEqual(approvals.find(row=>row.id===prior.id),prior);
   for(const prior of priorReviews)assert.deepEqual(reviews.find(row=>row.id===prior.id),prior);
   let approvalId=null,reviewId=null;
   if(disposition==='approval'){
    assert.equal(read.initial.result,undefined);
    approvalId=read.initial.body.error.data.approval.id;
    const {approval}=await json(person.http,'/agents/api/approvals/'+approvalId);
    assert.equal(approval.state,'executed');assert.equal(approval.decision_id,read.initial.decision.id);
    assert.equal(approval.revision,runtime.context.revision);
    assert.equal(approval.prepared_by.for.id,person.member.id);assert.equal(approval.prepared_by.agent.id,agent);
    assert.deepEqual(approval.approvals.map(row=>row.person),[person.member.id]);
    assert.deepEqual(approvals.filter(row=>!priorApprovals.some(prior=>prior.id===row.id)).map(row=>row.id),[approvalId]);
    assert.deepEqual(reviews,priorReviews);
   }else if(disposition==='review'){
    reviewId=read.answer.result._meta['com.runeditrun/review'].id;
    const review=(await json(person.http,'/agents/api/reviews')).reviews.find(row=>row.id===reviewId);
    assert.ok(review);assert.equal(review.state,'open');assert.equal(review.decision_id,read.initial.decision.id);
    assert.equal(review.prepared_by.for,person.member.name);
    assert.deepEqual(reviews.filter(row=>!priorReviews.some(prior=>prior.id===row.id)).map(row=>row.id),[reviewId]);
    assert.deepEqual(approvals,priorApprovals);
   }else{assert.deepEqual(approvals,priorApprovals);assert.deepEqual(reviews,priorReviews);}
   const admission=await runtime.db.prepare('SELECT sponsor FROM agent_door_agents WHERE id=?').bind(agent).first();
   assert.equal(admission.sponsor,person.member.id);
   assert.deepEqual(await json(person.http,'/api/state'),native,'Policy approval never accepts human completion or changes its containing incident');
   assertAgentReadUnchanged(before,await agentReadSnapshot(runtime));
   assert.deepEqual(await runtime.outboundRequests(),[]);
   receipt.actions.cases.push({mode,role:person.member.role,stage,agent,sponsor:person.member.id,scopes,permittedServices:permitted,
    uri,nativeDoor:'/api/state',workspaceRevision:native.revision,incidentRevision:incident.revision,decision:read.initial.decision.id,
    disposition,approval:approvalId,review:reviewId,nativeRecord:expected,resourceRecord:read.value,equal:true});
   console.log(`PROBE BASE-AGENT-003 2 actions ${mode} ${person.member.role} ${stage}: every field equals protected native HTTP with actual incident, service and revision; native effects unchanged; zero outbound requests`);
  }
  if(browser)await captureActions({browser,runtime,person,mode,at,native,incident,receipt});
 }
}

async function captureActions({browser,runtime,person,mode,at,native,incident,receipt}){
 const before=await agentReadSnapshot(runtime);
 const context=await browser.newContext({baseURL:runtime.origin,viewport:{width:1440,height:1000},timezoneId:'UTC'});
 try{
  await context.addCookies(person.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'}}));
  const page=await context.newPage();page.setDefaultTimeout(20000);await page.clock.setFixedTime(at);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   const path='/incidents/'+incident.id;
   await page.goto(path);
   await page.getByRole('heading',{name:incident.title,exact:true,level:1}).waitFor();
   const sheet=await openIncidentAction(page,'Follow-ups');
   await sheet.getByRole('heading',{name:'Follow-up owners',exact:true}).waitFor();
   if(width===1440){
    assert.equal(await page.evaluate(()=>Date.now()),at);
    const current=await page.evaluate(async()=>(await (await fetch('/api/workspace')).json()).member);
    assert.equal(current.id,person.member.id);assert.equal(current.role,person.member.role);assert.equal(current.active,true);
    assert.deepEqual(await page.evaluate(async id=>(await (await fetch('/api/state')).json()).incidents.find(row=>row.id===id),incident.id),incident);
    assert.equal(await sheet.locator('.followup-list > li').count(),incident.actions.length);
    const name=id=>native.members.find(row=>row.id===id).name;
    for(const action of incident.actions){
     const row=sheet.locator('.followup-list > li').filter({has:page.getByText(action.title,{exact:true})});
     await row.getByText(action.done?'Complete':action.submission?'Awaiting acceptance':'Open',{exact:true}).waitFor();
     const text=await row.innerText();
     assert.ok(text.includes(name(action.owner)));assert.ok(text.includes(action.priority));assert.ok(text.includes('end of day UTC'));
     const date=await row.locator('p > strong').innerText();
     const expectedDate=await page.evaluate(due=>new Date(due+'T12:00:00Z').toLocaleDateString([],{timeZone:'UTC',month:'short',day:'numeric'}),action.due);
     assert.equal(date,expectedDate+', end of day UTC');
     if(action.evidence)assert.equal(await row.getByRole('link',{name:'Completion evidence',exact:false}).getAttribute('href'),action.evidence);
     else assert.equal(await row.getByRole('link',{name:'Completion evidence',exact:false}).count(),0);
     assert.deepEqual(await row.locator('time').evaluateAll(nodes=>nodes.map(node=>node.dateTime)),[...(action.submission?[action.submission.at]:[]),...(action.accepted?[action.accepted.at]:[])]);
     if(action.submission)assert.ok(text.includes('Evidence submitted by '+name(action.submission.by)));
     if(action.accepted)assert.ok(text.includes('Completion accepted by '+name(action.accepted.by)));
     const canEdit=person.member.role==='admin'&&!action.done;
     assert.equal(await row.getByRole('textbox',{name:'Completion evidence',exact:true}).count(),Number(canEdit));
     assert.equal(await row.getByRole('button',{name:'Accept follow-up completion',exact:true}).count(),Number(canEdit&&Boolean(action.submission)));
    }
    const close=sheet.getByRole('button',{name:'Close',exact:true});await close.focus();
    await page.getByRole('tooltip',{name:'Close dialog',exact:true}).waitFor();
    assert.ok(await sheet.locator('.followups').evaluate(node=>[...node.querySelectorAll('h3,p,strong,.tag')].every(el=>parseFloat(getComputedStyle(el).fontSize)>=13)));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }
   const file=`parity-${mode}-${person.member.role}-actions-${width}.png`;
   await page.screenshot({path:(process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser')+'/'+file,fullPage:true});
   receipt.screens.push({role:person.member.role,mode,path,kind:'actions',width,file});
   console.log(`Browser proof actions ${mode} ${person.member.role} ${width}: native Follow-up owners sheet captured`);
   // The administrator's evidence forms make this sheet taller. Capture its
   // retained accepted completion too, without changing any native record.
   const accepted=incident.actions.find(action=>action.done);
   await sheet.locator('.followup-list > li').filter({has:page.getByText(accepted.title,{exact:true})}).scrollIntoViewIfNeeded();
   const completionFile=`parity-${mode}-${person.member.role}-actions-completion-${width}.png`;
   await page.screenshot({path:(process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser')+'/'+completionFile,fullPage:true});
   receipt.screens.push({role:person.member.role,mode,path,kind:'actions',stage:'accepted',width,file:completionFile});
  }
 }finally{await context.close()}
 const after=await agentReadSnapshot(runtime),priorIds=new Set(before.records.oc_admin_audit.map(row=>row.id));
 for(const row of after.records.oc_admin_audit.filter(row=>!priorIds.has(row.id))){
  assert.equal(row.kind,'urgency.request');assert.equal(row.detail,null);
  for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after']);
 }
 assertAgentReadUnchanged(before,{...after,records:{...after.records,oc_admin_audit:after.records.oc_admin_audit.filter(row=>priorIds.has(row.id))}});
 assert.deepEqual(await runtime.outboundRequests(),[]);
}
