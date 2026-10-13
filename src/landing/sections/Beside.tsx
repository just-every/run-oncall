import { Icon } from "../Icons";
import { Band, type Segment } from "../Band";
import { Badge, Note, type State } from "../Drawn";
import { Section } from "../Section";

const steps: [string, string?][] = [
  ["Get the code."],
  ["Bring your schedules.", "From Opsgenie or PagerDuty."],
  ["Check the preview.", "See every schedule before you import."],
];
const mapped = [["schedule:", "Checkout"], ["user:", "Priya Shah"], ["user:", "Tom Okafor"]];

// The same three weeks, as the Opsgenie export has them and as Oncall's preview reads them:
// the hand-overs line up. Only the preview marks state.
const people = ["Priya Shah", "Tom Okafor", "Ana Ruiz"];
const band = (states: State[]): Segment[] =>
  people.map((name, index) => ({ key: name, state: states[index], handover: index > 0, inside: <span className="oc-lineup-name">{name}</span> }));

// The move-in kit's preview (MoveInWorkspace.tsx), after a clean Opsgenie export, on a clip-on card.
function MoveInBadge() {
  return (
    <figure className="oc-drawing oc-movein">
      <Badge tilt={1} className="oc-movein-card">
        <p className="oc-movein-title">Bring your schedules beside your pager</p>
        <p className="oc-movein-label">Source</p>
        <p className="oc-movein-select">Opsgenie</p>
        <div className="oc-lineup">
          <p className="oc-lineup-label">Opsgenie</p>
          <Band className="oc-lineup-band oc-lineup-source" label="Opsgenie schedule" segments={band(["later", "later", "later"])} />
          <p className="oc-lineup-label">Oncall preview</p>
          <Band className="oc-lineup-band" label="Oncall preview" segments={band(["now", "next", "later"])} />
        </div>
        <p className="oc-card-heading">Compatibility review</p>
        <p className="oc-movein-counts">3 mapped · 0 rejected · 0 with differences</p>
        <ul className="oc-movein-rows">
          {mapped.map(([kind, name]) => <li key={name}><span>{kind}</span>{name}<Icon name="check" size={14} /></li>)}
        </ul>
        <p className="oc-movein-button">Confirm paused import</p>
      </Badge>
      <Note arrow="down-right" className="oc-movein-note">See every schedule before you import.</Note>
    </figure>
  );
}

export function Beside() {
  return (
    <Section id="oc-beside-title" eyebrow="Moving in" title="Try it beside your pager." drawing={<MoveInBadge />} className="oc-beside">
      <p className="oc-section-line">Keep your current tool running while you try Oncall.</p>
      <ol className="oc-numbered">
        {steps.map(([step, detail], index) => (
          <li key={step}><span aria-hidden="true">{index + 1}</span><p><b>{step}</b>{detail && <small>{detail}</small>}</p></li>
        ))}
      </ol>
      <a className="oc-link oc-link-small" href="/docs/move-in">Read the move-in guide</a>
    </Section>
  );
}
