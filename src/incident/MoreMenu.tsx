import {useEffect, useRef} from 'react';
import {ActionSheet} from './more/ActionSheet';

export const incidentActions = [
  ['followups', 'Follow-ups'], ['people', 'People and priority'], ['responders', 'Request responders'],
  ['snooze', 'Snooze'], ['merge', 'Merge related incidents'], ['split', 'Split alerts into a new incident'],
  ['test', 'Send test page'], ['handoff', 'Handoff draft'], ['changes', 'Recent changes'], ['context', 'Service context'],
] as const;
export type IncidentAction = typeof incidentActions[number][0];
export function MoreMenu({demo, canEdit, choose, close}: {demo: boolean; canEdit: boolean; choose: (action: IncidentAction) => void; close: () => void}) {
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {menu.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus();}, []);
  const actions = incidentActions.filter(([id]) => (id !== 'test' || demo && canEdit) && (canEdit || !['snooze', 'merge', 'split', 'test'].includes(id)));
  return <ActionSheet title="Incident actions" menu close={close}>
    <div ref={menu} role="menu" aria-label="Incident actions" className="incident-action-list" onKeyDown={event => {
      const buttons = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('[role=menuitem]'));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : event.key === 'ArrowUp' ? (index + buttons.length - 1) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
      if (next >= 0) {event.preventDefault(); buttons[next].focus();}
    }}>
      {actions.map(([id, title]) => <button type="button" role="menuitem" key={id} onClick={() => choose(id)}>{title}</button>)}
    </div>
  </ActionSheet>;
}
