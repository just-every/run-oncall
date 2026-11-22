import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {localWorker} from './worker.mjs';

async function hostedMailFixture() {
 const origin='https://synthetic-oncall-mail.example.test', owner='owner@example.test';
 const worker=await localWorker({AUTH_LOCAL:'false',AUTH_ORIGIN:origin,OWNER_EMAIL:owner,MAIL_PROVIDER:'sendgrid',
  MAIL_API_KEY:'synthetic-example-mail-credential',MAIL_FROM:'oncall@example.test'}, {requestOrigin:origin,fetchSource:`
  let providerMode='normal',providerCalls=[],pkceChallenge='',pkceValid=true,revoked=false;
  globalThis.fetch=async (input,init)=>{
   const request=new Request(input,init);
   if(request.url!=='https://api.sendgrid.com/v3/mail/send'||request.method!=='POST')throw Error('Unexpected outbound request');
   const mail=await request.json();
   providerCalls.push(mail.content.find(part=>part.type==='text/plain').value.split('\\n').at(-1));
   return new Response(null,{status:202});
  };`});
 const request=(path,data,cookie)=>worker.request(path,data,cookie,{origin,'CF-Connecting-IP':'192.0.2.10'});
 const receivedLink=async()=>{
  const {value:{calls}}=await request('/__provider_calls');
  assert.equal(calls.length,1,'one message reached the SendGrid test edge');
  const link=new URL(calls[0]);
  assert.ok(link.origin===origin&&link.pathname==='/auth/confirm','received link opens the installation’s confirmation door');
  return link;
 };
 const bootstrap=()=>request('/auth/bootstrap',{token:worker.vars.SETUP_TOKEN,displayName:'Alex Morgan'});
 const mailRow=report=>report.installation.items.find(item=>item.id==='mail');
 return {worker,owner,request,receivedLink,bootstrap,mailRow};
}

export async function readinessMail() {
 const {worker,owner,request,receivedLink,bootstrap,mailRow}=await hostedMailFixture();
 try {
  const initial=await bootstrap();
  assert.equal(initial.status,303);
  assert.equal((await request('/api/workspace',undefined,initial.cookie)).value.member?.role,'admin');
  const read=async cookie=>{
   const reply=await request('/api/readiness',undefined,cookie);
   assert.equal(reply.status,200);
   assert.equal(reply.value.pagerCoverage.paging,'off');
   return mailRow(reply.value);
  };
  const before=await read(initial.cookie);
  assert.equal(before.completion,'not-done');
  assert.equal((await request('/auth/magic-link',{email:owner})).status,202);
  const link=await receivedLink();
  assert.equal((await request(link.pathname+link.search)).status,200);
  assert.equal((await request('/auth/confirm',{token:randomBytes(32).toString('base64url')})).status,400);
  assert.deepEqual(await read(initial.cookie),before,'provider acceptance, link preview and a refused confirmation leave the checklist pending');
  const confirmed=await request('/auth/confirm',{token:link.searchParams.get('token')});
  assert.equal(confirmed.status,303);
  const observed=await read(confirmed.cookie);
  assert.equal(observed.completion,'confirmed');
  assert.ok(Number.isFinite(Date.parse(observed.signInConfirmedAt)));
  assert.equal((await request('/auth/signout',{},confirmed.cookie)).status,204);
  assert.deepEqual(await read(initial.cookie),observed,'the confirmation remains visible after signing out');
  console.log('PASS hosted mail readiness: SendGrid edge acceptance, preview and refused confirmation leave mail pending; successful email sign-in is dated and survives sign-out; paging OFF');
 } finally {await worker.close();}
}
