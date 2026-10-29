import { MoveIn } from '../move-in/MoveIn';
import { request } from "../useWorkspace";
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
export function MoveInSection() {
  const {page, admin, w} = useWorkspaceContext();
  return <>
        {page === "move-in" && <MoveIn admin={admin} connect={w.pagerdutyConnect} request={request} />}
  </>;
}
