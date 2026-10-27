import type {IntegrationProps} from '../integrations/catalog';
import {addPath,sourcePath} from '../integrations/catalog';
import '../integrations/integrations.css';
export const monitoringNames={alertmanager:'Alertmanager',grafana:'Grafana',datadog:'Datadog'};
export function MonitoringWorkspace({state,admin}:IntegrationProps) {
 return <section className="panel padded integrations"><h2>Monitoring sources</h2><ul className="integration-rows">{(state.intakeSources??[]).filter(s=>!s.routing&&s.provider in monitoringNames).map(s=><li key={s.id}><a href={sourcePath('intake:'+s.id)}><strong>{s.name}</strong><small>{state.services.find(service=>service.id===s.service)?.name}</small></a></li>)}</ul>{admin&&<div className="integration-tabs">{Object.entries(monitoringNames).map(([kind,name])=><a key={kind} href={addPath(kind)}>Add {name}</a>)}</div>}</section>;
}
