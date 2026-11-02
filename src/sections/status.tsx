import { StatusPanel } from '../business-status/StatusPanel';
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
export function StatusSection() {
  const {page, s, actor} = useWorkspaceContext();
  return <>
        {page === "status" && <StatusPanel actor={actor} state={s} />}
  </>;
}
