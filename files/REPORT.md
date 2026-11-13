# Oncall session clock repair

Repository: just-every/run-oncall  
Branch: cloud/main-oncall-session-clock-1  
Head: cc64205ca532de3ac8022838ecdd07cfa5bfae73  
Base and refreshed main: 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4  
Exact-SHA Verify: https://github.com/just-every/run-oncall/actions/runs/43354284655  
PR: none; the fleet owns landing. No default-branch push or landing was performed.

## Result

Three agent-read fixtures now freeze at the current whole hour. Alert observation timestamps derive from that fixture instant as well. The intake shard and typecheck pass on Node 22.20.0 / pnpm 10.12.4 / TZ=UTC. All three repaired journeys also pass with the host, emitted Worker and SQLite wall clocks moved 30 days ahead to 2026-12-13. No production code or migration changed.

## Confirmed failure and window

The unchanged main intake command, `TZ=UTC node scripts/verify-oncall.mjs intake`, failed with `401 !== 200` at `tests/oncall-agent-fixtures.mjs:284`, in `analyticsFixture`. The fixture creates and password-signs-in a foreign responder, then posts that responder's incident acknowledgement through `/api/command`.

`src/api.ts:293`, in `issue`, stores password-session expiry as `Date.now() + 43200000` (12 hours). `session`, at `src/api.ts:263`, selects from `oc_current_sessions` and additionally compares expiry with JavaScript time. The immutable view in `migrations/core/0106_relational_workspace.sql:25-29` first rejects rows expired against SQLite's real `julianday('now')` clock. The November 12 noon fixture advances two minutes before the foreign login, so its password session expires at **2026-11-13 00:02:00 UTC**.

A separate baseline diagnostic on Node 22.20.0 reproduced that same assertion and read the actual D1 row: expiry `1794528120000`, SQLite now `1794537146019`, and `wall_clock_valid=0`. The bootstrap owner/native session remained valid, as shown by the preceding owner requests and the surviving current session; the newly issued historical password session was rejected. This is a dated fixture failure. The production expiry check is correct and remains intact.

## Changes and preserved purpose

- `tests/oncall-agent-analytics.mjs` / `analyticsReads`: derive the frozen start with `Math.floor(Date.now()/3600000)*3600000`. Preserve the real foreign-member login and acknowledgement, one-hour coverage, 60-second MTTA, scoped cohorts and non-disclosure checks.
- `tests/oncall-agent-triage.mjs` / `triageReads`: use the same relative start. Preserve native scoped preparation, exact counts, cursor ordering, pending snooze past due, authority refusals and zero-effect checks.
- `tests/oncall-agent-alerts.mjs` / `alertReads` and `admissions`: use the current whole-hour start; capture one relative ISO observation instant for native `observedAt` and Alertmanager `startsAt`. Repeated observations keep the original same-instant relationship. Preserve the six-alert projection, retained routing versions and observations, filtering, policy/refusal assertions and no-effect checks.
- `sources.lock.json`: regenerated with the documented edition-authoring command; only the three edited test-file hashes change. Its check passes.

At startup the fixture time trails real time by less than one hour, leaving more than eleven hours of the unchanged password-session validity window. All offsets inside the fixtures remain relative to their captured start.

## Calendar audit and counts

Searched all tests for fixed Date.UTC/new Date/Date.parse values and all platform, fixture and browser clock setters, then followed their inputs and sign-in ordering. `CLOCK-AUDIT.md` names the other historical calendar/DST, audit-week, email-rate and deadline clocks inspected, why their sessions remain valid, and the 2030 scenarios outside the requested 30-day horizon. No further expiring initial clock within that horizon was found.

| Measure | Before | After |
| --- | ---: | ---: |
| Expiring initial frozen agent clocks | 3 | 0 |
| Related fixed alert observation timestamps | 2 | 0 |
| Assertion-bearing lines in the three edited files | 147 | 147, identical |
| New/deleted/weakened test registrations | 0 | 0 |
| Done contract clauses | 25 | 25 |
| Partial contract clauses | 36 | 36 |
| Missing contract clauses | 27 | 27 |

Clause status changes: none. No CLAIM or acceptance promotion is made. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain byte-identical to main.

## Plan and execution

1. Set fleet Git identity first, refresh the fleet launcher, install the required Git credential/push guards, shallow-clone only the declared repository, create the named branch and preserve repository hooks through the fleet commit hook.
2. Read repository guidance, contract and generated acceptance; install the repository toolchain and run noninteractive setup. Build the unchanged application and reproduce the intake failure before editing. The initial complete reproduction used the supplied Node 24.19.0; the targeted actual-D1 diagnostic then confirmed the same failure on pinned Node 22.20.0.
3. Audit clock inputs and sign-in ordering; update the three starts and two dependent observation fields. Verify all 147 assertion-bearing lines remain identical; add no test, assertion or application behavior.
4. Run the complete intake shard and typecheck on Node 22.20.0. Run the three fixed journeys once with a local 30-day wall-clock shim that changes realtime/gettimeofday/time only; elapsed timers and sleeps remain unchanged. Read actual SQLite time and assert it agrees with the shifted host before executing the original journeys.
5. Generate/check the source lock, commit only the three fixture files and lock, fetch/rebase against origin/main (already up to date), regenerate/check the lock last, inspect every candidate author's/committer's identity and trailers, and push the sole product head through cloud-push.py. One attempt succeeded; no skip marker, force push or published-history rewrite.
6. Observe exact-SHA Verify through one REST watcher with at least 300 seconds between discovery/polls; retain sanitized actual receipts outside the product clone. Publish the explicitly selected report packet only to evidence/main-oncall-session-clock-1, then remove the successfully pushed product clone.

A diagnostic initially launched through `node --input-type=module` stalled during local D1 startup. Those owned processes were stopped; using a regular `.mjs` runner resolved the diagnostic issue, including on Node 22.20.0. This did not require a product change.

## Verification receipts

- `main-intake.log`: unchanged-main full intake failure at the named analytics assertion (expected baseline exit 1).
- `main-analytics-diagnostic-node22.log` and `baseline-analytics.mjs`: pinned-version reproduction and actual SQL expiry evidence; diagnostic confirms the expected 401 and exits 0.
- `candidate-intake.log`: complete intake shard, exit 0, including runtime machines, email intake and routing.
- `candidate-typecheck.log`: `pnpm run typecheck`, exit 0.
- `future-fixtures.log`, `future-fixtures.mjs` and `clock-shift.c`: one-off future proof, exit 0. Host UTC `2026-12-13T02:43:46.395Z`; SQLite UTC `2026-12-13 02:43:49`; alertReads, analyticsReads and triageReads all pass under autonomous and held policies. The shim and probe are report-only, never registered or committed as product tests.
- `LOCAL-RECEIPT.json`, `PRODUCT-RECEIPT.json`, `assertion-parity.json`, `source-lock-receipt.json`, `source-changes.log`, `identity-receipt.json` and `product-push.log`: command results, unchanged assertions, exact product custody and source hashes.
- `ci-result.json`, `ci-watch.log` and `github-calls.json`: exact-SHA workflow evidence and API-call timestamps. Exact-SHA Verify completed successfully; see CI-RECEIPT.json and the final observation below.

## Custody and remaining gates

The single product commit is pushed to cloud/main-oncall-session-clock-1. Evidence publication is a separate report-only Git tree and does not signal product acceptance or landing. The fleet's independent publication scan and landing gates remain fleet-owned and were not claimed as executed in this VM. No blocker has been identified by the completed local checks. Exact-SHA Verify completed successfully. There are no builder blockers. The fleet owns the independent publication scan and landing.

## Final CI observation

Verify run 43354284655 completed with **success** on exact head `cc64205ca532de3ac8022838ecdd07cfa5bfae73`. 5 CI commands were used within the ten-call budget, with the single watcher scheduled at five-minute intervals. No workflow rerun, failed-job log read or unrelated repair was needed. The product branch was published once. No contract-generator exception was used.
