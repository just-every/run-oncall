import {useEffect, useState} from 'react';
import {HandoffPreview} from '../../app/HandoffPreview';
import {request} from '../../useWorkspace';
import type {IncidentProps} from '../types';

export function Handoff({incident}: IncidentProps) {
  const [value, setValue] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const load = async () => {
    try {setValue(await request('/api/handoff/' + incident.id)); setFailed(false);} catch {setFailed(true);}
  };
  useEffect(() => {void load();}, [incident.id]);
  return value ? <HandoffPreview value={value} /> : failed ? <p role="alert">The draft could not be read. <button onClick={load}>Retry</button></p> : <p role="status">Opening draft…</p>;
}
