import type { ReactNode } from 'react';
import { AddIntegration } from './AddIntegration';
import { integrationKinds, sourcePath, sourcesFrom, type IntegrationProps, type NativeDefinition } from './catalog';
import './integrations.css';

export function IntegrationsHome(props: IntegrationProps & { native: NativeDefinition[]; panels?: ReactNode; readFailure?: ReactNode }) {
  const sources = sourcesFrom(props.state, props.native);
  return <div className="integrations-home">
    <section className="panel padded integrations" aria-label="Integration sources"><div className="integration-heading"><h2>Sources</h2>{sources.length > 0 && <a className="integration-link" href="/settings/integrations/new">Add integration</a>}</div>
      {props.readFailure}
      {Object.entries(integrationKinds).map(([kind, label]) => {
        const rows = sources.filter(s => s.kind === kind);
        if (!rows.length) return null;
        return <div key={kind}><h3>{label}</h3><ul className="integration-rows">{rows.map(s => <li key={s.id}><a href={sourcePath(s.id)}><strong>{s.name}</strong><small>{props.state.services.find(v => v.id === s.service)?.name ?? 'Service unavailable'}{!s.active ? ' · Inactive' : ''}</small></a></li>)}</ul></div>;
      })}
    </section>
    {!sources.length && props.admin && <AddIntegration {...props} />}
    {props.panels}
  </div>;
}
