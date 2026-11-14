import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {openIncidentAction} from './keyboard.mjs';
import {agentRuntime,agentReadSnapshot,assertAgentReadUnchanged} from './agent-door-runtime.mjs';
import {prepareResourceRecords} from './oncall-agent-fixtures.mjs';
import {accessToken,autonomousPolicy,heldPolicy} from '../src/modules/agent-door/conformance/crypto.mjs';

const observed=Date.parse('2026-11-04T12:00:00.000Z');
const from='2026-10-01T00:00:00.000Z',to='2026-11-01T00:00:00.000Z';
const scopes=['incidents:read','services:read','schedules:read','analytics:read'];
async function json(http,path,input,status=200){
 const response=await http(path,input);assert.equal(response.status,status,path);return response.json();
}

/** Compare populated MCP records with the same sponsor's protected native doors. */
export async function resourceParity({browserProof=false}={}){
 const runtime=await agentRuntime({clock:null});let browser;
 const evidence=process.env.ONCALL_BROWSER_EVIDENCE??(browserProof?'evidence/browser':undefined);
 const receipt={journey:'resourceParity',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),observationAt:new Date(observed).toISOString(),from,to,cases:[],screens:[]};
 try{
  // Establish real sessions before freezing platform time; SQLite's session
  // expiry also consults its own clock. No session or bearer enters evidence.
  const people=[];
  for(const role of ['admin','viewer'])people.push({...await runtime.memberSession('Synthetic parity '+role,role),businessId:randomUUID(),email:['synthetic-oncall-parity-'+role,'example.invalid'].join('@'),agent:randomUUID()});
  await runtime.time(observed);
  const fixture=await prepareResourceRecords(runtime);
  await runtime.settings(people.map(p=>({id:p.businessId,email:p.email,name:p.member.name,role:p.member.role==='admin'?'admin':'member',invite:1})),3);
  for(const p of people){const link=await runtime.http('/api/rer/people-link',{businessId:p.businessId,memberId:p.member.id,revision:3});assert.equal(link.status,303,await link.text());}
  // Public declarations straddle both exact UTC month boundaries. An empty
  // report, local-zone bounds or inclusive upper bound cannot satisfy parity.
  const boundary=[];
  for(const [label,at] of [['before',Date.parse(from)-1],['first',Date.parse(from)],['last',Date.parse(to)-1],['after',Date.parse(to)]]){
   await runtime.time(at);
   boundary.push(await json(runtime.http,'/api/command',{type:'declare',service:'agent-service',title:'Synthetic UTC month '+label,summary:'Retained native month boundary',severity:'warning',alerts:[]}));
  }
  const archive=await json(runtime.http,'/api/paging/archive');
  await json(runtime.http,'/api/paging/restore',{mode:'replace',archive:{...archive,schedules:archive.schedules.map(s=>({...s,validFrom:from,primary:{...s.primary,anchorLocal:from.slice(0,16)},backup:{...s.backup,anchorLocal:from.slice(0,16)}}))}});
  await runtime.time(Date.parse('2026-10-15T12:05:00.000Z'));
  const {localPart,mail}=await import('./email-fixtures.mjs');
  const local=localPart();
  await json(runtime.http,'/api/email/addresses',{id:'synthetic-oncall-parity-mail',name:'Synthetic month report mail',service:'agent-service',owner:fixture.owner.id,localPart:local,mode:'subject',fallback:'subject',rules:[]},201);
  for(let n=0;n<2;n++)assert.equal((await mail(runtime,local,'Synthetic month repeated alert',{body:'Retained customer observation'})).status,200);
  await json(runtime.http,'/api/command',{type:'transition',incident:fixture.own.id,revision:fixture.own.revision,state:'acknowledged',summary:'A real human records the response'});
  await runtime.time(observed);
  const changes=await prepareRecentChanges(runtime,fixture.owner);
  const identify=({id,eventId,source,service,at})=>({id,eventId,source,service,occurredAt:new Date(at).toISOString()});
  receipt.recentChanges={nativeDoor:changes.path,from:changes.from,to:changes.to,hours:24,included:changes.expected.map(identify),excluded:changes.excluded.map(identify)};
  if(browserProof){
   const {chromium}=await import('@playwright/test');
   browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
   assert.ok(evidence,'Browser proof needs an explicit evidence directory');await mkdir(evidence,{recursive:true});
  }
  for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
   assert.equal((await runtime.adopt(policy)).status,200);
   const review=await prepareReviewMaterial(runtime,people,changes,mode);
   receipt.reviewMaterial??=[];receipt.reviewMaterial.push(review.receipt);
   for(const p of people){
    const native=await json(p.http,'/api/state'),paging=await json(p.http,'/api/paging/state');
    assert.equal(native.members.find(m=>m.id===p.member.id).role,p.member.role);
    assert.equal(native.members.find(m=>m.id===p.member.id).active,true);
    assert.equal(paging.workspaceRevision,native.revision);
    const permitted=native.services.map(s=>s.id).sort();
    assert.deepEqual(permitted,(await json(runtime.http,'/api/state')).services.map(s=>s.id).sort(),'Both native roles permit this same service scope');
    const overrides={sub:p.businessId,email:p.email,act:{sub:p.agent,name:'Synthetic parity assistant'},scope:scopes.join(' '),consent:'synthetic-oncall-parity-'+p.agent};
    const bearer=await accessToken(runtime.context,overrides);
    const handoff=await json(p.http,'/api/handoffs/'+fixture.ownHandoff.id);
    assert.equal(handoff.workspaceRevision,native.revision);
    const reportPath='/api/reports/response?'+new URLSearchParams({from,to,at:to,revision:String(native.revision),schedulingRevision:String(paging.revision)});
    const report=await json(p.http,reportPath);
    assert.equal(report.generatedAt,to);assert.equal(report.cohort.from,from);assert.equal(report.cohort.to,to);
    assert.ok(report.load.responders.some(r=>r.primarySeconds>0));assert.ok(report.noise.triggers>=2);assert.ok(report.noise.repeatedAlerts>0);
    assert.deepEqual(report.incidents.map(i=>i.id).sort(),[fixture.own.id,boundary[1].id,boundary[2].id].sort());
    const recent=await json(p.http,changes.path);
    assertRecentChanges(recent,changes);
    const alert=native.alerts.find(a=>a.id===fixture.emailAlert.id);
    assert.ok(alert?.events.length);
    const materialPath='/api/reviews/'+review.incident.id+'/material';
    const material=await json(p.http,materialPath);
    assertReviewMaterial(material,review,native,observed);
    const cases=[
     {kind:'incidents',id:fixture.own.id,expected:native.incidents.find(i=>i.id===fixture.own.id),path:'/incidents/'+fixture.own.id},
     {kind:'alerts',id:alert.id,expected:alert,path:'/alerts/'+alert.id},
     {kind:'services',id:'agent-service',expected:native.services.find(s=>s.id==='agent-service'),path:'/settings/services/agent-service'},
     {kind:'schedules',id:fixture.importedSchedule.id,expected:paging.schedules.find(s=>s.id===fixture.importedSchedule.id),path:'/on-call/'+fixture.importedSchedule.id},
     {kind:'handoffs',id:fixture.ownHandoff.id,expected:handoff.record,path:'/incidents/'+fixture.own.id},
     {kind:'changes',id:native.changes.find(c=>c.source===changes.rootSource).id,expected:native.changes.find(c=>c.source===changes.rootSource),path:'/settings/services/agent-service'},
     {kind:'service-changes',id:'agent-service',uri:'oncall://services/agent-service/changes',expected:recent,path:'/settings/services/agent-service'},
     {kind:'reports',id:fixture.ownPeriod,expected:report,path:'/reviews'},
     {kind:'review-material',id:review.incident.id,uri:'oncall://incidents/'+review.incident.id+'/review-material',expected:material,path:'/reviews/'+review.incident.id,nativeDoor:materialPath},
    ];
    const before=await agentReadSnapshot(runtime);
    for(const c of cases){
     assert.ok(c.expected,c.kind+' must have actual native records');
     const uri=c.uri??'oncall://'+c.kind+'/'+encodeURIComponent(c.id);
     const read=await runtime.completeResource(uri,{bearer,personHttp:p.http});
     assert.equal(read.content.uri,uri);assert.equal(read.content.mimeType,'application/json');
     assert.equal(read.content._meta['com.runeditrun/untrusted'],true);
     if(c.kind==='review-material'){
      assert.deepEqual(read.initial.decision.classes.map(row=>row.class),['standard','sensitive']);
      assert.deepEqual(read.initial.decision.classes[0].facts,{measure:1});
      assert.equal(read.initial.decision.classes[1].facts.kind,'personal_or_incident_evidence');
      assert.ok(read.initial.decision.classes[1].facts.measure>0);
     }
     if(c.kind==='service-changes')assert.deepEqual(read.initial.decision.classes.map(({class:kind,facts})=>({class:kind,facts})),[{class:'standard',facts:{measure:1}},{class:'sensitive',facts:{measure:recent.items.length,kind:'personal_or_incident_evidence'}}],'Populated authors retain the existing standard and sensitive classes');
     const sensitive=read.initial.decision.classes.some(row=>row.class==='sensitive');
     assert.equal(read.initial.decision.revision,runtime.context.revision);
     assert.equal(read.initial.decision.disposition,mode==='held'?(sensitive?'approval':'review'):'autonomous');
     assert.ok(read.initial.decision.classes.every(row=>row.do===(mode==='held'?(row.class==='standard'?'review':'approval'):'autonomous')));
     if(mode==='held'&&sensitive){
      const handle=read.initial.body.error.data.approval;
      const {approval}=await json(p.http,'/agents/api/approvals/'+handle.id);
      assert.equal(approval.state,'executed');assert.equal(approval.prepared_by.for.id,p.member.id);assert.equal(approval.prepared_by.agent.id,p.agent);
      assert.deepEqual(approval.approvals.map(row=>row.person),[p.member.id],'The actual sponsor session approves its own held resource');
     }else if(mode==='held'){
      const handle=read.answer.result._meta['com.runeditrun/review'];assert.ok(handle?.id);
      const {reviews}=await json(p.http,'/agents/api/reviews');
      const review=reviews.find(row=>row.id===handle.id);assert.ok(review);
      assert.equal(review.decision_id,read.initial.decision.id);assert.equal(review.state,'open');assert.equal(review.prepared_by.for,p.member.name);
     }

     // Only the transport metadata and explicitly derived alert observations
     // are separate. Every record field, including nested fields, is compared.
     if(c.kind==='alerts'){
      const {observations,...record}=read.value;
      assert.deepEqual(record,c.expected,p.member.role+' '+mode+' complete native alert');
      assert.deepEqual(observations,native.events.filter(e=>alert.events.includes(e.id)).map(({id,title,evidence,observedAt,intent})=>({id,title,evidence,observedAt,intent})));
     }else assert.deepEqual(read.value,c.expected,p.member.role+' '+mode+' complete native '+c.kind);
     assert.equal((await json(p.http,'/api/state')).revision,native.revision);
     assertAgentReadUnchanged(before,await agentReadSnapshot(runtime));
     assert.deepEqual(await runtime.outboundRequests(),[]);
     receipt.cases.push({role:p.member.role,agent:p.agent,sponsor:p.member.id,scopes,mode,template:c.kind,workspaceRevision:native.revision,schedulingRevision:paging.revision,disposition:read.initial.decision.disposition,fields:Object.keys(read.value).sort(),equal:true,...(['service-changes','review-material'].includes(c.kind)?{nativeDoor:c.nativeDoor??changes.path,permittedServices:permitted}:{}),nativeRecord:c.expected,resourceRecord:read.value});
     console.log(`PROBE BASE-AGENT-003 2 ${mode} ${p.member.role} ${c.kind}: native protected record equals every resource field at workspace revision ${native.revision}; paging and permanent state-changing audit unchanged; zero outbound requests`);
    }
    const admission=await runtime.db.prepare('SELECT sponsor FROM agent_door_agents WHERE id=?').bind(p.agent).first();
    assert.equal(admission.sponsor,p.member.id,'Each distinct admitted agent has the corresponding native session sponsor');
    for(const period of ['2026-11','2026-12']){
     const refused=await runtime.mcp('resources/read',{uri:'oncall://reports/'+period},{},bearer);
     assert.equal(refused.body.error?.data?.code,'resource_unavailable');assert.equal(refused.result,undefined);
    }
    assertAgentReadUnchanged(before,await agentReadSnapshot(runtime));
    if(browser){
     // Native screens already retain value-free request observations. Compare
     // all native effects and permanent state-changing audit separately from
     // the stricter agent-only decision custody assertions above.
     const nativeBefore=await agentReadSnapshot(runtime);
     await captureViews(browser,runtime,p,mode,cases,report,receipt);
     const after=await agentReadSnapshot(runtime),priorIds=new Set(nativeBefore.records.oc_admin_audit.map(row=>row.id));
     for(const row of after.records.oc_admin_audit.filter(row=>!priorIds.has(row.id))){
      assert.equal(row.kind,'urgency.request','Only the existing native urgency read appends observation audit');
      for(const family of ['workspace','paging','handoff'])assert.equal(row[family+'_before'],row[family+'_after']);
     }
     // Audit observations above are native screen custody, never MCP reads.
     // Keep every original audit and every state-changing row in the comparison.
     assertAgentReadUnchanged(nativeBefore,{...after,records:{...after.records,oc_admin_audit:after.records.oc_admin_audit.filter(row=>priorIds.has(row.id))}});
    }
   }
  }
  assert.equal(receipt.cases.length,36);
  assert.deepEqual(await runtime.outboundRequests(),[]);
  if(evidence){await mkdir(evidence,{recursive:true});await writeFile(evidence+'/resource-parity.json',JSON.stringify(receipt,null,2)+'\n');}
  return receipt;
 }finally{try{await browser?.close()}finally{await runtime.close()}}
}

/** Populated review custody uses native intake, commands and a true Business agent. */
async function prepareReviewMaterial(runtime,people,changes,mode){
 const admin=people.find(p=>p.member.role==='admin'),viewer=people.find(p=>p.member.role==='viewer');
 const start=observed-30*60000,source='synthetic-oncall-parity-review-'+mode,key=source+'-credential';
 const evidence='https://evidence.example.invalid/'+source;
 await runtime.time(start-60000);
 await json(admin.http,'/api/sources',{id:source,key,scopes:['agent-service']});
 async function signal(intent,at){
  await runtime.time(at);
  const response=await runtime.request(runtime.origin+'/api/ingress/'+source,{method:'POST',headers:{Origin:runtime.origin,'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({source,eventId:source+'-'+intent,service:'agent-service',environment:'production',key:source,generation:source,intent,severity:'warning',title:'Checkout latency '+intent,observedAt:new Date(at-5000).toISOString(),evidence:evidence+'/'+intent})});
  assert.equal(response.status,201,await response.clone().text());return response.json();
 }
 const trigger=await signal('trigger',start-60000);
 const alert=(await json(admin.http,'/api/state')).alerts.find(row=>row.events.includes(trigger.id));assert.ok(alert);
 await runtime.time(start);
 let incident=await json(admin.http,'/api/command',{type:'declare',service:'agent-service',title:'Checkout latency review '+mode,summary:'Checkout latency rose during the database rollout; retain separate observations and human assessments.',severity:'warning',alerts:[alert.id]});
 async function command(type,fields,at){
  await runtime.time(at);incident=await json(admin.http,'/api/command',{type,incident:incident.id,revision:incident.revision,...fields});return incident;
 }
 await command('transition',{state:'acknowledged',summary:'The incident commander is investigating checkout latency.'},start+60000);
 await command('note',{text:'The human operator retained the rollout dashboard and customer impact report.'},start+90000);
 const note='The Business assistant correlated the retained rollout observations; this is coordination, not an accepted cause.';
 await runtime.time(start+120000);
 const bearer=await accessToken(runtime.context,{sub:admin.businessId,email:admin.email,act:{sub:admin.agent,name:'Synthetic parity assistant'},scope:[...scopes,'incidents:write'].join(' '),consent:'synthetic-oncall-parity-'+admin.agent});
 const called=await runtime.tool('oncall.notes.add',{incident:incident.id,revision:incident.revision,text:note,idempotency_key:randomUUID()},{},bearer);
 assert.equal(called.decision.disposition,mode==='held'?'review':'autonomous');
 assert.equal(called.result?.isError,false,JSON.stringify(called.body));
 incident=(await json(admin.http,'/api/state')).incidents.find(row=>row.id===incident.id);
 const agentEntry=incident.timeline.find(row=>row.text===note);assert.ok(agentEntry?.metadata?.agent);
 assert.equal(agentEntry.metadata.agent.agent.id,admin.agent);assert.equal(agentEntry.metadata.agent.for.id,admin.member.id);
 const recovery=await signal('recover',start+180000);
 incident=(await json(admin.http,'/api/state')).incidents.find(row=>row.id===incident.id);
 await command('transition',{state:'recovered',summary:'The human verified the retained recovery dashboard.',evidence:evidence+'/human-recovery'},start+240000);
 const actions=[];
 for(const [label,priority,due] of [['completed','P1','2026-11-12'],['open later','P3','2026-11-10'],['submitted','P2','2026-11-09'],['open earlier','P2','2026-11-08']]){
  await command('action',{title:'Checkout '+label+' follow-up',owner:admin.member.id,due,priority,completionPolicy:'human-review'},start+300000+actions.length*1000);
  actions.push(incident.actions.at(-1));
 }
 for(const action of [actions[0],actions[2]])await command('complete',{action:action.id,evidence:evidence+'/'+action.id},start+360000);
 // Human follow-up acceptance uses the actual signed-in administrator. It is
 // independent of company policy approval for later agent resource reads.
 await command('accept-action',{action:actions[0].id,reason:'The human checked the retained rollback validation.'},start+420000);
 await command('transition',{state:'resolved',summary:'Checkout latency returned to normal; the remaining work stays open.'},start+480000);
 const draft={text:'The review separates reported trigger and recovery, human assessments and assistant coordination.',rootCause:'Human assessment: the deployment increased connection pressure.',impact:'Checkout requests were delayed while the operator rolled back the deployment.'};
 await command('review',draft,start+540000);
 const draftMaterial=await json(admin.http,'/api/reviews/'+incident.id+'/material');
 assert.equal(draftMaterial.accepted,null);assert.equal(draftMaterial.review,draft.text);
 const beforeDenied=await agentReadSnapshot(runtime);
 for(const input of [{type:'review',...draft},{type:'review',...draft,accept:true,materialRevision:incident.revision,materialWorkspaceRevision:draftMaterial.workspaceRevision},{type:'accept-action',action:actions[2].id,reason:'Viewer cannot accept retained evidence'}]){
  await json(viewer.http,'/api/command',{incident:incident.id,revision:incident.revision,...input},403);
 }
 // Refusal audit is permitted, but every native application record and all
 // permanent state-changing audit must remain identical.
 const afterDenied=await agentReadSnapshot(runtime);
 assert.deepEqual(afterDenied.application,beforeDenied.application);
 for(const [table,rows] of Object.entries(beforeDenied.records))if(!['oc_admin_audit','oc_audit_clock','oc_audit_identities'].includes(table))assert.deepEqual(afterDenied.records[table],rows);
 assert.deepEqual(afterDenied.records.oc_admin_audit.filter(row=>row.workspace_before!==row.workspace_after||row.paging_before!==row.paging_after||row.handoff_before!==row.handoff_after),beforeDenied.records.oc_admin_audit.filter(row=>row.workspace_before!==row.workspace_after||row.paging_before!==row.paging_after||row.handoff_before!==row.handoff_after));
 await command('review',{...draft,accept:true,materialRevision:draftMaterial.incidentRevision,materialWorkspaceRevision:draftMaterial.workspaceRevision},start+600000);
 const acceptance=incident.reviewAcceptance;assert.equal(acceptance.by,admin.member.id);
 await runtime.time(observed);
 assert.deepEqual(await runtime.outboundRequests(),[]);
 return {incident,admin:admin.member,trigger,recovery,agentEntry,actions,draft,changes,
  receipt:{mode,incident:incident.id,nativeDoor:'/api/reviews/'+incident.id+'/material',draftMaterial,acceptedBy:acceptance.by,acceptance,viewerRefusals:3,coordinationDecision:called.decision.id,coordinationDisposition:called.decision.disposition}};
}

function assertReviewMaterial(material,fixture,native,at){
 const incident=native.incidents.find(row=>row.id===fixture.incident.id);assert.ok(incident);
 assert.equal(material.incidentRevision,incident.revision);assert.equal(material.workspaceRevision,native.revision);
 assert.equal(material.generatedAt,new Date(at).toISOString());assert.equal(material.title,incident.title);
 assert.deepEqual(material.observations.map(row=>row.id),[fixture.trigger.id,fixture.recovery.id]);
 assert.deepEqual(material.observations.map(row=>row.intent),['trigger','recover']);
 for(const row of material.observations){assert.ok(row.evidence);assert.equal(row.classification,'reported source observation');assert.ok(Date.parse(row.at)<Date.parse(row.acceptedAt));}
 for(const [key,seconds] of [['mtta',60],['sourceRecovery',180],['recovery',240],['mttr',480]]){
  assert.equal(material.response[key].status,'measured');assert.equal(material.response[key].seconds,seconds);assert.ok(material.response[key].sourceEntryId);
 }
 const agent=material.assertions.find(row=>row.id===fixture.agentEntry.id);
 assert.equal(agent.classification,'agent coordination record');assert.equal(agent.metadata.agent.agent.id,fixture.agentEntry.metadata.agent.agent.id);assert.equal(agent.actorName,agent.metadata.agent.label);
 assert.ok(material.assertions.some(row=>row.actor===fixture.admin.id&&row.classification==='human assertion'));
 assert.ok(material.assertions.some(row=>row.kind==='source-recovery'&&row.classification==='reported source observation'));
 assert.ok(material.changes.some(row=>row.service===fixture.changes.root&&!row.dependency));
 assert.ok(material.changes.some(row=>row.service===fixture.changes.dependency&&row.dependency));
 assert.ok(!material.changes.some(row=>row.service==='synthetic-oncall-parity-decoy'));
 assert.deepEqual(material.followups.map(row=>row.id),[fixture.actions[3].id,fixture.actions[2].id,fixture.actions[1].id,fixture.actions[0].id]);
 const [open,submitted,later,completed]=material.followups;
 assert.equal(open.done,false);assert.equal(open.submission,undefined);assert.equal(later.done,false);
 assert.equal(submitted.done,false);assert.ok(submitted.submission.evidence);assert.equal(submitted.accepted,undefined);
 assert.equal(completed.done,true);assert.equal(completed.accepted.by,fixture.admin.id);assert.equal(completed.evidence,completed.submission.evidence);
 assert.deepEqual(material.accepted,incident.reviewAcceptance);assert.equal(material.accepted.rootCause,fixture.draft.rootCause);assert.equal(material.accepted.impact,fixture.draft.impact);
 assert.equal(material.review,fixture.draft.text);assert.ok(material.missing.length);assert.match(material.notice,/Human acceptance is separate/);
}

/** Native ingress receipts identify the records; only protected HTTP is the parity oracle. */
async function prepareRecentChanges(runtime,owner){
 const root='agent-service',dependency='synthetic-oncall-parity-dependency',decoy='synthetic-oncall-parity-decoy';
 for(const [id,name] of [[dependency,'Settlement database'],[decoy,'Unrelated build worker']])
  await json(runtime.http,'/api/command',{type:'service',id,name,environment:'production',owner:owner.id,runbook:[],pager:''});
 const service=(await json(runtime.http,'/api/state')).services.find(row=>row.id===root);
 await json(runtime.http,'/api/command',{...service,type:'service',dependencies:[dependency]});
 const sources={};
 for(const [id,label] of [[root,'root'],[dependency,'dependency'],[decoy,'decoy']]){
  const source='synthetic-oncall-parity-'+label+'-change',key='synthetic-oncall-parity-'+label+'-credential';
  await json(runtime.http,'/api/changes/sources',{id:source,name:'Synthetic '+label+' deployment',provider:'native',service:id,repository:'',mode:'bearer',revision:0,key},201);
  sources[id]={source,key};
 }
 const start=observed-24*3600000,receipts=[];
 // Admit out of chronological order, including tied times and both inclusive
 // edges. Decoys are permitted services, so membership cannot hide a bad join.
 for(const [service,label,at,included] of [
  [root,'current release',observed,true],
  [dependency,'dependency migration',observed-3600000,true],
  [root,'before lookback',start-1,false],
  [dependency,'lookback boundary',start,true],
  [root,'tied rollback',observed-3600000,true],
  [root,'inside lookback',start+1,true],
  [dependency,'after observation',observed+1,false],
  [decoy,'unrelated deployment',observed,false],
 ]){
  const {source,key}=sources[service],eventId='synthetic-oncall-parity-'+label.replaceAll(' ','-');
  const payload={eventId,summary:'Synthetic '+label,timestamp:new Date(at).toISOString(),author:'Synthetic '+(service===dependency?'database operator':'release engineer'),links:['https://evidence.example.invalid/'+eventId],custom_details:{environment:'production',revision:eventId,context:'Retained '+label+' context'}};
  const response=await runtime.request(runtime.origin+'/api/changes/ingress/'+source,{method:'POST',headers:{Origin:runtime.origin,'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(payload)});
  assert.equal(response.status,201);const receipt=await response.json();
  receipts.push({...receipt,payload,at,included,source,dependency:service===dependency});
 }
 const expected=receipts.filter(row=>row.included).sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));
 return {path:'/api/changes/recent?'+new URLSearchParams({service:root,at:new Date(observed).toISOString(),hours:'24'}),rootSource:sources[root].source,expected,excluded:receipts.filter(row=>!row.included),from:new Date(start).toISOString(),to:new Date(observed).toISOString(),root,dependency};
}

function assertRecentChanges(recent,fixture){
 assert.deepEqual({service:recent.service,from:recent.from,to:recent.to,hours:recent.hours},{service:fixture.root,from:fixture.from,to:fixture.to,hours:24});
 assert.deepEqual(recent.items.map(row=>row.id),fixture.expected.map(row=>row.id),'Native query includes both exact boundaries, sorts by time then ID and excludes unrelated and outside-window records');
 for(const expected of fixture.expected){
  const actual=recent.items.find(row=>row.id===expected.id);
  assert.equal(actual.eventId,expected.payload.eventId);assert.equal(actual.source,expected.source);assert.equal(actual.provider,'native');
  assert.equal(actual.service,expected.service);assert.equal(actual.dependency,expected.dependency);
  assert.equal(actual.serviceName,expected.dependency?'Settlement database':'Payments API');
  assert.equal(actual.summary,expected.payload.summary);assert.equal(actual.author,expected.payload.author);
  assert.deepEqual(actual.links,expected.payload.links);assert.deepEqual(actual.details,expected.payload.custom_details);
  assert.equal(actual.occurredAt,expected.payload.timestamp);assert.equal(actual.acceptedAt,expected.acceptedAt);
 }
 for(const excluded of fixture.excluded)assert.ok(!recent.items.some(row=>row.id===excluded.id));
}

async function captureViews(browser,runtime,person,mode,cases,report,receipt){
 const context=await browser.newContext({baseURL:runtime.origin,viewport:{width:1440,height:1000}});
 try{
  await context.addCookies(person.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'}}));
  const page=await context.newPage();page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(observed);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   const screens=[...new Map(cases.filter(c=>!['handoffs','changes','service-changes'].includes(c.kind)).map(c=>[c.path,c])).values(),{...cases.find(c=>c.kind==='handoffs'),path:cases[0].path}];
   for(const screen of screens){
    const {path,kind}=screen;
    if(kind==='reports')await runtime.time(Date.parse(to));
    await page.goto(path);await page.locator('main').waitFor();
    if(kind==='reports'){
     await page.getByText('Response numbers',{exact:true}).click();
     await page.getByLabel('Time zone',{exact:true}).selectOption('UTC');
     await page.getByLabel('Period',{exact:true}).selectOption('custom');
     await page.getByLabel('From date',{exact:true}).fill(from.slice(0,10));
     const ready=page.waitForResponse(r=>r.url().includes('/api/reports/response?')&&new URL(r.url()).searchParams.get('from')===from&&new URL(r.url()).searchParams.get('to')===to);
     await page.getByLabel('Until date (excluded)',{exact:true}).fill(to.slice(0,10));
     const response=await ready;
     await page.locator('.review-snapshot').getByText(report.cohort.count+' incidents',{exact:true}).waitFor();
     if(width===1440)assert.deepEqual(await response.json(),report,'Rendered report consumes the exact same month and observation');
    }else if(kind==='review-material'){
     await captureReviewMaterial(page,screen,person,width);
    }else if(kind==='handoffs'){
     await openIncidentAction(page,'Handoff draft');
     await page.getByRole('article',{name:'Saved handoff copy',exact:true}).waitFor();
     await page.getByText(screen.expected.payload.summary,{exact:true}).waitFor();
    }else if(kind==='services'){
     await page.getByRole('heading',{name:screen.expected.name,exact:true,level:2}).waitFor();
     const changes=page.locator('details.recent-changes'),expected=cases.find(c=>c.kind==='service-changes').expected;
     const loaded=page.waitForResponse(r=>r.url().includes('/api/changes/recent?')&&r.status()===200);
     await changes.locator('summary').first().click();
     const response=await loaded;
     await changes.getByText(expected.items[0].summary,{exact:true}).waitFor();
     if(width===1440){
      assert.deepEqual(await response.json(),expected,'Recent changes renders the same protected native response and fixed 24-hour window');
      assert.deepEqual(await changes.locator('.change-list > li > strong').allTextContents(),expected.items.map(row=>row.summary),'The native view retains root and direct-dependency order');
      for(const item of expected.items){
       const row=changes.locator('.change-list > li').filter({has:page.getByText(item.summary,{exact:true})});
       assert.ok((await row.innerText()).includes(item.author));
       if(item.dependency)await row.getByText('Dependency · '+item.serviceName,{exact:true}).waitFor();
       if(Object.keys(item.details).length){
        await row.getByText('Retained context',{exact:true}).click();
        for(const value of Object.values(item.details))await row.getByText(value,{exact:true}).waitFor();
       }
      }
     }

    }else if(kind==='incidents')await page.getByRole('heading',{name:screen.expected.title,exact:true,level:1}).waitFor();
    else if(kind==='schedules')await page.getByRole('heading',{name:screen.expected.name,exact:true,level:1}).waitFor();
    else if(kind==='alerts')await page.getByRole('article',{name:'Alert details',exact:true}).waitFor();
    if(width===1440){
     assert.equal(new URL(page.url()).pathname,path,'The active native role can open the corresponding screen');
     const current=await page.evaluate(async()=>{const r=await fetch('/api/workspace');return (await r.json()).member;});
     assert.equal(current.id,person.member.id);assert.equal(current.role,person.member.role);
    }
    const name=`parity-${mode}-${person.member.role}-${kind}-${width}.png`;
    await page.screenshot({path:(process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser')+'/'+name,fullPage:true});
    receipt.screens.push({role:person.member.role,mode,path,kind,width,file:name});
    console.log(`Browser proof ${mode} ${person.member.role} ${kind} ${width}: actual native view captured`);
    if(kind==='reports')await runtime.time(observed);
   }
  }
 }finally{await context.close()}
}

async function captureReviewMaterial(page,screen,person,width){
 const material=screen.expected,dialog=page.getByRole('dialog',{name:material.title,exact:true});
 await dialog.waitFor();
 const body=dialog.locator('.review-material-body');
 for(const detail of await body.locator('details').all())if(!await detail.evaluate(node=>node.open))await detail.locator('summary').click();
 await body.getByText(material.notice,{exact:true}).waitFor();
 await dialog.locator('.review-meta').filter({hasText:'Accepted by'}).first().waitFor();
 if(width===1440){
  const response=await page.evaluate(async path=>(await fetch(path)).json(),screen.nativeDoor);
  assert.deepEqual(response,material,'Review screen uses the same protected native material at fixed time and revisions');
  assert.equal(await dialog.getByLabel('Review',{exact:true}).inputValue(),material.review);
  assert.equal(await dialog.getByLabel('Root cause',{exact:true}).inputValue(),material.accepted.rootCause);
  assert.equal(await dialog.getByLabel('Impact',{exact:true}).inputValue(),material.accepted.impact);
  for(const label of ['Review','Root cause','Impact'])assert.equal(await dialog.getByLabel(label,{exact:true}).evaluate(node=>node.readOnly),person.member.role==='viewer');
  assert.equal(await dialog.getByRole('button',{name:'Accept review',exact:true}).count(),person.member.role==='admin'?1:0);
  for(const observation of material.observations)await body.getByText(observation.title,{exact:true}).waitFor();
  for(const assertion of material.assertions)if(assertion.kind==='note')await body.getByText(assertion.text,{exact:true}).waitFor();
  for(const change of material.changes)await body.getByText(change.summary,{exact:true}).waitFor();
  const followups=body.locator('details').last();
  const rows=await followups.locator('li').allTextContents();
  assert.equal(rows.length,material.followups.length);
  for(const [index,action] of material.followups.entries())assert.ok(rows[index].includes(action.title));
  assert.deepEqual(await followups.getByRole('link',{name:'Evidence',exact:false}).evaluateAll(nodes=>nodes.map(node=>node.href)),material.followups.filter(row=>row.evidence).map(row=>row.evidence));
  for(const missing of material.missing)await body.getByText(missing,{exact:true}).waitFor();
  assert.equal(await body.locator('details:not([open])').count(),0);
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await resourceParity({browserProof:process.argv.includes('--browser')});
