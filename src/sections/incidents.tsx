import {useLayoutEffect, useRef} from 'react';
import {IncidentTriage} from '../app/IncidentTriage';
import {WorkspaceNotFound} from '../app/NotFound';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
import {IncidentPage} from '../incident/IncidentPage';
import {Declare} from '../incident/Declare';
import '../incident/incident.css';

export function IncidentsSection() {
  const {w, page, selected, selectIncident, declare, setDeclare, listedRevision, setListedRevision, s, actor, canEdit, incident, name, command, mutate} = useWorkspaceContext();
  const listScroll = useRef(0), previous = useRef(selected);
  const open = (id: string) => {if (!selected) listScroll.current = window.scrollY;void selectIncident(id);};
  useLayoutEffect(() => {
    if (page === 'incidents' && !selected && previous.current) window.scrollTo({top: listScroll.current, behavior: 'instant'});
    previous.current = selected;
  }, [page, selected]);
  if (page !== 'incidents') return null;
  if (selected && !incident) return <WorkspaceNotFound incident />;
  const reminders = s.incidents.filter(item => item.state !== 'resolved' && !item.mergedInto && item.sourceRecovery?.reminder.state === 'recorded' && item.sourceRecovery.reminder.commander === actor.id);
  return <div className={'incident-board' + (selected ? ' has-incident' : '')}>
    <IncidentTriage onUpdated={setListedRevision} state={s} actor={actor} current={selected || undefined} select={open} busy={w.busy || listedRevision !== s.revision} run={w.run}>
      <div className="list-toolbar"><strong>Incidents</strong>{canEdit && <button className="primary" aria-label="Declare incident" onClick={() => setDeclare(!declare)}>Declare</button>}</div>
      {(declare || !s.incidents.length) && canEdit && <div className="inline-form"><h2>Declare incident</h2>
        {s.services.length ? <Declare state={s} busy={w.busy} submit={async data => {
          const result = await command(data);
          if (result) {listScroll.current = window.scrollY;setDeclare(false);await selectIncident(result.id);}
          return result;
        }} /> : <a href="/settings/services">Create a service first</a>}
      </div>}
      {!!reminders.length && <section aria-label="My commander reminders">
        {reminders.map(item => <div key={item.id}><button onClick={() => open(item.id)}>{item.title}</button><p>all alerts recovered — awaiting resolution · {name(item.sourceRecovery!.reminder.commander)}</p></div>)}
      </section>}
    </IncidentTriage>
    {selected && incident && <IncidentPage key={incident.id} incident={incident} state={s} actor={actor} canEdit={canEdit} busy={w.busy} demo={w.demo} command={command} mutate={mutate} refresh={w.refresh} />}
  </div>;
}
