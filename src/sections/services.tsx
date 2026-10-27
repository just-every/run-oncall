import { CorrelationSettings, WorkflowSettings } from '../orchestration/Settings';
import { ServiceTemplateSettings } from '../incident-workflows/TemplateSettings';
import { TimeoutSetting } from '../incident-deadlines/Controls';
import { UserAssignment } from '../manual-pages/Controls';
import { ResponsePolicy } from '../response-policy/ResponsePolicy';
import { UrgencyPolicy } from '../urgency/UrgencyPolicy';
import { RecentChanges } from "../changes/RecentChanges";
import { ServiceDependencies } from "../changes/Dependencies";
import { Field, Form } from "../forms";
import { useWorkspaceContext } from "../app/shell/WorkspaceContext";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function ServicesSection() {
  const {w, page, s, actor, admin, service, name, memberOptions, rememberBase, command} = useWorkspaceContext();
  return <>
        {page === "services" && (
          <div className="management-grid">
            <section className="panel padded">
              <h2>Service ownership</h2>
              {s.services.map((v) => (
                <article className="service-card" key={v.id} onFocusCapture={() => rememberBase('service', v)}>
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
                  <ResponsePolicy key={'response:'+v.id} service={v} state={s} admin={admin} busy={w.busy} run={w.run} />
                  <ServiceTemplateSettings state={s} service={v} member={actor} send={command} />
                  <UrgencyPolicy key={'urgency:'+v.id} service={v} state={s} admin={admin} busy={w.busy} run={w.run} />
                  {admin&&<WorkflowSettings key={'workflow:'+v.id} service={v} state={s} busy={w.busy} run={w.run}/>}
                  {admin&&<CorrelationSettings key={'correlation:'+v.id} service={v} state={s} busy={w.busy} run={w.run}/>}
                  {admin && <ServiceDependencies key={v.id} service={v} services={s.services} revision={s.revision} busy={w.busy} run={w.run} />}
                  {actor.role === 'admin' && <TimeoutSetting service={v} busy={w.busy} submit={command}/>}
                  {actor.role === 'admin' && <UserAssignment service={v} state={s} busy={w.busy} submit={command}/>}
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
                        <Field name="owner" label="Owner" value={v.owner} required={false}>
                          <option value="">Unassigned</option>
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
                  <Field name="owner" label="Service owner" required={false}>
                    {memberOptions}
                    <option value="">Unassigned</option>
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
  </>;
}
