import {useEffect, useRef, useState} from 'react';
import {HttpFailure, InterruptedTransport} from '../../useWorkspace';
import {failureMessage} from '../FailureLine';
import {useLeaveGuard} from './leaveGuard';

export type SaveSnapshot<T, R = number> = {values: T; revision: R};
export type SaveChange<T, R> = {[K in keyof T]: {field: K; from: T[K]; to: T[K]; revision: R; values: T}}[keyof T];
export type FieldSaveState = {status: 'idle' | 'pending' | 'saved' | 'failed' | 'conflict'; message?: string; savedValue?: unknown};
export type AutosaveOptions<T, R> = {
  snapshot: SaveSnapshot<T, R>;
  read: () => Promise<SaveSnapshot<T, R>>;
  write: (change: SaveChange<T, R>, transport: {keepalive: boolean}) => Promise<SaveSnapshot<T, R>>;
  equal?: (a: unknown, b: unknown) => boolean;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** Every write is keepalive, including one already in flight when the tab closes. */
export async function autosaveRequest(path: string, data: unknown): Promise<any> {
  let response: Response, value: any;
  try {
    response = await fetch(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data), keepalive: true});
    value = await response.json();
  } catch {throw new InterruptedTransport();}
  if (!response.ok) throw new HttpFailure(response.status, typeof value?.error === 'string' ? value.error : 'This change could not be saved.', typeof value?.error === 'string');
  return value;
}

/** One instance per form. Choice fields call change(key, value, 'choice'); text
 * fields call change(key, value, 'text') and blur(key). Writes are per field. */
export function useAutosave<T extends Record<string, any>, R = number>(options: AutosaveOptions<T, R>) {
  type Key = keyof T;
  type Edit = {field: Key; from: T[Key]; to: T[Key]; revision: R; ready: boolean};
  const opts = useRef(options); opts.current = options;
  const model = useRef({saved: options.snapshot, values: {...options.snapshot.values}, edits: new Map<Key, Edit>(), states: {} as Partial<Record<Key, FieldSaveState>>, active: null as Promise<void> | null, timers: new Map<Key, ReturnType<typeof setTimeout>>(), marks: new Map<Key, ReturnType<typeof setTimeout>>()});
  const [, render] = useState(0);
  const mounted = useRef(true);
  const repaint = () => {if (mounted.current) render(n => n + 1);};
  const equal = (a: unknown, b: unknown) => (opts.current.equal ?? same)(a, b);
  function accept(snapshot: SaveSnapshot<T, R>) {
    const m = model.current;
    if (typeof snapshot.revision === 'number' && typeof m.saved.revision === 'number' && snapshot.revision < m.saved.revision) return;
    m.saved = snapshot;
    for (const key of Object.keys(snapshot.values) as Key[]) if (!m.edits.has(key)) m.values[key] = snapshot.values[key];
  }
  function mark(key: Key, state: FieldSaveState) {
    const m = model.current;
    clearTimeout(m.marks.get(key));
    m.states[key] = state;
    if (state.status === 'saved') m.marks.set(key, setTimeout(() => {m.states[key] = {status: 'idle'}; repaint();}, 2000));
    repaint();
  }
  async function execute(edit: Edit, keepalive: boolean) {
    const m = model.current, sent = {...edit, values: {...model.current.saved.values, [edit.field]: edit.to}};
    let snapshot: SaveSnapshot<T, R>;
    try {
      try {snapshot = await opts.current.write(sent as SaveChange<T, R>, {keepalive});}
      catch (error) {
        if (!(error instanceof HttpFailure) || error.status !== 409) throw error;
        const latest = await opts.current.read();
        accept(latest);
        // Repeat once only if the field itself still equals the original base.
        if (!equal(latest.values[sent.field], sent.from)) {
          mark(sent.field, {status: 'conflict', savedValue: latest.values[sent.field], message: 'Someone else changed this value. Your change is still here.'});
          return;
        }
        sent.revision = latest.revision;
        sent.values = {...latest.values, [sent.field]: sent.to};
        edit.revision = latest.revision;
        snapshot = await opts.current.write(sent as SaveChange<T, R>, {keepalive});
      }
      accept(snapshot);
      if (equal(edit.to, sent.to)) {
        m.edits.delete(sent.field);
        m.values[sent.field] = snapshot.values[sent.field];
        mark(sent.field, {status: 'saved'});
      } else {
        edit.from = snapshot.values[sent.field]; edit.revision = snapshot.revision;
      }
      // Other queued fields keep their original from value, on the new revision.
      for (const queued of m.edits.values()) if (queued !== edit && equal(queued.from, snapshot.values[queued.field])) queued.revision = snapshot.revision;
    } catch (error) {mark(sent.field, {status: 'failed', message: failureMessage(error)});}
  }
  function drain(keepalive = false): Promise<void> {
    const m = model.current;
    if (m.active) return m.active.then(() => drain(keepalive));
    const edit = [...m.edits.values()].find(e => e.ready && !['failed', 'conflict'].includes(m.states[e.field]?.status ?? ''));
    if (!edit) return Promise.resolve();
    if (equal(edit.to, edit.from)) {m.edits.delete(edit.field); mark(edit.field, {status: 'idle'}); return drain(keepalive);}
    // Set active before the async write can complete. Every error stays in state.
    m.active = execute(edit, keepalive).finally(() => {m.active = null;});
    return m.active.then(() => drain(keepalive));
  }
  function change<K extends Key>(field: K, value: T[K], kind: 'choice' | 'text' = 'text') {
    const m = model.current;
    clearTimeout(m.timers.get(field));
    m.values[field] = value;
    const old = m.edits.get(field);
    if (!old && equal(value, m.saved.values[field])) {mark(field, {status: 'idle'}); return;}
    if (old) {old.to = value; old.ready = kind === 'choice';}
    else m.edits.set(field, {field, from: m.saved.values[field], to: value, revision: m.saved.revision, ready: kind === 'choice'});
    // Editing a failed field retains its original base; it never silently takes
    // a teammate's newer value as permission to overwrite it.
    mark(field, {status: 'pending'});
    if (kind === 'choice') void drain();
    else m.timers.set(field, setTimeout(() => {const edit = m.edits.get(field); if (edit) edit.ready = true; void drain();}, 2000));
  }
  function blur(field: Key) {
    const m = model.current; clearTimeout(m.timers.get(field));
    const edit = m.edits.get(field);
    if (edit) edit.ready = true;
    void drain();
  }
  async function flush() {
    const m = model.current;
    for (const [field, edit] of m.edits) {clearTimeout(m.timers.get(field)); edit.ready = true;}
    await drain();
    return m.edits.size === 0;
  }
  function retry(field: Key) {mark(field, {status: 'pending'}); blur(field); return drain();}
  function useMine(field: Key) {
    const m = model.current, edit = m.edits.get(field);
    if (!edit) return;
    edit.from = m.saved.values[field]; edit.revision = m.saved.revision;
    return retry(field);
  }
  const guard = useRef({flush: () => flush(), pagehide: () => {
    const m = model.current;
    for (const [field, edit] of m.edits) {clearTimeout(m.timers.get(field)); edit.ready = true;}
    void drain(true);
  }, pending: () => model.current.edits.size > 0});
  // Stable registration delegates to this render's functions/options.
  guard.current.flush = flush;
  useLeaveGuard(guard.current);
  const snapshotKey = JSON.stringify(options.snapshot);
  useEffect(() => {accept(opts.current.snapshot); repaint();}, [snapshotKey]);
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; for (const timer of [...model.current.timers.values(), ...model.current.marks.values()]) clearTimeout(timer);};
  }, []);
  return {values: model.current.values, states: model.current.states, change, blur, flush, retry, useMine, pending: model.current.edits.size > 0};
}
