import {useEffect, useState} from 'react';
import {shortTime} from '../reviews/time';
import type {Service, State} from '../family/response-operations/domain';
import type {ResponsePolicy as PublishedPolicy} from './types';
import type {IntakeRun} from '../intake/CompatibleTest';
import {request} from '../useWorkspace';
import {autosaveRequest, useAutosave} from '../app/autosave/useAutosave';
import {SaveFeedback} from '../app/autosave/SavedState';
import {ResponseFields, type ResponseDraft} from '../services/sections/ResponseSection';

const modeLabel = (mode: string) => mode === 'incident' ? 'Opens an incident' : 'Alert-only';
const snapshot = (policy?: PublishedPolicy) => ({revision: policy?.version ?? 0, values: {policy: {
  defaultMode: policy?.defaultMode ?? 'alert-only', recoveredNotice: policy?.recoveredNotice ?? 'silent', rules: policy?.rules ?? [],
} as ResponseDraft}});
export function ResponsePolicy({service, state, admin, refresh}: {service: Service; state: State; admin: boolean; busy: boolean; run: IntakeRun; refresh?: () => Promise<void>}) {
  const [history, setHistory] = useState(service.responsePolicies ?? []);
  const accept = (policies: PublishedPolicy[]) => setHistory(previous => (policies.at(-1)?.version ?? 0) >= (previous.at(-1)?.version ?? 0) ? policies : previous);
  useEffect(() => {accept(service.responsePolicies ?? []);}, [service.responsePolicies]);
  const current = history.at(-1), applied = snapshot(current);
  const save = useAutosave({storageKey: admin ? 'response:' + service.id : undefined, keepSaved: true, snapshot: applied,
    read: async () => {
      const latest: State = await request('/api/state');
      const found = latest.services.find(row => row.id === service.id);
      if (!found) throw Error('This service is no longer available.');
      accept(found.responsePolicies ?? []);
      return snapshot(found.responsePolicies?.at(-1));
    },
    write: async change => {
      const result: PublishedPolicy = await autosaveRequest('/api/response/services/' + encodeURIComponent(service.id), {
        baseVersion: change.revision, ...change.to, reason: 'Changed response settings',
      });
      setHistory(previous => [...previous.filter(policy => policy.version < result.version), result]);
      // The accepted policy is enough to show the applied value even if the
      // workspace refresh is unavailable after a successful write.
      void refresh?.().catch(() => {});
      return snapshot(result);
    },
  });
  const feedback = save.states.policy;
  return <details className="urgency-policy service-response"><summary>Response · {modeLabel(applied.values.policy.defaultMode)}</summary>
    <form onSubmit={event => event.preventDefault()}>
      <ResponseFields value={admin ? save.values.policy : applied.values.policy} change={value => {if (admin) save.change('policy', value, 'choice');}} state={state} service={service} readOnly={!admin}/>
      {admin && <>
        {save.pending && <p role="status">Not in effect yet. {feedback?.status === 'pending' ? 'Saving…' : 'Retry to apply your change.'}</p>}
        {!save.pending && feedback?.status === 'saved' && <p role="status">Saved. {current?.rules.length ? `Your response rules now apply to new alerts for ${service.name}.` : applied.values.policy.defaultMode === 'incident' ? `New alerts for ${service.name} now open an incident.` : `New alerts for ${service.name} now stay alert-only.`}</p>}
        <SaveFeedback state={feedback} retry={() => save.retry('policy')} useMine={() => save.useMine('policy')} format={value => modeLabel((value as ResponseDraft).defaultMode)}/>
      </>}
    </form>
    <details className="service-policy-history"><summary>Response history ({history.length})</summary>
      {history.slice().reverse().map(policy => <article key={policy.version}><h4>Version {policy.version} · {modeLabel(policy.defaultMode)}</h4><p>{policy.reason}</p><p>{shortTime(policy.at)} · Changed by {state.members.find(member => member.id === policy.by)?.name ?? 'Former member'}</p><ResponseFields value={policy} change={() => {}} state={state} service={service} readOnly/></article>)}
      {!current && <p>New alerts stay alert-only until you change the default response or add a response rule.</p>}
    </details>
  </details>;
}
