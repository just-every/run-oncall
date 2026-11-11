import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {agentRuntime} from './agent-door-runtime.mjs';

/** Erasing a member retires them from the Business-signed roster; nobody else is touched. */
const runtime = await agentRuntime();
try {
 const {http,tool,adopt,db,settings} = runtime;
 const json = async (path,input,status=200) => {const response=await http(path,input);assert.equal(response.status,status,path);return response.json()};
 assert.equal((await adopt()).status,200);

 const roster = [];
 let revision = 2;
 // A Business teammate bound to a native member, as the owner's people-link does.
 async function teammate(label) {
  const member = await json('/api/members',{name:'Roster '+label,role:'responder',password:randomUUID()+randomUUID()},201);
  const entry = {id:randomUUID(),email:`roster-${label}@example.invalid`,name:member.name,role:'member',invite:1};
  roster.push(entry);
  await settings(roster,++revision);
  assert.equal((await http('/api/rer/people-link',{businessId:entry.id,memberId:member.id,revision})).status,303);
  return {...entry,member:member.id};
 }
 const erase = async person => {
  const state = await json('/api/state');
  const erased = await tool('oncall.privacy.erase',{kind:'member',id:person.member,workspaceRevision:state.revision,confirmation:'erase '+person.member,identitiesReviewed:true,importedPeople:[],idempotency_key:randomUUID()});
  assert.equal(erased.result?.isError,false,JSON.stringify(erased.body));
  return erased;
 };
 const team = async () => (await db.prepare('SELECT email,operator_id,invite,state,business_id,business_role FROM bs_team ORDER BY email').all()).results;
 const document = async () => (await db.prepare('SELECT document FROM bs_settings WHERE singleton=1').first()).document;
 const everywhere = async canaries => {
  const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all()).results.map(row=>row.name);
  const hits = [];
  for (const name of tables) {
   const text = JSON.stringify((await db.prepare(`SELECT * FROM "${name.replaceAll('"','""')}"`).all()).results);
   for (const canary of canaries) if (text.includes(canary)) hits.push(`${name}:${canary}`);
  }
  return hits;
 };
 const holds = (rows,person) => rows.some(row=>row.email===person.email||row.business_id===person.id||row.operator_id===person.member);

 const ada = await teammate('ada'), bo = await teammate('bo'), cy = await teammate('cy');
 assert.ok(holds(await team(),ada)&&holds(await team(),bo)&&holds(await team(),cy));
 const bobefore = (await team()).find(row=>row.email===bo.email);

 // (a) Erasing ada removes her from the stored roster and the signed document; the receipt carries no personal data.
 const receipt = await erase(ada);
 assert.ok(!JSON.stringify(receipt.body).includes(ada.email)&&!JSON.stringify(receipt.body).includes(ada.id));
 assert.ok(!holds(await team(),ada),'bs_team holds no trace of the erased person');
 const stored = JSON.parse(await document());
 assert.ok(!JSON.stringify(stored).includes(ada.email)&&!JSON.stringify(stored).includes(ada.id)&&!JSON.stringify(stored).includes(ada.name),'bs_settings.document holds no trace');
 assert.deepEqual(stored.team.map(member=>member.email).sort(),[bo.email,cy.email].sort());
 assert.deepEqual((await team()).find(row=>row.email===bo.email),bobefore,'another teammate keeps their row');
 assert.deepEqual(await everywhere([ada.email,ada.name]),[],'no table holds the erased teammate address or name');
 console.log('PROBE member erasure retires the teammate from bs_team and bs_settings.document; no table names their address or name; the receipt names no personal data');

 // (c) The Business lists her again in its next revision: she applies as retired and the others are unchanged.
 const relisted = await settings(roster,++revision);
 assert.deepEqual(relisted.retired,[ada.email]);
 assert.ok(!holds(await team(),ada)&&!JSON.stringify(JSON.parse(await document())).includes(ada.email));
 assert.deepEqual((await team()).find(row=>row.email===bo.email),bobefore);
 // A larger invite number is the Business's explicit new invitation; it is not retired.
 const reinvited = await settings(roster.map(entry=>entry===roster[0]?{...entry,invite:2}:entry),++revision);
 assert.equal(reinvited.retired,undefined);
 console.log('PROBE a re-listed erased teammate applies as retired; a larger invite number is the Business\'s own new invitation');

 // (b) A member an older release erased leaves the roster at the next revision: that release left the row and the
 // listing in place beside an erased member.
 await db.batch([
  db.prepare("UPDATE oc_members SET data=json_set(data,'$.name','Erased member','$.active',0,'$.erased',1) WHERE id=?").bind(cy.member),
  db.prepare('DELETE FROM credentials WHERE member=?').bind(cy.member),
 ]);
 assert.ok(holds(await team(),cy));
 const next = await settings(roster.filter(entry=>entry.email!==ada.email),++revision);
 assert.deepEqual(next.retired,[cy.email]);
 assert.ok(!holds(await team(),cy)&&!JSON.stringify(JSON.parse(await document())).includes(cy.email));
 assert.deepEqual((await team()).find(row=>row.email===bo.email),bobefore,'another teammate keeps their row');
 assert.deepEqual(JSON.parse(await document()).team.map(member=>member.email),[bo.email]);
 console.log('PROBE a member erased by an older release is retired at the next Business revision; the other teammate is unchanged');
} finally { await runtime.close(); }
