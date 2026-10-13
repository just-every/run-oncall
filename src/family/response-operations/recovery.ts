import { fail, validateArchive, type State } from "./domain.ts";
import { validatePagingArchive, type PagingArchive } from "./paging-archive.ts";

export type RecoveryCheckpoint = {
  schemaVersion: 1;
  kind: "oncall-recovery-checkpoint";
  capturedAt: string;
  workspaceRevision: number;
  pagingRevision: number;
  coordination: State;
  paging: PagingArchive;
};
export type RecoveryReferenceIssue = {
  record: "schedule" | "policy" | "job";
  id: string;
  service: string;
  incident: string | null;
  missing: Array<"service" | "incident" | "incident-service">;
};

const MIN = Date.UTC(2000, 0, 1);
const MAX = Date.UTC(2101, 0, 1);
function revision(input: unknown, name: string): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 0)
    fail(`${name} must be a safe nonnegative integer`);
  return input;
}
function clock(at: number): string {
  if (!Number.isSafeInteger(at) || at < MIN || at >= MAX)
    fail("Recovery capture clock must be integer epoch milliseconds in 2000–2100");
  return new Date(at).toISOString();
}
function capturedAt(input: unknown): string {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input))
    fail("Recovery capturedAt must be a canonical UTC ISO timestamp");
  const at = Date.parse(input);
  if (!Number.isSafeInteger(at) || at < MIN || at >= MAX || new Date(at).toISOString() !== input)
    fail("Recovery capturedAt must be a real canonical UTC timestamp in 2000–2100");
  return input;
}

/** Pure diagnostics only; missing historical references never grant authority. */
export function recoveryReferenceIssues(coordination: State, paging: PagingArchive): RecoveryReferenceIssue[] {
  const services = new Set(coordination.services.map(service => service.id));
  const incidents = new Map(coordination.incidents.map(incident => [incident.id, incident]));
  const issues: RecoveryReferenceIssue[] = [];
  for (const schedule of paging.schedules) if (!services.has(schedule.service))
    issues.push({ record: "schedule", id: schedule.id, service: schedule.service, incident: null, missing: ["service"] });
  for (const policy of paging.policies) if (!services.has(policy.service))
    issues.push({ record: "policy", id: policy.service, service: policy.service, incident: null, missing: ["service"] });
  for (const job of paging.jobs) {
    const missing: RecoveryReferenceIssue["missing"] = [];
    if (!services.has(job.service)) missing.push("service");
    const incident = incidents.get(job.incident);
    if (!incident) missing.push("incident");
    else if (incident.service !== job.service) missing.push("incident-service");
    if (missing.length) issues.push({ record: "job", id: job.id, service: job.service, incident: job.incident, missing });
  }
  return issues;
}

/** Validate intrinsic records while admitting legitimate paused/finished orphans. */
export function validateRecoveryCheckpoint(input: unknown): RecoveryCheckpoint {
  const keys = ["schemaVersion", "kind", "capturedAt", "workspaceRevision", "pagingRevision", "coordination", "paging"];
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Recovery checkpoint must be an object");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key)))
    fail("Recovery checkpoint has missing or unknown fields");
  if (value.schemaVersion !== 1 || value.kind !== "oncall-recovery-checkpoint") fail("Unsupported recovery checkpoint");
  const captured = capturedAt(value.capturedAt);
  const workspaceRevision = revision(value.workspaceRevision, "Workspace revision");
  const pagingRevision = revision(value.pagingRevision, "Paging revision");
  const coordination = validateArchive(value.coordination);
  if (workspaceRevision !== coordination.revision) fail("Recovery workspace revision differs from coordination data");
  const paging = validatePagingArchive(value.paging);
  const pending = new Set(paging.jobs.filter(job => job.status === "pending").map(job => job.id));
  if (recoveryReferenceIssues(coordination, paging).some(issue => issue.record === "job" && pending.has(issue.id)))
    fail("Pending recovery job has missing or mismatched incident/service references");
  return { schemaVersion: 1, kind: "oncall-recovery-checkpoint", capturedAt: captured,
    workspaceRevision, pagingRevision, coordination, paging };
}

/** The edition supplies both datasets/revisions from its single storage snapshot. */
export function createRecoveryCheckpoint(coordination: State, paging: PagingArchive, pagingRevision: number, at: number): RecoveryCheckpoint {
  return validateRecoveryCheckpoint({ schemaVersion: 1, kind: "oncall-recovery-checkpoint", capturedAt: clock(at),
    workspaceRevision: coordination.revision, pagingRevision, coordination, paging });
}
