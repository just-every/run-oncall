import type {Alert, State} from '../family/response-operations/domain';
import {onCallNotifications} from '../family/response-operations/on-call-notifications/read';
import type {OnCall} from '../on-call/read';
import {shortTime} from '../reviews/time';
import {PageLog} from '../sms-paging/PageLog';
import {useState} from 'react';

const duration=(seconds:number)=>{
  const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),rest=seconds%60;
  return [hours&&`${hours} h`,minutes&&`${minutes} min`,rest&&`${rest} sec`].filter(Boolean).join(' ')||'0 min';
};
const statuses={waiting:'Waiting',due:'Due',answered:'Answered',closed:'Closed'};

export function AlertNotificationRun({alert,state,onCall,unmatched}:{alert:Alert;state:State;onCall:OnCall|null;unmatched:boolean}) {
  const run=onCallNotifications(state,{alert:alert.id}).runs[0], [pages,setPages]=useState(0);
  const rota=onCall?.rotas.find(rota=>rota.id===run?.policy.scheduleId);
  const serviceRotas=onCall?.rotas.filter(rota=>rota.service.id===alert.service)??[];
  const rotaPath=serviceRotas.length===1?'/on-call/'+encodeURIComponent(serviceRotas[0].id):'/on-call';
  const assigned=run?.assignedTo??state.members.find(member=>member.id===(alert.coordination?alert.coordination.assignee:alert.owner));
  const admission=state.events.find(event=>event.id===alert.events[0])?.decision;
  return <section className="alert-notifications" aria-labelledby="alert-notifications-heading">
    <h3 id="alert-notifications-heading">Who this alert goes to</h3>
    <p className="alert-assignment">Assigned to <strong>{assigned?.name??'Nobody'}</strong></p>
    {run?.assignedOnCall&&run.assignedOnCall.id!==assigned?.id&&<p>At the start: {run.assignedOnCall.name}</p>}
    {rota&&<p>Backup on rota now: <strong>{rota.now.backup?.name??'Nobody on call'}</strong> · <a href={'/on-call/'+encodeURIComponent(rota.id)}>{rota.name}</a></p>}
    {run&&!rota&&<p>Backup coverage is unavailable for this rota.</p>}
    {!run?<>
      {admission?.policy===null&&admission.action==='route'&&<p>{admission.reason}</p>}
      <p>No notification run was recorded for this alert.</p>
      {unmatched&&!assigned&&<>
        <p>No coordination rule matched when this alert arrived. To assign future alerts to a named responder, publish a <strong>Route to owner</strong> rule for this service and severity in <a href="/settings/routing#coordination-rules">Settings → Routing → Coordination rules</a>.</p>
        <p>Future alerts can go to the primary on call when the service’s rotas point to one available primary. Check the <a href={rotaPath}>rota</a>.</p>
      </>}
    </>:<>
      <p>{pages?'These steps are recorded. Pages Oncall sent by text message are listed below; the rest is your pager’s.':"These steps are recorded. Oncall doesn't send them; your pager does."}</p>
      <PageLog alert={alert.id} step={run.step} names={Object.fromEntries(state.members.map(member=>[member.id,member.name]))} onPages={setPages}/>
      {run.status==='answered'&&<p className="alert-run-outcome">Answered · The alert was acknowledged; later steps have stopped.</p>}
      {run.status==='closed'&&<p className="alert-run-outcome">Closed · {run.outcome}</p>}
      <ol className="alert-notification-rules" aria-label="Recorded notification steps">
        {run.records.map(record=><li key={record.id}>
          <div className="alert-notification-title"><strong>{record.person?.name??'Nobody on call'}{record.contact&&' · '+{email:'Email',phone:'Phone call',sms:'Text message'}[record.contact.type]}</strong><span className={'alert-notification-state is-'+record.status}>{statuses[record.status]}</span></div>
          {record.contact?<>
            <p>{record.contact.label} · {record.contact.type==='email'?record.contact.address:'+'+record.contact.countryCode+' '+record.contact.address}</p>
            <p>Step {record.step} · {record.rule!.delayMinutes===0?'At step start':duration(record.rule!.delayMinutes*60)+' into the step'} · <time dateTime={record.dueAt}>{shortTime(record.dueAt)}</time></p>
            <p>{record.waitSeconds===0?'No wait':`Wait ${duration(record.waitSeconds)}`} {record.next==='rule'?'before the next rule':record.next==='step'?'before step 2':'before the run ends'}.</p>
          </>:<p>{!record.person?'No responder was on call for this step.':record.person.name==='Erased member'?'This recipient was erased.':<>No notification rule matches this alert. <a href="/settings/team">Add one</a></>}</p>}
        </li>)}
      </ol>
      {run.status==='running'&&run.step===1&&run.policy.secondStep!=='none'&&<p>Step 2 uses the {run.policy.secondStep==='backup'?'backup':'primary'} on call {duration(run.policy.primaryWaitSeconds)} after assignment. Its rules are recorded when that step starts.</p>}
    </>}
  </section>;
}
