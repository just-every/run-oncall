import type {State} from "../family/response-operations/domain";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function ConfigurationAudit({state: s}: {state: State}) {
  return (
          <details className="panel padded">
            <summary>Configuration audit ({s.audit.length})</summary>
            {s.audit.slice().reverse().map(entry => <p key={entry.id}>{time(entry.at)} · {entry.kind} · {entry.text}</p>)}
          </details>
  );
}
