import type { CoverageLoad as Load } from './load';
import {shortTime,browserZone} from './time';

const hours = (seconds: number | null) => seconds === null ? 'No schedule' : `${new Intl.NumberFormat('en', {maximumFractionDigits: 1}).format(seconds / 3600)} h`;
const rate = (value: number | null, none: string) => value === null ? none : new Intl.NumberFormat('en', {maximumFractionDigits: 2}).format(value);
const share = (value: number | null) => value === null ? 'none' : new Intl.NumberFormat('en', {style: 'percent', maximumFractionDigits: 1}).format(value);

export function CoverageLoad({load,showBasis=true,zone=browserZone()}: {load: Load;showBasis?:boolean;zone?:string}) {
  return <section className="coverage-load" aria-labelledby="coverage-load-heading">
    <h3 id="coverage-load-heading">Load by scheduled coverage</h3>
    <p>Scheduled hours from <time>{shortTime(load.from,zone)}</time> to <time>{shortTime(load.through,zone)}</time>.</p>
    <p>{load.schedules.length ? <>Current schedules: {load.schedules.map(s => `${s.name} (${s.timezone})`).join('; ')}.</> : 'No schedule covers this cohort, so load cannot be normalised by coverage.'}</p>
    <p className="muted">Scheduled hours, not worked hours. Person-attributed acknowledgements: {load.acknowledged} · agent or service-account coordination: {load.coordinatedAcknowledgements} · unacknowledged incidents, left unattributed: {load.unacknowledged} · unknown acknowledgement attribution: {load.unknownAcknowledgements}.</p>
    <h4>Responders</h4>
    {!load.responders.length && <p>No responder holds a schedule slot or acknowledged an incident in this cohort.</p>}
    <div className="coverage-load-grid">{load.responders.map(r => <article className="response-metric" key={r.member}>
      <h5>{r.name ?? 'Former member'}{!r.current && <span className="tag">{r.name ? 'not current' : 'not a member'}</span>}</h5>
      <dl className="review-stat-grid">
        <div><dt>Primary</dt><dd>{hours(r.primarySeconds)}</dd></div>
        <div><dt>Backup</dt><dd>{hours(r.backupSeconds)}</dd></div>
        <div><dt>Acknowledged</dt><dd>{r.acknowledgements}</dd></div>
        <div><dt>Per 24 primary hours</dt><dd>{rate(r.per24PrimaryHours, 'No primary hours')}</dd></div>
      </dl>
      <p className="review-meta">Acknowledgement share {share(r.acknowledgementShare)} · primary-hour share {share(r.primaryShare)} · load to coverage {rate(r.loadToCoverage, 'unavailable')}<br />
        Outside scheduled coverage {r.outsideCoverage}{r.unknownTime ? ` · unknown time ${r.unknownTime}` : ''}</p>
    </article>)}</div>
    <h4>Services</h4>
    <div className="coverage-load-grid">{load.services.map(s => <article className="response-metric" key={s.service}>
      <h5>{s.name ?? 'Former service'}</h5>
      <dl className="review-stat-grid">
        <div><dt>Primary covered</dt><dd>{hours(s.primarySeconds)}</dd></div>
        <div><dt>Primary uncovered</dt><dd>{hours(s.uncoveredPrimarySeconds)}</dd></div>
        <div><dt>Incidents</dt><dd>{s.incidents}</dd></div>
        <div><dt>Per 24 covered hours</dt><dd>{rate(s.per24PrimaryHours, s.schedules ? 'No covered hours' : 'No schedule')}</dd></div>
      </dl>
      <p className="review-meta">Schedules: {s.schedules} · acknowledged: {s.acknowledgements}</p>
    </article>)}</div>
    {showBasis&&<details className="review-material"><summary>How scheduled coverage and load are computed</summary><ul>{load.basis.map(line => <li key={line}>{line}</li>)}</ul></details>}
  </section>;
}
