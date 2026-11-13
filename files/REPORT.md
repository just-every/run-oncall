# sd-oncall-c-f224-ci-fix-1: stopped on the required main-failure condition

Recorded 2026-11-13 UTC. Repository: just-every/run-oncall.

The same analytics assertion fails on both the f224 lander head and current main. The brief explicitly says: “If main also fails the same case, stop: post one line with the evidence to lanes/fv/INBOX.md and end BLOCKED naming it (no edit).” That condition is met. No product files, assertions, contract judgments, generated views or source lock were edited. No product commit or product push was made, and no PR was created.

## Exact provenance and results

| Item | Exact head | Build | Intake reproduction |
| --- | --- | --- | --- |
| f224 lander candidate | 271f824fb0805400beda94a572792f3bb27f8635 | exit 0 | exit 1, 401 !== 200 |
| Current origin/main, fetched again before its run | 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4 | exit 0 | exit 1, identical assertion and stack |

The candidate was fetched from `cloud/sd-oncall-c-f224-land-948bc6c878-rebase-271f824fb0805400beda94a572792f3bb27f8635`. The local task branch is `cloud/sd-oncall-c-f224-ci-fix-1`, restored at 271f824fb0805400beda94a572792f3bb27f8635 with a clean tracked worktree. This task branch was not pushed: the brief's stop condition precedes any repair or publication of a product candidate.

Both heads ran their own production build with:

```sh
. /tmp/rer-cloud-toolchain.sh
cloud_run npx -y @runeditrun/rer build
ONCALL_RUNTIME_PART=machines cloud_run node tests/runtime.mjs
```

This is the existing runtime machines command selected by Verify's intake lane (`scripts/verify-shards.json`, through `tests/verify.mjs`). It reaches the unmodified analytics flow through the same import as CI. This was a targeted reproduction, not a full local Verify. Setup previously succeeded with `cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive`.

Both reproductions fail with:

```text
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
401 !== 200
at analyticsFixture (tests/oncall-agent-fixtures.mjs:284:11)
at async Module.analyticsReads (tests/oncall-agent-analytics.mjs:12:17)
at async tests/oncall-agent-flow.mjs:672:1
```

The foreign responder's `/api/login` already passed its HTTP 200 assertion at line 281. The following authenticated `/api/command` acknowledgment returns 401 at line 284. The fixture/analytics/flow, runtime helpers, `src/api.ts` and session-cookie code are byte-identical on the two tested heads; `source-comparison.json` records their hashes. This demonstrates the failure also exists on current main; it does not establish the underlying cause, which was not repaired under this stop condition.

Local commands used Node 24.19.0, pnpm 10.12.4 and the installed pinned rer 0.2.108; the provided toolchain retains a newer installed Node than the checkout's minimum pin 22.20.0. The original CI failure used Node 22.20.0 and has the identical assertion and stack.

## CI and custody

- Verify run 43342360159 is completed/failure on exact SHA 271f824fb0805400beda94a572792f3bb27f8635: https://github.com/just-every/run-oncall/actions/runs/43342360159
- Failed job: 131614286294, shards (intake). Its failed-step log archive was read once using `gh run view 43342360159 --repo just-every/run-oncall --job 131614286294 --log-failed`; it succeeded and matches both local failures.
- Two GitHub CLI/API budget calls were used out of ten: one exact-run status read, one failed-job log invocation. `github-calls.jsonl` retains the commands, UTC stamps, sanitized responses and exit codes.
- No new exact-SHA Verify was triggered, no workflow rerun was requested, and no READY or PUSHED product claim is made.
- Fleet identity and hooks were configured. The candidate identity/trailer check is in `product-identity-check.txt`; the visible candidate commit has fleet author and committer and no trailers. No published history was rewritten.
- No product push rejection occurred, so no push-rescue bundle was required. The existing remote lander branch still holds the original candidate. The packet is published separately to the report-only evidence ref; evidence publication is not product readiness or acceptance.

## Counts, clauses and scope

Product commits created: 0. Product files changed: 0. Tests added/removed/modified: 0/0/0. The targeted analytics case fails on both heads (one identical failure on each); no assertion was weakened, skipped or deleted.

The candidate's inherited clause totals remain 27 done / 40 partial / 34 missing / 101 total before and after this task. Current main has 26 done / 41 partial / 34 missing / 101 total. That inherited difference is the original f224 OC-018 judgment, not a status change made by this repair task. OC-018 remains untouched: inherited done on the failed candidate, partial on tested main. No new clause status, Gap or Evidence change is claimed.

CLAIM none

The f224 `tests/transfer.mjs` build and deploy dry-run proofs were not rerun after merging main, because the prescribed main-failure stop was met before any merge or repair. This task therefore supplies no renewed OC-018 DONE point 1 claim. Typecheck, touched repair checks, lock regeneration/check and a new branch Verify were not run after that stop condition. There were no UI changes, so no browser proof was required.

## Completed plan and next action

The full original execution plan is in `PLAN.md`. Steps 1–4 completed: configure the fleet/checkout, read guidance, fetch the exact branch, build and reproduce candidate, fetch main again, build and reproduce main, compare source and retain actual logs. The conditional repair path (steps 5–7) was correctly not entered because main failed identically. Step 8 returns the evidence packet on its separate ref.

The blocker is the pre-existing main analytics responder-session refusal. The fv lane should assign a scoped main repair for the 401 acknowledgment, then rerun f224 integration and exact-SHA Verify without weakening analytics assertions or f224's deploy dry-run proof. There is no missing user ruling or account, and this task makes no landing request.

## Required queue entries

POST lanes/fv/INBOX.md: sd-oncall-c-f224-ci-fix-1 BLOCKED/no edit: ONCALL_RUNTIME_PART=machines node tests/runtime.mjs fails identically with 401 !== 200 at tests/oncall-agent-fixtures.mjs:284 -> oncall-agent-analytics.mjs:12 -> oncall-agent-flow.mjs:672 on f224 head 271f824fb0805400beda94a572792f3bb27f8635 and current main 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4; both production builds pass; original Verify 43342360159/job 131614286294 confirms the same failure. Main repair required under the brief's stop condition.
POST lanes/sd/INBOX.md: sd-oncall-c-f224-ci-fix-1 BLOCKED on identical current-main analytics 401 at fixtures:284; branch cloud/sd-oncall-c-f224-ci-fix-1 local head 271f824fb0805400beda94a572792f3bb27f8635, main tested 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4; CI run 43342360159/job 131614286294 failed, no new CI or product push; clause changes none, CLAIM none, tests changed 0, candidate counts unchanged 27/40/34 (101).
