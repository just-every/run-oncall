import type {Incident,State} from '../family/response-operations/domain';
import type {IncidentDeadline} from './types';
import {shortTime} from '../reviews/time';
export const missedAcknowledgment=(incident:Incident)=>incident.deadlines?.find(d=>d.kind==='initial-acknowledgment'&&d.state==='fired');
export function acknowledgmentStatus(deadline:IncidentDeadline,state:State) {
 if(deadline.state==='pending')return `Waiting for acknowledgment · due ${shortTime(deadline.dueAt)}. This timer texts nobody.`;
 const target=deadline.obligation?.target.id;
 const coverage=target?`${state.members.find(m=>m.id===target)?.name??'An unavailable responder'} was on call`:'No one was on call';
 return `Not acknowledged in time · missed at ${shortTime(deadline.dueAt)}. ${coverage}. This timer texts nobody.`;
}
export function AcknowledgmentStatus({incident,state}:{incident:Incident;state:State}) {
 const deadline=incident.deadlines?.find(d=>d.kind==='initial-acknowledgment'&&['pending','fired'].includes(d.state));
 return deadline?<p role="status">{acknowledgmentStatus(deadline,state)}</p>:null;
}
export function MissedAcknowledgments({state,openOnly=false}:{state:State;openOnly?:boolean}) {
 const incidents=state.incidents.filter(i=>!i.mergedInto&&(!openOnly||i.state!=='resolved')&&missedAcknowledgment(i));
 if(!incidents.length)return null;
 return <section className="panel padded" aria-label="Missed acknowledgments"><h2>Missed acknowledgments</h2><ul className="review-work-list">{incidents.map(incident=><li key={incident.id}><a href={'/incidents/'+encodeURIComponent(incident.id)}>{incident.title}</a><AcknowledgmentStatus incident={incident} state={state}/></li>)}</ul></section>;
}
