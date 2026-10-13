import { useEffect, useState } from "react";
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
  const [setup, setSetup] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function refresh() {
    const session = await request("/api/session");
    setMember(session.member);
    setSetup(session.setup);
    if (session.member) setState(await request("/api/state"));
    else setState(null);
    setReady(true);
  }
  useEffect(() => {
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
