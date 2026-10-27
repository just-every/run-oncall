import { useState } from 'react';
import { Form } from '../forms';
import { OneTimeSecret } from '../integrations/OneTimeSecret';
import { privateKey, type IntegrationProps } from '../integrations/catalog';

const areas = [ ['incidents', 'Incidents', true], ['services', 'Services', true], ['schedules', 'Rotas', true], ['actions', 'Follow-ups', true], ['analytics', 'Response numbers', false], ['integrations', 'Integrations', false] ] as const;
export function ClientCreate({ state, busy, run }: Pick<IntegrationProps, 'state' | 'busy' | 'run'>) {
  const [name, setName] = useState(''), [service, setService] = useState(state.services[0]?.id ?? '');
  const [grants, setGrants] = useState<Record<string, string>>({ incidents: 'read' }), [created, setCreated] = useState('');
  if (created) return <OneTimeSecret value={created} onDone={() => { setCreated(''); setName(''); }} />;
  if (!state.services.length) return <p><a href="/settings/services">Add a service first</a></p>;
  return <Form busy={busy} disabled={!Object.values(grants).some(Boolean)} label="Create client" onSubmit={async () => {
    const key = privateKey(), permissions = areas.flatMap(([area]) => grants[area] ? [area + ':read', ...(grants[area] === 'write' ? [area + ':write'] : [])] : []);
    if (await run('/api/automation/clients', { name, services: [service], permissions, key }, 'Client created')) setCreated(key);
    return false;
  }}>
    <label className="field">Name<input autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
    {state.services.length > 1 ? <label className="field">Service<select value={service} onChange={e => setService(e.target.value)}>{state.services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label> : <p>{state.services[0].name}</p>}
    <fieldset><legend>Permissions</legend>{areas.map(([area, label, writable]) => <label className="field" key={area}>{label}<select value={grants[area] ?? ''} onChange={e => setGrants({ ...grants, [area]: e.target.value })}><option value="">No access</option><option value="read">Read</option>{writable && <option value="write">Read and change</option>}</select></label>)}</fieldset>
  </Form>;
}
