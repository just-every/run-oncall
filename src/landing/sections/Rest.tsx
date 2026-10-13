import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icons";
import { Band } from "../Band";
import { Badge } from "../Drawn";

// Four smaller parts of the product, each a small badge with its own band, drawn from its real screen.
function Responders() {
  return (
    <>
      <p className="oc-mini-heading">Primary responders <small>(in order)</small></p>
      <Band
        className="oc-mini-band"
        label="Primary responders, in order"
        segments={[
          { key: "priya", state: "now", foot: <><span className="oc-mini-n">1</span>Priya Shah</> },
          { key: "tom", state: "next", handover: true, foot: <><span className="oc-mini-n">2</span>Tom Okafor</> },
          { key: "ana", state: "later", handover: true, foot: <><span className="oc-mini-n">3</span>Ana Ruiz</> },
        ]}
      />
      <p className="oc-mini-heading">Backup responders</p>
      <Band
        className="oc-mini-band"
        label="Backup responders"
        segments={[{ key: "sam", state: "now", foot: <><span className="oc-mini-n">1</span>Sam Lee</> }]}
      />
    </>
  );
}

// Tuesday on the primary rotation, with Ana's cover raised over it from 09:00 to 17:00.
function Override() {
  return (
    <>
      <p className="oc-mini-heading">UTC override intervals</p>
      <div className="oc-override">
        <p className="oc-override-label"><b>Primary · Ana Ruiz</b><span>Tue 09:00 → 17:00</span><em>override</em></p>
        <Band
          className="oc-mini-band oc-override-band"
          label="Tuesday on the primary rotation"
          segments={[
            { key: "before", state: "now", span: 9 },
            { key: "cover", state: "next", span: 8, handover: true },
            { key: "after", state: "now", span: 7, handover: true },
          ]}
        />
      </div>
    </>
  );
}

// The next seven days from today, Mon 12 Oct, with Priya's primary shift running through them.
const week = [["Mon", "12"], ["Tue", "13"], ["Wed", "14"], ["Thu", "15"], ["Fri", "16"], ["Sat", "17"], ["Sun", "18"]];
function Feed() {
  return (
    <>
      <p className="oc-mini-link"><Icon name="calendar" size={15} />Open private ICS feed (next 7 days)</p>
      <div className="oc-week">
        <ol className="oc-week-days" aria-hidden="true">
          {week.map(([day, date]) => <li key={day}>{day}<b>{date}</b></li>)}
        </ol>
        <p className="oc-week-shift"><b>Checkout / primary:</b> Priya Shah</p>
      </div>
    </>
  );
}

function Incident() {
  return (
    <>
      <p className="oc-mini-title"><i className="oc-dot oc-dot-done" aria-hidden="true" />Checkout payments failing</p>
      <Band
        className="oc-mini-band oc-incident-band"
        label="Checkout payments failing, declared to resolved"
        segments={[{ key: "incident", state: "done", head: <span className="oc-incident-ends"><span>declared</span><span>resolved</span></span> }]}
      />
      <p className="oc-mini-split"><span>Incident commander</span><b>Priya Shah</b></p>
      <p className="oc-mini-check"><Icon name="check" size={14} />Runbook checklist<span>3/3</span></p>
    </>
  );
}

const parts: { icon: IconName; label: string; line: string; drawing: ReactNode; tilt: number }[] = [
  { icon: "people2", label: "Primary and backup", line: "Two rotations, each in order.", drawing: <Responders />, tilt: -1.5 },
  { icon: "swap", label: "Swaps", line: "Cover a few hours without touching the rotation.", drawing: <Override />, tilt: 1.5 },
  { icon: "calendar", label: "Shifts in your calendar", line: "A private feed of the next seven days.", drawing: <Feed />, tilt: -1 },
  { icon: "incident", label: "Incidents, start to finish", line: "Declare, coordinate and resolve, with every decision kept.", drawing: <Incident />, tilt: 1.5 },
];

export function Rest() {
  return (
    <section className="oc-section oc-rest" aria-labelledby="oc-rest-title">
      <div className="oc-section-copy">
        <p className="oc-eyebrow">Everything else</p>
        <h2 id="oc-rest-title">The rest of your rota.</h2>
      </div>
      <ul className="oc-rest-grid">
        {parts.map((part) => (
          <li key={part.label} className="oc-rest-part">
            <Badge tilt={part.tilt} className="oc-mini">{part.drawing}</Badge>
            <span className="oc-icon-disc"><Icon name={part.icon} size={20} /></span>
            <h3>{part.label}</h3>
            <p>{part.line}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
