# Oncall browser shard rebalance

Signed: Run Edit Run fleet, 2026-11-15.

## Plan

1. Read the supplied fleet rules and the repository instructions. Inspect the current plan, shard runner, coverage aggregation and local journey grouping.
2. Read job durations for the latest ten green Verify runs on main with bounded GitHub queries. Compare the browser shard with available capacity, retaining eight push shards and all existing required job names.
3. Move member coordination beside runtime verification, and the independent product settings/documentation sweep plus agent browser checks beside hosted verification. Keep core product browser coverage on browser. Declare browser lanes separately from runner Chromium requirements so native HTTP lanes retain their --flows grouping.
4. Run member coordination, product core/settings and standalone agent browser checks, typecheck, plan/workflow validation, contract-document check and installed source-lock check. Preserve all test assertions, selectors, timeouts, build sharing and aggregate coverage. Regenerate the source lock last.
5. Refresh main, commit with fleet identity and inspect every unpublished commit including side parents. Push the named branch through the cloud guard. Observe only its natural exact-SHA Verify, with no dispatch or rerun and at least 300 seconds between observations.
6. Publish this report and actual non-secret receipts to the separate evidence ref. The fleet Mac retains the mandatory COMPLETE full-history publication scan before landing; this cloud environment does not provide its .tools/publish-check.sh entrypoint. Do not substitute another scan or claim it passed.

## Historical evidence

The platform main recursive tree had 3,144 entries and was not truncated. It contains no speed-tests-ci/PLAN.md (or path containing speed-tests-ci). The supplied CI-shape rules therefore govern this change: Ubuntu 24.04, build once, at most eight shard jobs, unchanged Chromium installation/probe, no test weakening and unchanged aggregate required set.

The following are the latest ten successful full Verify runs reachable from main, in descending run-id order. Times are measured GitHub check-job wall times, in seconds; skipped jobs are excluded. The agents shard was introduced after the older eight runs. Raw public check-run timestamps and SHAs are retained in historical-checks.json and older-checks.json.

| Verify run | runtime | intake | agents | browser | hosted | transfer | changes | triage |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 43717600735 | 312 | 455 | 545 | 843 | 264 | 711 | 376 | 571 |
| 43700831884 | 281 | 517 | 530 | 815 | 293 | 690 | 394 | 622 |
| 43631616284 | 277 | 645 | — | 768 | 251 | 687 | 427 | 569 |
| 43587169224 | 242 | 813 | — | 813 | 430 | 666 | 562 | 559 |
| 43556264993 | 271 | 655 | — | 660 | 278 | 748 | 618 | 474 |
| 43482317147 | 244 | 505 | — | 746 | 239 | 630 | 527 | 599 |
| 43467859063 | 342 | 776 | — | 713 | 237 | 720 | 589 | 648 |
| 43446691374 | 308 | 814 | — | 591 | 299 | 741 | 566 | 591 |
| 43435925256 | 307 | 631 | — | 820 | 234 | 648 | 534 | 467 |
| 43386000971 | 333 | 781 | — | 744 | 301 | 584 | 398 | 618 |

Browser wall time: min 591 s, median 757 s, max 843 s. Hosted wall time: min 234 s, median 271 s, max 430 s. Runtime has additional capacity, but hosted already installs/probes Chromium and has the smallest median, so moving the independent member journey there preserves the existing runner setup and names.

Intake (up to 814 s) and transfer (up to 748 s) are also over ten minutes in historical runs. Their full public flows remain intact. Report their exact candidate durations rather than attributing those costs to this browser change.

The green browser log command `gh run view 43717600735 --repo just-every/run-oncall --job 132823195111 --log` exited zero but returned an empty file. It was not retried. No historical per-journey durations are claimed; local measurements and the exact candidate CI measurements are reported separately.

## Implementation and counts

- scripts/verify-shards.json: runtime gains member-browser and Chromium setup; hosted gains browser-settings and agent-browser; browser retains the core product browser part. Keep all eight shard names and timeouts. Browser-lane classification is explicit and distinct from shard browser-install capability.
- scripts/verify-oncall-plan.mjs and tests/verify.mjs: validate browser lanes and their Chromium-capable assignments; derive --browser/--flows group membership from the lane classification, preserving native flows even beside browser work.
- tests/product-browser.mjs: introduce core/settings parts around the existing independent settings sweep. With no part selected, execute the original full journey. Reject unknown parts and conflicting focused selectors. The settings part retains the application-error guard; the core part retains email import, readiness, response report, event-source and owner-fault coverage. The pre-existing agent-door browser module and its two-role resource parity remain on push Verify through the separate agent-browser lane. A direct unpartitioned local product run still includes that module.
- AGENTS.md: describe the shared build, eight shards, product parts and lane classification.
- sources.lock.json: regenerate with the installed pinned edition-authoring package.
- Push shard count: 8 → 8. Top-level journey files: 13 → 14 because agent-door-browser.mjs was previously nested inside the product script and is now explicit. The same assertion files and obligations remain covered. Manifest execution entries: 18 → 20 (product core/settings plus the formerly nested agent invocation). Browser entries: 3 → 5; HTTP flow entries: 15 → 15. No test file or existing assertion was deleted, skipped or weakened. The partition adds no acceptance obligation or new test behavior and does not increase the existing behavior count used for the cap. All other journey selectors and environment mappings are unchanged. No timeout changed.
- Clause changes: none. CLAIM: none. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain untouched.

## Local results

The first local browser attempt failed because the Playwright browser bundle was absent. After the repository Chromium install, the unchanged member coordination journey passed with Chromium at /usr/bin/chromium and --no-sandbox: 208.705 seconds. The intermediate timing attempt found /usr/bin/time absent; timing then used the shell builtin. No application assertions were weakened or skipped.

The setup command completed with --owner-email fleet@runeditrun.com --non-interactive through cloud_run. It built the app and stopped its own temporary app. Private setup links and local credentials are excluded from the packet.

GitHub query accounting before candidate observation: 8 logical gh invocations: 2 platform-tree reads, 2 rejected GraphQL query shapes, 1 HTTP 502 query, 2 successful historical queries, and 1 empty green-job log invocation. The 502 was followed by launcher refresh, fleet Git cleanup and bounded backoff before the smaller successful query. Two remaining calls are reserved for exact-SHA run discovery/status and completed job durations.

Local product settings part passed in 126.203 seconds. Product core plus its then-nested agent checks passed in 607.220 seconds; the agent browser module subsequently passed standalone in 189.288 seconds. That measured cost justified making it independent and placing settings + agents beside hosted (historical latest job 264 s), while moving the 208.705 s member journey beside runtime (historical latest job 312 s). These sums guide placement; they are not candidate CI measurements. The original unpartitioned product run failed after 482.585 seconds on a local HTTP GET ECONNRESET inside importedEmailBrowser, after the existing settings/docs sweep. No assertion failed and no transport retry or assertion waiver was added. The final core part reruns that same import flow with all its assertions. Raw local error headers, cookies and private setup output are excluded from the packet.

## Candidate custody

Branch: cloud/gr-ci-oncall-shard-1

Head: f9d62e6da66f14b73f5082798f82103428e77af4

Base: 7f250f7e66f1377f7b4b773effd1c72e8854c025 (main advanced only with the Oncall 0.5.16 release metadata; its package, seed, release and changelog changes were retained).

Product push: first attempt succeeded at 2026-11-15T20:28:23.795611+00:00. One real commit and one product push; no rerun, dispatch, PR or main push. Every candidate author/committer and complete commit message was inspected, including side parents. Fleet identity and no co-author trailers.

Typecheck, first-party check, source-lock check, contract-document check, workflow permissions/artifact-name check, matrix push/all/nightly validation and diff whitespace check all passed after refreshing main. The exact-SHA shared build passed and its receipt matches the candidate. An additional official browser-shard invocation on that build stopped after 255.953 s with apiRequestContext.get ECONNRESET in productSchedule (tests/product-browser-journey.mjs:572/710); no assertion failure was reported. Earlier complete core + agent assertions passed in 607.220 s, and standalone agent browser assertions passed in 189.288 s. The two observed local connection resets occurred in different unchanged HTTP flows. They are recorded as transport failures, not passing runs; no retry, assertion weakening or waiver was added. The exact-SHA natural Verify remains the required final wall.

The COMPLETE full-history publication scan is not claimed here: the cloud adaptation assigns it to the fleet Mac, and this VM has no .tools/publish-check.sh. Full commit history was cloned (not shallow), the new diff was inspected, and the Mac must apply its ordinary publication guard before landing. This cloud performed no alternative publication scan.

## Exact-SHA Verify

Natural branch Verify 43758259622 completed/success on f9d62e6da66f14b73f5082798f82103428e77af4. URL: https://github.com/just-every/run-oncall/actions/runs/43758259622

The first exact-SHA REST discovery already returned completed/success, so no status polling was needed. The final completed-jobs read ran more than 300 seconds after discovery. All eight planned shard jobs and the aggregate verify job succeeded on the candidate SHA. Total logical gh invocations: 10; no polling loop, rerun or dispatch. No rerun or workflow dispatch was used.

The local transport failures are fully disclosed above and in final-browser-receipt.json; they did not reproduce as a red candidate Verify. No test was dropped or weakened to obtain green.

## Measured candidate durations

Job wall times include setup, dependency/browser preparation, the shared build download, journeys, artifact upload and post steps. All rows are from natural Verify 43758259622 on f9d62e6da66f14b73f5082798f82103428e77af4.

| Shard | Job ID | Wall time | Run this shard | Other steps |
| --- | ---: | ---: | ---: | ---: |
| shards (agents) | 132947545231 | 8m35s | 7m06s | 1m29s |
| shards (browser) | 132947545226 | 6m28s | 4m00s | 2m28s |
| shards (changes) | 132947545119 | 9m45s | 6m40s | 3m05s |
| shards (hosted) | 132947545141 | 10m20s | 7m48s | 2m32s |
| shards (intake) | 132947545157 | 9m03s | 6m21s | 2m42s |
| shards (runtime) | 132947545109 | 7m12s | 5m13s | 1m59s |
| shards (transfer) | 132947545243 | 12m11s | 10m16s | 1m55s |
| shards (triage) | 132947545234 | 8m50s | 6m20s | 2m30s |

Browser: latest green baseline 14m03s → 6m28s (455 seconds less); ten-run baseline median 12m37s → 6m28s. Runtime with member browser: 7m12s. Hosted with settings and agent browser: 10m20s. The browser shard now has 8m32s below its unchanged 15-minute timeout; hosted has 4m40s below its unchanged timeout.

Literal ten-minute exceedances: hosted 10m20s consists of 7m48s of selected verification/journeys plus 2m32s of other job steps. Transfer 12m11s consists of 10m16s for its unchanged complete managed installation/export/restore journey plus 1m55s of other steps. Transfer already ranged from 9m44s to 12m28s across the ten sampled green runs; no part was dropped, weakened or moved off push coverage to meet a timing number. It remains the follow-up bottleneck if every shard must be strictly below ten minutes.

Mean shard wall time: 9m03s. Longest/mean: 1.346, below the 1.5 balance rule. Eight shards remain. All timeouts and required shard names remain unchanged. The overall workflow includes its shared build and the longest shard; no claim of a ten-minute total workflow is made.

## Terminal result

Product branch pushed and exact-SHA Verify green. Clause changes: none. CLAIM: none. No PR was required or created. No product blocker remains; the fleet Mac still owns its mandatory COMPLETE publication scan and landing gates. Local transport-only failures are retained in the packet and are not represented as passing local runs.

Reports and actual non-secret receipts are published separately to evidence/gr-ci-oncall-shard-1. Evidence transport conveys reports only; it does not signal acceptance, landing or product READY independently of the product SHA and Verify result.
