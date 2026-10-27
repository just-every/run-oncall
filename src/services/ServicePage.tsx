import {useEffect, useRef} from 'react';
import type {Member, Service, State} from '../family/response-operations/domain';
import {ResponsePolicy} from '../response-policy/ResponsePolicy';
import {ServiceTemplateSettings} from '../incident-workflows/TemplateSettings';
import {UrgencyPolicy} from '../urgency/UrgencyPolicy';
import {CorrelationSettings, WorkflowSettings} from '../orchestration/Settings';
import {ServiceDependencies} from '../changes/Dependencies';
import {TimeoutSetting} from '../incident-deadlines/Controls';
import {UserAssignment} from '../manual-pages/Controls';
import {RecentChanges} from '../changes/RecentChanges';
import type {IntakeRun} from '../intake/CompatibleTest';
import './services.css';
import {ServiceHeadEditor} from './ServiceHeadEditor';

export type ServicePageProps = {service: Service; state: State; actor: Member; admin: boolean; busy: boolean; command: (input: any) => Promise<any>; run: IntakeRun; refresh: () => Promise<void>; focusName?: boolean};
export function ServicePage({service, state, actor, admin, busy, command, run, refresh, focusName}: ServicePageProps) {
  const policies = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.scrollTo({top:0});
    const root = policies.current;
    if (!root) return;
    const toggle = (event: Event) => {
      const opened = event.target;
      if (!(opened instanceof HTMLDetailsElement) || !opened.open || opened.parentElement !== root || !window.matchMedia('(max-width: 760px)').matches) return;
      for (const item of Array.from(root.children)) if (item !== opened && item instanceof HTMLDetailsElement) item.open = false;
    };
    root.addEventListener('toggle', toggle, true);
    return () => root.removeEventListener('toggle', toggle, true);
  }, []);
  return <article className="service-page" aria-label={service.name}>
    <a className="service-back" href="/settings/services">‹ Services</a>
    <ServiceHeadEditor service={service} state={state} admin={admin} refresh={refresh} focusName={focusName}/>
    <div className="service-policies" ref={policies}>
      <ResponsePolicy service={service} state={state} admin={admin} busy={busy} run={run} refresh={refresh}/>
      <details><summary>Incident template</summary><ServiceTemplateSettings state={state} service={service} member={actor} send={command} refresh={refresh}/></details>
      <UrgencyPolicy service={service} state={state} admin={admin} busy={busy} run={run} refresh={refresh}/>
      <CorrelationSettings service={service} state={state} busy={busy} run={run} refresh={refresh} admin={admin}/>
      <WorkflowSettings service={service} state={state} busy={busy} run={run} refresh={refresh} admin={admin}/>
      {admin ? <>
        <ServiceDependencies service={service} services={state.services} revision={state.revision} busy={busy} run={run}/>
        <TimeoutSetting service={service} busy={busy} submit={command}/>
        <UserAssignment service={service} state={state} busy={busy} submit={command}/>
      </> : <ServiceSettingsValues service={service} state={state}/>}
      <RecentChanges service={service.id} revision={state.revision}/>
    </div>
  </article>;
}

function ServiceSettingsValues({service, state}: {service: Service; state: State}) {
  const policy = state.policies.find(value => value.service === service.id && value.severity === '*');
  const assignment = service.userAssignments?.at(-1);
  return <>
    <details><summary>Depends on</summary><p>{service.dependencies?.map(id => state.services.find(value => value.id === id)?.name ?? 'Unavailable service').join(', ') || 'No dependencies'}</p></details>
    <details><summary>Acknowledgment timeout</summary><p>{service.ackTimeouts?.at(-1)?.minutes || 'Off'}{service.ackTimeouts?.at(-1)?.minutes ? ' minutes' : ''}</p></details>
    <details><summary>Assign new incidents</summary><p>{assignment ? `${assignment.mode === 'repeat' ? 'Repeat to the user' : 'Escalate to the policy'} after ${assignment.minutes} minutes` : 'No assignment rule'}</p></details>
  </>;
}
