import { Wordmark } from "./Mark";
import { Handover } from "./Handover";
import { Band, type Segment } from "./Band";
import { Note } from "./Drawn";
import "./hero.css";
import { docsUrl, sourceUrl } from "./links";

// The site header the homepage, the docs and the sign-in door share. `current` marks the docs;
// the sign-in door leaves out its own Sign in pill.
export function LandingHeader({ current, signIn = true }: { current?: "docs"; signIn?: boolean }) {
  return (
    <header className="oc-header">
      <Wordmark />
      <nav aria-label="Site">
        <a href={docsUrl} aria-current={current === "docs" ? "page" : undefined}>Docs</a>
        <a href={sourceUrl}>Source</a>
        {signIn && <a className="oc-pill oc-pill-small" href="/signin">Sign in</a>}
      </nav>
    </header>
  );
}

function Boundary({ day, time }: { day: string; time: string }) {
  return <p className="oc-rota-when"><time>{day}</time><b>{time}</b></p>;
}

function Who({ name, state }: { name: string; state: string }) {
  return <p className="oc-rota-who"><b>{name}</b><small>{state}</small></p>;
}

// The Checkout rota around today (Mon 12 Oct 2026): weekly in Europe/London, Priya, then Tom,
// then Ana, each hand-over at Monday 09:00. The same windows as the Hand-overs section.
const rota: Segment[] = [
  { key: "ana-done", state: "done", head: <Boundary day="Mon 5 Oct" time="09:00" />, foot: <Who name="Ana Ruiz" state="Done" /> },
  {
    key: "priya-now",
    state: "now",
    handover: true,
    head: <Boundary day="Mon 12 Oct" time="09:00" />,
    inside: <span className="oc-rota-now"><i aria-hidden="true" />now</span>,
    foot: <Who name="Priya Shah" state="On now" />,
  },
  {
    key: "tom-next",
    state: "next",
    handover: true,
    head: <Boundary day="Mon 19 Oct" time="09:00" />,
    foot: (
      <>
        <Who name="Tom Okafor" state="Next" />
        <Note arrow="up-left" className="oc-rota-note">Hand over<br />Mon 09:00</Note>
      </>
    ),
  },
  { key: "ana-later", state: "later", handover: true, head: <Boundary day="Mon 26 Oct" time="09:00" />, foot: <Who name="Ana Ruiz" state="Later" /> },
];

export function Hero() {
  return (
    <section className="oc-hero" aria-labelledby="oc-hero-title">
      <div className="oc-hero-copy">
        <h1 id="oc-hero-title">Everyone knows who's on&nbsp;call.</h1>
        <p className="oc-hero-sub">Oncall shows who's on now, who's next and exactly when they hand over.</p>
        <div className="oc-actions">
          <a className="oc-pill" href={sourceUrl}>Get the code</a>
          <a className="oc-link" href={docsUrl}>Read the docs</a>
        </div>
        <p className="oc-hero-free">100% free, open source alternative to <strong>PagerDuty</strong> and <strong>Opsgenie</strong></p>
      </div>
      <div className="oc-hero-art"><Handover /></div>
      <Band className="oc-rota" stack label="Checkout rota, weekly in Europe/London" segments={rota} />
    </section>
  );
}
