# Refusal explanations: clock-fix integration

Repository: just-every/run-oncall
Branch: cloud/main-oncall-explain-refusals-1-fix1-c1
Candidate: ee708e33867764e3022d3d055b3761666bfe8cdd
Starting published head: 6db7f98e020f55e12ed4b2362cf30d93970275a4
Merged main: 1e8f35e (full SHA recorded in receipt.json)

The prerequisite is satisfied: main includes 051a993, which changes agedReplayRetention from the 4 November fixed clock to the current whole hour. The named branch was created at the requested published head and merged main without rebase or force push. The merge had no conflicts. Main's README, local-deploy documentation, aged replay test and Commander replay test were retained. No product code was authored in this round. The existing inline validation, first-invalid-field focus, server refusal feedback, disabled-action explanations and member-coordination capture changes remain intact.

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to merged main. No clause text, Status, Gap or Evidence changed. The source lock was regenerated last and checked. No tests were added, removed, skipped or weakened in this round. The acceptance totals remain 22 done / 45 partial / 34 missing, 101 total, before and after. The test-registration delta is zero; this round introduces only main's existing tests through the merge.

The plan is saved in PLAN.md. Actual setup, check, browser, push and CI outcomes are recorded in receipt.json and selected logs. Browser proof is synthetic emitted-Worker proof, not a hosted or live-provider receipt. This cloud does not run the fleet's final publication scan; the Mac lander's independent publication gate remains required.

CLAIM OC-009 PARTIAL points=none tests=tests/product-browser-journey.mjs#productSchedule
GAP OC-009: This integration does not complete all accessible-interface obligations, assistive-technology passes or per-release conformance reporting. Main's existing partial judgment is retained.

No PR is required by this repository's supplied instructions; the fleet owns landing the exact cloud branch after its independent gates. No main push or landing operation was performed.

## Local validation

All checks ran against ee708e33867764e3022d3d055b3761666bfe8cdd and passed:

- Fleet setup and production build through cloud_run npx -y @runeditrun/rer.
- pnpm run typecheck.
- Contract generator check and documented source-lock regeneration/check.
- Complete tests/member-coordination-browser.mjs, including client invalid-input refusal, real server refusal with retained input, missing manual-status reason, sign-in, authority and automation checks.
- Existing focused product accessibility journey, including productSchedule, real stale-write refusal, keyboard focus, labels, dialog containment and saved-state checks.
- Existing focused readable-times journey, including disabled swap explanation, substitute selection, independent acceptance and effective override.
- Complete tests/oncall-agent-flow.mjs. Aged native outcomes replayed at 24 hours and 24 hours plus one second under autonomous and held policies. Main's Commander lost-response recovery also passed under both policies.

Browser execution used /usr/bin/chromium with --no-sandbox and real HOME. Fourteen explicitly selected synthetic Status, rota-name, cover-preparation, cover-review and swap captures show the changed screens at 1440 and 390. Their byte hashes and dimensions are in browser-receipt.json. The test file's pre-existing selected phone leg was retained; this round added no test. All test processes finished through cloud_run, which reaped their children.

The candidate has six commits ahead of merged main, including side parents: all author and committer identities are Run Edit Run fleet <fleet@runeditrun.com>; trailers are absent. The final merge message has no skip-CI marker. The worktree was clean, candidate additions passed a credential-pattern check, and the fleet push guard succeeded on attempt one. Product ref custody is separate from evidence publication and independent landing gates.

## Exact-SHA CI and terminal product custody

Verify 43106483365 completed successfully on ee708e33867764e3022d3d055b3761666bfe8cdd:
https://github.com/just-every/run-oncall/actions/runs/43106483365

Five GitHub calls were used. One response required a local watcher sanitizer repair; no product edit, workflow rerun or additional push was needed. The actual call ledger and valid observations are included. All local touched checks and exact-SHA Verify passed. No blockers remain for this builder round; the fleet's independent publication and landing gates still apply.

Product branch: cloud/main-oncall-explain-refusals-1-fix1-c1
Product head: ee708e33867764e3022d3d055b3761666bfe8cdd
Product push: successful, first attempt, remote ref independently read back.
PR: none created.
Clause changes: none; OC-009 remains PARTIAL, points=none.
Before/after totals: 22 done, 45 partial, 34 missing; 101 total in both.

This complete selected packet is returned only through refs/heads/evidence/main-oncall-explain-refusals-1-fix1-c1. The evidence transport does not land the product or waive independent gates. The product clone will be deleted after successful evidence publication, as requested.

READY branch=cloud/main-oncall-explain-refusals-1-fix1-c1 head=ee708e33867764e3022d3d055b3761666bfe8cdd
