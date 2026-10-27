import type {IntegrationProps} from '../integrations/catalog';
import {sourcePath,addPath} from '../integrations/catalog';
import '../integrations/integrations.css';
export function ChangeSources({state}:Pick<IntegrationProps,'state'|'busy'|'run'>) {
 return <section className="panel padded integrations"><h2>Change events</h2><ul className="integration-rows">{(state.changeSources??[]).map(source=><li key={source.id}><a href={sourcePath('change:'+source.id)}><strong>{source.name}</strong><small>{state.services.find(s=>s.id===source.service)?.name}{!source.active?' · Inactive':''}</small></a></li>)}</ul><a className="integration-link" href={addPath('changes')}>Add change integration</a></section>;
}
