import {RotaField} from '../Field';
import type {State} from '../../family/response-operations/domain';
import type {RotaDraft} from './draft';
export type StepProps = {draft: RotaDraft; update: (value: Partial<RotaDraft>) => void; state: State};
export function StepService({draft, update, state}: StepProps) {
  const services = draft.original ? state.services.filter(service => service.id === draft.service) : state.services;
  return <><h2>Service and name</h2><RotaField label={<>Rota name</>}><input autoFocus required maxLength={200} value={draft.name} onChange={event => update({name: event.target.value})}/></RotaField>
    {services.length > 1 ? <RotaField label={<>Service</>}><select value={draft.service} onChange={event => update({service: event.target.value})}>{services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></RotaField> : <p>Service · {services[0]?.name ?? 'No service available'}</p>}
  </>;
}
