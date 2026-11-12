import {incidentStateLabel, severityLabel} from '../reviews/display';
import {Tooltip} from '../app/Tooltip';
import type {IncidentProps} from './types';
import {shortTime} from './types';

export function IncidentHead({incident, state, actions}: Pick<IncidentProps, 'incident' | 'state'> & {actions: () => void}) {
  const service = state.services.find(service => service.id === incident.service);
  const fields = [
    {key: 'state', value: <span className={'incident-state state-' + incident.state}>{incidentStateLabel(incident.state)}</span>},
    {key: 'service', value: service?.name},
    {key: 'environment', value: service?.environment},
    {key: 'severity', value: severityLabel(incident.severity)},
    {key: 'created', value: incident.createdAt && <time dateTime={incident.createdAt}>{shortTime(incident.createdAt)}</time>},
  ].filter(field => typeof field.value === 'string' ? field.value.trim() : field.value);
  return <header className="incident-head">
    <div className="incident-title-row">
      <h1 tabIndex={-1}>{incident.title}</h1>
      <Tooltip label="Incident actions" dismissOnEscape><button type="button" className="incident-icon" aria-label="Incident actions" aria-haspopup="menu" onClick={actions}>⋯</button></Tooltip>
    </div>
    <p className="incident-meta">{fields.map((field, index) => <span className="incident-meta-field" key={field.key}>{field.value}{index < fields.length - 1 && <span aria-hidden="true">{'\u00a0·'}</span>}</span>)}</p>
  </header>;
}
