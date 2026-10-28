import '../archive/archive-settings.css';
import {ConfigurationAudit} from "../archive/ConfigurationAudit";
import {EraseData} from '../archive/EraseData';
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
  const {w, admin, page, selectIncident, setReplay, setHandoff, s, actor} = useWorkspaceContext();
  return <div className="archive-settings">
        {page === "archive" && <>
          <ArchiveWorkspace state={s} actor={actor} busy={w.busy} run={w.run} setError={w.setError} setNotice={w.setNotice}
            onRestored={() => { setReplay(null); setHandoff(null); selectIncident(""); }} />
          <ConfigurationAudit state={s} />
          {admin&&<EraseData state={s} busy={w.busy} run={w.run}/>}
        </>}
  </div>;
}
