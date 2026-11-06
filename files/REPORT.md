# Oncall runtime Verify continuation

Terminal result: exact-SHA Verify 42213733465, attempt 1, completed/success on 534709f51591399b4a050d652b2028fc3daceb05. All seven push shards and the required aggregate passed. The runtime/triage timeout is cleared and max/mean shard balance is 1.327x. Full Verify is 14m25s, so the <=10min wall target remains unmet. Clause/status changes: none. Product READY custody is separate from evidence publication, acceptance and landing.

Tag: sd-oncall-runtime-cishape-20261106-1-pc1
Repository: just-every/run-oncall
Branch: cloud/sd-oncall-runtime-cishape-20261106-1-pc1
Starting published head: d2535e40fefe03697aaa62c8ef9cd917cc250bc1

## Plan

1. Load fleet identity, launcher, credential helper, commit hooks and pinned toolchain. Fetch the continuation ref and preserve its published history. Read live main and candidate instructions, workflow ownership, selection/build/discovery helpers and the previous exact-SHA Verify job metadata.
2. Diagnose the remaining triage timeout without rerunning or dispatching historical CI. Decompose only whole independent existing test journeys if necessary. Redistribute them across the existing eight push shards, preserving every assertion, default/flows/browser discovery, public/hosted door, event allowance, runner/browser policy, aggregate and release/nightly route. Keep one shared production build and current worker counts/timeouts.
3. Prove before/after discovery and whole-group coverage exactly once with one-off probes. Prove assertion bodies unchanged. Run touched harness checks, syntax/YAML/workflow permissions, relevant typecheck/rer check and source-lock generator/check. No baseline suite or full local rer verify.
4. Fetch and merge current main without rewriting the saved commit. Regenerate the source lock last. Commit with fleet identity and active hooks, inspect all candidate authors/committers/messages/trailers, and perform maintained exact-tree publication hygiene. Push only the named product branch with the fleet guard.
5. Discover and assess exact-SHA Verify by REST, within ten GitHub calls and at least 300 seconds between reads of a run. Preserve actual non-secret reports/receipts in this packet and publish them only to the separate evidence ref. Report timings and any remaining gap honestly. Do not modify f204 custody, contracts, views, holds, product/UI/provider/release/version state.

## Observed starting failure

Verify 42187978821, attempt 1, exact saved head d2535e40fefe03697aaa62c8ef9cd917cc250bc1: shards (triage), job 127794393563, cancelled after 15m15s including 13m11s in Run this shard. The other seven shards succeeded. The aggregate verify failed as a consequence. Runtime core took 3m08s total / 1m50s run step; changes 3m04s / 29s; imports 2m49s / 1m24s. The previous partition moved triage plus activation together and did not clear the timeout.

The single permitted failed-job archive command was `gh run view 42187978821 --repo just-every/run-oncall --job 127794393563 --log-failed`. It returned exit 0 and zero bytes; no repeat read was made. Job metadata is retained in prior-jobs.json. No assertion failure is inferred from the empty archive.

## Change and grouping

The continuation changes only scripts/verify-shards.json, tests/verify.mjs, tests/triage.mjs and the generated sources.lock.json. The saved d2535e40 commit is preserved. No workflow or Base template bytes change: Verify is an acknowledged seed adaptation (SHA-256 f53668b527704b4e9f9e0823e6d073ea4350a9055a9b665d9d92554828c77c82) with an existing seed-owned dynamic matrix. Its source ownership metadata stays intact.

Triage now accepts whole independent groups bulk, bounds, storm and reports. The default still executes all four in the original order. Invalid selectors fail closed. The harness passes the selected group environment to the child process. Removing only selection scaffolding reconstructs the original triage file byte for byte, including every assertion, HTTP call, retained fixture, scale limit and cleanup.

| Push job | Existing work |
| --- | --- |
| runtime | runtime/core; triage/bulk; triage/storm |
| intake | runtime/machines; intake; routing |
| browser | member-coordination-browser; product-browser |
| hosted | unchanged rer verify --non-interactive public/deployed coverage |
| transfer | unchanged transfer journey |
| changes | changes; activation; import-door; triage/reports |
| triage | triage/bounds alone, including 1,500 real admissions and both 500-selected and 1,000-matching closures |

Push jobs decrease from 8 to 7 (original main had 5). No timeout or worker count increases. The Chromium flags still select browser, hosted and transfer only. The build-once exact-SHA artifact, ubuntu-24.04, concurrency cancellation, launch-before-apt probe, SDK policy, all event allowances, duplicate/light rules, required aggregate, release/nightly routing and all public doors remain unchanged.

## Coverage

Entrypoint invocations change from 11 to 14 solely by decomposing the one triage invocation into its four existing groups. Expanded existing journey groups are 14 before and 14 after, with zero duplicates or omissions. All ten entrypoint files remain selected. Both runtime parts core and machines execute once; hosted linked-page/public-production assertions remain in core exactly once. Hosted rer verify remains once in addition to those application selections.

One-off execution recorders capture the actual default, --flows, --browser, per-lane and shard-dispatch choices. Every expanded multiset matches. Whole-group probes execute the actual selector guards, preserving default order and refusing unknown selections. Prebuilt lanes perform no preparation; stale build receipts refuse. Changed harness/configuration files require full coverage rather than light treatment.

The 61-file test census retains 5,514 direct static assert/assert.* call sites. Only tests/triage.mjs and tests/verify.mjs differ; all other 59 test files are byte-identical. This source census counts static call sites, not loop-expanded runtime assertions. The source reconstruction and selection probes prove scheduling preservation; actual local group runs and exact-SHA GitHub Verify provide execution evidence.

## Clause and source preservation

Clause/status changes: none. All 101 judgments remain 17 done, 50 partial and 34 missing. CONTRACT.md, ACCEPTANCE.md, docs/CLAIMS.md, BASE-AGENT-012 and all other Status/Gap/Evidence/provenance are untouched. Source/review/provider/release holds, FIX lifetimes, migrations and release/version metadata stay intact. This is no product FIX claim and does not readmit f204.

The cloud uses the seven-job seed matrix without forking a Base template. No PR is created or duplicated; the fleet lander owns final publication/landing gates and exact-main Run site. Only the named cloud branch is a product push target.


## Local checks and timing

All four selected triage groups passed against the setup build of the saved d2535e40 product source, with the new test selectors in the working tree: bulk 26.842s, bounds 432.986s, storm 36.384s and reports 50.864s. Bounds timing uses Linux process start ticks to pidfd exit readiness, including startup and worker cleanup; the other groups use a monotonic subprocess timer and the subreaper. These are local measurements, not GitHub after timing and not proof of either timing target.

The actual groups retain the complete 50-incident bulk acknowledgment, 1,500 authenticated alert admissions, 500-selected/1,000-matching completion and refusal bounds, per-item continuation/retry/authority/audit assertions, storm and status assertions, response-report CSV/erasure denominators and all cleanup. No application mocks or fallback code were introduced. Only one heavy local job ran at a time. No baseline suite or full local rer verify was run.

One-off coverage and dispatch probes passed. Syntax checks passed for tests/triage.mjs, tests/verify.mjs and the selection/dispatch helpers. Both Verify YAML documents parsed with the maintained vendored parser. Existing workflow permission/artifact-name checks and generated contract-documents check passed. actionlint is not installed. The repository-documented source lock write/check completed successfully; the lock changes only the three intentional source-file hashes.

Setup used the noninteractive fleet owner and its temporary app stopped. Hooks were reinstalled after setup. The local toolchain uses Node v24.19.0 / pnpm 10.12.4; CI's pinned .node-version is unchanged. The exact-SHA GitHub wall will rebuild once and run all selected coverage.


Typecheck and the first-party rer check passed. Before publication, origin/main advanced from 8e02f66 to 75e47a5 with its scoped service-result projection fix. The first merge attempt correctly refused to overwrite the uncommitted source lock. The completed CI-shape change was committed, then current main was merged without rewriting the published saved head. Its source fix was retained exactly; CONTRACT.md and every view/judgment were unchanged. The documented contract generator/check ran, views were restored from origin/main, and the source lock was regenerated last and checked. Typecheck and rer check passed again on the merged candidate. Coverage/dispatch probes passed again with the new exact checkout identity.


## Publication preparation

The maintained pinned rer 0.2.96 publish-check path inspects a clean detached worktree at the exact candidate commit/tree, with the canonical project and HTTPS destination and the decrypted bundle supplied by file path for value-free credential matching. The initial invocation correctly stopped at argument validation because --public-base requires URL#branch, not a local tracking ref; the corrected invocation uses https://github.com/just-every/run-oncall.git#main. Both actual diagnostic envelopes are retained. No finding was waived. The initial shallow clone was expanded to full main history before scanning. Gitleaks 8.30.1 was installed from its published archive with SHA-256 551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb verified. The independent Mac publication/landing gate remains the fleet's responsibility.


The corrected exact-candidate publication scan completed PASS with zero findings. Its source commit is 534709f51591399b4a050d652b2028fc3daceb05 and tree 4b51683600ca9d8ed3ec0b6ffaeeb19d3e0a8475, matching both clean product and inspection worktrees. Full candidate identities and messages were inspected, including side parents: all three commits use Run Edit Run fleet <fleet@runeditrun.com> for author and committer and contain no co-author trailers. Current main was fetched again before push and is included in the candidate.


The product push succeeded on attempt 1 at 2026-11-06T11:54:58.961216+00:00. An independent credential-free git ls-remote advertised the exact full head 534709f51591399b4a050d652b2028fc3daceb05 at refs/heads/cloud/sd-oncall-runtime-cishape-20261106-1-pc1. The product checkout stayed clean; the inspection worktree was removed after its exact-tree receipt was saved. The publication scan took 150.27s over 964 history commits with zero new findings; 4 existing diagnostic envelopes remain classified as pre-existing. No main, tag, release or PR was pushed.

## GitHub evidence policy

Only two GitHub diagnostic invocations have been used before candidate CI discovery: the starting run's jobs metadata and its one empty failed-job archive. No historical run was rerun or dispatched. Candidate discovery uses the exact full product SHA; one watcher keeps every later read of that run at least 300 seconds apart and stays within ten diagnostic invocations. A running candidate remains PUSHED until completed/success is actually observed on that same SHA. Job timing, full wall and the two timing targets remain pending rather than inferred from local results.


Candidate Verify run 42213733465, attempt 1, was discovered with the exact SHA 534709f51591399b4a050d652b2028fc3daceb05 and named branch. Its first observation is in_progress / null. URL: https://github.com/just-every/run-oncall/actions/runs/42213733465. Three diagnostic invocations are used. The continuation requires green exact-SHA Verify, so this task retains PUSHED custody while waiting for an allowed later read; it does not claim readiness or after timing from another SHA.


The separate evidence-directory Gitleaks scan reports four generic hex-key assignment matches, all baseline.key fields in the two full source-lock generator/check outputs. Each was checked against the exact committed sources.lock.json component baseline content hashes. They are public content-address keys, not account credentials; every other selected packet file had zero matches. The redacted actual report and public-hash classification receipt are retained. No scanner policy or product gate was weakened. Private setup state, injected credential files/values, environment dumps and symlinks are excluded from evidence selection.


Local triage execution preceded the upstream 75e47a5 merge. The later typecheck and rer check cover the merged candidate; exact-SHA GitHub Verify rebuilds and executes the final merged product source. Local results are not represented as execution of a different build.


The <=10 minute target is not achieved on this candidate: the exact-SHA run was still in progress at 780.3 seconds after workflow creation. Final job durations, the actual critical path and the max-to-mean ratio remain pending. This is an observed timing limit, not a claim of a green or failed conclusion.


## Measured exact-SHA candidate jobs

Run 42213733465, attempt 1, is bound to 534709f51591399b4a050d652b2028fc3daceb05. Its seven shards, full-push proof and required aggregate verify job all completed successfully. The final workflow-status REST observation is still pending its allowed read interval; job success is not substituted for that explicit observation.

| Shard | Previous job / run step | Candidate job / run step |
| --- | --- | --- |
| shards (transfer) | 9m36s / 6m28s | 11m24s / 9m03s |
| shards (hosted) | 3m16s / 1m46s | 5m55s / 2m05s |
| shards (intake) | 9m40s / 8m30s | 10m43s / 8m42s |
| shards (changes) | 3m04s / 0m29s | 8m16s / 7m04s |
| shards (browser) | 9m14s / 6m54s | 9m49s / 7m13s |
| shards (triage) | 15m15s / 13m11s | 9m31s / 8m08s |
| shards (runtime) | 3m08s / 1m50s | 4m30s / 2m58s |

The previous triage job contained all four triage groups plus activation and timed out. The candidate triage job contains bounds alone; the other groups and activation are still executed once in the runtime/changes jobs. Previous changes and candidate changes carry different group combinations. The previous imports job is now included in changes. Before/after timing therefore describes the changed job topology, not less test work.

The candidate's maximum shard duration is 11m24s, versus a mean of 8m35s: 1.327x, meeting <=1.5x. Run-step-only maximum/mean is 1.401x. Triage dropped from a censored 15m15s job / 13m11s step to 9m31s / 8m08s, retaining 5m29s of its unchanged 15-minute job guard. Runtime is 4m30s / 2m58s. No timeout or worker count was increased.

Full creation-to-last-job time is 14m25s; the observed first-to-last job span is 14m22s. The <=10min full-wall target is **not achieved**. Transfer is the final shard at 11m24s total / 9m03s run step, after a 2m36s shared build. Intake is 10m43s / 8m42s, browser 9m49s / 7m13s, and triage 9m31s / 8m08s. The runtime timeout cause is cleared on this exact candidate, while the full-wall goal requires further critical-path work beyond this focused runtime partition. No claim is made that all original timing aspirations have been met.



## Terminal workflow and custody

The final permitted REST read of repos/just-every/run-oncall/actions/runs/42213733465 returned status completed, conclusion success, head_sha 534709f51591399b4a050d652b2028fc3daceb05 and the exact workflow URL. Seven diagnostic invocations were used out of ten, with one candidate watcher and at least 300 seconds between its network reads. No workflow dispatch or rerun was used; every candidate job succeeded on attempt 1.

Final product branch: cloud/sd-oncall-runtime-cishape-20261106-1-pc1. Head: 534709f51591399b4a050d652b2028fc3daceb05. Tree: 4b51683600ca9d8ed3ec0b6ffaeeb19d3e0a8475. Functional commit: 653f6b77aadcc3e049f433bf1f907434cb3cb356. Current-main merge: 534709f51591399b4a050d652b2028fc3daceb05, retaining main 75e47a564a641e16b29f607899424397cfbc901b and the starting published d2535e40fefe03697aaa62c8ef9cd917cc250bc1. PR: none. Required aggregate job: 127884353255; full-push proof: 127884315368; successful bounds shard: 127879571936.

CI/publication blockers: none. Remaining timing work: the <=10min full-wall target is unachieved. Transfer remains the final shard at 11m24s, including 9m03s of actual test work. Build and transfer SDK cleanup took 99s and 101s respectively. A guard that cleans SDKs only when free space requires it belongs in the maintained workflow source (runeditrun/base export/verify.yml, recorded origin revision 8b925fa5ffaa577df9f2e4ebab6ede8af5155baa), rather than an unacknowledged seed fork. Even removing those 200s would leave an estimated 11m05s critical path, so that guard alone cannot establish <=10min; further coverage-preserving critical-path work would also be needed. This continuation leaves those template bytes and all non-runtime journey bodies intact.

The final packet publishes complete explicitly selected actual non-secret reports, source/discovery proofs and receipts only to refs/heads/evidence/sd-oncall-runtime-cishape-20261106-1-pc1 in just-every/run-oncall. That manifest binds the product head and per-file hashes. It does not signal acceptance or landing and does not replace independent gates. The terminal EVIDENCE line records its exact ref/head. The disposable product checkout/node_modules will be removed only after successful evidence publication; the packet remains outside the clone.

POST lanes/sd/INBOX.md: sd-oncall-runtime-cishape-20261106-1-pc1: exact-SHA Verify 42213733465 attempt 1 green at 534709f51591399b4a050d652b2028fc3daceb05; seven push jobs, fourteen existing expanded groups, all 5514 static assertion sites preserved; triage timeout 15m15s -> 9m31s; max/mean 1.327x; full wall 14m25s, <=10min target remains unmet on transfer critical path; clause/status changes none (17 done/50 partial/34 missing), BASE-AGENT-012 and all holds retained. No f204 record/readmission or landing action performed.
