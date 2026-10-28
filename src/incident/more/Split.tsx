import {IncidentWorkflows} from '../../incident-workflows/Controls';
import type {IncidentProps} from '../types';
export function Split(props: IncidentProps) {
  return <IncidentWorkflows incident={props.incident} state={props.state} member={props.actor} send={props.command} view="split" />;
}
