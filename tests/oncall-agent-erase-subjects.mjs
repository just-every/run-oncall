import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentRuntime} from './agent-door-runtime.mjs';
import {ownerDoor} from './worker.mjs';

/** Erasing one person must not redact another person's agent-door records. */
const runtime = await agentRuntime();
try {
 const {http,tool,adopt,db} = runtime;
 const json = async (path,input,status=200) => {const response=await http(path,input);assert.equal(response.status,status,path);return response.json()};
 const state = async () => json('/api/state');
 assert.equal((await adopt()).status,200);

 // Agent work that names one person by a value: saved approval, call outcome, audit row and event.
 const seeded = new Map();
 async function work(tag,value) {
  const decision = 'decision-' + tag;
  await db.prepare('INSERT INTO agent_door_calls(agent,key,digest,decision_id,created_at,state,outcome) VALUES(?,?,?,?,?,?,?)')
   .bind('subject-agent','key-'+tag,'digest-'+tag,decision,Date.now(),'done',JSON.stringify({note:'Paged '+value})).run();
  await db.prepare('INSERT INTO agent_door_audit(id,at,agent,classes,row) VALUES(?,?,?,?,?)')
   .bind(decision,new Date().toISOString(),'subject-agent','[]',JSON.stringify({door:'mcp',consent:'subject-consent',classes:[],tool:'oncall.notes.add',agent:{id:'subject-agent'},sponsor:{id:'native-owner'},outcome:'executed',note:'Paged '+value})).run();
  await db.prepare('INSERT INTO agent_door_approvals(id,state,saved,approvals,result) VALUES(?,?,?,?,?)')
   .bind('approval-'+tag,'executed',JSON.stringify({decision_id:'approval-decision-'+tag,summary:'Approve paging '+value}),'[]',JSON.stringify({text:'Paged '+value})).run();
  await db.prepare('INSERT INTO agent_door_events(id,uri,event) VALUES(?,?,?)')
   .bind('event-'+tag,'oncall://subjects/'+tag,JSON.stringify({id:'event-'+tag,type:'subjects.updated',uri:'oncall://subjects/'+tag,actor:{kind:'agent'},note:'Handed to '+value})).run();
  seeded.set(tag,{value});
 }
 const rows = async tag => JSON.stringify(await db.batch([
  db.prepare('SELECT * FROM agent_door_calls WHERE key=?').bind('key-'+tag),
  db.prepare('SELECT * FROM agent_door_audit WHERE id=?').bind('decision-'+tag),
  db.prepare('SELECT * FROM agent_door_approvals WHERE id=?').bind('approval-'+tag),
  db.prepare('SELECT * FROM agent_door_events WHERE id=?').bind('event-'+tag),
 ]).then(results=>results.map(result=>result.results)));
 const snapshot = async () => Object.fromEntries(await Promise.all([...seeded.keys()].map(async tag=>[tag,await rows(tag)])));
 const mentions = (text,value) => new RegExp('(?<![\\w.+-])'+value.replaceAll('.','\\.')+'(?![\\w+-])').test(text);

 // Native member erasure: the email alias is a text value of the erasure.
 const password = () => randomUUID() + randomUUID();
 const target = await json('/api/members',{name:'al@example.com',role:'responder',password:password()},201);
 await json('/api/members',{name:'sal@example.com',role:'responder',password:password()},201);
 await work('al','al@example.com');
 await work('sal','sal@example.com');
 await work('al-suffix','al@example.com+test');
 await work('al-sentence','Ask al@example.com.');
 const before = await snapshot();
 for (const tag of ['al','al-sentence']) assert.ok(mentions(before[tag],'al@example.com'),tag+' work names the person before erasure');
 const erased = await tool('oncall.privacy.erase',{kind:'member',id:target.id,workspaceRevision:(await state()).revision,confirmation:'erase '+target.id,identitiesReviewed:true,importedPeople:[],idempotency_key:randomUUID()});
 assert.equal(erased.result?.isError,false,JSON.stringify(erased.body));
 const after = await snapshot();
 for (const tag of ['al','al-sentence']) {
  assert.notEqual(after[tag],before[tag],tag+' agent records are erased');
  assert.ok(!mentions(after[tag],'al@example.com'),tag+' agent records no longer name the person');
 }
 for (const tag of ['sal','al-suffix']) assert.equal(after[tag],before[tag],tag+' agent records are byte-identical: another person is not erased');
 console.log('PROBE native member erasure of al@example.com redacts only its own agent records; sal@example.com and al@example.com+test records are byte-identical');

 // Imported-person erasure: the email and the vendor id are text values.
 const door = ownerDoor({request:async(path,input,cookie,headers)=>{
  const response=await runtime.request(runtime.origin+path,{method:input===undefined?'GET':'POST',headers:{Origin:runtime.origin,Cookie:cookie,'Content-Type':'application/json',...headers},...(input===undefined?{}:{body:JSON.stringify(input)})});
  return {status:response.status,value:await response.json()};
 }},runtime.cookie);
 const people = [{id:'pd-1',email:'ed@example.com',name:'Ed One'},{id:'pd-10',email:'ted@example.com',name:'Ted Ten'}];
 const plan = await door.preview('pagerduty',JSON.stringify({users:{users:people}}));
 assert.equal(plan.status,200,JSON.stringify(plan.value));
 const applied = await door.apply('pagerduty',plan.value);
 assert.equal(applied.status,200,JSON.stringify(applied.value));
 await work('ed','ed@example.com');
 await work('ted','ted@example.com');
 await work('ed-id','source pd-1');
 await work('ted-id','source pd-10');
 const importedBefore = await snapshot();
 const receipt = await json('/api/move-in/erase',{email:'ed@example.com',confirmation:'erase ed@example.com'});
 assert.ok(receipt);
 const importedAfter = await snapshot();
 for (const tag of ['ed','ed-id']) assert.notEqual(importedAfter[tag],importedBefore[tag],tag+' agent records are erased');
 for (const tag of ['ted','ted-id']) assert.equal(importedAfter[tag],importedBefore[tag],tag+' agent records are byte-identical: another imported person is not erased');
 for (const tag of ['sal','al-suffix']) assert.equal(importedAfter[tag],before[tag],tag+' stays byte-identical');
 console.log('PROBE imported-person erasure of ed@example.com and its vendor id pd-1 redacts only its own agent records; ted@example.com and pd-10 records are byte-identical');
} finally { await runtime.close(); }
