import { fail } from '../family/response-operations/domain.ts';
import type { Urgency, UrgencyDecision, UrgencyRule, UrgencyWindow } from './types.ts';
export type { Urgency, UrgencyDecision, UrgencyRule, UrgencyWindow } from './types.ts';

function fields(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    keys.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !keys.includes(key))) fail('Invalid urgency fields');
  return value as Record<string, unknown>;
}
function text(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`Invalid urgency ${name}`);
  return value;
}
function day(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) ||
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) fail('Invalid urgency calendar date');
  return value;
}
function instant(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) ||
    !Number.isFinite(Date.parse(value))) fail('Invalid urgency timestamp');
  day(value.slice(0, 10));
  return value;
}
export const validateUrgencyTimestamp = instant;
function minute(value: unknown): number {
  if (typeof value !== 'string' || !/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/.test(value)) fail('Invalid urgency window time');
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
function urgency(value: unknown): Urgency {
  if (value !== 'high' && value !== 'low') fail('Invalid urgency value');
  return value;
}
function formatter(timezone: string): Intl.DateTimeFormat {
  // Offset identifiers are not named IANA zones; Intl validates the remaining names.
  if (/^[+-]/.test(timezone)) fail('Urgency requires a named IANA timezone');
  try {
    return new Intl.DateTimeFormat('en-US-u-ca-iso8601-nu-latn', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', era: 'short',
    });
  } catch { return fail('Invalid urgency timezone'); }
}
export function validateUrgencyRule(value: unknown): UrgencyRule {
  const v = fields(value, ['version', 'mode', 'timezone', 'weekly', 'holidays', 'inside', 'outside', 'reason', 'by', 'at']);
  if (!Number.isSafeInteger(v.version) || (v.version as number) < 1 ||
    !['high', 'low', 'severity', 'support-hours'].includes(v.mode as string)) fail('Invalid urgency rule version or mode');
  const timezone = text(v.timezone, 'timezone', 100); formatter(timezone);
  if (!Array.isArray(v.weekly) || v.weekly.length > 35) fail('Urgency supports at most 35 weekly windows');
  const weekly: UrgencyWindow[] = Array.from(v.weekly, value => {
    const w = fields(value, ['day', 'start', 'end']);
    if (!Number.isInteger(w.day) || (w.day as number) < 0 || (w.day as number) > 6 || minute(w.start) >= minute(w.end)) fail('Invalid urgency weekly window');
    return {day: w.day as number, start: w.start as string, end: w.end as string};
  });
  const sorted = [...weekly].sort((a, b) => a.day - b.day || minute(a.start) - minute(b.start));
  if (sorted.some((w, i) => i > 0 && sorted[i - 1].day === w.day && minute(sorted[i - 1].end) > minute(w.start))) fail('Overlapping urgency windows');
  if (!Array.isArray(v.holidays) || v.holidays.length > 366) fail('Urgency supports at most 366 holidays');
  const holidays = Array.from(v.holidays, day);
  if (new Set(holidays).size !== holidays.length) fail('Duplicate urgency holiday');
  return {version: v.version as number, mode: v.mode as UrgencyRule['mode'], timezone, weekly, holidays,
    inside: urgency(v.inside), outside: urgency(v.outside), reason: text(v.reason, 'reason', 500),
    by: text(v.by, 'author', 80), at: instant(v.at)};
}
export function evaluateUrgency(rule: UrgencyRule | undefined, severity: unknown, at: string): UrgencyDecision {
  const evaluatedAt = instant(at), snapshot = rule === undefined ? null : validateUrgencyRule(rule);
  let result: Urgency, explanation: string;
  if (!snapshot || snapshot.mode === 'severity') {
    result = severity === 'warning' || severity === 'info' ? 'low' : 'high';
    explanation = `By severity: ${severity === 'critical' || severity === 'error' || severity === 'warning' || severity === 'info' ? severity : 'unknown'} → ${result}`;
  } else if (snapshot.mode === 'support-hours') {
    const parts = Object.fromEntries(formatter(snapshot.timezone).formatToParts(new Date(evaluatedAt)).map(p => [p.type, p.value]));
    const year = parts.era === 'BC' ? 1 - Number(parts.year) : Number(parts.year);
    const date = `${String(year).padStart(4, '0')}-${parts.month}-${parts.day}`;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const localMinute = Number(parts.hour) * 60 + Number(parts.minute), holiday = snapshot.holidays.includes(date);
    const inside = !holiday && snapshot.weekly.some(w => w.day === weekday && minute(w.start) <= localMinute && localMinute < minute(w.end));
    result = inside ? snapshot.inside : snapshot.outside;
    explanation = `${inside ? 'Inside' : 'Outside'} support hours (${snapshot.timezone}${holiday ? ', holiday' : ''}) → ${result}`;
  } else {
    result = snapshot.mode;
    explanation = `Constant ${result}`;
  }
  return {urgency: result, version: snapshot?.version ?? 0,
    reason: snapshot ? `${snapshot.reason}: ${explanation}` : explanation, evaluatedAt, rule: snapshot};
}
export function validateUrgencyDecision(value: unknown, severity: unknown): UrgencyDecision {
  const v = fields(value, ['urgency', 'version', 'reason', 'evaluatedAt', 'rule']);
  const rule = v.rule === null ? undefined : validateUrgencyRule(v.rule);
  const expected = evaluateUrgency(rule, severity, instant(v.evaluatedAt));
  if (v.urgency !== expected.urgency || v.version !== expected.version || v.reason !== expected.reason ||
    v.evaluatedAt !== expected.evaluatedAt) fail('Urgency decision does not match its rule snapshot');
  return expected;
}
