import { fail } from "./domain.ts";

export type Ambiguity = "earlier" | "later" | "reject";
export type Rotation = {
  anchorLocal: string;
  periodDays: number;
  members: string[];
  ambiguity: Ambiguity;
};
export type Override = {
  id: string;
  role: "primary" | "backup";
  start: string;
  end: string;
  member: string | null;
};
export type Schedule = {
  id: string;
  name: string;
  service: string;
  revision: number;
  timezone: string;
  validFrom: string;
  validUntil: string | null;
  primary: Rotation;
  backup: Rotation;
  overrides: Override[];
};
export type CoverageMember = { id: string; name?: string; active: boolean; role: string };
export type CoverageWindow = {
  role: "primary" | "backup";
  member: string | null;
  start: string | null;
  end: string | null;
  origin: "rotation" | "override" | "gap";
};
export type Coverage = {
  at: number;
  timezone: string;
  scheduleId: string;
  scheduleRevision: number;
  primary: string | null;
  backup: string | null;
  warnings: string[];
  windows: CoverageWindow[];
};

const MIN = Date.UTC(2000, 0, 1);
const MAX = Date.UTC(2101, 0, 1);
const DAY = 86_400_000;
const ROLES = ["primary", "backup"] as const;
const ambiguous = (value: unknown): value is Ambiguity =>
  value === "earlier" || value === "later" || value === "reject";

function object(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${label} must be an object`);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== keys.length || keys.some(k => !Object.hasOwn(record, k)))
    fail(`${label} has missing or unknown fields`);
  return record;
}
function string(value: unknown, label: string, max = 100): string {
  if (typeof value !== "string" || !value.length || value.length > max || value !== value.trim())
    fail(`${label} must be a nonempty trimmed string (maximum ${max})`);
  return value;
}
function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max)
    fail(`${label} must be an integer from ${min} to ${max}`);
  return value;
}
function utc(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))
    fail(`${label} must be an exact UTC ISO timestamp`);
  const at = Date.parse(value);
  if (!Number.isFinite(at) || at < MIN || at >= MAX || new Date(at).toISOString() !== (value.length === 20 ? value.replace("Z", ".000Z") : value))
    fail(`${label} must be a real UTC date in 2000–2100`);
  return new Date(at).toISOString();
}
function localEpoch(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    fail("Local boundary must use YYYY-MM-DDTHH:mm");
  const at = Date.parse(`${value}:00.000Z`);
  if (!Number.isFinite(at) || at < MIN || at >= MAX || new Date(at).toISOString().slice(0, 16) !== value)
    fail("Local boundary must be a real calendar minute in 2000–2100");
  return at;
}
function formatter(zone: unknown): Intl.DateTimeFormat {
  const name = string(zone, "timezone");
  if (name !== "UTC" && !name.includes("/")) fail("Timezone must be a named IANA zone or UTC");
  try {
    return new Intl.DateTimeFormat("en-US-u-ca-iso8601-nu-latn", {
      timeZone: name, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
  } catch { return fail("Invalid IANA timezone"); }
}
function wallEpoch(format: Intl.DateTimeFormat, at: number): number {
  const parts: Record<string, number> = {};
  for (const p of format.formatToParts(at)) if (p.type !== "literal") parts[p.type] = Number(p.value);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

// Discover offsets around the target, then round-trip every candidate. This supports
// non-hour shifts and date-line gaps without assuming a timezone's standard offset.
function localResolver(format: Intl.DateTimeFormat) {
  const cache = new Map<string, number | null>();
  return (wall: number, policy: Ambiguity): number | null => {
    if (wall < MIN || wall >= MAX) return null;
    const key = `${wall}:${policy}`;
    if (cache.has(key)) return cache.get(key)!;
    const offsets = new Set<number>();
    for (let hours = -48; hours <= 48; hours += 6) {
      const probe = wall + hours * 3_600_000;
      offsets.add(wallEpoch(format, probe) - probe);
    }
    const candidates = [...offsets].map(offset => wall - offset)
      .filter(at => wallEpoch(format, at) === wall).sort((a, b) => a - b);
    const result = !candidates.length || (candidates.length > 1 && policy === "reject")
      ? null : policy === "later" ? candidates[candidates.length - 1] : candidates[0];
    cache.set(key, result);
    return result;
  };
}

/** A nonexistent or policy-rejected repeated wall minute has no UTC instant. */
export function resolveLocal(local: string, zone: string, ambiguity: Ambiguity): number | null {
  if (!ambiguous(ambiguity)) fail("Invalid ambiguity policy");
  return localResolver(formatter(zone))(localEpoch(local), ambiguity);
}

export function validateSchedule(input: unknown, known?: {
  services: { id: string }[];
  members: CoverageMember[];
}): Schedule {
  const value = object(input, ["id", "name", "service", "revision", "timezone", "validFrom", "validUntil", "primary", "backup", "overrides"], "Schedule");
  const timezone = string(value.timezone, "timezone");
  const canonicalZone = formatter(timezone).resolvedOptions().timeZone;
  const validFrom = utc(value.validFrom, "validFrom");
  const validUntil = value.validUntil === null ? null : utc(value.validUntil, "validUntil");
  if (validUntil !== null && validUntil <= validFrom) fail("Schedule validity must be a positive half-open interval");
  const references: string[] = [];
  function rotation(input: unknown, label: string): Rotation {
    const v = object(input, ["anchorLocal", "periodDays", "members", "ambiguity"], label);
    const anchorLocal = string(v.anchorLocal, `${label} anchor`, 16);
    localEpoch(anchorLocal);
    const periodDays = integer(v.periodDays, `${label} periodDays`, 1, 366);
    if (!ambiguous(v.ambiguity)) fail(`${label} requires an explicit ambiguity policy`);
    if (!Array.isArray(v.members) || v.members.length > 100) fail(`${label} has maximum 100 fixed member slots`);
    const members = v.members.map(m => string(m, "member ID"));
    references.push(...members);
    return { anchorLocal, periodDays, members, ambiguity: v.ambiguity };
  }
  const primary = rotation(value.primary, "primary");
  const backup = rotation(value.backup, "backup");
  if (!Array.isArray(value.overrides) || value.overrides.length > 1000) fail("Maximum 1000 overrides");
  const overrides: Override[] = value.overrides.map(input => {
    const o = object(input, ["id", "role", "start", "end", "member"], "Override");
    if (o.role !== "primary" && o.role !== "backup") fail("Invalid override role");
    const start = utc(o.start, "override start"), end = utc(o.end, "override end");
    if (end <= start) fail("Override must be a positive half-open interval");
    if (start < validFrom || (validUntil !== null && end > validUntil)) fail("Override must lie within schedule validity");
    const member = o.member === null ? null : string(o.member, "override member");
    if (member !== null) references.push(member);
    return { id: string(o.id, "override ID"), role: o.role, start, end, member };
  });
  if (new Set(overrides.map(o => o.id)).size !== overrides.length) fail("Duplicate override ID");
  for (const role of ROLES) {
    const ordered = overrides.filter(o => o.role === role).sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < ordered.length; i++) if (ordered[i].start < ordered[i - 1].end) fail(`Overlapping ${role} overrides`);
  }
  const service = string(value.service, "service ID");
  if (known && !known.services.some(s => s.id === service)) fail("Unknown schedule service");
  if (known && references.some(id => !known.members.some(m => m.id === id))) fail("Unknown schedule member");
  return {
    id: string(value.id, "schedule ID"), name: string(value.name, "schedule name", 200),
    service, revision: integer(value.revision, "schedule revision", 0, Number.MAX_SAFE_INTEGER),
    timezone: canonicalZone, validFrom, validUntil, primary, backup, overrides,
  };
}

function evaluationClock(at: number, endpoint = false): void {
  if (!Number.isSafeInteger(at) || at < MIN || (endpoint ? at > MAX : at >= MAX))
    fail("Evaluation clock must be integer epoch milliseconds in 2000–2100");
}
type RawWindow = { member: string | null; start: number | null; end: number | null; origin: CoverageWindow["origin"]; warning?: string };
function evaluator(schedule: Schedule, members: CoverageMember[]) {
  const format = formatter(schedule.timezone), resolve = localResolver(format);
  const from = Date.parse(schedule.validFrom), until = schedule.validUntil === null ? null : Date.parse(schedule.validUntil);
  function rotationWindow(rotation: Rotation, at: number): RawWindow {
    const anchor = localEpoch(rotation.anchorLocal), period = rotation.periodDays * DAY;
    const estimate = Math.floor((wallEpoch(format, at) - anchor) / period);
    // A civil-day discontinuity can move the wall estimate across a boundary.
    // Include neighbors on both sides, and retain the calendar indices.
    const boundaries = [];
    for (let index = estimate - 2; index <= estimate + 2; index++)
      boundaries.push({ index, instant: resolve(anchor + index * period, rotation.ambiguity) });
    for (let i = 0; i + 1 < boundaries.length; i++) {
      const start = boundaries[i].instant, end = boundaries[i + 1].instant;
      if (start !== null && end !== null && start <= at && at < end) {
        const slot = ((boundaries[i].index % rotation.members.length) + rotation.members.length) % rotation.members.length;
        return { member: rotation.members[slot] ?? null, start, end, origin: rotation.members.length ? "rotation" : "gap", warning: rotation.members.length ? undefined : "rotation has no member slots" };
      }
    }
    const earlier = boundaries.map(b => b.instant).filter((n): n is number => n !== null && n <= at);
    const later = boundaries.map(b => b.instant).filter((n): n is number => n !== null && n > at);
    return { member: null, start: earlier.length ? Math.max(...earlier) : null, end: later.length ? Math.min(...later) : null, origin: "gap", warning: "calendar boundary is nonexistent, rejected as ambiguous, or outside supported years" };
  }
  return (at: number): Coverage => {
    const warnings: string[] = [];
    const windows: CoverageWindow[] = ROLES.map(role => {
      let window: RawWindow;
      if (at < from) window = { member: null, start: null, end: from, origin: "gap", warning: "schedule has not started" };
      else if (until !== null && at >= until) window = { member: null, start: until, end: null, origin: "gap", warning: "schedule has ended" };
      else {
        const overrides = schedule.overrides.filter(o => o.role === role);
        const active = overrides.find(o => Date.parse(o.start) <= at && at < Date.parse(o.end));
        window = active
          ? { member: active.member, start: Date.parse(active.start), end: Date.parse(active.end), origin: "override", warning: active.member === null ? "override explicitly leaves coverage empty" : undefined }
          : rotationWindow(schedule[role], at);
        window.start = Math.max(window.start ?? from, from);
        if (until !== null) window.end = Math.min(window.end ?? until, until);
        if (!active) for (const o of overrides) {
          const start = Date.parse(o.start), end = Date.parse(o.end);
          if (end <= at) window.start = Math.max(window.start, end);
          if (start > at) window.end = Math.min(window.end ?? start, start);
        }
      }
      if (window.warning) warnings.push(`${role}: ${window.warning}`);
      if (window.member !== null) {
        const member = members.find(m => m.id === window.member);
        if (!member || !member.active || !["admin", "responder"].includes(member.role)) {
          warnings.push(`${role}: member ${member?.name ?? window.member} is ${!member ? "missing" : !member.active ? "inactive" : "not an authorized responder"}; slot is retained`);
          window.member = null;
          window.origin = "gap";
        }
      }
      return { role, member: window.member, start: window.start === null ? null : new Date(window.start).toISOString(), end: window.end === null ? null : new Date(window.end).toISOString(), origin: window.origin };
    });
    if (windows[0].member !== null && windows[0].member === windows[1].member) {
      warnings.push(`backup: same member ${members.find(member => member.id === windows[0].member)?.name ?? windows[0].member} as primary; backup is unavailable`);
      windows[1].member = null;
      windows[1].origin = "gap";
      if (windows[0].start !== null) windows[1].start = windows[1].start === null ? windows[0].start : [windows[0].start, windows[1].start].sort()[1];
      if (windows[0].end !== null) windows[1].end = windows[1].end === null ? windows[0].end : [windows[0].end, windows[1].end].sort()[0];
    }
    return { at, timezone: schedule.timezone, scheduleId: schedule.id, scheduleRevision: schedule.revision,
      primary: windows[0].member, backup: windows[1].member, warnings, windows };
  };
}

/** Evaluate a retained configuration and caller-supplied membership snapshot. No clock reads or effects. */
export function coverage(schedule: Schedule, members: CoverageMember[], at: number): Coverage {
  evaluationClock(at);
  return evaluator(validateSchedule(schedule), members)(at);
}

/** Half-open preview, containing the initial evaluation and every effective window boundary. */
export function preview(schedule: Schedule, members: CoverageMember[], from: number, to: number): Coverage[] {
  evaluationClock(from); evaluationClock(to, true);
  if (to <= from || to - from > 31 * DAY) fail("Preview must be positive and at most 31 elapsed days");
  const evaluate = evaluator(validateSchedule(schedule), members), result: Coverage[] = [];
  let at = from;
  while (at < to) {
    if (result.length >= 200) fail("Preview exceeds 200 coverage boundaries");
    const value = evaluate(at);
    result.push(value);
    const ends = value.windows.map(w => w.end === null ? null : Date.parse(w.end))
      .filter((end): end is number => end !== null && end > at);
    if (!ends.length) break;
    at = Math.min(...ends);
  }
  return result;
}
