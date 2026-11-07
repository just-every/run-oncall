# sd-oncall-c-f209

Selected observation: acceptance 2 of BASE-AGENT-012, dropped response for the shipped oncall.incidents.update tool with change=reassign. The clause remains MISSING. No Status, Gap or Evidence cell, acceptance wording, classifier, capability, declaration or held replay seam changes.

## Plan and implementation

The complete plan is in PLAN.md. Current main at start was 59016bf47bd17f7347d54d86cc722227f2bbca2d. Its Verify 42345281364 and Run site 42345281376 completed successfully. Predecessor cloud/sd-oncall-c-f208, head da68efdaef7a90b568122189f3c4a554eda27171, had successful Verify 42348639796 but had not landed. No live predecessor run was reported in the available Actions evidence. Its changed-reassignment-reason proof is a separate scope and is not copied or repeated here. The fleet retains its publication and predecessor landing gates.

The focused helper is ./tests/oncall-agent-incident-replay.mjs, droppedReassignmentReplay. The existing ./tests/oncall-agent-flow.mjs invokes it, and ./tests/runtime.mjs already invokes that flow in its delivery part. No new journey registration is added, no existing assertion is removed or narrowed, and no workflow changes.

For autonomous and held policies, native owner HTTP prepares a new ordinary incident with no alerts or protected evidence, acknowledges it to establish its current assignee, and chooses an existing distinct active responder. MCP oncall.incidents.update receives change=reassign, the current native revision, a literal reason and a fresh idempotency key. The shared discardToolResponse destroys the actual HTTP response at headers with no body consumer. The helper establishes a completed original call, its stored outcome and the committed incident directly from D1 before retry.

The first effect must be standard-only with the expected policy disposition, exactly one agent-attributed reassignment with literal reason and the correct old and new assignees, one incident revision increment, one workspace revision increment and one accepted state-changing permanent native audit commit. Held policy alone has one new original open review linked to the original decision; approvals and paging remain unchanged.

Retry passes the identical argument object, original revision and key, and obtains a distinct JSON-RPC id. The exact saved structured result and original review metadata must return. agentEffectSnapshot compares all retained native records, revisions, incident timeline, state-changing permanent audit, original call and outcome custody, approvals, reviews and paging, allowing the shared attempt-audit and capacity bookkeeping exclusions. The separate decision audit must append exactly one replayed attempt linked to the original decision and operation, preserving all prior rows. The network edge ledger must remain empty.

## Bounded proof rubric

- R1: Both policies and fresh ordinary, currently assigned native incidents with distinct active responder: helper lines 17–29.
- R2: Real response destroyed at headers and original completed call and saved outcome established from D1 before retry: lines 30–41; shared ./tests/agent-door-runtime.mjs discardToolResponse.
- R3: Standard classification, expected disposition, exact native result, attributed literal reassignment, one revision increment and native audit commit: lines 37–61.
- R4: One original open review only when held; approvals, previous calls, previous reviews and paging preserved: lines 62–73.
- R5: Identical arguments and original revision with new RPC id return the exact saved result; retained effects unchanged, one linked replay audit and zero outbound requests: lines 78–92.

This rubric covers the selected observation only. No complete acceptance point or whole-clause completion is inferred from the omitted cases.

## Retained gaps and holds

Acceptance 1 still lacks complete mutating-tool coverage and the full at-least-24-hour retention proof. Acceptance 2 still has other dropped-response cases. Acceptance 3 retains other tools and argument combinations, including the separate replan-39 changed-reassignment-reason predecessor scope. Acceptance 4 retains other optional and required native revision diagnostics. Acceptance 5 retains foreign-person job-handle refusal and long-work status independent of the Tasks extension.

Erasure and approval replay, SURFACE-004's ambiguous hold and Base seam, BASE-AGENT-006 and BASE-AGENT-008 holds, existing queue entries and release prerequisites remain unchanged. Model, investigation, ownership, remediation, recurrence and executor flows are omitted. OC-045, OC-046, OC-048 and OC-049 retain the agent and AI egress authority hold. Paging remains OFF. Provider authorization and A2P, production delivery, independent standby, native-device and real-phone duties remain held. No account, capability, outbound, activation, publication or release authority follows from this work.

## Rider assessment for this partial claim

1. Partial: the selected public-door observation is covered; other acceptance outcomes remain omitted.
2. Covered for the selected data-safety replay: populated native records, exact saved outcomes, single original effect, no second effect, unchanged custody and audit linkage are asserted.
3. Exact-SHA Verify is recorded in RECEIPT.json when discovered. The helper is invoked by the existing runtime path.
4. Relevant source and test byte identity is bound to the final product head in the receipt; no earlier proof is substituted for changed code.
5. Inheritance is unchanged; no new duty or inheritance claim is introduced.
6. Contract Status cells and summary counts are untouched. Generated views are checked locally and restored from main; the lander owns status and view reconciliation.
7. No acceptance or ruling changes.
8. No authority change. Existing consent, scope, revocation and other refusal coverage remains in the touched flow.
9. No provider or legal claim; all external holds remain named above.
10. No new policy default or ruling needed.
11. Pending guarded landing: main equality, exact landed Verify, Run site and COMPLETE full-history publication scan with zero new findings are fleet duties, not claimed from branch publication.

## Pre-ready checks

No existing assertion is deleted, narrowed or hidden behind a branch or width condition. No UI is touched; browser widths and tooltip checks do not apply. No migration is touched. Authority, erasure and approval replay behavior is unchanged; the existing agent journey retains its relevant regressions. No provider request occurs in the new observation. Source lock and generated-view commands and exits are recorded in RECEIPT.json. Publication scanning and main landing remain with the guarded fleet lander; no COMPLETE scan or main equality is claimed by this cloud task.

Counts stay 17 DONE, 50 PARTIAL, 34 MISSING, total 101. BASE-AGENT-012 stays MISSING. Plan row changed: replan-40's selected reassignment dropped-response observation is proved; its whole-clause and external remainders stay held. No Mac plan, inbox or state file is read or written.

## Local startup diagnosis

The first ad hoc Node eval invocation stalled at Miniflare's synchronous D1 proxy acquisition. Switching from VM Node 24 to pinned Node 22 alone did not fix the eval invocation. A minimal normal script proved Worker and D1 availability. The Miniflare synchronous fetcher creates an eval worker inheriting Node execution arguments; the diagnostic preload also interfered with that startup. Running the focused probe from a normal .mjs file passed both policies without any product change. The stalled owned process groups were terminated; their exit status was 247 as returned by the subreaper. They are not passing test receipts. The successful focused probe and maintained agent-flow logs are retained separately.

## Candidate and verification

Product branch: cloud/sd-oncall-c-f209. Full head: 9d5d500c0cf68bcc3f0a3caed08c38d253c615e2. Product push succeeded on its first guard attempt. No PR is required for branch Verify. All candidate author and committer identities are fleet, no trailers, clean checkout, and no contract diff. Main was unchanged at the pre-push fetch; the rebase was a no-op.

Local commands passed: setup, build, pnpm run typecheck under pinned Node 22.20.0, pnpm exec rer check --profile first-party, normal-file focused emitted-Worker probe and node tests/oncall-agent-flow.mjs. The successful logs are included. No relevant source or test bytes changed after these runtime runs; the final lock amendment only added the now-tracked helper hash.

The first lock generation preceded staging the new helper, so its after-commit check correctly reported a stale lock. Regeneration with the helper tracked, followed by check, fixed it before the first push. Both the original mechanical log and final passing log are retained. No lock hash was edited by hand.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, restored from origin/main; ledger=none exit=0.
