import { Field, Form } from '../forms';
import type { Service } from '../family/response-operations/domain';

type Props = { source: string; secret: string; mode: string; service: Service; services: Service[]; busy: boolean; run: (path: string | (() => Promise<any>), data?: unknown, success?: string | ((value: any) => string)) => Promise<any> };
export function IntegrationEvent({ source, secret, mode, service, services, busy, run }: Props) {
  return <details>
    <summary>Send a local integration event</summary>
    <p>Use the source you saved above. For a recovery, keep the same alert key and generation as its trigger, choose recover, and use a new event ID. To fire again after recovery, start a new generation.</p>
    <Form busy={busy} label="Admit event" onSubmit={data => run(async () => {
      const selected = services.find(item => item.id === data.service);
      const payload = { source: data.source, eventId: data.eventId, key: data.key, generation: data.generation, service: data.service, environment: selected?.environment, intent: data.intent, severity: data.severity, title: data.title, observedAt: new Date().toISOString(), evidence: data.evidence };
      const body = JSON.stringify(payload);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (data.mode === 'signed') {
        const timestamp = String(Math.floor(Date.now() / 1000));
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(data.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        headers['x-oncall-timestamp'] = timestamp;
        headers['x-oncall-signature'] = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(timestamp + '.' + body))), byte => byte.toString(16).padStart(2, '0')).join('');
      } else headers.Authorization = 'Bearer ' + data.secret;
      const response = await fetch('/api/ingress/' + encodeURIComponent(data.source), { method: 'POST', headers, body });
      const result = await response.json() as any;
      if (!response.ok) throw Error(result.error);
      return result;
    }, undefined, result => result.duplicate ? 'Existing receipt returned' : 'Event durably accepted')}>
      <Field key={'source' + source} name="source" label="Source ID" value={source} help="The name of the monitoring source you saved above." />
      <Field key={'secret' + secret} name="secret" label="Source key" type="password" value={secret} help="The same private key used when saving this source." />
      <Field key={'mode' + mode} name="mode" label="Authentication" value={mode} help="Must match the mode saved for this source. Bearer is recommended for a first connection."><option value="bearer">Bearer token</option><option value="signed">HMAC signature</option></Field>
      <Field key={service.id} name="service" label="Service" value={service.id} help="The service affected by this signal. Its saved environment is included automatically.">{services.map(item => <option key={item.id} value={item.id}>{item.name} · {item.environment}</option>)}</Field>
      <Field name="eventId" label="Unique event ID" help="A new ID for each observation, for example latency-001-trigger or latency-001-recovery. Reuse an ID only to retry exactly the same event." />
      <Field name="key" label="Deduplication key" help="A stable name for this alert, for example checkout-latency. Signals with this key are grouped for this source, service and environment." />
      <Field name="generation" label="Lifecycle generation" help="A name for one firing and its recovery, for example latency-001. Use latency-002 if it fires again after recovering." />
      <Field name="intent" label="Lifecycle intent" help="Trigger opens this alert generation. Recover closes it and keeps its history; it does not resolve an incident."><option value="trigger">trigger</option><option value="recover">recover</option></Field>
      <Field name="severity" label="Severity" help="Warning needs attention, critical is urgent, and info records a lower priority signal. This is required on recovery too."><option>warning</option><option>critical</option><option>info</option></Field>
      <Field name="title" label="Signal title" help="Describe the observation, for example Checkout latency above 2 seconds. Required on recovery too. This form uses the current time as observedAt." />
      <Field name="evidence" label="Evidence URL" type="url" required={false} help="Optional HTTP or HTTPS link to a graph, log or investigation." />
    </Form>
  </details>;
}
