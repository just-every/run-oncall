# Oncall SURFACE-001 Changes read proof

Run Edit Run fleet, 19 November 2026.

## Plan and scope

Continue the saved product history on the assigned branch. Reproduce the failed Verify steps on that history, then integrate current main's Verify shard split with a forward merge. Preserve the read tool, class fixture, agent guide, authority and paging configuration. Observe the emitted MCP listing and public agent guide under both company policies, compare the native and audit snapshots, regenerate and check the contract views, restore main's views, then regenerate and check the pinned source lock. Push the exact locally checked candidate, check Verify for that SHA and publish the report packet on the evidence ref.

The plan entry is SURFACE-001 in replan-87. The selected observation is the Changes read row in acceptance 1. The main Status entry remains MISSING. Counts stay at **26 DONE, 41 PARTIAL, 34 MISSING, 101 total**. Acceptances, judgments, generated views and runtime have no product diff against merged main.

## Results through the public doors

| Surface | Observed result |
| --- | --- |
| Original contract table at 071c74a352196f6778eb3b2942c351b4cf1e0ace | oncall.changes.read, OC-065, standard, Shipped. |
| Saved and candidate contract table | Same name, clause, purpose and Shipped status, with standard (+ sensitive). Scope and annotations are carried by the emitted listing. |
| Emitted MCP with autonomous and held policies | One oncall.changes.read row, clauses [OC-065], classes [standard, sensitive], scope services:read, readOnlyHint true, destructiveHint false, openWorldHint false. |
| Served agent guide | Same tool, scope and class set. Both classes cite the maintained changes fixture in tests/agent-door.mjs. See changes-guide-1440.png and changes-guide-390.png. |
| Read effects | Native records and paging snapshot equal before and after. Existing permanent audit immutable, with no mutation audit. The guide added no permanent audit entries. MCP may retain value-free read bookkeeping. Worker and browser each attempted zero outbound requests. Paging stayed OFF. |

The runtime inventory comparison is in tests/oncall-agent-flow.mjs at lines 840–882, invoked by tests/runtime.mjs in the agents shard. The separate served browser inventory comparison is in tests/agent-door-browser.mjs at lines 915–942. The row and computed classes come from src/agent-door/read-tools.ts at lines 21–24 and 81–85 and the changes fixture in agent-surface.json. The focused emitted Worker receipt records the actual names, values, both policies and before and after observations. Existing assertions were preserved.

The f244 tool-mapping predecessor 183eef356bf1fd5eec173f2e5cbf27f3564ca0f7 and the reconciled f265 responder-list predecessor ec20de7b42e527cd205b7c42c2dde493948eca7f are both ancestors of the merged main. The original f265 ref bcd444494196597c1834818c2c78d3d8c13b6aa9 was reconciled on main. The original base through the saved branch changed only the contract and its lock. The merged main carried release metadata and the Changes and Activation Verify split. Agent runtime, guide and journey files were byte-identical across those changes.

PROBE SURFACE-001 1: Emitted MCP tools/list and the served agent guide under autonomous and held policies -> one read-only Changes row for OC-065, scope services:read, standard and sensitive, intact native records and permanent mutation audit, paging OFF and zero outbound requests. The complete row was read at 1440 and 390.

## Remaining scope

Acceptance 1 still needs complete tool inventory parity. The planner leaves all other class mismatches and unshipped tools outside this slice, including bridge creation, bulk triage and saved views, page creation, policy updates, contact updates, readiness drills, swap responses, calendar subscription, routing publication, intake keys, member updates, SSO, handoffs, follow-up updates, publication, archive operations, action updates and runs, remediation, investigations, ownership proposals, incident escalation and merging, paging history, alert replay, client and endpoint changes, and analytics usage. Service update access and live classes, privacy erase classification and replay custody, and Today prose stay in their existing lanes.

Acceptance 2 retains the complete resource and event requirements, including record URIs. Prompts and full conformance remain within the existing BASE-AGENT-003, BASE-AGENT-010 and BASE-AGENT-013 boundaries. Acceptance 3 still needs full Oncall conformance under both policies. OC-045, OC-046, OC-048 and OC-049 need ct's agent and AI egress authority. Live paging needs live delivery, standby and real-phone proof. OC-023 still holds team privacy. BASE-AGENT-006 and BASE-AGENT-008 holds and SURFACE-004's Base seam remain outside this slice.

## DONE riders

| Rider | Result for this slice |
| --- | --- |
| 1 | **Open.** The public doors confirm the Changes row. Full tool parity, resources and events, and full conformance remain open. |
| 2 | **Pass for the selected read.** Emitted listing and public browser guide compare independently with the contract and maintained fixture under both policies. Native and audit custody are read back. |
| 3 | **See exact-SHA Verify below.** The agents shard runs the inventory comparison through tests/runtime.mjs. The hosted shard runs the agent browser journey. |
| 4 | **Pass.** The final local receipt identifies the candidate and records the same tool and both policy outcomes. |
| 5 | **Pass for placement.** SURFACE-001 cites BASE-AGENT-001, BASE-AGENT-002, BASE-AGENT-003, BASE-AGENT-010, BASE-AGENT-012 and BASE-AGENT-013 in its meta line. |
| 6 | **Local generation passed.** The source status, gap, evidence and judgment stay byte-for-byte as on main. The lander owns view generation and status judgment. |
| 7 | **Pass.** The acceptance sentences remain unchanged. |
| 8 | **Pass for the selected read.** Scope and read-only hints were observed. Native state and mutation audit were unchanged. The read tool uses the existing authority, revocation and erasure logic. |
| 9 | **Held.** This is local evidence. Live paging, standby and real-phone evidence remain held. |
| 10 | **No policy change.** Both existing policies were exercised. |
| 11 | **Pending guarded landing.** The Mac lander runs the complete publication scan and the exact-main Run site check. |

GAP SURFACE-001: Complete tool parity, resource and event parity and complete conformance under both policies remain open, including ct egress authority and the existing live paging and team privacy holds.

## Mechanical checks

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

No migration or dependency pin changed relative to merged main. The touched journeys, shared build, first-party check and typecheck ran locally. The lander owns the exact-candidate full-history publication scan. Main equality and the candidate's Run site are pending landing.

## Inherited Verify and repair

Verify 44624425448 at 308c610d2edaebae3a9397e515bf2e6db2fdfb56 failed with contract-docs job 135914547236, cancelled shards (changes) job 135916392172 and failed aggregate verify job 135925221090. The Changes job ran about 15 minutes against its 15-minute limit. The official job archive command returned no failed-step text for each of the three jobs. The REST job details show the cancellation in the shard command.

The exact generated-view command failed as expected on the saved checkout. The aggregate's shell step failed with the recorded inputs, continued to fail with views success substituted, and passed with the shard success also substituted. No failing shard assertion was available. The saved checkout's Changes command was exercised locally before merging main. Main independently split Activation from Changes in 8b30370587527f91331d9fc84deb82688dbfa67a. Verify 44636257432 and Run site 44636257363 completed successfully for that main SHA.

VERIFY_REPRODUCED {"head":"308c610d2edaebae3a9397e515bf2e6db2fdfb56","job":"contract-docs","command":"node src/base/contract-docs.mjs check","test":"Check the generated contract documents","exit":1,"failure":"ACCEPTANCE.md: generated content differs; run contract-docs write."}

VERIFY_REPRODUCED {"head":"308c610d2edaebae3a9397e515bf2e6db2fdfb56","job":"verify","command":"bash with the workflow's Require the selected coverage and its proof step and recorded job inputs","test":"Require the selected coverage and its proof","exit":1,"failure":"The aggregate coverage guard exited 1 with the recorded contract-docs failure and changes shard cancellation."}

The same generated-view command on the pushed candidate reproduced the expected stale ACCEPTANCE.md result. Regenerating both views earlier on the candidate tree passed the check with zero prose errors and warnings.

VERIFY_REPRODUCED {"head":"66708782276f46de975edabf272d79cfdf6721c1","job":"contract-docs","command":"node src/base/contract-docs.mjs check","test":"Check the generated contract documents","exit":1,"failure":"ACCEPTANCE.md: generated content differs; run contract-docs write."}

## Candidate browser failure

Exact-SHA Verify 44642143874 had one additional failing job, shards (browser) 135976799676. The workflow archive reports an exit of 1 in Run this shard. In tests/product-browser-journey.mjs at line 255, opsgenieReadiness was comparing the protected state after reading the Opsgenie guide. Playwright reported "apiRequestContext.get: socket hang up (ECONNRESET)" on the loopback GET to the state endpoint. The failure happened before the state equality assertion could evaluate. The hosted agent browser, agents, Changes and Activation jobs passed.

Running node scripts/verify-oncall.mjs browser on the pushed candidate with the CI shard and Node 22.20.0 completed with exit 0, including opsgenieReadiness and the whole core product browser journey. The configured cloud Chromium is version 154 and the Actions archive identifies HeadlessChrome 156. The candidate, main and the inherited product browser workflow use the same product-browser code and the same source for the test Worker. The exact remote socket reset did not reproduce locally. No code or test assertion was changed to address the unconfirmed cause. The ten-call GitHub allowance was spent retrieving run states and the failing job archive.

The same browser shard command on merged main 8b30370587527f91331d9fc84deb82688dbfa67a passed on the same cloud runner and Chromium version. The candidate and main browser invocations took 393.1 and 396.6 seconds, respectively. The branch remains published with a red Verify, and the browser failure requires a separate exact-SHA CI result. No speculative repair or additional dispatch was made.

The saved Changes shard command completed locally with exit 0. Activation took 246.8 seconds and the import journey took 515.0 seconds, before runner overhead. The merged main moves Activation to a separate shard.

## Published candidate

Branch cloud/sd-oncall-c-f309-pc1 at 66708782276f46de975edabf272d79cfdf6721c1.

Exact-SHA Verify 44642143874 for the push event reports failure. https://github.com/just-every/run-oncall/actions/runs/44642143874

| Verify job | ID | Conclusion |
| --- | --- | --- |
| plan | 135975617658 | success |
| contract-docs | 135975754018 | failure |
| build | 135975754088 | success |
| light | 135975755472 | skipped |
| shards (transfer) | 135976799508 | success |
| shards (hosted) | 135976799526 | success |
| shards (triage) | 135976799531 | success |
| shards (runtime) | 135976799535 | success |
| shards (intake) | 135976799596 | success |
| shards (agents) | 135976799623 | success |
| shards (changes) | 135976799647 | success |
| shards (activation) | 135976799654 | success |
| shards (browser) | 135976799676 | failure |
| verify | 135982988834 | failure |
| full-push-proof | 135982990723 | skipped |
| nightly-proof | 135982991035 | skipped |

The exact-SHA Verify failure remains unresolved. See the job conclusions and run above.

The 390-pixel guide uses a horizontally scrollable table. The receipt records the complete rendered row at both viewport widths.
