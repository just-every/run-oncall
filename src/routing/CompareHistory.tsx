import { useEffect, useRef, useState } from 'react';
import { compareRequest } from '../useWorkspace';
import {ReplayComparison} from '../app/ReplayComparison';
import { failureMessage } from '../app/FailureLine';
import type { State } from '../family/response-operations/domain';

export function CompareHistory({ state }: { state: State }) {
  const [open, setOpen] = useState(false), [result, setResult] = useState<any>(), [error, setError] = useState(''), [running, setRunning] = useState(false);
  const [pasted, setPasted] = useState(''), [events, setEvents] = useState(state.events);
  const opener = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  async function compare(input: State['events']) {
    setRunning(true); setError('');
    try { setResult(await compareRequest('/api/replay', { events: input })); setEvents(input); }
    catch (e) { setError(failureMessage(e, true)); }
    finally { setRunning(false); }
  }
  useEffect(() => { if (open) { void compare(state.events.slice(-100)); panel.current?.focus(); } }, [open]);
  function close() { setOpen(false); opener.current?.focus(); }
  return <section className="panel padded integrations history-comparison">
    <button type="button" ref={opener} onClick={() => setOpen(true)}>Compare with history</button>
    {open && <div className="history-sheet" role="dialog" aria-modal="true" aria-label="Compare with history" ref={panel} tabIndex={-1} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const nodes = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,summary,[href]')].filter(node => node.getClientRects().length);
        if (event.shiftKey && (document.activeElement === nodes[0] || document.activeElement === panel.current)) { event.preventDefault(); nodes.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
      }
    }}>
      <div className="integration-heading"><h2>Compare with history</h2><button type="button" onClick={close}>Close comparison</button></div>
      {running && <p role="status">Comparing retained events…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => compare(events)}>Retry</button></p>}
      {result && <ReplayComparison result={result} members={state.members} events={events}/>}
      <details><summary>Paste your own events</summary><label className="field">Event JSON<textarea rows={6} value={pasted} onChange={e => setPasted(e.target.value)} /></label><button type="button" disabled={running || !pasted.trim()} onClick={() => {
        try { const value = JSON.parse(pasted); if (!Array.isArray(value)) throw Error(); void compare(value); }
        catch { setError('Enter an array of events.'); }
      }}>Compare pasted events</button></details>
    </div>}
  </section>;
}
