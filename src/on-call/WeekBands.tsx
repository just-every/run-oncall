import {Tooltip} from '../app/Tooltip';
import type {OnCallBand} from './read';
import {shortTime} from './time';
import {viewerZone} from './rota-steps/draft';
export function WeekBands({rotas, from, to, title = 'This week', onShift, selectable}: {rotas: {id: string; name: string; week: OnCallBand[]}[]; from: number; to: number; title?: string; onShift?: (band: OnCallBand) => void; selectable?: (band: OnCallBand) => boolean}) {
  const zone = viewerZone(), days = Math.round((to - from) / 86_400_000);
  return <section className="oc-bands oc-card" aria-label={title}><h2>{title}</h2><p className="oc-quiet">{zone}</p><div className="oc-bands-scroll" tabIndex={0} role="region" aria-label={`${title} coverage bands`}><div className="oc-bands-axis" style={{minWidth: Math.max(680, days * 70)}}>
    <div className="oc-band-dates"><span/>{Array.from({length: days}, (_, index) => <time key={index} style={{left: `calc(140px + (100% - 140px) * ${index / days})`}}>{new Intl.DateTimeFormat('en-GB', {timeZone: zone, day:'numeric',month:'short'}).format(from + index * 86_400_000)}</time>)}</div>
    {rotas.map(rota => <div className="oc-band-rota" key={rota.id}><h3>{rota.name}</h3>{(['primary', 'backup'] as const).map(role => <div className="oc-band-role" key={role}><span>{role === 'primary' ? 'Primary' : 'Backup'}</span><div className="oc-band-track">{rota.week.filter(band => band.role === role).map((band, index) => {
      const start = Math.max(from, Date.parse(band.from)), end = Math.min(to, Date.parse(band.to));
      if (end <= start) return null;
      const label = `${band.member?.name ?? 'Nobody on call'} · ${shortTime(start, zone)} – ${shortTime(end, zone)}`;
      const style = {left: `${(start - from) / (to - from) * 100}%`, width: `${(end - start) / (to - from) * 100}%`};
      const current = start <= Date.now() && end > Date.now();
      return <div key={role + index} className={`oc-band ${!band.member ? 'oc-band-gap' : current ? 'oc-band-now' : 'oc-band-next'}`} style={style}>{onShift && (!selectable || selectable(band)) && (end-start)/(to-from)*(Math.max(680,days*70)-140)>=44 ? <button type="button" aria-label={label} onClick={() => onShift(band)}>{band.member?.name ?? 'Nobody on call'}</button> : <Tooltip label={label}><span tabIndex={0}>{band.member?.name ?? 'Nobody on call'}</span></Tooltip>}</div>;
    })}</div></div>)}</div>)}
  </div></div></section>;
}
