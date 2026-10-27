import type {Member, Service, State} from '../family/response-operations/domain';
import {autosaveRequest} from '../app/autosave/useAutosave';
import {usePolicyDraft} from '../services/usePolicyDraft';
import {PolicyPublication} from '../services/PolicyPublication';
import {DraftComparison} from '../services/DraftComparison';
import {TemplateFields, type TemplateDraft} from '../services/sections/TemplateSection';
import './workflows.css';
type Props = {state: State; service: Service; member: Member; send: (command: any) => Promise<any>; refresh?: () => Promise<void>};
export function ServiceTemplateSettings({state, service, member, refresh}: Props) {
  const current = service.incidentTemplates?.at(-1), version = current?.version ?? 0, admin = member.active && member.role === 'admin' && !member.machine;
  const saved: TemplateDraft = {severityWording: current?.severityWording ?? {critical:'critical', warning:'warning', info:'info'}, impactPrompt: current?.impactPrompt ?? 'What is affected?', incidentTypes: current?.incidentTypes ?? [], checklist: current?.checklist ?? []};
  const draft = usePolicyDraft('template', service.id, version, saved);
  return <section className="incident-workflows" aria-label={'Incident template for ' + service.name}>
    <DraftComparison stale={draft.stale} baseVersion={draft.baseVersion} currentVersion={version} useMine={draft.useMine}><TemplateFields value={saved} change={() => {}} readOnly/></DraftComparison>
    <form onSubmit={event => event.preventDefault()}><TemplateFields value={admin ? draft.value : saved} change={draft.change} readOnly={!admin}/>
      {admin && <PolicyPublication dirty={draft.dirty} stale={draft.stale} version={version + 1} publish={async reason => {
        const result = await autosaveRequest('/api/command', {type:'service-template', service:service.id, baseVersion:draft.baseVersion, ...draft.value, incidentTypes:draft.value.incidentTypes.map(value => value.trim()).filter(Boolean), reason});
        await refresh?.(); draft.published(); return result;
      }}/>}
    </form>
    <details className="service-policy-history"><summary>Template history ({service.incidentTemplates?.length ?? 0})</summary>{service.incidentTemplates?.slice().reverse().map(template => <article key={template.version}><h4>Version {template.version}</h4><p>{template.reason} · {state.members.find(person => person.id === template.by)?.name ?? 'Former member'}</p><TemplateFields value={template} change={() => {}} readOnly/></article>)}</details>
  </section>;
}
