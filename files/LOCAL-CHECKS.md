# Exact-candidate local checks

Run Edit Run fleet, 19 November 2026 (UTC).

- Product SHA `30202e35dcbc97fdb9cf5db94d49f18ff7e88481`. The shared-build receipt records this exact SHA.
- Toolchain was Node 22.20.0, pnpm 10.12.4, and the cloud Chromium executable.
- Dependency setup, frozen dependency install, and the workflow build sequence passed. The sequence ran `pnpm exec rer check --profile first-party`, `pnpm run build`, then `pnpm run typecheck`. The shared-build archive was created after typecheck.
- `node src/base/contract-docs.mjs write` and `check` passed before restoring the generated views. After restoration, the committed view check reported only the expected `ACCEPTANCE.md` difference and zero contract prose errors or warnings.
- The pinned edition-authoring `lock` and `check`, syntax checks for all three changed journeys and fixtures, `git diff --check`, and the targeted credential-pattern review passed.
- The emitted-Worker agent journey (`ONCALL_RUNTIME_PART=agents node tests/runtime.mjs`) completed from 2026-11-19T15:06:34Z to 2026-11-19T15:16:41Z.
- The signed-in browser journey (`node tests/agent-door-browser.mjs`) completed from 2026-11-19T15:16:41Z to 2026-11-19T15:24:40Z.

## Runtime output

```text
PROBE BASE-AGENT-003 4 autonomous follow-up creation: first returned link matches the complete protected parent, revision 2, open owned and due-dated P1 human-review follow-up and attributed creation; autonomous read without review; native records, revisions, mutation audit, original write custody and paging unchanged; zero outbound requests
PROBE BASE-AGENT-003 4 held follow-up creation: first returned link matches the complete protected parent, revision 2, open owned and due-dated P1 human-review follow-up and attributed creation; separate open standard read review; native records, revisions, mutation audit, original write custody and paging unchanged; zero outbound requests
PROBE BASE-AGENT-012 4 autonomous oncall.incidents.resolve: native revision 4 and stale expected_revision 3 -> revision_conflict naming 4 in metadata and text, no structured result or effect; out-of-scope and absent -> identical not_found; fresh key and current revisions -> one persisted resolution autonomously; exact retry reuses retained result and approval identity; zero outbound requests
PROBE BASE-AGENT-012 4 held oncall.incidents.resolve: native revision 4 and stale expected_revision 3 -> revision_conflict naming 4 in metadata and text, no structured result or effect; out-of-scope and absent -> identical not_found; fresh key and current revisions -> one persisted resolution after exact sponsor approval; exact retry reuses retained result and approval identity; zero outbound requests
```

## Browser output

```text
Browser proof follow-up-created 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-created 390: fits=true serious/critical=0 undersized-controls=0
Browser proof resolution-timeline 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof resolution-timeline 390: fits=true serious/critical=0 undersized-controls=0
```

The four accompanying PNGs show the saved follow-up review and the resolution timeline at both requested widths.
