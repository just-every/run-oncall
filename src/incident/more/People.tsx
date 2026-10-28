import {IncidentResponseControls} from '../../app/IncidentResponseControls';
import type {IncidentProps} from '../types';
export function People(props: IncidentProps) {
  return <IncidentResponseControls incident={props.incident} members={props.state.members} busy={props.busy} canEdit={props.canEdit} mutate={props.mutate} refresh={props.refresh} />;
}
