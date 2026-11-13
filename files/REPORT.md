# Oncall bulk selection: main-oncall-bulk-selection-1

Repository: just-every/run-oncall
Branch: cloud/main-oncall-bulk-selection-1
Product head: 86d1ea6d2cd251b5795fb6c92b7f52ec475adbe4
Base main at final fetch/rebase: 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4
PR: none; this task uses the fleet branch landing lane.

## Result

Stranger-29 items 7 and 8 were reproduced through the real emitted Worker and Chromium before implementation. With both incidents selected, the merge target had zero options. Bulk acknowledge changed one incident and skipped an already acknowledged incident; keeping the changed incident selected and merging it without reloading returned `Incident changed. Reload before applying your edit.`

The client now advances selected revisions only from successful per-item receipts whose original selected revision still matches. It never adopts unrelated revisions from a workspace refresh. Continuations and retries retain the original operation body and identity even while its own receipts update the visible selection. After the first response, an all-matching selection becomes its explicit selected snapshot; selections larger than the explicit 500-item limit are cleared with a plain note and retained results. Successful merges likewise clear the now-invalid source selection and keep the complete per-item results visible.

The merge form explains which incident will remain. It offers selected incidents as targets when the remaining explicit source count fits the existing door. The chosen target is excluded from the source list; its captured selection revision is used if it was selected. The submit button and confirmed count reflect the source count. One selected incident cannot merge into itself, and large selections retain the existing public-door limits. No server merge, reason, authority or optimistic revision rule changed.

Product files: src/app/IncidentBulkActions.tsx, src/app/IncidentTriage.tsx, tests/product-browser-journey.mjs, and their generated sources.lock.json entries. No contract text, clause status, gap, evidence cell, generated acceptance view, screenshot or fleet report is committed to the product branch.

## Validation

- Setup: `cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive` completed successfully. Toolchain followed the supplied shim (Node v24.19.0, pnpm 10.12.4; package engines names 22.20.0, producing an engine warning only).
- `pnpm run typecheck`: passed. Actual output is typecheck.log.
- `cloud_run npx -y @runeditrun/rer build`: passed. Actual output is build.log.
- Existing `tests/product-browser-journey.mjs#triageBulkBrowser` at 1440: passed through emitted Worker HTTP and a real Chromium browser at /usr/bin/chromium with --no-sandbox. bulk-runner.mjs contains the actual focused launcher; bulk-browser.log contains the actual successful output.
- New assertions extend that same journey: both selected incidents can be targets; acknowledge yields one success and one skip; without reload or reselection, picking the selected target and merging submits the successful source's committed revision, excludes the target from sources, confirms one source, succeeds and preserves the durable target relation. Merged selection clears.
- Existing assertions still pass: 50 all-matching acknowledgments, shared operation/timeline identity, unchanged replay, named success/skip/stale-refusal outcomes, same-value no-op, held list refresh after snooze, subsequent merge, alert-only close/history, and existing workflow legs inside the same function. No last assertion was deleted or weakened.
- Browser assertions use one width, 1440. Changed form and result proof was captured once at 1440 and 390 and visually inspected. Controls, explanation and result are readable at both widths, with a single border per field. Existing journey checks include axe, overflow and hydration.
- Final `git fetch origin main` and `git rebase origin/main`: main remained 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4; no replay conflicts or source changes. The tested product code is identical to the committed candidate.
- Source lock regenerated last with `node scripts/edition-authoring/cli.mjs lock`; its `check` passed. Actual check output is source-check.log. Only the three touched files' lock entries changed.
- `git diff --check`: passed. Fleet commit hooks remained active, with repository hooks preserved. Every candidate author/committer was Run Edit Run fleet <fleet@runeditrun.com>; no trailers or skip-CI markers. The named product branch push succeeded on attempt 1. product-push.log is the actual transport receipt.
- Full local Verify was intentionally not run: the requested full wall is exact-SHA branch Verify. The fleet's Mac publication scan is a separate landing gate and cannot run in this cloud task; no publication-scan success is claimed.

## Counts and clause custody

Observed stranger failures in scope: 2 before -> 0 after in the focused public-door journey.
Existing bulk journey registrations: 1 -> 1; new registrations: 0. Oncall lane command registrations: 16 -> 16. No test cap increase or new test script was committed.
Contract summary unchanged: Done 26 -> 26; Partial 41 -> 41; Missing 34 -> 34; total 101 -> 101.
OC-079 status unchanged: partial -> partial. No DONE claim or clause judgment change.

CLAIM OC-079 PARTIAL points=1,2,5 tests=tests/product-browser-journey.mjs#triageBulkBrowser
DEFAULT OC-079: Retain receipt-confirmed revisions for explicit selections; clear merged sources or selections above the explicit-selection limit with a plain note and retained results. The chosen selected merge target is a destination only, never a source.
GAP OC-079: This round proves a three-item mixed stale refusal, rather than claiming the full one-stale/49-commit acceptance point 4. It does not prove all bulk operations at both upper bounds, bundled SMS delivery, native-device behavior, hosted scale or the other existing contract gaps. The release remains coordination only with paging OFF.

## CI and custody

Product push succeeded for 86d1ea6d2cd251b5795fb6c92b7f52ec475adbe4. Verify run 43353600782 was discovered on that exact SHA: https://github.com/just-every/run-oncall/actions/runs/43353600782 . Final status: completed/failure on that exact SHA. The plan and build passed. Six of seven execution shards passed, including the full browser shard; intake failed. The aggregate verify job consequently failed. Actual discovery, final status, job steps and failure log are in ci-discovery.json, ci-final.json, ci-jobs.json and ci-failed-intake.log. CI-RECEIPT.json records six GitHub calls and zero reruns. No run on another SHA can establish readiness.

Confirmed blocker: job 131650955510, shards (intake), step Run this shard, failed at analyticsFixture in tests/oncall-agent-fixtures.mjs:284:11 with `401 !== 200`, matching the pre-existing session-clock failure named in the brief. The completed job log was read once using `gh run view 43353600782 --repo just-every/run-oncall --job 131650955510 --log-failed`; archive access succeeded. Aggregate job 131655181229 (verify), step Require the selected coverage and its proof, consequently failed. This task neither fixes nor reruns the known clock failure. Product work is complete and pushed, but READY is withheld pending Successful exact-SHA Verify. Evidence publication does not constitute product readiness or landing.

The full plan is PLAN.md. All actual non-secret reports, outputs and screen proof stay in this packet; the separate report-only evidence ref transports them without modifying product HEAD or index. Main was never pushed, no lane INBOX or STATE file was read or written, and no other repository was cloned or changed. All started browser and Worker processes were closed by their focused runner.

Terminal product custody: BLOCKED branch=cloud/main-oncall-bulk-selection-1 head=86d1ea6d2cd251b5795fb6c92b7f52ec475adbe4 prerequisite="Successful exact-SHA Verify"
