import { OneTimeSecret } from './OneTimeSecret';
import { RequestExample } from './RequestExample';
import type { Service } from '../family/response-operations/domain';

export type Created = { name: string; kind: string; value: string; path: string; source: string; mode: string; service?: Service };

/** The confirmation after a source is created. The key is shown from memory once. */
export function CreatedSource({ created, onOpen }: { created: Created; onOpen?: () => void }) {
  const { name, kind, value, path, source, mode, service } = created;
  return <section className="panel padded integrations"><h2>{name}</h2><OneTimeSecret value={value} readable={kind !== 'email'} label={kind === 'email' ? 'Private address' : 'Private key'} />{kind === 'events' && service && <RequestExample source={source} service={service} mode={mode} defaultOpen />}<a className="integration-link" href={path} onClick={onOpen}>Open source</a></section>;
}
