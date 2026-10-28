import {useEffect, useRef, useState} from 'react';
import {FailureLine, useActionFailure} from '../../app/FailureLine';
import {request} from '../../useWorkspace';
import type {Coverage, Schedule} from '../../family/response-operations/schedules';
import type {State} from '../../family/response-operations/domain';
import {shortTime} from '../time';
export function RotaPreview({schedule, state, onReady,days=28,from:rangeFrom}: {days?:number;from?:number;schedule: Schedule | null; state: State; onReady: (schedule: Schedule | null) => void}) {
  const [rangeDays,setRangeDays]=useState(days);
  const [windows, setWindows] = useState<Coverage[]>([]), [zone, setZone] = useState('');
  const failures = useActionFailure(), generation = useRef(0), callback = useRef(onReady);
  callback.current = onReady;
  const serialized = JSON.stringify(schedule);
  useEffect(() => {
    const version = ++generation.current;
    callback.current(null);
    failures.clear();
    if (!schedule) {setWindows([]);setZone('');return;}
    // Keep the last coverage visible while a valid draft's answer is in flight.
    const read = async () => {
      try {
        const from = Date.parse(schedule.primary.anchorLocal + 'Z');
        // The validity instant, rather than a guessed offset, anchors the first four weeks.
        const start = rangeFrom??Math.max(Date.parse(schedule.validFrom), from - 2 * 86_400_000);
        const value: Coverage[] = await request('/api/paging/preview', {schedule, from: start, to: start + days * 86_400_000});
        if (version !== generation.current) return;
        setWindows(value);setRangeDays(days);setZone(schedule.timezone);failures.clear();callback.current(schedule);
      } catch (error) {
        if (version === generation.current) failures.show(error, {read: true, target: null, retry: read});
      }
    };
    void read();
    return () => {++generation.current;};
  }, [serialized,days,rangeFrom]);
  const name = (id: string | null) => state.members.find(person => person.id === id)?.name ?? 'Nobody on call';
  const [open, setOpen] = useState(false), [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 761px)').matches);
  useEffect(()=>{const media=window.matchMedia('(min-width: 761px)');const change=()=>setWide(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  const content=<div><FailureLine failure={schedule ? failures.failure : null}/>{schedule && windows.length ? <><p className="oc-quiet">{zone.replaceAll('_', ' ')}</p><p>{new Date(windows[0].at).toISOString()} · {rangeDays} elapsed days</p><p>{windows.length} resolved spans. Showing the first {Math.min(80,windows.length)}; gaps are listed first below.</p><details><summary>All gaps</summary><ul tabIndex={0} aria-label="Coverage gaps">{windows.filter(value=>!value.primary||!value.backup).map(value=><li key={value.at}>{shortTime(value.at,zone)} · {!value.primary?'Primary gap':'Backup gap'}</li>)}</ul></details><ol tabIndex={0} aria-label="Resolved coverage spans">{windows.slice(0,80).map(value => <li key={value.at}><time dateTime={new Date(value.at).toISOString()}>{shortTime(value.at, zone)}</time><p><strong>{name(value.primary)}</strong></p><p>Backup · {name(value.backup)}</p>{value.windows.map(window=><p className="oc-rule-explanation" key={window.role}>{window.explanation??value.warnings.filter(w=>w.startsWith(window.role+':')).join('; ')}</p>)}{(!value.primary || !value.backup) && <p>⚠ Coverage gap</p>}</li>)}</ol></> : (!schedule || !failures.failure) && <p>{!schedule ? 'Check the rota answers to see coverage.' : !schedule.service || !schedule.primary.members.length ? 'Choose the service, people and hand-over to see coverage.' : 'Loading coverage…'}</p>}</div>;
  return wide ? <aside className="oc-preview oc-card" aria-label="Preview coverage"><h2>Preview coverage</h2>{content}</aside> : <details className="oc-preview oc-card" open={open} onToggle={event=>setOpen(event.currentTarget.open)}><summary>Preview coverage</summary>{content}</details>;
}
