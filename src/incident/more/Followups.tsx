import {Followups as FollowupList} from '../../reviews/Followups';
import type {IncidentProps} from '../types';
export function Followups(props: IncidentProps) {
  return <FollowupList incident={props.incident} members={props.state.members} busy={props.busy} canEdit={props.canEdit} mutate={props.mutate} incidentMode />;
}
