import {FailureLine,useActionFailure} from './FailureLine';
import { Tooltip } from './Tooltip';
import { useEffect, useState, type ReactNode } from 'react';
import { request } from '../useWorkspace';
import type { Incident, Member, State } from '../family/response-operations/domain';
import { queryFields, type SavedView, type TriageQuery } from '../family/response-operations/triage';
import { incidentAssignee, incidentUrgency } from '../family/response-operations/incident-controls';
import { TriageFilters } from './TriageFilters';
import { IncidentBulkActions } from './IncidentBulkActions';
import './triage.css';

const readQuery = (): TriageQuery => typeof location === 'undefined' ? {} : Object.fromEntries(queryFields.flatMap(key => new URLSearchParams(location.search).has('triage_' + key) ? [[key, new URLSearchParams(location.search).get('triage_' + key)!]] : []));
export function IncidentTriage({state, actor, current, select, children, busy, run, onUpdated}: {onUpdated?: (revision:number)=>void; state: State; actor: Member; current?: string; select: (id: string) => void; children: ReactNode; busy: boolean; run: (path: string | (() => Promise<any>), data?: any, message?: any) => Promise<any>}) {
  const failures=useActionFailure();
  const [query, setQuery] = useState<TriageQuery>(readQuery);
  const [page, setPage] = useState<{items: (Incident&{kind?:'incident'|'alert'})[]; total: number; nextCursor: string | null; workspaceRevision: number} | null>(null);
  const [views, setViews] = useState<SavedView[]>([]);
  const [selection, setSelection] = useState<{id: string; revision: number;kind?:string}[]>([]);
  const [allMatching, setAllMatching] = useState(false);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewName, setViewName] = useState('');
  // A workspace save completes before its separate triage read. Keep the old
  // rows visible, but do not let a new selection capture their stale revisions.
  const refreshing = loading || (page?.workspaceRevision ?? -1) < state.revision;
  const params = new URLSearchParams(Object.fromEntries(Object.entries(query).filter(([, value]) => value))).toString();
  function applyQuery(next: TriageQuery) {
    const url = new URL(location.href);
    for (const key of queryFields) { url.searchParams.delete('triage_' + key); if (next[key]) url.searchParams.set('triage_' + key, next[key]!); }
    history.pushState(null, '', url);
    setQuery(next); setSelection([]); setAllMatching(false);
  }
  useEffect(() => { const pop = () => {setQuery(readQuery()); setSelection([]); setAllMatching(false);}; window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop); }, []);
  useEffect(() => {
    let live = true; failures.clear(); setLoading(true);
    request('/api/triage?' + params).then(v => {if (live) {setPage(v);onUpdated?.(v.workspaceRevision);}}).catch(e => {if (live) {failures.show(e,{read:true,target:null});onUpdated?.(state.revision);}}).finally(() => {if (live) setLoading(false);});
    request('/api/triage/views').then(v => {if (live) setViews(v.views);}).catch(e => {if (live) failures.show(e,{read:true,target:null});});
    return () => {live = false;};
  }, [params, state.revision]);
  async function selectMatching() {
    failures.clear(); setLoading(true);
    try {
      let next = await request('/api/triage?' + params + '&limit=100');
      if (next.total > 1000) throw Error('Narrow the filters to at most 1,000 incidents');
      const items: (Incident&{kind?:'incident'|'alert'})[] = [...next.items], revision = next.workspaceRevision;
      while (next.nextCursor) { next = await request('/api/triage?' + params + '&limit=100&cursor=' + encodeURIComponent(next.nextCursor)); items.push(...next.items); }
      setSelection(items.map(i => ({id: i.id, revision: i.revision,kind:i.kind}))); setSelectionRevision(revision); setAllMatching(true);
    } catch (e) {failures.show(e,{read:true,target:null});} finally {setLoading(false);}
  }
  return <section className="panel incidents" aria-label="Incident triage">
    {children}
    <TriageFilters query={query} services={state.services} members={state.members} change={(key, value) => applyQuery({...query, [key]: value || undefined})} />
    <details className="saved-views"><summary>Saved views</summary>
      {views.map(v => <div className="saved-view" key={v.id}><button onClick={() => applyQuery(v.query)}>{v.name}</button><Tooltip label={`Delete view ${v.name}`}><button aria-label={`Delete view ${v.name}`} disabled={busy} onClick={async () => {const result = await run('/api/triage/views', {remove: v.id}); if (result) setViews(result.views);}}>×</button></Tooltip></div>)}
      {!views.length && <p>No saved views yet.</p>}
      <form onSubmit={async e => {e.preventDefault(); const result = await run('/api/triage/views', {name: viewName, query}, 'View saved'); if (result) {setViews(result.views); setViewName('');}}}><label>View name<input value={viewName} required maxLength={100} onChange={e => setViewName(e.target.value)} /></label><button disabled={busy}>Save current view</button></form>
    </details>
    <div className="triage-count" role="status">{loading ? 'Loading incidents…' : `${page?.total ?? 0} matching ${query.kind==='alerts'?'alert-only items':'incidents'}`}</div>
    <FailureLine failure={failures.failure} />
    {actor.role !== 'viewer' && !!page?.total && <div className="triage-selection"><button disabled={refreshing || busy} onClick={() => {setSelection(page.items.slice(0, 500).map(i => ({id: i.id, revision: i.revision,kind:i.kind}))); setAllMatching(false);}}>Select this page</button>{page.total <= 1000 && <button disabled={refreshing || busy} onClick={selectMatching}>Select all {page.total} matching</button>}</div>}
    {(state.triage??[]).some(row=>row.kind==='bulk'&&row.workflow&&row.actor===actor.id)&&<details className="triage-bulk"><summary>Recorded coordination workflows</summary><p>Explicitly resume up to two ordered coordination steps. No timer or sender runs. Completed and refused steps are retained and never repeated.</p><ul tabIndex={0} aria-label="Recorded workflow progress">{(state.triage??[]).filter(row=>row.kind==='bulk'&&row.workflow&&row.actor===actor.id).map(row=>row.kind==='bulk'&&row.workflow&&<li key={row.id}><strong>{row.results.length===(row.workflow.items.length*(row.rule?3:row.workflow.action==='orchestrate'?2:1))?'Complete':'Pending'} · {row.workflow.action==='orchestrate'?'recorded declaration and notification':'recorded reassignment'}</strong><p>{row.results.length} of {(row.workflow.items.length*(row.rule?3:row.workflow.action==='orchestrate'?2:1))} processed · {row.results.filter(result=>!result.ok).length} refused</p><p style={{overflowWrap:'anywhere'}}>Operation {row.id}</p>{row.rule&&<p>Rule v{row.rule.policyVersion} · approved workflow v{row.rule.workflowVersion} · {row.rule.state==='running'?'Execution uncertain until its lease is cleared':row.rule.state} · non-automatic · paging OFF</p>}{row.rule?.state==='running'&&<button disabled={busy} onClick={()=>run('/api/triage/workflows/'+encodeURIComponent(row.id)+'/clear-expired',{approve:true,revision:row.rule!.revision},'Expired workflow lease cleared; explicit resume required')}>Clear expired workflow</button>}{row.results.filter(result=>!result.ok).map(result=><p key={result.id}>{result.error}</p>)}{row.results.length<(row.workflow.items.length*(row.rule?3:row.workflow.action==='orchestrate'?2:1))&&<button disabled={busy||actor.role==='viewer'} onClick={()=>run('/api/triage/workflows/'+encodeURIComponent(row.id)+'/resume',{approve:true,...(row.rule?{revision:row.rule.revision}:{})},'Recorded workflow advanced; inspect retained outcomes')}>{row.workflow.action==='orchestrate'?'Resume recorded workflow':'Resume recorded reassignment'}</button>}</li>)}</ul></details>}
    {selection.length > 0 && <IncidentBulkActions items={selection} allMatching={allMatching} count={selection.length} query={query} workspaceRevision={selectionRevision} members={state.members} incidents={state.incidents.filter(i=>!i.mergedInto&&i.state!=='resolved')} busy={busy || refreshing} canEdit={actor.role !== "viewer"} run={run} clear={() => {setSelection([]); setAllMatching(false);}} />}
    {page?.items.map(i => <div className="triage-item" key={i.id}>
      {actor.role !== 'viewer' && <label className="triage-check"><input type="checkbox" aria-label={`Select ${i.title}`} checked={selection.some(s => s.id === i.id)} disabled={busy || refreshing || selection.length >= 500 && !selection.some(s => s.id === i.id)} onChange={e => {setAllMatching(false); setSelection(old => e.target.checked ? [...old, {id: i.id, revision: i.revision,kind:i.kind}].slice(0, 500) : old.filter(s => s.id !== i.id));}} /></label>}
      <button className={`incident ${current === i.id ? 'current' : ''}`} onClick={() => {if(i.kind==='alert')document.querySelector<HTMLAnchorElement>('a.nav[href="/alerts"]')?.click();else select(i.id);}}>
        <div className="incident-top"><span className={`dot ${i.state === 'resolved' ? 'green' : 'red'}`} /><span>{i.id.slice(0, 8)}</span><span className={`priority ${i.state === 'resolved' ? 'state-resolved' : `sev-${i.severity}`}`}>{i.severity}{i.state === 'resolved' && ' · resolved'}</span></div>
        <h3>{i.kind==='alert'&&'Alert-only: '}{i.title}</h3><p className="service">{state.services.find(v => v.id === i.service)?.name} · {i.state}</p>
        <time>{new Date(i.createdAt).toLocaleString()}</time><div className="tags"><span className="tag">{incidentUrgency(i)} urgency</span>{i.priority && <span className="tag">{i.priority}</span>}<span className="tag">{state.members.find(m => m.id === incidentAssignee(i))?.name ?? 'Unassigned'}</span><span className="tag">{i.actions.filter(a => !a.done).length} open follow-ups</span></div>
      </button>
    </div>)}
    {page?.total === 0 && state.incidents.length > 0 && <p>No incidents match these filters.</p>}
    {page?.nextCursor && <button disabled={loading} onClick={async () => {setLoading(true);try {const next = await request('/api/triage?' + params + '&cursor=' + encodeURIComponent(page.nextCursor!)); setPage({...next, items: [...page.items, ...next.items]});} catch (e) {failures.show(e,{read:true,target:null});} finally {setLoading(false);}}}>Load more incidents</button>}
  </section>;
}
