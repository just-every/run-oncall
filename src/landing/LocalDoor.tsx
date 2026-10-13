import { useEffect } from "react";
import { Field, Form } from "../forms";
import { useWorkspace } from "../useWorkspace";
import { Handover } from "./Handover";
import { Site } from "./Site";
import "./door.css";

// The workspace's own name-and-password door (/api/login, /api/setup and the restore mapping).
// Owners sign in by email at /signin; held password installations and restored owners come here.
export function LocalDoor() {
  const w = useWorkspace();
  useEffect(() => {
    if (w.member) location.assign("/");
  }, [w.member]);
  return (
    <Site signIn={false} className="oc-door-page">
      <main id="main" className="oc-door">
        <section className="oc-door-copy" aria-labelledby="oc-door-title">
          <h1 id="oc-door-title">{w.setup ? "Create your response workspace" : "Sign in"}</h1>
          <p className="oc-door-line">
            {w.setup ? "Choose a name and a password for the first administrator." : "Use the name and password from your Oncall workspace."}
          </p>
          <p className="oc-door-links"><a href="/signin">Owner email sign-in</a><span aria-hidden="true">·</span><a href="/setup">First-run setup</a></p>
          <div className="oc-door-card">
            <Form
              busy={w.busy || !w.ready}
              label={w.setup ? "Create workspace" : "Sign in"}
              onSubmit={(data) => w.run(w.setup ? "/api/setup" : "/api/login", data)}
            >
              <Field name="name" label="Name" />
              <Field name="password" label="Password" type="password" />
            </Form>
            {w.error && <p className="oc-door-error" role="alert">{w.error}</p>}
          </div>
          <details className="oc-door-restore">
            <summary>Map an archived administrator after restore</summary>
            <p>Sign in with the installation owner's email first, then explicitly map an archived administrator. Held password installations cannot use this door.</p>
            <Form busy={w.busy} label="Confirm restored owner mapping" onSubmit={(data) => w.run("/api/identity-link", { adminMapping: data.adminMapping, confirm: true })}>
              <Field name="adminMapping" label="Archived administrator ID" />
            </Form>
          </details>
        </section>
        <div className="oc-door-board" aria-hidden="true">
          <Handover notes={false} />
        </div>
      </main>
    </Site>
  );
}
