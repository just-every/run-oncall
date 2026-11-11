# Oncall timeline carry-forward report

Repository: just-every/run-oncall
Tag: main-oncall-rota-timeline-1-c1
Product branch: cloud/main-oncall-rota-timeline-1-c1
Product head: ecd5c13b31c8ed3c12a4d6c47aa26ba1dc4d1050
PR: none; this assignment uses the pushed branch and fleet landing.
Verify run: 43105225939 — completed/success
Verify URL: https://github.com/just-every/run-oncall/actions/runs/43105225939

## Plan and implementation

The complete execution plan is in PLAN.md. Configured fleet global/local identity and commit hooks, refreshed launcher credentials and installed the decrypted-bundle Git helper. Cloned full history with blob filtering. Confirmed main's clock fix 051a993 is present: agedReplayRetention computes the current whole-hour clock rather than Date.UTC(2026,10,4,12).

Created the named branch at b2c7ebf9342581aff62bbd358147866c1134c5af and merged origin/main at 1e8f35e6ec553ed607b812dd6f957aae2b3acce9, without rebasing. The merge was clean. Kept main's newer documentation and agent tests, including the clock fix and lost Commander assignment replay. Made no additional product edit. Regenerated contract views, proved the generator check, restored ACCEPTANCE.md and docs/CLAIMS.md from main, regenerated the source lock last and passed its check. CONTRACT.md and generated views are byte-identical to main.

The existing timeline product commit remains intact: readable full-name interval lists on phones; compact initials with full accessible labels on narrow desktop slices; preserved uninterrupted shifts; demo overrides aligned to stated weekly local handovers, including DST. The original cloud/main-oncall-rota-timeline-1 branch was not changed.

Fetched main and ran git merge origin/main again immediately before the push; already up to date. Inspected every candidate commit including side parents, with correct fleet author and committer and no coauthor trailers. Pushed once through cloud-push.py; succeeded on attempt 1. No force push and no default-branch push.

## Validation

Setup and build succeeded using the prescribed cloud_run wrapper. Full local Verify was not run; exact-SHA branch Verify is the complete CI wall. Local touched checks on the exact product SHA:

- typecheck: exit 0, 18.3 seconds.
- agent-flow: exit 0, 240.3 seconds.
- agent-role-replay: exit 0, 1.4 seconds (module import smoke; behavioral role replay is exercised by agent-flow).
- activation: exit 0, 318.0 seconds.
- accessibility: exit 0, 114.0 seconds.

The activation journey passed demoRotaRules: HTTP handovers and sample cover endpoints agree with every stated local weekly rule. The complete agent-flow passed, including agedReplayRetention and the newly merged Commander case. Existing keyboardCoordination and productSchedule assertions passed at 1440 and 390, including the real stale-write 409 and no saved claim, focus containment, Escape return, protected assignment/preview readback, labels, no horizontal overflow and serious/critical axe checks. rotaTimelineScreens passed for overview and individual rota at both widths. No new test registration, deletion, skip or weakening was introduced by this round.

Visually reviewed the four actual overview/rota timeline captures once at 1440 and 390; browser-receipt.json records dimensions and SHA256 hashes. Desktop chips show full names where they fit and initials on short slices. Phone lists retain full names and dated endpoints without clipping. All retained browser proof comes from synthetic local owners and emitted production Worker/D1 doors, never real browser profiles or provider accounts.

## Counts and claims

Before -> after, across all contract status rows: done 22 -> 22; partial 45 -> 45; missing 34 -> 34. OC-009 remains partial. No Status, Gap or Evidence cell was edited. No DONE claim.

CLAIM OC-009 PARTIAL points=1 tests=tests/product-browser-journey.mjs#keyboardCoordination; tests/product-browser-journey.mjs#productSchedule; tests/product-browser-journey.mjs#rotaTimelineScreens

GAP OC-009: Full BASE-ACCESSIBILITY-001 conformance across every Oncall journey and the OC-029 apps remains unestablished; human passes and VPAT remain R-3/R-4 field proof.

## Publication and custody

The non-secret report, actual receipts, logs and synthetic browser proof are kept outside the product checkout in this packet and selected explicitly for report-only evidence publication. Packet inspection found no injected secret values, private keys, GitHub tokens, authorization values or private entry URLs. Candidate diff hygiene found no credential-shaped values. The complete fleet publication scan cannot run in this cloud and remains the Mac landing gate, as explicitly directed by the cloud assignment. These local hygiene checks are not represented as that scan.

Product READY/PUSHED custody depends only on the pushed product and its exact-SHA CI result. Evidence publication is separate and makes no acceptance, landing, provider-delivery or production claim. Detailed provenance, merge parents, command outcomes, identities, counts, browser hashes and CI state are in the accompanying actual receipt files.

Terminal CI state at report generation: completed/success.
Blockers: none.
