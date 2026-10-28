import {coverage, preview} from '../family/response-operations/schedules';
import type {State} from '../family/response-operations/domain';
import type {PagingArchive} from '../family/response-operations/paging-archive';

const DAY = 86_400_000;
const roles = ['primary', 'backup'] as const;
export type OnCallMember = {id: string; name: string};
export type OnCallBand = {role: 'primary' | 'backup'; member: OnCallMember | null; from: string; to: string};
export type OnCallRota = {
  id: string; name: string; service: {id: string; name: string}; zone: string;
  rhythm: {every: number; weekday: string; time: string};
  now: {primary: OnCallMember | null; backup: OnCallMember | null; until: string | null};
  next: {at: string; primary: OnCallMember | null; backup: OnCallMember | null} | null;
  gaps: {role: 'primary' | 'backup'; from: string; to: string}[];
  week: OnCallBand[];
};
export type OnCall = {at: string; rotas: OnCallRota[]; unrostered: {id: string; name: string}[]};

/** All windows use the same half-open, named-zone resolver as the private ICS feed. */
export function onCall(workspace: State, archive: Pick<PagingArchive, 'schedules'>, at: number): OnCall {
  const member = (id: string | null): OnCallMember | null => {
    const person = workspace.members.find(row => row.id === id);
    return person ? {id: person.id, name: person.name} : null;
  };
  const rotas = archive.schedules.flatMap(schedule => {
    const service = workspace.services.find(row => row.id === schedule.service);
    if (!service) return [];
    const now = coverage(schedule, workspace.members, at);
    const ends = now.windows.flatMap(window => window.end && Date.parse(window.end) > at ? [Date.parse(window.end)] : []);
    const nextAt = ends.length ? Math.min(...ends) : null;
    const next = nextAt === null ? null : coverage(schedule, workspace.members, nextAt);
    const from = at - DAY, to = at + 7 * DAY, weekEnd = at + 6 * DAY;
    const values = preview(schedule, workspace.members, from, to);
    const week: OnCallBand[] = [], gaps: OnCallRota['gaps'] = [];
    for (const role of roles) for (let index = 0; index < values.length; index++) {
      const value = values[index], end = Math.min(to, values[index + 1]?.at ?? to);
      if (value.at < weekEnd) {
        const band = {role, member: member(value[role]), from: new Date(value.at).toISOString(), to: new Date(Math.min(end, weekEnd)).toISOString()};
        const previous = week.at(-1);
        if (previous?.role === role && previous.member?.id === band.member?.id && previous.to === band.from) previous.to = band.to;
        else week.push(band);
      }
      if (!value[role] && end > at) {
        const gap = {role, from: new Date(Math.max(at, value.at)).toISOString(), to: new Date(end).toISOString()};
        const previous = gaps.at(-1);
        if (previous?.role === role && previous.to === gap.from) previous.to = gap.to;
        else gaps.push(gap);
      }
    }
    const anchor = schedule.primary.anchorLocal;
    return [{id: schedule.id, name: schedule.name, service: {id: service.id, name: service.name}, zone: schedule.timezone,
      rhythm: {every: schedule.primary.periodDays, weekday: new Intl.DateTimeFormat('en-GB', {weekday: 'long', timeZone: 'UTC'}).format(new Date(anchor + 'Z')), time: anchor.slice(11, 16)},
      now: {primary: member(now.primary), backup: member(now.backup), until: nextAt === null ? null : new Date(nextAt).toISOString()},
      next: next && nextAt !== null ? {at: new Date(nextAt).toISOString(), primary: member(next.primary), backup: member(next.backup)} : null, gaps, week}];
  });
  return {at: new Date(at).toISOString(), rotas, unrostered: workspace.services.filter(service => !rotas.some(rota => rota.service.id === service.id)).map(({id, name}) => ({id, name}))};
}
