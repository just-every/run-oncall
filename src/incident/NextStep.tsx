import {useState} from 'react';
import {Field, Form} from '../forms';
import {ActionSheet} from './more/ActionSheet';
import type {IncidentProps} from './types';

export function Reopen({busy, mutate}: IncidentProps) {
  return <Form inlineValidation busy={busy} label="Reopen" onSubmit={data => mutate({type: 'reopen', reason: data.reason})}><Field name="reason" label="Why?" required={false} /></Form>;
}
export function NextStep(props: IncidentProps) {
  const {incident, canEdit, busy, mutate} = props;
  const [asking, setAsking] = useState(''), [other, setOther] = useState(false);
  const labels: Record<string, string> = {recovered: 'Mark recovered', resolved: 'Resolve', reopen: 'Reopen'};
  if (!canEdit) return incident.recovery ? <p><a className="incident-evidence-link" href={incident.recovery} target="_blank" rel="noreferrer">Recovery evidence</a></p> : null;
  const optional = incident.state === 'acknowledged' ? ['mitigating', 'recovered'] : incident.state === 'mitigating' ? ['recovered'] : incident.state === 'recovered' ? ['mitigating'] : [];
  return <section className="incident-next" aria-label="Next step">
    <div className="incident-step-buttons">
      {incident.state === 'declared' && <button className="primary" disabled={busy} onClick={() => mutate({type: 'transition', state: 'acknowledged', summary: 'Acknowledge'})}>Acknowledge</button>}
      <button className={incident.state === 'declared' ? '' : 'primary'} disabled={busy} onClick={() => setAsking(incident.state === 'resolved' ? 'reopen' : 'resolved')}>{incident.state === 'resolved' ? 'Reopen' : 'Resolve'}</button>
      {optional.length > 0 && <button aria-expanded={other} onClick={() => setOther(!other)}>Other steps ▾</button>}
    </div>
    {other && <div className="incident-other-steps">{optional.map(step => <div key={step}><button disabled={busy} onClick={async () => {
      setOther(false);
      if (step === 'recovered') setAsking(step);
      else await mutate({type: 'transition', state: step, summary: 'Mark mitigating'});
    }}>{step === 'mitigating' ? 'Mark mitigating' : labels[step]}</button><p>{step === 'mitigating' ? "Mitigating: customers are no longer affected but the cause isn’t fixed." : 'Recovered: the service is back.'}</p></div>)}</div>}
    {asking && <ActionSheet title={labels[asking]} close={() => setAsking('')}>
      <Form inlineValidation busy={busy} label={labels[asking]} onSubmit={async data => {
        const result = await mutate(asking === 'reopen' ? {type: 'reopen', reason: data.reason} : {...data, type: 'transition', state: asking, summary: asking === 'resolved' ? data.summary : 'Service is back', closeAlerts: data.closeAlerts === 'on', recoveredAt: data.recoveredAt ? new Date(data.recoveredAt).toISOString() : undefined});
        if (result) setAsking('');
        return result;
      }}>
        {asking === 'reopen' ? <Field name="reason" label="Why?" required={false} /> : <>
          {asking === 'resolved' && <Field name="summary" label="What fixed it?" />}
          <Field name="evidence" label={asking === 'resolved' ? 'Add a link' : 'Recovery evidence URL'} type="url" value={incident.recovery} required={false} />
          {asking === 'resolved' && <>
            {incident.alerts.length > 0 && <label className="workflow-choice"><input type="checkbox" name="closeAlerts" defaultChecked />Close the alert too</label>}
            {incident.state !== 'recovered' && <details><summary>Earlier recovery time</summary><Field name="recoveredAt" label="When was the service back?" type="datetime-local" required={false} /><p>Leave this empty to record recovery when you resolve.</p></details>}
          </>}
        </>}
      </Form>
    </ActionSheet>}
  </section>;
}
