import type {State} from '../family/response-operations/domain';
import type { AlertNoise as Noise } from './noise';

export function AlertNoise({noise, state, zone, showDefinition = true}: {noise: Noise; state: State; zone: string; showDefinition?: boolean}) {
  const alerts = new Map(state.alerts.map(alert => [alert.id, alert]));
  const events = new Map(state.events.map(event => [event.id, event]));
  const time = new Intl.DateTimeFormat(undefined, {timeZone: zone, dateStyle: 'medium', timeStyle: 'short'});

  return <section className="coverage-load" aria-labelledby="alert-noise-heading">
    <h3 id="alert-noise-heading">Repeat and noisy alerts</h3>
    <dl className="review-stat-grid alert-noise-stats">
      <div><dt>Alerts triggered</dt><dd>{noise.alerts}</dd></div><div><dt>Trigger events</dt><dd>{noise.triggers}</dd></div>
      <div><dt>Repeated alerts</dt><dd>{noise.repeatedAlerts}</dd></div><div><dt>Noisy keys</dt><dd>{noise.noisyKeys}</dd></div>
      <div><dt>Suppressed, still counted</dt><dd>{noise.suppressedAlerts}</dd></div>
    </dl>
    {noise.noisy.length ? <ol className="alert-noise-list" role="list">{noise.noisy.map(k => <li key={JSON.stringify([k.source, k.service, k.key])}>
      <details>
        <summary>
          <strong>{k.title}</strong> <span className="review-meta">{state.services.find(s => s.id === k.service)?.name ?? 'Retained service'}</span><br />
          <span className="review-meta">Triggers&nbsp;{k.triggers} · alert generations&nbsp;{k.alerts} · active&nbsp;{k.active} · suppressed&nbsp;{k.suppressed}</span>
        </summary>
        <ul>{k.alertIds.map(id => {
          const alert = alerts.get(id);
          const event = alert && events.get(alert.events[0]);
          return <li key={id}>
            <a href={'/alerts/' + encodeURIComponent(id)}>
              {event?.title ?? 'Retained alert'}
              {alert && event && <span className="review-meta"> · {time.format(Date.parse(event.acceptedAt))} · {alert.state}{alert.suppressed && ' · suppressed'}</span>}
            </a>
          </li>;
        })}</ul>
      </details>
    </li>)}</ol> : <p>No alert repeated in this cohort range.</p>}
    {showDefinition&&<p className="muted">{noise.definition}</p>}
  </section>;
}
