import { MoveIn } from '../move-in/MoveIn';
import { request } from "../useWorkspace";
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function MoveInSection() {
  const {page, admin} = useWorkspaceContext();
  return <>
        {page === "move-in" && <MoveIn admin={admin} request={request} />}
  </>;
}
