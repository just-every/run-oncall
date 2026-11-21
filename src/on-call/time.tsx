import {Tooltip} from '../app/Tooltip';
import {viewerZone} from './rota-steps/draft';
import {shortTime} from '../reviews/time';
export {shortTime} from '../reviews/time';
export function RotaTime({at, zone}: {at: string; zone: string}) {
  const own = viewerZone();
  return own === zone ? <time dateTime={at}>{shortTime(at, zone)}</time> : <Tooltip label={shortTime(at, own)}><time tabIndex={0} dateTime={at}>{shortTime(at, zone)}</time></Tooltip>;
}
export function RotaStartTime({at, zone, asOf}: {at: string; zone: string; asOf: number}) {
  const minutes = (Date.parse(at) - asOf) / 60_000;
  const [count, unit] = minutes < 60 ? [minutes, 'minute'] as const :
    minutes < 1440 ? [minutes / 60, 'hour'] as const : [minutes / 1440, 'day'] as const;
  const lead = minutes < 1 ? 'in less than a minute' : new Intl.RelativeTimeFormat('en').format(Math.round(count), unit);
  return <><RotaTime at={at} zone={zone}/>{minutes > 0 && minutes < 7 * 1440 && ` (${lead})`}</>;
}
export function zoneName(zone: string) {return zone;}
