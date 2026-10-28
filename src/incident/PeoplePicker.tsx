import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {SavedState, SaveFeedback} from '../app/autosave/SavedState';
import {Tooltip} from '../app/Tooltip';
import {savedResponseValue, useIncidentValues} from './useIncidentValues';
import type {IncidentProps} from './types';

export function PeoplePicker(props: IncidentProps & {field: 'commander' | 'assignee'; label: string}) {
  const {field, label} = props;
  const save = useIncidentValues(props, [field]);
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [position, setPosition] = useState({left: 0, top: 0});
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const people = props.state.members.filter(member => member.active && !member.machine && ['admin', 'responder'].includes(member.role)).sort((a, b) => Number(b.id === props.actor.id) - Number(a.id === props.actor.id) || a.name.localeCompare(b.name));
  const options = [...people.map(member => ({id: member.id, label: member.id === props.actor.id ? 'Me · ' + member.name : member.name})), {id: '', label: 'Unassigned'}];
  const value = save.values[field];
  const close = () => {setOpen(false); button.current?.focus({preventScroll: true});};
  useEffect(() => {
    if (!open) return;
    const node = dialog.current!;
    node.showModal();
    node.querySelector<HTMLButtonElement>('[role=option]')?.focus();
    const cancel = (event: Event) => {event.preventDefault(); close();};
    node.addEventListener('cancel', cancel);
    return () => {node.removeEventListener('cancel', cancel); node.close();};
  }, [open]);
  return <div className="incident-person">
    <button ref={button} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${props.state.members.find(member => member.id === value)?.name ?? 'Unassigned'}`} disabled={!props.canEdit} onClick={() => {
      const box = button.current!.getBoundingClientRect();
      setPosition({left: Math.max(16, Math.min(box.left, innerWidth - 336)), top: Math.min(box.bottom + 6, innerHeight - 360)});
      setOpen(true);setAnswer('');
    }}><span className="incident-person-label">{label}</span> {props.state.members.find(member => member.id === value)?.name ?? 'Unassigned'} ▾</button>
    <SavedState state={answer ? undefined : save.states[field]} />
    <SaveFeedback state={save.states[field]} retry={() => save.retry(field)} useMine={() => save.useMine(field)} format={id => props.state.members.find(member => member.id === savedResponseValue(id))?.name ?? 'Unassigned'} />
    {answer && <p role="status">{answer}</p>}
    {open && createPortal(<dialog ref={dialog} className="incident-people-dialog" aria-label={`Choose ${label.toLowerCase()}`} style={{left: position.left, top: position.top}} onClick={event => {if (event.target === event.currentTarget) close();}}>
      <div className="incident-sheet-head"><h2>{label}</h2><Tooltip label="Close picker" dismissOnEscape><button type="button" className="incident-icon" aria-label="Close picker" onClick={close}>×</button></Tooltip></div>
      <div role="listbox" aria-label={label} onKeyDown={event => {
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=option]'));
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : event.key === 'ArrowUp' ? (index + buttons.length - 1) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
        if (next >= 0) {event.preventDefault(); buttons[next].focus();}
      }}>{options.map(person => <button role="option" aria-selected={person.id === value} key={person.id} onClick={() => {
        if (person.id === value) setAnswer('Nothing to change');
        else {setAnswer('');save.change(field, person.id, 'choice');}
        close();
      }}>{person.label}</button>)}</div>
    </dialog>, document.body)}
  </div>;
}
