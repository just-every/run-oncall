import { fail, type State } from "./domain.ts";
import { validateSchedule, type Schedule } from "./schedules.ts";
import { clock } from "./synthetic-provider.ts";
import {
  pause,
  validatePolicy,
  validateJob,
  validateReceipt,
  type EscalationPolicy,
  type EscalationJob,
  type SyntheticReceipt,
} from "./escalation.ts";

/** Callback evidence is a separate immutable ledger, never timer/provider state. */
export type PagingCallback = {
  id: string;
  key: string;
  outcome: "accepted" | "delivered" | "failed";
  at: number;
  late: boolean;
  actor: string;
};
export type PagingArchive = {
  schemaVersion: 1;
  mode: "synthetic-only";
  schedules: Schedule[];
  policies: EscalationPolicy[];
  jobs: EscalationJob[];
  receipts: SyntheticReceipt[];
  callbacks: PagingCallback[];
};

function object(input: unknown, fields: string[], name: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    fail(`${name} must be an object`);
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key)))
    fail(`${name} has missing or unknown fields`);
  return value;
}
function string(input: unknown, name: string, max = 200): string {
  if (typeof input !== "string" || !input.length || input !== input.trim() || input.length > max)
    fail(`${name} must be a nonempty trimmed string (maximum ${max})`);
  return input;
}
function records(input: unknown, max: number, name: string, identity = "id"): unknown[] {
  if (!Array.isArray(input) || input.length > max) fail(`${name} must be an array of at most ${max} records`);
  const ids = new Set<string>();
  for (let i = 0; i < input.length; i++) {
    const value = input[i];
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`Invalid ${name} record`);
    const id = string(value[identity], `${name} ID`, 220);
    if (ids.has(id)) fail(`Duplicate ${name} ID`);
    ids.add(id);
  }
  return input;
}
function callback(input: unknown): PagingCallback {
  const value = object(input, ["id", "key", "outcome", "at", "late", "actor"], "Paging callback");
  if (value.outcome !== "accepted" && value.outcome !== "delivered" && value.outcome !== "failed")
    fail("Invalid paging callback outcome");
  if (typeof value.late !== "boolean") fail("Invalid paging callback late flag");
  return {
    id: string(value.id, "Callback ID"), key: string(value.key, "Callback receipt key", 220),
    outcome: value.outcome, at: clock(value.at), late: value.late,
    actor: string(value.actor, "Callback actor"),
  };
}

/**
 * Export checks intrinsic module integrity, including retained historical refs.
 * Import additionally requires corresponding services/incidents in the workspace.
 * Current config never replaces frozen job versions.
 */
export function validatePagingArchive(input: unknown, workspace?: State): PagingArchive {
  const value = object(input, ["schemaVersion", "mode", "schedules", "policies", "jobs", "receipts", "callbacks"], "Paging archive");
  if (value.schemaVersion !== 1 || value.mode !== "synthetic-only") fail("Unsupported paging archive");
  const schedules = records(value.schedules, 64, "schedules").map(raw => validateSchedule(raw));
  const policies = records(value.policies, 64, "policies", "service").map(raw => validatePolicy(raw));
  const jobs = records(value.jobs, 256, "jobs").map(raw => validateJob(raw));
  const receipts = records(value.receipts, 512, "receipts").map(raw => validateReceipt(raw));
  const callbacks = records(value.callbacks, 2048, "callbacks").map(raw => callback(raw));
  const services = new Set(workspace?.services.map(service => service.id) ?? []);
  for (const schedule of schedules) {
    // Historical slots are intentionally retained even when a member disappears.
    if (workspace && !services.has(schedule.service)) fail("Unknown archive schedule service");
  }
  for (const policy of policies) {
    const schedule = schedules.find(schedule => schedule.id === policy.scheduleId);
    if (!schedule || (workspace && !services.has(policy.service))) fail("Unknown archive policy references");
    validatePolicy(policy, schedule);
  }
  const jobsById = new Map(jobs.map(job => [job.id, job]));
  const receiptsById = new Map(receipts.map(receipt => [receipt.id, receipt]));
  for (const job of jobs) {
    if (workspace && (!services.has(job.service) || !workspace.incidents.some(incident => incident.id === job.incident && incident.service === job.service)))
      fail("Unknown archive job incident/service references");
    for (const step of job.steps) {
      if (!step.receipt) continue;
      const receipt = receiptsById.get(step.receipt.id);
      if (!receipt || !sameReceipt(receipt, step.receipt)) fail("Job receipt is missing or differs from archive receipt");
    }
  }
  for (const receipt of receipts) {
    const job = jobsById.get(receipt.jobId);
    const step = job?.steps.find(step => step.step === receipt.step);
    if (!job || !step || !step.receipt || !sameReceipt(receipt, step.receipt) ||
        receipt.key !== step.deliveryKey || receipt.target !== step.target ||
        receipt.incident !== job.incident || receipt.service !== job.service)
      fail("Invalid archive receipt job/step references");
    const firstAcceptance = job.history.find(entry => entry.attempt?.step === receipt.step &&
      ["accepted", "delivered", "uncertain"].includes(entry.attempt.outcome));
    if (!firstAcceptance || receipt.acceptedAt !== firstAcceptance.at)
      fail("Receipt acceptance timestamp differs from first accepted attempt");
  }
  for (const callback of callbacks) {
    const receipt = receiptsById.get(callback.key);
    if (!receipt || callback.at < receipt.acceptedAt) fail("Invalid archive callback receipt/time references");
  }
  // Domain validators may canonicalize accepted timestamp spelling. Validate with
  // them, then retain the original portable representation without rewriting it.
  return structuredClone(input) as PagingArchive;
}

function sameReceipt(a: SyntheticReceipt, b: SyntheticReceipt): boolean {
  return a.id === b.id && a.key === b.key && a.jobId === b.jobId &&
    a.incident === b.incident && a.service === b.service && a.step === b.step &&
    a.target === b.target && a.acceptedAt === b.acceptedAt && a.status === b.status &&
    a.payload.incident === b.payload.incident && a.payload.service === b.payload.service &&
    a.payload.role === b.payload.role && a.payload.target === b.payload.target;
}

/** Call only after archive validation, before the caller's atomic replacement. */
export function preparePagingImport(archive: PagingArchive, at: number): PagingArchive {
  clock(at);
  const prepared = structuredClone(archive);
  prepared.jobs = prepared.jobs.map(job => job.status === "pending"
    ? pause(job, "Module archive import; explicit resume required", Math.max(at, job.lastEvaluatedAt))
    : job);
  return prepared;
}
