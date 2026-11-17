import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
export function OnCallNow({service, busy, onTake, taken}: {service: string | null; busy: boolean; onTake?: () => void; taken?: boolean}) {
  const {w} = useWorkspaceContext();
  const rotas = w.onCall?.rotas.filter(rota => (rota.services ?? [rota.service]).some(row => row.id === service));
  return <section className="on-call-now" aria-label="On call now">
    {rotas?.length ? rotas.map(rota => <p key={rota.id}>On call now: <strong>{rota.now.primary?.name ?? 'No primary cover'}</strong>{rota.now.backup && <> (backup: {rota.now.backup.name})</>}{rotas.length > 1 && <> · {rota.name}</>}</p>) : <p>On call now: {w.onCall ? 'No rota for this service' : 'Coverage unavailable'}</p>}
    <p>Not notified. Oncall doesn’t page.</p>
    {onTake && <button disabled={busy || taken} onClick={onTake}>{taken ? 'Taken by you' : 'Take it'}</button>}
  </section>;
}
