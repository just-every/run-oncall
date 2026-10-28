import { RoutingWorkspace } from '../routing/RoutingWorkspace';
import { Field, Form } from "../forms";
import { compareRequest } from "../useWorkspace";
import { ReplayComparison } from "../app/ReplayComparison";
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function RoutingSection() {
  const {w, page, replay, setReplay, s, admin, service, name, memberOptions, serviceOptions, command} = useWorkspaceContext();
  return <>
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
                  onSubmit={(data) => command({ ...data, type: "policy",baseVersion:s.policies.find(p=>p.service===data.service&&p.severity===data.severity)?.version??0 })}
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
                    const r = await compareRequest("/api/replay", {
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
  </>;
}
