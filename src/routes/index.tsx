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
  const [query, setQuery] = useState("");
  const [declare, setDeclare] = useState(false);
  const [replay, setReplay] = useState<any>(null);
  const [handoff, setHandoff] = useState<any>(null);
  const [archive, setArchive] = useState<any>(null);
  const [mapping, setMapping] = useState("");
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
    const update = () => setPage(location.hash.slice(1) || "incidents");
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const s = w.state;
  const actor = w.member;
  const activeIncidents = s?.incidents.filter((i) => i.state !== "resolved").length ?? 0;
  const strandedSession = w.ready && !actor;
  useEffect(() => {
    if (strandedSession) location.replace("/signin/local");
  }, [strandedSession]);
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
  async function download(path: string, filename: string) {
    try {
      const value = await request(path);
      const blob = new Blob([JSON.stringify(value, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      w.setNotice("Archive exported; authentication secrets are excluded");
    } catch (e) {
      w.setError((e as Error).message);
    }
  }
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
          <span aria-hidden="true">Oncall</span>
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
          <button disabled={w.busy} onClick={() => w.run(async () => {
            await request("/api/logout", {});
            const response = await fetch("/auth/signout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
            if (!response.ok) throw Error(`Sign out failed (${response.status}); try again`);
            location.replace("/");
          }, undefined, "")}>Sign out</button>
        </div>
      </aside>
      <main className="workspace" id="main">
        <header className="header">
          <div>
            <div className="title-line">
              <h1>{page === "schedules" ? "Schedules" : page === "move-in" ? "Move-in kit" : "Oncall"}</h1>
              <span className="technical">
                <span className="tiny-dot" />
                Technical response · local workspace
              </span>
            </div>
            <p className="subtitle">Coordinate · recover · learn</p>
          </div>
          <div className="header-status">
            <span className={`active-incident${activeIncidents ? "" : " none"}`}>
              {activeIncidents} active
              incidents
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
        <div className="authority">
          Existing pager authoritative · paging OFF · schedules and coordination
        </div>
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
          <SchedulingWorkspace page="schedules" actor={actor} state={s} request={request} refreshWorkspace={w.refresh} />
        )}
        {page === "incidents" && (
          <div className="board">
            <section className="panel incidents">
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
              <label className="search">
                Search
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search incidents"
                />
              </label>
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
                          setSelected(i.id);
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
              {s.incidents
                .filter((i) =>
                  i.title.toLowerCase().includes(query.toLowerCase()),
                )
                .map((i) => (
                  <button
                    key={i.id}
                    className={`incident ${incident?.id === i.id ? "current" : ""}`}
                    onClick={() => {
                      setSelected(i.id);
                      setHandoff(null);
                    }}
                  >
                    <div className="incident-top">
                      <span
                        className={`dot ${i.state === "resolved" ? "green" : "red"}`}
                      />
                      <span>{i.id.slice(0, 8)}</span>
                      <span className={`priority ${i.state === "resolved" ? "state-resolved" : `sev-${i.severity}`}`}>{i.severity} {i.state === "resolved" && "· resolved"}</span>
                    </div>
                    <h3>{i.title}</h3>
                    <p className="service">
                      {s.services.find((v) => v.id === i.service)?.name} ·{" "}
                      {i.state}
                    </p>
                    <time>{time(i.createdAt)}</time>
                    <div className="tags">
                      <span className="tag">
                        {i.actions.filter((a) => !a.done).length} open
                        follow-ups
                      </span>
                    </div>
                  </button>
                ))}
              {!s.incidents.length && (
                <div className="empty">
                  <h2>Ready when something needs coordination</h2>
                  <p>
                    Set up a service and its runbook, then declare a real
                    incident. Incoming alerts never declare one automatically.
                  </p>
                  <a href="#services">Set up services →</a>
                </div>
              )}
            </section>
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
                            <small>{name(e.actor)}</small>
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
                        <Field name="state" label="Next state">
                          {(
                            {
                              declared: ["acknowledged"],
                              acknowledged: ["mitigating", "recovered"],
                              mitigating: ["recovered"],
                              recovered: ["mitigating", "resolved"],
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
                    {handoff && <pre>{JSON.stringify(handoff, null, 2)}</pre>}
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
                    <div className="right-title owners-heading">
                      <h3>Follow-up owners</h3>
                    </div>
                    <ul className="owners">
                      {incident.actions.map((a) => (
                        <li className="owner action-item" key={a.id}>
                          <span className="avatar">
                            {name(a.owner).slice(0, 2)}
                          </span>
                          <div className="person">
                            <div className="person-name">{a.title}</div>
                            <div className="person-role">
                              {name(a.owner)} · due {a.due}
                            </div>
                            {a.done ? (
                              <a
                                href={a.evidence}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Completion evidence →
                              </a>
                            ) : (
                              canEdit && (
                                <Form
                                  busy={w.busy}
                                  label="Complete with evidence"
                                  onSubmit={(data) =>
                                    mutate({
                                      ...data,
                                      type: "complete",
                                      action: a.id,
                                    })
                                  }
                                >
                                  <Field
                                    name="evidence"
                                    label="Completion evidence"
                                    type="url"
                                  />
                                </Form>
                              )
                            )}
                          </div>
                          <span className="owner-status">
                            {a.done ? "Complete" : "Open"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {canEdit && (
                      <Form
                        busy={w.busy}
                        label="Add follow-up"
                        onSubmit={(data) => mutate({ ...data, type: "action" })}
                      >
                        <Field name="title" label="Improvement action" />
                        <Field name="owner" label="Owner">
                          {memberOptions}
                        </Field>
                        <Field name="due" label="Due date" type="date" />
                      </Form>
                    )}
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
                  reloads and local restarts.
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
                  <code>{v.id}</code>
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
                    {p.action} · {name(p.owner)} · version {p.version}
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
        )}
        {page === "alerts" && (
          <div className="management-grid">
            <section className="panel padded">
              <h2>Alerts</h2>
              <p>
                Signals remain separate from incidents. Recovery affects only
                its lifecycle generation. This list refreshes every 10 seconds while visible; use Refresh for an immediate update.
              </p>
              {s.alerts.map((a) => (
                <article className="service-card" key={a.id}>
                  <h3>{s.events.find((e) => e.id === a.events[0])?.title}</h3>
                  <p>
                    {s.services.find((v) => v.id === a.service)?.name} ·{" "}
                    {a.environment} · {a.state}
                  </p>
                  <p>
                    {a.source} / {a.key} / {a.generation}
                  </p>
                  <p>
                    {a.suppressed ? "Suppressed" : name(a.owner)} ·{" "}
                    {a.events.length} events
                  </p>
                  {canEdit && (
                    <button
                      onClick={async () => {
                        const i = await command({
                          type: "declare",
                          service: a.service,
                          title:
                            s.events.find((e) => e.id === a.events[0])?.title ??
                            "Incident",
                          severity: "warning",
                          summary:
                            "Declared from alert; impact requires responder review",
                          alerts: [a.id],
                        });
                        if (i) {
                          setSelected(i.id);
                          location.hash = "incidents";
                        }
                      }}
                    >
                      Declare incident from alert
                    </button>
                  )}
                </article>
              ))}
              {!s.alerts.length && (
                <p>
                  No admitted alerts. Configure a scoped source and send its
                  first event.
                </p>
              )}
              <details>
                <summary>Accepted event receipts ({s.events.length})</summary>
                {s.events.map((e) => (
                  <article className="receipt" key={e.id}>
                    <strong>
                      {e.eventId} · {e.intent}
                    </strong>
                    <p>
                      {e.decision.action}: {e.decision.reason}
                    </p>
                    <p>
                      {time(e.acceptedAt)} · observed {time(e.observedAt)} ·{" "}
                      {e.generation}
                    </p>
                  </article>
                ))}
              </details>
            </section>
            <section className="panel padded">
              <h2>Local ingress</h2>
              {admin && (
                <>
                  <p>
                    Configure an intake-only source. Saving it again rotates the
                    key. Signed secrets stay in local D1 and are excluded from
                    archives.
                  </p>
                  <Form
                    busy={w.busy}
                    label="Save scoped source"
                    onSubmit={(data) =>
                      w.run("/api/sources", { ...data, scopes: [data.service] })
                    }
                  >
                    <Field name="id" label="Source ID" />
                    <Field
                      name="key"
                      label="Source key (32+ characters)"
                      type="password"
                    />
                    <Field name="mode" label="Authentication">
                      <option value="bearer">Bearer token</option>
                      <option value="signed">HMAC signature</option>
                    </Field>
                    <Field name="service" label="Allowed service">
                      {serviceOptions}
                    </Field>
                  </Form>
                </>
              )}
              <details>
                <summary>Send a local integration event</summary>
                <Form
                  busy={w.busy}
                  label="Admit event"
                  onSubmit={(data) =>
                    w.run(async () => {
                      const selectedService = s.services.find(
                        (v) => v.id === data.service,
                      );
                      const payload = {
                        source: data.source,
                        eventId: data.eventId,
                        key: data.key,
                        generation: data.generation,
                        service: data.service,
                        environment: selectedService?.environment,
                        intent: data.intent,
                        severity: data.severity,
                        title: data.title,
                        observedAt: new Date().toISOString(),
                        evidence: data.evidence,
                      };
                      const headers: Record<string, string> = {
                        "Content-Type": "application/json",
                      };
                      if (data.mode === "signed") {
                        const ts = String(Math.floor(Date.now() / 1000));
                        const key = await crypto.subtle.importKey(
                          "raw",
                          new TextEncoder().encode(data.secret),
                          { name: "HMAC", hash: "SHA-256" },
                          false,
                          ["sign"],
                        );
                        headers["x-oncall-timestamp"] = ts;
                        headers["x-oncall-signature"] = Array.from(
                          new Uint8Array(
                            await crypto.subtle.sign(
                              "HMAC",
                              key,
                              new TextEncoder().encode(
                                ts + "." + JSON.stringify(payload),
                              ),
                            ),
                          ),
                        )
                          .map((v) => v.toString(16).padStart(2, "0"))
                          .join("");
                      } else headers.Authorization = "Bearer " + data.secret;
                      const response = await fetch(
                        "/api/ingress/" + encodeURIComponent(data.source),
                        {
                          method: "POST",
                          headers,
                          body: JSON.stringify(payload),
                        },
                      );
                      const result: any = await response.json();
                      if (!response.ok) throw Error(result.error);
                      return result;
                    }, undefined, (result) =>
                      result.duplicate
                        ? "Existing receipt returned"
                        : "Event durably accepted",
                    )
                  }
                >
                  <Field name="source" label="Source ID" />
                  <Field name="secret" label="Source key" type="password" />
                  <Field name="mode" label="Authentication">
                    <option value="bearer">Bearer token</option>
                    <option value="signed">HMAC signature</option>
                  </Field>
                  <Field name="service" label="Service">
                    {serviceOptions}
                  </Field>
                  <Field name="eventId" label="Unique event ID" />
                  <Field name="key" label="Deduplication key" />
                  <Field name="generation" label="Lifecycle generation" />
                  <Field name="intent" label="Lifecycle intent">
                    <option>trigger</option>
                    <option>recover</option>
                  </Field>
                  <Field name="severity" label="Severity">
                    <option>warning</option>
                    <option>critical</option>
                    <option>info</option>
                  </Field>
                  <Field name="title" label="Signal title" />
                  <Field
                    name="evidence"
                    label="Evidence URL"
                    type="url"
                    required={false}
                  />
                </Form>
              </details>
              <p className="muted">
                Endpoint: /api/ingress/SOURCE · 64 KiB limit · no external sends · <a href="/docs/incidents#send-an-alert-event">JSON fields and curl example</a>
              </p>
            </section>
          </div>
        )}
        {page === "reviews" && (
          <section className="panel padded">
            <h2>Reviews and open improvements</h2>
            {s.incidents.length === 0 ? (
              <p>Incident reviews and follow-ups appear here.</p>
            ) : (
              s.incidents.map((i) => (
                <article className="review-card" key={i.id}>
                  <h3>
                    {i.title} <span className="tag">{i.state}</span>
                  </h3>
                  <p>{i.review || "No postincident review recorded."}</p>
                  <ul>
                    {i.actions.map((a) => (
                      <li key={a.id}>
                        {a.title} · {name(a.owner)} · due {a.due} ·{" "}
                        {a.done ? (
                          <a href={a.evidence} target="_blank" rel="noreferrer">
                            Completed with evidence
                          </a>
                        ) : (
                          "Open"
                        )}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      setSelected(i.id);
                      location.hash = "incidents";
                    }}
                  >
                    Open incident
                  </button>
                  {canEdit && i.state === "resolved" && (
                    <Form
                      busy={w.busy}
                      label="Save review"
                      onSubmit={(data) =>
                        command({
                          ...data,
                          type: "review",
                          incident: i.id,
                          revision: i.revision,
                        })
                      }
                    >
                      <Field
                        name="text"
                        label="Impact, contributing factors, response lessons and next verification"
                        type="textarea"
                        value={i.review}
                      />
                    </Form>
                  )}
                </article>
              ))
            )}
          </section>
        )}
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
        {page === "archive" && (
          <section className="panel padded">
            <h2>Portable workspace archive</h2>
            {admin ? (
              <>
                <p>
                  Exports preserve original identities, incidents, events,
                  decisions, runbooks, reviews and actions. Authentication
                  secrets and sessions are excluded.
                </p>
                <button
                  className="primary"
                  onClick={() =>
                    download("/api/archive", "oncall-archive.json")
                  }
                >
                  Export original archive
                </button>
                <h3>Validate and replace from archive</h3>
                <p>
                  Restore replaces application data. All sessions, source
                  credentials and other member passwords are removed. Your
                  current password remains the only authenticated authority. An
                  empty installation can map it to an archive administrator.
                </p>
                <label className="field">
                  Choose archive JSON
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      try {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2000000)
                          throw Error("Archive exceeds 2 MB request limit");
                        const value = JSON.parse(await file.text());
                        setArchive(value);
                        setMapping("");
                        w.setError("");
                      } catch (err) {
                        w.setError((err as Error).message);
                        setArchive(null);
                      }
                    }}
                  />
                </label>
                {archive && (
                  <div className="restore-preview">
                    <p>
                      Replacement: {archive.services?.length ?? "?"} services ·{" "}
                      {archive.incidents?.length ?? "?"} incidents ·{" "}
                      {archive.events?.length ?? "?"} events
                    </p>
                    {!archive.members?.some(
                      (m: any) =>
                        m.id === actor.id && m.active && m.role === "admin",
                    ) && (
                      <label className="field">
                        Map current password to archive administrator
                        <select
                          value={mapping}
                          onChange={(e) => setMapping(e.target.value)}
                        >
                          <option value="">Choose explicitly</option>
                          {archive.members
                            ?.filter((m: any) => m.active && m.role === "admin")
                            .map((m: any) => (
                              <option key={m.id} value={m.id}>
                                {m.name} · {m.id}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <Form
                      busy={w.busy}
                      label="Replace workspace with this archive"
                      onSubmit={async (data) => {
                        if (data.confirm !== "REPLACE") {
                          w.setError("Type REPLACE to confirm replacement");
                          return null;
                        }
                        const result = await w.run("/api/restore", {
                          mode: "replace",
                          archive,
                          adminMapping: mapping,
                        });
                        if (result) {
                          setArchive(null);
                          setReplay(null);
                          setHandoff(null);
                          setSelected("");
                          w.setNotice(
                            "Restored. Reset other passwords and recreate source keys.",
                          );
                        }
                        return result;
                      }}
                    >
                      <Field name="confirm" label="Type REPLACE to confirm" />
                    </Form>
                  </div>
                )}
              </>
            ) : (
              <p>Archive authority is reserved to administrators.</p>
            )}
            <details>
              <summary>Configuration audit ({s.audit.length})</summary>
              {s.audit
                .slice()
                .reverse()
                .map((e) => (
                  <p key={e.id}>
                    {time(e.at)} · {e.kind} · {e.text}
                  </p>
                ))}
            </details>
          </section>
        )}
      </main>
    </div>
  );
}
