import {useEffect,type ReactNode} from 'react';
import { AddIntegration } from './AddIntegration';
import { integrationKinds, sourcePath, sourcesFrom, type IntegrationProps, type NativeDefinition } from './catalog';
import {changeRetentionLimit} from '../changes/model';
import './integrations.css';

export function IntegrationsHome(props: IntegrationProps & { native: NativeDefinition[]; panels?: ReactNode; readFailure?: ReactNode }) {
  useEffect(()=>{try{const at=Number(sessionStorage.getItem('oncall:integration-list-scroll'));if(at)requestAnimationFrame(()=>window.scrollTo(0,at));}catch{}},[]);
  const remember=()=>{try{sessionStorage.setItem('oncall:integration-list-scroll',String(window.scrollY));}catch{}};
  const sources = sourcesFrom(props.state, props.native, props.admin);
  return <div className="integrations-home">
    <section className="panel padded integrations" aria-label="Integration sources"><div className="integration-heading"><h2>Sources</h2>{sources.length > 0 && <a className="integration-link" href="/settings/integrations/new">Add integration</a>}</div>
      {props.readFailure}
      {Object.entries(integrationKinds).map(([kind, label]) => {
        const rows = sources.filter(s => s.kind === kind);
        if (!rows.length && kind !== 'changes') return null;
        return <div className="integration-group" key={kind}><h3>{label}</h3>{kind === 'changes' && <p>{props.state.changes?.length??0} of {changeRetentionLimit.toLocaleString()} retained changes. Oldest records outside retained incident windows are removed first; protected context is never evicted. At protected capacity, intake is refused visibly.</p>}<ul className="integration-rows">{rows.map(s => <li key={s.id}><a href={sourcePath(s.id)} onClick={remember}><strong>{s.name}</strong><small>{props.state.services.find(v => v.id === s.service)?.name ?? 'Service unavailable'}{!s.active&&s.statusKnown!==false ? ' · Inactive' : ''}</small></a></li>)}</ul></div>;
      })}
      <div className="integration-home-panels">{props.panels}</div>
    </section>
    {!sources.length && props.admin && <AddIntegration {...props} />}
  </div>;
}
