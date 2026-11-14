# sd-oncall-c-f249 results

Repository: just-every/run-oncall. Branch: cloud/sd-oncall-c-f249.
Candidate: 5e250b90adc319fe7872d4ffd121397eade35377.
Base and latest merged main: f7b5b5ea71e955081501bebf81a4f967459c8e34.
Save: 4e322f8 (skip CI). Final candidate has no skip marker. No PR is required: Verify accepts branch pushes.

BASE-AGENT-012 remains MISSING in CONTRACT.md. The claim is PARTIAL and covers only the selected populated Scribe to null variant within points 1 to 4. No Status, Gap, Evidence, acceptance sentence, summary count, copied Base, production source, schema, classifier, capability, permission, migration or workflow changed. Counts remain 26 DONE, 41 PARTIAL and 34 MISSING, total 101. No whole-clause promotion is requested.

## Plan and implementation

The complete plan is PLAN.md. Its selected work is implemented in one focused helper, tests/oncall-agent-role-clear-replay.mjs, called once from tests/oncall-agent-flow.mjs through tests/runtime.mjs. A dedicated ordinary native service avoids fixture notification endpoints; it is created by the protected native command door. Each ordinary incident starts acknowledged with populated Scribe, Commander, Communications and explicit assignee, no recovery, alerts or actions. All preparation uses native HTTP.

The helper uses agentEffectSnapshot and the existing real-socket discardToolResponse. Successful calls compare the entire incident and application state, actual D1 incident storage, single native state-changing audit with permanent actor, subject and source labels, incident and workspace revisions, one new agent call and event, preserved approvals and original reviews, and exactly one open review only under held policy. Refusals and retries compare every retained effect and the original call, outcome and expiry; only the required attempt audit, linked relay and capacity bookkeeping may append. Every path checks an empty outbound request ledger.

The existing retention helper now accepts member=null in its role branch. All prior assignment, reassignment, declaration, note, action, service and evidence-free mitigation cases remain. It adds one real Scribe clear per policy: eleven original operations per policy are now replayed at each of the two aged instants, for 44 aged retries overall. The signed receiving policy is renewed without changing its authority. Fresh five-minute tokens retain the same person, agent, client, consent and scopes. Replay baselines start after renewal; original call custody and expiry do not slide.

The existing browser journey shows the saved clear through the ordinary incident URL. Desktop assertions inspect the retained lead and explicit assignee, the Unassigned Scribe and populated Communications controls in People and priority, and the readable, agent-attributed timeline entry. The saved timeline and People and priority dialog are captured once each at 1440 and 390. The close icon's keyboard tooltip is visible. All four changed-screen measurements report fits=true, zero serious or critical axe findings and zero controls below 44px. Existing relevant incident text styles are at least 13px, borders remain the existing full outlines, and the icon controls retain existing tooltips. No UI creation or polish change was needed.

## Frozen selected rubric and acceptance proof

Each row covers a checkable selected outcome through the emitted Worker. Autonomous and held policies both run. Exact command receipts and actual probe output are supplied separately; CI status is in CI.json.

| Item | Selected acceptance outcome | Test and lines | Local result |
| --- | --- | --- | --- |
| R1; point 1 | Two calls with one key give one effect and equal results for a populated Scribe clear. | tests/oncall-agent-role-clear-replay.mjs, roleClearReplay, lines 59 to 136 and 145 to 151. Complete incident and native audit comparisons precede immediate replay. | PASS |
| R2; point 1 retention | The first native result survives exactly 24 hours and 24 hours plus one second with renewed unchanged authority. | tests/oncall-agent-retention.mjs, agedReplayRetention, lines 103 to 115, 183 to 191 and 200 to 257. The genuine completed clear is retained beside all prior cases. | PASS |
| R3; point 2 | A new JSON-RPC id recovers the recorded outcome after losing the actual response at headers. | tests/oncall-agent-role-clear-replay.mjs, roleClearReplay, lines 161 to 167; tests/agent-door-runtime.mjs, discardToolResponse. No response body is consumed. D1 establishes the first result before retry. | PASS |
| R4; point 3 | Reusing the completed original key and revision with only a changed schema-valid reason yields idempotency_conflict and no effect; original arguments still replay. | tests/oncall-agent-role-clear-replay.mjs, roleClearReplay, lines 152 to 160. Metadata and text match; private structuredContent is absent. | PASS |
| R5; point 4 optional | Current required native revision plus stale expected_revision returns the exact authorized incident current_revision. | tests/oncall-agent-role-clear-replay.mjs, roleClearReplay, lines 168 to 187, expected branch. Returned revision is 5, distinct from workspace revision. Fresh-key correction clears once and retry has no second effect. | PASS |
| R6; point 4 native | Stale required native revision with expected_revision explicitly absent returns the same exact parent diagnostic. | Same lines, native branch. Absence is explicitly asserted on refused and corrected calls. | PASS |
| R7; point 4 confidentiality | Missing and scoped-out incidents have identical not_found metadata and text, with no revision disclosure or private structured result. | tests/oncall-agent-role-clear-replay.mjs, roleClearReplay, lines 188 to 197. Both diagnostic forms and both policies compare all retained custody. | PASS |
| R8; shared safety | Exactly one attributed clear, one assign-role entry, one incident and workspace increment, one native audit, preserved companion fields, one held review, no duplicate custody, zero outbound requests. | tests/oncall-agent-role-clear-replay.mjs, committed, replay, error, attempt and bookkeeping; lines 41 to 136. | PASS |
| R9; existing view | Reloaded Unassigned Scribe and attributed timeline are visible with realistic companion roles. | tests/agent-door-browser.mjs, saved Scribe clear block, lines 145 to 189. Screens supplied at 1440 and 390; assertions at 1440. | PASS |
| R10; inherited proof | Previous assignment and f247 mitigation journeys stay invoked, and prior aged cases remain. | tests/oncall-agent-flow.mjs, lines 1026 to 1033; tests/oncall-agent-retention.mjs, lines 159 to 197. Runtime machines runs the surviving assignment, conflict, diagnostic and mitigation proof. | PASS |

The five clause acceptance sentences are accounted for as follows: sentence 1 is proved only for this selected clear and retained prior bounded cases; sentence 2 only for this selected dropped-response clear and retained prior proof; sentence 3 only for this selected changed-reason clear and retained prior proof; sentence 4 only for the two selected clear diagnostics and retained prior proof; sentence 5 is OUTSIDE SELECTED SCOPE and remains unproved. The clause's all-tools, all-variants, full retention and long-work requirements remain broader than this round.

## DONE riders and pre-ready checks

No DONE claim is made. Results below distinguish selected proof from whole-clause coverage.

| Rider | Result | Evidence or remaining boundary |
| --- | --- | --- |
| 1 | PASS selected; FAIL whole clause | R1 to R9 prove the selected null-Scribe outcomes. Other tool and operation variants and point 5 remain gaps. |
| 2 | PASS selected | Real populated native incidents, accepted calls, conflicts and confidentiality refusals; snapshots compare retained native state and custody. |
| 3 | PASS exact candidate | The helper is invoked by runtime machines in Verify's intake shard; the browser block is imported by product-browser in Verify's browser shard. Exact-SHA event and conclusion are in CI.json. |
| 4 | PASS local | Final candidate command receipts bind build, runtime machines, browser and typecheck to the full candidate SHA. |
| 5 | UNCHANGED | This is direct BASE-AGENT-012 proof, not a receiving-clause inheritance rewrite. No clause text changed. |
| 6 | PASS mechanical; judgments reserved | Generator write then check passes, generated views restored from main, source lock regenerated last and checked. Contract judgment cells are unchanged. |
| 7 | PASS | No acceptance point, coverage mapping or ruling changed. |
| 8 | PASS selected | Scoped-out and missing refusals preserve custody and disclose no revision; both stale revision paths refuse without effect. No new authority. |
| 9 | PASS honest boundary | No real provider, production delivery, standby, cutover or legal proof is claimed. |
| 10 | NOT APPLICABLE | No new policy default or authority decision. |
| 11 | PENDING guarded lander | Candidate is branch-only. Full-history publication scan, main equality and Run site on the landed candidate are fleet duties. |

Pre-ready: selected outcomes have public-door assertions; no existing assertion was removed, skipped, narrowed or moved behind a width condition. Existing erasure, revoked-credential and approval replay paths remain invoked in runtime machines and browser; this round adds no fallback or widened cached authority. UI proof uses existing controls and tooltips. Source lock is fresh. Generated views are excluded from product commits. Added text has no email-shaped fixture value; existing fixture identities are unchanged. Cloud publication scanning is not run here under the cloud adaptation. A complete scan with zero findings remains a lander condition, never an assumed receipt.

## Gaps, holds and plan return

GAP BASE-AGENT-012: Other mutating tools and operation variants, the remaining dropped-stream and changed-argument matrices, other revision diagnostics, foreign-person job-handle refusal and long-work status independent of Tasks remain unproved outside existing evidence. Full all-tools 24-hour retention is not claimed. This round closes only the populated Scribe to null variant within points 1 to 4.

OC-045, OC-046, OC-048 and OC-049 retain agent and AI egress authority holds. Erasure and approval replay, SURFACE-004's ambiguous hold and copied Base seam, BASE-AGENT-006 and BASE-AGENT-008 holds, all previous scope declarations and predecessor gates remain unchanged. Model, investigation, ownership, remediation, recurrence and executor flows remain omitted. Paging is OFF. Provider authorization and A2P, automatic timers, delivery, independent standby, devices, real-phone and cutover duties remain held. No account, outbound, activation, publication or release authority was used.

Plan row changed for return: replan-63 BASE-AGENT-012, populated Scribe clear observations within points 1 to 4 complete locally; MISSING retained with no count change. No other queue or plan row changed. The Mac plan itself was not available and was not edited.

## Execution notes

Initial one-off diagnostic invocations used Node's module-eval flag, which propagated to Miniflare's synchronous worker and stalled before the fixture database was available. Those owned processes were stopped. Using an ordinary Node invocation fixed startup; temporary diagnostic logging in installed dependencies was restored byte-for-byte. No source or copied Base change was made. A first browser probe looked for the Scribe control outside its existing dialog; it was corrected to open People and priority and use the existing readable timeline text. The final tests pass without weakening an existing assertion. Setup's private local entry links and raw fixture-state dumps are not included in the public packet.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated files restored from main; ledger=none exit=0. The installed rer source-lock check also exits 0. No new top-level journey registration, removed assertion, pin test or obsolete test deletion. Main Verify runs 43615772348 and 43612831461 and Run site 43615772258 were successful on the fetched main SHA.

Exact candidate checks: rer build PASS (6.36s); runtime machines PASS (356.08s); typecheck PASS (2.09s); first-party check PASS (0.46s); complete existing agent-door browser PASS (57.26s). All command receipts name 5e250b90adc319fe7872d4ffd121397eade35377. Runtime machines retained all prior role and mitigation proof. The browser rerun includes the four changed-screen captures and all previous assertions.

PROBE BASE-AGENT-012 1: MCP populated Scribe to null under both policies -> one native clear, equal immediate and aged saved results, unchanged original expiry and review custody.
PROBE BASE-AGENT-012 2: real MCP response destroyed at headers with unread body -> D1 proves completed clear; new RPC id returns the exact original result.
PROBE BASE-AGENT-012 3: original completed key and revision with only changed reason -> idempotency_conflict in metadata and text, no private result or effect; original arguments replay.
PROBE BASE-AGENT-012 4: separate populated targets with stale optional or required revision -> revision_conflict naming parent revision 5; fresh-key corrections clear once; identical retry adds no effect; missing and scoped-out targets return identical not_found without disclosure.

CLAIM BASE-AGENT-012 PARTIAL points=1,2,3,4 tests=tests/oncall-agent-role-clear-replay.mjs#roleClearReplay; tests/oncall-agent-retention.mjs#agedReplayRetention; tests/agent-door-browser.mjs#saved Scribe clear

This claim names only the planner-selected populated Scribe clear observations. It requests neither a whole-acceptance completion nor a whole-clause status promotion. All 101 Status rows are byte-for-byte unchanged from the fetched main.

First Verify attempt: push run 43624929302 completed cancelled. Build, runtime, browser, triage, changes, hosted and transfer jobs passed. Intake job 132539106981 was cancelled after 15 minutes 18 seconds overall, with its Run this shard step cancelled after 13 minutes 24 seconds. The final coverage guard job 132543597958 failed because the intake shard was cancelled; full-push-proof was skipped. The single prescribed gh run view command for the cancelled intake job returned exit 0 and zero bytes, so it supplied no failing assertion. No direct job-log blob URL was requested, no blocked blob download was retried, and no product or workflow edit follows this observation. The exact intake command is being compared locally with pinned main before classifying a permitted infrastructure rerun.

CI timing control: the exact failed-shard command, node scripts/verify-oncall.mjs intake, passed unchanged on candidate 5e250b90adc319fe7872d4ffd121397eade35377 in 480.01 seconds and on pinned main f7b5b5ea71e955081501bebf81a4f967459c8e34 in 460.21 seconds on this same VM. Both include the full runtime machines, intake and routing journeys. No assertion failure reproduced and no repair edit was made. The 15-minute CI job-budget cancellation is reported as infrastructure timing. GitHub accepted exactly one rerun-failed-jobs request on the unchanged run and head. Nine of ten GitHub calls are used; the remaining call is reserved for an exact-SHA result after the rerun execution window.

## Final custody

Final exact-SHA observation after the one permitted failed-job rerun: Verify 43624929302, event push, status completed, conclusion success, head 5e250b90adc319fe7872d4ffd121397eade35377. Ten GitHub calls used. CI URL: https://github.com/just-every/run-oncall/actions/runs/43624929302. No third dispatch, rerun or repair was attempted.

The candidate is ready for the guarded fleet landing checks. There is no unresolved local product blocker. Publication scanning, main equality and Run site on the landed candidate remain fleet gates. BASE-AGENT-012 remains MISSING, with only the selected Scribe-clear observations claimed PARTIAL.

CLAIM BASE-AGENT-012 PARTIAL points=1,2,3,4 tests=tests/oncall-agent-role-clear-replay.mjs#roleClearReplay; tests/oncall-agent-retention.mjs#agedReplayRetention; tests/agent-door-browser.mjs#saved Scribe clear
