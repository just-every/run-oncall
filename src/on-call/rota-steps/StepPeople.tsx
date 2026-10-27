import {RotaField} from '../Field';
import {Tooltip} from '../../app/Tooltip';
import {nextBackup} from './draft';
import type {StepProps} from './StepService';
export function StepPeople({draft, update, state}: StepProps) {
  const people = state.members.filter(person => person.active && ['admin', 'responder'].includes(person.role));
  const list = (role: 'primary' | 'backup') => {
    const ids = draft[role], change = (value: string[]) => update({[role]: value});
    return <div className="oc-people-list">{ids.map((id, index) => <div className="oc-person" key={index} role="group" aria-label={`${role === 'primary' ? 'Primary' : 'Backup'} person ${index + 1}`}>
      <RotaField label={<>{role === 'primary' ? 'Primary' : 'Backup'} person {index + 1}</>}>{people.length > 1 ? <select aria-label={`${role === 'primary' ? 'Primary' : 'Backup'} person ${index + 1}`} value={id} onChange={event => change(ids.map((value, slot) => slot === index ? event.target.value : value))}>{people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}{!people.some(person => person.id === id) && <option value={id}>{state.members.find(person => person.id === id)?.name ?? 'Unavailable person'}</option>}</select> : <span>{people[0]?.name ?? 'Nobody on call'}</span>}</RotaField>
      <div className="oc-person-actions">{([-1, 1] as const).map(direction => {const label = `Move ${role} ${index + 1} ${direction === -1 ? 'up' : 'down'}`;return <Tooltip key={direction} label={label}><button type="button" aria-label={label} disabled={index + direction < 0 || index + direction >= ids.length} onClick={() => {const next = [...ids];[next[index], next[index + direction]] = [next[index + direction], next[index]];change(next);}}>{direction === -1 ? '↑' : '↓'}</button></Tooltip>;})}<Tooltip label="Remove person"><button type="button" aria-label="Remove person" onClick={() => change(ids.filter((_, slot) => slot !== index))}>×</button></Tooltip></div>
    </div>)}<button type="button" disabled={!people.length} onClick={() => change([...ids, (people.find(person => !ids.includes(person.id)) ?? people[0]).id])}>Add {role === 'backup' ? 'backup ' : ''}person</button></div>;
  };
  return <><h2>Who is on, in order</h2>{list('primary')}<p>Backup · {nextBackup(draft.primary).map(id => state.members.find(person => person.id === id)?.name ?? 'Unavailable person').join(' → ') || 'Nobody on call'}</p><details open={draft.differentBackup} onToggle={event => {const open = event.currentTarget.open;if (open !== draft.differentBackup) update({differentBackup: open, backup: open && !draft.backup.length ? nextBackup(draft.primary) : draft.backup});}}><summary>Different backup order</summary>{draft.differentBackup && list('backup')}</details></>;
}
