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
          <details className="panel padded">
            <summary>Configuration audit ({s.audit.length})</summary>
            {s.audit.slice().reverse().map(entry => <p key={entry.id}>{time(entry.at)} · {entry.kind} · {entry.text}</p>)}
          </details>
        </>}
  </>;
}
