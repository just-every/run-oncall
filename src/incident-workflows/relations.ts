import { authority, fail, text, type Action, type Alert, type Entry, type Incident, type Member, type State } from '../family/response-operations/domain.ts';
import type { IncidentRelations, RelatedIncident, RetainedTimelineEntry } from './types-relations.ts';

export type { IncidentRelations, RelatedIncident, RetainedTimelineEntry } from './types-relations.ts';

const related = (incident: Incident): RelatedIncident => incident;
const entry = (actor: string, kind: string, description: string, at: string): Entry =>
  ({ id: crypto.randomUUID(), actor, kind, text: description, at });
const mergeText = (source: Incident, target: Incident, reason: string) =>
  `Merged incident ${source.id} (${source.title}) into ${target.id} (${target.title}): ${reason}`;
const splitText = (source: Incident, child: Incident, alerts: string[], reason: string) =>
  `Split ${alerts.length} alert(s) from incident ${source.id} into ${child.id}: ${reason}`;
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && sameValue(left[key], right[key]));
}

/** Resolve every retained alias, including a source merged again at a later time. */
export function resolveIncidentAlias(state: State, id: string): RelatedIncident {
  const seen = new Set<string>();
  let current = id;
  while (true) {
    if (seen.has(current)) fail('Incident alias cycle', 400);
    seen.add(current);
    const incident = state.incidents.find(row => row.id === current);
    if (!incident) fail('Unknown incident', 404);
    const target = related(incident).mergedInto?.target;
    if (!target) return related(incident);
    current = target;
  }
}

/** Original objects retain their roles, follow-ups, runbooks and source timelines. */
export function retainedIncidentSources(state: State, incident: Incident): RelatedIncident[] {
  const canonical = resolveIncidentAlias(state, incident.id);
  return state.incidents.filter(row => row.id !== canonical.id && resolveIncidentAlias(state, row.id).id === canonical.id);
}

/** Display projection only. Never persist these copies into a canonical timeline. */
export function mergedTimeline(state: State, incident: Incident): RetainedTimelineEntry[] {
  const canonical = resolveIncidentAlias(state, incident.id);
  return [
    ...canonical.timeline.map(row => ({ ...row })),
    ...retainedIncidentSources(state, canonical).flatMap(source => source.timeline.map(row => ({ ...row, sourceIncident: source.id }))),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
}

function editable(state: State, id: unknown, revision: unknown): RelatedIncident {
  const incident = state.incidents.find(row => row.id === id);
  if (!incident) fail('Unknown incident', 404);
  if (related(incident).mergedInto) fail('Merged incidents are retained aliases; edit their current target', 409);
  if (incident.state === 'resolved') fail('Resolved incidents cannot be merged or split', 409);
  if (revision !== incident.revision) fail('Incident changed. Reload before applying your edit.', 409);
  return related(incident);
}

/** Validate every input and prepare every allocation before changing any held object. */
export function relationCommand(state: State, actor: Member, input: any, at: string): Incident | null {
  if (!['merge-incidents', 'split-incident'].includes(input.type)) return null;
  if (actor.machine) fail('Incident merge and split require a current human responder', 403);
  authority(state, actor);
  const fields = input.type === 'merge-incidents' ? ['type', 'incident', 'revision', 'sources', 'reason'] :
    ['type', 'incident', 'revision', 'alerts', 'title', 'summary', 'reason'];
  if (!exact(input, fields)) fail('Invalid incident relation command fields');
  if (!Number.isFinite(Date.parse(at))) fail('Invalid incident operation timestamp');
  const reason = text(input.reason, 'Reason', 3000);
  const incident = editable(state, input.incident, input.revision);
  if (Date.parse(at) < Date.parse(incident.createdAt)) fail('Incident operation predates the incident');
  if (input.type === 'merge-incidents') {
    if (!Array.isArray(input.sources) || !input.sources.length || input.sources.length > 100) fail('Choose between 1 and 100 source incidents');
    if (input.sources.some((row: any) => !exact(row, ['id', 'revision']))) fail('Invalid source incident fields');
    const ids = input.sources.map((row: any) => row?.id);
    if (new Set(ids).size !== ids.length || ids.includes(incident.id)) fail('Merge sources must be distinct from each other and the target');
    const sources = input.sources.map((row: any) => editable(state, row?.id, row?.revision)) as RelatedIncident[];
    if (sources.some(source => Date.parse(at) < Date.parse(source.createdAt))) fail('Merge predates a source incident');
    if (incident.timeline.length + sources.length > 10000 || sources.some(source => source.timeline.length >= 10000) ||
      (incident.mergedSources?.length ?? 0) + sources.length > 10000) fail('Incident history capacity reached', 429);
    const alerts = [...new Set([...incident.alerts, ...sources.flatMap(source => source.alerts)])];
    const mergedSources = [...(incident.mergedSources ?? []), ...sources.map(source => source.id)];
    const actions = new Map<string, Action>(incident.actions.map(action => [action.id, action]));
    for (const source of sources) for (const action of source.actions) {
      const current = actions.get(action.id);
      if (current && !sameValue(current, action)) fail('Conflicting retained follow-up IDs; reload and reconcile before merging', 409);
      if (!current) actions.set(action.id, structuredClone(action));
    }
    if (actions.size > 10000) fail('Incident follow-up capacity reached', 429);
    const descriptions = sources.map(source => mergeText(source, incident, reason));
    const targetEntries = descriptions.map(description => entry(actor.id, 'merge', description, at));
    const sourceEntries = descriptions.map(description => entry(actor.id, 'merge', description, at));
    const audit = descriptions.map(description => entry(actor.id, 'merge-incidents', description, at));
    incident.alerts = alerts;
    incident.mergedSources = mergedSources;
    incident.actions = [...actions.values()];
    incident.timeline.push(...targetEntries);
    incident.revision++;
    sources.forEach((source, index) => {
      source.mergedInto = { target: incident.id, by: actor.id, at, reason };
      source.timeline.push(sourceEntries[index]);
      source.revision++;
    });
    state.audit.push(...audit);
    return incident;
  }
  if (!Array.isArray(input.alerts) || !input.alerts.length || input.alerts.length > 10000 ||
    new Set(input.alerts).size !== input.alerts.length || input.alerts.some((id: unknown) => typeof id !== 'string' || !incident.alerts.includes(id))) fail('Choose distinct alerts linked to the source incident');
  if (state.incidents.length >= 10000) fail('Incident capacity reached', 429);
  if (incident.timeline.length >= 10000) fail('Incident history capacity reached', 429);
  const alerts: string[] = [...input.alerts];
  const child: RelatedIncident = {
    id: crypto.randomUUID(), title: text(input.title, 'Title', 300), service: incident.service,
    severity: incident.severity, state: incident.state, commander: incident.commander,
    revision: 1, createdAt: at, alerts, timeline: [], runbook: structuredClone(incident.runbook),
    actions: [], recovery: incident.recovery, review: '',
    splitFrom: { incident: incident.id, by: actor.id, at, reason, alerts: [...alerts] },
  };
  for (const key of ['assignee', 'scribe', 'communications', 'urgency', 'priority'] as const) {
    if (incident[key] !== undefined) Object.assign(child, { [key]: incident[key] });
  }
  const template = (incident as Incident & { template?: unknown }).template;
  if (template !== undefined) Object.assign(child, { template: structuredClone(template) });
  const summary = text(input.summary, 'Impact summary', 3000);
  const description = splitText(incident, child, alerts, reason);
  child.timeline.push({ ...entry(actor.id, 'split', `${description}\nImpact: ${summary}`, at),
    lifecycle: { from: null, to: child.state, ...(['recovered', 'resolved'].includes(child.state) ? { evidence: child.recovery } : {}) } });
  const sourceEntry = entry(actor.id, 'split', description, at);
  const audit = entry(actor.id, 'split-incident', description, at);
  const remaining = incident.alerts.filter(id => !alerts.includes(id));
  incident.alerts = remaining;
  incident.timeline.push(sourceEntry);
  incident.revision++;
  state.incidents.unshift(child);
  state.audit.push(audit);
  return child;
}

function ownServiceLink(state: State, incident: Incident, alert: Alert): boolean {
  return alert.service === incident.service || alert.service === null && state.intakeSources?.some(source =>
    alert.source === 'intake:' + source.id && source.routing?.scope.includes(incident.service)) === true;
}

/** Cross-service links need an original retained source; alert service never changes. */
export function incidentAlertLinkAllowed(state: State, incident: Incident, alert: Alert): boolean {
  const visited = new Set<string>();
  const visit = (current: RelatedIncident): boolean => {
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    if (ownServiceLink(state, current, alert)) return true;
    for (const id of current.mergedSources ?? []) {
      const source = state.incidents.find(row => row.id === id);
      if (source && related(source).mergedInto?.target === current.id && source.alerts.includes(alert.id) && visit(source)) return true;
    }
    const split = current.splitFrom;
    const source = split && state.incidents.find(row => row.id === split.incident);
    return !!(source && split?.alerts.includes(alert.id) && visit(source));
  };
  return visit(related(incident));
}

const exact = (value: any, keys: string[]) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
function attribution(state: State, value: any, incident: Incident) {
  if (!state.members.some(member => member.id === value.by) || typeof value.at !== 'string' ||
    !Number.isFinite(Date.parse(value.at)) || Date.parse(value.at) < Date.parse(incident.createdAt) ||
    text(value.reason, 'Incident relation reason', 3000) !== value.reason) fail('Invalid incident relation attribution');
}

/** Call after ordinary incident shapes/entries are checked during archive validation. */
export function validateIncidentRelations(state: State): void {
  const claimedSources = new Set<string>();
  const linkedAlerts = new Map<string, string>();
  for (const incident of state.incidents as RelatedIncident[]) {
    try { resolveIncidentAlias(state, incident.id); }
    catch { fail('Invalid incident alias graph'); }
    if (incident.mergedSources !== undefined) {
      if (!Array.isArray(incident.mergedSources) || !incident.mergedSources.length || incident.mergedSources.length > 10000 ||
        new Set(incident.mergedSources).size !== incident.mergedSources.length) fail('Invalid retained incident sources');
      for (const id of incident.mergedSources) {
        const source = state.incidents.find(row => row.id === id) as RelatedIncident | undefined;
        if (!source || source.mergedInto?.target !== incident.id || claimedSources.has(id)) fail('Invalid reciprocal incident alias');
        claimedSources.add(id);
      }
    }
    if (incident.mergedInto !== undefined) {
      const merge = incident.mergedInto;
      if (!exact(merge, ['target', 'by', 'at', 'reason'])) fail('Invalid incident alias fields');
      attribution(state, merge, incident);
      const target = state.incidents.find(row => row.id === merge.target) as RelatedIncident | undefined;
      if (!target || !target.mergedSources?.includes(incident.id) || incident.state === 'resolved' ||
        Date.parse(merge.at) < Date.parse(target.createdAt)) fail('Invalid incident alias target');
      const description = mergeText(incident, target, merge.reason);
      const matches = (row: Entry) => row.kind === 'merge' && row.actor === merge.by && row.at === merge.at && row.text === description;
      if (!incident.timeline.some(matches) || !target.timeline.some(matches) ||
        !state.audit.some(row => row.kind === 'merge-incidents' && row.actor === merge.by && row.at === merge.at && row.text === description)) fail('Missing attributed merge explanation');
    }
    if (incident.splitFrom !== undefined) {
      const split = incident.splitFrom;
      if (!exact(split, ['incident', 'by', 'at', 'reason', 'alerts'])) fail('Invalid incident split fields');
      attribution(state, split, incident);
      const source = state.incidents.find(row => row.id === split.incident);
      if (!source || source.id === incident.id || split.at !== incident.createdAt || Date.parse(source.createdAt) > Date.parse(split.at) ||
        !Array.isArray(split.alerts) || !split.alerts.length || split.alerts.length > 10000 || new Set(split.alerts).size !== split.alerts.length ||
        split.alerts.some(id => !state.alerts.some(alert => alert.id === id))) fail('Invalid split alert provenance');
      const ancestry = new Set([incident.id]);
      let ancestor: RelatedIncident | undefined = source;
      while (ancestor) {
        if (ancestry.has(ancestor.id)) fail('Incident split provenance cycle');
        ancestry.add(ancestor.id);
        const parent: string | undefined = ancestor.splitFrom?.incident;
        ancestor = parent ? state.incidents.find(row => row.id === parent) : undefined;
      }
      const description = splitText(source, incident, split.alerts, split.reason);
      const first = incident.timeline[0];
      if (!first || first.kind !== 'split' || first.actor !== split.by || first.at !== split.at ||
        !first.text.startsWith(description + '\nImpact: ') || !first.lifecycle || first.lifecycle.from !== null ||
        !source.timeline.some(row => row.kind === 'split' && row.actor === split.by && row.at === split.at && row.text === description) ||
        !state.audit.some(row => row.kind === 'split-incident' && row.actor === split.by && row.at === split.at && row.text === description)) fail('Missing attributed split explanation');
    }
    if (incident.alerts.some(id => {
      const alert = state.alerts.find(row => row.id === id);
      return !alert || !incidentAlertLinkAllowed(state, incident, alert);
    })) fail('Invalid incident alert relation');
    if (!incident.mergedInto) for (const id of incident.alerts) {
      if (linkedAlerts.has(id)) fail('Alert is linked to multiple current incidents');
      linkedAlerts.set(id, incident.id);
    }
  }
}
