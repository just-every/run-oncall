import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtemp,writeFile,symlink,rm,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire('/workspace/run-oncall/package.json');
const {chromium}=require('@playwright/test');
const {localWorker}=await import('/workspace/run-oncall/tests/worker.mjs');
const packet=process.env.HOME+'/rer-consolidation/work/main-oncall-recipes-toolchain-1-c1/packet';
const worker=await localWorker();let browser;
const receipt={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),pathTools:['sh','curl','openssl','date','od','tr','awk'],nodeOnPath:false,recipes:[]};
async function runRecipe(sample,key){
 const dir=await mkdtemp(join(tmpdir(),'oncall-recipe-proof-'));
 try{
  for(const name of ['sh','openssl','date','od','tr','awk'])await symlink(execFileSync('/usr/bin/which',[name],{encoding:'utf8'}).trim(),join(dir,name));
  const curl=execFileSync('/usr/bin/which',['curl'],{encoding:'utf8'}).trim();
  // Add transport receipt output to curl; send the displayed recipe's request unchanged.
  await writeFile(join(dir,'curl'),`#!/bin/sh\nexec '${curl}' --silent --show-error --write-out '\\n__HTTP_STATUS__%{http_code}\\n' "$@"\n`,{mode:0o700});
  await writeFile(join(dir,'send.sh'),sample);
  const {out,code}=await new Promise((resolve,reject)=>{const c=spawn('/bin/sh',['-eu','send.sh'],{cwd:dir,env:{PATH:dir,ONCALL_SOURCE_KEY:key,NO_PROXY:'127.0.0.1,localhost',no_proxy:'127.0.0.1,localhost'}});let out='';c.stdout.on('data',v=>out+=v);c.stderr.resume();c.on('error',reject);c.on('close',code=>resolve({out,code}));});
  assert.equal(code,0,'copied recipe exits successfully');
  const match=out.match(/\n__HTTP_STATUS__(\d{3})\s*$/);assert.ok(match);const status=Number(match[1]);assert.ok(status>=200&&status<300);
  const response=JSON.parse(out.slice(0,match.index));const id=response.id??response.dedup_key;assert.ok(id);return {status,response,id};
 }finally{await rm(dir,{recursive:true,force:true});}
}
try{
 const owner=await worker.request('/api/setup',{name:'Synthetic recipe proof owner',password:randomBytes(32).toString('hex')});assert.equal(owner.status,200);
 const api=async(path,body)=>{const r=await worker.request(path,body,owner.cookie);assert.ok(r.status>=200&&r.status<300,`${path}: ${r.status}`);return r.value;};
 const service='synthetic-oncall-1';await api('/api/command',{type:'service',id:service,name:'Synthetic recipe service',environment:'test',owner:owner.value.member.id,runbook:[],pager:''});
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},extraHTTPHeaders:{connection:'close'}});
 await context.addCookies(owner.headers.getSetCookie().map(line=>{const [name,...v]=line.split(';')[0].split('=');return {name,value:v.join('='),url:worker.origin,httpOnly:true,sameSite:'Lax'};}));
 const page=await context.newPage();
 const changes=[['native','bearer'],['native','signed'],['argocd','signed'],['terraform','signed'],['github','signed'],['gitlab','signed'],['pagerduty','bearer']];
 for(const [provider,mode] of changes){
  const id='synthetic-oncall-proof-'+provider+'-'+mode,key=provider==='gitlab'?'whsec_'+randomBytes(32).toString('base64'):randomBytes(32).toString('hex');
  await api('/api/changes/sources',{id,name:'Synthetic '+provider+' '+mode,provider,service,repository:['github','gitlab'].includes(provider)?'123':'',mode,revision:0,key});
  await page.goto(worker.origin+'/settings/integrations/'+encodeURIComponent('change:'+id));await page.getByText('Sample request',{exact:true}).click();
  const sample=await page.getByLabel('Sample request',{exact:true}).inputValue();assert.ok(!sample.includes(key));
  const result=await runRecipe(sample,key);const retained=(await api('/api/state')).changes.some(c=>c.id===result.id);assert.ok(retained);
  receipt.recipes.push({family:'changes',provider,mode,status:result.status,id:result.id,service:result.response.service,duplicate:result.response.duplicate,retained});
 }
 const source='synthetic-oncall-proof-events',key=randomBytes(32).toString('hex');await api('/api/sources',{id:source,key,mode:'signed',scopes:[service]});
 // Native legacy source detail is an ordinary public sample door.
 await page.goto(worker.origin+'/settings/integrations/'+encodeURIComponent('native:'+source));
 const sampleField=page.getByLabel('Sample request',{exact:true});
 await sampleField.waitFor({state:'attached'});
 const sample=await sampleField.inputValue();const result=await runRecipe(sample,key);
 receipt.recipes.push({family:'events',provider:'native',mode:'signed',status:result.status,id:result.id,service:result.response.service});
 assert.equal(receipt.recipes.length,8);receipt.passed=8;
 await mkdir(join(packet,'browser'),{recursive:true});
 for(const slug of ['getting-started','changes']){
  await page.goto(worker.origin+'/docs/'+slug);
  await page.getByRole('heading',{level:1}).waitFor();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'guide fits '+width);
   await page.screenshot({path:join(packet,'browser','guide-'+slug+'-'+width+'.png'),fullPage:true});
  }
 }
 receipt.guideBrowserProof={pages:['/docs/getting-started','/docs/changes'],widths:[1440,390],overflow:false};
 await writeFile(join(packet,'recipe-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}finally{await browser?.close();await worker.close();}
