import { StatusPanel } from '../business-status/StatusPanel';
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function StatusSection() {
  const {page, s, actor} = useWorkspaceContext();
  return <>
        {page === "status" && <StatusPanel actor={actor} state={s} />}
  </>;
}
