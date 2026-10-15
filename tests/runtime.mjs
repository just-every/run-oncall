import assert from "node:assert/strict";
import { awaitingCoordinationAuthority } from "./runtime-authority.mjs";
import { heldWorkspace } from "./runtime-held-workspace.mjs";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm, mkdir, readdir, copyFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac, pbkdf2Sync } from "node:crypto";
import { createServer } from "node:net";
// Each request closes its connection: a pooled one the local Worker closed while the test read D1 through wrangler would fail the next request before it is sent.
const fetch = (url, init = {}) => globalThis.fetch(url, { ...init, headers: { ...init.headers, connection: "close" } });
let persist = await mkdtemp(join(tmpdir(), "oncall-test-"));
const port = await new Promise((resolve) => { const s = createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const origin = `http://127.0.0.1:${port}`;
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
  const response = await fetch(origin + path, {
    method: data === undefined ? "GET" : "POST",
    headers: { origin, "content-type": "application/json", cookie, ...headers },
    body: data === undefined ? undefined : JSON.stringify(data),
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
try {
  const legacyDirectory=join(persist,'legacy-migrations');await mkdir(legacyDirectory);
  for(const name of (await readdir('migrations/core')).filter(name=>/^\d{4}_/.test(name) && Number(name.slice(0,4)) < 106))await copyFile(join('migrations/core',name),join(legacyDirectory,name));
  const legacyConfig=join(persist,'legacy.json');await writeFile(legacyConfig,JSON.stringify({name:'oncall-legacy',compatibility_date:'2026-09-08',d1_databases:[{binding:'DB',database_name:'oncall-local',database_id:'00000000-0000-0000-0000-000000000001',migrations_dir:legacyDirectory}]}));
  const initial = spawnSync(process.execPath, [...cli, "d1", "migrations", "apply", "DB", "--config",legacyConfig,"--local", "--persist-to", persist], {encoding:"utf8",env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}});
  assert.equal(initial.status,0,initial.stderr);
  const preserved = JSON.stringify(heldWorkspace());
  sql("INSERT INTO workspace(id,revision,data) VALUES(1,3,'"+preserved.replaceAll("'","''")+"'); INSERT INTO credentials VALUES('prior-admin','prior-salt','"+pbkdf2Sync('local-testing-password','prior-salt',100000,32,'sha256').toString('hex')+"')");
  const oldSchedule={id:'prior-schedule',name:'Prior rota',service:'prior-service',revision:1,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,primary:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:['prior-admin'],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T09:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]};
  const legacyTimer={id:'prior-timer',incident:'retained-orphan',service:'prior-service',revision:1,status:'pending',nextDue:1791710000000,createdAt:1791710000000,lastEvaluatedAt:1791710000000,currentStep:0,policy:{service:'prior-service',scheduleId:'prior-schedule',revision:1,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3},schedule:oldSchedule,behaviors:{primary:'accepted',backup:'accepted'},steps:[],history:[{type:'created',at:1791710000000,actor:null,reason:null,attempt:null}]};
  sql("INSERT INTO paging_jobs VALUES('prior-timer','retained-orphan','prior-service',1,'pending',1791710000000,'prior','"+JSON.stringify(legacyTimer)+"')");
  migration();
  await start();
  const priorLogin=await request('/api/login',{name:'Prior Operator',password:'local-testing-password'});
  ok(priorLogin);
  const door=await fetch(origin+'/signin/local');assert.equal(door.status,200);assert.match(await door.text(),/name="password"/,'held password accounts keep their sign-in door');
  const priorState=ok(await request('/api/state',undefined,priorLogin.cookie));
  assert.deepEqual(priorState,JSON.parse(preserved),'held one-row fixture survives relational migration through HTTP');
  const upgradedTimer=ok(await request('/api/paging/state',undefined,priorLogin.cookie)).jobs.find(job=>job.id==='prior-timer');assert.equal(upgradedTimer.status,'paused');assert.equal(upgradedTimer.nextDue,null);assert.deepEqual(upgradedTimer.history.slice(0,-1),legacyTimer.history,'held timer history preserved while paused');
  await stop();
  migration();
  await start();
  const heldAgain = await request('/api/login', { name: 'Prior Operator', password: 'local-testing-password' });
  ok(heldAgain);
  assert.deepEqual(ok(await request('/api/state', undefined, heldAgain.cookie)), JSON.parse(preserved), 'all held arrays and history survive repeated migration and restart');
  console.log('PASS held upgrade through pre-0106 SQL: full ordered members/services/policies/events/alerts/incidents/audit and nested history unchanged; held password works after upgrade and repeat migration/restart.');
  await stop();
  sql('DELETE FROM paging_jobs; DELETE FROM operator_members; DELETE FROM sessions; DELETE FROM credentials; DELETE FROM workspace_control; '+['members','services','policies','events','alerts','incidents','audit'].map(k=>'DELETE FROM oc_'+k).join(';'));
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
    password: "local-testing-password",
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
  const freshLogin = await request('/api/login', { name: 'Admin', password: 'local-testing-password' });
  ok(freshLogin); cookie = freshLogin.cookie;
  ok(
    await request("/api/setup", {
      name: "second",
      password: "local-testing-password",
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
      { name: "Viewer", role: "viewer", password: "viewer-testing-password" },
      cookie,
    ),
    201,
  );
  const vl = await request("/api/login", {
    name: "Viewer",
    password: "viewer-testing-password",
  });
  ok(vl);
  const vc = vl.cookie;
  ok(await request("/api/state", undefined, vc));
  sql("UPDATE sessions SET expires=0 WHERE member='" + viewer.id + "'");
  ok(await request("/api/state", undefined, vc), 401);
  const vl2 = await request("/api/login", {
    name: "Viewer",
    password: "viewer-testing-password",
  });
  ok(vl2);
  const currentViewerCookie = vl2.cookie;
  ok(await request("/api/state", undefined, currentViewerCookie));
  ok(
    await request("/api/command", { type: "service" }, currentViewerCookie),
    403,
  );
  ok(await request("/api/archive", undefined, currentViewerCookie), 403);
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
  ok(
    await request(
      "/api/sources",
      { id: "monitor", key, scopes: ["checkout"] },
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
    title: "Old accounts cannot upgrade",
    observedAt: "2026-10-02T12:00:00Z",
    evidence: "https://example.test/check",
  };
  ok(await request("/api/ingress/monitor", event), 401);
  const first = ok(
    await request("/api/ingress/monitor", event, "", {
      authorization: "Bearer " + key,
    }),
    201,
  );
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
      { id: "signed", key: signedKey, mode: "signed", scopes: ["checkout"] },
      cookie,
    ),
  );
  const se = { ...event, source: "signed", eventId: "signed-one" };
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
  await receipt(signed, se, false);
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
  await mutate({
    type: "transition",
    state: "acknowledged",
    summary: "Taking responsibility",
  });
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
  const archive = ok(await request("/api/archive", undefined, cookie));
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
  const importReceipt = await request(
    "/api/restore",
    { mode: "replace", archive },
    cookie,
  );
  ok(importReceipt);
  cookie = importReceipt.cookie;
  const restored = ok(await request("/api/archive", undefined, cookie));
  delete restored.revision;
  delete archive.revision;
  assert.deepEqual(restored, archive);
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
  await stop();
  migration();
  await start();
  assert.equal(
    ok(await request("/api/state", undefined, cookie)).incidents[0].review,
    incident.review,
  );
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
      password: "viewer-testing-password",
    }),
    401,
  );
  ok(await request("/api/logout", {}, cookie));
  assert.match(await (await fetch(origin, { headers: { cookie } })).text(), /href="\/setup"/, "a revoked password session receives the guest Lobby");
  ok(await request("/api/state", undefined, cookie), 401);
  sql("ALTER TABLE workspace_control RENAME TO workspace_fault");
  ok(await request("/health"), 503);
  ok(await request("/api/state", undefined, cookie), 503);
  sql("ALTER TABLE workspace_fault RENAME TO workspace_control");
  ok(await request("/health"));
  await stop();
  portablePersist = await mkdtemp(join(tmpdir(), "oncall-portable-"));
  persist = portablePersist;
  migration();
  await start();
  const fresh = await request("/api/setup", {
    name: "New local admin",
    password: "fresh-target-password",
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
      password: "local-testing-password",
    }),
    401,
  );
  ok(
    await request("/api/login", {
      name: "Admin",
      password: "fresh-target-password",
    }),
  );
  ok(
    await request("/api/login", {
      name: "Viewer",
      password: "viewer-testing-password",
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
    "PASS emitted Worker + local D1: setup/session/roles/CSRF, scoped bearer and raw-body HMAC ingress, identities, concurrent CAS, incident/recovery/runbook/review/follow-up, replay purity, archive equality/rollback, session invalidation, restart and repeat migration, truthful handoffs.",
  );
} finally {
  if (worker && worker.exitCode === null) await stop();
  await rm(originalPersist, { recursive: true, force: true });
  if (portablePersist)
    await rm(portablePersist, { recursive: true, force: true });
}
