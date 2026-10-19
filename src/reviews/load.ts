import type { State } from '../family/response-operations/domain.ts';
import { coverageSpans, type Schedule } from '../family/response-operations/schedules.ts';
import { firstAcknowledgement, type ResponseReport } from './report.ts';
import type { AlertNoise } from './noise.ts';

export type Scheduling = {revision: number; schedules: Schedule[]};
type Interval = [number, number];
const DAY_SECONDS = 86_400;

function seconds(intervals: Interval[]): number {
  let total = 0, end = -Infinity;
  for (const [start, stop] of [...intervals].sort((a, b) => a[0] - b[0])) {
    if (stop > end) { total += stop - Math.max(start, end); end = stop; }
  }
  return total / 1000;
}
const ratio = (value: number, total: number) => total > 0 ? value / total : null;
function slot<T>(map: Map<string, T>, key: string, make: () => T): T {
  if (!map.has(key)) map.set(key, make());
  return map.get(key)!;
}

/** Scheduled coverage per responder and service from current schedules, and acknowledgement load normalised by it. */
export function coverageLoad(state: State, scheduling: Scheduling, report: ResponseReport) {
  const from = Date.parse(report.cohort.from), through = Math.max(from, Math.min(Date.parse(report.cohort.to), Date.parse(report.generatedAt)));
  const schedules = scheduling.schedules.filter(s => report.cohort.service === null || s.service === report.cohort.service)
    .sort((a, b) => a.id.localeCompare(b.id));
  const held = new Map<string, {primary: Interval[]; backup: Interval[]}>(), covered = new Map<string, Interval[]>();
  for (const schedule of schedules) {
    const service = slot(covered, schedule.service, () => []);
    for (const span of coverageSpans(schedule, state.members, from, through)) {
      const interval: Interval = [span.start, span.end];
      for (const window of span.coverage.windows)
        if (window.member !== null) slot(held, window.member, () => ({primary: [], backup: []}))[window.role].push(interval);
      if (span.coverage.primary !== null) service.push(interval);
    }
  }
  const scheduledAt = (member: string, service: string, at: number) => schedules.some(s => s.service === service &&
    coverageSpans(s, state.members, at, at + 1).some(span => span.coverage.primary === member || span.coverage.backup === member));
  const acknowledgements = report.incidents.flatMap(row => {
    const incident = state.incidents.find(i => i.id === row.id), entry = incident && firstAcknowledgement(incident);
    if (!incident || !entry) return [];
    const at = Date.parse(entry.at);
    return [{member: entry.actor, service: incident.service, scheduled: Number.isFinite(at) ? scheduledAt(entry.actor, incident.service, at) : null}];
  });
  const totalPrimary = [...held.values()].reduce((sum, h) => sum + seconds(h.primary), 0);
  const people = [...new Set([...held.keys(), ...acknowledgements.map(a => a.member)])];
  const responders = people.map(id => {
    const member = state.members.find(m => m.id === id), mine = acknowledgements.filter(a => a.member === id);
    const primarySeconds = seconds(held.get(id)?.primary ?? []), backupSeconds = seconds(held.get(id)?.backup ?? []);
    const acknowledgementShare = ratio(mine.length, acknowledgements.length), primaryShare = ratio(primarySeconds, totalPrimary);
    return {member: id, name: member?.name ?? null, current: !!member?.active, primarySeconds, backupSeconds,
      acknowledgements: mine.length, outsideCoverage: mine.filter(a => a.scheduled === false).length,
      unknownTime: mine.filter(a => a.scheduled === null).length,
      per24PrimaryHours: ratio(mine.length, primarySeconds / DAY_SECONDS), acknowledgementShare, primaryShare,
      loadToCoverage: acknowledgementShare === null || !primaryShare ? null : acknowledgementShare / primaryShare};
  }).sort((a, b) => (a.name ?? a.member).localeCompare(b.name ?? b.member) || a.member.localeCompare(b.member));
  const range = (through - from) / 1000;
  const serviceIds = [...new Set([...covered.keys(), ...report.incidents.map(i => i.service)])].sort();
  const services = serviceIds.map(id => {
    const incidents = report.incidents.filter(i => i.service === id).length, primarySeconds = covered.has(id) ? seconds(covered.get(id)!) : null;
    return {service: id, name: state.services.find(s => s.id === id)?.name ?? null, schedules: schedules.filter(s => s.service === id).length,
      incidents, acknowledgements: acknowledgements.filter(a => a.service === id).length,
      primarySeconds, uncoveredPrimarySeconds: primarySeconds === null ? null : range - primarySeconds,
      per24PrimaryHours: primarySeconds === null ? null : ratio(incidents, primarySeconds / DAY_SECONDS)};
  });
  return {schedulingRevision: scheduling.revision, from: new Date(from).toISOString(), through: new Date(through).toISOString(),
    schedules: schedules.map(s => ({id: s.id, name: s.name, service: s.service, revision: s.revision, timezone: s.timezone})),
    acknowledged: acknowledgements.length, unacknowledged: report.incidents.length - acknowledgements.length, responders, services,
    basis: [
      'Scheduled hours come from the current revision of each schedule (its rotations and overrides) and current membership, over the cohort range up to the observation time. They are scheduled hours, not worked hours.',
      'Earlier schedule revisions are not retained, so a schedule change recomputes past scheduled hours; the schedule revisions used are listed. A slot held by a member who is now inactive or not a responder counts as uncovered.',
      'Load is the first explicit acknowledgement of each cohort incident, the entry acknowledgement time is measured to. Unacknowledged incidents are counted as unattributed, never assigned to anyone.',
      'Load is normalised by scheduled primary hours, the role a page reaches first; backup hours are shown separately. Load to coverage is the share of acknowledgements divided by the share of primary hours: 1 means load in proportion to coverage. Without primary hours no rate is given.',
      'Outside coverage counts acknowledgements made while the responder held neither primary nor backup on a schedule of that incident\'s service. Overlapping schedules count each hour once.',
      'Teams are not modelled yet, so load is broken out by responder and by service.',
    ]};
}
export type CoverageLoad = ReturnType<typeof coverageLoad>;
export type ProjectedReport = ResponseReport & {load: CoverageLoad; noise: AlertNoise};
