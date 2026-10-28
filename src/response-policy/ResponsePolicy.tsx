import type {Service, State} from '../family/response-operations/domain';
import type {IntakeRun} from '../intake/CompatibleTest';
import {autosaveRequest} from '../app/autosave/useAutosave';
import {usePolicyDraft} from '../services/usePolicyDraft';
import {PolicyPublication} from '../services/PolicyPublication';
import {DraftComparison, DraftStorageFeedback} from '../services/DraftComparison';
import {ResponseFields, type ResponseDraft} from '../services/sections/ResponseSection';

const modeLabel = (mode: string) => mode === 'incident' ? 'Declare an incident' : 'Alert-only';
export function ResponsePolicy({service, state, admin, refresh}: {service: Service; state: State; admin: boolean; busy: boolean; run: IntakeRun; refresh?: () => Promise<void>}) {
  const current = service.responsePolicies?.at(-1), version = current?.version ?? 0;
  const saved: ResponseDraft = {defaultMode: current?.defaultMode ?? 'alert-only', recoveredNotice: current?.recoveredNotice ?? 'silent', rules: current?.rules ?? []};
  const draft = usePolicyDraft('response', service.id, version, saved, !!admin);
  return <details className="urgency-policy service-response"><summary>Response · version {version} · {modeLabel(saved.defaultMode)}</summary>
    <DraftComparison stale={draft.stale} baseVersion={draft.baseVersion} currentVersion={version} useMine={draft.useMine}><ResponseFields value={saved} change={() => {}} state={state} service={service} readOnly/></DraftComparison>
    <form onSubmit={event => event.preventDefault()}>
      <ResponseFields value={admin ? draft.value : saved} change={draft.change} state={state} service={service} readOnly={!admin}/>
      {admin && <PolicyPublication dirty={draft.dirty} stale={draft.stale} version={version + 1} publish={async reason => {
        const result = await autosaveRequest('/api/response/services/' + encodeURIComponent(service.id), {baseVersion: draft.baseVersion, ...draft.value, reason});
        await refresh?.(); draft.published(); return result;
      }}/>}
      <DraftStorageFeedback failed={draft.storageFailed} retry={draft.retryStorage}/>
    </form>
    <details className="service-policy-history"><summary>Response history ({service.responsePolicies?.length ?? 0})</summary>
      {service.responsePolicies?.slice().reverse().map(policy => <article key={policy.version}><h4>Version {policy.version} · {modeLabel(policy.defaultMode)}</h4><p>{policy.reason}</p><p>{new Date(policy.at).toLocaleDateString(undefined, {day:'numeric', month:'short'})} · {state.members.find(member => member.id === policy.by)?.name ?? 'Former member'}</p><ResponseFields value={policy} change={() => {}} state={state} service={service} readOnly/></article>)}
      {!current && <p>No published override. New alerts stay alert-only.</p>}
    </details>
  </details>;
}
