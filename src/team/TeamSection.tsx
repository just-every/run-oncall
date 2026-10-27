import { TeamsPanel } from '../teams/TeamsPanel';
import { Field, Form } from "../forms";
import type { Incident } from "../family/response-operations/domain";
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function TeamSection() {
  const {w, page, s, actor, admin, incident, service, name, rememberBase, command} = useWorkspaceContext();
  return <>
        {page === "team" && (
          <div className="management-grid">
            <section className="panel padded">
              <h2>Team and access</h2>
              <p>
                Admins, responders and viewers can read incident data. Stakeholders
                see only internal status for their audience. Responders coordinate;
                admins manage configuration and archives. Incident
                commander is a responsibility, separate from account permission.
              </p>
              {s.members.map((m) => (
                <article className="service-card" key={m.id} onFocusCapture={() => rememberBase('member', m)}>
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
                          <option>viewer</option><option>stakeholder</option>
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
                    <option>viewer</option><option>stakeholder</option>
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
            <TeamsPanel state={s} actor={actor} refresh={w.refresh}/>
          </div>
        )}
  </>;
}
