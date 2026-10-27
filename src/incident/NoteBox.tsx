import {Field, Form} from '../forms';
import type {IncidentProps} from './types';

export function NoteBox({busy, mutate}: Pick<IncidentProps, 'busy' | 'mutate'>) {
  return <div className="composer"><Form busy={busy} label="Add note" onSubmit={data => mutate({...data, type: 'note'})}>
    <Field name="text" label="Observation, decision or evidence" type="textarea" />
  </Form></div>;
}
