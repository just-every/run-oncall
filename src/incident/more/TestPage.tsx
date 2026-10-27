import {useState} from 'react';
import {InterruptedTransport, request} from '../../useWorkspace';
import {failureMessage} from '../../app/FailureLine';
import type {IncidentProps} from '../types';

export function TestPage({incident, refresh}: IncidentProps) {
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sent, setSent] = useState(false);
  const [retry, setRetry] = useState<'send' | 'refresh' | null>(null);
  async function send(refreshOnly = false) {
    setBusy(true); setAnswer(''); setRetry(null);
    let accepted = refreshOnly;
    try {
      if (!refreshOnly) {
        await request('/api/paging/jobs', {incident: incident.id});
        accepted = true;
        setSent(true);
      }
      // refresh shares an in-flight poll. Let that settle, then start a read
      // that is guaranteed to follow the accepted page job.
      await refresh();
      await refresh();
      setAnswer('Test page sent');
    } catch (cause) {
      setAnswer((accepted ? 'Test page sent. ' : '') + failureMessage(cause, accepted));
      if (cause instanceof InterruptedTransport) setRetry(accepted ? 'refresh' : 'send');
    } finally {setBusy(false);}
  }
  return <><p>Send a test page in this demo.</p>
    {!sent && !retry && <button disabled={busy} onClick={() => void send()}>Send test page</button>}
    <p role="status">{answer}</p>
    {retry && <button disabled={busy} onClick={() => void send(retry === 'refresh')}>{retry === 'refresh' ? 'Refresh incident' : 'Try again'}</button>}
  </>;
}
