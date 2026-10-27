import {IncidentWorkflows} from '../../incident-workflows/Controls';
import {memberName, shortTime, type IncidentProps} from '../types';

export function ServiceContext(props: IncidentProps) {
  const {incident, state} = props;
  const service = state.services.find(service => service.id === incident.service);
  return <section aria-label="Service context">
    <p>{service?.name} · {service?.environment}</p>
    <p>Owner: {memberName(state, service?.owner)}</p>
    {service?.pager ? <p><a href={service.pager} target="_blank" rel="noreferrer">Open existing pager →</a></p> : <p>No existing pager link configured.</p>}
    {incident.automaticDeclaration && <p>Automatic declaration · service response policy</p>}
    {incident.sourceRecovery && <section aria-label="Source recovery">
      {incident.state !== 'resolved' && <strong>all alerts recovered — awaiting resolution</strong>}
      <p>Source recovery recorded {shortTime(incident.sourceRecovery.at)}.</p>
      <p>Commander reminder: {memberName(state, incident.sourceRecovery.reminder.commander)} · {incident.sourceRecovery.reminder.state} · non-automatic.</p>
      <p>Record recovery evidence and a resolution summary to resolve the incident.</p>
    </section>}
    {incident.recovery && <p><a href={incident.recovery} target="_blank" rel="noreferrer">Recovery attestation →</a></p>}
    <IncidentWorkflows state={state} incident={incident} member={props.actor} send={props.command} view="context" />
  </section>;
}
