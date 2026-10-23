import { useId, useState } from 'react';
import { Form } from '../forms';
import type { Service, State } from '../family/response-operations/domain';
import type { IntakeRun } from '../intake/CompatibleTest';

type Policy = NonNullable<Service['responsePolicies']>[number];
type Rule = Policy['rules'][number];
const modeLabel = (mode: Policy['defaultMode']) => mode === 'incident' ? 'Declare an incident' : 'Alert-only';

export function ResponsePolicy({service, state, admin, busy, run}: {service: Service; state: State; admin: boolean; busy: boolean; run: IntakeRun}) {
  const current = service.responsePolicies?.at(-1), uid = useId();
  const [base, setBase] = useState(current?.version ?? 0);
  const [defaultMode, setDefaultMode] = useState<Policy['defaultMode']>(current?.defaultMode ?? 'alert-only');
  const [recoveredNotice, setRecoveredNotice] = useState<Policy['recoveredNotice']>(current?.recoveredNotice ?? 'silent');
  const [rules, setRules] = useState<Rule[]>(current?.rules ?? []);
  const [reason, setReason] = useState('');
  const policies = state.policies.filter(policy => policy.service === service.id);
  const updateRule = (index: number, change: Partial<Rule>) => setRules(previous => previous.map((rule, n) => n === index ? {...rule, ...change} : rule));
  return <details className="urgency-policy">
    <summary>Response policy · v{current?.version ?? 0} · {modeLabel(current?.defaultMode ?? 'alert-only')}</summary>
    <p>Alert-only is the default. Rules are checked in order; the first matching rule decides whether a new alert declares an incident automatically. A human can declare an incident from a recovered alert.</p>
    <p>Current recovered notice: {current?.recoveredNotice === 'notified' ? 'Everyone already notified' : 'Stop silently'}.</p>
    {current && <p>Published reason: {current.reason}</p>}
    <p className="muted">Paging OFF. Recovery stops the recorded obligation. Recovered notices are non-automatic: no sender until OC-026. Commander reminders are non-automatic: no timer until OC-027. A declared incident still requires human recovery evidence and a resolution summary.</p>
    {admin && <Form busy={busy} label="Publish response policy" onSubmit={async () => {
      const published = await run('/api/response/services/' + encodeURIComponent(service.id), {baseVersion: base, defaultMode, recoveredNotice, rules, reason}, 'Response policy published');
      if (published) {setBase(published.version); setReason('');}
      return false;
    }}>
      {base !== (current?.version ?? 0) && <p role="alert">This draft is based on v{base}; the current policy is v{current?.version ?? 0}. Reload before publishing.</p>}
      <label className="field"><span id={uid + '-default'}>Default response</span><select aria-labelledby={uid + '-default'} value={defaultMode} onChange={event => setDefaultMode(event.target.value as Policy['defaultMode'])}><option value="alert-only">Alert-only</option><option value="incident">Declare an incident</option></select></label>
      <label className="field"><span id={uid + '-notice'}>On source recovery</span><select aria-labelledby={uid + '-notice'} value={recoveredNotice} onChange={event => setRecoveredNotice(event.target.value as Policy['recoveredNotice'])}><option value="silent">Stop silently</option><option value="notified">Recovered notice to everyone already notified</option></select></label>
      {rules.map((rule, index) => <fieldset key={index}>
        <legend>Response rule {index + 1}</legend>
        <label className="field">Rule ID<input required maxLength={100} value={rule.id} onChange={event => updateRule(index, {id: event.target.value})}/></label>
        <div className="urgency-fields">
          <label className="field"><span id={uid + '-urgency-' + index}>Rule urgency</span><select aria-labelledby={uid + '-urgency-' + index} value={rule.urgency} onChange={event => updateRule(index, {urgency: event.target.value as Rule['urgency']})}><option value="*">Any urgency</option><option value="high">High</option><option value="low">Low</option></select></label>
          <label className="field"><span id={uid + '-severity-' + index}>Rule severity</span><select aria-labelledby={uid + '-severity-' + index} value={rule.severity} onChange={event => updateRule(index, {severity: event.target.value as Rule['severity']})}><option value="*">Any severity</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Info</option></select></label>
        </div>
        <label className="field"><span id={uid + '-policy-' + index}>Rule orchestration policy</span><select aria-labelledby={uid + '-policy-' + index} value={rule.policy} onChange={event => updateRule(index, {policy: event.target.value})}><option value="*">Any orchestration policy</option>{policies.map(policy => <option key={policy.id} value={policy.id}>{policy.id} · v{policy.version} · {policy.reason}</option>)}</select></label>
        <label className="field"><span id={uid + '-mode-' + index}>Rule response</span><select aria-labelledby={uid + '-mode-' + index} value={rule.mode} onChange={event => updateRule(index, {mode: event.target.value as Rule['mode']})}><option value="alert-only">Alert-only</option><option value="incident">Declare an incident</option></select></label>
        <button type="button" onClick={() => setRules(previous => previous.filter((_, n) => n !== index))}>Remove response rule {index + 1}</button>
      </fieldset>)}
      <button type="button" disabled={rules.length >= 20} onClick={() => setRules(previous => [...previous, {id: '', urgency: '*', severity: '*', policy: '*', mode: 'incident'}])}>Add response rule</button>
      <label className="field">Response policy reason<textarea required maxLength={500} value={reason} onChange={event => setReason(event.target.value)}/></label>
    </Form>}
    <details><summary>Response policy history ({service.responsePolicies?.length ?? 0})</summary>
      {service.responsePolicies?.slice().reverse().map(policy => <article key={policy.version}><h4>v{policy.version} · {modeLabel(policy.defaultMode)}</h4><p>{policy.reason}</p><p>{new Date(policy.at).toLocaleString()} · {state.members.find(member => member.id === policy.by)?.name ?? policy.by}</p><p>Recovery: {policy.recoveredNotice === 'silent' ? 'Stop silently' : 'Recovered notice to everyone already notified'}</p><ol>{policy.rules.map(rule => <li key={rule.id}>{rule.id}: urgency {rule.urgency}, severity {rule.severity}, orchestration {rule.policy} → {modeLabel(rule.mode)}</li>)}</ol></article>)}
      {!current && <p>No published override. v0: alert-only and silent recovery.</p>}
    </details>
  </details>;
}
