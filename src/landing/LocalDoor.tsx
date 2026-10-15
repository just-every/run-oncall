import { HydrationUnit } from "../base/hydration/unit";
import { useEffect } from "react";
import { Field, Form } from "../forms";
import { useWorkspace } from "../useWorkspace";
import { Handover } from "./Handover";
import { Site } from "./Site";
import { RestoredOwner } from "./RestoredOwner";
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
        <HydrationUnit><section className="oc-door-copy" aria-labelledby="oc-door-title">
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
          <RestoredOwner onLinked={w.refresh} />
        </section></HydrationUnit>
        <HydrationUnit><div className="oc-door-board">
          <p className="oc-door-sample">Sample rota · illustrative names and times</p>
          <div aria-hidden="true"><Handover notes={false} /></div>
        </div></HydrationUnit>
      </main>
    </Site>
  );
}
