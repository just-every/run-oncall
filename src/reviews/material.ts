import {fail,type State,type Entry} from '../family/response-operations/domain.ts';
import {recentChanges} from '../changes/model.ts';
import {responseReport} from './report.ts';
function reviewAssertion(state:State,entry:Entry){
 const attribution=entry.metadata?.agent,client=state.apiClients?.find(client=>client.id===entry.actor);
 // Native client custody is retained even when policy uses an agent principal.
 // A Business OAuth client is not an Oncall service account.
 const serviceAccount=attribution
  ? attribution.client===entry.actor&&attribution.agent.id===`oncall-client:${entry.actor}`
  : !!client;
 return {...entry,
  actorName:serviceAccount?(attribution?.agent.name??client?.name??entry.actor):attribution?.label??state.members.find(member=>member.id===entry.actor)?.name??entry.actor,
  classification:serviceAccount?'service account coordination record':attribution?'agent coordination record':entry.kind==='source-recovery'||entry.metadata?.event?'reported source observation':state.members.some(member=>member.id===entry.actor)?'human assertion':'native coordination record',
 };
}
export function reviewMaterial(state:State,id:string,at=new Date().toISOString()){
 const incident=state.incidents.find(i=>i.id===id);if(!incident)fail('Unknown incident',404);
 const report=responseReport(state,{from:incident.createdAt,to:new Date(Date.parse(incident.createdAt)+1).toISOString()},at);
 const observations=incident.alerts.flatMap(id=>{const alert=state.alerts.find(a=>a.id===id)!;return alert.events.map(id=>state.events.find(e=>e.id===id)!)}).map(event=>({id:event.id,at:event.observedAt,acceptedAt:event.acceptedAt,source:event.source,eventId:event.eventId,intent:event.intent,title:event.title,evidence:event.evidence,classification:'reported source observation'}));
 return {incident:id,incidentRevision:incident.revision,workspaceRevision:state.revision,generatedAt:at,title:incident.title,
  notice:'Generated from retained records. It does not establish cause, impact or recovery. Human acceptance is separate.',
  response:report.incidents.find(i=>i.id===id),
  observations,assertions:incident.timeline.map(entry=>reviewAssertion(state,entry)),
  changes:recentChanges(state,incident.service,incident.createdAt,24).items,
  followups:[...incident.actions].sort((a,b)=>Number(a.done)-Number(b.done)||(a.priority??'P2').localeCompare(b.priority??'P2')||a.due.localeCompare(b.due)),
  accepted:incident.reviewAcceptance??null,review:incident.review,
  missing:['Real delivery/acknowledgement telemetry','Agent hypotheses','Chat/bridge context','Remote issue state','Automatic reminders and overdue escalation'],
 };
}
