# Plain move-in review carry

Repository: just-every/run-oncall
Tag and branch: main-oncall-movein-plain-labels-1-c1 / cloud/main-oncall-movein-plain-labels-1-c1
Candidate: 2833697c0f0770529bd4c0022d995a4a0cd34837
Base and sole parent: 7f9d04290b2405f9a2372a51c079f44613e5db45
Carried round: cloud/main-oncall-movein-plain-labels-1-land-c4e128ba81 at 54929370ca56340060e06beb2f40ce3459229907
PR: none; the branch is returned to the fleet's guarded landing process.

## Plan and scope

The full plan is in PLAN.md. Refresh the authorized fleet launcher; use only the decrypted bundle for Git and gh; clone the declared repository with full history; install identity, preserved repository hooks and the supplied cloud toolchain. Start at current main, squash the previous round, preserve newer behavior/tests, restore the three contract files, regenerate the source lock last, and make one fleet commit. Run the relevant public browser and HTTP journeys plus typecheck, push only the named branch, wait for exact-SHA Verify with a single budgeted watcher, publish this selected report-only packet, and remove the pushed clone. No other repository, default branch, provider account or deployment is a write target.

## Result and conflict resolution

The product branch contains exactly one commit and no merge commits above the recorded main. The squash conflicted only in sources.lock.json: main's lock was restored, then regenerated and checked with the documented edition-authoring commands. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to recorded origin/main, verified by SHA-256 in structure-receipt.json. Their Status, Gap and Evidence cells were not edited.

All eight carried src/move-in source files match the previous resolved round byte for byte. Main's current count-overlap explanation and inactive-email-settings rendering remain in CompatibilityReview. Main's entire product-browser-journey file is recoverable byte for byte by removing only this round's new plainMoveInReview function and its invocation; no newer assertion was removed or changed. This includes the newer bulk-result journey. The main-only additions since the carried branch’s common ancestor are confined to that preserved bulk-result journey; the move-in counts and email rows were already shared by both heads. No test or CI registration, timeout, retry or sleep changed.

The review explains source references with exported names, missing final-coverage evidence with the export/preview choice, and backup gaps with the choice to add backup after adoption or continue with the gap. User-facing review differences omit field-name prefixes and raw status markers. Copy details keeps the complete original plan including fingerprint and internal values. An adopted schedule's undo refusal now names the schedule and explains that making it live prevents undo; support copy retains its native key and name. The SQL query only selects a name in addition to the existing data; the conflict predicate and write behavior are unchanged. No saved-plan, fingerprint, matching, adoption or preview-write behavior changed.

## Local proof on the candidate

- npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive completed through cloud_run, and the temporary setup app stopped.
- cloud_run npx -y @runeditrun/rer build passed on the committed candidate (build-receipt.json and build.log).
- Contract generator check, edition source-lock check, pnpm run typecheck, contract-byte equality and whitespace checks passed on the committed candidate (static-checks-receipt.json and static-checks.log). No contract change required generator write.
- The existing productImport export was invoked against the real emitted Worker and Chromium through the public owner door. It passed the current file import, exporter/readiness, adoption, erasure, integration activation/revocation, bounded resume and reconciliation flows, followed by the unchanged carried plainMoveInReview function (movein-browser-receipt.json and movein-browser.log). The external driver is included for reproducibility; it adds no product test registration.
- plainMoveInReview asserted at 1440, captured review and refused-undo states once each at 1440 and 390, checked no serious/critical axe violations and no desktop overflow, copied the exact preview payload, checked zero preview native writes, checked paused apply, and proved refused undo preserved every imported object and all live coverage. The four plain-move-in-*.png files are the actual changed-screen proof.
- tests/import-door.mjs passed, including the current PagerDuty account, signed/owner authority, publication revocation/failure rollback, apply/restart/reconcile/catch-up/undo, standing approval, erasure and inactive-key lifecycles (import-door-receipt.json and import-door.log).
- Main’s current imported-email browser journey passed: mapping reports/original unsupported action, inactive custody, explicit administrator activation and one-time address at 1440 with 1440/390 screen capture (imported-email-browser-receipt.json and imported-email-browser.log).
- tests/activation.mjs passed all 40 requirement flow groups plus the demo HTTP flow on the candidate, including both vendors’ bounded unfinished-checkpoint restart/resume/undo, SQL failure and lease-expiry publication, native-edit/superseded protection, revocation and erasure recovery fences (activation-receipt.json and activation.log).

## Counts and claims

Product commits above main: 0 -> 1. Merge commits: 0 -> 0. CI lane entries: 16 -> 16; new test registrations: 0. These are lane-entry counts, not a claim about the total number of behavior groups in the test suite.

The carried journey passed its zero-raw-marker assertion on the candidate. The brief's historical prior-round marker count was 4 -> 0; this run does not claim a new measurement of that historical baseline. The public file journey observed imported objects before=0, review=0, confirmation=0, apply=4, undo=0. The native unfinished-checkpoint journeys resumed PagerDuty at 20 of 30 records and Opsgenie at 20 of 34 records after a Worker restart, completed each reviewed job once, replayed without changes and undid exactly. The PagerDuty account fixture retained 75 records across all documented kinds, classification 1 mapped / 52 with differences / 22 rejected. The standing lifecycle retained baseline 46 -> reconciled 47 after one replacement and one addition; undo restored the prior 4 imported objects.

Contract status totals remain 26 done / 41 partial / 34 missing / 101 total. OC-021 and OC-022 remain as main judged them (done); this builder carries only the requested PARTIAL claims and makes no new DONE or status promotion.

CLAIM OC-021 PARTIAL points=1 tests=tests/product-browser-journey.mjs#plainMoveInReview
CLAIM OC-022 PARTIAL points=1 tests=tests/product-browser-journey.mjs#plainMoveInReview
DEFAULT OC-021: Preserve main's contract judgment, current saved-file mapping and paused import behavior.
DEFAULT OC-022: Preserve main's contract judgment and all resume/undo authority and native-edit protections.
GAP OC-021: This round proves the named synthetic review flow; it adds no live-account or real-export acceptance claim.
GAP OC-022: This round proves the adopted-schedule refusal and preserves broader HTTP recovery tests; it adds no new full-clause claim.

## Custody and gates

The fleet identity and all candidate commit messages were inspected before the one guarded product push. There are no trailers or CI-skip markers. The push succeeded on its first attempt (product-push-receipt.json and product-push.log). No force push, rebase of published history, main push or default-branch landing occurred. A credential-shaped-value review of the candidate diff passed; the cloud adaptation explicitly leaves the complete publication scan and landing to the fleet's own machine.

Exact-SHA Verify: run 43192941949, https://github.com/just-every/run-oncall/actions/runs/43192941949. The single REST watcher records discovery and each observation in ci-receipt.json, at intervals of at least 300 seconds with a ten-call ceiling. Verify completed/success on the exact candidate SHA, observed at 2026-11-12T09:56:59.927937+00:00. Five GitHub calls were used; no failed-job log, rerun, exception or additional product commit was needed. Evidence publication is a separate report-only ref and never claims product acceptance or landing.

Local runtime followed the supplied toolchain script: Node 24.19.0 and pnpm 10.12.4 (the script retains newer installed Node; the checkout pins 22.20.0). Branch Verify uses its checkout-pinned Node. Chromium was /usr/bin/chromium with --no-sandbox, a fresh context, the real HOME and no imported real-user session.

No product blocker has been observed. Full publication scan and main landing remain fleet-owned.

## Terminal result

READY branch=cloud/main-oncall-movein-plain-labels-1-c1 head=2833697c0f0770529bd4c0022d995a4a0cd34837

Verify run 43192941949 is completed/success on that exact SHA. The remote product branch was independently checked with git ls-remote and matches. All seven local/check/push receipts are successful; there are no product blockers. Full publication scan and main landing remain with the fleet, and no READY claim waives them. The clean pushed clone is removed after the separate evidence publication succeeds.
