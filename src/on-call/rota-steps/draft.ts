import {resolveLocal, type Ambiguity, type Schedule} from '../../family/response-operations/schedules';

const DAY = 86_400_000;
export class RotaDraftError extends Error {
  constructor(readonly field: 'handover' | 'ends', message: string) {super(message);}
}
export type RotaDraft = {
  id: string; revision: number; name: string; service: string; zone: string;
  primary: string[]; differentBackup: boolean; backup: string[];
  starts: string; time: string; every: number; customEvery?: boolean; ambiguity: Ambiguity; ends: string;
  original?: Schedule;
  layers?: Schedule["layers"]; companyDates?: Schedule["companyDates"]; pto?: Schedule["pto"];
};
export const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export function localDate(at: number, zone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(at).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function nextBackup(primary: string[]) {return primary.length > 1 ? [...primary.slice(1), primary[0]] : [];}
export function newDraft(service: string, members: string[]): RotaDraft {
  const zone = viewerZone();
  return {id: 'rota-' + crypto.randomUUID().replaceAll('-', '').slice(0, 8), revision: 0, name: '', service, zone,
    primary: members, differentBackup: false, backup: [], starts: localDate(Date.now(), zone).slice(0, 10), time: '09:00', every: 7, ambiguity: 'earlier', ends: ''};
}
export function editDraft(schedule: Schedule): RotaDraft {
  return {id: schedule.id, revision: schedule.revision, name: schedule.name, service: schedule.service, zone: schedule.timezone,
    primary: [...schedule.primary.members], differentBackup: JSON.stringify(nextBackup(schedule.primary.members)) !== JSON.stringify(schedule.backup.members), backup: [...schedule.backup.members],
    starts: schedule.primary.anchorLocal.slice(0, 10), time: schedule.primary.anchorLocal.slice(11, 16), every: schedule.primary.periodDays, ambiguity: schedule.primary.ambiguity,
    ends: schedule.validUntil ? localDate(Date.parse(schedule.validUntil), schedule.timezone).slice(0, 10) : '', original: schedule};
}
export function toSchedule(draft: RotaDraft): Schedule {
  const anchorLocal = draft.starts + 'T' + draft.time;
  const at = resolveLocal(anchorLocal, draft.zone, draft.ambiguity);
  if (at === null) throw new RotaDraftError('handover', 'This hand-over time does not occur in the chosen time zone. Choose another time.');
  const unchangedAnchor = draft.original?.primary.anchorLocal === anchorLocal && draft.original.timezone === draft.zone;
  const end = draft.ends ? resolveLocal(draft.ends + 'T' + draft.time, draft.zone, draft.ambiguity) : null;
  if (draft.ends && (end === null || end <= at)) throw new RotaDraftError('ends', 'Choose an end after the rota starts.');
  const rotation = {anchorLocal, periodDays: draft.every, ambiguity: draft.ambiguity};
  const unchangedHandover = unchangedAnchor && draft.every === draft.original?.primary.periodDays && draft.ambiguity === draft.original.primary.ambiguity;
  const backupRotation = unchangedHandover ? {anchorLocal:draft.original!.backup.anchorLocal,periodDays:draft.original!.backup.periodDays,ambiguity:draft.original!.backup.ambiguity} : rotation;
  return {id: draft.id, revision: draft.revision, name: draft.name.trim() || 'New rota', service: draft.service, timezone: draft.zone,
    validFrom: unchangedAnchor ? draft.original!.validFrom : new Date(at).toISOString(),
    validUntil: draft.ends ? draft.original?.validUntil && localDate(Date.parse(draft.original.validUntil), draft.zone).slice(0, 10) === draft.ends ? draft.original.validUntil : new Date(end!).toISOString() : null,
    primary: {...rotation, members: draft.primary}, backup: {...backupRotation, members: draft.differentBackup ? draft.backup : nextBackup(draft.primary)},
    overrides: draft.original?.overrides ?? [],
    ...Object.fromEntries((['layers','companyDates','pto'] as const).flatMap(key => {const value=draft[key]??draft.original?.[key];return value===undefined?[]:[[key,value]];}))};
}
export function hasRepeatedHandover(draft: RotaDraft, now = Date.now()): boolean {
  if (!draft.starts || !draft.time || !Number.isInteger(draft.every) || draft.every < 1) return false;
  const anchor = Date.parse(`${draft.starts}T${draft.time}Z`), stop = now + 366 * DAY;
  const first = Math.max(0, Math.floor((now - anchor) / (draft.every * DAY)) - 1);
  for (let index = first; index <= first + Math.ceil(366 / draft.every) + 2; index++) {
    const local = new Date(anchor + index * draft.every * DAY).toISOString().slice(0, 16);
    if (draft.ends && local.slice(0, 10) > draft.ends) break;
    const earlier = resolveLocal(local, draft.zone, 'earlier'), later = resolveLocal(local, draft.zone, 'later');
    if (earlier !== null && later !== null && earlier >= now && earlier <= stop && earlier !== later) return true;
  }
  return false;
}
export function zoneList() {
  const own = viewerZone();
  const supported = (Intl as typeof Intl & {supportedValuesOf?: (key: string) => string[]}).supportedValuesOf?.('timeZone') ?? ['America/New_York', 'Europe/London', 'Asia/Tokyo'];
  return [own, ...supported.filter(zone => zone !== own), ...(own === 'UTC' ? [] : ['UTC'])];
}

/** A damaged local draft never prevents opening a rota. */
export function isRotaDraft(value: unknown): value is RotaDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as RotaDraft;
  return ['id','name','service','zone','starts','time','ends'].every(key => typeof draft[key as keyof RotaDraft] === 'string')
    && Number.isSafeInteger(draft.revision) && draft.revision >= 0
    && Number.isSafeInteger(draft.every) && draft.every >= 1 && draft.every <= 366
    && ['earlier','later','reject'].includes(draft.ambiguity) && typeof draft.differentBackup === 'boolean'
    && [draft.primary,draft.backup].every(list => Array.isArray(list) && list.length <= 100 && list.every(id => typeof id === 'string'));
}

/** Compare persisted answers independently of JSON property order and server revision. */
export function sameRota(left: Schedule, right: Schedule): boolean {
  const answers = (schedule: Schedule) => [schedule.id,schedule.name,schedule.service,schedule.timezone,schedule.validFrom,schedule.validUntil,
    ...(['primary','backup'] as const).map(role => {const rotation=schedule[role];return [rotation.anchorLocal,rotation.periodDays,rotation.ambiguity,rotation.members];}),
    schedule.overrides.map(override => [override.id,override.role,override.start,override.end,override.member]),schedule.layers,schedule.companyDates,schedule.pto];
  return JSON.stringify(answers(left)) === JSON.stringify(answers(right));
}
