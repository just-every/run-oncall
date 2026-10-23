import { validateIncidentTemplateHistory } from '../../incident-workflows/template.ts';
import {validateAssignmentHistory} from '../../manual-pages/archive.ts';
import { fail, link, type Entry, type Incident, type Member, type Service, type State } from "./domain.ts";
import { validateLifecycleEntry } from "../../reviews/review-controls.ts";
import { validateUrgencyRuleHistory } from '../../urgency/archive.ts';
import { validateResponsePolicy } from '../../response-policy/rules.ts';

export type HandoffPayload = { audience: "internal" | "customer"; title: string; summary: string; evidenceLinks: string[]; impactLinks: string[] };
export type HandoffSource = { incident: Pick<Incident, "id" | "revision" | "service" | "title" | "severity" | "state" | "recovery"> & { declaration: Entry }; service: Service };
export type PrepareInput = { id: string; incident: string; incidentRevision: number; serviceHash: string; payload: HandoffPayload; supersedes?: string | null };
export type ActionInput = { actionId: string; revision: number; payloadHash: string; sourceHash: string; reason: string };
export type HandoffHistory = { actionId: string; type: "prepared" | "reviewed" | "withdrawn" | "recovery-held"; at: number;
  actor: Member | null; expectedRevision: number; payloadHash: string; sourceHash: string; reason: string | null; selfReview: boolean };
export type HandoffRecord = { id: string; revision: number; status: "prepared" | "reviewed" | "withdrawn"; held: boolean;
  supersedes: string | null; source: HandoffSource; sourceHash: string; serviceHash: string; payload: HandoffPayload; payloadHash: string; history: HandoffHistory[] };
export type HandoffArchive = { schemaVersion: 1; kind: "oncall-reviewed-handoffs"; records: HandoffRecord[] };
export type HandoffEligibility = { eligible: boolean; diagnostics: string[]; selfReview: boolean };
export const emptyHandoffArchive = (): HandoffArchive => ({ schemaVersion: 1, kind: "oncall-reviewed-handoffs", records: [] });

function fields(input: unknown, keys: string[], optional: string[] = []): any {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Invalid handoff object");
  if (Object.keys(input).some(key => !keys.includes(key) && !optional.includes(key)) || keys.some(key => !Object.hasOwn(input, key)))
    fail("Missing or unknown handoff fields");
  return input;
}
function text(input: unknown, name: string, max = 100, empty = false): string {
  if (typeof input !== "string" || (!empty && !input.length) || input !== input.trim() || input.length > max) fail(`Invalid handoff ${name}`);
  return input;
}
/** Existing coordination archives retain their original string bytes. */
function snapshotText(input: unknown, name: string, max = 100, empty = false): string {
  if (typeof input !== "string" || (!empty && !input.trim()) || input.length > max) fail(`Invalid handoff ${name}`);
  return input;
}
function integer(input: unknown, name: string, min = 0): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < min) fail(`Invalid handoff ${name}`);
  return input;
}
function clock(input: unknown): number {
  const at = integer(input, "clock");
  if (at < Date.UTC(2000, 0, 1) || at >= Date.UTC(2101, 0, 1)) fail("Handoff clock must be in 2000–2100");
  return at;
}
function hash(input: unknown): string {
  if (typeof input !== "string" || !/^[a-f0-9]{64}$/.test(input)) fail("Invalid handoff SHA-256");
  return input;
}
/** Deterministic JSON: sorted object keys, ordered arrays, unchanged string bytes. */
export function canonicalJSON(input: unknown): string {
  if (input === null || typeof input === "string" || typeof input === "boolean") return JSON.stringify(input);
  if (typeof input === "number" && Number.isFinite(input)) return JSON.stringify(input);
  if (Array.isArray(input)) {
    if (Object.keys(input).length !== input.length) fail("Invalid handoff JSON array");
    return "[" + input.map(canonicalJSON).join(",") + "]";
  }
  if (input && typeof input === "object") {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) fail("Invalid handoff JSON object");
    return "{" + Object.keys(input).sort().map(key => JSON.stringify(key) + ":" + canonicalJSON((input as any)[key])).join(",") + "}";
  }
  return fail("Invalid handoff JSON value");
}
export async function sha256(input: unknown): Promise<string> {
  const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalJSON(input)));
  return Array.from(new Uint8Array(result), byte => byte.toString(16).padStart(2, "0")).join("");
}
function payload(input: unknown): HandoffPayload {
  const p = fields(input, ["audience", "title", "summary", "evidenceLinks", "impactLinks"]);
  if (p.audience !== "internal" && p.audience !== "customer") fail("An explicit handoff audience is required");
  for (const key of ["evidenceLinks", "impactLinks"]) {
    if (!Array.isArray(p[key]) || p[key].length > 16) fail("Maximum 16 handoff links per category");
    for (const value of p[key]) { text(value, "link", 2000); link(value); }
  }
  text(p.title, "title", 200); text(p.summary, "summary", 3000);
  return structuredClone(p);
}
function member(input: unknown): Member {
  const m = fields(input, ["id", "name", "role", "active"]);
  snapshotText(m.id, "actor ID"); snapshotText(m.name, "actor name");
  if ((m.role !== "admin" && m.role !== "responder") || m.active !== true) fail("Handoff history requires an active responder snapshot");
  return m;
}
function authority(state: State, actor: Member, edit = true): Member {
  const current = state.members.find(m => m.id === actor.id && m.active);
  if (!current) fail("Current handoff actor is revoked", 401);
  if (edit && current.role !== "admin" && current.role !== "responder") fail("Active responder required for handoff actions", 403);
  return structuredClone(current);
}
function source(input: unknown): HandoffSource {
  const s = fields(input, ["incident", "service"]);
  const i = fields(s.incident, ["id", "revision", "service", "title", "severity", "state", "recovery", "declaration"]);
  snapshotText(i.id, "incident ID"); integer(i.revision, "incident revision"); snapshotText(i.service, "incident service"); snapshotText(i.title, "incident title", 300);
  if (!["critical", "warning", "info"].includes(i.severity) || !["declared", "acknowledged", "mitigating", "recovered", "resolved"].includes(i.state)) fail("Invalid handoff incident snapshot");
  snapshotText(i.recovery, "incident recovery", 2000, true); link(i.recovery);
  if (["recovered", "resolved"].includes(i.state) && !i.recovery) fail("Recovered handoff snapshot needs evidence");
  const d = fields(i.declaration, ["id", "at", "actor", "kind", "text"], ["lifecycle", "metadata"]);
  snapshotText(d.id, "declaration ID"); snapshotText(d.actor, "declaration actor", 200); snapshotText(d.text, "declaration text", 10000);
  if (!["declared", "split"].includes(d.kind) || d.kind === "split" && (!d.lifecycle || d.lifecycle.from !== null) || typeof d.at !== "string" || !Number.isFinite(Date.parse(d.at))) fail("Invalid handoff declaration snapshot");
  validateLifecycleEntry(d);
  if (d.metadata !== undefined) {
    const m = fields(d.metadata, ['event', 'policyVersion', 'rule']);
    snapshotText(m.event, 'source declaration event'); integer(m.policyVersion, 'response policy version', 1);
    if (m.rule !== null) snapshotText(m.rule, 'response rule');
    if (!d.actor.startsWith('source:')) fail('Response declaration metadata needs a source actor');
  }
  const v = fields(s.service, ["id", "name", "environment", "owner", "runbook", "pager"], ["dependencies", "urgencyRules", "responsePolicies", "incidentTemplates", "userAssignments"]);
  if (v.userAssignments !== undefined) validateAssignmentHistory(v.userAssignments);
  if (v.urgencyRules !== undefined) validateUrgencyRuleHistory(v.urgencyRules);
  if(v.incidentTemplates!==undefined)validateIncidentTemplateHistory(v);
  if (v.responsePolicies !== undefined) {
    if (!Array.isArray(v.responsePolicies) || !v.responsePolicies.length || v.responsePolicies.length > 100) fail('Invalid handoff response policy history');
    v.responsePolicies.forEach((row: unknown, index: number) => {
      const policy = validateResponsePolicy(row);
      if (policy.version !== index + 1 || index > 0 && Date.parse(policy.at) < Date.parse(v.responsePolicies[index - 1].at)) fail('Invalid handoff response policy version order');
    });
  }
  snapshotText(v.id, "service ID"); snapshotText(v.name, "service name", 200); snapshotText(v.environment, "environment"); snapshotText(v.owner, "service owner");
  snapshotText(v.pager, "pager link", 2000, true); link(v.pager);
  if (!Array.isArray(v.runbook) || v.runbook.length > 30) fail("Invalid handoff runbook snapshot");
  v.runbook.forEach((line: unknown) => snapshotText(line, "runbook", 500));
  if (v.dependencies !== undefined) {
    if (!Array.isArray(v.dependencies) || v.dependencies.length > 30 || new Set(v.dependencies).size !== v.dependencies.length || v.dependencies.includes(v.id)) fail("Invalid handoff dependency snapshot");
    v.dependencies.forEach((id: unknown) => snapshotText(id, "dependency ID"));
  }
  if (i.service !== v.id) fail("Handoff source incident/service mismatch");
  return structuredClone(s);
}
export async function sourceSnapshot(state: State, incidentId: string): Promise<{ source: HandoffSource; sourceHash: string; serviceHash: string }> {
  const incident = state.incidents.find(i => i.id === incidentId);
  const service = state.services.find(s => s.id === incident?.service);
  if (!incident || !service || !incident.timeline[0]) fail("Handoff source is unavailable", 409);
  const snapshot = source({ incident: { id: incident.id, revision: incident.revision, service: incident.service, title: incident.title,
    severity: incident.severity, state: incident.state, recovery: incident.recovery, declaration: incident.timeline[0] }, service });
  return { source: snapshot, sourceHash: await sha256(snapshot), serviceHash: await sha256(snapshot.service) };
}
export function boundHandoffArchive(archive: HandoffArchive): void {
  if (!Array.isArray(archive.records)) fail("Invalid handoff archive records");
  if (archive.records.length > 64) fail("Handoff record capacity (64) reached", 429);
  const ids = new Set<string>(), actions = new Set<string>();
  for (const record of archive.records) {
    if (ids.has(record.id)) fail("Duplicate handoff record identity"); ids.add(record.id);
    if (!Array.isArray(record.history)) fail("Invalid handoff history");
    if (record.history.length > 128) fail("Handoff history capacity (128) reached", 429);
    for (const entry of record.history) { if (actions.has(entry.actionId)) fail("Duplicate handoff action identity"); actions.add(entry.actionId); }
    if (new TextEncoder().encode(JSON.stringify(record)).length > 128 * 1024) fail("Handoff record capacity (128 KiB) reached", 429);
  }
  if (new TextEncoder().encode(JSON.stringify(archive)).length > 1024 * 1024) fail("Handoff archive capacity (1 MiB) reached", 429);
}
async function validateRecord(input: unknown): Promise<HandoffRecord> {
  const r = fields(input, ["id", "revision", "status", "held", "supersedes", "source", "sourceHash", "serviceHash", "payload", "payloadHash", "history"]);
  text(r.id, "record ID"); integer(r.revision, "record revision", 1);
  if (!["prepared", "reviewed", "withdrawn"].includes(r.status) || typeof r.held !== "boolean") fail("Invalid handoff record state");
  if (r.supersedes !== null) { text(r.supersedes, "superseded ID"); if (r.supersedes === r.id) fail("Handoff cannot supersede itself"); }
  const snapshot = source(r.source), copy = payload(r.payload);
  hash(r.sourceHash); hash(r.serviceHash); hash(r.payloadHash);
  if (await sha256(snapshot) !== r.sourceHash || await sha256(snapshot.service) !== r.serviceHash || await sha256(copy) !== r.payloadHash) fail("Handoff snapshot/hash mismatch");
  if (!Array.isArray(r.history) || !r.history.length || r.history.length > 128) fail("Invalid handoff history capacity");
  let status: HandoffRecord["status"] = "prepared", held = false, previousAt = 0;
  const actions = new Set<string>();
  let author: string | undefined;
  for (let index = 0; index < r.history.length; index++) {
    const h = fields(r.history[index], ["actionId", "type", "at", "actor", "expectedRevision", "payloadHash", "sourceHash", "reason", "selfReview"]);
    text(h.actionId, "action ID", 220); clock(h.at); integer(h.expectedRevision, "expected revision");
    if (h.at < previousAt || h.expectedRevision !== index || h.payloadHash !== r.payloadHash || h.sourceHash !== r.sourceHash || typeof h.selfReview !== "boolean" || actions.has(h.actionId)) fail("Invalid handoff history identity/clock/hash/revision");
    previousAt = h.at; actions.add(h.actionId);
    if (index === 0) {
      if (h.type !== "prepared" || h.actionId !== `prepare:${r.id}` || h.reason !== null || h.selfReview) fail("Invalid handoff origin history");
      author = member(h.actor).id;
    } else {
      if (status === "withdrawn") fail("Handoff withdrawal is terminal");
      if (h.type === "recovery-held") {
        if (h.actor !== null || !h.actionId.startsWith("recovery:") || status !== "reviewed" || held || h.selfReview) fail("Invalid server recovery hold history");
        const suffix = `:${r.id}`;
        if (!h.actionId.endsWith(suffix)) fail("Invalid recovery hold identity");
        text(h.actionId.slice("recovery:".length, -suffix.length), "recovery hold ID");
        text(h.reason, "recovery hold reason", 1000); held = true;
      } else if (h.type === "reviewed" || h.type === "withdrawn") {
        const actor = member(h.actor);
        if (h.actionId.startsWith("prepare:") || h.actionId.startsWith("recovery:")) fail("Reserved handoff action identity");
        text(h.reason, "action reason", 1000, h.type === "reviewed");
        if (h.selfReview !== (h.type === "reviewed" && actor.id === author)) fail("Invalid handoff self-review attribution");
        status = h.type; if (h.type === "reviewed") held = false;
      } else fail("Invalid handoff history action");
    }
  }
  if (r.revision !== r.history.length || r.status !== status || r.held !== held) fail("Handoff state differs from immutable history");
  return structuredClone(r);
}
export async function validateHandoffArchive(input: unknown): Promise<HandoffArchive> {
  const value = fields(input, ["schemaVersion", "kind", "records"]);
  if (value.schemaVersion !== 1 || value.kind !== "oncall-reviewed-handoffs" || !Array.isArray(value.records) || value.records.length > 64) fail("Unsupported or oversized handoff archive");
  const archive: HandoffArchive = { schemaVersion: 1, kind: "oncall-reviewed-handoffs", records: [] };
  for (const record of value.records) archive.records.push(await validateRecord(record));
  boundHandoffArchive(archive);
  const records = new Map(archive.records.map(record => [record.id, record]));
  for (const record of archive.records) {
    const seen = new Set([record.id]); let priorId = record.supersedes;
    while (priorId !== null) {
      const prior = records.get(priorId);
      if (!prior || prior.source.incident.id !== record.source.incident.id || prior.source.service.id !== record.source.service.id || seen.has(priorId)) fail("Invalid handoff supersedes references/cycle");
      seen.add(priorId); priorId = prior.supersedes;
    }
  }
  return archive;
}
function preparedInput(input: unknown): PrepareInput {
  const p = fields(input, ["id", "incident", "incidentRevision", "serviceHash", "payload"], ["supersedes"]);
  text(p.id, "prepare ID"); snapshotText(p.incident, "incident ID"); integer(p.incidentRevision, "incident revision"); hash(p.serviceHash); payload(p.payload);
  if (p.supersedes !== undefined && p.supersedes !== null) text(p.supersedes, "superseded ID");
  return structuredClone(p);
}
export async function prepareHandoff(state: State, actor: Member, input: unknown, at: number, existing?: HandoffRecord, prior?: HandoffRecord): Promise<HandoffRecord> {
  const current = authority(state, actor), request = preparedInput(input), copy = payload(request.payload);
  const payloadHash = await sha256(copy), supersedes = request.supersedes ?? null;
  if (existing) {
    const record = await validateRecord(existing);
    if (record.id !== request.id || record.source.incident.id !== request.incident || record.source.incident.revision !== request.incidentRevision ||
        record.serviceHash !== request.serviceHash || record.payloadHash !== payloadHash || record.supersedes !== supersedes || record.history[0].actor!.id !== current.id)
      fail("Handoff prepare identity conflicts with changed input", 409);
    return record;
  }
  if (supersedes !== null) {
    if (!prior) fail("Unknown superseded handoff");
    prior = await validateRecord(prior);
    if (prior.id !== supersedes || supersedes === request.id || prior.source.incident.id !== request.incident) fail("Unknown or mismatched superseded handoff");
  }
  const snapshot = await sourceSnapshot(state, request.incident);
  if (snapshot.source.incident.revision !== request.incidentRevision || snapshot.serviceHash !== request.serviceHash) fail("Handoff source changed; inspect current snapshot", 409);
  if (prior && prior.source.service.id !== snapshot.source.service.id) fail("Superseded handoff service mismatch");
  const record: HandoffRecord = { id: request.id, revision: 1, status: "prepared", held: false, supersedes, ...snapshot,
    payload: copy, payloadHash, history: [{ actionId: `prepare:${request.id}`, type: "prepared", at: clock(at), actor: current,
      expectedRevision: 0, payloadHash, sourceHash: snapshot.sourceHash, reason: null, selfReview: false }] };
  boundHandoffArchive({ ...emptyHandoffArchive(), records: [record] });
  return record;
}
export async function handoffEligibility(state: State, record: HandoffRecord): Promise<HandoffEligibility> {
  const diagnostics: string[] = [];
  if (record.status === "prepared") diagnostics.push("unreviewed");
  if (record.status === "withdrawn") diagnostics.push("withdrawn");
  if (record.held) diagnostics.push("recovery-held");
  const incident = state.incidents.find(i => i.id === record.source.incident.id);
  const service = state.services.find(s => s.id === record.source.service.id);
  if (!incident) diagnostics.push("incident-missing");
  if (!service) diagnostics.push("service-missing");
  if (incident && incident.service !== record.source.service.id) diagnostics.push("incident-service-mismatch");
  if (incident && incident.revision !== record.source.incident.revision) diagnostics.push("incident-revision-changed");
  if (service && await sha256(service) !== record.serviceHash) diagnostics.push("service-content-changed");
  if (incident && service && incident.service === service.id) {
    try { if ((await sourceSnapshot(state, incident.id)).sourceHash !== record.sourceHash) diagnostics.push("source-snapshot-changed"); }
    catch { diagnostics.push("source-unavailable"); }
  }
  const approval = record.history.slice().reverse().find(entry => entry.type === "reviewed");
  return { eligible: record.status === "reviewed" && !diagnostics.length, diagnostics, selfReview: approval?.selfReview ?? false };
}
async function action(state: State, actor: Member, original: HandoffRecord, input: unknown, at: number, type: "reviewed" | "withdrawn"): Promise<HandoffRecord> {
  const current = authority(state, actor), request = fields(input, ["actionId", "revision", "payloadHash", "sourceHash", "reason"]);
  text(request.actionId, "action ID", 128); integer(request.revision, "record revision", 1); hash(request.payloadHash); hash(request.sourceHash);
  text(request.reason, "action reason", 1000, type === "reviewed");
  if (request.actionId.startsWith("prepare:") || request.actionId.startsWith("recovery:")) fail("Reserved handoff action identity");
  const record = await validateRecord(original);
  const old = record.history.find(entry => entry.actionId === request.actionId);
  if (old) {
    if (old.type !== type || old.expectedRevision !== request.revision || old.payloadHash !== request.payloadHash || old.sourceHash !== request.sourceHash || old.reason !== request.reason || old.actor?.id !== current.id)
      fail("Handoff action identity conflicts with changed input", 409);
    return record;
  }
  if (record.status === "withdrawn") fail("Handoff withdrawal is terminal", 409);
  if (record.revision !== request.revision || record.payloadHash !== request.payloadHash || record.sourceHash !== request.sourceHash) fail("Handoff record/hash changed", 409);
  if (clock(at) < record.history.at(-1)!.at) fail("Handoff action clock moved backwards", 409);
  if (type === "reviewed") {
    const eligible = await handoffEligibility(state, record);
    if (eligible.diagnostics.some(value => !["unreviewed", "recovery-held"].includes(value))) fail("Handoff source is stale or unavailable", 409);
  }
  const next = structuredClone(record);
  next.history.push({ actionId: request.actionId, type, at, actor: current, expectedRevision: record.revision,
    payloadHash: record.payloadHash, sourceHash: record.sourceHash, reason: request.reason,
    selfReview: type === "reviewed" && current.id === record.history[0].actor!.id });
  next.revision++; next.status = type; if (type === "reviewed") next.held = false;
  boundHandoffArchive({ ...emptyHandoffArchive(), records: [next] }); return next;
}
export async function reviewHandoff(state: State, actor: Member, record: HandoffRecord, input: unknown, at: number): Promise<HandoffRecord> { return action(state, actor, record, input, at, "reviewed"); }
export async function withdrawHandoff(state: State, actor: Member, record: HandoffRecord, input: unknown, at: number): Promise<HandoffRecord> { return action(state, actor, record, input, at, "withdrawn"); }
/** Only active approvals gain a hold. Already-held records retain their existing hold evidence. */
export async function holdHandoffsForRecovery(input: HandoffArchive, at: number, holdId: string, reason: string): Promise<HandoffArchive> {
  const archive = await validateHandoffArchive(input); clock(at); text(holdId, "recovery hold ID"); text(reason, "recovery hold reason", 1000);
  for (const record of archive.records) if (record.status === "reviewed" && !record.held) {
    record.history.push({ actionId: `recovery:${holdId}:${record.id}`, type: "recovery-held", at: Math.max(at, record.history.at(-1)!.at),
      actor: null, expectedRevision: record.revision, payloadHash: record.payloadHash, sourceHash: record.sourceHash, reason, selfReview: false });
    record.revision++; record.held = true;
  }
  boundHandoffArchive(archive); return archive;
}
export async function exportHandoff(state: State, actor: Member, input: HandoffRecord) {
  authority(state, actor, false); const record = await validateRecord(input), review = await handoffEligibility(state, record);
  const historicalApproval = record.history.slice().reverse().find(entry => entry.type === "reviewed") ?? null;
  return { schemaVersion: 1, kind: "oncall-reviewed-handoff-export", visibility: "internal", transport: "unsent", publication: "not-published",
    providerActions: [], review: { ...review, status: record.status, held: record.held, historicalApproval }, record,
    lamp: { draft: { deduplicationKey: `oncall:${record.source.incident.id}`, title: record.payload.title, summary: record.payload.summary,
      state: ["resolved", "recovered"].includes(record.source.incident.state) ? "recovered" : "firing", handoffId: record.id,
      intendedAudience: record.payload.audience, evidenceLinks: structuredClone(record.payload.evidenceLinks), impactLinks: structuredClone(record.payload.impactLinks) },
      mapping: { deduplicationPath: "deduplicationKey", titlePath: "title", statePath: "state", recoveredValue: "recovered" },
      boundary: "Unsent reviewed copy; no Lamp submission, publication or recovery verification" } };
}
