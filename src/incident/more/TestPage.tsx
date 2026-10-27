import {useState} from 'react';
import {request} from '../../useWorkspace';
import type {IncidentProps} from '../types';

export function TestPage({incident}: IncidentProps) {
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  return <><p>Send a test page in this demo.</p><button disabled={busy} onClick={async () => {
    setBusy(true);setAnswer('');
    try {await request('/api/paging/jobs', {incident: incident.id}); setAnswer('Test page sent');} catch {setAnswer('The test page could not be sent. Try again.');} finally {setBusy(false);}
  }}>Send test page</button><p role="status">{answer}</p></>;
}
