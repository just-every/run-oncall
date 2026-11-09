# sd-oncall-c-f214 plan

Write scope: just-every/run-oncall, branch cloud/sd-oncall-c-f214.
Baseline: b59f29479feeaeb975f53c044a65eab888fb68be.

1. Recheck main, predecessors, clause acceptance and existing runtime patterns. Main contains both Scribe predecessors: changedScribeReasonConflict and droppedScribeAssignmentReplay. Baseline exact-SHA Verify 42538139569 and Run site 42538139458 completed successfully. No shared-file predecessor remains outside main.
2. Add staleScribeExpectedRevision to ./tests/oncall-agent-role-revisions.mjs and invoke it from ./tests/oncall-agent-flow.mjs, already imported by ./tests/runtime.mjs. Reuse agentEffectSnapshot and the existing native reassignment diagnostic assertions.
3. For autonomous and held policies, create an ordinary incident with Scribe unassigned and no protected evidence. Choose an active responder. Send current required native revision, stale optional expected_revision, literal reason and fresh key through real emitted Worker MCP.
4. Require revision_conflict, exact incident current_revision in metadata and JSON text, no structured result, distinction from workspace revision and unchanged retained native, original outcome, approval, review and paging custody. Check one attributed refusal audit.
5. Retry with a fresh key and returned revision in both fields. Require standard-only autonomous completion or review disposition, one Scribe timeline entry, agent attribution, literal reason, one native and workspace increment and state-changing audit. Preserve prior calls and reviews.
6. Replay identical arguments and key with a distinct JSON-RPC id. Require the stored result and original review identity, no extra effects or review, and one linked attempt audit with only capacity and effect-free persistence bookkeeping.
7. Use an authorized service-scoped client against a foreign incident and a missing incident. Require identical not_found, no current_revision or private result, unchanged custody, and zero outbound attempts across the journey.
8. Run production build, touched runtime coverage, typecheck and first-party check; regenerate contract documents, check them, restore generated views from main; regenerate and check source lock last. Leave CONTRACT.md and all Status cells unchanged.
9. Fetch and reconcile main, inspect all candidate identities and trailers, push with cloud-push.py. Discover exact-SHA Verify through REST within the ten-call budget and report actual state.
10. Save complete relevant reports and actual receipts outside product, publish selected files to evidence/sd-oncall-c-f214, and hand over the exact product head. Fleet owns publication scan and landing. Claim PARTIAL, with current MISSING judgment and counts retained.

Frozen selected-observation rubric:
R1. Valid ordinary Scribe assignment with stale optional revision is refused with exact authorized incident revision under both policies.
R2. Refusal exposes no private structured result and preserves populated effects and custody except required refusal audit and capacity bookkeeping.
R3. Returned revision in both fields with fresh key performs exactly one standard-only agent-attributed assignment and native audit commit under both policies.
R4. Identical arguments and key with new JSON-RPC id recover saved result and original held review with no duplicate effect; replay attempt links to original audit.
R5. Scoped-out and missing incidents produce identical not_found, with no revision or private result and no effect.
R6. All legs attempt zero outbound requests; prior Scribe changed-reason and dropped-response scopes remain intact.
