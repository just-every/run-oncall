import {ConfigurationAudit} from "../archive/ConfigurationAudit";
import { ArchiveWorkspace } from "../app/ArchiveWorkspace";
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function ArchiveSection() {
  const {w, page, selectIncident, setReplay, setHandoff, s, actor} = useWorkspaceContext();
  return <>
        {page === "archive" && <>
          <ArchiveWorkspace state={s} actor={actor} busy={w.busy} run={w.run} setError={w.setError} setNotice={w.setNotice}
            onRestored={() => { setReplay(null); setHandoff(null); selectIncident(""); }} />
          <ConfigurationAudit state={s} />
        </>}
  </>;
}
