# Fonts

Hanken Grotesk is self-hosted under the SIL Open Font License 1.1 in
`hanken-grotesk/LICENSE.txt`. The Latin and Latin Extended variable WOFF2
subsets come from `@fontsource-variable/hanken-grotesk` 5.2.8; upstream:
https://github.com/marcologous/hanken-grotesk.

The root document links `/fonts/fonts.css` once, outside the temporary dev SSR
stylesheet, and preloads only the primary Latin file. Do not import this CSS
from a component. Every body-font stack uses `--font-body` (the brand's
`--oc-font` is the same stack), including the local `Hanken Grotesk Fallback`
before generic fallback fonts; controls inherit it. `public/rer-theme.css`
declares the same two faces for Base's frames and the installer, which read only
that file.

Fallback scales use Hanken Grotesk/Arial advance-width ratios over A-Z, a-z and
0-9 at weights 400, 500 and 700, measured in Chromium. Ascent, descent and line
gap match Hanken Grotesk's 1000, -303 and 0 per 1000 units, divided by each
scale. Recalculate the fallback and preload when changing the brand font.

Caveat is self-hosted beside it under the SIL Open Font License 1.1 in
`caveat/LICENSE.txt`: the Latin and Latin Extended variable WOFF2 subsets from
`@fontsource-variable/caveat` 5.3.0; upstream: https://github.com/googlefonts/caveat.
It is only the handwritten annotation on the homepage drawings (`--oc-hand` in
`src/brand/tokens.css`), never body text, and is not preloaded.
