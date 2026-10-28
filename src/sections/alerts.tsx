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
          <div className="alerts-workspace">
            <AlertsPanel state={s} canEdit={canEdit} run={w.run} busy={w.busy} name={name} onOpenIncident={selectIncident} onDeclare={async data => {
              const created = await command(data);
              if (created) { await selectIncident(created.id,true); }
            }} />
          </div>
        )}
  </>;
}
