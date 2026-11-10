// Use the installed CLI, including its production build, native bootstrap,
// signed Business binding and isolated provider-edge conformance runner.
import { checkAgentDoor } from '../node_modules/@runeditrun/rer/cli/agent-door.mjs';

const report = line => {
  // Keep the complete assertion count even when the parent command bounds logs.
  if (line.startsWith('Agent door conformance:')) process.stderr.write(line + '\n');
  else console.log(line);
};
try { await checkAgentDoor(process.cwd(), { report }); await adoption(); }
catch (error) {
  if (error.code !== 'agent_door_failed') throw error;
  console.error(error.message);
  process.exitCode = error.exitCode ?? 1;
}


/** Fresh and held-data adoption uses the real emitted Worker and D1 engine. */
async function adoption() {
 const assert = (await import('node:assert/strict')).default;
 const {readdir,readFile,mkdtemp,rm} = await import('node:fs/promises');
 const {join,resolve,extname} = await import('node:path');
 const {tmpdir} = await import('node:os');
 const {createRequire} = await import('node:module');
 const {pathToFileURL} = await import('node:url');
 const require = createRequire(import.meta.url), wrangler = require.resolve('wrangler/package.json');
 const {Miniflare,convertV4MiniflareOptions} = await import(pathToFileURL(createRequire(wrangler).resolve('miniflare')));
 const {unstable_splitSqlQuery:split} = require('wrangler');
 const {checkAgentArtifacts,expireReplayCalls} = await import('../src/modules/agent-door/index.ts');
 const {erasedReplay,REPLAY_WINDOW_MS} = await import('../src/modules/agent-door/erasure.ts');
 const {oncallAgentArtifacts,eraseOncallAgentArtifacts} = await import('../src/agent-door/erasure.ts');
 const {excludedTable} = await import('../src/modules/portability/catalogue.mjs');
 const {portabilityPolicy,rejectPrivateAgentCustody} = await import('../src/portability-policy.mjs');
 const root = await mkdtemp(join(tmpdir(),'oncall-agent-upgrade-'));
 const build = resolve('dist/server'), config = JSON.parse(await readFile(join(build,'wrangler.json'),'utf8'));
 const walk = async dir => (await Promise.all((await readdir(dir,{withFileTypes:true})).map(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]))).flat();
 const types = {'.js':'ESModule','.mjs':'ESModule','.cjs':'CommonJS','.wasm':'CompiledWasm','.bin':'Data','.txt':'Text','.html':'Text','.sql':'Text'};
 const entry = join(build,config.main), modules = [entry,...(await walk(build)).filter(path=>path!==entry&&types[extname(path)])].map(path=>({type:types[extname(path)],path}));
 const secret = 'synthetic-installation-private-upgrade-secret';
 const mf = new Miniflare(convertV4MiniflareOptions({host:'127.0.0.1',port:0,cf:false,resourcePersistencePath:root,workers:[{
  name:'app',modules,modulesRoot:build,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,
  bindings:{SESSION_SECRET:secret,AUTH_LOCAL:'true',AUTH_ORIGIN:'http://localhost',OWNER_EMAIL:'synthetic-upgrade@example.invalid'},d1Databases:{DB:'upgrade'},
 }]}));
 try {
  const db = await mf.getD1Database('DB','app'), ledger = (await readdir('migrations/core')).filter(name=>name.endsWith('.sql')).sort();
  const apply = async name => db.batch(split(await readFile('migrations/core/'+name,'utf8')).map(sql=>db.prepare(sql)));
  const adoptionMigration = '0158_agent_replay_custody.sql';
  const relayMigration = '0159_agent_door_relay.sql';
  for (const name of ledger.filter(name=>name<adoptionMigration)) await apply(name);
  const started = Date.now()-86400000, legacyKey = 'held-subject-legacy-key';
  await db.prepare('INSERT INTO agent_door_calls(agent,key,digest,decision_id,created_at,state,outcome) VALUES(?,?,?,?,?,?,?)')
   .bind('held-agent',legacyKey,'old-payload-digest','held-decision',started,'done',JSON.stringify({value:'held-subject'})).run();
  for (const state of ['running','pending']) await db.prepare('INSERT INTO agent_door_calls(agent,key,digest,decision_id,created_at,state) VALUES(?,?,?,?,?,?)')
   .bind('held-agent',state,'old-digest',state,started-REPLAY_WINDOW_MS,state).run();
  await db.prepare("INSERT INTO agent_door_state(id,envelope) VALUES(1,?)").bind(JSON.stringify({business:'held-business'})).run();
  await db.prepare('INSERT INTO agent_door_audit(id,at,agent,classes,row) VALUES(?,?,?,?,?)')
   .bind('held-decision',new Date(started).toISOString(),'held-agent','[]',JSON.stringify({door:'mcp',consent:'held-consent',classes:[],tool:'oncall.incidents.read',agent:{id:'held-agent'},sponsor:{id:'native-owner'},outcome:'executed'})).run();
  await apply(adoptionMigration);await apply(relayMigration);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM agent_door_relay').first()).n,1,'Existing consented audit is backfilled');
  // The 0159 triggers assign an old Business's approval execution to a newly paired Business.
  await db.prepare("UPDATE agent_door_state SET envelope=? WHERE id=1").bind(JSON.stringify({business:'new-business'})).run();
  await db.prepare('INSERT INTO agent_door_audit(id,at,agent,classes,row) VALUES(?,?,?,?,?)')
   .bind('held-execution',new Date(started).toISOString(),'held-agent','[]',JSON.stringify({door:'mcp',consent:'new-consent',decision_id:'held-decision',classes:[],tool:'oncall.incidents.read',agent:{id:'held-agent'},sponsor:{id:'native-owner'},outcome:'executed'})).run();
  assert.deepEqual((await db.prepare('SELECT decision_id,business FROM agent_door_relay ORDER BY sequence').all()).results.map(row=>row.business),['held-business','new-business'],'The old trigger leaks the execution into the new feed');
  for (const name of ledger.filter(name=>name>relayMigration)) await apply(name);
  assert.deepEqual((await db.prepare('SELECT decision_id,business FROM agent_door_relay ORDER BY sequence').all()).results,[{decision_id:'held-decision',business:'held-business'}],'Relay privacy migration removes only the cross-Business membership');
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM agent_door_audit WHERE id IN ('held-decision','held-execution')").first()).n,2,'Every audit is preserved');
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM agent_door_retired_refs').first()).n,0,'Retired-reference custody exists after the upgrade');
  await checkAgentArtifacts(db,oncallAgentArtifacts);
  const horizon = started+REPLAY_WINDOW_MS;
  assert.equal((await db.prepare("SELECT expires_at FROM agent_door_calls WHERE decision_id='held-decision'").first()).expires_at,horizon,'Upgrade uses original created_at, never upgrade time');
  assert.deepEqual((await db.prepare("SELECT expires_at FROM agent_door_calls WHERE state IN ('running','pending')").all()).results.map(row=>row.expires_at),[null,null]);
  const marker = {erasure_id:'synthetic-native-operation',at:new Date().toISOString()};
  await db.batch(await eraseOncallAgentArtifacts(db,secret,['held-subject'],marker));
  assert.equal((await db.prepare("SELECT expires_at FROM agent_door_calls WHERE decision_id='held-decision'").first()).expires_at,horizon,'Erasure preserves the completed call horizon');
  const replay = await erasedReplay({options:{db,erasure:{secret}},now:()=>horizon-1},'held-agent',legacyKey);
  assert.equal(replay.code,'subject_erased');assert.deepEqual(replay.fields.tombstone,marker);assert.ok(!JSON.stringify(replay).includes('held-subject'));
  await db.prepare("UPDATE agent_door_calls SET expires_at=? WHERE decision_id='held-decision'").bind(horizon-1000).run();
  await db.batch(await eraseOncallAgentArtifacts(db,secret,['held-subject'],marker));
  assert.equal((await db.prepare("SELECT expires_at FROM agent_door_calls WHERE decision_id='held-decision'").first()).expires_at,horizon-1000,'An earlier existing expiry is never extended');
  await expireReplayCalls({options:{db},now:()=>horizon});
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM agent_door_replay_aliases').first()).n,0,'Expiry deletes aliases atomically');
  assert.equal(await erasedReplay({options:{db,erasure:{secret}},now:()=>horizon},'held-agent',legacyKey),null);
  for(const table of ['agent_door_relay','agent_door_replay_aliases']) {
   assert.ok(excludedTable(table,portabilityPolicy));
   assert.throws(()=>rejectPrivateAgentCustody({manifest:{tables:[{name:table,count:1}]}}),/INSTALLATION_PRIVATE_AGENT_CUSTODY/);
  }
  console.log('PASS adoption upgrade: all prior migrations, complete artifact map, original replay horizon, in-window tombstone replay, earlier expiry, relay backfill and atomic alias expiry; relay/aliases excluded from portable inventory');
 } finally { await mf.dispose();await rm(root,{recursive:true,force:true}); }
 // The normal harness already migrated a fresh installation. Check its map and
 // Business stop through the seed's own native session and signed public doors.
 const {agentRuntime} = await import('./agent-door-runtime.mjs');
 const {signJws,seconds} = await import('../src/modules/agent-door/conformance/crypto.mjs');
 const {randomUUID} = await import('node:crypto');
 const runtime = await agentRuntime();
 try {
  await checkAgentArtifacts(runtime.db,oncallAgentArtifacts);
  assert.equal((await runtime.adopt()).status,200);
  const c=runtime.context, now=seconds();
  const pull=await signJws(c.signer.privateKey,c.signer.kid,'rer-agent-decisions+jwt',{v:1,iss:c.signer.issuer,aud:c.origin,sub:c.signer.installationId,business:c.business,after:0,limit:200,iat:now,exp:now+60,jti:randomUUID()});
  assert.equal((await runtime.http('/api/rer/agent-decisions',{pull})).status,200);
  assert.equal((await runtime.http('/api/rer/agent-decisions',{pull:'unauthorized'})).status,401);
  const settings=await signJws(c.signer.privateKey,c.signer.kid,'rer-business-settings+jwt',{v:1,iss:c.signer.issuer,aud:c.origin,sub:c.signer.installationId,business:c.business,email:c.person.email,owner_id:c.person.sub,jti:randomUUID(),iat:now,exp:now+300,rev:2,values:{},logo:null,team:null,detached:true});
  assert.equal((await runtime.http('/api/rer/business-settings',{settings})).status,200);
  assert.equal((await runtime.http('/api/rer/agent-decisions',{pull})).status,404);
  assert.equal((await runtime.mcp('tools/list')).status,401);
  assert.equal((await runtime.http('/api/state')).status,200,'Native owner remains independent of Business stop');
  assert.equal((await runtime.adopt()).status,200,'Signed policy still resolves the stopped Business sponsor');
  console.log('PASS adoption fresh/public doors: complete artifact map; signed relay 200, unauthorized 401, stopped 404; Business token refused, owner works, signed policy still adopts');
 } finally { await runtime.close(); }
 // A held Business approval, including one saved before principals carried `source`, cannot execute after detachment.
 const {autonomousPolicy} = await import('../src/modules/agent-door/conformance/crypto.mjs');
 const held = await agentRuntime();
 try {
  const c=held.context;
  assert.equal((await held.adopt({...autonomousPolicy(),rules:[{id:'hold',class:'*',do:'approval',approver:['sponsor'],wait:'PT1H'}]})).status,200);
  const hold=async()=>{
   const call=await held.tool('oncall.coordination.read',{});
   const handle=call.result?._meta?.['com.runeditrun/approval'];assert.ok(handle,'A running Business holds the call for approval');
   const {approval}=await (await held.http('/agents/api/approvals/'+handle.id)).json();
   return {path:'/agents/api/approvals/'+handle.id,choice:{revision:approval.revision,summary_sha256:approval.summary_sha256},id:handle.id};
  };
  const running=await hold(),tagged=await hold(),legacy=await hold();
  const principal=async id=>JSON.parse((await held.db.prepare('SELECT saved FROM agent_door_approvals WHERE id=?').bind(id).first()).saved).principal;
  assert.equal((await principal(tagged.id)).source,'business');
  await held.db.prepare("UPDATE agent_door_approvals SET saved=json_remove(saved,'$.principal.source') WHERE id=?").bind(legacy.id).run();
  assert.equal((await principal(legacy.id)).source,undefined,'The legacy approval has an untagged principal');
  const executed=await held.http(running.path+'/approve',running.choice);
  assert.equal(executed.status,200);assert.equal((await executed.json()).approval.state,'executed','A running Business approval executes');
  const now=seconds();
  const detach=await signJws(c.signer.privateKey,c.signer.kid,'rer-business-settings+jwt',{v:1,iss:c.signer.issuer,aud:c.origin,sub:c.signer.installationId,business:c.business,email:c.person.email,owner_id:c.person.sub,jti:randomUUID(),iat:now,exp:now+300,rev:2,values:{},logo:null,team:null,detached:true});
  assert.equal((await held.http('/api/rer/business-settings',{settings:detach})).status,200);
  for(const [label,item] of [['tagged',tagged],['legacy untagged',legacy]]){
   const refused=await held.http(item.path+'/approve',item.choice),body=await refused.json();
   assert.equal(body.approval?.state,'refused',label+' approval is refused after detachment');
   assert.equal(body.approval?.code,'sponsor_unavailable',label+' approval names sponsor_unavailable');
  }
  console.log('PASS Business stop approvals: running Business approval executed; after signed detachment both a tagged and a legacy untagged pending Business approval are refused sponsor_unavailable');
 } finally { await held.close(); }
}
