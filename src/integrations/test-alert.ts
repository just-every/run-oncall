import {admit, authority, fail, text, type State} from '../family/response-operations/domain';
import {runtimeBindings} from '../auth.server';
import {changeHmac, openCredential, sourceCustody} from '../changes/credentials';
import {grafanaCustody} from '../monitoring/credentials';
import {finishResponseAdmission} from '../response-policy/model';
import {testRefusal} from './key-refusals';
import {sender} from './sender';
import type {SourceRecord} from './catalog';

/** Session-only sample door. Provider credentials stay inside the Worker. */
export function installTestAlerts(api: any, deps: any) {
  api.post('/api/test-alert', async (c: any) => {
    const input = await deps.body(c), state: State = await deps.state(c), actor = c.get('actor');
    authority(state, actor, Boolean(input.source));
    if (actor.machine) fail('A responder session is required', 403);
    const service = state.services.find(service => service.id === input.service);
    if (!service) fail('Choose a service');
    const action = input.action ?? 'new';
    if (!['new', 'add', 'close'].includes(action)) fail('Choose a test action');
    const existing = action === 'new' ? undefined : state.alerts.find(alert => alert.id === input.alert && alert.service === service.id && alert.state === 'active' && alert.coordination?.state !== 'closed');
    if (action !== 'new' && !existing) fail('Choose an alert for this service');
    const identity = existing?.key ?? 'test-' + crypto.randomUUID(), generation = existing?.generation ?? identity;
    const intent = action === 'close' ? 'recover' : 'trigger';
    const title = input.title ? text(input.title, 'Title', 300) : 'Test alert';
    const severity = input.severity ?? 'warning';
    if (!['warning', 'critical', 'info'].includes(severity)) fail('Choose a severity');
    if (!input.source) {
      if (existing && existing.source !== 'oncall-test') fail('Choose a sample alert');
      const at = new Date().toISOString();
      const result = admit(state, {source: 'oncall-test', eventId: crypto.randomUUID(), service: service.id, environment: service.environment, key: identity, generation, intent, severity, title, observedAt: at, evidence: ''});
      if (result.alert) finishResponseAdmission(state, state.alerts.find(alert => alert.id === result.alert)!, result.event, result.event.id);
      state.audit.push({id: crypto.randomUUID(), at, actor: actor.id, kind: 'test-alert', text: `Sent a sample alert on ${service.name}`});
      await deps.save(c.env.DB, state, state.revision, deps.guard(c));
      return c.json({alert: result.alert, service: service.name, effect: action === 'close' ? 'Alert closed' : action === 'add' ? 'Added to the open alert' : 'New alert raised'});
    }
    const [kind, ...parts] = String(input.source).split(':'), id = parts.join(':');
    let source: SourceRecord, custody: string | null, signed: string | null = null, signing: string | null = null;
    if (kind === 'native') {
      const row = await c.env.DB.prepare('SELECT COALESCE(key_custody,signing_custody) AS custody,signing_custody,scopes FROM sources WHERE id=?').bind(id).first();
      if (!row || !JSON.parse(row.scopes).includes(service.id)) fail('Active integration for this service required', 404);
      custody = row.custody; signed = row.signing_custody;
      source = {id: input.source, name: id, kind: 'events', service: service.id, active: true};
    } else if (kind === 'intake') {
      const held = state.intakeSources?.find(source => source.id === id && source.service === service.id && source.active && !source.routing);
      if (!held) fail('Active integration for this service required', 404);
      const row = await c.env.DB.prepare('SELECT key_custody,signing_custody FROM oc_intake_credentials WHERE source=?').bind(id).first();
      custody = row?.key_custody; signing = row?.signing_custody;
      source = {id: input.source, name: held.name, kind: held.provider === 'native' ? 'events' : held.provider, service: service.id, active: true};
    } else fail('This integration does not receive alert events');
    if (existing && existing.source !== (kind === 'intake' ? 'intake:' + id : id)) fail('Choose an alert from this integration');
    if (!custody) fail('Rotate this older integration key once to enable browser tests', 409);
    const secret = runtimeBindings(c.env).SESSION_SECRET;
    const key = await openCredential(custody, secret, sourceCustody);
    const startedAt = existing ? state.events.find(event => existing.events.includes(event.id) && event.intent === 'trigger')?.observedAt : undefined;
    const sample = sender(source, service, key, title, severity, intent, identity, startedAt, generation), body = JSON.stringify(sample.body);
    if (source.kind === 'events') {
      if (signed) {
        const timestamp = String(Math.floor(Date.now() / 1000));
        sample.headers['x-oncall-timestamp'] = timestamp;
        sample.headers['x-oncall-signature'] = await changeHmac(key, timestamp + '.' + body);
      } else sample.headers.authorization = 'Bearer ' + key;
    }
    if (source.kind === 'grafana' && signing) {
      const timestamp = String(Math.floor(Date.now() / 1000)), signingKey = await openCredential(signing, secret, grafanaCustody);
      sample.headers['x-grafana-alerting-timestamp'] = timestamp;
      sample.headers['x-grafana-alerting-signature'] = await changeHmac(signingKey, timestamp + ':' + body);
    }
    const guard = deps.guard(c);
    const current = await c.env.DB.prepare(`SELECT revision FROM workspace_control WHERE revision=? AND ${guard.sql}`).bind(state.revision, ...guard.values).first();
    if (!current) fail('Session or workspace changed; reload before sending', 409);
    const response = await api.fetch(new Request(new URL(sample.path, c.req.url), {method: 'POST', headers: sample.headers, body}), c.env, c.executionCtx);
    if (!response.ok) {
      const retry = response.headers.get('Retry-After');if (retry) c.header('Retry-After', retry);
      const receipt = await response.json().catch(() => null);
      fail(testRefusal(response.status, receipt).replaceAll(key, '[private key]'), response.status);
    }
    const after: State = await deps.state(c), eventSource = kind === 'intake' ? 'intake:' + id : id;
    const alert = after.alerts.find(alert => existing ? alert.id === existing.id : alert.source === eventSource && alert.service === service.id && alert.key === identity);
    return c.json({alert: alert?.id ?? null, service: service.name, effect: !alert ? 'Test received; no alert raised' : action === 'close' ? 'Alert closed' : existing && alert.id === existing.id ? 'Added to the open alert' : 'New alert raised'});
  });
}
