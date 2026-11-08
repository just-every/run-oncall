# sd-oncall-c-f211 report

Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-c-f211.
Baseline: 6858a3c3b5fa01f7f4a90d40bdce1f2f09e60bb9.

Plan and scope

1. Inspect BASE-AGENT-012, its five acceptance points, native revision checks, emitted Worker journeys and existing reassignment predecessors. Retain the Status table whole.
2. Extend the existing agent journey with one focused native reassignment revision diagnostic, under autonomous and held policies. Keep expected_revision absent. Exercise an otherwise-valid reassignment to a distinct existing active responder on an ordinary incident without protected evidence.
3. Observe the failure on the unmodified emitted Worker. Add current_revision to the authorized native revision refusal using existing ToolRefusal fields and existing MCP serialization. Keep scope checks before disclosure.
4. Prove no refused effect, one recovered effect, original result and review replay, identical missing and scoped-out not_found, and zero outbound requests using agentEffectSnapshot and real D1.
5. Run emitted Worker machines coverage, typecheck and first-party check. Generate and check contract views, restore them from main, regenerate and check source lock last. Inspect all candidate commit identities and trailers; push only the named product branch.
6. Discover and poll exact-SHA Verify through REST within the ten-call budget and 300-second cadence. Publish this non-secret packet separately to the evidence ref. Leave publication scan, landing and Run site on the candidate to the fleet.

Initial gates

Main Verify 42422595566 and Run site 42422595588 completed successfully on the baseline. Reassignment predecessor f208 Verify 42363185809 passed on landed 7d2fb0b418c3247678bf49ed650367776ce50034; f209 branch Verify 42352260853 passed and its landing Verify 42421379320 passed on the baseline. Their existing tests are retained and run by the touched journey. The f210 branch lookup returned Branch not found (HTTP 404), and a Git remote-ref read found no f210 branch. No published shared-file diagnostic helper exists at this baseline; no predecessor code was copied from history. The generic native revision guard and standard error-fields serializer are reused.

Acceptance map and unproved remainder

The selected slice of acceptance 4 is native reassignment revision diagnosis only. Acceptance 1 still lacks complete mutating-tool coverage and full retention proof across all tools; acceptance 2 still lacks other dropped-response cases; acceptance 3 still lacks other tools and argument combinations; acceptance 4 retains other native and optional diagnostics including the separately launched reassignment optional diagnostic; acceptance 5 retains foreign-person job-handle refusal and long-work status independent of Tasks. The selected slice cannot promote the whole clause. Main's MISSING judgment and every Status, Gap and Evidence cell remain untouched.

Held scope remains: OC-045, OC-046, OC-048 and OC-049 agent and AI egress authority; SURFACE-004 ambiguous hold and Base replay seam; BASE-AGENT-006 and BASE-AGENT-008 holds; model, investigation, ownership, remediation, recurrence and executor work. Paging remains OFF. Provider authority, A2P, live delivery, independent standby, devices, real phones, activation, publication and release readiness are unclaimed.

Observed baseline failure

Command: cloud_run node tests/oncall-agent-flow.mjs, emitted from the unchanged baseline production source with the new focused journey loaded. Exit 1. staleReassignmentNativeRevision expected {code: revision_conflict, current_revision: 2}, but received {code: revision_conflict}. The failure is the missing diagnostic, not malformed input or policy refusal.

Implementation

The existing native guard in src/agent-door/coordination-tools.ts reads the current authorized incident revision after access and emits ToolRefusal details {current_revision}. Existing pipeline execution and wire serialization retain those fields in error metadata and JSON text and omit structuredContent. No classifiers, declarations, capabilities, domain command semantics or Base replay code changed. tests/oncall-agent-incident-revisions.mjs is invoked from the existing tests/oncall-agent-flow.mjs and tests/runtime.mjs machines journey. No existing assertion was deleted or narrowed; no UI changed.

Final verification and provenance follow below.

Mechanical checks

Build, typecheck, first-party check, contract generator write and check, and staged-source lock generation and check all exited 0. The generator wrote 0 files; both view files were explicitly restored from origin/main. No migration changed, so migration ledger check is not applicable. No CONTRACT.md byte changed. Counts remain 20 DONE, 47 PARTIAL and 34 MISSING of 101 rows; BASE-AGENT-012 remains MISSING. No permanent journey registration was added: the new helper extends the existing machines journey; no test was removed. No test-budget.json exists in the checkout.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

Frozen selected-slice rubric

R1: Ordinary assigned incident, no protected evidence, distinct active responder, valid literal reason, fresh key, stale native revision and no expected_revision. Check emitted MCP error metadata and text for exact authorized parent revision; assert no structuredContent.
R2: Compare all retained effect records, native incident and workspace revisions, timeline, state-changing permanent audit, original calls and outcomes, approvals, reviews and paging with agentEffectSnapshot. Permit required refusal audit and capacity bookkeeping only; assert an attributed refusal audit.
R3: Use the returned native revision with a fresh key. Check standard-only autonomous completion or a single original held open review; one distinct agent-attributed reassignment, one incident and workspace increment and one native state-changing audit commit.
R4: Retry identical arguments and key with a new RPC id. Check saved result and original review identity, unchanged custody, no second state-changing effect or review, and linked replay audit only.
R5: Valid scoped client sends otherwise-valid reassignment to a foreign incident and a missing incident with stale native revisions. Check identical not_found metadata and text, no revision or private result, unchanged retained effects, and zero outbound requests throughout both policies.

All selected rubric rows run in tests/oncall-agent-incident-revisions.mjs#staleReassignmentNativeRevision, loaded from tests/oncall-agent-flow.mjs by tests/runtime.mjs machines coverage. Full acceptance 4 and the whole clause remain unproved outside this selected slice.

DONE riders and pre-handoff self-check

1. Whole clause FAIL: acceptance remainder above is unproved; no DONE claim. Selected public-door outcomes covered by R1 to R5.
2. Selected slice PASS when its runtime succeeds: populated records and real allowed and refused native paths; the unchanged-build baseline failed on the missing current_revision.
3. Exact-SHA Verify PENDING until final CI discovery. The helper is loaded by the existing push Verify machines path, not a new workflow or opt-in flag.
4. Relevant source and test hashes are recorded in receipt.json; final head must preserve those bytes. Runtime outcome and CI bind final provenance below.
5. No receiving-clause inheritance edit; existing obligations remain intact.
6. PASS mechanical generation and all main Status cells retained. The builder makes no stale-view repair.
7. PASS no acceptance sentence, ruling, coverage map or Status cell changed.
8. Selected authority boundary exercised both ways by R1 to R5. No authority was expanded; no replay or approval seam changed.
9. PASS honest boundary: no live provider, independent standby, device, real-phone or retention-wide claim.
10. No new policy default adopted; existing scoped authority and company policies retained.
11. PENDING fleet landing: publication scan, main equality and Run site on the final candidate are outside this cloud run. No scan result or main landing is claimed.

Pre-handoff: no existing assertion removed, weakened or conditioned. No screen or icon-only control changed. The touched machines journey retains existing erasure, revocation and replay tests. A source lock freshness result and exact-SHA CI state are reported below; publication scan remains the fleet's independent gate.

Proof locations in the focused journey

R1 uses the fresh declaration and human acknowledgment at lines 23 to 26, populated-custody and distinct-active-responder checks at lines 28 to 36, and omitted optional revision plus exact error checks at lines 37 to 44. R2 compares effect snapshots and paging at lines 45 to 46 and checks the attributed refusal at lines 47 to 51. R3 uses a fresh key and returned revision at lines 52 to 56, native and application readback and exact increments at lines 57 to 66, literal agent attribution at lines 67 to 74, native state-changing audit at lines 75 to 81, and retained calls and original held review at lines 82 to 98. R4 checks saved-result replay and linked attempt audit at lines 105 to 126. R5 checks the working scoped credential and identical missing and foreign errors with unchanged custody and no outbound work at lines 129 to 145. These are one integrated public-door behavior, not new independent registrations.

No local plan file or lane inbox was changed. The selected plan entry is returned as completed native-revision diagnostic evidence only; all omitted acceptance work, holds and predecessor landing conditions remain for the lane. No scope ruling or account was requested or newly granted.

First repaired-build runtime result

ONCALL_RUNTIME_PART=machines node tests/runtime.mjs exited 1 after all four new native-revision and non-disclosure probes passed. A later existing resolutionAudit assertion at tests/oncall-agent-flow.mjs:883 could not find its expected row in the first audit page and raised TypeError reading tool. Adding the new behavior before those assertions consumed their fixed first-page budget. The new invocation was moved after the existing resolution-audit checks and before the specialist journey that intentionally uses a synthetic outbound receiver. This preserves both the existing first-page audit assertions and the selected diagnostic's zero-outbound baseline. No existing assertion or behavior was removed, narrowed or moved; the focused test remains loaded through tests/runtime.mjs. The complete touched machines journey is rerun after this integration correction.

Final local outcome and product custody

The complete machines journey passed (exit 0, 443.8 seconds), including the selected R1 to R5 probes under both policies and all retained existing assertions. All selected rubric rows are MET locally. Rider 2 passes for the selected dangerous path; whole-clause rider 1 remains unmet. Candidate-relevant source and test bytes match the receipt and committed blobs. Build and typecheck passed; candidate contract generator write and check, restored views and regenerated source lock check also passed after the final fetch and rebase. Main did not change during reconciliation.

Product head: 9af4af4a353932948029d768a29b9a34d48c2de3. Base: 6858a3c3b5fa01f7f4a90d40bdce1f2f09e60bb9. Product push succeeded on its first guard attempt. The remote branch advertises the candidate SHA. No PR was needed because Verify runs on branch pushes. No default branch was pushed.

PROBE BASE-AGENT-012 acceptance 4 autonomous reassignment native revision: stale revision with expected_revision omitted -> isError revision_conflict and exact authorized current_revision 2 in metadata and text, no private result or native effect; fresh key and returned revision -> standard-only autonomous, one agent-attributed reassignment, incident and workspace increment and native audit commit; new RPC id replay -> saved result and original review without another effect; zero outbound requests
PROBE BASE-AGENT-012 acceptance 4 autonomous reassignment non-disclosure: valid scoped client with stale native revision against foreign and missing incidents -> identical not_found, no revision or private result, custody and paging unchanged, zero outbound requests
PROBE BASE-AGENT-012 acceptance 4 held reassignment native revision: stale revision with expected_revision omitted -> isError revision_conflict and exact authorized current_revision 2 in metadata and text, no private result or native effect; fresh key and returned revision -> standard-only review, one agent-attributed reassignment, incident and workspace increment and native audit commit; new RPC id replay -> saved result and original review without another effect; zero outbound requests
PROBE BASE-AGENT-012 acceptance 4 held reassignment non-disclosure: valid scoped client with stale native revision against foreign and missing incidents -> identical not_found, no revision or private result, custody and paging unchanged, zero outbound requests

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-incident-revisions.mjs#staleReassignmentNativeRevision
GAP BASE-AGENT-012: Only the selected acceptance-4 native reassignment diagnostic is complete. Complete mutating-tool and retention coverage, other dropped-response and changed-argument cases, other revision diagnostics, foreign-person job-handle refusal and long-work status remain unproved; held authority and provider duties remain unchanged. Status stays MISSING with no count change.

CI discovery

Verify run 42428938884, event push, is in progress on the exact product SHA 9af4af4a353932948029d768a29b9a34d48c2de3. No other SHA supplies its CI proof. The cloud has made 3 GitHub API calls so far. The next query for this run is no earlier than 300 seconds after discovery. Publication scan, main equality and Run site on the candidate remain fleet gates, and no release or landing is claimed.
