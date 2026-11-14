import { useState } from 'react';
import { Form } from '../forms';
import { testRefusal } from './key-refusals';
import { RequestExample } from './RequestExample';
import { ProviderRequest } from './ProviderRequest';
import { sender } from './sender';
import type { Event, Service } from '../family/response-operations/domain';
import type { IntakeRun } from '../intake/CompatibleTest';
import { newIdentity, type SourceRecord } from './catalog';

async function signature(key: string, input: string) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', material, new TextEncoder().encode(input))), b => b.toString(16).padStart(2, '0')).join('');
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
  if (source.kind === 'email' || source.kind === 'changes') return null;
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
    {source.kind === 'events' ? <RequestExample source={source.id.slice(source.id.indexOf(':') + 1)} service={service} mode={source.native?.authentication || 'bearer'} defaultOpen={!events.length} /> : <ProviderRequest key={source.id} source={source} service={service} />}
  </>;
}
