import { authorizedState, body, installMemberGuard, session, sessionGuard } from './api-member';
import { installCommand } from './command-api';
import { installHeldKeys } from './api-keys';
import { saveWorkspace as save } from './workspace-write';
import { createApi } from './api-boundary';
import { installNativeIngress } from './native-ingress';
import { checkedInstallationName, savedInstallationName } from './brand/installation';
import {installReadiness} from './readiness/api';
import {installTeams} from './teams/api';
import {auditRefusalCommitted} from './audit-store';
import {holdRuleWorkflows} from './orchestration/workflows';
import {replayService} from './orchestration/replay.ts';
import { requireHandoffErasureFence, subjectErasureIdentity } from './subject-erasure-identity.ts'
import { installSubjectErasure } from './subject-erasure'
import {installScheduleCoordination} from './schedule-coordination/api';
import {holdScheduleRecords} from './schedule-coordination/model';
import {holdDeadlines} from './incident-deadlines/model.ts';
import { holdManualRecords } from './manual-pages/archive';
import { pagingSnapshot } from './paging-store';
import { installBusinessStatus } from './business-status/api';
import { holdBusinessStatus, refreshBusinessStatus } from './business-status/model';
import {installOnCallNotifications} from './family/response-operations/on-call-notifications/api';
import { installResponsePolicy } from './response-policy/api';
import { requireErasureFence, erasureFenceCondition, fenceValues } from './erasure-fence'
import {hydrateNativePrefixes,requireNativePrefixValues} from './native-prefix-store';
import {installAllowances} from './intake-rate/management';
import { installVersionedApi, installAutomationManagement } from './automation/api'
import { holdAutomation } from './automation/model'
import { emailErasureFence } from './email/fence'
import { installEmailManagement } from './email/api'
import { auditIdentity, setAuditSubject } from './audit-store'
import { installMonitoringSigning } from './monitoring/signing';
import { installMonitoringIntake } from './monitoring/api';
import { installCompatibleIntake } from './intake/api';
import { installRoutingManagement } from './routing/management';
import { installUrgency } from './urgency/api';
import { serviceUrgency } from './urgency/model';
import { installIntakeManagement } from './intake/management';
import { pauseIntakeSources } from './intake/model';
import { installReviews } from './reviews/api';
import { installChangeIntake, installChangeManagement } from "./changes/api";
import { pauseChangeSources } from "./changes/model";
import { saveTriageItem } from "./triage-store";
import { installTriage } from "./triage-api";
import { memberWorkspace } from "./workspace-visibility";
import { linkRestoredOwner, restoredAdministrators } from './identity-link';
import { checkWorkspaceSize, loadWorkspace, workspaceWrite, workspaceRows } from './workspace-store';
import {installKeyReveal} from './integrations/key-reveal';
import { installNativeSources } from './native-sources';
import { runtimeBindings, type Bindings } from './auth.server';
import { installSchedules } from './schedule-api';
import { installWorkspaceReads } from './workspace-read-api';
import { installMoveIn } from './move-in/api';
import { deploymentHealth } from "./base/deployment-health";
import { installPaging } from "./paging-api";
import { installSmsPaging } from "./sms-paging/api";
import { senderConfigured } from "./sms-paging/twilio";
import { recoverySnapshot, prepareCheckpointReplacement, prepareCoordinationRestore } from "./paging-store";
import { createRecoveryCheckpoint } from "./family/response-operations/recovery";
import { createRecoveryCheckpointV2, validateAnyRecoveryCheckpoint } from "./family/response-operations/recovery-v2";
import { holdHandoffsForRecovery } from "./family/response-operations/handoffs";
import { prepareHandoffReplacement } from "./handoff-store";
import { installHandoffs } from "./handoff-api";
import { preparePagingImport } from "./family/response-operations/paging-archive";
import { handoff } from "./family/response-operations/integrations";
import { readSessionCookie, sessionCookieLine } from "./session-cookie";
import {
  empty,
  route,
  signalInput,
  validateArchive,
  fail,
  text,
  type State,
  type Member,
} from "./family/response-operations/domain";
const api = createApi();
const hash = async (v: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
const password = async (value: string, salt: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(value),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: new TextEncoder().encode(salt),
          iterations: 100000,
        },
        key,
        256,
      ),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
};
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};
const load = loadWorkspace;
// JSON custody doors keep their request limits; larger installations use the streaming portable export.
const archiveRestoreLimit = 2000000, checkpointRestoreLimit = 1000000 + 5 * 1024 * 1024 + 1024;
// Readiness authenticates without the ordinary read path’s key/owner maintenance.
installReadiness(api);
// Workspace and coverage reads use current member authority without loading signing custody.
installWorkspaceReads(api);
installHeldKeys(api);
api.get("/health", async (c) => {
  const identity = deploymentHealth(c.env);
  // The same source GET /api/paging/sms reads: whether this Worker has an SMS sender. Never a credential or number.
  const scope = { paging: senderConfigured(c.env) ? "configured" : "not-configured", target: "coordination" };
  try {
    await c.env.DB.prepare("SELECT revision FROM workspace_control WHERE id=1").first();
    return c.json({ ...identity, ...scope, status: "ok", storage: "available" });
  } catch (error) {
    console.error("oncall health storage failure", error instanceof Error ? error.name : "Error");
    return c.json({ ...identity, ...scope, ok: false, status: "unavailable", storage: "unavailable",
      error: "Storage or server failure; no success confirmed" }, 503);
  }
});
api.get("/api/session", async (c) => {
  const member = await session(c);
  const hasMembers = member || await c.env.DB.prepare('SELECT 1 FROM oc_members LIMIT 1').first();
  return c.json({setup: !hasMembers, member, demo: c.env.RER_DEMO === "1"});
});
async function issue(c: any, member: Member, credentials: { salt: string; digest: string }, revision: number) {
  auditIdentity(c.env.DB,{actor:{kind:"member",id:member.id}});
  const token = crypto.randomUUID() + crypto.randomUUID();
  // Password verification may yield while access is revoked or restored. The
  // captured membership revision and exact credential must still be current.
  const inserted = await c.env.DB.prepare("INSERT INTO sessions(token,member,expires) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND revision=?) AND EXISTS(SELECT 1 FROM credentials WHERE member=? AND salt=? AND digest=?)")
    .bind(await hash(token), member.id, Date.now() + 43200000, revision, member.id, credentials.salt, credentials.digest)
    .run();
  if (inserted.meta.changes !== 1) fail("Sign-in state changed; sign in again", 401);
  return sessionResponse(c, token, member);
}
function sessionResponse(c: any, token: string, member: Member, details: Record<string, unknown> = {}) {
  c.header("Set-Cookie", sessionCookieLine(c.req.raw, token, 43200));
  return c.json({ ...details, member });
}
api.post("/api/setup", async (c) => {
  const input = await body(c);
  const name = text(input.name, "name", 100);
  const pass = text(input.password, "password", 200);
  if (pass.length < 12) fail("Use at least 12 password characters");
  const state = empty();
  const member: Member = {
    id: crypto.randomUUID(),
    name,
    role: "admin",
    active: true,
  };
  state.members.push(member);
  auditIdentity(c.env.DB,{actor:{kind:"member",id:member.id},subject:{kind:"member",id:member.id}});
  const salt = crypto.randomUUID();
  const digest = await password(pass, salt);
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO workspace_control(id,revision,write_token) VALUES(1,0,?)",
      ).bind(member.id),
      ...workspaceRows(c.env.DB,state,member.id),
      c.env.DB.prepare("INSERT INTO credentials(member,salt,digest) VALUES(?,?,?)").bind(
        member.id,
        salt,
        digest,
      ),
    ]);
  } catch {
    fail("Installation already initialized or storage unavailable", 409);
  }
  return issue(c, member, { salt, digest }, state.revision);
});
api.post("/api/login", async (c) => {
  const input = await body(c);
  const loginName =
    typeof input.name === "string" ? input.name.slice(0, 100) : "";
  // Active account counters keep their exact existing key and window. Only a
  // name revoked by committed erasure uses a content-free key for later refusals.
  const erasedLogin=await subjectErasureIdentity('login',loginName.toLowerCase());
  const throttle = await c.env.DB.prepare(
    "INSERT INTO login_attempts(name,attempts,reset) SELECT CASE WHEN EXISTS(SELECT 1 FROM oc_erasure_fences WHERE id=?) AND NOT EXISTS(SELECT 1 FROM oc_members WHERE json_extract(data,'$.name')=? AND json_extract(data,'$.active')=1) THEN ? ELSE ? END,1,? WHERE 1 ON CONFLICT(name) DO UPDATE SET attempts=CASE WHEN reset<? THEN 1 ELSE attempts+1 END,reset=CASE WHEN reset<? THEN excluded.reset ELSE reset END RETURNING attempts",
  )
    .bind(erasedLogin, loginName, "erased:"+erasedLogin, loginName, Date.now() + 60000, Date.now(), Date.now())
    .first<{ attempts: number }>();
  if ((throttle?.attempts ?? 99) > 10)
    fail("Too many attempts; retry in one minute", 429);
  const state = await load(c.env.DB);
  const member = state.members.find((m) => m.name === input.name && m.active);
  const record = member
    ? await c.env.DB.prepare("SELECT * FROM credentials WHERE member=?")
        .bind(member.id)
        .first<{ salt: string; digest: string }>()
    : null;
  const digest = await password(
    typeof input.password === "string" ? input.password.slice(0, 200) : "",
    record?.salt ?? "unknown-user",
  );
  if (!record || !member || !safeEqual(record.digest, digest))
    fail("Invalid sign-in", 401);
  return issue(c, member, record, state.revision);
});
api.post("/api/logout", async (c) => {
  await session(c);
  const token = readSessionCookie(c.req.raw);
  if (token)
    await c.env.DB.prepare("DELETE FROM sessions WHERE token=?")
      .bind(await hash(token))
      .run();
  c.header("Set-Cookie", sessionCookieLine(c.req.raw, "", 0));
  return c.json({ ok: true });
});
installNativeIngress(api, { load, save });
const changeDeps = {body, load, state: authorizedState, save, guard: sessionGuard};
installVersionedApi(api, changeDeps);
installChangeIntake(api, changeDeps);
installCompatibleIntake(api, changeDeps);
installMonitoringIntake(api, changeDeps);
api.get("/api/identity-link/administrators",restoredAdministrators);
api.post("/api/identity-link",async c=>linkRestoredOwner(c,await body(c)));
installMemberGuard(api);
installBusinessStatus(api, {...changeDeps, state: (c: any) => authorizedState(c, false, true)});
installAutomationManagement(api, changeDeps);
installKeyReveal(api,changeDeps);
installChangeManagement(api, changeDeps);
installSubjectErasure(api, changeDeps);
installMonitoringSigning(api, changeDeps);
installNativeSources(api, changeDeps);
installIntakeManagement(api, changeDeps);
installEmailManagement(api, changeDeps);
installRoutingManagement(api, changeDeps);
installAllowances(api, changeDeps);
installUrgency(api, changeDeps);
installResponsePolicy(api, changeDeps);
installOnCallNotifications(api, changeDeps);
installReviews(api, authorizedState);
installTriage(api, {body, state: authorizedState, save: (c, state, revision, extra) => {const guard=sessionGuard(c);return save(c.env.DB,state,revision,extra?{sql:'('+guard.sql+') AND ('+extra.sql+')',values:[...guard.values,...extra.values]}:guard)}, saveItem: (c, state, revision, operationId, incidentId) => saveTriageItem(c.env.DB, state, revision, operationId, incidentId, sessionGuard(c))});
api.get('/api/installation', async c => c.json({name: await savedInstallationName(c.env)}));
api.post('/api/installation', async c => {
  await authorizedState(c, true);
  const name = checkedInstallationName((await body(c)).name);
  if (!name) fail('Enter an installation name of 1 to 80 characters.');
  const guard = sessionGuard(c), actor = c.get('actor');
  const allowed = `(${guard.sql}) AND EXISTS(SELECT 1 FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.role')='admin')`;
  const args = [...guard.values, actor.id], now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO bs_overrides(field,value,actor,changed_at) SELECT 'display_name',?,?,? WHERE ${allowed} ON CONFLICT(field) DO UPDATE SET value=excluded.value,actor=excluded.actor,changed_at=excluded.changed_at`).bind(JSON.stringify(name), actor.id, now, ...args),
    c.env.DB.prepare(`INSERT INTO bs_audit(actor,action,field,changed_at) SELECT ?,'override','display_name',? WHERE ${allowed}`).bind(actor.id, now, ...args),
    c.env.DB.prepare(`INSERT INTO bs_assert(value) VALUES(CASE WHEN ${allowed} THEN 1 ELSE NULL END)`).bind(...args),
    c.env.DB.prepare('DELETE FROM bs_assert'),
  ]);
  return c.json({name});
});
api.get("/api/state", async (c) => c.json(memberWorkspace(await authorizedState(c), c.get("actor"))));
installCommand(api);
api.post("/api/replay", async (c) => {
  const input = await body(c);
  const state = await authorizedState(c);
  if (!Array.isArray(input.events) || input.events.length > 200)
    fail("Replay needs up to 200 events");
  const evaluatedAt = new Date().toISOString();
  const events: {signal: ReturnType<typeof signalInput>; index: number}[] = input.events.map((event: any, index: number) => ({signal: signalInput(event), index}));
  const accepted = (signal: ReturnType<typeof signalInput>) =>
    state.events.find(event => event.source === signal.source && event.eventId === signal.eventId)?.acceptedAt ?? signal.observedAt;
  // Grouping and open-generation protections evaluate chronologically. Keep
  // each submitted position so the comparison rows still follow the caller.
  events.sort((a, b) =>
    accepted(a.signal).localeCompare(accepted(b.signal)) || a.signal.source.localeCompare(b.signal.source) || a.signal.eventId.localeCompare(b.signal.eventId));
  const decisions: ReturnType<typeof replayService> = [];
  replayService(state, events.map(event => event.signal), evaluatedAt)
    .forEach((decision, index) => { decisions[events[index].index] = decision; });
  return c.json({
    sideEffects: false,
    workspaceRevision: state.revision,
    decisions,
  });
});
api.post("/api/members", async (c) => {
  if (c.get("actor").role !== "admin") fail("Admin required", 403);
  const input = await body(c);
  const state = await authorizedState(c, true);
  const revision = state.revision;
  const name = text(input.name, "name", 100);
  if (state.members.some((m) => m.name === name))
    fail("Name already exists", 409);
  if (!["admin", "responder", "viewer", "stakeholder"].includes(input.role))
    fail("Invalid role");
  const pass = text(input.password, "password", 200);
  if (pass.length < 12) fail("Use at least 12 password characters");
  const member: Member = {
    id: crypto.randomUUID(),
    name,
    role: input.role,
    active: true,
  };
  state.members.push(member);
  setAuditSubject(c.env.DB,"member",member.id);
  state.revision++;
  const salt = crypto.randomUUID();
  const digest = await password(pass, salt);
  const authority = sessionGuard(c);
  const token=crypto.randomUUID();
  const writes=workspaceWrite(c.env.DB,state,revision,authority,token);
  const insert=c.env.DB.prepare('INSERT INTO credentials(member,salt,digest) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(member.id,salt,digest,token);
  const results=await c.env.DB.batch([...writes,insert]);
  if(results[0].meta.changes!==1) fail('Workspace changed; reload',409);
  return c.json(member, 201);
});
api.post("/api/password", async (c) => {
  const input = await body(c);
  const state = await load(c.env.DB);
  const actor = state.members.find(
    (m) => m.id === c.get("actor").id && m.active && m.role === "admin",
  );
  if (!actor) fail("Current admin required", 403);
  const member = state.members.find((m) => m.id === input.member && m.active);
  if (!member) fail("Unknown active member");
  const pass = text(input.password, "password", 200);
  if (pass.length < 12) fail("Use at least 12 password characters");
  const salt = crypto.randomUUID();
  const digest = await password(pass, salt);
  const guard = "EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND revision=?) AND EXISTS(SELECT 1 FROM oc_current_sessions WHERE token=? AND member=? AND expires>?)";
  const authority = [state.revision, c.get("sessionDigest"), actor.id, Date.now()];
  const r = await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO credentials SELECT ?,?,? WHERE ${guard} ON CONFLICT(member) DO UPDATE SET salt=excluded.salt,digest=excluded.digest`)
      .bind(member.id, salt, digest, ...authority),
    c.env.DB.prepare("DELETE FROM sessions WHERE member=? AND EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND revision=?) AND EXISTS(SELECT 1 FROM credentials WHERE member=? AND salt=? AND digest=?)")
      .bind(member.id, state.revision, member.id, salt, digest),
  ]);
  if (r[0].meta.changes !== 1) fail("Authority changed; reload", 409);
  return c.json({ changed: true });
});
api.get("/api/audit/export", async (c) => {
  await authorizedState(c, true);
  const guard = sessionGuard(c);
  const rows = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT 1 AS allowed FROM oc_members m WHERE m.id=? AND json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin' AND ${guard.sql}`).bind(c.get('actor').id,...guard.values),
    c.env.DB.prepare(`SELECT id,kind,feature,actor,subject,source,named_member AS namedMember,detail,at,before_revision AS beforeRevision,after_revision AS afterRevision,outcome,workspace_before AS workspaceBefore,workspace_after AS workspaceAfter,paging_before AS pagingBefore,paging_after AS pagingAfter,handoff_before AS handoffBefore,handoff_after AS handoffAfter FROM oc_admin_audit WHERE ${guard.sql} AND EXISTS(SELECT 1 FROM oc_members WHERE id=? AND json_extract(data,'$.role')='admin' AND json_extract(data,'$.active')=1) ORDER BY ordinal`).bind(...guard.values,c.get('actor').id),
  ]);
  if(!rows[0].results.length) fail('Current admin required',403);
  c.header('Content-Disposition','attachment; filename="oncall-audit.json"');
  return c.json({schemaVersion:1,rows:rows[1].results});
});
api.get("/api/archive", async (c) => {
  if (c.get("actor").role !== "admin") fail("Admin required", 403);
  c.header("Content-Disposition", 'attachment; filename="oncall-archive.json"');
  return c.json(await hydrateNativePrefixes(c.env.DB,await authorizedState(c, true),archiveRestoreLimit));
});
api.post("/api/restore", async (c) => {
  if (c.get("actor").role !== "admin") fail("Admin required", 403);
  const input = await body(c, archiveRestoreLimit);
  if (input.mode !== "replace") fail("Explicit replace mode required");
  const value = validateArchive(input.archive);
  requireNativePrefixValues(value);
  await emailErasureFence(c.env.DB,value);
  await requireErasureFence(c.env.DB,value);
  const snapshot = await recoverySnapshot(c.env.DB);
  const pagingRestore = await prepareCoordinationRestore(c.env.DB, Date.now(), snapshot);
  const held = await holdHandoffsForRecovery(snapshot.handoffs.archive, Date.now(), crypto.randomUUID(), "Coordination restore; current review required");
  const handoffRestore = prepareHandoffReplacement(c.env.DB, snapshot.handoffs, held);
  return replaceWorkspace(c, input, value, snapshot.workspace, pagingRestore, handoffRestore);
});
type PagingRestorePlan = { revision: number; statements: (token: string) => D1PreparedStatement[] };
async function replaceWorkspace(c: any, input: any, value: State, old: State,
  pagingRestore: PagingRestorePlan, handoffRestore: PagingRestorePlan, details: Record<string, unknown> = {}) {
  const current = old.members.find(
    (m) => m.id === c.get("actor").id && m.active && m.role === "admin",
  );
  if (!current) fail("Admin authority changed", 403);
  let target = current.id;
  if (
    !value.members.some(
      (m) => m.id === current.id && m.active && m.role === "admin",
    )
  ) {
    if (
      old.services.length ||
      old.incidents.length ||
      old.events.length ||
      old.members.length !== 1
    )
      fail(
        "This archive belongs to another installation. Mapping its administrator requires a target with only its initial administrator and no services, incidents or events. Export this workspace first, then deploy a new unused environment and restore there before adding records; Archive explains the steps. Nothing was replaced.",
      );
    const mapped = value.members.find(
      (m) => m.id === input.adminMapping && m.active && m.role === "admin",
    );
    if (!mapped)
      fail("Map the current password to an archive administrator explicitly");
    target = mapped.id;
  }
  await requireErasureFence(c.env.DB,value);
  const restoreToken = crypto.randomUUID();
  const sessionToken = crypto.randomUUID() + crypto.randomUUID();
  const sessionDigest = await hash(sessionToken);
  const parent:{operator_session:string|null}|null=await c.env.DB.prepare('SELECT operator_session FROM oc_current_sessions WHERE token=?').bind(c.get('sessionDigest')).first();
  if(!parent)fail('Session expired or revoked',401);
  holdScheduleRecords(value);
  holdBusinessStatus(value);
  holdManualRecords(value);
  holdDeadlines(value);
  refreshBusinessStatus(value);
  holdAutomation(value);
  holdRuleWorkflows(value);
  pauseChangeSources(value);
  pauseIntakeSources(value);
  value.revision = old.revision + 1;
  checkWorkspaceSize(value);
  const r = await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE workspace_control SET revision=?,write_token=? WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?) AND EXISTS(SELECT 1 FROM handoff_state WHERE id=1 AND revision=?) AND EXISTS(SELECT 1 FROM oc_current_sessions WHERE token=? AND member=? AND expires>?) AND "+erasureFenceCondition,
    ).bind(value.revision, restoreToken, old.revision, pagingRestore.revision, handoffRestore.revision, c.get("sessionDigest"), current.id, Date.now(), fenceValues(value)),
    ...workspaceRows(c.env.DB,value,restoreToken),
    ...["oc_api_credentials","oc_endpoint_credentials","oc_key_rate_usage","oc_key_rate_notified"].map(table=>c.env.DB.prepare(`DELETE FROM ${table} WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)`).bind(restoreToken)),
    c.env.DB.prepare("DELETE FROM oc_email_credentials WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)").bind(restoreToken),
    c.env.DB.prepare("DELETE FROM oc_change_credentials WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)").bind(restoreToken),
    c.env.DB.prepare("DELETE FROM oc_incumbent_credentials WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)").bind(restoreToken),
    c.env.DB.prepare("DELETE FROM oc_intake_credentials WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)").bind(restoreToken),
    c.env.DB.prepare(
      "UPDATE operator_members SET member_id=? WHERE member_id=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)"
    ).bind(target,current.id,restoreToken),
    c.env.DB.prepare(
      "DELETE FROM credentials WHERE member<>? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)",
    ).bind(current.id, restoreToken),
    c.env.DB.prepare(
      "UPDATE credentials SET member=? WHERE member=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)",
    ).bind(target, current.id, restoreToken),
    c.env.DB.prepare('UPDATE oa_sessions SET revoked_at=COALESCE(revoked_at,?) WHERE id IS NOT ? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(Date.now(),parent.operator_session,restoreToken),
    c.env.DB.prepare(
      "DELETE FROM sessions WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)",
    ).bind(restoreToken),
    c.env.DB.prepare(
      "DELETE FROM sources WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)",
    ).bind(restoreToken),
    ...pagingRestore.statements(restoreToken),
    ...handoffRestore.statements(restoreToken),
    c.env.DB.prepare(
      "INSERT INTO sessions(token,member,expires,operator_session) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?) AND EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND write_token=?) AND EXISTS(SELECT 1 FROM handoff_state WHERE id=1 AND write_token=?)",
    ).bind(sessionDigest, target, Date.now() + 43200000,parent.operator_session, restoreToken, restoreToken, restoreToken),
  ]);
  if (r[0].meta.changes !== 1) {
    auditRefusalCommitted(c.env.DB);
    await requireErasureFence(c.env.DB,value);
    fail("Workspace changed; reload before restore", 409);
  }
  return sessionResponse(c, sessionToken, value.members.find((m) => m.id === target)!, details);
}
api.get("/api/recovery/checkpoint", async (c) => {
  const snapshot = await recoverySnapshot(c.env.DB);
  if (!snapshot.workspace.members.some(m => m.id === c.get("actor").id && m.active && m.role === "admin"))
    fail("Current admin required", 403);
  const version = c.req.query("version") ?? "2";
  if (!["1", "2"].includes(version)) fail("Unsupported recovery checkpoint version");
  await hydrateNativePrefixes(c.env.DB,snapshot.workspace,checkpointRestoreLimit-new TextEncoder().encode(JSON.stringify([snapshot.archive,snapshot.handoffs.archive])).length);
  const checkpoint = version === "1"
    ? createRecoveryCheckpoint(snapshot.workspace, snapshot.archive, snapshot.revision, Date.now())
    : await createRecoveryCheckpointV2(snapshot.workspace, snapshot.archive, snapshot.revision, snapshot.handoffs.archive, snapshot.handoffs.revision, Date.now());
  c.header("Content-Disposition", 'attachment; filename="oncall-recovery-checkpoint.json"');
  return c.json(checkpoint);
});
api.post("/api/recovery/restore", async (c) => {
  if (c.get("actor").role !== "admin") fail("Admin required", 403);
  const input = await body(c, checkpointRestoreLimit);
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some(key => !["mode", "checkpoint", "adminMapping"].includes(key)) || input.mode !== "replace" ||
      (input.adminMapping !== undefined && (typeof input.adminMapping !== "string" || input.adminMapping.length > 100)))
    fail("Explicit checkpoint replacement and valid mapping required");
  const checkpoint = await validateAnyRecoveryCheckpoint(input.checkpoint);
  requireNativePrefixValues(checkpoint.coordination);
  await emailErasureFence(c.env.DB,checkpoint.coordination);
  await requireErasureFence(c.env.DB,checkpoint.coordination);
  if(checkpoint.schemaVersion===2)await requireHandoffErasureFence(checkpoint.coordination,checkpoint.handoffs);
  const snapshot = await recoverySnapshot(c.env.DB);
  const imported = preparePagingImport(checkpoint.paging, Date.now());
  const replacement = prepareCheckpointReplacement(c.env.DB, snapshot, imported);
  const held = await holdHandoffsForRecovery(checkpoint.schemaVersion === 2 ? checkpoint.handoffs : snapshot.handoffs.archive, Date.now(), crypto.randomUUID(), "Recovery checkpoint restore; current review required");
  const handoffRestore = prepareHandoffReplacement(c.env.DB, snapshot.handoffs, held);
  return replaceWorkspace(c, input, checkpoint.coordination, snapshot.workspace, replacement, handoffRestore, {
    mode: "local-only",
    source: { capturedAt: checkpoint.capturedAt, workspaceRevision: checkpoint.workspaceRevision, pagingRevision: checkpoint.pagingRevision, ...(checkpoint.schemaVersion === 2 ? { handoffRevision: checkpoint.handoffRevision } : {}) },
    revisions: { workspace: snapshot.workspace.revision + 1, paging: snapshot.revision + 1, handoffs: snapshot.handoffs.revision + 1 },
  });
});
api.get("/api/handoff/:id", async (c) => {
  const state = await authorizedState(c);
  const incident = state.incidents.find((i) => i.id === c.req.param("id"));
  if (!incident) fail("Unknown incident", 404);
  const service = state.services.find(v => v.id === incident.service);
  if (!service) fail("Missing incident service", 503);
  return c.json(handoff(incident, service));
});
installTeams(api,{body,state:authorizedState,save:(c,state,revision)=>save(c.env.DB,state,revision,sessionGuard(c))});
installPaging(api, body);
installSmsPaging(api, body);
installSchedules(api,body);
installScheduleCoordination(api,body);
installMoveIn(api,body);
installHandoffs(api, body);
export { api };
