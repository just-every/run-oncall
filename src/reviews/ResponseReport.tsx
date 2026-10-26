import { useEffect, useRef, useState } from 'react';
import type { State } from '../family/response-operations/domain';
import type { ProjectedReport as Report } from './load';
import { CoverageLoad } from './CoverageLoad';
import { AlertNoise } from './AlertNoise';
import { Field, Form } from '../forms';
import {FailureLine, useActionFailure} from '../app/FailureLine';
import { request } from '../useWorkspace';
import { duration, DurationSource, utc } from './display';
import './reviews.css';

const metrics = [['mtta', 'Acknowledgement'], ['mttr', 'Resolution'], ['recovery', 'Human recovery attestation'], ['sourceRecovery', 'Source-reported recovery']] as const;
type Filters = {from: string; to: string; service: string};
function parameters(filters: Filters) {
  const params = new URLSearchParams(filters);
  if (!filters.service) params.delete('service');
  return params;
}
export function ResponseReport({state}: {state: State}) {
  const failures=useActionFailure();
  const [initial] = useState<Filters>(() => {
    const now = Date.now();
    return {from: new Date(now - 30 * 86400000).toISOString(), to: new Date(now).toISOString(), service: ''};
  });
  const [applied, setApplied] = useState(initial), [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false), [exporting,setExporting]=useState(false);
  const sequence = useRef(0);
  async function load(filters: Filters, background = false) {
    const current = ++sequence.current;
    if (!background) setLoading(true); failures.clear();
    try {
      const result: Report = await request('/api/reports/response?' + parameters(filters));
      if (current === sequence.current) { setReport(result); setApplied(filters); }
    } catch (e) { if (current === sequence.current) failures.show(e,{read:true,target:null,retry:()=>load(filters, Boolean(report))}); }
    finally { if (current === sequence.current) setLoading(false); }
  }
  useEffect(() => { void load(initial); return () => { sequence.current++; }; }, [initial]);
  useEffect(() => {if (report) void load(applied, true);}, [state]);
  const csv = report ? new URLSearchParams({from: report.cohort.from, to: report.cohort.to,
    ...(report.cohort.service ? {service: report.cohort.service} : {}), at: report.generatedAt, revision:String(report.revision), schedulingRevision:String(report.load.schedulingRevision)}) : null;
  return <section className="panel padded response-report" aria-busy={loading}>
    <div className="review-heading"><h2>Response report</h2>
</div>
    <p>Declaration cohort over the last 30 days by default. Apply an exact UTC range to compare retained response records.</p>
    <Form busy={loading} label="Apply report filters" onSubmit={async data => {
      await load({from: data.from, to: data.to, service: data.service});
    }}>
      <div className="review-filter-grid">
        <Field name="from" label="From · inclusive UTC timestamp" value={initial.from} help="ISO timestamp with Z, for example 2026-10-01T00:00:00.000Z." />
        <Field name="to" label="To · exclusive UTC timestamp" value={initial.to} help="The end is excluded. Positive range, at most 366 days." />
        <Field name="service" label="Service" required={false} value="">
          <option value="">All services</option>{state.services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
        </Field>
      </div>
    </Form>
    <FailureLine failure={failures.failure} />
    {!report && loading && <p role="status">Loading response records…</p>}
    {report && <>
      <div className="review-snapshot">
        <p><strong>{report.cohort.count} incidents</strong> · {report.cohort.service ? state.services.find(s => s.id === report.cohort.service)?.name ?? report.cohort.service : 'All services'}</p>
        <p>Declarations from <time>{utc(report.cohort.from)}</time> inclusive to <time>{utc(report.cohort.to)}</time> exclusive.</p>
        <p>Observed through <time>{utc(report.generatedAt)}</time> · workspace revision {report.revision}.</p>
        <p>Unassignable declaration timestamps: {report.cohort.unassignableDeclarations} · erased declaration cases, durations unknown: {report.cohort.erased}.</p>
        <button type="button" disabled={loading||exporting} onClick={async()=>{
          setExporting(true);
          try{
            const response=await fetch('/api/reports/response.csv?'+csv);
            if(!response.ok){const value=await response.json() as {error?:string};throw Error(value.error??'CSV export failed');}
            const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download='oncall-response.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
          }catch(error){failures.show(error,{read:true,target:null})}finally{setExporting(false)}
        }}>{exporting?'Preparing CSV…':'Export this cohort and observation time as CSV ↓'}</button>
      </div>
      <p className="muted">Statistics use measured durations only. Censored durations are lower bounds; unknown durations are unavailable. This report does not measure real page delivery; load below is normalised by scheduled, not worked, hours.</p>
      <div className="response-metrics">
        {metrics.map(([key, label]) => {
          const aggregate = report.aggregates[key];
          return <article className="response-metric" key={key}><h3>{label}</h3>
            <dl className="review-stat-grid">{(['mean', 'p50', 'p90', 'p95'] as const).map(stat => <div key={stat}><dt>{stat === 'mean' ? 'Mean' : stat}</dt><dd>{duration(aggregate[stat])}</dd></div>)}</dl>
            <p className="review-meta">Total {aggregate.total} · measured {aggregate.measured} · censored {aggregate.censored} · unknown {aggregate.unknown}</p>
            <details><summary>Measured duration distribution</summary>
              <ul className="response-distribution">{aggregate.histogram.map(bucket => <li key={bucket.fromSeconds}>
                <span>{duration(bucket.fromSeconds)} to {bucket.toSeconds === null ? '∞' : duration(bucket.toSeconds)} (end excluded)</span>
                <span className="response-track"><span style={{width: `${aggregate.measured ? bucket.count / aggregate.measured * 100 : 0}%`}} /></span><strong>{bucket.count}</strong>
              </li>)}</ul>
            </details>
          </article>;
        })}
      </div>
      <AlertNoise noise={report.noise} />
      <CoverageLoad load={report.load} />
      <details className="review-material"><summary>Definitions, source representation and limits</summary>
        <p>{report.cohort.inclusion}</p>
        <dl>{Object.entries(report.definitions).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
        <h3>Unavailable evidence and limits</h3><ul>{report.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>
      </details>
      <details className="review-material"><summary>Incident durations and source entries ({report.incidents.length})</summary>
        {!report.incidents.length && <p>No retained incidents declared in this cohort.</p>}
        {report.incidents.map(row => <article className="review-record" key={row.id}>
          <h3>{row.href ? <a href={row.href}>{row.title}</a> : row.title} <span className="tag">{row.state}</span></h3>
          <p className="review-meta">{row.id} · {row.serviceName ?? row.service} · {row.severity} · incident revision {row.incidentRevision ?? 'unknown'}<br />Declared {row.declaredAt} UTC</p>
          <div className="response-metrics">{metrics.map(([key, label]) => <section key={key}><h4>{label}</h4><DurationSource value={row[key]} /></section>)}</div>
        </article>)}
      </details>
    </>}
  </section>;
}
