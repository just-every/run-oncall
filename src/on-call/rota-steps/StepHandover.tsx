import {RotaField} from '../Field';
import {zoneName} from '../time';
import {zoneList} from './draft';
import type {StepProps} from './StepService';
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function StepHandover({draft, update}: StepProps) {
  const custom = draft.customEvery ?? ![1,7,14].includes(draft.every);
  const weekday = new Date(draft.starts + 'T12:00Z').getUTCDay();
  return <><h2>Hand-over</h2><RotaField label={<>Time zone</>}><select value={draft.zone} onChange={event => update({zone: event.target.value})}>{zoneList().map(zone => <option key={zone} value={zone}>{zone === 'UTC' ? 'UTC' : zoneName(zone) + ' (' + zone.split('/')[0] + ')'}</option>)}</select></RotaField>
    <RotaField label={<>Starts</>}><input type="date" required value={draft.starts} onChange={event => update({starts: event.target.value})}/></RotaField>
    <div className="oc-fields"><RotaField label={<>Every</>}><select value={custom ? 'custom' : draft.every} onChange={event => update({customEvery: event.target.value === 'custom', every: event.target.value === 'custom' ? 2 : Number(event.target.value)})}><option value="7">Week</option><option value="1">Day</option><option value="14">Two weeks</option><option value="custom">Number of days</option></select></RotaField>
    {custom && <RotaField label={<>Number of days</>}><input required type="number" min={1} max={366} value={draft.every} onChange={event => update({every: Number(event.target.value)})}/></RotaField>}
    <RotaField label={<>On</>}><select value={Number.isNaN(weekday) ? 1 : weekday} onChange={event => {const date = new Date(draft.starts + 'T12:00Z');date.setUTCDate(date.getUTCDate() + Number(event.target.value) - weekday);update({starts: date.toISOString().slice(0,10)});}}>{weekdays.map((day,index) => <option key={day} value={index}>{day}</option>)}</select></RotaField>
    <RotaField label={<>At</>}><input required type="time" value={draft.time} onChange={event => update({time: event.target.value})}/></RotaField></div>
  </>;
}
