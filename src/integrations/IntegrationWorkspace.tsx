import { useEffect, useState, type ReactNode } from 'react';
import { request } from '../useWorkspace';
import { AddIntegration } from './AddIntegration';
import { IntegrationsHome } from './IntegrationsHome';
import { SourcePage } from './SourcePage';
import { integrationKinds, sourcePath, sourcesFrom, type IntegrationProps, type NativeDefinition, type SourceRecord } from './catalog';

export function IntegrationWorkspace(props: IntegrationProps & { path: string; panels?: ReactNode; emailPage?: (source: SourceRecord) => ReactNode }) {
  const [native, setNative] = useState<NativeDefinition[]>([]), [failed, setFailed] = useState(false), [loaded, setLoaded] = useState(!props.admin);
  async function read() {
    try { const value = await request('/api/sources'); setNative(value.sources); setFailed(false); setLoaded(true); }
    catch { setFailed(true); setLoaded(true); }
  }
  useEffect(() => { if (props.admin) void read(); }, [props.admin, props.state.revision, props.path]);
  const run: IntegrationProps['run'] = async (path,data,message) => {
    const result=await props.run(path,data,message);
    if(result&&typeof path==='string'&&path.startsWith('/api/sources'))await read();
    return result;
  };
  const tail = props.path.replace(/^\/settings\/integrations\/?/, '').replace(/\/$/, '');
  if (tail === 'new' || tail.startsWith('new/')) return <AddIntegration {...props} run={run} kind={tail.slice(4)} />;
  const readFailure = failed ? <p role="alert">Some sources could not be read. <button type="button" onClick={read}>Retry</button></p> : undefined;
  if (!tail) return <IntegrationsHome {...props} native={native} readFailure={readFailure} />;
  let id: string;
  try { id = decodeURIComponent(tail); } catch { id = ''; }
  const sources = sourcesFrom(props.state, native), source = sources.find(s => s.id === id);
  if (!loaded && id.startsWith('native:')) return <section className="panel padded integrations"><p role="status">Reading source…</p></section>;
  return <div className="integration-detail-layout">
    <aside className="panel padded integrations integration-list-column" aria-label="Sources"><h2>Integrations</h2><ul className="integration-rows">{sources.map(s => <li key={s.id}><a href={sourcePath(s.id)} aria-current={s.id === id ? 'page' : undefined}><strong>{s.name}</strong><small>{integrationKinds[s.kind]}</small></a></li>)}</ul><a className="integration-link" href="/settings/integrations/new">Add integration</a></aside>
    <div>{readFailure}<SourcePage {...props} run={run} source={source}>{source?.kind === 'email' && props.emailPage?.(source)}</SourcePage></div>
  </div>;
}
