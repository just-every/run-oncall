import type { SiteVariant } from "../Site";
import { Wordmark } from "../Mark";
import { contractUrl, docsUrl, sourceUrl } from "../links";

export function Footer({ variant = "instance" }: { variant?: SiteVariant }) {
  return (
    <footer className="oc-footer">
      <div className="oc-footer-brand">
        <Wordmark />
        <p>Who's on call, now and next.</p>
      </div>
      <nav aria-label="Footer">
        <a href={docsUrl}>Docs</a>
        {variant === "site" && <a href={contractUrl}>Contract</a>}
        <a href={sourceUrl}>Source</a>
        {variant !== "site" && <a href="/signin">Sign in</a>}
        <a className="oc-licence-pill" href={`${sourceUrl}/blob/main/LICENSE`}>MIT licence</a>
      </nav>
    </footer>
  );
}
