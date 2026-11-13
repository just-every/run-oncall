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
  const [copied, setCopied] = useState('');
  const path = source.provider === 'pagerduty' ? '/v2/change/enqueue' : '/api/changes/ingress/' + encodeURIComponent(source.id);
  const [origin,setOrigin]=useState('');
  useEffect(()=>setOrigin(location.origin),[]);
  const [example]=useState(()=>{const eventId=newIdentity('change');return {eventId,body:payloadFor(source,'Service deployed',eventId,'YOUR_PRIVATE_KEY',new Date().toISOString())};});
  const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
  const hex = "od -An -v -tx1 | tr -d ' \\n'";
  const body = source.provider === 'pagerduty'
    ? `key_json=$(printf '%s' "$ONCALL_SOURCE_KEY" | awk '\nBEGIN { printf "\\\"" }\n{\n  if (NR > 1) printf "\\\\n"\n  for (i = 1; i <= length($0); i++) {\n    c = substr($0, i, 1)\n    if (c == "\\\\" || c == "\\\"") printf "\\\\%s", c\n    else {\n      control = 0\n      for (j = 1; j < 32; j++) if (c == sprintf("%c", j)) control = j\n      if (control) printf "\\\\u%04x", control\n      else printf "%s", c\n    }\n  }\n}\nEND { printf "\\\"" }')\nbody=${quote(JSON.stringify({...example.body, routing_key: undefined}).replace(/}$/, ',"routing_key":'))}"$key_json"'}'`
    : `body=${quote(JSON.stringify(example.body, null, 2))}`;
  const auth = source.provider === 'native' && source.mode === 'bearer'
    ? `  -H "Authorization: Bearer $ONCALL_SOURCE_KEY"`
    : source.provider === 'github'
      ? `  -H 'x-github-event: deployment' \\\n  -H "x-github-delivery: $eventId" \\\n  -H "x-hub-signature-256: sha256=$signature"`
      : source.provider === 'gitlab'
        ? `  -H 'x-gitlab-event: Deployment Hook' \\\n  -H "webhook-id: $eventId" \\\n  -H "webhook-timestamp: $timestamp" \\\n  -H "webhook-signature: v1,$signature"`
        : source.provider === 'terraform'
          ? `  -H "x-tfe-notification-signature: $signature"`
          : source.provider === 'pagerduty' ? ''
            : `  -H "x-oncall-timestamp: $timestamp" \\\n  -H "x-oncall-signature: $signature"`;
  const signing = source.provider === 'native' && source.mode === 'bearer' || source.provider === 'pagerduty' ? ''
    : source.provider === 'gitlab'
      ? `timestamp=$(date +%s)\nkey_hex=$(printf '%s' "\${ONCALL_SOURCE_KEY#whsec_}" | openssl base64 -d -A | ${hex})\nsignature=$(printf '%s.%s.%s' "$eventId" "$timestamp" "$body" | openssl dgst -sha256 -mac HMAC -macopt "hexkey:$key_hex" -binary | openssl base64 -A)\n`
      : source.provider === 'github' || source.provider === 'terraform'
        ? `signature=$(printf '%s' "$body" | openssl dgst -${source.provider === 'terraform' ? 'sha512' : 'sha256'} -hmac "$ONCALL_SOURCE_KEY" -binary | ${hex})\n`
        : `timestamp=$(date +%s)\nsignature=$(printf '%s.%s' "$timestamp" "$body" | openssl dgst -sha256 -hmac "$ONCALL_SOURCE_KEY" -binary | ${hex})\n`;
  const sample = `set -eu\n: "\${ONCALL_SOURCE_KEY:?Set ONCALL_SOURCE_KEY privately first}"\neventId=${quote(example.eventId)}\n${body}\n${signing}curl --fail-with-body ${quote(origin + path)} \\\n  -H 'Content-Type: application/json' \\\n${auth ? auth + ' \\\n' : ''}  --data-binary "$body"`;
  const commands = `export ONCALL_SOURCE_KEY='PASTE_YOUR_PRIVATE_KEY'\nsh send.sh`;
  const copy = async (text: string, done: string) => { try { await navigator.clipboard.writeText(text); setCopied(done); } catch { setCopied('Select the text above and copy it.'); } };

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
    <details><summary>Sample request</summary>
      <p>This sends one change event from your own machine using curl, OpenSSL and standard shell tools on macOS, Linux or WSL. No Node.js is needed. Check <code>curl --version</code> and <code>openssl version</code> first.</p>
      <ol>
        <li>Save this sample as <code>send.sh</code>.<label className="field">Sample request<textarea aria-label="Sample request" readOnly rows={12} spellCheck={false} value={sample}/></label><button type="button" disabled={!origin} onClick={() => copy(sample, 'Copied')}>Copy sample request</button></li>
        <li>In a terminal in the same folder, set the private key you copied when you created this source, then run the file.<pre tabIndex={0}>{commands}</pre><button type="button" onClick={() => copy(commands, 'Commands copied')}>Copy run commands</button></li>
        <li>A successful request prints a JSON receipt. Running the same file again returns the same change; edit the event identity and payload to send another. A refused request prints an error and exits unsuccessfully.</li>
      </ol>
      {copied && <p role="status">{copied}</p>}</details>
  </>;
}
