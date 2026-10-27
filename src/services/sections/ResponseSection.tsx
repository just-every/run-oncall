import {useId} from 'react';
import type {Service, State} from '../../family/response-operations/domain';
export type ResponseDraft = Pick<NonNullable<Service['responsePolicies']>[number], 'defaultMode' | 'recoveredNotice' | 'rules'>;
export function ResponseFields({value, change, state, service, readOnly = false}: {value: ResponseDraft; change: (value: ResponseDraft) => void; state: State; service: Service; readOnly?: boolean}) {
  const uid = useId();
  if (readOnly) return <div className="service-readonly"><dl><dt>Default response</dt><dd>{value.defaultMode === 'incident' ? 'Declare an incident' : 'Alert-only'}</dd><dt>On source recovery</dt><dd>{value.recoveredNotice === 'silent' ? 'Stop silently' : 'Notify previous recipients'}</dd></dl><ol>{value.rules.map(rule => <li key={rule.id}>{rule.urgency === '*' ? 'Any urgency' : rule.urgency} · {rule.severity === '*' ? 'Any severity' : rule.severity} · {rule.policy === '*' ? 'Any policy' : state.policies.find(policy => policy.id === rule.policy)?.reason ?? 'Previous policy'} → {rule.mode === 'incident' ? 'Declare an incident' : 'Alert-only'}</li>)}</ol></div>;
  const update = (index: number, fields: Partial<ResponseDraft['rules'][number]>) => change({...value, rules: value.rules.map((rule, n) => n === index ? {...rule, ...fields} : rule)});
  return <fieldset disabled={readOnly}>
    <label className="field"><span id={uid + '-default'}>Default response</span><select aria-labelledby={uid + '-default'} value={value.defaultMode} onChange={event => change({...value, defaultMode: event.target.value as ResponseDraft['defaultMode']})}><option value="alert-only">Alert-only</option><option value="incident">Declare an incident</option></select></label>
    <label className="field"><span id={uid + '-recovery'}>On source recovery</span><select aria-labelledby={uid + '-recovery'} value={value.recoveredNotice} onChange={event => change({...value, recoveredNotice: event.target.value as ResponseDraft['recoveredNotice']})}><option value="silent">Stop silently</option><option value="notified">Notify previous recipients</option></select></label>
    {value.rules.map((rule, index) => <fieldset key={rule.id}>
      <legend>Response rule {index + 1}</legend>
      <div className="urgency-fields">
        <label className="field"><span id={uid + '-urgency-' + index}>Rule urgency</span><select aria-labelledby={uid + '-urgency-' + index} value={rule.urgency} onChange={event => update(index, {urgency: event.target.value as typeof rule.urgency})}><option value="*">Any urgency</option><option value="high">High</option><option value="low">Low</option></select></label>
        <label className="field"><span id={uid + '-severity-' + index}>Rule severity</span><select aria-labelledby={uid + '-severity-' + index} value={rule.severity} onChange={event => update(index, {severity: event.target.value as typeof rule.severity})}><option value="*">Any severity</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Info</option></select></label>
      </div>
      <label className="field"><span id={uid + '-policy-' + index}>Rule orchestration policy</span><select aria-labelledby={uid + '-policy-' + index} value={rule.policy} onChange={event => update(index, {policy: event.target.value})}><option value="*">Any policy</option>{state.policies.filter(policy => policy.service === service.id).map(policy => <option key={policy.id} value={policy.id}>{policy.severity === '*' ? 'All severities' : policy.severity} · {state.members.find(member => member.id === policy.owner)?.name ?? 'Unassigned'}</option>)}</select></label>
      <label className="field"><span id={uid + '-response-' + index}>Rule response</span><select aria-labelledby={uid + '-response-' + index} value={rule.mode} onChange={event => update(index, {mode: event.target.value as typeof rule.mode})}><option value="alert-only">Alert-only</option><option value="incident">Declare an incident</option></select></label>
      {!readOnly && <button type="button" onClick={() => change({...value, rules: value.rules.filter((_, n) => n !== index)})}>Remove response rule {index + 1}</button>}
    </fieldset>)}
    {!readOnly && <button type="button" disabled={value.rules.length >= 20} onClick={() => change({...value, rules: [...value.rules, {id: crypto.randomUUID(), urgency: '*', severity: '*', policy: '*', mode: 'incident'}]})}>Add response rule</button>}
  </fieldset>;
}
