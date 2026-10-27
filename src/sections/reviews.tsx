import { ReviewsWorkspace } from '../reviews/ReviewsWorkspace';
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function ReviewsSection() {
  const {w, page, selectIncident, s, canEdit, command} = useWorkspaceContext();
  return <>
        {page === "reviews" && <ReviewsWorkspace state={s} busy={w.busy} canEdit={canEdit} command={command} onOpenIncident={id=>{void selectIncident(id)}} />}
  </>;
}
