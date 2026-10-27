import {request} from '../useWorkspace';
import type {Service, State} from '../family/response-operations/domain';
import {autosaveRequest, useAutosave} from '../app/autosave/useAutosave';
import {SavedState, SaveFeedback} from '../app/autosave/SavedState';
import './changes.css';

export function ServiceDependencies({service, services, revision}: {service: Service; services: Service[]; revision: number; busy: boolean; run: (path: string, data: any, message?: string) => Promise<any>}) {
  const snapshot = (state: State) => ({values: {dependencies: state.services.find(row => row.id === service.id)?.dependencies ?? []}, revision: state.revision});
  const save = useAutosave({
    snapshot: {values: {dependencies: service.dependencies ?? []}, revision},
    read: async () => snapshot(await request('/api/state')),
    write: async ({to, revision}, {keepalive}) => {
      const result = await autosaveRequest('/api/command', {type: 'service-dependencies', service: service.id, dependencies: to, workspaceRevision: revision});
      return keepalive ? {values: {dependencies: result.dependencies ?? to}, revision: revision + 1} : snapshot(await request('/api/state'));
    },
    equal: (a, b) => Array.isArray(a) && Array.isArray(b) ? JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()) : a === b,
  });
  return <details className="service-dependencies"><summary>Edit direct dependencies</summary>
    <div className="autosave-form"><fieldset><legend>Direct dependencies for {service.name} <SavedState state={save.states.dependencies} /></legend>
      {services.filter(row => row.id !== service.id).map(row => <label className="dependency-choice" key={row.id}><input type="checkbox" checked={save.values.dependencies.includes(row.id)} onChange={event => save.change('dependencies', event.target.checked ? [...save.values.dependencies, row.id] : save.values.dependencies.filter(id => id !== row.id), 'choice')} />{row.name} · {row.environment}</label>)}
      {services.length < 2 && <p>Create another service before adding a dependency.</p>}
    </fieldset>
      <SaveFeedback state={save.states.dependencies} retry={() => save.retry('dependencies')} useMine={() => save.useMine('dependencies')} format={value => (value as string[]).map(id => services.find(row => row.id === id)?.name ?? 'Unavailable service').join(', ') || 'None'} />
    </div>
  </details>;
}
