import {ResponderRequests} from '../../manual-pages/Controls';
import type {IncidentProps} from '../types';
export function Responders(props: IncidentProps) {
  return <ResponderRequests incident={props.incident} state={props.state} actor={props.actor} busy={props.busy} submit={props.command} expanded />;
}
