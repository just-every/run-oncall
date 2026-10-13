import type { EditionIdentity } from './base/identity'
import branding from './branding.json'

export const identity: EditionIdentity = {
  product: 'Oncall',
  deployment: branding.name,
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
