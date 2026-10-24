import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
export async function triageBulkBrowser(page,context,width){
 const origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';await mkdir(directory,{recursive:true});
 const call=async(path,data,status=200)=>{const response=data===undefined?await context.request.get(origin+path):await context.request.post(origin+path,{headers:{origin},data});assert.equal(response.status(),status,path);return response.json();};
 const state=await call('/api/state'),service=state.services.find(s=>s.name==='Checkout'),prefix='Synthetic bulk '+width;
 const make=async title=>call('/api/command',{type:'declare',service:service.id,severity:'warning',title,summary:'Human response evidence'});
 let a=await make(prefix+' first'),b=await make(prefix+' second'),target=await make(prefix+' target');
 for(const i of [a,b])await call('/api/command',{type:'transition',incident:i.id,revision:i.revision,state:'acknowledged',summary:'Take responsibility'});
 await page.goto(origin+'/#incidents');await page.getByLabel('Search incidents',{exact:true}).fill(prefix);await page.getByText('3 matching incidents',{exact:true}).waitFor();
 const selectSources=async()=>{await page.getByLabel('Select '+a.title,{exact:true}).check();await page.getByLabel('Select '+b.title,{exact:true}).check();};
 await selectSources();let bulk=page.getByRole('region',{name:'Bulk incident actions',exact:true});await bulk.getByLabel('Bulk action',{exact:true}).selectOption('snooze');await bulk.getByLabel('Snooze minutes',{exact:true}).fill('15');await bulk.getByLabel('Bulk action reason',{exact:true}).fill('Wait for the dependency owner');await bulk.getByRole('button',{name:'Apply to 2 incidents',exact:true}).click();await page.getByText('2 changed; 0 refused',{exact:true}).waitFor();
 await bulk.getByRole('button',{name:'Clear selection',exact:true}).click();await selectSources();bulk=page.getByRole('region',{name:'Bulk incident actions',exact:true});await bulk.getByLabel('Bulk action',{exact:true}).selectOption('merge');await bulk.getByLabel('Merge target',{exact:true}).selectOption(target.id);await bulk.getByLabel('Bulk action reason',{exact:true}).fill('One response owns the common failure');await bulk.getByRole('button',{name:'Apply to 2 incidents',exact:true}).click();await page.getByText('2 changed; 0 refused',{exact:true}).waitFor();await bulk.getByText(/saved · revision/).first().waitFor();
 await bulk.screenshot({path:`${directory}/OC-060-merge-${width}.png`});await bulk.getByRole('button',{name:'Clear selection',exact:true}).click();
 const source='synthetic-oncall-'+(6600+width),key=randomBytes(32).toString('hex');await call('/api/sources',{id:source,key,scopes:[service.id]});
 for(let n=0;n<2;n++){
  const signal={source,eventId:'synthetic-oncall-'+(width*10+n),service:service.id,environment:service.environment,key:'synthetic-oncall-'+(width*10+n),generation:'synthetic-oncall-'+(width*10+n),intent:'trigger',severity:'warning',title:prefix+' alert '+n,observedAt:new Date().toISOString(),evidence:''};
  const response=await context.request.post(origin+'/api/ingress/'+source,{headers:{origin,authorization:'Bearer '+key},data:signal});assert.equal(response.status(),201);
 }
 await page.getByLabel('Triage items',{exact:true}).selectOption('alerts');await page.getByLabel('Search incidents',{exact:true}).fill(prefix+' alert');await page.getByText('2 matching alert-only items',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Select all 2 matching',exact:true}).click();bulk=page.getByRole('region',{name:'Bulk incident actions',exact:true});await bulk.getByLabel('Bulk action',{exact:true}).selectOption('resolve');await bulk.getByRole('button',{name:'Apply to 2 alert-only items',exact:true}).click();await page.getByText('2 changed; 0 refused',{exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const axe=await new AxeBuilder({page}).include('[aria-label="Bulk incident actions"]').withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
 await page.getByRole('region',{name:'Incident triage',exact:true}).screenshot({path:`${directory}/OC-060-alert-close-${width}.png`});
 await page.getByRole('link',{name:'Alerts & events',exact:true}).click();const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:prefix+' alert 0',exact:true})});await card.getByText(/Coordination: closed/).waitFor();await card.getByText('Coordination history',{exact:true}).click();await card.getByText(/stopped by human resolution/).waitFor();await card.screenshot({path:`${directory}/OC-060-alert-history-${width}.png`});
 const after=await call('/api/state');assert.equal(after.incidents.length,state.incidents.length+3,'alert-only close creates no incident');assert.ok(after.incidents.filter(i=>[a.id,b.id].includes(i.id)).every(i=>i.mergedInto.target===target.id));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.goto(origin+'/#incidents');
 console.log(`OC-060 browser ${width}: selected snooze, merge target and per-item receipts, confirmed alert-only close, retained human-resolution history, no fabricated incident, axe and overflow passed`);
}
