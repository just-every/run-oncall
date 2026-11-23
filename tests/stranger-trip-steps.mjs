import assert from 'node:assert/strict';

// Extend the existing import journey through its persisted, erased journal.
export async function readableErasure(page,context,receipt,{reload=false}={}) {
 const origin=new URL(page.url()).origin;
 const jobs=await (await context.request.get(origin+'/api/move-in/jobs?vendor=opsgenie')).json();
 const erased=jobs.find(job=>job.files?.some(file=>file.startsWith('erased-artifact:')));
 assert.ok(erased,'erasure retains internal artifact custody');
 if(reload)await page.reload();
 const journal=page.getByRole('status').filter({has:page.getByRole('heading',{name:'Import journal',exact:true})});
 await journal.waitFor();
 const selector=page.getByLabel('Saved import journal',{exact:true});
 if(await selector.count()){
  const other=(await selector.locator('option').evaluateAll(options=>options.map(option=>option.value))).find(id=>id!==erased.id);
  await selector.selectOption(other);
  await selector.selectOption(erased.id);
 }
 assert.equal(erased.checkUnavailable,'snapshot_withdrawn');
 assert.equal(await journal.getByRole('button',{name:/^Check /}).count(),0);
 const text=await page.locator('.move-in-workspace').innerText();
 assert.doesNotMatch(text,/erased-artifact:|\b[a-f0-9]{64}\b|\b[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\b/i,'erasure renders labels instead of internal hashes or UUIDs');
 assert.ok(!text.includes(receipt.receiptId),'the full erasure receipt stays internal');
 if(!reload){
  const confirmation=page.getByRole('status').filter({hasText:/Imported person erased/});
  assert.ok(!(await confirmation.innerText()).toUpperCase().includes(receipt.receiptId.slice(0,8).toUpperCase()),'the confirmation shows no receipt code');
 }
}

// Same public rota door: covered-only shifts explain the refusal; an uncovered
// shift remains requestable without changing stored cover or its validation.
export async function coveredSwap(page,context,session,substitute,directory,capture) {
 const origin=new URL(page.url()).origin,now=Math.floor(Date.now()/60000)*60000,day=86400000;
 const api=async(path,data)=>{const r=await context.request[data?'post':'get'](origin+path,{headers:{origin},...(data?{data}:{})});assert.equal(r.status(),200);return r.json();};
 const state=await api('/api/state'),start=new Date(now+day).toISOString(),end=new Date(now+2*day).toISOString();
 const rota=await api('/api/paging/schedules',{id:'synthetic-oncall-covered-swap',name:'Checkout relief',service:state.services[0].id,revision:0,timezone:'UTC',validFrom:start,validUntil:end,primary:{anchorLocal:start.slice(0,16),periodDays:1,members:[substitute.id],ambiguity:'earlier'},backup:{anchorLocal:start.slice(0,16),periodDays:1,members:[],ambiguity:'earlier'},overrides:[]});
 await page.goto(origin+'/on-call/'+rota.id);await page.getByRole('button',{name:'Cover a shift',exact:true}).click();
 let sheet=page.getByRole('dialog');await sheet.getByLabel('From',{exact:true}).fill(start.slice(0,16));await sheet.getByLabel('To',{exact:true}).fill(new Date(now+day+3600000).toISOString().slice(0,16));await sheet.getByRole('button',{name:'Review change',exact:true}).click();await sheet.getByRole('checkbox').check();await sheet.getByRole('button',{name:'Apply reviewed change',exact:true}).click();await sheet.waitFor({state:'detached'});
 await page.getByRole('button',{name:'Request a swap',exact:true}).click();sheet=page.getByRole('dialog');
 assert.equal(await sheet.getByRole('button',{name:'Request',exact:true}).count(),0,'a covered-only interval is not offered as requestable');
 assert.match(await sheet.innerText(),/cover/i);assert.match(await sheet.innerText(),/remove.*review.*apply/i,'the refusal explains how to change existing cover');
 await capture('swap-existing-cover');
 await sheet.getByRole('button',{name:'Close sheet',exact:true}).click();
 const saved=(await api('/api/paging/state')).schedules.find(row=>row.id===rota.id);
 const revised=await api('/api/paging/schedules',{...saved,id:rota.id+'-alternative',revision:0,primary:{...saved.primary,members:[session.member.id]}});
 await page.goto(origin+'/on-call/'+revised.id);await page.getByRole('button',{name:'Request a swap',exact:true}).click();sheet=page.getByRole('dialog');await sheet.getByLabel('Substitute',{exact:true}).selectOption(substitute.id);
 await sheet.getByRole('button',{name:'Request',exact:true}).click();await sheet.waitFor({state:'detached'});
 const swap=(await api('/api/schedule-coordination')).records.find(row=>row.kind==='swap'&&row.data.schedule===revised.id);
 assert.ok(swap,'an uncovered alternative produces a real swap request');
 assert.ok(Date.parse(swap.data.start)>=Date.parse(revised.overrides[0].end),'the offered shift starts after existing cover');
 assert.deepEqual((await api('/api/paging/state')).schedules.find(row=>row.id===revised.id).overrides,revised.overrides,'requesting a swap leaves cover untouched');
}

// Continue the saved rota journey on a fixed clock through the summary and the
// unchanged public preview/timeline resolver; no extra journey registration.
export async function nextCoverageBrowser(page,context,session,{setTime}) {
 const origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';
 const api=async(path,data,status=200)=>{const r=await context.request[data?'post':'get'](origin+path,{headers:{origin},...(data?{data}:{})});assert.equal(r.status(),status);return r.json();};
 const at=Date.parse('2026-11-16T01:19:00Z'),start='2026-11-01T00:00:00.000Z';
 const people=[];
 for(const name of ['London responder','New York responder','Los Angeles responder'])people.push(await api('/api/members',{name,role:'responder',password:'synthetic-oncall-35-coverage-password'},201));
 const service=await api('/api/command',{type:'service',id:'synthetic-oncall-35-coverage',name:'Receipt processing coverage',environment:'production',owner:session.member.id,runbook:[],pager:''});
 const rotation={anchorLocal:'2026-11-16T00:00',periodDays:1,members:[],ambiguity:'earlier'};
 const layers=['Europe/London','America/New_York','America/Los_Angeles'].map((timezone,index)=>({id:'synthetic-oncall-35-layer-'+index,name:people[index].name,role:'primary',timezone,kind:'business',rotation:{...rotation,members:[people[index].id]},start,end:null,weekdays:[1,2,3,4,5],startHour:9,endHour:17,holidayCalendars:[],holidayAction:'next',ptoAction:'next'}));
 let schedule=await api('/api/paging/schedules',{id:'synthetic-oncall-35-coverage',name:'Receipt follow the sun',service:service.id,revision:0,timezone:'UTC',validFrom:start,validUntil:null,primary:rotation,backup:rotation,layers,overrides:[]});
 const snapshot=await api('/api/paging/state');
 const revise=async draft=>{const input={schedule:draft,from:at,to:at+86400000},review=await api('/api/schedules/'+schedule.id+'/review',input);return (await api('/api/schedules/'+schedule.id+'/apply',{...input,digest:review.digest,confirmed:true})).schedule;};
 try{
  await setTime(at);await page.setViewportSize({width:1440,height:1000});
  const current=await api('/api/schedules/'+schedule.id+'/now-next'),preview=await api('/api/paging/preview',{scheduleId:schedule.id,from:at,to:at+86400000});
  assert.equal(current.now.primary,null);assert.equal(current.next.primary.primary,null,'the 05:00 layer boundary remains uncovered');
  assert.equal(current.now.windows[0].end,'2026-11-16T05:00:00.000Z');
  const first=preview.find(value=>value.primary);assert.equal(new Date(first.at).toISOString(),'2026-11-16T09:00:00.000Z');assert.equal(first.primary,people[0].id);
  assert.equal(current.upcoming.primary.at,first.at,'summary finds the same first covered interval as the unchanged timeline resolver');assert.equal(current.upcoming.primary.primary,first.primary);assert.equal(current.upcoming.backup,null,'empty backup never advertises a window');
  await page.goto(origin+'/on-call/'+schedule.id);
  const summary=page.locator('.scheduling-now-next'),primary=summary.locator('.scheduling-now-role').filter({has:page.getByRole('heading',{name:'primary',exact:true})}),backup=summary.locator('.scheduling-now-role').filter({has:page.getByRole('heading',{name:'backup',exact:true})});
  await primary.locator('.next').filter({hasText:people[0].name}).waitFor();
  assert.match(await primary.locator('.handoff').innerText(),/09:00/);assert.doesNotMatch(await primary.locator('.handoff').innerText(),/05:00/);
  assert.match(await backup.locator('.handoff').innerText(),/no coverage scheduled/i);assert.doesNotMatch(await backup.locator('.handoff').innerText(),/\d\d:\d\d/);
  assert.deepEqual(await api('/api/paging/state'),snapshot,'summary and preview do not change retained schedule data');
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await summary.screenshot({path:`${directory}/next-actual-coverage-${width}.png`});}
  await page.setViewportSize({width:1440,height:1000});
  // Half-open edges, an override, PTO, and a completely empty rota all use
  // the same actual coverage resolver; calendar boundaries remain internal.
  const before=await api('/api/schedules/'+schedule.id+'/now-next?at=2026-11-16T08:59:59Z'),edge=await api('/api/schedules/'+schedule.id+'/now-next?at=2026-11-16T09:00:00Z');assert.equal(before.now.primary,null);assert.equal(edge.now.primary,people[0].id);
  schedule=await revise({...schedule,pto:[{id:'synthetic-oncall-35-pto',member:people[0].id,start:'2026-11-16T00:00:00.000Z',end:'2026-11-17T00:00:00.000Z',reason:'Synthetic absence'}]});
  const absent=await api('/api/schedules/'+schedule.id+'/now-next');assert.equal(absent.upcoming.primary.primary,people[1].id);assert.equal(new Date(absent.upcoming.primary.at).toISOString(),'2026-11-16T14:00:00.000Z');
  schedule=await api('/api/schedules/'+schedule.id+'/overrides',{revision:schedule.revision,override:{id:'synthetic-oncall-35-cover',role:'primary',start:'2026-11-16T07:00:00.000Z',end:'2026-11-16T08:00:00.000Z',member:people[2].id}});
  const covered=await api('/api/schedules/'+schedule.id+'/now-next');assert.equal(covered.upcoming.primary.primary,people[2].id);assert.equal(new Date(covered.upcoming.primary.at).toISOString(),'2026-11-16T07:00:00.000Z');
  schedule=await revise({...schedule,layers:[],overrides:[]});
  const empty=await api('/api/schedules/'+schedule.id+'/now-next');assert.equal(empty.upcoming.primary,null);assert.equal(empty.upcoming.backup,null);
  await page.reload();await primary.getByText(/no coverage scheduled/i).waitFor();await backup.getByText(/no coverage scheduled/i).waitFor();
  console.log('PASS nextCoverageBrowser: fixed Monday 01:19 UTC, London/New York/Los Angeles business hours -> 05:00 remains uncovered, next actual cover is London 09:00; empty backup and empty rota have none; half-open start, PTO and override targets agree with preview; summary proof at 1440 and 390.');
 }finally{await setTime(null);await page.setViewportSize({width:1440,height:1000});}
}
