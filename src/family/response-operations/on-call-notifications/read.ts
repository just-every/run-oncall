import {fail,type State} from '../domain.ts';

// Stored run outcomes end with the claim "no sender, paging OFF", written before Oncall had a sender and kept as
// recorded. The sender and its pages are read from the SMS paging tables (sms-paging/run-pages.ts) instead.
const senderClaim = /;\s*(recorded only; )?no sender(, paging OFF)?$/;
const outcome = (text:string) => text.replace(senderClaim,'');
/** Viewer-or-above read of on-call assignment and notification records. What was texted is added by the API from oc_page_deliveries. */
export function onCallNotifications(state:State,query:{incident?:string;alert?:string},at=Date.now()) {
  const person = (id:string|null|undefined) => {
    if(!id)return null;
    const m = state.members.find(row=>row.id===id);
    return {id,name:m?.erased?'Erased member':m?.name??id};
  };
  if(query.incident!==undefined&&!state.incidents.some(i=>i.id===query.incident))fail('Unknown incident',404);
  if(query.alert!==undefined&&!state.alerts.some(a=>a.id===query.alert))fail('Unknown alert',404);
  const runs = state.alerts.filter(a=>a.onCall&&(query.alert===undefined||a.id===query.alert)&&(query.incident===undefined||
    a.onCall.incident===query.incident||state.incidents.some(i=>i.id===query.incident&&i.alerts.includes(a.id))))
    .map(a=>{
      const run = a.onCall!, incident = state.incidents.find(i=>i.id===run.incident) ?? state.incidents.find(i=>i.alerts.includes(a.id));
      const answered=run.state==='stopped'&&['Stopped: incident acknowledged','Stopped: alert acknowledged'].includes(run.outcome);
      const records=[...run.records].sort((x,y)=>x.step-y.step||x.dueAt.localeCompare(y.dueAt));
      return {alert:a.id,service:a.service,incident:incident?.id??null,assignedTo:person(a.coordination?.assignee??incident?.assignee??a.owner??run.assignee),assignedOnCall:person(run.assignee),
        status:answered?'answered' as const:run.state==='running'?'running' as const:'closed' as const,
        state:run.state,step:run.step,policy:run.policy,urgency:run.urgency,startedAt:run.startedAt,secondStepAt:run.secondStepAt,endsAt:run.endsAt,
        endedAt:run.endedAt,outcome:outcome(run.outcome),
        records:records.map((r,index)=>{
          const stepEndsAt=r.step===1?run.secondStepAt:run.endsAt;
          const next=records.slice(index+1).find(next=>next.step===r.step&&next.dueAt<stepEndsAt);
          return {id:r.id,step:r.step,person:person(r.member),contact:r.contact,rule:r.rule,dueAt:r.dueAt,recordedAt:r.recordedAt,
            status:answered?'answered' as const:run.state!=='running'||r.state==='stopped'?'closed' as const:r.state==='pending'&&Date.parse(r.dueAt)>at?'waiting' as const:'due' as const,
            next:next?'rule' as const:r.step===1&&run.policy.secondStep!=='none'?'step' as const:'end' as const,
            waitSeconds:Math.max(0,(Date.parse(next?.dueAt??stepEndsAt)-Date.parse(r.dueAt))/1000),
            state:r.state,outcome:outcome(r.outcome)};
        })};
    }).sort((x,y)=>y.startedAt.localeCompare(x.startedAt));
  return {runs};
}
