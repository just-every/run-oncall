import {Tooltip} from '../app/Tooltip';
import {viewerZone} from './rota-steps/draft';
import {shortTime} from '../reviews/time';
export {shortTime} from '../reviews/time';
export function RotaTime({at, zone}: {at: string; zone: string}) {
  const own = viewerZone();
  return own === zone ? <time dateTime={at}>{shortTime(at, zone)}</time> : <Tooltip label={shortTime(at, own)}><time tabIndex={0} dateTime={at}>{shortTime(at, zone)}</time></Tooltip>;
}
export function zoneName(zone: string) {return zone;}
