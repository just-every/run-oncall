import { fail, Fault, link } from '../family/response-operations/domain.ts';
import type { CompatibleInput, CompatibleOptions, CompatibleProvider } from './provider-types.ts';
export type { CompatibleInput, CompatibleOptions, CompatibleProvider } from './provider-types.ts';

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => !!value && typeof value === 'object' && !Array.isArray(value);
const byteLength = (value: string) => new TextEncoder().encode(value).length;
const credentialField = (name: string) => /secret|token|password|passwd|authorization|cookie|credential|signature|^(?:key|auth)$|(?:api|routing|service|integration|endpoint|access|private|signing|client|session|auth)[_. -]?key/i.test(name);

function timestamp(value: unknown, unixSeconds = false): string | null {
  if (value === undefined || value === null) return null;
  if (unixSeconds && (typeof value === 'number' || typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value))) {
    const milliseconds = Number(value) * 1000;
    if (!Number.isFinite(milliseconds) || !Number.isFinite(new Date(milliseconds).getTime())) fail('Source timestamp must contain valid Unix seconds');
    return new Date(milliseconds).toISOString();
  }
  if (typeof value !== 'string') fail('Source timestamp must be an ISO-8601 timestamp with a timezone');
  const normalized = value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized) || !Number.isFinite(Date.parse(normalized)))
    fail('Source timestamp must be an ISO-8601 timestamp with a timezone');
  const date = normalized.slice(0, 10), midnight = Date.parse(date + 'T00:00:00Z');
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== date) fail('Source timestamp contains an invalid calendar date');
  return new Date(normalized).toISOString();
}

/** Provider bodies become bounded context, never stored raw request bodies. */
export function providerInput(provider: CompatibleProvider, payload: unknown, options: CompatibleOptions = {}): CompatibleInput {
  if (!object(payload)) fail('Event must be a JSON object');
  if (options.action !== undefined && !['recover', 'acknowledge', 'note'].includes(options.action)) fail('Invalid compatible action');
  let truncated = false;
  const scrub = (value: string) => options.secret ? value.replaceAll(options.secret, '[redacted]') : value;
  const bounded = (value: string, maximum: number): string => {
    const clean = scrub(value);
    if (clean.length <= maximum) return clean;
    truncated = true;
    const marker = ` … [truncated; original ${byteLength(clean)} bytes]`;
    return clean.slice(0, Math.max(0, maximum - marker.length)) + marker;
  };
  const field = (value: unknown, name: string, maximum: number, required = false): string => {
    if (value === undefined || value === null) { if (required) fail(`${name} is required`); return ''; }
    if (typeof value !== 'string' || required && !value.trim()) fail(`${name} must be ${required ? 'non-empty ' : ''}text`);
    return bounded(value.trim(), maximum);
  };
  const sanitize = (value: unknown, depth = 0): unknown => {
    if (typeof value === 'string') return bounded(value, 1000);
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (depth >= 4) { truncated = true; return '[truncated; nesting limit]'; }
    if (Array.isArray(value)) {
      if (value.length > 20) truncated = true;
      return value.slice(0, 20).map(item => sanitize(item, depth + 1));
    }
    if (object(value)) {
      const entries = Object.entries(value); if (entries.length > 30) truncated = true;
      return Object.fromEntries(entries.slice(0, 30).map(([name, item]) => [bounded(name, 100), credentialField(name) ? '[redacted]' : sanitize(item, depth + 1)]));
    }
    truncated = true; return '[truncated; unsupported value]';
  };
  const context: ObjectValue = {};
  const retain = (name: string, value: unknown, kind?: 'object' | 'array') => {
    if (value === undefined || value === null) return;
    if (kind === 'object' && !object(value) || kind === 'array' && !Array.isArray(value)) fail(`${name} must be an ${kind}`);
    context[name] = sanitize(value);
  };
  const links: string[] = [];
  const retainLink = (value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    if (typeof value !== 'string') { truncated = true; return; }
    try {
      const safe = link(value), parsed = new URL(safe);
      let decoded = safe;
      for (let n = 0; n < 3; n++) { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; }
      if (parsed.username || parsed.password || options.secret && decoded.includes(options.secret) || [...parsed.searchParams.keys()].some(credentialField) || /(?:secret|token|password|authorization|cookie|(?:api|routing|service)[_-]?key)=/i.test(decoded)) {
        truncated = true; return;
      }
      if (!links.includes(safe)) { if (links.length < 8) links.push(safe); else truncated = true; }
    } catch (error) {
      if (!(error instanceof Fault || error instanceof TypeError || error instanceof URIError)) throw error;
      truncated = true;
    }
  };
  const linkArray = (value: unknown, name: string, image = false) => {
    if (value === undefined) return;
    if (!Array.isArray(value)) fail(`${name} must be an array`);
    if (value.length > 20) truncated = true;
    for (const item of value.slice(0, 20)) {
      if (!object(item)) { truncated = true; continue; }
      const candidate = image ? item.src : item.href;
      if (candidate === undefined) truncated = true;
      else retainLink(candidate);
      if (image && item.href !== undefined) retainLink(item.href);
    }
  };
  let action: CompatibleInput['action'], keyValue: unknown, keyName: string;
  let title: unknown, sender: unknown, observedAt: unknown;
  let severity: CompatibleInput['severity'] = 'critical', priority: CompatibleInput['priority'] = null;
  let titleName = 'summary', senderName = 'source', senderRequired = false;
  if (provider === 'pagerduty-v2' || provider === 'pagerduty-v1') {
    const v2 = provider === 'pagerduty-v2', eventAction = v2 ? payload.event_action : payload.event_type;
    if (eventAction !== 'trigger' && eventAction !== 'resolve' && eventAction !== 'acknowledge') fail(`${v2 ? 'event_action' : 'event_type'} must be trigger, acknowledge or resolve`);
    action = eventAction === 'resolve' ? 'recover' : eventAction;
    keyValue = v2 ? payload.dedup_key : payload.incident_key; keyName = v2 ? 'dedup_key' : 'incident_key';
    if (v2) {
      if (payload.payload !== undefined && !object(payload.payload)) fail('payload must be an object');
      const data = (payload.payload ?? {}) as ObjectValue;
      title = data.summary; titleName = 'payload.summary'; sender = data.source; senderName = 'payload.source'; senderRequired = action === 'trigger'; observedAt = data.timestamp;
      severity = data.severity === 'warning' ? 'warning' : data.severity === 'info' ? 'info' : 'critical';
      retain('reported_severity', data.severity);
      for (const name of ['component', 'group', 'class']) retain(name, data[name]);
      retain('custom_details', data.custom_details, 'object');
    } else {
      title = payload.description; titleName = 'description'; sender = payload.client; senderName = 'client'; observedAt = payload.timestamp;
      retain('details', payload.details, 'object');
      if (payload.contexts !== undefined) {
        if (!Array.isArray(payload.contexts)) fail('contexts must be an array');
        if (payload.contexts.length > 20) truncated = true;
        for (const item of payload.contexts.slice(0, 20)) {
          if (!object(item) || !['link', 'image'].includes(String(item.type))) { truncated = true; continue; }
          const candidate = item.type === 'image' ? item.src : item.href;
          if (candidate === undefined) truncated = true; else retainLink(candidate);
          if (item.type === 'image' && item.href !== undefined) retainLink(item.href);
        }
      }
    }
    linkArray(payload.links, 'links'); linkArray(payload.images, 'images', true); retainLink(payload.client_url);
  } else if (provider === 'opsgenie') {
    action = options.action ?? 'trigger'; keyValue = options.alias ?? payload.alias; keyName = 'alias';
    title = action === 'note' ? payload.note : payload.message; titleName = action === 'note' ? 'note' : 'message'; sender = payload.source; observedAt = payload.timestamp;
    const given = payload.priority === undefined ? 'P3' : payload.priority;
    priority = ['P1', 'P2', 'P3', 'P4', 'P5'].includes(String(given)) ? given as NonNullable<CompatibleInput['priority']> : 'P1';
    severity = priority === 'P5' ? 'info' : priority === 'P4' ? 'warning' : 'critical';
    retain('reported_priority', payload.priority);
    retain('tags', payload.tags, 'array'); retain('details', payload.details, 'object');
    for (const name of ['description', 'entity', 'user', 'note']) retain(name, payload[name]);
    retain('responders', payload.responders, 'array'); retain('teams', payload.teams, 'array');
  } else if (provider === 'splunk') {
    if (typeof payload.message_type !== 'string') fail('message_type is required');
    const messageType = payload.message_type.toUpperCase();
    const actions = {CRITICAL: 'trigger', WARNING: 'trigger', INFO: 'note', ACKNOWLEDGEMENT: 'acknowledge', RECOVERY: 'recover'} as const;
    if (!Object.hasOwn(actions, messageType)) fail('message_type must be CRITICAL, WARNING, INFO, ACKNOWLEDGEMENT or RECOVERY');
    action = actions[messageType as keyof typeof actions]; keyValue = payload.entity_id; keyName = 'entity_id';
    title = payload.entity_display_name ?? payload.state_message; titleName = 'entity_display_name'; sender = payload.monitoring_tool; senderName = 'monitoring_tool'; observedAt = payload.timestamp;
    severity = messageType === 'WARNING' ? 'warning' : messageType === 'INFO' ? 'info' : 'critical';
    for (const name of ['entity_display_name', 'state_message', 'entity_state', 'monitoring_tool']) retain(name, payload[name]);
    retain('details', payload.details, 'object'); retain('custom_fields', payload.custom_fields, 'object');
    retain('route', options.routingKey);
    const annotations = Object.fromEntries(Object.entries(payload).filter(([name]) => name.startsWith('vo_annotate.')));
    if (Object.keys(annotations).length) retain('annotations', annotations);
  } else return fail('Unsupported compatible provider');

  let key: string;
  if (keyValue === undefined || keyValue === null || keyValue === '') {
    if (action !== 'trigger') fail(`${keyName} is required for ${action}`);
    key = crypto.randomUUID();
  } else {
    // Do not truncate identities: these incumbents can exceed the native key cap.
    if (typeof keyValue !== 'string' || !keyValue.trim()) fail(`${keyName} must be non-empty text`);
    if (keyValue.length > 200) fail(`${keyName} exceeds Oncall's current native key limit of 200 characters`);
    if (options.secret && keyValue.includes(options.secret)) fail(`${keyName} must not contain the integration credential`);
    if(keyValue!==keyValue.trim())fail(`${keyName} cannot begin or end with whitespace in the current native identity profile`);
    key = keyValue;
  }
  if (provider === 'splunk' && title === undefined) title = key;
  const safeTitle = field(title, titleName, 300, action === 'trigger' || provider === 'opsgenie' && action === 'note');
  const safeSender = field(sender, senderName, 100, senderRequired);
  const details: ObjectValue = {};
  const entries = Object.entries(context);
  for (let n = 0; n < entries.length; n++) {
    const [name, value] = entries[n]; details[name] = value;
    // Leave room for a visible aggregate truncation marker.
    if (byteLength(JSON.stringify(details)) > 8000) {
      delete details[name]; truncated = true;
      details._truncation = `Context truncated; ${entries.length - n} fields omitted`;
      break;
    }
  }
  return {action, key, title: safeTitle, severity, priority, observedAt: timestamp(observedAt, provider === 'splunk'), sender: safeSender, links, details, truncated};
}
