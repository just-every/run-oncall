import { useEffect, useRef, useState } from "react";
import type { Member, State } from "./family/response-operations/domain";
class InterruptedTransport extends Error {
  constructor(){super('Connection interrupted; no success confirmed');}
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
    throw Error(`Invalid server response (${response.status}); no success confirmed`);
  }
  if(!response.ok)throw Error(value?.error??`Request failed (${response.status})`);
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
