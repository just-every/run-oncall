import type {Service, State} from '../family/response-operations/domain';
import type {IntakeRun} from '../intake/CompatibleTest';
import {request} from '../useWorkspace';
import {usePolicyDraft} from '../services/usePolicyDraft';
import {PolicyPublication} from '../services/PolicyPublication';
import {DraftComparison} from '../services/DraftComparison';
import {GroupingFields, groupingDraft} from '../services/sections/GroupingSection';
import {WorkflowFields, type WorkflowDraft} from '../services/sections/WorkflowSection';
type Props = {service: Service; state: State; busy: boolean; run: IntakeRun; refresh?: () => Promise<void>; admin?: boolean};
export function CorrelationSettings({service, state, refresh, admin = true}: Props) {
  const policy = state.policies.find(row => row.service === service.id && row.severity === '*'), version = policy?.version ?? 0;
  const saved = groupingDraft(service, state), draft = usePolicyDraft('grouping', service.id, version, saved);
  return <details className="response-policy service-grouping"><summary>Grouping · version {version}</summary>
    <DraftComparison stale={draft.stale} baseVersion={draft.baseVersion} currentVersion={version} useMine={draft.useMine}><GroupingFields value={saved} change={() => {}} state={state} readOnly/></DraftComparison>
    <form onSubmit={event => event.preventDefault()}><GroupingFields value={admin ? draft.value : saved} change={draft.change} state={state} readOnly={!admin}/>
      {admin && <PolicyPublication dirty={draft.dirty} stale={draft.stale} version={version + 1} publish={async reason => {
        const value = draft.value;
        const result = await request('/api/command', {type:'policy',service:service.id,severity:'*',action:policy?.action ?? 'route',owner:value.owner,reason,baseVersion:draft.baseVersion,
          ...(policy?.suppressionWindow ? {suppressionWindow:policy.suppressionWindow} : {}),
          ...(policy?.transformation ? {transformation:policy.transformation} : {}),
          correlation:value.enabled ? {field:value.field,windowSeconds:value.seconds,includeDependencies:value.dependencies,flappingCount:value.flapping} : null});
        await refresh?.(); draft.published(); return result;
      }}/>}
    </form>
    <details className="service-policy-history"><summary>Grouping history</summary><p>{policy ? `Version ${version}: ${policy.reason}` : 'No grouping rule published.'}</p></details>
  </details>;
}
export function WorkflowSettings({service, state, refresh, admin = true}: Props) {
  const policy = state.policies.find(row => row.service === service.id && row.severity === '*'), version = policy?.version ?? 0;
  const saved: WorkflowDraft = {member:policy?.workflow?.member ?? service.owner, reason:policy?.workflow?.reason ?? 'Coordinate this alert'};
  const draft = usePolicyDraft('workflow', service.id, version, saved);
  // Approval belongs to the workflow version; concurrency belongs to its service rule.
  const next = (policy?.workflow?.version ?? 0) + 1;
  return <details className="response-policy service-workflow"><summary>Approved workflows · version {policy?.workflow?.version ?? 0}</summary>
    {policy?.workflow?.held && <p>Approval is needed after restoring this workflow.</p>}
    {policy?.action === 'suppress' && <p>Change the service’s suppression rule in Settings › Routing before approving a workflow.</p>}
    <DraftComparison stale={draft.stale} baseVersion={draft.baseVersion} currentVersion={version} useMine={draft.useMine}><WorkflowFields value={saved} change={() => {}} state={state} readOnly/></DraftComparison>
    <form onSubmit={event => event.preventDefault()}><WorkflowFields value={admin ? draft.value : saved} change={draft.change} state={state} readOnly={!admin || policy?.action === 'suppress'}/>
      {admin && policy?.action !== 'suppress' && <PolicyPublication dirty={draft.dirty} stale={draft.stale} version={next} approve publish={async reason => {
        const result = await request('/api/command', {type:'policy',service:service.id,severity:'*',action:policy?.action ?? 'route',owner:policy?.owner || service.owner,reason,baseVersion:draft.baseVersion,
          ...(policy?.suppressionWindow ? {suppressionWindow:policy.suppressionWindow} : {}),
          ...(policy?.correlation ? {correlation:policy.correlation} : {}),
          ...(policy?.transformation ? {transformation:policy.transformation} : {}),
          workflow:{version:next,approved:true,member:draft.value.member,reason:draft.value.reason}});
        await refresh?.(); draft.published(); return result;
      }}/>}
    </form>
    <details className="service-policy-history"><summary>Workflow history</summary><p>{policy?.workflow ? `Version ${policy.workflow.version}: ${policy.workflow.reason}` : 'No workflow approved.'}</p></details>
  </details>;
}
