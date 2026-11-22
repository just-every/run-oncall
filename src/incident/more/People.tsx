import {IncidentResponseControls} from '../../app/IncidentResponseControls';
import type {IncidentProps} from '../types';
export function People(props: IncidentProps) {
  return <IncidentResponseControls {...props} members={props.state.members} />;
}
