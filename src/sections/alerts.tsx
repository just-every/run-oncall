import { AutomationSettings } from '../automation/AutomationSettings';
import { EmailWorkspace } from '../email/EmailWorkspace';
import { MonitoringWorkspace } from '../monitoring/MonitoringWorkspace';
import { CompatibleIngress } from '../intake/CompatibleIngress';
import { MonitoringIngress } from '../integrations/MonitoringIngress';
import { AlertsPanel } from "../app/AlertsPanel";
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function AlertsSection() {
  const {w, page, selectIncident, s, admin, canEdit, name, command} = useWorkspaceContext();
  return <>
        {page === "alerts" && (
          <div className="management-grid">
            <AlertsPanel state={s} canEdit={canEdit} run={w.run} busy={w.busy} name={name} onOpenIncident={selectIncident} onDeclare={async data => {
              const created = await command(data);
              if (created) { await selectIncident(created.id,true); }
            }} />
            <AutomationSettings state={s} admin={admin} busy={w.busy} run={w.run} />
            <EmailWorkspace state={s} admin={admin} busy={w.busy} run={w.run} />
            <CompatibleIngress state={s} admin={admin} busy={w.busy} run={w.run} />
            <MonitoringWorkspace state={s} admin={admin} busy={w.busy} run={w.run} />
            <MonitoringIngress admin={admin} services={s.services} busy={w.busy} run={w.run} />
          </div>
        )}
  </>;
}
