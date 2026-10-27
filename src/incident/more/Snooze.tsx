import {DeadlineControls} from '../../incident-deadlines/Controls';
import type {IncidentProps} from '../types';
export function Snooze(props: IncidentProps) {
  return <>{props.incident.state === 'declared' && <p>Acknowledge this incident before snoozing it.</p>}<DeadlineControls incident={props.incident} actor={props.actor} busy={props.busy} submit={props.command} /></>;
}
