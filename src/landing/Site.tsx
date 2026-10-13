import { HydrationUnit } from "../base/hydration/unit";
import type { ReactNode } from "react";
import { LandingHeader } from "./Hero";
import { Footer } from "./sections/Footer";
import "./landing.css";
import "./sections.css";

// The public site's frame: the homepage, the docs and the sign-in door share its header, footer, type and paper.
export type SiteVariant = "instance" | "site";

export function Site({ children, current, signIn, variant = "instance", className = "" }: { children: ReactNode; current?: "docs"; signIn?: boolean; variant?: SiteVariant; className?: string }) {
  return (
    <div className={`oc-landing ${className}`.trim()}>
      <HydrationUnit><LandingHeader current={current} signIn={variant === "site" ? false : signIn} /></HydrationUnit>
      {children}
      <HydrationUnit><Footer variant={variant} /></HydrationUnit>
    </div>
  );
}
