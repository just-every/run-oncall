import {RotaField} from '../Field';
import {useId, useMemo} from 'react';
import {hasRepeatedHandover, nextBackup} from './draft';
import type {StepProps} from './StepService';
export function StepCheck({draft, update, state, endError}: StepProps & {endError?: string}) {
  const endErrorId = useId();
  const repeated = useMemo(() => {try {return hasRepeatedHandover(draft);} catch {return false;}}, [draft.starts, draft.time, draft.zone, draft.every, draft.ends]);
  const name = (id: string) => state.members.find(person => person.id === id)?.name ?? 'Unavailable person';
  return <><h2>Check</h2><h3>{draft.name}</h3><p>{state.services.find(service => service.id === draft.service)?.name}</p><p>Primary · {draft.primary.map(name).join(' → ') || 'Nobody on call'}</p><p>Backup · {(draft.differentBackup ? draft.backup : nextBackup(draft.primary)).map(name).join(' → ') || 'Nobody on call'}</p><p>Every {draft.every === 7 ? 'week' : draft.every === 1 ? 'day' : draft.every + ' days'} at {draft.time} · {draft.zone.replaceAll('_', ' ')}</p>
    {!draft.differentBackup && draft.primary.length === 1 && <p className="oc-quiet">Add a second person for backup cover.</p>}
    <RotaField label={<>Ends (optional)</>}><input type="date" value={draft.ends} min={draft.starts} aria-invalid={!!endError} aria-describedby={endError ? endErrorId : undefined} onChange={event => update({ends: event.target.value})}/></RotaField>
    {endError && <p id={endErrorId} role="alert">{endError}</p>}
    {repeated && <RotaField label={<>Repeated hand-over hour</>}><select value={draft.ambiguity} onChange={event => update({ambiguity: event.target.value as typeof draft.ambiguity})}><option value="earlier">Earlier</option><option value="later">Later</option><option value="reject">Leave a gap</option></select></RotaField>}
  </>;
}
