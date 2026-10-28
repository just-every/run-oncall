import {useViewAnchor} from '../app/useViewAnchor';
import { useEffect, useRef, useState } from 'react';
import type { State } from '../family/response-operations/domain';
import type { ProjectedReport as Report } from './load';
import { CoverageLoad } from './CoverageLoad';
import { AlertNoise } from './AlertNoise';
import {browserZone,periodBounds,shortTime} from './time';
import {FailureLine, useActionFailure} from '../app/FailureLine';
import { request } from '../useWorkspace';
import { duration, DurationSource, incidentStateLabel, severityLabel } from './display';
import './reviews.css';

const metrics = [['mtta', 'Acknowledgement'], ['mttr', 'Resolution'], ['recovery', 'Human recovery attestation'], ['sourceRecovery', 'Source-reported recovery']] as const;
type Filters = {from: string; to: string; service: string};
function parameters(filters: Filters) {
  const params = new URLSearchParams(filters);
  if (!filters.service) params.delete('service');
  return params;
}
export function ResponseReport({state}: {state: State}) {
  const preserveView=useViewAnchor();
  const failures=useActionFailure();
  const [zone,setZone]=useState(browserZone),[period,setPeriod]=useState('30'),[service,setService]=useState('');
  const [from,setFrom]=useState(()=>new Date(Date.now()-7*86400000).toISOString().slice(0,10)),[to,setTo]=useState(()=>new Date().toISOString().slice(0,10));
  const [initial]=useState<Filters>(()=>({...periodBounds('30',browserZone(),'',''),service:''}));
  const [applied,setApplied]=useState(initial),[report,setReport]=useState<Report|null>(null);
  const [loading, setLoading] = useState(false), [exporting,setExporting]=useState(false);
  const sequence = useRef(0);
  async function load(filters: Filters, background = false) {
    const current = ++sequence.current;
    if (!background) setLoading(true); failures.clear();
    try {
      const result: Report = await request('/api/reports/response?' + parameters(filters));
      if (current === sequence.current) { preserveView(); setReport(result); setApplied(filters); }
    } catch (e) { if (current === sequence.current) failures.show(e,{read:true,target:null,retry:()=>load(filters, Boolean(report))}); }
    finally { if (current === sequence.current) setLoading(false); }
  }
  useEffect(()=>{if(period==='custom'&&(!from||!to||to<=from))return;void load({...periodBounds(period,zone,from,to),service});return()=>{sequence.current++;};},[period,zone,from,to,service]);
  useEffect(() => {if (report) void load(applied, true);}, [state]);
  const csv = report ? new URLSearchParams({from: report.cohort.from, to: report.cohort.to,
    ...(report.cohort.service ? {service: report.cohort.service} : {}), at: report.generatedAt, revision:String(report.revision), schedulingRevision:String(report.load.schedulingRevision)}) : null;
  return <section className="panel padded response-report" aria-busy={loading}>
    <div className="review-filter-grid">
      <label className="field">Period<select aria-label="Period" value={period} onChange={e=>setPeriod(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="quarter">This quarter</option><option value="custom">Two dates</option></select></label>
      <label className="field">Service<select aria-label="Service" value={service} onChange={e=>setService(e.target.value)}><option value="">All services</option>{state.services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="field">Time zone<select aria-label="Time zone" value={zone} onChange={e=>setZone(e.target.value)}>{[...new Set([browserZone(),...Intl.supportedValuesOf('timeZone'),'UTC'])].map(zone=><option key={zone} value={zone}>{zone}</option>)}</select></label>
      {period==='custom'&&<><label className="field">From date<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="field">Until date (excluded)<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>{to<=from&&<p>Choose an end date after the start.</p>}</>}
    </div>
    <FailureLine failure={failures.failure} />
    {!report && loading && <p role="status">Loading response records…</p>}
    {report && <>
      <div className="review-snapshot">
        <p><strong>{report.cohort.count} incidents</strong> · {report.cohort.service ? state.services.find(s => s.id === report.cohort.service)?.name ?? report.cohort.service : 'All services'}</p>



        <button type="button" disabled={loading||exporting} onClick={async()=>{
          setExporting(true);
          try{
            const response=await fetch('/api/reports/response.csv?'+csv);
            if(!response.ok){const value=await response.json() as {error?:string};throw Error(value.error??'CSV export failed');}
            const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download='oncall-response.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
          }catch(error){failures.show(error,{read:true,target:null})}finally{setExporting(false)}
        }}>{exporting?'Preparing CSV…':'Export CSV'}</button>
      </div>

      <div className="response-metrics">
        {metrics.map(([key, label]) => {
          const aggregate = report.aggregates[key];
          return <article className="response-metric" key={key}><h3>{label}</h3>
            <dl className="review-stat-grid">{(['mean', 'p50', 'p90', 'p95'] as const).map(stat => <div key={stat}><dt>{stat === 'mean' ? 'Average' : stat}</dt><dd>{duration(aggregate[stat])}</dd></div>)}</dl>
            <p className="review-meta">Total {aggregate.total} · measured {aggregate.measured} · censored {aggregate.censored} · unknown {aggregate.unknown}</p>
            <details><summary>Distribution</summary>
              <ul className="response-distribution">{aggregate.histogram.map(bucket => <li key={bucket.fromSeconds}>
                <span>{duration(bucket.fromSeconds)} to {bucket.toSeconds === null ? '∞' : duration(bucket.toSeconds)} (end excluded)</span>
                <span className="response-track"><span style={{width: `${aggregate.measured ? bucket.count / aggregate.measured * 100 : 0}%`}} /></span><strong>{bucket.count}</strong>
              </li>)}</ul>
            </details>
          </article>;
        })}
      </div>
      <AlertNoise noise={report.noise} state={state} showDefinition={false}/>
      <CoverageLoad load={report.load} showBasis={false} zone={zone}/>
      <details className="review-material"><summary>How these are counted</summary>
        <p>Declarations from {shortTime(report.cohort.from,zone)} inclusive to {shortTime(report.cohort.to,zone)} exclusive · {zone}.</p><p>Exact UTC bounds: {new Date(report.cohort.from).toUTCString()} inclusive to {new Date(report.cohort.to).toUTCString()} exclusive.</p><p>Observed through {shortTime(report.generatedAt,zone)}. Unassignable declaration timestamps: {report.cohort.unassignableDeclarations}; erased cases with unknown durations: {report.cohort.erased}.</p><p>Censored cases are lower bounds and are excluded from measured averages and percentiles. Unknown durations have no measurable source.</p><p>{report.noise.definition}</p><p>{report.cohort.inclusion}</p><ul>{report.load.basis.map(line=><li key={line}>{line}</li>)}</ul>
        <dl>{Object.entries(report.definitions).map(([key, value]) => <div key={key}><dt>{metrics.find(([name]) => name === key)?.[1] ?? key}</dt><dd>{value}</dd></div>)}</dl>
        <h3>Unavailable evidence and limits</h3><ul>{report.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>
      </details>
      <details className="review-material"><summary>Incidents in this period ({report.incidents.length})</summary>
        {!report.incidents.length && <p>No retained incidents declared in this cohort.</p>}
        {report.incidents.map(row => <article className="review-record" key={row.id}>
          <h3>{row.href ? <a href={row.href}>{row.title}</a> : row.title} <span className="tag">{incidentStateLabel(row.state)}</span></h3>
          <p className="review-meta">{row.serviceName ?? 'Former service'} · {severityLabel(row.severity)}<br />Declared {row.declaredAt ? shortTime(row.declaredAt,zone) : 'Time unavailable'} · {row.incidentRevision === null ? 'Retained erased case; durations unknown' : ''}</p>
          <div className="response-metrics">{metrics.map(([key, label]) => <section key={key}><h4>{label}</h4><DurationSource value={row[key]} zone={zone}/></section>)}</div>
        </article>)}
      </details>
    </>}
  </section>;
}
