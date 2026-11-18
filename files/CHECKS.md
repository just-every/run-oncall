# Exact candidate check receipt

Run Edit Run fleet · 2026-11-18T17:00:18Z

- Repository `just-every/run-oncall`
- Branch `cloud/sd-oncall-c-f278-lin-1`
- Product HEAD `3802fdced907d69aed43abb72602dccfd772e2f7`
- Main base `0d1c25846fdb7454d3d7f4382bf4037f2850c7bd`
- Merge commits in candidate range 0
- Local environment Node 24.19.0, pnpm 10.12.4 and system Chromium 154.0.8037.57. The seed declares Node 22.20.0 and pnpm 10.12.4.

~~~text
b1d8a6c840e318a76df7afc2173ca0067fe5a041 Exercise optional revision conflicts on saved rota overrides [skip ci]
3802fdced907d69aed43abb72602dccfd772e2f7 Prove retained rota cover after an optional revision conflict
~~~

| Command | Start UTC | Finish UTC | Exit |
|---|---|---|---:|
| `cloud_run npx -y @runeditrun/rer build` | 2026-11-18T16:29:36Z | 2026-11-18T16:29:44Z | 0 |
| `pnpm typecheck` | 2026-11-18T16:29:44Z | 2026-11-18T16:29:56Z | 0 |
| `pnpm exec rer check --profile first-party` | 2026-11-18T16:29:56Z | 2026-11-18T16:29:57Z | 0 |
| `cloud_run env ONCALL_RUNTIME_PART=agents node tests/runtime.mjs` | 2026-11-18T16:29:57Z | 2026-11-18T16:38:05Z | 0 |
| `cloud_run node tests/agent-door-browser.mjs` | 2026-11-18T16:38:05Z | 2026-11-18T16:44:20Z | 0 |
| `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check` | 2026-11-18T16:44:20Z | 2026-11-18T16:44:20Z | 0 |
| `node src/base/contract-docs.mjs check` | 2026-11-18T16:44:20Z | 2026-11-18T16:44:21Z | 0 |

The contract generator wrote zero files before the lock was regenerated. The pinned edition-authoring package regenerated the source lock after the test resolutions and its check passed. The checkout passed the clean-status and exact-SHA checks before the guarded push.

## Rota probes from the runtime and browser commands

~~~text
PROBE BASE-AGENT-012 4 autonomous: override native revision 1, no expected_revision -> revision_conflict, current_revision 2 in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native override and audit, autonomous; replay unchanged; zero outbound requests
PROBE BASE-AGENT-012 4 held: override native revision 1, no expected_revision -> revision_conflict, current_revision 2 in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native override and audit, one exact sponsor approval; replay unchanged; zero outbound requests
PROBE BASE-AGENT-012 4 autonomous: override native revision 2, stale expected_revision 1 -> revision_conflict, current_revision 2 in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native override and audit, autonomous; replay unchanged; zero outbound requests
PROBE BASE-AGENT-012 4 held: override native revision 2, stale expected_revision 1 -> revision_conflict, current_revision 2 in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native override and audit, one exact sponsor approval; replay unchanged; zero outbound requests
PROBE BASE-AGENT-012 4 autonomous: override native revision 2, stale expected_revision 1 -> revision_conflict, current_revision 2 in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native override and audit, autonomous; replay unchanged; zero outbound requests
PROBE BASE-AGENT-012 4 held: override native revision 2, stale expected_revision 1 -> revision_conflict, current_revision 2 in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native override and audit, one exact sponsor approval; replay unchanged; zero outbound requests
Browser proof override-revision-retained-autonomous 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof override-revision-retained-autonomous 390: fits=true serious/critical=0 undersized-controls=0
Browser proof override-revision-retained-held 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof override-revision-retained-held 390: fits=true serious/critical=0 undersized-controls=0
~~~

## Browser captures from the checked run

- [autonomous-1440](browser/autonomous-1440.png) · SHA-256 `5d853e93699cb7287a91eaecc1004bcc991018a8568b4880f5f41f2f00913985`
- [autonomous-390](browser/autonomous-390.png) · SHA-256 `9e17bf5e82933453d00c46bc8cd7fc7cabf3763d28f66fb70d016fc87c5ca310`
- [held-1440](browser/held-1440.png) · SHA-256 `468f0038bdf2ba14cb3bba3b696ca4bb992219cac1776f2c94d3d1808e8df109`
- [held-390](browser/held-390.png) · SHA-256 `8ae9c97172f42f1ec77a81de56d440fbecc96cdfaf42fb517a28468a032099d8`

## GitHub

~~~text
2026-11-18T16:44:22Z PUSH_CANDIDATE head=3802fdced907d69aed43abb72602dccfd772e2f7 base=0d1c25846fdb7454d3d7f4382bf4037f2850c7bd
PUSH_OK branch=cloud/sd-oncall-c-f278-lin-1
PRODUCT_ADVERTISED 3802fdced907d69aed43abb72602dccfd772e2f7 refs/heads/cloud/sd-oncall-c-f278-lin-1
~~~

Verify run 44350705483 on the exact product HEAD reported `completed` / `success`. [Run 44350705483](https://github.com/just-every/run-oncall/actions/runs/44350705483)
GitHub returned no pull request for the candidate branch.
