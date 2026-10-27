import {Form} from '../forms';
import type {IncidentProps} from './types';

export function NoteBox({busy, mutate}: Pick<IncidentProps, 'busy' | 'mutate'>) {
  return <div className="composer"><Form busy={busy} label="Add note" onSubmit={data => mutate({...data, type: 'note'})}>
    <label className="field"><span>Observation, decision or evidence</span><textarea name="text" aria-label="Observation, decision or evidence" required rows={2} /></label>
  </Form></div>;
}
