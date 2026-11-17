import {RotaField} from '../Field';
import {useId, useMemo} from 'react';
import {hasRepeatedHandover} from './draft';
import type {StepProps} from './StepService';
import type {Coverage, Schedule} from '../../family/response-operations/schedules';
import {CoverageSummary} from './coverage-summary';
export function StepCheck({draft, update, state, endError, preview}: StepProps & {endError?: string; preview: {schedule: Schedule; windows: Coverage[]; to: number} | null}) {
  const endErrorId = useId();
  const repeated = useMemo(() => {try {return hasRepeatedHandover(draft);} catch {return false;}}, [draft.starts, draft.time, draft.zone, draft.every, draft.ends]);
  return <><h2>Check</h2><h3>{draft.name}</h3><p>{state.services.find(service => service.id === draft.service)?.name}</p>
    {preview ? <CoverageSummary {...preview} state={state}/> : <p>Checking who is on call…</p>}
    <RotaField label={<>Ends (optional)</>}><input type="date" value={draft.ends} min={draft.starts} aria-invalid={!!endError} aria-describedby={endError ? endErrorId : undefined} onChange={event => update({ends: event.target.value})}/></RotaField>
    {endError && <p id={endErrorId} role="alert">{endError}</p>}
    {repeated && <RotaField label={<>Repeated hand-over hour</>}><select value={draft.ambiguity} onChange={event => update({ambiguity: event.target.value as typeof draft.ambiguity})}><option value="earlier">Earlier</option><option value="later">Later</option><option value="reject">Leave a gap</option></select></RotaField>}
  </>;
}
