import assert from 'node:assert/strict';
import {createSign,randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {automationRuntime} from './worker.mjs';

// One synthetic public-door journey. The real regional AWS hostname is routed
// only by Miniflare's network edge; application trust has no test-host override.
export async function snsJourney() {
 const scratch=await mkdtemp(join(tmpdir(),'oncall-sns-'));
 let w,browser;
 try {
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(scratch,'private.pem'),'-out',join(scratch,'cert.pem'),'-subj','/CN=synthetic-oncall-sns','-days','2'],{stdio:'ignore'});
  const privateKey=await readFile(join(scratch,'private.pem'),'utf8'),certificate=await readFile(join(scratch,'cert.pem'),'utf8');
  const host='sns.us-east-1.amazonaws.com',topic='arn:aws:sns:us-east-1:123456789012:synthetic-oncall-1',account='123456789012',region='us-east-1';
  let edgeMode='normal';
  w=await automationRuntime(request=>{
   const url=new URL(request.url);
   assert.equal(url.hostname,host,'only the regional AWS edge may be contacted');
   if(edgeMode==='redirect')return new Response('',{status:302,headers:{location:'http://169.254.169.254/latest/meta-data/'}});
   if(edgeMode==='large')return new Response('x'.repeat(65537));
   if(edgeMode==='slow')return new Promise(resolve=>setTimeout(()=>resolve(new Response(certificate)),6000));
   if(url.pathname==='/SimpleNotificationService-synthetic.pem')return new Response(certificate);
   if(url.pathname==='/'&&url.searchParams.get('Action')==='ConfirmSubscription')return new Response('<ConfirmSubscriptionResponse/>');
   throw Error('Unexpected provider request');
  });
  const ok=(response,status=200)=>{assert.equal(response.status,status,JSON.stringify(response.value));return response.value;};
  const setup=await w.request('/api/setup',{name:'Synthetic SNS operator',password:'synthetic-oncall-sns-password'}),cookie=setup.cookie;
  ok(setup);const req=(path,data)=>w.request(path,data,cookie),actor=ok(await req('/api/session')).member;
  ok(await req('/api/command',{type:'service',id:'synthetic-oncall-sns',name:'Synthetic CloudWatch service',environment:'production',owner:actor.id,runbook:[],pager:''}));
  ok(await req('/api/command',{type:'policy',service:'synthetic-oncall-sns',severity:'*',action:'route',owner:actor.id,reason:'Synthetic coverage'}));
  let key=randomBytes(32).toString('hex');
  const configuration={id:'synthetic-oncall-sns',name:'Synthetic AWS topic',provider:'sns',scope:['synthetic-oncall-sns'],owner:actor.id,key,revision:0,rules:[],catchAll:'synthetic-oncall-sns',sns:{account,region,topic}};
  ok(await req('/api/routing/keys',configuration),201);
  const path=()=>'/api/sns/synthetic-oncall-sns/'+key;
  const send=async message=>{const response=await fetch(w.origin+path(),{method:'POST',headers:{'content-type':'text/plain'},body:typeof message==='string'?message:JSON.stringify(message)});return {status:response.status,value:await response.json()};};
  const now=Date.now();
  function signed(Type,overrides={}) {
   const Token='synthetic-oncall-token',SubscribeURL='https://'+host+'/?'+new URLSearchParams({Action:'ConfirmSubscription',TopicArn:topic,Token});
   const message={Type,MessageId:'synthetic-oncall-'+randomBytes(8).toString('hex'),TopicArn:topic,Timestamp:new Date().toISOString(),Message:Type==='Notification'?'{}':'Synthetic subscription confirmation',SignatureVersion:'2',SigningCertURL:'https://'+host+'/SimpleNotificationService-synthetic.pem',...(Type==='Notification'?{}:{SubscribeURL,Token}),...overrides};
   const fields=Type==='Notification'?['Message','MessageId',...(message.Subject!==undefined?['Subject']:[]),'Timestamp','TopicArn','Type']:['Message','MessageId','SubscribeURL','Timestamp','Token','TopicArn','Type'];
   message.Signature=createSign(message.SignatureVersion==='1'?'RSA-SHA1':'RSA-SHA256').update(fields.map(name=>name+'\n'+message[name]+'\n').join('')).sign(privateKey,'base64');
   return message;
  }
  const alarm=(state,offset=0,overrides={},envelope={})=>signed('Notification',{Message:JSON.stringify({AlarmName:'synthetic-oncall-cpu',AlarmDescription:'Synthetic CPU saturation',AlarmArn:'arn:aws:cloudwatch:us-east-1:'+account+':alarm:synthetic-oncall-cpu',NewStateValue:state,NewStateReason:'Synthetic threshold transition',StateChangeTime:new Date(now+offset).toISOString(),Region:'US East (N. Virginia)',AWSAccountId:account,Trigger:{Dimensions:[{name:'InstanceId',value:'synthetic-oncall-1'}]},...overrides}),...envelope});
  const snap=async()=>{const state=ok(await req('/api/state'));return {sources:state.intakeSources,receipts:state.intakeReceipts,alerts:state.alerts,events:state.events,audit:state.audit};};
  const subscribe=signed('SubscriptionConfirmation');ok(await send(subscribe),202);
  assert.equal((await snap()).sources[0].sns.status,'confirmed');
  assert.equal((await w.outboundRequests()).filter(r=>new URL(r.url).searchParams.get('Action')==='ConfirmSubscription').length,1);
  const trigger=alarm('ALARM',0,{}, {Subject:'Synthetic alarm',SignatureVersion:'1'});ok(await send(trigger),202);
  let state=await snap(),alert=state.alerts[0];assert.equal(alert.state,'active');assert.equal(state.receipts.at(-1).outcome,'opened');
  const details=state.receipts.at(-1).details;
  assert.equal(details.AlarmName,'synthetic-oncall-cpu');assert.equal(details.AWSAccountId,account);assert.equal(details.region,region);assert.deepEqual(details.Trigger.Dimensions,[{name:'InstanceId',value:'synthetic-oncall-1'}]);
  const afterTrigger=await snap();assert.equal(ok(await send(trigger)).duplicate,true);assert.deepEqual(await snap(),afterTrigger);
  ok(await send(alarm('INSUFFICIENT_DATA',1000)),202);assert.equal((await snap()).alerts[0].state,'active');assert.equal((await snap()).receipts.at(-1).action,'note');
  ok(await send(alarm('OK',2000)),202);assert.equal((await snap()).alerts[0].state,'recovered');
  ok(await send(alarm('ALARM',500)),202);assert.equal((await snap()).alerts[0].state,'recovered');assert.equal((await snap()).receipts.at(-1).details.reordered,true);
  ok(await send(alarm('INSUFFICIENT_DATA',3000)),202);assert.equal((await snap()).alerts[0].state,'recovered');
  ok(await send(alarm('ALARM',4000)),202);assert.equal((await snap()).alerts.filter(a=>a.state==='active').length,1);
  ok(await send(alarm('OK',2500)),202);assert.equal((await snap()).alerts.filter(a=>a.state==='active').length,1);
  const beforeInvalid=await snap(),beforeCalls=(await w.outboundRequests()).length;
  // URL/identity refusals happen before even the certificate request.
  for(const [message,status] of [
   [signed('Notification',{SigningCertURL:'https://hostile.example.test/cert.pem'}),400],
   [signed('Notification',{SigningCertURL:'http://'+host+'/SimpleNotificationService-synthetic.pem'}),400],
   [signed('SubscriptionConfirmation',{SubscribeURL:'http://169.254.169.254/latest/meta-data/'}),400],
   [signed('SubscriptionConfirmation',{SubscribeURL:'https://'+host+'@hostile.example.test/'}),400],
   [signed('SubscriptionConfirmation',{SubscribeURL:'https://'+host+':443/'}),400],
   [signed('SubscriptionConfirmation',{TopicArn:topic.replace(account,'999999999999')}),403],
   [alarm('ALARM',5000,{}, {Timestamp:new Date(now-86400001).toISOString()}),403],
  ]) {ok(await send(message),status);assert.deepEqual(await snap(),beforeInvalid);}
  assert.equal((await w.outboundRequests()).length,beforeCalls);
  const forged=alarm('ALARM',5000);forged.Signature=Buffer.alloc(256).toString('base64');ok(await send(forged),403);assert.deepEqual(await snap(),beforeInvalid);
  ok(await send(alarm('ALARM',5000,{AWSAccountId:'999999999999'})),403);assert.deepEqual(await snap(),beforeInvalid);
  ok(await send(' '.repeat(2*1024*1024+1)),413);assert.deepEqual(await snap(),beforeInvalid);
  for(const mode of ['redirect','large','slow']) {edgeMode=mode;ok(await send(signed('SubscriptionConfirmation')),502);assert.deepEqual(await snap(),beforeInvalid);}edgeMode='normal';
  assert.ok((await w.outboundRequests()).every(r=>new URL(r.url).hostname===host));
  const unsubscribe=signed('UnsubscribeConfirmation');const calls=(await w.outboundRequests()).length;ok(await send(unsubscribe),202);assert.equal((await snap()).sources[0].sns.status,'unsubscribed');assert.equal((await w.outboundRequests()).length,calls+1,'unsubscribe fetches certificate only');
  // Rotation preserves the routed source and receipts, invalidates its endpoint,
  // and requires a new explicit SNS subscription to the replacement endpoint.
  const oldKey=key;key=randomBytes(32).toString('hex');
  let current=(await snap()).sources[0];ok(await req('/api/routing/keys',{...configuration,key,revision:current.revision}));assert.equal((await snap()).sources[0].sns.status,'awaiting confirmation');
  const newPath=path();key=oldKey;ok(await send(alarm('ALARM',6000)),401);key=newPath.split('/').at(-1);ok(await send(signed('SubscriptionConfirmation')),202);
  // Archive validation and restart preserve SNS context and replay custody.
  const archive=ok(await req('/api/archive'));assert.ok(!JSON.stringify(archive).includes(key));
  if(process.env.ONCALL_SNS_BROWSER==='1') {
   const {chromium}=await import('@playwright/test');
   browser=await chromium.launch({headless:true,executablePath:process.env.ONCALL_CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
   const context=await browser.newContext({baseURL:w.origin,viewport:{width:1440,height:1000}});
   await context.addCookies(cookie.split('; ').map(pair=>({name:pair.split('=')[0],value:pair.split('=').slice(1).join('='),url:w.origin})));
   const page=await context.newPage();await page.goto('/settings/routing');
   await page.getByRole('heading',{name:'Amazon SNS',exact:true}).waitFor();
   await page.getByRole('button',{name:'Show SNS endpoint'}).click();assert.ok((await page.getByLabel('SNS endpoint URL').inputValue()).endsWith('/'+key));
   const packet=process.env.ONCALL_SNS_PROOF_DIR;if(packet)await mkdir(packet,{recursive:true});
   // Never save the private endpoint in a screenshot. Hide its value first.
   await page.getByLabel('SNS endpoint URL').evaluate(input=>input.value='https://oncall.example.test/api/sns/synthetic-oncall-sns/[private credential]');
   for(const width of [1440,390]) {await page.setViewportSize({width,height:1000});if(packet)await page.screenshot({path:join(packet,`sns-status-${width}.png`),fullPage:true,mask:[page.getByLabel('SNS endpoint URL')]});}
   await page.getByText('Add routed key',{exact:true}).click();await page.getByLabel('Provider',{exact:true}).selectOption('sns');
   await page.getByLabel('Name',{exact:true}).fill('Synthetic second topic');await page.getByLabel('AWS account ID').fill(account);await page.getByLabel('Topic ARN').fill(topic);
   assert.equal(await page.getByLabel('AWS region').inputValue(),region);
   for(const width of [1440,390]) {await page.setViewportSize({width,height:1000});await page.getByLabel('AWS account ID').scrollIntoViewIfNeeded();if(packet)await page.screenshot({path:join(packet,`sns-create-${width}.png`),fullPage:true,mask:[page.getByLabel('SNS endpoint URL')]});}
   await page.getByRole('checkbox',{name:'Synthetic CloudWatch service',exact:true}).check();
   await page.getByRole('button',{name:'Create routed key',exact:true}).click();
   await page.getByRole('heading',{name:'Synthetic second topic',exact:true}).waitFor();
   assert.ok((await snap()).sources.some(s=>s.name==='Synthetic second topic'&&s.sns?.topic===topic));
   await context.close();await browser.close();browser=null;
  }
  await w.restart();assert.equal(ok(await send(trigger)).duplicate,true);
  current=(await snap()).sources[0];ok(await req('/api/intake/sources/synthetic-oncall-sns/revoke',{revision:current.revision}));
  const beforeRevokeCalls=(await w.outboundRequests()).length;ok(await send(alarm('ALARM',7000)),401);assert.equal((await w.outboundRequests()).length,beforeRevokeCalls);
  ok(await w.request('/api/routing/keys',{...configuration,id:'unauthenticated'}),401);
  console.log('PASS SNS public-door subscription, RSA-SHA1/SHA256 signatures, alarm mapping, unknown state, replay/reorder, unsafe URLs, bounded provider fetches, foreign account/topic, oversize, rotation/revocation and restart; synthetic AWS edge only.');
 } finally {await browser?.close();await w?.close();await rm(scratch,{recursive:true,force:true});}
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await snsJourney();
