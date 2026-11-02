import type { SiteVariant } from "../Site";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import { Badge, Note } from "../Drawn";
import { Icon, type IconName } from "../Icons";
import { Section } from "../Section";
import { sourceUrl } from "../links";

const promises: [IconName, string][] = [["people", "No seats."], ["plan", "No plans."], ["fee", "No fees."]];
const rights = ["use", "copy", "modify", "merge", "publish", "distribute", "sublicense"];

// The licence (LICENSE lines 1, 5, 8 and 9) on a clip-on badge, as if it were the next one handed over.
function LicenceBadge() {
  return (
    <figure className="oc-drawing oc-licence" aria-label="MIT License: Permission is hereby granted, free of charge, to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.">
      <Badge tilt={-2} className="oc-licence-card">
        <div aria-hidden="true">
          <p className="oc-licence-title">MIT License</p>
          <p className="oc-licence-line">Permission is hereby granted, <mark>free of charge,</mark></p>
          <p className="oc-licence-rights">
            {rights.map((right) => <span key={right}><mark>{right},</mark> </span>)}
            and/or <mark>sell</mark> copies of the Software
          </p>
          <p className="oc-licence-more">…</p>
        </div>
      </Badge>
      <Note arrow="down-right" className="oc-licence-note">Yours to use, change and run.</Note>
    </figure>
  );
}

export function Free({ variant = "instance" }: { variant?: SiteVariant }) {
  return (
    <Section id="oc-free-title" eyebrow="Yours" title="The whole rota, in one place." drawing={<LicenceBadge />} className="oc-free">
      <p className="oc-section-line">Oncall is open source and MIT licensed, so it's yours to use, change and run however you like.</p>
      <ul className="oc-promises">
        {promises.map(([icon, text]) => <li key={text}><span className="oc-icon-disc"><Icon name={icon} /></span>{text}</li>)}
      </ul>
      <a className="oc-pill oc-pill-medium" href={variant === "site" ? "/run" : sourceUrl}>{variant === "site" ? "Run Oncall" : "Get the code"}</a>
    </Section>
  );
}
