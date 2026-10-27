import type {IntegrationProps} from '../integrations/catalog';
import {addPath,sourcePath,integrationKinds} from '../integrations/catalog';
import '../integrations/integrations.css';
export function CompatibleIngress({state,admin}:IntegrationProps) {
 return <section className="panel padded integrations"><h2>Compatible sources</h2><ul className="integration-rows">{(state.intakeSources??[]).filter(s=>!s.routing&&['pagerduty','opsgenie','splunk'].includes(s.provider)).map(s=><li key={s.id}><a href={sourcePath('intake:'+s.id)}><strong>{s.name}</strong><small>{state.services.find(service=>service.id===s.service)?.name}</small></a></li>)}</ul>{admin&&<div className="integration-tabs">{(['pagerduty','opsgenie','splunk'] as const).map(kind=><a key={kind} href={addPath(kind)}>Add {integrationKinds[kind]}</a>)}</div>}</section>;
}
