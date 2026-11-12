import {useEffect, useRef, useState} from 'react';
import {HttpFailure, InterruptedTransport, request} from '../../useWorkspace';
import type {HandoffEligibility, HandoffPayload, HandoffRecord, HandoffSource} from '../../family/response-operations/handoffs';
import type {IncidentProps} from '../types';
import './handoff.css';

type Context = {incidentRevision: number; serviceHash: string; source: HandoffSource; unavailable?: boolean};
type View = {record: HandoffRecord; eligibility: HandoffEligibility; context: Context | null};
type Pending = {path: string; data: unknown; message: string};

export function Handoff({incident, state, actor}: IncidentProps) {
  const permitted = actor.active && ['admin', 'responder', 'viewer'].includes(actor.role);
  const canAct = actor.active && ['admin', 'responder'].includes(actor.role);
  const [records, setRecords] = useState<HandoffRecord[]>([]);
  const [view, setView] = useState<View | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [ready, setReady] = useState(false);
  const [readingError, setReadingError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copy, setCopy] = useState<HandoffPayload>({audience: 'internal', title: incident.title.slice(0, 200),
    summary: (incident.timeline[0]?.text ?? '').slice(0, 3000), evidenceLinks: incident.recovery ? [incident.recovery] : [], impactLinks: []});
  const selected = useRef<string | null>(null);
  const pending = useRef<Pending | null>(null);
  const [retry, setRetry] = useState(false);
  const reading = useRef(0);

  const apply = (value: View) => {
    selected.current = value.record.id;
    setView(value); setContext(value.context);
    setRecords(previous => [...previous.filter(record => record.id !== value.record.id), value.record]);
  };
  const load = async (id = selected.current) => {
    const generation = ++reading.current;
    try {
      const list = await request('/api/handoffs');
      const matching: HandoffRecord[] = list.records.filter((record: HandoffRecord) => record.source.incident.id === incident.id);
      const record = matching.find(record => record.id === id) ?? matching.at(-1);
      const value: View | null = record ? await request('/api/handoffs/' + encodeURIComponent(record.id)) : null;
      if (generation !== reading.current) return;
      setRecords(matching); setView(value); selected.current = value?.record.id ?? null;
      setContext(value?.context ?? list.contexts.find((item: any) => item.incident === incident.id && !item.unavailable) ?? null);
      setReadingError(''); setReady(true);
    } catch (failure) {
      if (generation !== reading.current) return;
      setReadingError(failure instanceof HttpFailure && [401, 403].includes(failure.status)
        ? 'Your current role or session does not permit access to this handoff.'
        : 'The handoff could not be read. Try again.');
    }
  };
  const service = state.services.find(service => service.id === incident.service);
  useEffect(() => {
    if (permitted) void load();
    return () => {reading.current++;};
  }, [incident.id, incident.revision, service, actor.role, actor.active]);

  async function perform(operation: Pending) {
    if (busy) return;
    setBusy(true); setError(''); setNotice(''); setRetry(false); pending.current = operation;
    // A read begun before this action must not replace its result.
    reading.current++;
    try {
      apply(await request(operation.path, operation.data));
      setEditing(false); setNotice(operation.message); pending.current = null;
    } catch (failure) {
      const conflict = failure instanceof HttpFailure && failure.status === 409;
      setError(conflict ? 'The source or handoff changed. Inspect the current copy before continuing.'
        : failure instanceof HttpFailure && [401, 403].includes(failure.status)
          ? 'Your current role or session does not permit this handoff action.'
          : failure instanceof InterruptedTransport ? 'Connection interrupted. The action is not confirmed. Retry to check the same action.'
            : failure instanceof Error ? failure.message : 'The handoff action could not be completed.');
      setRetry(failure instanceof InterruptedTransport || failure instanceof HttpFailure && failure.status >= 500);
      if (conflict) await load();
    } finally {setBusy(false);}
  }

  async function download() {
    if (!view || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const packet = await request('/api/handoffs/' + encodeURIComponent(view.record.id) + '/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(packet, null, 2) + '\n'], {type: 'application/json'}));
      const link = document.createElement('a'); link.href = url; link.download = 'oncall-reviewed-handoff.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Exported the exact reviewed copy as JSON. Nothing was sent.');
    } catch (failure) {
      setError(failure instanceof HttpFailure && failure.status === 409
        ? 'This reviewed copy is no longer eligible for export. Inspect the current source and prepare it again.'
        : failure instanceof HttpFailure && [401, 403].includes(failure.status)
          ? 'Your current role or session does not permit this handoff export.' : 'Export could not be completed. Try again.');
      await load();
    } finally {setBusy(false);}
  }

  if (!permitted) return <p role="alert">Your current role does not permit access to incident handoffs.</p>;
  if (readingError) return <p role="alert">{readingError} <button type="button" onClick={() => void load()}>Retry</button></p>;
  if (!ready) return <p role="status">Opening handoff…</p>;
  const record = view?.record;
  const diagnostics = view?.eligibility.diagnostics ?? [];
  const stale = diagnostics.some(value => !['unreviewed', 'recovery-held', 'withdrawn'].includes(value));
  const approval = record?.history.slice().reverse().find(entry => entry.type === 'reviewed');
  const prepareAgain = () => {
    if (record) setCopy(structuredClone(record.payload));
    setEditing(true); setError(''); setNotice(''); setRetry(false); pending.current = null;
  };
  return <section className="handoff-panel" aria-label="Unsent handoff" aria-busy={busy}>
    <p className="handoff-boundary"><strong>Not sent.</strong> Preparing, reviewing and exporting keep this copy inside your workspace or download. Nothing is sent to your pager, chat, Lamp or Statuspage.</p>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error} {retry && <button type="button" disabled={busy} onClick={() => pending.current && void perform(pending.current)}>Retry action</button>}</p>}
    {records.length > 0 && <label className="field"><span>Saved handoff</span><select aria-label="Saved handoff" disabled={busy || editing} value={record?.id ?? ''} onChange={event => {setError(''); setNotice(''); setRetry(false); void load(event.target.value);}}>
      {records.map(item => <option key={item.id} value={item.id}>{item.payload.title} · {item.payload.audience} · {new Date(item.history[0].at).toLocaleString()}</option>)}
    </select></label>}
    {!canAct && <p>Viewer access: inspect saved handoffs. A current responder or administrator prepares, reviews and exports them.</p>}
    {record && <article className="handoff-copy" aria-label="Saved handoff copy">
      <p className="handoff-state">{record.status === 'reviewed' ? 'Reviewed copy' : record.status === 'withdrawn' ? 'Withdrawn copy' : 'Prepared copy'} · {record.payload.audience === 'customer' ? 'Customer audience' : 'Internal audience'} · Internal visibility</p>
      <h3>{record.payload.title}</h3><p className="handoff-summary">{record.payload.summary}</p>
      {([['Evidence', record.payload.evidenceLinks], ['Impact', record.payload.impactLinks]] as const).map(([label, links]) => links.length > 0 && <div key={label}><h4>{label}</h4><ul>{links.map((link, index) => <li key={index}><a href={link} target="_blank" rel="noreferrer">{link}</a></li>)}</ul></div>)}
      <p>Prepared by {record.history[0].actor?.name} · <time dateTime={new Date(record.history[0].at).toISOString()}>{new Date(record.history[0].at).toLocaleString()}</time></p>
      {approval && <p>Reviewed by {approval.actor?.name} · <time dateTime={new Date(approval.at).toISOString()}>{new Date(approval.at).toLocaleString()}</time>{approval.selfReview && ' · Author reviewed their own copy'}</p>}
      {stale && <p role="status">Out of date: the incident or service changed. Prepare again from the current source before review or export.</p>}
      {record.held && <p role="status">Review held after restore. A current responder or administrator must review this copy again.</p>}
      {record.status === 'withdrawn' && <p>This copy was withdrawn and cannot be reviewed or exported.</p>}
      {canAct && !editing && <div className="handoff-actions">
        {!stale && record.status !== 'withdrawn' && (!approval || record.held) && <button type="button" disabled={busy || retry} onClick={() => void perform({path: '/api/handoffs/' + encodeURIComponent(record.id) + '/review', data: {actionId: crypto.randomUUID(), revision: record.revision, payloadHash: record.payloadHash, sourceHash: record.sourceHash, reason: ''}, message: 'Reviewed this exact copy. Nothing was sent.'})}>Review exact copy</button>}
        {view?.eligibility.eligible && <button type="button" disabled={busy} onClick={() => void download()}>Export reviewed copy</button>}
        <button type="button" disabled={busy || retry || !context} onClick={prepareAgain}>Prepare again</button>
      </div>}
    </article>}
    {canAct && (!record || editing) && context && <form className="handoff-form" onSubmit={event => {
      event.preventDefault();
      void perform({path: '/api/handoffs/prepare', data: {id: crypto.randomUUID(), incident: incident.id, incidentRevision: context.incidentRevision, serviceHash: context.serviceHash,
        payload: {...copy, title: copy.title.trim(), summary: copy.summary.trim()}, ...(record ? {supersedes: record.id} : {})}, message: 'Prepared an unsent copy. Inspect it, then review the exact copy.'});
    }}>
      <h3>{record ? 'Prepare a new copy' : 'Prepare handoff copy'}</h3>
      <p>Based on {context.source.incident.title} · {context.source.service.name}. Choose who this copy is intended for; it remains internal and unsent.</p>
      <label className="field"><span>Intended audience</span><select aria-label="Intended audience" disabled={busy} value={copy.audience} onChange={event => setCopy({...copy, audience: event.target.value as HandoffPayload['audience']})}><option value="internal">Internal</option><option value="customer">Customer</option></select></label>
      <label className="field"><span>Title</span><input aria-label="Title" required maxLength={200} disabled={busy} value={copy.title} onChange={event => setCopy({...copy, title: event.target.value})} /></label>
      <label className="field"><span>Summary</span><textarea aria-label="Summary" required maxLength={3000} rows={5} disabled={busy} value={copy.summary} onChange={event => setCopy({...copy, summary: event.target.value})} /></label>
      <div className="handoff-actions"><button disabled={busy || retry || !copy.title.trim() || !copy.summary.trim()}>Prepare copy</button>{record && <button type="button" disabled={busy} onClick={() => {setEditing(false); setError(''); setRetry(false);}}>Cancel</button>}</div>
    </form>}
    {!record && !canAct && <p>No handoff has been prepared for this incident.</p>}
    {!context && canAct && <p>The current incident source is unavailable. A new copy cannot be prepared.</p>}
  </section>;
}
