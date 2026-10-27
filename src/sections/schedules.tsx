import { request } from "../useWorkspace";
import { SchedulingWorkspace } from "../SchedulingWorkspace";
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function SchedulesSection() {
  const {w, page, s, actor} = useWorkspaceContext();
  return <>
        {page === "schedules" && (
          <SchedulingWorkspace page="schedules" actor={actor} state={s} request={request} refreshWorkspace={w.refresh} demo={w.demo} />
        )}
  </>;
}
