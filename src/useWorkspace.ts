import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {incidentChangeSummary, savedIncidentSummary, savedRecordSummary} from './app/savedEditSummary';
import {useViewAnchor} from "./app/useViewAnchor";
import {useActionFailure, failureMessage, hasChangeBase} from "./app/FailureLine";
import type { Incident, Member, State } from "./family/response-operations/domain";
import {workspaceCoverageHeader, workspaceRefreshHeader, workspaceStateHeader, type WorkspaceRefresh, type WorkspaceSnapshot} from './workspace-refresh';
export class InterruptedTransport extends Error {
  constructor(){super('Connection interrupted; no success confirmed');}
}
export class HttpFailure extends Error {
  constructor(public status: number, message: string, public human = true) {super(message);}
}
export function request(path: string, data?: unknown): Promise<any> {
  return sendRequest(path, data);
}
async function sendRequest(path: string, data?: unknown, headers?: Headers): Promise<any> {
  const body=data===undefined?undefined:JSON.stringify(data);
  let response:Response,raw:string;
  try {
    response=await fetch(path,{method:data===undefined?'GET':'POST',headers:data===undefined?headers:{'Content-Type':'application/json'},body});
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
const unchangedRefreshInterval = 30000;
export function useWorkspace({refreshInterval = 10000, coverage = false, onCallPage = false} = {}) {
  const [onCall, setOnCall] = useState<import('./on-call/read').OnCall | null>(null);
  const [pagingRevision, setPagingRevision] = useState<number | undefined>();
  const [state, setState] = useState<State | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [demo, setDemo] = useState(false);
  const [localSignInSettings, setLocalSignInSettings] = useState(false);
  const [setup, setSetup] = useState(false);
  const [pagerdutyConnect, setPagerdutyConnect] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, updateError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const failures = useActionFailure();
  const preserveView = useViewAnchor();
  const reading = useRef<Promise<void> | null>(null);
  const unchanged = useRef(false);
  const wantsCoverage = useRef(coverage);
  const stateVersion = useRef<string | undefined>(undefined);
  const coverageVersion = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {wantsCoverage.current = coverage;}, [coverage]);
  const currentState = useRef<State | null>(null);
  const currentMember = useRef<string | null>(null);
  const incidentWrites = useRef(new Map<string, Incident>());
  // Share the server's write response across routes while workspace reads catch up.
  function commitIncident(incident: Incident) {
    if (member?.id !== currentMember.current) return;
    const current = currentState.current;
    const previous = current?.incidents.find(row => row.id === incident.id);
    if (!current || !previous || incident.revision <= previous.revision) return;
    incidentWrites.current.set(incident.id, incident);
    currentState.current = {...current, incidents: current.incidents.map(row => row.id === incident.id ? incident : row)};
    setState(currentState.current);
  }
  function refresh(): Promise<void> {
    if (reading.current) return reading.current;
    const headers = new Headers({[workspaceRefreshHeader]: wantsCoverage.current ? 'coverage' : 'state'});
    if (stateVersion.current) headers.set(workspaceStateHeader, stateVersion.current);
    if (wantsCoverage.current && coverageVersion.current) headers.set(workspaceCoverageHeader, coverageVersion.current);
    const pending = sendRequest("/api/workspace", undefined, headers).then((session: WorkspaceRefresh) => {
      unchanged.current = 'unchanged' in session;
      if ('unchanged' in session) {
        if (session.onCall) applyCoverage(session);
      } else {
        apply(session);
      }
      if (failures.current.current?.read) {updateError(""); failures.clear();}
    }).finally(() => { if (reading.current === pending) reading.current = null; });
    reading.current = pending;
    return pending;
  }
  async function refreshAfterPendingRead() {
    // A read already in flight may have started before the user opened Alerts.
    if (reading.current) await reading.current.catch(() => {});
    await refresh();
  }
  function applyCoverage(session: Pick<WorkspaceSnapshot, 'onCall' | 'coverageVersion' | 'pagingRevision'>) {
    coverageVersion.current = session.coverageVersion;
    setOnCall(session.onCall ?? null);
    setPagingRevision(session.pagingRevision);
  }
  function apply(session: WorkspaceSnapshot) {
    preserveView();
    setMember(session.member);
    setDemo(session.demo === true);
    setSetup(session.setup);
    setLocalSignInSettings(session.localSignInSettings === true);
    setPagerdutyConnect(session.moveIn?.pagerdutyConnect === true);
    const memberId = session.member?.id ?? null;
    if (currentMember.current !== memberId || !session.state) incidentWrites.current.clear();
    currentMember.current = memberId;
    const next = session.state;
    currentState.current = next && incidentWrites.current.size ? {...next, incidents: next.incidents.map(incident => {
      const written = incidentWrites.current.get(incident.id);
      if (!written) return incident;
      if (written.revision > incident.revision) return written;
      incidentWrites.current.delete(incident.id);
      return incident;
    })} : next;
    setState(currentState.current);
    stateVersion.current = session.stateVersion;
    applyCoverage(session);
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
  const priorOnCallPage = useRef(onCallPage);
  useEffect(() => {
    const opened = onCallPage && !priorOnCallPage.current;
    priorOnCallPage.current = onCallPage;
    if (opened && ready && member) void refreshAfterPendingRead().catch(readFailed);
  }, [onCallPage, ready, member?.id]);
  // One visible-tab clock for the whole workspace, including focus and resume.
  // After an unchanged read the next one waits longer; any change, action,
  // focus or resume reads at once and restores the base interval.
  useEffect(() => {
    if (!ready || !member) return;
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, unchanged.current ? Math.max(refreshInterval, unchangedRefreshInterval) : refreshInterval);
    };
    const tick = () => {
      if (document.visibilityState !== "visible") return schedule();
      void refresh().catch(readFailed).finally(schedule);
    };
    const update = () => {if (document.visibilityState === "visible") void refresh().catch(readFailed).finally(schedule);};
    schedule();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {window.clearTimeout(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update);};
  }, [ready, member?.id, refreshInterval]);
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
    const original = currentState.current;
    const originalIncident = original?.incidents.find(row => row.id === (change as any)?.incident);
    const originalNotes = new Set(originalIncident?.timeline.map(entry => entry.id));
    let incidentBase = originalIncident;
    let lostResponse = false;
    const execute = async (): Promise<any> => {
      setBusy(true); updateError(""); failures.clear(); setNotice("");
      let result: any;
      try {
        result = await (typeof path === "function" ? path() : request(path, change));
      } catch (error) {
        if (error instanceof InterruptedTransport) lostResponse = true;
        if (error instanceof HttpFailure && error.status === 409 && change && typeof change === 'object') {
          let confirmed = false;
          try {
            if (reading.current) await reading.current.catch(() => {});
            await refresh(); confirmed = true;
          } catch { /* A new base is offered only after a healthy read. */ }
          const input = change as any;
          const record = confirmed ? input.type === 'service' ? currentState.current?.services.find(row => row.id === input.id) : input.type === 'member' ? currentState.current?.members.find(row => row.id === input.id) : currentState.current?.incidents.find(row => row.id === input.incident) : undefined;
          if (!record || ((input.type === 'service' || input.type === 'member') && !input.baseValues)) {
            failures.show(error, {target});
            setBusy(false); finish(null); return null;
          }
          const base = record && input.baseValues && Object.fromEntries(Object.keys(input.baseValues).map(key => [key, (record as any)[key]]));
          const note = record && 'timeline' in record && input.type === 'note' ? record.timeline.find(entry => !originalNotes.has(entry.id) && entry.actor === member?.id && entry.kind === 'note' && entry.text === input.text.trim()) : undefined;
          const desiredValue = (key: string) => {
            const value = input[key];
            if (input.type !== 'service') return value;
            if (key === 'runbook' && Array.isArray(value)) return value.map(item => typeof item === 'string' ? item.trim() : item);
            return typeof value === 'string' ? value.trim() : value;
          };
          const sameValue = base && Object.keys(base).every(key => JSON.stringify(base[key]) === JSON.stringify(desiredValue(key)));
          if (lostResponse && (note || sameValue)) {
            failures.clear(); updateError(''); setNotice('Saved'); setBusy(false); finish(record); return record;
          }
          if (!input.baseValues) {
            const incident = record && 'timeline' in record ? record : undefined;
            const saved = incident ? savedIncidentSummary(input, incident, currentState.current?.members ?? []) : undefined;
            const change = incident && currentState.current ? incidentChangeSummary(incident, incidentBase, currentState.current) : undefined;
            const recoveryUnchanged = input.type === 'transition' && input.state === 'recovered' &&
              incident?.state === incidentBase?.state && incident?.recovery === incidentBase?.recovery;
            const sourceRecoveryOnly = incident && incidentBase && incidentBase.revision === input.revision &&
              !incidentBase.sourceRecovery && incident.sourceRecovery && incident.revision === incidentBase.revision + 1;
            const apply = incident && !incident.mergedInto && (input.type === 'note' || recoveryUnchanged) ? async () => {
              if (recoveryUnchanged && form && (!form.isConnected || formValues() !== values)) {
                if (form.isConnected) failures.show(new Error('Your draft has changed. Submit the form to apply the current draft.'), {target, saved});
                else failures.clear();
                setBusy(false);
                finish(null);
                return null;
              }
              incidentBase = incident;
              input.revision = incident.revision;
              return execute();
            } : undefined;
            // A single source recovery adds its own timeline entry and marker.
            // Retry the unchanged human draft against the checked revision.
            if (apply && path === '/api/command' && recoveryUnchanged && sourceRecoveryOnly && !lostResponse &&
                form && pendingAction.current === resolve && currentMember.current === member?.id) return apply();
            const conflict = apply
              ? new Error(`Incident changed. Review ${change ? 'the update below' : 'the timeline'}, then select Apply my edit to save your draft.`)
              : error;
            failures.show(conflict, {target, saved, change, retryLabel: 'Apply my edit', retry: apply});
            setBusy(false); if (!apply) finish(null); return null;
          }
          failures.show(error, {target, saved: base ? savedRecordSummary(input, base, desiredValue, currentState.current?.members ?? []) : undefined, retryLabel: 'Apply my edit', retry: base ? async () => {input.baseValues = base; return execute();} : undefined});
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
      if (path === '/api/command' && result?.id === originalIncident?.id && Number.isSafeInteger(result?.revision) && Array.isArray(result?.timeline)) {
        commitIncident(result);
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
  return {localSignInSettings, state, onCall, pagingRevision, demo, member, setup, pagerdutyConnect, ready, error, busy, notice, run, refresh, refreshAfterPendingRead, commitIncident, setError, setNotice, failure: failures.failure};
}
