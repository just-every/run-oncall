# sd-oncall-c-f243 report

Repository: just-every/run-oncall.
Branch: cloud/sd-oncall-c-f243.
Candidate: f33bb4e04334d6dbb1fc6aef47e4b419c474a871.
Initial main: 3851653df41d3317b77d147ed8121433c279f254.
Last fetched and merged main: 37299328ad8c7baacfc3d0356aa49316650bb557.

## Scope and outcome

The selected acceptance 1 analytics row now has response, scheduled load, noise and readiness views under the existing analytics:read grant and existing read helper. No new tool or permission was introduced. The no-argument MCP count array and legacy REST pagination identity are preserved.

Response uses the existing scopedState helper on one paging snapshot. Schedules are filtered by current service grants before coverageLoad runs. Readiness uses the native API's extracted assembly and refuses before assembly unless grants cover every workspace service. Both views recheck native authority after asynchronous reads. The native readiness door retains its session checks, 200 or 503 completeness status and zero-write marking.

Registry metadata names OC-037, OC-044 and OC-054. Risk computation uses protectedRecords through the existing computed-read mechanism. The contract's analytics risk cell and Today cell match the shipped slice; usage and cost remain unshipped, and team load remains unmodelled. No Base copy, permission, migration, delivery, account, activation or release behavior changed.

SURFACE-001 remains MISSING on the source contract. No Status, Gap or Evidence cell was edited. The stale judgment text remains the lander's responsibility; the new proof and the already-landed alert and triage proofs do not justify whole-clause promotion.

Before and after: 101 clauses; 26 DONE, 41 PARTIAL, 34 MISSING. Registry entries: 42 to 42 (including the withheld events target). Existing conformance fixture steps: 64 to 65. The new helper adds no standalone Verify registration, and no existing assertion was removed, narrowed or conditionally skipped.

## Plan executed

1. Read launcher instructions, repository AGENTS.md, source contract and generated acceptance. Main already included the f242 triage read; the f229 report resource was not yet on main. Shared scoping was exported rather than copied.
2. Implement analytics views and native readiness assembly extraction. Retain all existing native report semantics.
3. Prepare real native services, primary and backup schedules, declared and acknowledged incidents, repeated admissions on two services and a record-unrouted alert through HTTP. Exercise emitted Worker MCP with native D1 under controlled time and both policies.
4. Regenerate registry and guide. Document the optional views and their authority boundaries. Preserve judgment cells and unrelated prose.
5. Prove contract generation, restore both generated views from main, regenerate source lock last and check it. Commit a skip-CI save and immediately push it through the fleet guard. Preserve published history and merge main before the final candidate.
6. Run touched journeys, readiness and scoped required verification. Publish the actual non-secret evidence packet separately from product custody. Fleet landing retains exact-SHA CI, publication scan and Run site gates.

## Frozen proof rubric for the selected row

| Item | Outcome | Public-door evidence |
| --- | --- | --- |
| R1 native response parity and filters | PASS locally | tests/oncall-agent-analytics.mjs, analyticsReads, lines 61–68: full response equals native response item by item for the same at, from, to and service. |
| R2 scope before cohort, noise and coverage totals | PASS locally | Same journey, lines 69–84: exactly two local incidents, MTTA measured 60 seconds plus one censored case, three triggers, one repeated alert and 3,600 seconds each for primary and backup; no foreign identity, schedule, responder hours, prefix or credential. |
| R3 native readiness parity | PASS locally | Same journey, lines 92–96: release, deployment, matrix, signals, US checklist, completeness and paging-OFF statement compare exactly. |
| R4 narrowed readiness and foreign targets refuse | PASS locally | Same journey, lines 97–107: identical not_found without result or observation fields, and missing analytics grant refuses with 403. |
| R5 revoked credentials refuse | PASS locally | Same journey, lines 115–122: both full and scoped tokens refuse all three forms with 401 and no result. |
| R6 old analytics contract survives | PASS locally | Same journey, lines 43–59, and existing tests/runtime.mjs OC-053 automation assertions: no-argument arrays and REST identity/counts retained. REST last-use bookkeeping is outside the MCP zero-effect snapshot. |
| R7 policy, metadata and served guide | PASS locally | Same journey, lines 48–58 and 85–96: Core metadata, computed standard or sensitive classes, incident-read policy parity, held approval before disclosure, and served guide row. |
| R8 zero native effects and outbound requests | PASS locally | Same journey, lines 109–112 and 122: exact native records and revisions, immutable existing audit and documented read custody only; empty Worker outbound ledger. |

Both policy rounds passed. The record-unrouted fixture has no retained trigger event; it contributes no native noise, so full-report parity is exact in this fixture. The shared scoping helper excludes the service-less record before generators run. No fabricated event or unsupported storage injection was used to manufacture service-less noise.

## Acceptance and inherited duties

| Clause sentence or duty | Result |
| --- | --- |
| SURFACE-001 acceptance 1, selected analytics row | Selected response, load and readiness slice proven by analyticsReads; usage remains omitted. This is not completion of the entire acceptance sentence. |
| SURFACE-001 acceptance 1, all other tool rows and metadata | Not claimed. Existing owning holds and later metadata slices retained. |
| SURFACE-001 acceptance 2, resources and events | Untouched; pending predecessor work and capability holds retained. |
| SURFACE-001 acceptance 3, full Base conformance | Not promoted; broader BASE-AGENT-013 obligations and stranger-agent duties retained. Current declared CORE conformance is checked by required rer verification. |
| OC-037 native report semantics | Unchanged shared report generators; no new imported-history, team export, interruption, timer or recovery authority claimed. |
| OC-044 usage and US checklist | Readiness checklist is read without changing semantics. Real usage, cost and paging account proof remain omitted. |
| OC-054 readiness | Shared native assembly; health cannot certify pager coverage. Independent standby, live delivery and human drills remain unproved. |
| BASE-AGENT-006 and SURFACE-002 classes | Existing protectedRecords mechanism retained; no class-rule expansion for other rows. |
| BASE-AGENT-003 scoping | Existing scopedState shared. No resource capability or pending predecessor is declared by this change. |

## DONE riders

| Row | Result on this slice and retained boundary |
| --- | --- |
| 1 | Selected row's nonempty public-door outcomes PASS locally (R1–R8). Whole clause remains incomplete. |
| 2 | PASS: exact seeded counts and hours, allowed and denied paths, unchanged state; R2, R4, R5 and R8. |
| 3 | PASS for current declared coverage: push Verify 43216456301 completed successfully on f33bb4e04334d6dbb1fc6aef47e4b419c474a871. tests/oncall-agent-flow.mjs invokes analyticsReads beside alertReads through tests/runtime.mjs machines. Whole-clause capability holds remain. |
| 4 | PASS for relevant bytes: local machine source and analytics tests are identical to the save; our later commit adds only guide prose and its regenerated lock. The final merge also preserves main’s unrelated move-in review changes. Required verification and the focused probe are repeated on the merged candidate. |
| 5 | INSPECTED: SURFACE-001 already cites BASE-AGENT-001, 002, 003, 010, 012 and 013; no duty moved. |
| 6 | Mechanical PASS: generation write and check pass, both generated views restored from main, lock regenerated and checked. Judgment cells intentionally remain main's text. |
| 7 | PASS: no acceptance point rewritten or added; one analytics table row's Today and class cells reconciled. |
| 8 | PASS: current service grants, missing permission and revoked credentials exercised in both policy modes with no native effects. |
| 9 | PASS boundary: no provider, legal, live paging, standby, device or deployment acceptance claimed. |
| 10 | PASS: no new policy default; workspace-wide readiness restriction is the brief's explicit required boundary. |
| 11 | PENDING FLEET: branch only, no main landing; publication scan and Run site on final main remain the maintained lander's gates. |

## Pre-ready checks

The changed behaviors have public-door assertions that inspect nonempty results and ordinary unsafe cases. Existing assertions remain intact. Shared native admission continues to fence erased or revoked sponsors, replayed authority and client revisions; machine journeys retain the broader erasure and replay proofs. No product screen or icon control was changed. No new fixture email or provider-shaped credential was introduced. Source integrity is fresh. Cloud publication scanning is delegated to the fleet as required; this report does not claim a COMPLETE scan.

Main before work was green: Verify push runs 43212281949 and 43208612579; Run site 43212281936, all on 3851653df41d3317b77d147ed8121433c279f254. Run demo 43212282072 was skipped. Product save 0c0619ce0f9b7024dd441ef6ee62a5e7d3092c81 pushed successfully with skip CI. No PR is required for the existing all-branch Verify entry point.

Final test exits, exact candidate CI discovery, mechanics and publication custody are recorded in RECEIPT.json and the final addendum below.

## Final candidate custody

The final main fetch found accepted move-in review changes at 37299328ad8c7baacfc3d0356aa49316650bb557. These were merged without conflict or history rewrite in f33bb4e04334d6dbb1fc6aef47e4b419c474a871. Contract generation and lock regeneration/check were repeated after the merge, producing no pending change. The fleet guard successfully pushed that full SHA. Exact-SHA push Verify 43216456301 was discovered in progress and subsequently completed successfully. No workflow dispatch or rerun was used.

## Local gate result on the merged SHA

All local gates PASS on f33bb4e04334d6dbb1fc6aef47e4b419c474a871: scoped required rer verification (existing hosted lane plus hosted output, hydration and 8,824 of 8,824 declared agent conformance checks), focused analyticsReads under both policies, native readinessHealth with authority and partial 503 proof, generated metadata freshness and source integrity. The served guide was captured and inspected at 1440 and 390 using Chromium at /usr/bin/chromium with no sandbox. Machine runtime passed in 430.6 seconds; its relevant analytics source and test bytes are unchanged on this final candidate. Branch Verify 43216456301 is completed with conclusion success on this exact full SHA. No landing, COMPLETE publication scan or final-main Run site is claimed.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, restored from main; ledger=none exit=0.

## Final exact-SHA result and claim

Push Verify 43216456301 completed with conclusion success on f33bb4e04334d6dbb1fc6aef47e4b419c474a871.
Run: https://github.com/just-every/run-oncall/actions/runs/43216456301
Six GitHub API calls were used in total. No dispatch, workflow rerun or repair round was needed. Both product pushes and the first evidence publication succeeded without transport retries. No selected-slice blocker remains.

CLAIM SURFACE-001 PARTIAL points=none tests=tests/oncall-agent-analytics.mjs#analyticsReads; tests/readiness.mjs#readinessHealth
GAP SURFACE-001: The selected acceptance 1 analytics row's response, load and readiness figures are complete; usage, team load and all other held rows, resources, events, prompts and broader conformance obligations remain. No entire numbered acceptance point or clause is promoted.

The claim's points field is none because the whole first acceptance sentence still includes unshipped rows. The selected analytics slice is proved in R1–R8 and the PROBE lines. Status remains missing and all 101 source judgment rows stay identical to merged main; counts remain 26 DONE, 41 PARTIAL and 34 MISSING.

Riders 1–4 and 8 pass for the selected slice, including exact-SHA push Verify and nonempty allowed and denied public-door probes. Rider 5 is inspected and unchanged; 6 and 7 pass mechanically; 9 and 10 preserve the explicit boundary. Rider 11 awaits the maintained fleet's guarded landing, COMPLETE full-history publication scan and exact-main Run site. The scan receipt is unestablished in this cloud, with complete, historyScanned and findings recorded as null rather than fabricated.

The native readiness test retains active member authority, unauthorized and revoked refusals, isolated unavailable sources and HTTP 503 completeness. The existing REST analytics assertions remain green in the machine journey and exact-SHA Verify. The final source lock is fresh, generated contract views equal main, no Base copies changed, and no fixture email or provider-shaped credential was added.

This packet, its plan, probe outputs, mechanical receipt, exact CI receipt and two actual guide screenshots are returned only through the separate evidence ref. Product custody is only cloud/sd-oncall-c-f243 at the full SHA above. No main push, default-branch fast-forward, PR, account deployment or provider action was performed.

## Evidence transport recovery

The final report update initially failed while fetching the existing evidence ref (Git exit 128; HTTP status unknown, not supplied by Git). A sanitized direct probe reported invalid username or token. The required launcher refresh and fleet Git setup were repeated, then the same declared credential source was re-read at Git use. Publication succeeded on attempt 2. No other credential was sought; product branch custody and green Verify were unchanged. The actual transport receipt is evidence-transport.json.
