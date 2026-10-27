import { StatusPanel } from '../../business-status/StatusPanel';
import { FailureLine } from "../../app/FailureLine";
import { WorkspaceNotFound } from "../../app/NotFound";
import { request } from "../../useWorkspace";
import { Mark } from "../../landing/Mark";
import { NavIcon } from "../../app/NavIcon";
import { nav } from "./nav";
import { useWorkspaceValue, WorkspaceContext } from "./WorkspaceContext";
import { StatusSection } from "../../sections/status";
import { MoveInSection } from "../../sections/move-in";
import { SchedulesSection } from "../../sections/schedules";
import { IncidentsSection } from "../../sections/incidents";
import { ServicesSection } from "../../sections/services";
import { RoutingSection } from "../../sections/routing";
import { AlertsSection } from "../../sections/alerts";
import { ReviewsSection } from "../../sections/reviews";
import { TeamSection } from "../../sections/team";
import { ArchiveSection } from "../../sections/archive";
export function AppShell() {
  const workspace = useWorkspaceValue();
  const {w, page, signingOut, setSigningOut, s, actor, activeIncidents, incident, name} = workspace;
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
  if (actor.role === "stakeholder") return <div className="app"><aside className="sidebar"><div className="brand"><Mark size={30} /><span>Oncall</span></div><p>{actor.name} · stakeholder</p><button onClick={async () => { await request("/api/logout", {}); location.replace("/signin/local"); }}>Sign out</button></aside><main className="workspace" id="main"><header className="header"><h1>Oncall</h1></header><StatusPanel actor={actor} /></main></div>;
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
  return (
    <WorkspaceContext.Provider value={workspace}><div className="app">
      <a className="skip" href="#main">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <a href="/incidents" className="brand">
          <Mark size={30} />
          <span data-rer-name>Oncall</span>
        </a>
        <nav className="navigation" aria-label="Workspace">
          {nav.map(([id, label]) => (
            <a
              key={id}
              className={`nav ${page === id ? "active" : ""}`}
              href={"/" + id}
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
          </div>
        </header>
        {!w.demo && <div className="authority">
          Existing pager authoritative · paging OFF · schedules and coordination
        </div>}
        <div role="status" className="notice" aria-live="polite">
          {w.busy ? "Saving…" : w.notice}
        </div>
        <FailureLine failure={w.failure} />
        {page === "not-found" && <WorkspaceNotFound />}
        <StatusSection />
        <MoveInSection />
        <SchedulesSection />
        <IncidentsSection />
        <ServicesSection />
        <RoutingSection />
        <AlertsSection />
        <ReviewsSection />
        <TeamSection />
        <ArchiveSection />
      </main>
    </div></WorkspaceContext.Provider>
  );
}
