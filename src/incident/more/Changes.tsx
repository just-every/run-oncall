import {RecentChanges} from '../../changes/RecentChanges';
import type {IncidentProps} from '../types';
export function Changes(props: IncidentProps) {
  return <RecentChanges service={props.incident.service} at={props.incident.createdAt} revision={props.state.revision} expanded windowChoices />;
}
