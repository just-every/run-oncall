import type { UrgencyRule } from './types.ts';

type Hours = Pick<UrgencyRule, 'timezone' | 'weekly' | 'holidays'>;
const MINUTE = 60_000, HOUR = 3_600_000;
const minuteOf = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

/** The local clock of a support-hours rule. Admission and the alert screen read the same one. */
export function supportClock(timezone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', era: 'short',
  });
}
export function supportHours(rule: Hours, clock: Intl.DateTimeFormat, at: number) {
  const parts = Object.fromEntries(clock.formatToParts(new Date(at)).map(p => [p.type, p.value]));
  const year = parts.era === 'BC' ? 1 - Number(parts.year) : Number(parts.year);
  const date = `${String(year).padStart(4, '0')}-${parts.month}-${parts.day}`;
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  const localMinute = Number(parts.hour) * 60 + Number(parts.minute), holiday = rule.holidays.includes(date);
  const inside = !holiday && rule.weekly.some(w => w.day === weekday && minuteOf(w.start) <= localMinute && localMinute < minuteOf(w.end));
  return {inside, holiday, date, weekday, localMinute};
}
/** The first minute after `at` at which support hours begin, searched over about a year; null when none does. */
export function nextSupportStart(rule: Hours, at: number): number | null {
  const clock = supportClock(rule.timezone), inside = (t: number) => supportHours(rule, clock, t).inside;
  let t = Math.floor(at / MINUTE) * MINUTE + MINUTE;
  for (let step = 0; step < 370 * 24; step++, t += HOUR) {
    const now = supportHours(rule, clock, t);
    // Window starts within this hour, in local minutes from t (including tomorrow's early windows).
    const starts = rule.weekly.map(w => ((w.day - now.weekday + 7) % 7) * 1440 + minuteOf(w.start) - now.localMinute)
      .filter(offset => offset >= 0 && offset < 60).sort((a, b) => a - b);
    for (const offset of starts) {
      const start = t + offset * MINUTE;
      if (inside(start) && !inside(start - MINUTE)) return start;
    }
    // A daylight-saving gap can move a start off its wall minute; find the first inside minute instead.
    if (!now.inside && inside(t + HOUR)) {
      for (let m = 1; m <= 60; m++) if (inside(t + m * MINUTE)) return t + m * MINUTE;
    }
  }
  return null;
}
