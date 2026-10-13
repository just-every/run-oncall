# Oncall brand

Quiet readiness: everyone knows who is on call now, who is next, and the hand-over is calm. The homepage draws two hands passing a clip-on name badge from the person on **now** to the one **next**, over the rota as a coloured band; the docs, sign-in, setup and app carry the same look.

## Where it lives

- Tokens (`--oc-*`): `src/brand/tokens.css`. The sign-in and setup frames read `public/rer-theme.css` and `public/brand/frames.css`, which point at the same values.
- Type: Hanken Grotesk, one family everywhere, self-hosted. Caveat, also self-hosted (`public/fonts/caveat/`, OFL), is only the handwritten note on a homepage drawing, never body text.
- Mark and favicon: `public/brand/mark.svg`, a name badge on its rose lanyard and brass clip, tilted 8 degrees, standing alone on any ground with no circle or tile: an ink badge with two paper name lines. Its own `prefers-color-scheme: dark` style turns the badge light for dark tab bars. `public/brand/mark-paper.svg` is the same drawing without that style, for the sign-in and setup frames, which stay on paper. `src/landing/Mark.tsx` draws it from the tokens.
- App: `src/app/shell.css`, `src/app/incidents.css`, `src/scheduling.css`. Docs: `src/docs/docs.css`. Homepage: `src/landing/`.

## Rules

- Ink on warm paper. Panels are cream on hairlines; buttons are pills, ink for the main action and outlined for the rest.
- Colour marks state only: rose clay is who is on **now**, dusk blue is **next**, sage is done. No colour in nav, headings or buttons, and no third accent.
- Drawings are flat and drawn, never photographed, with no props, faces or scenery: the hero's two hands passing badges (`public/brand/handover.webp`, blank badges with the words laid over as real text; the closing band's peg rail with four lanyard badges, `public/brand/badge-rail.webp`, the same way), clip-on name badges (cream card, ink outline, a dark clip with a hole), rota bands with rounded ends and hand-over markers (rose now, dusk blue next, sage done, light neutral later), and short handwritten notes with a curly ink arrow that say what the app does (the hero has three, each section below it at most one). Code: `src/landing/Drawn.tsx`, `Band.tsx`, `Handover.tsx`.
- Body text in the app is 15px; nothing is under 12px.
- Every word is real text and every string is real: sample people, times like `Mon 09:00`, and the product's own labels. Draw only what the app does.
- Calm states first. No phones, pagers, sirens, alarm red or warning triangles, and never a claim that Oncall pages, calls or texts anyone.
- Controls stay branded, including file pickers. A grey system control inside a cream panel is a bug.
