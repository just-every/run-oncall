import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {expect} from '@playwright/test';

// A continuation of the existing Events source journey, not a new registration.
// Name presentation changes must leave sender commands and retained audit intact.
export async function readableNamesBrowser(page,context,{source,service,serviceName}) {
 const origin=new URL(page.url()).origin,directory=process.env.ONCALL_BROWSER_EVIDENCE??'evidence/browser';
 await mkdir(directory,{recursive:true});
 const request=async(path,data,status=200)=>{
  const response=data===undefined?await context.request.get(path):await context.request.post(path,{headers:{origin},data});
  assert.equal(response.status(),status,`Readable names ${path}`);return response.json();
 };
 const proof=async(name)=>{
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   await page.screenshot({path:`${directory}/readable-names-${name}-${width}.png`,fullPage:true,mask:[page.locator('.one-time-secret input')]});
  }
  await page.setViewportSize({width:1440,height:1000});
 };
 const secondService='synthetic-oncall-511',secondName='Harbour search';
 const member=(await request('/api/session')).member;
 await request('/api/command',{type:'service',id:secondService,name:secondName,environment:'production',owner:member.id,runbook:[],pager:''});
 await page.goto(origin+'/settings/routing');
 const create=page.locator('.routing-create');
 if(!await create.getByLabel('Name',{exact:true}).isVisible())await create.locator(':scope > summary').click();
 const keyName='Harbour monitoring router';
 await create.getByLabel('Name',{exact:true}).fill(keyName);
 await create.getByLabel('Provider',{exact:true}).selectOption('native');
 await create.getByRole('checkbox',{name:serviceName,exact:true}).check();
 await create.getByRole('checkbox',{name:secondName,exact:true}).check();
 const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/routing/keys'&&r.request().method()==='POST');
 await create.getByRole('button',{name:'Create routed key',exact:true}).click();
 const response=await pending;assert.equal(response.status(),201);const routed=await response.json();
 const privateKey=await create.getByLabel('Private key',{exact:true}).inputValue();
 const setup=create.getByRole('region',{name:'Sender setup for this key',exact:true});
 await expect(setup.getByRole('button',{name:'Copy sample request',exact:true})).toBeEnabled();
 const setupText=await setup.innerText();
 for(const name of [keyName,serviceName,secondName])assert.ok(setupText.includes(name),'sender setup names its key and all allowed services');
 for(const id of [routed.id,service,secondService])assert.ok(!setupText.includes(id),'default setup prose contains no internal identity');
 assert.equal(await setup.getByLabel('Key ID',{exact:true}).isVisible(),false,'raw key identity is deliberate details');
 const sample=await setup.getByLabel('Sample request',{exact:true}).inputValue();
 assert.ok(!sample.includes(privateKey),'copyable sample keeps the private credential out');
 const payload=JSON.parse(sample.match(/'({\n[\s\S]*\n})'/)[1].replaceAll("'\\''","'"));
 assert.equal(payload.source,'intake:'+routed.id);assert.equal(payload.service,service,'wire service identity is prefilled');
 await setup.getByRole('button',{name:'Copy sample request',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),sample);
 const sent=await new Promise((resolve,reject)=>{
  const child=spawn('bash',['-e','-o','pipefail','-c',sample],{env:{...process.env,ONCALL_SOURCE_KEY:privateKey}});let out='';
  child.stdout.on('data',data=>out+=data);child.stderr.resume();child.on('error',reject);child.on('close',code=>code===0?resolve(out):reject(Error('Copied routed sample failed: '+code)));
 });
 assert.ok(JSON.parse(sent).id,'the ready-to-copy sender still works');
 await proof('routed-created');
 await create.getByRole('button',{name:'Done',exact:true}).click();
 const retainedSetup=page.getByRole('region',{name:'Routing rules',exact:true}).getByRole('region',{name:'Sender setup for this key',exact:true});
 await retainedSetup.waitFor();
 for(const name of [keyName,serviceName,secondName])assert.ok((await retainedSetup.innerText()).includes(name),'reopened setup retains every display name');
 await retainedSetup.getByText('Key details',{exact:true}).click();assert.equal(await retainedSetup.getByLabel('Key ID',{exact:true}).inputValue(),routed.id,'advanced identity remains available');
 await retainedSetup.getByText('Key details',{exact:true}).click();
 // Both namespaces must resolve as whole references, without source:/intake: prefixes.
 for(const id of ['intake:'+routed.id,'source:'+source.source]){
  const state=await request('/api/state');await request('/api/intake/allowances',{id,requests:1,events:1,revision:state.revision});
 }
 const attempt=eventId=>context.request.post(source.url,{headers:{authorization:'Bearer '+source.key},data:{source:source.source,eventId,service,environment:'production',key:'synthetic-oncall-513',generation:'synthetic-oncall-514',intent:'trigger',severity:'warning',title:'Checkout capacity',observedAt:new Date().toISOString(),evidence:''}});
 // Establish this request window explicitly; earlier source samples may have
 // fallen out of it on a slower host. With allowance one, the next must refuse.
 const first=await attempt('synthetic-oncall-512');assert.ok([201,429].includes(first.status()));
 const refused=await attempt('synthetic-oncall-516');
 assert.equal(refused.status(),429,'a real allowance refusal is retained for the named source');
 const before=await request('/api/state');
 await page.goto(origin+'/settings/archive');await page.getByRole('heading',{name:'Configuration audit',exact:true}).waitFor();
 const audit=page.locator('.archive-audit'),text=await audit.innerText();
 for(const name of [source.name,keyName])assert.ok(text.includes(name),'default audit names the configured source and key');
 for(const id of [source.source,routed.id,service,secondService])assert.ok(!text.includes(id),'default audit contains no generated identity');
 assert.ok(!text.includes('source:')&&!text.includes('intake:'),'audit references read as names');
 assert.ok(before.audit.some(entry=>entry.kind==='key-allowance'&&entry.text.includes(source.source)),'retained native audit keeps the original identity');
 assert.deepEqual((await request('/api/state')).audit,before.audit,'reading names leaves raw audit unchanged');
 await proof('audit');
 const readiness=await request('/api/readiness');
 await page.goto(origin+'/settings/readiness');await page.locator('.readiness-release dd').first().waitFor();
 assert.equal(await page.locator('.readiness-release dd').first().innerText(),'Oncall '+readiness.release.version,'release label uses the actual build version');
 assert.ok(!(await page.locator('.readiness-release').innerText()).includes(readiness.release.package),'default release label omits the implementation package');
 const authority=page.locator('[data-readiness-signal="authority"]');
 for(const raw of Object.values(readiness.signals.find(signal=>signal.id==='authority').values).filter(value=>typeof value==='string'))assert.ok(!(await authority.innerText()).includes(raw),'readiness presents words instead of stored enum tokens');
 assert.deepEqual((await request('/api/readiness')).signals.find(signal=>signal.id==='authority').values,readiness.signals.find(signal=>signal.id==='authority').values,'reading readiness preserves raw health values');
 await proof('readiness');
 console.log('PASS readableNamesBrowser: native/routed setup and allowance/refusal audit use display names; copied sender accepted; raw audit unchanged; actual Oncall release version; desktop assertions, 1440/390 proof.');
}
