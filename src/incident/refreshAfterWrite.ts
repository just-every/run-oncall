import {useLayoutEffect, useRef, useState} from 'react';
import {flushPendingSaves} from '../app/autosave/leaveGuard';

/** The shell's refresh() shares a workspace read already in flight, and a read
 * begun before a write cannot confirm it. Let that read settle, then start one
 * that follows the write's answer. */
export async function refreshAfterWrite(refresh: () => Promise<void>) {
  await refresh().catch(() => {});
  await refresh();
}

/** A note or step sent while an autosaved change is still saving would carry
 * the incident's old revision. Wait for those saves (each confirmed by
 * refreshAfterWrite), then send from a render that holds the new revision. */
export function useMutateAfterSaves(mutate: (data: any) => Promise<any>) {
  const latest = useRef(mutate);
  const commits = useRef<(() => void)[]>([]);
  const [, rendered] = useState(0);
  const [waiting, setWaiting] = useState(0);
  useLayoutEffect(() => {latest.current = mutate; for (const done of commits.current.splice(0)) done();});
  return {waiting: waiting > 0, mutate: async (data: any) => {
    setWaiting(count => count + 1);
    try {
      await flushPendingSaves();
      await new Promise<void>(done => {commits.current.push(done); rendered(count => count + 1);});
      return latest.current(data);
    } finally {setWaiting(count => count - 1);}
  }};
}
