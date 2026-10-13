import type { ReactNode } from "react";

// One homepage section: an eyebrow, a heading, a line or two, and its single drawing.
export function Section({ id, eyebrow, title, children, drawing, className = "" }: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  drawing: ReactNode;
  className?: string;
}) {
  return (
    <section className={`oc-section ${className}`.trim()} aria-labelledby={id}>
      <div className="oc-section-copy">
        <p className="oc-eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        {children}
      </div>
      <div className="oc-section-drawing">{drawing}</div>
    </section>
  );
}
