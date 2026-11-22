import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {localWorker} from './worker.mjs';

async function hostedMailFixture(persistTo, sessionSecret, senderName) {
 const origin='https://synthetic-oncall-mail.example.test', owner='owner@example.test';
 const address='oncall@example.test', sender=senderName+' <'+address+'>';
 const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const worker=await localWorker({AUTH_LOCAL:'false',AUTH_ORIGIN:origin,OWNER_EMAIL:owner,SESSION_SECRET:sessionSecret,MAIL_PROVIDER:'sendgrid',
  RER_DEPLOY_SOURCE:source,
  MAIL_API_KEY:'synthetic-example-mail-credential',MAIL_FROM:sender}, {persistTo,requestOrigin:origin,fetchSource:`
  let providerMode='normal',providerCalls=[],pkceChallenge='',pkceValid=true,revoked=false;
  globalThis.fetch=async (input,init)=>{
   const request=new Request(input,init);
   if(request.url!=='https://api.sendgrid.com/v3/mail/send'||request.method!=='POST')throw Error('Unexpected outbound request');
   const mail=await request.json();
   providerCalls.push({sender:mail.from,link:mail.content.find(part=>part.type==='text/plain').value.split('\\n').at(-1)});
   return new Response(null,{status:202});
  };`});
 const request=(path,data,cookie)=>worker.request(path,data,cookie,{origin,'CF-Connecting-IP':'192.0.2.10'});
 const receivedLink=async(index=0)=>{
  const {value:{calls}}=await request('/__provider_calls');
  assert.equal(calls.length,index+1,'one more message reached the SendGrid test edge');
  assert.deepEqual(calls[index].sender,{email:address,name:senderName});
  const link=new URL(calls[index].link);
  assert.ok(link.origin===origin&&link.pathname==='/auth/confirm','received link opens the installation’s confirmation door');
  return link;
 };
 const bootstrap=()=>request('/auth/bootstrap',{token:worker.vars.SETUP_TOKEN,displayName:'Alex Morgan'});
 const mailRow=report=>report.installation.items.find(item=>item.id==='mail');
 return {worker,owner,sender,request,receivedLink,bootstrap,mailRow};
}

export async function readinessMail() {
 const persist=await mkdtemp(join(tmpdir(),'oncall-readiness-mail-'));
 const secret=randomBytes(32).toString('hex');
 let fixture;
 try {
  fixture=await hostedMailFixture(persist,secret,'Northline Oncall');
  const initial=await fixture.bootstrap();
  assert.equal(initial.status,303);
  assert.equal((await fixture.request('/api/workspace',undefined,initial.cookie)).value.member?.role,'admin');
  const read=async cookie=>{
   const reply=await fixture.request('/api/readiness',undefined,cookie);
   assert.equal(reply.status,200);
   assert.equal(reply.value.pagerCoverage.paging,'off');
   return fixture.mailRow(reply.value);
  };
  const send=async(index=0)=>{
   assert.equal((await fixture.request('/auth/magic-link',{email:fixture.owner})).status,202);
   const link=await fixture.receivedLink(index);
   assert.equal((await fixture.request(link.pathname+link.search)).status,200);
   return link.searchParams.get('token');
  };
  const confirm=async token=>{
   const confirmed=await fixture.request('/auth/confirm',{token});
   assert.equal(confirmed.status,303);
   return confirmed.cookie;
  };
  const before=await read(initial.cookie);
  assert.equal(before.completion,'not-done');
  const token=await send();
  assert.equal((await fixture.request('/auth/confirm',{token:randomBytes(32).toString('base64url')})).status,400);
  assert.deepEqual(await read(initial.cookie),before,'provider acceptance, link preview and a refused confirmation leave the checklist pending');
  const confirmedCookie=await confirm(token);
  const health=await fixture.request('/health');
  assert.equal(health.status,200);
  assert.equal(health.value.deployment.sourceSha,fixture.worker.vars.RER_DEPLOY_SOURCE);
  const hosted=await fixture.request('/api/readiness',undefined,confirmedCookie);
  assert.equal(hosted.status,200);
  const {checks}=hosted.value.installation.items.find(item=>item.id==='hosting');
  assert.equal(checks.identity.state,'healthy');
  assert.equal(checks.owner.state,'signed-in');
  assert.equal(checks.removal.state,'not-done');
  const observed=await read(confirmedCookie);
  assert.equal(observed.completion,'confirmed');
  assert.ok(Number.isFinite(Date.parse(observed.signInConfirmedAt)));
  assert.equal(observed.signInConfirmedSender,fixture.sender);
  assert.equal((await fixture.request('/auth/signout',{},confirmedCookie)).status,204);
  assert.deepEqual(await read(initial.cookie),observed,'the confirmation remains visible after signing out');

  const oldToken=await send(1);
  await fixture.worker.close();
  fixture=await hostedMailFixture(persist,secret,'Checkout Oncall');
  const changed=await read(initial.cookie);
  assert.equal(changed.completion,'changed-since');
  assert.equal(changed.signInConfirmedAt,undefined);
  assert.equal(changed.signInConfirmedSender,undefined);
  assert.deepEqual(await read(await confirm(oldToken)),changed,'an old link can sign in without confirming the new sender');
  const freshToken=await send();
  assert.deepEqual(await read(initial.cookie),changed,'delivery and preview alone leave the new sender unconfirmed');
  const fresh=await read(await confirm(freshToken));
  assert.equal(fresh.completion,'confirmed');
  assert.equal(fresh.signInConfirmedSender,fixture.sender);
  assert.ok(Date.parse(fresh.signInConfirmedAt)>Date.parse(observed.signInConfirmedAt));
  console.log('PASS hosted SendGrid readiness: current sender confirmation survives sign-out; a display-name change requires a fresh link; the old pending link cannot confirm it; paging OFF');
 } finally {
  await fixture?.worker.close();
  await rm(persist,{recursive:true,force:true});
 }
}
