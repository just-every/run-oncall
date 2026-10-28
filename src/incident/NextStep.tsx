import {useState} from 'react';
import {Field, Form} from '../forms';
import type {IncidentProps} from './types';

const labels: Record<string, string> = {acknowledged: 'Acknowledge', mitigating: 'Mark mitigating', recovered: 'Mark recovered', resolved: 'Resolve'};
const allowed: Record<string, string[]> = {declared: ['acknowledged'], acknowledged: ['mitigating', 'recovered'], mitigating: ['recovered'], recovered: ['resolved', 'mitigating'], resolved: []};
export function NextStep({incident, canEdit, busy, mutate}: IncidentProps) {
  const [asking, setAsking] = useState('');
  const [other, setOther] = useState(false);
  const steps = allowed[incident.state];
  if (!canEdit || !steps.length) return incident.recovery ? <p><a href={incident.recovery} target="_blank" rel="noreferrer">Recovery evidence</a></p> : null;
  const act = async (state: string) => {
    setOther(false);
    if (state === 'recovered' || state === 'resolved') {setAsking(state); return;}
    if (await mutate({type: 'transition', state, summary: labels[state]})) setAsking('');
  };
  return <section className="incident-next" aria-label="Next step">
    {!asking && <div className="incident-step-buttons"><button className="primary" disabled={busy} onClick={() => act(steps[0])}>{labels[steps[0]]}</button>
      {steps.length > 1 && <button aria-expanded={other} onClick={() => setOther(!other)}>Other steps ▾</button>}
    </div>}
    {other && <div className="incident-other-steps">{steps.slice(1).map(step => <button key={step} disabled={busy} onClick={() => act(step)}>{labels[step]}</button>)}</div>}
    {asking && <div className="incident-step-confirm"><Form busy={busy} label={labels[asking]} onSubmit={async data => {
      const result = await mutate({...data, type: 'transition', state: asking, summary: asking === 'resolved' ? data.summary : 'Recovery evidenced'});
      if (result) setAsking('');
      return result;
    }}>
      {asking === 'resolved' && <Field name="summary" label="Resolution summary" type="textarea" />}
      {asking === 'recovered' ? <Field name="evidence" label="Recovery evidence URL" type="url" value={incident.recovery} /> : <label className="field"><span>Recovery evidence URL</span><input name="evidence" type="url" value={incident.recovery} readOnly required /></label>}
    </Form><button className="quiet" onClick={() => setAsking('')}>Keep current state</button></div>}
  </section>;
}
