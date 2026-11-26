import {useState, type ReactNode} from 'react';
import {request} from '../useWorkspace';
import {pagingStatus, type SmsPaging} from './words';

/** The rota's paging toggle. Paging is off until an admin switches it on here and the installation has a sender. */
export function PagingPanel({scheduleId, admin, sms, failed, reload, children}: {scheduleId: string; admin: boolean; sms: SmsPaging | null; failed: boolean; reload: () => Promise<void>; children: ReactNode}) {
  const [busy, setBusy] = useState(false), [line, setLine] = useState('');
  const on = !!sms && pagingStatus(sms, scheduleId) === 'on';
  const act = async (path: string, data: unknown, done: (value: any) => string) => {
    setBusy(true);setLine('');
    try {setLine(done(await request(path, data)));await reload();}
    catch (error: any) {setLine(error?.message ?? 'Not saved.');}
    finally {setBusy(false);}
  };
  return <details className="oc-card oc-paging"><summary>{on ? 'Paging is on: text message' : 'Paging is off'}</summary>
    <section className="scheduling-panel" aria-label="Text-message paging">
      {failed && <p>Paging status could not be read.</p>}
      {sms && !sms.configured && <p>This installation has no text-message sender, so paging cannot be switched on. Your pager stays in charge. See Paging in the docs.</p>}
      {sms?.configured && <>
        <label><input type="checkbox" checked={on} disabled={!admin || busy} onChange={event => void act('/api/paging/sms/schedules', {schedule: scheduleId, enabled: event.target.checked}, value => value.enabled ? 'Paging is on for this rota.' : 'Paging is off for this rota.')}/> Text the on-call person when a high-urgency alert reaches this rota, and the next person if nobody acknowledges</label>
        {!admin && <p className="oc-quiet">Only an administrator can change this.</p>}
        {admin && <p><button type="button" disabled={busy} onClick={() => void act('/api/paging/sms/test', {}, value => value.status === 'sent' ? `Test page sent to the number ending ${value.toHint}.` : `Test page failed: ${value.detail}.`)}>Send me a test page</button></p>}
      </>}
      {line && <p role="status">{line}</p>}
    </section>
    {children}
  </details>;
}
