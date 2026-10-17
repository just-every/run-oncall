import type { reviewMaterial } from './material';
import { DurationSource, EvidenceLink, utc } from './display';

export type Material = ReturnType<typeof reviewMaterial>;
export function ReviewMaterial({material}: {material: Material}) {
  return <div className="review-material-body">
    <p><strong>{material.notice}</strong></p>
    <p className="review-meta">Generated <time>{utc(material.generatedAt)}</time> · incident revision {material.incidentRevision} · workspace revision {material.workspaceRevision}</p>
    <details><summary>Recorded response durations</summary>
      {material.response ? <div className="response-metrics">{(['mtta', 'mttr', 'recovery'] as const).map(key => <section key={key}><h4>{key === 'mtta' ? 'Acknowledgement' : key === 'mttr' ? 'Resolution' : 'Human recovery attestation'}</h4><DurationSource value={material.response![key]} /></section>)}</div> : <p>No response record could be assigned.</p>}
    </details>
    <details><summary>Reported source observations ({material.observations.length})</summary>
      <p>Retained source observations. Their presence does not establish incident cause, impact or recovery.</p>
      {!material.observations.length && <p>No retained source observations linked to this incident.</p>}
      <ol className="review-records">{material.observations.map(observation => <li key={observation.id}>
        <p className="review-literal">{observation.title}</p>
        <p className="review-meta">Observation {observation.id} · source {observation.source} · source event {observation.eventId} · {observation.intent}<br />
          Observed <time>{utc(observation.at)}</time> · ingested <time>{utc(observation.acceptedAt)}</time></p>
        <EvidenceLink url={observation.evidence}>Source evidence</EvidenceLink>
      </li>)}</ol>
    </details>
    <details><summary>Human assertions · literal timeline text ({material.assertions.length})</summary>
      <p>Human-authored records, kept separate from automated observations. No assertion is automatically accepted as root cause or impact.</p>
      <ol className="review-records">{material.assertions.map(assertion => <li key={assertion.id}>
        <p className="review-literal">{assertion.text}</p>
        {assertion.review&&<dl><dt>Accepted root cause</dt><dd className="review-literal">{assertion.review.rootCause}</dd><dt>Accepted impact</dt><dd className="review-literal">{assertion.review.impact}</dd><dt>Accepted review at workspace {assertion.review.workspaceRevision}, incident revision {assertion.review.materialRevision}</dt><dd className="review-literal">{assertion.review.review}</dd></dl>}
        <p className="review-meta">Entry {assertion.id} · {assertion.kind} · {assertion.actorName} ({assertion.actor})<br /><time>{utc(assertion.at)}</time></p>
      </li>)}</ol>
    </details>
    <details><summary>Contextual changes ({material.changes.length})</summary>
      <p>Recent changes for this service and direct dependencies. Temporal proximity is context; it does not establish a cause.</p>
      {!material.changes.length && <p>No retained changes in this context window.</p>}
      <ol className="review-records">{material.changes.map(change => <li key={change.id}>
        <p className="review-literal"><strong>{change.summary}</strong></p>
        <p className="review-meta">Change {change.id} · {change.kind} · {change.serviceName} {change.dependency && '· direct dependency'}<br />
          Source {change.source} · source event {change.eventId} · author {change.author}<br />
          Occurred <time>{utc(change.occurredAt)}</time> · ingested <time>{utc(change.acceptedAt)}</time><br />
          {change.timeBasis === 'received' ? 'Source time unavailable; occurred time uses received time.' : 'Occurred time is source-reported.'}{change.truncated && ' Retained context was truncated.'}</p>
        <div className="review-links">{change.links.map((url, index) => <EvidenceLink key={url} url={url}>Source {index + 1}</EvidenceLink>)}</div>
        {!!Object.keys(change.details).length && <dl>{Object.entries(change.details).map(([key, value]) => <div key={key}><dt>{key}</dt><dd className="review-literal">{value}</dd></div>)}</dl>}
      </li>)}</ol>
    </details>
    <details><summary>Follow-ups in this material snapshot ({material.followups.length})</summary>
      <ul>{material.followups.map(action => <li key={action.id}>{action.title} · {action.id} · owner {action.owner} · {action.priority ?? 'P2 (legacy default)'} · due {action.due}, end of day UTC · {action.done ? 'Complete' : action.submission ? 'Awaiting acceptance' : 'Open'} · {action.completionPolicy ?? 'legacy evidence policy'} {action.evidence && <EvidenceLink url={action.evidence}>Evidence</EvidenceLink>}</li>)}</ul>
    </details>
    <div className="review-snapshot"><h4>Missing material</h4><ul>{material.missing.map(item => <li key={item}>{item}</li>)}</ul></div>
  </div>;
}
