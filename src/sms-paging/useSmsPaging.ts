import {useCallback, useEffect, useState} from 'react';
import {request} from '../useWorkspace';
import type {SmsPaging} from './words';

/** Reads GET /api/paging/sms, the one source of paging state for every screen. Null until read, or when it cannot be read. */
export function useSmsPaging() {
  const [sms, setSms] = useState<SmsPaging | null>(null), [failed, setFailed] = useState(false);
  const reload = useCallback(() => request('/api/paging/sms').then((value: SmsPaging) => {setSms(value);setFailed(false);}, () => setFailed(true)), []);
  useEffect(() => {void reload();}, [reload]);
  return {sms, failed, reload};
}
