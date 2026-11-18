import {useEffect,useState} from 'react';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
import type {Readiness} from './types';
import './readiness.css';
import {shortTime} from '../reviews/time';

const label=(value:string)=>value.replaceAll('-',' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,v=>v.toUpperCase());
const display=(value:string|number|boolean|null)=>value===null?'Unknown':typeof value==='boolean'?value?'Yes':'No':typeof value==='number'?value.toLocaleString():/^\d{4}-\d{2}-\d{2}T/.test(value)?shortTime(value):({ 'single-installation': 'One installation', 'not-provided': 'Not set', missing: 'Not set' }[value] ?? label(value));
// Field-proof ids are the contract's; people read what each real-world check covers.
const fieldProofNames:Record<string,string>={'R-1':'Hosted deployment check','R-2':'Inbound email check','R-5':'US voice and SMS registration','R-6':'Live handset delivery','R-7':'App store distribution','R-8':'Live phone drills','R-12':'Vendor tenant check'};
export function ReadinessSection() {
 const {page}=useWorkspaceContext();
 return page==='readiness'?<ReadinessPage/>:null;
}
function ReadinessPage() {
 const {w}=useWorkspaceContext();
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
 const onCall=w.onCall;
 const coveredRotas=onCall?.rotas.filter(rota=>rota.now.primary).length??0;
 const peopleStatus=!onCall?'Unknown':onCall.rotas.length>0&&coveredRotas===onCall.rotas.length&&!onCall.unrostered.length?'Yes':'No';
 const alertSources=report?.matrix.filter(row=>['events','email','pagerduty','opsgenie','splunk','alertmanager','grafana','datadog'].includes(row.id))??[];
 const lastAlertAt=alertSources.map(row=>row.observation?.lastAcceptedAt).filter((at):at is string=>!!at).sort().at(-1);
 const checks=[
  {name:'Alerts arrive',status:'Unknown',reason:lastAlertAt?'Last alert accepted '+shortTime(lastAlertAt)+'. Live sender health is not checked.':'No live sender check is available.'},
  {name:'People are on call',status:peopleStatus,reason:onCall?`${coveredRotas} of ${onCall.rotas.length} rotas have a primary responder; ${onCall.unrostered.length} services have no rota. Checked ${shortTime(onCall.at)}.`:'Current rota coverage could not be read.'},
  {name:'Your pager is connected',status:'Unknown',reason:'Your existing pager is not checked here. Oncall paging is off.'},
  {name:'Backup done',status:'Unknown',reason:'This report has no record of a completed backup.'},
  {name:'Online',status:'Unknown',reason:report?'This app answered at '+shortTime(report.observedAt)+'. No external availability check is connected.':'This app’s availability has not been checked.'},
 ];
 return <div className="readiness">
  <div className="readiness-intro"><p>Check your setup. Keep using your existing pager.</p><button disabled={loading} onClick={()=>setVersion(v=>v+1)}>Refresh readiness</button></div>
  <section aria-label="Setup checks" className="readiness-checks panel"><dl>{checks.map(check=><div key={check.name}><dt>{check.name}</dt><dd><strong data-check-state={check.status.toLowerCase()}>{check.status}</strong><p>{check.reason}</p></dd></div>)}</dl></section>
  {loading&&<p role="status">Reading readiness…</p>}
  {error&&<p role="alert">{error}</p>}
  {report&&<>
   <details className="readiness-details"><summary>Details</summary>
   <section className="panel padded readiness-coverage" aria-labelledby="coverage-title" data-coverage={report.pagerCoverage.state}>
    <h2 id="coverage-title">Pager coverage: {report.pagerCoverage.state}</h2><p>{report.pagerCoverage.reason}</p>
   </section>
   <section aria-labelledby="matrix-title">
    <h2 id="matrix-title">Release readiness matrix</h2>
    <dl className="readiness-release"><div><dt>Release</dt><dd>Oncall {report.release.version}</dd></div><div><dt>Source SHA</dt><dd>{report.release.deployment.sourceSha??'Not bound in this deployment'}</dd></div><div><dt>Artifact fingerprint</dt><dd>{report.release.deployment.fingerprint??'Not bound in this deployment'}</dd></div><div><dt>Deployment version</dt><dd>{report.release.deployment.versionId??'Not bound in this deployment'}</dd></div><div><dt>Observed</dt><dd><time dateTime={report.observedAt}>{shortTime(report.observedAt)}</time></dd></div></dl>
    <p>Working here means maintained coordination behavior. Every live adapter and device still needs external acceptance.</p>
    <div className="panel readiness-matrix">{report.matrix.map(row=><article key={row.id} data-readiness-row={row.id}>
     <div><h3>{row.area}</h3><span className="readiness-state" data-state={row.state}>{label(row.state)}</span></div>
     <div><p>{row.limitation}</p>{row.observation&&(row.observation.state==='unavailable'?<p>Source observations unavailable</p>:<p>{row.observation.configured} configured · {row.observation.active} active with credentials<br/>Last accepted: {row.observation.lastAcceptedAt?shortTime(row.observation.lastAcceptedAt):'None retained'}</p>)}</div>
     <div className="readiness-evidence"><strong>{({'maintained-journey':'Checked by release tests','dated-owner-evidence':'Dated owner evidence',none:'No evidence yet'} as Record<string,string>)[row.evidence.kind]}</strong></div>
    </article>)}</div>
   </section>
   <section aria-labelledby="installation-title" id="us-installation">
    <h2 id="installation-title">US installation and dependency checklist</h2>
    <p>Reviewed {report.installation.reviewedOn}. States come from this release matrix and the contract field proof register. Passed evidence is dated prior evidence, not completion for this installation. Reading this checklist grants no provider, deployment, publication or cutover authority.</p>
    <p>Account steps remain not done until independently verified. Keep your existing pager authoritative.</p>
    <div className="panel readiness-matrix">{report.installation.items.map(item=><article key={item.id} data-installation-item={item.id}>
     <div><h3>{item.name}</h3><span className="readiness-state" data-state={item.state}>{label(item.state)}</span><p>{item.completion==='not-done'?'Not done for this installation':'Guidance only'}</p></div>
     <div><p>{item.requirement}</p></div>
     <div className="readiness-evidence"><strong>Release evidence</strong>{item.matrix.map(row=><span key={row.id}>{report.matrix.find(item=>item.id===row.id)?.area}: {label(row.state)}</span>)}
      {item.fieldProof.length?item.fieldProof.map(row=><span key={row.id} data-field-proof={row.id}>{fieldProofNames[row.id]??'Field check'}: {row.state==='passed'?'Passed on '+row.date+' · dated prior evidence':'Not run'}</span>):<span>No field-proof row recorded</span>}
     </div>
    </article>)}</div>
   </section>
   <section aria-labelledby="signals-title"><h2 id="signals-title">Independent health signals</h2><p>These observations share this installation’s storage. They are separate reads, not an independent external watch.</p>
    <div className="readiness-signals">{report.signals.map(signal=><article className="panel padded" key={signal.id} data-readiness-signal={signal.id}>
     <div className="readiness-signal-title"><h3>{signal.name}</h3><strong data-state={signal.state}>{label(signal.state)}</strong></div>
     <p>{signal.reason}</p><dl>{Object.entries(signal.values).map(([key,value])=><div key={key}><dt>{label(key)}</dt><dd>{display(value)}</dd></div>)}</dl>
     <p className="readiness-observed">Observed <time dateTime={signal.observedAt}>{shortTime(signal.observedAt)}</time><br/>Age of known relevant record: {signal.ageSeconds===null?'Unknown':signal.ageSeconds.toLocaleString()+' seconds'}</p>
    </article>)}</div>
   </section>
   <p><a href="/docs/readiness">Readiness and recovery procedures</a></p>
   </details>
  </>}
 </div>;
}
