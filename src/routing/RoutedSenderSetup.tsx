import { useState } from 'react';
import { RequestExample } from '../integrations/RequestExample';
import { ProviderRequest } from '../integrations/ProviderRequest';
import type { IntegrationKind, SourceRecord } from '../integrations/catalog';
import type { Service } from '../family/response-operations/domain';

export type RoutedSender = { id: string; name: string; provider: string; authentication?: string; service: Service; services: Service[] };
const ingressPath = (provider: string, id: string) => provider === 'native' ? '/api/ingress/' + encodeURIComponent('intake:' + id) : null;

/** Everything a sender needs to start using a routed key, except its private key. */
export function RoutedSenderSetup({ sender, defaultOpen = false }: { sender: RoutedSender; defaultOpen?: boolean }) {
  const [copied, setCopied] = useState('');
  const copy = async (text: string, done: string) => { try { await navigator.clipboard.writeText(text); setCopied(done); } catch { setCopied('Select the text above and copy it.'); } };
  const record: SourceRecord = { id: 'intake:' + sender.id, name: sender.name, kind: sender.provider as IntegrationKind, service: sender.service.id, active: true };
  return <section className="routed-sender" aria-label="Sender setup for this key"><h3>Sender setup</h3>
    <p>{sender.name} · Services: {sender.services.map(service => service.name).join(', ')}</p>
    {ingressPath(sender.provider, sender.id)
      ? <RequestExample source={'intake:' + sender.id} service={sender.service} mode={sender.authentication || 'bearer'} defaultOpen={defaultOpen} routed />
      : <ProviderRequest key={record.id} source={record} service={sender.service} defaultOpen={defaultOpen} />}
    <details><summary>Key details</summary>
      <label className="field">Key ID<input readOnly value={sender.id} onFocus={e => e.currentTarget.select()} /></label>
      <button type="button" onClick={() => copy(sender.id, 'Key ID copied')}>Copy key ID</button>
    </details>
    {copied && <p role="status">{copied}</p>}
  </section>;
}
