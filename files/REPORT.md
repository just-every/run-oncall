# sd-oncall-c-f215 results

Scope: only required native revision for oncall.incidents.update, change=assign-role, role=scribe, expected_revision omitted. The implementation already exposes the correct native diagnostic in ./src/agent-door/coordination-tools.ts. The new focused proof uses the shared role-helper pattern from replan-46 and the landed native incident diagnostic. No production, classifier, registry, capability, declaration, held Base replay seam, migration, UI or workflow changes are made.

BASE-AGENT-012 remains MISSING. All 101 Status rows and all Status, Gap and Evidence cells are retained from main. Counts before and after: 20 DONE, 47 PARTIAL, 34 MISSING. No clause acceptance text is changed and no point is added. The bounded claim is PARTIAL, never whole-clause promotion. The exact product head and push custody will be recorded in candidate.json.

Predecessor hold: main b59f29479feeaeb975f53c044a65eab888fb68be has green Verify 42538139569 and 42534513386, green Run site 42538139458 and green Nightly journeys 42551773378. It includes replan-44 changedScribeReasonConflict and replan-45 droppedScribeAssignmentReplay, whose assertions remain intact. Replan-46 is still unlanded at bd2df3c6a66861a06b6096d3466988db41e95e9b. Its Verify 42545538043 failed in browser job 128930069076; runtime job 128930069075 passed. Exactly one permitted failed-job archive read returned exit 0 with zero output and no HTTP or assertion text. No retry, flake claim, repair or rerun was attempted. The selected helper was prepared independently on current main so the observation is not lost; this is a held branch, requiring predecessor landing and reconciliation of the shared helper before a landing handoff. The optional-revision helper must be retained on that merge. No READY or predecessor acceptance is claimed.

The full plan and frozen six-row selected-observation rubric are in PLAN.md. R1-R6 results, actual probes and command receipts accompany this report. The new helper is ./tests/oncall-agent-role-revisions.mjs#staleScribeNativeRevision, invoked by ./tests/oncall-agent-flow.mjs through ./tests/runtime.mjs machines, which push Verify selects in its intake shard. There is no new standalone journey registration, no test removed, and no assertion narrowed, skipped or moved behind a condition. Existing revocation, erasure, review, changed-reason and dropped-response scopes remain intact.

Selected proof:
R1: both policies use a fresh ordinary declared incident with Scribe unassigned, empty alerts and actions and recovery, an existing active responder, a literal reason and a fresh key. Object.hasOwn proves expected_revision absent. The stale required native revision must return isError revision_conflict with the exact authorized parent incident current_revision in both metadata and JSON text, without structuredContent. The parent revision is explicitly distinct from workspace revision.
R2: agentEffectSnapshot compares real D1 native records, workspace and incident revisions, timeline, state-changing permanent audit, populated original calls and stored outcomes, approvals, reviews and paging. The refusal appends exactly one attributed agent refusal row. Permanent bookkeeping may append only effect-free agent-door.persistence entries; every prior row is preserved.
R3: a new key using the returned native revision must produce standard-only autonomous completion or one open review under held policy. Exactly one agent-attributed Scribe assign-role entry retains the literal reason. Incident and workspace each increment once, one native state-changing audit commits, and actor, entity and sponsor labels are checked. Other incident fields and unrelated incidents stay unchanged.
R4: identical arguments and key with a new JSON-RPC id must return the stored native result and original review identity, preserving all native effects, calls, outcomes and reviews. Exactly one linked replay-attempt audit names the original decision and operation. Permanent attempt bookkeeping has no application effect.
R5: a valid scoped credential reads its granted service, then foreign and missing incident calls with stale required revisions and expected_revision absent must return identical not_found metadata and text, without a revision or structuredContent and without changing native or saved custody.
R6: every stage under both policies requires an empty outbound network-edge ledger.

Acceptance accounting:
1. Only this selected Scribe success and identical replay are observed. Complete mutating-tool coverage and at-least-24-hour retention remain omitted.
2. All other dropped-response scopes remain unchanged; this round adds none.
3. All changed-argument scopes remain unchanged; this round adds none.
4. Only the required-native-revision Scribe diagnostic is added. Replan-46 optional-revision proof remains a held predecessor and must land first. Every other retained optional and native diagnostic omission is unchanged.
5. Foreign-person job-handle refusal and long-work status independent of Tasks remain omitted.

Retained boundaries: OC-045, OC-046, OC-048 and OC-049 need agent and AI egress authority. Erasure and approval replay, SURFACE-004's ambiguous held Base seam, BASE-AGENT-006 and BASE-AGENT-008 holds, every existing queue entry and release prerequisite are unchanged. Model, investigation, ownership, remediation, recurrence and executor flows remain omitted. Paging stays OFF. Provider authorization and A2P, production delivery, independent standby, native-device and real-phone duties remain held. No account, capability, outbound, activation, publication or release authority is granted.

DONE-RIDERS accounting; no DONE claim:
1. Whole-clause FAIL: retained acceptance omissions above. Selected public-door rubric scored separately.
2. The selected journey exercises refusal and allowed recovery on populated custody, then replay and foreign-scope non-disclosure.
3. Candidate exact-SHA Verify must be reported from its own run, never inferred from main. The predecessor gate remains unsatisfied.
4. Tested source hashes are captured and compared with committed blobs. No production source changed.
5. No receiving-duty or inheritance change.
6. Contract write and check passed; no views or Status cells are committed. Source lock is regenerated last and checked.
7. No acceptance rewrite, no ct ruling needed.
8. Authorized assignment and foreign-scope and missing-target denials run under both policies, with no private disclosure or refusal effect.
9. No live provider, timing-retention or legal boundary is claimed.
10. No policy default adopted.
11. PENDING fleet scan, main equality, landing and Run site, with the explicit replan-46 predecessor hold preserved.

Pre-ready self-check: no READY while the required predecessor is unlanded. No assertion removed or weakened; existing revocation and erasure paths remain intact. No screen touched, so browser screenshots are not applicable. Changed tests add no email-shaped or credential-shaped fixture values. No full-history publication scan is claimed in cloud. The fleet owns that scan, landing and Run site. The selected test uses the emitted Worker and native D1, not an application mock.

Plan rows changed: none in the read-only plan. Proposed return: record the selected native Scribe observation as bounded acceptance-4 progress after its runtime proof and predecessor reconciliation; retain MISSING and unchanged counts. Do not promote the whole clause or repeat any separately launched scope.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check, plus installed edition-authoring check; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

Final result: selected rubric R1-R6 PASS. The emitted Worker machines journey completed in 537.1 seconds with exit 0. Four actual Scribe probes appear in selected-probes.txt and runtime-receipt.json; full non-secret output is runtime-output.txt. Typecheck, first-party checks, generator write and check, documented lock and check, and installed lock check all exited 0. No production change was needed.

Candidate: 627dffb01616417cf70e68951cfc37a64fb4e24d on cloud/sd-oncall-c-f215. The guard pushed on attempt 1, exit 0, and ls-remote independently returned the identical head. The real commit is a held save with [skip ci]; exact-SHA discovery returned no runs. No workflow was dispatched for this held save, and no candidate green is claimed. GitHub call total is 6 including the one failed-job archive read recorded earlier.

Predecessor recheck: Verify 42545538043 remains completed with failure on bd2df3c6a66861a06b6096d3466988db41e95e9b. Final main fetch remains b59f29479feeaeb975f53c044a65eab888fb68be. The pre-push rebase was a no-op and the source lock was regenerated and checked afterward. This run changes no predecessor assertion or gate. It is BLOCKED for landing by that explicit prerequisite, rather than by missing receipts. No READY is emitted. The lane can resume reconciliation after predecessor landing.

Proof locations in ./tests/oncall-agent-role-revisions.mjs: R1 lines 30-53; R2 lines 54-61 and 15-22; R3 lines 62-117; R4 lines 119-131; R5 lines 134-153; R6 lines 132 and 154. The invocation is ./tests/oncall-agent-flow.mjs line 1114, reached by ./tests/runtime.mjs machines. All source hashes were checked against committed blobs; sources did not change after the passing run. No new test registration is added and none is removed.

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-role-revisions.mjs#staleScribeNativeRevision
GAP BASE-AGENT-012: Only the selected required-native Scribe diagnostic is proven; all retained omissions and replan-46 predecessor gates above remain. Status stays MISSING, with 20 DONE, 47 PARTIAL and 34 MISSING before and after.
