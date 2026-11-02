import {useState} from 'react';
import {deadlineActor} from '../incident-deadlines/model';
import {NoteBox} from './NoteBox';
import {memberName, shortTime, timelineText, type IncidentProps} from './types';

export function Timeline({incident, state, canEdit, busy, mutate}: IncidentProps) {
  const [earlier, setEarlier] = useState(false);
  const entries = incident.timeline;
  const shown = earlier ? entries : entries.slice(-3);
  return <section className="timeline incident-timeline" aria-label="Timeline">
    <h3>Timeline</h3>
    <ol className="events">{shown.map(entry => <li className="event" key={entry.id}>
      <span className="event-symbol" aria-hidden />
      <div><div className="event-line"><strong>{entry.kind.replaceAll('-', ' ')}</strong><time dateTime={entry.at}>{shortTime(entry.at)}</time></div>
        <p>{timelineText(entry, state)}</p>
        {entry.lifecycle?.member !== undefined && <p className="named-responder">Named responder: <strong>{entry.lifecycle.member === null ? 'Erased member' : memberName(state, entry.lifecycle.member)}</strong></p>}
        <small>{entry.metadata?.agent?.label ?? (entry.actor === deadlineActor ? 'Deadline scheduler' : memberName(state, entry.actor))}</small>
        {!!entry.metadata?.agent?.approvers?.length && <p className="named-responder">Approved by: {entry.metadata.agent.approvers.map(person => person.name).join(', ')}</p>}
      </div>
    </li>)}</ol>
    {entries.length > 3 && <button className="quiet" aria-expanded={earlier} onClick={() => setEarlier(!earlier)}>{earlier ? 'Show recent entries' : `Earlier entries (${entries.length - 3})`}</button>}
    {canEdit && <NoteBox busy={busy} mutate={mutate} />}
  </section>;
}
