import { useEffect, useRef, useState } from "react";
import type { Member, State } from "./family/response-operations/domain";
export async function request(path: string, data?: unknown): Promise<any> {
  const response = await fetch(path, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const value: any = await response.json();
  if (!response.ok)
    throw Error(value.error ?? `Request failed (${response.status})`);
  return value;
}
export function useWorkspace() {
  const [state, setState] = useState<State | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [demo, setDemo] = useState(false);
  const [setup, setSetup] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function refresh() {
    apply(await request("/api/workspace"));
  }
  function apply(session: {member: Member | null; demo?: boolean; setup: boolean; state: State | null}) {
    setMember(session.member);
    setDemo(session.demo === true);
    setSetup(session.setup);
    setState(session.state);
    setReady(true);
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
    refresh().catch((e) => {
      setError(e.message);
      setReady(true);
    });
  }, []);
  async function run(
    path: string | (() => Promise<any>),
    data?: unknown,
    success: string | ((result: any) => string) = "Saved",
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await (typeof path === "function" ? path() : request(path, data));
      await refresh();
      setNotice(typeof success === "function" ? success(result) : success);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      return null;
    } finally {
      setBusy(false);
    }
  }
  return {
    state,
    demo,
    member,
    setup,
    ready,
    error,
    busy,
    notice,
    run,
    refresh,
    setError,
    setNotice,
  };
}
