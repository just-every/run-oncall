import { isRecord, monitoringHash, monitoringSanitizer } from './sanitize';
import type { MonitoringEvent, MonitoringProvider, MonitoringResult } from './types';
export type { MonitoringEvent, MonitoringProvider, MonitoringResult } from './types';

type Data = Record<string, unknown>;
const requireText = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} must be non-empty text`);
  return value;
};
const identifier = (value: unknown, name: string): string => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  return requireText(value, name);
};
const stringMap = (value: unknown, name: string, optional = false): Record<string, string> => {
  if (optional && value === undefined) return {};
  if (!isRecord(value) || Object.values(value).some(v => typeof v !== 'string')) throw new Error(`${name} must be a string map`);
  return value as Record<string, string>;
};
/** Preserve fractional precision for source generation identity, not Date's millisecond rounding. */
function instant(value: unknown, name: string): { timestamp: string; identity: string } {
  const input = requireText(value, name);
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/i.exec(input);
  if (!match || input.startsWith('0001-01-01T00:00:00') || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59)
    throw new Error(`${name} must be a nonzero RFC3339 timestamp`);
  const calendar = new Date(match[1] + 'T00:00:00Z');
  const date = new Date(input);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== match[1] || !Number.isFinite(date.getTime()))
    throw new Error(`${name} contains an invalid date`);
  const fraction = (match[5] ?? '').replace(/0+$/, '');
  return { timestamp: date.toISOString(), identity: date.toISOString().slice(0, 19) + (fraction ? '.' + fraction : '') + 'Z' };
}

const severity = (value: unknown): MonitoringEvent['severity'] =>
  value === 'warning' || value === 'warn' ? 'warning' : value === 'info' || value === 'success' ? 'info' : 'critical';
const select = (data: Data, names: string[]): Data => Object.fromEntries(names.filter(name => data[name] !== undefined).map(name => [name, data[name]]));

async function groupedEvent(provider: 'alertmanager' | 'grafana', alert: unknown, envelope: Data, secret: string | string[]): Promise<MonitoringEvent> {
  if (!isRecord(alert)) throw new Error('alert must be an object');
  if (alert.status !== 'firing' && alert.status !== 'resolved') throw new Error('alert.status must be firing or resolved');
  const labels = stringMap(alert.labels, 'alert.labels');
  const annotations = stringMap(alert.annotations, 'alert.annotations', true);
  const fingerprint = requireText(alert.fingerprint, 'alert.fingerprint');
  for (const name of ['generatorURL', 'dashboardURL', 'panelURL', 'silenceURL'])
    if (alert[name] !== undefined && typeof alert[name] !== 'string') throw new Error(`alert.${name} must be text`);
  if (alert.values !== undefined && (!isRecord(alert.values) || Object.values(alert.values).some(v => typeof v !== 'number' || !Number.isFinite(v))))
    throw new Error('alert.values must be a finite numeric map');
  const start = instant(alert.startsAt, 'alert.startsAt');
  const end = alert.status === 'resolved' ? instant(alert.endsAt, 'alert.endsAt') : null;
  if (end && Date.parse(end.timestamp) < Date.parse(start.timestamp)) throw new Error('alert.endsAt precedes startsAt');
  if (provider === 'grafana' && envelope.orgId !== undefined && (!Number.isSafeInteger(envelope.orgId) || Number(envelope.orgId) < 0))
    throw new Error('orgId must be a nonnegative integer');
  const safe = monitoringSanitizer(secret);
  const orgId = provider === 'grafana' ? envelope.orgId ?? null : null;
  const key = provider + ':' + await monitoringHash({ fingerprint, orgId });
  const generation = start.identity.length <= 100 ? start.identity : provider + ':' + await monitoringHash(start.identity);
  const intent = alert.status === 'resolved' ? 'recover' : 'trigger';
  const title = safe.bound(annotations.summary?.trim() || labels.alertname?.trim() || annotations.description?.trim() || fingerprint, 300);
  const level = severity(labels.severity);
  const links = [...new Set(['generatorURL', 'dashboardURL', 'panelURL', 'silenceURL'].flatMap(name => {
    if (alert[name] === undefined || alert[name] === '') return [];
    const url = safe.safeURL(alert[name]); return url ? [url] : [];
  }))].sort();
  // Envelope membership/status/order is deliberately absent from receipt identity.
  const content = safe.clean({ provider, orgId, fingerprint, status: alert.status, labels, annotations,
    startsAt: start.identity, ...(end ? { endsAt: end.identity } : {}),
    ...select(alert, ['generatorURL', 'dashboardURL', 'panelURL', 'silenceURL', 'values']) });
  const eventId = provider + ':' + await monitoringHash({key,generation,intent,content});
  const details = safe.structured({ provider, fingerprint, startsAt: start.identity, ...(end ? { endsAt: end.identity } : {}),
    ...(orgId === null ? {} : { orgId }), labels, annotations, ...select(alert, ['values']),
    ...select(envelope, ['receiver', 'groupKey', 'groupLabels', 'commonLabels', 'commonAnnotations', 'externalURL', 'truncatedAlerts']) });
  const routingInput = safe.structured({ labels, commonLabels: envelope.commonLabels ?? {}, groupLabels: envelope.groupLabels ?? {},
    annotations, summary: title, source: provider, severity: level, urgency: level === 'info' ? 'low' : 'high',
    fingerprint, startsAt: start.identity, ...(orgId === null ? {} : { orgId }) });
  return { eventId, key, generation, intent, title, severity: level,
    observedAt: end?.timestamp ?? start.timestamp, details, links, routingInput, truncated: safe.truncated };
}

async function datadogEvent(payload: Data, secret: string | string[]): Promise<MonitoringEvent> {
  const id = identifier(payload.id, 'id'), monitor = identifier(payload.alert_id, 'alert_id');
  const cycle = requireText(payload.alert_cycle_key, 'alert_cycle_key');
  if (typeof payload.alert_scope !== 'string') throw new Error('alert_scope must be text (empty for an ungrouped monitor)');
  const scope = payload.alert_scope.split(',').map(v => v.trim()).filter(Boolean).sort().join(',');
  const transition = requireText(payload.alert_transition, 'alert_transition');
  const intent = transition === 'Recovered' ? 'recover' : 'trigger';
  if (!(typeof payload.date === 'number' || typeof payload.date === 'string' && /^\d+$/.test(payload.date)))
    throw new Error('date must be Unix milliseconds');
  const date = Number(payload.date);
  if (!Number.isSafeInteger(date) || !Number.isFinite(new Date(date).getTime())) throw new Error('date must be valid Unix milliseconds');
  const observedAt = new Date(date).toISOString();
  const rawTitle = requireText(payload.title, 'title');
  for (const name of ['body', 'alert_type', 'alert_priority', 'link'])
    if (payload[name] !== undefined && typeof payload[name] !== 'string') throw new Error(`${name} must be text`);
  if (payload.tags !== undefined && typeof payload.tags !== 'string') throw new Error('tags must contain the documented comma-separated tag text');
  const tags = typeof payload.tags === 'string' ? [...new Set(payload.tags.split(',').map(v => v.trim()).filter(Boolean))].sort() : [];
  const safe = monitoringSanitizer(secret);
  const title = safe.bound(rawTitle, 300);
  const level = ['No Data', 'Re-No Data'].includes(transition) || !['Recovered', 'Triggered', 'Re-Triggered', 'Warn', 'Re-Warn', 'Renotify'].includes(transition)
    ? 'critical' : ['Warn', 'Re-Warn'].includes(transition) ? 'warning' : severity(payload.alert_type);
  const link = payload.link === undefined || payload.link === '' ? null : safe.safeURL(payload.link);
  const content = { provider: 'datadog', id, alert_id: monitor, alert_cycle_key: cycle, alert_scope: scope,
    alert_transition: transition, date: observedAt, tags, title: rawTitle, ...select(payload, ['body', 'alert_type', 'alert_priority', 'link']) };
  const key = 'datadog:' + await monitoringHash({ monitor, scope });
  const generation = 'datadog:' + await monitoringHash({ monitor, cycle });
  const eventId = 'datadog:' + await monitoringHash({key,generation,id:await monitoringHash(id),content:safe.clean(content)});
  const details = safe.structured(content);
  const routingInput = safe.structured({ tags, alert_id: monitor, alert_scope: scope, alert_transition: transition,
    summary: title, source: 'datadog', severity: level, urgency: level === 'info' ? 'low' : 'high',
    ...select(payload, ['alert_type', 'alert_priority']) });
  return { eventId, key, generation, intent, title, severity: level, observedAt, details,
    links: link ? [link] : [], routingInput, truncated: safe.truncated };
}

/** Normalize supported provider payloads; caller authenticates and enforces request-byte admission. */
export async function normalizeMonitoring(provider: MonitoringProvider, payload: unknown, secret: string | string[]): Promise<MonitoringResult> {
  const result: MonitoringResult = { events: [], dropped: 0, truncated: false, diagnostics: [] };
  const diagnostic = (message: string) => { if (result.diagnostics.length < 30) result.diagnostics.push(message); };
  if (!isRecord(payload)) return { ...result, dropped: null, truncated: true, diagnostics: ['Payload must be a JSON object; alert count unknown'] };
  if (provider === 'datadog') {
    try {
      result.events.push(await datadogEvent(payload, secret));
      if (!['Recovered', 'Triggered', 'Re-Triggered', 'No Data', 'Re-No Data', 'Warn', 'Re-Warn', 'Renotify'].includes(String(payload.alert_transition)))
        diagnostic('Unknown Datadog transition retained as a high-severity trigger; never inferred as recovery');
    } catch (error) { result.dropped = 1; diagnostic(error instanceof Error ? error.message : 'Malformed Datadog notification'); }
  } else if (provider === 'alertmanager' || provider === 'grafana') {
    const expectedVersion = provider === 'alertmanager' ? '4' : '1';
    if (payload.version !== undefined && payload.version !== expectedVersion)
      return { ...result, dropped: Array.isArray(payload.alerts) ? payload.alerts.length : null, truncated: true, diagnostics: ['Unsupported webhook payload version'] };
    if (!Array.isArray(payload.alerts)) return { ...result, dropped: null, truncated: true, diagnostics: ['alerts must be an array; alert count unknown'] };
    if (payload.alerts.length === 0) diagnostic('Notification contains no readable alerts');
    const envelope = { ...payload };
    for (const name of ['groupLabels', 'commonLabels', 'commonAnnotations']) {
      try { if (payload[name] !== undefined) stringMap(payload[name], name); }
      catch { delete envelope[name]; result.truncated = true; diagnostic(`${name} omitted: must be a string map`); }
    }
    for (const name of ['receiver', 'groupKey', 'externalURL']) {
      if (payload[name] !== undefined && typeof payload[name] !== 'string') {
        delete envelope[name]; result.truncated = true; diagnostic(`${name} omitted: must be text`);
      }
    }
    if (payload.truncatedAlerts !== undefined && (!Number.isSafeInteger(payload.truncatedAlerts) || Number(payload.truncatedAlerts) < 0)) {
      result.dropped = null; result.truncated = true; diagnostic('Invalid upstream truncatedAlerts; omitted alert count unknown');
    } else if (Number(payload.truncatedAlerts) > 0) {
      result.dropped = Number(payload.truncatedAlerts); result.truncated = true; diagnostic('Provider omitted alerts before delivery');
    }
    // No alert-count ceiling: byte admission and workspace capacity are handled by the caller.
    const normalized = await Promise.all(payload.alerts.map(async (alert, index) => {
      try { return { event: await groupedEvent(provider, alert, envelope, secret) }; }
      catch (error) { return { diagnostic: `alerts[${index}]: ${error instanceof Error ? error.message : 'Malformed alert'}` }; }
    }));
    for (const item of normalized) {
      if (item.event) result.events.push(item.event);
      else {
        if (result.dropped !== null) result.dropped++;
        diagnostic(item.diagnostic!);
      }
    }
  } else return { ...result, dropped: null, truncated: true, diagnostics: ['Unsupported monitoring provider'] };
  result.truncated ||= result.dropped !== 0 || result.events.some(event => event.truncated);
  return result;
}
