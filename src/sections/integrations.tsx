import {AutomationSettings} from '../automation/AutomationSettings';
import {EmailWorkspace} from '../email/EmailWorkspace';
import {CompatibleIngress} from '../intake/CompatibleIngress';
import {MonitoringWorkspace} from '../monitoring/MonitoringWorkspace';
import {MonitoringIngress} from '../integrations/MonitoringIngress';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
export function IntegrationsSection() {
  const {w, s, admin, page} = useWorkspaceContext();
  return page === 'integrations' ? <div className="management-grid">
            <AutomationSettings state={s} admin={admin} busy={w.busy} run={w.run} />
            <EmailWorkspace state={s} admin={admin} busy={w.busy} run={w.run} />
            <CompatibleIngress state={s} admin={admin} busy={w.busy} run={w.run} />
            <MonitoringWorkspace state={s} admin={admin} busy={w.busy} run={w.run} />
            <MonitoringIngress admin={admin} services={s.services} busy={w.busy} run={w.run} />
  </div> : null;
}
