import type { EditionIdentity } from './base/identity'
import branding from './branding.json'

export const identity: EditionIdentity = {
  product: 'Oncall',
  get deployment() {
    // The uncached document carries only the public installation name. Read it
    // on hydration and navigation; server rendering uses the saved setup brand.
    const saved = typeof document === 'undefined' ? null : document.getElementById('oncall-installation');
    return saved ? (JSON.parse(saved.textContent!).name as string) : branding.name;
  },
  purpose: "{deployment}'s rota and incident coordination, in one private workspace.",
  tagline: "Oncall shows who's on now, who's next and exactly when they hand over.",
  signInPath: '/signin',
  runSite: 'https://run-oncall.com',
  installedHome: 'lobby',
  theme: '/rer-theme.css',
  mark: '/brand/mark-paper.svg',
  band: '/brand/band.svg',
  fonts: '/fonts/fonts.css',
  accentColor: branding.primaryColor,
}

export const installationName = () => identity.deployment?.trim() || identity.product;
export const installationTitle = () => installationName() === identity.product ? identity.product : `${installationName()} · ${identity.product}`;
