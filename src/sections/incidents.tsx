import { IncidentWorkflows } from '../incident-workflows/Controls';
import { deadlineActor } from '../incident-deadlines/model';
import { DeadlineControls } from '../incident-deadlines/Controls';
import { ManualDeclare, ResponderRequests } from '../manual-pages/Controls';
import { Followups } from '../reviews/Followups';
import { RecentChanges } from "../changes/RecentChanges";
import { IncidentTriage } from "../app/IncidentTriage";
import { IncidentResponseControls } from "../app/IncidentResponseControls";
import { WorkspaceNotFound } from "../app/NotFound";
import { Field, Form } from "../forms";
import { request } from "../useWorkspace";
import type { Incident } from "../family/response-operations/domain";
import { HandoffPreview } from "../app/HandoffPreview";
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function IncidentsSection() {
  const {w, page, selected, selectIncident, declare, setDeclare, handoff, setHandoff, pendingSteps, setPendingSteps, listedRevision, setListedRevision, s, actor, canEdit, incident, service, name, command, mutate} = useWorkspaceContext();
  return <>
        {page === "incidents" && selected && !incident && <WorkspaceNotFound incident />}
        {page === "incidents" && (!selected || incident) && (
          <div className="board">
            <IncidentTriage onUpdated={setListedRevision} state={s} actor={actor} current={incident?.id} select={id => {selectIncident(id); setHandoff(null); if (window.innerWidth < 900) requestAnimationFrame(() => document.querySelector(".detail")?.scrollIntoView({block: "start"}));}} busy={w.busy || listedRevision !== s.revision} run={w.run}>
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
                    <ManualDeclare state={s} busy={w.busy} submit={async data=>{
                      const i=await command(data);if(i){await selectIncident(i.id,true);setDeclare(false);}return i;
                    }}/>

                  )}
                </div>
              )}
              <section className="padded" aria-label="My commander reminders">
                <h2>My commander reminders</h2>
                <p>Open incidents awaiting your resolution as commander, regardless of assignee.</p>
                {s.incidents.filter(item => item.state !== "resolved" && !item.mergedInto && item.sourceRecovery?.reminder.state === "recorded" && item.sourceRecovery.reminder.commander === actor.id).map(item => <article key={item.id}>
                  <button onClick={() => {selectIncident(item.id); setHandoff(null);}}>{item.title}</button>
                  <p>all alerts recovered — awaiting resolution</p>
                  <p>{item.sourceRecovery!.reminder.label} · non-automatic · Commander: {name(item.sourceRecovery!.reminder.commander)}</p>
                </article>)}
                {!s.incidents.some(item => item.state !== "resolved" && !item.mergedInto && item.sourceRecovery?.reminder.state === "recorded" && item.sourceRecovery.reminder.commander === actor.id) && <p>No open commander reminders.</p>}
              </section>
              {!s.incidents.length && (
                <div className="empty">
                  <h2>Ready when something needs coordination</h2>
                  <p>
                    {s.services.length
                      ? "Your services are ready. Declare an incident when something needs coordination."
                      : "Set up a service and its runbook, then declare a real incident."}
                    {" "}Each service’s response policy controls automatic incident declaration.
                  </p>
                  {s.services.length ? (
                    canEdit && <button onClick={() => setDeclare(true)}>Start an incident</button>
                  ) : <a href="/services">Set up services →</a>}
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
                  {incident.automaticDeclaration && <p>Automatic declaration · service response policy</p>}
                  {incident.sourceRecovery && <section aria-label="Source recovery" className="urgency-preview">
                    {incident.state !== "resolved" && <strong>all alerts recovered — awaiting resolution</strong>}
                    <p>Source recovery recorded {time(incident.sourceRecovery.at)} · receipt: <span style={{overflowWrap: 'anywhere'}}>{incident.sourceRecovery.receipt}</span></p>
                    <p>Commander reminder: {name(incident.sourceRecovery.reminder.commander)} · {incident.sourceRecovery.reminder.state} · {incident.sourceRecovery.reminder.label} · non-automatic.</p>
                    <p>Source recovery does not resolve this incident. Record recovery evidence and a resolution summary.</p>
                  </section>}
                  <IncidentWorkflows key={`workflow-${incident.id}`} state={s} incident={incident} member={actor} send={command} />
                  <IncidentResponseControls key={`response-${incident.id}`} incident={incident} members={s.members} busy={w.busy} canEdit={canEdit} mutate={mutate} />
                  <DeadlineControls incident={incident} actor={actor} busy={w.busy} submit={command}/>
                  <ResponderRequests incident={incident} state={s} actor={actor} busy={w.busy} submit={command}/>
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
                            {e.lifecycle?.member !== undefined && <p className="named-responder">Named responder: <strong>{e.lifecycle.member === null ? "Erased member" : name(e.lifecycle.member)}</strong></p>}
                            <small>{e.actor===deadlineActor?'Deadline scheduler':name(e.actor)}{e.operationId && ` · Bulk operation ${e.operationId}`}</small>
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
  </>;
}
