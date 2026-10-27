import { useState } from 'react';
import { Form } from '../forms';
import type { ChangeSource } from './model';
import type { IntakeRun } from '../intake/CompatibleTest';
import { newIdentity } from '../integrations/catalog';

async function sign(secret: string, text: string, hash = 'SHA-256', base64 = false) {
  const bytes = base64 ? Uint8Array.from(atob(secret.slice(6)), c => c.charCodeAt(0)) : new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
  return base64 ? btoa(String.fromCharCode(...signature)) : Array.from(signature, b => b.toString(16).padStart(2, '0')).join('');
}
function payloadFor(source: ChangeSource, title: string, eventId: string, secret: string, timestamp: string) {
        let body: any = { eventId, summary: title, timestamp, author: 'Release team' };
        if (source.provider === 'pagerduty') body = { routing_key: secret, payload: { summary: title, timestamp, source: 'Release team' }, links: [] };
        if (source.provider === 'github') { body = { repository: { id: source.repository, full_name: source.repository }, deployment: { id: eventId, description: title, created_at: timestamp, creator: { login: 'Release team' }, ref: 'release', sha: eventId, environment: 'production' } }; }
        if (source.provider === 'gitlab') body = { object_kind: 'deployment', project: { id: source.repository, path_with_namespace: source.repository }, deployment_id: eventId, status: 'success', created_at: timestamp, user: { username: 'Release team' }, commit_title: title, status_changed_at: timestamp };
        if (source.provider === 'argocd') body = { eventId, application: source.name, revision: eventId, status: 'Synced', summary: title, timestamp, author: 'Release team', links: [] };
        if (source.provider === 'terraform') body = { run_id: eventId, run_created_at: timestamp, run_created_by: 'Release team', workspace_name: source.name, organization_name: 'Operations', notifications: [{ trigger: 'run:completed', run_status: 'applied', run_updated_at: timestamp }] };
  return body;
}
export function ChangeSourceTest({ source, busy, run }: { source: ChangeSource; busy: boolean; run: IntakeRun }) {
  const [secret, setSecret] = useState(''), [title, setTitle] = useState('Service deployed'), [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const path = source.provider === 'pagerduty' ? '/v2/change/enqueue' : '/api/changes/ingress/' + encodeURIComponent(source.id);
  const sample = `POST ${path}\n\n${JSON.stringify(payloadFor(source, 'Service deployed', 'deployment-check', 'YOUR_PRIVATE_KEY', new Date().toISOString()), null, 2)}`;
  return <>
    <details><summary>Send a test event</summary><Form busy={busy} disabled={!source.active} label="Send test event" onSubmit={async () => {
      const result = await run(async () => {
        const eventId = newIdentity('change'), timestamp = new Date().toISOString(), headers: Record<string, string> = { 'content-type': 'application/json' };
        const body = payloadFor(source, title, eventId, secret, timestamp);
        if (source.provider === 'github') { headers['x-github-event'] = 'deployment'; headers['x-github-delivery'] = eventId; }
        if (source.provider === 'gitlab') headers['x-gitlab-event'] = 'Deployment Hook';
        const raw = JSON.stringify(body), at = String(Math.floor(Date.now() / 1000));
        if (source.provider === 'native' && source.mode === 'bearer') headers.authorization = 'Bearer ' + secret;
        else if (source.provider === 'github') headers['x-hub-signature-256'] = 'sha256=' + await sign(secret, raw);
        else if (source.provider === 'gitlab') { headers['webhook-id'] = eventId; headers['webhook-timestamp'] = at; headers['webhook-signature'] = 'v1,' + await sign(secret, eventId + '.' + at + '.' + raw, 'SHA-256', true); }
        else if (source.provider === 'terraform') headers['x-tfe-notification-signature'] = await sign(secret, raw, 'SHA-512');
        else if (source.provider !== 'pagerduty') { headers['x-oncall-timestamp'] = at; headers['x-oncall-signature'] = await sign(secret, at + '.' + raw); }
        const response = await fetch(path, { method: 'POST', headers, body: raw });
        if (!response.ok) throw Error('The receiver refused this test. Check the private key and source settings.');
        return response.json();
      }, undefined, 'Test change accepted');
      if (result) { setSecret(''); setNotice('Test change accepted. Its receipt is below.'); }
      return false;
    }}><label className="field">Private key<input type="password" autoComplete="off" required value={secret} onChange={e => setSecret(e.target.value)} /></label><label className="field">Title<input required maxLength={300} value={title} onChange={e => setTitle(e.target.value)} /></label></Form>{notice && <p role="status">{notice}</p>}</details>
    <details><summary>Sample request</summary><pre tabIndex={0}>{sample}</pre><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(sample); setCopied(true); } catch { setCopied(false); } }}>Copy sample request</button>{copied && <p role="status">Copied</p>}</details>
  </>;
}
