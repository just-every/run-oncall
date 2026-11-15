import {fail,type State} from '../domain.ts';

/** Viewer-or-above read of on-call assignment and notification records. Records only; nothing was sent. */
export function onCallNotifications(state:State,query:{incident?:string;alert?:string}) {
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
      return {alert:a.id,service:a.service,incident:incident?.id??null,assignedTo:person(incident?.assignee??null),assignedOnCall:person(run.assignee),
        state:run.state,step:run.step,policy:run.policy,urgency:run.urgency,startedAt:run.startedAt,secondStepAt:run.secondStepAt,endsAt:run.endsAt,
        endedAt:run.endedAt,outcome:run.outcome,paging:'OFF',sender:'none',
        records:run.records.map(r=>({id:r.id,step:r.step,person:person(r.member),contact:r.contact,rule:r.rule,dueAt:r.dueAt,recordedAt:r.recordedAt,
          state:r.state,sender:'none',label:'recorded / no sender / paging OFF',outcome:r.outcome}))};
    }).sort((x,y)=>y.startedAt.localeCompare(x.startedAt));
  return {paging:'OFF',sender:'none',label:'Recorded on-call notifications: no sender, nothing delivered',runs};
}
