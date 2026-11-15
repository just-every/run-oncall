import assert from 'node:assert/strict';

// Extend the existing import journey through its persisted, erased journal.
export async function readableErasure(page,context,receipt,{reload=false}={}) {
 const origin=new URL(page.url()).origin;
 const jobs=await (await context.request.get(origin+'/api/move-in/jobs?vendor=opsgenie')).json();
 const erased=jobs.find(job=>job.files?.some(file=>file.startsWith('erased-artifact:')));
 assert.ok(erased,'erasure retains internal artifact custody');
 if(reload)await page.reload();
 await page.getByLabel('Source',{exact:true}).selectOption('file');await page.getByLabel('File source',{exact:true}).selectOption('opsgenie');
 if(jobs.length>1){const selector=page.getByLabel('Saved import journal',{exact:true});await selector.waitFor();await selector.selectOption(erased.id);}
 else if(await page.getByRole('heading',{name:'Import journal',exact:true}).count()===0)await page.getByRole('button',{name:'Open saved import',exact:true}).click();
 await page.getByRole('heading',{name:'Import journal',exact:true}).waitFor();
 const text=await page.locator('.move-in-workspace').innerText();
 assert.doesNotMatch(text,/erased-artifact:|\b[a-f0-9]{64}\b|\b[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\b/i,'erasure renders labels instead of internal hashes or UUIDs');
 assert.ok(!text.includes(receipt.receiptId),'the full erasure receipt stays internal');
 if(!reload){
  const confirmation=page.getByRole('status').filter({hasText:/Imported person erased/});
  assert.ok((await confirmation.innerText()).includes(receipt.receiptId.slice(0,8).toUpperCase()),'the confirmation includes a short receipt reference');
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
