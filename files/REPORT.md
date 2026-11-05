# sd-oncall-c-f202

Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-c-f202.

## Plan

1. Read the live BASE-AGENT-012 requirement, Status evidence and gaps, the existing agent transport and custody helpers, policy fixtures and shared native revision guard. Check current main workflows and predecessor state.
2. Extend the existing emitted Worker MCP journey for the required native revision of acknowledgment and follow-up creation, omitting expected_revision. Use separate ordinary incidents under autonomous and held policies. Compare all retained application effects, call custody, approvals, reviews, permanent state-changing audit and paging across refusal. Require exact authorized parent current_revision in metadata and text, no private structured result, and missing or unauthorized target nondisclosure.
3. Use a fresh key and the returned revision to acknowledge once for an active responder or create one owned, due-dated P1 human-review follow-up that remains open. Require agent attribution, the policy-appropriate autonomous or single open review outcome, and exact retry with a new RPC id without duplicate effects, with zero outbound requests.
4. Reconcile only the observed contract evidence and retain MISSING plus every unproved acceptance and external hold. Generate and check derived views, restore them from main, regenerate and check the source lock last. Run touched emitted runtime coverage, typecheck and the first-party check. No UI, migration, provider or authority expansion.
5. Reconcile fresh main before publication without rewriting published history. Inspect all candidate identities and trailers; push only the named product branch through the fleet guard. Discover and verify exact-SHA CI within the stated budget. Publish complete non-secret reports and receipts on the separate evidence ref. Hand product custody to the fleet for publication scanning and landing.

## Initial inspection

Main was 1f0b7327773a3963f5fce611295ffc3a251af65a. Exact-main Verify 42026429002 and Run site 42026429004 completed successfully. Nightly journeys 41956208697 succeeded on predecessor 2cd6ffdb3420ccff438d2e0baa576c6fdcc8907d. The required-note shared-guard fix was not present in the cloned main. No predecessor authority or release gate is waived.

BASE-AGENT-012 is MISSING. Its five acceptance points require once-only equal results, dropped-response replay, changed-argument conflict, stale-revision current diagnostics, and foreign-person job nondisclosure. Existing evidence covers declaration replay, declaration and note argument conflicts, and optional note revision conflict. This round selects only required native acknowledgment and follow-up current-revision diagnostics. Whole-clause promotion is excluded.

Unproved remainder: complete mutating-tool coverage and 24-hour retention; other dropped-response cases; other changed arguments; other optional and native revision diagnostics including service ETag; foreign-person job-handle refusal and long-work status independent of Tasks. Separately launched note, retention, changed-argument and dropped-response scopes remain separate. Erasure and approval replay, SURFACE-004 and BASE-AGENT-006 and BASE-AGENT-008 holds remain. Model, investigation, ownership, remediation, recurrence and executor work remains omitted. OC-045, OC-046, OC-048 and OC-049 retain their agent and AI egress authority holds. Paging remains OFF; provider authorization, A2P, independent standby, native-device and real-phone prerequisites remain unchanged.

## Regression sensitivity

Before changing the native implementation, the new emitted Worker journey failed in staleCoordinationRevision at its first autonomous acknowledgment. The actual error metadata was `{ "code": "revision_conflict" }`; expected metadata was `{ "code": "revision_conflict", "current_revision": 2 }`. The command `timeout 1200 node tests/oncall-agent-flow.mjs` exited 1. This is a local pre-fix regression reproduction, not a failed CI repair. Existing declaration replay, changed-argument, consent-revocation and optional-note revision checks had passed before the new assertion failed.

## Implementation and observed results

The shared coordination run guard now throws ToolRefusal with code revision_conflict and current_revision after native access has authorized the target. It uses the incident revision, independently of the workspace revision. Missing targets and targets outside a service client's authority still fail before any revision disclosure. No domain command, native audit commit or persistence begins on the stale-revision path.

The existing staleCoordinationRevision helper extends the maintained agent flow, which the intake shard imports through tests/runtime.mjs. It uses separate ordinarily declared incidents, then a genuine owner note advances each incident from revision 1 to 2. Neither call supplies expected_revision. The four cases cover both native tools under autonomous and held policies. Each refusal compares the complete agentEffectSnapshot: application records and revisions, timeline, all durable custody tables, original calls and stored outcomes, approvals, reviews, paging, and all state-changing permanent audit commits. Only attributed refusal audit and rate bookkeeping may change.

Every fresh-key success uses the returned revision. Acknowledgment names an active responder and retains agent actor and sponsor attribution, commander and assignee. Follow-up creation retains owner, UTC due date, P1 and human-review policy, no submission or acceptance, and done=false. The autonomous case creates no review; the held case creates exactly one open review and no approval. Retry uses a new RPC id and preserves the stored result and original review without another effect. Missing-parent and service-unauthorized-parent calls both return not_found without a revision or private structured result. All four cases retain zero outbound requests.

Typecheck and the complete precommit agent flow passed. The pre-fix diagnostic assertion failed when the product omitted current_revision. Existing assertions were neither removed nor narrowed, and no test registration was added or removed. No browser screen or UI code was changed, so the width-specific screen and tooltip checks do not apply to this transport-only slice. No migration was added or edited.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

Derived views were restored wholesale from origin/main after successful generation and checking. Neither ACCEPTANCE.md nor docs/CLAIMS.md is committed. A candidate generated-view freshness failure is expected; the lander regenerates those files. Source lock was generated last and its check passed. First-party rer check passed. Main's rer and Base pins, workflow configuration, homepage, authority rules and release prerequisites were retained.

## Scope and counts

BASE-AGENT-012: MISSING to MISSING. Selected required native revision diagnostics: 0 to 2, exercised in 4 policy cases. Contract Status rows: 101 to 101; DONE 17 to 17, PARTIAL 50 to 50, MISSING 34 to 34. Only the BASE-AGENT-012 Evidence and Gap cells changed. No acceptance point, field-proof entry, clause ID or clause judgment changed. The plan row to update is BASE-AGENT-012 acceptance 4: required native acknowledgment and follow-up diagnostic observations complete; the remainder stays as listed above. No plan is rebuilt and no Mac lane file is written from cloud.

## Rider assessment; no DONE claim

1. Whole-clause coverage: FAIL for DONE because the retained acceptance gaps remain; the two selected diagnostics pass the maintained public-door journey.
2. Real data and unsafe refusal: PASS for this slice; ordinary populated native incidents, actual allowed writes and no-effect refusals are exercised. The pre-fix implementation fails the new assertion.
3. Exact-SHA CI: tracked separately in CI.json; no whole-clause DONE claim. The maintained intake shard executes tests/runtime.mjs, which imports this agent journey.
4. Candidate proof provenance: exact-head runtime receipt and source hashes are in the packet. No provider or earlier-SHA receipt is promoted to candidate proof.
5. Inheritance: unchanged. This round introduces no receiving clause or new inherited duty.
6. Gap and evidence: retained MISSING with the remaining outcomes explicitly named. Generator write and check passed; generated views remain a lander responsibility. The existing Judged from line is retained as the existing judgment, not presented as a new judgment of this candidate.
7. Acceptance preservation: PASS; acceptance text is unchanged and all 101 Status rows survive the commit.
8. Authority: PASS for the selected boundary; authorized parent revision is returned, missing and unauthorized parents disclose no revision, and prior approvals and reviews are preserved. Complete clause authority work is not newly claimed.
9. Provider boundary: PASS for honesty; no provider, real-phone, native-device, scale or release proof is claimed.
10. Policy: unchanged; no new custody, consent, spending, delegation or provider policy is adopted.
11. Landing: pending fleet custody. Cloud does not run the publication scan, update main, or claim Run site green on this candidate. The fleet must enforce exact-SHA Verify, complete full-history publication scanning and its predecessor and release gates.

## Pre-READY assessment

The four selected transport outcomes have positive and negative public-door checks. The new diagnostic check demonstrably fails before the fix. No existing assertion is deleted, skipped, narrowed or hidden behind a width or branch condition. The full existing agent flow retains credential revocation, erasure and approval-replay checks, including its explicitly retained Base replay seam; this slice neither expands authority nor claims that seam solved. There are no touched screens. Source integrity passes, changed product text has no added email-shaped literals, and the final changed-text review covers accidental repository-shaped prose. Publication scanning, landing, Run site and release approval remain fleet gates, never builder claims.

## Final proof map

Final product candidate: `4fd06a85d0c45306bd87b14c23e0a51397e4e5e3` on `cloud/sd-oncall-c-f202`, based on main `1f0b7327773a3963f5fce611295ffc3a251af65a`. Both product pushes succeeded on their first attempt. The second commit changes only scoped-credential preparation and its source lock: preparation now makes a real missing-target refusal instead of adding a protocol discovery literal. Updated main was fetched before each push; the unpublished first candidate was reconciled by rebase, and the published branch by merge. Both reconciliations were already up to date. No published history was rewritten and no PR was needed for the branch-push Verify entry point.

- Required native acknowledgment diagnostic: `tests/oncall-agent-flow.mjs`, staleCoordinationRevision, lines 255–281 (both policies, stale required revision, exact metadata and text, no retained effect); lines 283–296 (missing and unauthorized parent nondisclosure); lines 298–312 (fresh-key success with named active responder and agent attribution); lines 320–338 (single policy-appropriate open review, stored outcome replay and zero egress).
- Required native follow-up diagnostic: the same existing journey and matrix, lines 255–281 and 283–296 for refusal and nondisclosure; lines 298–308 and 313–318 for one owned, due-dated P1 human-review follow-up that stays open; lines 320–338 for review, custody, retry and zero egress.
- Verify entry: `tests/oncall-agent-flow.mjs` line 414 invokes the helper. `tests/runtime.mjs` line 2101 imports the agent journey; `scripts/verify-shards.json` includes the machines runtime part in the push intake shard. No CI command or workflow was changed.
- Snapshot coverage: `tests/agent-door-runtime.mjs`, agentEffectSnapshot, compares application data and all durable tables, retaining permanent state-changing audit and original idempotency custody while allowing attempt audit and rate bookkeeping. The helper itself is unchanged.

Regression evidence is `baseline-runtime.log` and `regression.json`. It is an intentional pre-fix local failure and not a CI repair. Runtime, typecheck, first-party, generator and source-lock receipts record their actual head, command, exit status, source hashes and log hash. Final receipts use the ready prefix and bind the final candidate explicitly. Earlier receipts remain identified by their actual head and source hashes.

No whole-clause judge request is made: the retained unproved outcomes prevent a DONE claim. The plan update is only the observed two acceptance-4 diagnostics; all existing queue entries, judgments, notes, predecessor holds and release prerequisites stay in place.

## Exact-head runtime probes

PROBE BASE-AGENT-012 acceptance 4 autonomous oncall.incidents.acknowledge: stale required revision 1, expected_revision omitted -> isError revision_conflict current_revision 2 in metadata and text; no retained effects; missing and unauthorized parents -> not_found without revision; fresh key -> one attributed acknowledgment for active responder, autonomous; identical new-RPC-id retry -> stored result without duplicate effect or review; zero outbound requests

PROBE BASE-AGENT-012 acceptance 4 autonomous oncall.actions.create: stale required revision 1, expected_revision omitted -> isError revision_conflict current_revision 2 in metadata and text; no retained effects; missing and unauthorized parents -> not_found without revision; fresh key -> one attributed owned due-dated open P1 human-review follow-up, autonomous; identical new-RPC-id retry -> stored result without duplicate effect or review; zero outbound requests

PROBE BASE-AGENT-012 acceptance 4 held oncall.incidents.acknowledge: stale required revision 1, expected_revision omitted -> isError revision_conflict current_revision 2 in metadata and text; no retained effects; missing and unauthorized parents -> not_found without revision; fresh key -> one attributed acknowledgment for active responder, review; identical new-RPC-id retry -> stored result without duplicate effect or review; zero outbound requests

PROBE BASE-AGENT-012 acceptance 4 held oncall.actions.create: stale required revision 1, expected_revision omitted -> isError revision_conflict current_revision 2 in metadata and text; no retained effects; missing and unauthorized parents -> not_found without revision; fresh key -> one attributed owned due-dated open P1 human-review follow-up, review; identical new-RPC-id retry -> stored result without duplicate effect or review; zero outbound requests

## CI and custody

Verify run 42131666811 was discovered on the exact final head, event push, status in_progress. No other SHA supplies green candidate proof. Initial candidate Verify 42131081257 belongs only to 50103221e786b4e90bd0ab2969937fb819f4089d. No workflow was dispatched or rerun. The observation and later terminal result, if available, are recorded in CI.json. The cloud runtime uses Node 24.19.0 with pnpm 10.12.4; CI selects the repository Node 22.20.0 pin. The configured toolchain retained the newer local runtime as specified.

The exact final head runtime journey exited 0 in 86.653 seconds; typecheck exited 0; first-party check exited 0. All four selected required-revision probes passed. All other maintained agent flow checks also passed while retaining their documented external and Base seams. Final generator write and check and source lock write and check exited 0. Product checkout is clean. No known product failure or selected-point blocker remains. Whole-clause completion and landing remain unclaimed.
