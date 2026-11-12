import { useEffect, useState } from 'react';
import { RequestExample } from '../integrations/RequestExample';
import { providerSample } from '../integrations/SourceTest';
import type { IntegrationKind, SourceRecord } from '../integrations/catalog';
import type { Service } from '../family/response-operations/domain';

export type RoutedSender = { id: string; name: string; provider: string; authentication?: string; service: Service };
const ingressPath = (provider: string, id: string) => provider === 'native' ? '/api/ingress/' + encodeURIComponent('intake:' + id) : null;

/** Everything a sender needs to start using a routed key, except its private key. */
export function RoutedSenderSetup({ sender, defaultOpen = false }: { sender: RoutedSender; defaultOpen?: boolean }) {
  const [origin, setOrigin] = useState(''), [copied, setCopied] = useState('');
  useEffect(() => { setOrigin(location.origin); }, []);
  const copy = async (text: string, done: string) => { try { await navigator.clipboard.writeText(text); setCopied(done); } catch { setCopied('Select the text above and copy it.'); } };
  const record: SourceRecord = { id: 'intake:' + sender.id, name: sender.name, kind: sender.provider as IntegrationKind, service: sender.service.id, active: true };
  const [providerRequest] = useState(() => sender.provider === 'native' ? '' : providerSample(record, sender.service));
  const sample = providerRequest.replace(/^POST (\S+)/, (_, path) => 'POST ' + origin + path);
  return <section className="routed-sender" aria-label="Sender setup for this key"><h3>Sender setup</h3>
    <label className="field">Key ID<input readOnly value={sender.id} onFocus={e => e.currentTarget.select()} /></label>
    <button type="button" onClick={() => copy(sender.id, 'Key ID copied')}>Copy key ID</button>
    {ingressPath(sender.provider, sender.id)
      ? <RequestExample source={'intake:' + sender.id} service={sender.service} mode={sender.authentication || 'bearer'} defaultOpen={defaultOpen} routed />
      : <details open={defaultOpen}><summary>Sample request</summary>
        <p>Keep the private key in your sender’s settings, in place of <code>YOUR_PRIVATE_KEY</code>. The key ID names this key in Oncall; the provider’s own path carries the credential.</p>
        <label className="field">Sample request<textarea aria-label="Sample request" readOnly rows={12} spellCheck={false} value={sample} /></label>
        <button type="button" disabled={!origin} onClick={() => copy(sample, 'Copied')}>Copy sample request</button></details>}
    {copied && <p role="status">{copied}</p>}
  </section>;
}
