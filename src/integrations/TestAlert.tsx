import {useState} from 'react';
import {Field, Form} from '../forms';
import type {Alert, Service} from '../family/response-operations/domain';
import type {IntakeRun} from '../intake/CompatibleTest';
type Receipt = {alert: string | null; service: string; effect: string};
export function TestAlert({services, source, alerts = [], busy, run, advanced = false}: {services: Service[]; source?: string; alerts?: (Alert & {title?: string})[]; busy: boolean; run: IntakeRun; advanced?: boolean}) {
  const [service, setService] = useState(services[0]?.id ?? ''), [action, setAction] = useState('new'), [alert, setAlert] = useState(''), [result, setResult] = useState<Receipt | null>(null);
  const choices = alerts.filter(alert => alert.service === service && alert.state === 'active' && alert.coordination?.state !== 'closed');
  if (!services.length) return <p><a href="/settings/services">Add a service</a> to send a test alert.</p>;
  return <section className="test-alert" aria-label="Test alert">
    <Form busy={busy} inlineValidation label={action === 'close' ? 'Send test event' : 'Send a test alert'} onSubmit={async data => {
      const receipt = await run('/api/test-alert', {service, source, action, alert: alert || choices[0]?.id, title: data.title, severity: data.severity}, '');
      if (receipt) {setResult(receipt);setAction('new');setAlert('');}
      return false;
    }}>
      {services.length > 1 && <label className="field">Service<select aria-label="Test alert service" value={service} onChange={event => {setService(event.target.value);setAlert('');}}>{services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>}
      {advanced && <><Field name="title" label="Title" value="Service latency is above normal" /><Field name="severity" label="Severity" value="warning"><option value="warning">Warning</option><option value="critical">Critical</option><option value="info">Information</option></Field>
        <details><summary>More options</summary><label className="field">Test action<select aria-label="Test action" value={action} onChange={event => setAction(event.target.value)}><option value="new">Raise a new alert</option><option value="add" disabled={!choices.length}>Add to the open alert</option><option value="close" disabled={!choices.length}>Close the alert</option></select></label>
          {action !== 'new' && <label className="field">Open alert<select aria-label="Open alert" value={alert || choices[0]?.id || ''} onChange={event => setAlert(event.target.value)}>{choices.map(alert => <option key={alert.id} value={alert.id}>{alert.title ?? 'Sample alert'}</option>)}</select></label>}
        </details></>}
    </Form>
    <p>{action === 'close' ? 'Sends a recovery event to close the selected alert.' : action === 'add' ? 'Sends another sample event to the selected open alert.' : <>Raises a sample alert on {services.find(row => row.id === service)?.name}. Your service’s response policy applies.</>}</p>
    {result && <p role="status">{result.effect === 'New alert raised' ? `${advanced ? 'New alert raised' : 'Test alert raised'} on ${result.service}.` : result.effect + '.'} {result.alert && <a href={'/alerts/' + encodeURIComponent(result.alert)}>Open it</a>}</p>}
  </section>;
}
