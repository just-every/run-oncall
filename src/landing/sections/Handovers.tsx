import { Band } from "../Band";
import { Badge, Note } from "../Drawn";
import { Section } from "../Section";

// Resolved windows of a weekly Europe/London rotation across the 25 Oct clock change,
// as preview() in schedules.ts resolves them (see evidence dst-proof.txt).
const windows = [
  { day: "Mon 19 Oct", time: "09:00", name: "Tom Okafor", utc: "08:00 UTC" },
  { day: "Mon 26 Oct", time: "09:00", name: "Ana Ruiz", utc: "09:00 UTC" },
] as const;

function WindowBadge({ w, tilt }: { w: (typeof windows)[number]; tilt: number }) {
  return (
    <Badge tilt={tilt} className="oc-window">
      <p className="oc-window-when"><b>{w.day}</b><time>{w.time}</time></p>
      <p className="oc-window-who"><b>{w.name}</b><span>{w.utc} · rotation</span></p>
    </Badge>
  );
}

// Two weeks of the rota in Europe/London: the tail of Priya's week, Tom's, then Ana's. Each window
// hangs on its hand-over; the clocks go back on Sun 25 Oct, late in Tom's week (137 of its 168 hours).
function WindowsBand() {
  return (
    <figure className="oc-drawing oc-windows">
      <div className="oc-windows-head">
        <p className="oc-card-heading">Resolved UTC windows</p>
        <p className="oc-chip"><span>Timezone (IANA)</span> Europe/London</p>
      </div>
      <Band
        className="oc-windows-band"
        label="Hand-overs in Europe/London"
        segments={[
          { key: "before", state: "now", span: 0.3 },
          {
            key: "tom",
            state: "next",
            handover: true,
            inside: <p className="oc-clock-change">Sun 25 Oct · clocks go back</p>,
            foot: <WindowBadge w={windows[0]} tilt={-2} />,
          },
          { key: "ana", state: "later", handover: true, foot: <WindowBadge w={windows[1]} tilt={2} /> },
        ]}
      />
      <Note arrow="up-left" className="oc-windows-note">Still 09:00 when the clocks go back.</Note>
    </figure>
  );
}

export function Handovers() {
  return (
    <Section id="oc-handovers-title" eyebrow="Hand-overs" title="Hand-overs on the minute." drawing={<WindowsBand />} className="oc-handovers oc-flip">
      <p className="oc-section-line">Rotations follow your team's timezone. When the clocks go back, Monday's hand-over is still at 09:00.</p>
    </Section>
  );
}
