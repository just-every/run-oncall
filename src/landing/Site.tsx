import type { ReactNode } from "react";
import { LandingHeader } from "./Hero";
import { Footer } from "./sections/Footer";
import "./landing.css";
import "./sections.css";

// The public site's frame: the homepage, the docs and the sign-in door share its header, footer, type and paper.
export function Site({ children, current, signIn, className = "" }: { children: ReactNode; current?: "docs"; signIn?: boolean; className?: string }) {
  return (
    <div className={`oc-landing ${className}`.trim()}>
      <LandingHeader current={current} signIn={signIn} />
      {children}
      <Footer />
    </div>
  );
}
