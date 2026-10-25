import assert from "node:assert/strict";
import { awaitingCoordinationAuthority } from "./runtime-authority.mjs";
import { coordinationHealth } from "./coordination-health.mjs";
import { heldWorkspace } from "./runtime-held-workspace.mjs";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { mkdtemp, rm, mkdir, readdir, copyFile, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHmac, pbkdf2Sync, createHash, randomBytes } from "node:crypto";
import { createServer } from "node:net";
// Each request closes its connection: a pooled one the local Worker closed while the test read D1 through wrangler would fail the next request before it is sent.
const fetch = (url, init = {}) => globalThis.fetch(url, { ...init, headers: { ...init.headers, connection: "close" } });
let persist = await mkdtemp(join(tmpdir(), "oncall-test-"));
const port = await new Promise((resolve) => { const s = createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const origin = `http://127.0.0.1:${port}`;
const buildConfig=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
const deployment={sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),fingerprint:createHash('sha256').update(await readFile(resolve('dist/server',buildConfig.main))).digest('hex'),versionId:null};
let worker;
let logs = "";
const originalPersist = persist;
let portablePersist;
const cli = ["node_modules/wrangler/bin/wrangler.js"];
const migration = () => {
  const r = spawnSync(
    process.execPath,
    [
      ...cli,
      "d1",
      "migrations",
      "apply",
      "DB",
      "--local",
      "--persist-to",
      persist,
    ],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr + r.stdout);
};
function sql(command) {
  const r = spawnSync(
    process.execPath,
    [
      ...cli,
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      persist,
      "--command",
      command,
    ],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr + r.stdout);
}
const rows = (command) => {
  const r = spawnSync(process.execPath, [...cli, "d1", "execute", "DB", "--local", "--persist-to", persist, "--command", command, "--json"], { encoding: "utf8" });
  assert.equal(r.status, 0, "query failed");
  return JSON.parse(r.stdout)[0].results;
};
const sessionSecret = randomBytes(32).toString("hex");
async function start() {
  worker = spawn(
    process.execPath,
    [
      ...cli,
      "dev",
      "--local",
      "--config",
      "dist/server/wrangler.json",
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--inspector-port",
      "0",
      "--var",
      "SESSION_SECRET:"+sessionSecret,
      "--var",
      "RER_DEPLOY_SOURCE:"+deployment.sourceSha,
      "--var",
      "RER_DEPLOY_FINGERPRINT:"+deployment.fingerprint,
      "--persist-to",
      persist,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  worker.stdout.on("data", (v) => (logs += v));
  worker.stderr.on("data", (v) => (logs += v));
  for (let i = 0; i < 120; i++) {
    if (worker.exitCode !== null) throw Error(logs);
    try {
      if ((await fetch(origin + "/health")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw Error(logs);
}
async function stop() {
  worker.kill("SIGTERM");
  await new Promise((r) =>
    worker.exitCode !== null ? r() : worker.once("exit", r),
  );
}
async function request(path, data, cookie = "", headers = {}) {
  return rawRequest(path, data === undefined ? undefined : JSON.stringify(data), cookie, headers);
}
async function rawRequest(path, raw, cookie = "", headers = {}) {
  const response = await fetch(origin + path, {
    method: raw === undefined ? "GET" : "POST",
    headers: { origin, "content-type": "application/json", cookie, ...headers },
    body: raw,
  });
  let value;
  try {
    value = await response.json();
  } catch {
    value = null;
  }
  return {
    status: response.status,
    value,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
const ok = (r, status = 200) => {
  assert.equal(r.status, status, JSON.stringify(r.value));
  return r.value;
};
// OC-041 accepted state and its audit entry commit together, survive subject erasure and export without secrets.
async function auditExport(cookie) {
  const exported = ok(await request("/api/audit/export", undefined, cookie));
  assert.equal(exported.schemaVersion, 1);
  assert.ok(Array.isArray(exported.rows));
  return exported;
}
async function auditedMutation(cookie, perform) {
  const before = ok(await request("/api/state", undefined, cookie));
  const prior = await auditExport(cookie), ids = new Set(prior.rows.map(row => row.id));
  const response = await perform();
  const after = ok(await request("/api/state", undefined, cookie));
  const added = (await auditExport(cookie)).rows.filter(row => !ids.has(row.id));
  const committed = added.filter(row => row.outcome === "accepted" && row.kind !== "audit.export");
  assert.ok(committed.some(row => row.workspaceBefore === before.revision && row.workspaceAfter === after.revision),
    "accepted state and an audit entry expose the same committed workspace revisions");
  for (const row of committed) {
    assert.ok(row.afterRevision > row.beforeRevision, "an accepted mutation advances the audit clock");
    assert.ok(Number.isFinite(Date.parse(row.at)), "audit entries carry a valid time");
  }
  return { response, committed, before, after };
}
function auditSqlRefused(command) {
  const result = spawnSync(process.execPath, [...cli, "d1", "execute", "DB", "--local", "--persist-to", persist, "--command", command], { encoding: "utf8" });
  assert.notEqual(result.status, 0, "audit history refuses SQL mutation");
}
// OC-042 held signed-source custody survives upgrade, rotation, revocation and archive exclusion without secret echoes.
async function heldSourceCustody(cookie, heldSignedKey, heldBearerKey, digest) {
  const signal = (source, eventId, extra = {}) => ({ source, eventId, service: "prior-service", environment: "production", key: "custody",
    generation: "upgrade", intent: "trigger", severity: "warning", title: "Held signed source after upgrade", observedAt: new Date().toISOString(), evidence: "", ...extra });
  const signed = (key, value, source = "held-signed") => {
    const raw = JSON.stringify(value), ts = String(Math.floor(Date.now() / 1000));
    return rawRequest("/api/ingress/" + source, raw, "", { "x-oncall-timestamp": ts, "x-oncall-signature": createHmac("sha256", key).update(ts + "." + raw).digest("hex") });
  };
  const bearer = (key, value) => rawRequest("/api/ingress/held-bearer", JSON.stringify(value), "", { authorization: "Bearer " + key });
  const held = rows("SELECT id,digest,signing_secret,signing_custody,scopes FROM sources ORDER BY id");
  assert.deepEqual(held.map(({ id, digest, signing_secret, scopes }) => ({ id, digest, signing_secret, scopes })),
    [{ id: "held-bearer", digest: digest(heldBearerKey), signing_secret: null, scopes: '["prior-service"]' }, { id: "held-signed", digest: digest(heldSignedKey), signing_secret: null, scopes: '["prior-service"]' }],
    "the first request after upgrade clears every held plaintext key and keeps identities, digests and scopes");
  assert.equal(held[0].signing_custody, null, "bearer sources keep only a digest");
  assert.match(held[1].signing_custody, /^v1\.[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*$/, "the held signing key is sealed under installation custody");
  assert.ok(!held[1].signing_custody.includes(heldSignedKey));
  const first = ok(await signed(heldSignedKey, signal("held-signed", "after-upgrade")), 201);
  ok(await signed(randomBytes(32).toString("hex"), signal("held-signed", "wrong-key")), 401);
  ok(await bearer(heldBearerKey, signal("held-bearer", "bearer-after-upgrade")), 201);
  ok(await bearer(heldBearerKey, signal("held-bearer", "unscoped", { service: "a-service", environment: "staging" })), 403);
  // Native admission keeps caller text, so an event carrying its own key is refused before anything is stored.
  const echoes = [
    await signed(heldSignedKey, signal("held-signed", "echo-title", { title: "Leaked " + heldSignedKey.toUpperCase() })),
    await signed(heldSignedKey, signal("held-signed", "echo-link", { evidence: "https://example.test/check?token=" + encodeURIComponent(heldSignedKey) })),
    await bearer(heldBearerKey, signal("held-bearer", "echo-" + heldBearerKey)),
  ];
  for (const echo of echoes) { assert.equal(echo.status, 400); assert.match(echo.value.error, /source key out of event content/); }
  // A sealed key that cannot be opened refuses ingress visibly; plaintext can never be written back.
  await stop();
  const sealed = held[1].signing_custody, [version, iv, ciphertext] = sealed.split(".");
  sql(`UPDATE sources SET signing_custody='${[version, iv, Buffer.from(ciphertext, "base64").map((b, n) => n === 0 ? b ^ 1 : b).toString("base64")].join(".")}' WHERE id='held-signed'`);
  for (const write of [`INSERT INTO sources(id,digest,signing_secret,scopes) VALUES('plain','x','${"p".repeat(32)}','[]')`, `UPDATE sources SET signing_secret='${"p".repeat(32)}' WHERE id='held-bearer'`]) {
    const refused = spawnSync(process.execPath, [...cli, "d1", "execute", "DB", "--local", "--persist-to", persist, "--command", write], { encoding: "utf8" });
    assert.notEqual(refused.status, 0, "plaintext signing keys cannot be written after the custody migration");
  }
  await start();
  const unreadable = await signed(heldSignedKey, signal("held-signed", "unreadable"));
  assert.equal(unreadable.status, 503); assert.match(unreadable.value.error, /cannot be opened/);
  // Rotation is one guarded statement: the earlier key stops admitting events when it commits.
  const rotated = randomBytes(32).toString("hex"), raced = randomBytes(32).toString("hex");
  const configure = (key) => request("/api/sources", { id: "held-signed", key, mode: "signed", scopes: ["prior-service"] }, cookie);
  const saved = ok(await configure(rotated));
  assert.deepEqual(saved, { id: "held-signed", authentication: "signed", credential: "encrypted in this installation; never returned", effect: "intake only; no read access" });
  ok(await signed(heldSignedKey, signal("held-signed", "rotated-out")), 401);
  ok(await signed(rotated, signal("held-signed", "rotated-in")), 201);
  ok(await request("/api/sources", { id: "echo-" + rotated, key: rotated, mode: "signed", scopes: ["prior-service"] }, cookie), 400);
  const [inFlight, rotation] = await Promise.all([signed(rotated, signal("held-signed", "in-flight")), configure(raced)]);
  // Admission advances the workspace revision, so a rotation that lost the race asks for a reload.
  if (rotation.status === 409) ok(await configure(raced)); else ok(rotation);
  assert.ok([201, 401, 409].includes(inFlight.status), "an event racing rotation is admitted under the old key or refused, never half-stored");
  ok(await signed(rotated, signal("held-signed", "after-race")), 401);
  ok(await signed(raced, signal("held-signed", "after-race")), 201);
  const listed = ok(await request("/api/sources", undefined, cookie));
  assert.deepEqual(listed.sources, [
    { id: "held-bearer", authentication: "bearer", custody: "digest only", scopes: ["prior-service"] },
    { id: "held-signed", authentication: "signed", custody: "encrypted in this installation", scopes: ["prior-service"] },
  ], "setup reads show secret-free definitions only");
  ok(await request("/api/sources", undefined, ""), 401);
  // Revocation removes the held key atomically; accepted history stays.
  const revoked = ok(await request("/api/sources/held-signed/revoke", {}, cookie));
  assert.equal(revoked.revoked, true);
  ok(await signed(raced, signal("held-signed", "after-revoke")), 401);
  ok(await request("/api/sources/held-signed/revoke", {}, cookie), 404);
  const custody = rows("SELECT signing_custody FROM sources WHERE signing_custody IS NOT NULL").map(row => row.signing_custody);
  const state = ok(await request("/api/state", undefined, cookie));
  assert.ok(state.events.some(event => event.id === first.id), "events accepted before revocation remain");
  assert.ok(!state.events.some(event => /^echo/.test(event.eventId)), "refused echoes leave no event");
  const retained = [JSON.stringify(state), JSON.stringify(ok(await request("/api/archive", undefined, cookie))),
    JSON.stringify(ok(await request("/api/recovery/checkpoint", undefined, cookie))), JSON.stringify(listed), JSON.stringify(saved)].join("\n").toLowerCase();
  for (const secret of [heldSignedKey, heldBearerKey, rotated, raced, sealed, ...custody])
    assert.ok(!retained.includes(secret.toLowerCase()), "no source key or custody value reaches workspace, audit, archive, checkpoint or setup reads");
  console.log("PASS OC-042 held signed-source custody survives upgrade, rotation, revocation and archive exclusion without secret echoes");
}
try {
  const legacyDirectory=join(persist,'legacy-migrations');await mkdir(legacyDirectory);
  for(const name of (await readdir('migrations/core')).filter(name=>/^\d{4}_/.test(name) && Number(name.slice(0,4)) < 106))await copyFile(join('migrations/core',name),join(legacyDirectory,name));
  const legacyConfig=join(persist,'legacy.json');await writeFile(legacyConfig,JSON.stringify({name:'oncall-legacy',compatibility_date:'2026-09-08',d1_databases:[{binding:'DB',database_name:'oncall-local',database_id:'00000000-0000-0000-0000-000000000001',migrations_dir:legacyDirectory}]}));
  const initial = spawnSync(process.execPath, [...cli, "d1", "migrations", "apply", "DB", "--config",legacyConfig,"--local", "--persist-to", persist], {encoding:"utf8",env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}});
  assert.equal(initial.status,0,initial.stderr);
  const preserved = JSON.stringify(heldWorkspace());
  sql("INSERT INTO workspace(id,revision,data) VALUES(1,3,'"+preserved.replaceAll("'","''")+"'); INSERT INTO credentials VALUES('prior-admin','prior-salt','"+pbkdf2Sync('synthetic-local-testing-password','prior-salt',100000,32,'sha256').toString('hex')+"')");
  const oldSchedule={id:'prior-schedule',name:'Prior rota',service:'prior-service',revision:1,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:['prior-admin'],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]};
  const legacyTimer={id:'prior-timer',incident:'retained-orphan',service:'prior-service',revision:1,status:'pending',nextDue:1791710000000,createdAt:1791710000000,lastEvaluatedAt:1791710000000,currentStep:0,policy:{service:'prior-service',scheduleId:'prior-schedule',revision:1,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3},schedule:oldSchedule,behaviors:{primary:'accepted',backup:'accepted'},steps:[],history:[{type:'created',at:1791710000000,actor:null,reason:null,attempt:null}]};
  sql("INSERT INTO paging_jobs VALUES('prior-timer','retained-orphan','prior-service',1,'pending',1791710000000,'prior','"+JSON.stringify(legacyTimer)+"')");
  // OC-042: an installation from before signing-key custody holds a signed source's key in plaintext.
  const heldSignedKey = randomBytes(32).toString("hex"), heldBearerKey = randomBytes(32).toString("hex");
  const digest = (value) => createHash("sha256").update(value).digest("hex");
  sql(`INSERT INTO sources(id,digest,signing_secret,scopes) VALUES('held-signed','${digest(heldSignedKey)}','${heldSignedKey}','["prior-service"]'),('held-bearer','${digest(heldBearerKey)}',NULL,'["prior-service"]')`);
  // Pause this same held-data journey on the released schema before applying the new audit migrations.
  for (const name of (await readdir('migrations/core')).filter(name => /^\d{4}_/.test(name) && Number(name.slice(0, 4)) >= 106 && Number(name.slice(0, 4)) <= 128))
    await copyFile(join('migrations/core', name), join(legacyDirectory, name));
  const released = spawnSync(process.execPath, [...cli, "d1", "migrations", "apply", "DB", "--config", legacyConfig, "--local", "--persist-to", persist], { encoding: "utf8", env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' } });
  assert.equal(released.status, 0, "released-schema migrations apply before the additive upgrade");
  const heldTables = rows("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name").map(row => row.name);
  const snapshotHeldTables = () => {
    const command = heldTables.map(name => 'SELECT * FROM "' + name.replaceAll('"', '""') + '"').join(';');
    const result = spawnSync(process.execPath, [...cli, "d1", "execute", "DB", "--local", "--persist-to", persist, "--command", command, "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    assert.equal(result.status, 0, "held application table snapshot succeeds");
    const snapshot = JSON.parse(result.stdout).map(result => result.results.map(row => JSON.stringify(row)).sort());
    assert.equal(snapshot.length, heldTables.length, "the snapshot covers every prior application table");
    return snapshot;
  };
  const releasedRows = snapshotHeldTables();
  migration();
  const upgradedRows = snapshotHeldTables();
  for (const [index, name] of heldTables.entries())
    assert.ok(JSON.stringify(upgradedRows[index]) === JSON.stringify(releasedRows[index]), "new audit migrations preserve every held row in " + name);
  console.log(`PASS additive audit migration upgrade: ${heldTables.length} prior application tables and ${releasedRows.reduce((sum, table) => sum + table.length, 0)} held rows unchanged before Worker writes.`);
  assert.deepEqual(rows("SELECT id,signing_secret IS NOT NULL AS held,signing_custody FROM sources ORDER BY id"),
    [{ id: "held-bearer", held: 0, signing_custody: null }, { id: "held-signed", held: 1, signing_custody: null }],
    "OC-042: the SQL migration is additive and keeps the held key until the Worker can seal it");
  await start();
  const priorLogin=await request('/api/login',{name:'Prior Operator',password:'synthetic-local-testing-password'});
  ok(priorLogin);
  const door=await fetch(origin+'/signin/local');assert.equal(door.status,200);assert.match(await door.text(),/name="password"/,'held password accounts keep their sign-in door');
  const priorState=ok(await request('/api/state',undefined,priorLogin.cookie));
  assert.deepEqual(priorState,JSON.parse(preserved),'held one-row fixture survives relational migration through HTTP');
  const upgradedTimer=ok(await request('/api/paging/state',undefined,priorLogin.cookie)).jobs.find(job=>job.id==='prior-timer');assert.equal(upgradedTimer.status,'paused');assert.equal(upgradedTimer.nextDue,null);assert.deepEqual(upgradedTimer.history.slice(0,-1),legacyTimer.history,'held timer history preserved while paused');
  await stop();
  migration();
  await start();
  const heldAgain = await request('/api/login', { name: 'Prior Operator', password: 'synthetic-local-testing-password' });
  ok(heldAgain);
  assert.deepEqual(ok(await request('/api/state', undefined, heldAgain.cookie)), JSON.parse(preserved), 'all held arrays and history survive repeated migration and restart');
  console.log('PASS held upgrade through pre-0106 SQL: full ordered members/services/policies/events/alerts/incidents/audit and nested history unchanged; held password works after upgrade and repeat migration/restart.');
  await heldSourceCustody(heldAgain.cookie, heldSignedKey, heldBearerKey, digest);
  await stop();
  sql('DELETE FROM sources; DELETE FROM paging_jobs; DELETE FROM operator_members; DELETE FROM sessions; DELETE FROM credentials; DELETE FROM workspace_control; '+['members','services','policies','events','alerts','incidents','audit'].map(k=>'DELETE FROM oc_'+k).join(';'));
  migration();
  await start();
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  const homeDocument = await home.text();
  assert.match(homeDocument, /href="\/setup"/, "an unclaimed guest can finish setup from the Lobby");
  assert.match(await (await fetch(origin, { headers: { cookie: `oncall_session_${new URL(origin).port}=forged` } })).text(), /href="\/setup"/, "forged sessions receive the guest Lobby");
  const docsIndex = await fetch(origin + "/docs");
  assert.equal(docsIndex.status, 200);
  const docPages = [...new Set([...(await docsIndex.text()).matchAll(/href="\/docs\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
  assert.ok(docPages.length > 0, "the docs home lists its pages");
  for (const slug of docPages) {
    const page = await fetch(origin + "/docs/" + slug);
    assert.equal(page.status, 200, slug);
    assert.match(await page.text(), /<h1[^>]*>[^<]+<\/h1>/, "docs page " + slug + " is server-rendered");
  }
  assert.equal((await fetch(origin + "/docs/missing")).status, 404);
  assert.equal((await fetch(origin + "/missing")).status, 404);
  ok(await request("/api/state"), 401);
  const setup = await request("/api/setup", {
    name: "Admin",
    password: "synthetic-local-testing-password",
  });
  const admin = ok(setup).member;
  let cookie = setup.cookie;
  assert.match(await (await fetch(origin, { headers: { cookie } })).text(), /class="access"/, "a validated password member opens the workspace");
  assert.match(cookie, new RegExp(`^oncall_session_${new URL(origin).port}=`), "the workspace cookie is named for this install's port");
  const neighbour = cookie.replace(/^oncall_session_\d+=/, `oncall_session_${Number(new URL(origin).port) + 1}=`);
  ok(await request("/api/state", undefined, neighbour), 401);
  const neighbourLogout = await fetch(origin + "/api/logout", { method: "POST", headers: { origin, cookie: neighbour } });
  assert.equal(neighbourLogout.headers.get("set-cookie")?.startsWith(cookie.split("=")[0] + "="), true, "sign-out only ever names this install's own cookie");
  ok(await request("/api/state", undefined, cookie), 200);
  sql('UPDATE sessions SET expires=0');
  assert.match(await (await fetch(origin, { headers: { cookie } })).text(), /href="\/setup"/, "an expired password session receives the guest Lobby");
  const freshLogin = await request('/api/login', { name: 'Admin', password: 'synthetic-local-testing-password' });
  ok(freshLogin); cookie = freshLogin.cookie;
  ok(
    await request("/api/setup", {
      name: "second",
      password: "synthetic-local-testing-password",
    }),
    409,
  );
  assert.equal(
    (
      await fetch(origin + "/api/command", {
        method: "POST",
        headers: {
          cookie,
          origin: "https://attacker.test",
          "content-type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  const viewer = ok(
    await request(
      "/api/members",
      { name: "Viewer", role: "viewer", password: "synthetic-viewer-testing-password" },
      cookie,
    ),
    201,
  );
  const vl = await request("/api/login", {
    name: "Viewer",
    password: "synthetic-viewer-testing-password",
  });
  ok(vl);
  const vc = vl.cookie;
  ok(await request("/api/state", undefined, vc));
  sql("UPDATE sessions SET expires=0 WHERE member='" + viewer.id + "'");
  ok(await request("/api/state", undefined, vc), 401);
  const vl2 = await request("/api/login", {
    name: "Viewer",
    password: "synthetic-viewer-testing-password",
  });
  ok(vl2);
  const currentViewerCookie = vl2.cookie;
  ok(await request("/api/state", undefined, currentViewerCookie));
  ok(
    await request("/api/command", { type: "service" }, currentViewerCookie),
    403,
  );
  ok(await request("/api/archive", undefined, currentViewerCookie), 403);
  ok(await request("/api/audit/export", undefined, currentViewerCookie), 403);
  ok(await request("/api/audit/export"), 401);
  const roleBefore = ok(await request("/api/state", undefined, cookie)), auditBefore = await auditExport(cookie);
  const auditSqlBefore = rows("SELECT * FROM oc_admin_audit ORDER BY id");
  sql("CREATE TRIGGER injected_audit_failure BEFORE INSERT ON oc_admin_audit BEGIN SELECT RAISE(ABORT,'INJECTED_AUDIT_FAILURE'); END");
  ok(await request("/api/command", { type: "member", id: viewer.id, role: "responder", active: true }, cookie), 503);
  assert.deepEqual(ok(await request("/api/state", undefined, cookie)), roleBefore,
    "an audit insert failure rolls back the member role and workspace revision together");
  assert.deepEqual(rows("SELECT * FROM oc_admin_audit ORDER BY id"), auditSqlBefore, "a failed audit insert publishes no partial history");
  sql("DROP TRIGGER injected_audit_failure");
  const afterAuditFault = new Map((await auditExport(cookie)).rows.map(row => [row.id, row]));
  for (const row of auditBefore.rows) assert.deepEqual(afterAuditFault.get(row.id), row, "audit-write failure preserves all prior history");
  const grant = await auditedMutation(cookie, () => request("/api/command", { type: "member", id: viewer.id, role: "responder", active: true }, cookie));
  ok(grant.response);
  assert.equal(grant.after.members.find(member => member.id === viewer.id).role, "responder");
  const withdrawGrant = await auditedMutation(cookie, () => request("/api/command", { type: "member", id: viewer.id, role: "viewer", active: true }, cookie));
  ok(withdrawGrant.response);
  assert.equal(withdrawGrant.after.members.find(member => member.id === viewer.id).role, "viewer");
  const grantEntry = grant.committed.find(row => row.subject), withdrawEntry = withdrawGrant.committed.find(row => row.subject);
  assert.ok(grantEntry && withdrawEntry, "role changes identify their subject without retaining the member identity");
  assert.equal(grantEntry.subject, withdrawEntry.subject, "the same subject keeps its random audit alias");
  assert.equal(grantEntry.actor, withdrawEntry.actor, "the same actor keeps its random audit alias");
  assert.notEqual(grantEntry.subject, viewer.id);assert.notEqual(grantEntry.actor, admin.id);
  const heldAudit = await auditExport(cookie), heldAuditId = heldAudit.rows.at(-1).id.replaceAll("'", "''");
  auditSqlRefused("UPDATE oc_admin_audit SET kind=kind WHERE id='" + heldAuditId + "'");
  auditSqlRefused("DELETE FROM oc_admin_audit WHERE id='" + heldAuditId + "'");
  const afterSqlRefusal = new Map((await auditExport(cookie)).rows.map(row => [row.id, row]));
  for (const row of heldAudit.rows) assert.deepEqual(afterSqlRefusal.get(row.id), row, "SQL update/delete cannot change append-only history");
  const service = ok(
    await request(
      "/api/command",
      {
        type: "service",
        id: "checkout",
        name: "Checkout",
        environment: "production",
        owner: admin.id,
        runbook: ["Check customer journey", "Record evidence"],
        pager: "https://example.test/pager",
      },
      cookie,
    ),
  );
  ok(
    await request(
      "/api/command",
      {
        type: "policy",
        service: service.id,
        severity: "*",
        action: "route",
        owner: admin.id,
        reason: "Service owner takes coordination",
      },
      cookie,
    ),
  );
  const key = "synthetic-intake-secret-not-a-provider-0001";
  const privateService = ok(await request("/api/command", {
    type: "service", id: "private-service", name: "Private service",
    environment: "production", owner: admin.id, runbook: [], pager: "",
  }, cookie));
  const privatePolicy = ok(await request("/api/command", {
    type: "policy", service: privateService.id, severity: "*", action: "route",
    owner: admin.id, reason: "Private routing instruction outside the intake scope",
  }, cookie));
  const stagingService = ok(await request("/api/command", {
    type: "service", id: "checkout-staging", name: "Checkout staging",
    environment: "staging", owner: admin.id, runbook: [], pager: "",
  }, cookie));
  ok(
    await request(
      "/api/sources",
      { id: "monitor", key, scopes: ["checkout", stagingService.id] },
      cookie,
    ),
  );
  const event = {
    source: "monitor",
    eventId: "one",
    service: "checkout",
    environment: "production",
    key: "upgrade",
    generation: "release-1",
    intent: "trigger",
    severity: "critical",
    title: "Old accounts cannot upgrade; contact +61400123987",
    observedAt: "2026-10-02T12:00:00Z",
    evidence: "https://example.test/check",
  };
  // OC-059: authenticated native bounds retain incomplete custody; refusals stay atomic.
  const beforeRefusedInput = ok(await request("/api/archive", undefined, cookie));
  const oversizedEvent = { ...event, eventId: "over-limit", discarded: "" };
  const paddingBytes = 65537 - Buffer.byteLength(JSON.stringify(oversizedEvent));
  oversizedEvent.discarded = "é".repeat(Math.floor(paddingBytes / 2)) + "x".repeat(paddingBytes % 2);
  const oversizedBody = JSON.stringify(oversizedEvent);
  assert.equal(Buffer.byteLength(oversizedBody), 65537);
  assert.ok(oversizedBody.length < 65536, "the native bound counts UTF-8 bytes, not characters");
  ok(await rawRequest("/api/ingress/monitor", oversizedBody), 401);
  assert.deepEqual(ok(await request("/api/archive", undefined, cookie)),beforeRefusedInput,"unauthenticated oversize has no custody");
  const assertIncomplete = async (response,raw,expectedService) => {
    const value=ok(response,202);assert.equal(value.truncation,true);
    const state=ok(await request("/api/archive",undefined,cookie)),held=state.intakeReceipts.find(r=>r.id===value.incomplete.receipt);
    assert.equal(held.service,expectedService);assert.equal(held.severity,"critical");assert.equal(held.truncated,true);
    assert.equal(held.incomplete.bytes,Buffer.byteLength(raw));assert.equal(held.incomplete.sha256,createHash("sha256").update(raw).digest("hex"));
    assert.deepEqual(held.incomplete.readableIds,[]);assert.equal(held.incomplete.dropped,null);
    assert.ok(Buffer.from(held.details.nativePrefix.value,'base64').length<=65536);
    assert.deepEqual(Buffer.from(held.details.nativePrefix.value,'base64'),Buffer.from(raw).subarray(0,65536));
    assert.deepEqual(held.details.ownerNotice,{owner:admin.id,paging:"off",state:"recorded"});
    assert.ok(state.audit.some(row=>row.kind==="intake-owner-notice"&&row.text.includes(held.id)));
    assert.equal(held.native,undefined,"an untrusted prefix has no structured native event identity");
    if(expectedService)assert.equal(state.alerts.find(a=>a.id===held.alert).urgency,"high");
    else {assert.equal(held.outcome,"unrouted");const queued=state.alerts.find(a=>a.id===held.alert);assert.equal(queued.service,null);assert.equal(queued.urgency,"high");assert.deepEqual(queued.obligation.target,{kind:"user",id:admin.id});assert.equal(queued.obligation.paging,"off");}
    return {value,state,held};
  };
  const oversizeCustody=await assertIncomplete(await rawRequest("/api/ingress/monitor",oversizedBody,"",{authorization:"Bearer "+key}),oversizedBody,null);
  assert.deepEqual(oversizeCustody.state.events,beforeRefusedInput.events,"a multi-service key never guesses a service from the prefix");
  assert.equal(ok(await rawRequest("/api/ingress/monitor",oversizedBody,"",{authorization:"Bearer "+key}),202).id,oversizeCustody.value.id);
  assert.deepEqual(ok(await request("/api/archive",undefined,cookie)),oversizeCustody.state,"an incomplete retry changes no state");
  await assertIncomplete(await rawRequest("/api/ingress/monitor",'{"source":',"",{authorization:"Bearer "+key}),'{"source":',null);
  await assertIncomplete(await request("/api/ingress/monitor",{source:"monitor"},"",{authorization:"Bearer "+key}),JSON.stringify({source:"monitor"}),null);
  const singleScopeKey="synthetic-native-bounds-one-service-0001";
  ok(await request("/api/sources",{id:"bounds-one",key:singleScopeKey,scopes:[stagingService.id]},cookie));
  ok(await request("/api/urgency/services/"+stagingService.id,{baseVersion:0,mode:"low",timezone:"UTC",weekly:[],holidays:[],inside:"low",outside:"low",reason:"Incomplete custody must override low urgency"},cookie),201);
  await assertIncomplete(await rawRequest("/api/ingress/bounds-one",oversizedBody,"",{authorization:"Bearer "+singleScopeKey}),oversizedBody,stagingService.id);
  const hugeNativeBody='x'.repeat(7*1024*1024);
  await assertIncomplete(await rawRequest("/api/ingress/bounds-one",hugeNativeBody,"",{authorization:"Bearer "+singleScopeKey}),hugeNativeBody,stagingService.id);
  const afterCustody=ok(await request("/api/archive",undefined,cookie));
  const refusedInput = async (perform,status,kind,actorKind,actorId) => {
    const ids=new Set((await auditExport(cookie)).rows.map(row=>row.id));
    ok(await perform(),status);
    const actor=rows(`SELECT label FROM oc_audit_identities WHERE kind='${actorKind}' AND entity_id='${actorId.replaceAll("'","''")}'`)[0].label;
    const attempts=(await auditExport(cookie)).rows.filter(row=>!ids.has(row.id)&&row.kind===kind&&row.outcome==='refused');
    assert.equal(attempts.length,1,'each retained refusal has its own attributed operation outcome');
    assert.equal(attempts[0].actor,actor);
    assert.deepEqual([attempts[0].workspaceBefore,attempts[0].beforeRevision],[attempts[0].workspaceAfter,attempts[0].afterRevision],'refused input changes no coordination state or mutation revision');
  };
  await refusedInput(() => rawRequest("/api/ingress/monitor",'{"secret":"'+key.toUpperCase()+'"',"",{authorization:"Bearer "+key}),400,"ingest.request","source","monitor");
  await refusedInput(() => rawRequest("/api/ingress/monitor",'{"secret":"'+[...key].map(char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0')).join('')+'"',"",{authorization:"Bearer "+key}),400,"ingest.request","source","monitor");
  await refusedInput(() => rawRequest("/api/command", oversizedBody, cookie),413,"command.request","member",admin.id);
  await refusedInput(() => rawRequest("/api/command", JSON.stringify({type:"note",padding:"x".repeat(7*1024*1024)}), cookie),413,"command.request","member",admin.id);
  assert.deepEqual(ok(await request("/api/archive", undefined, cookie)), afterCustody,
    "refused commands and credential echoes change no durable records");
  ok(await request("/api/ingress/monitor", event), 401);
  const admission = await auditedMutation(cookie, () => request("/api/ingress/monitor", event, "", {
    authorization: "Bearer " + key,
  }));
  const first = ok(admission.response, 201);
  assert.ok(admission.after.events.some(stored => stored.id === first.id), "the audited admission is visible in committed state");
  const admittedSource = admission.committed.find(row => row.source)?.source;
  assert.ok(admittedSource && admittedSource !== event.source, "intake identifies the source only by its random audit alias");
  const receipt = async (value, signal, duplicate) => {
    const state = ok(await request("/api/state", undefined, cookie));
    const stored = state.events.find(e => e.id === value.id);
    assert.ok(stored, "receipt identifies the durable event");
    assert.deepEqual(value, { duplicate, id: stored.id, eventId: signal.eventId,
      service: signal.service, observedAt: new Date(signal.observedAt).toISOString(), acceptedAt: stored.acceptedAt },
      "intake returns only a receipt, never workspace data");
    assert.ok(Number.isFinite(Date.parse(value.acceptedAt)));
    assert.equal(stored.decision.action, "route");
    assert.ok(stored.routingSnapshot.members.some(m => m.id === viewer.id));
    assert.ok(stored.routingSnapshot.policies.some(p => p.id === privatePolicy.id));
    const archived = ok(await request("/api/archive", undefined, cookie));
    assert.deepEqual(archived.events.find(e => e.id === stored.id), stored,
      "session-protected export retains the full event");
    return state.alerts.find(a => a.events.includes(stored.id)).id;
  };
  const admittedAlert = await receipt(first, event, false);
  const equivalent = Object.fromEntries(Object.entries(event).map(([key, value]) => [key, ["intent", "severity", "observedAt"].includes(key) ? value : ` ${value} `]));
  equivalent.observedAt = "2026-10-02T14:00:00+02:00";
  equivalent.discarded = { raw: "not retained" };
  const repeated = ok(await request("/api/ingress/monitor", equivalent, "", {
    authorization: "Bearer " + key,
  }));
  await receipt(repeated, event, true);
  assert.deepEqual(repeated, { ...first, duplicate: true }, "duplicate receipt is stable");
  for (const path of ["/api/state", "/api/archive", "/api/recovery/checkpoint"])
    ok(await request(path, undefined, "", { authorization: "Bearer " + key }), 401);
  ok(await request("/api/ingress/monitor", { ...event, eventId: "unscoped", service: privateService.id },
    "", { authorization: "Bearer " + key }), 403);
  ok(
    await request(
      "/api/ingress/monitor",
      { ...event, title: "different" },
      "",
      { authorization: "Bearer " + key },
    ),
    409,
  );
  ok(
    await request(
      "/api/ingress/monitor",
      { ...event, eventId: "wrong", environment: "staging" },
      "",
      { authorization: "Bearer " + key },
    ),
    400,
  );
  const signedKey = "signed-synthetic-local-secret-000000001";
  ok(
    await request(
      "/api/sources",
      { id: "signed", key: signedKey, mode: "signed", scopes: ["checkout", stagingService.id] },
      cookie,
    ),
  );
  const se = { ...event, source: "signed" };
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", signedKey)
    .update(ts + "." + JSON.stringify(se))
    .digest("hex");
  const signed = ok(
    await request("/api/ingress/signed", se, "", {
      "x-oncall-timestamp": ts,
      "x-oncall-signature": sig,
    }),
    201,
  );
  const signedAlert = await receipt(signed, se, false);
  assert.notEqual(signedAlert, admittedAlert, "OC-001: the same event ID, key and generation in another source never merge");
  const signedRepeated = ok(await request("/api/ingress/signed", se, "", {
    "x-oncall-timestamp": ts, "x-oncall-signature": sig,
  }));
  await receipt(signedRepeated, se, true);
  assert.deepEqual(signedRepeated, { ...signed, duplicate: true });
  for (const path of ["/api/state", "/api/archive", "/api/recovery/checkpoint"])
    ok(await request(path, undefined, "", {
      "x-oncall-timestamp": ts, "x-oncall-signature": sig,
    }), 401);
  ok(
    await request("/api/ingress/signed", { ...se, title: "tampered" }, "", {
      "x-oncall-timestamp": ts,
      "x-oncall-signature": sig,
    }),
    401,
  );
  // OC-001: distinct events join only their exact source/service/environment/generation tuple.
  const native = async signal => ok(await request("/api/ingress/monitor", signal, "", {
    authorization: "Bearer " + key,
  }), 201);
  const joined = await native({ ...event, eventId: "same-tuple-trigger" });
  const staged = { ...event, service: stagingService.id, environment: "staging" };
  const earlyRecovery = await native({ ...staged, eventId: "staging-recovery-first", intent: "recover" });
  const lateTrigger = await native({ ...staged, eventId: "staging-trigger-after-recovery" });
  const newer = await native({ ...event, eventId: "newer-generation", generation: "release-2" });
  const identityArchive = ok(await request("/api/archive", undefined, cookie));
  const alertFor = receipt => identityArchive.alerts.find(alert => alert.events.includes(receipt.id));
  const stagedAlert = alertFor(earlyRecovery), newerAlert = alertFor(newer);
  const expectedMembership = new Map([
    [admittedAlert, [first.id, joined.id]], [signedAlert, [signed.id]],
    [stagedAlert.id, [earlyRecovery.id, lateTrigger.id]], [newerAlert.id, [newer.id]],
  ]);
  assert.equal(expectedMembership.size, 4, "OC-001: source, environment/service and generation boundaries each retain a separate alert");
  assert.equal(identityArchive.alerts.filter(alert => alert.key === event.key).length, 4);
  for (const [id, eventIds] of expectedMembership) {
    const alert = identityArchive.alerts.find(item => item.id === id);
    assert.deepEqual(alert.events, eventIds, "OC-001: distinct observations of one tuple join the same alert in order");
    for (const eventId of eventIds) {
      const stored = identityArchive.events.find(item => item.id === eventId);
      assert.deepEqual([stored.source, stored.service, stored.environment, stored.key, stored.generation],
        [alert.source, alert.service, alert.environment, alert.key, alert.generation], "OC-001: archive contains no cross-tuple event links");
      assert.equal(identityArchive.alerts.filter(item => item.events.includes(eventId)).length, 1);
    }
    assert.equal(alert.state, id === stagedAlert.id ? "recovered" : "active",
      "OC-001: recovery-before-trigger stays recovered and leaves the other tuples active");
  }
  let incident = ok(
    await request(
      "/api/command",
      {
        type: "declare",
        service: "checkout",
        title: "Upgrade regression",
        severity: "critical",
        summary: "Old accounts affected after release",
        alerts: [admittedAlert],
      },
      cookie,
    ),
  );
  await awaitingCoordinationAuthority({ origin, request, cookie, incident: incident.id });
  const mutate = async (data) => {
    incident = ok(
      await request(
        "/api/command",
        { incident: incident.id, revision: incident.revision, ...data },
        cookie,
      ),
    );
    return incident;
  };
  const acknowledgement = await auditedMutation(cookie, () => request("/api/command", {
    incident: incident.id, revision: incident.revision, type: "transition", state: "acknowledged", summary: "Taking responsibility",
  }, cookie));
  incident = ok(acknowledgement.response);
  assert.equal(acknowledgement.after.incidents.find(item => item.id === incident.id).state, "acknowledged");
  ok(
    await request(
      "/api/command",
      { type: "note", incident: incident.id, revision: 1, text: "stale" },
      cookie,
    ),
    409,
  );
  const concurrently = await Promise.all([
    request(
      "/api/command",
      {
        type: "note",
        incident: incident.id,
        revision: incident.revision,
        text: "parallel one",
      },
      cookie,
    ),
    request(
      "/api/command",
      {
        type: "note",
        incident: incident.id,
        revision: incident.revision,
        text: "parallel two",
      },
      cookie,
    ),
  ]);
  assert.deepEqual(concurrently.map((v) => v.status).sort(), [200, 409]);
  incident = concurrently.find((v) => v.status === 200).value;
  await mutate({ type: "runbook", index: 0, done: true });
  await mutate({
    type: "transition",
    state: "mitigating",
    summary: "Mitigation is being reviewed",
  });
  const beforeSourceRecovery = ok(await request("/api/archive", undefined, cookie));
  ok(
    await request(
      "/api/ingress/monitor",
      { ...event, eventId: "recover", intent: "recover" },
      "",
      { authorization: "Bearer " + key },
    ),
    201,
  );
  assert.equal(
    ok(await request("/api/state", undefined, cookie)).incidents[0].state,
    "mitigating",
  );
  const afterSourceRecovery = ok(await request("/api/archive", undefined, cookie));
  const sourceRecoveredIncident=afterSourceRecovery.incidents.find(i=>i.id===incident.id),priorIncident=beforeSourceRecovery.incidents.find(i=>i.id===incident.id);
  assert.equal(sourceRecoveredIncident.state,priorIncident.state,"OC-001: source recovery never resolves a declared human incident");
  assert.deepEqual(sourceRecoveredIncident.timeline.slice(0,-1),priorIncident.timeline,"the complete human timeline is preserved before the attributed OC-056 marker");
  assert.equal(sourceRecoveredIncident.timeline.at(-1).kind,'source-recovery');
  assert.equal(sourceRecoveredIncident.sourceRecovery.reminder.commander,priorIncident.commander);assert.equal(sourceRecoveredIncident.sourceRecovery.reminder.automatic,false);
  assert.deepEqual({...sourceRecoveredIncident,revision:priorIncident.revision,timeline:priorIncident.timeline,sourceRecovery:undefined},{...priorIncident,sourceRecovery:undefined},"OC-056 adds only its attributed marker, reminder and revision; authored incident fields stay intact");
  assert.deepEqual(afterSourceRecovery.incidents.filter(i=>i.id!==incident.id),beforeSourceRecovery.incidents.filter(i=>i.id!==incident.id));
  incident=sourceRecoveredIncident;
  assert.equal(afterSourceRecovery.alerts.find(alert => alert.id === admittedAlert).state, "recovered");
  assert.deepEqual(afterSourceRecovery.alerts.filter(alert => alert.id !== admittedAlert),
    beforeSourceRecovery.alerts.filter(alert => alert.id !== admittedAlert),
    "OC-001: delayed recovery of the older generation leaves the newer generation, other source and staging alert unchanged");
  await mutate({
    type: "transition",
    state: "recovered",
    summary: "Affected journey verified",
    evidence: "https://example.test/recovery",
  });
  await mutate({
    type: "transition",
    state: "resolved",
    summary: "Sufficient exposure observed",
  });
  await mutate({
    type: "review",
    text: "Cause: missing migration. Repair verified against preserved customer behavior.",
  });
  await mutate({
    type: "action",
    title: "Guard prior-data upgrades",
    owner: admin.id,
    due: "2026-10-03",
  });
  await mutate({
    type: "complete",
    action: incident.actions[0].id,
    evidence: "https://example.test/regression",
  });
  const before = ok(await request("/api/state", undefined, cookie));
  const replay = ok(await request("/api/replay", { events: [event] }, cookie));
  assert.equal(replay.sideEffects, false);
  assert.deepEqual(ok(await request("/api/state", undefined, cookie)), before);
  const rotatedNativeKey = randomBytes(32).toString("hex");
  const rotation = await auditedMutation(cookie, () => request("/api/sources", {
    id: "monitor", key: rotatedNativeKey, scopes: [service.id, stagingService.id],
  }, cookie));ok(rotation.response);
  ok(await request("/api/ingress/monitor", { ...event, eventId: "retired-native-key" }, "", { authorization: "Bearer " + key }), 401);
  const revocation = await auditedMutation(cookie, () => request("/api/sources/monitor/revoke", {}, cookie));ok(revocation.response);
  ok(await request("/api/ingress/monitor", { ...event, eventId: "revoked-native-key" }, "", { authorization: "Bearer " + rotatedNativeKey }), 401);
  for (const mutation of [rotation, revocation])
    assert.ok(mutation.committed.some(row => row.source === admittedSource), "rotation and revocation retain the admitted source's random audit alias");
  const auditText = JSON.stringify(await auditExport(cookie)).toLowerCase();
  const privateValues = ["Admin", "Viewer", "synthetic-local-testing-password", "synthetic-viewer-testing-password", key, signedKey, rotatedNativeKey,
    event.title, "Sufficient exposure observed", "Taking responsibility", "+61400123987", cookie.split("=")[1], admin.id, viewer.id,
    ...rows("SELECT salt,digest FROM credentials").flatMap(row => [row.salt, row.digest]),
    ...rows("SELECT digest,signing_custody FROM sources").flatMap(row => [row.digest, row.signing_custody]).filter(Boolean)];
  for (const value of privateValues) assert.ok(!auditText.includes(value.length < 10 ? JSON.stringify(value.toLowerCase()) : value.toLowerCase()), "audit export contains no names, passwords, messages, phones, tokens or credential material");
  const archive = ok(await request("/api/archive", undefined, cookie));
  for (const alias of [grantEntry.actor, grantEntry.subject, admittedSource])
    assert.ok(!JSON.stringify(archive).includes(alias), "workspace archives exclude audit aliases and their identity mappings");
  const invalid = structuredClone(archive);
  invalid.services[0].owner = "unknown";
  ok(
    await request(
      "/api/restore",
      { mode: "replace", archive: invalid },
      cookie,
    ),
    400,
  );
  assert.deepEqual(
    ok(await request("/api/archive", undefined, cookie)),
    archive,
  );
  sql(
    "CREATE TRIGGER deny_session_revocation BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT,'injected failure'); END",
  );
  const changed = structuredClone(archive);
  changed.services[0].name = "should rollback";
  ok(
    await request(
      "/api/restore",
      { mode: "replace", archive: changed },
      cookie,
    ),
    503,
  );
  assert.deepEqual(
    ok(await request("/api/archive", undefined, cookie)),
    archive,
  );
  sql("DROP TRIGGER deny_session_revocation");
  const auditBeforeRestore = await auditExport(cookie);
  const importReceipt = await request(
    "/api/restore",
    { mode: "replace", archive },
    cookie,
  );
  ok(importReceipt);
  cookie = importReceipt.cookie;
  const auditAfterRestore = new Map((await auditExport(cookie)).rows.map(row => [row.id, row]));
  for (const row of auditBeforeRestore.rows) assert.deepEqual(auditAfterRestore.get(row.id), row, "restoring application state preserves permanent audit history");
  const restored = ok(await request("/api/archive", undefined, cookie));
  delete restored.revision;
  delete archive.revision;
  assert.deepEqual(restored, archive);
  assert.deepEqual(restored.incidents.find(item => item.id === incident.id), incident,
    "OC-008: export/restore preserves the complete authored incident, runbook, timeline, review and actions");
  ok(await request("/api/state", undefined, vc), 401);
  ok(
    await request(
      "/api/ingress/monitor",
      { ...event, eventId: "post-import" },
      "",
      { authorization: "Bearer " + key },
    ),
    401,
  );
  const currentArchive = ok(await request("/api/archive", undefined, cookie));
  const restores = await Promise.all([
    request(
      "/api/restore",
      { mode: "replace", archive: currentArchive },
      cookie,
    ),
    request(
      "/api/restore",
      { mode: "replace", archive: currentArchive },
      cookie,
    ),
  ]);
  const successes = restores.filter((r) => r.status === 200);
  assert.ok(successes.length >= 1, JSON.stringify(restores));
  assert.ok(restores.every((r) => [200, 409, 401].includes(r.status)));
  const valid = [];
  for (const receipt of successes) {
    if ((await request("/api/state", undefined, receipt.cookie)).status === 200)
      valid.push(receipt);
  }
  assert.ok(
    valid.length >= 1,
    "A losing same-archive restore must not revoke the winner session",
  );
  cookie = valid.at(-1).cookie;
  const handoff = ok(
    await request("/api/handoff/" + incident.id, undefined, cookie),
  );
  assert.equal(handoff.lamp.publication, "not-published");
  assert.deepEqual(handoff.providerActions, []);
  const maintenanceRuntimeKey=randomBytes(32).toString('hex'),maintenanceRuntimeId='synthetic-oncall-43-runtime';
  ok(await request('/api/command',{type:'service',id:maintenanceRuntimeId,name:maintenanceRuntimeId,environment:'test',owner:admin.id,runbook:[],pager:''},cookie));
  const maintenanceRuntimeWindow={start:new Date(Date.now()-60000).toISOString(),end:new Date(Date.now()+3600000).toISOString()};
  const maintenanceRuntimePolicy=ok(await request('/api/command',{type:'policy',service:maintenanceRuntimeId,severity:'*',action:'suppress',owner:admin.id,reason:'synthetic-oncall-43 restart custody',baseVersion:0,suppressionWindow:maintenanceRuntimeWindow},cookie));
  ok(await request('/api/sources',{id:maintenanceRuntimeId,key:maintenanceRuntimeKey,scopes:[maintenanceRuntimeId]},cookie));
  const maintenanceRuntimeSignal={source:maintenanceRuntimeId,eventId:maintenanceRuntimeId,service:maintenanceRuntimeId,environment:'test',key:maintenanceRuntimeId,generation:maintenanceRuntimeId,intent:'trigger',severity:'warning',title:maintenanceRuntimeId,observedAt:new Date().toISOString(),evidence:''};
  const maintenanceRuntimeSend=()=>request('/api/ingress/'+maintenanceRuntimeId,maintenanceRuntimeSignal,'',{authorization:'Bearer '+maintenanceRuntimeKey});
  const maintenanceRuntimeReceipt=ok(await maintenanceRuntimeSend(),201),maintenanceRuntimeState=ok(await request('/api/state',undefined,cookie));
  const maintenanceRuntimeEvent=maintenanceRuntimeState.events.find(row=>row.id===maintenanceRuntimeReceipt.id);assert.equal(maintenanceRuntimeEvent.decision.action,'suppress');assert.equal(maintenanceRuntimeEvent.decision.owner,admin.id);assert.equal(maintenanceRuntimeEvent.decision.version,maintenanceRuntimePolicy.version);
  await stop();
  migration();
  await start();
  assert.equal(
    ok(await request("/api/state", undefined, cookie)).incidents[0].review,
    incident.review,
  );
  assert.deepEqual(ok(await request("/api/state", undefined, cookie)).incidents.find(item => item.id === incident.id), incident,
    "OC-008: a Worker restart and repeated migrations preserve every authored incident field");
  const maintenanceRestarted=ok(await request('/api/state',undefined,cookie));assert.deepEqual(maintenanceRestarted.events.find(row=>row.id===maintenanceRuntimeReceipt.id),maintenanceRuntimeEvent);assert.deepEqual(maintenanceRestarted.policies.find(row=>row.id===maintenanceRuntimePolicy.id),maintenanceRuntimePolicy);
  assert.equal(ok(await maintenanceRuntimeSend()).duplicate,true);assert.deepEqual(ok(await request('/api/state',undefined,cookie)),maintenanceRestarted,'OC-043 restart never replays a maintenance admission or its recorded obligation');
  console.log('PASS OC-043 runtime: maintenance policy, immutable explanation and owned suppressed signal survive restart; duplicate admission adds no workflow or obligation');
  const maintenanceRemoved=ok(await request('/api/command',{type:'policy',service:maintenanceRuntimeId,severity:'*',action:'route',owner:admin.id,reason:'synthetic-oncall-43 maintenance removed',baseVersion:maintenanceRuntimePolicy.version},cookie));assert.equal(maintenanceRemoved.suppressionWindow,undefined);
  const afterRemoval=ok(await request('/api/ingress/'+maintenanceRuntimeId,{...maintenanceRuntimeSignal,eventId:maintenanceRuntimeId+'-after'},'',{authorization:'Bearer '+maintenanceRuntimeKey}),201),removedWindowState=ok(await request('/api/state',undefined,cookie));
  const afterRemovalAlert=removedWindowState.alerts.find(a=>a.events.includes(afterRemoval.id));assert.equal(afterRemovalAlert.suppressed,false);assert.equal(afterRemovalAlert.owner,admin.id);assert.deepEqual(removedWindowState.events.find(e=>e.id===maintenanceRuntimeReceipt.id),maintenanceRuntimeEvent,'removing maintenance releases the next observation without rewriting the original');
  console.log('PASS OC-043 removing maintenance routes the next observation of the retained alert group');
  const runtimeGrouping=ok(await request('/api/command',{type:'policy',service:maintenanceRuntimeId,severity:'*',action:'route',owner:admin.id,reason:'Synthetic restart-safe grouping',baseVersion:maintenanceRemoved.version,correlation:{field:'key',windowSeconds:300,includeDependencies:false,flappingCount:0}},cookie));
  const runtimeGroupA=ok(await request('/api/ingress/'+maintenanceRuntimeId,{...maintenanceRuntimeSignal,eventId:'synthetic-oncall-436-a',key:'synthetic-oncall-436',generation:'synthetic-oncall-436-a'},'',{authorization:'Bearer '+maintenanceRuntimeKey}),201),runtimeGroupBefore=ok(await request('/api/state',undefined,cookie)),runtimeOriginal=runtimeGroupBefore.events.find(e=>e.id===runtimeGroupA.id);
  await stop();migration();await start();assert.deepEqual(ok(await request('/api/state',undefined,cookie)).events.find(e=>e.id===runtimeGroupA.id),runtimeOriginal);
  const runtimeGroupInput={...maintenanceRuntimeSignal,eventId:'synthetic-oncall-436-b',key:'synthetic-oncall-436',generation:'synthetic-oncall-436-b'},runtimeGroupB=ok(await request('/api/ingress/'+maintenanceRuntimeId,runtimeGroupInput,'',{authorization:'Bearer '+maintenanceRuntimeKey}),201),runtimeGroupAfter=ok(await request('/api/state',undefined,cookie));
  assert.equal(runtimeGroupAfter.events.find(e=>e.id===runtimeGroupB.id).decision.correlation.originalEvent,runtimeOriginal.id);assert.equal(runtimeOriginal.decision.version,runtimeGrouping.version);ok(await request('/api/ingress/'+maintenanceRuntimeId,runtimeGroupInput,'',{authorization:'Bearer '+maintenanceRuntimeKey}));assert.deepEqual(ok(await request('/api/state',undefined,cookie)),runtimeGroupAfter,'restart and duplicate intake add no second grouping effect');
  console.log('PASS OC-043 correlation restart: frozen original and version survive migration/restart, next source generation joins once, duplicate admission adds no action');

  // OC-043 durable coordination reuses bounded triage commits; the saved plan survives a closed client and restart.
  const workflowMember=ok(await request('/api/members',{name:'synthetic-oncall-437',role:'responder',password:'synthetic-oncall-437-password'},cookie),201);
  const workflowThird=ok(await request('/api/ingress/'+maintenanceRuntimeId,{...maintenanceRuntimeSignal,eventId:'synthetic-oncall-437-c',key:'synthetic-oncall-437',generation:'synthetic-oncall-437-c'},'',{authorization:'Bearer '+maintenanceRuntimeKey}),201);
  const workflowBefore=ok(await request('/api/state',undefined,cookie));
  const workflowAlerts=[runtimeGroupA.id,runtimeGroupB.id,workflowThird.id].map(event=>workflowBefore.alerts.find(alert=>alert.events.includes(event)));
  const workflowInput={operationId:'synthetic-oncall-437-workflow',action:'reassign',items:workflowAlerts.map(alert=>({id:alert.id,revision:alert.revision??1,kind:'alert'})),member:workflowMember.id,reason:'Synthetic ordered coordination',confirmedCount:3,durable:true};
  const workflowViewer=ok(await request('/api/members',{name:'synthetic-oncall-438',role:'viewer',password:'synthetic-oncall-438-password'},cookie),201),workflowViewerLogin=await request('/api/login',{name:workflowViewer.name,password:'synthetic-oncall-438-password'});
  const workflowFirst=ok(await request('/api/triage/bulk',workflowInput,cookie));
  assert.equal(workflowFirst.remaining,1);assert.equal(workflowFirst.results.length,2);assert.ok(workflowFirst.results.every(result=>result.ok));
  const workflowHeld=ok(await request('/api/state',undefined,cookie)),workflowRecord=workflowHeld.triage.find(row=>row.id===workflowInput.operationId);
  assert.deepEqual(workflowRecord.workflow.items,workflowInput.items);assert.equal(workflowHeld.alerts.find(alert=>alert.id===workflowAlerts[2].id).coordination,undefined);
  await stop();migration();await start();
  assert.deepEqual(ok(await request('/api/state',undefined,cookie)),workflowHeld,'restart neither loses the plan nor runs a pending step');
  const resumePath='/api/triage/workflows/'+workflowInput.operationId+'/resume';
  ok(await request(resumePath,{approve:true}),401);ok(await request(resumePath,{approve:true},workflowViewerLogin.cookie),403);
  ok(await request(resumePath,{approve:false},cookie),403);
  sql("CREATE TRIGGER synthetic_oncall_437_audit BEFORE INSERT ON oc_admin_audit WHEN NEW.kind='triage.reassign' BEGIN SELECT RAISE(ABORT,'synthetic-oncall-437'); END");
  try{const failed=ok(await request(resumePath,{approve:true},cookie));assert.equal(failed.interrupted,true);assert.equal(failed.remaining,1);}finally{sql('DROP TRIGGER synthetic_oncall_437_audit')}
  assert.deepEqual(ok(await request('/api/state',undefined,cookie)),workflowHeld,'audit failure rolls back both item effect and progress');
  const resumed=ok(await request(resumePath,{approve:true},cookie));assert.equal(resumed.remaining,0);assert.ok(resumed.results.every(result=>result.ok));
  const workflowAfter=ok(await request('/api/state',undefined,cookie));
  for(const alert of workflowAlerts){const current=workflowAfter.alerts.find(row=>row.id===alert.id);assert.equal(current.coordination.assignee,workflowMember.id);assert.equal(current.coordination.history.filter(entry=>entry.operationId===workflowInput.operationId).length,1);}
  ok(await request(resumePath,{approve:true},cookie));assert.deepEqual(ok(await request('/api/state',undefined,cookie)),workflowAfter,'completed workflow replay repeats no mutation');
  const refusedInput={...workflowInput,operationId:'synthetic-oncall-439-workflow',member:null,items:workflowInput.items.map(item=>({...item,revision:workflowAfter.alerts.find(alert=>alert.id===item.id).revision}))};
  assert.equal(ok(await request('/api/triage/bulk',refusedInput,cookie)).remaining,1);
  const staleStep=workflowAfter.alerts.find(alert=>alert.id===workflowAlerts[2].id);
  ok(await request('/api/triage/bulk',{operationId:'synthetic-oncall-439-stale',action:'set-priority',priority:'P2',reason:'Synthetic concurrent edit',items:[{id:staleStep.id,revision:staleStep.revision,kind:'alert'}],confirmedCount:1},cookie));
  const refusal=ok(await request('/api/triage/workflows/'+refusedInput.operationId+'/resume',{approve:true},cookie));assert.equal(refusal.remaining,0);assert.equal(refusal.results.filter(result=>!result.ok).length,1);assert.match(refusal.results.at(-1).error,/changed/i);
  const refusalHeld=ok(await request('/api/state',undefined,cookie));await stop();await start();assert.deepEqual(ok(await request('/api/state',undefined,cookie)),refusalHeld,'a refused step remains durably complete across restart');
  const workflowAudit=ok(await request('/api/audit/export',undefined,cookie)).rows;
  assert.ok(workflowAudit.some(row=>row.kind==='triage.reassign'&&row.outcome==='accepted'&&row.workspaceAfter===row.workspaceBefore+1),'each accepted workflow step has an atomic audit revision');
  assert.ok(workflowAudit.some(row=>row.kind==='triage.reassign'&&['failed','uncertain'].includes(row.outcome)),'interrupted execution has a permanent outcome');
  assert.ok(!JSON.stringify(workflowAudit).includes(workflowMember.name));
  const malformedWorkflow=ok(await request('/api/archive',undefined,cookie));malformedWorkflow.triage.find(row=>row.id===workflowInput.operationId).workflow.items[0].kind='incident';
  ok(await request('/api/restore',{mode:'replace',archive:malformedWorkflow},cookie),400);
  const workflowErase=ok(await request('/api/erasure/member/'+workflowMember.id,{workspaceRevision:refusalHeld.revision,confirmation:'erase '+workflowMember.id,identitiesReviewed:true,importedPeople:[]},cookie));assert.equal(workflowErase.state,'complete');
  assert.ok(!ok(await request('/api/archive',undefined,cookie)).triage.some(row=>row.id===workflowInput.operationId),'erasure removes the saved recipient plan and its copied reason');
  ok(await request(resumePath,{approve:true},cookie),404);
  console.log('PASS OC-043 durable coordination workflow: frozen ordered plan, two committed steps, restart mid-workflow, explicit authorized resume, atomic audit-failure rollback with interrupted outcome, exact-once completion/replay and member-erasure/export custody');



  ok(
    await request(
      "/api/command",
      { type: "member", id: viewer.id, role: "viewer", active: false },
      cookie,
    ),
  );
  ok(
    await request("/api/login", {
      name: "Viewer",
      password: "synthetic-viewer-testing-password",
    }),
    401,
  );
  await coordinationHealth({origin,request,sql,deployment,cookie});
  ok(await request("/api/logout", {}, cookie));
  assert.match(await (await fetch(origin, { headers: { cookie } })).text(), /href="\/setup"/, "a revoked password session receives the guest Lobby");
  ok(await request("/api/state", undefined, cookie), 401);
  ok(await request("/api/audit/export", undefined, cookie), 401);
  await stop();
  portablePersist = await mkdtemp(join(tmpdir(), "oncall-portable-"));
  persist = portablePersist;
  migration();
  await start();
  const fresh = await request("/api/setup", {
    name: "New local admin",
    password: "synthetic-fresh-target-password",
  });
  ok(fresh);
  const mapped = await request(
    "/api/restore",
    {
      mode: "replace",
      archive: { ...archive, revision: 0 },
      adminMapping: admin.id,
    },
    fresh.cookie,
  );
  ok(mapped);
  const exported = ok(await request("/api/archive", undefined, mapped.cookie));
  delete exported.revision;
  assert.deepEqual(exported, archive);
  ok(
    await request("/api/login", {
      name: "Admin",
      password: "synthetic-local-testing-password",
    }),
    401,
  );
  ok(
    await request("/api/login", {
      name: "Admin",
      password: "synthetic-fresh-target-password",
    }),
  );
  ok(
    await request("/api/login", {
      name: "Viewer",
      password: "synthetic-viewer-testing-password",
    }),
    401,
  );
  ok(
    await request(
      "/api/password",
      { member: viewer.id, password: "new-viewer-password" },
      mapped.cookie,
    ),
  );
  ok(
    await request("/api/login", {
      name: "Viewer",
      password: "new-viewer-password",
    }),
  );
  console.log(
    "PASS OC-041 accepted state and its audit entry commit together, survive subject erasure and export without secrets; emitted Worker + local D1: setup/session/roles/CSRF, scoped bearer and raw-body HMAC ingress, identities, concurrent CAS, incident/recovery/runbook/review/follow-up, replay purity, archive equality/rollback, session invalidation, restart and repeat migration, truthful handoffs.",
  );
} finally {
  if (worker && worker.exitCode === null) await stop();
  await rm(originalPersist, { recursive: true, force: true });
  if (portablePersist)
    await rm(portablePersist, { recursive: true, force: true });
}

// The scoped machine and outbound execution class extends the emitted-HTTP runtime journey.
await import("./automation.mjs");
