import assert from 'node:assert/strict';
import {localWorker} from './worker.mjs';

// MAIL_RECIPIENTS=owner on a hosted Worker: the sign-in page mails a link to the owner and nobody else.
// The real emitted Worker and D1 with the Business relay faked at the network edge.
const origin = 'https://synthetic-oncall-owner-mail.example.test', owner = 'owner@example.test';
const relayUrl = 'https://relay.example.test/api/managed-mail/send';
const relay = `
let providerMode='normal',providerCalls=[],pkceChallenge='',pkceValid=true,revoked=false;
globalThis.fetch=async (input,init)=>{
 const request=new Request(input,init);
 if(request.url!==${JSON.stringify(relayUrl)}||request.method!=='POST')throw Error('Unexpected outbound request');
 const mail=await request.json();
 providerCalls.push({to:[mail.to,...(mail.cc??[]),...(mail.bcc??[])],link:mail.text.split('\\n').at(-1)});
 if(providerMode==='timeout')return Response.json({error:'managed_mail_provider_timeout'},{status:504});
 if(providerMode==='refused')return Response.json({error:'managed_mail_refused'},{status:403});
 return Response.json({messageId:'<oncall-signin@relay.example.test>'},{status:202});
};`;
const w = await localWorker({AUTH_LOCAL: 'false', AUTH_ORIGIN: origin, OWNER_EMAIL: owner, MAIL_PROVIDER: 'rer', MAIL_RECIPIENTS: 'owner',
 MAIL_RELAY_URL: relayUrl, MAIL_API_KEY: 'synthetic-example-mail-credential', MAIL_FROM: 'Oncall <oncall@example.test>'}, {requestOrigin: origin, fetchSource: relay});
const edge = {origin, 'CF-Connecting-IP': '192.0.2.20'};
const request = (path, data, cookie) => w.request(path, data, cookie, edge);
// What the sign-in page's own form posts, before any script.
const ask = email => w.send('/auth/magic-link', new URLSearchParams({email}).toString(), {...edge, 'content-type': 'application/x-www-form-urlencoded'});
const calls = async () => (await request('/__provider_calls')).value.calls;
try {
 const bootstrap = await request('/auth/bootstrap', {token: w.vars.SETUP_TOKEN, displayName: 'Alex Morgan'});
 assert.equal(bootstrap.status, 303);
 // A second active account in the same installation must not get a link either.
 w.sql(`INSERT INTO oa_operators (id,email,display_name,role,status,version,created_at) VALUES ('synthetic-admin','admin@example.test','Sam Admin','admin','active',1,${Date.now()})`);
 const page = await w.send('/signin', undefined, edge, 'GET');
 assert.equal(page.status, 200);
 assert.match(page.value, /action="\/auth\/magic-link"/, 'the sign-in page offers the email link');

 const answers = [];
 for (const email of ['stranger@example.test', 'admin@example.test', 'OWNER@example.test']) {
  const answer = await ask(email);
  assert.equal(answer.status, 303, email);
  answers.push(answer.headers.get('location'));
 }
 assert.equal(new Set(answers).size, 1, 'owner, member and stranger get the same answer');
 const sent = await calls();
 assert.equal(sent.length, 1, 'exactly one message reached the provider');
 assert.deepEqual(sent[0].to, [owner], 'and it went to the owner alone');
 const link = new URL(sent[0].link);
 assert.equal(link.origin + link.pathname, origin + '/auth/confirm');
 const token = link.searchParams.get('token');

 const confirmed = await request('/auth/confirm', {token});
 assert.equal(confirmed.status, 303);
 const session = await request('/auth/session', undefined, confirmed.cookie);
 assert.equal(session.status, 200);
 assert.equal(session.value.operator.email, owner);
 assert.equal(session.value.operator.role, 'owner');
 assert.equal((await request('/auth/confirm', {token})).status, 400, 'the link works once');

 const invite = await request('/auth/invite', {email: 'new@example.test', role: 'member'}, confirmed.cookie);
 assert.equal(invite.status, 503, 'invitations stay unsent');
 assert.equal((await calls()).length, 1, 'nothing more reached the provider');
 // The relay answers 504 managed_mail_provider_timeout while the mail may still arrive: the outcome is unknown, so the link stays live.
 const control = mode => request('/__provider_control', {mode});
 await control('timeout');
 const unknown = await ask(owner);
 assert.equal(unknown.status, 303, 'an uncertain send is answered like a sent one');
 assert.equal(unknown.headers.get('location'), answers[0], 'with the same neutral answer');
 const [attempt, ...extra] = await calls();
 assert.equal(extra.length, 0, 'and is not resent at once');
 assert.deepEqual(attempt.to, [owner]);
 const kept = new URL(attempt.link).searchParams.get('token');
 const reopened = await request('/auth/confirm', {token: kept});
 assert.equal(reopened.status, 303, 'the link whose send timed out still signs the owner in');
 assert.equal((await request('/auth/confirm', {token: kept})).status, 400, 'once');
 // A definite refusal still kills the link.
 await control('refused');
 const refused = await ask(owner);
 assert.equal(refused.status, 303, 'a refusal is answered the same way');
 const dead = new URL((await calls())[0].link).searchParams.get('token');
 assert.equal((await request('/auth/confirm', {token: dead})).status, 400, 'a refused link is revoked');
 console.log('PASS owner-only sign-in mail: the owner gets one working single-use link; a member and a stranger get the same answer and no mail; invitations stay unsent; a relay 504 keeps the link live, a 4xx revokes it');
} finally {
 await w.close();
}
