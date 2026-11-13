import {useEffect, useRef, useState} from 'react';
import {Tooltip} from '../app/Tooltip';
import type {OnCallBand} from './read';
import {shortTime} from './time';
import {viewerZone} from './rota-steps/draft';

const DAY = 86_400_000;
const initials = (name: string) => {
  const words = name.trim().split(/\s+/);
  return [words[0], ...(words.length > 1 ? [words.at(-1)!] : [])].map(word => Array.from(word)[0]).join('').toLocaleUpperCase();
};

/** Keep the full name when it fits; a compact chip retains its complete accessible name. */
function BandName({name}: {name: string}) {
  const root = useRef<HTMLSpanElement>(null), measure = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const element = root.current, text = measure.current;
    if (!element || !text) return;
    const fit = () => setCompact(text.getBoundingClientRect().width > element.clientWidth);
    const observer = new ResizeObserver(fit);
    observer.observe(element);fit();
    void document.fonts.ready.then(fit);
    return () => observer.disconnect();
  }, [name]);
  return <span ref={root} className="oc-band-name"><span ref={measure} className="oc-band-measure" aria-hidden="true">{name}</span><span aria-hidden="true">{compact ? initials(name) : name}</span></span>;
}

export function WeekBands({rotas, from, to, title = 'This week', onShift, selectable, zone = viewerZone()}: {rotas: {id: string; name: string; week: OnCallBand[]}[]; from: number; to: number; title?: string; zone?: string; onShift?: (band: OnCallBand) => void; selectable?: (band: OnCallBand) => boolean}) {
  const root = useRef<HTMLElement>(null), [width, setWidth] = useState(0);
  const scroll = useRef<HTMLDivElement>(null), axis = useRef<HTMLDivElement>(null), [scrolling, setScrolling] = useState(false);
  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const days = Math.round((to - from) / DAY);
  // A boundary in one role must not cut the other person's uninterrupted shift into small chips.
  const rows = rotas.map(rota => ({...rota, roles: (['primary', 'backup'] as const).map(role => {
    const bands: OnCallBand[] = [];
    for (const band of rota.week.filter(band => band.role === role)) {
      const start = Math.max(from, Date.parse(band.from)), end = Math.min(to, Date.parse(band.to));
      if (end <= start) continue;
      const previous = bands.at(-1);
      if (!onShift && previous && previous.member?.id === band.member?.id && Date.parse(previous.to) === start) previous.to = new Date(end).toISOString();
      else bands.push({...band, from: new Date(start).toISOString(), to: new Date(end).toISOString()});
    }
    return {role, bands};
  })}));
  const fractions = rows.flatMap(rota => rota.roles.flatMap(({bands}) => bands.map(band => (Date.parse(band.to) - Date.parse(band.from)) / (to - from))));
  // Allow two initials and padding even on a short shift. Dense timelines become a list
  // rather than requiring an impractically wide axis for a few minutes of cover.
  const axisWidth = Math.ceil(Math.max(840, days * 100, ...fractions.map(fraction => 140 + 52 / fraction)));
  const stacked = (width > 0 && width < 600) || axisWidth > 2400;
  useEffect(() => {
    const viewport = scroll.current, content = axis.current;
    if (!viewport || !content) {setScrolling(false);return;}
    // The scroll container's padding also occupies space: the calculated axis
    // can fit the card while the rendered dates still need horizontal scrolling.
    const measure = () => setScrolling(viewport.scrollWidth > viewport.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);observer.observe(content);measure();
    return () => observer.disconnect();
  }, [stacked, axisWidth]);
  const label = (band: OnCallBand) => `${band.member?.name ?? 'Nobody on call'} · ${shortTime(band.from, zone)} – ${shortTime(band.to, zone)}`;
  const canSelect = (band: OnCallBand) => onShift && (!selectable || selectable(band));
  return <section ref={root} className="oc-bands oc-card" aria-label={title}><h2>{title}</h2><p className="oc-quiet" data-time-zone={zone}>Times shown in {zone}</p>
    {stacked ? <div className="oc-bands-list">{rows.map(rota => <section key={rota.id} className="oc-band-rota"><h3>{rota.name}</h3>{rota.roles.map(({role, bands}) => <div key={role} className="oc-band-list-role"><h4>{role === 'primary' ? 'Primary' : 'Backup'}</h4><ol>{bands.map((band, index) => <li key={index} className={!band.member ? 'oc-band-list-gap' : ''}>{canSelect(band) ? <button type="button" aria-label={label(band)} onClick={() => onShift!(band)}>{band.member?.name ?? 'Nobody on call'}</button> : <strong>{band.member?.name ?? 'Nobody on call'}</strong>}<p><time dateTime={band.from}>{shortTime(band.from, zone)}</time><span aria-hidden="true"> → </span><span> to </span><time dateTime={band.to}>{shortTime(band.to, zone)}</time></p></li>)}</ol></div>)}</section>)}</div> : <>
      {scrolling && <p className="oc-band-scroll-hint">↔ Scroll sideways to see every day</p>}
      <div ref={scroll} className="oc-bands-scroll" tabIndex={0} role="region" aria-label={`${title} coverage bands`}><div ref={axis} className="oc-bands-axis" style={{minWidth: axisWidth}}>
        <div className="oc-band-dates"><span/>{Array.from({length: days}, (_, index) => <time key={index} dateTime={new Date(from + index * DAY).toISOString()} style={{left: `calc(140px + (100% - 140px) * ${index / days})`}}>{new Intl.DateTimeFormat('en-GB', {timeZone: zone, day:'numeric',month:'short'}).format(from + index * DAY)}</time>)}</div>
        {rows.map(rota => <div className="oc-band-rota" key={rota.id}><h3>{rota.name}</h3>{rota.roles.map(({role, bands}) => <div className="oc-band-role" key={role}><span>{role === 'primary' ? 'Primary' : 'Backup'}</span><div className="oc-band-track">{bands.map((band, index) => {
          const start = Date.parse(band.from), end = Date.parse(band.to), name = band.member?.name ?? 'Nobody on call';
          const style = {left: `${(start - from) / (to - from) * 100}%`, width: `${(end - start) / (to - from) * 100}%`};
          const current = start <= Date.now() && end > Date.now();
          return <div key={index} className={`oc-band ${!band.member ? 'oc-band-gap' : current ? 'oc-band-now' : 'oc-band-next'}`} style={style}>{canSelect(band) ? <button type="button" aria-label={label(band)} onClick={() => onShift!(band)}><BandName name={name}/></button> : <Tooltip label="Shift details"><span tabIndex={0} role="group" aria-label={label(band)}><BandName name={name}/></span></Tooltip>}</div>;
        })}</div></div>)}</div>)}
      </div></div>
    </>}
  </section>;
}
