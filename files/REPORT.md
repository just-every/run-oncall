# sd-oncall-c-f219-r1 report

Selected work: BASE-AGENT-012 acceptance 4, required native Communications revision diagnostic. This is a bounded PARTIAL claim; CONTRACT.md retains MISSING. All 101 Status rows and counts remain unchanged: 20 DONE, 47 PARTIAL, 34 MISSING before and after. No plan row was edited; the selected replan-51 observation is complete with its recorded local checks passing, with all other queue entries retained.

Branch: cloud/sd-oncall-c-f219-r1. Candidate: e7b16e27b8b9f447854346bae09cc5d00dc96a56.
Predecessor: bb10d730aa705821ae9311fc112216d91c295637, landed f218. Verify runs 42624833253 and 42629070667 and Run site 42629070809 were completed and successful on that exact predecessor. The fresh clone contains the landed f216 changed-reason, f217 dropped-response and f218 optional-revision proofs. All remain invoked without changing their assertions.

The full executed plan is in PLAN.md. The product diff extends tests/oncall-agent-communications-revisions.mjs and adds its invocation to tests/oncall-agent-flow.mjs. The existing tests/runtime.mjs machines journey imports that flow; push Verify runs it in its intake shard. sources.lock.json is generated last. No product implementation, classifier, declaration, capability, policy, Base seam, migration, screen or workflow changes were necessary. No independent journey registration was added, removed or replaced.

## Selected proof rubric

All rows use staleCommunicationsNativeRevision in tests/oncall-agent-communications-revisions.mjs, reached through emitted Worker MCP and real D1, under autonomous and held company policies.

- R1, lines 37–64: a fresh declared incident has no protected alerts, actions or recovery evidence and Communications is unassigned. The assignment names a real active responder and literal reason with a fresh key. Only the required revision is stale, and Object.hasOwn proves expected_revision absent. Public isError revision_conflict names exactly the authorized parent incident current_revision in metadata and JSON text, with no structuredContent. The workspace revision differs. The full effect snapshot and paging comparison preserve native state, revisions, timelines, state-changing audit, original populated calls and outcomes, approvals and reviews. One attributed refusal audit is retained; permanent bookkeeping has zero family revision changes.
- R2, lines 65–101: recovery uses a fresh key and the returned native revision, still without expected_revision. Standard is the only class. Autonomous completes; held completes with review disposition. Readback from both native incident storage and the state API agrees. Only Communications, the incident revision and its appended timeline entry change; commander, scribe, assignee, lifecycle and every other incident field stay equal. The incident and workspace each increment once. One assign-role timeline entry contains the literal reason and agent attribution; one native state-changing audit retains agent, incident and sponsor labels.
- R3, lines 102–117: original calls and approvals remain unchanged, exactly one completed call and saved result are added, and held adds exactly one original open review with the original decision identity; autonomous adds none. Paging records remain equal.
- R4, lines 118–136: identical arguments and key with a new JSON-RPC id return the saved result and original review identity. Full effect, saved call and paging readbacks remain identical. The one linked replay-attempt audit preserves operation identity; any appended permanent bookkeeping changes no workspace, paging or handoff revision.
- R5, lines 139–161: a live service-scoped client first proves authorized service access. Stale required revisions against a foreign incident and a missing incident, both without expected_revision, return identical not_found in text and metadata without a revision or private structured result. Full native, replay, approval, review and paging custody remains equal, permitting only refusal and capacity bookkeeping.
- R6, lines 136–161: the cumulative emitted Worker outbound ledger is empty throughout the selected refusal, recovery, retry and denial paths under both policies. No provider or paging request is attempted.

PROBES.txt retains the actual selected public-door observations. CHECKS.json records actual commands, exits, hashes and terminal provenance.

## Whole clause acceptance mapping

1. Complete mutating-tool idempotency coverage and at least 24-hour retention: not closed by this slice. Existing proof is retained.
2. Lost-stream retry with a new JSON-RPC id: landed Communications dropped-response and earlier tool proofs are retained; all other omitted tools remain outside this slice.
3. Changed arguments with the original key: landed Communications changed-reason and earlier proofs are retained; all other omitted combinations remain outside this slice.
4. Required native Communications stale revision: selected R1–R6 observations proved here. This does not complete the remaining optional and required native diagnostics of the whole acceptance point. Landed optional Communications and Scribe diagnostics and other earlier tool diagnostics remain intact.
5. Foreign-person job-handle refusal and long-work status independent of Tasks: unproved here.

OC-045, OC-046, OC-048 and OC-049 retain the agent and AI egress authority hold. Model, investigation, ownership, remediation, recurrence and executor flows remain omitted. Erasure and approval replay, SURFACE-004's ambiguous hold and the held Base seam, BASE-AGENT-006 and BASE-AGENT-008 holds, all existing queue entries, notes, predecessor and publication gates and release prerequisites remain unchanged. Paging stays OFF. Provider authorization and A2P, production delivery, independent standby, native-device and real-phone duties are held. This slice grants no account, capability, outbound, activation, publication or release authority.

## DONE riders and pre-ready check

No whole-clause DONE claim is made.

1. NOT MET for whole clause: selected acceptance-4 outcomes are covered by R1–R6, while the acceptance mapping above names remaining outcomes.
2. PASS selected slice: real populated native custody, an allowed assignment and refused stale and unauthorized paths, with no-effect comparisons.
3. LOCAL PASS selected slice; exact candidate Verify is recorded in CHECKS.json. The journey remains in ordinary push Verify without a flag that excludes these assertions.
4. PASS selected slice: relevant source and test hashes in CHECKS.json bind the local run to the candidate's exact file bytes; subsequent integration changes, if any, are explicitly recorded.
5. UNCHANGED: no receiving clause or inheritance change is proposed.
6. PASS mechanical generation: write and check passed, zero generated documents changed, generated views restored from origin/main. Existing Status, Gap, Evidence and counts are intentionally untouched for the single-writer lander.
7. PASS: no acceptance sentence, ruling, coverage map or existing assertion changed.
8. PASS selected authority boundary: valid scope succeeds and foreign and missing incidents are indistinguishable refusals; preserved custody is compared in R5.
9. PASS boundary: network-edge evidence claims zero outbound attempts only; no provider, legal, retention, delivery or device proof is inferred.
10. NOT APPLICABLE: no new policy default or authority decision.
11. PENDING LANDER: candidate remains branch-only. The cloud did not run the fleet publication scan or claim COMPLETE, historyScanned or zero findings. Main equality and candidate Run site are landing obligations, not builder receipts. Exact candidate Verify is reported honestly in CHECKS.json.

Pre-ready: selected user-visible behavior is exercised through MCP and native readback; no assertion was removed, narrowed, skipped or moved behind a condition. Credential revocation, erasure and replay boundaries are retained; the touched machines runtime also executes existing revoked and erased authority journeys. UI requirements are not applicable because no screen changed. Source lock is fresh, migration ledger is not applicable, and changed source contains no new email-shaped values or ambiguous repository references. Publication and exact-main Run site stay with the fleet.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, restored ACCEPTANCE.md and docs/CLAIMS.md from origin/main; ledger=none exit=0.

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-communications-revisions.mjs#staleCommunicationsNativeRevision
GAP BASE-AGENT-012: only the selected required-native Communications revision observation is closed; complete tool coverage, retention, other lost-response and changed-argument cases, remaining revision diagnostics, foreign-person job handles, long-work status and all held authority and delivery duties remain unproved here. CONTRACT status stays MISSING.

Local command results: setup, production build, machines runtime (385.5 seconds), typecheck, first-party check, final generator write and check, and final lock regeneration and check each exited 0. The runtime executes the retained Communications optional diagnostic as well as the new native diagnostic; PROBES.txt includes both actual non-disclosure observations and the new native cases. No assertion was deleted or weakened.

Handoff validation: the clean checkout and remote product branch both retain the exact candidate SHA above, while remote main remains the landed f218 predecessor. All four recorded file hashes match. The source lock check was repeated successfully. The actual runtime log confirms machines completed in 385.5 seconds; runtime, typecheck and generator logs are included in the packet. Verify 42632551344 was still in progress at the latest CI.json observation. No product commit was changed during handoff validation.
