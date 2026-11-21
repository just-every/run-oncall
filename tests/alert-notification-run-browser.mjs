import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Part of the existing product browser registration; all data enters public HTTP doors.
export async function alertNotificationRunBrowser(page,context,{worker,setTime}) {
 const directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';
 await mkdir(directory,{recursive:true});
 const request=async(path,data,status=200)=>{
  const response=await context.request.fetch(path,{method:data===undefined?'GET':'POST',headers:{origin:worker.origin},...(data===undefined?{}:{data})});
  const value=await response.json();assert.equal(response.status(),status,`${path}: ${value.error??''}`);return value;
 };
 const actor=(await request('/api/session')).member,service='synthetic-oncall-alert-run',start=Date.now();
 const outboundBefore=(await worker.outboundRequests()).length;
 const primary=await request('/api/members',{name:'Synthetic primary responder',role:'responder',password:'synthetic-oncall-primary-password'},201);
 const backup=await request('/api/members',{name:'Synthetic backup responder',role:'responder',password:'synthetic-oncall-backup-password'},201);
 await request('/api/command',{type:'service',id:service,name:'Support queue',environment:'test',owner:actor.id,runbook:[],pager:''});
 const contacts=[{id:'email',type:'email',label:'Work inbox',address:'synthetic-primary@example.test',countryCode:null},{id:'sms',type:'sms',label:'Work mobile',address:'4155550123',countryCode:1}];
 // Deliberately save later first. The page must order the frozen run by due time.
 const rules=[{id:'later',contact:'sms',delayMinutes:2,urgency:'high'},{id:'first',contact:'email',delayMinutes:0,urgency:'high'}];
 await request('/api/members/'+primary.id+'/notification-rules',{revision:0,contacts,rules});
 await request('/api/members/'+backup.id+'/notification-rules',{revision:0,contacts:[{...contacts[0],address:'synthetic-backup@example.test'}],rules:[rules[1]]});
 const rotation=members=>({anchorLocal:'2026-01-01T00:00',periodDays:1,members,ambiguity:'earlier'});
 const schedule=await request('/api/paging/schedules',{id:service,name:'Support rota',service,revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:rotation([primary.id]),backup:rotation([backup.id]),overrides:[]});
 await request('/api/paging/policies',{service,scheduleId:schedule.id,revision:0,primaryWaitSeconds:300,backupWaitSeconds:180,retrySeconds:10,maxAttempts:1});
 const key=randomBytes(32).toString('hex');
 await request('/api/intake/sources',{id:service,name:'Synthetic support monitoring',provider:'pagerduty',service,key,revision:0},201);
 await setTime(start);
 const send=async(id,action='trigger')=>request('/v2/enqueue',{routing_key:key,event_action:action,dedup_key:id,...(action==='trigger'?{payload:{summary:'Synthetic support alert '+id,source:'synthetic-monitor',severity:'critical'}}:{})},202);
 const find=async id=>(await request('/api/state')).alerts.find(a=>a.key===id);
 const read=async alert=>(await request('/api/on-call/notifications?alert='+encodeURIComponent(alert.id))).runs[0];
 const open=async alert=>{await page.setViewportSize({width:1440,height:1000});await page.goto(worker.origin+'/alerts/'+encodeURIComponent(alert.id));await page.getByRole('region',{name:'Who this alert goes to'}).waitFor();return page.getByRole('region',{name:'Who this alert goes to'});};
 const proof=async label=>{
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' fits desktop');
  const findings=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact));
  assert.equal(findings.length,0,label+' has no serious/critical accessibility violations');
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${directory}/alert-run-${label}-${width}.png`,fullPage:true});}
  await page.setViewportSize({width:1440,height:1000});
 };
 try {
  await send('two-rules');const alert=await find('two-rules'),recorded=structuredClone(alert.onCall);
  let view=await read(alert);assert.equal(view.assignedTo.id,primary.id);assert.deepEqual(view.records.map(r=>r.rule.id),['first','later']);assert.deepEqual(view.records.map(r=>r.status),['due','waiting']);assert.deepEqual(view.records.map(r=>r.waitSeconds),[120,180]);
  const anonymous=await worker.request('/api/on-call/notifications?alert='+alert.id);assert.equal(anonymous.status,401);
  let section=await open(alert),rows=section.getByRole('listitem');
  await expect(section.getByText(primary.name,{exact:true})).toBeVisible();await expect(section.getByText(backup.name,{exact:true})).toBeVisible();
  await expect(rows).toHaveCount(view.records.length);
  for(const [index,record] of view.records.entries()){await expect(rows.nth(index)).toContainText(record.contact.address);await expect(rows.nth(index)).toContainText('Step '+record.step);}
  await expect(rows.nth(0)).toContainText('Due');await expect(rows.nth(1)).toContainText('Waiting');
  await proof('two-rules');
  // Changing today's settings never rewrites this alert's recorded recipients or rules.
  await request('/api/members/'+primary.id+'/notification-rules',{revision:1,contacts:[{...contacts[0],address:'synthetic-changed@example.test'}],rules:[]});
  assert.deepEqual((await find('two-rules')).onCall,recorded);
  section=await open(alert);await expect(section.getByRole('listitem').nth(0)).toContainText(contacts[0].address);
  await send('no-rule');const gap=await find('no-rule'),gapView=await read(gap);assert.equal(gapView.records[0].rule,null);
  section=await open(gap);await expect(section.getByRole('listitem')).toHaveCount(1);await expect(section.getByRole('link',{name:'Add one'})).toHaveAttribute('href','/settings/team');await proof('no-rule');
  // Acknowledge the alert through the protected triage door; the frozen run closes.
  const query=await request('/api/triage?'+new URLSearchParams({kind:'alerts',status:'open',q:'Synthetic support alert two-rules',limit:'100'}));
  const item=query.items.find(item=>item.id===alert.id);assert.ok(item);
  const result=await request('/api/triage/bulk',{operationId:'synthetic-oncall-alert-run-ack',action:'acknowledge',items:[{kind:item.kind,id:item.id,revision:item.revision}],confirmedCount:1,reason:'Responder takes ownership'});assert.ok(result.results[0].ok);
  view=await read(alert);assert.equal(view.status,'answered');assert.ok(view.records.every(r=>r.status==='answered'));
  section=await open(alert);await expect(section.getByRole('listitem').nth(1)).toContainText('Answered');await proof('answered');
  // A fresh run records the actual backup only when the primary wait expires.
  await request('/api/members/'+primary.id+'/notification-rules',{revision:2,contacts,rules});
  await send('backup-step');const second=await find('backup-step');
  await setTime(start+300000);assert.equal((await worker.send('/cdn-cgi/local/scheduled',undefined,{},'GET')).status,200);
  view=await read(second);assert.equal(view.step,2);assert.equal(view.records.find(r=>r.step===2).person.id,backup.id);
  section=await open(second);await expect(section.getByRole('listitem').last()).toContainText('synthetic-backup@example.test');await proof('backup-step');
  await send('backup-step','resolve');view=await read(second);assert.equal(view.status,'closed');assert.ok(view.records.every(r=>r.status==='closed'));
  section=await open(second);await expect(section.getByRole('listitem').last()).toContainText('Closed');
  // A policy-less service must not be described as a failed rule match.
  const plain='synthetic-oncall-without-run';await request('/api/command',{type:'service',id:plain,name:'Unscheduled support',environment:'test',owner:actor.id,runbook:[],pager:''});
  const plainKey=randomBytes(32).toString('hex');await request('/api/intake/sources',{id:plain,name:'Synthetic unscheduled monitoring',provider:'pagerduty',service:plain,key:plainKey,revision:0},201);
  await request('/v2/enqueue',{routing_key:plainKey,event_action:'trigger',dedup_key:'without-run',payload:{summary:'Synthetic unscheduled alert',source:'synthetic-monitor',severity:'critical'}},202);
  const without=await find('without-run');assert.equal(without.onCall,undefined);section=await open(without);await expect(section.getByRole('listitem')).toHaveCount(0);await expect(section.getByRole('link',{name:'Add one'})).toHaveCount(0);
  assert.equal((await request('/api/paging/state')).paging,'OFF');assert.equal((await worker.outboundRequests()).length-outboundBefore,0);
  const receipt={journey:'alertNotificationRunBrowser',assertionWidth:1440,proofWidths:[1440,390],cases:['two-rules-and-backup','ordered-snapshot','settings-change-preserves-run','no-matching-rule','acknowledged','actual-backup-step','source-recovered','no-recorded-run','anonymous-refused'],outboundRequests:0,paging:'OFF',seriousCriticalAccessibilityFindings:0};
  await writeFile(`${directory}/alert-run-receipt.json`,JSON.stringify(receipt,null,2)+'\n');
  console.log('PASS alertNotificationRunBrowser: recorded assignment and current backup, ordered rules and waits, frozen contacts, no rule, acknowledged/closed run, actual second step, no recorded run, protected read; paging OFF and zero outbound; assertions 1440, proof 1440/390');
 } finally {await setTime(null);}
}
