import type {Service, State} from '../family/response-operations/domain';
import type {IntakeRun} from '../intake/CompatibleTest';
import {autosaveRequest} from '../app/autosave/useAutosave';
import {usePolicyDraft} from '../services/usePolicyDraft';
import {PolicyPublication} from '../services/PolicyPublication';
import {DraftComparison, DraftStorageFeedback} from '../services/DraftComparison';
import {GroupingFields, groupingDraft} from '../services/sections/GroupingSection';
import {WorkflowFields, type WorkflowDraft} from '../services/sections/WorkflowSection';
type Props = {service: Service; state: State; busy: boolean; run: IntakeRun; refresh?: () => Promise<void>; admin?: boolean};
export function CorrelationSettings({service, state, refresh, admin = true}: Props) {
  const policy = state.policies.find(row => row.service === service.id && row.severity === '*'), version = policy?.version ?? 0;
  const saved = groupingDraft(service, state), draft = usePolicyDraft('grouping', service.id, version, saved, !!admin);
  return <details className="response-policy service-grouping"><summary>Grouping · version {version}</summary>
    <DraftComparison stale={draft.stale} baseVersion={draft.baseVersion} currentVersion={version} useMine={draft.useMine}><GroupingFields value={saved} change={() => {}} state={state} readOnly/></DraftComparison>
    <form onSubmit={event => event.preventDefault()}><GroupingFields value={admin ? draft.value : saved} change={draft.change} state={state} readOnly={!admin}/>
      {admin && <PolicyPublication dirty={draft.dirty} stale={draft.stale} version={version + 1} publish={async reason => {
        const value = draft.value;
        const result = await autosaveRequest('/api/command', {type:'policy',service:service.id,severity:'*',action:policy?.action ?? 'route',owner:value.owner,reason,baseVersion:draft.baseVersion,
          ...(policy?.suppressionWindow ? {suppressionWindow:policy.suppressionWindow} : {}),
          ...(policy?.transformation ? {transformation:policy.transformation} : {}),
          correlation:value.enabled ? {field:value.field,windowSeconds:value.seconds,includeDependencies:value.dependencies,flappingCount:value.flapping} : null});
        await refresh?.(); draft.published(); return result;
      }}/>}
      <DraftStorageFeedback failed={draft.storageFailed} retry={draft.retryStorage}/>
    </form>
    <PolicyHistory state={state} policy={policy?.id} label="Grouping history"/>
  </details>;
}
export function WorkflowSettings({service, state, refresh, admin = true}: Props) {
  const policy = state.policies.find(row => row.service === service.id && row.severity === '*'), version = policy?.version ?? 0;
  const saved: WorkflowDraft = {member:policy?.workflow?.member ?? service.owner, reason:policy?.workflow?.reason ?? 'Coordinate this alert'};
  const draft = usePolicyDraft('workflow', service.id, version, saved, !!admin);
  // Approval belongs to the workflow version; concurrency belongs to its service rule.
  const next = (policy?.workflow?.version ?? 0) + 1;
  return <details className="response-policy service-workflow"><summary>Approved workflows · version {policy?.workflow?.version ?? 0}</summary>
    {policy?.workflow?.held && <p>Approval is needed after restoring this workflow.</p>}
    {policy?.action === 'suppress' && <p>Change the service’s suppression rule in Settings › Routing before approving a workflow.</p>}
    <DraftComparison stale={draft.stale} baseVersion={draft.baseVersion} currentVersion={version} useMine={draft.useMine}><WorkflowFields value={saved} change={() => {}} state={state} readOnly/></DraftComparison>
    {!policy?.workflow && <p>No workflow approved.</p>}
    {admin && !draft.dirty && (!policy?.workflow || policy.workflow.held) && policy?.action !== 'suppress' && <button type="button" onClick={draft.begin}>{policy?.workflow?.held ? 'Review workflow' : 'Add workflow'}</button>}
    <form onSubmit={event => event.preventDefault()}>{(admin || policy?.workflow) && <WorkflowFields value={admin ? draft.value : saved} change={draft.change} state={state} readOnly={!admin || policy?.action === 'suppress'}/>}
      {admin && policy?.action !== 'suppress' && <PolicyPublication dirty={draft.dirty} stale={draft.stale} version={next} approve publish={async reason => {
        const result = await autosaveRequest('/api/command', {type:'policy',service:service.id,severity:'*',action:policy?.action ?? 'route',owner:policy?.owner || service.owner,reason,baseVersion:draft.baseVersion,
          ...(policy?.suppressionWindow ? {suppressionWindow:policy.suppressionWindow} : {}),
          ...(policy?.correlation ? {correlation:policy.correlation} : {}),
          ...(policy?.transformation ? {transformation:policy.transformation} : {}),
          workflow:{version:next,approved:true,member:draft.value.member,reason:draft.value.reason}});
        await refresh?.(); draft.published(); return result;
      }}/>}
      <DraftStorageFeedback failed={draft.storageFailed} retry={draft.retryStorage}/>
    </form>
    <PolicyHistory state={state} policy={policy?.id} label="Workflow history"/>
  </details>;
}

function PolicyHistory({state,policy,label}: {state: State;policy?: string;label: string}) {
  const entries=policy ? state.audit.filter(entry => entry.kind === 'policy' && entry.text.startsWith(policy+' ')).slice().reverse() : [];
  return <details className="service-policy-history"><summary>{label}</summary>{entries.length ? <ol>{entries.map(entry => <li key={entry.id}>{entry.text.slice(policy!.length+1)} · {state.members.find(member => member.id === entry.actor)?.name ?? 'Former member'} · {new Date(entry.at).toLocaleDateString(undefined,{day:'numeric',month:'short'})}</li>)}</ol> : <p>No published versions.</p>}</details>;
}
