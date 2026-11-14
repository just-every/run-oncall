# gr-mt-oncall-ci-2 investigation

Repository: just-every/run-oncall
Branch: cloud/gr-mt-oncall-ci-2
Starting/current main: 4d1fc62d4d2b8bf90008ac87bbaa626bc1a5494b

Plan
1. Install fleet identity, launcher credential helper, push guard, evidence transport and commit hook; clone full history and read repository instructions.
2. Identify historical failed jobs and request each failed journey job archive once, with at least two minutes between archive commands.
3. Compare current main and its workflow/tests with historical code; run the implicated current triage and installation journeys plus build/typecheck.
4. Verify completed successful Verify and Nightly journeys on the exact current-main SHA. If already fixed, return no-change without creating a product commit or proposing another landing.
5. Preserve actual sanitized results and publish an explicitly selected report-only packet to evidence/gr-mt-oncall-ci-2.

Historical evidence
- Run 40116798926: managed-browser job 120939633115 failed at step 8, Run node tests/verify.mjs. The verify aggregate also failed; all other journey jobs passed.
- Run 40217202732: managed-browser job 121240813211 failed at the same step. Triage job 121240813073 also failed at step 8, Verify the selected public-door journey. The verify aggregate also failed; remaining journey jobs passed.
- Commands gh run view 40116798926 --repo just-every/run-oncall --job 120939633115 --log-failed; gh run view 40217202732 --repo just-every/run-oncall --job 121240813211 --log-failed; gh run view 40217202732 --repo just-every/run-oncall --job 121240813073 --log-failed each exited 0 with zero stdout/stderr bytes. There was no HTTP error body to report. No job archive was retried and no blob redirect was requested.
- Consequently this investigation cannot identify an original assertion or establish a shared original root cause. It does not classify either historical failure as a false positive.

Current source evidence
- The daily Verify matrix at 770e3d20 has since been replaced with a build-once shard workflow. Scheduled coverage now comes through verify-nightly.yml, calling Verify with tier nightly.
- The historical managed-browser lane ran tests/activation-browser.mjs, including productBrowserJourney, private owner entry, preview authority and reset. That file was consolidated by 75a6589; current managed lifecycle coverage is in tests/transfer.mjs, with product browser flows registered separately. This local investigation runs the current installation lifecycle, not an invented reconstruction of an unavailable failing assertion. Historical fixes retained on current main include 4148f4d2d0a5577cf322fefa5589148203054944 (recognize signalCode and register exit listeners before shutdown) and f978eeb367075ab04facef9cbfeee8200afb4d3a (independent desktop journeys and retained owner entry). These are relevant later fixes, not a claim that they explain the unavailable historical logs.
- Current triage coverage is split into bulk, bounds, storm and reports, without removing those flow assertions.

Exact-main CI discovery
- Verify 43589736078: completed/success on 4d1fc62d4d2b8bf90008ac87bbaa626bc1a5494b.
- Verify 43587169224: completed/success on the same SHA.
- Nightly journeys 43592091764: completed/success on the same SHA.
- Run site 43589735969: completed/success on the same SHA.
- Job receipts confirm Nightly journeys built and executed all seven selected shards successfully, including browser, transfer and triage. Verify 43589736078 reused prior coverage (build/shards skipped); it is not represented as a fresh full test execution. Nightly-proof is skipped for the tag-triggered Nightly journeys run, whose actual seven shard results are retained.
- Exact-SHA API discovery receipt is included; a mistaken preceding short-SHA query returned no rows and was not treated as proof.

Changes and counts
No product files, workflow, contract clauses, generated views or source lock changed. No test was weakened, skipped or deleted. Product commits: 0 before / 0 after. Tests added/deleted: 0 / 0. CI journey command entries: 16 before / 16 after (the shard plan invokes tests/triage.mjs separately for each selected part; this is a command-entry count, not a newly calculated acceptance test count). Contract counts unchanged: Core 25 done, 35 partial, 24 missing (84); Agent surface 1 done, 6 partial, 10 missing (17); full target 26 done, 41 partial, 34 missing (101). No clause status changes or new clause claims.

Local results and terminal decision are recorded in receipt.json and result.json. Historical root-cause attribution remains unavailable; current exact-main success is assessed separately from that limitation. No new deployment, provider action, main push, PR or product landing is authorized or performed.

Local triage result: cloud_run env ONCALL_TRIAGE_PART=all node tests/triage.mjs completed with exit 0, covering bulk, bounds, storm and reports. Build and typecheck also completed with exit 0. The managed transfer/installation diagnostic completed with exit 0 using Chromium /usr/bin/chromium with --no-sandbox, and TMPDIR on the filesystem that satisfies the existing 15 GiB disk guard. No guard was changed.

Terminal result: NO-CHANGE. A fresh origin/main fetch remains at the tested SHA, and the product working tree is clean with zero candidate commits. Current-main Verify is completed/success, and the full Nightly journeys run actually built and ran all seven selected shards successfully. Scoped local diagnostics also pass. This verifies the report is already fixed on current main; it does not reconstruct the missing historical assertion or claim the two original failures had a common cause.

No product commit, product push, PR, deployment or landing was performed. The cloud branch exists locally at current main. No READY/PUSHED product-custody claim is made for an unpublished ref. The no-change result is resolved without another merge under the maintenance brief's explicit no-change rule. There is no current blocker; the original failure attribution is an evidence limitation. The default is to leave working code and assertions intact.

Publication scope: report-only evidence is sent solely through cloud_evidence.py to evidence/gr-mt-oncall-ci-2. A product publication scan is not claimed: no product candidate or product push exists. No credentials, private settings, environment dumps, archives, sessions or held gate material are selected. Security=true in result.json records unchanged product bytes and reviewed/redacted report selection, not a new release or security audit. The original clone and local result are retained as maintenance outputs.

Local verification used the supplied cloud toolchain: its effective outer Node was 24.19.0 and pnpm was the checkout's pinned 10.12.4. The supplied shim keeps a newer host Node rather than downgrading to the declared 22.20.0 pin. No dependencies or pins were changed. Managed commands used the checkout's pinned rer 0.2.113.

GitHub investigation commands: 9 of the 10-call budget, recorded in github-calls.json. Historical log archive requests were each made once, spaced at least two minutes apart; exact-run job confirmation was read more than 300 seconds after discovery. No rerun, workflow dispatch or repeated log download occurred. Full local rer verify was not run; the full executed wall is exact-main Nightly journeys 43592091764.
