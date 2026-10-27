import {useState} from 'react';
import {deadlineActor} from '../incident-deadlines/model';
import {NoteBox} from './NoteBox';
import {memberName, shortTime, type IncidentProps} from './types';

export function Timeline({incident, state, canEdit, busy, mutate}: IncidentProps) {
  const [earlier, setEarlier] = useState(false);
  const entries = incident.timeline;
  const shown = earlier ? entries : entries.slice(-3);
  return <section className="timeline incident-timeline" aria-label="Timeline">
    <h3>Timeline</h3>
    <ol className="events">{shown.map(entry => <li className="event" key={entry.id}>
      <span className="event-symbol" aria-hidden>●</span>
      <div><div className="event-line"><strong>{entry.kind.replaceAll('-', ' ')}</strong><time dateTime={entry.at}>{shortTime(entry.at)}</time></div>
        <p>{entry.kind === 'manual-page' && incident.manualPage ? `Incident declared for coordination with ${incident.manualPage.obligations.map(obligation => state.members.find(member => member.id === obligation.target.id)?.name ?? state.services.find(service => service.id === obligation.target.id)?.name ?? 'the service team').join(', ')}.` : entry.text}</p>
        {entry.lifecycle?.member !== undefined && <p>Named responder: {memberName(state, entry.lifecycle.member)}</p>}
        <small>{entry.actor === deadlineActor ? 'Deadline scheduler' : memberName(state, entry.actor)}</small>
      </div>
    </li>)}</ol>
    {entries.length > 3 && <button className="quiet" aria-expanded={earlier} onClick={() => setEarlier(!earlier)}>{earlier ? 'Show recent entries' : `Earlier entries (${entries.length - 3})`}</button>}
    {canEdit && <NoteBox busy={busy} mutate={mutate} />}
  </section>;
}
