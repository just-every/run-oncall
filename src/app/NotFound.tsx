export function WorkspaceNotFound({incident = false}: {incident?: boolean}) {
  return <section className="panel padded workspace-not-found">
    <h2>{incident ? 'Incident not found' : 'Page not found'}</h2>
    <p>{incident ? 'This incident is unavailable at this address.' : 'There is no workspace page at this address.'}</p>
    <a href="/on-call">Back to On call</a>
  </section>;
}
