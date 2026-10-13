import { Wordmark } from "../Mark";
import { docsUrl, sourceUrl } from "../links";

export function Footer() {
  return (
    <footer className="oc-footer">
      <div className="oc-footer-brand">
        <Wordmark />
        <p>Who's on call, now and next.</p>
      </div>
      <nav aria-label="Footer">
        <a href={docsUrl}>Docs</a>
        <a href={sourceUrl}>Source</a>
        <a href="/signin">Sign in</a>
        <a className="oc-licence-pill" href={`${sourceUrl}/blob/main/LICENSE`}>MIT licence</a>
      </nav>
    </footer>
  );
}
