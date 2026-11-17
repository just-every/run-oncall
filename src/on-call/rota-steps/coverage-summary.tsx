import type {Coverage, Schedule} from '../../family/response-operations/schedules';
import type {State} from '../../family/response-operations/domain';
import {GapTime} from '../time';

export function coverageRuns(schedule: Schedule, windows: Coverage[], to: number, role: 'primary' | 'backup') {
  const runs: {from: number; to: number; member: string | null}[] = [];
  for (const [index, window] of windows.entries()) {
    const from = Math.max(window.at, Date.parse(schedule.validFrom)), end = windows[index + 1]?.at ?? to;
    if (end <= from) continue;
    const previous = runs.at(-1);
    if (previous?.member === window[role] && previous.to === from) previous.to = end;
    else runs.push({from, to: end, member: window[role]});
  }
  return runs;
}

export function CoverageGaps({schedule, windows, to}: {schedule: Schedule; windows: Coverage[]; to: number}) {
  const gaps = (['primary', 'backup'] as const).flatMap(role => coverageRuns(schedule, windows, to, role).filter(run => !run.member).map(run => ({...run, role})));
  return gaps.length ? <ul aria-label="Coverage gaps">{gaps.map(gap => <li key={gap.role + gap.from}>Nobody is on call <GapTime from={new Date(gap.from).toISOString()} to={new Date(gap.to).toISOString()} zone={schedule.timezone}/> ({gap.role})</li>)}</ul> : <p>Nobody is on call: none in the times shown.</p>;
}

export function CoverageSummary({schedule, windows, to, state}: {schedule: Schedule; windows: Coverage[]; to: number; state: State}) {
  const name = (id: string | null) => state.members.find(person => person.id === id)?.name ?? 'Nobody';
  const date = (at: number) => new Intl.DateTimeFormat('en-GB', {timeZone: schedule.timezone, weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).format(at);
  const primary = coverageRuns(schedule, windows, to, 'primary'), backup = coverageRuns(schedule, windows, to, 'backup');
  const first = primary[0], next = primary[1];
  const regular = !schedule.layers?.length && !schedule.pto?.length && !schedule.overrides.length;
  const rhythm = schedule.primary.periodDays === 7 ? 'week' : schedule.primary.periodDays === 1 ? 'day' : `${schedule.primary.periodDays} days`;
  return <div className="oc-check-summary">
    {first && <p>{first.member ? `${name(first.member)} is on` : 'Nobody is on call'} from {date(first.from)} to {date(first.to)}{next ? `, then ${name(next.member)}` : ''}.{regular && primary.length > 1 ? ` Hand-over every ${rhythm}.` : ''}</p>}
    {backup[0] && <p>Backup: {name(backup[0].member)}{backup[1] ? `, then ${name(backup[1].member)}` : ''}.</p>}
    <p className="oc-quiet" data-time-zone={schedule.timezone}>Times shown in {schedule.timezone}</p>
    <CoverageGaps schedule={schedule} windows={windows} to={to}/>
  </div>;
}
