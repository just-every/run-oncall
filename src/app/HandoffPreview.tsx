import type { handoff } from '../family/response-operations/integrations';

export function HandoffPreview({ value }: { value: ReturnType<typeof handoff> }) {
  return <section aria-label="Unsent handoff">
    <h3>{value.title}</h3>
    <p>Internal draft · {value.environment} · {value.state}</p>
    <p>{value.chat.message.summary}</p>
    <p>Your existing pager remains responsible for notifications. No pager request or chat message has been sent, and no status page update has been published. Review the draft before sharing it.</p>
    {value.pager.link && <p><a href={value.pager.link} target="_blank" rel="noreferrer">Open existing pager</a></p>}
    {value.evidence && <p><a href={value.evidence} target="_blank" rel="noreferrer">Recovery evidence</a></p>}
  </section>;
}
