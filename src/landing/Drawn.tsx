import type { CSSProperties, ReactNode } from "react";
import "./drawn.css";

// The homepage's drawing vocabulary, shared with the sign-in door and taken from the hero's hands:
// clip-on name badges (cream card, ink outline, a dark clip with a hole), state pills, and short
// handwritten notes with a curly ink arrow. Every word on them is real text.
export type State = "done" | "now" | "next" | "later";

// A clip-on name badge. `tilt` turns it a few degrees, as a badge held in a hand would be.
export function Badge({ children, tilt = 0, className = "" }: { children: ReactNode; tilt?: number; className?: string }) {
  return (
    <div className={`oc-badge ${className}`.trim()} style={tilt ? ({ "--tilt": `${tilt}deg` } as CSSProperties) : undefined}>
      <i className="oc-badge-clip" aria-hidden="true" />
      {children}
    </div>
  );
}

// The word on a badge that names its state: rose now, dusk blue next.
export function StatePill({ state, children }: { state: "now" | "next"; children: ReactNode }) {
  return <span className={`oc-state oc-state-${state}`}>{children}</span>;
}

// Curly ink arrows, drawn on a 100 x 100 box from the note toward what it points at.
const arrows = {
  // leaves the note's lower edge, loops once and lands below-right
  "down-right": "M14 8C8 30 22 46 38 40C52 35 44 18 32 26C20 34 40 72 86 88M74 80l12 8-13 5",
  // rises from the note's upper edge to the left
  "up-left": "M86 92C92 66 76 52 62 60C50 67 58 82 68 74C80 64 54 26 12 12M25 9 12 12l9 10",
  // a plain short stroke, as the hero's notes have
  "hero-now": "M10 6Q14 64 70 92",
  "hero-next": "M70 6Q68 66 14 92",
  // runs right from the end of the note, then curls up to what it points at
  "rail-next": "M0 92C40 106 90 102 100 84",
} as const;

export type ArrowName = keyof typeof arrows;

// A handwritten note (Caveat) with its arrow. Placement is the caller's CSS.
export function Note({ children, arrow, className = "" }: { children: ReactNode; arrow?: ArrowName; className?: string }) {
  return (
    <span className={`oc-note ${arrow ? `oc-note-${arrow}` : ""} ${className}`.trim()}>
      <span className="oc-note-text">{children}</span>
      {arrow && (
        <svg className="oc-note-arrow" viewBox="0 0 100 100" aria-hidden="true">
          <path d={arrows[arrow]} />
        </svg>
      )}
    </span>
  );
}
