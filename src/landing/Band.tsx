import type { CSSProperties, ReactNode } from "react";
import type { State } from "./Drawn";
import "./band.css";

// A rota drawn as one coloured band with rounded ends, the hero's timeline. Each segment is one
// person's stretch in its state colour; `head` sits on the segment's starting boundary (a time),
// `foot` under the segment (who), `inside` on the bar itself. A segment with `handover` starts with
// a hand-over marker. `stack` turns the band vertical on phones so its labels stay readable.
export type Segment = {
  key: string;
  state: State;
  span?: number;
  handover?: boolean;
  head?: ReactNode;
  foot?: ReactNode;
  inside?: ReactNode;
};

export function Band({ segments, label, stack = false, className = "", intro = false }: { intro?: boolean; segments: Segment[]; label: string; stack?: boolean; className?: string }) {
  const cols = segments.map((s) => `minmax(0, ${s.span ?? 1}fr)`).join(" ");
  return (
    <ol data-intro={intro || undefined} className={`oc-band${stack ? " oc-band-stack" : ""} ${className}`.trim()} aria-label={label} style={{ "--cols": cols } as CSSProperties}>
      {segments.map((s) => (
        <li key={s.key} className={`oc-band-seg oc-band-${s.state}${s.handover ? " oc-band-handover" : ""}`}>
          <div className="oc-band-head">{s.head}</div>
          <div className="oc-band-bar">{s.inside}</div>
          <div className="oc-band-foot">{s.foot}</div>
        </li>
      ))}
    </ol>
  );
}
