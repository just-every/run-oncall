import { fail, link, text, type State } from '../family/response-operations/domain.ts';

export type ChangeProvider = 'native' | 'pagerduty' | 'github' | 'gitlab';
export type ChangeSource = {id: string; name: string; service: string; provider: ChangeProvider; mode: 'bearer' | 'signed' | 'provider'; repository: string; active: boolean; revision: number; createdBy: string; updatedAt: string; lastAccepted?: {id: string; eventId: string; at: string}};
export type ChangeRecord = {id: string; source: string; eventId: string; service: string; kind: string; summary: string; author: string; occurredAt: string; acceptedAt: string; links: string[]; details: Record<string, string>; fingerprint: string; truncated: boolean; timeBasis: 'source' | 'received'};
export type IncomingChange = Omit<ChangeRecord, 'id' | 'source' | 'service' | 'fingerprint' | 'acceptedAt' | 'occurredAt' | 'timeBasis'> & {occurredAt: string | null};
export const changeProviders = ['native', 'pagerduty', 'github', 'gitlab'] as const;
const validDate = (v: unknown) => typeof v === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/i.test(v) && Number.isFinite(Date.parse(v));
const fields = (v: any, keys: string[], optional: string[] = []) => {
  if (!v || typeof v !== 'object' || Array.isArray(v) || keys.some(k => !Object.hasOwn(v, k)) || Object.keys(v).some(k => !keys.includes(k) && !optional.includes(k))) fail('Invalid change archive fields');
};
export function dependencies(state: State, service: string, input: unknown): string[] {
  if (!Array.isArray(input) || input.length > 30 || new Set(input).size !== input.length || input.some(id => id === service || !state.services.some(s => s.id === id))) fail('Dependencies must name distinct existing services, excluding this service');
  return input;
}
export function validateChangeArchive(state: State) {
  for (const key of ['changes', 'changeSources'] as const) if (state[key] !== undefined && (!Array.isArray(state[key]) || state[key]!.length > 10000 || new Set(state[key]!.map(r => r.id)).size !== state[key]!.length)) fail('Invalid change archive identities');
  for (const source of state.changeSources ?? []) {
    fields(source, ['id', 'name', 'service', 'provider', 'mode', 'repository', 'active', 'revision', 'createdBy', 'updatedAt'], ['lastAccepted']);
    text(source.id, 'Change source ID', 100); text(source.name, 'Change source name', 200);
    if (!state.services.some(s => s.id === source.service) || !state.members.some(m => m.id === source.createdBy) || !changeProviders.includes(source.provider) || !['bearer', 'signed', 'provider'].includes(source.mode) || typeof source.active !== 'boolean' || !Number.isSafeInteger(source.revision) || source.revision < 1 || !validDate(source.updatedAt) || typeof source.repository !== 'string' || source.repository.length > 200) fail('Invalid change source');
    if (source.provider === 'native' ? source.mode === 'provider' : source.mode !== 'provider') fail('Invalid change authentication mode');
    if (['github', 'gitlab'].includes(source.provider) && !source.repository.trim()) fail('A repository or project binding is required');
    if (source.lastAccepted) {
      fields(source.lastAccepted, ['id', 'eventId', 'at']);
      if (!validDate(source.lastAccepted.at) || !state.changes?.some(c => c.id === source.lastAccepted!.id && c.source === source.id && c.eventId === source.lastAccepted!.eventId)) fail('Invalid last change receipt');
    }
  }
  for (const service of state.services) if (service.dependencies !== undefined) dependencies(state, service.id, service.dependencies);
  const identities = new Set<string>();
  for (const change of state.changes ?? []) {
    fields(change, ['id', 'source', 'eventId', 'service', 'kind', 'summary', 'author', 'occurredAt', 'acceptedAt', 'links', 'details', 'fingerprint', 'truncated', 'timeBasis']);
    text(change.id, 'Change ID', 100); text(change.eventId, 'Change event ID', 200); text(change.summary, 'Change summary', 1100); text(change.kind, 'Change kind', 100); text(change.author, 'Reported author', 300);
    if (!state.changeSources?.some(s => s.id === change.source && s.service === change.service) || !validDate(change.occurredAt) || !validDate(change.acceptedAt) || !/^[a-f0-9]{64}$/.test(change.fingerprint) || typeof change.truncated !== 'boolean' || !['source','received'].includes(change.timeBasis)) fail('Invalid change references');
    if (!Array.isArray(change.links) || change.links.length > 10 || change.links.some(v => !v || link(v) !== v)) fail('Invalid change links');
    if (!change.details || typeof change.details !== 'object' || Array.isArray(change.details) || Object.keys(change.details).length > 50 || Object.entries(change.details).some(([k,v]) => !k || k.length > 100 || typeof v !== 'string' || v.length > 1100)) fail('Invalid change details');
    const identity = JSON.stringify([change.source, change.eventId]); if (identities.has(identity)) fail('Duplicate change identity'); identities.add(identity);
  }
}
export function pauseChangeSources(state: State) {
  for (const source of state.changeSources ?? []) source.active = false;
  return state;
}
export function recentChanges(state: State, service: string, at: string, hours: number) {
  const root = state.services.find(s => s.id === service); if (!root) fail('Unknown service', 404);
  if (!validDate(at) || !Number.isInteger(hours) || hours < 1 || hours > 168) fail('Choose a real timestamp and 1–168 lookback hours');
  const end = Date.parse(at), start = end - hours * 3600000, scope = new Set([root.id, ...(root.dependencies ?? [])]);
  return {service, from: new Date(start).toISOString(), to: new Date(end).toISOString(), hours, items: (state.changes ?? []).filter(c => scope.has(c.service) && Date.parse(c.occurredAt) >= start && Date.parse(c.occurredAt) <= end).sort((a,b) => Date.parse(b.occurredAt)-Date.parse(a.occurredAt) || a.id.localeCompare(b.id)).map(c => ({...c, dependency: c.service !== service, serviceName: state.services.find(s => s.id === c.service)!.name}))};
}
