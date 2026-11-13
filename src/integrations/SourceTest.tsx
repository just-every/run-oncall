import { useState } from 'react';
import { Form } from '../forms';
import { testRefusal } from './key-refusals';
import { RequestExample } from './RequestExample';
import type { Event, Service } from '../family/response-operations/domain';
import type { IntakeRun } from '../intake/CompatibleTest';
import { newIdentity, type SourceRecord } from './catalog';

type Sender = { path: string; headers: Record<string, string>; body: unknown };
function sender(source: SourceRecord, service: Service, secret: string, title: string, severity: string, intent: string, identity: string, startedAt = new Date().toISOString(), generation = identity): Sender {
  const id = source.id.slice(source.id.indexOf(':') + 1), headers: Record<string, string> = { 'content-type': 'application/json' };
  if (source.kind === 'events') return { path: '/api/ingress/' + encodeURIComponent(id), headers, body: { source: id, eventId: newIdentity('event'), service: service.id, environment: service.environment, key: identity, generation, title, severity, intent, observedAt: new Date().toISOString(), evidence: '' } };
  if (source.kind === 'pagerduty') return { path: '/v2/enqueue', headers, body: { routing_key: secret, event_action: intent === 'recover' ? 'resolve' : 'trigger', dedup_key: identity, payload: { summary: title, source: 'Oncall receiver check', severity } } };
  if (source.kind === 'opsgenie') {
    headers.Authorization = 'GenieKey ' + secret;
    return { path: intent === 'recover' ? '/v2/alerts/' + encodeURIComponent(identity) + '/close?identifierType=alias' : '/v2/alerts', headers, body: intent === 'recover' ? { source: 'Oncall receiver check' } : { alias: identity, message: title, priority: severity === 'critical' ? 'P1' : severity === 'info' ? 'P5' : 'P3' } };
  }
  if (source.kind === 'splunk') return { path: '/integrations/generic/20131114/alert/' + encodeURIComponent(secret) + '/oncall', headers, body: { entity_id: identity, entity_display_name: title, message_type: intent === 'recover' ? 'RECOVERY' : severity === 'critical' ? 'CRITICAL' : severity === 'info' ? 'INFO' : 'WARNING' } };
  if (source.kind === 'datadog') return { path: '/api/monitoring/' + encodeURIComponent(id), headers: { ...headers, authorization: 'Bearer ' + secret }, body: { id: newIdentity('event'), alert_id: identity, alert_cycle_key: identity, alert_scope: '', alert_transition: intent === 'recover' ? 'Recovered' : 'Triggered', date: Date.now(), alert_type: severity, tags: '', title, body: '' } };
  const now = new Date().toISOString();
  return { path: '/api/monitoring/' + encodeURIComponent(id), headers: { ...headers, authorization: 'Bearer ' + secret }, body: { version: source.kind === 'grafana' ? '1' : '4', receiver: 'Oncall', groupKey: identity, status: intent === 'recover' ? 'resolved' : 'firing', groupLabels: {}, commonLabels: {}, commonAnnotations: {}, alerts: [{ status: intent === 'recover' ? 'resolved' : 'firing', labels: { alertname: identity, severity }, annotations: { summary: title }, startsAt: startedAt, endsAt: intent === 'recover' ? now : '0001-01-01T00:00:00Z', fingerprint: identity, generatorURL: '' }] } };
}
async function signature(key: string, input: string) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', material, new TextEncoder().encode(input))), b => b.toString(16).padStart(2, '0')).join('');
}
/** The request a provider-compatible sender makes, with the secret left as a placeholder. */
export function providerSample(source: SourceRecord, service: Service, origin = '') {
  const example = sender(source, service, 'YOUR_PRIVATE_KEY', 'Service latency is above normal', 'warning', 'trigger', 'receiver-check');
  return `POST ${origin}${example.path}\n${JSON.stringify(example.headers, null, 2)}\n\n${JSON.stringify(example.body, null, 2)}`;
}
export function SourceTest({ source, service, busy, run, events = [] }: { source: SourceRecord; service: Service; busy: boolean; run: IntakeRun; events?: Event[] }) {
  // The last accepted Trigger is durable workspace state. Component-only identity
  // is lost when a sender visits Alerts or reloads before sending Recover.
  const latest = events.find(e => e.intent === 'trigger' && e.service === service.id && e.environment === service.environment);
  const last = latest && events.find(e => e.key === latest.key && e.generation === latest.generation);
  const [secret, setSecret] = useState(''), [signing, setSigning] = useState(''), [title, setTitle] = useState(latest?.title ?? 'Service latency is above normal');
  const [severity, setSeverity] = useState('warning'), [intent, setIntent] = useState(source.kind === 'events' && latest ? 'recover' : 'trigger'), [cycle,setCycle] = useState(() => {
    const identity = newIdentity('check');
    return {identity:latest?.key ?? identity,generation:latest?.generation ?? identity,startedAt:latest?.observedAt ?? new Date().toISOString(),lastIntent:last?.intent ?? ''};
  });
  const [copied, setCopied] = useState(false);
  const [example] = useState(() => sender(source, service, 'YOUR_PRIVATE_KEY', 'Service latency is above normal', 'warning', 'trigger', 'receiver-check'));
  if (source.kind === 'email' || source.kind === 'changes') return null;
  const sample = `POST ${example.path}\n${JSON.stringify({ ...example.headers, ...(source.kind === 'events' ? { authorization: 'Bearer YOUR_PRIVATE_KEY' } : {}) }, null, 2)}\n\n${JSON.stringify(example.body, null, 2)}`;
  return <>
    <details><summary>Send a test event</summary><Form busy={busy} disabled={!source.active} label="Send test event" onSubmit={async () => {
      const identity = newIdentity('check');
      const next=source.kind!=='events'&&source.kind!=='pagerduty'&&intent==='trigger'&&cycle.lastIntent==='recover'?{identity,generation:identity,startedAt:new Date().toISOString(),lastIntent:intent}:{...cycle,lastIntent:intent};
      const result = await run(async () => {
        const value = sender(source, service, secret, title, severity, intent, next.identity, next.startedAt, next.generation), body = JSON.stringify(value.body);
        if (source.kind === 'events') {
          if (source.native?.authentication === 'signed') {
            const timestamp = String(Math.floor(Date.now() / 1000)); value.headers['x-oncall-timestamp'] = timestamp;
            value.headers['x-oncall-signature'] = await signature(secret, timestamp + '.' + body);
          } else value.headers.authorization = 'Bearer ' + secret;
        }
        if (source.kind === 'grafana' && signing) {
          const timestamp = String(Math.floor(Date.now() / 1000)); value.headers['x-grafana-alerting-timestamp'] = timestamp;
          value.headers['x-grafana-alerting-signature'] = await signature(signing, timestamp + ':' + body);
        }
        const response = await fetch(value.path, { method: 'POST', headers: value.headers, body });
        const receipt = await response.json().catch(() => null);
        if (!response.ok) {
          const reason = testRefusal(response.status, receipt);
          throw Error([secret, signing].filter(Boolean).reduce((text, key) => text.replaceAll(key, '[private key]'), reason));
        }
        return receipt;
      }, undefined, 'Test event accepted');
      if (result) { setCycle(next); if (source.kind === 'events') { setSecret(''); setSigning(''); } }
      return false;
    }}>
      <label className="field">Private key<input type="password" autoComplete="off" required value={secret} onChange={e => setSecret(e.target.value)} /></label>
      {source.kind === 'events' && <p>The private key is cleared after each accepted test. Enter it again before sending another.</p>}
      <label className="field">Title<input required maxLength={300} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="field">Severity<select aria-label="Severity" value={severity} onChange={e => setSeverity(e.target.value)}><option value="warning">Warning</option><option value="critical">Critical</option><option value="info">Information</option></select></label>
      <label className="field">Intent<select aria-label="Intent" value={intent} onChange={e => {
        const value = e.target.value;
        if (source.kind === 'events' && value === 'trigger' && cycle.lastIntent === 'recover') setCycle({...cycle,generation:newIdentity('check'),lastIntent:'',startedAt:new Date().toISOString()});
        setIntent(value);
      }}><option value="trigger">Trigger</option><option value="recover">Recover</option></select></label>
      {(source.kind === 'events' || source.kind === 'pagerduty') && <label className="field">Alert key (dedup key)<input required maxLength={source.kind === 'pagerduty' ? 255 : 200} value={cycle.identity} onChange={e => setCycle({...cycle,identity:e.target.value})} /></label>}
      {source.kind === 'pagerduty' && <p>Reuse this key to repeat or recover the same test. Recover closes its open alert; a declared incident stays open.</p>}
      {source.kind === 'events' && <>
        <label className="field">Lifecycle generation<input required maxLength={100} value={cycle.generation} onChange={e => setCycle({...cycle,generation:e.target.value})} /></label>
        <p>Recover closes the alert with this key and generation, regardless of severity; a declared incident stays open.</p>
      </>}
      {source.kind === 'grafana' && <label className="field">Signing secret, if enabled<input type="password" autoComplete="off" value={signing} onChange={e => setSigning(e.target.value)} /></label>}
    </Form></details>
    {source.kind === 'events' ? <RequestExample source={source.id.slice(source.id.indexOf(':') + 1)} service={service} mode={source.native?.authentication || 'bearer'} defaultOpen={!events.length} /> : <details><summary>Sample request</summary><pre tabIndex={0}>{sample}</pre><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(sample); setCopied(true); } catch { setCopied(false); } }}>Copy sample request</button>{copied && <p role="status">Copied</p>}</details>}
  </>;
}
