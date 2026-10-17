import { MonitoringWorkspace } from '../monitoring/MonitoringWorkspace';
import { UrgencyPolicy } from '../urgency/UrgencyPolicy';
import { CompatibleIngress } from '../intake/CompatibleIngress';
import { RoutingWorkspace } from '../routing/RoutingWorkspace';
import { ReviewsWorkspace } from '../reviews/ReviewsWorkspace';
import { Followups } from '../reviews/Followups';
import { RecentChanges } from "../changes/RecentChanges";
import { ChangeSources } from "../changes/ChangeSources";
import { ServiceDependencies } from "../changes/Dependencies";
import { IncidentTriage } from "../app/IncidentTriage";
import { IncidentResponseControls } from "../app/IncidentResponseControls";
import { MonitoringIngress } from '../integrations/MonitoringIngress';
import { MoveInWorkspace } from '../MoveInWorkspace';
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Field, Form } from "../forms";
import { request, useWorkspace } from "../useWorkspace";
import { SchedulingWorkspace } from "../SchedulingWorkspace";
import type { Incident } from "../family/response-operations/domain";
import { Mark } from "../landing/Mark";
import { NavIcon } from "../app/NavIcon";
import { ReplayComparison } from "../app/ReplayComparison";
import { AlertsPanel } from "../app/AlertsPanel";
import { ArchiveWorkspace } from "../app/ArchiveWorkspace";
import { HandoffPreview } from "../app/HandoffPreview";
import "../app/shell.css";
import "../app/incidents.css";
export const Route = createFileRoute("/")({ component: Workspace });
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
function Workspace() {
  const w = useWorkspace();
  const [page, setPage] = useState("incidents");
  const [selected, setSelected] = useState("");
  const selectIncident = (id: string) => {
    setSelected(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("incident", id);
    else url.searchParams.delete("incident");
    window.history.replaceState(null, "", url);
  };
  const [declare, setDeclare] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [replay, setReplay] = useState<any>(null);
  const [handoff, setHandoff] = useState<any>(null);
  const [pendingSteps, setPendingSteps] = useState<Record<string, boolean>>({});
  useEffect(() => { w.setNotice(""); w.setError(""); }, [page]);
  useEffect(() => {
    if (page !== "alerts") return;
    const update = () => { if (document.visibilityState === "visible") void w.refresh().catch(e => w.setError(e.message)); };
    const timer = window.setInterval(update, 10000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, [page]);
  useEffect(() => {
    const update = () => {setPage(location.hash.slice(1) || "incidents"); const id=new URLSearchParams(location.search).get("incident");if(id)setSelected(id);};
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const s = w.state;
  const actor = w.member;
  const activeIncidents = s?.incidents.filter((i) => i.state !== "resolved").length ?? 0;
  const strandedSession = w.ready && !actor;
  useEffect(() => {
    if (strandedSession && !signingOut) location.replace("/signin/local");
  }, [strandedSession, signingOut]);
  const admin = actor?.role === "admin";
  const canEdit = actor?.role !== "viewer";
  const incident =
    s?.incidents.find((i) => i.id === selected) ?? s?.incidents[0];
  const service = s?.services.find((v) => v.id === incident?.service);
  const name = (id: string | null) =>
    s?.members.find((m) => m.id === id)?.name ?? "Unassigned";
  const memberOptions = s?.members
    .filter((m) => m.active && m.role !== "viewer")
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
  const command = (data: any) => w.run("/api/command", data);
  const mutate = (data: any) =>
    incident
      ? command({ ...data, incident: incident.id, revision: incident.revision })
      : Promise.resolve(null);
  if (!w.ready)
    return (
      <main className="access">
        <h1>Oncall</h1>
        <p role="status">Opening your response workspace…</p>
        {w.error && <p role="alert">{w.error}</p>}
      </main>
    );
  if (!actor)
    return <main className="access"><h1>Oncall</h1><p role="status">Opening sign-in…</p></main>;
  if (!s)
    return (
      <main>
        <h1>Oncall</h1>
        <p role="alert">{w.error || "Workspace could not be loaded"}</p>
        <button onClick={() => w.refresh().catch((e) => w.setError(e.message))}>
          Retry
        </button>
      </main>
    );
  const nav = [
    ["incidents", "Incidents"],
    ["alerts", "Alerts & events"],
    ["services", "Services"],
    ["routing", "Routing & replay"],
    ["schedules", "Schedules"],
    ["move-in", "Move-in kit"],
    ["reviews", "Reviews"],
    ["team", "Team"],
    ["archive", "Archive"],
  ];
  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <a href="#incidents" className="brand" aria-label="Oncall home">
          <Mark size={30} />
          <span data-rer-name>Oncall</span>
        </a>
        <nav className="navigation" aria-label="Workspace">
          {nav.map(([id, label]) => (
            <a
              key={id}
              className={`nav ${page === id ? "active" : ""}`}
              href={"#" + id}
              aria-current={page === id ? "page" : undefined}
            >
              <NavIcon name={id} />
              {label}
            </a>
          ))}
        </nav>
        <div className="profile">
          <span className="avatar">{actor.name.slice(0, 2).toUpperCase()}</span>
          <span>{actor.name}</span>
          <span className="muted">{actor.role}</span>
          <button disabled={w.busy || signingOut} onClick={async () => {
            setSigningOut(true);
            w.setError("");
            try {
              await request("/api/logout", {});
              const response = await fetch("/auth/signout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
              if (!response.ok) throw Error(`Sign out failed (${response.status}); try again`);
              location.replace("/signin");
            } catch (error) {
              setSigningOut(false);
              w.setError((error as Error).message);
            }
          }}>Sign out</button>
        </div>
      </aside>
      <main className="workspace" id="main">
        <header className="header">
          <div>
            <div className="title-line">
              <h1>{page === "schedules" ? "Schedules" : page === "move-in" ? "Move-in kit" : "Oncall"}</h1>
              <span className="technical">
                <span className="tiny-dot" />
                Technical response · coordination
              </span>
            </div>
            <p className="subtitle">Coordinate · recover · learn</p>
          </div>
          <div className="header-status">
            <span className={`active-incident${activeIncidents ? "" : " none"}`}>
              {activeIncidents} active {activeIncidents === 1 ? "incident" : "incidents"}
            </span>
            <button
              className="quiet"
              onClick={() =>
                w
                  .refresh()
                  .then(() => w.setNotice("Up to date"))
                  .catch((e) => w.setError(e.message))
              }
            >
              Refresh
            </button>
          </div>
        </header>
        {!w.demo && <div className="authority">
          Existing pager authoritative · paging OFF · schedules and coordination
        </div>}
        <div role="status" className="notice" aria-live="polite">
          {w.busy ? "Saving…" : w.notice}
        </div>
        {w.error && (
          <div className="error" role="alert">
            {w.error}{" "}
            <button
              onClick={() => w.refresh().catch((e) => w.setError(e.message))}
            >
              Reload current state
            </button>
          </div>
        )}
        {page === "move-in" && <MoveInWorkspace admin={admin} request={request} />}
        {page === "schedules" && (
          <SchedulingWorkspace page="schedules" actor={actor} state={s} request={request} refreshWorkspace={w.refresh} demo={w.demo} />
        )}
        {page === "incidents" && (
          <div className="board">
            <IncidentTriage state={s} actor={actor} current={incident?.id} select={id => {selectIncident(id); setHandoff(null); if (window.innerWidth < 900) requestAnimationFrame(() => document.querySelector(".detail")?.scrollIntoView({block: "start"}));}} busy={w.busy} run={w.run}>
              <div className="list-toolbar">
                <strong>Incidents {s.incidents.length}</strong>
                {canEdit && (
                  <button
                    className="primary"
                    onClick={() => setDeclare(!declare)}
                  >
                    Declare incident
                  </button>
                )}
              </div>
              {declare && (
                <div className="inline-form">
                  <h2>Declare customer impact</h2>
                  {!s.services.length ? (
                    <p>Create a service first.</p>
                  ) : (
                    <Form
                      busy={w.busy}
                      label="Declare"
                      onSubmit={async (data) => {
                        const i = await command({
                          ...data,
                          type: "declare",
                          alerts: [],
                        });
                        if (i) {
                          selectIncident(i.id);
                          setDeclare(false);
                        }
                        return i;
                      }}
                    >
                      <Field name="title" label="Incident title" />
                      <Field name="service" label="Service">
                        {serviceOptions}
                      </Field>
                      <Field name="severity" label="Severity">
                        <option>critical</option>
                        <option>warning</option>
                        <option>info</option>
                      </Field>
                      <Field
                        name="summary"
                        label="Customer impact and current evidence"
                        type="textarea"
                      />
                    </Form>
                  )}
                </div>
              )}
              {!s.incidents.length && (
                <div className="empty">
                  <h2>Ready when something needs coordination</h2>
                  <p>
                    {s.services.length
                      ? "Your services are ready. Declare an incident when something needs coordination."
                      : "Set up a service and its runbook, then declare a real incident."}
                    {" "}Incoming alerts never declare one automatically.
                  </p>
                  {s.services.length ? (
                    canEdit && <button onClick={() => setDeclare(true)}>Start an incident</button>
                  ) : <a href="#services">Set up services →</a>}
                </div>
              )}
            </IncidentTriage>
            {incident ? (
              <>
                <section className="panel detail">
                  <div className="detail-heading">
                    <span className={`dot ${incident.state === "resolved" ? "green" : "red"}`} />
                    <span>{incident.id.slice(0, 8)}</span>
                    <span className={`priority sev-${incident.severity}`}>{incident.severity}</span>
                  </div>
                  <h2>{incident.title}</h2>
                  <div className="meta">
                    {service?.name} · {service?.environment}
                  </div>
                  <div className="meta row">
                    <span>{time(incident.createdAt)}</span>
                    <span className="commander">
                      {name(incident.commander)}
                    </span>
                    <span className="role-label">Incident commander</span>
                  </div>
                  <div className="team-tags">
                    <span className={`tag state-${incident.state}`}>{incident.state}</span>
                    <span className="tag">Revision {incident.revision}</span>
                  </div>
                  {w.demo && canEdit && incident.state !== "resolved" && (
                    <button disabled={w.busy} onClick={() => w.run("/api/paging/jobs", { incident: incident.id }, "Test page sent")}>
                      Send test page
                    </button>
                  )}
                  <IncidentResponseControls key={incident.id} incident={incident} members={s.members} busy={w.busy} canEdit={canEdit} mutate={mutate} />
                  <RecentChanges service={incident.service} at={incident.createdAt} revision={s.revision} expanded />
                  <section className="timeline">
                    <h3 className="section-title">
                      Evidence and decisions{" "}
                      <span className="lock">Append-only</span>
                    </h3>
                    <ol className="events">
                      {incident.timeline.map((e) => (
                        <li className="event" key={e.id}>
                          <span className="event-symbol" aria-hidden>
                            ●
                          </span>
                          <div>
                            <div className="event-line">
                              <strong>{e.kind}</strong>
                              <time>{time(e.at)}</time>
                            </div>
                            <p>{e.text}</p>
                            <small>{name(e.actor)}{e.operationId && ` · Bulk operation ${e.operationId}`}</small>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                  {canEdit && (
                    <div className="composer">
                      <Form
                        busy={w.busy}
                        label="Add timeline note"
                        onSubmit={(data) => mutate({ ...data, type: "note" })}
                      >
                        <Field
                          name="text"
                          label="Observation, decision or evidence"
                          type="textarea"
                        />
                      </Form>
                    </div>
                  )}
                  <section className="status">
                    <h3>
                      Current response{" "}
                      <span className={`status-mark state-${incident.state}`}>{incident.state}</span>
                    </h3>
                    {canEdit && incident.state !== "resolved" && (
                      <Form
                        busy={w.busy}
                        label="Record transition"
                        onSubmit={(data) =>
                          mutate({ ...data, type: "transition" })
                        }
                      >
                        <Field key={incident.id + incident.state} name="state" label="Next state">
                          {(
                            {
                              declared: ["acknowledged"],
                              acknowledged: ["mitigating", "recovered"],
                              mitigating: ["recovered"],
                              recovered: ["resolved", "mitigating"],
                              resolved: [],
                            } as Record<string, string[]>
                          )[incident.state].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </Field>
                        <Field
                          name="summary"
                          label="Reason and observed outcome"
                          type="textarea"
                        />
                        <Field
                          name="evidence"
                          label="Recovery evidence URL (required for recovered)"
                          type="url"
                          required={false}
                        />
                      </Form>
                    )}
                    {incident.recovery && (
                      <a
                        href={incident.recovery}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Recovery attestation →
                      </a>
                    )}
                    <button
                      className="quiet"
                      onClick={async () => {
                        try {
                          setHandoff(
                            await request("/api/handoff/" + incident.id),
                          );
                        } catch (e) {
                          w.setError((e as Error).message);
                        }
                      }}
                    >
                      Inspect unsent pager / chat / status-page handoff
                    </button>
                    {handoff && <HandoffPreview value={handoff} />}
                  </section>
                </section>
                <aside className="right">
                  <section className="panel runbook-owners">
                    <div className="right-title">
                      <h3>Runbook checklist</h3>
                      <span>
                        {incident.runbook.filter((r) => r.done).length}/
                        {incident.runbook.length}
                      </span>
                    </div>
                    <ul className="checklist">
                      {incident.runbook.map((r, index) => (
                        <li key={index}>
                          <input
                            id={"step-" + index}
                            type="checkbox"
                            checked={
                              pendingSteps[incident.id + ":" + index] ?? r.done
                            }
                            disabled={!canEdit || w.busy}
                            onChange={async (e) => {
                              const key = incident.id + ":" + index;
                              const done = e.target.checked;
                              setPendingSteps((v) => ({ ...v, [key]: done }));
                              await mutate({ type: "runbook", index, done });
                              setPendingSteps((v) => {
                                const next = { ...v };
                                delete next[key];
                                return next;
                              });
                            }}
                          />
                          <label htmlFor={"step-" + index}>{r.text}</label>
                        </li>
                      ))}
                    </ul>
                    {!incident.runbook.length && (
                      <p className="muted">
                        No runbook was configured when this incident was
                        declared.
                      </p>
                    )}
                    <Followups incident={incident} members={s.members} busy={w.busy} canEdit={canEdit} mutate={mutate} />
                  </section>
                  <section className="panel context">
                    <h3>Service context</h3>
                    <p>Owner: {name(service?.owner ?? null)}</p>
                    {service?.pager ? (
                      <a href={service.pager} target="_blank" rel="noreferrer">
                        Open existing pager →
                      </a>
                    ) : (
                      <p className="muted">
                        No existing pager link configured.
                      </p>
                    )}
                    <p className="muted">
                      Runbook instructions are copied at declaration. Evidence
                      links are responder attestations.
                    </p>
                  </section>
                </aside>
              </>
            ) : (
              <section className="panel detail empty">
                <h2>A calm place to coordinate</h2>
                <p>
                  Incident history starts empty. Your own records persist across
                  reloads and application restarts.
                </p>
              </section>
            )}
          </div>
        )}
        {page === "services" && (
          <div className="management-grid">
            <section className="panel padded">
              <h2>Service ownership</h2>
              {s.services.map((v) => (
                <article className="service-card" key={v.id}>
                  <h3>{v.name}</h3>
                  <p>
                    {v.environment} · {name(v.owner)}
                  </p>
                  <p>Service ID for monitoring ingress: <code>{v.id}</code></p>
                  <ol>
                    {v.runbook.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ol>
                  {v.pager && (
                    <a href={v.pager} target="_blank" rel="noreferrer">
                      Existing pager →
                    </a>
                  )}
                  <RecentChanges service={v.id} revision={s.revision} />
                  <UrgencyPolicy key={'urgency:'+v.id} service={v} state={s} admin={admin} busy={w.busy} run={w.run} />
                  {admin && <ServiceDependencies key={v.id} service={v} services={s.services} revision={s.revision} busy={w.busy} run={w.run} />}
                  {admin && (
                    <details>
                      <summary>Edit service</summary>
                      <Form
                        busy={w.busy}
                        label="Save service"
                        onSubmit={(data) =>
                          command({
                            ...data,
                            id: v.id,
                            type: "service",
                            runbook: data.runbook.split("\n").filter(Boolean),
                          })
                        }
                      >
                        <Field name="name" label="Name" value={v.name} />
                        <Field
                          name="environment"
                          label="Environment (immutable)"
                          value={v.environment}
                        />
                        <Field name="owner" label="Owner" value={v.owner}>
                          {memberOptions}
                        </Field>
                        <Field
                          name="runbook"
                          label="Runbook steps (one per line)"
                          type="textarea"
                          required={false}
                          value={v.runbook.join("\n")}
                        />
                        <Field
                          name="pager"
                          label="Existing pager URL"
                          type="url"
                          required={false}
                          value={v.pager}
                        />
                      </Form>
                    </details>
                  )}
                </article>
              ))}
              {!s.services.length && (
                <p>No services yet. Start with the system your team owns.</p>
              )}
            </section>
            {admin && <ChangeSources state={s} busy={w.busy} run={w.run} />}
            {admin && (
              <section className="panel padded">
                <h2>Add service</h2>
                <Form
                  busy={w.busy}
                  label="Create service"
                  onSubmit={(data) =>
                    command({
                      ...data,
                      type: "service",
                      runbook: data.runbook.split("\n").filter(Boolean),
                    })
                  }
                >
                  <Field name="name" label="Service name" />
                  <Field
                    name="environment"
                    label="Environment"
                    value="production"
                  />
                  <Field name="owner" label="Service owner">
                    {memberOptions}
                  </Field>
                  <Field
                    name="runbook"
                    label="Runbook steps (one per line)"
                    type="textarea"
                    required={false}
                  />
                  <Field
                    name="pager"
                    label="Existing pager URL"
                    type="url"
                    required={false}
                  />
                </Form>
              </section>
            )}
          </div>
        )}
        {page === "routing" && (
          <>
          <RoutingWorkspace state={s} admin={admin} busy={w.busy} run={w.run} />
          <div className="management-grid">
            <section className="panel padded">
              <h2>Coordination routing</h2>
              <p>
                Specific severity wins over a wildcard. A removed responder
                leaves the signal visibly unowned. Suppression never deletes the
                event.
              </p>
              {s.policies.map((p) => (
                <article className="service-card" key={p.id}>
                  <h3>
                    {s.services.find((v) => v.id === p.service)?.name} ·{" "}
                    {p.severity}
                  </h3>
                  <p>
                    {p.action}{p.action === "route" && <> · {name(p.owner)}</>} · version {p.version}
                  </p>
                  <p>{p.reason}</p>
                </article>
              ))}
              {admin && s.services.length > 0 && (
                <Form
                  busy={w.busy}
                  label="Save versioned rule"
                  onSubmit={(data) => command({ ...data, type: "policy" })}
                >
                  <Field name="service" label="Service">
                    {serviceOptions}
                  </Field>
                  <Field name="severity" label="Severity">
                    <option value="*">All severities</option>
                    <option>critical</option>
                    <option>warning</option>
                    <option>info</option>
                  </Field>
                  <Field name="action" label="Decision">
                    <option value="route">Route to owner</option>
                    <option value="suppress">Suppress with reason</option>
                  </Field>
                  <Field name="owner" label="Coordination owner">
                    {memberOptions}
                  </Field>
                  <Field name="reason" label="Reason" type="textarea" />
                </Form>
              )}
            </section>
            <section className="panel padded">
              <h2>Historical vs proposed replay</h2>
              <p>
                Read-only comparison, in supplied order. Historical decisions
                use frozen policy and ownership snapshots. Current rules propose
                ownership; no pages or incidents are created.
              </p>
              <Form
                busy={w.busy}
                label="Compare decisions"
                onSubmit={async (data) => {
                  try {
                    w.setNotice(""); w.setError(""); setReplay(null);
                    const r = await request("/api/replay", {
                      events: JSON.parse(data.events),
                    });
                    setReplay(r);
                    return r;
                  } catch (e) {
                    w.setError((e as Error).message);
                    return null;
                  }
                }}
              >
                <Field
                  name="events"
                  label="Event JSON array"
                  type="textarea"
                  value={JSON.stringify(s.events.slice(-10), null, 2)}
                />
              </Form>
              {replay && (
                  <ReplayComparison result={replay} members={s.members} />
              )}
            </section>
          </div>
          </>
        )}
        {page === "alerts" && (
          <div className="management-grid">
            <AlertsPanel state={s} canEdit={canEdit} run={w.run} busy={w.busy} name={name} onOpenIncident={selectIncident} onDeclare={async data => {
              const created = await command(data);
              if (created) { selectIncident(created.id); location.hash = "incidents"; }
            }} />
            <CompatibleIngress state={s} admin={admin} busy={w.busy} run={w.run} />
            <MonitoringWorkspace state={s} admin={admin} busy={w.busy} run={w.run} />
            <MonitoringIngress admin={admin} services={s.services} busy={w.busy} run={w.run} />
          </div>
        )}
        {page === "reviews" && <ReviewsWorkspace state={s} busy={w.busy} canEdit={canEdit} command={command} onOpenIncident={id=>{selectIncident(id);location.hash="incidents"}} />}
        {page === "team" && (
          <div className="management-grid">
            <section className="panel padded">
              <h2>Team and access</h2>
              <p>
                All active members can read workspace incident data. Responders
                coordinate; admins manage configuration and archives. Incident
                commander is a responsibility, separate from account permission.
              </p>
              {s.members.map((m) => (
                <article className="service-card" key={m.id}>
                  <h3>{m.name}</h3>
                  <p>
                    {m.role} · {m.active ? "Active" : "Revoked"}
                  </p>
                  {admin && (
                    <>
                      <Form
                        busy={w.busy}
                        label="Update access"
                        onSubmit={(data) =>
                          command({
                            ...data,
                            type: "member",
                            id: m.id,
                            active: data.active === "true",
                          })
                        }
                      >
                        <Field name="role" label="Role" value={m.role}>
                          <option>viewer</option>
                          <option>responder</option>
                          <option>admin</option>
                        </Field>
                        <Field
                          name="active"
                          label="Access"
                          value={String(m.active)}
                        >
                          <option value="true">Active</option>
                          <option value="false">Revoked</option>
                        </Field>
                      </Form>
                      {m.active && (
                        <details>
                          <summary>Reset local password</summary>
                          <Form
                            busy={w.busy}
                            label="Reset password and sessions"
                            onSubmit={(data) =>
                              w.run("/api/password", { ...data, member: m.id })
                            }
                          >
                            <Field
                              name="password"
                              label="New password"
                              type="password"
                            />
                          </Form>
                        </details>
                      )}
                    </>
                  )}
                </article>
              ))}
            </section>
            {admin && (
              <section className="panel padded">
                <h2>Add local member</h2>
                <Form
                  busy={w.busy}
                  label="Create member"
                  onSubmit={(data) => w.run("/api/members", data)}
                >
                  <Field name="name" label="Name" />
                  <Field name="role" label="Role">
                    <option>responder</option>
                    <option>viewer</option>
                    <option>admin</option>
                  </Field>
                  <Field
                    name="password"
                    label="Initial local password"
                    type="password"
                  />
                </Form>
                <p className="muted">
                  Membership uses local credentials. No invitations or provider
                  messages are sent.
                </p>
              </section>
            )}
          </div>
        )}
        {page === "archive" && <>
          <ArchiveWorkspace state={s} actor={actor} busy={w.busy} run={w.run} setError={w.setError} setNotice={w.setNotice}
            onRestored={() => { setReplay(null); setHandoff(null); selectIncident(""); }} />
          <details className="panel padded">
            <summary>Configuration audit ({s.audit.length})</summary>
            {s.audit.slice().reverse().map(entry => <p key={entry.id}>{time(entry.at)} · {entry.kind} · {entry.text}</p>)}
          </details>
        </>}
      </main>
    </div>
  );
}
