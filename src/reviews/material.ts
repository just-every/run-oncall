import {fail,type State,type Incident} from '../family/response-operations/domain.ts';
import {recentChanges} from '../changes/model.ts';
import {responseReport} from './report.ts';
export function reviewMaterial(state:State,id:string,at=new Date().toISOString()){
 const incident=state.incidents.find(i=>i.id===id);if(!incident)fail('Unknown incident',404);
 const report=responseReport(state,{from:incident.createdAt,to:new Date(Date.parse(incident.createdAt)+1).toISOString()},at);
 const observations=incident.alerts.flatMap(id=>{const alert=state.alerts.find(a=>a.id===id)!;return alert.events.map(id=>state.events.find(e=>e.id===id)!)}).map(event=>({id:event.id,at:event.observedAt,acceptedAt:event.acceptedAt,source:event.source,eventId:event.eventId,intent:event.intent,title:event.title,evidence:event.evidence,classification:'reported source observation'}));
 return {incident:id,incidentRevision:incident.revision,workspaceRevision:state.revision,generatedAt:at,title:incident.title,
  notice:'Generated from retained records. It does not establish cause, impact or recovery. Human acceptance is separate.',
  response:report.incidents.find(i=>i.id===id),
  observations,assertions:incident.timeline.map(entry=>({...entry,actorName:entry.preparedBy?.label??state.members.find(m=>m.id===entry.actor)?.name??entry.actor,classification:entry.preparedBy?'agent assertion':'human assertion'})),
  changes:recentChanges(state,incident.service,incident.createdAt,24).items,
  followups:[...incident.actions].sort((a,b)=>Number(a.done)-Number(b.done)||(a.priority??'P2').localeCompare(b.priority??'P2')||a.due.localeCompare(b.due)),
  accepted:incident.reviewAcceptance??null,review:incident.review,
  missing:['Real delivery/acknowledgement telemetry','Agent hypotheses','Chat/bridge context','Remote issue state','Automatic reminders and overdue escalation'],
 };
}
