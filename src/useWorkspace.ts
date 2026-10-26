import { useEffect, useRef, useState } from "react";
import {useViewAnchor} from "./app/useViewAnchor";
import {useActionFailure, failureMessage, hasChangeBase} from "./app/FailureLine";
import type { Member, State } from "./family/response-operations/domain";
export class InterruptedTransport extends Error {
  constructor(){super('Connection interrupted; no success confirmed');}
}
export class HttpFailure extends Error {
  constructor(public status: number, message: string, public human = true) {super(message);}
}
export async function request(path: string, data?: unknown): Promise<any> {
  const body=data===undefined?undefined:JSON.stringify(data);
  let response:Response,raw:string;
  try {
    response=await fetch(path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body});
    raw=await response.text();
  } catch {throw new InterruptedTransport();}
  let value:any;
  try {value=JSON.parse(raw);} catch {
    if(response.status>=500)throw new InterruptedTransport();
    throw new HttpFailure(response.status, "The server response could not be read; saving was not confirmed.", false);
  }
  if(!response.ok)throw new HttpFailure(response.status, typeof value?.error === 'string' ? value.error : 'This request could not be completed.', typeof value?.error === 'string');
  return value;
}
/** Only these effect-free comparison contracts may repeat a request whose response was lost. */
export async function compareRequest(path:'/api/replay'|`/api/routing/keys/${string}/preview`,data:unknown):Promise<any>{
  try {return await request(path,data);} catch(error){
    if(!(error instanceof InterruptedTransport))throw error;
    await new Promise(resolve=>setTimeout(resolve,100));
    return request(path,data);
  }
}
export function useWorkspace() {
  const [state, setState] = useState<State | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [demo, setDemo] = useState(false);
  const [setup, setSetup] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, updateError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const failures = useActionFailure();
  const preserveView = useViewAnchor();
  const reading = useRef<Promise<void> | null>(null);
  const currentState = useRef<State | null>(null);
  function refresh(): Promise<void> {
    if (reading.current) return reading.current;
    const pending = request("/api/workspace").then(session => {
      apply(session);
      if (failures.current.current?.read) {updateError(""); failures.clear();}
    }).finally(() => { if (reading.current === pending) reading.current = null; });
    reading.current = pending;
    return pending;
  }
  function apply(session: {member: Member | null; demo?: boolean; setup: boolean; state: State | null}) {
    preserveView();
    setMember(session.member);
    setDemo(session.demo === true);
    setSetup(session.setup);
    currentState.current = session.state;
    setState(session.state);
    setReady(true);
  }
  function setError(message: string) {
    updateError(message ? failureMessage(new Error(message)) : "");
    if (message) failures.show(new Error(message)); else failures.clear();
  }
  function readFailed(error: unknown) {
    if (failures.current.current && !failures.current.current.read) return;
    updateError(failureMessage(error, true));
    failures.show(error, {read: true, target: null, retry: async () => {try {await refresh(); updateError(""); failures.clear();} catch (error) {readFailed(error);}}});
  }
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const bootstrap = document.getElementById("oncall-workspace");
    if (bootstrap) {
      const snapshot = JSON.parse(bootstrap.textContent!);
      bootstrap.remove();
      apply(snapshot);
      return;
    }
    refresh().catch((error) => {readFailed(error); setReady(true);});
  }, []);
  // One visible-tab clock for the whole workspace, including focus and resume.
  useEffect(() => {
    if (!ready || !member) return;
    const update = () => {if (document.visibilityState === "visible") void refresh().catch(readFailed);};
    const timer = window.setInterval(update, 10000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {window.clearInterval(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update);};
  }, [ready, member?.id]);
  const pendingAction = useRef<((value: any) => void) | null>(null);
  async function run(
    path: string | (() => Promise<any>),
    data?: unknown,
    success: string | ((result: any) => string) = "Saved",
  ) {
    const change = data === undefined ? undefined : structuredClone(data);
    const target = failures.action.current;
    const form = target?.closest('form');
    const formValues = () => form ? JSON.stringify(Array.from(form.elements).filter(element => 'name' in element && element.name).map(element => {
      const field = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      return [field.name, field.value, 'checked' in field ? field.checked : null, 'selectedOptions' in field ? Array.from(field.selectedOptions).map(option => option.value) : null];
    })) : null;
    const values = formValues();
    pendingAction.current?.(null);
    let resolve!: (value: any) => void;
    const completion = new Promise<any>(done => {resolve = done;});
    pendingAction.current = resolve;
    const finish = (result: any) => {
      if (pendingAction.current !== resolve) return;
      pendingAction.current = null;
      resolve(result && (!form?.isConnected || formValues() === values) ? result : null);
    };
    const guarded = hasChangeBase(change);
    const execute = async (): Promise<any> => {
      setBusy(true); updateError(""); failures.clear(); setNotice("");
      let result: any;
      try {
        result = await (typeof path === "function" ? path() : request(path, change));
      } catch (error) {
        if (error instanceof HttpFailure && error.status === 409 && change && typeof change === 'object' && 'baseValues' in change) {
          try {await refresh();} catch { /* Keep the edit until current values can be read. */ }
          const input = change as any;
          const record = input.type === 'service' ? currentState.current?.services.find(row => row.id === input.id) : currentState.current?.members.find(row => row.id === input.id);
          const base = record && Object.fromEntries(Object.keys(input.baseValues).map(key => [key, (record as any)[key]]));
          failures.show(error, {target, saved: base ? Object.entries(base).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join('; ') : String(value ?? '')}`).join(' · ') : 'This record is no longer available.', retryLabel: 'Apply my edit', retry: base ? async () => {input.baseValues = base; return execute();} : undefined});
          setBusy(false);
          if (!base) finish(null);
          return null;
        }
        updateError(failureMessage(error));
        const retry = typeof path === 'string' && (guarded || change === undefined) && (!(error instanceof HttpFailure) || error.status >= 500) ? execute : undefined;
        failures.show(error, {target, retry});
        if (!retry) finish(null);
        // A refusal may describe a stale base. Show current saved records alongside the retained edit.
        if (!(error instanceof InterruptedTransport)) {try {await refresh();} catch { /* Keep the action's failure in place. */ }}
        setBusy(false);
        return null;
      }
      try {
        // A read begun before this write cannot be the write's confirmation read.
        if (reading.current) await reading.current.catch(() => {});
        await refresh();
      } catch (error) {readFailed(error);}
      setNotice(result?.changed === false ? '' : typeof success === "function" ? success(result) : success);
      setBusy(false);
      finish(result);
      return result;
    };
    void execute();
    return completion;
  }
  return {state, demo, member, setup, ready, error, busy, notice, run, refresh, setError, setNotice, failure: failures.failure};
}
