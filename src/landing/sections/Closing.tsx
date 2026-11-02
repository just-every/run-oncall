import type { SiteVariant } from "../Site";
import { demoUrl, docsUrl, sourceUrl } from "../links";
import { BadgeRail } from "../BadgeRail";

// The close: copy on the left, a peg rail with the now and next badges on the right running off the page edge.
export function Closing({ variant = "instance" }: { variant?: SiteVariant }) {
  return (
    <section className="oc-closing" aria-labelledby="oc-closing-title">
      <div className="oc-closing-copy">
        <h2 id="oc-closing-title">Ready for the next hand-over.</h2>
        <div className="oc-actions">
          <a className="oc-pill" href={variant === "site" ? "/run" : sourceUrl}>{variant === "site" ? "Run Oncall" : "Get the code"}</a>
          {variant === "site" && <a className="oc-link" href={demoUrl}>Try the demo</a>}
          <a className="oc-link" href={docsUrl}>Read the docs</a>
        </div>
        <p className="oc-closing-note">You can also have all the source for free.</p>
      </div>
      <BadgeRail />
    </section>
  );
}
