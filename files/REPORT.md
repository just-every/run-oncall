# Oncall bulk result titles — main-oncall-bulk-results-titles-1

Repository: just-every/run-oncall. Product branch: cloud/main-oncall-bulk-results-titles-1. No PR is required by the repository instructions; no PR was opened. Product publication and report transport are separate. Final product SHA: 5f361388b082bd7a5f2bd9e24cfbd6b1be887d06. Exact-SHA Verify 43143362718: completed/failure. The accompanying receipts preserve the actual observations.

## Plan

1. Configure the fleet identity, refresh the launcher bundle, install the credential helper, push guard and commit hooks, and clone only the declared repository.
2. Read repository guidance, contract and existing tests; reproduce the finding through the public browser and emitted Worker with 50 incidents before changing product code.
3. Retain selection-time incident titles and service/environment names, including all matching across pages, without altering the API payload, independent item commits or timeline operation identity.
4. Present compact outcome rows and three summary counts. Explain already-in-state skips and refusals with a next action. Put diagnostic identities only behind Copy details and bound the long list inside the panel.
5. Extend the existing public bulk browser journey, adding no test registration. Assert at 1440; capture the changed result screens at 1440 and 390. Run typecheck and the complete touched journey, including its existing workflow checks.
6. Update from main, preserve published history, regenerate/check the source lock last, commit with fleet identity and active hooks, check all candidate identities and trailers, and publish through the prescribed guard. Require exact-SHA Verify for READY.
7. Keep actual reports, receipts and selected browser proofs outside the product checkout. Publish them only to the separate evidence ref, preserve provenance and relay the lane inbox line in the final message.

## Result and before/after

Before: 50 of 50 acknowledgments committed, zero result rows named their incident, raw shortened incident IDs named rows, and the full operation UUID was displayed above them. Reproduction used public setup, service/declaration and triage doors against the production Worker; before.json records the original main SHA and actual observations.

After: all 50 all-matching acknowledgment results retain their selected titles, including later cursor pages and a long title. Repeated titles retain distinct service context. All 50 incidents retain the same shared operation ID on their timelines. No incident ID or operation UUID names a result or summary; Copy details copies the actual operation receipt and human labels to the browser clipboard. Replaying the same form operation leaves incident state and timelines unchanged.

The displayed summary distinguishes succeeded, skipped and refused counts. A mixed public action yields one successful acknowledgment, one already-acknowledged skip and one real stale-revision refusal; each names the right incident, and the stale row tells the operator to reload, review and select it again. Reapplying an unchanged priority is shown as a skip and leaves the incident unchanged. The server mutation, revision, replay and per-item commit rules are unchanged.

At 390, titles and service context wrap within the panel, the summary and Copy details control wrap naturally, and the long results list scrolls within its bounded height. New result text is 13px or larger. The changed storm and mixed-result screens were inspected at 1440 and 390. Existing snooze, merge, alert-only close, durable reassignment, declaration/notification and approved-rule checks remain in the extended journey.

## Verification and custody

The touched journey is tests/product-browser-journey.mjs#triageBulkBrowser, driven through public HTTP and browser doors using the emitted production Worker and local D1. Chromium is /usr/bin/chromium with --no-sandbox. Browser processes and Workers are closed by the harness. The full suite is delegated to the branch Verify workflow; no full local verify was run.

The existing journey was extended: zero registrations added or removed, 46 top-level .mjs test files before and after, and 28 exported/local async journey functions in the touched file before and after. This is an unchanged test budget, not a claim that file count equals the entire suite's registration count. The cap remains 200; no cap increase was requested.

Local typecheck, product build, contract-document check, source-lock regeneration/check and the touched public browser journey passed. The first local test attempt exposed a missing expect import; that test-only mistake was corrected before publication. The first committed-head browser run also passed. A subsequent test-only refinement explicitly loads cursor pages when fixture creation times tie and narrows the no-op probe to its selected incident; it preserves every assertion and is checked with a frozen Worker clock matching the shared CI journey.

Main was fetched and rebased before the first product publication; main had no intervening changes. After the published head, main advanced with separate Status/rota form-validation and US readiness-checklist rounds (through 77c552b9c9c5d0d5d579916a8bb35974d833c9ac). Those main commits and newer tests were merged into this branch, preserving published history; only the generated source lock conflicted, and it was regenerated from the merged source. The first product head was 9191ac11783e2a261b58c4a996ff76c151d12422. The final candidate and Verify run are reported in the final receipts. Every product push uses the shared cloud guard. Every candidate author, committer and trailer is checked, with no co-author trailers. No main/default-branch push, force push, PR mutation or other repository clone was performed.

One initial CI discovery response was locally over-sanitized and could not be parsed. It counted against the ten-call budget; no green claim followed from that response. The observer was corrected to sanitize JSON string values while preserving JSON structure, and the 300-second discovery/poll interval was maintained. github-budget.json and ci-receipt.json retain the actual subsequent calls and exact-SHA observations.

The cloud cannot run the fleet publication scan; the fleet's existing Mac lander retains that gate and landing responsibility. This report and the evidence ref are not acceptance, landing or deployment signals.

## Clause claims and remaining scope

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged. Status counts remain 24 done, 43 partial, 34 missing, 101 total. OC-079 remains PARTIAL; no clause status, Gap or Evidence cell was changed and no DONE claim is made.

CLAIM OC-079 PARTIAL points=1,2,5 tests=tests/product-browser-journey.mjs#triageBulkBrowser

The mixed stale refusal is additional browser coverage, not a new claim that this three-item probe alone proves acceptance point 4's exact 49-plus-one storm. Existing main retains that HTTP storm evidence. This round makes no new claim about viewer refusal, bundled SMS, mobile native apps, upper-bound execution, paging, provider delivery, hosted capacity or other stranger findings.

DEFAULT OC-079: Already-in-state outcomes and successful unchanged-revision no-ops are displayed as skipped, while actual server effects and retained receipts remain unchanged.
GAP OC-079: Existing unproved upper-bound actions and bundled reply/provider obligations remain outside this UI-only round.



An intermediate merged head, e38a3771742b0e04bf87a0f759a837baa918b821, passed its local browser journey and had Verify run 43141343111 in progress. Packet review then found one copy-only edge: an unchanged Unassigned selection should say no assignment change was needed, without assuming a responder. That correction is published as a later commit with a fresh exact-SHA Verify. No green claim is made for the superseded run; its observed in-progress receipt is retained separately.

Final product candidate after the copy correction: 5f361388b082bd7a5f2bd9e24cfbd6b1be887d06. The remote named branch was read back at this exact SHA. The final commit carries no skip-CI marker; all three candidate commits have fleet authors/committers and no trailers.

## Final CI blocker

Exact-SHA Verify 43143362718 completed/failure on 5f361388b082bd7a5f2bd9e24cfbd6b1be887d06. Plan, build, intake, hosted, runtime, triage, transfer and changes jobs passed. The browser shard (job 130936341773) failed in the unrelated changeAndSigningBrowser archive/erasure flow at tests/product-browser.mjs:369: it expected HTTP 200 and received 400. The aggregate verify job then failed because selected coverage was incomplete. This is not the contract-generator exception and no READY claim is made.

The failed assertion log was downloaded once with `gh run view 43143362718 --repo just-every/run-oncall --job 130936341773 --log-failed`; the archive command succeeded. ci-jobs.json and ci-browser-failed.txt contain the actual job receipt and complete sanitized failed log. This round does not modify the failing source file or archive/erasure behavior. The complete touched bulk journey, including the new 50-item result checks, passed locally on the exact final head; its browser receipt and screenshots remain valid.

All ten allowed GitHub calls are consumed (including the failed initial local parsing of a successful discovery response). The requested failed-job rerun could not be issued within that budget. No additional call or alternate credential was used. The lane must rerun the failed browser job once or resolve its archive/erasure assertion, then require successful exact-SHA Verify before landing. Product work is fully committed, pushed and read back, but the terminal product state is BLOCKED by this red check. Evidence publication is report transport only and does not waive that blocker.

Final candidate: 5f361388b082bd7a5f2bd9e24cfbd6b1be887d06. Exact-SHA Verify 43143362718 completed/failure (https://github.com/just-every/run-oncall/actions/runs/43143362718). Selected report files: 37. GitHub calls used: 10 of 10.

Product changes, touched checks and browser proof are complete. Exact-SHA Verify is red in the untouched erasure flow, so the product candidate is BLOCKED and no READY claim is made. The fleet still owns the publication scan, landing and subsequent main/site gates. The product clone is removed only after successful report transport and remote evidence-head verification.
