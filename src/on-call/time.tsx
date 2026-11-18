import {Tooltip} from '../app/Tooltip';
import {viewerZone} from './rota-steps/draft';
import {shortTime} from '../reviews/time';
export {shortTime} from '../reviews/time';
export function RotaTime({at, zone}: {at: string; zone: string}) {
  const own = viewerZone();
  return own === zone ? <time dateTime={at}>{shortTime(at, zone)}</time> : <Tooltip label={shortTime(at, own)}><time tabIndex={0} dateTime={at}>{shortTime(at, zone)}</time></Tooltip>;
}
export function zoneName(zone: string) {return zone;}

/** Keep a same-day gap compact while retaining both exact endpoints in the markup. */
export function GapTime({from, to, zone}: {from: string; to: string; zone: string}) {
  const date = (at: string) => new Intl.DateTimeFormat('en-CA', {timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date(at));
  const format = (at: string, day: boolean) => new Intl.DateTimeFormat('en-GB', {timeZone: zone, ...(day ? {weekday:'short' as const, day:'numeric' as const, month:'short' as const} : {}), hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).format(new Date(at));
  return <><time dateTime={from}>{format(from, true)}</time>–<time dateTime={to}>{format(to, date(from) !== date(to))}</time></>;
}
