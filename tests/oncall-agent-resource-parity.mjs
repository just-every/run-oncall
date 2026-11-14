import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
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
 const evidence=process.env.ONCALL_BROWSER_EVIDENCE;
 const receipt={journey:'resourceParity',observationAt:new Date(observed).toISOString(),from,to,cases:[],screens:[]};
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
  const changeSource='synthetic-oncall-parity-change',changeKey='synthetic-oncall-parity-change-credential';
  await json(runtime.http,'/api/changes/sources',{id:changeSource,name:'Synthetic current deployment',provider:'native',service:'agent-service',repository:'',mode:'bearer',revision:0,key:changeKey},201);
  const changeResponse=await runtime.request(runtime.origin+'/api/changes/ingress/'+changeSource,{method:'POST',headers:{Origin:runtime.origin,'Content-Type':'application/json',Authorization:'Bearer '+changeKey},body:JSON.stringify({eventId:'synthetic-oncall-parity-deployment',summary:'Synthetic deployment at the observation time',timestamp:new Date(observed).toISOString(),author:'Synthetic release engineer',links:[]})});
  assert.equal(changeResponse.status,201);await changeResponse.body?.cancel();
  if(browserProof){
   const {chromium}=await import('@playwright/test');
   browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
   assert.ok(evidence,'Browser proof needs an explicit evidence directory');await mkdir(evidence,{recursive:true});
  }
  for(const [mode,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]]){
   assert.equal((await runtime.adopt(policy)).status,200);
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
    const alert=native.alerts.find(a=>a.id===fixture.emailAlert.id);
    assert.ok(alert?.events.length);
    const cases=[
     {kind:'incidents',id:fixture.own.id,expected:native.incidents.find(i=>i.id===fixture.own.id),path:'/incidents/'+fixture.own.id},
     {kind:'alerts',id:alert.id,expected:alert,path:'/alerts/'+alert.id},
     {kind:'services',id:'agent-service',expected:native.services.find(s=>s.id==='agent-service'),path:'/settings/services/agent-service'},
     {kind:'schedules',id:fixture.importedSchedule.id,expected:paging.schedules.find(s=>s.id===fixture.importedSchedule.id),path:'/on-call/'+fixture.importedSchedule.id},
     {kind:'handoffs',id:fixture.ownHandoff.id,expected:handoff.record,path:'/incidents/'+fixture.own.id},
     {kind:'changes',id:native.changes.find(c=>c.source===changeSource).id,expected:native.changes.find(c=>c.source===changeSource),path:'/settings/services/agent-service'},
     {kind:'reports',id:fixture.ownPeriod,expected:report,path:'/reviews'},
    ];
    const before=await agentReadSnapshot(runtime);
    for(const c of cases){
     assert.ok(c.expected,c.kind+' must have actual native records');
     const uri='oncall://'+c.kind+'/'+encodeURIComponent(c.id);
     const read=await runtime.completeResource(uri,{bearer,personHttp:p.http});
     assert.equal(read.content.uri,uri);assert.equal(read.content.mimeType,'application/json');
     assert.equal(read.content._meta['com.runeditrun/untrusted'],true);
     const sensitive=read.initial.decision.classes.some(row=>row.class==='sensitive');
     assert.equal(read.initial.decision.revision,runtime.context.revision);
     assert.equal(read.initial.decision.disposition,mode==='held'?(sensitive?'approval':'review'):'autonomous');
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
     receipt.cases.push({role:p.member.role,mode,template:c.kind,workspaceRevision:native.revision,schedulingRevision:paging.revision,disposition:read.initial.decision.disposition,fields:Object.keys(read.value).sort(),equal:true});
     console.log(`PROBE BASE-AGENT-003 2 ${mode} ${p.member.role} ${c.kind}: native protected record equals every resource field at workspace revision ${native.revision}; paging and permanent state-changing audit unchanged; zero outbound requests`);
    }
    const admission=await runtime.db.prepare('SELECT sponsor FROM agent_door_agents WHERE id=?').bind(p.agent).first();
    assert.equal(admission.sponsor,p.member.id,'Each distinct admitted agent has the corresponding native session sponsor');
    for(const period of ['2026-11','2026-12']){
     const refused=await runtime.mcp('resources/read',{uri:'oncall://reports/'+period},{},bearer);
     assert.equal(refused.body.error?.data?.code,'resource_unavailable');assert.equal(refused.result,undefined);
    }
    if(browser)await captureViews(browser,runtime,p,mode,cases,report,reportPath,receipt);
    assertAgentReadUnchanged(before,await agentReadSnapshot(runtime));
   }
  }
  assert.equal(receipt.cases.length,28);
  assert.deepEqual(await runtime.outboundRequests(),[]);
  if(evidence){await mkdir(evidence,{recursive:true});await writeFile(evidence+'/resource-parity.json',JSON.stringify(receipt,null,2)+'\n');}
  return receipt;
 }finally{try{await browser?.close()}finally{await runtime.close()}}
}

async function captureViews(browser,runtime,person,mode,cases,report,reportPath,receipt){
 const context=await browser.newContext({baseURL:runtime.origin,viewport:{width:1440,height:1000}});
 try{
  await context.addCookies(person.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:runtime.origin,httpOnly:true,sameSite:'Lax'}}));
  const page=await context.newPage();page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(observed);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   const screens=[...new Map(cases.filter(c=>!['handoffs','changes'].includes(c.kind)).map(c=>[c.path,c])).values(),{...cases.find(c=>c.kind==='handoffs'),path:cases[0].path}];
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
    }else if(kind==='handoffs'){
     await openIncidentAction(page,'Handoff draft');
     await page.getByRole('article',{name:'Saved handoff copy',exact:true}).waitFor();
     await page.getByText(screen.expected.payload.summary,{exact:true}).waitFor();
    }else if(kind==='services'){
     await page.getByRole('heading',{name:screen.expected.name,exact:true}).waitFor();
     const changes=page.locator('details.recent-changes');
     if(await changes.count()){
      await changes.locator('summary').click();
      await changes.getByText(cases.find(c=>c.kind==='changes').expected.summary,{exact:true}).waitFor();
     }
    }else if(kind==='incidents')await page.getByRole('heading',{name:screen.expected.title,exact:true}).waitFor();
    else if(kind==='schedules')await page.getByRole('heading',{name:screen.expected.name,exact:true}).waitFor();
    else if(kind==='alerts')await page.getByRole('article',{name:'Alert details',exact:true}).waitFor();
    if(width===1440){
     assert.equal(new URL(page.url()).pathname,path,'The active native role can open the corresponding screen');
     const current=await page.evaluate(async()=>{const r=await fetch('/api/workspace');return (await r.json()).member;});
     assert.equal(current.id,person.member.id);assert.equal(current.role,person.member.role);
    }
    const name=`parity-${mode}-${person.member.role}-${kind}-${width}.png`;
    await page.screenshot({path:process.env.ONCALL_BROWSER_EVIDENCE+'/'+name,fullPage:true});
    receipt.screens.push({role:person.member.role,mode,path,kind,width,file:name});
    if(kind==='reports')await runtime.time(observed);
   }
  }
 }finally{await context.close()}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await resourceParity({browserProof:process.argv.includes('--browser')});
