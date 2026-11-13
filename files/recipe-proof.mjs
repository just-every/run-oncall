import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {writeFile,mkdir,mkdtemp,readFile,symlink,rm} from 'node:fs/promises';
import {localWorker} from '/workspace/run-oncall/tests/worker.mjs';
import {chromium} from '/workspace/run-oncall/node_modules/@playwright/test/index.mjs';
const phase=process.argv[2],root=process.env.HOME+'/rer-consolidation/work/main-oncall-recipes-toolchain-1/packet';
const after=phase==='after';
const w=await localWorker();
let browser;
const rows=[];
try {
 const owner=await w.request('/api/setup',{name:'Synthetic recipe operator',password:randomBytes(32).toString('hex')});
 assert.equal(owner.status,200);
 const req=async(path,data,status=200)=>{const r=await w.request(path,data,owner.cookie);assert.equal(r.status,status,JSON.stringify(r.value));return r.value;};
 const actor=(await req('/api/session')).member;
 const service='synthetic-oncall-recipes';
 await req('/api/command',{type:'service',id:service,name:"Payments O'Brien – 東京",environment:'production',owner:actor.id,runbook:[],pager:''});
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addCookies(owner.headers.getSetCookie().map(line=>{const pair=line.split(';')[0],at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:w.origin,httpOnly:true,sameSite:'Lax'};}));
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 const page=await context.newPage();
 const execute=async(sample,key,unset=false)=>{
  const dir=await mkdtemp('/tmp/oncall-sender-proof-');
  try {
   for(const name of ['date','openssl','od','tr','awk'])await symlink('/usr/bin/'+name,dir+'/'+name);
   await writeFile(dir+'/curl','#!/bin/sh\nexec /usr/bin/curl --dump-header '+dir+'/headers "$@"\n',{mode:0o700});
   const env={...process.env,PATH:dir};delete env.ONCALL_SOURCE_KEY;
   if(!unset)env.ONCALL_SOURCE_KEY=key;
   const result=await new Promise((resolve,reject)=>{
    const child=spawn('/bin/sh',['-c',sample],{env});let stdout='',stderr='';
    child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);child.on('error',reject);
    child.on('close',code=>resolve({code,stdout:stdout.replaceAll(key,'[synthetic key]'),stderr:stderr.replaceAll(key,'[synthetic key]')}));
   });
   try{result.httpStatus=Number((await readFile(dir+'/headers','utf8')).match(/HTTP\/[^ ]+ (\d+)/)[1]);}catch{}
   return result;
  }finally{await rm(dir,{recursive:true,force:true});}
 };
 const capture=async(label)=>{
  if(!after)return;
  for(const width of [1440,390]) {
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' fits '+width);
   await page.screenshot({path:root+'/'+label+'-'+width+'.png',fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
 };
 const sendExample=async(label,path,key)=>{
  await page.goto(w.origin+path);
  const textarea=page.getByLabel('Sample request',{exact:true});
  const detail=page.locator('details').filter({has:textarea});
  if(await detail.getAttribute('open')===null)await detail.locator('summary').click();
  await page.waitForTimeout(100);
  const sample=await textarea.inputValue();
  assert.ok(sample.includes(w.origin));
  assert.ok(!sample.includes(key));
  if(after){await page.getByRole('button',{name:'Copy sample request',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),sample);}
  let command=sample;
  if(!after && label.startsWith('change-')){const path='/tmp/oncall-before-send.mjs';await writeFile(path,sample);command='node '+path;}
  const result=await execute(command,key);
  if(after) {
   assert.equal(result.code,0,label+': '+result.stderr+result.stdout);
   const receipt=JSON.parse(result.stdout);
   assert.ok(receipt.id||receipt.dedup_key);
   const duplicate=await execute(sample,key);
   assert.equal(duplicate.code,0,label+' replay: '+duplicate.stderr+duplicate.stdout);
   const again=JSON.parse(duplicate.stdout);
   assert.equal(again.id||again.dedup_key,receipt.id||receipt.dedup_key);
   const missing=await execute(sample,key,true);
   assert.notEqual(missing.code,0,label+' refuses missing key');
   assert.ok(result.httpStatus>=200&&result.httpStatus<300);
   rows.push({label,exit:result.code,httpStatus:result.httpStatus,receipt,replayStatus:duplicate.httpStatus,duplicateSameRecord:true,missingKeyExit:missing.code});
  }else{assert.notEqual(result.code,0);rows.push({label,...result});}
  await capture(label);
 };
 const eventKey=randomBytes(32).toString('hex');
 await req('/api/sources',{id:'synthetic-oncall-hmac',key:eventKey,scopes:[service],mode:'signed'});
 await sendExample('events-hmac','/settings/integrations/native:synthetic-oncall-hmac',eventKey);
 const providers=after?['native-bearer','native-signed','github','gitlab','argocd','terraform','pagerduty']:['native-signed'];
 for(const variant of providers) {
  const provider=variant.split('-')[0],id='synthetic-oncall-'+variant;
  const key=provider==='gitlab'?'whsec_'+randomBytes(32).toString('base64'):randomBytes(32).toString('hex');
  await req('/api/changes/sources',{id,name:"Release O'Brien – 東京",service,provider,mode:variant==='native-signed'?'signed':'bearer',repository:['github','gitlab'].includes(provider)?"synthetic/recipe's-東京":'',key,revision:0},201);
  await sendExample('change-'+variant,'/settings/integrations/'+encodeURIComponent('change:'+id),key);
 }
 if(after){
  for(const slug of ['getting-started','changes']){await page.goto(w.origin+'/docs/'+slug);await page.locator('.docs-article').waitFor();await capture('guide-'+slug);}
  const state=await req('/api/state');
  assert.equal(state.changes.length,7,'seven source modes create seven changes after replay');
  assert.ok(state.changes.some(c=>c.kind==='argocd-sync'&&c.summary==='Service deployed'));
 }
 await writeFile(root+'/'+phase+'-recipes.json',JSON.stringify({phase,nodeOnSenderPath:false,senderPath:'isolated shell-tool bin; curl forwards unchanged request arguments and records response headers',rows},null,2)+'\n');
 console.log(JSON.stringify({phase,passed:rows.map(r=>({label:r.label,exit:r.exit??r.code})),nodeOnSenderPath:false}));
}finally{await browser?.close();await w.close();}
