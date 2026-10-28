import { fail, type Entry, type Event, type Incident, type State } from '../family/response-operations/domain.ts';

type SourceKind = 'structured' | 'legacy-derived' | 'source-event';
export type ResponseDuration = {
  status: 'measured' | 'censored' | 'unknown'; seconds: number | null;
  sourceEntryId: string | null; sourceAt: string | null; sourceKind: SourceKind | null;
  reason: string; evidence: string | null;
};
type LifecycleEntry = Entry & { lifecycle?: { from: string | null; to: string; evidence?: string } };
type Mark = { entry: Entry; from: string | null; to: string; kind: SourceKind; evidence?: string };
const day = 86_400_000;
const states = ['declared', 'acknowledged', 'mitigating', 'recovered', 'resolved'];

// Date.parse alone silently normalizes dates such as February 30.
function clock(value: unknown): number {
  if (typeof value !== 'string') return NaN;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-](\d{2}):(\d{2}))$/i.exec(value);
  if (!m) return NaN;
  const [year, month, date, hour, minute, second] = m.slice(1, 7).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (month < 1 || month > 12 || date < 1 || date > [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ||
      hour > 23 || minute > 59 || second > 59 || Number(m[8] ?? 0) > 23 || Number(m[9] ?? 0) > 59) return NaN;
  return Date.parse(value);
}
function marks(incident: Incident): Mark[] {
  return incident.timeline.flatMap((entry: LifecycleEntry): Mark[] => {
    if (entry.lifecycle) return [{entry, ...entry.lifecycle, kind: 'structured'}];
    if (entry.kind === 'declared') return [{entry, from: null, to: 'declared', kind: 'legacy-derived'}];
    if (entry.kind === 'bulk-resolve') return [{entry, from: null, to: 'resolved', kind: 'legacy-derived'}];
    if (entry.kind === 'bulk-acknowledge') return [{entry, from: 'declared', to: 'acknowledged', kind: 'legacy-derived'}];
    const match = entry.kind === 'transition' && /^(\w+) → (\w+): /u.exec(entry.text);
    return match && states.includes(match[1]) && states.includes(match[2])
      ? [{entry, from: match[1], to: match[2], kind: 'legacy-derived'}] : [];
  });
}
/** Machine preparation is kept separate from retained person attribution. */
export function entryAttribution(state:State,entry:Entry):'agent'|'person'|'unknown' {
 if(entry.preparedBy||entry.actor.startsWith('api-'))return 'agent'
 const member=state.members.find(m=>m.id===entry.actor)
 return member?'person':'unknown'
}
/** The first explicit acknowledgement entry, the one acknowledgement time is measured to. */
export const firstAcknowledgement = (incident: Incident) => marks(incident).find(m => m.to === 'acknowledged')?.entry;
function value(status: ResponseDuration['status'], seconds: number | null, mark: Mark | undefined, reason: string): ResponseDuration {
  return {status, seconds, sourceEntryId: mark?.entry.id ?? null, sourceAt: mark?.entry.at ?? null,
    sourceKind: mark?.kind ?? null, reason, evidence: mark?.evidence ?? null};
}
function evidence(value: string | undefined): boolean {
  try { return !!value && ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}
function sourceRecovery(state: State, incident: Incident, start: number, problem: string | null, now: number): ResponseDuration {
  const result = (status: ResponseDuration['status'], seconds: number | null, reason: string, event?: Event): ResponseDuration =>
    ({status, seconds, sourceEntryId: event?.id ?? null, sourceAt: event?.acceptedAt ?? null, sourceKind: event ? 'source-event' : null, reason, evidence: event?.evidence || null});
  if (problem) return result('unknown', null, problem);
  const alerts = incident.alerts.map(id => state.alerts.find(a => a.id === id));
  if (!alerts.length) return result('unknown', null, 'No linked alerts; no source can observe recovery');
  if (alerts.some(a => !a)) return result('unknown', null, 'A linked alert is no longer retained');
  if (alerts.some(a => a!.state === 'active')) return result('censored', (now - start) / 1000, 'A linked alert is still active at generatedAt; seconds is a lower bound');
  const recoveries = alerts.map(a => a!.events.map(id => state.events.find(e => e.id === id)).filter(e => e?.intent === 'recover').at(-1));
  if (recoveries.some(e => !e)) return result('unknown', null, 'A recovered alert has no retained source recovery event');
  const last = recoveries.reduce((a, b) => clock(b!.acceptedAt) > clock(a!.acceptedAt) ? b : a)!, end = clock(last.acceptedAt);
  if (!Number.isFinite(end) || end > now) return result('unknown', null, 'Source recovery time is invalid or in the future', last);
  if (end < start) return result('unknown', null, 'Linked alerts recovered before declaration; source recovery cannot time this incident', last);
  return result('measured', (end - start) / 1000, 'Declaration to acceptance of the last linked alert recovery its source reported; an automated observation, not a human attestation', last);
}
function durations(state: State, incident: Incident, now: number) {
  const lifecycle = marks(incident), start = clock(incident.createdAt);
  const declaration = lifecycle.find(m => m.to === 'declared' && m.from === null);
  const baseProblem = !Number.isFinite(start) ? 'Invalid declaration timestamp' : start > now ? 'Declaration is in the future' :
    !declaration ? 'Declaration timeline entry is missing' : clock(declaration.entry.at) !== start ? 'Declaration entry does not match createdAt' : null;
  const measured = (mark: Mark): ResponseDuration => {
    if (baseProblem) return value('unknown', null, mark, baseProblem);
    const end = clock(mark.entry.at);
    if (!Number.isFinite(end) || end < start || end > now)
      return value('unknown', null, mark, 'Endpoint timestamp is invalid, before declaration, or in the future');
    return value('measured', (end - start) / 1000, mark, 'Elapsed seconds from declaration to this timeline entry');
  };
  const missing = (pending: boolean, reason: string): ResponseDuration => baseProblem
    ? value('unknown', null, declaration, baseProblem)
    : value(pending ? 'censored' : 'unknown', pending ? (now - start) / 1000 : null, declaration, reason);
  const acknowledgement = lifecycle.find(m => m.to === 'acknowledged');
  const resolution = lifecycle.findLast(m => m.to === 'resolved');
  const mtta = acknowledgement ? measured(acknowledgement) : missing(incident.state === 'declared',
    incident.state === 'declared' ? 'No acknowledgement observed by generatedAt; seconds is a lower bound' : 'No acknowledgement entry; later state does not establish an acknowledgement time');
  const mttr = incident.state === 'resolved'
    ? resolution ? measured(resolution) : missing(false, 'Resolved state has no resolution entry')
    : missing(true, 'No final resolution observed by generatedAt; seconds is a lower bound');
  const lastMitigation = lifecycle.findLastIndex(m => m.to === 'mitigating');
  const recoveryIndex = lifecycle.findLastIndex(m => m.to === 'recovered' || m.to === 'resolved' && m.entry.kind === 'bulk-resolve');
  const recoveryMark = lifecycle[recoveryIndex];
  let recovery: ResponseDuration;
  if (recoveryIndex <= lastMitigation || !recoveryMark) {
    recovery = missing(!['recovered', 'resolved'].includes(incident.state),
      'No recovery attestation after the last mitigation; earlier recovery cannot establish final recovery');
  } else if (entryAttribution(state,recoveryMark.entry)!=='person') {
    recovery = value('unknown',null,recoveryMark,'Agent, machine or unknown-actor recovery evidence is not a human recovery attestation or independent observation');
  } else if (recoveryMark.kind === 'legacy-derived') {
    recovery = value('unknown', null, recoveryMark, 'Legacy recovery has no immutable evidence at this entry; current incident recovery URL cannot establish historical evidence');
  } else if (!evidence(recoveryMark.evidence)) {
    recovery = value('unknown', null, recoveryMark, 'Recovery entry has no valid immutable HTTP(S) human attestation');
  } else if (lastMitigation >= 0 && (!Number.isFinite(clock(lifecycle[lastMitigation].entry.at)) ||
      clock(lifecycle[lastMitigation].entry.at) > clock(recoveryMark.entry.at))) {
    recovery = value('unknown', null, recoveryMark, 'Recovery timestamp cannot be ordered after the last mitigation');
  } else {
    recovery = measured(recoveryMark);
    if (recovery.status === 'measured') recovery.reason = 'Human recovery attestation recorded at this entry; not independent telemetry verification';
  }
  return {mtta, mttr, recovery, sourceRecovery: sourceRecovery(state, incident, start, baseProblem, now)};
}
function aggregate(values: ResponseDuration[]) {
  const measured = values.filter(v => v.status === 'measured').map(v => v.seconds!).sort((a, b) => a - b);
  const percentile = (p: number) => measured.length ? measured[Math.ceil(measured.length * p) - 1] : null;
  const bounds = [60, 300, 900, 3600, 14400, 86400, Infinity];
  return {total: values.length, measured: measured.length, censored: values.filter(v => v.status === 'censored').length,
    unknown: values.filter(v => v.status === 'unknown').length,
    mean: measured.length ? measured.reduce((sum, n) => sum + n, 0) / measured.length : null,
    p50: percentile(.5), p90: percentile(.9), p95: percentile(.95),
    histogram: bounds.map((upper, index) => ({fromSeconds: index ? bounds[index - 1] : 0,
      toSeconds: Number.isFinite(upper) ? upper : null,
      count: measured.filter(n => n >= (index ? bounds[index - 1] : 0) && n < upper).length}))};
}

export function responseReport(state: State, input: {from?: string; to?: string; service?: string} = {}, now = new Date().toISOString()) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['from', 'to', 'service'].includes(k))) fail('Unsupported response report filter');
  const observed = clock(now);
  if (!Number.isFinite(observed)) fail('generatedAt must be a timestamp with a timezone');
  const to = input.to === undefined ? observed : clock(input.to);
  const from = input.from === undefined ? to - 30 * day : clock(input.from);
  if (!Number.isFinite(from) || !Number.isFinite(to)) fail('Report bounds must be ISO timestamps with a timezone');
  if (from >= to || to - from > 366 * day) fail('Report range must be positive and at most 366 days');
  if (input.service !== undefined && !state.services.some(s => s.id === input.service)) fail('Unknown service');
  const generatedAt = new Date(observed).toISOString();
  const incidents = state.incidents.filter(i => clock(i.createdAt) >= from && clock(i.createdAt) < to &&
      (input.service === undefined || i.service === input.service))
    .sort((a, b) => clock(a.createdAt) - clock(b.createdAt) || a.id.localeCompare(b.id))
    .map(i => ({id: i.id, title: i.title, service: i.service, serviceName: state.services.find(s => s.id === i.service)?.name ?? null,
      state: i.state as string, severity: i.severity as string, incidentRevision: i.revision as number|null, declaredAt: new Date(clock(i.createdAt)).toISOString(),
      href: `/incidents/${encodeURIComponent(i.id)}`, ...durations(state, i, observed)}));
  const erasedDuration=():ResponseDuration=>({status:'unknown',seconds:null,sourceEntryId:null,sourceAt:null,sourceKind:null,reason:'Incident explicitly erased; anonymous declaration case retained in the denominator',evidence:null});
  for(const row of state.erasedReportCases??[])if(clock(row.declaredAt)>=from&&clock(row.declaredAt)<to&&(input.service===undefined||row.service===input.service)){
    incidents.push({id:row.id,title:'Erased incident',service:row.service,serviceName:state.services.find(service=>service.id===row.service)?.name??null,state:'erased',severity:'unknown',incidentRevision:null,declaredAt:new Date(clock(row.declaredAt)).toISOString(),href:'',mtta:erasedDuration(),mttr:erasedDuration(),recovery:erasedDuration(),sourceRecovery:erasedDuration()});
  }
  incidents.sort((a,b)=>clock(a.declaredAt)-clock(b.declaredAt)||a.id.localeCompare(b.id));
  return {revision: state.revision, generatedAt,
    cohort: {from: new Date(from).toISOString(), to: new Date(to).toISOString(), service: input.service ?? null,
      observationAt: generatedAt, count: incidents.length, erased: incidents.filter(row=>row.state==='erased').length,
      unassignableDeclarations: state.incidents.filter(i => (input.service === undefined || i.service === input.service) && !Number.isFinite(clock(i.createdAt))).length,
      inclusion: 'createdAt declaration in UTC [from,to); every matching incident retained regardless of state, severity, service configuration or metric availability; endpoints observed through generatedAt'},
    definitions: {
      mtta: 'Declaration to first explicit acknowledgement; resolution never implies acknowledgement',
      mttr: 'Declaration to final resolution; unresolved incidents are right-censored at generatedAt',
      recovery: 'Declaration to last evidenced human recovery attestation after any later mitigation; not independently verified recovery',
      sourceRecovery: 'Declaration to acceptance of the last recovery event reported by the sources of every linked alert; censored while a linked alert is active, unknown without linked alerts',
      statistics: 'Seconds; mean and nearest-rank p50/p90/p95 use measured values only. Total, measured, censored and unknown denominators remain visible. Histogram buckets are [fromSeconds,toSeconds), null upper bound means infinity',
      censored: 'Seconds is an observed lower bound, not a completed duration; source identifies the declaration entry',
      unknown: 'Seconds is null; no zero imputation. Invalid, future or pre-declaration endpoint timestamps are unknown',
      source: 'Structured lifecycle metadata or explicitly legacy-derived transition entries; sourceAt retains original timezone text',
    },
    limitations: [
      'Real page volume, real delivery/missed delivery and escalation latency are unavailable; synthetic paging is never real delivery evidence.',
      'Reassignment latency and after-hours interruptions are unavailable. Coverage hours are scheduled from current schedules, not worked hours (see the load basis).',
      'Imported-history provenance is unavailable; timeline source kind describes representation, not native versus imported origin.',
      'Source-reported recovery is what the monitoring sources reported, as accepted by Oncall; neither it nor a human attestation is independent verification of recovery.',
      'Explicitly erased incidents retain only an anonymous declaration case with service and timestamp: all durations are unknown and the denominator stays visible. Earlier erasures made before this capability cannot be reconstructed. Unassignable declaration timestamps are separately counted.',
    ],
    aggregates: {mtta: aggregate(incidents.map(i => i.mtta)), mttr: aggregate(incidents.map(i => i.mttr)), recovery: aggregate(incidents.map(i => i.recovery)), sourceRecovery: aggregate(incidents.map(i => i.sourceRecovery))},
    incidents};
}
export type ResponseReport = ReturnType<typeof responseReport>;

