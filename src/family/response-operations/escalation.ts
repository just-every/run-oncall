import { fail, text, type Member } from "./domain.ts";
import { coverage, validateSchedule, type Schedule, type Coverage } from "./schedules.ts";
import { clock, fields, validateBehavior, validateReceipt,
  type SyntheticBehavior, type SyntheticOutcome, type SyntheticReceipt } from "./synthetic-provider.ts";
export { validateReceipt } from "./synthetic-provider.ts";
export type { SyntheticBehavior, SyntheticReceipt } from "./synthetic-provider.ts";

export type EscalationPolicy = { service: string; scheduleId: string; revision: number;
  primaryWaitSeconds: number; backupWaitSeconds: number; retrySeconds: number; maxAttempts: number };
export type EscalationAttempt = { step: 0 | 1; role: "primary" | "backup"; key: string;
  target: string | null; at: number; outcome: SyntheticOutcome | "unavailable";
  coverage: Coverage; members: Member[]; workspaceRevision: number | null; selectionWarnings: string[] };
export type EscalationStep = { step: 0 | 1; role: "primary" | "backup"; target: string | null;
  deliveryKey: string; startedAt: number; deadline: number; attempts: number;
  outcome: SyntheticOutcome | "unavailable" | "ready"; receipt: SyntheticReceipt | null };
export type JobHistory = { type: "created" | "attempt" | "advanced" | "acknowledged" | "cancelled" | "paused" | "resumed" | "exhausted";
  at: number; actor: string | null; reason: string | null; attempt: EscalationAttempt | null };
export type EscalationJob = { id: string; incident: string; service: string; revision: number;
  status: "pending" | "acknowledged" | "cancelled" | "exhausted" | "paused";
  nextDue: number | null; createdAt: number; lastEvaluatedAt: number; currentStep: 0 | 1 | 2;
  policy: EscalationPolicy; schedule: Schedule; behaviors: { primary: SyntheticBehavior; backup: SyntheticBehavior };
  steps: EscalationStep[]; history: JobHistory[] };

function integer(value: any, name: string, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`Invalid ${name}`);
  return value;
}
export function validatePolicy(input: any, schedule?: Schedule): EscalationPolicy {
  fields(input, ["service", "scheduleId", "revision", "primaryWaitSeconds", "backupWaitSeconds", "retrySeconds", "maxAttempts"]);
  const policy = { service: text(input.service, "service", 100), scheduleId: text(input.scheduleId, "schedule ID", 100),
    revision: integer(input.revision, "policy revision", 1, 1_000_000_000),
    primaryWaitSeconds: integer(input.primaryWaitSeconds, "primary wait", 1, 86_400),
    backupWaitSeconds: integer(input.backupWaitSeconds, "backup wait", 1, 86_400),
    retrySeconds: integer(input.retrySeconds, "retry wait", 1, 3_600),
    maxAttempts: integer(input.maxAttempts, "maximum attempts", 1, 10) };
  if (policy.service !== input.service || policy.scheduleId !== input.scheduleId) fail("Noncanonical policy identity");
  if (schedule && (schedule.id !== policy.scheduleId || schedule.service !== policy.service)) fail("Policy schedule/service mismatch");
  return policy;
}
const active = (m: Member) => m.active && m.role !== "viewer";
const DUPLICATE_FROZEN = "Backup duplicates the frozen primary recipient; backup unavailable";
function history(job: EscalationJob, type: JobHistory["type"], at: number, reason: string | null = null,
  actor: string | null = null, attempt: EscalationAttempt | null = null) {
  if (job.history.length >= 500) fail("Synthetic job history capacity reached", 429);
  job.history.push({ type, at, actor, reason, attempt });
}
function writable(job: EscalationJob, at: number) {
  clock(at);
  if (at < job.lastEvaluatedAt) fail("Evaluation clock moved backwards", 409);
}
function changed(job: EscalationJob, at: number): EscalationJob {
  const result = structuredClone(job);
  result.revision++;
  result.lastEvaluatedAt = at;
  return result;
}
export function acknowledge(original: EscalationJob, actor: Member, at: number): EscalationJob {
  writable(original, at);
  if (!active(actor) || !original.steps.some(s => s.target === actor.id && s.attempts > 0)) fail("Only an active assigned responder may acknowledge", 403);
  if (!["pending", "paused"].includes(original.status)) fail("Escalation is already finished", 409);
  const job = changed(original, at); job.status = "acknowledged"; job.nextDue = null;
  history(job, "acknowledged", at, "Human acknowledgement", actor.id); return job;
}
export function cancel(original: EscalationJob, actor: Member, reason: string, at: number): EscalationJob {
  writable(original, at);
  if (!active(actor)) fail("Only an active responder may cancel", 403);
  if (!["pending", "paused"].includes(original.status)) fail("Escalation is already finished", 409);
  const job = changed(original, at); job.status = "cancelled"; job.nextDue = null;
  history(job, "cancelled", at, text(reason, "cancellation reason", 1000), actor.id); return job;
}
export function pause(original: EscalationJob, reason: string, at: number): EscalationJob {
  writable(original, at);
  if (original.status !== "pending") return original;
  const job = changed(original, at); job.status = "paused"; job.nextDue = null;
  history(job, "paused", at, text(reason, "pause reason", 1000)); return job;
}
export function replay(job: EscalationJob) {
  return job.history.filter(h => h.attempt).map(h => ({ recorded: structuredClone(h.attempt!),
    recomputed: coverage(job.schedule, h.attempt!.members, h.attempt!.at) }));
}

export function validateJob(input: any): EscalationJob {
  fields(input, ["id", "incident", "service", "revision", "status", "nextDue", "createdAt", "lastEvaluatedAt", "currentStep", "policy", "schedule", "behaviors", "steps", "history"]);
  for (const key of ["id", "incident", "service"]) if (text(input[key], key, 100) !== input[key]) fail("Noncanonical job identity");
  integer(input.revision, "job revision", 1, 1_000_000_000);
  clock(input.createdAt); clock(input.lastEvaluatedAt);
  if (input.lastEvaluatedAt < input.createdAt) fail("Invalid job chronology");
  const schedule = validateSchedule(input.schedule);
  validatePolicy(input.policy, schedule);
  if (input.service !== input.policy.service) fail("Invalid job service");
  fields(input.behaviors, ["primary", "backup"]);
  validateBehavior(input.behaviors.primary); validateBehavior(input.behaviors.backup);
  if (!["pending", "acknowledged", "cancelled", "exhausted", "paused"].includes(input.status) || ![0, 1, 2].includes(input.currentStep)) fail("Invalid job state");
  if (input.status === "pending") {
    clock(input.nextDue);
    if (input.nextDue < input.lastEvaluatedAt || input.currentStep === 2) fail("Invalid pending deadline");
  } else if (input.nextDue !== null) fail("Nonpending job has a deadline");
  if ((input.currentStep === 2) !== (input.status === "exhausted")) fail("Invalid terminal step");
  if (!Array.isArray(input.steps) || input.steps.length > 2 || !Array.isArray(input.history) || input.history.length < 1 || input.history.length > 500) fail("Invalid job history");
  for (let i = 0; i < input.steps.length; i++) {
    const s = input.steps[i];
    fields(s, ["step", "role", "target", "deliveryKey", "startedAt", "deadline", "attempts", "outcome", "receipt"]);
    if (s.step !== i || s.role !== (i === 0 ? "primary" : "backup") || s.deliveryKey !== `${input.id}:${i}`) fail("Invalid step identity");
    if (s.target !== null) text(s.target, "target", 100);
    clock(s.startedAt); clock(s.deadline);
    if (s.startedAt < input.createdAt || s.startedAt > input.lastEvaluatedAt || s.deadline !== s.startedAt + input.policy[i === 0 ? "primaryWaitSeconds" : "backupWaitSeconds"] * 1000) fail("Invalid step deadline");
    integer(s.attempts, "attempt count", 0, input.policy.maxAttempts);
    if (!["ready", "accepted", "delivered", "failed", "uncertain", "unavailable"].includes(s.outcome)) fail("Invalid step outcome");
    if (s.receipt !== null) {
      const r = validateReceipt(s.receipt);
      if (r.key !== s.deliveryKey || r.jobId !== input.id || r.step !== s.step || r.target !== s.target || r.incident !== input.incident || r.service !== input.service || r.acceptedAt < s.startedAt || r.acceptedAt > input.lastEvaluatedAt) fail("Invalid step receipt references");
    }
    if (["accepted", "delivered", "uncertain"].includes(s.outcome) && !s.receipt) fail("Accepted outcome needs receipt");
  }
  let lastAt = input.createdAt;
  for (const h of input.history) {
    fields(h, ["type", "at", "actor", "reason", "attempt"]);
    if (!["created", "attempt", "advanced", "acknowledged", "cancelled", "paused", "resumed", "exhausted"].includes(h.type)) fail("Invalid history type");
    clock(h.at); if (h.at < lastAt || h.at > input.lastEvaluatedAt) fail("Invalid history chronology"); lastAt = h.at;
    if (h.actor !== null) text(h.actor, "actor", 100);
    if (h.reason !== null) text(h.reason, "reason", 1000);
    if (h.type === "attempt") {
      const a = h.attempt;
      fields(a, ["step", "role", "key", "target", "at", "outcome", "coverage", "members", "workspaceRevision", "selectionWarnings"]);
      if (a.workspaceRevision !== null) integer(a.workspaceRevision, "workspace revision", 0, Number.MAX_SAFE_INTEGER);
      if (!Array.isArray(a.selectionWarnings) || a.selectionWarnings.length > 1 || a.selectionWarnings.some((w: any) => w !== DUPLICATE_FROZEN)) fail("Invalid selection warning");
      const step = input.steps[a.step];
      if (!step || a.key !== step.deliveryKey || a.target !== step.target || a.role !== step.role || a.at !== h.at || !["accepted", "delivered", "failed", "uncertain", "unavailable"].includes(a.outcome)) fail("Invalid attempt references");
      if (!Array.isArray(a.members) || a.members.length > 10_000 || new Set(a.members.map((m: Member) => m.id)).size !== a.members.length) fail("Invalid membership snapshot");
      for (const m of a.members) {
        fields(m, ["id", "name", "role", "active"]); text(m.id, "member ID", 100); text(m.name, "member name", 100);
        if (!["admin", "responder", "viewer"].includes(m.role) || typeof m.active !== "boolean") fail("Invalid membership snapshot");
      }
      // Recorded decisions are evidence, not executable input. Validate their shape without replacing them.
      const c = a.coverage;
      fields(c, ["at", "timezone", "scheduleId", "scheduleRevision", "primary", "backup", "warnings", "windows"]);
      if (c.scheduleId !== schedule.id || c.scheduleRevision !== schedule.revision || c.timezone !== schedule.timezone || c.at !== a.at) fail("Invalid coverage snapshot");
      if (!Array.isArray(c.warnings) || c.warnings.length > 100 || c.warnings.some((w: any) => typeof w !== "string" || w.length > 1000) || !Array.isArray(c.windows) || c.windows.length > 10) fail("Invalid coverage explanation");
      for (const role of ["primary", "backup"]) if (c[role] !== null) text(c[role], "coverage member", 100);
      for (const w of c.windows) {
        fields(w, ["role", "member", "start", "end", "origin"]);
        if (!["primary", "backup"].includes(w.role) || !["rotation", "override", "gap"].includes(w.origin)) fail("Invalid coverage window");
        for (const boundary of [w.start, w.end]) if (boundary !== null && (typeof boundary !== "string" || !Number.isFinite(Date.parse(boundary)) || new Date(boundary).toISOString() !== boundary)) fail("Invalid coverage window boundary");
        if ((w.start === null || w.end === null) && w.origin !== "gap") fail("Only gaps may have open boundaries");
        if (w.start !== null && w.end !== null && Date.parse(w.end) <= Date.parse(w.start)) fail("Invalid coverage window interval");
        if (w.member !== null) text(w.member, "window member", 100);
      }
    } else if (h.attempt !== null) fail("Unexpected history attempt");
  }
  if (input.history[0].type !== "created" || input.history[0].at !== input.createdAt || lastAt !== input.lastEvaluatedAt) fail("Invalid job origin/history");
  for (const s of input.steps) {
    const attempts = input.history.filter((h: JobHistory) => h.attempt?.step === s.step);
    if (!attempts.length || attempts.filter((h: JobHistory) => h.attempt!.outcome !== "unavailable").length !== s.attempts || attempts.at(-1)!.attempt.outcome !== s.outcome) fail("Attempt history/count mismatch");
    const initial = attempts[0].attempt;
    const duplicate = s.step === 1 && initial.coverage.backup !== null && initial.coverage.backup === input.steps[0].target;
    if (attempts[0].at !== s.startedAt || initial.target !== (duplicate ? null : initial.coverage[s.role]) ||
        initial.selectionWarnings.length !== (duplicate ? 1 : 0)) fail("Frozen initial recipient mismatch");
    const accepted = attempts.find((h: JobHistory) => ["accepted", "delivered", "uncertain"].includes(h.attempt!.outcome));
    if (Boolean(accepted) !== Boolean(s.receipt) || (accepted && accepted.at !== s.receipt.acceptedAt)) fail("Receipt first acceptance mismatch");
    if (s.receipt && s.receipt.status !== (input.behaviors[s.role] === "delivered" ? "delivered" : "accepted")) fail("Receipt behavior mismatch");
    for (const h of attempts) {
      const a = h.attempt;
      if (a !== initial && a.selectionWarnings.length) fail("Unexpected retry selection warning");
      const eligible = a.target !== null && a.members.some((m: Member) => m.id === a.target && active(m));
      if ((a.outcome === "unavailable") === eligible) fail("Attempt eligibility mismatch");
      if (a.outcome !== "unavailable" && a.outcome !== ({ accepted: "accepted", delivered: "delivered", "fail-before-accept": "failed", "timeout-after-accept": "uncertain" }[input.behaviors[s.role] as SyntheticBehavior])) fail("Attempt behavior mismatch");
    }
  }
  const finalType = input.history.at(-1).type;
  const terminal = { acknowledged: "acknowledged", cancelled: "cancelled", paused: "paused", exhausted: "exhausted" };
  if (input.status !== "pending" && finalType !== terminal[input.status as keyof typeof terminal]) fail("Terminal history mismatch");
  // Reconstruct progression using recorded clocks and outcomes. No live configuration,
  // membership, timezone recomputation or adapter effect is used by archive validation.
  let state: EscalationJob["status"] = "pending";
  let current = 0;
  let due: number | null = input.createdAt;
  const counts = [0, 0];
  let revision = 1;
  for (let index = 0; index < input.history.length; index++) {
    const h = input.history[index];
    if (h.type === "created") {
      if (index !== 0 || h.actor !== null || h.reason !== null || h.attempt !== null) fail("Invalid creation history");
      continue;
    }
    if (h.type === "attempt") {
      if (state !== "pending" || current !== h.attempt.step || due === null || h.at < due || h.actor !== null || h.reason !== null) fail("Invalid attempt progression");
      const a = h.attempt;
      const s = input.steps[current];
      if (h.at >= s.deadline) fail("Attempt after acknowledgement deadline");
      if (a.outcome !== "unavailable") counts[current]++;
      if (counts[current] > input.policy.maxAttempts) fail("Too many attempts");
      const advancing = a.outcome === "unavailable" || (a.outcome === "failed" && counts[current] >= input.policy.maxAttempts);
      if (advancing) {
        const next = input.history[index + 1];
        if (!next || next.type !== (current === 0 ? "advanced" : "exhausted") || next.at !== h.at) fail("Missing fallback transition");
        due = h.at;
      } else if (["accepted", "delivered"].includes(a.outcome) || counts[current] >= input.policy.maxAttempts) due = s.deadline;
      else due = Math.min(s.deadline, h.at + Math.min(3600, input.policy.retrySeconds * 2 ** (counts[current] - 1)) * 1000);
      revision++;
    } else if (h.type === "advanced" || h.type === "exhausted") {
      if (state !== "pending" || !input.steps[current] || h.actor !== null || h.reason === null || h.type !== (current === 0 ? "advanced" : "exhausted")) fail("Invalid fallback progression");
      const previous = input.history[index - 1];
      const paired = previous.type === "attempt" && previous.at === h.at &&
        (previous.attempt.outcome === "unavailable" || (previous.attempt.outcome === "failed" && counts[current] >= input.policy.maxAttempts));
      if (!paired) {
        if (h.at < input.steps[current].deadline || due === null || h.at < due) fail("Premature fallback");
        revision++;
      }
      current++;
      if (current === 2) { state = "exhausted"; due = null; } else due = h.at;
    } else if (h.type === "paused") {
      if (state !== "pending" || h.actor !== null || h.reason === null) fail("Invalid pause progression");
      state = "paused"; due = null; revision++;
    } else if (h.type === "resumed") {
      if (state !== "paused" || h.actor !== null || h.reason === null) fail("Invalid resume progression");
      const s = input.steps[current];
      const prior = input.history.slice(0, index).filter((entry: JobHistory) => entry.attempt?.step === current).at(-1)?.attempt;
      state = "pending"; due = s && prior && (["accepted", "delivered"].includes(prior.outcome) || counts[current] >= input.policy.maxAttempts)
        ? Math.max(h.at, s.deadline) : h.at; revision++;
    } else if (h.type === "acknowledged") {
      if (!["pending", "paused"].includes(state) || !h.actor || !input.steps.some((s: EscalationStep) => s.target === h.actor && s.attempts > 0)) fail("Invalid human acknowledgement progression");
      state = "acknowledged"; due = null; revision++;
    } else if (h.type === "cancelled") {
      if (!["pending", "paused"].includes(state) || !h.actor || h.reason === null) fail("Invalid cancellation progression");
      state = "cancelled"; due = null; revision++;
    }
  }
  if (state !== input.status || current !== input.currentStep || due !== input.nextDue || revision !== input.revision || input.steps.length !== Math.min(2, current + (counts[current] > 0 || input.steps[current] ? 1 : 0))) fail("Job progression/state mismatch");
  return structuredClone(input);
}
