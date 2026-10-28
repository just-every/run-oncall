import {useEffect,useState} from 'react';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
import type {Readiness} from './types';
import './readiness.css';

const label=(value:string)=>value.replaceAll('-',' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,v=>v.toUpperCase());
const display=(value:string|number|boolean|null)=>value===null?'Unknown':typeof value==='boolean'?value?'Yes':'No':typeof value==='number'?value.toLocaleString():value;
export function ReadinessSection() {
 const {page}=useWorkspaceContext();
 return page==='readiness'?<ReadinessPage/>:null;
}
function ReadinessPage() {
 const [report,setReport]=useState<Readiness|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[version,setVersion]=useState(0);
 useEffect(()=>{
  const abort=new AbortController();setLoading(true);setReport(null);setError('');
  (async()=>{
   try {
    const response=await fetch('/api/readiness',{signal:abort.signal,headers:{accept:'application/json'}}),body=await response.json() as Readiness & {error?:string};
    if(!response.ok&&!(response.status===503&&Array.isArray(body.signals)&&Array.isArray(body.matrix)))throw Error(body.error??'Readiness could not be read');
    setReport(body);if(!body.complete)setError('Some durable sources are unavailable. Their results are unknown; the other observations remain visible.');
   } catch(error) {if(!abort.signal.aborted)setError((error as Error).message);}
   finally {if(!abort.signal.aborted)setLoading(false);}
  })();
  return ()=>abort.abort();
 },[version]);
 return <div className="readiness">
  <div className="readiness-intro"><p>Release evidence and current durable observations. Keep your existing pager authoritative.</p><button disabled={loading} onClick={()=>setVersion(v=>v+1)}>Refresh readiness</button></div>
  {loading&&<p role="status">Reading readiness…</p>}
  {error&&<p role="alert">{error}</p>}
  {report&&<>
   <section className="panel padded readiness-coverage" aria-labelledby="coverage-title" data-coverage={report.pagerCoverage.state}>
    <h2 id="coverage-title">Pager coverage: {report.pagerCoverage.state}</h2><p>{report.pagerCoverage.reason}</p>
   </section>
   <section aria-labelledby="matrix-title">
    <h2 id="matrix-title">Release readiness matrix</h2>
    <dl className="readiness-release"><div><dt>Release</dt><dd>{report.release.package} · {report.release.version}</dd></div><div><dt>Source SHA</dt><dd>{report.release.deployment.sourceSha??'Not bound in this deployment'}</dd></div><div><dt>Artifact fingerprint</dt><dd>{report.release.deployment.fingerprint??'Not bound in this deployment'}</dd></div><div><dt>Deployment version</dt><dd>{report.release.deployment.versionId??'Not bound in this deployment'}</dd></div><div><dt>Observed</dt><dd><time dateTime={report.observedAt}>{report.observedAt}</time></dd></div></dl>
    <p>Working here means maintained coordination behavior. Every live adapter and device still needs external acceptance.</p>
    <div className="panel readiness-matrix">{report.matrix.map(row=><article key={row.id} data-readiness-row={row.id}>
     <div><h3>{row.area}</h3><span className="readiness-state" data-state={row.state}>{label(row.state)}</span></div>
     <div><p>{row.limitation}</p>{row.observation&&(row.observation.state==='unavailable'?<p>Source observations unavailable</p>:<p>{row.observation.configured} configured · {row.observation.active} active with credentials<br/>Last accepted: {row.observation.lastAcceptedAt??'None retained'}</p>)}</div>
     <div className="readiness-evidence"><strong>{label(row.evidence.kind)}</strong>{row.evidence.reference&&<span>{row.evidence.reference}</span>}</div>
    </article>)}</div>
   </section>
   <section aria-labelledby="signals-title"><h2 id="signals-title">Independent health signals</h2><p>These observations share this installation’s storage. They are separate reads, not an independent external watch.</p>
    <div className="readiness-signals">{report.signals.map(signal=><article className="panel padded" key={signal.id} data-readiness-signal={signal.id}>
     <div className="readiness-signal-title"><h3>{signal.name}</h3><strong data-state={signal.state}>{label(signal.state)}</strong></div>
     <p>{signal.reason}</p><dl>{Object.entries(signal.values).map(([key,value])=><div key={key}><dt>{label(key)}</dt><dd>{display(value)}</dd></div>)}</dl>
     <p className="readiness-observed">Observed {signal.observedAt}<br/>Age of known relevant record: {signal.ageSeconds===null?'Unknown':signal.ageSeconds.toLocaleString()+' seconds'}</p>
    </article>)}</div>
   </section>
   <p><a href="/docs/readiness">Readiness and recovery procedures</a></p>
  </>}
 </div>;
}
