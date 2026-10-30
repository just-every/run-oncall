import '../archive/archive-settings.css';
import {ConfigurationAudit} from "../archive/ConfigurationAudit";
import {EraseData} from '../archive/EraseData';
import { ArchiveWorkspace } from "../app/ArchiveWorkspace";
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
export function ArchiveSection() {
  const {w, admin, page, setReplay, setHandoff, s, actor} = useWorkspaceContext();
  return <div className="archive-settings">
        {page === "archive" && <>
          <ArchiveWorkspace state={s} actor={actor} busy={w.busy} run={w.run} setError={w.setError} setNotice={w.setNotice}
            onRestored={() => { setReplay(null); setHandoff(null); }} />
          <ConfigurationAudit state={s} />
          {admin&&<EraseData state={s} busy={w.busy} run={w.run}/>}
        </>}
  </div>;
}
