import {createContext, useContext, useEffect, useRef, useState} from "react";
import {useWorkspace} from "../../useWorkspace";
import {useWorkspacePath} from "../useWorkspacePath";
import {resolveIncidentAlias} from "../../incident-workflows/relations";

/** One workspace lifetime: navigation and live reads never remount the shell or its drafts. */
export function useWorkspaceValue() {
  const w = useWorkspace();
  const {page, incident: selected, selectIncident: chooseIncident} = useWorkspacePath();
  const [revealing, setRevealing] = useState("");
  const [listedRevision, setListedRevision] = useState(-1);
  const selectIncident = async (id: string, reveal = false) => {
    if (reveal) setRevealing(id);
    await chooseIncident(id);
  };
  const [declare, setDeclare] = useState(false);
  const [declarationService,setDeclarationService]=useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [replay, setReplay] = useState<any>(null);
  const [handoff, setHandoff] = useState<any>(null);
  const [pendingSteps, setPendingSteps] = useState<Record<string, boolean>>({});
  useEffect(() => { w.setNotice(""); w.setError(""); }, [page]);
  const s = w.state;
  const actor = w.member;
  const activeIncidents = s?.incidents.filter((i) => i.state !== "resolved" && !i.mergedInto).length ?? 0;
  const strandedSession = w.ready && !actor;
  useEffect(() => {
    if (strandedSession && !signingOut) location.replace("/signin/local");
  }, [strandedSession, signingOut]);
  const admin = actor?.role === "admin";
  const canEdit = actor?.role === "admin" || actor?.role === "responder";
  const selectedIncident=selected?s?.incidents.find(i=>i.id===selected):s?.incidents.find(i=>!i.mergedInto);
  const incident=s&&selectedIncident?resolveIncidentAlias(s,selectedIncident.id):undefined;
  useEffect(()=>{if(selectedIncident?.mergedInto&&incident)void chooseIncident(incident.id,true);},[selectedIncident?.id,selectedIncident?.mergedInto?.target,incident?.id]);
  useEffect(() => {
    if (!revealing || revealing !== incident?.id || declare || listedRevision !== s?.revision) return;
    const frame=requestAnimationFrame(() => {
      const heading=document.querySelector<HTMLElement>(".detail > h2");
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});heading.scrollIntoView({block:"start"});}
      setRevealing("");
    });
    return () => cancelAnimationFrame(frame);
  }, [revealing, incident?.id, declare, listedRevision, s?.revision]);
  const service = s?.services.find((v) => v.id === incident?.service);
  const name = (id: string | null) =>
    s?.members.find((m) => m.id === id)?.name ?? (id?.startsWith("api-") ? "Service account" : "Unassigned");
  const memberOptions = s?.members
    .filter((m) => m.active && ["admin", "responder"].includes(m.role))
    .map((m) => (
      <option key={m.id} value={m.id}>
        {m.name}
      </option>
    ));
  const serviceOptions = s?.services.map((v) => (
    <option key={v.id} value={v.id}>
      {v.name} · {v.environment}
    </option>
  ));
  const declarationTemplate=s?.services.find(v=>v.id===(declarationService||s.services[0]?.id))?.incidentTemplates?.at(-1);
  const recordBases = useRef(new Map<string, any>());
  const rememberBase = (type: string, record: any) => {
    const key = type + ':' + record.id;
    if (!recordBases.current.has(key)) recordBases.current.set(key, structuredClone(type === 'service'
      ? {name: record.name, environment: record.environment, owner: record.owner, runbook: record.runbook, pager: record.pager}
      : {role: record.role, active: record.active}));
  };
  const command = async (data: any) => {
    const key = data.type + ':' + data.id;
    const baseValues = recordBases.current.get(key);
    const result = await w.run("/api/command", baseValues ? {...data, baseValues} : data);
    if (result) recordBases.current.delete(key);
    return result;
  };
  const mutate = (data: any) =>
    incident
      ? command({ ...data, incident: incident.id, revision: incident.revision })
      : Promise.resolve(null);
  return {w,page,selected,selectIncident,declare,setDeclare,declarationService,setDeclarationService,signingOut,setSigningOut,replay,setReplay,handoff,setHandoff,pendingSteps,setPendingSteps,setListedRevision,s,actor,activeIncidents,admin,canEdit,incident,service,name,memberOptions,serviceOptions,declarationTemplate,rememberBase,command,mutate};
}

export type WorkspaceValue = ReturnType<typeof useWorkspaceValue>;
export const WorkspaceContext = createContext<WorkspaceValue | null>(null);
/** Sections mount only after the shell has verified the member and state. */
export function useWorkspaceContext() {
  const value = useContext(WorkspaceContext);
  if (!value?.s || !value.actor) throw new Error("Workspace section needs a ready workspace");
  return {...value, s: value.s, actor: value.actor};
}
