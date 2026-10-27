import { useEffect, useState } from 'react';
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
  const [secret, setSecret] = useState(''), [title, setTitle] = useState('Service deployed');
  const [copied, setCopied] = useState(false);
  const path = source.provider === 'pagerduty' ? '/v2/change/enqueue' : '/api/changes/ingress/' + encodeURIComponent(source.id);
  const [origin,setOrigin]=useState('');
  useEffect(()=>setOrigin(location.origin),[]);
  const [example]=useState(()=>{const eventId=newIdentity('change');return {eventId,body:payloadFor(source,'Service deployed',eventId,'YOUR_PRIVATE_KEY',new Date().toISOString())};});
  const auth=source.provider==='native'&&source.mode==='bearer'?"headers.authorization = 'Bearer ' + key;":source.provider==='github'?`headers['x-github-event'] = 'deployment';
headers['x-github-delivery'] = eventId;
headers['x-hub-signature-256'] = 'sha256=' + createHmac('sha256', key).update(body).digest('hex');`:source.provider==='gitlab'?`headers['x-gitlab-event'] = 'Deployment Hook';
headers['webhook-id'] = eventId;
headers['webhook-timestamp'] = timestamp;
headers['webhook-signature'] = 'v1,' + createHmac('sha256', Buffer.from(key.slice(6), 'base64')).update(eventId + '.' + timestamp + '.' + body).digest('base64');`:source.provider==='terraform'?"headers['x-tfe-notification-signature'] = createHmac('sha512', key).update(body).digest('hex');":source.provider==='pagerduty'?'':`headers['x-oncall-timestamp'] = timestamp;
headers['x-oncall-signature'] = createHmac('sha256', key).update(timestamp + '.' + body).digest('hex');`;
  const sample=`import { createHmac } from 'node:crypto';
const key = process.env.ONCALL_SOURCE_KEY;
if (!key) throw Error('Set your private source key before running this request');
const eventId = ${JSON.stringify(example.eventId)};
const payload = ${JSON.stringify(example.body,null,2)};
${source.provider==='pagerduty'?'payload.routing_key = key;\n':''}const body = JSON.stringify(payload);
const timestamp = String(Math.floor(Date.now() / 1000));
const headers = { 'content-type': 'application/json' };
${auth}
const response = await fetch(${JSON.stringify(origin+path)}, { method: 'POST', headers, body });
console.log(response.status);
if (!response.ok) process.exitCode = 1;`;

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
      if (result) setSecret('');
      return false;
    }}><label className="field">Private key<input type="password" autoComplete="off" required value={secret} onChange={e => setSecret(e.target.value)} /></label>{source.provider!=='terraform'&&<label className="field">Title<input required maxLength={300} value={title} onChange={e => setTitle(e.target.value)} /></label>}</Form></details>
    <details><summary>Sample request</summary><p>Keep the private key in your sender’s environment, then run this with Node 22.</p><label className="field">Sample request<textarea aria-label="Sample request" readOnly rows={12} value={sample}/></label><button type="button" disabled={!origin} onClick={async () => { try { await navigator.clipboard.writeText(sample); setCopied(true); } catch { setCopied(false); } }}>Copy sample request</button>{copied && <p role="status">Copied</p>}</details>
  </>;
}
