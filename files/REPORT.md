# Oncall bulk-selection carry

Task: main-oncall-bulk-selection-1-c1. Repository: just-every/run-oncall.
Branch: cloud/main-oncall-bulk-selection-1-c1.
Product head: c5b917c34bc977ed82cf8b2b481f2da8f33779b2.
Parent/current-main starting point: cc64205ca532de3ac8022838ecdd07cfa5bfae73.
Original round: 86d1ea6d2cd251b5795fb6c92b7f52ec475adbe4.

## Plan and execution

The complete initial plan is in PLAN.md. Cloned full history, confirmed the old branch tip, started from current main with the session-clock fix, squashed the old round, regenerated the source lock, checked the resulting tree, and made exactly one product commit. Ran the existing bulk browser journey and the touched bulk HTTP behavior, typecheck and intake checks. Inspected changed-screen proof at 1440 and 390. Audited candidate identity/trailers, pushed only the named product branch with the fleet guard, then watched its exact-SHA Verify through bounded REST calls spaced at least 300 seconds apart. This packet is published separately on the evidence ref.

No merge commit, conflict resolution or additional carry fix was required. The three product/test files are byte-identical to the original round. Only sources.lock.json differs from its original-round counterpart because it was regenerated against current main, retaining main's clock fix. Product scope is four files, 94 insertions and 15 deletions: src/app/IncidentBulkActions.tsx, src/app/IncidentTriage.tsx, tests/product-browser-journey.mjs, and sources.lock.json. No report, screenshot or helper is in the product tree.

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to the starting origin/main. Source-lock check, generated-contract check and diff whitespace check pass. Exact hashes and checks are in tree-receipt.json. No clause Status, Gap or Evidence judgment changed.

## Observed behavior

The original brief described a successful bulk acknowledgment leaving stale selected revisions, followed by a refused merge, and an empty target selector when every merge candidate was selected. On this candidate the existing public-door browser journey selects two incidents, offers both as possible targets, acknowledges one changed item and one already-acknowledged skipped item, then merges into the selected target without reloading. The request carries the source's newly committed revision and omits the kept target from source items. The merge succeeds once, retains the target and source provenance, and clears selection with a plain note and retained per-item result.

The existing journey also proves 50-item success and idempotent replay, mixed success/skipped/real concurrent-edit refusal, unchanged-value no-ops, snooze/merge, alert-only closure and saved workflow behavior. A separate intervening edit still refuses rather than silently accepting a newer selected revision. Behavior assertions run at 1440. The changed merge form and cleared-selection results were captured and visually inspected at both 1440 and 390. The complete existing triageBulkBrowser function ran through emitted Worker HTTP, local D1 and headless /usr/bin/chromium with --no-sandbox; browser-harness.mjs records its standalone invocation. It added no product test registration.

## Local validation on the product head

Setup completed using the required unattended fleet owner command. `cloud_run npx -y @runeditrun/rer build` completed with exit 0. The check receipt and complete actual logs accompany this report.

| Check | Command | Exit | Seconds | Actual log |
| --- | --- | ---: | ---: | --- |
| typecheck | `pnpm run typecheck` | 0 | 11.76 | `typecheck.log` |
| bulk-browser | `node /tmp/oncall-bulk-proof.mjs` | 0 | 54.8 | `bulk-browser.log` |
| triage-bulk | `env ONCALL_TRIAGE_PART=bulk node tests/triage.mjs` | 0 | 24.45 | `triage-bulk.log` |
| intake-machines | `env ONCALL_RUNTIME_PART=machines node tests/runtime.mjs` | 0 | 444.11 | `intake-machines.log` |
| intake | `node tests/intake.mjs` | 0 | 68.46 | `intake.log` |
| routing | `node tests/routing.mjs` | 0 | 113.88 | `routing.log` |

The intake machine run completed successfully, including the agent fixture paths that previously failed due to expired frozen-clock sessions. Native intake and routing also passed. The full local suite was not run: exact-SHA branch Verify provides the full wall, as the cloud brief requires. No tests were deleted, skipped or weakened.

## Counts and clause custody

| Measure | Before | After |
| --- | ---: | ---: |
| Done clauses | 26 | 26 |
| Partial clauses | 41 | 41 |
| Missing clauses | 34 | 34 |
| Total clauses | 101 | 101 |
| New test registrations introduced by this carry | 0 | 0 |
| Existing browser journeys extended by the original round | 1 | 1 |
| Carry commits beyond the starting main | 0 | 1 |

OC-079 remains PARTIAL. The pre-existing upper-bound, bundled-phone, delivery and native-device gaps remain as written on main. No policy default was needed and no DONE claim is made.

CLAIM OC-079 PARTIAL points=1,2,5 tests=tests/product-browser-journey.mjs#triageBulkBrowser

## CI and publication

Verify run 43362464763: https://github.com/just-every/run-oncall/actions/runs/43362464763.
Exact head: c5b917c34bc977ed82cf8b2b481f2da8f33779b2.
Observed status: completed; conclusion: success.
The Verify workflow includes the intake shard. No rerun or corrective push was needed. github-calls.json records the bounded API calls, ci-discovery.json identifies the run, and ci-final.json records its terminal result. No PR was created; this repository's instructions do not require one for the fleet candidate.

The first guarded product push succeeded; product-push.log is its actual receipt, and product-remote-ref.txt independently confirms the named branch's full head. Identity and trailers were audited for every candidate commit, including side parents. There is one fleet-authored, fleet-committed product commit and no coauthor trailer or skip marker.

The full publication scan and landing remain with the fleet Mac, as explicitly required by the cloud adaptation. This report and evidence publication do not claim main acceptance, landing or deployment. No blockers remain for returning the candidate under the READY contract.

Selected changed-screen proof: browser/OC-079-selected-target-1440.png, browser/OC-079-selected-target-390.png, browser/OC-079-retained-merge-1440.png, browser/OC-079-retained-merge-390.png. No credentials, environment dumps or held-out gate material are selected for publication.
