import type { reviewMaterial } from './material';
import { DurationSource, EvidenceLink, utc } from './display';
import {shortDate} from './time';

export type Material = ReturnType<typeof reviewMaterial>;
export function ReviewMaterial({material,name=()=> 'Former member'}: {material: Material;name?:(id:string)=>string}) {
  return <div className="review-material-body">
    <p className="review-meta">Updated {utc(material.generatedAt)}</p>
    <details><summary>Timings</summary>
      {material.response ? <div className="response-metrics">{(['mtta', 'mttr', 'recovery', 'sourceRecovery'] as const).map(key => <section key={key}><h4>{key === 'mtta' ? 'Acknowledgement' : key === 'mttr' ? 'Resolution' : key === 'recovery' ? 'Human recovery attestation' : 'Source-reported recovery'}</h4><DurationSource value={material.response![key]} /></section>)}</div> : <p>No response record could be assigned.</p>}
    </details>
    <details><summary>Evidence ({material.observations.length})</summary>
      <p>{material.notice}</p>
      {!material.observations.length && <p>No retained source observations linked to this incident.</p>}
      <ol className="review-records">{material.observations.map(observation => <li key={observation.id}>
        <p className="review-literal">{observation.title}</p>
        <p className="review-meta">{observation.intent} ·
          Observed <time>{utc(observation.at)}</time> · ingested <time>{utc(observation.acceptedAt)}</time></p>
        <EvidenceLink url={observation.evidence}>Source evidence</EvidenceLink>
      </li>)}</ol>
    <div className="review-snapshot"><h4>Missing material</h4><ul>{material.missing.map(item => <li key={item}>{item}</li>)}</ul></div>
    </details>
    <details><summary>From the timeline ({material.assertions.length})</summary>
      <p>Human-authored records, kept separate from automated observations. No assertion is automatically accepted as root cause or impact.</p>
      <ol className="review-records">{material.assertions.map(assertion => <li key={assertion.id}>
        <p className="review-literal">{assertion.text}</p>
        {assertion.review&&<dl><dt>Accepted root cause</dt><dd className="review-literal">{assertion.review.rootCause}</dd><dt>Accepted impact</dt><dd className="review-literal">{assertion.review.impact}</dd><dt>Accepted review</dt><dd className="review-literal">{assertion.review.review}</dd></dl>}
        <p className="review-meta">{assertion.actorName}<br /><time>{utc(assertion.at)}</time></p>
      </li>)}</ol>
    </details>
    <details><summary>Changes ({material.changes.length})</summary>
      <p>Recent changes for this service and direct dependencies. Temporal proximity is context; it does not establish a cause.</p>
      {!material.changes.length && <p>No retained changes in this context window.</p>}
      <ol className="review-records">{material.changes.map(change => <li key={change.id}>
        <p className="review-literal"><strong>{change.summary}</strong></p>
        <p className="review-meta">{change.kind} · {change.serviceName} {change.dependency && '· direct dependency'}<br />
          Reported by {change.author}<br />
          Occurred <time>{utc(change.occurredAt)}</time> · ingested <time>{utc(change.acceptedAt)}</time><br />
          {change.timeBasis === 'received' ? 'Source time unavailable; occurred time uses received time.' : 'Occurred time is source-reported.'}{change.truncated && ' Retained context was truncated.'}</p>
        <div className="review-links">{change.links.map((url, index) => <EvidenceLink key={url} url={url}>Source {index + 1}</EvidenceLink>)}</div>
        {!!Object.keys(change.details).length && <dl>{Object.entries(change.details).map(([key, value]) => <div key={key}><dt>{key}</dt><dd className="review-literal">{value}</dd></div>)}</dl>}
      </li>)}</ol>
    </details>
    <details><summary>Follow-ups ({material.followups.length})</summary>
      <ul>{material.followups.map(action => <li key={action.id}>{action.title} · {name(action.owner)} · {action.priority ?? 'P2 (legacy default)'} · due {shortDate(action.due)} · {action.done ? 'Complete' : action.submission ? 'Awaiting acceptance' : 'Open'} · {action.completionPolicy ?? 'legacy evidence policy'} {action.evidence && <EvidenceLink url={action.evidence}>Evidence</EvidenceLink>}</li>)}</ul>
    </details>
  </div>;
}
