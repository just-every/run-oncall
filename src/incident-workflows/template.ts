import { fail, text, type Entry, type Incident, type Member, type Service, type State } from '../family/response-operations/domain.ts';
import type { IncidentTemplate, TemplateCheck, TemplateSnapshot } from './types-template.ts';

export type { IncidentTemplate, TemplateSnapshot, TemplateCheck } from './types-template.ts';

const definitionFields = ['version', 'by', 'at', 'reason', 'severityWording', 'impactPrompt', 'incidentTypes', 'checklist'];

function fields(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key)) ||
    Object.keys(value).some(key => !keys.includes(key))) fail('Invalid incident template fields');
  return value as Record<string, unknown>;
}
function bounded(value: unknown, label: string, max: number): string {
  const clean = text(value, label, max);
  if (clean !== value) fail(`${label} must not contain surrounding whitespace`);
  return clean;
}
function date(value: unknown): string {
  if (typeof value !== 'string' || value.length > 40 || !Number.isFinite(Date.parse(value))) fail('Invalid template timestamp');
  return value;
}
function integer(value: unknown, minimum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail('Invalid template version or revision');
  return value as number;
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(`Invalid template list (maximum ${max})`);
  return value;
}
function human(state: State, actor: Member, admin = false): Member {
  if (actor.machine) fail('Incident templates require a human session', 403);
  const current = state.members.find(member => member.id === actor.id && member.active);
  if (!current) fail('Access revoked', 401);
  if (current.role === 'viewer' || admin && current.role !== 'admin') fail('Insufficient role', 403);
  return current;
}

/** Strict structural validation also serves standalone handoff snapshots. */
export function validateIncidentTemplate(value: unknown): IncidentTemplate {
  const v = fields(value, definitionFields);
  const wording = fields(v.severityWording, ['critical', 'warning', 'info']);
  const incidentTypes = list(v.incidentTypes, 20).map(type => bounded(type, 'Incident type', 100));
  if (new Set(incidentTypes).size !== incidentTypes.length) fail('Duplicate incident types');
  const checklist = list(v.checklist, 30).map(item => {
    const row = fields(item, ['id', 'text']);
    return {id: bounded(row.id, 'Checklist item ID', 100), text: bounded(row.text, 'Checklist item', 500)};
  });
  if (new Set(checklist.map(item => item.id)).size !== checklist.length) fail('Duplicate checklist item IDs');
  return {
    version: integer(v.version, 1), by: bounded(v.by, 'Template author', 100), at: date(v.at),
    reason: bounded(v.reason, 'Template reason', 3000),
    severityWording: {
      critical: bounded(wording.critical, 'Critical severity wording', 300),
      warning: bounded(wording.warning, 'Warning severity wording', 300),
      info: bounded(wording.info, 'Info severity wording', 300),
    },
    impactPrompt: bounded(v.impactPrompt, 'Impact prompt', 1000), incidentTypes, checklist,
  };
}

export const incidentTemplateAuditText = (service: Service, template: IncidentTemplate) =>
  `Service ${service.id} incident template v${template.version}: ${template.reason}`;

export function publishIncidentTemplate(state: State, actor: Member, command: unknown, at: string): IncidentTemplate {
  human(state, actor, true);
  const v = fields(command, ['type', 'service', 'baseVersion', 'severityWording', 'impactPrompt', 'incidentTypes', 'checklist', 'reason']);
  if (v.type !== 'service-template') fail('Unknown template command');
  const service = state.services.find(row => row.id === v.service);
  if (!service) fail('Unknown service', 404);
  integer(v.baseVersion, 0);
  const history = service.incidentTemplates;
  const previous = history?.at(-1);
  if (v.baseVersion !== (previous?.version ?? 0)) fail('Incident template changed; reload before publishing', 409);
  if ((history?.length ?? 0) >= 100) fail('Incident template version capacity reached', 429);
  const template = validateIncidentTemplate({version: (previous?.version ?? 0) + 1, by: actor.id, at,
    reason: v.reason, severityWording: v.severityWording, impactPrompt: v.impactPrompt,
    incidentTypes: v.incidentTypes, checklist: v.checklist});
  if (previous && Date.parse(at) < Date.parse(previous.at)) fail('Template publication precedes its previous version');
  (service.incidentTemplates ??= []).push(template);
  state.audit.push({id: crypto.randomUUID(), at, actor: actor.id, kind: 'service-template', text: incidentTemplateAuditText(service, template)});
  return template;
}

/** Freeze the definition once at human or automatic declaration; no template means no snapshot. */
export function instantiateIncidentTemplate(state: State, incident: Incident, incidentType?: unknown): void {
  if (incident.template !== undefined) fail('Incident template is already frozen', 409);
  const service = state.services.find(row => row.id === incident.service);
  if (!service) fail('Unknown service', 404);
  const template = service.incidentTemplates?.at(-1);
  if (incidentType === '') incidentType = undefined;
  if (!template) {
    if (incidentType !== undefined) fail('Service has no incident template');
    return;
  }
  if (incidentType !== undefined && (typeof incidentType !== 'string' || !template.incidentTypes.includes(incidentType))) fail('Unknown incident type for this template');
  if (Date.parse(template.at) > Date.parse(incident.createdAt)) fail('Template publication follows incident declaration');
  incident.template = {...structuredClone(template), service: service.id, incidentType: (incidentType as string | undefined) ?? null,
    checklist: template.checklist.map(item => ({...item, done: false, history: []}))};
}

export const templateCheckText = (template: TemplateSnapshot, item: {id: string; text: string}, done: boolean) =>
  `Template v${template.version} checklist ${item.id}: ${done ? 'completed' : 'reopened'} — ${item.text}`;
const checkAuditText = (incident: Incident, description: string) => `Incident ${incident.id}: ${description}`;

export function checklistCommand(state: State, actor: Member, command: unknown, at: string): Incident {
  const current = human(state, actor);
  const v = fields(command, ['type', 'incident', 'revision', 'item', 'done']);
  if (v.type !== 'template-check') fail('Unknown checklist command');
  const incident = state.incidents.find(row => row.id === v.incident);
  if (!incident) fail('Unknown incident', 404);
  if (incident.mergedInto) fail('Merged incident is an alias; open the canonical incident', 409);
  integer(v.revision, 0);
  if (v.revision !== incident.revision) fail('Incident changed. Reload before applying your edit.', 409);
  if (incident.commander !== current.id) fail('Only the current incident commander may change its response checklist', 403);
  if (incident.state === 'resolved') fail('Incident is already resolved', 409);
  const snapshot = incident.template;
  if (!snapshot) fail('Incident has no frozen template', 409);
  const item = snapshot.checklist.find(row => row.id === v.item);
  if (!item) fail('Unknown response checklist item');
  if (typeof v.done !== 'boolean') fail('Checklist completion must be boolean');
  if (item.history.length >= 100) fail('Checklist item history capacity reached', 429);
  date(at);
  if (Date.parse(at) < Math.max(Date.parse(incident.createdAt), Date.parse(item.history.at(-1)?.at ?? incident.createdAt))) fail('Checklist change precedes its history');
  const check: TemplateCheck = {id: crypto.randomUUID(), by: current.id, at, done: v.done};
  const description = templateCheckText(snapshot, item, check.done);
  item.history.push(check);
  item.done = check.done;
  incident.revision++;
  incident.timeline.push({id: check.id, at, actor: current.id, kind: 'template-check', text: description});
  state.audit.push({id: check.id, at, actor: current.id, kind: 'template-check', text: checkAuditText(incident, description)});
  return incident;
}

export function validateIncidentTemplateHistory(service: Service, members?: Member[]): void {
  if (service.incidentTemplates === undefined) return;
  const history = list(service.incidentTemplates, 100);
  if (!history.length) fail('Empty incident template history');
  let previousAt = -Infinity;
  history.forEach((row, index) => {
    const template = validateIncidentTemplate(row);
    if (template.version !== index + 1 || Date.parse(template.at) < previousAt ||
      members && !members.some(member => member.id === template.by)) fail('Invalid incident template version attribution');
    previousAt = Date.parse(template.at);
  });
}

function sameDefinition(left: IncidentTemplate, right: IncidentTemplate): boolean {
  return JSON.stringify(validateIncidentTemplate(left)) === JSON.stringify(validateIncidentTemplate(right));
}

function frozenDefinition(snapshot: TemplateSnapshot): IncidentTemplate {
  return {version: snapshot.version, by: snapshot.by, at: snapshot.at, reason: snapshot.reason,
    severityWording: snapshot.severityWording, impactPrompt: snapshot.impactPrompt, incidentTypes: snapshot.incidentTypes,
    checklist: snapshot.checklist.map(({id, text}) => ({id, text}))};
}

/** A split inherits the exact checklist prefix held when its source recorded that split. */
function validateSplitChecklist(state: State, incident: Incident): void {
  const split = incident.splitFrom;
  if (!split) return;
  const parent = state.incidents.find(row => row.id === split.incident);
  if (!parent) fail('Missing checklist split provenance');
  const snapshot = incident.template, original = parent.template;
  if (!snapshot && !original) return;
  if (!snapshot || !original || !sameDefinition(frozenDefinition(snapshot), frozenDefinition(original)) ||
    snapshot.incidentType !== original.incidentType || snapshot.service !== original.service) fail('Split must retain its source frozen template');
  const description = `Split ${split.alerts.length} alert(s) from incident ${parent.id} into ${incident.id}: ${split.reason}`;
  const splitIndex = parent.timeline.findIndex(entry => entry.kind === 'split' && entry.at === split.at &&
    entry.actor === split.by && entry.text === description);
  if (splitIndex < 0) fail('Missing checklist split timeline provenance');
  for (let index = 0; index < original.checklist.length; index++) {
    const beforeSplit = original.checklist[index].history.filter(check => {
      const ownIndex = parent.timeline.findIndex(entry => entry.id === check.id);
      return ownIndex < 0 || ownIndex < splitIndex;
    });
    const inherited = snapshot.checklist[index].history.slice(0, beforeSplit.length);
    if (inherited.length !== beforeSplit.length || inherited.some((check, i) => {
      const source = beforeSplit[i];
      return check.id !== source.id || check.by !== source.by || check.at !== source.at || check.done !== source.done;
    })) fail('Split checklist changed its inherited history');
  }
}

function checklistOrigin(state: State, incident: Incident, check: TemplateCheck): Incident {
  const visited = new Set<string>();
  let current = incident;
  while (!current.timeline.some(entry => entry.id === check.id)) {
    if (visited.has(current.id)) fail('Checklist split provenance cycle');
    visited.add(current.id);
    const split = current.splitFrom;
    const parent = split && state.incidents.find(row => row.id === split.incident);
    if (!split || !parent || Date.parse(check.at) > Date.parse(split.at)) fail('Missing checklist source timeline');
    current = parent;
  }
  return current;
}

export function validateIncidentTemplateSnapshot(incident: Incident, services: Service[], members?: Member[]): void {
  const snapshot = incident.template;
  if (snapshot === undefined) {
    if (incident.timeline.some(entry => entry.kind === 'template-check')) fail('Checklist history requires a frozen template');
    return;
  }
  const v = fields(snapshot, [...definitionFields, 'service', 'incidentType']);
  const checklist = list(v.checklist, 30);
  const definition = validateIncidentTemplate({...Object.fromEntries(definitionFields.map(key => [key, v[key]])),
    checklist: checklist.map(item => {
      const row = fields(item, ['id', 'text', 'done', 'history']);
      return {id: row.id, text: row.text};
    })});
  const service = services.find(row => row.id === incident.service);
  const published = service?.incidentTemplates?.find(row => row.version === definition.version);
  if (v.service !== incident.service || !published || !sameDefinition(definition, published) ||
    Date.parse(definition.at) > Date.parse(incident.createdAt) ||
    v.incidentType !== null && !definition.incidentTypes.includes(v.incidentType as string)) fail('Invalid frozen incident template version');
  const ids = new Set<string>();
  for (const item of snapshot.checklist) {
    if (typeof item.done !== 'boolean') fail('Invalid checklist completion');
    const history = list(item.history, 100);
    let previousAt = -Infinity;
    for (const row of history) {
      const check = fields(row, ['id', 'by', 'at', 'done']);
      const id = bounded(check.id, 'Checklist history ID', 100);
      const by = bounded(check.by, 'Checklist actor', 100), at = date(check.at);
      if (ids.has(id) || typeof check.done !== 'boolean' || Date.parse(at) < previousAt || Date.parse(at) < Date.parse(definition.at) ||
        members && !members.some(member => member.id === by)) fail('Invalid checklist history attribution');
      ids.add(id);
      previousAt = Date.parse(at);
    }
    if (item.done !== (item.history.at(-1)?.done ?? false)) fail('Checklist completion disagrees with its history');
  }
}

/** Whole-state validation adds permanent audit and exact timeline provenance to the shape validators. */
export function validateIncidentTemplateArchive(state: State): void {
  for (const service of state.services) {
    validateIncidentTemplateHistory(service, state.members);
    for (const template of service.incidentTemplates ?? []) {
      if (!state.audit.some(entry => entry.kind === 'service-template' && entry.actor === template.by &&
        entry.at === template.at && entry.text === incidentTemplateAuditText(service, template))) fail('Missing permanent incident template publication audit');
    }
  }
  for (const incident of state.incidents) validateIncidentTemplateSnapshot(incident, state.services, state.members);
  for (const incident of state.incidents) {
    validateSplitChecklist(state, incident);
    const expected = new Set<string>();
    for (const item of incident.template?.checklist ?? []) for (const check of item.history) {
      expected.add(check.id);
      const description = templateCheckText(incident.template!, item, check.done);
      const origin = checklistOrigin(state, incident, check);
      const matches = (entry: Entry) => entry.id === check.id && entry.at === check.at && entry.actor === check.by &&
        entry.kind === 'template-check' && entry.text === description && entry.lifecycle === undefined &&
        entry.review === undefined && entry.operationId === undefined && entry.metadata === undefined;
      if (Date.parse(check.at) < Date.parse(origin.createdAt) || origin.timeline.filter(matches).length !== 1 ||
        !state.audit.some(entry => matches({...entry, text: description}) &&
          entry.text === checkAuditText(origin, description))) fail('Missing checklist timeline or permanent audit attribution');
    }
    if (incident.timeline.some(entry => entry.kind === 'template-check' && !expected.has(entry.id))) fail('Unlinked incident checklist timeline entry');
  }
}
