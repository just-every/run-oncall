import {Tooltip} from '../app/Tooltip';
import {viewerZone} from './rota-steps/draft';
export function shortTime(value: string | number, zone: string) {
  return new Intl.DateTimeFormat('en-GB', {timeZone: zone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(value));
}
export function RotaTime({at, zone}: {at: string; zone: string}) {
  const own = viewerZone();
  return own === zone ? <time dateTime={at}>{shortTime(at, zone)}</time> : <Tooltip label={`${shortTime(at, own)} ${own}`}><time tabIndex={0} dateTime={at}>{shortTime(at, zone)}</time></Tooltip>;
}
export function zoneName(zone: string) {return zone.split('/').at(-1)!.replaceAll('_', ' ');}
