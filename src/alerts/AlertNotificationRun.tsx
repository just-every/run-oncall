import type {Alert, State} from '../family/response-operations/domain';
import {onCallNotifications} from '../family/response-operations/on-call-notifications/read';
import type {OnCall} from '../on-call/read';
import {shortTime} from '../reviews/time';

const duration=(seconds:number)=>{
  const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),rest=seconds%60;
  return [hours&&`${hours} h`,minutes&&`${minutes} min`,rest&&`${rest} sec`].filter(Boolean).join(' ')||'0 min';
};
const statuses={waiting:'Waiting',due:'Due',answered:'Answered',closed:'Closed'};

export function AlertNotificationRun({alert,state,onCall}:{alert:Alert;state:State;onCall:OnCall|null}) {
  const run=onCallNotifications(state,{alert:alert.id}).runs[0];
  const rota=onCall?.rotas.find(rota=>rota.id===run?.policy.scheduleId);
  const assigned=run?.assignedTo??state.members.find(member=>member.id===(alert.coordination?.assignee??alert.owner));
  return <section className="alert-notifications" aria-labelledby="alert-notifications-heading">
    <h3 id="alert-notifications-heading">Who this alert goes to</h3>
    <p className="alert-assignment">Assigned to <strong>{assigned?.name??'Nobody'}</strong></p>
    {run?.assignedOnCall&&run.assignedOnCall.id!==assigned?.id&&<p>At the start: {run.assignedOnCall.name}</p>}
    {rota&&<p>Backup on rota now: <strong>{rota.now.backup?.name??'Nobody on call'}</strong> · <a href={'/on-call/'+encodeURIComponent(rota.id)}>{rota.name}</a></p>}
    {run&&!rota&&<p>Backup coverage is unavailable for this rota.</p>}
    <p>These steps are recorded. Oncall doesn't send them; your pager does.</p>
    {!run?<p>No notification run was recorded for this alert.</p>:<>
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
