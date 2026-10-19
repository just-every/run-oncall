import type { AlertNoise as Noise } from './noise';

export function AlertNoise({noise}: {noise: Noise}) {
  return <section className="coverage-load" aria-labelledby="alert-noise-heading">
    <h3 id="alert-noise-heading">Repeat and noisy alerts</h3>
    <dl className="review-stat-grid alert-noise-stats">
      <div><dt>Alerts triggered</dt><dd>{noise.alerts}</dd></div><div><dt>Trigger events</dt><dd>{noise.triggers}</dd></div>
      <div><dt>Repeated alerts</dt><dd>{noise.repeatedAlerts}</dd></div><div><dt>Noisy keys</dt><dd>{noise.noisyKeys}</dd></div>
      <div><dt>Suppressed, still counted</dt><dd>{noise.suppressedAlerts}</dd></div>
    </dl>
    {noise.noisy.length ? <ol className="alert-noise-list">{noise.noisy.map(k => <li key={`${k.source} ${k.service} ${k.key}`}>
      <strong>{k.title}</strong> <span className="review-meta">{k.service} · key {k.key} · {k.source}</span><br />
      <span className="review-meta">Triggers {k.triggers} · alert generations {k.alerts} · active {k.active} · suppressed {k.suppressed}</span>
    </li>)}</ol> : <p>No alert repeated in this cohort range.</p>}
    <p className="muted">{noise.definition}</p>
  </section>;
}
