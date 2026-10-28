import {useState} from 'react';
import type {Incident, State} from '../family/response-operations/domain';
import {Followups} from './Followups';
import {ResponseReport} from './ResponseReport';
import './work.css';
export type ReviewProps = {state:State;busy:boolean;canEdit:boolean;command:(data:any)=>Promise<any>;onOpenIncident:(id:string)=>void;onSaved?:(incident:Incident)=>void;draftScope:string};
export function ReviewsHome(props:ReviewProps) {
  const {state}=props;
  const [numbers,setNumbers]=useState(false);
  const pending=state.incidents.filter(incident=>incident.state==='resolved'&&!incident.reviewAcceptance&&!incident.mergedInto);
  const open=state.incidents.flatMap(incident=>incident.actions.filter(action=>!action.done).map(action=>({incident,action}))).sort((a,b)=>a.action.due.localeCompare(b.action.due)||a.action.title.localeCompare(b.action.title));
  return <div className="reviews-home">
    <section className="panel padded"><h2>Reviews to write</h2>{pending.length?<ul className="review-work-list">{pending.map(incident=><li key={incident.id}><a className="review-work-row" href={'/reviews/'+encodeURIComponent(incident.id)}><strong>{incident.title}</strong><span>{state.services.find(s=>s.id===incident.service)?.name} · {incident.review?'Draft started':'Ready for review'}</span></a></li>)}</ul>:<p>No reviews waiting.</p>}
      {!!state.incidents.some(i=>i.reviewAcceptance)&&<details><summary>Accepted reviews</summary>{state.incidents.filter(i=>i.reviewAcceptance).map(i=><a className="review-work-row" key={i.id} href={'/reviews/'+encodeURIComponent(i.id)}>{i.title}</a>)}</details>}
    </section>
    <section className="panel padded"><h2>Follow-ups due</h2><p className="review-meta">End of day UTC</p>{!open.length&&<p>No follow-ups due.</p>}
      {open.map(({incident,action})=><Followups key={action.id} {...props} incident={incident} members={state.members} onlyAction={action.id} compact zone="UTC" mutate={data=>props.command({...data,incident:incident.id,revision:incident.revision})}/>)}
    </section>
    <details className="panel padded response-numbers" open={numbers} onToggle={e=>setNumbers(e.currentTarget.open)}><summary>Response numbers</summary>{numbers&&<ResponseReport state={state}/>}</details>
  </div>;
}
