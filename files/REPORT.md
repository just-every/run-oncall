# sd-oncall-c-f262

Author: Run Edit Run fleet, 2026-11-17.

## Plan and scope

1. Recheck main, BASE-AGENT-012 acceptance and existing submission journeys, plus f260 and f261 shared-file predecessors. Keep all existing assertions and custody boundaries.
2. Add one focused completed-result response-loss flow under autonomous and held policies. Use real emitted Worker MCP and D1, an owned due-dated P1 human-review follow-up, current parent revision, one evidence URL and a fresh key. Destroy the autonomous original response at headers. For held policy consume pending input, approve the returned signed-in saved revision and hash once, establish terminal custody and destroy only the first completed tools-call result.
3. Establish the original stored terminal outcome and exactly one agent-attributed native submission before recovery. Recover identical original arguments with a new JSON-RPC id; compare native records, revisions, timeline, state-changing audit, original outcome and expiry, approvals, reviews and paging. Permit only linked replay-attempt audit and capacity bookkeeping. Require zero outbound requests and no evidence fetch.
4. Invoke the flow once in the existing agents runtime journey. Reuse the existing saved-follow-up browser pattern for the signed-in approval and saved evidence at 1440 and 390, asserting behaviour at 1440.
5. Run focused runtime proof, touched agents runtime and browser journeys, typecheck and first-party checks. Generate and check contract views, restore generated files, regenerate and check the pinned package source lock last. Commit and publish saves, merge current main before the final candidate, inspect all candidate identities and trailers before every push.
6. Publish the actual report and receipts on the separate evidence ref. Discover exact-SHA Verify using REST within the ten-call budget. Keep main untouched. The fleet lander owns publication scanning and landing.

## Initial observations

Main at clone: 09f2821d713460dcd33d0878dc3a7825daccfc5a. Exact-main Verify 44112620430 and Run site 44112620293 are completed success (REST call 1; another exact-main Verify 44104925891 also success).

Existing ./tests/oncall-agent-action-submit-replay.mjs consumes original results and proves changed-evidence conflict and immediate replay. ./tests/oncall-agent-action-submit-revisions.mjs covers f258 optional revision diagnostics. Both remain unchanged by this round.

The actual f260 reapplication ref ends at 4988fbbe5e310410f02d3cfbd4ffc323bc967a6f. Its required-native-revision admission scope includes a production admission check and a separate test. The f261 ref ends at 0b1e46522288036dab1eab105aa5585c5c0042da with aged-replay preparation at bba345b and aebb502. Neither ref is an ancestor of initial main. Their scopes are preserved; this round does not repeat diagnostics, retention or copy their unlanded work. Predecessor landing remains a fleet gate.

Production boundaries inspected, unchanged: ./src/agent-door/coordination-tools.ts registers actions.submit as native complete at the current incident revision; ./src/reviews/review-controls.ts retains human-review evidence as a submission without acceptance; copied Base ./src/modules/agent-door/pipeline.ts loads the prior digest and terminal outcome, rechecks authority and links replay audit; ./src/modules/agent-door/execution.ts saveCall and ./src/modules/agent-door/approval-execution.ts retain terminal call outcome and expiry. No copied Base or production file is changed.

The selected acceptance-2 submission observation can be proved locally. The whole clause remains MISSING, with no whole-clause promotion. All omitted tools, variants, retention, pending approval response loss, diagnostic, evidence-policy, foreign-person job handle and long-work obligations remain outside this selected observation. Existing erasure, approval replay, attribution, provider, egress, paging, independent standby and real-phone holds remain unchanged. No new policy default is adopted.

## Changes and bounded proof map

- Added ./tests/oncall-agent-action-submit-response-loss.mjs, actionSubmitResponseLoss (lines 7–161), with focusedActionSubmitResponseLoss (lines 163–166) supplying isolated emitted Worker and D1 custody.
- Added exactly one focused invocation in ./tests/oncall-agent-flow.mjs:1039, reached by ./tests/runtime.mjs when ONCALL_RUNTIME_PART=agents and by the existing push Verify agents shard.
- Extended ./tests/agent-door-browser.mjs:165–196 using the existing capture helper and the same runtime flow. The signed-in sponsor approves the exact saved revision and hash once; completed-result recovery never posts approval. Pending and executed approval plus autonomous and held saved follow-up screens are captured at 1440 and 390. Existing assertions remain intact; no test was removed or narrowed.
- Only test source and its generated source lock change in the product branch. No production, copied Base, contract judgment, generated contract view, migration, workflow or homepage change.

| Selected observation | Public-door proof |
| --- | --- |
| Owned due-dated P1 human-review follow-up, current parent revision and fresh original key | actionSubmitResponseLoss lines 31–40: protected native declare and action commands; MCP arguments reference the returned parent revision and action |
| Autonomous original completed-result loss | line 75: discardToolResponse destroys the real HTTP response at headers with bodyRead=false; lines 79–126 establish the terminal original and native effect from D1 |
| Held pending response is consumed and has no native effect | lines 45–62: input_required is parsed; native tables, application, reviews and paging are compared while one pending approval remains |
| Named sponsor approves saved revision and hash exactly once | lines 63–72: returned same-origin signed-in URL and sponsor, saved classes, revision, hash, target and evidence are checked; browser lines 165–196 count exactly one approval POST and compare the posted revision and hash |
| Held first completed result is lost only after execution | lines 112–120 establish original executed approval and receipt; lines 137–143 discard the first completed tools-call result and compare original terminal custody with one linked retrieval attempt |
| Recovery uses identical original arguments with a new JSON-RPC id | lines 146–157: same args object is sent, id differs from the lost id and consumed pending id, structured result and text match the original saved result, receipt and review identity match where present |
| Exactly one native agent submission, timeline entry, incident and workspace revision increment, and native actions.submit audit commit | lines 87–111 compare full result and D1 incident to prepared incident; the only new state-changing native audit is accepted actions.submit; done=false and no accepted field |
| No repeated effects, authority, approval or evidence fetch | lines 120–157 compare original call and expiry, audit prefix, native records and revisions, approvals, reviews, paging and permanent audit; only linked replay-attempt audit and zero-revision capacity persistence are allowed; outbound ledger remains empty; browser evidence route is never fetched |

Acceptance coverage remains bounded. Acceptance 1: the earlier immediate submission retry remains unchanged; complete mutating-tool and 24-hour coverage is not claimed. Acceptance 2: only the selected shipped actions.submit completed-result stream cases are added under both policies; other dropped streams and initial pending-response loss remain unproved. Acceptance 3: existing changed-evidence and immediate-retry proof remains unchanged; other arguments and evidence-policy completion remain outside this slice. Acceptance 4: f258 remains unchanged; f260 required native revision diagnostics and f261 aged replay remain separate predecessors. Acceptance 5: foreign-person job handle refusal and long-work status independent of Tasks are not claimed.

## Riders and pre-handoff checks

| Rider | Result for this bounded partial claim |
| --- | --- |
| 1 | Whole-clause FAIL: selected acceptance-2 outcomes are reached through real MCP and signed-in browser doors; omitted acceptance outcomes remain unproved. No DONE claim. |
| 2 | PASS for selected data-loss path: populated native follow-up, destroyed real completed response, exact stored result and no repeated native effect. Pending held approval is separately consumed, retained and approved once. |
| 3 | Pending exact-SHA Verify: existing agents and hosted browser shards load both changed journeys; no new workflow or flag gate. |
| 4 | Candidate build and touched journeys run after the final test commit. No production source changed. |
| 5 | INSPECTED unchanged: this is BASE-AGENT-012 itself; existing receiving clauses and inheritance are untouched. |
| 6 | Contract judgments and 101 rows remain unchanged; generator write and check pass before restoring generated views. Evidence and residual gaps are reported for the lander. |
| 7 | PASS unchanged: no acceptance text, status row, coverage mapping or ct ruling was edited. |
| 8 | Selected scope PASS: signed-in sponsor approves exact saved data once, and retrieving a completed result does not repeat approval or grant acceptance. Existing revocation and erasure journeys are retained. |
| 9 | PASS boundary retained: synthetic isolated native proof only; no provider, deployment, delivery, legal, model, account or real-phone claim. |
| 10 | Not applicable: no new custody, consent, spending or authority default; no ruling request. |
| 11 | Pending guarded lander: branch-only candidate, publication scan and main equality and Run site are not established by this run. |

Pre-handoff: no assertion removed, skipped, moved or narrowed. No production authority, erasure or replay path changed; existing sponsor revocation and erasure assertions remain in the touched agents journey. No UI production screen or control changed, so font and tooltip changes are not applicable. The saved submission is observed through existing screens. Source lock, contract generation and exact-SHA CI results are recorded in the final receipt. Publication scanning remains the fleet's independent gate, not a cloud claim.

Counts before and after: 26 DONE, 41 PARTIAL, 34 MISSING; 101 Status rows. BASE-AGENT-012 remains MISSING with no status, Gap or Evidence-cell edit. Plan change: report only the selected acceptance-2 completed-result observation; preserve all queue entries, predecessor scopes and held remainders. No plan was rebuilt and no INBOX file was read or written.

## Harness diagnostic

The initial ad hoc focused runner used node --input-type=module -e. Miniflare's synchronous worker inherits execArgv but runs CommonJS code using require, so it stalled before assertions. The timed-out owned processes were stopped. A normal file-based Miniflare D1 probe passed under installed Node 22.20.0, then the focused flow passed from a normal .mjs runner. The committed runtime and browser entry points are ordinary .mjs files and are unaffected. No production workaround, mock, retry or Base edit was made. The generic shell's supplied toolchain selector initially preferred installed Node 24; subsequent checks explicitly prepend the checkout's already-installed Node 22.20.0 runtime.

## Recorded local results

Candidate 709a43a790f9aadee8b50d89de1a12a872464934: production build completed exit 0. Pinned package source lock regenerated and checked, contract write and check passed with 0 generated files changed, first-party check and TypeScript check passed. Existing agents runtime command `ONCALL_RUNTIME_PART=agents node tests/runtime.mjs` passed exit 0 in 428.1 seconds; the selected autonomous and held submission probes appear in runtime.log lines 423 and 424. This also preserved the existing changed-evidence submission, immediate retry, optional-revision, current-authority, erasure, role-clear, assignment, policy and native reviewer journeys.

Browser journey passed exit 0 on the same candidate, including the existing resource-parity tail. All eight new selected screenshots report fits=true, zero serious or critical accessibility findings and zero undersized controls. The pending approval screenshot shows the named sponsor and exact saved evidence; the held saved follow-up remains awaiting acceptance. No approval POST or evidence request was repeated. The product ref was read back at the exact candidate SHA. Main remained 09f2821d713460dcd33d0878dc3a7825daccfc5a.

Final candidate 709a43a790f9aadee8b50d89de1a12a872464934 is pushed on cloud/sd-oncall-c-f262; exact-SHA push Verify 44121729762 is in progress at initial discovery. No PR is required or created: the repository has a branch-push Verify entry point. GitHub REST calls used so far: 2 of 10.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0 (generated views restored from main); ledger=none exit=0.
