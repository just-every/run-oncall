import {Tooltip} from '../app/Tooltip';
import type {IncidentProps} from './types';
import {shortTime} from './types';

export function IncidentHead({incident, state, actions}: Pick<IncidentProps, 'incident' | 'state'> & {actions: () => void}) {
  const service = state.services.find(service => service.id === incident.service);
  return <header className="incident-head">
    <div className="incident-title-row">
      <h2 tabIndex={-1}>{incident.title}</h2>
      <Tooltip label="Incident actions"><button type="button" className="incident-icon" aria-label="Incident actions" aria-haspopup="menu" onClick={actions}>⋯</button></Tooltip>
    </div>
    <p className="incident-meta"><span className={'incident-state state-' + incident.state}>{incident.state}</span> · {service?.name} · {service?.environment} · {incident.severity} · {shortTime(incident.createdAt)}</p>
  </header>;
}
