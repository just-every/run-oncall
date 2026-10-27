import type {UrgencyDraft} from '../../urgency/types';
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function defaultUrgency(): UrgencyDraft {
  return {mode: 'severity', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, weekly: [1, 2, 3, 4, 5].map(day => ({day, start: '09:00', end: '17:00'})), holidays: [], inside: 'high', outside: 'low', reason: ''};
}
export function UrgencyFields({value, change, readOnly = false}: {value: UrgencyDraft; change: (value: UrgencyDraft) => void; readOnly?: boolean}) {
  if (readOnly) return <div className="service-readonly"><dl><dt>Urgency decision</dt><dd>{value.mode === 'support-hours' ? 'By support hours' : value.mode === 'severity' ? 'By severity' : value.mode === 'high' ? 'Always high' : 'Always low'}</dd><dt>Time zone</dt><dd>{value.timezone.replaceAll('_',' ')}</dd></dl>{value.mode === 'support-hours' && <><ul>{value.weekly.map((row,index) => <li key={index}>{days[row.day]} {row.start}–{row.end}</li>)}</ul><p>Inside: {value.inside} · Outside: {value.outside}</p>{value.holidays.length > 0 && <p>Holidays: {value.holidays.join(', ')}</p>}</>}</div>;
  const zones = Array.from(new Set([value.timezone, ...Intl.supportedValuesOf('timeZone')]));
  const window = (index: number, fields: Partial<UrgencyDraft['weekly'][number]>) => change({...value, weekly: value.weekly.map((row, n) => n === index ? {...row, ...fields} : row)});
  return <fieldset disabled={readOnly}>
    <label className="field">Urgency decision mode<select aria-label="Urgency decision mode" value={value.mode} onChange={event => change({...value, mode: event.target.value as UrgencyDraft['mode']})}><option value="severity">By severity</option><option value="high">Always high</option><option value="low">Always low</option><option value="support-hours">By support hours</option></select></label>
    {value.mode === 'support-hours' && <>
      <label className="field">Time zone<select aria-label="Time zone" value={value.timezone} onChange={event => change({...value, timezone: event.target.value})}>{zones.map(zone => <option key={zone} value={zone}>{zone.split('/').at(-1)!.replaceAll('_', ' ')}</option>)}</select></label>
      <fieldset><legend>Support hours</legend>{value.weekly.map((row, index) => <div key={index} className="urgency-window">
        <label className="field">Day {index + 1}<select aria-label={'Day ' + (index + 1)} value={row.day} onChange={event => window(index, {day: Number(event.target.value)})}>{days.map((day, n) => <option key={day} value={n}>{day}</option>)}</select></label>
        <div className="urgency-fields"><label className="field">Starts {index + 1}<input type="time" required value={row.start} onChange={event => window(index, {start: event.target.value})}/></label><label className="field">Ends {index + 1}<input required value={row.end} pattern="([01][0-9]|2[0-3]):[0-5][0-9]|24:00" onChange={event => window(index, {end: event.target.value})}/></label></div>
        {!readOnly && <button type="button" onClick={() => change({...value, weekly: value.weekly.filter((_, n) => n !== index)})}>Remove hours {index + 1}</button>}
      </div>)}{!readOnly && <button type="button" onClick={() => change({...value, weekly: [...value.weekly, {day: 1, start: '09:00', end: '17:00'}]})}>Add support hours</button>}</fieldset>
      <div className="urgency-fields"><label className="field">Inside support hours<select aria-label="Inside support hours" value={value.inside} onChange={event => change({...value, inside: event.target.value as UrgencyDraft['inside']})}><option value="high">High</option><option value="low">Low</option></select></label><label className="field">Outside support hours<select aria-label="Outside support hours" value={value.outside} onChange={event => change({...value, outside: event.target.value as UrgencyDraft['outside']})}><option value="low">Low</option><option value="high">High</option></select></label></div>
      <label className="field">Holiday dates (one per line)<textarea aria-label="Holiday dates (one per line)" rows={3} value={value.holidays.join('\n')} placeholder="2026-12-25" onChange={event => change({...value, holidays: event.target.value.split('\n')})}/></label>
    </>}
  </fieldset>;
}
